// A status that is 24 hours old stops counting; a new check-in starts a fresh 24 hours.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const setup = `S.source="mol";S.welcomed=1;S.onb=true;S.role="co";S.sync={on:true,code:"X"};S.feeds=[{id:"f",mk:"m",lk:"l",ek:"e",posts:[]}];
  const R=S.roster.filter(m=>m.sec!=="ATT");R.forEach(m=>{m.status="On Hand";delete m.start;delete m.end;m.ckAt=Date.now()-36e5;m.upd=null});
  S.tl={};S.cks=[];`;

test("a status older than 24 hrs drops out of the numbers; check-in brings it back", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`${setup}
      R[0].ckAt=Date.now()-25*36e5;S.tl[R[0].id]=[[Date.now()-26*36e5,"On Hand","Full Duty"]];
      R[1].status="Leave";R[1].start=dkey(new Date(Date.now()-5*864e5));R[1].end=dkey(new Date(Date.now()+5*864e5));R[1].ckAt=Date.now()-72*36e5;S.tl[R[1].id]=[[Date.now()-90*36e5,"Leave","Full Duty"]];
      save();view="board";render()`);
    const before = a.w.eval(`(()=>{const T=counts().T;return [T["On Hand"],T.total,T.stale,ckStaleList().length]})()`);
    const n = a.w.eval(`S.roster.filter(m=>m.sec!=="ATT").length`);
    assert.equal(before[2], 1, "one expired");
    assert.equal(before[0], n - 2, "On Hand excludes the expired one and the one on leave");
    assert.equal(a.w.eval(`ckStale(S.roster.find(m=>m.status==="Leave"))`), false, "leave with dates covering today is not expired");
    a.w.eval(`view=ckStaleList()[0].sec;render()`); await sleep(40);
    assert.ok(a.$(".st24t"), "row tagged Off Hand");
    assert.match(a.$(".st24t").textContent, /Off Hand/);
    // checking in starts a fresh 24 hours
    a.w.eval(`const m=ckStaleList()[0];m.ckAt=Date.now();save();render()`);
    assert.equal(a.w.eval(`counts().T.stale`), 0);
    assert.equal(a.w.eval(`counts().T["On Hand"]`), n - 1);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("a waiting check-in, ATT, sample data and the off switch are not expired", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`${setup}
      R[0].ckAt=Date.now()-30*36e5;S.tl[R[0].id]=[[Date.now()-30*36e5,"On Hand","Full Duty"]];
      R[1].ckAt=Date.now()-30*36e5;S.tl[R[1].id]=[[Date.now()-30*36e5,"On Hand","Full Duty"]];
      S.cks=[{cid:"c1",mid:R[1].id,t:Date.now()-36e5,state:"new",st:"On Hand"}];save();render()`);
    assert.equal(a.w.eval(`ckStaleList().length`), 1, "waiting check-in counts as fresh");
    a.w.eval(`S.exp24=false;save();render()`);
    assert.equal(a.w.eval(`ckStaleList().length`), 0, "off switch");
    assert.equal(a.w.eval(`counts().T.stale||0`), 0);
    a.w.eval(`S.exp24=true;S.source="sample";render()`);
    assert.equal(a.w.eval(`ckStaleList().length`), 0, "sample data untouched");
  } finally { await a.close(); }
});

test("Check-ins lists who missed the last 24 hrs and has the switch", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`${setup}
      R[0].ckAt=Date.now()-30*36e5;S.tl[R[0].id]=[[Date.now()-30*36e5,"On Hand","Full Duty"]];save();view="checkins";render()`);
    assert.match(a.$("#ckMiss").textContent, /Last 24 hrs/);
    assert.ok(a.$("#exp24"), "switch under the panel");
    a.$("#exp24t").click(); await sleep(40);
    assert.equal(a.w.eval("S.exp24"), false);
    assert.match(a.$("#exp24").textContent, /off/i);
  } finally { await a.close(); }
});

test("Home donut counts Off Hand with every other not-on-hand status", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`${setup}
      R[0].ckAt=Date.now()-30*36e5;S.tl[R[0].id]=[[Date.now()-30*36e5,"On Hand","Full Duty"]];
      R[1].status="TAD";R[1].start=dkey(new Date(Date.now()-864e5));R[1].end=dkey(new Date(Date.now()+864e5));
      save();view="board";render()`);
    const lab = a.$(".hdn").getAttribute("aria-label");
    assert.match(lab, /Off Hand 1/); assert.match(lab, /TAD 1/); assert.match(lab, /Not on hand 2/);
    assert.match(a.$(".hdl").textContent, /Off Hand/);
  } finally { await a.close(); }
});
