// 4.83.0: Word of Mouth has no Confirm button. Seen happens by itself and the leader sees it.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const FEED = { id: "feedabcdef12", mk: "m".repeat(30), lk: "l".repeat(30) };

test("leader: no Confirm buttons; own posts say I posted it; opening the feed marks the others seen", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.leaderMode=true;S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",lk:"${FEED.lk}",ek:"x",unit:"1ST PLT",main:true,acks:{},un:{},mine:{},seen:0,
      posts:[{id:1,t:Date.now()-60000,txt:"Formation 0700",by:"1ST PLT"},{id:2,t:Date.now()-30000,txt:"HQ is at the range",by:"SGT HQ",sl:"HQ"},{id:3,t:Date.now(),txt:"1st sqd cleaning gear",by:"SGT ONE",sl:"1ST"}]}];
      fdSel="${FEED.id}";view="feed";render()`);
    const txt = () => a.$("#main").textContent;
    assert.equal(a.$$("[data-fsok]").length, 0, "no Confirm buttons");
    assert.ok(!a.$("#fsAll") && !a.$("#fStack"), "no Confirm all, no confirm card");
    assert.ok(!/Confirm/.test(txt()), "no Confirm anywhere");
    assert.match(a.$$("#main article.fc").find(c => /Formation 0700/.test(c.textContent)).textContent, /I posted it/);
    assert.equal(a.w.eval(`fsOpen(S.feeds[0]).length`), 2, "two posts from section leaders not seen yet");
    await sleep(900);
    assert.ok(a.w.eval(`S.feeds[0].lseen[2]>0 && S.feeds[0].lseen[3]>0`), "seen by opening the feed");
    assert.ok(!a.w.eval(`S.feeds[0].lseen[1]`), "own post is not marked");
    assert.equal(a.w.eval(`fsOpen(S.feeds[0]).length`), 0);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("member: no Confirm button; opening the feed sends the Got it by itself; a post for another section is left alone", async () => {
  const sent = [];
  const a = await openApp({ rpc: (fn, body) => { if (fn === "feed_ack") sent.push(body); return []; } });
  try {
    a.w.eval(`S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",ek:"x",unit:"1ST PLT",me:"CPL TEST",sec:"1ST",mine:{},seen:0,
      posts:[{id:5,t:Date.now(),txt:"Everyone: turn in gear"},{id:6,t:Date.now()-1000,txt:"HQ only: range at 0900",to:{k:"secs",s:["HQ"]}}]}];S.onb=true;S.welcomed=1;fdSel="${FEED.id}";view="feed";render()`);
    assert.ok(!a.$('[data-fdack][data-c="1"]'), "no Got it / Confirm button");
    assert.doesNotMatch(a.$("#main").textContent, /no Got it needed/);
    assert.ok(a.$('[data-fdprob="5"]'), "Problem stays");
    await sleep(1500);
    assert.equal(sent.length, 1, "one Got it, for the post meant for this person");
    assert.equal(sent[0].p_post, 5);
    assert.equal(sent[0].p_code, 1);
    assert.match(a.$("#main").textContent, /✓ Seen/);
    await a.w.autoSeenRun(); await sleep(100);
    assert.equal(sent.length, 1, "nothing is sent twice");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("member who already replied or sent a Problem is not overwritten", async () => {
  const sent = [];
  const a = await openApp({ rpc: (fn, body) => { if (fn === "feed_ack") sent.push(body); return []; } });
  try {
    a.w.eval(`S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",ek:"x",unit:"1ST PLT",me:"CPL TEST",sec:"1ST",mine:{5:{c:1,note:"On my way",t:Date.now()},6:{c:2,note:"No ride",t:Date.now()}},seen:0,
      posts:[{id:5,t:Date.now(),txt:"Formation"},{id:6,t:Date.now()-1000,txt:"Trip Friday"}]}];S.onb=true;S.welcomed=1;fdSel="${FEED.id}";view="feed";render()`);
    await sleep(1500);
    assert.equal(sent.length, 0);
  } finally { await a.close(); }
});

test("a failed send is not shown and is not retried right away", async () => {
  let calls = 0;
  const a = await openApp({ rpc: (fn) => { if (fn === "feed_ack") { calls++; throw new Error("offline"); } return []; } });
  try {
    a.w.eval(`S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",ek:"x",unit:"1ST PLT",me:"CPL TEST",sec:"1ST",mine:{},seen:0,
      posts:[{id:5,t:Date.now(),txt:"Formation"}]}];S.onb=true;S.welcomed=1;fdSel="${FEED.id}";view="feed";render()`);
    await sleep(1500);
    await a.w.autoSeenRun(); await sleep(100);
    assert.equal(calls, 1, "waits before trying again");
    assert.ok(!a.w.eval(`!!(S.feeds[0].mine||{})[5]`), "not marked as sent");
  } finally { await a.close(); }
});

test("My page: the Plan of the Day has no Confirm button and is marked seen by itself", async () => {
  const sent = [];
  const a = await openApp({ rpc: (fn, body) => { if (fn === "feed_ack") sent.push(body); return []; } });
  try {
    a.w.eval(`const m=S.roster[0];const D=mpDigest(m);D.pod={d:"2026-10-27",txt:"Plan of the Day\\nFormation: 0700"};
      S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",ek:"x",unit:"1ST PLT",me:"CPL TEST",mid:m.id,sec:m.sec,mine:{},seen:0,hub:1,
        posts:[{id:11,t:Date.now(),txt:"Plan of the Day\\nFormation: 0700",by:"1ST PLT",pod:{d:"2026-10-27"}}]}];
      S.me={pk:"p".repeat(24),unit:"1ST PLT",d:D,t:Date.now()};S.onb=true;S.welcomed=1;view="me";render()`);
    assert.ok(!a.$("[data-meack]"), "no Confirm button");
    await sleep(1500);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].p_post, 11);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("nothing that can be swiped blocks pinch-zoom", async () => {
  const fs = await import("node:fs"); const path = await import("node:path");
  const dir = new URL("../features/", import.meta.url).pathname;
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith(".js"))) {
    const src = fs.readFileSync(path.join(dir, f), "utf8");
    for (const m of src.matchAll(/touch-action:\s*(pan-[xy])(?!\s+pinch-zoom)\s*[;}`]/g))
      assert.fail(f + " has touch-action:" + m[1] + " without pinch-zoom: pinching on it will not zoom the app");
  }
});
