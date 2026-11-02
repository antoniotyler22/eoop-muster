// Every login role opens the Feed too: the login carries the unit Feed link and sign-in adds it quietly.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("a login for any role carries the Feed, and joining it needs no prompt", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`(async()=>{const k=crypto.getRandomValues(new Uint8Array(32));const ek=b64e(k).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/,"");
      S.feeds=[{id:"feedabcdef12",mk:"m".repeat(30),lk:"l".repeat(30),ek,unit:"1ST PLT",me:"CWO4 TEST",posts:[],seen:0,mine:{},acks:{},pins:[]}];S.onb=true;S.welcomed=1;render()})()`);
    await sleep(150);
    const fh = a.w.eval(`lgFeedHash({dest:"sec:HE"})`);
    assert.match(fh, /^feed=feedabcdef12&k=m{30}&e=/, "section leader login carries the member Feed link");
    assert.ok(!/l{30}/.test(fh), "never the leader key");
    assert.equal(a.w.eval(`lgFeedHash({dest:"acc:view"})`) !== "", true, "viewer too");
    assert.equal(a.w.eval(`lgFeedHash({dest:"me:x"})`), "", "a member's page already carries it");
    // a fresh phone joins quietly
    a.w.eval(`S.feeds=[];S.myName="SGT HE LEAD";lgJoinFeed(${JSON.stringify(fh)},"HE section leader")`); await sleep(200);
    assert.equal(a.w.eval(`S.feeds.length`), 1, "Feed added");
    assert.equal(a.w.eval(`S.feeds[0].me`), "SGT HE LEAD");
    assert.ok(!a.w.eval(`S.feeds[0].lk`), "member access only");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
