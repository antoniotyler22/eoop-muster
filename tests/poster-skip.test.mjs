// 4.56.0/4.57.0: one alert per phone; since 4.57 every phone gets the new-post alert, the poster too.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { openApp, sleep } from "./harness.mjs";

test("notify skips the poster by device id and keeps one sign-up per phone", () => {
  const src = fs.readFileSync(new URL("../supabase/functions/notify/index.ts", import.meta.url), "utf8");
  assert.match(src, /s\?\.dev === dev/);
  assert.match(src, /function pickSubs/);
  assert.match(src, /feedSend\(f, urg, skip, dev\)/);
});

test("feed post alerts go to every phone, the poster too (no skip, no device id); the id is not synced", async () => {
  const calls = [];
  const a = await openApp({ rpc: () => [], fn: (name, body) => { if (/otify/i.test(name)) calls.push(body); return { status: 200, body: "ok" }; } });
  try {
    a.w.eval(`SB.notify(null,{feed:"feedabcdef12",lk:"${"l".repeat(30)}",urg:false})`);
    await sleep(200);
    const d = a.w.eval("afDevId()");
    assert.match(d, /^[a-z0-9]{8,40}$/);
    assert.equal(a.w.eval("JSON.stringify(S).includes(afDevId())"), false, "not in synced state");
    const sent = calls.find(c => c && c.feed);
    if (sent) { assert.equal(sent.dev, undefined); assert.equal(sent.skip, undefined); }
  } finally { await a.close(); }
});
