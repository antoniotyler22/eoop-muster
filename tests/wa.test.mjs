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

test("opening Word of Mouth marks posts seen once and a leader sees Seen by", async () => {
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

test("members see the latest Word of Mouth posts on their Today page", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`const m=S.roster[0];S.feeds=[{id:"feedabcdef12",mk:"m".repeat(30),ek:"x",unit:"TEAM",me:"A",mid:m.id,sec:m.sec,posts:[{id:7,t:Date.now()-60000,txt:"Gear inspection at 0800",by:"OIC"}],seen:0,mine:{},hub:1}];
      S.me={pk:"p".repeat(24),unit:"TEAM",d:mpDigest(m),t:Date.now()};S.onb=true;S.welcomed=1;S.mode="civilian";view="today";render()`);
    await sleep(200);
    const f = a.$("#mfFeed");
    assert.ok(f, "feed shown on the page");
    assert.match(f.textContent, /Gear inspection at 0800/); assert.match(f.textContent, /Got it needed/);
    a.$("#mfFeed .mf-p").click(); await sleep(150);
    assert.equal(a.w.eval("view"), "feed", "tapping a post opens Word of Mouth");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("a leader has an Inbox next to Word of Mouth and Send, and on every My page strip", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`const m=S.roster[0];m.pk="p".repeat(24);m.dm={id:"t1",k:"k".repeat(32),ek:"x",ok:1};S.dmMsgs={t1:[{id:1,t:Date.now()-5000,txt:"Reporting at 0700",by:"M",n:"CPL"},{id:2,t:Date.now()-2000,txt:"Copy",by:"L",n:""}]};S.dmSeen={};
      S.onb=true;S.welcomed=1;S.leaderMode=true;view="feed";render()`);
    await sleep(200);
    const tabs = a.w.eval(`[...document.querySelectorAll("#tabbar [data-tab]")].map(b=>b.dataset.tab).join(",")`);
    assert.match(tabs, /tools,inbox/, "Inbox tab sits right beside Tools");
    assert.equal(a.$("#tabbar [data-tab='inbox'] .bd").textContent.trim(), "1", "unread shown in red on the tab");
    assert.ok(!a.$("#tabbar [data-tab='feed'] .bd"), "not counted on Word of Mouth");
    a.$("#tabbar [data-tab='inbox']").click(); await sleep(200);
    assert.equal(a.w.eval("view"), "dms");
    assert.match(a.$("#main").textContent, /Reporting at 0700|Copy/);
    assert.equal(a.$("#tabbar [data-tab='inbox']").getAttribute("aria-current"), "page");
    a.w.eval(`view="today";render()`); await sleep(100);
    assert.ok(a.$("#dmAsInbox"), "Inbox button on the strip");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("Inbox: search, filter chips, ↗ You / ↙ markers, red unread, New message button", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`const m=S.roster[0];m.pk="p".repeat(24);m.dm={id:"t1",k:"k".repeat(32),ek:"x",ok:1};S.dmMsgs={t1:[{id:1,t:Date.now()-5000,txt:"Reporting at 0700",by:"M",n:"CPL"},{id:2,t:Date.now()-2000,txt:"Copy that",by:"L",n:""}]};S.dmSeen={t1:1};
      S.onb=true;S.welcomed=1;S.leaderMode=true;view="dms";render()`);
    await sleep(150);
    assert.match(a.$("#ibList").textContent, /↗ You:\s*Copy that/, "my message shows as You");
    assert.ok(a.$("#ibList .ib-row"), "thread row");
    a.$('[data-ibf="unread"]').click(); await sleep(40);
    assert.ok(!a.$("#ibList .ib-row"), "no unread threads");
    a.$('[data-ibf="sent"]').click(); await sleep(40);
    assert.ok(a.$("#ibList .ib-row"), "sent filter keeps it");
    a.$("#ibFab").click(); await sleep(40);
    assert.ok(!a.$("#ibNewBox").hidden, "New message opens the picker");
    assert.deepEqual(a.errors.filter((e) => !/scrollTo|scrollIntoView/.test(e)), []);
  } finally { await a.close(); }
});
