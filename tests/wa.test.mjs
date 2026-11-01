// 4.68.0: WhatsApp-style extras: reactions, seen-by, live location, online / recording.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const FEED = { id: "feedabcdef12", mk: "m".repeat(30) };
const setup = async (a, lk = true, extra = "") => {
  await a.w.eval(`(async()=>{const k=crypto.getRandomValues(new Uint8Array(32));const ek=b64e(k).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/,"");
    S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",${lk ? 'lk:"l".repeat(30),' : ""}ek,unit:"1ST PLT",me:"CPL TEST",sec:"1ST",mine:{},seen:0,
      posts:[{id:5,t:Date.now()-5000,txt:"Formation moved to 0700"}]}];S.myName="CPL TEST";S.onb=true;S.welcomed=1;fdSel="${FEED.id}";view="feed";${extra};render()})()`);
  await sleep(150);
};

test("a post gets a reaction bar; tapping a reaction sends it and shows the count", async () => {
  const puts = [];
  const a = await openApp({ rpc: (fn, b) => { if (fn === "signal_put") puts.push(b); return []; } });
  try {
    await setup(a);
    const card = a.$("article.fc[data-wpid='5']");
    assert.ok(card, "post tagged");
    assert.ok(card.querySelector("[data-rxadd]"), "plus button");
    card.querySelector("[data-rxadd]").click(); await sleep(60);
    a.$("article.fc[data-wpid='5'] .rxpick [data-e='👍']").click(); await sleep(300);
    assert.ok(puts.some((p) => p.p_k === "rx"), "reaction sent");
    assert.ok(!/CPL TEST/.test(puts.find((p) => p.p_k === "rx").p_ct), "encrypted");
    assert.match(a.$("article.fc[data-wpid='5'] .rxbar").textContent, /👍 1/);
    a.$("article.fc[data-wpid='5'] [data-rx][data-e='👍']").click(); await sleep(300);
    assert.ok(!/👍 1/.test(a.$("article.fc[data-wpid='5'] .rxbar").textContent), "tapping again takes it back");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("opening the Feed marks posts seen once and a leader sees Seen by", async () => {
  const puts = [];
  const a = await openApp({ rpc: (fn, b) => { if (fn === "signal_put") puts.push(b); return []; } });
  try {
    await setup(a);
    await sleep(1200);
    assert.equal(puts.filter((p) => p.p_k === "seen").length, 1);
    a.w.eval("renderFeed()"); await sleep(1000);
    assert.equal(puts.filter((p) => p.p_k === "seen").length, 1, "not sent twice");
    assert.match(a.$("article.fc[data-wpid='5']").textContent, /Seen by 1/);
  } finally { await a.close(); }
});

test("Talk shows a live location card with the three share times", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await setup(a);
    a.w.eval(`view="talk";render()`); await sleep(200);
    const c = a.$("#tkLoc");
    assert.ok(c); assert.match(c.textContent, /15 min/); assert.match(c.textContent, /1 hour/); assert.match(c.textContent, /8 hours/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("every My page shows who you message as, and Change saves it", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`const m=S.roster[0];S.feeds=[];S.me={pk:"p".repeat(24),unit:"TEAM",d:mpDigest(m),t:Date.now()};S.myName="CPL TEST";S.onb=true;S.welcomed=1;S.mode="civilian";view="me";render()`);
    await sleep(150);
    for (const v of ["me", "mecal", "today", "log"]) {
      a.w.eval(`view="${v}";render()`); await sleep(100);
      assert.match(a.$("#dmAs") ? a.$("#dmAs").textContent : "", /Messaging as\s*CPL TEST/, v + " shows the name");
    }
    a.w.eval(`view="me";render()`); await sleep(80);
    a.$("#dmAsEd").click(); await sleep(60);
    a.$("#dmAsIn").value = "sgt reyes"; a.$("#dmAsSave").click(); await sleep(120);
    assert.equal(a.w.eval("S.myName"), "SGT REYES");
    assert.match(a.$("#dmAs").textContent, /SGT REYES/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
