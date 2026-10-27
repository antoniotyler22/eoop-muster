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
