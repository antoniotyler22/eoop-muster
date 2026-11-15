// 4.117.0: free "Verified leader" levels (SQL part 49): Get verified screen, badge binding on a recall, badge on the member check-in page.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const boot = async (o = {}) => {
  const a = await openApp(Object.assign({ rpc: () => [] }, o));
  a.w.eval(`S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.roster=[{id:"r1",rank:"SGT",name:"RUIZ, AL",sec:"HQ",status:"On Hand"}];save()`);
  return a;
};

test("Tools has Get verified; level 0 asks for sign-in, level 1 shows the organization form, level 2 shows the badge", async () => {
  const a = await boot();
  try {
    a.w.eval(`view="tools";render()`);
    assert.ok(a.$('[data-go="verify"]'), "tile in Tools");
    a.w.eval(`S.vf={level:0,at:Date.now()};view="verify";render()`);
    let t = a.$("#main").textContent;
    assert.match(t, /Get verified/); assert.match(t, /never ask for an ID/); assert.match(t, /Not verified yet/);
    assert.ok(a.$('[data-vf="signin"]'), "signed-out: Sign in");
    assert.match(t, /Confirm your contact first/);
    a.w.eval(`S.vf={level:1,status:"none",contact:"l***@example.com",at:Date.now()};render()`);
    assert.ok(a.$("#vfName") && a.$("#vfSite") && a.$('[data-vf="org"]'), "org form at level 1");
    assert.match(a.$("#main").textContent, /l\*\*\*@example\.com/);
    a.w.eval(`S.vf={level:1,status:"pending",org:"Maple Elementary",contact:"l***@example.com",at:Date.now()};render()`);
    assert.match(a.$("#main").textContent, /Waiting for review/);
    a.w.eval(`S.vf={level:2,status:"approved",org:"Maple Elementary",contact:"l***@example.com",at:Date.now()};render()`);
    t = a.$("#main").textContent;
    assert.match(t, /Organization confirmed: Maple Elementary/);
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
