// A status picked by hand must stay put. Before 4.124.1 the roster picker did not stamp the change time, so an older
// "On Hand" that another phone had already sent to the server looked newer and put the person back On Hand.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

function server() {
  const D = { status: {}, seq: 0, updates: [], uid: 0 };
  const rpc = (fn, b) => {
    switch (fn) {
      case "put_status": for (const x of b.p_items) { const c = D.status[x.p]; if (!c || x.t >= c.t) D.status[x.p] = { pid: x.p, sec: x.s, ct: x.c, t: x.t, seq: ++D.seq }; } return b.p_items.length;
      case "get_status": return Object.values(D.status).filter((r) => r.seq > (b.p_after || 0)).sort((a, b) => a.seq - b.seq);
      case "push_update": D.updates.push({ id: ++D.uid, sec: b.p_sec, sender: b.p_sender, strength: b.p_strength, items: b.p_items, created_at: new Date().toISOString() }); return null;
      case "get_board_updates": return D.updates.filter((u) => u.id > (b.p_after || 0));
      default: return [];
    }
  };
  return { D, rpc };
}

const PEOPLE = (ck) => `[{id:"lee",rank:"SGT",name:"LEE, JAMIE",sec:"UT",status:"On Hand",ckAt:${ck}},{id:"r1",rank:"CPL",name:"RIVERA, ANA",sec:"UT",status:"On Hand"}]`;
const EK = "A".repeat(43);

async function phone(srv, ck) {
  const p = await openApp({ rpc: srv.rpc });
  await p.w.eval(`S.mode="military";S.source="mol";S.welcomed=1;S.onb=true;S.role="oic";S.tl={};S.cks=[];S.exp24=false;S.roster=${PEOPLE(ck)};
    S.board={id:"board1234567",rk:"r".repeat(30),wk:"w".repeat(30),ek:"${EK}",sk:{},rsig:{},rat:{},after:0,last:{}};save()`);
  return p;
}
const pick = async (p, id, st) => { await p.w.eval(`openSheet("s","${id}")`); await p.w.eval(`document.querySelector('#sheetOpts [data-sopt="${st}"]').click()`); await sleep(100); };
const status = (p, id) => p.w.eval(`S.roster.find(m=>m.id==="${id}").status`);

test("a status picked by hand is not put back On Hand by an older update from another phone", async () => {
  const srv = server(), now = Date.now();
  const b = await phone(srv, now - 60000), a = await phone(srv, now - 3 * 3600000);
  try {
    // phone B knows Lee as On Hand, checked in a minute ago, and has sent that to the server
    await b.w.eval("stPush()"); await sleep(200);
    // the OIC (phone A) picks Leave for Lee from the roster
    await pick(a, "lee", "Leave");
    assert.equal(await status(a, "lee"), "Leave", "picked Leave");
    assert.ok(+(await a.w.eval(`S.roster.find(m=>m.id==="lee").ut`)) >= now, "the pick is stamped with the time it was made");
    await a.w.eval("stTick()"); await sleep(300);
    assert.equal(await status(a, "lee"), "Leave", "still Leave after the sync");
    await a.w.eval("stTick()"); await sleep(300);
    assert.equal(await status(a, "lee"), "Leave", "still Leave on the next sync");
    await a.w.eval("stPush()"); await sleep(400);
    await b.w.eval("stPull()"); await sleep(400);
    assert.equal(await status(b, "lee"), "Leave", "phone B sees Leave");
  } finally { await a.close(); await b.close(); }
});

test("a section leader's older update does not put someone back On Hand", async () => {
  const srv = server();
  const a = await phone(srv, Date.now() - 3600000);
  try {
    await pick(a, "lee", "TAD");
    const t = +(await a.w.eval(`S.roster.find(m=>m.id==="lee").ut`));
    assert.ok(t > 0);
    // the leader's update was sent before the pick and does not list Lee (the old rule reads him as On Hand)
    srv.D.updates.push({ id: 1, sec: "UT", sender: [], strength: 2, items: [], created_at: new Date(t - 5000).toISOString() });
    await a.w.eval("livePollBoard()"); await sleep(300);
    assert.equal(await status(a, "lee"), "TAD", "stays TAD");
  } finally { await a.close(); }
});

test("a phone that just opened with an old copy of the roster does not push everyone back to On Hand", async () => {
  const srv = server(), now = Date.now();
  const a = await phone(srv, now - 3 * 3600000);
  let b;
  try {
    await pick(a, "lee", "Leave");
    await a.w.eval("stPush()"); await sleep(300);
    // phone B opens later with an old roster (Lee On Hand, never touched here) and syncs; the history log stamps "first seen" as now
    b = await phone(srv, 0);
    await b.w.eval("stTick()"); await sleep(400);
    assert.equal(await status(b, "lee"), "Leave", "phone B takes the server's Leave");
    await a.w.eval("stTick()"); await sleep(400);
    assert.equal(await status(a, "lee"), "Leave", "the OIC's Leave is not overwritten");
  } finally { await a.close(); if (b) await b.close(); }
});

test("4.136.1: a leader's update sent AFTER a hand-picked status, that does not list the person, leaves the status alone", async () => {
  const srv = server();
  const a = await phone(srv, Date.now() - 3600000);
  try {
    await pick(a, "lee", "TAD");
    const t = +(await a.w.eval(`S.roster.find(m=>m.id==="lee").ut`));
    // the leader's phone was out of date and sent its section a moment AFTER the pick: Lee is not on the list
    srv.D.updates.push({ id: 1, sec: "UT", sender: [], strength: 2, items: [], created_at: new Date(t + 5000).toISOString() });
    await a.w.eval("livePollBoard()"); await sleep(300);
    assert.equal(await status(a, "lee"), "TAD", "a missing name is not read as On Hand");
    // and a second, later update still does not reset him
    srv.D.updates.push({ id: 2, sec: "UT", sender: [], strength: 2, items: [], created_at: new Date(t + 9000).toISOString() });
    await a.w.eval("livePollBoard()"); await sleep(300);
    assert.equal(await status(a, "lee"), "TAD", "still TAD after another leader update");
  } finally { await a.close(); }
});
