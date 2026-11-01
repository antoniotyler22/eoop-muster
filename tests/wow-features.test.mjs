// Press-1 calls, Critical Alerts flag, one-tap "I'm safe".
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHmac } from "node:crypto";
import { openApp, sleep } from "./harness.mjs";

test("voice: only valid US numbers with scrambled names; unit name and script are safe to read aloud", async () => {
  const v = await import("../supabase/functions/voice/index.ts");
  const w = ["0123456789abcdef"];
  assert.deepEqual(v.cleanPeople([{ to: "808-555-0100", w }, { to: "(808) 555-0100", w }, { to: "123", w }, { to: "808-555-0101", w: [] }, { to: "1 808 555 0102", w }]).map((p) => p.to), ["+18085550100", "+18085550102"]);
  assert.equal(v.cleanPeople(Array.from({ length: 300 }, (_, i) => ({ to: "808555" + String(1000 + i), w }))).length, 100);
  assert.equal(v.cleanUnit("1ST PLT"), "1ST PLT");
  for (const bad of ["", "A".repeat(31), "<Dial>+1900</Dial>", "x&y;z", "hi\"there"]) assert.equal(v.cleanUnit(bad), null, bad);
  assert.match(v.script("1ST PLT").ask, /Press 1.*Press 2.*Press 3/);
  const sms = await import("../supabase/functions/sms/index.ts");
  assert.equal(await v.phKey("+18085550100", "p"), await sms.phKey("+18085550100", "p"), "same key as texts");
});

test("voice webhook: refuses unsigned calls, serves the script, rejects a smuggled unit name", async () => {
  const D = globalThis.Deno; globalThis.Deno = { env: { get: (k) => ({ TWILIO_AUTH_TOKEN: "tok", SUPABASE_URL: "https://x.supabase.co" })[k] } };
  try {
    const m = await import("../supabase/functions/voice/index.ts?webhook");
    const url = "https://x.supabase.co/functions/v1/voice?u=1ST%20PLT";
    const p = new URLSearchParams({ To: "+18085550100", CallSid: "CA1" });
    const sig = createHmac("sha1", "tok").update(url + "CallSidCA1To+18085550100").digest("base64");
    assert.equal(await m.twilioSig("tok", url, p), sig);
    const mk = (u, s, body) => new Request(u, { method: "POST", body: body.toString(), headers: { "content-type": "application/x-www-form-urlencoded", ...(s ? { "x-twilio-signature": s } : {}) } });
    assert.equal((await m.handle(mk(url, "", p))).status, 400, "unsigned form posts are not call instructions");
    assert.equal((await m.handle(mk(url, "bad", p))).status, 403, "wrong signature");
    const ok = await m.handle(mk(url, sig, p));
    assert.equal(ok.status, 200);
    const xml = await ok.text();
    assert.match(xml, /<Gather numDigits="1"/); assert.match(xml, /1ST PLT/);
    const evil = "https://x.supabase.co/functions/v1/voice?u=%3CDial%3E1900%3C%2FDial%3E";
    const es = createHmac("sha1", "tok").update(evil + "CallSidCA1To+18085550100").digest("base64");
    assert.match(await (await m.handle(mk(evil, es, p))).text(), /could not be completed/);
    const am = new URLSearchParams({ To: "+18085550100", AnsweredBy: "machine_start" });
    const ms = createHmac("sha1", "tok").update(url + "AnsweredBymachine_startTo+18085550100").digest("base64");
    const mt = await (await m.handle(mk(url, ms, am))).text();
    assert.ok(!/Gather/.test(mt), "voicemail gets a short message, no keypress prompt");
  } finally { globalThis.Deno = D; }
});

test("critical alerts: only marked alerts go critical, and only when APNS_CRITICAL=1", () => {
  const src = fs.readFileSync(new URL("../supabase/functions/notify/index.ts", import.meta.url), "utf8");
  const block = src.slice(src.indexOf("// <aps>"), src.indexOf("// </aps>")).replace(/: any|: boolean/g, "");
  const apsFor = new Function(block + "; return apsFor;")();
  const sos = { title: "SOS", body: "x", crit: true }, plain = { title: "t", body: "b" };
  assert.deepEqual(apsFor(plain, false, true).sound, "default");
  assert.equal(apsFor(plain, true, true)["interruption-level"], "time-sensitive");
  assert.equal(apsFor(sos, true, false)["interruption-level"], "time-sensitive", "off until the secret is set");
  const a = apsFor(sos, true, true);
  assert.equal(a["interruption-level"], "critical"); assert.deepEqual(a.sound, { critical: 1, name: "default", volume: 1.0 });
  assert.match(src, /NEED HELP[^\n]*crit: true/); assert.match(src, /crit: true, open: "sos"/);
  assert.ok(!/critical-alerts/.test(fs.readFileSync(new URL("../ios/App/App/App.entitlements", import.meta.url), "utf8")), "entitlement must not be added before Apple approves it");
});

test("one-tap safe: the safe link only matches exactly, and checks in as On Hand", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    assert.equal(a.w.__quickSafeUrl("accountedfor://safe"), true);
    for (const bad of ["accountedfor://safe2", "accountedfor://sos", "https://evil.io/#safe", "accountedfor://evil/safe"]) assert.equal(a.w.__quickSafeUrl(bad), false, bad);
    a.w.eval(`S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;save();view="board";render();`);
    assert.equal(await a.w.eval(`quickSafe()`), "who", "asks who you are first");
    const id = a.w.eval("S.roster[0].id");
    a.w.eval(`S.who={id:${JSON.stringify(id)}};S.roster[0].status="SIQ";save();render();`);
    assert.equal(await a.w.eval(`quickSafe()`), "ok");
    await sleep(10);
    const m = a.w.eval(`S.roster[0]`);
    assert.equal(m.status, "On Hand"); assert.ok(m.ckAt);
  } finally { await a.close(); }
});
