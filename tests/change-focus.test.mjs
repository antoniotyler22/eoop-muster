// 4.77.0: tapping an alert shows WHAT changed: scrolls to it, highlights it in bold, lists it in a "What changed" box.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const setup = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;view="board";render();`;

test("a change that arrives from another phone is logged; a change you make yourself is not", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(setup);
    a.w.eval(`__chg.watch()`); // baseline
    const id = a.w.eval(`S.roster[0].id`);
    // you tap and edit: not a "remote" change
    a.w.document.body.dispatchEvent(new a.w.Event("click",{bubbles:true}));
    a.w.eval(`S.roster[0].status="Leave";save()`);
    assert.equal(a.w.eval(`__chg.unseen().length`), 0, "your own edit is not logged");
    await sleep(2700); // no touches for a while: the next change came from elsewhere
    a.w.eval(`S.roster[1].status="Appointment on Base";S.roster[1].end="05 NOV 26";save()`);
    const L = JSON.parse(a.w.eval(`JSON.stringify(__chg.unseen())`));
    assert.equal(L.length, 1);
    assert.equal(L[0].k, "status");
    assert.match(L[0].now, /Appointment.*thru 05 NOV 26/);
    assert.ok(L[0].was);
    assert.equal(a.w.eval(`S.roster[0].id`), id);
  } finally { await a.close(); }
});

test("tapping a Team update alert opens the person who changed, highlighted, with what they were before", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(setup);
    a.w.eval(`__chg.watch()`);
    await sleep(2700);
    const sec = a.w.eval(`S.roster[3].sec`);
    const was = a.w.eval(`S.roster[3].status`);
    a.w.eval(`S.roster[3].status="Leave";S.roster[3].end="09 NOV 26";save()`);
    a.w.eval(`openFromAlert("board")`);
    await sleep(300);
    assert.equal(a.w.eval("view"), String(sec).toLowerCase(), "went straight to that person's section");
    const hit = a.$$(".chg-hit");
    assert.equal(hit.length, 1, "exactly the changed person is highlighted");
    assert.match(hit[0].querySelector(".chg-note").textContent, new RegExp("Leave thru 09 NOV 26"));
    assert.match(hit[0].querySelector(".chg-note").textContent, /was/);
    assert.match(hit[0].querySelector(".chg-note").textContent, new RegExp(was.slice(0, 5)));
    assert.ok(a.$("#chgBanner"), "What changed box is at the top");
    assert.match(a.$("#chgBanner").textContent, /What changed/);
    // Got it clears everything
    a.$("#chgOk").click(); await sleep(50);
    assert.equal(a.$$(".chg-hit").length, 0);
    assert.equal(a.$("#chgBanner"), null);
    assert.equal(a.w.eval(`__chg.unseen().length`), 0, "acknowledged");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("tapping a Team update with nothing found says so instead of a blank screen", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(setup);
    a.w.eval(`__chg.watch();openFromAlert("board")`);
    await sleep(300);
    assert.ok(a.$("#chgBanner"));
    assert.match(a.$("#chgBanner").textContent, /No new changes|Checking/);
    assert.equal(a.$$(".chg-hit").length, 0);
  } finally { await a.close(); }
});

test("tapping a Word of Mouth alert highlights the new posts and lists them", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`${setup}S.feeds=[{id:"feedabcdef12",lk:"l".repeat(30),mk:"m".repeat(30),ek:"x",unit:"1ST",posts:[{id:1,t:Date.now()-9e5,txt:"old word",to:{k:"all"}}],acks:{},mine:{},pins:[],seen:1}];fdSel="feedabcdef12";`);
    a.w.eval(`openFromAlert("feed")`);
    await sleep(100);
    // a new post arrives while the app is opening from the alert
    a.w.eval(`S.feeds[0].posts.unshift({id:2,t:Date.now(),txt:"Formation moved to 0600",urg:false,to:{k:"all"},by:"1stSgt",sl:"HE"});renderFeed()`);
    await sleep(50);
    const box = a.$("#chgBanner");
    assert.ok(box, "box at top");
    assert.match(box.textContent, /New in Word of Mouth/);
    assert.match(box.textContent, /Formation moved to 0600/);
    assert.equal(a.$$("article.chg-hit").length, 1, "only the new post is highlighted");
    assert.match(a.$("article.chg-hit").textContent, /NEW/);
    assert.match(a.$("article.chg-hit").textContent, /Formation moved to 0600/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("highlights go away when the app is backgrounded", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(setup);
    a.w.eval(`openFromAlert("board")`); await sleep(200);
    assert.ok(a.$("#chgBanner"));
    Object.defineProperty(a.w.document, "hidden", { value: true, configurable: true });
    a.w.document.dispatchEvent(new a.w.Event("visibilitychange"));
    await sleep(50);
    assert.equal(a.$("#chgBanner"), null);
  } finally { await a.close(); }
});

test("your own Word of Mouth post is not shown as a change", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`${setup}S.feeds=[{id:"feedabcdef12",lk:"l".repeat(30),mk:"m".repeat(30),ek:"x",unit:"1ST",posts:[{id:1,t:Date.now()-9e5,txt:"old",to:{k:"all"}}],acks:{},mine:{},pins:[],seen:1}];fdSel="feedabcdef12";`);
    a.w.eval(`openFromAlert("feed")`); await sleep(100);
    a.w.eval(`S.feeds[0].posts.unshift({id:2,t:Date.now(),txt:"I wrote this",to:{k:"all"}});renderFeed()`); await sleep(50);
    assert.equal(a.$$("article.chg-hit").length, 0, "the OIC's own post (no section tag) is theirs");
    assert.match(a.$("#chgBanner").textContent, /caught up|Checking/);
  } finally { await a.close(); }
});

test("Check-ins alert: new check-ins are listed and highlighted", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`${setup}S.cks=[{cid:"c1",feed:"f",mid:S.roster[1].id,who:"SGT SAMPLE 02",sec:"HQ",st:"Leave",oth:"",from:"2026-11-06",to:"2026-11-09",loc:"San Diego",note:"",t:Date.now()-3e5,state:"new"}];`);
    a.w.eval(`openFromAlert("checkins")`); await sleep(300);
    assert.match(a.$("#chgBanner").textContent, /New check-ins to confirm/);
    assert.match(a.$("#chgBanner").textContent, /Leave/);
    assert.match(a.$("#chgBanner").textContent, /San Diego/);
    assert.equal(a.$$(".rrow.chg-hit").length, 1);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
