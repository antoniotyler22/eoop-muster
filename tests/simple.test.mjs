// 1.5 simpler: Tools in 12 groups, joining/starting welcome, empty start, plain words, member tabs, short tour.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("Tools shows at most 12 groups and every old tool is still inside one", async () => {
  const a = await openApp();
  try {
    a.w.eval(`S.welcomed=1;S.onb=true;S.leaderMode=true;view="tools";render()`);
    const groups = a.$$("#sgGrid > *");
    assert.ok(groups.length > 0 && groups.length <= 12, "groups: " + groups.length);
    assert.ok(!a.$("#main #v11Em"), "emergency check-in is on Home only");
    for (const k of ["invite", "checkins", "access", "support", "dms", "integ", "data"]) {
      const g = a.w.eval(`(()=>{for(const k of ["checkin","feed","people","reports","plan","home","help","settings","rollup"]){openToolGroup(k);if(document.querySelector('#sheetOpts [data-go="${k}"]'))return k}return ""})()`);
      assert.ok(g, k + " is inside a group");
    }
    a.w.eval(`view="board";render()`);
    assert.ok(a.$('#main .qa [data-go="invite"]'), "Invite in the Home quick actions");
    assert.ok(!a.$('#main .qa [data-go="ask"]'));
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("starting a team: type, then name, then an empty team with Add your people", async () => {
  const a = await openApp();
  try {
    await sleep(600); // the first-open welcome shows itself at ~380 ms
    a.w.eval(`S.mode=null;S.welcomed=0;showWelcome()`);
    await sleep(50);
    a.$("[data-sgstart]").click(); await sleep(20);
    a.$('[data-sgmode="civilian"]').click(); await sleep(20);
    a.$("#sgName").value = "Eagles Soccer";
    a.$("#sgGo").click(); await sleep(50);
    assert.equal(a.w.eval("S.mode"), "civilian");
    assert.equal(a.w.eval("S.unit"), "EAGLES SOCCER");
    assert.equal(a.w.eval("S.roster.length"), 0, "no sample people");
    assert.ok(a.$("#sgAdd"), "Add your people card");
    assert.match(a.$("#main").textContent, /Share headcount/, "plain words");
    assert.doesNotMatch(a.$("#main").textContent, /Send numbers/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("joining shows sign-in and link; members get My status, Feed, Calendar", async () => {
  const a = await openApp();
  try {
    await sleep(600); // the first-open welcome shows itself at ~380 ms
    a.w.eval(`S.mode=null;S.welcomed=0;showWelcome()`);
    await sleep(50);
    assert.ok(a.$("#lgSU").closest(".panel").hidden, "sign-in waits for a choice");
    a.$("[data-sgjoin]").click(); await sleep(20);
    assert.ok(!a.$("#lgSU").closest(".panel").hidden);
    a.w.eval(`const m=S.roster[0];const D=mpDigest(m);S.feeds=[{id:"feedabcdef12",mk:"m".repeat(30),ek:"x",unit:"TEAM",me:"A",mid:m.id,sec:m.sec,posts:[],seen:0,mine:{},hub:1}];
      S.me={pk:"p".repeat(24),unit:"TEAM",d:D,t:Date.now()};S.onb=true;S.welcomed=1;S.mode="civilian";view="today";render()`);
    const tabs = a.$$("#tabbar [data-tab]").map((b) => b.dataset.tab);
    assert.deepEqual(tabs, ["me", "feed", "mecal"]);
    assert.equal(a.w.eval("view"), "me");
    a.$('#tabbar [data-tab="mecal"]').click();
    assert.match(a.$("#main").textContent, /Calendar/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("full tour is the in-depth walk-through and Exit leaves in one tap", async () => {
  const a = await openApp();
  try {
    a.w.Element.prototype.scrollIntoView = function () {};
    a.w.Element.prototype.getBoundingClientRect = function () { return { left: 10, top: 10, width: 100, height: 40, right: 110, bottom: 50, x: 10, y: 10 }; };
    a.w.eval(`S.welcomed=1;S.onb=true;S.leaderMode=true;view="board";render();startTour("leader")`);
    await sleep(300);
    assert.match(a.$("#tour .tr-k").textContent, /of [3-9][0-9]/);
    a.$('#tour [data-tr="exit"]').click();
    await sleep(50);
    assert.ok(a.$("#tour").hidden, "one tap exits");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
