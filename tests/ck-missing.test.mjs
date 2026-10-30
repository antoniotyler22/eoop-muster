// Who hasn't checked in today: shows on any leader phone (co-leader included); away people aren't expected.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("co-leader's Check-ins shows who hasn't checked in today", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.source="mol";S.welcomed=1;S.onb=true;S.role="co";S.sync={on:true,code:"X"};S.feeds=[{id:"f",mk:"m",lk:"l",ek:"e",posts:[]}];
      const R=S.roster.filter(m=>m.sec!=="ATT");R.forEach(m=>{m.status="On Hand";delete m.start;delete m.end;delete m.ckAt});
      R[0].ckAt=Date.now();R[1].status="Leave";R[1].start=dkey(new Date(Date.now()-864e5));R[1].end=dkey(new Date(Date.now()+3*864e5));
      S.cks=[{cid:"c1",mid:R[2].id,t:Date.now(),state:"new",st:"On Hand"}];save();view="checkins";render()`);
    const st = a.w.eval(`(()=>{const s=ckMissing();return [s.done.length,s.out.length,s.miss.length,S.roster.filter(m=>m.sec!=="ATT").length]})()`);
    assert.equal(st[0], 2, "confirmed today + waiting today"); assert.equal(st[1], 1, "on leave not expected"); assert.equal(st[2], st[3] - 3);
    assert.ok(a.$("#ckMiss"), "panel on Check-ins");
    assert.match(a.$("#ckMiss").textContent, /Haven't checked in/);
    a.w.eval(`view="board";render()`);
    assert.match(a.$("#ckMissHome").textContent, /didn.t check in today/);
  } finally { await a.close(); }
});

test("members never see it", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.feeds=[{id:"f",mk:"m",ek:"e",posts:[]}];S.welcomed=1;view="checkins";render()`);
    assert.equal(a.$("#ckMiss"), null);
  } finally { await a.close(); }
});

test("co-leader phone: check-ins arrive over sync, and Home names who didn't check in", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.leaderMode=true;S.mode="military";S.source="mol";S.role="co";S.sync={on:true,code:"AAAA-BBBB-CCCC",ver:1,at:1,err:"",last:"",baseSig:{},baseMem:{}};
      S.roster=[{id:"p1",rank:"SGT",name:"BUCK, AARON D.",sec:"HE",status:"On Hand"},{id:"p2",rank:"CPL",name:"ORTIZ, LUIS",sec:"HE",status:"On Hand"},{id:"p3",rank:"LCPL",name:"MUNIZ, JOSE",sec:"UT",status:"On Hand"}];
      S.cks=[{cid:"old1",mid:"p1",who:"SGT BUCK",st:"On Hand",t:Date.now()-60000,state:"ok"}];save()`);
    // the OIC's phone pulled a new check-in from Ortiz and confirmed Buck's; it syncs here
    a.w.eval(`mergeRemote({cks:[{cid:"old1",mid:"p1",who:"SGT BUCK",st:"On Hand",t:Date.now()-60000,state:"ok"},{cid:"new2",mid:"p2",who:"CPL ORTIZ",st:"Leave",t:Date.now(),state:"new"}],pgAfter:99});save()`);
    assert.equal(a.w.eval("S.cks.length"), 2, "both check-ins on this phone");
    assert.equal(a.w.eval("S.cks.find(x=>x.cid==='new2').state"), "new");
    assert.notEqual(a.w.eval("S.pgAfter"), 99, "read marker doesn't sync");
    await a.w.eval(`view="board";render()`); await sleep(40);
    const home = a.$("#ckMissHome"); assert.ok(home, "Home shows the didn't-check-in card");
    assert.match(home.textContent, /1 didn't check in today/);
    assert.match(home.textContent, /LCPL MUNIZ/, "names who");
    assert.doesNotMatch(home.textContent, /ORTIZ/, "a waiting check-in counts as checked in");
    await a.w.eval(`view="checkins";render()`); await sleep(40);
    assert.match(a.$("#main").textContent, /CPL ORTIZ/, "co-leader sees the check-in to confirm");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("confirming a check-in sticks: duplicates by id collapse and a stale 'new' copy over sync can't re-open it; 'LCPL REAM KYLE' matches REAM, KYLE A.", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.leaderMode=true;S.mode="military";S.source="mol";S.role="oic";S.sync={on:true,code:"AAAA-BBBB-CCCC",ver:1,at:1,err:"",last:"",baseSig:{},baseMem:{}};
      S.roster=[{id:"p1",rank:"LCPL",name:"REAM, KYLE A.",sec:"HE",status:"On Hand"}];
      const t=Date.now();S.cks=[{cid:"c1",mid:"",who:"LCPL REAM KYLE",st:"On Hand",t,state:"new"},{cid:"c1",mid:"",who:"LCPL REAM KYLE",st:"On Hand",t,state:"new"}];save();view="checkins";render()`);
    assert.equal(a.w.eval("S.cks.length"), 1, "duplicate rows collapsed on save");
    a.$('[data-ckok="c1"]').click(); await sleep(60);
    assert.equal(a.w.eval("S.cks.filter(x=>x.state==='new').length"), 0, "confirmed");
    assert.doesNotMatch(a.$("#main").textContent, /To confirm/);
    a.w.eval(`mergeRemote({cks:[{cid:"c1",mid:"",who:"LCPL REAM KYLE",st:"On Hand",t:Date.now()-5000,state:"new"}]});save();render()`); await sleep(40);
    assert.equal(a.w.eval("S.cks.filter(x=>x.state==='new').length"), 0, "stale copy can't re-open it");
    // a fresh check-in in "RANK LAST FIRST" form matches the roster row by itself
    a.w.eval(`ckIn({id:"page:x"},{cid:"c2",me:"LCPL REAM KYLE",st:"Leave",from:"2026-10-30",to:"2026-11-01",at:Date.now()},{created_at:new Date().toISOString()})`);
    assert.equal(a.w.eval("S.cks.find(x=>x.cid==='c2').mid"), "p1", "matched to REAM, KYLE A.");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
