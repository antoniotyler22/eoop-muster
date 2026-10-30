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
    const r = st({ s: 400, t: "bad", s2: 500, s3: 200, s4: 200, v: "4.30.0", hs: 500, h: "db denied" });
    assert.equal(r.ok, 0);
    assert.match(r.msg, /part 35/);
    assert.equal(st({ s: 400, t: "bad", s2: 200, s3: 200, s4: 200, v: "4.30.0", hs: 200, h: "ok" }).ok, 1);
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
  assert.match(t, /VER = "4\.30\.0"/);
  assert.match(t, /if \(e0\) return dbErr\(e0\)/);
  assert.match(t, /body\.health === 1/);
  assert.equal((t.match(/dbErr\(e0\)/g) || []).length, 5,"recall, board, feed, team and alertOic all check the read");
  const sql = readFileSync(new URL("../supabase/setup/35_service_role_grants.sql", import.meta.url), "utf8");
  assert.match(sql, /to service_role/);
  assert.doesNotMatch(sql, /to (anon|authenticated|public)/i);
});
