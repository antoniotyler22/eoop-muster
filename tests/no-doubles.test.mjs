// Nobody shows up twice: same rank+name (or same uid) under two ids folds into one row on save and on sync.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp } from "./harness.mjs";

const lead = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;save();`;

test("two rows for one person fold into one on save; details and dates move to the kept row", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const r = a.w.eval(`(()=>{${lead}
      const m=S.roster[0];const dup=Object.assign(JSON.parse(JSON.stringify(m)),{id:"zz"+m.id,phone:"8085551234",status:"Leave",cal:[{id:"c1",d:"2026-11-02",ti:"Leave",ty:"leave"}]});
      delete dup.pk;S.roster.push(dup);S.w6=[{id:"w1",mid:dup.id}];const n0=S.roster.length;save();
      const k=S.roster.filter(x=>x.name===m.name&&x.rank===m.rank);
      return [n0,S.roster.length,k.length,k[0].phone,k[0].status,(k[0].cal||[]).length,S.w6[0].mid===k[0].id,!!S.gone[k[0].id===m.id?dup.id:m.id]]})()`);
    assert.deepEqual([...r], [a.w.eval("S.roster.length") + 1, a.w.eval("S.roster.length"), 1, "8085551234", "Leave", 1, true, true]);
  } finally { a.close(); }
});

test("a sync that brings the same person under a new id does not make a second row", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const r = a.w.eval(`(()=>{${lead}
      S.sync={on:true,code:"X"};const all=JSON.parse(JSON.stringify(S.roster));setBase({roster:all});
      const R={roster:all.map(m=>Object.assign({},m,{id:"n"+m.id}))};mergeRemote(R);
      const names=S.roster.map(m=>m.rank+"|"+m.name);return [S.roster.length===all.length,new Set(names).size===names.length]})()`);
    assert.deepEqual([...r], [true, true]);
  } finally { a.close(); }
});

test("the row that is me wins", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const r = a.w.eval(`(()=>{${lead}
      const m=S.roster[0];const dup=Object.assign(JSON.parse(JSON.stringify(m)),{id:"me1",phone:"8085550000"});S.who={id:"me1",n:m.name,t:Date.now()};
      S.roster.push(dup);save();const k=S.roster.filter(x=>x.name===m.name);return [k.length,k[0].id,S.who.id]})()`);
    assert.deepEqual([...r], [1, "me1", "me1"]);
  } finally { a.close(); }
});

test("different people with the same last name stay separate", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const r = a.w.eval(`(()=>{${lead}
      const m=S.roster[0];S.roster.push(Object.assign(JSON.parse(JSON.stringify(m)),{id:"other",name:m.name.split(",")[0]+", OTHERFIRST"}));const n0=S.roster.length;save();return S.roster.length===n0})()`);
    assert.equal(r, true);
  } finally { a.close(); }
});

test("BUCK, AARON added in app folds into BUCK, AARON D. from the file; different middle initials stay apart", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.leaderMode=true;S.mode="military";S.source="mol";
      S.roster=[{id:"f1",rank:"SGT",name:"BUCK, AARON D.",sec:"HE",status:"Leave",phone:"8085551234",end:"2026-11-07"},
                {id:"a1",rank:"SGT",name:"BUCK, AARON",sec:"HE",status:"On Hand",detail:"Added in app"},
                {id:"f2",rank:"CPL",name:"SMITH, JOHN A.",sec:"HE",status:"On Hand"},
                {id:"f3",rank:"CPL",name:"SMITH, JOHN B.",sec:"HE",status:"On Hand"},
                {id:"f4",rank:"SGT",name:"LEE JR, KENDALL D.",sec:"HE",status:"TAD"},
                {id:"a2",rank:"SGT",name:"LEE, KENDALL",sec:"HE",status:"On Hand"}];save()`);
    const names = JSON.stringify(a.w.eval("S.roster.map(m=>m.name).sort()"));
    assert.equal(names, JSON.stringify(["BUCK, AARON D.", "LEE JR, KENDALL D.", "SMITH, JOHN A.", "SMITH, JOHN B."]));
    const buck = a.w.eval(`JSON.parse(JSON.stringify(S.roster.find(m=>m.name==="BUCK, AARON D.")))`);
    assert.equal(buck.id, "f1"); assert.equal(buck.status, "Leave"); assert.equal(buck.phone, "8085551234");
    assert.ok(a.w.eval("!!(S.gone||{}).a1"), "the app copy is on the deleted list so it never syncs back");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
