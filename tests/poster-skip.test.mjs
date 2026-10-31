// 4.56.0: the phone that posts never gets the alert for its own post, even with an older alert sign-up.
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

test("feed post calls carry this phone's device id, which is not synced", async () => {
  const calls = [];
  const a = await openApp({ rpc: () => [], fn: (name, body) => { if (/otify/i.test(name)) calls.push(body); return { status: 200, body: "ok" }; } });
  try {
    a.w.eval(`SB.notify(null,{feed:"feedabcdef12",lk:"${"l".repeat(30)}",urg:false})`);
    await sleep(200);
    const d = a.w.eval("afDevId()");
    assert.match(d, /^[a-z0-9]{8,40}$/);
    assert.equal(a.w.eval("JSON.stringify(S).includes(afDevId())"), false, "not in synced state");
    const sent = calls.find(c => c && c.feed);
    if (sent) assert.equal(sent.dev, d);
  } finally { await a.close(); }
});
