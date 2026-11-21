// Pro Safety suite: drill rules + report, tap-in poster, check-in timer, response actions, data settings.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const setup = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";
  S.roster=[{id:"r1",rank:"SGT",name:"RUIZ, AL",sec:"HQ",status:"On Hand"},{id:"r2",rank:"CPL",name:"PARK, DEE",sec:"HQ",status:"On Hand"}];`;

test("Safety is a Pro screen: walled when Pro is off, open when on", async () => {
  const a = await openApp();
  try {
    a.w.eval(setup + `window.MBN={on:true,platform:"ios",pro:{active:false},LN:{schedule(){},cancel(){}}};view="safety";render()`);
    assert.match(a.$("#main").textContent, /Safety suite/);
    assert.ok(a.$(".pro-wall"), "wall shown");
    a.w.eval(`window.MBN.pro={active:true,exp:Date.now()+864e5};render()`);
    assert.ok(!a.$(".pro-wall"));
    assert.match(a.$("#main").textContent, /Drill rules/);
    assert.equal(a.errors.length, 0, a.errors.join("\n"));
  } finally { await a.close(); }
});

test("Drill rules: Michigan progress counts tagged drills this school year; PDF and website text build", async () => {
  const a = await openApp();
  try {
    a.w.eval(setup + `const now=Date.now();S.drills=[
      {id:"d1",t:now-864e5,end:now-864e5+3e5,kind:"drill",n:2,ok:2,all:222000,missN:0,type:"fire"},
      {id:"d2",t:now-2*864e5,end:now,kind:"drill",n:2,ok:2,all:180000,missN:0,type:"lockdown"},
      {id:"d3",t:now-3*864e5,end:now,kind:"real",n:2,ok:2,type:"fire"}];
      S.sf={rule:"MI"};view="safety";render()`);
    const P = a.w.eval(`JSON.stringify(proSafety.progress().map(p=>[p.k,p.got,p.n]))`);
    assert.equal(P, JSON.stringify([["fire", 1, 5], ["tornado", 0, 2], ["sec", 1, 3]]), "real events and other types are not counted wrongly");
    assert.match(a.$("#main").textContent, /1 of 5/);
    a.$('[data-sf-tag="d1|tornado"]').click();
    assert.equal(a.w.eval(`S.drills[0].type`), "tornado");
    const bytes = a.w.eval(`proSafety.reportPDF()`);
    assert.equal(String.fromCharCode(...bytes.slice(0, 5)), "%PDF-");
    assert.match(a.w.eval(`proSafety.webText()`), /Drill type: Lockdown/);
    a.w.eval(`S.sf.rule="TX";render()`);
    assert.match(a.$("#main").textContent, /Texas|19 TAC/);
    assert.equal(a.errors.length, 0, a.errors.join("\n"));
  } finally { await a.close(); }
});

test("Closing a check-in tags the drill with the type chosen on the Safety screen", async () => {
  const a = await openApp();
  try {
    a.w.eval(setup + `S.sf={dtype:"tornado"};S.drills=[{id:"x",t:Date.now()-1000,end:Date.now(),kind:"drill",n:2,ok:2}];S.rc.open=true;view="safety";render()`);
    const b = a.doc.createElement("button"); b.id = "rcClose"; a.doc.body.appendChild(b); b.click();
    await sleep(120);
    assert.equal(a.w.eval(`S.drills[0].type`), "tornado");
  } finally { await a.close(); }
});

test("Tap-in: a poster PDF with a QR is built for a point while a check-in is open", async () => {
  const a = await openApp();
  try {
    a.w.eval(setup + `S.rc.open=true;S.rc.start=Date.now();S.rc.rid="abc123";S.sf={tab:"tapin",pts:["Assembly Point B"]};view="safety";render()`);
    assert.match(a.$("#main").textContent, /Assembly Point B/);
    const bytes = await a.w.eval(`proSafety.posterPDF("Assembly Point B")`);
    const s = String.fromCharCode(...bytes);
    assert.ok(s.startsWith("%PDF-") && s.includes("Scan to check in") && /re f/.test(s));
    assert.equal(a.errors.length, 0, a.errors.join("\n"));
  } finally { await a.close(); }
});

test("Check-in timer: starts, resets on OK, escalates in stages, and the team alert goes to Word of Mouth", async () => {
  const posts = [];
  const a = await openApp({ rpc: (fn, b) => { if (fn === "feed_post") { posts.push(b); return 70; } return []; } });
  try {
    a.w.eval(setup + `S.feeds=[{id:"feedabcdef12",lk:"l".repeat(30),mk:"m".repeat(30),ek:"x",unit:"1ST",main:true,posts:[],acks:{},mine:{},pins:[]}];fdEnc=async(k,o)=>JSON.stringify(o);S.sf={tab:"alone"};view="safety";render()`);
    a.$('[data-sf-al="15"]').click();
    assert.equal(a.w.eval(`S.sf.al.on`), true);
    assert.ok(a.$("#sfClock"));
    a.$("#sfOK").click();
    assert.equal(a.w.eval(`S.sf.al.st`), 0);
    a.w.eval(`S.sf.al.due=Date.now()-30000`); await a.w.eval(`proSafety.alTick()`);
    assert.equal(a.w.eval(`S.sf.al.st`), 1, "reminder stage");
    a.w.eval(`S.sf.al.due=Date.now()-310000`); await a.w.eval(`proSafety.alTick()`); await sleep(80);
    assert.equal(a.w.eval(`S.sf.al.st`), 3, "team alert stage");
    assert.equal(posts.length, 1, "one urgent post");
    a.$("#sfStop").click();
    assert.equal(a.w.eval(`S.sf.al.on`), false);
  } finally { await a.close(); }
});

test("Response actions need a second tap, post urgently, set the state, and All clear ends it; reunification log records releases", async () => {
  const posts = [];
  const a = await openApp({ rpc: (fn, b) => { if (fn === "feed_post") { posts.push(b); return 71; } return []; } });
  try {
    a.w.eval(setup + `S.feeds=[{id:"feedabcdef12",lk:"l".repeat(30),mk:"m".repeat(30),ek:"x",unit:"1ST",main:true,posts:[],acks:{},mine:{},pins:[]}];fdEnc=async(k,o)=>JSON.stringify(o);S.sf={tab:"actions"};view="safety";render()`);
    a.$('[data-sf-act="lockdown"]').click();
    assert.equal(posts.length, 0, "first tap only arms it");
    a.$('[data-sf-act="lockdown"]').click(); await sleep(120);
    assert.equal(posts.length, 1);
    assert.equal(a.w.eval(`S.sf.act.k`), "lockdown");
    assert.match(a.$("#main").textContent, /Lockdown is on/);
    a.$('[data-sf-act="clear"]').click(); a.$('[data-sf-act="clear"]').click(); await sleep(120);
    assert.equal(a.w.eval(`S.sf.act`), null);
    a.$("#sfRWho").value = "Maya R."; a.$("#sfRTo").value = "Parent"; a.$("#sfRAdd").click();
    assert.equal(a.w.eval(`S.sf.reun.length`), 1);
    assert.match(a.$("#main").textContent, /Maya R\./);
  } finally { await a.close(); }
});

test("Data settings: retention prunes old records and delete wipes them after a second tap", async () => {
  const a = await openApp();
  try {
    a.w.eval(setup + `const old=Date.now()-400*864e5;S.drills=[{id:"o",t:old,end:old,kind:"drill",n:1,ok:1},{id:"n",t:Date.now(),end:Date.now(),kind:"drill",n:1,ok:1}];
      S.sf={tab:"org",reun:[{t:old,who:"A",to:"B",id:true}]};view="safety";render()`);
    a.$('[data-sf-keep="12"]').click();
    assert.equal(a.w.eval(`S.drills.length`), 1);
    assert.equal(a.w.eval(`S.sf.reun.length`), 0);
    assert.match(a.$("#main").innerHTML, /mailto:administration@accountedforteam\.com/);
    a.$("#sfWipe").click(); assert.equal(a.w.eval(`S.drills.length`), 1, "first tap arms");
    a.$("#sfWipe").click(); assert.equal(a.w.eval(`S.drills.length`), 0);
  } finally { await a.close(); }
});

test("Timer tells the server when the next check-in is due and clears it on OK-stop and on its own team alert", async () => {
  const calls = [];
  const a = await openApp({ rpc: (fn, b) => { if (fn === "lone_set") { calls.push(b); return null; } if (fn === "feed_post") return 90; return []; } });
  try {
    a.w.eval(setup + `S.feeds=[{id:"feedabcdef12",lk:"l".repeat(30),mk:"m".repeat(30),ek:"x",unit:"1ST",main:true,posts:[],acks:{},mine:{},pins:[]}];fdEnc=async(k,o)=>JSON.stringify(o);S.sf={tab:"alone"};view="safety";render()`);
    a.$('[data-sf-al="30"]').click(); await sleep(120);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].p_feed, "feedabcdef12");
    assert.equal(calls[0].p_mk, "m".repeat(30));
    assert.match(calls[0].p_dev, /^[a-z0-9]{8,40}$/);
    assert.ok(new Date(calls[0].p_due).getTime() > Date.now() + 29 * 60000);
    assert.equal(a.w.eval(`S.sf.al.srv`), true);
    a.$("#sfOK").click(); await sleep(80);
    assert.equal(calls.length, 2, "OK moves the due time");
    a.w.eval(`S.sf.al.due=Date.now()-310000`); await a.w.eval(`proSafety.alTick()`); await sleep(150);
    assert.equal(calls.at(-1).p_due, null, "own team alert clears the server copy");
    a.$("#sfStop") && a.$("#sfStop").click(); await sleep(80);
    assert.equal(calls.at(-1).p_due, null);
  } finally { await a.close(); }
});
