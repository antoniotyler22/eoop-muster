// Everyone on the team gets alerts: leaders join the Feed alert list, and edits send one batched "Team update".
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const FEED = `{id:"feedabcdef12",mk:"${"m".repeat(30)}",lk:"${"l".repeat(30)}",ek:"${"e".repeat(43)}",unit:"1ST",posts:[],seen:0}`;
const setup = (role = "oic") => `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="${role}";S.feeds=[${FEED}];S.pushOn=true;
  window.pushSub=async()=>({endpoint:"https://push.example/me",toJSON:()=>({endpoint:"https://push.example/me",keys:{}})});save();`;

test("a leader phone with alerts on joins its own Feed's alert list", async () => {
  const rpcs = [];
  const a = await openApp({ rpc: (fn, b) => { rpcs.push([fn, b]); return null; } });
  try {
    a.w.eval(setup("co"));
    const n = await a.w.eval(`taAttach(true)`);
    assert.equal(n, 1);
    const sub = rpcs.find(([fn]) => fn === "feed_sub");
    assert.ok(sub, "subscribed");
    assert.equal(sub[1].p_member_key, "m".repeat(30));
  } finally { a.close(); }
});

test("an edit made on this phone sends one Team update with what changed, skipping this phone", async () => {
  const sent = [];
  const a = await openApp({ rpc: () => null, fn: (name, body) => { sent.push(body); return { status: 200, body: "sent 3" }; } });
  try {
    a.w.eval(setup());
    await sleep(20);
    a.w.eval(`document.body.click();S.roster[0].status=S.roster[0].status==="Leave"?"On Hand":"Leave";save();
      document.body.click();S.roster=S.roster.slice(1);save();`);
    await a.w.eval(`taFlush()`); await sleep(50);
    const t = sent.filter((b) => b && b.team);
    assert.equal(t.length, 1, "one batched alert");
    assert.equal(t[0].team, "feedabcdef12");
    assert.deepEqual([...t[0].what].sort(), ["roster", "status"]);
    assert.equal(t[0].skip, "https://push.example/me");
  } finally { a.close(); }
});

test("data arriving from another phone (no tap here) doesn't send an alert", async () => {
  const sent = [];
  const a = await openApp({ rpc: () => null, fn: (n, b) => { sent.push(b); return { status: 200, body: "" }; } });
  try {
    a.w.eval(setup());
    await sleep(2700);
    a.w.eval(`S.roster[0].status="Leave";save();`);
    await a.w.eval(`taFlush()`); await sleep(50);
    assert.equal(sent.filter((b) => b && b.team).length, 0);
  } finally { a.close(); }
});

test("view-only phones never send Team updates", async () => {
  const sent = [];
  const a = await openApp({ rpc: () => null, fn: (n, b) => { sent.push(b); return { status: 200, body: "" }; } });
  try {
    a.w.eval(setup("view"));
    a.w.eval(`document.body.click();S.roster[0].status="Leave";save();`);
    await a.w.eval(`taFlush()`); await sleep(50);
    assert.equal(sent.filter((b) => b && b.team).length, 0);
  } finally { a.close(); }
});

test("Team alerts switch shows on Feed for a phone without alerts", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(`S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.feeds=[${FEED}];S.pushOn=false;Object.defineProperty(navigator,"serviceWorker",{value:{},configurable:true});window.PushManager=function(){};window.Notification={permission:"default"};save();view="feed";render()`);
    await sleep(20);
    assert.ok(a.$("#taOn"), "switch shown");
  } finally { a.close(); }
});

test("a platoon change also alerts the company Feed it rolls up to", async () => {
  const sent = [];
  const a = await openApp({ rpc: () => null, fn: (n, b) => { sent.push(b); return { status: 200, body: "sent 1" }; } });
  try {
    a.w.eval(setup());
    a.w.eval(`S.feeds.push({id:"cofeed123456",mk:"${"c".repeat(30)}",ek:"${"e".repeat(43)}",unit:"Company",posts:[],seen:0,hub2:1});save();`);
    await sleep(20);
    a.w.eval(`document.body.click();S.roster[0].status=S.roster[0].status==="Leave"?"On Hand":"Leave";save();`);
    await a.w.eval(`taFlush()`); await sleep(50);
    const ids = sent.filter((b) => b && b.team).map((b) => b.team).sort();
    assert.deepEqual(ids, ["cofeed123456", "feedabcdef12"]);
  } finally { a.close(); }
});
