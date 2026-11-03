// Everyone can write on the Word of Mouth.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const FEED = { id: "feedabcdef12", mk: "m".repeat(30), lk: "l".repeat(30) };
const feed = (extra = "") => `S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",ek:"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",unit:"1ST PLT",me:"CPL TEST",sec:"1ST",mine:{},seen:0,posts:[]${extra}}];S.onb=true;S.welcomed=1;S.tos=99;fdSel="${FEED.id}";view="feed";render()`;

test("a member (no leader key) gets a compose box and it posts with their member key", async () => {
  const calls = [];
  const a = await openApp({ rpc: (fn, args) => { calls.push([fn, args]); return fn === "feed_post_member" ? 77 : []; } });
  try {
    a.w.eval(feed());
    assert.ok(a.$("#fdMBox"), "member compose box shows");
    assert.equal(a.$("#fdPost"), null, "leader form does not");
    a.$("#fdMTxt").value = "Anyone have a spare 10mm?";
    a.$("#fdMPost").click(); await sleep(60);
    const c = calls.find((x) => x[0] === "feed_post_member");
    assert.ok(c, "feed_post_member was called");
    assert.equal(c[1].p_member_key, FEED.mk);
    assert.equal(c[1].p_feed, FEED.id);
    const p = a.w.eval(`JSON.stringify(S.feeds[0].posts[0])`);
    assert.match(p, /"mb":1/);
    assert.match(p, /CPL TEST/);
  } finally { a.close(); }
});

test("leaders keep their own post form, not the member box", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(feed(`,lk:"${FEED.lk}",main:true,un:{}`));
    assert.ok(a.$("#fdPost"));
    assert.equal(a.$("#fdMBox"), null);
  } finally { a.close(); }
});

test("a member post counts as someone else's post for the OIC, and as mine for the writer", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(feed());
    assert.equal(a.w.eval(`fsOwn(S.feeds[0],{id:1,by:"CPL TEST",mb:1})`), true);
    assert.equal(a.w.eval(`fsOwn(S.feeds[0],{id:2,by:"SGT OTHER",mb:1})`), false);
    assert.equal(a.w.eval(`fsOwn({lk:"x"},{id:3,by:"CPL TEST",mb:1})`), false, "OIC does not own member posts");
    assert.equal(a.w.eval(`fsOwn({lk:"x"},{id:4,by:"OIC"})`), true);
  } finally { a.close(); }
});

test("it is called Word of Mouth on the tab and the screen", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(feed());
    assert.match(a.$("#main").textContent, /Word of Mouth/);
    assert.doesNotMatch(a.$("#main").textContent, /\bFeed\b/);
  } finally { a.close(); }
});
