// 4.128.0 (c): Message someone (1:1 threads only the two people can read) and calendar visibility by section.
// Phones talk through a stand-in for the server functions that checks keys the same way setup parts 17, 54 and 55 do;
// the last tests run the real SQL on Postgres, including direct requests by a third person / another section.
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { openApp, sleep, waitFor } from "./harness.mjs";
import { startPg, applySetup } from "./pg.mjs";

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const J = (a, expr) => JSON.parse(a.w.eval(`JSON.stringify(${expr})`));
const FEED = { id: "feedteam0002", lk: "l".repeat(32), mk: "m".repeat(30), ek: "E".repeat(43) };
const NAMES = JSON.stringify([{ i: "p1", r: "CPL", n: "RIVERA, ANA", s: "HQ" }, { i: "p2", r: "SGT", n: "LEE, MAX", s: "HE" }, { i: "p3", r: "PVT", n: "KIM, JO", s: "HE" }]);
const member = (mid, me) => `S.mode="military";S.onb=true;S.welcomed=1;S.source="sample";S.roster=[];
  S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",ek:"${FEED.ek}",unit:"ALPHA CO",mid:"${mid}",me:"${me}",names:${NAMES},posts:[],seen:0,mine:{}}];save();`;

function server() {
  const st = { keys: {}, inv: [], th: {}, msgs: [], scopes: {}, events: [], calls: [] };
  const team = (b) => b.p_feed === FEED.id && (b.p_key === FEED.mk || b.p_key === FEED.lk);
  st.rpc = (fn, b) => {
    st.calls.push([fn, b]);
    switch (fn) {
      case "pm_key_put": { if (!team(b)) throw new Error("not allowed"); const k = st.keys[b.p_mh]; if (k && k.tok !== sha(b.p_tok)) throw new Error("taken"); st.keys[b.p_mh] = { pub: b.p_pub, tok: sha(b.p_tok) }; return null; }
      case "pm_key_get": if (!team(b)) throw new Error("not allowed"); return st.keys[b.p_mh] ? [{ pub: st.keys[b.p_mh].pub }] : [];
      case "pm_inv_send": { if (!team(b)) throw new Error("not allowed"); if (!st.keys[b.p_to]) throw new Error("not on the app yet"); st.inv.push({ id: st.inv.length + 1, to: b.p_to, ct: b.p_ct, created_at: new Date().toISOString() }); return st.inv.length; }
      case "pm_inv_get": { const k = st.keys[b.p_mh]; if (!k || k.tok !== sha(b.p_tok || "")) throw new Error("not allowed"); return st.inv.filter((v) => v.to === b.p_mh && v.id > (b.p_after || 0)); }
      case "dm_open": { const t = st.th[b.p_id]; if (!t) st.th[b.p_id] = { k: sha(b.p_key), ib: sha(b.p_inbox) }; else if (t.k !== sha(b.p_key)) throw new Error("not allowed"); return null; }
      case "dm_send": { const t = st.th[b.p_id]; if (!t || t.k !== sha(b.p_key)) throw new Error("not allowed"); st.msgs.push({ id: st.msgs.length + 1, th: b.p_id, ct: b.p_ct, created_at: new Date().toISOString() }); return st.msgs.length; }
      case "dm_get": { const t = st.th[b.p_id]; if (!t || t.k !== sha(b.p_key || "")) return []; return st.msgs.filter((m) => m.th === b.p_id && m.id > (b.p_after || 0)).map((m) => ({ id: m.id, ct: m.ct, created_at: m.created_at })); }
      case "dm_inbox": return st.msgs.filter((m) => st.th[m.th] && st.th[m.th].ib === sha(b.p_inbox || "")).map((m) => ({ id: m.id, thread_id: m.th, ct: m.ct }));
      case "cal_scope_put": if (b.p_feed !== FEED.id || b.p_leader_key !== FEED.lk) throw new Error("not allowed"); st.scopes[b.p_scope] = { rk: b.p_rk_hash, wk: b.p_wk_hash }; return null;
      case "cal_put": { const s = st.scopes[b.p_scope]; if (!s || s.wk !== sha(b.p_wk)) throw new Error("not allowed"); st.events = st.events.filter((e) => e.scope !== b.p_scope).concat(b.p_rows.map((r) => ({ scope: b.p_scope, eid: r.e, ct: r.ct }))); return b.p_rows.length; }
      case "cal_get": return st.events.filter((e) => (b.p_keys || []).some((k) => k.s === e.scope && st.scopes[e.scope] && st.scopes[e.scope].rk === sha(k.k || ""))).map((e) => Object.assign({ updated_at: new Date().toISOString() }, e));
      default: return [];
    }
  };
  return st;
}

test("Message someone: two people talk 1:1 with bubbles, sent and read times; the owner and a third person can't read it", async () => {
  const srv = server();
  const ana = await openApp({ rpc: srv.rpc }), max = await openApp({ rpc: srv.rpc }), jo = await openApp({ rpc: srv.rpc });
  try {
    ana.w.eval(member("p1", "CPL RIVERA")); max.w.eval(member("p2", "SGT LEE")); jo.w.eval(member("p3", "PVT KIM"));
    for (const a of [ana, max, jo]) await a.w.eval(`pmEnsureKey()`);
    assert.equal(Object.keys(srv.keys).length, 3, "each phone published its key");
    // Ana starts a thread with Max
    ana.w.eval(`view="pm";render();`); await sleep(20);
    ana.$("#pmNew").click(); await sleep(20);
    const names = ana.$$("[data-pmto]").map((b) => b.textContent);
    assert.ok(names.some((n) => /SGT LEE/.test(n)) && !names.some((n) => /CPL RIVERA/.test(n)), "the roster, without me");
    ana.$('[data-pmto="p2"]').click(); await waitFor(() => ana.$("#pmForm"), 8000);
    ana.$("#pmIn").value = "Can you cover my duty Friday?"; ana.$("#pmForm").dispatchEvent(new ana.w.Event("submit", { cancelable: true, bubbles: true }));
    await waitFor(() => srv.msgs.length === 1, 8000); await sleep(50);
    assert.ok(ana.$(".pmb.pm-me"), "my bubble on the right");
    assert.match(ana.$("#pmStatus").textContent, /^Sent \d{4}$/);
    assert.ok(!srv.msgs[0].ct.includes("duty"), "the server stores ciphertext");
    // Max gets it
    await max.w.eval(`pmPullInv()`); const tid = max.w.eval(`Object.keys(S.pm.th)[0]`);
    assert.ok(tid);
    await max.w.eval(`pmPull(S.pm.th["${tid}"])`);
    assert.equal(max.w.eval(`pmUnread()`), 1);
    max.w.eval(`pmOpen("${tid}")`); await sleep(50);
    assert.match(max.$(".pmb.pm-them").textContent, /cover my duty Friday/);
    assert.match(max.$("#pmWrap").textContent, /CPL RIVERA/);
    await waitFor(() => srv.msgs.length === 2, 8000);
    max.$("#pmIn").value = "Yes"; max.$("#pmForm").dispatchEvent(new max.w.Event("submit", { cancelable: true, bubbles: true }));
    await waitFor(() => srv.msgs.length === 3, 8000);
    // Ana sees the reply and that hers was read
    await ana.w.eval(`pmPull(S.pm.th["${tid}"])`); ana.w.eval(`render()`); await sleep(30);
    assert.match(ana.$$(".pmb.pm-them").map((b) => b.textContent).join("|"), /Yes/);
    assert.match(ana.$("#pmStatus") ? ana.$("#pmStatus").textContent : ana.w.eval(`""`), /Read \d{4}|Sent \d{4}/);
    assert.ok(ana.w.eval(`S.pm.th["${tid}"].theirRead`) >= 1, "Max's phone sent a read receipt");
    // a third person on the team: no thread, no invite, and guessing gets nothing
    await jo.w.eval(`pmPullInv()`);
    assert.equal(jo.w.eval(`Object.keys((S.pm||{}).th||{}).length`), 0);
    assert.deepEqual(srv.rpc("dm_get", { p_id: tid, p_key: FEED.mk, p_after: 0 }), [], "the team key doesn't open it");
    assert.deepEqual(srv.rpc("dm_inbox", { p_inbox: FEED.lk }), [], "the owner's inbox doesn't cover it");
    const anaMh = ana.w.eval(`S.pmKey.mh`);
    assert.throws(() => srv.rpc("pm_inv_get", { p_feed: FEED.id, p_mh: anaMh, p_tok: "guess", p_after: 0 }), /not allowed/, "nobody else lists Ana's invites");
    assert.throws(() => srv.rpc("pm_key_put", { p_feed: FEED.id, p_key: FEED.lk, p_mh: anaMh, p_pub: "x".repeat(40), p_tok: "owner-token-0123456789abcdef" }), /taken/, "even the owner can't swap in a key for Ana");
    assert.ok(J(ana, `SYNC_SKIP`).includes("pm"), "threads stay on this phone");
  } finally { await ana.close(); await max.close(); await jo.close(); }
});

test("My page has cards for Official channel, Voice inbox and Messages", async () => {
  const a = await openApp({});
  try {
    a.w.eval(`S.mode="military";S.onb=true;S.welcomed=1;const m=S.roster[0];const D=mpDigest(m);D.feed={id:"${FEED.id}",mk:"${FEED.mk}",ek:"${FEED.ek}",unit:"ALPHA CO",secs:["HQ"]};D.cks=[];
      S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",ek:"${FEED.ek}",unit:"ALPHA CO",me:"CPL TEST",mid:m.id,sec:m.sec,posts:[],seen:0,mine:{},hub:1}];
      S.me={pk:"p".repeat(24),unit:"ALPHA CO",d:D,t:Date.now()};save();view="me";render();`); await sleep(80);
    const c = a.$("#afCards");
    assert.ok(c, "cards on My page");
    for (const k of ["official", "voice", "pm"]) assert.ok(c.querySelector(`[data-afcard="${k}"]`), k);
    c.querySelector('[data-afcard="voice"]').click(); await sleep(50);
    assert.equal(a.w.eval("view"), "talk");
    a.w.eval(`view="me";render();`); await sleep(20);
    a.$('[data-afcard="pm"]').click(); await sleep(30);
    assert.equal(a.w.eval("view"), "pm");
  } finally { await a.close(); }
});

const OWNER = `S.mode="military";S.onb=true;S.welcomed=1;S.leaderMode=true;S.source="mol";S.role="oic";S.unit="ALPHA CO";
  S.feeds=[{id:"${FEED.id}",lk:"${FEED.lk}",mk:"${FEED.mk}",ek:"${FEED.ek}",unit:"ALPHA CO",main:true,posts:[],seen:0,mine:{}}];
  const ks=SECTIONS.map(x=>x[0]);S.roster=S.roster.slice(0,6);S.roster.forEach((m,i)=>{m.sec=ks[i%2];m.cal=[]});
  const d=dkey(new Date(Date.now()+2*86400000));
  S.calAll=[{g:"gall1",d,ti:"Unit run",ty:"Other"}];
  S.roster.filter(m=>m.sec===ks[0]).forEach(m=>m.cal.push({id:"c"+m.id,d,ti:"HQ-only brief",ty:"Other",sc:ks[0],g:"sq1"}));
  S.roster.filter(m=>m.sec===ks[1]).forEach(m=>m.cal.push({id:"c"+m.id,d,ti:"HE-only maintenance",ty:"Other",sc:ks[1],g:"sh1"}));save();`;

test("calendar: Everyone events reach every section; a section's events only that section; two sections both; full access all", async () => {
  const srv = server();
  const o = await openApp({ rpc: srv.rpc });
  try {
    o.w.eval(OWNER); await o.w.eval(`calScopePublish(true)`);
    assert.equal(Object.keys(srv.scopes).length, 1 + o.w.eval("SECTIONS.length"), "one scope for Everyone and one per section");
    assert.equal(srv.events.length, 3);
    assert.ok(!srv.events.some((e) => /only|Unit run/.test(e.ct)), "events are sealed");
    const k0 = o.w.eval("SECTIONS[0][0]"), k1 = o.w.eval("SECTIONS[1][0]");
    const p0 = o.w.eval(`S.roster.find(m=>m.sec==="${k0}").id`), p1 = o.w.eval(`S.roster.find(m=>m.sec==="${k1}").id`);
    const titles = async (ck) => {
      const m = await openApp({ rpc: srv.rpc });
      try { m.w.eval(`S.mode="military";S.onb=true;S.welcomed=1;S.me={pk:"y".repeat(24),d:{n:"X",ck:${JSON.stringify(ck)}}};save();`); await m.w.eval(`calScopePull()`); return J(m, `S.calTeam.map(e=>e.ti).sort()`); }
      finally { await m.close(); }
    };
    // a member in one section
    const ck1 = J(o, `calCkFor(S.roster.find(m=>m.id==="${p1}"))`);
    assert.deepEqual(await titles(ck1), ["HE-only maintenance", "Unit run"].sort(), "Everyone + own section only");
    assert.equal(ck1.s.length, 2, "they only hold those two keys");
    // the HQ section's scope, asked for directly with the HE member's key: nothing
    const hqScope = J(o, `S.calKeys.s["${k0}"].id`);
    assert.deepEqual(srv.rpc("cal_get", { p_feed: FEED.id, p_keys: [{ s: hqScope, k: ck1.s[1].rk }] }), [], "direct request with the wrong key gets nothing");
    // two sections
    o.w.eval(`S.roster.find(m=>m.id==="${p1}").xsec=["${k0}"];save();`);
    assert.deepEqual(await titles(J(o, `calCkFor(S.roster.find(m=>m.id==="${p1}"))`)), ["HE-only maintenance", "HQ-only brief", "Unit run"].sort());
    // full calendar access
    o.w.eval(`const m=S.roster.find(m=>m.id==="${p0}");m.calAll=1;save();`);
    assert.equal((await titles(J(o, `calCkFor(S.roster.find(m=>m.id==="${p0}"))`))).length, 3);
    // My page's own calendar list never carries another section's event
    o.w.eval(`const m=S.roster.find(m=>m.id==="${p0}");delete m.calAll;m.cal.push({id:"cx",d:dkey(),ti:"Stray HE event",ty:"Other",sc:"${k1}"});save();`);
    assert.ok(!J(o, `mpDigest(S.roster.find(m=>m.id==="${p0}")).cal.map(e=>e.ti)`).includes("Stray HE event"));
    // the owner sees everything; the person card sets access
    assert.equal(J(o, `calVisible().length`) >= 3, true);
    o.w.eval(`pid="${p0}";view="p";render();`); await sleep(20);
    assert.ok(o.$("#calAcc [data-calacc='all']") && o.$(`#calAcc [data-calxs="${k1}"]`), "Calendar access on the person card");
  } finally { await o.close(); }
});

test("calendar: a section leader holds Everyone + their section, sees only those, and a new event starts as their section; alerts only for Everyone", async () => {
  const srv = server();
  const o = await openApp({ rpc: srv.rpc });
  const l = await openApp({ rpc: srv.rpc });
  try {
    o.w.eval(OWNER); await o.w.eval(`calScopePublish(true)`);
    const k1 = o.w.eval("SECTIONS[1][0]");
    const ck = J(o, `calCk("${k1}")`);
    assert.equal(ck.s.length, 2); assert.equal(ck.w.n, k1, "and may write their own section");
    l.w.eval(`S.mode="military";S.onb=true;S.welcomed=1;S.leaderMode=true;S.source="link";S.roster=[{id:"x1",rank:"SGT",name:"LEE, MAX",sec:"${k1}",status:"On Hand"}];
      S.link={board:"b".repeat(14),wk:"w".repeat(32),ek:"",sec:"${k1}",unit:"ALPHA CO",mysec:"${k1}",me:"",sig:"",sent:0,err:"",rk2:"r".repeat(43),pulled:true,pt:Date.now(),ck:${JSON.stringify(ck)}};save();`);
    await l.w.eval(`calScopePull()`);
    assert.deepEqual(J(l, `S.calTeam.map(e=>e.ti).sort()`), ["HE-only maintenance", "Unit run"].sort());
    l.w.eval(`view="board";render();`); await sleep(30);
    const home = l.$("#ctHome"); assert.ok(home, "Home shows what's coming up");
    assert.ok(!/HQ-only/.test(home.textContent));
    assert.match(l.w.eval(`calForm()`), new RegExp(`value="SEC:${k1}" selected`), "a new event starts as their section");
    // the "calendar changed" team alert: a section's event doesn't trigger it, an Everyone event does
    const sent = [];
    o.w.SB.notify = (x, b) => { sent.push(b); return Promise.resolve(); };
    o.w.eval(`S.pushOn=true;document.body.click();S.roster[1].cal.push({id:"cz",d:dkey(),ti:"Another HE thing",sc:"${k1}"});save();`);
    await o.w.eval(`taFlush()`); await sleep(30);
    assert.ok(!sent.some((b) => (b.what || []).includes("cal")), "no team-wide alert for a section's event");
    o.w.eval(`document.body.click();S.calAll.push({g:"gall2",d:dkey(),ti:"All hands"});save();`);
    await o.w.eval(`taFlush()`); await sleep(30);
    assert.ok(sent.some((b) => (b.what || []).includes("cal")), "Everyone events still alert");
  } finally { await o.close(); await l.close(); }
});

const pg = await startPg();
const skip = pg ? false : "Postgres not installed";
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
let ready = false;
const anon = (sql) => pg.psql(`set role anon; ${sql}`);
function prep() {
  if (ready) return; ready = true; applySetup(pg);
  pg.psql(`insert into public.feeds(id, member_key_hash, leader_key_hash) values ('feedpm0001', ${q(sha("member-key-0123456789abcd"))}, ${q(sha("leader-key-0123456789abcdef"))}) on conflict do nothing`);
}
test("setup part 54: a third person can't read a 1:1 thread, list someone else's invites, or take over their key", { skip }, () => {
  prep();
  const mk = "member-key-0123456789abcd", lk = "leader-key-0123456789abcdef";
  const ana = sha("ana"), max = sha("max");
  anon(`select public.pm_key_put('feedpm0001', ${q(mk)}, ${q(ana)}, ${q("A".repeat(40))}, 'ana-token-0123456789abcdef')`);
  anon(`select public.pm_key_put('feedpm0001', ${q(mk)}, ${q(max)}, ${q("M".repeat(40))}, 'max-token-0123456789abcdef')`);
  assert.throws(() => anon(`select public.pm_key_put('feedpm0001', ${q(lk)}, ${q(ana)}, ${q("O".repeat(40))}, 'owner-token-0123456789abcd')`), /taken/, "the owner can't replace Ana's key");
  assert.throws(() => anon(`select public.pm_key_put('feedpm0001', 'not-on-the-team-0123456789', ${q(sha("x"))}, ${q("X".repeat(40))}, 'tok-0123456789abcdefghij')`), /not allowed/);
  anon(`select public.pm_inv_send('feedpm0001', ${q(mk)}, ${q(max)}, 'sealed-for-max')`);
  assert.equal(anon(`select ct from public.pm_inv_get('feedpm0001', ${q(max)}, 'max-token-0123456789abcdef', 0)`), "sealed-for-max");
  assert.throws(() => anon(`select count(*) from public.pm_inv_get('feedpm0001', ${q(max)}, 'ana-token-0123456789abcdef', 0)`), /not allowed/, "Ana can't list Max's invites");
  assert.throws(() => anon(`select count(*) from public.pm_inv_get('feedpm0001', ${q(max)}, ${q(lk)}, 0)`), /not allowed/, "nor can the owner");
  // the thread itself (part 17 functions, a thread key and an inbox key only the two phones have)
  anon(`select public.dm_open('thread0000000000ab', 'thread-key-0123456789abcdef', 'thread-inbox-0123456789abcd')`);
  anon(`select public.dm_send('thread0000000000ab', 'thread-key-0123456789abcdef', 'ciphertext-1')`);
  assert.equal(anon(`select ct from public.dm_get('thread0000000000ab', 'thread-key-0123456789abcdef', 0)`), "ciphertext-1");
  assert.equal(anon(`select count(*) from public.dm_get('thread0000000000ab', ${q(mk)}, 0)`), "0", "the team's key reads nothing");
  assert.equal(anon(`select count(*) from public.dm_get('thread0000000000ab', ${q(lk)}, 0)`), "0", "the owner's key reads nothing");
  assert.equal(anon(`select count(*) from public.dm_inbox(${q(lk)}, 0)`), "0", "the owner's inbox doesn't cover it");
  assert.throws(() => anon(`select public.dm_send('thread0000000000ab', ${q(lk)}, 'injected')`), /not allowed/, "and can't write into it");
  for (const t of ["pm_keys", "pm_invites", "dm_msgs", "dm_threads"]) assert.throws(() => anon(`select count(*) from public.${t}`), /permission denied/, t);
  // team chat retired, Official untouched
  assert.throws(() => anon(`select public.chat_send('feedpm0001', ${q(mk)}, 'x')`), /team chat is retired/);
  assert.equal(anon(`select count(*) >= 0 from public.official_get(0)`), "t", "Official channel still answers");
});

test("setup part 55: a one-section member can't read another section's event, even by asking for that scope directly", { skip }, () => {
  prep();
  const lk = "leader-key-0123456789abcdef";
  const sc = { all: "scopeall00000000aa", hq: "scopehq000000000aa", he: "scopehe000000000aa" };
  const rk = { all: "read-all-0123456789abcdef", hq: "read-hq-0123456789abcdefg", he: "read-he-0123456789abcdefg" };
  const wk = { all: "write-all-0123456789abcde", hq: "write-hq-0123456789abcdef", he: "write-he-0123456789abcdef" };
  for (const n of ["all", "hq", "he"]) anon(`select public.cal_scope_put('feedpm0001', ${q(lk)}, ${q(sc[n])}, ${q(sha(rk[n]))}, ${q(sha(wk[n]))})`);
  assert.throws(() => anon(`select public.cal_scope_put('feedpm0001', 'member-key-0123456789abcd', ${q("scopezz000000000aa")}, ${q(sha("a"))}, ${q(sha("b"))})`), /not allowed/, "only the owner makes scopes");
  for (const n of ["all", "hq", "he"]) anon(`select public.cal_put('feedpm0001', ${q(sc[n])}, ${q(wk[n])}, ${q(JSON.stringify([{ e: "ev" + n, ct: "sealed-" + n }]))}::jsonb)`);
  assert.throws(() => anon(`select public.cal_put('feedpm0001', ${q(sc.hq)}, ${q(wk.he)}, '[]'::jsonb)`), /not allowed/, "the HE leader can't write HQ");
  const get = (keys) => anon(`select coalesce(string_agg(ct, ',' order by ct), '') from public.cal_get('feedpm0001', ${q(JSON.stringify(keys))}::jsonb)`);
  assert.equal(get([{ s: sc.all, k: rk.all }, { s: sc.he, k: rk.he }]), "sealed-all,sealed-he", "HE member: Everyone + HE");
  assert.equal(get([{ s: sc.hq, k: rk.he }]), "", "asking for HQ with the HE key: nothing");
  assert.equal(get([{ s: sc.hq, k: "" }, { s: sc.hq, k: rk.all }]), "", "or with no key, or the Everyone key");
  assert.equal(get([{ s: sc.all, k: rk.all }, { s: sc.hq, k: rk.hq }, { s: sc.he, k: rk.he }]), "sealed-all,sealed-he,sealed-hq", "full access: all");
  for (const t of ["cal_scopes", "cal_events"]) assert.throws(() => anon(`select count(*) from public.${t}`), /permission denied/, t);
  // changing a scope's read key cuts off the old one
  anon(`select public.cal_scope_put('feedpm0001', ${q(lk)}, ${q(sc.he)}, ${q(sha("new-read-he-0123456789abc"))}, ${q(sha(wk.he))})`);
  assert.equal(get([{ s: sc.he, k: rk.he }]), "", "old read key no longer works");
});
test.after(() => { try { pg && pg.stop(); } catch {} });
