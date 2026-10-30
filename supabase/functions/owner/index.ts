// Supabase Edge Function "owner": the app owner's console. One username and password that work from any phone.
// What the owner can do: see how the app is being used (counts only; team data is encrypted on phones and the server
// can't read it), post an announcement every phone shows, switch Ask and the news card off, remove a team, Feed,
// page, login or company by its id, comp Pro to a team, and read crash reports.
// Secrets: OWNER_USER (the username) and OWNER_HASH (hex SHA-256 of "username:password", username in lower case).
// The password itself is never stored anywhere. Once the owner changes the password from the console, the new hash
// lives in app_cfg (part 30) and the secret is only the first one. Turn OFF "Enforce JWT verification".
//  {op:"login", user, pass[, code]} -> {tok, exp} or {need:"code"} when 2-step is on.
//    12-hour token, 5 wrong tries lock an address for 15 minutes. Every sign-in is logged and pushed to the owner's phone.
//  every other op carries {tok}: stats | errors | cfg | setcfg {announce,announce_url,ask_off,news_off} |
//  remove {kind,id} | comp {days,note} | comps | endcomp {id} | health | alerts | log | setpass {cur,next} | signoutall |
//  totp_start | totp_on {code} | totp_off {code} | setsub {sub} | ping | subcount | broadcast {title, body, test}.   {op:"cron", key}: every 10 min from pg_cron.
//  alerts: asks the Notify function whether alerts are going out ({stalled:1}) and whether this owner's phone is set to be warned.
//  The "alerts not going out" buzz itself is sent by Notify's minute job (4.32.0), so it works even if this function is down.
import webpush from "npm:web-push@3.6.7";
const URL0 = Deno.env.get("SUPABASE_URL") ?? "";
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const OWNER_USER = (Deno.env.get("OWNER_USER") ?? "").trim().toLowerCase();
const OWNER_HASH = (Deno.env.get("OWNER_HASH") ?? "").trim().toLowerCase();
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "apikey, content-type, authorization, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
const te = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const sha = async (s: string) => hex(await crypto.subtle.digest("SHA-256", te.encode(s)));
const same = (a: string, b: string) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };

function hdrs(extra: Record<string, string> = {}) { const h: Record<string, string> = { apikey: SRK, "Content-Type": "application/json", ...extra }; if (SRK.startsWith("eyJ")) h.Authorization = "Bearer " + SRK; return h; }
async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(URL0 + "/rest/v1/" + path, { ...init, headers: hdrs((init.headers as Record<string, string>) ?? {}) });
  const t = await r.text(); if (!r.ok) throw new Error((() => { try { return JSON.parse(t).message; } catch { return t; } })() || "HTTP " + r.status);
  return t ? JSON.parse(t) : null;
}

/* ---- the owner's settings row (part 30 columns are optional: before part 30 the secret alone is used) ---- */
type Own = { owner_hash?: string | null; owner_totp?: string | null; owner_totp_pending?: string | null; owner_codes?: string[]; owner_sub?: unknown; tok_epoch?: number; cron_token?: string; alert_at?: string | null };
let ownErr = "";
async function own(): Promise<Own> {
  try { const r = await rest("app_cfg?select=owner_hash,owner_totp,owner_totp_pending,owner_codes,owner_sub,tok_epoch,cron_token,alert_at&id=eq.1"); ownErr = Array.isArray(r) ? (r[0] ? "" : "no row") : "not a list"; return r && r[0] ? r[0] : {}; } catch (e) { ownErr = String((e as Error).message || e).slice(0, 120); return {}; }
}
const patchOwn = (p: Record<string, unknown>) => rest("app_cfg?id=eq.1", { method: "PATCH", body: JSON.stringify(p), headers: { Prefer: "return=minimal" } });
const hashOf = (o: Own) => (o.owner_hash && /^[0-9a-f]{64}$/.test(o.owner_hash) ? o.owner_hash : OWNER_HASH);

/* ---- sign in: a signed token, nothing stored. Changing the password or "sign out everywhere" bumps tok_epoch, which
   is part of the signing key, so every token issued before stops working. ---- */
async function key(o: Own) { return crypto.subtle.importKey("raw", te.encode("owner:" + hashOf(o) + ":" + (o.tok_epoch || 0)), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]); }
async function mint(o: Own) { const exp = Date.now() + 12 * 3600000; const sig = hex(await crypto.subtle.sign("HMAC", await key(o), te.encode(String(exp)))); return { tok: exp + "." + sig, exp }; }
async function valid(o: Own, tok: unknown) {
  if (typeof tok !== "string" || !hashOf(o)) return false; const [e, s] = tok.split("."); const exp = +e; if (!exp || exp < Date.now() || !s) return false;
  return same(s, hex(await crypto.subtle.sign("HMAC", await key(o), te.encode(String(exp)))));
}
/* 2-step: a 6-digit code from an authenticator app (TOTP, 30 s, SHA-1), or one of 8 recovery codes shown once. */
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function b32enc(u: Uint8Array) { let bits = 0, v = 0, out = ""; for (const b of u) { v = (v << 8) | b; bits += 8; while (bits >= 5) { out += B32[(v >>> (bits - 5)) & 31]; bits -= 5; } } if (bits) out += B32[(v << (5 - bits)) & 31]; return out; }
function b32dec(s: string) { let bits = 0, v = 0; const out: number[] = []; for (const c of s.toUpperCase().replace(/[^A-Z2-7]/g, "")) { v = (v << 5) | B32.indexOf(c); bits += 5; if (bits >= 8) { out.push((v >>> (bits - 8)) & 255); bits -= 8; } } return new Uint8Array(out); }
async function totp(secret: string, step: number) {
  const k = await crypto.subtle.importKey("raw", b32dec(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const msg = new Uint8Array(8); let t = step; for (let i = 7; i >= 0; i--) { msg[i] = t & 255; t = Math.floor(t / 256); }
  const h = new Uint8Array(await crypto.subtle.sign("HMAC", k, msg)); const off = h[19] & 15;
  const n = ((h[off] & 127) << 24 | h[off + 1] << 16 | h[off + 2] << 8 | h[off + 3]) % 1000000; return String(n).padStart(6, "0");
}
async function totpOk(secret: string, code: unknown) { const c = String(code ?? "").replace(/\D/g, ""); if (c.length !== 6) return false; const now = Math.floor(Date.now() / 30000); for (const d of [0, -1, 1]) if (same(await totp(secret, now + d), c)) return true; return false; }
const newCode = () => { const a = crypto.getRandomValues(new Uint8Array(10)); return [...a].map((x) => "abcdefghjkmnpqrstuvwxyz23456789"[x % 31]).join("").replace(/(.{5})/, "$1-"); };

/* ---- the audit log and the owner's phone ---- */
async function log(ip: string, op: string, detail = "", ok = true) { try { await rest("owner_log", { method: "POST", body: JSON.stringify({ ip: ip.slice(0, 64), op: op.slice(0, 24), detail: String(detail).slice(0, 300), ok }), headers: { Prefer: "return=minimal" } }); } catch { /* before part 30 */ } }
let vapid = false;
async function push(o: Own, title: string, body: string) { return pushTo(o.owner_sub, title, body, "owner"); }
/* one alert to one subscription ({apns} from the iPhone app, or a browser push subscription). "gone" = the phone's
   token is dead and the row should go. */
async function pushTo(sub0: unknown, title: string, body: string, open = "board", urgent = true) {
  const sub = sub0 as { endpoint?: string; apns?: string } | null; if (!sub || typeof sub !== "object") return "no sub";
  try {
    if (typeof sub.apns === "string") {
      const pem = (Deno.env.get("APNS_KEY") ?? "").replace(/-----[^-]+-----/g, "").replace(/\s+/g, ""); if (!pem) return "no apns";
      const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)); const k = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
      const b64u = (b: ArrayBuffer | string) => btoa(typeof b === "string" ? b : String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      const hd = b64u(JSON.stringify({ alg: "ES256", kid: Deno.env.get("APNS_KEY_ID") ?? "" })), bd = b64u(JSON.stringify({ iss: Deno.env.get("APNS_TEAM_ID") ?? "", iat: Math.floor(Date.now() / 1000) }));
      const jwt = hd + "." + bd + "." + b64u(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, k, te.encode(hd + "." + bd)));
      const host = Deno.env.get("APNS_SANDBOX") === "1" ? "api.sandbox.push.apple.com" : "api.push.apple.com";
      const r = await fetch(`https://${host}/3/device/${sub.apns}`, { method: "POST", headers: { authorization: "bearer " + jwt, "apns-topic": Deno.env.get("APNS_TOPIC") || "com.antoniotyler.accountedfor", "apns-push-type": "alert", "apns-priority": "10", "content-type": "application/json" }, body: JSON.stringify({ aps: { alert: { title, body }, sound: "default" }, open: "owner" }) });
      return r.ok ? "ok" : (r.status === 410 || r.status === 400 ? "gone" : "fail " + r.status);
    }
    if (!vapid) { webpush.setVapidDetails("mailto:antoniotyler22@gmail.com", Deno.env.get("VAPID_PUBLIC")!, Deno.env.get("VAPID_PRIVATE")!); vapid = true; }
    await webpush.sendNotification(sub as never, JSON.stringify({ title, body, help: urgent, open }), { TTL: 3600, urgency: urgent ? "high" : "normal" }); return "ok";
  } catch (e) { const c = (e as { statusCode?: number }).statusCode; if (c === 404 || c === 410) return "gone"; return "fail " + String((e as Error).message || e).slice(0, 40); }
}
/* ---- every phone that has alerts on: team lists (feed_subs), leader phones (feeds.leader_sub), recall and live-board
   phones, and the owner's. One phone can sit on several lists; it is counted and sent to once. ---- */
type SubRow = { where: string; id: string | number; sub: { endpoint?: string; apns?: string } };
async function allSubs(): Promise<SubRow[]> {
  const rows: SubRow[] = [];
  const page = async (path: string, where: string, idk: string, subk: string) => {
    for (let off = 0; off < 20000; off += 1000) {
      const r = await rest(path + "&limit=1000&offset=" + off).catch(() => []) as Record<string, unknown>[];
      for (const x of r || []) if (x[subk] && typeof x[subk] === "object") rows.push({ where, id: x[idk] as string | number, sub: x[subk] as SubRow["sub"] });
      if (!r || r.length < 1000) break;
    }
  };
  await page("feed_subs?select=id,sub&order=id", "feed_subs", "id", "sub");
  await page("feeds?select=id,leader_sub&leader_sub=not.is.null&order=id", "feeds", "id", "leader_sub");
  await page("recalls?select=id,push_sub&push_sub=not.is.null&expires_at=gt." + new Date().toISOString() + "&order=id", "recalls", "id", "push_sub");
  await page("boards?select=id,push_sub&push_sub=not.is.null&order=id", "boards", "id", "push_sub");
  try { const o = await rest("app_cfg?select=owner_sub&id=eq.1"); if (o && o[0] && o[0].owner_sub) rows.push({ where: "owner", id: 1, sub: o[0].owner_sub }); } catch { /* no row */ }
  return rows;
}
const subKey = (s: SubRow["sub"]) => typeof s.apns === "string" ? "a:" + s.apns : typeof s.endpoint === "string" ? "w:" + s.endpoint : "";
function distinct(rows: SubRow[]) { const by = new Map<string, SubRow[]>(); for (const r of rows) { const k = subKey(r.sub); if (!k) continue; const l = by.get(k); if (l) l.push(r); else by.set(k, [r]); } return by; }
let bcastAt = 0;
/* {op:"broadcast", title, body, test} → one alert to every distinct phone. Dead tokens are removed from the rows they
   came from. At most one broadcast a minute. */
async function broadcast(b: Record<string, unknown>) {
  if (Date.now() - bcastAt < 60000) throw new Error("Wait a minute between sends.");
  const title = String(b.title ?? "").replace(/[<>]/g, "").trim().slice(0, 80), body = String(b.body ?? "").replace(/[<>]/g, "").trim().slice(0, 240);
  if (!title) throw new Error("Give the alert a title.");
  bcastAt = Date.now();
  const by = distinct(await allSubs()); const phones = [...by.entries()];
  let sent = 0, gone = 0, failed = 0; const dead: SubRow[] = [];
  for (let i = 0; i < phones.length; i += 25) {
    await Promise.allSettled(phones.slice(i, i + 25).map(async ([, rows]) => {
      const r = await pushTo(rows[0].sub, title, body, "board", !b.test);
      if (r === "ok") sent++; else if (r === "gone") { gone++; dead.push(...rows); } else failed++;
    }));
  }
  for (const d of dead) {
    try {
      if (d.where === "feed_subs") await rest("feed_subs?id=eq." + d.id, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      else if (d.where === "feeds") await rest("feeds?id=eq." + encodeURIComponent(String(d.id)), { method: "PATCH", body: JSON.stringify({ leader_sub: null }), headers: { Prefer: "return=minimal" } });
      else if (d.where === "recalls") await rest("recalls?id=eq." + encodeURIComponent(String(d.id)), { method: "PATCH", body: JSON.stringify({ push_sub: null }), headers: { Prefer: "return=minimal" } });
      else if (d.where === "boards") await rest("boards?id=eq." + encodeURIComponent(String(d.id)), { method: "PATCH", body: JSON.stringify({ push_sub: null }), headers: { Prefer: "return=minimal" } });
    } catch { /* next */ }
  }
  return { phones: phones.length, sent, gone, failed, at: Date.now() };
}
const fails = new Map<string, { n: number; at: number }>();
function locked(ip: string) { const f = fails.get(ip); return !!f && f.n >= 5 && Date.now() - f.at < 15 * 60000; }
function fail(ip: string) { const f = fails.get(ip); fails.set(ip, { n: f && Date.now() - f.at < 15 * 60000 ? f.n + 1 : 1, at: Date.now() }); if (fails.size > 2000) fails.clear(); }

/* ---- what the owner can see and do ---- */
async function stats() { const o = await rest("rpc/owner_stats", { method: "POST", body: "{}" }); return { ...o, at: Date.now() }; }
async function errors() { return (await rest("rpc/owner_errors", { method: "POST", body: "{}" }).catch(() => [])) ?? []; }
async function cfg() { const r = await rest("app_cfg?select=announce,announce_url,announce_at,ask_off,news_off,updated_at&id=eq.1"); return r && r[0] ? r[0] : null; }
async function setcfg(b: Record<string, unknown>) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof b.announce === "string") { patch.announce = b.announce.replace(/[<>]/g, "").slice(0, 300).trim(); patch.announce_at = patch.announce ? new Date().toISOString() : null; }
  if (typeof b.announce_url === "string") patch.announce_url = /^https?:\/\//.test(b.announce_url) ? b.announce_url.slice(0, 300) : "";
  if (typeof b.ask_off === "boolean") patch.ask_off = b.ask_off; if (typeof b.news_off === "boolean") patch.news_off = b.news_off;
  await rest("app_cfg?id=eq.1", { method: "PATCH", body: JSON.stringify(patch), headers: { Prefer: "return=minimal" } });
  return cfg();
}
const KINDS: Record<string, RegExp> = { feed: /^[a-z0-9]{10,20}$/, board: /^[a-z0-9]{10,20}$/, recall: /^[a-z0-9]{8,16}$/, page: /^[a-z0-9]{12,24}$/, company: /^[a-z0-9]{10,20}$/, login: /^[0-9a-f]{64}$/, backup: /^[0-9a-f]{20}$/, dm: /^[a-z0-9]{16,32}$/ };
async function remove(kind: unknown, id: unknown) {
  const k = KINDS[String(kind)]; if (!k) throw new Error("Pick what to remove."); const v = String(id ?? "").trim().toLowerCase(); if (!k.test(v)) throw new Error("That id doesn't look right for a " + kind + ".");
  const n = await rest("rpc/owner_remove", { method: "POST", body: JSON.stringify({ p_kind: String(kind), p_id: v }) });
  return { removed: +n || 0 };
}
const rnd = (n: number) => { const a = crypto.getRandomValues(new Uint8Array(n)); return [...a].map((x) => "abcdefghijklmnopqrstuvwxyz0123456789"[x % 36]).join(""); };
async function comp(days: unknown, note: unknown) {
  const d = Math.min(3650, Math.max(1, Math.round(+(days as number) || 365))); const code = hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
  const id = "stripe:comp_" + rnd(12); const exp = new Date(Date.now() + d * 864e5).toISOString();
  await rest("pro_ents", { method: "POST", body: JSON.stringify({ id, source: "stripe", product: "pro.comp" + (note ? ":" + String(note).replace(/[^\w .-]/g, "").slice(0, 60) : ""), expires_at: exp, tok_hash: await sha(code), env: "comp" }), headers: { Prefer: "return=minimal" } });
  return { id, code, exp };
}
async function comps() { return (await rest("pro_ents?select=id,product,expires_at,revoked,created_at&id=like.stripe:comp_*&order=created_at.desc&limit=100").catch(() => [])) ?? []; }
async function health() { return await rest("rpc/owner_health", { method: "POST", body: "{}" }); }
async function logs() { return (await rest("owner_log?select=id,t,ip,op,detail,ok&order=id.desc&limit=100").catch(() => [])) ?? []; }
/* Are alerts going out? Asks Notify ({stalled:1}: 200 "ok", 503 "check-ins waiting…", 500 "database denied") and says whether the
   owner's phone is set to be warned (Notify's minute job does the warning) and how many phones have alerts on. */
async function alerts(o: Own) {
  let state = "ok";
  try {
    const cfgRow = await rest("app_cfg?select=notify_fn&id=eq.1").catch(() => null); const fn = (cfgRow && cfgRow[0] && cfgRow[0].notify_fn) || "notify";
    const r = await fetch(URL0 + "/functions/v1/" + fn, { method: "POST", headers: hdrs(), body: JSON.stringify({ stalled: 1 }) }); const t = (await r.text()).slice(0, 100);
    state = r.status === 200 ? "ok" : r.status === 503 ? t : r.status === 500 ? "The database is refusing the alert server (run setup part 35)." : "The alert server answered " + r.status + ". Is it deployed with the latest code?";
  } catch { state = "The alert server didn't answer."; }
  let phones = 0; try { phones = distinct(await allSubs()).size; } catch { /* leave 0 */ }
  const sub = o.owner_sub as { endpoint?: string; apns?: string } | null;
  return { state, owner: !!(sub && typeof sub === "object" && (sub.endpoint || sub.apns)), phones };
}
async function cronCheck(o: Own) {
  const s = await rest("rpc/owner_stats", { method: "POST", body: "{}" }); const h1 = +s.crash_h1 || 0, h7 = +s.crash_prev6 || 0;
  const base = h7 / 6; const spike = (h1 ?? 0) >= 8 && (h1 ?? 0) >= 3 * Math.max(base, 1);
  const recent = o.alert_at && Date.now() - Date.parse(o.alert_at) < 2 * 3600000;
  if (spike && !recent) { const r = await push(o, "⚠ Crash spike", `${h1} crash reports in the last hour (usually about ${Math.round(base)}). Open the Owner console.`); await patchOwn({ alert_at: new Date().toISOString() }); await log("cron", "alert", "crash spike " + h1 + " → " + r); return { spike, pushed: r }; }
  return { spike, h1, base: Math.round(base * 10) / 10 };
}
async function endcomp(id: unknown) { const v = String(id ?? ""); if (!/^stripe:comp_[a-z0-9]{12}$/.test(v)) throw new Error("Not a comp id."); await rest("pro_ents?id=eq." + encodeURIComponent(v), { method: "PATCH", body: JSON.stringify({ revoked: true, updated_at: new Date().toISOString() }), headers: { Prefer: "return=minimal" } }); return { ok: 1 }; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let b: Record<string, unknown> = {}; try { b = await req.json(); } catch { /* empty */ }
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "?";
  try {
    const o = await own(); const H = hashOf(o);
    if (b.op === "ping") return json({ ok: 1, owner: 1, set: !!(OWNER_USER && /^[0-9a-f]{64}$/.test(H)), totp: !!o.owner_totp, p30: "tok_epoch" in o, ...(ownErr ? { p30err: ownErr } : {}) });
    if (b.op === "cron") { if (!o.cron_token || !same(String(b.key ?? ""), o.cron_token)) return json({ error: "not allowed" }, 403); return json(await cronCheck(o)); }
    if (b.op === "login") {
      if (!OWNER_USER || !/^[0-9a-f]{64}$/.test(H)) return json({ error: "The owner isn't set up on the server (OWNER_USER and OWNER_HASH secrets)." }, 503);
      if (locked(ip)) { await log(ip, "login", "locked out", false); return json({ error: "Too many tries. Wait 15 minutes." }, 429); }
      const u = String(b.user ?? "").trim().toLowerCase(), p = String(b.pass ?? "");
      if (!u || !p || !same(u, OWNER_USER) || !same(await sha(u + ":" + p), H)) { fail(ip); await log(ip, "login", "wrong password", false); return json({ error: "Username or password is wrong." }, 401); }
      if (o.owner_totp) {
        if (b.code == null || b.code === "") return json({ need: "code" });
        const c = String(b.code).trim().toLowerCase().replace(/\s/g, "");
        let ok = await totpOk(o.owner_totp, c);
        if (!ok && /^[a-z0-9]{5}-?[a-z0-9]{5}$/.test(c)) { const hc = await sha("rc:" + c.replace("-", "")); const codes = o.owner_codes || []; if (codes.includes(hc)) { ok = true; await patchOwn({ owner_codes: codes.filter((x) => x !== hc) }); await log(ip, "login", "recovery code used (" + (codes.length - 1) + " left)"); } }
        if (!ok) { fail(ip); await log(ip, "login", "wrong 2-step code", false); return json({ error: "That code isn't right." }, 401); }
      }
      fails.delete(ip); await log(ip, "login", o.owner_totp ? "with 2-step" : "password only");
      push(o, "🛡 Owner sign-in", "Someone signed in as the app owner from " + ip + ". Not you? Open the console → Security → Sign out everywhere.").catch(() => {});
      return json(await mint(o));
    }
    if (!(await valid(o, b.tok))) return json({ error: "Sign in again." }, 401);
    switch (b.op) {
      case "stats": return json(await stats());
      case "errors": return json({ rows: await errors() });
      case "cfg": return json({ cfg: await cfg() });
      case "setcfg": { const c = await setcfg(b); await log(ip, "setcfg", JSON.stringify({ announce: typeof b.announce === "string" ? b.announce.slice(0, 80) : undefined, ask_off: b.ask_off, news_off: b.news_off })); return json({ cfg: c }); }
      case "remove": { const r = await remove(b.kind, b.id); await log(ip, "remove", String(b.kind) + " " + String(b.id).slice(0, 64) + (r.removed ? "" : " (nothing)")); return json(r); }
      case "comp": { const r = await comp(b.days, b.note); await log(ip, "comp", r.id + " " + String(b.days || 365) + " d" + (b.note ? " · " + String(b.note).slice(0, 60) : "")); return json(r); }
      case "comps": return json({ rows: await comps() });
      case "endcomp": { const r = await endcomp(b.id); await log(ip, "endcomp", String(b.id)); return json(r); }
      case "health": return json({ h: await health() });
      case "alerts": return json(await alerts(o));
      case "subcount": { const by = distinct(await allSubs()); let apns = 0; for (const k of by.keys()) if (k.startsWith("a:")) apns++; return json({ phones: by.size, iphone: apns, web: by.size - apns }); }
      case "broadcast": { const r = await broadcast(b); await log(ip, "broadcast", (b.test ? "test · " : "") + String(b.title ?? "").slice(0, 60) + " · " + r.sent + "/" + r.phones + " sent, " + r.gone + " gone, " + r.failed + " failed"); return json(r); }
      case "log": return json({ rows: await logs() });
      case "setpass": {
        const cur = String(b.cur ?? ""), nx = String(b.next ?? "");
        if (!same(await sha(OWNER_USER + ":" + cur), H)) { await log(ip, "setpass", "wrong current password", false); return json({ error: "The current password is wrong." }, 401); }
        if (nx.length < 12) return json({ error: "The new password needs at least 12 characters." }, 400);
        if (!("tok_epoch" in o)) return json({ error: "Run setup part 30 first." }, 503);
        const nh = await sha(OWNER_USER + ":" + nx); const ep = (o.tok_epoch || 0) + 1; await patchOwn({ owner_hash: nh, tok_epoch: ep });
        await log(ip, "setpass", "password changed; every other sign-in ended"); return json(await mint({ ...o, owner_hash: nh, tok_epoch: ep }));
      }
      case "signoutall": { if (!("tok_epoch" in o)) return json({ error: "Run setup part 30 first." }, 503); await patchOwn({ tok_epoch: (o.tok_epoch || 0) + 1 }); await log(ip, "signoutall"); return json({ ok: 1 }); }
      case "totp_start": { if (!("tok_epoch" in o)) return json({ error: "Run setup part 30 first." }, 503); const secret = b32enc(crypto.getRandomValues(new Uint8Array(20))); await patchOwn({ owner_totp_pending: secret }); return json({ secret, uri: `otpauth://totp/Accounted%20For:owner?secret=${secret}&issuer=Accounted%20For&digits=6&period=30` }); }
      case "totp_on": {
        if (!o.owner_totp_pending) return json({ error: "Start 2-step first." }, 400); if (!(await totpOk(o.owner_totp_pending, b.code))) { await log(ip, "totp_on", "code didn't match", false); return json({ error: "That code isn't right. Check the time on your phone and try again." }, 401); }
        const plain: string[] = []; const hashed: string[] = []; for (let i = 0; i < 8; i++) { const c = newCode(); plain.push(c); hashed.push(await sha("rc:" + c.replace("-", ""))); }
        await patchOwn({ owner_totp: o.owner_totp_pending, owner_totp_pending: null, owner_codes: hashed }); await log(ip, "totp_on", "2-step turned on"); return json({ ok: 1, codes: plain });
      }
      case "totp_off": { if (!o.owner_totp) return json({ ok: 1 }); if (!(await totpOk(o.owner_totp, b.code))) { await log(ip, "totp_off", "code didn't match", false); return json({ error: "That code isn't right." }, 401); } await patchOwn({ owner_totp: null, owner_codes: [] }); await log(ip, "totp_off", "2-step turned off"); return json({ ok: 1 }); }
      case "setsub": { const sub = b.sub && typeof b.sub === "object" ? b.sub : null; if (!("tok_epoch" in o)) return json({ error: "Run setup part 30 first." }, 503); await patchOwn({ owner_sub: sub }); await log(ip, "setsub", sub ? "alerts on this phone" : "alerts off"); if (sub) { const r = await push({ ...o, owner_sub: sub }, "🛡 Owner alerts on", "This phone gets owner sign-ins and crash spikes."); return json({ ok: 1, test: r }); } return json({ ok: 1 }); }
      default: return json({ error: "bad request" }, 400);
    }
  } catch (e) {
    const t = String((e as Error).message || e);
    if (/app_cfg|owner_health|owner_log|schema cache|does not exist/i.test(t)) return json({ error: /owner_health|owner_log|tok_epoch|owner_/.test(t) ? "Run setup part 30 first." : "Run setup part 29 first." }, 503);
    return json({ error: t.slice(0, 200) }, /doesn't look right|Pick what|Not a comp/.test(t) ? 400 : 500);
  }
});
