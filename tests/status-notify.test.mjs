// A status notification names who made the change and opens the person. Before 4.124.1 the roster picker did not stamp the change time, so an older
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

test("a status notification says who changed it, and tapping it opens that person", async () => {
  const srv = server(), now = Date.now();
  const a = await phone(srv, now - 3 * 3600000), b = await phone(srv, now - 3 * 3600000);
  try {
    await a.w.eval(`S.myName="GySgt Hale"`);
    await pick(a, "lee", "Leave");
    await a.w.eval("stPush()"); await sleep(300);
    await b.w.eval("stPull()"); await sleep(400);
    const act = await b.w.eval(`(S.act||[]).find(x=>x.mid==="lee")`);
    assert.ok(act, "a notification for Lee exists");
    assert.match(act.txt, /Leave/); assert.match(act.txt, /set by GySgt Hale/);
    await b.w.eval(`view="act";renderAct()`);
    assert.equal(await b.w.eval(`!!document.querySelector('[data-amid="lee"]')`), true, "the row is tappable");
    await b.w.eval(`document.querySelector('[data-amid="lee"]').click()`); await sleep(200);
    assert.equal(await b.w.eval(`typeof pid!=="undefined"&&pid`), "lee", "tapping it opens Lee's card");
  } finally { await a.close(); await b.close(); }
});
