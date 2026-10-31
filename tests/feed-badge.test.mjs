// 4.57.0: the Feed tab's red number counts new posts on leader phones too; opening the Feed clears it.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp } from "./harness.mjs";

test("leader phone: starts at zero, counts a new post, clears when the Feed is opened", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.feeds=[{id:"feedabcdef12",lk:"l".repeat(30),mk:"m".repeat(30),ek:"x",unit:"1ST",posts:[{id:1,t:Date.now(),txt:"old"}],acks:{},mine:{},pins:[]}];fdSel="feedabcdef12";view="board";render()`);
    assert.equal(a.w.eval("fdUnread()"), 0, "no 9+ on first run");
    a.w.eval(`S.feeds[0].posts.unshift({id:2,t:Date.now(),txt:"new"});renderTabs()`);
    assert.equal(a.w.eval("fdUnread()"), 1);
    assert.match(a.$('#tabbar [data-tab="feed"] .bd').textContent, /1/);
    a.w.eval(`view="feed";render()`);
    assert.equal(a.w.eval("fdUnread()"), 0, "opening the Feed clears it");
  } finally { await a.close(); }
});
