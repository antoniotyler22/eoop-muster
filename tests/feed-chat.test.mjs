// 4.83.0: Word of Mouth as a conversation: bubbles, and no Confirm card (seen is automatic).
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const FEED = { id: "feedabcdef12", mk: "m".repeat(30) };
const setup = (a, mine = "{}") => a.w.eval(`S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",ek:"x",unit:"1ST PLT",me:"CPL TEST",sec:"1ST",mine:${mine},seen:0,
  posts:[{id:5,t:Date.now()-5000,txt:"Older word"},{id:6,t:Date.now(),txt:"Newest word",urg:true}]}];S.onb=true;S.welcomed=1;fdSel="${FEED.id}";view="feed";render()`);

test("posts are bubbles and there is no confirm card or Confirm button", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    setup(a);
    assert.ok(a.$("#main").classList.contains("fchat"));
    assert.equal(a.$$("#main article.fc.bub").length, 2, "both posts are bubbles");
    assert.ok(!a.$("#fStack"), "no confirm card");
    assert.ok(!a.$("[data-fdack][data-c='1']"), "no Got it / Confirm button");
    assert.ok(!/Confirm/.test(a.$("#main").textContent), "no Confirm anywhere on the page");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("Reply still opens a box under the post", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    setup(a);
    a.$('[data-fdrep="6"]').click();
    assert.ok(a.$("#fdRep6"), "reply box opens");
  } finally { await a.close(); }
});
