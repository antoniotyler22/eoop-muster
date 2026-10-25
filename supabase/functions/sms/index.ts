// Supabase Edge Function "sms": texts the recall check-in link to many people at once through Twilio (Pro).
// The numbers pass through to Twilio for delivery and are not stored. Turn OFF "Enforce JWT verification".
// Secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM (your Twilio number, +1...) or
//          TWILIO_MESSAGING_SERVICE_SID. Optional: SMS_PER_TEAM (default 300 texts per Pro team per day).
// Needs SQL parts 10 (usage counters) and 20 (Pro). Twilio needs A2P 10DLC registration for US texting.

const D = (globalThis as any).Deno;
const env = (k: string, d = "") => (D?.env.get(k) ?? d) || d;
const URL0 = env("SUPABASE_URL"), SRK = env("SUPABASE_SERVICE_ROLE_KEY");
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, content-type, authorization, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

/** US numbers only (10 digits), deduplicated, at most 200. */
export function cleanNumbers(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const out = new Set<string>();
  for (const x of list.slice(0, 400)) {
    let d = String(x ?? "").replace(/\D/g, "");
    if (d.length === 11 && d[0] === "1") d = d.slice(1);
    if (/^[2-9]\d{2}[2-9]\d{6}$/.test(d)) out.add("+1" + d);
    if (out.size >= 200) break;
  }
  return [...out];
}
/** The text must be a check-in message that links to the app (stops the function being used to send anything else). */
export function textOK(t: unknown, appUrls: string[]): string | null {
  if (typeof t !== "string") return null;
  const s = t.replace(/\s+/g, " ").trim();
  if (s.length < 10 || s.length > 320) return null;
  const links = s.match(/https?:\/\/\S+/g) ?? [];
  if (links.length !== 1 || !appUrls.some((u) => links[0].startsWith(u + "#"))) return null;
  return s;
}

async function rpc(fn: string, args: unknown) {
  const h: Record<string, string> = { apikey: SRK, "Content-Type": "application/json" };
  if (SRK.startsWith("eyJ")) h.Authorization = "Bearer " + SRK;
  const r = await fetch(URL0 + "/rest/v1/rpc/" + fn, { method: "POST", headers: h, body: JSON.stringify(args) });
  const t = await r.text();
  if (!r.ok) throw new Error(t.slice(0, 200));
  return t ? JSON.parse(t) : null;
}

export async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let b: any = {};
  try { b = await req.json(); } catch { return json({ error: "bad request" }, 400); }
  const sid = env("TWILIO_ACCOUNT_SID"), tokn = env("TWILIO_AUTH_TOKEN"), from = env("TWILIO_FROM"), msid = env("TWILIO_MESSAGING_SERVICE_SID");
  const ready = !!(sid && tokn && (from || msid));
  if (b.ping) return json({ ok: 1, sms: 1, ready });
  if (!ready) return json({ error: "Texting from the server isn't set up yet." }, 503);
  let ent: string | null = null;
  try { ent = await rpc("pro_ent_for", { p_tok: typeof b.pro === "string" ? b.pro : null, p_feed: null, p_mk: null }); } catch { /* part 20 missing */ }
  if (!ent) return json({ error: "Texting from the server is part of Accounted For Pro.", pro: true }, 402);
  const to = cleanNumbers(b.to);
  const apps = env("APP_URLS", "https://antoniotyler22.github.io/eoop-muster/").split(",").map((s) => s.trim()).filter(Boolean);
  const text = textOK(b.text, apps);
  if (!to.length) return json({ error: "No valid US phone numbers." }, 400);
  if (!text) return json({ error: "Only check-in links can be texted from here." }, 400);
  // Daily cap per Pro team (counts texts, not requests).
  const cap = Number(env("SMS_PER_TEAM", "300"));
  const key = "sms:" + ent;
  const used = Number(await rpc("usage_add", { p_k: key, p_n: to.length }));
  if (used > cap) return json({ error: `Your team reached today's limit of ${cap} texts.` }, 429);
  let sent = 0, failed = 0;
  const auth = "Basic " + btoa(sid + ":" + tokn);
  for (const n of to) {
    const form = new URLSearchParams({ To: n, Body: text });
    if (msid) form.set("MessagingServiceSid", msid); else form.set("From", from);
    try {
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, { method: "POST", headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString() });
      if (r.ok) sent++; else failed++;
    } catch { failed++; }
  }
  return json({ ok: 1, sent, failed });
}
if (D?.serve) D.serve(handle);
