// Web billing (Stripe): webhook signature check, subscription → Pro record, safe return links.
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { stripeSigOK, stripeRow, backOK, isProSub, teamToken as billTok } from "../supabase/functions/billing/index.ts";
import { teamToken as proTok } from "../supabase/functions/pro/index.ts";

const sig = (body, secret, t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${crypto.createHmac("sha256", secret).update(t + "." + body).digest("hex")}`;

test("Stripe webhook signature: genuine passes, forged/old/wrong-secret fail", async () => {
  const body = JSON.stringify({ type: "customer.subscription.updated" });
  assert.equal(await stripeSigOK(body, sig(body, "whsec_a"), "whsec_a"), true);
  assert.equal(await stripeSigOK(body + " ", sig(body, "whsec_a"), "whsec_a"), false);
  assert.equal(await stripeSigOK(body, sig(body, "whsec_b"), "whsec_a"), false);
  assert.equal(await stripeSigOK(body, sig(body, "whsec_a", Math.floor(Date.now() / 1000) - 3600), "whsec_a"), false);
  assert.equal(await stripeSigOK(body, "", "whsec_a"), false);
});

test("subscription → Pro record (old and new Stripe API shapes)", () => {
  const end = Math.floor(Date.now() / 1000) + 30 * 86400;
  const a = stripeRow({ id: "sub_123", status: "active", current_period_end: end, customer: "cus_9", livemode: true, items: { data: [{ price: { id: "price_y" } }] } });
  assert.equal(a.id, "stripe:sub_123"); assert.equal(a.cust, "cus_9"); assert.equal(a.product, "price_y");
  assert.equal(Date.parse(a.expires_at), end * 1000); assert.equal(a.revoked, false);
  const b = stripeRow({ id: "sub_456", status: "trialing", customer: { id: "cus_8" }, items: { data: [{ current_period_end: end, price: { id: "price_m" } }] } });
  assert.equal(Date.parse(b.expires_at), end * 1000); assert.equal(b.cust, "cus_8");
  const c = stripeRow({ id: "sub_789", status: "canceled", ended_at: 1700000000, items: { data: [] } });
  assert.equal(Date.parse(c.expires_at), 1700000000 * 1000);
  assert.equal(stripeRow({ id: "evil'; drop" }), null);
});

test("return links only go back to the app", () => {
  const ok = ["https://antoniotyler22.github.io/eoop-muster/"];
  assert.equal(backOK("https://antoniotyler22.github.io/eoop-muster/#tools", ok), ok[0]);
  assert.equal(backOK("https://evil.example/eoop-muster/", ok), null);
  assert.equal(backOK("javascript:alert(1)", ok), null);
});

test("Stripe and Apple make team tokens the same way", async () => {
  assert.equal(await billTok("stripe:sub_1", "s"), await proTok("stripe:sub_1", "s"));
});

test("REVIEW FIX: only Pro prices count; index.html return links work", () => {
  assert.equal(isProSub({ items: { data: [{ price: { id: "price_other" } }] } }, ["price_m", "price_y"]), false);
  assert.equal(isProSub({ items: { data: [{ price: { id: "price_y" } }] } }, ["price_m", "price_y"]), true);
  assert.equal(backOK("https://antoniotyler22.github.io/eoop-muster/index.html#x", ["https://antoniotyler22.github.io/eoop-muster/"]), "https://antoniotyler22.github.io/eoop-muster/");
});
