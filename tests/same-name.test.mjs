// Two different people with the same rank and name (two SGT Garcia, Jose; two students named Maria Garcia) are two
// people: saving never folds them into one, and syncing never hands one of them a new id.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp } from "./harness.mjs";

const lead = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;`;
const twins = `[{id:"b0",name:"GARCIA, JOSE",rank:"SGT",sec:"HQ",status:"On Hand",phone:"8085550101"},{id:"b1",name:"GARCIA, JOSE",rank:"SGT",sec:"1PLT",status:"On Hand",phone:"8085550102"},{id:"b2",name:"SMITH, ANN",rank:"CPL",sec:"HQ",status:"On Hand"}]`;

test("saving keeps two same-name people who have different phone numbers", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const ids = a.w.eval(`(()=>{${lead}S.roster=${twins};save();return S.roster.map(m=>m.id).join(",")})()`);
    assert.equal(ids, "b0,b1,b2");
  } finally { a.close(); }
});

test("a class list with two students of the same name (no rank) keeps both when they have different pages", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const n = a.w.eval(`(()=>{${lead}S.roster=[{id:"c0",name:"GARCIA, MARIA",rank:"",sec:"HQ",status:"On Hand",pk:"p".repeat(28)},{id:"c1",name:"GARCIA, MARIA",rank:"",sec:"HQ",status:"On Hand",pk:"q".repeat(28)}];save();return S.roster.length})()`);
    assert.equal(n, 2);
  } finally { a.close(); }
});

test("a real double (same person typed twice, nothing tells them apart) still folds into one", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const n = a.w.eval(`(()=>{${lead}S.roster=[{id:"d0",name:"GARCIA, JOSE",rank:"SGT",sec:"HQ",status:"On Hand"},{id:"d1",name:"GARCIA, JOSE",rank:"SGT",sec:"HQ",status:"On Hand"}];save();return S.roster.length})()`);
    assert.equal(n, 1);
  } finally { a.close(); }
});

test("syncing back and forth never gives a same-name person a new id", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const r = JSON.parse(a.w.eval(`(()=>{const clone=o=>JSON.parse(JSON.stringify(o));
      ${lead}S.sync={on:true,code:"X",ver:0};S.roster=${twins};save();
      const A=clone(S);const B=Object.assign(clone(S),{roster:[],sync:{on:true,code:"X",ver:0}});
      const put=o=>{for(const k of Object.keys(S))delete S[k];Object.assign(S,clone(o))};
      put(B);setBase({roster:[]});mergeRemote(clone(A));const afterB=S.roster.map(m=>m.id+":"+m.sec);
      const Bc=clone(S);put(A);setBase({roster:A.roster});mergeRemote(clone(Bc));
      return JSON.stringify({afterB,afterA:S.roster.map(m=>m.id+":"+m.sec)})})()`));
    assert.deepEqual(r.afterB, ["b0:HQ", "b1:1PLT", "b2:HQ"]);
    assert.deepEqual(r.afterA, ["b0:HQ", "b1:1PLT", "b2:HQ"]);
  } finally { a.close(); }
});
