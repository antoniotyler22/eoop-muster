// 4.40.0: section tiles on Home show "All in" (green) and "N late" (amber).
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const SETUP = (cut) => `(()=>{const t=Date.now();S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.ckCut="${cut}";
  S.roster=[
   {id:"a1",rank:"SGT",name:"SMITH, ANA",sec:"HQ",status:"On Hand",ckAt:t},
   {id:"a2",rank:"CPL",name:"JONES, BEN",sec:"HQ",status:"On Hand",ckAt:t},
   {id:"a3",rank:"LCPL",name:"DIAZ, CAL",sec:"CE",status:"On Hand"},
   {id:"a4",rank:"PFC",name:"PARK, DEE",sec:"CE",status:"On Hand",ckAt:t},
   {id:"a5",rank:"PFC",name:"LEE, EVE",sec:"HE",status:"On Hand"}];
  save();view="board";render();})()`;

test("a section where everyone checked in shows All in; one past the cutoff with a miss shows late", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(SETUP("00:00")); await sleep(60);
    const tile = (k) => a.$(`#main .sgrid button[data-go="${k}"]`);
    assert.ok(tile("hq").classList.contains("sg-in")); assert.match(tile("hq").textContent, /All in/);
    assert.ok(tile("ce").classList.contains("sg-late")); assert.match(tile("ce").textContent, /1 late/);
    assert.ok(tile("he").classList.contains("sg-late"));
    assert.ok(!tile("ord") || !/late|All in/.test(tile("ord").textContent), "empty section shows nothing");
  } finally { await a.close(); }
});

test("before the cutoff nobody is late, but a finished section still shows All in", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(SETUP("23:59")); await sleep(60);
    const tile = (k) => a.$(`#main .sgrid button[data-go="${k}"]`);
    assert.ok(tile("hq").classList.contains("sg-in"));
    assert.ok(!tile("ce").classList.contains("sg-late"));
  } finally { await a.close(); }
});
