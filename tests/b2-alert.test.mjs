// 4.82.0: the B2 alert card on Word of Mouth (avatar, count, bar, slide to confirm).
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const FEED = { id: "feedabcdef12", mk: "m".repeat(30), lk: "l".repeat(30) };
const key = (a) => a.$("#b2Alert .b2-knob").dispatchEvent(new a.w.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

test("leader sees the newest unconfirmed post as an alert card with a count; sliding confirms it", async () => {
  const a = await openApp();
  try {
    a.w.eval(`S.leaderMode=true;S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",lk:"${FEED.lk}",ek:"x",unit:"1ST PLT",main:true,acks:{},un:{},mine:{},seen:0,
      posts:[{id:1,t:Date.now()-60000,txt:"Formation 0700",by:"SGT HQ",sl:"HQ"},{id:3,t:Date.now(),txt:"1st sqd cleaning gear",by:"SGT ONE",sl:"1ST"}]}];
      fdSel="${FEED.id}";view="feed";render()`);
    const c = a.$("#b2Alert");
    assert.ok(c, "alert card shows");
    assert.match(c.textContent, /1st sqd cleaning gear/);
    assert.match(c.textContent, /Word of Mouth/);
    assert.match(c.textContent, /of \d+ confirmed/);
    assert.match(a.$("#fStack").textContent, /2 to confirm/);
    assert.equal(a.$$("#fStack .fscard").length, 0, "the old card is replaced, not doubled");
    assert.ok(a.$("#b2Alert .b2-bar"), "progress bar");
    key(a);
    await sleep(700);
    assert.ok(a.w.eval(`S.feeds[0].lseen[3]>0`), "post 3 confirmed");
    assert.match(a.$("#b2Alert").textContent, /Formation 0700/, "next waiting post is now on the card");
    key(a);
    await sleep(700);
    assert.ok(!a.$("#b2Alert"), "no card once everything is confirmed");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("member's slide sends a Got it for the post", async () => {
  const sent = [];
  const a = await openApp({ rpc: (fn, body) => { if (fn === "feed_ack") sent.push(body); return []; } });
  try {
    a.w.eval(`S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",ek:"x",unit:"1ST PLT",me:"CPL TEST",sec:"1ST",mine:{},seen:0,
      posts:[{id:5,t:Date.now(),txt:"Turn in gear Friday",by:"SGT ONE"}]}];S.onb=true;S.welcomed=1;fdSel="${FEED.id}";view="feed";render()`);
    assert.ok(a.$("#b2Alert"), "card for a member too");
    assert.ok(!a.$("#b2N"), "members don't see the count");
    key(a);
    await sleep(800);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].p_post, 5);
    assert.equal(sent[0].p_code, 1);
    assert.ok(!a.$("#b2Alert"));
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("no card when nothing is waiting", async () => {
  const a = await openApp();
  try {
    a.w.eval(`S.leaderMode=true;S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",lk:"${FEED.lk}",ek:"x",unit:"1ST PLT",main:true,acks:{},un:{},mine:{},seen:0,lseen:{1:Date.now()},
      posts:[{id:1,t:Date.now(),txt:"Formation 0700",by:"SGT HQ",sl:"HQ"}]}];fdSel="${FEED.id}";view="feed";render()`);
    assert.ok(!a.$("#b2Alert"));
  } finally { await a.close(); }
});
