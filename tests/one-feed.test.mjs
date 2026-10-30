// 4.44.0: one Feed per unit, one tab.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const mk = (id, posts) => `{id:"${id}",mk:"${"m".repeat(30)}",lk:"${id.padEnd(30, "l")}",ek:"x",unit:"UNIT",un:{},mine:{},acks:{},seen:0,posts:${posts}}`;

test("three Feeds with the same title show as one with no tab bar, on the copy that has the posts", async () => {
  const calls = [];
  let serverPosts = false;
  const a = await openApp({ rpc: (fn, body) => { calls.push([fn, body]); if (fn === "feed_get") return serverPosts ? [{ id: 9 }] : []; return fn === "feed_sub_stats" ? [{ total: 1, leads: 1 }] : []; } });
  try {
    a.w.eval(`S.leaderMode=true;S.onb=true;S.welcomed=1;S.feeds=[${mk("emptyaaaaaaa01", "[]")},${mk("hasposts000002", `[{id:1,t:Date.now(),txt:"Formation 0700",by:"UNIT"}]`)},${mk("emptybbbbbbb03", "[]")}];fdSel="emptyaaaaaaa01";view="feed";render()`);
    await sleep(80);
    assert.equal(a.$$("#main .evts [data-fdsel]").length, 0, "no tab bar");
    assert.match(a.$("#main").textContent, /Formation 0700/, "shows the copy with posts");
    assert.equal(a.w.eval("fdSel"), "hasposts000002");
    await sleep(1800);
    assert.equal(a.w.eval("S.feeds.length"), 1, "the two empty copies are gone");
    assert.equal(a.w.eval("S.feeds[0].id"), "hasposts000002");
    assert.ok(a.w.eval("S.feeds[0].main"));
    assert.equal(calls.filter(([f]) => f === "delete_feed").length, 2);
  } finally { await a.close(); }
});

test("an empty copy with member phones on it is hidden, not deleted", async () => {
  const calls = [];
  const a = await openApp({ rpc: (fn, body) => { calls.push(fn); return fn === "feed_sub_stats" ? [{ total: 5, leads: 1 }] : []; } });
  try {
    a.w.eval(`S.leaderMode=true;S.onb=true;S.welcomed=1;S.feeds=[${mk("hasposts000002", `[{id:1,t:Date.now(),txt:"Hi",by:"UNIT"}]`)},${mk("emptyaaaaaaa01", "[]")}];fdSel="hasposts000002";view="feed";render()`);
    await sleep(1800);
    assert.equal(a.w.eval("S.feeds.length"), 2, "kept");
    assert.ok(!calls.includes("delete_feed"));
    assert.equal(a.$$("#main .evts [data-fdsel]").length, 0, "but only one title shows");
  } finally { await a.close(); }
});

test("different units still get their own tabs", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.leaderMode=true;S.onb=true;S.welcomed=1;S.feeds=[${mk("aaaaaaaaaaaa01", "[]")},Object.assign(${mk("bbbbbbbbbbbb02", "[]")},{unit:"OTHER"})];fdSel="aaaaaaaaaaaa01";view="feed";render()`);
    await sleep(80);
    assert.equal(a.$$("#main .evts [data-fdsel]").length, 2);
  } finally { await a.close(); }
});

test("an empty-looking copy that has posts on the server is never deleted", async () => {
  const calls = [];
  const a = await openApp({ rpc: (fn) => { calls.push(fn); if (fn === "feed_get") return [{ id: 9 }]; return fn === "feed_sub_stats" ? [{ total: 1, leads: 1 }] : []; } });
  try {
    a.w.eval(`S.leaderMode=true;S.onb=true;S.welcomed=1;S.feeds=[${mk("hasposts000002", `[{id:1,t:Date.now(),txt:"Hi",by:"UNIT"}]`)},${mk("emptyaaaaaaa01", "[]")}];fdSel="hasposts000002";view="feed";render()`);
    await sleep(1800);
    assert.equal(a.w.eval("S.feeds.length"), 2);
    assert.ok(!calls.includes("delete_feed"));
  } finally { await a.close(); }
});
