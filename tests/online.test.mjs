// 4.150.0: who's online shows on a section screen and on a person's page.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const SETUP = `S.onb=true;S.welcomed=1;S.leaderMode=true;S.role="oic";S.roster=[
 {id:"p1",rank:"SGT",name:"LEE, DAVID",sec:"CE",status:"On Hand",pk:"a".repeat(28)},
 {id:"p2",rank:"CPL",name:"MARTINEZ, ANA",sec:"CE",status:"On Hand",pk:"b".repeat(28)},
 {id:"p3",rank:"LCPL",name:"REYES, JOSE",sec:"CE",status:"Leave",pk:"c".repeat(28)}]`;

test("section screen: online people get a ring tag and the 'N of M online' bar", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(SETUP + `;view="ce";render()`);
    await sleep(300);
    assert.equal(a.$$(".ol-tag").length, 0, "nobody online yet");
    a.w.ONLINE.set(["p1", "p2"]); await sleep(200);
    assert.equal(a.$$(".list .m.ol").length, 2);
    assert.equal(a.$$(".list .m .ol-tag").length, 2);
    assert.match(a.$(".ol-sum").textContent, /2 of 3 online/);
    a.w.ONLINE.set(["p1"]); await sleep(200);
    assert.equal(a.$$(".list .m.ol").length, 1);
    assert.match(a.$(".ol-sum").textContent, /1 of 3 online/);
  } finally { await a.close(); }
});

test("person page: ring, dot and 'Online now' pill; 'Seen' after they leave", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(SETUP + `;pid="p1";view="p";render()`);
    await sleep(300);
    assert.ok(!a.$(".pg-head .ol-dot"));
    a.w.ONLINE.set(["p1"]); await sleep(200);
    assert.ok(a.$(".pg-head .mp-ring.ol"));
    assert.ok(a.$(".pg-head .ol-dot.big"));
    assert.match(a.$(".ol-seen").textContent, /Online now/);
    a.w.ONLINE.set([]); await sleep(200);
    assert.ok(!a.$(".pg-head .ol-dot"));
    assert.match(a.$(".ol-seen").textContent, /Seen just now/);
  } finally { await a.close(); }
});
