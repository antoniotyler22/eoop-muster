// 4.62.0: Activity on Home is a time ruler with hour marks and a NOW line; List switches back.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const LEAD = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.board={id:"b1",rk:"r",wk:"w",ek:"e",after:0,last:{},sk:{}};S.sync=null;save();`;
const ACTS = `const n=Date.now();S.act=[{t:n-6e5,ic:"✓",txt:"CPL Park checked in",go:"people"},{t:n-2*36e5,ic:"🏝",txt:"SGT Ruiz leave request",go:"act"},{t:n-2*36e5-6e4,ic:"📣",txt:"Post confirmed by 12",go:"feed"},{t:n-3*864e5,ic:"✓",txt:"Old thing",go:"act"}];S.actSeen=n-36e5;save();view="board";render();`;

test("Activity shows as a ruler: hour marks, NOW, cards by time, new ones marked", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`actRuler.mode="ruler";` + LEAD + ACTS); await sleep(20);
    assert.ok(a.$("#arTl"), "ruler is there");
    assert.ok(a.$(".ar-now"), "NOW line");
    assert.ok(a.$$(".ar-hr").length >= 3, "hour marks");
    assert.equal(a.$$(".ar-c").length, 3, "only the last day goes on the ruler");
    assert.match(a.$("#main").textContent, /1 older in See all/);
    assert.equal(a.$$(".ar-c.new").length, 1, "the one since last look is marked new");
    const tops = new Set(a.$$(".ar-c").map(c => c.style.top)); assert.ok(tops.size >= 2, "two close together stack in rows");
    a.$("[data-ahide]").click(); await sleep(10);
    assert.equal(a.w.eval("S.act.length"), 3, "× removes one");
    a.$("#arMode").click(); await sleep(10);
    assert.ok(!a.$("#arTl"), "List switches back");
    assert.ok(a.$(".hc-row [data-ahide]"), "old list rows");
    assert.equal(a.$("#arMode").textContent, "Ruler");
    a.$("#arMode").click(); await sleep(10);
    assert.ok(a.$("#arTl"));
    a.$("#haClear").click(); await sleep(10);
    assert.equal(a.$("#haClear").textContent, "Tap again to clear");
    a.$("#haClear").click(); await sleep(10);
    assert.equal(a.w.eval("S.act.length"), 0);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
