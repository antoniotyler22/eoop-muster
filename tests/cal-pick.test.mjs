// Calendar "Pick people…": check several people, add one event to all of them, shown as one line.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const prep = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";save();view="cal";calAdd=true;render();`;
const pick = (n, ti) => `{const w=$("#caWho");w.value="PICK";w.dispatchEvent(new Event("change",{bubbles:true}));
  [...document.querySelectorAll("#caPick [data-pk]")].slice(0,${n}).forEach(x=>{x.checked=true;x.dispatchEvent(new Event("change",{bubbles:true}))});
  $("#caD").value=dkey();$("#caTi").value="${ti}";}`;

test("pick 3 people: event on each of their calendars, one line on the leader's calendar", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(prep); await sleep(20);
    assert.ok(a.w.eval(`!!document.querySelector('#caWho option[value="PICK"]')`), "option shown");
    a.w.eval(pick(3, "Range day")); await sleep(10);
    assert.equal(a.w.eval(`$("#caPick").hidden`), false, "checklist shown");
    assert.match(a.w.eval(`$("#caSave").textContent`), /Add for 3 people/);
    a.w.eval(`$("#caSave").click()`); await sleep(20);
    assert.equal(a.w.eval(`S.roster.filter(m=>(m.cal||[]).some(x=>x.ti==="Range day")).length`), 3);
    const rows = a.w.eval(`calEntries(dkey(),dkey(),"ALL").filter(e=>e.ti==="Range day")`);
    assert.equal(rows.length, 1, "one line");
    assert.equal(a.w.eval(`mpDigest(S.roster.find(m=>(m.cal||[]).some(x=>x.ti==="Range day"))).cal.filter(x=>x.ti==="Range day").length`), 1, "My page has it");
  } finally { a.close(); }
});

test("nobody checked: asks to pick; ✕ twice removes it for all", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(prep); await sleep(20);
    a.w.eval(pick(0, "Nothing")); a.w.eval(`$("#caSave").click()`); await sleep(10);
    assert.equal(a.w.eval(`S.roster.filter(m=>(m.cal||[]).some(x=>x.ti==="Nothing")).length`), 0);
    a.w.eval(pick(2, "Brief")); a.w.eval(`$("#caSave").click()`); await sleep(20);
    const gp = a.w.eval(`S.roster.flatMap(m=>m.cal||[]).find(x=>x.ti==="Brief").gp`);
    a.w.eval(`document.querySelector('[data-cgdel="${gp}"]').click()`); await sleep(10);
    a.w.eval(`document.querySelector('[data-cgdel="${gp}"]').click()`); await sleep(10);
    assert.equal(a.w.eval(`S.roster.filter(m=>(m.cal||[]).some(x=>x.ti==="Brief")).length`), 0);
  } finally { a.close(); }
});
