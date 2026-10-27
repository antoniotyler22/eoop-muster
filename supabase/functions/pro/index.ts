// Supabase Edge Function "pro": the server's record of who has Accounted For Pro.
//  - The iPhone app sends Apple's signed transaction after a purchase or restore; this function checks Apple's
//    signature (certificate chain up to Apple Root CA - G3) and records the subscription.
//  - Apple's App Store Server Notifications (V2) come here too, so renewals, expirations and refunds update the record
//    even when the app is closed. In App Store Connect → the app → App Information → App Store Server Notifications,
//    set both Production and Sandbox URLs to https://<project>.supabase.co/functions/v1/pro  (Version 2).
// Turn OFF "Enforce JWT verification". Secrets (all optional):
//   PRO_SECRET       long random text used to make team tokens (falls back to the service role key; set it once and keep it)
//   APPLE_BUNDLE_ID  default com.antoniotyler.accountedfor
//   PRO_PRODUCTS     comma list, default the yearly and monthly Pro product IDs
//   APPLE_SANDBOX    default 1: TestFlight/App Review (Sandbox) purchases count; they expire within hours to days. 0 = Production only
// Nothing personal is stored: only the subscription ID, product, end date and a hash of the team token.

const URL0 = (globalThis as any).Deno?.env.get("SUPABASE_URL") ?? "";
const SRK = (globalThis as any).Deno?.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const env = (k: string, d = "") => ((globalThis as any).Deno?.env.get(k) ?? d) || d;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, content-type, authorization, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
const te = new TextEncoder();

/* ------------------------------------------------------------------ */
/* Apple JWS verification with WebCrypto only (no libraries)           */
/* ------------------------------------------------------------------ */
export const APPLE_ROOT_G3_SHA256 = "63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179";
const OID = {
  ecdsaSha256: "2a8648ce3d040302",
  ecdsaSha384: "2a8648ce3d040303",
  p256: "2a8648ce3d030107",
  p384: "2b81040022",
  appleLeaf: "2a864886f76364060b01",         // 1.2.840.113635.100.6.11.1  (App Store receipt signing)
  appleIntermediate: "2a864886f76364060201", // 1.2.840.113635.100.6.2.1   (Apple WWDR intermediate)
};

type DerNode = { tag: number; start: number; hdr: number; len: number; end: number };
function node(b: Uint8Array, off: number): DerNode {
  if (off + 2 > b.length) throw new Error("bad DER");
  const tag = b[off];
  let len = b[off + 1], hdr = 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    if (n < 1 || n > 4) throw new Error("bad DER length");
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + b[off + 2 + i];
    hdr = 2 + n;
  }
  const end = off + hdr + len;
  if (end > b.length) throw new Error("bad DER: truncated");
  return { tag, start: off, hdr, len, end };
}
function kids(b: Uint8Array, n: DerNode): DerNode[] {
  const out: DerNode[] = [];
  for (let p = n.start + n.hdr; p < n.end;) { const c = node(b, p); out.push(c); p = c.end; }
  return out;
}
const body = (b: Uint8Array, n: DerNode) => b.subarray(n.start + n.hdr, n.end);
const whole = (b: Uint8Array, n: DerNode) => b.subarray(n.start, n.end);
const hex = (u: Uint8Array) => Array.from(u, (x) => x.toString(16).padStart(2, "0")).join("");
const b64d = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64url = (s: string) => b64d(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));

function derTime(b: Uint8Array, n: DerNode): number {
  const s = new TextDecoder().decode(body(b, n));
  const full = n.tag === 0x18 ? s : (+s.slice(0, 2) >= 50 ? "19" : "20") + s;
  return Date.UTC(+full.slice(0, 4), +full.slice(4, 6) - 1, +full.slice(6, 8), +full.slice(8, 10), +full.slice(10, 12), +full.slice(12, 14));
}

type Cert = { der: Uint8Array; tbs: Uint8Array; sigAlg: string; sig: Uint8Array; issuer: string; subject: string; spki: Uint8Array; curve: string; notBefore: number; notAfter: number; exts: Map<string, { critical: boolean; value: Uint8Array }> };
export function parseCert(der: Uint8Array): Cert {
  const top = node(der, 0);
  if (top.tag !== 0x30 || top.end !== der.length) throw new Error("bad DER: trailing bytes");
  const [tbsN, algN, sigN] = kids(der, top);
  if (!tbsN || !algN || !sigN || sigN.tag !== 0x03) throw new Error("bad certificate");
  const t = kids(der, tbsN);
  let i = t[0].tag === 0xa0 ? 1 : 0; // optional [0] version
  const serial = t[i++]; void serial; i++; // signature algorithm inside tbs
  const issuer = t[i++], validity = t[i++], subject = t[i++], spkiN = t[i++];
  // Extensions: only the [3] block inside the signed part counts.
  const exts = new Map<string, { critical: boolean; value: Uint8Array }>();
  const extBlock = t.slice(i).find((n) => n.tag === 0xa3);
  if (extBlock) {
    const seq = kids(der, extBlock)[0];
    for (const e of kids(der, seq)) {
      const f = kids(der, e);
      if (!f.length || f[0].tag !== 0x06) throw new Error("bad extension");
      const critical = f.length === 3 && f[1].tag === 0x01 && body(der, f[1])[0] !== 0;
      const val = f[f.length - 1];
      if (val.tag !== 0x04) throw new Error("bad extension");
      exts.set(hex(body(der, f[0])), { critical, value: body(der, val) });
    }
  }
  const [nb, na] = kids(der, validity);
  const spkiAlg = kids(der, kids(der, spkiN)[0]);
  const bits = body(der, sigN);
  return {
    der, tbs: whole(der, tbsN),
    sigAlg: hex(body(der, kids(der, algN)[0])),
    sig: bits.subarray(1), // first byte = unused bits (0)
    issuer: hex(whole(der, issuer)), subject: hex(whole(der, subject)),
    spki: whole(der, spkiN), curve: spkiAlg[1] ? hex(body(der, spkiAlg[1])) : "",
    notBefore: derTime(der, nb), notAfter: derTime(der, na), exts,
  };
}
function derSigToRaw(sig: Uint8Array, size: number): Uint8Array {
  const seq = node(sig, 0);
  const [r, s] = kids(sig, seq);
  const out = new Uint8Array(size * 2);
  const put = (n: DerNode, at: number) => {
    let v = body(sig, n);
    while (v.length > size && v[0] === 0) v = v.subarray(1);
    if (v.length > size) throw new Error("bad signature");
    out.set(v, at + size - v.length);
  };
  put(r, 0); put(s, size);
  return out;
}
const curveOf = (c: string) => (c === OID.p256 ? { name: "P-256", size: 32 } : c === OID.p384 ? { name: "P-384", size: 48 } : null);
async function keyOf(c: Cert) {
  const cv = curveOf(c.curve);
  if (!cv) throw new Error("unsupported key");
  return { key: await crypto.subtle.importKey("spki", c.spki, { name: "ECDSA", namedCurve: cv.name }, false, ["verify"]), size: cv.size };
}
async function signedBy(child: Cert, parent: Cert): Promise<boolean> {
  if (child.issuer !== parent.subject) return false;
  const hash = child.sigAlg === OID.ecdsaSha256 ? "SHA-256" : child.sigAlg === OID.ecdsaSha384 ? "SHA-384" : "";
  if (!hash) return false;
  const { key, size } = await keyOf(parent);
  return crypto.subtle.verify({ name: "ECDSA", hash }, key, derSigToRaw(child.sig, size), child.tbs);
}
const hasExt = (c: Cert, oid: string) => c.exts.has(oid);
const BASIC_CONSTRAINTS = "551d13"; // 2.5.29.19
/** True when the certificate says it's a CA (basicConstraints cA = TRUE). */
function isCA(c: Cert): boolean {
  const e = c.exts.get(BASIC_CONSTRAINTS);
  if (!e) return false;
  const seq = node(e.value, 0);
  const f = kids(e.value, seq);
  return !!f.length && f[0].tag === 0x01 && body(e.value, f[0])[0] !== 0;
}

/** Verifies an App Store JWS (transaction, renewal info or notification) and returns its payload. Throws if not genuine. */
export async function verifyAppleJWS(jws: string, opts: { rootSha256?: string; now?: number } = {}): Promise<any> {
  const parts = String(jws || "").split(".");
  if (parts.length !== 3) throw new Error("not a JWS");
  const header = JSON.parse(new TextDecoder().decode(b64url(parts[0])));
  if (header.alg !== "ES256" || !Array.isArray(header.x5c) || header.x5c.length !== 3) throw new Error("unexpected JWS header");
  const certs = header.x5c.map((c: string) => parseCert(b64d(c)));
  const [leaf, mid, root] = certs;
  const now = opts.now ?? Date.now();
  if (certs.some((c: Cert) => now < c.notBefore || now > c.notAfter)) throw new Error("certificate expired");
  const fp = hex(new Uint8Array(await crypto.subtle.digest("SHA-256", root.der)));
  if (fp !== (opts.rootSha256 ?? APPLE_ROOT_G3_SHA256)) throw new Error("not signed by Apple");
  if (!hasExt(leaf, OID.appleLeaf) || !hasExt(mid, OID.appleIntermediate)) throw new Error("not an App Store certificate");
  if (!isCA(mid) || !isCA(root) || isCA(leaf)) throw new Error("not an App Store certificate");
  if (!(await signedBy(mid, root)) || !(await signedBy(leaf, mid))) throw new Error("certificate chain broken");
  const { key } = await keyOf(leaf);
  const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, b64url(parts[2]), te.encode(parts[0] + "." + parts[1]));
  if (!ok) throw new Error("bad signature");
  return JSON.parse(new TextDecoder().decode(b64url(parts[1])));
}

/* ------------------------------------------------------------------ */
/* Records                                                             */
/* ------------------------------------------------------------------ */
export async function teamToken(entId: string, secret: string) {
  const k = await crypto.subtle.importKey("raw", te.encode("accounted-for-pro:" + secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(new Uint8Array(await crypto.subtle.sign("HMAC", k, te.encode(entId))));
}
const sha256hex = async (s: string) => hex(new Uint8Array(await crypto.subtle.digest("SHA-256", te.encode(s))));

/** Turns a verified Apple transaction into a pro_ents row, or explains why it doesn't count. */
export function appleRow(tx: any, cfg: { bundle: string; products: string[] }) {
  if (!tx || tx.bundleId !== cfg.bundle) return { err: "wrong app" };
  if (!cfg.products.includes(tx.productId)) return { err: "not a Pro product" };
  const otid = String(tx.originalTransactionId || "");
  if (!/^[0-9]{1,40}$/.test(otid)) return { err: "no subscription id" };
  return {
    row: {
      id: "apple:" + otid, source: "apple", product: tx.productId,
      expires_at: tx.expiresDate ? new Date(+tx.expiresDate).toISOString() : null,
      revoked: !!tx.revocationDate, env: tx.environment ? String(tx.environment).slice(0, 20) : null,
      signed_at: tx.signedDate ? new Date(+tx.signedDate).toISOString() : null,
    },
  };
}

/** Combines a new record with what's stored. Older messages never win: Apple and Stripe can deliver out of order,
 *  and a refunded user could resend an old purchase. Once revoked, only a newer-signed message can clear it. */
export function mergeRow(old: any, nw: any) {
  if (!old) return nw;
  const t = (x: any) => (x ? Date.parse(x) : 0);
  if (t(old.signed_at) && t(nw.signed_at) && t(nw.signed_at) < t(old.signed_at)) return { ...nw, expires_at: old.expires_at, revoked: old.revoked, signed_at: old.signed_at, product: old.product };
  const r = { ...nw };
  if (old.revoked && !(t(nw.signed_at) > t(old.signed_at))) r.revoked = true;
  if (!r.revoked && old.expires_at && r.expires_at && t(old.expires_at) > t(r.expires_at)) r.expires_at = old.expires_at;
  if (!r.signed_at) r.signed_at = old.signed_at ?? null;
  return r;
}

function hdrs(extra: Record<string, string> = {}) {
  const h: Record<string, string> = { apikey: SRK, "Content-Type": "application/json", ...extra };
  if (SRK.startsWith("eyJ")) h.Authorization = "Bearer " + SRK;
  return h;
}
async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(URL0 + "/rest/v1/" + path, { ...init, headers: hdrs((init.headers as Record<string, string>) ?? {}) });
  const t = await r.text();
  if (!r.ok) throw new Error((() => { try { return JSON.parse(t).message; } catch { return t; } })() || "HTTP " + r.status);
  return t ? JSON.parse(t) : null;
}
export async function saveRow(row: any, secret: string) {
  const tok = await teamToken(row.id, secret);
    const cur = await rest("pro_ents?select=expires_at,revoked,signed_at,product&id=eq." + encodeURIComponent(row.id));
  const r = { ...mergeRow(cur && cur[0], row), tok_hash: await sha256hex(tok), updated_at: new Date().toISOString() };
  await rest("pro_ents?on_conflict=id", { method: "POST", body: JSON.stringify(r), headers: { Prefer: "resolution=merge-duplicates,return=minimal" } });
  const live = !r.env || r.env === "Production" || r.env === "live";
  const active = !r.revoked && (r.expires_at ? Date.parse(r.expires_at) > Date.now() - (live ? 864e5 : 0) : live);
  return { tok, active, exp: r.expires_at ? Date.parse(r.expires_at) : 0 };
}

const cfg = () => ({
  bundle: env("APPLE_BUNDLE_ID", "com.antoniotyler.accountedfor"),
  products: env("PRO_PRODUCTS", "com.antoniotyler.accountedfor.pro.yearly,com.antoniotyler.accountedfor.pro.monthly").split(",").map((s) => s.trim()).filter(Boolean),
});
const secret = () => env("PRO_SECRET") || SRK;

export async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let b: any = {};
  try { b = await req.json(); } catch { return json({ error: "bad request" }, 400); }
  try {
    if (b.ping) {
      let db = false; try { await rest("pro_ents?select=id&limit=1"); db = true; } catch { /* part 20 not run */ }
      return json({ ok: 1, pro: 1, db, secret: !!env("PRO_SECRET") });
    }
    // App Store Server Notifications V2: { signedPayload }
    if (typeof b.signedPayload === "string") {
      if (b.signedPayload.length > 40000) return json({ error: "bad request" }, 400);
      const n = await verifyAppleJWS(b.signedPayload);
      const d = n && n.data;
      if (!d || d.bundleId !== cfg().bundle) return json({ ok: 1, skipped: "other app" });
      if (typeof d.signedTransactionInfo !== "string") return json({ ok: 1, skipped: n.notificationType || "no transaction" });
      const tx = await verifyAppleJWS(d.signedTransactionInfo);
      const r = appleRow(tx, cfg());
      if (r.err) return json({ ok: 1, skipped: r.err });
      if (n.notificationType === "REFUND" || n.notificationType === "REVOKE") r.row!.revoked = true;
      if (n.signedDate && (!r.row!.signed_at || +n.signedDate > Date.parse(r.row!.signed_at))) r.row!.signed_at = new Date(+n.signedDate).toISOString();
      await saveRow(r.row, secret());
      return json({ ok: 1 });
    }
    // iPhone app after a purchase / restore / launch: { op:"apple", jws }
    if (b.op === "apple") {
      if (typeof b.jws !== "string" || b.jws.length > 20000) return json({ error: "bad request" }, 400);
      const tx = await verifyAppleJWS(b.jws);
      const r = appleRow(tx, cfg());
      if (r.err) return json({ error: r.err }, 400);
      if (r.row!.env !== "Production" && env("APPLE_SANDBOX", "1") === "0") return json({ error: "Test purchases don't count on this server." }, 400);
      return json(await saveRow(r.row, secret()));
    }
    // Any app: { op:"status", tok }
    if (b.op === "status") {
      const rows = await rest("rpc/pro_check", { method: "POST", body: JSON.stringify({ p_tok: String(b.tok || "") }) });
      const r = rows && rows[0];
      return json(r ? { active: !!r.active, exp: r.expires_at ? Date.parse(r.expires_at) : 0, source: r.source } : { active: false });
    }
    return json({ error: "bad request" }, 400);
  } catch (e) {
    const t = String((e as Error).message || e);
    if (/pro_ents|pro_check|schema cache|does not exist/i.test(t)) return json({ error: "Pro isn't set up on the server yet. Run SQL part 20." }, 503);
    if (/JWS|certificate|signature|Apple|DER/i.test(t)) return json({ error: "That purchase couldn't be verified with Apple." }, 400);
    console.error("pro:", t);
    return json({ error: "Something went wrong on the server. Try again in a minute." }, 500);
  }
}

if ((globalThis as any).Deno?.serve) (globalThis as any).Deno.serve(handle);
