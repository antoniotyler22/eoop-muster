import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("Inbox phone alerts: a leader phone signs up for each thread; the person's phone for theirs", async () => {
  const calls = [];
  const a = await openApp({ rpc: (name, args) => { calls.push([name, args]); return []; } });
  try {
    await a.w.eval(`S.onb=true;S.welcomed=1;S.leaderMode=true;S.pushOn=true;
      const m=S.roster[0];m.pk="p".repeat(24);m.dm={id:"thread12345abcdefgh",k:"k".repeat(32),ek:"x",ok:1};
      window.pushSub=async()=>({toJSON:()=>({endpoint:"https://push.example/abc",keys:{p256dh:"a",auth:"b"}})});`);
    await a.w.eval(`window.dmPushAttach()`); await sleep(120);
    const c = calls.find((x) => x[0] === "dm_sub");
    assert.ok(c, "dm_sub called");
    assert.equal(c[1].p_role, "L");
    assert.equal(c[1].p_id, "thread12345abcdefgh");
    assert.ok(c[1].p_sub.dev, "device id included so the sender's own phone is skipped");
    const n = calls.filter((x) => x[0] === "dm_sub").length;
    await a.w.eval(`window.dmPushAttach()`); await sleep(80);
    assert.equal(calls.filter((x) => x[0] === "dm_sub").length, n, "no repeat sign-ups for the same phone");
    assert.ok(a.w.eval(`SYNC_SKIP.includes("dmSubs")`), "sign-ups stay on this phone");
  } finally { await a.close(); }
});
