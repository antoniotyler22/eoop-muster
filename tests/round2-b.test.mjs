// 4.127.0 (b): join codes, sign in finds your roster spot, Ask to join, one People screen.
// Two phones (owner and the person joining) talk through a small in-memory stand-in for the server functions of
// setup parts 52 and 53; the last test runs the real SQL on Postgres.
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { openApp, sleep, waitFor } from "./harness.mjs";
import { startPg, applySetup } from "./pg.mjs";

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const J = (a, expr) => JSON.parse(a.w.eval(`JSON.stringify(${expr})`));
const EK = "E".repeat(43);
const FEED = { id: "feedteam0001", lk: "l".repeat(32), mk: "m".repeat(30), ek: EK };
const OWNER = `S.mode="military";S.onb=true;S.welcomed=1;S.leaderMode=true;S.source="mol";S.role="oic";S.unit="ALPHA CO";
  S.roster=S.roster.slice(0,6);S.feeds=[{id:"${FEED.id}",lk:"${FEED.lk}",mk:"${FEED.mk}",ek:"${FEED.ek}",unit:"ALPHA CO",main:true,posts:[],seen:0,mine:{}}];save();`;

function server() {
  const st = { codes: {}, dir: {}, reqs: [], emails: {}, email: "", calls: [] };
  st.rpc = (fn, b) => {
    st.calls.push([fn, b]);
    const leader = () => { if (b.p_leader_key !== FEED.lk || b.p_feed !== FEED.id) throw new Error("not allowed"); };
    switch (fn) {
      case "join_code_set": leader(); st.codes[b.p_feed] = { h: b.p_h, ct: b.p_ct, on: true }; return null;
      case "join_code_enable": leader(); if (st.codes[b.p_feed]) st.codes[b.p_feed].on = !!b.p_on; return null;
      case "join_code_get": return Object.entries(st.codes).filter(([, c]) => c.h === b.p_h && c.on).map(([feed_id, c]) => ({ feed_id, ct: c.ct }));
      case "team_dir_put": leader(); if (b.p_on) st.dir[b.p_feed] = { feed_id: b.p_feed, name: b.p_name, pub: b.p_pub }; else delete st.dir[b.p_feed]; return null;
      case "team_dir_find": return Object.values(st.dir).filter((d) => String(b.p_q).length >= 3 && d.name.toLowerCase().includes(String(b.p_q).toLowerCase()));
      case "join_req_send": { if (!st.dir[b.p_feed]) throw new Error("team not taking requests"); const id = st.reqs.length + 1; st.reqs.push({ id, feed: b.p_feed, ct: b.p_ct, tok_hash: b.p_tok_hash, status: "pending", created_at: new Date().toISOString() }); return id; }
      case "join_req_list": leader(); return st.reqs.filter((r) => r.feed === b.p_feed).map((r) => ({ id: r.id, ct: r.ct, status: r.status, created_at: r.created_at, decided_at: r.decided_at || null }));
      case "join_req_decide": { leader(); const r = st.reqs.find((x) => x.id === b.p_id); r.status = b.p_status; r.reply_ct = b.p_reply_ct; r.decided_at = new Date().toISOString(); return null; }
      case "join_req_status": return st.reqs.filter((r) => r.id === b.p_id && r.tok_hash === sha(b.p_tok)).map((r) => ({ status: r.status, reply_ct: r.reply_ct || null, decided_at: r.decided_at || null }));
      case "roster_email_put": leader(); st.emails[b.p_feed] = b.p_rows; return b.p_rows.length;
      case "roster_email_claim": { const h = sha("af-email-v1:" + st.email); return Object.entries(st.emails).flatMap(([feed_id, rows]) => rows.filter((r) => r.h === h).map((r) => ({ feed_id, ct: r.ct }))); }
      default: return [];
    }
  };
  return st;
}
const fresh = `S.mode="military";S.onb=true;S.welcomed=1;S.source="sample";S.feeds=[];save();`;

test("join code: 6 characters, never 0, O, 1 or I; typing is forgiving", async () => {
  const a = await openApp({});
  try {
    const codes = J(a, `Array.from({length:300},()=>afJoin.newJoinCode())`);
    for (const c of codes) { assert.match(c, /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/); }
    assert.ok(new Set(codes).size > 290, "random");
    assert.equal(a.w.eval(`afJoin.cleanCode(" abc-23z ")`), "ABC23Z");
    assert.equal(a.w.eval(`afJoin.codeOK("ABC23Z")`), true);
    assert.equal(a.w.eval(`afJoin.codeOK("ABC10Z")`), false, "no 1 or 0");
    assert.equal(a.w.eval(`afJoin.codeOK("ABCIOZ")`), false, "no I or O");
  } finally { await a.close(); }
});

test("join code: the owner makes, shows, renews and turns off the code; a person joins with it and is matched to the roster", async () => {
  const srv = server();
  const o = await openApp({ rpc: srv.rpc });
  const p = await openApp({ rpc: srv.rpc });
  try {
    o.w.eval(OWNER + `view="joincode";render();`); await sleep(20);
    assert.match(o.$("#jcPanel").textContent, /ALPHA CO/, "team name on the code panel");
    o.$("#jcNew").click(); await waitFor(() => o.$("#jcCode"), 8000);
    const code = o.w.eval(`S.jc.code`);
    assert.match(code, /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
    const set = srv.calls.filter(([fn]) => fn === "join_code_set").pop()[1];
    assert.equal(set.p_h, sha("af-join-v1:" + code), "the server gets only a hash of the code");
    assert.ok(!set.p_ct.includes(FEED.mk), "and a sealed link");
    // the person types it
    p.w.eval(fresh + `view="askjoin";render();`); await sleep(20);
    p.$("#ajCode").value = code.toLowerCase().slice(0, 3) + " " + code.slice(3); p.$("#ajJoin").click();
    await waitFor(() => p.$("#ajYes"), 8000);
    assert.match(p.$("#sheetT").textContent, /Join ALPHA CO\?/, "the team's name on the join screen");
    p.$("#ajTos").checked = true; p.$("#ajYes").click(); await sleep(200);
    assert.ok(J(p, `S.feeds.map(f=>f.id)`).includes(FEED.id), "joined the team's Word of Mouth");
    assert.ok(srv.calls.some(([fn, b]) => fn === "feed_names_get" && b.p_feed === FEED.id), "loads the roster names to pick from");
    // renew: the old code stops working
    o.$("#jcNew").click(); await sleep(20); o.$("#jcNew").click();
    await waitFor(() => o.w.eval(`S.jc.code`) !== code, 8000);
    p.w.eval(`S.feeds=[];save();view="askjoin";render();`); await sleep(20);
    p.$("#ajCode").value = code; p.$("#ajJoin").click(); await waitFor(() => /didn't work/.test(p.$("#ajOut").textContent), 8000);
    // off
    o.$("#jcToggle").click(); await waitFor(() => o.w.eval(`S.jc.on`) === false, 8000);
    assert.equal(srv.codes[FEED.id].on, false);
    p.$("#ajCode").value = o.w.eval(`S.jc.code`); p.$("#ajJoin").click(); await waitFor(() => /didn't work/.test(p.$("#ajOut").textContent), 8000);
    p.$("#ajCode").value = "AB01"; p.$("#ajJoin").click(); await sleep(20);
    assert.match(p.$("#ajOut").textContent, /6 letters and numbers/);
  } finally { await o.close(); await p.close(); }
});

test("Ask to join: find the team by name, ask; the owner approves and the person is told and matched; decline is told too", async () => {
  const srv = server();
  const o = await openApp({ rpc: srv.rpc });
  const p = await openApp({ rpc: srv.rpc });
  try {
    o.w.eval(OWNER + `view="joinreqs";render();`); await sleep(20);
    const on = o.$("#askOn"); on.checked = true; on.dispatchEvent(new o.w.Event("change", { bubbles: true }));
    await waitFor(() => srv.dir[FEED.id], 8000);
    assert.equal(srv.dir[FEED.id].name, "ALPHA CO");
    // the person
    p.w.eval(fresh + `view="askjoin";render();`); await sleep(20);
    p.$("#ajQ").value = "alp"; p.$("#ajFind").click(); await waitFor(() => p.$("[data-askteam]"), 8000);
    p.$("[data-askteam]").click(); await sleep(20);
    assert.match(p.$("#sheetT").textContent, /Ask to join ALPHA CO/);
    p.$("#afRank").value = "cpl"; p.$("#afLast").value = "Okafor"; p.$("#afFirst").value = "Sam"; p.$("#afEmail").value = "bad@"; p.$("#afSend").click(); await sleep(20);
    assert.match(p.$("#afOut").textContent, /isn't valid/);
    p.$("#afEmail").value = "Sam.Okafor@Example.com"; p.$("#afSend").click();
    await waitFor(() => srv.reqs.length === 1, 8000);
    assert.ok(!srv.reqs[0].ct.includes("OKAFOR"), "the server can't read who is asking");
    assert.match(p.$("#ajWrap").textContent, /Waiting for ALPHA CO/);
    // the owner
    o.w.eval(`view="joinreqs";render();`); await waitFor(() => o.$("[data-reqok]"), 8000);
    assert.match(o.$("[data-req]").textContent, /CPL OKAFOR, SAM/);
    assert.match(o.$("[data-req]").textContent, /sam\.okafor@example\.com/);
    assert.equal(o.w.eval("S.askWaiting"), 1);
    o.$("[data-reqok]").click(); await waitFor(() => srv.reqs[0].status === "approved", 8000);
    const mid = o.w.eval(`S.roster.find(m=>m.name==="OKAFOR, SAM").id`);
    assert.ok(mid, "added to the roster");
    assert.equal(o.w.eval(`S.roster.find(m=>m.id==="${mid}").email`), "sam.okafor@example.com");
    // the person is told and matched to that spot
    await p.w.eval(`afCheckReqs()`); await sleep(100);
    const f = J(p, `S.feeds.find(f=>f.id==="${FEED.id}")`);
    assert.ok(f, "joined");
    assert.equal(f.mid, mid, "matched to their roster spot");
    assert.equal(p.w.eval(`S.myReqs[0].status`), "approved");
    assert.equal(p.w.eval(`S.myReqs[0].tok||""`), "", "the secret is dropped once answered");
    // a decline
    p.w.eval(`S.feeds=[];save();view="askjoin";render();`); p.$("#ajQ").value = "alpha"; p.$("#ajFind").click(); await waitFor(() => p.$("[data-askteam]"), 8000);
    p.$("[data-askteam]").click(); await sleep(20); p.$("#afLast").value = "Doe"; p.$("#afSend").click(); await waitFor(() => srv.reqs.length === 2, 8000);
    await o.w.eval(`afReqLoad(true)`); o.w.eval(`view="joinreqs";render();`);
    await waitFor(() => o.$("[data-reqno]"), 10000);
    o.$("[data-reqno]").click(); await waitFor(() => srv.reqs[1].status === "declined", 8000);
    await p.w.eval(`afCheckReqs()`); await sleep(50);
    assert.equal(p.w.eval(`S.myReqs[0].status`), "declined");
    assert.match(p.$("#ajWrap").textContent, /declined your request/);
    // nobody else can read the answer: a wrong token gets nothing
    assert.deepEqual(srv.rpc("join_req_status", { p_id: 1, p_tok: "guess" }), []);
  } finally { await o.close(); await p.close(); }
});

test("sign in with Apple or Google: a roster email match joins as that person; no match goes to Ask to join", async () => {
  const srv = server();
  const o = await openApp({ rpc: srv.rpc });
  const p = await openApp({ rpc: srv.rpc });
  try {
    o.w.eval(OWNER + `S.roster[2].email="ana.rivera@example.com";save();`);
    await o.w.eval(`afEmailsPub(true)`);
    const rows = srv.emails[FEED.id];
    assert.equal(rows.length, 1);
    assert.equal(rows[0].h, sha("af-email-v1:ana.rivera@example.com"), "only a salted hash of the email");
    assert.ok(!rows[0].ct.includes("ana"), "and a sealed link");
    const mid = o.w.eval(`S.roster[2].id`);
    // Ana signs in on a new phone
    srv.email = "ana.rivera@example.com";
    p.w.eval(fresh + `AUTH.s={access_token:"t",refresh_token:"r",exp:Date.now()+3600000,user:{id:"u1",email:"ana.rivera@example.com"}};sessionStorage.setItem("af-join-signin","1");window.dispatchEvent(new Event("af-signed-in"));`);
    await waitFor(() => p.w.eval(`S.feeds.some(f=>f.id==="${FEED.id}")`), 10000);
    assert.equal(p.w.eval(`S.feeds.find(f=>f.id==="${FEED.id}").mid`), mid, "matched to her roster spot");
    // someone whose email isn't on a roster
    const q = await openApp({ rpc: srv.rpc });
    try {
      srv.email = "nobody@example.com";
      q.w.eval(fresh + `AUTH.s={access_token:"t",refresh_token:"r",exp:Date.now()+3600000,user:{id:"u2",email:"nobody@example.com"}};sessionStorage.setItem("af-join-signin","1");window.dispatchEvent(new Event("af-signed-in"));`);
      await waitFor(() => q.w.eval("view") === "askjoin", 10000);
      assert.match(q.$("#ajOut").textContent, /didn't find nobody@example\.com/);
    } finally { await q.close(); }
    assert.match(p.w.eval(`askJoinHTML()`), /Sign in with Apple/);
    assert.match(p.w.eval(`askJoinHTML()`), /Sign in with Google/);
  } finally { await o.close(); await p.close(); }
});

test("People: one screen with section chips, multi-select Move to…, the owner's Sections summary; leaders see only their section", async () => {
  const a = await openApp({});
  try {
    a.w.eval(OWNER + `const ks=SECTIONS.map(x=>x[0]);S.roster.forEach((m,i)=>{m.sec=ks[i%2];m.status="On Hand";m.ut=Date.now()});S.roster[1].ut=Date.now()-3*86400000;S.secLead={};S.secBy={};S.secAt={};S.board=null;save();view="people";render();`); await sleep(20);
    assert.ok(!a.$("#v12MoveWrap"), "no separate Move people box");
    assert.ok(a.$("#secSum"), "owner sees the Sections summary");
    const k0 = a.w.eval("SECTIONS[0][0]"), k1 = a.w.eval("SECTIONS[1][0]");
    const r1 = a.$(`[data-secsum="${k1}"]`);
    assert.match(r1.textContent, /1/, "who's missing is counted");
    assert.ok(r1.querySelector("[data-seclead]"), "unassigned section offers Assign leader");
    r1.querySelector("[data-seclead]").click(); await sleep(20);
    a.$("[data-sleadid]").click(); await sleep(20);
    assert.ok(a.w.eval(`S.secLead["${k1}"].n`));
    assert.match(a.$("#sheetT").textContent, /leads/);
    a.w.eval(`closeSheet();render();`); await sleep(20);
    assert.ok(!a.$(`[data-secsum="${k1}"] [data-seclead]`), "now shows the leader");
    // chips filter
    a.$(`[data-pchip="${k0}"]`).click(); await sleep(20);
    assert.ok(a.$$("#pplList [data-pcard]").length > 0);
    assert.ok(a.$$("#pplList .ph").every((x) => x.textContent.startsWith(k0)), "only that section");
    a.$('[data-pchip="all"]').click(); await sleep(20);
    // select two and move them
    a.$("#pplSel").click(); await sleep(20);
    const cks = a.$$("[data-psel]");
    for (const c of cks.slice(0, 2)) { c.checked = true; c.dispatchEvent(new a.w.Event("change", { bubbles: true })); }
    assert.match(a.$("#pmBar").textContent, /2 selected/);
    const ids = cks.slice(0, 2).map((c) => c.dataset.psel);
    a.$("#pmMove").click(); await sleep(20);
    a.$('[data-pmto="ATT"]').click(); await sleep(30);
    assert.deepEqual(J(a, `${JSON.stringify(ids)}.map(id=>S.roster.find(m=>m.id===id).sec)`), ["ATT", "ATT"]);
    // a section leader: only their own section, no moving out
    a.w.eval(`S.role="oic";S.source="link";S.link={board:"b".repeat(14),wk:"w".repeat(32),ek:"",sec:"${k0}",unit:"ALPHA CO",mysec:"${k0}",me:"",sig:"",sent:0,err:"",rk2:"r".repeat(43),pulled:true,pt:Date.now()};S.roster=S.roster.filter(m=>m.sec==="${k0}");save();view="people";render();`); await sleep(20);
    assert.ok(!a.$("#secSum"), "no Sections summary");
    assert.ok(!a.$("#pplSel"), "can't select to move people out");
    assert.ok(!a.$("#pplChips"), "only their section, so no chips");
    assert.match(a.$("#pplWrap").textContent, new RegExp("Your section · " + k0));
    // members don't have the tab
    a.w.eval(`S.link=null;S.me={pk:"x".repeat(20),d:{}};save();`);
    if (a.w.eval(`memberMode()`)) assert.ok(!J(a, `tabsList().map(t=>t[0])`).includes("people"));
  } finally { await a.close(); }
});

const pg = await startPg();
test("setup part 53: join codes need the leader key and the exact code; requests are sealed, listed only for the owner and answered only to the asker", { skip: pg ? false : "Postgres not installed" }, () => {
  const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
  const anon = (sql) => pg.psql(`set role anon; ${sql}`);
  applySetup(pg);
  const lk = "leader-key-0123456789abcdef", mk = "member-key-0123456789abcd";
  pg.psql(`insert into public.feeds(id, member_key_hash, leader_key_hash) values ('feedjoin01', ${q(sha(mk))}, ${q(sha(lk))}), ('feedjoin02', ${q(sha("other-member-key-012345"))}, ${q(sha("other-leader-key-012345"))}) on conflict do nothing`);
  const h = sha("af-join-v1:ABC234");
  assert.throws(() => anon(`select public.join_code_set('feedjoin01', ${q(mk)}, ${q(h)}, 'sealed')`), /not allowed/, "the member key can't set it");
  anon(`select public.join_code_set('feedjoin01', ${q(lk)}, ${q(h)}, 'sealed')`);
  assert.throws(() => anon(`select public.join_code_set('feedjoin02', 'other-leader-key-012345', ${q(h)}, 'x')`), /code taken/, "codes are unique");
  assert.equal(anon(`select feed_id || ':' || ct from public.join_code_get(${q(h)})`), "feedjoin01:sealed");
  assert.equal(anon(`select count(*) from public.join_code_get(${q(sha("af-join-v1:ABC235"))})`), "0", "a wrong code gets nothing");
  anon(`select public.join_code_enable('feedjoin01', ${q(lk)}, false)`);
  assert.equal(anon(`select count(*) from public.join_code_get(${q(h)})`), "0", "off means off");
  for (const t of ["join_codes", "join_reqs", "team_dir", "join_misses"]) assert.throws(() => anon(`select count(*) from public.${t}`), /permission denied/, t);
  // misses are limited
  pg.psql(`delete from public.join_misses; insert into public.join_misses(at) select now() from generate_series(1,30)`);
  assert.throws(() => anon(`select count(*) from public.join_code_get(${q(h)})`), /too many tries/);
  pg.psql(`delete from public.join_misses`);
  // Ask to join
  assert.throws(() => anon(`select public.join_req_send('feedjoin01', 'sealed-request', ${q(sha("tok"))})`), /not taking requests/, "only listed teams take requests");
  anon(`select public.team_dir_put('feedjoin01', ${q(lk)}, 'Alpha  Company', ${q("p".repeat(40))}, true)`);
  assert.equal(anon(`select count(*) from public.team_dir_find('al')`), "0", "at least 3 letters");
  assert.equal(anon(`select name from public.team_dir_find('comp')`), "Alpha Company", "finds a word in the name");
  const id = anon(`select public.join_req_send('feedjoin01', 'sealed-request', ${q(sha("my-secret-token"))})`);
  assert.throws(() => anon(`select count(*) from public.join_req_list('feedjoin01', ${q(mk)})`), /not allowed/, "members can't list requests");
  assert.equal(anon(`select ct from public.join_req_list('feedjoin01', ${q(lk)})`), "sealed-request");
  assert.throws(() => anon(`select public.join_req_decide('feedjoin01', ${q(lk)}, ${id}, 'approved', null)`), /bad input/, "an approval carries the sealed answer");
  anon(`select public.join_req_decide('feedjoin01', ${q(lk)}, ${id}, 'approved', 'sealed-answer')`);
  assert.equal(anon(`select count(*) from public.join_req_status(${id}, 'wrong-token')`), "0", "a third person gets nothing");
  assert.equal(anon(`select status || ':' || reply_ct from public.join_req_status(${id}, 'my-secret-token')`), "approved:sealed-answer");
  assert.throws(() => anon(`select public.join_req_decide('feedjoin02', 'other-leader-key-012345', ${id}, 'declined', null)`), /no such request/, "another team's owner can't touch it");
  anon(`select public.team_dir_put('feedjoin01', ${q(lk)}, '', '', false)`);
  assert.equal(anon(`select count(*) from public.team_dir_find('alpha')`), "0", "unlisted");
});
test.after(() => { try { pg && pg.stop(); } catch {} });
