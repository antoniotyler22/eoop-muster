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

test("4.63: a burst of check-ins is one card with faces; tap shows names; × removes the group", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`actRuler.mode="ruler";` + LEAD + `const n=Date.now()-74*6e4;const N=["LCPL CHAVEZ","CPL BEAVERS","CPL LEWIS","LCPL PERALES","LCPL REAM KYLE","PFC VEGA"];
      S.act=N.map((w,i)=>({t:n+i*2000,ic:"📍",txt:w+" checked in: On Hand · put on the roster",go:"checkins"})).reverse();
      S.act.unshift({t:n+20000,ic:"✓",txt:"1 confirmed “0900-1100 Fall clean-up”",go:"feed"});
      S.act.unshift({t:Date.now()-6e5,ic:"📍",txt:"CPL PARK checked in: Leave thru 8 Nov",go:"checkins"});S.actSeen=0;save();view="board";render();`);
    await sleep(20);
    assert.equal(a.$$(".ar-c").length, 3, "6 check-ins + 1 confirm + 1 later check-in = 3 cards");
    const g = a.$(".ar-c.grp"); assert.ok(g);
    assert.match(g.textContent, /6 checked in/); assert.match(g.textContent, /\+2/); assert.match(g.textContent, /On Hand/); assert.match(g.querySelector(".ar-av").textContent, /^CHBELEPE/);
    assert.equal(g.querySelectorAll(".ar-av span").length, 4, "four faces");
    g.querySelector("[data-argrp]").click(); await sleep(10);
    assert.equal(a.$$("#arExp .ar-er").length, 6, "names drop down");
    assert.match(a.$("#arExp").textContent, /LCPL REAM KYLE/);
    a.$(".ar-c.grp [data-argrp]").click(); await sleep(10);
    assert.ok(!a.$("#arExp"), "tap again closes");
    a.$(".ar-c.grp [data-arhide]").click(); await sleep(10);
    assert.equal(a.w.eval("S.act.length"), 2, "× removes the whole group");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
