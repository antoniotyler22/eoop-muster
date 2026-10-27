// Feed: a "Confirm I saw it" button on posts that didn't have one.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const FEED = { id: "feedabcdef12", mk: "m".repeat(30), lk: "l".repeat(30) };
const click = (a, sel) => { const el = a.$(sel); assert.ok(el, "found " + sel); el.click(); };

test("leader confirms section leaders' posts one at a time or all at once; own posts have no button", async () => {
  const a = await openApp();
  try {
    a.w.eval(`S.leaderMode=true;S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",lk:"${FEED.lk}",ek:"x",unit:"1ST PLT",main:true,acks:{},un:{},mine:{},seen:0,
      posts:[{id:1,t:Date.now()-60000,txt:"Formation 0700",by:"1ST PLT"},{id:2,t:Date.now()-30000,txt:"HQ is at the range",by:"SGT HQ",sl:"HQ"},{id:3,t:Date.now(),txt:"1st sqd cleaning gear",by:"SGT ONE",sl:"1ST"}]}];
      fdSel="${FEED.id}";view="feed";render()`);
    const txt = () => a.$("#main").textContent;
    assert.equal(a.$$("[data-fsok]").length, 2, "one button per section leader post");
    assert.ok(!a.$('[data-fsok="1"]'), "no button on the leader's own post");
    assert.match(a.$$("#main article.fc").find(c=>/Formation 0700/.test(c.textContent)).textContent, /I posted it/, "own post says I posted it");
    assert.match(txt(), /2 posts to confirm/);
    click(a, '[data-fsok="2"]');
    assert.ok(a.w.eval(`S.feeds[0].lseen[2]>0`));
    assert.match(txt(), /You confirmed/);
    assert.match(txt(), /1 post to confirm/);
    click(a, "#fsAll");
    assert.equal(a.$$("[data-fsok]").length, 0);
    assert.ok(!a.$("#fsAll"), "Confirm all goes away once everything is confirmed");
    assert.ok(a.w.eval(`JSON.parse(localStorage.getItem(KEY)||"{}").feeds?.[0]?.lseen?.[3]>0 || !!(window.VAULT&&VAULT.on())`), "saved");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("member can confirm a post aimed at another section; it goes to the leader as a Got it", async () => {
  const sent = [];
  const a = await openApp({ rpc: (fn, body) => { if (fn === "feed_ack") sent.push(body); return []; } });
  try {
    a.w.eval(`S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",ek:"x",unit:"1ST PLT",me:"CPL TEST",sec:"1ST",mine:{},seen:0,
      posts:[{id:5,t:Date.now(),txt:"HQ only: turn in gear",to:{k:"secs",s:["HQ"]}}]}];S.onb=true;S.welcomed=1;fdSel="${FEED.id}";view="feed";render()`);
    assert.doesNotMatch(a.$("#main").textContent, /no Got it needed/);
    click(a, '[data-fdack="5"]');
    await sleep(100);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].p_post, 5);
    assert.equal(sent[0].p_code, 1);
    assert.match(a.$("#main").textContent, /Confirmed/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("section leader sees I posted it on their own post; others get Confirm I saw it", async () => {
  const a = await openApp();
  try {
    a.w.eval(`S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",pk:"p".repeat(30),ek:"x",unit:"1ST PLT",me:"SGT HQ",sec:"HQ",mine:{},seen:0,
      posts:[{id:7,t:Date.now(),txt:"HQ at the range",by:"SGT HQ",sl:"HQ"},{id:8,t:Date.now()-1000,txt:"Formation 0700",by:"1ST PLT"},
        {id:9,t:Date.now()-2000,txt:"Plan of the Day\\nFormation: 0700",by:"1ST PLT",pod:{d:"2026-10-27"}}]}];S.onb=true;S.welcomed=1;fdSel="${FEED.id}";view="feed";render()`);
    const card = (re) => a.$$("#main article.fc").find((c) => re.test(c.textContent));
    assert.match(card(/at the range/).textContent, /I posted it/);
    assert.ok(!card(/at the range/).querySelector("[data-fdack]"), "no confirm on own post");
    assert.match(card(/Formation 0700/).textContent, /Confirm I saw it/);
    assert.match(card(/Plan of the Day/).textContent, /Confirm I saw it/, "Plan of the Day too");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("My page: Plan of the Day has Confirm I saw it and sends a Got it", async () => {
  const sent = [];
  const a = await openApp({ rpc: (fn, body) => { if (fn === "feed_ack") sent.push(body); return []; } });
  try {
    a.w.eval(`const m=S.roster[0];const D=mpDigest(m);D.pod={d:"2026-10-27",txt:"Plan of the Day\\nFormation: 0700"};
      S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",ek:"x",unit:"1ST PLT",me:"CPL TEST",mid:m.id,sec:m.sec,mine:{},seen:0,hub:1,
        posts:[{id:11,t:Date.now(),txt:"Plan of the Day\\nFormation: 0700",by:"1ST PLT",pod:{d:"2026-10-27"}}]}];
      S.me={pk:"p".repeat(24),unit:"1ST PLT",d:D,t:Date.now()};S.onb=true;S.welcomed=1;view="me";render()`);
    await sleep(50);
    click(a, `[data-meack="${FEED.id}|11"]`);
    await sleep(100);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].p_post, 11);
    assert.ok(!a.$("[data-meack]"), "button turns into Confirmed");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
