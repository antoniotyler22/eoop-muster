// 4.144.0: Org suite (console, roster sync, webhook, trust, share, data room), Safety Plan / Reunite / Quiet, first-drill card, blue dots.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const leader = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.mode="military";S.unit="Riverside";window.mpNoLand=1;
  S.roster=[{id:"a",rank:"CPL",name:"DIAZ, ANA",sec:"UT",status:"On Hand"},{id:"b",rank:"PFC",name:"LEE, SAM",sec:"UT",status:"On Hand"},{id:"c",rank:"SGT",name:"KIM, JO",sec:"UT",status:"Leave"}];S.drills=[];save();`;
const go = async (a, v) => { a.w.eval(`view=${JSON.stringify(v)};render()`); await sleep(80); };
const click = async (a, sel) => { const el = a.$(sel); assert.ok(el, "missing " + sel); el.click(); await sleep(60); };

test("Tools has an Org suite tile with a blue dot; the dot is blue and goes away once opened", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(leader); await go(a, "tools"); await sleep(600);
    const tile = a.$('.tgrid [data-go="org"]'); assert.ok(tile, "tile is on Tools");
    assert.ok(tile.querySelector(".newdot"), "blue dot beside it");
    const css = a.w.document.querySelector("style") ? "" : "";
    assert.match(await import("node:fs").then(f => f.readFileSync(new URL("../app.css", import.meta.url), "utf8")), /\.newdot\{[^}]*background:#2f6feb/);
    tile.click(); await sleep(80);
    a.w.eval(`view="tools";render()`); await sleep(700);
    assert.equal(a.$$('.tgrid [data-go="org"] .newdot').length, 0, "dot is gone once opened");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("Org suite screen: console shows the team, trust export has people and drills, share link, owner data room shows [PENDING]", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(leader + `S.drills=[{id:"d1",t:Date.now()-864e5*40,end:Date.now()-864e5*40+9e4,kind:"drill",n:3,ok:3,miss:[],missN:0,type:"fire"}];save()`);
    await go(a, "org");
    for (const id of ["#osCon", "#osSync", "#osHook", "#osTrust", "#osRef", "#osRoom"]) assert.ok(a.$(id), id + " shows");
    assert.match(a.$("#osCon").textContent, /3 people/); assert.match(a.$("#osCon").textContent, /Drill due/, "40 days since the last drill");
    assert.match(a.$("#osRoom").textContent, /\[PENDING\]/);
    for (const id of ["#osCon", "#osSync", "#osHook", "#osTrust", "#osRef", "#osRoom"]) assert.ok(a.$(id + " > b .newdot"), "dot on " + id);
    const x = JSON.parse(JSON.stringify(a.w.eval(`orgSuite.exportAll()`)));
    assert.equal(x.people.length, 3); assert.equal(x.drills.length, 1); assert.equal(x.team, "RIVERSIDE"); assert.ok(!JSON.stringify(x).includes("uid"));
    assert.match(a.w.eval(`orgSuite.refLink()`), /^https:\/\/accountedforteam\.com\/\?ref=[a-z0-9]{6}$/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("Roster sync: CSV parsing, preview, apply adds, removal is off unless switched on, bad links are refused", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(leader);
    const rows = JSON.parse(JSON.stringify(a.w.eval(`orgSuite.parseRoster("First,Last,Grade\\nAna,Diaz,7\\nNew,Person,7\\n")`)));
    assert.deepEqual(rows.map(r => r.name), ["DIAZ, ANA", "PERSON, NEW"]);
    a.w.eval(`window.fetch=async()=>({ok:true,status:200,text:async()=>"Name\\nDiaz, Ana\\nNew Person\\nLee, Sam\\n"})`);
    await go(a, "org");
    a.$("#osSyncUrl").value = "http://insecure.example/x.csv"; await click(a, "#osSyncGo");
    assert.match(a.$("#osSync").textContent, /https/, "plain http is refused");
    a.$("#osSyncUrl").value = "https://example.org/roster.csv"; await click(a, "#osSyncGo");
    assert.match(a.$("#osSync").textContent, /1 to add/); assert.match(a.$("#osSync").textContent, /1 not in the file/);
    assert.match(a.$("#osSync").textContent, /removal is off/);
    await click(a, "#osSyncApply");
    const names = JSON.parse(JSON.stringify(a.w.eval(`S.roster.map(m=>m.name)`)));
    assert.ok(names.includes("PERSON, NEW"), "new person added"); assert.ok(names.includes("KIM, JO"), "not removed while removal is off");
    a.$("#osSyncUrl").value = "https://example.org/roster.csv"; a.$("#osSyncDrop").checked = true; await click(a, "#osSyncGo"); await click(a, "#osSyncApply");
    assert.ok(!JSON.parse(JSON.stringify(a.w.eval(`S.roster.map(m=>m.name)`))).includes("KIM, JO"), "removed once switched on");
    a.w.eval(`window.fetch=async()=>({ok:true,status:200,text:async()=>"Nothing here"})`); await click(a, "#osSyncGo");
    assert.match(a.$("#osSync").textContent, /No people found/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("Event webhook: a closed drill and a test post JSON to the link; http links are refused", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(leader); const sent = [];
    a.w.eval(`window.__sent=[];window.fetch=async(u,i)=>{window.__sent.push({u,b:i&&i.body});return{ok:true,status:200,text:async()=>""}}`);
    await go(a, "org");
    a.$("#osHookUrl").value = "http://nope.example"; await click(a, "#osHookSave");
    assert.equal(a.w.eval(`S.os.hook.url`), "", "http refused");
    a.$("#osHookUrl").value = "https://hooks.example.org/catch/1"; await click(a, "#osHookSave");
    await click(a, "#osHookTest");
    let s = JSON.parse(JSON.stringify(a.w.eval(`window.__sent`)));
    assert.equal(s.length, 1); assert.equal(JSON.parse(s[0].b).event, "test"); assert.equal(JSON.parse(s[0].b).team, "RIVERSIDE");
    a.w.eval(`S.drills=[{id:"d2",t:Date.now()-6e4,end:Date.now(),kind:"drill",n:3,ok:2,help:0,miss:["KIM, JO"],missN:1,type:"fire",all:null,first:2000}];document.body.insertAdjacentHTML("beforeend",'<button id="rcClose">x</button>')`);
    await click(a, "#rcClose"); await sleep(250);
    s = JSON.parse(JSON.stringify(a.w.eval(`window.__sent`)));
    const m = s.map(x => JSON.parse(x.b)).find(x => x.event === "muster.completed");
    assert.ok(m, "muster.completed sent"); assert.equal(m.accounted, 2); assert.equal(m.expected, 3); assert.deepEqual(m.missing, ["KIM, JO"]); assert.equal(m.type, "fire");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("Safety > Plan: a planned drill shows, covers a shortfall, makes a calendar file; tabs carry blue dots", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(leader + `S.sf={tab:"plan",rule:"TX"};save()`);
    await go(a, "safety"); await sleep(500);
    assert.ok(a.$("[data-sf-tab='plan'] .newdot"), "dot on the Plan tab"); assert.ok(a.$("[data-sf-tab='reunite'] .newdot")); assert.ok(a.$("[data-sf-tab='quiet'] .newdot"));
    const d = new Date(Date.now() + 864e5 * 3), k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    a.$("#osPlD").value = k; a.$("#osPlT").value = "secure"; await click(a, "#osPlAdd");
    assert.match(a.$("#osPlan").textContent, /Secure drill|Secure/, "listed");
    const risk = JSON.parse(JSON.stringify(a.w.eval(`orgSuite.atRisk()`)));
    const sec = risk.find(r => r.l === "Secure"); assert.ok(sec && sec.sched === 1 && sec.short === 0, "the Secure drill is planned");
    const lock = risk.find(r => r.l === "Lockdown"); assert.ok(lock && lock.short === 2, "lockdown still short");
    assert.match(a.w.eval(`osPlanIcs()`), /BEGIN:VEVENT[\s\S]*SUMMARY:Secure drill/);
    await click(a, "[data-os-pdone]"); assert.match(a.$("#osPlan").textContent, /Done/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("Safety > Reunite: release needs the ID check, then logs to the reunification log; undo works", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(leader + `S.sf={tab:"reunite"};save()`);
    await go(a, "safety");
    const pick = a.$("#osRPick"); pick.value = "a"; pick.dispatchEvent(new a.w.Event("change", { bubbles: true })); await sleep(60);
    a.$("#osGN").value = "Priya Diaz"; a.$("#osGR").value = "Mother"; await click(a, "#osGAdd");
    assert.match(a.$("#osReun").textContent, /Priya Diaz/);
    await click(a, "[data-os-grel]");
    assert.equal(a.w.eval(`S.sf.reun.length`), 0, "no release without the ID check");
    a.$("#osRId").checked = true; await click(a, "[data-os-grel]");
    assert.equal(a.w.eval(`S.sf.reun.length`), 1); assert.match(a.w.eval(`S.sf.reun[0].to`), /Priya Diaz/);
    assert.match(a.$("#osReun").textContent, /Released/);
    await click(a, "#osRUndo"); assert.equal(a.w.eval(`S.os.reun.state.a`), undefined);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("Safety > Quiet: holding sends through the SOS path without a vibration, then shows a plain screen that closes on three taps", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(leader + `S.sf={tab:"quiet"};save();window.__osHold=30;window.__sos=0;window.__vib=0;window.sosSend=async()=>{window.__sos++;navigator.vibrate&&navigator.vibrate(1)};navigator.vibrate=()=>{window.__vib++;return true}`);
    await go(a, "safety");
    const b = a.$("#osHold"); assert.ok(b); b.dispatchEvent(new a.w.Event("pointerdown", { bubbles: true })); await sleep(120);
    assert.equal(a.w.eval(`window.__sos`), 1); assert.equal(a.w.eval(`window.__vib`), 0, "no buzz on the sender's phone");
    assert.ok(a.$("#osDiscScr"), "plain screen shows");
    assert.match(a.$("#osQuiet").textContent, /does not call 911/);
    for (let i = 0; i < 3; i++) a.$("#osDiscX").click();
    assert.equal(a.$("#osDiscScr"), null);
    b.dispatchEvent(new a.w.Event("pointerdown", { bubbles: true })); b.dispatchEvent(new a.w.Event("pointerup", { bubbles: true })); await sleep(120);
    assert.equal(a.w.eval(`window.__sos`), 1, "letting go early sends nothing");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("Home: first-drill checklist (with blue dot) tracks real progress and can be hidden; yearly nudge only for monthly Pro", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(leader + `S.drills=[];save()`);
    await go(a, "board"); await sleep(600);
    const c = a.$("#obCard"); assert.ok(c, "checklist shows for a new team"); assert.match(c.textContent, /2 of 4|3 of 4/);
    assert.ok(a.$("#obCard > b .newdot"), "blue dot");
    const st = JSON.parse(JSON.stringify(a.w.eval(`orgSuite.obSteps().map(s=>[s.k,s.ok])`)));
    assert.deepEqual(st.find(s => s[0] === "drill"), ["drill", false]); assert.deepEqual(st.find(s => s[0] === "add"), ["add", true]);
    assert.equal(a.$("#yrCard"), null, "no yearly nudge off iPhone / without monthly Pro");
    await click(a, "#obHide"); assert.equal(a.$("#obCard"), null); assert.equal(a.w.eval(`S.os.ob.hide`), 1);
    a.w.eval(`S.drills=[{id:"d",t:Date.now(),end:Date.now(),kind:"drill",n:3,ok:3}];S.os.ob.hide=0;S.os.ob.shared=1;save()`);
    assert.ok(a.w.eval(`orgSuite.obSteps().every(s=>s.ok)`), "all four done");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("Share: a friend's ?ref link is remembered once; iPhone bridge hands the headcount to the Live Activity plugin", async () => {
  const a = await openApp({ hash: "ref=abc123", rpc: () => [] });
  try {
    a.w.eval(leader);
    assert.equal(a.w.eval(`S.os&&S.os.refBy`), "abc123");
    a.w.eval(`window.MBN={on:true,platform:"ios",pro:{active:false},MusterActivity:{update:async(o)=>{window.__act=o},end:async()=>{window.__act="end"}}};
      S.rc={open:true,start:Date.now()-5e3,kind:"drill",res:{a:"ok"},ci:{}};`);
    a.w.eval(`osActBeat()`); await sleep(30);
    const o = JSON.parse(JSON.stringify(a.w.eval(`window.__act`))); assert.equal(o.t, 3); assert.equal(o.n, 1); assert.equal(o.unit, "RIVERSIDE");
    a.w.eval(`S.rc.open=false;osActBeat()`); await sleep(30); assert.equal(a.w.eval(`window.__act`), "end");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
