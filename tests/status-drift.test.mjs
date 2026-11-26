// An automatic change on a stale phone (the app tidying a note, clearing a finished status) must never go to the server
// stamped "now" and cover a newer status another phone already sent. Only a real update (check-in, hand-picked status,
// leader confirm) may win. Healing: the stale phone then takes the server's newer status.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

function server() {
  const D = { status: {}, seq: 0 };
  const rpc = (fn, b) => {
    switch (fn) {
      case "put_status": for (const x of b.p_items) { const c = D.status[x.p]; if (!c || x.t >= c.t) D.status[x.p] = { pid: x.p, sec: x.s, ct: x.c, t: x.t, seq: ++D.seq }; } return b.p_items.length;
      case "get_status": return Object.values(D.status).filter((r) => r.seq > (b.p_after || 0)).sort((a, b) => a.seq - b.seq);
      default: return [];
    }
  };
  return { D, rpc };
}
const EK = "A".repeat(43);
const PEOPLE = `[{id:"lee",rank:"SGT",name:"LEE, JAMIE",sec:"UT",status:"On Hand",ckAt:${Date.now() - 3600000}}]`;
async function phone(srv) {
  const p = await openApp({ rpc: srv.rpc });
  await p.w.eval(`S.mode="military";S.source="mol";S.welcomed=1;S.onb=true;S.role="oic";S.tl={};S.cks=[];S.exp24=false;S.roster=${PEOPLE};
    S.board={id:"board1234567",rk:"r".repeat(30),wk:"w".repeat(30),ek:"${EK}",sk:{},rsig:{},rat:{},after:0,last:{}};save()`);
  return p;
}
const status = (p) => p.w.eval(`S.roster.find(m=>m.id==="lee").status`);

test("an automatic change on a stale phone does not cover a newer status on the server", async () => {
  const srv = server();
  const a = await phone(srv), b = await phone(srv);
  try {
    await b.w.eval("stPush()"); await sleep(200);                       // B has sent its first copy: Lee On Hand
    await a.w.eval("stPull()"); await sleep(200);
    await a.w.eval(`openSheet("s","lee")`);
    await a.w.eval(`document.querySelector('#sheetOpts [data-sopt="Leave"]').click()`); await sleep(100);
    await a.w.eval("stPush()"); await sleep(300);                       // server now says Leave
    // B never pulled. The app tidies something on B (not a person's update) and saves.
    await b.w.eval(`S.roster.find(m=>m.id==="lee").loc="Hangar";save()`); await sleep(1000);
    await b.w.eval("stPush()"); await sleep(300);
    await a.w.eval("stPull()"); await sleep(300);
    assert.equal(await status(a), "Leave", "server still says Leave");
    await b.w.eval("stPull()"); await sleep(300);
    assert.equal(await status(b), "Leave", "the stale phone takes the newer status");
  } finally { await a.close(); await b.close(); }
});

test("a real hand-picked change on the stale phone still goes out", async () => {
  const srv = server();
  const a = await phone(srv);
  try {
    await a.w.eval("stPush()"); await sleep(200);
    await a.w.eval(`openSheet("s","lee")`);
    await a.w.eval(`document.querySelector('#sheetOpts [data-sopt="TAD"]').click()`); await sleep(100);
    await a.w.eval("stPush()"); await sleep(300);
    const b = await phone(srv);
    try { await b.w.eval("stPull()"); await sleep(300); assert.equal(await status(b), "TAD"); } finally { await b.close(); }
  } finally { await a.close(); }
});
