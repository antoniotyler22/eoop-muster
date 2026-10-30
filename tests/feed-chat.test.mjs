// 4.45.0: the Feed as a conversation: bubbles plus a one-at-a-time Confirm card.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const FEED = { id: "feedabcdef12", mk: "m".repeat(30) };
const setup = (a, mine = "{}") => a.w.eval(`S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",ek:"x",unit:"1ST PLT",me:"CPL TEST",sec:"1ST",mine:${mine},seen:0,
  posts:[{id:5,t:Date.now()-5000,txt:"Older word"},{id:6,t:Date.now(),txt:"Newest word",urg:true}]}];S.onb=true;S.welcomed=1;fdSel="${FEED.id}";view="feed";render()`);

test("member sees the urgent post in the confirm card, confirming moves to the next", async () => {
  const sent = [];
  const a = await openApp({ rpc: (fn, body) => { if (fn === "feed_ack") sent.push(body); return []; } });
  try {
    setup(a);
    const st = a.$("#fStack"); assert.ok(st, "card shown");
    assert.match(st.textContent, /2 to confirm/); assert.match(st.textContent, /Newest word/);
    assert.ok(a.$("#main").classList.contains("fchat"));
    assert.equal(a.$$("#main article.fc.bub").length, 2, "both posts are bubbles");
    st.querySelector("[data-fdack]").click(); await sleep(150);
    assert.equal(sent.length, 1); assert.equal(sent[0].p_post, 6);
    assert.match(a.$("#fStack").textContent, /1 to confirm/); assert.match(a.$("#fStack").textContent, /Older word/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("when everything is confirmed it says all caught up", async () => {
  const a = await openApp();
  try {
    setup(a, `{5:{c:1,t:Date.now()},6:{c:1,t:Date.now()}}`);
    assert.match(a.$("#fStack").textContent, /All caught up/);
    assert.ok(!a.$("#fStack [data-fdack]"));
  } finally { await a.close(); }
});

test("Reply from the card opens the box inside the card", async () => {
  const a = await openApp();
  try {
    setup(a);
    a.$("#fStack [data-fdrep]").click();
    assert.ok(a.$("#fStack #fdRep6"), "reply box lives in the card");
  } finally { await a.close(); }
});
