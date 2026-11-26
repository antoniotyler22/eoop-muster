// 4.148.0: alert chain, NFC tags, guardian at the gate, reconciliation PDF, pause location, Siri and Shortcuts.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const setup = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";
  S.roster=[{id:"r1",rank:"SGT",name:"RUIZ, AL",sec:"HQ",status:"On Hand"},{id:"r2",rank:"CPL",name:"PARK, DEE",sec:"HQ",status:"On Hand"},{id:"r3",rank:"LCPL",name:"LEE, JO",sec:"HQ",status:"On Hand"}];
  window.MBN={on:true,platform:"ios",pro:{active:true,exp:Date.now()+864e5},LN:{schedule(){},cancel(){}}};`;
const openRecall = (min) => `S.rc.open=true;S.rc.rid="rid1";S.rc.start=Date.now()-40*60000;S.rc.ci={};S.rc.res={};S.rc.esc={due:Date.now()-${min}*60000}`;

test("Alert chain: steps fire in order after the deadline, Twilio steps are skipped honestly, I've got it stops it", async () => {
  const a = await openApp();
  try {
    a.w.eval(setup + openRecall(3) + `;save();view="safety";S.sf=S.sf||{};S.sf.tab="chain";render()`);
    assert.match(a.$("#main").textContent, /MISSED CHECK-IN/);
    assert.match(a.$("#main").textContent, /3 not checked in/);
    await a.w.eval(`spChainTick()`); await sleep(50);
    let st = JSON.parse(a.w.eval(`JSON.stringify(spChainState().steps.map(s=>[s.k,s.s]))`));
    assert.deepEqual(st.map((x) => x[0]), ["push", "text", "call", "leader", "oic"]);
    assert.equal(st[0][1], "live", "push fired at the deadline");
    assert.equal(st[1][1], "skip", "text needs Twilio (no Pro token or text server here)");
    assert.equal(st[2][1], "wait", "the call is 5 min after the deadline, not yet");
    // 20 minutes after: every later step is due
    a.w.eval(`S.rc.esc.due=Date.now()-20*60000`);
    await a.w.eval(`spChainTick()`); await sleep(50);
    assert.equal(a.w.eval(`Object.keys(S.sf.chain.red).length`), 3, "the three missing show red");
    // someone says "I've got it": nothing more fires and the screen says so
    a.w.eval(`S.sf.chain.fired={};S.sf.chain.red={};S.rc.esc.due=Date.now()-1000;render()`);
    a.$("#spAck").click(); await sleep(30);
    assert.ok(a.w.eval(`S.sf.chain.ack["rid1"]>0`));
    a.w.eval(`S.rc.esc.due=Date.now()-30*60000`);
    await a.w.eval(`spChainTick()`); await sleep(50);
    assert.equal(a.w.eval(`Object.keys(S.sf.chain.fired).length`), 0, "stopped chain fires nothing");
    assert.equal(a.errors.length, 0, a.errors.join("\n"));
  } finally { await a.close(); }
});

test("Alert chain: nobody missing means nothing fires; timing can be edited and a step turned off", async () => {
  const a = await openApp();
  try {
    a.w.eval(setup + openRecall(10) + `;S.rc.res={r1:"ok",r2:"ok",r3:"ok"};save();view="safety";S.sf=S.sf||{};S.sf.tab="chain";render()`);
    await a.w.eval(`spChainTick()`); await sleep(30);
    assert.equal(a.w.eval(`Object.keys((S.sf.chain||{}).fired||{}).length`), 0);
    const sel = a.$('[data-sp-sm="1"]'); sel.value = "10"; sel.dispatchEvent(new a.w.Event("change", { bubbles: true }));
    assert.equal(a.w.eval(`S.sf.chain.steps[1].m`), 10);
    const on = a.$('[data-sp-son="0"]'); on.checked = false; on.dispatchEvent(new a.w.Event("change", { bubbles: true }));
    assert.equal(a.w.eval(`S.sf.chain.steps[0].on`), false);
    assert.equal(a.errors.length, 0, a.errors.join("\n"));
  } finally { await a.close(); }
});

test("NFC tag: a Tag button per muster point opens the daily and muster links", async () => {
  const a = await openApp();
  try {
    a.w.eval(setup + `S.sf={tab:"tapin",pts:["Main gate","Bus 3"]};save();view="safety";render()`);
    a.$('[data-sf-nfc="0"]').click(); await sleep(20);
    assert.match(a.$("#spNfc").textContent, /Main gate/);
    assert.match(a.$("#spNfc").textContent, /Start a check-in on Recall first/, "muster tag needs an open check-in");
    assert.equal(a.w.eval(`window.__nfcLink`), undefined);
    a.w.eval(`S.rc.open=true;S.rc.rid="x1";S.sf.nfc=1;render()`);
    assert.ok(a.$('[data-sp-ncopy="m"]') && !a.$('[data-sp-ncopy="m"]').disabled);
    assert.equal(a.errors.length, 0, a.errors.join("\n"));
  } finally { await a.close(); }
});

test("Guardian at the gate: releases to an approved guardian only with the ID check, and logs Not on list", async () => {
  const a = await openApp();
  try {
    a.w.eval(setup + `S.sf={tab:"reunite",reun:[]};S.os={reun:{site:"Gym",state:{r1:{s:"h",t:Date.now()-5000},r2:{s:"h",t:Date.now()}},guard:{r1:[{n:"Dana Ruiz",rel:"Mother"}]},sel:""}};save();view="safety";render()`);
    assert.match(a.$("#spGate").textContent, /RUIZ, AL/);
    assert.match(a.$("#spGate").textContent, /Next at the gate/);
    a.$("[data-sp-grel]").click(); await sleep(20);
    assert.equal(a.w.eval(`S.os.reun.state.r1.s`), "h", "no release without the ID check");
    a.$("#spGId").checked = true; a.$("[data-sp-grel]").click(); await sleep(20);
    assert.equal(a.w.eval(`S.os.reun.state.r1.s`), "r");
    assert.equal(a.w.eval(`S.sf.reun[0].to`), "Dana Ruiz (Mother)");
    // the next person is at the gate: someone not on the list
    a.$("#spGName").value = "Sam Stranger"; a.$("[data-sp-gno]").click(); await sleep(20);
    assert.match(a.w.eval(`S.sf.reun[0].to`), /^REFUSED: Sam Stranger/);
    assert.equal(a.w.eval(`S.os.reun.state.r2.s`), "h", "refusing does not release");
    assert.equal(a.errors.length, 0, a.errors.join("\n"));
  } finally { await a.close(); }
});

test("Drill record keeps a check-in curve and the reconciliation PDF builds", async () => {
  const a = await openApp();
  try {
    a.w.eval(setup + `const t0=Date.now()-6*60000;S.rc.open=true;S.rc.rid="d9";S.rc.start=t0;S.rc.kind="drill";
      S.rc.ci={r1:{t:t0+30000,c:1},r2:{t:t0+150000,c:1},r3:{t:t0+330000,c:1}};S.rc.res={r1:"ok",r2:"ok",r3:"ok"};S.rc.allAt=t0+330000;
      S.sf={tab:"drills",reun:[{t:t0+360000,who:"RUIZ, AL",to:"Dana Ruiz (Mother)",id:true}]};drillRecord();save();view="safety";render()`);
    const d = JSON.parse(a.w.eval(`JSON.stringify(S.drills[0])`));
    assert.equal(d.curve.length, 6);
    assert.equal(d.curve[5], 3, "everyone is in by the end");
    assert.ok(d.curve[0] <= d.curve[2] && d.curve[2] <= d.curve[5], "the curve only goes up");
    const bytes = a.w.eval(`spReconPDF(S.drills[0])`);
    assert.equal(String.fromCharCode(...bytes.slice(0, 5)), "%PDF-");
    const txt = String.fromCharCode(...bytes);
    assert.match(txt, /Drill reconciliation report/);
    assert.match(txt, /Reviewed by/);
    assert.match(txt, /Dana Ruiz/);
    assert.ok(a.$("[data-sf-recon]"), "a Reconciliation PDF button on the drill");
    assert.equal(a.errors.length, 0, a.errors.join("\n"));
  } finally { await a.close(); }
});

test("Pause location: nothing reads location while paused, SOS gets a pass, resume restores it", async () => {
  const a = await openApp({ geo: { latitude: 21.3, longitude: -157.9, accuracy: 5 } });
  try {
    const ask = () => a.w.eval(`new Promise(r=>navigator.geolocation.getCurrentPosition(()=>r("ok"),e=>r("denied:"+e.code),{}))`);
    assert.equal(await ask(), "ok", "location works before pausing");
    a.w.eval(`S.locp={on:true,until:0,sos:true,hrs:8}`);
    assert.equal(await ask(), "denied:1", "paused: denied");
    a.w.eval(`locAllow()`);
    assert.equal(await ask(), "ok", "an SOS pass lets one through");
    a.w.eval(`S.locp.sos=false`);
    await sleep(5); a.w.eval(`window.__x=1`);
    // pass expires or is refused: with emergency off, locAllow does nothing new once the old pass is spent
    a.w.eval(`S.locp={on:true,until:Date.now()-1000,sos:true,hrs:1}`);
    assert.equal(await ask(), "ok", "auto-resume: the pause ended on its own");
    assert.equal(a.w.eval(`S.locp.on`), false);
    a.w.eval(`S.gz={name:"HQ",lat:1,lng:2,r:250};save()`);
    assert.ok(a.w.eval(`locpClear()`) >= 1);
    assert.equal(a.w.eval(`S.gz`), undefined, "history deleted");
    assert.equal(a.errors.length, 0, a.errors.join("\n"));
  } finally { await a.close(); }
});

test("Settings: Privacy has Pause location and Siri & Shortcuts shows the automation link", async () => {
  const a = await openApp();
  try {
    a.w.eval(setup + `view="settings";render()`);
    assert.match(a.$("#main").textContent, /Siri & Shortcuts/);
    a.w.eval(`document.querySelector('[data-sp="legal"]').click()`);
    assert.match(a.$("#main").textContent, /Pause location/);
    a.$('[data-spback="1"]').click();
    a.$('[data-sp="siri"]').click();
    assert.match(a.$("#main").textContent, /accountedfor:\/\/safe\?confirm=1/);
    a.$("#scConfirm").checked = false; a.$("#scConfirm").dispatchEvent(new a.w.Event("change", { bubbles: true }));
    assert.equal(a.w.eval(`scLink()`), "accountedfor://safe");
    assert.equal(a.errors.length, 0, a.errors.join("\n"));
  } finally { await a.close(); }
});
