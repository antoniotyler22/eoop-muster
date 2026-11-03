// Section leaders / co-leaders open on Word of Mouth when a post is waiting for their Confirm.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";
const feed = (extra) => `{id:"feedabcdef12",mk:"m".repeat(30),ek:"e".repeat(50),unit:"1ST PLT",me:"SGT HE LEAD",sec:"HE",posts:[{id:5,t:Date.now(),by:"CWO4 TYLER",txt:"Word",to:{},sl:0}],seen:0,mine:{}${extra||""}}`;
test("a section leader with a post to confirm lands on Word of Mouth", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.feeds=[${feed()}];S.onb=true;S.welcomed=1;S.role="sncoic";S.link={mysec:"HE"};view="board";render()`);
    await sleep(200);
    a.w.eval(`openFeedCheck()`); await sleep(250);
    assert.equal(a.w.eval("view"), "feed");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
test("nothing waiting: stays on Home", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.feeds=[${feed(',mine:{5:{t:1}}').replace(',seen:0,mine:{}','').replace(/mine:\{\}/,'')}];S.onb=true;S.welcomed=1;S.role="sncoic";S.link={mysec:"HE"};view="board";render()`);
    await sleep(200);
    a.w.eval(`openFeedCheck()`); await sleep(250);
    assert.equal(a.w.eval("view"), "board");
  } finally { await a.close(); }
});
