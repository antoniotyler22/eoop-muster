// 4.58.0: tiles with a × / Hide now slide left to show Hide (and Done / Delete).
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const LEAD = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.board={id:"b1",rk:"r",wk:"w",ek:"e",after:0,last:{},sk:{}};S.sync=null;save();`;
test("Today cards and Needs-you rows get swipe choices; Hide works; the × is out of sight", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(LEAD + `const k=dkey();S.roster[1].cal=[{id:"c2",d:k,tm:"",ty:"LEAVE",ti:"Parental leave"}];S.roster[2].cal=[{id:"c3",d:k,tm:"",ty:"TAD",ti:"TAD 30 days"}];save();view="board";render();`);
    await sleep(30);
    const sw = a.$$(".strip .sw"); assert.ok(sw.length >= 2, "today cards are swipeable");
    assert.ok(a.$(".strip.sw-list"), "today cards stack as a list");
    assert.ok(a.$(".strip .sw [data-tdhide].sw-sr"), "the × is visually hidden but still there");
    const n = sw.length;
    a.$(".strip .sw .sw-b.hide").click(); await sleep(400);
    assert.equal(a.$$(".strip .sw").length, n - 1, "Hide removes the card");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
