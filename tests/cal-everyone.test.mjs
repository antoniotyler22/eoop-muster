// Calendar "Everyone": one entry for the whole roster, shown once, on every person's own calendar, new people too.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const prep = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";save();view="cal";calAdd=true;render();`;
const add = (ti) => `$("#caWho").value="EVERYONE";$("#caD").value=dkey();$("#caTi").value="${ti}";$("#caSave").click();`;

test("Who has an Everyone option and adds one line for the whole roster", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(prep); await sleep(20);
    assert.ok(a.w.eval(`!!document.querySelector('#caWho option[value="EVERYONE"]')`), "option shown");
    a.w.eval(add("Unit run")); await sleep(20);
    const n = a.w.eval(`S.roster.length`);
    assert.ok(n > 1);
    assert.equal(a.w.eval(`S.roster.filter(m=>(m.cal||[]).some(x=>x.ti==="Unit run")).length`), n, "on every person");
    assert.equal(a.w.eval(`calEntries(dkey(),dkey(),"ALL").filter(e=>e.ti==="Unit run").length`), 1, "one line");
    assert.match(a.w.eval(`document.querySelector("#main").textContent`), /Everyone/);
  } finally { a.close(); }
});

test("people added later get it, and My page still lists it per person", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(prep); await sleep(20); a.w.eval(add("Field day")); await sleep(20);
    a.w.eval(`S.roster.push(Object.assign({},S.roster[0],{id:"newguy1",name:"NEWGUY",cal:[]}));save();`);
    assert.ok(a.w.eval(`S.roster.find(m=>m.id==="newguy1").cal.some(x=>x.ti==="Field day")`));
    assert.ok(a.w.eval(`mpDigest(S.roster.find(m=>m.id==="newguy1")).cal.some(x=>x.ti==="Field day")`));
  } finally { a.close(); }
});

test("deleting the Everyone line removes it from everyone", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(prep); await sleep(20); a.w.eval(add("Formation")); await sleep(20);
    const g = a.w.eval(`S.calAll[0].g`);
    a.w.eval(`document.querySelector('[data-calldel="${g}"]').click()`); await sleep(10);
    a.w.eval(`document.querySelector('[data-calldel="${g}"]').click()`); await sleep(10);
    assert.equal(a.w.eval(`S.roster.filter(m=>(m.cal||[]).some(x=>x.ti==="Formation")).length`), 0);
    assert.equal(a.w.eval(`S.calAll.length`), 0);
  } finally { a.close(); }
});
