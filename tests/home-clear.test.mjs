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
    // delete for good: stays out even after the problem goes away and comes back
    a.w.eval(`S.sync=null;save();render()`);
    a.$('[data-hgone="Backup is off. Losing this phone loses the board."]').click();
    assert.equal(a.w.eval("S.hideHealth['Backup is off. Losing this phone loses the board.']"), "never");
    a.w.eval(`S.sync={on:true};save();render();S.sync=null;save();render()`);
    assert.equal(a.w.eval("S.hideHealth['Backup is off. Losing this phone loses the board.']"), "never");
    assert.ok(!a.$('[data-hgone="Backup is off. Losing this phone loses the board."]'));
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

test("home: Live sections is last; Need a hand and On the app are not on Home", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(LEAD + `S.roster.slice(0,3).forEach(m=>m.sec="HQ");view="board";render();`);
    const order = a.w.eval(`[...document.querySelectorAll('#main > *')].map(x=>x.id||(x.tagName==="DETAILS"?"details":x.className.split(' ')[0])||x.tagName)`);
    const live = order.indexOf("att");
    assert.equal(live, order.length - 1, order.join(","));
    assert.ok(order.indexOf("hmAsk") < 0 && order.indexOf("oaPanel") < 0, order.join(","));
    a.w.eval(`view="utilities";render()`);
    assert.ok(a.$('#hmAsk [data-go="support"]'));
    assert.ok(a.$('#hmAsk [data-go="ask"]'));
  } finally { a.close(); }
});

test("tour: Take the tour runs the in-depth leader tour with Room sweep and the Tools groups", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(LEAD + `view="utilities";render();`);
    a.$("#hmAsk [data-trfull]").click();
    await sleep(900);
    const n = +a.$("#tour .tr-k").textContent.replace(/\D+/g, " ").trim().split(" ")[1];
    assert.ok(n >= 30, "steps: " + n);
    assert.match(a.$("#tour .tr-t").textContent, /Welcome/);
  } finally { a.close(); }
});

test("home: Needs you lines hide until tomorrow; Today cards show by time of day and clear for the day", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(LEAD + `S.rc.open=true;S.rc.start=Date.now();S.rc.rid="x1";S.rc.res={};S.rc.ci={};S.rc.live=null;
      const k=dkey();S.duty.rosters.push({id:"d1",name:"Duty NCO",secs:[],att:false,skip:[],order:[],ptr:0,assign:{[k]:S.roster[0].id},excl:{}});
      const m=S.roster[1];m.cal=[{id:"c1",d:k,tm:"23:59",ty:"APPT",ti:"Dentist"},{id:"c2",d:k,tm:"",ty:"APPT",ti:"Allday"}];save();view="board";render();`);
    assert.ok(!a.$("[data-nyhide]") && !/Needs you/.test(a.$("#main").textContent), "Needs you is not on Home");
    a.w.eval(`view="utilities";render()`);
    assert.ok(a.$("[data-nyhide]"), "needs-you rows get an × in Utilities");
    const n = a.w.eval("document.querySelectorAll('[data-nyhide]').length");
    a.$("[data-nyhide]").click();
    assert.equal(a.w.eval("document.querySelectorAll('[data-nyhide]').length"), n - 1);
    assert.equal(a.w.eval("Object.keys(S.nyHide.h).length"), 1);
    a.w.eval(`view="board";render()`);
    // Today: the all-day item shows; the 23:59 appointment is hidden unless it's late; duty depends on the hour
    const now = a.w.eval("new Date().getHours()*60+new Date().getMinutes()");
    const vis = a.w.eval("[...document.querySelectorAll('#main .strip [data-tdk]')].filter(c=>!c.hidden).map(c=>c.dataset.tdk)");
    assert.ok(vis.some(k => /Allday/.test(k)), vis.join("|"));
    assert.equal(vis.some(k => /Dentist/.test(k)), now >= 23*60+59-120, vis.join("|"));
    assert.equal(vis.some(k => /^DUTY/.test(k)), now >= 420 && now <= 540);
    assert.ok(a.$("#tdShow") || a.$("#tdClear"));
    a.w.eval(`S.dutyAt=String(new Date().getHours()).padStart(2,"0")+":00";save();render()`);
    assert.ok(a.w.eval("[...document.querySelectorAll('#main .strip [data-tdk]')].some(c=>!c.hidden&&/^DUTY/.test(c.dataset.tdk))"), "duty shows around the chosen hour");
    a.$("#tdClear").click(); a.$("#tdClear").click();
    assert.equal(a.w.eval("[...document.querySelectorAll('#main .strip [data-tdk]')].filter(c=>!c.hidden).length"), 0);
    assert.ok(a.$("#tdNone"));
    assert.equal(a.w.eval("S.todayHide.d"), a.w.eval("new Date().toISOString().slice(0,10)"));
  } finally { a.close(); }
});

test("system status is one icon: blue when working, reddish black when not; tap opens the Dashboard", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(LEAD + `healthIssues=()=>[];view="board";render();`);
    const ic = a.$("#sysIc"); assert.ok(ic, "icon on Home");
    assert.ok(ic.classList.contains("ok")); assert.match(ic.getAttribute("aria-label"), /All systems working/);
    assert.doesNotMatch(a.$("#main").textContent, /All systems working/, "no text line any more");
    ic.click(); assert.equal(a.w.eval("view"), "dash");
    a.w.eval(`healthIssues=()=>[{t:"Alerts are off",go:"alerts"}];view="board";render();`);
    assert.ok(a.$("#sysIc.bad"), "reddish black when something is wrong");
    a.$("#sysIc").click(); assert.equal(a.w.eval("view"), "dash");
  } finally { a.close(); }
});
