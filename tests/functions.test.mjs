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
