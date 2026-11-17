// A status that is 24 hours old stops counting; a new check-in starts a fresh 24 hours.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const setup = `S.source="mol";S.welcomed=1;S.onb=true;S.role="co";S.sync={on:true,code:"X"};S.feeds=[{id:"f",mk:"m",lk:"l",ek:"e",posts:[]}];
  const R=S.roster.filter(m=>m.sec!=="ATT");R.forEach(m=>{m.status="On Hand";delete m.start;delete m.end;m.ckAt=Date.now()-36e5;m.upd=null});
  S.tl={};S.cks=[];window.mpNoLand=1;`;

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
    assert.match(a.$(".st24 .pill").textContent, /Off Hand/, "status button reads Off Hand");
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

test("an undated Appointment expires to Off Hand; a dated one holds; a leftover TAD note is dropped", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`${setup}
      R[0].status="Appointment";R[0].ckAt=Date.now()-30*36e5;S.tl[R[0].id]=[[Date.now()-30*36e5,"Appointment","Full Duty"]];
      R[1].status="Appointment";R[1].start=dkey();R[1].end=dkey(new Date(Date.now()+864e5));R[1].ckAt=Date.now()-30*36e5;S.tl[R[1].id]=[[Date.now()-30*36e5,"Appointment","Full Duty"]];
      R[2].status="Appointment";R[2].detail="TAD(30 days)";R[3].status="TAD";R[3].detail="TAD(30 days)";
      save();view="board";render()`);
    assert.equal(a.w.eval(`ckStale(S.roster.filter(m=>m.sec!=="ATT")[0])`), true, "undated appointment expires");
    assert.equal(a.w.eval(`ckStale(S.roster.filter(m=>m.sec!=="ATT")[1])`), false, "dated appointment holds");
    assert.equal(a.w.eval(`S.roster.filter(m=>m.sec!=="ATT")[2].detail||""`), "", "old TAD note removed after status changed");
    assert.equal(a.w.eval(`S.roster.filter(m=>m.sec!=="ATT")[3].detail`), "TAD(30 days)", "TAD status keeps its note");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("tapping On Hand on someone who expired to Off Hand counts them again", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`${setup}
      R[0].ckAt=Date.now()-25*36e5;S.tl[R[0].id]=[[Date.now()-26*36e5,"On Hand","Full Duty"]];save();view=R[0].sec;render()`);
    await sleep(60);
    assert.equal(a.w.eval(`ckStale(S.roster.filter(m=>m.sec!=="ATT")[0])`), true, "starts expired");
    a.$(".st24 .pill").click(); await sleep(120);
    a.$('[data-sopt="On Hand"]').click(); await sleep(200);
    assert.equal(a.w.eval(`ckStale(S.roster.filter(m=>m.sec!=="ATT")[0])`), false, "counted again");
    assert.equal(a.w.eval(`counts().T.stale`), 0);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("4.123.1: tapping the same status stamps an update, not a check-in", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`${setup}
      R[0].ckAt=Date.now()-25*36e5;S.tl[R[0].id]=[[Date.now()-26*36e5,"On Hand","Full Duty"]];save();view=R[0].sec;render()`);
    await sleep(60);
    const ck0 = a.w.eval(`S.roster.filter(m=>m.sec!=="ATT")[0].ckAt`);
    a.$(".st24 .pill").click(); await sleep(120);
    a.$('[data-sopt="On Hand"]').click(); await sleep(200);
    assert.equal(a.w.eval(`S.roster.filter(m=>m.sec!=="ATT")[0].ckAt`), ck0, "check-in time untouched");
    assert.ok(a.w.eval(`+S.roster.filter(m=>m.sec!=="ATT")[0].upd.t`) > Date.now() - 5000, "stamped as an update");
    assert.equal(a.w.eval(`counts().T.stale`), 0);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("4.123.1: the last-update time (ut) rides the roster, and a fresh ut keeps someone off the Off Hand list on a leader's phone", async () => {
  const puts = [];
  const a = await openApp({ rpc: (fn, b) => { if (fn === "put_roster") puts.push(b); return []; } });
  try {
    await a.w.eval(`(async()=>{const k=b64url(crypto.getRandomValues(new Uint8Array(32)));window.__k=k;S.mode="military";S.source="mol";S.leaderMode=true;S.onb=true;S.welcomed=1;S.role="co";
      S.board={id:"b1",rk:"r".repeat(30),wk:"w".repeat(30),sk:{UT:k},rsig:{},rat:{}};
      S.roster=[{id:"u1",rank:"LCPL",name:"MUNIZ, LUIS",sec:"UT",status:"On Hand",ckAt:Date.now()-36e5}];S.tl={};S.cks=[];save()})()`);
    await a.w.eval("rpPublish(true)"); await sleep(80);
    const body = await a.w.eval(`fdDec(window.__k,${JSON.stringify(puts[0].p_ct)})`);
    assert.ok(+body.ms[0].ut > Date.now() - 36e5 - 5000 && +body.ms[0].ut <= Date.now(), "ut published");
    // a leader's phone: old local history, but the roster says they were updated an hour ago
    a.w.eval(`S.roster[0].ckAt=0;S.roster[0].ut=String(Date.now()-36e5);S.tl[S.roster[0].id]=[[Date.now()-30*36e5,"On Hand","Full Duty"]]`);
    assert.equal(a.w.eval(`ckStale(S.roster[0])`), false, "fresh ut counts");
    a.w.eval(`S.roster[0].ut=String(Date.now()-30*36e5)`);
    assert.equal(a.w.eval(`ckStale(S.roster[0])`), true, "old ut is expired");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
