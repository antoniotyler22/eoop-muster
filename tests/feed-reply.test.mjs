// 4.42.0: reply to a Feed post (a Got it that carries a short note); the leader sees it by name.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const FEED = { id: "feedabcdef12", mk: "m".repeat(30), lk: "l".repeat(30) };

test("member taps Reply, types, sends: it goes as a Got it with the words, and shows under the post", async () => {
  const sent = [];
  const a = await openApp({ rpc: (fn, body) => { if (fn === "feed_ack") sent.push(body); return []; } });
  try {
    a.w.eval(`S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",ek:"x",unit:"1ST PLT",me:"CPL TEST",sec:"1ST",mine:{},seen:0,
      posts:[{id:5,t:Date.now(),txt:"Formation 0700. Can everyone make it?"}]}];S.onb=true;S.welcomed=1;fdSel="${FEED.id}";view="feed";render()`);
    assert.ok(a.$('[data-fdack="5"]'), "Confirm button still there");
    a.$('[data-fdrep="5"]').click();
    const i = a.$("#fdRep5"); assert.ok(i, "reply box opens");
    i.value = "Yes, I'll be there"; a.$('[data-fdrepsend="5"]').click();
    await sleep(150);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].p_code, 1); assert.equal(sent[0].p_post, 5); assert.equal(sent[0].p_note, "Yes, I'll be there");
    assert.match(a.$("#main").textContent, /You replied: “Yes, I'll be there”/);
    assert.ok(!a.$('[data-fdrep="5"]'), "no second reply box");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("an empty reply is not sent", async () => {
  const sent = [];
  const a = await openApp({ rpc: (fn, body) => { if (fn === "feed_ack") sent.push(body); return []; } });
  try {
    a.w.eval(`S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",ek:"x",unit:"1ST PLT",me:"CPL TEST",sec:"1ST",mine:{},seen:0,posts:[{id:5,t:Date.now(),txt:"Hello"}]}];S.onb=true;S.welcomed=1;fdSel="${FEED.id}";view="feed";render()`);
    a.$('[data-fdrep="5"]').click(); a.$('[data-fdrepsend="5"]').click(); await sleep(100);
    assert.equal(sent.length, 0);
  } finally { await a.close(); }
});

test("the leader sees replies by rank and name in the post's Who list", async () => {
  const a = await openApp();
  try {
    a.w.eval(`S.source="mol";S.leaderMode=true;S.roster=[{id:"r1",rank:"CPL",name:"JONES, BEN",sec:"HQ",status:"On Hand",phone:"8085550101"},{id:"r2",rank:"PFC",name:"PARK, DEE",sec:"HQ",status:"On Hand"}];
      S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",lk:"${FEED.lk}",ek:"x",unit:"1ST PLT",main:true,un:{},mine:{},seen:0,
      acks:{"7":{r1:{c:1,note:"Yes, I'll be there",t:Date.now()},r2:{c:1,note:"",t:Date.now()}}},
      posts:[{id:7,t:Date.now(),txt:"Formation 0700",by:"1ST PLT"}]}];S.onb=true;S.welcomed=1;fdSel="${FEED.id}";fdOpen=7;view="feed";render()`);
    const t = a.$("#main").textContent;
    assert.match(t, /Replies \(1\)/); assert.match(t, /JONES, BEN/); assert.match(t, /Yes, I'll be there/);
    assert.doesNotMatch(t, /Replies \(2\)/, "a plain Got it is not a reply");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
