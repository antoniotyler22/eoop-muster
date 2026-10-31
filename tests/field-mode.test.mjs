// 4.64.0: Field mode: things made with no signal wait on the phone and send themselves; a screen to see and manage them.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const FEED = { id: "feedabcdef12", mk: "m".repeat(30) };
const member = a => a.w.eval(`S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",ek:"x",unit:"1ST PLT",me:"CPL TEST",sec:"1ST",mine:{},seen:0,
  posts:[{id:6,t:Date.now(),txt:"Newest word"}]}];S.onb=true;S.welcomed=1;fdSel="${FEED.id}";view="feed";render()`);

test("a Got it with no signal waits, shows the bar, and sends when signal comes back", async () => {
  let down = true; const sent = [];
  const a = await openApp({ rpc: (fn, body) => { if (down) throw new Error("Failed to fetch"); if (fn === "feed_ack") sent.push(body); return []; } });
  try {
    member(a);
    a.$("#fStack [data-fdack]").click(); await sleep(300);
    assert.equal(a.w.eval("S.outbox.length"), 1, "saved on the phone");
    assert.match(a.w.eval("S.outbox[0].lb"), /Got it/);
    assert.match(a.$("#fmPill").textContent, /No signal.*1 waiting/);
    down = false; a.w.eval(`window.dispatchEvent(new Event("online"))`); await sleep(400);
    assert.equal(sent.length, 1, "sent once signal is back");
    assert.equal(a.w.eval("S.outbox.length"), 0);
    a.w.eval("fieldMode.paint()"); assert.equal(a.$("#fmPill"), null, "bar goes away when all is sent");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("a leader post with no signal shows right away as waiting, then the stand-in is swapped out", async () => {
  let down = true; const posts = [];
  const a = await openApp({ rpc: (fn, body) => { if (down && fn === "feed_post") throw new Error("Failed to fetch"); if (fn === "feed_post") { posts.push(body); return 77; } return []; } });
  try {
    a.w.eval(`S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",lk:"l".repeat(30),ek:"x",unit:"1ST PLT",posts:[]}];S.onb=true;S.welcomed=1;save();`);
    const id = await a.w.eval(`SB.rpc("feed_post",{p_feed:"${FEED.id}",p_leader_key:"${"l".repeat(30)}",p_ct:"abc"})`);
    assert.ok(id < 0, "a stand-in id comes back");
    assert.match(a.w.eval("S.outbox[0].lb"), /Post/);
    a.w.eval(`S.feeds[0].posts=[{id:${id},t:Date.now(),txt:"Water at 1100",to:{k:"all"}}];fdSel="${FEED.id}";view="feed";render()`); await sleep(20);
    assert.ok(a.$(".fm-wait"), "marked as waiting in the Feed");
    const ctl = await a.w.eval(`SB.rpc("feed_post",{p_feed:"${FEED.id}",p_leader_key:"x",p_ct:"c:pin"}).then(()=>"sent",e=>"failed")`);
    assert.equal(ctl, "failed", "pins and tallies are not held");
    down = false; a.w.eval(`window.dispatchEvent(new Event("online"))`); await sleep(400);
    assert.equal(posts.length, 1, "the post went out");
    a.w.eval("fieldMode.tidy()"); await sleep(50);
    assert.equal(a.w.eval("S.feeds[0].posts.filter(p=>p.id<0).length"), 0, "stand-in removed");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("the Field mode screen: switch, waiting list with delete, Tools tile", async () => {
  const a = await openApp({ rpc: () => { throw new Error("Failed to fetch"); } });
  try {
    a.w.eval(`S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.sync=null;
      S.outbox=[{fn:"feed_req",args:{},t:Date.now(),lb:"📍 Check-in: CPL TEST → On Hand",fm:1},{fn:"feed_ack",args:{},t:Date.now(),lb:"✓ Got it on a post",fm:1}];save();view="tools";render()`);
    await sleep(20);
    assert.ok(a.$('[data-go="field"]'), "Tools has Field mode");
    a.w.eval(`view="field";render()`);
    assert.match(a.$("#main").textContent, /Waiting to send/); assert.match(a.$("#main").textContent, /CPL TEST → On Hand/);
    a.$("[data-fmdel]").click(); assert.match(a.$("[data-fmdel]").textContent, /Tap again/);
    a.$("[data-fmdel]").click(); assert.equal(a.w.eval("S.outbox.length"), 1, "deleted after two taps");
    const sw = a.$("#fmOn"); sw.checked = true; sw.dispatchEvent(new a.w.Event("change", { bubbles: true }));
    assert.equal(a.w.eval("S.field"), true);
    assert.equal(a.$("#fmPill"), null, "no bar on the Field screen itself");
    a.w.eval(`view="board";render();fieldMode.paint()`);
    assert.match(a.w.eval("document.getElementById('fmPill')?.textContent||''"), /waiting|Field mode|Sending/, "bar shows elsewhere");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
