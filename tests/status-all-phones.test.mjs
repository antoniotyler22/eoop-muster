// One status change should reach every phone on the roster: OIC, section leader links, access-link phones (can edit / view only).
// Several apps share one fake server, and each step runs the same sync calls the app's timers run.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

function server() {
  const D = { updates: [], uid: 0, roster: {}, cal: {}, backups: {}, status: {}, seq: 0 };
  const rpc = (fn, b) => {
    switch (fn) {
      case "create_board": return null;
      case "push_update": D.updates.push({ id: ++D.uid, sec: b.p_sec, sender: b.p_sender, strength: b.p_strength, items: b.p_items, created_at: new Date().toISOString() }); return null;
      case "get_board_updates": return D.updates.filter((u) => u.id > (b.p_after || 0));
      case "put_roster": D.roster[b.p_sec] = { ct: b.p_ct, updated_at: new Date().toISOString() }; return null;
      case "get_roster": return D.roster[b.p_sec] ? [D.roster[b.p_sec]] : [];
      case "push_cal": D.cal[b.p_sec] = { sec: b.p_sec, ct: b.p_ct, updated_at: new Date().toISOString() }; return null;
      case "get_cal": return Object.values(D.cal);
      case "backup_ver": return D.backups[b.p_id] ? D.backups[b.p_id].ver : null;
      case "backup_get": return D.backups[b.p_id] ? [D.backups[b.p_id]] : [];
      case "backup_put": {
        const c = D.backups[b.p_id];
        if (!c) { D.backups[b.p_id] = { ct: b.p_ct, ver: 1, updated_at: new Date().toISOString() }; return 1; }
        if (b.p_base !== c.ver) throw new Error("conflict");
        c.ct = b.p_ct; c.ver++; c.updated_at = new Date().toISOString(); return c.ver;
      }
      case "put_status": for (const x of b.p_items) { const c = D.status[x.p]; if (!c || x.t >= c.t) D.status[x.p] = { pid: x.p, sec: x.s, ct: x.c, t: x.t, seq: ++D.seq }; } return b.p_items.length;
      case "get_status": return Object.values(D.status).filter((r) => r.seq > (b.p_after || 0)).sort((a, b) => a.seq - b.seq);
      default: return [];
    }
  };
  return { D, rpc };
}

const CODE = "ABCD-EFGH-JKMN-PQRS-TUVW-XYZ2";
const PEOPLE = `[{id:"u1",rank:"LCPL",name:"MUNIZ, LUIS",sec:"UT",status:"On Hand"},{id:"u2",rank:"CPL",name:"RIVERA, ANA",sec:"UT",status:"On Hand"},{id:"h1",rank:"SGT",name:"HALL, TOM",sec:"HQ",status:"On Hand"}]`;

async function setup() {
  const srv = server();
  const open = () => openApp({ rpc: srv.rpc });
  const oic = await open();
  await oic.w.eval(`(async()=>{window.__ek=b64url(crypto.getRandomValues(new Uint8Array(32)));window.__sk=b64url(crypto.getRandomValues(new Uint8Array(32)));window.__hk=b64url(crypto.getRandomValues(new Uint8Array(32)));
    S.mode="military";S.source="mol";S.welcomed=1;S.onb=true;S.role="oic";S.roster=${PEOPLE};S.tl={};S.cks=[];S.feeds=[{id:"f",mk:"m",lk:"l",pk:"p",ek:"e",posts:[]}];
    S.board={id:"board1234567",rk:"r".repeat(30),wk:"w".repeat(30),ek:window.__ek,sk:{UT:window.__sk,HQ:window.__hk},rsig:{},rat:{},after:0,last:{}};
    S.sync={on:true,code:"${CODE}",ver:0,at:0,err:"",last:""};save()})()`);
  await oic.w.eval("syncPush(true)"); await sleep(150);
  const leader = async (sec, key) => {
    const p = await open();
    await p.w.eval(`S.mode="military";S.source="link";S.welcomed=1;S.onb=true;S.leaderMode=true;S.roster=[];S.tl={};S.cks=[];
      S.link={board:"board1234567",wk:"w".repeat(30),ek:window.__ek||"${""}",sec:"${sec}",unit:"TEST",mysec:"${sec}",me:"",sig:"",sent:0,err:"",rk2:"${key}",pulled:false,pt:0};save()`);
    return p;
  };
  const skUT = await oic.w.eval("window.__sk"), skHQ = await oic.w.eval("window.__hk"), ek = await oic.w.eval("window.__ek");
  const lead = async (sec, key) => { const p = await leader(sec, key); await p.w.eval(`S.link.ek="${ek}";rawSave()`); return p; };
  const access = async (role) => {
    const p = await open();
    await p.w.eval(`S.mode="military";S.source="mol";S.welcomed=1;S.onb=true;S.role="${role}";S.roster=[];S.tl={};S.cks=[];S.sync={on:true,code:"${CODE}",ver:0,at:0,err:"",last:""};save()`);
    await p.w.eval("syncPull(true)"); await sleep(150);
    return p;
  };
  return { srv, oic, lead, access, skUT, skHQ };
}
const st = (p, id) => p.w.eval(`(S.roster.find(m=>m.id==="${id}")||{}).status`);
const pull = async (p) => { await p.w.eval("rosterPull(true)"); await sleep(150); };
const oicSees = async (oic) => { await oic.w.eval("livePollBoard()"); await sleep(250); await oic.w.eval("rpPublish(true)"); await sleep(150); await oic.w.eval("syncPush(true)"); await sleep(150); };

test("a section leader's change reaches the OIC, other leader phones and access-link phones", async () => {
  const { oic, lead, access, skUT } = await setup();
  const a = await lead("UT", skUT), a2 = await lead("UT", skUT), edit = await access("sncoic"), view = await access("view");
  try {
    await oic.w.eval("rpPublish(true)"); await sleep(150);
    await pull(a); await pull(a2);
    assert.equal(await st(a, "u1"), "On Hand", "leader loaded the roster");
    await a.w.eval(`S.roster.find(m=>m.id==="u1").status="TAD";save()`);
    await a.w.eval("linkPush(true)"); await sleep(250);
    await oicSees(oic);
    assert.equal(await st(oic, "u1"), "TAD", "OIC sees the leader's change");
    await pull(a2);
    assert.equal(await st(a2, "u1"), "TAD", "a second phone on the same section link sees it");
    await edit.w.eval("syncPull(true)"); await view.w.eval("syncPull(true)"); await sleep(150);
    assert.equal(await st(edit, "u1"), "TAD", "can-edit access phone sees it");
    assert.equal(await st(view, "u1"), "TAD", "view-only access phone sees it");
    for (const p of [oic, a, a2, edit, view]) assert.deepEqual(p.errors, []);
  } finally { for (const p of [oic, a, a2, edit, view]) await p.close(); }
});

test("the OIC's change reaches leaders and access-link phones", async () => {
  const { oic, lead, access, skUT } = await setup();
  const a = await lead("UT", skUT), edit = await access("sncoic"), view = await access("view");
  try {
    await oic.w.eval("rpPublish(true)"); await sleep(150); await pull(a);
    await oic.w.eval(`S.roster.find(m=>m.id==="u2").status="Leave";save()`);
    await oic.w.eval("rpPublish(true)"); await oic.w.eval("syncPush(true)"); await sleep(200);
    await pull(a); await edit.w.eval("syncPull(true)"); await view.w.eval("syncPull(true)"); await sleep(150);
    assert.equal(await st(a, "u2"), "Leave", "leader sees the OIC's change");
    assert.equal(await st(edit, "u2"), "Leave");
    assert.equal(await st(view, "u2"), "Leave");
  } finally { for (const p of [oic, a, edit, view]) await p.close(); }
});

test("a can-edit access phone's change reaches the OIC, leaders and view-only phones", async () => {
  const { oic, lead, access, skUT } = await setup();
  const a = await lead("UT", skUT), edit = await access("sncoic"), view = await access("view");
  try {
    await oic.w.eval("rpPublish(true)"); await sleep(150); await pull(a);
    await edit.w.eval(`S.roster.find(m=>m.id==="u1").status="SIQ";save()`);
    await edit.w.eval("syncPush(true)"); await sleep(200);
    await oic.w.eval("syncPull(true)"); await sleep(150);
    assert.equal(await st(oic, "u1"), "SIQ", "OIC gets the editor's change");
    await oic.w.eval("rpPublish(true)"); await sleep(150); await pull(a);
    await view.w.eval("syncPull(true)"); await sleep(150);
    assert.equal(await st(a, "u1"), "SIQ", "leader link sees it after the OIC republishes");
    assert.equal(await st(view, "u1"), "SIQ");
  } finally { for (const p of [oic, a, edit, view]) await p.close(); }
});

test("Off Hand refresh: a leader taps On Hand on an expired person and every phone counts them again", async () => {
  const { oic, lead, access, skUT } = await setup();
  const a = await lead("UT", skUT), edit = await access("sncoic");
  const old = `Date.now()-30*36e5`;
  try {
    // everyone's last update is 30 hours old, on the OIC's phone
    await oic.w.eval(`S.roster.forEach(m=>{m.upd={t:${old},sec:m.sec}});save()`);
    await oic.w.eval("rpPublish(true)"); await oic.w.eval("syncPush(true)"); await sleep(200);
    await pull(a); await edit.w.eval("syncPull(true)"); await sleep(150);
    for (const p of [oic, a, edit]) assert.equal(await p.w.eval(`ckStale(S.roster.find(m=>m.id==="u1"))`), true, "expired everywhere first");
    // the leader taps On Hand (same status): stamps an update
    await a.w.eval(`S.roster.find(m=>m.id==="u1").upd={t:Date.now(),sec:"UT"};save()`);
    await a.w.eval("linkPush(true)"); await sleep(250);
    await oicSees(oic);
    await pull(a); await edit.w.eval("syncPull(true)"); await sleep(150);
    for (const [n, p] of [["OIC", oic], ["leader", a], ["access", edit]]) assert.equal(await p.w.eval(`ckStale(S.roster.find(m=>m.id==="u1"))`), false, n + " counts them again");
    assert.equal(await oic.w.eval(`ckStale(S.roster.find(m=>m.id==="u2"))`), true, "others stay expired");
  } finally { for (const p of [oic, a, edit]) await p.close(); }
});

test("two people change different Marines at the same time: both changes survive", async () => {
  const { oic, lead, access, skUT } = await setup();
  const a = await lead("UT", skUT), edit = await access("sncoic");
  try {
    await oic.w.eval("rpPublish(true)"); await sleep(150); await pull(a);
    await edit.w.eval(`S.roster.find(m=>m.id==="u1").status="SIQ";save()`);
    await oic.w.eval(`S.roster.find(m=>m.id==="h1").status="Leave";save()`);
    await edit.w.eval("syncPush(true)"); await sleep(200);
    await oic.w.eval("syncPush(true)"); await sleep(250);
    await edit.w.eval("syncPull(true)"); await sleep(150);
    assert.equal(await st(oic, "u1"), "SIQ", "OIC kept the editor's change");
    assert.equal(await st(oic, "h1"), "Leave");
    assert.equal(await st(edit, "u1"), "SIQ");
    assert.equal(await st(edit, "h1"), "Leave", "editor got the OIC's change");
  } finally { for (const p of [oic, a, edit]) await p.close(); }
});

// 4.124: live status through the server, with the OIC's phone never polling or publishing
test("live status: a change reaches every phone through the server alone, OIC phone idle", async () => {
  const { srv, oic, lead, access, skUT, skHQ } = await setup();
  const ut = await lead("UT", skUT), ut2 = await lead("UT", skUT), hq = await lead("HQ", skHQ), edit = await access("sncoic"), view = await access("view");
  const tick = async (...ps) => { for (const p of ps) { await p.w.eval("stTick()"); await sleep(120); } };
  try {
    await oic.w.eval("rpPublish(true)"); await sleep(150); await pull(ut); await pull(ut2); await pull(hq);
    await tick(oic, ut, ut2, hq, edit, view); // everyone seeds and settles
    await ut.w.eval(`S.roster.find(m=>m.id==="u1").status="TAD";save()`);
    await tick(ut); // the leader's change goes to the server
    await tick(hq, edit, view); // the OIC phone does nothing at all
    assert.equal(await st(hq, "u1"), undefined, "an HQ leader's phone never gets UT's people (leaders only hold their own section)");
    assert.equal(await st(edit, "u1"), "TAD");
    assert.equal(await st(view, "u1"), "TAD", "view-only phone sees it");
    await tick(ut2);
    assert.equal(await st(ut2, "u1"), "TAD", "a second phone on the UT link sees it");
    await tick(oic);
    assert.equal(await st(oic, "u1"), "TAD", "the OIC's phone gets it when it opens");
    // an access phone changes someone: leaders see it with the OIC still idle
    await edit.w.eval(`S.roster.find(m=>m.id==="h1").status="Leave";save()`);
    await tick(edit, hq);
    assert.equal(await st(hq, "h1"), "Leave", "the HQ leader sees their own section's change");
    // an older write never beats a newer one
    const before = JSON.stringify(Object.values(srv.D.status).map((r) => r.t).sort());
    await ut.w.eval(`S.roster.find(m=>m.id==="u1").status="On Hand";save()`);
    await tick(ut, ut2);
    assert.equal(await st(ut2, "u1"), "On Hand", "changing back works too");
    assert.notEqual(JSON.stringify(Object.values(srv.D.status).map((r) => r.t).sort()), before);
    for (const p of [oic, ut, ut2, hq, edit, view]) assert.deepEqual(p.errors, []);
  } finally { for (const p of [oic, ut, ut2, hq, edit, view]) await p.close(); }
});

test("live status: server without part 51 stays quiet and the old relay keeps working", async () => {
  const srv = server();
  const rpc = (fn, b) => { if (fn === "put_status" || fn === "get_status") throw new Error("Could not find the function public." + fn + " in the schema cache"); return srv.rpc(fn, b); };
  const a = await openApp({ rpc });
  try {
    await a.w.eval(`S.mode="military";S.source="mol";S.welcomed=1;S.onb=true;S.role="oic";S.roster=${PEOPLE};S.board={id:"board1234567",rk:"r".repeat(30),wk:"w".repeat(30),ek:b64url(crypto.getRandomValues(new Uint8Array(32))),sk:{},rsig:{},rat:{},after:0,last:{}};save()`);
    await a.w.eval("stTick()"); await sleep(150);
    await a.w.eval(`S.roster[0].status="Leave";save()`); await a.w.eval("stTick()"); await sleep(150);
    assert.equal(await st(a, "u1"), "Leave", "local change untouched");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
