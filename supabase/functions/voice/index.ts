// Supabase Edge Function "voice": "Press 1" phone calls for people who ignore the push and the text (Pro).
// The leader's phone asks for a call to everyone not yet checked in; Twilio rings each number, a robot voice says who is
// asking and what to press, and the keypress becomes a normal check-in: 1 = OK, 2 = delayed, 3 = need help.
// Turn OFF "Enforce JWT verification". No Twilio number setup is needed beyond a voice-capable TWILIO_FROM: each call
// carries this function's address as its instructions.
// Secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM (voice-capable, +1...). Optional: SMS_PEPPER (must match "sms"),
//          VOICE_URL (exact public address of this function if different), VOICE_PER_TEAM (calls per Pro team per day, default 100).
// Needs SQL parts 10, 20 and 26 (same keys and routes the text replies use). Numbers are never stored: only the same
// one-way key the text replies use, deleted with the check-in. Twilio needs a registered caller identity for US calls.

const D = (globalThis as any).Deno;
const env = (k: string, d = "") => (D?.env.get(k) ?? d) || d;
const URL0 = env("SUPABASE_URL"), SRK = env("SUPABASE_SERVICE_ROLE_KEY");
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, content-type, authorization, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

/** US numbers only, deduplicated, at most 100 per request (calls cost more than texts). */
export function cleanPeople(list: unknown): { to: string; w: string[] }[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>(), out: { to: string; w: string[] }[] = [];
  for (const x of list.slice(0, 300)) {
    let d = String((x && (x as any).to) ?? "").replace(/\D/g, "");
    if (d.length === 11 && d[0] === "1") d = d.slice(1);
    if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(d)) continue;
    const to = "+1" + d;
    const w = Array.isArray(x && (x as any).w) ? (x as any).w.filter((h: unknown) => typeof h === "string" && /^[0-9a-f]{16}$/.test(h)).slice(0, 6) : [];
    if (!w.length || seen.has(to)) continue;
    seen.add(to); out.push({ to, w });
    if (out.length >= 100) break;
  }
  return out;
}
/** Same one-way key as the "sms" and "sms-in" functions. */
export async function phKey(e164: string, pepper: string): Promise<string> {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("af-sms|" + pepper + "|" + e164));
  return Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
}
/** The unit name that gets read aloud: plain words only, so it can't smuggle anything into the call script. */
export function cleanUnit(u: unknown): string | null {
  const s = String(u ?? "").replace(/\s+/g, " ").trim();
  return /^[A-Za-z0-9 .,'&-]{1,30}$/.test(s) ? s : null;
}
/** What the robot says. The server writes every word; only the unit name is filled in. */
export function script(unit: string): { ask: string; bye: string } {
  return {
    ask: `This is an automated check-in call from ${unit}. We have not heard from you. Press 1 if you are OK. Press 2 if you are delayed. Press 3 if you need help.`,
    bye: "We did not get an answer. Please check in with your leader as soon as you can. Goodbye.",
  };
}
export const ANSWER: Record<number, string> = {
  1: "Thanks. You are checked in as OK. Goodbye.",
  2: "Thanks. You are checked in as delayed. Text your ETA to your leader. Goodbye.",
  3: "Your leader has been alerted that you need help. If this is an emergency, hang up and call 9 1 1. Goodbye.",
};
const xml = (inner: string) => new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`, { status: 200, headers: { "Content-Type": "text/xml" } });
const say = (t: string) => `<Say voice="Polly.Joanna">${t.replace(/[<>&"]/g, "")}</Say>`;

/** Twilio signs each request: base64 HMAC-SHA1 of the full URL plus every form field (sorted by name). */
export async function twilioSig(token: string, url: string, params: URLSearchParams): Promise<string> {
  const keys = [...new Set([...params.keys()])].sort();
  let data = url;
  for (const k of keys) for (const v of params.getAll(k)) data += k + v;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(token), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)))));
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
const sha256hex = async (t: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t))), (x) => x.toString(16).padStart(2, "0")).join("");
async function recallOK(id: unknown, key: unknown) {
  if (typeof id !== "string" || !/^[a-z0-9]{8,16}$/.test(id) || typeof key !== "string" || key.length < 16 || key.length > 200) return false;
  const r = await fetch(URL0 + "/rest/v1/recalls?select=read_key_hash,expires_at&id=eq." + encodeURIComponent(id), { headers: hdrs() });
  if (!r.ok) return false;
  const row = (await r.json())[0];
  return !!row && row.read_key_hash === await sha256hex(key) && Date.parse(row.expires_at) > Date.now();
}
async function wake(recall: string) {
  const jobs: Promise<unknown>[] = [];
  for (const n of ["notify", "Notify"]) jobs.push(fetch(URL0 + "/functions/v1/" + n, { method: "POST", headers: hdrs(), body: JSON.stringify({ recall }) }).catch(() => {}));
  try {
    const b = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("af|p_recall|" + recall)));
    const topic = "af-" + [...b].slice(0, 12).map((x) => x.toString(16).padStart(2, "0")).join("");
    jobs.push(fetch(URL0 + "/realtime/v1/api/broadcast", { method: "POST", headers: hdrs(), body: JSON.stringify({ messages: [{ topic, event: "ping", payload: { s: "voice", k: "p_recall" }, private: false }] }) }).catch(() => {}));
  } catch { /* the app also checks every few seconds */ }
  await Promise.all(jobs);
}

/** Twilio is calling back: first for the script (call answered), then with the key the person pressed. */
export async function webhook(req: Request): Promise<Response> {
  const token = env("TWILIO_AUTH_TOKEN");
  if (!token) return new Response("not set up", { status: 503 });
  const p = new URLSearchParams(await req.text());
  const sig = req.headers.get("x-twilio-signature") || "";
  const u = new URL(req.url);
  const base = env("VOICE_URL") || URL0 + "/functions/v1/voice";
  const urls = [base + u.search, req.url];
  let ok = false;
  for (const x of urls) if (sig && sig === await twilioSig(token, x, p)) { ok = true; break; }
  if (!ok) return new Response("forbidden", { status: 403 });
  const unit = cleanUnit(u.searchParams.get("u"));
  if (!unit) return xml(say("Sorry, this call could not be completed.") + "<Hangup/>");
  const sc = script(unit);
  // Voicemail or answering machine: leave nothing sensitive and don't count it as a check-in.
  if (/^machine/.test(p.get("AnsweredBy") || "")) return xml(say(`This is an automated check-in call from ${unit}. Please check in with your leader.`) + "<Hangup/>");
  const digit = (p.get("Digits") || "").trim();
  if (!digit) {
    const action = `${base}${u.search}`.replace(/&/g, "&amp;");
    const gather = (t: string) => `<Gather numDigits="1" timeout="8" action="${action}" method="POST">${say(t)}</Gather>`;
    return xml(gather(sc.ask) + gather("Press 1 if you are OK, 2 if delayed, 3 if you need help.") + say(sc.bye) + "<Hangup/>");
  }
  const code = digit === "1" ? 1 : digit === "2" ? 2 : digit === "3" ? 3 : 0;
  if (!code) return xml(say("Sorry, that was not 1, 2 or 3. Goodbye.") + "<Hangup/>");
  // For calls we place, the person we rang is "To".
  const to = p.get("To") || "";
  let d = to.replace(/\D/g, "");
  if (d.length === 11 && d[0] === "1") d = d.slice(1);
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(d)) return xml(say("Sorry, we could not check you in. Goodbye.") + "<Hangup/>");
  let recall: string | null = null;
  try { recall = await rpc("sms_reply", { p_ph_key: await phKey("+1" + d, env("SMS_PEPPER", SRK)), p_code: code, p_note: "by phone" }); }
  catch { return xml(say("Sorry, we could not check you in right now. Please contact your leader. Goodbye.") + "<Hangup/>"); }
  if (!recall) return xml(say("There is no open check-in for this number. If you need help, call your leader or 9 1 1. Goodbye.") + "<Hangup/>");
  await wake(recall);
  return xml(say(ANSWER[code]) + "<Hangup/>");
}

export async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (req.headers.get("x-twilio-signature")) return webhook(req);
  let b: any = {};
  try { b = await req.json(); } catch { return json({ error: "bad request" }, 400); }
  const sid = env("TWILIO_ACCOUNT_SID"), tokn = env("TWILIO_AUTH_TOKEN"), from = env("TWILIO_FROM");
  const ready = !!(sid && tokn && from);
  if (b.ping) return json({ ok: 1, voice: 1, ready });
  if (!ready) return json({ error: "Phone calls aren't set up yet." }, 503);
  let ent: string | null = null;
  try { ent = await rpc("pro_ent_for", { p_tok: typeof b.pro === "string" ? b.pro : null, p_feed: null, p_mk: null }); } catch { /* part 20 missing */ }
  if (!ent) return json({ error: "Phone calls are part of Accounted For Pro.", pro: true }, 402);
  if (!(await recallOK(b.recall, b.key))) return json({ error: "Start a live recall on this phone first." }, 403);
  const unit = cleanUnit(b.unit);
  if (!unit) return json({ error: "Check the unit name." }, 400);
  const ppl = cleanPeople(b.ppl);
  if (!ppl.length) return json({ error: "No valid US phone numbers." }, 400);
  const cap = Number(env("VOICE_PER_TEAM", "100"));
  const used = Number(await rpc("usage_add", { p_k: "voice:" + ent, p_n: ppl.length }));
  if (used > cap) return json({ error: `Your team reached today's limit of ${cap} calls.` }, 429);
  // Remember who is being called (same routes the text replies use) so a keypress finds the right check-in.
  try {
    const pepper = env("SMS_PEPPER", SRK);
    await rpc("sms_routes_put", { p_recall: b.recall, p_rows: await Promise.all(ppl.map(async (p) => ({ k: await phKey(p.to, pepper), w: p.w }))) });
  } catch { return json({ error: "Replies aren't set up yet (SQL part 26)." }, 503); }
  const base = env("VOICE_URL") || URL0 + "/functions/v1/voice";
  const callUrl = `${base}?u=${encodeURIComponent(unit)}`;
  const auth = "Basic " + btoa(sid + ":" + tokn);
  let placed = 0, failed = 0;
  for (const p of ppl) {
    const form = new URLSearchParams({ To: p.to, From: from, Url: callUrl, Method: "POST", MachineDetection: "Enable", Timeout: "25" });
    try {
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, { method: "POST", headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString() });
      if (r.ok) placed++; else failed++;
    } catch { failed++; }
  }
  return json({ ok: 1, placed, failed });
}
if (D?.serve) D.serve(handle);
