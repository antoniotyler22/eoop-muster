// Supabase Edge Function "sms-in": people check in by texting back. Set it as the incoming-message webhook of the
// Twilio number the "sms" function texts from (Twilio → Phone Numbers → your number → Messaging → "A message comes in"
// → Webhook, HTTP POST, https://<project>.supabase.co/functions/v1/sms-in). Turn OFF "Enforce JWT verification".
// Secrets: TWILIO_AUTH_TOKEN (checks the request really came from Twilio). Optional: SMS_PEPPER (must match "sms"),
// SMS_IN_URL (the exact webhook address, if Twilio is set to a different one).
// Needs part 26. A reply only counts when this number was texted for a check-in that's still open, and it counts as the
// person it was texted to. The reply's number is turned into a one-way key and never stored.

// Self-contained so it can be pasted into the Supabase dashboard on its own. phKey must match the "sms" function's.
export async function phKey(e164: string, pepper: string): Promise<string> {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("af-sms|" + pepper + "|" + e164));
  return Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
}
/** A US number as +1XXXXXXXXXX, or undefined. */
export function e164(x: unknown): string | undefined {
  let d = String(x ?? "").replace(/\D/g, "");
  if (d.length === 11 && d[0] === "1") d = d.slice(1);
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(d) ? "+1" + d : undefined;
}

const D = (globalThis as any).Deno;
const env = (k: string, d = "") => (D?.env.get(k) ?? d) || d;
const URL0 = env("SUPABASE_URL"), SRK = env("SUPABASE_SERVICE_ROLE_KEY");

/** 1 = OK, 2 = delayed, 3 = need help, 0 = couldn't tell. Same words the app understands in pasted replies. */
export function replyCode(t: unknown): number {
  const s = String(t ?? "").toLowerCase();
  if (/\b(help|sos|emergenc\w*|hurt|injur\w*|hospital|ayuda)\b/.test(s)) return 3;
  if (/\b(delay\w*|late|eta|en ?route|omw|on my way|running behind|tarde)\b/.test(s)) return 2;
  if (/\b(good|ok|okay|up|here|safe|accounted|present|copy|roger|yes|y|bien|aqui|aquí)\b|👍|✅/.test(s)) return 1;
  const d = s.match(/(?:^|[^\w:])([123])(?![\w:])(?!\s*(?:min|mins|minutes|hr|hrs|hour|hours|mi|miles|pm|am)\b)/);
  return d ? +d[1] : 0;
}
/** What goes with the check-in: the ETA or a short note, never more than 40 characters. */
export function replyNote(t: unknown, code: number): string {
  const s = String(t ?? "").replace(/\s+/g, " ").trim();
  const eta = (s.match(/\beta\b[:\s]*([^,;]{1,30})/i) || [])[1];
  if (eta) return ("ETA " + eta.trim()).slice(0, 40);
  if (code === 1) return "";
  const rest = s.replace(/^\s*[123]\b[\s.,:-]*/, "").replace(/[<>]/g, "").trim();
  return rest.slice(0, 40);
}
const ANSWER: Record<number, string> = {
  1: "Checked in: OK. Thanks.",
  2: "Checked in: delayed. Text an ETA any time to update it.",
  3: "Got it: your leader was alerted that you need help. If it's an emergency, call 911.",
};
const twiml = (msg: string) => new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${msg ? `<Message>${msg.replace(/[<>&]/g, "")}</Message>` : ""}</Response>`,
  { status: 200, headers: { "Content-Type": "text/xml" } });

/** Twilio signs each request: base64 HMAC-SHA1 of the webhook URL plus every form field (sorted by name). */
export async function twilioSig(token: string, url: string, params: URLSearchParams): Promise<string> {
  const keys = [...new Set([...params.keys()])].sort();
  let data = url;
  for (const k of keys) for (const v of params.getAll(k)) data += k + v;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(token), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
  return btoa(String.fromCharCode(...mac));
}
function hdrs() {
  const h: Record<string, string> = { apikey: SRK, "Content-Type": "application/json" };
  if (SRK.startsWith("eyJ")) h.Authorization = "Bearer " + SRK;
  return h;
}
async function rpc(fn: string, args: unknown) {
  const r = await fetch(URL0 + "/rest/v1/rpc/" + fn, { method: "POST", headers: hdrs(), body: JSON.stringify(args) });
  const t = await r.text();
  if (!r.ok) throw new Error(t.slice(0, 200));
  return t ? JSON.parse(t) : null;
}
/** Tell the leader's phone right away: a push (notify function) and a live-update ping (only a hashed channel name). */
async function wake(recall: string) {
  const jobs: Promise<unknown>[] = [];
  for (const n of ["notify", "Notify"]) jobs.push(fetch(URL0 + "/functions/v1/" + n, { method: "POST", headers: hdrs(), body: JSON.stringify({ recall }) }).catch(() => {}));
  try {
    const b = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("af|p_recall|" + recall)));
    const topic = "af-" + [...b].slice(0, 12).map((x) => x.toString(16).padStart(2, "0")).join("");
    jobs.push(fetch(URL0 + "/realtime/v1/api/broadcast", { method: "POST", headers: hdrs(), body: JSON.stringify({ messages: [{ topic, event: "ping", payload: { s: "sms", k: "p_recall" }, private: false }] }) }).catch(() => {}));
  } catch { /* the app also checks every few seconds */ }
  await Promise.all(jobs);
}

export async function handle(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  const raw = await req.text();
  const p = new URLSearchParams(raw);
  const token = env("TWILIO_AUTH_TOKEN");
  if (!token) return new Response("not set up", { status: 503 });
  const sig = req.headers.get("x-twilio-signature") || "";
  const urls = [env("SMS_IN_URL"), URL0 + "/functions/v1/sms-in", req.url].filter(Boolean);
  let ok = false;
  for (const u of urls) if (sig && sig === await twilioSig(token, u, p)) { ok = true; break; }
  if (!ok) return new Response("forbidden", { status: 403 });
  const from = e164(p.get("From"));
  const body = String(p.get("Body") || "").slice(0, 300);
  if (!from) return twiml("");
  // STOP / HELP keywords are handled by Twilio itself.
  if (/^\s*(stop|stopall|unsubscribe|cancel|end|quit|start|unstop|info)\s*$/i.test(body)) return twiml("");
  const code = replyCode(body);
  if (!code) return twiml("Reply 1 = OK, 2 = delayed (add your ETA), 3 = need help.");
  let recall: string | null = null;
  try { recall = await rpc("sms_reply", { p_ph_key: await phKey(from, env("SMS_PEPPER", SRK)), p_code: code, p_note: replyNote(body, code) }); }
  catch { return twiml("Couldn't check you in right now. Use the link in the text or call your leader."); }
  if (!recall) return twiml("There's no open check-in for this number. If you need help, call your leader or 911.");
  await wake(recall);
  return twiml(ANSWER[code]);
}
if (D?.serve) D.serve(handle);
