// 4.96: Smart help
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("roster check finds duplicates, missing phones and expired leave, and Mark On Hand fixes it", async () => {
  const a = await openApp();
  try {
    a.w.eval(`const R=S.roster;R[0].name="SMITH, JOHN";R[1].name="SMITH, JOHN";R[2].name="SMITHE, ANN";R[3].name="SMITH, ANN";
      R[4].status="Leave";R[4].start="01 JAN 2020";R[4].end="05 JAN 2020";R.forEach(m=>m.phone="");save();view="assist";render()`);
    await sleep(30);
    const t = a.$("#asIss").textContent;
    assert.match(t, /look like the same person/);
    assert.match(t, /no phone number/);
    assert.match(t, /still Leave/);
    const id = a.w.eval(`S.roster[4].id`);
    a.$(`[data-asback="${id}"]`).click(); await sleep(30);
    assert.equal(a.w.eval(`S.roster[4].status`), "On Hand");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("morning brief lists who is away and what is on the calendar", async () => {
  const a = await openApp();
  try {
    a.w.eval(`S.roster.forEach(x=>{x.status="On Hand";x.start="";x.end=""});const m=S.roster[0];m.status="TAD";m.start="";m.end="";S.events.push({id:"e1",name:"Range",date:dkey(),tm:"07:00",secs:[],done:{}});save();view="assist";render()`);
    await sleep(30);
    const b = a.$("#asBrief").textContent;
    assert.match(b, /Away today \(1\)/);
    assert.match(b, /Range today 0700/);
  } finally { await a.close(); }
});

test("paste to calendar turns dated lines into events", async () => {
  const a = await openApp();
  try {
    const r = JSON.parse(a.w.eval(`JSON.stringify(AFAssist.parseLines("Range Tuesday 0700\\nInspection 19 NOV 2030 at 1:30pm\\nBring water\\nStaff meeting 11/20/2030 0900 hrs"))`));
    assert.equal(r.out.length, 3);
    assert.equal(r.out[0].name, "Range"); assert.equal(r.out[0].tm, "07:00");
    assert.deepEqual([r.out[1].date, r.out[1].tm], ["2030-11-19", "13:30"]);
    assert.deepEqual([r.out[2].date, r.out[2].tm, r.out[2].name], ["2030-11-20", "09:00", "Staff meeting"]);
    assert.deepEqual(r.skipped, ["Bring water"]);
    a.w.eval(`view="assist";render()`); await sleep(20);
    a.$("#asCal").value = "Drill 19 NOV 2030 0600"; a.$("[data-asfind]").click(); await sleep(20);
    const n0 = a.w.eval(`S.events.length`);
    a.$("[data-asadd]").click(); await sleep(20);
    assert.equal(a.w.eval(`S.events.length`), n0 + 1);
    assert.equal(a.w.eval(`S.events[S.events.length-1].date`), "2030-11-19");
  } finally { await a.close(); }
});

test("what did I miss lists posts I haven't confirmed, urgent first", async () => {
  const a = await openApp();
  try {
    a.w.eval(`S.feeds=[{id:"feedabcdef12",mk:"m".repeat(30),ek:"x",unit:"1ST",me:"CPL T",sec:"1ST",mine:{},seen:0,posts:[{id:1,t:Date.now()-1000,txt:"Fyi lunch",to:{k:"all"}},{id:2,t:Date.now()-5000,txt:"Formation moved to 0600",urg:1,to:{k:"all"}}]}];view="assist";render()`);
    await sleep(30);
    const m = JSON.parse(a.w.eval(`JSON.stringify(AFAssist.missed())`));
    assert.equal(m.length, 2);
    assert.match(m[0].x, /^URGENT: Formation moved/);
  } finally { await a.close(); }
});

test("check before sending flags a vague message and clears a complete one", async () => {
  const a = await openApp();
  try {
    assert.deepEqual(JSON.parse(a.w.eval(`JSON.stringify(AFAssist.checkMsg("Be there ASAP"))`)).length, 2);
    assert.deepEqual(JSON.parse(a.w.eval(`JSON.stringify(AFAssist.checkMsg("Formation at 0600 at the motor pool. Bring gear."))`)), []);
  } finally { await a.close(); }
});

test("who is this suggests the roster match and saves the number", async () => {
  const a = await openApp();
  try {
    a.w.eval(`S.roster[2].name="ZZQUUX, ALEX";S.roster[2].phone="";save();view="assist";render()`); await sleep(20);
    a.$("#asRep").value = "hi this is Zzquux, running late"; a.$("#asRep").dispatchEvent(new a.w.Event("input", { bubbles: true })); await sleep(30);
    a.$("#asPh").value = "808-555-0177"; a.$("#asPh").dispatchEvent(new a.w.Event("input", { bubbles: true })); await sleep(30);
    assert.match(a.$("#asMatch").textContent, /ZZQUUX, ALEX/);
    a.$("[data-assave]").click(); await sleep(20);
    assert.equal(a.w.eval(`S.roster[2].phone`), "8085550177");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
