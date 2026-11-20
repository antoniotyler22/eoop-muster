// 4.138.0: Logbook. One sign-out sets the status, place and back-by everywhere; sign-in clears it; past the back-by time it shows LATE.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const setup = `S.source="mol";S.welcomed=1;S.onb=true;S.role="oic";S.mode="military";S.exp24=false;S.tl={};S.cks=[];
  S.roster=[{id:"lee",rank:"SGT",name:"LEE, JAMIE",sec:"UT",status:"On Hand"},{id:"r1",rank:"CPL",name:"RIVERA, ANA",sec:"UT",status:"On Hand"}];S.who={id:"r1",n:"CPL Rivera",t:1};save()`;

test("sign out sets status, place, dates and back-by; counts as a check-in; sign in clears it", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`${setup};view="lb";render()`); await sleep(60);
    assert.ok(a.$("#lbSign"), "sign card shows");
    a.w.eval(`document.querySelector('#lbWho').value="lee";document.querySelector('#lbWho').dispatchEvent(new Event("change",{bubbles:true}))`); await sleep(40);
    a.w.eval(`document.querySelector('[data-lbst="Appointment"]').click()`); await sleep(30);
    a.w.eval(`document.querySelector('#lbP').value="Medical, Bldg 1220";document.querySelector('#lbB').value="23:59";document.querySelector('#lbGo').click()`); await sleep(80);
    const row = () => JSON.parse(a.w.eval(`JSON.stringify(S.roster.find(m=>m.id==="lee"))`));
    let m = row();
    assert.equal(m.status, "Appointment");
    assert.equal(m.loc, "Medical, Bldg 1220");
    assert.equal(m.detail, "back 2359");
    assert.equal(m.start, m.end, "dated for today");
    assert.ok(m.ckAt > 0, "counts as a check-in");
    assert.equal(m.by.w, "other", "set by someone else (rivera is signed in as who)");
    assert.equal(a.w.eval(`S.lb.log[0].k`), "out");
    assert.equal(a.w.eval(`counts().T["Appointment"]>=1`), true, "Home counts it");
    assert.equal(a.w.eval(`lbLate().length`), 0, "not late before the back-by time");
    // past the back-by time: late
    a.w.eval(`S.roster.find(m=>m.id==="lee").detail="back 0001";render()`);
    assert.equal(a.w.eval(`lbLate().length`), 1, "late after the time passes");
    assert.match(a.$("#main").textContent, /late/i);
    // sign in
    a.w.eval(`document.querySelector('[data-lbmode="in"]').click()`); await sleep(30);
    a.w.eval(`document.querySelector('#lbGo').click()`); await sleep(80);
    m = row();
    assert.equal(m.status, "On Hand");
    assert.ok(!m.loc && !m.detail && !m.start && !m.end, "place and dates cleared");
    assert.equal(a.w.eval(`S.lb.log[0].k`), "in");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("Home shows a Logbook card and My page has the button", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`${setup};view="board";render()`); await sleep(60);
    assert.ok(a.$("#lbCard"), "Home card");
    assert.ok(a.$('[data-go="lb"]'));
    const kids = [...a.$("#main").children].map(x => x.id || x.className);
    assert.ok(kids.indexOf("lbCard") <= 2, "card sits at the top of Home: " + kids.join(","));
    a.w.eval(`view="people";render()`); await sleep(60);
    assert.ok(a.$('#subnav [data-go="lb"]'), "Logbook button in the People sub-nav");
    a.w.eval(`view="lb";render()`); await sleep(60);
    assert.equal(a.w.eval(`tabOf("lb")`), "people");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
