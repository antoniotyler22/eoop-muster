// 4.119.1 / 4.142.0: badges already earned (SQL part 49) keep working: badge binding on a recall, badge on the member check-in page. The Get verified screen was removed in 4.142.0.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const boot = async (o = {}) => {
  const a = await openApp(Object.assign({ rpc: () => [] }, o));
  a.w.eval(`S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.roster=[{id:"r1",rank:"SGT",name:"RUIZ, AL",sec:"HQ",status:"On Hand"}];save()`);
  return a;
};

test("4.142.0: the self-service Get verified screen is gone (no Tools tile, no screen)", async () => {
  const a = await boot();
  try {
    a.w.eval(`view="tools";render()`);
    assert.ok(!a.$('[data-go="verify"]'), "no tile in Tools");
    assert.doesNotMatch(a.$("#main").textContent, /Get verified/);
    a.w.eval(`view="verify";render()`);
    assert.ok(!a.$('[data-vf]'), "no verify form");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("a recall started by a verified leader is tied to their team key; an unverified leader's is not", async () => {
  const calls = [];
  const a = await boot({ rpc: (fn, args) => { calls.push([fn, args]); return fn === "verify_status" ? [] : null; } });
  try {
    a.w.eval(`S.vf={level:0,at:Date.now()}`);
    await a.w.eval(`SB.rpc("create_recall",{p_id:"abcdefgh12",p_read_key:"k".repeat(30)})`); await sleep(100);
    assert.ok(!calls.some((c) => c[0] === "recall_badge_set"), "no badge call when unverified");
    a.w.eval(`S.vf={level:1,at:Date.now()}`);
    await a.w.eval(`SB.rpc("create_recall",{p_id:"abcdefgh34",p_read_key:"k".repeat(30)})`); await sleep(150);
    const c = calls.find((x) => x[0] === "recall_badge_set");
    assert.ok(c, "badge call after create_recall");
    assert.equal(c[1].p_recall, "abcdefgh34"); assert.match(c[1].p_tok, /^[0-9a-f]{48}$/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("the member's check-in page shows the leader's badge (level 1, then level 2 with the organization), and nothing when unverified", async () => {
  for (const [rows, want, notWant] of [[[{ level: 1, org: null }], /Contact confirmed/, /Organization confirmed/], [[{ level: 2, org: "Maple Elementary" }], /Organization confirmed: Maple Elementary/, null], [[], null, /Contact confirmed/]]) {
    const a = await openApp({ hash: "ci=abcdefgh12&u=MAPLE&l=1", noWait: true, rpc: (fn) => (fn === "recall_badge_get" ? rows : []) });
    try {
      await sleep(400);
      const t = (a.$(".ci-page") || a.$("main") || a.$("body")).textContent;
      if (want) assert.match(t, want); if (notWant) assert.doesNotMatch(t, notWant);
      assert.ok(a.$("#ciGood, [data-c='1']"), "check-in buttons still there");
    } finally { await a.close(); }
  }
});
