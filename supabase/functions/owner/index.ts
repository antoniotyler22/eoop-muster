// Supabase Edge Function "owner": the app owner's console. One username and password that work from any phone.
// What the owner can do: see how the app is being used (counts only; team data is encrypted on phones and the server
// can't read it), post an announcement every phone shows, switch Ask and the news card off, remove a team, Feed,
// page, login or company by its id, comp Pro to a team, and read crash reports.
// Secrets: OWNER_USER (the username) and OWNER_HASH (hex SHA-256 of "username:password", username in lower case).
// The password itself is never stored anywhere. Turn OFF "Enforce JWT verification".
//  {op:"login", user, pass} -> {tok, exp}         12-hour token, 5 wrong tries lock an address for 15 minutes
//  every other op carries {tok}: stats | errors | cfg | setcfg {announce,announce_url,ask_off,news_off} |
//  remove {kind,id} | comp {days,note} | comps | endcomp {id} | ping
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
async function count(path: string): Promise<number | null> {
  try { const r = await fetch(URL0 + "/rest/v1/" + path, { method: "HEAD", headers: hdrs({ Prefer: "count=exact" }) }); const cr = r.headers.get("content-range") || ""; const n = +cr.split("/")[1]; return Number.isFinite(n) ? n : null; } catch { return null; }
}

/* ---- sign in: a signed token, nothing stored ---- */
let hk: CryptoKey | null = null;
async function key() { return hk ??= await crypto.subtle.importKey("raw", te.encode("owner:" + OWNER_HASH), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]); }
async function mint() { const exp = Date.now() + 12 * 3600000; const sig = hex(await crypto.subtle.sign("HMAC", await key(), te.encode(String(exp)))); return { tok: exp + "." + sig, exp }; }
async function valid(tok: unknown) {
  if (typeof tok !== "string" || !OWNER_HASH) return false; const [e, s] = tok.split("."); const exp = +e; if (!exp || exp < Date.now() || !s) return false;
  return same(s, hex(await crypto.subtle.sign("HMAC", await key(), te.encode(String(exp)))));
}
const fails = new Map<string, { n: number; at: number }>();
function locked(ip: string) { const f = fails.get(ip); return !!f && f.n >= 5 && Date.now() - f.at < 15 * 60000; }
function fail(ip: string) { const f = fails.get(ip); fails.set(ip, { n: f && Date.now() - f.at < 15 * 60000 ? f.n + 1 : 1, at: Date.now() }); if (fails.size > 2000) fails.clear(); }

/* ---- what the owner can see and do ---- */
const d7 = () => new Date(Date.now() - 7 * 864e5).toISOString();
async function stats() {
  const now = new Date().toISOString();
  const [feeds, boards, recalls, recOpen, checkins7, posts7, logins, pages, dms, companies, backups, hubs, pro, comps, errs7, aiRows] = await Promise.all([
    count("feeds?select=id"), count("boards?select=id"), count("recalls?select=id"), count(`recalls?select=id&expires_at=gt.${now}`), count(`checkins?select=id&created_at=gt.${d7()}`),
    count(`feed_posts?select=id&created_at=gt.${d7()}`), count("logins?select=uid"), count("pages?select=id"), count("dm_threads?select=id"), count("companies?select=id"),
    count("backups?select=id"), count("hub_jobs?select=id"), count(`pro_ents?select=id&revoked=is.false&or=(expires_at.is.null,expires_at.gt.${now})&id=not.like.stripe:comp_*`),
    count("pro_ents?select=id&id=like.stripe:comp_*&revoked=is.false"), count(`client_errors?select=id&created_at=gt.${d7()}`),
    rest("ai_usage?select=n&day=eq." + new Date().toISOString().slice(0, 10)).catch(() => null),
  ]);
  const ai = Array.isArray(aiRows) ? aiRows.reduce((a: number, r: { n?: number }) => a + (+(r.n ?? 0) || 0), 0) : null;
  return { feeds, boards, recalls, recOpen, checkins7, posts7, logins, pages, dms, companies, backups, hubs, pro, comps, errs7, ai, at: Date.now() };
}
async function errors() { return (await rest(`client_errors?select=id,kind,msg,ver,plat,created_at&order=id.desc&limit=40`).catch(() => [])) ?? []; }
async function cfg() { const r = await rest("app_cfg?select=announce,announce_url,announce_at,ask_off,news_off,updated_at&id=eq.1"); return r && r[0] ? r[0] : null; }
async function setcfg(b: Record<string, unknown>) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof b.announce === "string") { patch.announce = b.announce.replace(/[<>]/g, "").slice(0, 300).trim(); patch.announce_at = patch.announce ? new Date().toISOString() : null; }
  if (typeof b.announce_url === "string") patch.announce_url = /^https?:\/\//.test(b.announce_url) ? b.announce_url.slice(0, 300) : "";
  if (typeof b.ask_off === "boolean") patch.ask_off = b.ask_off; if (typeof b.news_off === "boolean") patch.news_off = b.news_off;
  await rest("app_cfg?id=eq.1", { method: "PATCH", body: JSON.stringify(patch), headers: { Prefer: "return=minimal" } });
  return cfg();
}
const KINDS: Record<string, [string, string, RegExp]> = { feed: ["feeds", "id", /^[a-z0-9]{10,20}$/], board: ["boards", "id", /^[a-z0-9]{10,20}$/], recall: ["recalls", "id", /^[a-z0-9]{8,16}$/], page: ["pages", "id", /^[a-z0-9]{12,24}$/],
  company: ["companies", "id", /^[a-z0-9]{10,20}$/], login: ["logins", "uid", /^[0-9a-f]{64}$/], backup: ["backups", "id", /^[0-9a-f]{20}$/], dm: ["dm_threads", "id", /^[a-z0-9]{16,32}$/] };
async function remove(kind: unknown, id: unknown) {
  const k = KINDS[String(kind)]; if (!k) throw new Error("Pick what to remove."); const v = String(id ?? "").trim().toLowerCase(); if (!k[2].test(v)) throw new Error("That id doesn't look right for a " + kind + ".");
  const rows = await rest(`${k[0]}?${k[1]}=eq.${encodeURIComponent(v)}&select=${k[1]}`, { method: "DELETE", headers: { Prefer: "return=representation" } });
  return { removed: Array.isArray(rows) ? rows.length : 0 };
}
const rnd = (n: number) => { const a = crypto.getRandomValues(new Uint8Array(n)); return [...a].map((x) => "abcdefghijklmnopqrstuvwxyz0123456789"[x % 36]).join(""); };
async function comp(days: unknown, note: unknown) {
  const d = Math.min(3650, Math.max(1, Math.round(+(days as number) || 365))); const code = hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
  const id = "stripe:comp_" + rnd(12); const exp = new Date(Date.now() + d * 864e5).toISOString();
  await rest("pro_ents", { method: "POST", body: JSON.stringify({ id, source: "stripe", product: "pro.comp" + (note ? ":" + String(note).replace(/[^\w .-]/g, "").slice(0, 60) : ""), expires_at: exp, tok_hash: await sha(code), env: "comp" }), headers: { Prefer: "return=minimal" } });
  return { id, code, exp };
}
async function comps() { return (await rest("pro_ents?select=id,product,expires_at,revoked,created_at&id=like.stripe:comp_*&order=created_at.desc&limit=100").catch(() => [])) ?? []; }
async function endcomp(id: unknown) { const v = String(id ?? ""); if (!/^stripe:comp_[a-z0-9]{12}$/.test(v)) throw new Error("Not a comp id."); await rest("pro_ents?id=eq." + encodeURIComponent(v), { method: "PATCH", body: JSON.stringify({ revoked: true, updated_at: new Date().toISOString() }), headers: { Prefer: "return=minimal" } }); return { ok: 1 }; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let b: Record<string, unknown> = {}; try { b = await req.json(); } catch { /* empty */ }
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "?";
  try {
    if (b.op === "ping") return json({ ok: 1, owner: 1, set: !!(OWNER_USER && /^[0-9a-f]{64}$/.test(OWNER_HASH)) });
    if (b.op === "login") {
      if (!OWNER_USER || !/^[0-9a-f]{64}$/.test(OWNER_HASH)) return json({ error: "The owner isn't set up on the server (OWNER_USER and OWNER_HASH secrets)." }, 503);
      if (locked(ip)) return json({ error: "Too many tries. Wait 15 minutes." }, 429);
      const u = String(b.user ?? "").trim().toLowerCase(), p = String(b.pass ?? "");
      if (!u || !p || !same(u, OWNER_USER) || !same(await sha(u + ":" + p), OWNER_HASH)) { fail(ip); return json({ error: "Username or password is wrong." }, 401); }
      fails.delete(ip); return json(await mint());
    }
    if (!(await valid(b.tok))) return json({ error: "Sign in again." }, 401);
    switch (b.op) {
      case "stats": return json(await stats());
      case "errors": return json({ rows: await errors() });
      case "cfg": return json({ cfg: await cfg() });
      case "setcfg": return json({ cfg: await setcfg(b) });
      case "remove": return json(await remove(b.kind, b.id));
      case "comp": return json(await comp(b.days, b.note));
      case "comps": return json({ rows: await comps() });
      case "endcomp": return json(await endcomp(b.id));
      default: return json({ error: "bad request" }, 400);
    }
  } catch (e) {
    const t = String((e as Error).message || e);
    if (/app_cfg|schema cache|does not exist/i.test(t)) return json({ error: "Run setup part 29 first." }, 503);
    return json({ error: t.slice(0, 200) }, /doesn't look right|Pick what|Not a comp/.test(t) ? 400 : 500);
  }
});
