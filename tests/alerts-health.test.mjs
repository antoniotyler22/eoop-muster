// 4.34.0: alerts that never went out. The server's service role lost its table rights, so notify read nothing and
// answered "no sub". The System check now says so, and a member's page check-in buzzes the leaders when the page
// carries the Feed keys.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep, waitFor } from "./harness.mjs";
import { readFileSync } from "node:fs";

test("System check tells you when the server can't read its own tables", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    const st = (nt) => JSON.parse(a.w.eval(`JSON.stringify(ntState(${JSON.stringify(nt)}))`));
    const r = st({ s: 400, t: "bad", s2: 500, s3: 200, s4: 200, v: "4.32.0", hs: 500, h: "db denied" });
    assert.equal(r.ok, 0);
    assert.match(r.msg, /part 35/);
    assert.equal(st({ s: 400, t: "bad", s2: 200, s3: 200, s4: 200, v: "4.32.0", hs: 200, h: "ok" }).ok, 1);
  } finally { await a.close(); }
});

test("a page check-in with the Feed keys on the page also sends the leader alert", async () => {
  const sent = [], alerts = [];
  const a = await openApp({ rpc: (fn, body) => { if (fn === "page_req") { sent.push(body); return 9; } return []; } });
  try {
    await a.w.eval(`(async()=>{SB.notify=(rid,b)=>{(window.__al=window.__al||[]).push(b)};const m=S.roster[0];const D=mpDigest(m);D.feed={id:"abcdefghij1234",mk:"m".repeat(30),ek:"e".repeat(40),unit:"UT",secs:[]};D.cofeed=null;D.cks=[];
      S.feeds=[];S.me={pk:"${"p".repeat(28)}",unit:"UT",d:D,t:Date.now()};S.onb=true;S.welcomed=1;view="me";render()})()`);
    await sleep(50);
    a.$("#ckOpen").click(); a.$('[data-ckst="On Hand"]').click(); a.$("#ckSend").click();
    await waitFor(() => sent.length === 1);
    await waitFor(() => a.w.eval("(window.__al||[]).length") >= 1);
    const al = JSON.parse(a.w.eval("JSON.stringify(window.__al[0])"));
    assert.equal(al.alert, "ck"); assert.equal(al.feed, "abcdefghij1234"); assert.equal(al.mk, "m".repeat(30));
  } finally { await a.close(); }
});

test("notify never turns a database error into 'no sub', and has a health check", () => {
  const t = readFileSync(new URL("../supabase/functions/notify/index.ts", import.meta.url), "utf8");
  assert.match(t, /VER = "4\.32\.0"/);
  assert.match(t, /if \(e0\) return dbErr\(e0\)/);
  assert.match(t, /body\.health === 1/);
  assert.equal((t.match(/dbErr\(e0\)/g) || []).length, 5,"recall, board, feed, team and alertOic all check the read");
  const sql = readFileSync(new URL("../supabase/setup/35_service_role_grants.sql", import.meta.url), "utf8");
  assert.match(sql, /to service_role/);
  assert.doesNotMatch(sql, /to (anon|authenticated|public)/i);
});

test("leader sees how many phones get alerts against the roster", async () => {
  const a = await openApp({ rpc: (fn) => (fn === "feed_sub_stats" ? [{ total: 2, leads: 1 }] : null) });
  try {
    a.w.eval(`S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.feeds=[{id:"feedabcdef12",mk:"${"m".repeat(30)}",lk:"${"l".repeat(30)}",ek:"${"e".repeat(43)}",unit:"1ST",main:1,posts:[],seen:0}];save();view="feed";render()`);
    await waitFor(() => a.$("#taStat"));
    const t = a.$("#taStat").textContent;
    assert.match(t, /2 phones get your alerts/);
    assert.match(t, /1 leader phone\./);
    assert.match(t, /Turn on team alerts/, "warns when fewer phones than people");
  } finally { a.close(); }
});

test("setup part 36 queues a rolled-up job per check-in and notify sends one alert for many", () => {
  const sql = readFileSync(new URL("../supabase/setup/36_req_alerts.sql", import.meta.url), "utf8");
  assert.match(sql, /create trigger af_push_req after insert on public\.feed_reqs/);
  assert.match(sql, /'kind', 'req'/);
  const t = readFileSync(new URL("../supabase/functions/notify/index.ts", import.meta.url), "utf8");
  assert.match(t, /VER = "4\.32\.0"/);
  assert.match(t, /m\.kind === "req"/);
  assert.match(t, /new check-ins or requests/);
  assert.match(t, /last_req_push_id/);
});

test("owner is buzzed when alerts stall, and a member is asked for alerts after checking in", async () => {
  const n = readFileSync(new URL("../supabase/functions/notify/index.ts", import.meta.url), "utf8");
  assert.match(n, /body\.stalled === 1/);
  assert.match(n, /Alerts not going out/);
  assert.match(n, /await watchOwner\(\)/);
  const a = await openApp({ rpc: () => null });
  try {
    await a.w.eval(`(async()=>{const m=S.roster[0];const D=mpDigest(m);D.feed={id:"abcdefghij1234",mk:"m".repeat(30),ek:"e".repeat(40),unit:"UT",secs:[]};D.cofeed=null;D.cks=[];
      S.feeds=[];S.pushOn=false;S.myCks=[{t:Date.now(),st:"On Hand",ct:"x"}];S.me={pk:"${"p".repeat(28)}",unit:"UT",d:D,t:Date.now()};S.onb=true;S.welcomed=1;view="me";render()})()`);
    await sleep(50);
    assert.ok(a.$("#ckAl"), "prompt shows after a check-in when alerts are off");
    assert.match(a.$("#ckAl").textContent, /Turn on alerts/);
    a.w.eval(`S.pushOn=true;render()`);
    await sleep(50);
    assert.ok(!a.$("#ckAl"));
  } finally { await a.close(); }
});

test("owner function in the repo is the deployed one plus the alerts op", () => {
  const o = readFileSync(new URL("../supabase/functions/owner/index.ts", import.meta.url), "utf8");
  for (const s of ["case \"alerts\"", "case \"broadcast\"", "case \"subcount\"", "async function pushTo", "async function allSubs", "{ stalled: 1 }"]) assert.ok(o.includes(s), s);
});
