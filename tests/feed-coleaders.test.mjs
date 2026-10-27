// Co-leaders and editors get the leader's feed posting key through sync and can post.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const FEED = `{id:"feedabcdef12",mk:"${"m".repeat(30)}",lk:"${"l".repeat(30)}",ek:"${"e".repeat(43)}",unit:"1ST",posts:[{id:3,t:1,txt:"hi"}],seen:0}`;
const phone = (role) => `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.tos=typeof TERMS_VER!=="undefined"?TERMS_VER:1;S.role="${role}";S.sync={on:true,code:"ABCD-EFGH-JKMN-PQRS"};`;

for (const role of ["co", "sncoic"]) {
  test(`${role}: a feed the leader starts after linking reaches this phone with a Post box`, async () => {
    const a = await openApp({ rpc: () => [] });
    try {
      a.w.eval(`${phone(role)}S.feeds=[];setBase({roster:S.roster,feeds:[]});
        S.feeds=[{id:"feedabcdef12",mk:"${"m".repeat(30)}",unit:"1ST",posts:[],seen:4,hub:1}];save();
        mergeRemote({roster:S.roster,feeds:[${FEED}]});view="feed";render()`);
      await sleep(30);
      assert.equal(a.w.eval(`S.feeds.length`), 1, "one copy of the feed");
      assert.equal(a.w.eval(`S.feeds[0].lk`), "l".repeat(30));
      assert.ok(a.$("#fdPost"), "Post box shows");
    } finally { a.close(); }
  });
}

test("view-only phones still don't get posting", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`${phone("view")}S.feeds=[{id:"feedabcdef12",mk:"${"m".repeat(30)}",unit:"1ST",posts:[],hub:1}];setBase({roster:S.roster});fcMergeFeeds([${FEED}])`);
    assert.equal(a.w.eval(`S.feeds[0].lk||""`), "");
  } finally { a.close(); }
});

test("a rejected post re-registers an expired feed and goes through", async () => {
  let n = 0; const calls = [];
  const a = await openApp({ rpc: (fn) => { calls.push(fn); if (fn === "feed_post") { if (n++ === 0) throw new Error("not allowed"); return 9; } return null; } });
  try {
    a.w.eval(`${phone("co")}S.feeds=[${FEED}];save();view="feed";render()`);
    await sleep(30);
    a.$("#fdTxt").value = "test"; a.$("#fdPost").click(); await sleep(300);
    assert.ok(calls.includes("create_feed"), "re-registered the feed");
    assert.equal(a.w.eval(`S.feeds[0].posts[0].id`), 9, "post went through");
  } finally { a.close(); }
});
