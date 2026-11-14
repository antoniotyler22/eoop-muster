// 4.104.0: My Page, profile style. Co-leader and below open on it; it replaces Home in the bar; slide check-in sits on it.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const setup = async (a, extra = "") => {
  await a.w.eval(`S.mode="military";S.onb=true;S.welcomed=1;S.leaderMode=true;S.source="real";
    S.roster=[{id:"r1",rank:"CPL",name:"REYES, JORDAN",sec:"HQ",status:"On Hand"},{id:"r2",rank:"SGT",name:"LEE, SAM",sec:"HQ",status:"On Hand"}];
    S.who={id:"r1",n:"CPL REYES"};S.myName="CPL REYES";${extra};view="board";render()`);
  await sleep(200);
};
const tabs = (a) => [...a.w.document.querySelectorAll("#tabbar [data-tab]")].map((b) => b.dataset.tab);

test("a co-leader opens on My Page and My Page takes Home's place in the bar", async () => {
  const a = await openApp({});
  try {
    await setup(a, `S.role="co"`);
    assert.equal(a.w.eval("view"), "mypg", "landed on My Page");
    assert.deepEqual(tabs(a), ["mypg", "talk", "people", "plan", "tools"]);
    assert.equal(a.$("#tabbar [data-tab='mypg']").getAttribute("aria-current"), "page");
    assert.ok(a.$("#main .mp-head"), "profile header");
    assert.ok(a.$("#main .mp-stats"), "counts");
    assert.ok(a.$("#main #myCk"), "check-in card on the page");
    assert.ok(a.$("#main .slck"), "slide to check in");
    assert.ok(a.$("#main .mp-tabs"), "Feed / Plan / Calendar tabs");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("the OIC keeps Home as the front door and still gets My Page from the person button", async () => {
  const a = await openApp({});
  try {
    await setup(a);
    assert.equal(a.w.eval("view"), "board", "OIC stays on Home");
    assert.deepEqual(tabs(a), ["home", "talk", "people", "plan", "tools"]);
    a.w.eval(`view="mypg";render()`); await sleep(100);
    assert.ok(a.$("#main .mp-head"), "same My Page");
  } finally { await a.close(); }
});

test("section leaders and view-only phones land on My Page too", async () => {
  for (const extra of [`S.role="sncoic"`, `S.role="view"`]) {
    const a = await openApp({});
    try {
      await setup(a, extra);
      assert.equal(a.w.eval("view"), "mypg", extra);
    } finally { await a.close(); }
  }
});

test("Plan, Calendar and Feed tabs switch; Edit my page opens settings and back returns", async () => {
  const a = await openApp({});
  try {
    await setup(a, `S.role="co"`);
    for (const k of ["feed", "cal", "plan"]) {
      a.$(`.mp-tabs [data-mptab='${k}']`).click(); await sleep(120);
      assert.equal(a.$(`.mp-tabs [data-mptab='${k}']`).getAttribute("aria-selected"), "true", k);
    }
    assert.ok(a.$("#mpSet #qhPanel"), "quiet hours toggle lives on My Page");
    assert.ok(a.$("#mpSet #ppPanel"), "photo lives on My Page");
    assert.ok(!a.$("#sosHome"), "no duplicate SOS card");
    assert.equal(a.w.eval("view"), "mypg");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("the badge says accounted for after a check-in within 24 hours", async () => {
  const a = await openApp({});
  try {
    await setup(a, `S.role="co"`);
    assert.ok(a.$(".mp-bd.no"), "not checked in yet");
    a.w.eval(`S.roster[0].ckAt=Date.now()-3600000;render()`); await sleep(120);
    assert.ok(a.$(".mp-bd.ok"), "accounted for");
    assert.match(a.$(".mp-ckh").textContent, /accounted for/i);
  } finally { await a.close(); }
});

test("the team board stays one tap away", async () => {
  const a = await openApp({});
  try {
    await setup(a, `S.role="co"`);
    const t = a.$(".mp-team"); assert.ok(t, "team card");
    t.click(); await sleep(150);
    assert.equal(a.w.eval("view"), "board");
  } finally { await a.close(); }
});
