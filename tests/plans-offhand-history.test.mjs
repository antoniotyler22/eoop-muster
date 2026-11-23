// 4.143.0: plan picker (moving blue outline), Team tier, Set everyone Off Hand, Logbook History + per-version name, visitor Close.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const leader = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.mode="military";window.mpNoLand=1;`;
const prods = [["pro.monthly", "$9.99", "month"], ["pro.yearly", "$79.99", "year"], ["org.monthly", "$29.99", "month"], ["org.yearly", "$249.99", "year"], ["team.100", "$12.99", "month"], ["team.150", "$15.98", "month"]]
  .map(([k, price, period]) => ({ id: "com.antoniotyler.accountedfor." + k, price, period, periodCount: 1, amount: +price.slice(1) }));

test("Pro: every plan is a card, the blue outline moves to the one you tap, Continue buys that one", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(leader + `window.MBN={on:true,platform:"ios",pro:{active:false},Pro:{products:async()=>({products:${JSON.stringify(prods)}})}};`);
    a.w.eval(`openPro("x")`); await sleep(120);
    const keys = () => [...a.w.document.querySelectorAll("[data-plan]")].map((c) => c.dataset.plan);
    assert.deepEqual(JSON.parse(JSON.stringify(keys())), ["pro.month", "pro.year", "team", "org.month", "org.year"], "monthly, yearly, team and org all show");
    const on = () => [...a.w.document.querySelectorAll(".plan-card.on")].map((c) => c.dataset.plan);
    assert.deepEqual(JSON.parse(JSON.stringify(on())), ["pro.year"], "starts on Pro yearly");
    for (const [k, id] of [["org.month", "org.monthly"], ["pro.month", "pro.monthly"], ["org.year", "org.yearly"]]) {
      a.w.document.querySelector(`[data-plan="${k}"]`).click(); await sleep(20);
      assert.deepEqual(JSON.parse(JSON.stringify(on())), [k], "outline moved to " + k);
      assert.equal(a.w.document.querySelector("#planGo").dataset.proBuy, "com.antoniotyler.accountedfor." + id, "Continue buys " + k);
    }
    assert.equal(a.w.document.querySelectorAll('.plan-card[aria-checked="true"]').length, 1);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("Team: 100 people $12.99, +$2.99 a month per extra 50; picking a size picks that product; the cap follows the plan", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const cents = (n) => a.w.eval(`afTeam.cents(${n})`);
    assert.equal(cents(100), 1299); assert.equal(cents(150), 1598); assert.equal(cents(200), 1897); assert.equal(cents(350), 2794);
    a.w.eval(leader + `window.MBN={on:true,platform:"ios",pro:{active:false},Pro:{products:async()=>({products:${JSON.stringify(prods)}})}};`);
    a.w.eval(`openPro("x")`); await sleep(120);
    a.w.document.querySelector('[data-plan="team"]').click(); await sleep(20);
    assert.ok(a.w.document.querySelector('[data-team-size="150"]'), "size chips show on the Team card");
    assert.equal(a.w.document.querySelector("#planGo").dataset.proBuy, "com.antoniotyler.accountedfor.team.100");
    a.w.document.querySelector('[data-team-size="150"]').click(); await sleep(20);
    assert.equal(a.w.document.querySelector("#planGo").dataset.proBuy, "com.antoniotyler.accountedfor.team.150");
    assert.match(a.w.document.querySelector('[data-plan="team"] .pc-price').textContent, /\$15\.98/);
    a.w.document.querySelector('[data-team-size="200"]').click(); await sleep(20);
    assert.ok(a.w.document.querySelector("#planGo").disabled, "a size the App Store doesn't list yet can't be bought");
    a.w.eval(`MBN.pro={active:true,pid:"com.antoniotyler.accountedfor.team.150",exp:Date.now()+864e5}`);
    assert.equal(a.w.eval(`afTier()`), "team"); assert.equal(a.w.eval(`afCap()`), 150);
    a.w.eval(`MBN.pro={active:true,pid:"com.antoniotyler.accountedfor.pro.monthly",exp:Date.now()+864e5}`);
    assert.equal(a.w.eval(`afCap()`), 50);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("Check-ins: Set everyone Off Hand (two taps) turns On Hand people Off Hand until they check in; Undo brings them back", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(leader + `S.exp24=true;S.sync={on:true,code:"X"};S.tl={};S.cks=[];
      S.roster=[{id:"a",rank:"CPL",name:"DIAZ, ANA",sec:"UT",status:"On Hand",ckAt:Date.now()-36e5},{id:"b",rank:"PFC",name:"LEE, SAM",sec:"UT",status:"On Hand",ckAt:Date.now()-36e5},{id:"c",rank:"SGT",name:"KIM, JO",sec:"UT",status:"Leave",start:dkey(new Date(Date.now()-864e5)),end:dkey(new Date(Date.now()+864e5)),ckAt:Date.now()-36e5}];
      save();view="checkins";render()`);
    await sleep(60);
    assert.equal(a.w.eval(`ckStaleList().length`), 0, "everyone is fresh before the reset");
    assert.ok(a.$("#offReset"), "the button is on the Check-ins screen");
    a.$("#offReset").click(); await sleep(20);
    assert.match(a.$("#offReset").textContent, /Tap again: set 2 On Hand to Off Hand/);
    assert.equal(a.w.eval(`ckStaleList().length`), 0, "one tap changes nothing");
    a.$("#offReset").click(); await sleep(40);
    assert.deepEqual(JSON.parse(a.w.eval(`JSON.stringify(ckStaleList().map(m=>m.id).sort())`)), ["a", "b"], "only the On Hand people go Off Hand; the one on dated leave stays");
    assert.equal(a.w.eval(`ckStale(S.roster[2])`), false);
    a.w.eval(`S.roster[0].ckAt=Date.now()+5;save()`);
    assert.deepEqual(JSON.parse(a.w.eval(`JSON.stringify(ckStaleList().map(m=>m.id))`)), ["b"], "checking in brings a person back");
    a.w.eval(`S.cks=[{cid:"c1",mid:"b",t:Date.now()+10,state:"new",st:"On Hand"}]`);
    assert.equal(a.w.eval(`ckStaleList().length`), 0, "a waiting check-in made after the reset counts");
    a.w.eval(`S.cks=[]`); a.w.eval(`render()`);
    a.$("#offUndo").click(); await sleep(30);
    assert.equal(a.w.eval(`ckStaleList().length`), 0, "undo restores everyone");
    assert.equal(a.w.eval(`S.offAt`), undefined);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("Logbook: History goes back to earlier days and filters by person; each version names it its own way", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const day = (n) => a.w.eval(`Date.now()-${n}*864e5`);
    a.w.eval(leader + `S.exp24=false;S.roster=[{id:"lee",rank:"SGT",name:"LEE, JAMIE",sec:"UT",status:"On Hand"},{id:"r1",rank:"CPL",name:"RIVERA, ANA",sec:"UT",status:"On Hand"}];
      /* anchor to 10:00 two days back so the +1h/+2h entries stay on that day whatever time the tests run */const B2=(()=>{const d=new Date();d.setHours(10,0,0,0);return d.getTime()-2*864e5})();S.lb={log:[{id:"l1",mid:"lee",n:"SGT Lee",sec:"UT",k:"out",t:B2,st:"Leave",pl:"Home",bk:""},{id:"l2",mid:"lee",n:"SGT Lee",sec:"UT",k:"in",t:B2+36e5,st:"On Hand",pl:"",bk:""},{id:"l3",mid:"r1",n:"CPL Rivera",sec:"UT",k:"out",t:B2+72e5,st:"Appointment",pl:"Medical",bk:""}]};save();view="lb";render()`);
    await sleep(60);
    assert.ok(a.$("#lbHist"), "History panel shows");
    a.$('[data-lbhd="-1"]').click(); await sleep(20); a.$('[data-lbhd="-1"]').click(); await sleep(20);
    let t = a.$("#lbHist").textContent;
    assert.match(t, /3 entries · 2 out · 1 in/, "two days back shows that day's entries");
    assert.match(t, /SGT Lee/); assert.match(t, /CPL Rivera/);
    a.w.eval(`const s=document.querySelector("#lbHw");s.value="lee";s.dispatchEvent(new Event("change",{bubbles:true}))`); await sleep(20);
    t = a.$("#lbHist").textContent;
    assert.match(t, /2 entries · 1 out · 1 in/);
    assert.match(a.$("#lbHist").textContent, /Home/);
    a.$('[data-lbhd="1"]').click(); await sleep(20); a.$('[data-lbhd="1"]').click(); await sleep(20);
    assert.match(a.$("#lbHist").textContent, /Today · 0 entries/);
    assert.ok(a.$('[data-lbhd="1"]').disabled, "can't go past today");
    // names by version
    const n = (m) => a.w.eval(`S.mode="${m}";lbName()`);
    assert.equal(n("military"), "Logbook"); assert.equal(n("police"), "Duty Log"); assert.equal(n("jobs"), "Crew Log");
    assert.equal(n("hr"), "Sign-Out Sheet"); assert.equal(n("civilian"), "Sign-Out Sheet");
    a.w.eval(`S.mode="police";save();render()`); await sleep(150);
    assert.match(a.$("#main").textContent, /Duty Log/); assert.doesNotMatch(a.$("#main").textContent, /Logbook/i);
    a.w.eval(`S.mode="military";save();render()`); await sleep(150);
    assert.match(a.$("#main").textContent, /Logbook/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("Visitors: Close on the sign-in form clears it and leaves a button to open it again; Escape closes; kiosk gets Clear", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(leader + `S.roster=[{id:"r1",rank:"SGT",name:"RUIZ, AL",sec:"HQ",status:"On Hand"}];view="visitors";render()`);
    assert.ok(a.$("#vsForm") && a.$("#vsClose"), "form is open with a Close");
    a.w.eval(`document.querySelector("#vsName").value="Half Typed"`);
    a.$("#vsClose").click(); await sleep(20);
    assert.ok(!a.$("#vsForm") && a.$("#vsOpen"), "closed: a button to open it");
    assert.equal(a.w.eval(`(S.vis||[]).length`), 0, "nothing was signed in");
    a.$("#vsOpen").click(); await sleep(20);
    assert.equal(a.w.eval(`document.querySelector("#vsName").value`), "", "reopened empty");
    a.w.document.dispatchEvent(new a.w.KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await sleep(20);
    assert.ok(!a.$("#vsForm"), "Escape closes it");
    a.$("#vsOpen").click(); await sleep(20);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("Visitor login form has a Close at the top", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(leader + `S.feeds=[{id:"feedaaaaaaaa",mk:"m".repeat(32),lk:"l".repeat(32),ek:b64url(crypto.getRandomValues(new Uint8Array(32))),unit:"1ST",me:"SGT RUIZ",main:true,posts:[]}];view="visitors";render()`);
    if (a.$("#vlOpen")) { a.$("#vlOpen").click(); await sleep(10); assert.ok(a.$("[data-vlx]"), "Close is at the top of the form"); a.$("[data-vlx]").click(); await sleep(10); assert.ok(a.$("#vlOpen"), "back to the button"); }
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("Off Hand: a new status-history line that is only bookkeeping (a duty change) does not restart the 15 hours or undo Set everyone Off Hand", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(leader + `S.exp24=true;S.sync={on:true,code:"X"};S.cks=[];S.tl={};
      const old=Date.now()-20*36e5;
      S.roster=[{id:"a",rank:"CPL",name:"DIAZ, ANA",sec:"UT",status:"On Hand",ckAt:old},{id:"b",rank:"PFC",name:"LEE, SAM",sec:"UT",status:"On Hand",ckAt:Date.now()-36e5}];
      S.tl={a:[[old,"On Hand","Full Duty"],[Date.now()-1000,"On Hand","Watch"]],b:[[Date.now()-36e5,"On Hand","Full Duty"]]};
      save();view="checkins";render()`);
    await sleep(60);
    assert.deepEqual(JSON.parse(a.w.eval(`JSON.stringify(ckStaleList().map(m=>m.id))`)), ["a"], "20 hours with no update is Off Hand even though a duty line was added a second ago");
    a.w.eval(`S.offAt=Date.now()-500;S.tl.b.push([Date.now(),"On Hand","Watch"]);render()`);
    assert.deepEqual(JSON.parse(a.w.eval(`JSON.stringify(ckStaleList().map(m=>m.id).sort())`)), ["a", "b"], "the manual reset holds after a bookkeeping line");
    a.w.eval(`S.tl.b.push([Date.now(),"Leave","Full Duty"]);S.roster[1].status="Leave";render()`);
    assert.equal(a.w.eval(`ckStale(S.roster[1])`), false, "a real status change still counts");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
