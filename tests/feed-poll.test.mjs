// Poll: question + choice boxes; members see a bar graph once they vote; the leader's tally fills it in.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("compose: Question and choice boxes, + Add a choice, post carries question and choices", async () => {
  let posted = null;
  const a = await openApp({ rpc: (fn, args) => { if (fn === "feed_post") { posted = args; return 77; } return []; } });
  try {
    a.w.eval(`S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.tos=99;S.feeds=[{id:"f1",mk:"m".repeat(32),lk:"l".repeat(32),ek:b64url(crypto.getRandomValues(new Uint8Array(32))),unit:"1ST",posts:[],acks:{},mine:{}}];fdSel="f1";view="feed";save();render()`);
    a.$("#fdPollOn").click(); await sleep(5);
    assert.ok(a.$("#fdPollQ") && a.$("#fdPollO0") && a.$("#fdPollO1"));
    a.$("#fdPollAdd").click(); await sleep(5);
    assert.ok(a.$("#fdPollO2"), "third choice box");
    a.w.eval(`$("#fdPollQ").value="Run time?";$("#fdPollO0").value="0600";$("#fdPollO1").value="0630";$("#fdPollO2").value="1600"`);
    a.$("#fdPost").click();
    for (let i = 0; i < 100 && !a.w.eval(`(S.feeds[0].posts||[]).length`); i++) await sleep(20);
    const p = a.w.eval(`S.feeds[0].posts[0]`);
    assert.deepEqual([...p.poll], ["0600", "0630", "1600"]);
    assert.equal(p.pq, "Run time?");
    assert.match(p.txt, /^Run time\?/);
  } finally { await a.close(); }
});

test("member: buttons before voting, bar graph after, tally fills the counts", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.welcomed=1;S.onb=true;S.feeds=[{id:"f2",mk:"m".repeat(32),ek:"e",unit:"1ST",me:"CPL SMITH",posts:[{id:5,t:Date.now(),txt:"Run time?",pq:"Run time?",poll:["0600","0630"],to:{k:"all"}}],mine:{}}];fdSel="f2";view="feed";save();render()`);
    assert.equal(a.$$('#main .pollr.pick').length, 2, "choices as buttons");
    a.$('#main [data-fdvote="5"][data-opt="0630"]').click();
    for (let i = 0; i < 50 && !a.$("#main .pollf"); i++) await sleep(20);
    assert.ok(a.$("#main .pollf"), "bar graph after voting");
    assert.match(a.$("#main").textContent, /100% · 1/);
    a.w.eval(`S.feeds[0].tally={5:{cnt:{"0600":3,"0630":1},n:4,of:10,t:Date.now()+1000}};renderFeed()`);
    assert.match(a.$("#main").textContent, /75% · 3/);
    assert.match(a.$("#main").textContent, /4 votes of 10/);
  } finally { await a.close(); }
});
