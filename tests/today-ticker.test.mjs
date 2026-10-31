// 4.61.0: Today rolls like a ticker: one row, ‹ 1/N ›, Show all, swipe Hide still works.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const LEAD = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.board={id:"b1",rk:"r",wk:"w",ek:"e",after:0,last:{},sk:{}};S.sync=null;save();`;
const CARDS = `const k=dkey();S.roster[1].cal=[{id:"c2",d:k,tm:"",ty:"LEAVE",ti:"Parental leave"}];S.roster[2].cal=[{id:"c3",d:k,tm:"",ty:"TAD",ti:"TAD 30 days"}];S.roster[3].cal=[{id:"c4",d:k,tm:"",ty:"LEAVE",ti:"Leave home"}];save();view="board";render();`;

test("Today becomes a rolling ticker with a counter, steps, and Show all", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(LEAD + CARDS); await sleep(40);
    const s = a.$(".strip.tk"); assert.ok(s, "ticker class on the Today strip");
    const n = [...s.children].filter(c => !c.hidden).length; assert.ok(n >= 3);
    assert.equal(a.$(".tk-ctl .tk-n").textContent, "1/" + n);
    assert.ok(s.querySelector("[data-tkic]"), "cards get an icon");
    a.$(".tk-ctl .tk-x").click(); await sleep(10);
    assert.equal(a.$(".tk-ctl .tk-n").textContent, "2/" + n);
    assert.equal(s.style.getPropertyValue("--tki"), "1");
    a.$(".tk-ctl .tk-p").click(); a.$(".tk-ctl .tk-p").click(); await sleep(10);
    assert.equal(a.$(".tk-ctl .tk-n").textContent, n + "/" + n, "back from the first wraps to the last");
    a.$(".tk-ctl .tk-all").click(); await sleep(20);
    assert.ok(!a.$(".strip.tk"), "Show all opens the full list");
    assert.equal(a.$(".tk-ctl .tk-all").textContent, "Roll");
    a.$(".tk-ctl .tk-all").click(); await sleep(20);
    assert.ok(a.$(".strip.tk"), "Roll goes back");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("Swipe Hide still works inside the ticker, and one card means no controls", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(LEAD + CARDS); await sleep(40);
    const before = a.$$(".strip .sw").length;
    a.$(".strip .sw .sw-b.hide").click(); await sleep(400);
    assert.equal(a.$$(".strip .sw").length, before - 1);
    a.w.eval(`S.roster.forEach(m=>m.cal=[]);S.duty.rosters=[];S.events=[];save();render();`); await sleep(30);
    assert.ok(!a.$(".tk-ctl"), "no ticker controls with 0 or 1 card");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
