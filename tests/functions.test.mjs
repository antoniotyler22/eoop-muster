// Edge Function input checks: the webhook relay only talks to real chat webhooks, and server texting only sends
// check-in links to valid US numbers.
import test from "node:test";
import assert from "node:assert/strict";
import { hookKind, hookBody } from "../supabase/functions/relay/index.ts";
import { cleanNumbers, buildText } from "../supabase/functions/sms/index.ts";

test("relay accepts only Slack, Teams and Discord webhooks", () => {
  assert.equal(hookKind("https://hooks.slack.com/services/T1/B2/abc"), "slack");
  assert.equal(hookKind("https://contoso.webhook.office.com/webhookb2/x"), "teams");
  assert.equal(hookKind("https://prod-12.westus.logic.azure.com:443/workflows/abc/triggers/manual/paths/invoke?sig=1"), "teams");
  assert.equal(hookKind("https://discord.com/api/webhooks/1/abc"), "discord");
  assert.equal(hookKind("https://default1234.ab.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/x/triggers/manual/paths/invoke?sig=1"), "teams");
  for (const bad of ["http://hooks.slack.com/services/x", "https://hooks.slack.com.evil.io/services/x", "https://evil.io/hooks.slack.com/services/",
    "https://user:pw@hooks.slack.com/services/x", "https://hooks.slack.com:8443/services/x", "https://169.254.169.254/latest", "javascript:alert(1)", 42])
    assert.equal(hookKind(bad), null, String(bad));
});

test("relay formats the message for each service", () => {
  assert.match(hookBody("slack", "A").text, /```A```/);
  assert.ok(hookBody("discord", "x".repeat(5000)).content.length <= 2000);
  assert.equal(hookBody("teams", "A").attachments[0].content.body[0].text, "A");
});

test("server texting: valid US numbers only, deduplicated, capped", () => {
  assert.deepEqual(cleanNumbers(["808-555-0100", "(808) 555-0100", "1 808 555 0101", "123", "055-555-0100", null]), ["+18085550100", "+18085550101"]);
  assert.equal(cleanNumbers(Array.from({ length: 300 }, (_, i) => "808555" + String(1000 + i))).length, 200);
  assert.deepEqual(cleanNumbers("8085550100"), []);
});

test("server texting: the server writes the text; only the app's own check-in link gets through", () => {
  const app = ["https://antoniotyler22.github.io/eoop-muster/"];
  const base = app[0] + "#";
  assert.equal(buildText(base + "ci=abc12345&u=1ST+PLT&l=1", "abc12345", app), "1ST PLT recall: tap to check in. " + base + "ci=abc12345&u=1ST+PLT&l=1");
  assert.ok(buildText(base + "ci=abc12345&u=1ST&to=8085550100&g=21.4500,-157.7600,100", "abc12345", app));
  assert.equal(buildText("https://evil.example/#ci=abc12345&u=X", "abc12345", app), null);
  assert.equal(buildText(base + "ci=abc12345&u=X&msg=win+a+prize", "abc12345", app), null);
  assert.equal(buildText(base + "ci=zzz99999&u=X", "abc12345", app), null);
  assert.equal(buildText(base + "ci=abc12345&u=" + "A".repeat(40), "abc12345", app), null);
  assert.equal(buildText(base + "ci=abc12345&u=Free+%24%24%24+http%3A%2F%2Fx.co", "abc12345", app), null);
  assert.equal(buildText(base + "ci=abc12345&u=X&to=call-me", "abc12345", app), null);
});

test("server texting: reply routes and family texts are written by the server, inputs checked", async () => {
  const { cleanPeople, familyTexts, phKey } = await import("../supabase/functions/sms/index.ts");
  const ppl = cleanPeople([{ to: "(808) 555-0100", w: ["0123456789abcdef", "bad", 5] }, { to: "808-555-0100", w: ["0123456789abcdef"] }, { to: "123", w: ["0123456789abcdef"] }, { to: "8085550199", w: [] }]);
  assert.deepEqual(ppl, [{ to: "+18085550100", w: ["0123456789abcdef"] }]);
  assert.match(buildText("https://antoniotyler22.github.io/eoop-muster/#ci=abcdefgh1&u=1ST", "abcdefgh1", ["https://antoniotyler22.github.io/eoop-muster/"], true), /Or reply 1 = OK, 2 = delayed, 3 = need help\.$/);
  const f = familyTexts([{ to: "8085550101", n: "Ana R." }, { to: "808-555-0101", n: "Leo R." }, { to: "8085550199", n: "Max L." }, { to: "8085550188", n: "<script>" }], "Lincoln Elem", "10:42 AM", "North gym doors");
  assert.equal(f.length, 2);
  assert.equal(f[0].body, "Lincoln Elem: Ana R. and Leo R. are accounted for and safe as of 10:42 AM. Pickup: North gym doors. More updates will come by text.");
  assert.equal(familyTexts([], "Lincoln Elem", "soon", ""), null, "the time is checked");
  assert.equal(familyTexts([], "Lincoln Elem", "10:42", "http://evil.example/?x=1"), null, "no links in the pickup place");
  assert.equal(familyTexts([], "<b>", "10:42", ""), null);
  const k = await phKey("+18085550100", "pepper");
  assert.match(k, /^[0-9a-f]{64}$/);
  const inbound = await import("../supabase/functions/sms-in/index.ts");
  assert.equal(await inbound.phKey("+18085550100", "pepper"), k, "sms-in makes the same key as sms");
});

test("sms-in: reads 1/2/3 and plain words, checks Twilio's signature", async () => {
  const m = await import("../supabase/functions/sms-in/index.ts");
  for (const [t, c] of [["1", 1], ["OK", 1], ["safe 👍", 1], ["2 eta 1400", 2], ["running late", 2], ["3", 3], ["HELP my ankle", 3], ["hello?", 0], ["5 min out", 0]]) assert.equal(m.replyCode(t), c, t);
  assert.equal(m.replyNote("2 eta 1400", 2), "ETA 1400");
  assert.equal(m.replyNote("3 broke my ankle", 3), "broke my ankle");
  assert.equal(m.replyNote("1", 1), "");
  assert.equal(m.e164("1 (808) 555-0100"), "+18085550100");
  assert.equal(m.e164("555-0100"), undefined);
  // Twilio's signing: HMAC-SHA1 over the URL plus each field name and value, sorted by name
  const { createHmac } = await import("node:crypto");
  const url = "https://x.supabase.co/functions/v1/sms-in", p = new URLSearchParams({ From: "+18085550100", Body: "1", To: "+18085550000" });
  const want = createHmac("sha1", "tok").update(url + "Body1From+18085550100To+18085550000").digest("base64");
  assert.equal(await m.twilioSig("tok", url, p), want);
  // an unsigned request is refused before anything is looked up
  const D = globalThis.Deno; globalThis.Deno = { env: { get: (k) => ({ TWILIO_AUTH_TOKEN: "tok", SUPABASE_URL: "https://x.supabase.co" })[k] } };
  try {
    const fresh = await import("../supabase/functions/sms-in/index.ts?unsigned");
    const r = await fresh.handle(new Request(url, { method: "POST", body: p.toString(), headers: { "content-type": "application/x-www-form-urlencoded" } }));
    assert.equal(r.status, 403);
  } finally { globalThis.Deno = D; }
});
