// Supabase Edge Function "sms": texts the recall check-in link to many people at once through Twilio (Pro).
// The numbers pass through to Twilio for delivery and are not stored. Turn OFF "Enforce JWT verification".
// With part 26 run and the "sms-in" function set as the Twilio number's incoming-message webhook, people can also
// just reply 1, 2 or 3: the server keeps a one-way key per texted number (never the number) for that check-in only.
// It also sends the family "safe" notice ({family:[{to,n}]}) for a running check-in: the server writes that text too.
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
/** One-way key for a phone number (E.164). Made with a server secret so the stored key can't be turned back into
 *  a number by trying every number. The same key is computed when a reply arrives. */
export async function phKey(e164: string, pepper: string): Promise<string> {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("af-sms|" + pepper + "|" + e164));
  return Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
}
/** People to text with the scrambled name their reply checks in as: [{to, w:[16-hex hashes]}]. */
export function cleanPeople(list: unknown): { to: string; w: string[] }[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>(), out: { to: string; w: string[] }[] = [];
  for (const x of list.slice(0, 400)) {
    const to = cleanNumbers([x && (x as any).to])[0];
    const w = Array.isArray(x && (x as any).w) ? (x as any).w.filter((h: unknown) => typeof h === "string" && /^[0-9a-f]{16}$/.test(h)).slice(0, 6) : [];
    if (!to || !w.length || seen.has(to)) continue;
    seen.add(to); out.push({ to, w });
    if (out.length >= 200) break;
  }
  return out;
}
const NAME_RE = /^[A-Za-z][A-Za-z .'-]{0,39}$/;
/** Family "safe" notice. The server writes it; the app only supplies a first name (or names), a time and an optional
 *  pickup place, each checked here, so the function can't be used to send other messages. Numbers shared by
 *  siblings get one text naming each child. */
export function familyTexts(list: unknown, unit: unknown, at: unknown, place: unknown): { to: string; body: string }[] | null {
  const u = String(unit ?? "").replace(/\s+/g, " ").trim();
  if (!/^[A-Za-z0-9 .,\/'&()#-]{1,30}$/.test(u)) return null;
  const t = String(at ?? "").trim();
  if (!/^\d{1,2}:\d{2}( ?[AP]M)?$/i.test(t)) return null;
  const pl = String(place ?? "").replace(/\s+/g, " ").trim();
  if (pl && !/^[A-Za-z0-9 .,\/'&()#-]{1,40}$/.test(pl)) return null;
  if (!Array.isArray(list)) return null;
  const by = new Map<string, string[]>();
  for (const x of list.slice(0, 400)) {
    const to = cleanNumbers([x && (x as any).to])[0];
    const n = String((x && (x as any).n) ?? "").replace(/\s+/g, " ").trim();
    if (!to || !NAME_RE.test(n)) continue;
    const names = by.get(to) || [];
    if (!names.includes(n) && names.length < 4) names.push(n);
    by.set(to, names);
    if (by.size >= 200) break;
  }
  const join = (a: string[]) => a.length < 2 ? a[0] : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
  return [...by].map(([to, names]) => ({
    to,
    body: `${u}: ${join(names)} ${names.length > 1 ? "are" : "is"} accounted for and safe as of ${t}.` + (pl ? ` Pickup: ${pl}.` : "") + " More updates will come by text.",
  }));
}
/** The server writes the text itself; the app only supplies its check-in link, which is checked and rebuilt here
 *  (only the app's own address and the check-in fields, nothing else), so the function can't be used to send other messages. */
export function buildText(link: unknown, recall: string, appUrls: string[], reply = false): string | null {
  if (typeof link !== "string" || link.length > 400) return null;
  const at = link.indexOf("#");
  if (at < 0) return null;
  const base = link.slice(0, at);
  if (!appUrls.includes(base)) return null;
  const q = new URLSearchParams(link.slice(at + 1));
  const out = new URLSearchParams();
  for (const [k] of q) if (!["ci", "u", "to", "l", "g"].includes(k)) return null;
  const ci = q.get("ci") ?? "";
  if (ci !== recall || !/^[a-z0-9]{8,16}$/.test(ci)) return null;
  out.set("ci", ci);
  const u = (q.get("u") ?? "").replace(/\s+/g, " ").trim();
  if (!/^[A-Za-z0-9 .,\/'&()#-]{1,30}$/.test(u)) return null;
  out.set("u", u);
  const to = q.get("to");
  if (to != null) { if (!/^\+?[0-9]{7,15}$/.test(to)) return null; out.set("to", to); }
  const l = q.get("l");
  if (l != null) { if (l !== "1") return null; out.set("l", "1"); }
  const g = q.get("g");
  if (g != null) { if (!/^-?[0-9]{1,3}\.[0-9]{1,6},-?[0-9]{1,3}\.[0-9]{1,6},[0-9]{1,5}$/.test(g)) return null; out.set("g", g); }
  return `${u} recall: tap to check in. ${base}#${out.toString()}` + (reply ? " Or reply 1 = OK, 2 = delayed, 3 = need help." : "");
}

function hdrs() {
  const h: Record<string, string> = { apikey: SRK, "Content-Type": "application/json" };
  if (SRK.startsWith("eyJ")) h.Authorization = "Bearer " + SRK;
  return h;
}
const sha256hex = async (t: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t))), (x) => x.toString(16).padStart(2, "0")).join("");
/** The caller must hold the recall's read key (only the leader's phone has it), and the recall must still be open. */
async function recallOK(id: unknown, key: unknown) {
  if (typeof id !== "string" || !/^[a-z0-9]{8,16}$/.test(id) || typeof key !== "string" || key.length < 16 || key.length > 200) return false;
  const r = await fetch(URL0 + "/rest/v1/recalls?select=read_key_hash,expires_at&id=eq." + encodeURIComponent(id), { headers: hdrs() });
  if (!r.ok) return false;
  const rows = await r.json();
  const row = rows && rows[0];
  return !!row && row.read_key_hash === await sha256hex(key) && Date.parse(row.expires_at) > Date.now();
}
async function rpc(fn: string, args: unknown) {
  const h = hdrs();
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
  if (!(await recallOK(b.recall, b.key))) return json({ error: "Start a live recall on this phone first." }, 403);
  const cap = Number(env("SMS_PER_TEAM", "300"));
  const auth = "Basic " + btoa(sid + ":" + tokn);
  const sendAll = async (msgs: { to: string; body: string }[]) => {
    const used = Number(await rpc("usage_add", { p_k: "sms:" + ent, p_n: msgs.length }));
    if (used > cap) return null;
    let sent = 0, failed = 0;
    for (const m of msgs) {
      const form = new URLSearchParams({ To: m.to, Body: m.body });
      if (msid) form.set("MessagingServiceSid", msid); else form.set("From", from);
      try {
        const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, { method: "POST", headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString() });
        if (r.ok) sent++; else failed++;
      } catch { failed++; }
    }
    return { sent, failed };
  };
  // Family "safe" notice (school version): the server writes each text.
  if (b.family !== undefined) {
    const msgs = familyTexts(b.family, b.unit, b.at, b.place);
    if (!msgs) return json({ error: "Check the names, time and pickup place." }, 400);
    if (!msgs.length) return json({ error: "No valid US phone numbers." }, 400);
    const r = await sendAll(msgs);
    if (!r) return json({ error: `Your team reached today's limit of ${cap} texts.` }, 429);
    return json({ ok: 1, ...r });
  }
  // Check-in link. With people ({to, w}) and part 26 in place, replies to this number check people in by themselves.
  const ppl = cleanPeople(b.ppl);
  const to = ppl.length ? ppl.map((p) => p.to) : cleanNumbers(b.to);
  const apps = env("APP_URLS", "https://antoniotyler22.github.io/eoop-muster/").split(",").map((s) => s.trim()).filter(Boolean);
  if (!to.length) return json({ error: "No valid US phone numbers." }, 400);
  let reply = false;
  if (ppl.length) {
    try {
      const pepper = env("SMS_PEPPER", SRK);
      const rows = await Promise.all(ppl.map(async (p) => ({ k: await phKey(p.to, pepper), w: p.w })));
      reply = Number(await rpc("sms_routes_put", { p_recall: b.recall, p_rows: rows })) > 0;
    } catch { /* part 26 not run yet: the link still works */ }
  }
  const text = buildText(b.link, b.recall, apps, reply);
  if (!text) return json({ error: "Only check-in links can be texted from here." }, 400);
  const r = await sendAll(to.map((n) => ({ to: n, body: text })));
  if (!r) return json({ error: `Your team reached today's limit of ${cap} texts.` }, 429);
  return json({ ok: 1, ...r, reply });
}
if (D?.serve) D.serve(handle);
