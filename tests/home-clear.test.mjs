// 1.9: hide/clear on Home's Needs attention and Activity, and the Tools search box.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const LEAD = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.board={id:"b1",rk:"r",wk:"w",ek:"e",after:0,last:{},sk:{}};S.sync=null;save();`;

test("home: Needs attention lines hide one at a time or all, and come back only when the problem returns", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(LEAD + `view="board";render();`);
    assert.match(a.$("#main").textContent, /Needs attention/);
    const n = a.w.eval("document.querySelectorAll('[data-hhide]').length");
    assert.ok(n >= 1);
    a.$("[data-hhide]").click();
    assert.equal(a.w.eval("document.querySelectorAll('[data-hhide]').length"), n - 1);
    assert.equal(a.w.eval("Object.keys(S.hideHealth).length"), 1);
    if (n > 1) { a.$("#hhAll").click(); }
    assert.equal(a.w.eval("document.querySelectorAll('[data-hhide]').length"), 0);
    assert.match(a.$("#main").textContent, /hidden/);
    // the problem goes away: its hidden mark is dropped, so it shows again if it returns
    a.w.eval(`S.sync={on:true};save();render()`);
    assert.ok(a.w.eval("!S.hideHealth['Backup is off. Losing this phone loses the board.']"));
  } finally { a.close(); }
});

test("home: Activity lines clear one at a time or all", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(LEAD + `actAdd("✓","First thing","people");actAdd("✓","Second thing","people");save();view="board";render();`);
    assert.equal(a.w.eval("document.querySelectorAll('[data-ahide]').length"), 2);
    a.$("[data-ahide]").click();
    assert.equal(a.w.eval("S.act.length"), 1);
    assert.equal(a.w.eval("S.act[0].txt"), "First thing");
    a.$("#haClear").click();          // arms
    a.$("#haClear").click();          // clears
    assert.equal(a.w.eval("S.act.length"), 0);
    assert.equal(a.$("#haClear"), null);
  } finally { a.close(); }
});

test("tools: the search box finds any screen or feature and hides the groups while typing", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(LEAD + `view="tools";render();`);
    assert.ok(a.$("#tsQ"));
    a.w.eval(`toolsSearch("room sweep")`);
    assert.match(a.$("#tsRes").textContent, /Room sweep/);
    assert.equal(a.w.eval("document.querySelector('#sgGrid').hidden"), true);
    a.w.eval(`toolsSearch("visitor")`);
    assert.match(a.$("#tsRes").textContent, /Visitors/);
    assert.ok(a.$('#tsRes [data-go="visitors"]'));
    a.w.eval(`toolsSearch("calend")`);
    assert.match(a.$("#tsRes").textContent, /Calendar/i);
    a.w.eval(`toolsSearch("zzzqqq")`);
    assert.match(a.$("#tsRes").textContent, /Nothing matches/);
    a.w.eval(`toolsSearch("")`);
    assert.equal(a.w.eval("document.querySelector('#sgGrid').hidden"), false);
  } finally { a.close(); }
});

test("home: Live sections sits right under quick actions, On the app takes its old spot, Ask and How-do-I at the bottom", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(LEAD + `S.roster.slice(0,3).forEach(m=>m.sec="HQ");view="board";render();`);
    const order = a.w.eval(`[...document.querySelectorAll('#main > *')].map(x=>x.id||(x.tagName==="DETAILS"?"details":x.className.split(' ')[0])||x.tagName)`);
    const qa = order.indexOf("qa"), live = order.indexOf("att"), details = order.indexOf("details");
    assert.ok(live > qa && live - qa <= 2, order.join(","));
    const i = order.indexOf("oaPanel");
    if (i >= 0) assert.ok(i > live && i < details, order.join(","));
    assert.ok(a.$('#hmAsk [data-go="support"]'));
    assert.ok(a.$('#hmAsk [data-go="ask"]'));
    assert.equal(a.w.eval(`document.querySelector('#main > :last-child').id`), "hmAsk");
  } finally { a.close(); }
});

test("tour: Take the tour runs the in-depth leader tour with Room sweep and the Tools groups", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(LEAD + `view="board";render();`);
    a.$("#hmAsk [data-trfull]").click();
    await sleep(900);
    const n = +a.$("#tour .tr-k").textContent.replace(/\D+/g, " ").trim().split(" ")[1];
    assert.ok(n >= 30, "steps: " + n);
    assert.match(a.$("#tour .tr-t").textContent, /Welcome/);
  } finally { a.close(); }
});
