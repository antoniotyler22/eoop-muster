// Server-side Pro: Apple signature checking and subscription records.
// Builds a fake Apple-style certificate chain with openssl (same shape and markers as Apple's),
// signs App Store JWS with it, and checks the verifier accepts genuine ones and rejects tampering.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { verifyAppleJWS, appleRow, teamToken, APPLE_ROOT_G3_SHA256 } from "../supabase/functions/pro/index.ts";

const ossl = (...a) => execFileSync("openssl", a, { stdio: "pipe" });
function makeChain({ leafOid = true } = {}) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "af-ca-"));
  const p = (f) => path.join(d, f);
  fs.writeFileSync(p("mid.ext"), "basicConstraints=critical,CA:true\nkeyUsage=critical,keyCertSign,cRLSign\n1.2.840.113635.100.6.2.1=ASN1:NULL\n");
  fs.writeFileSync(p("leaf.ext"), "basicConstraints=critical,CA:false\nkeyUsage=critical,digitalSignature\n" + (leafOid ? "1.2.840.113635.100.6.11.1=ASN1:NULL\n" : ""));
  ossl("ecparam", "-name", "secp384r1", "-genkey", "-noout", "-out", p("root.key"));
  ossl("req", "-new", "-x509", "-key", p("root.key"), "-sha384", "-days", "3650", "-subj", "/CN=Test Root CA - G3/O=Test", "-out", p("root.pem"));
  ossl("ecparam", "-name", "secp384r1", "-genkey", "-noout", "-out", p("mid.key"));
  ossl("req", "-new", "-key", p("mid.key"), "-subj", "/CN=Test WWDR - G6/O=Test", "-out", p("mid.csr"));
  ossl("x509", "-req", "-in", p("mid.csr"), "-CA", p("root.pem"), "-CAkey", p("root.key"), "-CAcreateserial", "-sha384", "-days", "3000", "-extfile", p("mid.ext"), "-out", p("mid.pem"));
  ossl("ecparam", "-name", "prime256v1", "-genkey", "-noout", "-out", p("leaf.key"));
  ossl("req", "-new", "-key", p("leaf.key"), "-subj", "/CN=Test StoreKit Signing/O=Test", "-out", p("leaf.csr"));
  ossl("x509", "-req", "-in", p("leaf.csr"), "-CA", p("mid.pem"), "-CAkey", p("mid.key"), "-CAcreateserial", "-sha256", "-days", "1000", "-extfile", p("leaf.ext"), "-out", p("leaf.pem"));
  const der = (f) => new crypto.X509Certificate(fs.readFileSync(p(f))).raw;
  const out = { x5c: ["leaf.pem", "mid.pem", "root.pem"].map((f) => der(f).toString("base64")), leafKey: crypto.createPrivateKey(fs.readFileSync(p("leaf.key"))),
    rootSha256: crypto.createHash("sha256").update(der("root.pem")).digest("hex") };
  fs.rmSync(d, { recursive: true, force: true });
  return out;
}
const b64u = (b) => Buffer.from(b).toString("base64url");
function sign(chain, payload) {
  const h = b64u(JSON.stringify({ alg: "ES256", x5c: chain.x5c }));
  const pl = b64u(JSON.stringify(payload));
  const sig = crypto.sign("sha256", Buffer.from(h + "." + pl), { key: chain.leafKey, dsaEncoding: "ieee-p1363" });
  return h + "." + pl + "." + b64u(sig);
}
const TX = { bundleId: "com.antoniotyler.accountedfor", productId: "com.antoniotyler.accountedfor.pro.yearly", originalTransactionId: "2000000123456789",
  expiresDate: Date.now() + 30 * 864e5, environment: "Sandbox" };
const CFG = { bundle: "com.antoniotyler.accountedfor", products: ["com.antoniotyler.accountedfor.pro.yearly", "com.antoniotyler.accountedfor.pro.monthly"] };

const chain = makeChain();

test("pinned root is Apple Root CA - G3", () => {
  assert.equal(APPLE_ROOT_G3_SHA256, "63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179");
});

test("a genuine App Store transaction verifies and becomes an active Pro record", async () => {
  const tx = await verifyAppleJWS(sign(chain, TX), { rootSha256: chain.rootSha256 });
  assert.equal(tx.originalTransactionId, TX.originalTransactionId);
  const r = appleRow(tx, CFG);
  assert.equal(r.row.id, "apple:2000000123456789");
  assert.equal(r.row.revoked, false);
  assert.ok(Date.parse(r.row.expires_at) > Date.now());
});

test("tampered payload is rejected", async () => {
  const j = sign(chain, TX).split(".");
  j[1] = b64u(JSON.stringify({ ...TX, expiresDate: Date.now() + 9e12 }));
  await assert.rejects(verifyAppleJWS(j.join("."), { rootSha256: chain.rootSha256 }), /signature/);
});

test("a chain that isn't Apple's (default pin) is rejected", async () => {
  await assert.rejects(verifyAppleJWS(sign(chain, TX)), /not signed by Apple/);
});

test("a certificate without the App Store marker is rejected", async () => {
  const bad = makeChain({ leafOid: false });
  await assert.rejects(verifyAppleJWS(sign(bad, TX), { rootSha256: bad.rootSha256 }), /App Store certificate/);
});

test("swapping in another leaf breaks the chain", async () => {
  const other = makeChain();
  const mixed = { ...chain, x5c: [other.x5c[0], chain.x5c[1], chain.x5c[2]], leafKey: other.leafKey };
  await assert.rejects(verifyAppleJWS(sign(mixed, TX), { rootSha256: chain.rootSha256 }), /chain/);
});

test("wrong app or non-Pro product doesn't count", () => {
  assert.equal(appleRow({ ...TX, bundleId: "com.other.app" }, CFG).err, "wrong app");
  assert.equal(appleRow({ ...TX, productId: "com.antoniotyler.accountedfor.tip" }, CFG).err, "not a Pro product");
  assert.equal(appleRow({ ...TX, revocationDate: Date.now() }, CFG).row.revoked, true);
});

test("team token is stable per subscription and secret-dependent", async () => {
  const a = await teamToken("apple:1", "s1"), b = await teamToken("apple:1", "s1"), c = await teamToken("apple:1", "s2");
  assert.equal(a, b); assert.notEqual(a, c); assert.match(a, /^[0-9a-f]{64}$/);
});
