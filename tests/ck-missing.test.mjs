// Who hasn't checked in today: shows on any leader phone (co-leader included); away people aren't expected.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp } from "./harness.mjs";

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
    assert.match(a.$("#ckMissHome").textContent, /not checked in today/);
  } finally { await a.close(); }
});

test("members never see it", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.feeds=[{id:"f",mk:"m",ek:"e",posts:[]}];S.welcomed=1;view="checkins";render()`);
    assert.equal(a.$("#ckMiss"), null);
  } finally { await a.close(); }
});
