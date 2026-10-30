// 4.39.0: "Ask your roster": plain questions answered on the phone from the roster.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const SETUP = `(()=>{const t=new Date();const f=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  const day=n=>{const d=new Date(t.getFullYear(),t.getMonth(),t.getDate()+n);return f(d)};
  S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";
  S.roster=[
   {id:"a1",rank:"SGT",name:"SMITH, ANA",sec:"HQ",status:"On Hand",phone:"8085550101"},
   {id:"a2",rank:"CPL",name:"JONES, BEN",sec:"HQ",status:"Leave",start:day(0),end:day(3),phone:""},
   {id:"a3",rank:"LCPL",name:"DIAZ, CAL",sec:"CE",status:"TAD",start:day(0),end:day(30),phone:"8085550103"},
   {id:"a4",rank:"PFC",name:"PARK, DEE",sec:"CE",status:"On Hand",phone:""}];
  save();})()`;

test("answers who is out, who has no phone, counts and a name lookup, and splits a two-part question", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(SETUP);
    const ask = (q) => a.w.eval(`askRoster(${JSON.stringify(q)})`);
    const out = ask("who's out");
    assert.match(out, /2<\/b> out today/); assert.match(out, /Jones/); assert.match(out, /Diaz/); assert.doesNotMatch(out, /Smith/);
    const two = ask("Who is on TAD and who is missing a phone number?");
    assert.match(two, /TAD today/); assert.match(two, /without a phone number/); assert.match(two, /Park/);
    assert.match(ask("how many in HQ?"), /2<\/b> in HQ/);
    const nm = ask("where is Jones");
    assert.match(nm, /Leave/); assert.match(nm, /no phone number/);
    assert.match(ask("who is on leave"), /Jones/);
    assert.match(ask("blah blah"), /didn't catch that/);
  } finally { await a.close(); }
});

test("the box shows on Home for a leader and answers when asked", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(SETUP); a.w.eval(`view="board";render()`); await sleep(50);
    assert.ok(a.$("#arCard"), "card is on Home");
    a.$("#arQ").value = "who is missing a phone number"; a.$("#arGo").click();
    assert.match(a.$("#arOut").textContent, /Jones/);
    assert.match(a.$("#arOut").textContent, /Park/);
  } finally { await a.close(); }
});

test("members never get the roster box", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(SETUP); a.w.eval(`S.source="sample";view="board";render()`); await sleep(50);
    assert.ok(!a.$("#arCard"));
  } finally { await a.close(); }
});
