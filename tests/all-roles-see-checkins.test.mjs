// A member's check-in is visible to every leader-side role: OIC, co-leader, SNCOIC/editor, view-only, section leader.
// View-only phones pull it themselves (they can't confirm, and auto-confirm never changes their roster).
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep, waitFor } from "./harness.mjs";
const PK = "p".repeat(28);

async function phone(role) {
  let rows = [];
  const a = await openApp({ rpc: (fn) => (fn === "page_reqs_get" ? rows : []) });
  await a.w.eval(`S.feeds=[];S.roster[0].pk="${PK}";S.ckAuto=true;${role ? `S.role="${role}";S.sync={on:true,code:"AAAA-BBBB-CCCC-DDDD-EEEE-FFFF",ver:1,at:Date.now(),err:"",last:""};` : "S.leaderMode=true;"}save()`);
  const mid = a.w.eval("S.roster[0].id");
  const before = a.w.eval("S.roster[0].status");
  const K = await a.w.eval(`mpKeys("${PK}")`);
  const ct = await a.w.eval(`(async()=>sealObj(await mpKeys("${PK}"),{k:"ck",cid:"pg1",me:"LCPL TEST",mid:${JSON.stringify(mid)},st:"Leave",from:"2026-10-30",to:"2026-11-02",loc:"Maui"}))()`);
  rows = [{ id: 11, page_id: K.id, ct, created_at: new Date().toISOString() }];
  return { a, before };
}

for (const role of [null, "co", "sncoic", "view"]) {
  test("member page check-in reaches role " + role, async () => {
    const { a, before } = await phone(role);
    try {
      await a.w.eval(`pgPoll()`);
      await waitFor(() => a.w.eval("(S.cks||[]).length") === 1);
      assert.equal(a.w.eval("S.cks[0].who"), "LCPL TEST");
      a.w.eval(`view="checkins";render()`);
      assert.match(a.$("#main").textContent, /Leave.*Maui/);
      if (role === "view") {
        assert.equal(a.w.eval("S.roster[0].status"), before, "view-only phone never changes the roster");
        assert.equal(a.w.eval("S.cks[0].state"), "new", "view-only phone doesn't confirm");
      } else {
        assert.equal(a.w.eval("S.cks[0].state"), "ok", "editor phones auto-confirm when on");
      }
      assert.deepEqual(a.errors, []);
    } finally { await a.close(); }
  });
}

test("section leader phone gets the member's check-in from the OIC's roster blob", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.board=null;S.link={rk2:"x",unit:"1ST PLT",mysec:"${"A"}"};S.source="x";save()`);
    const mid = a.w.eval("S.roster[0].id");
    await a.w.eval(`ckFromOIC([{cid:"c1",who:"LCPL TEST",mid:${JSON.stringify(mid)},sec:"A",st:"Leave",to:"2026-11-02",loc:"Maui",t:Date.now(),state:"new"}],"1ST PLT")`);
    assert.equal(a.w.eval("S.cks.length"), 1);
    assert.equal(a.w.eval("S.cks[0].loc"), "Maui");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
