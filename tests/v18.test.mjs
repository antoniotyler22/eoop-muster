// 1.8 features in the real app: drill history, elapsed-time alarms, visitors and contractors in the muster,
// reply-by-text check-in hashes, family "safe" texts for the School template, and spreadsheet paste import.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const OPEN = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";
  S.rc.open=true;S.rc.start=Date.now()-90000;S.rc.rid="rc00000001";S.rc.res={};S.rc.ci={};S.rc.live={key:"read-key-000000000000",ok:true,after:0,un:[]};
  S.roster.slice(0,6).forEach((m,i)=>m.phone="80855501"+String(i).padStart(2,"0"));save();`;

test("drill history: close-out logs the drill, time to everyone and who was missing; exports a log", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(OPEN + `view="recall";render();`);
    const n = a.w.eval("recallPool().length");
    a.w.eval(`recallPool().slice(1).forEach(m=>S.rc.res[m.id]="ok");save();render()`);
    a.$("#rcClose").click();
    await sleep(50);
    const d = a.w.eval("S.drills[0]");
    assert.equal(d.n, n);
    assert.equal(d.ok, n - 1);
    assert.equal(d.missN, 1);
    assert.equal(d.kind, "drill");
    assert.ok(d.end - d.t >= 90000);
    assert.equal(a.w.eval("S.rc.open"), false);
    assert.match(a.$("#main").textContent, /Drill history/);
    assert.match(a.$("#main").textContent, new RegExp(`${n - 1}/${n} accounted for`));
    const csv = a.w.eval("drillCSV()");
    assert.match(csv.split("\r\n")[0], /Seconds to everyone/);
    assert.equal(csv.split("\r\n").length, 2);
  } finally { a.close(); }
});

test("drill history: everyone accounted for records the time, and a real event is labeled", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(OPEN + `view="recall";render();`);
    a.$("[data-dlkind='real']").click();
    a.w.eval(`recallPool().forEach(m=>S.rc.res[m.id]="ok");save();drillBeat()`);
    assert.ok(a.w.eval("S.rc.allAt") > 0, "allAt set");
    a.$("#rcClose").click();
    await sleep(50);
    const d = a.w.eval("S.drills[0]");
    assert.equal(d.kind, "real");
    assert.ok(d.all >= 90000);
  } finally { a.close(); }
});

test("elapsed-time alarm: buzzes with how many are still missing, once per interval", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(OPEN + `S.rc.start=Date.now()-5*60000;view="recall";render();`);
    a.$("[data-dlal='2']").click();
    assert.equal(a.w.eval("S.rcAlarm"), 2);
    assert.equal(a.w.eval("S.rc.beat"), 2, "past alarms are skipped when turned on");
    a.w.eval("S.rc.start=Date.now()-6*60000-1000;save();drillBeat()");
    assert.equal(a.w.eval("S.rc.beat"), 3);
    assert.match(a.doc.body.textContent, /6 min · \d+ still missing/);
  } finally { a.close(); }
});

test("visitors and contractors: typed sign-in, counted in the emergency muster and the headcount text", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(`S.source="mol";S.welcomed=1;S.onb=true;S.leaderMode=true;save();view="visitors";render()`);
    a.$("[data-vsty='Contractor']").click();
    a.$("#vsName").value = "Pat Builder"; a.$("#vsOrg").value = "Acme Electric"; a.$("#vsPh").value = "808-555-0177";
    a.$("#vsIn").click();
    a.$("#vsName").value = "Sam Guest";
    a.$("#vsIn").click();
    const L = JSON.parse(a.w.eval("JSON.stringify(S.vis.map(v=>[v.n,v.ty]))"));
    assert.deepEqual(L, [["Sam Guest", "Visitor"], ["Pat Builder", "Contractor"]]);
    assert.equal(a.w.eval("visitorsByType()"), "1 visitor, 1 contractor");
    a.w.eval(OPEN + `view="recall";render()`);
    assert.match(a.$("#vsEm").textContent, /Visitors and contractors on site: 0 of 2/);
    assert.match(a.w.eval("reportText()"), /VISITORS\/CONTRACTORS ON SITE: 2 \(1 visitor, 1 contractor\) · 0 accounted for/);
    // the server text goes to the contractor with a number, and their reply marks them accounted for
    const tt = a.w.eval("visitorsToText()");
    assert.equal(tt.length, 1);
    const id = tt[0].id;
    const h = await a.w.eval(`SB.h(S.rc.rid,"VIS:${id}")`);
    const hit = await a.w.eval(`ciVisitorHit(new Set(["${h}"]),1,"")`);
    assert.equal(hit, true);
    assert.equal(a.w.eval(`S.vis.find(v=>v.id==="${id}").ok`), "rc00000001");
    assert.equal(await a.w.eval(`ciVisitorHit(new Set(["0000000000000000"]),1,"")`), false);
  } finally { a.close(); }
});

test("text check-in: server texting sends each person with the hashes their reply checks in as", async () => {
  const sent = [];
  const a = await openApp({ rpc: () => null, fn: (n, b) => { if (b && b.ping) return { body: { ok: 1, ready: true } }; sent.push([n, b]); return { body: { ok: 1, sent: (b.ppl || []).length, failed: 0, reply: true } }; } });
  try {
    a.w.eval(OPEN + `S.smsSrv=true;window.proTok=()=>"pro-token-1234567890";view="recall";render()`);
    const btn = a.$("[data-sms-all]");
    assert.ok(btn, "server texting button");
    btn.click();
    await sleep(300);
    const [name, body] = sent.find(([n]) => n === "sms");
    assert.equal(name, "sms");
    assert.equal(body.ppl.length, 6);
    // the hashes are the ones the live check-in matches on
    const m0 = a.w.eval("S.roster[0]");
    const last = await a.w.eval(`SB.h("rc00000001",SB.words(lastOf(S.roster[0]))[0])`);
    const p0 = body.ppl.find((p) => p.to.endsWith("0100"));
    assert.ok(p0.w.includes(last), "last-name hash for " + m0.name);
    assert.equal(a.w.eval("S.rc.smsReply"), true);
    assert.match(a.$("#main").textContent, /reply 1 = OK, 2 = delayed, 3 = need help/);
  } finally { a.close(); }
});

test("a reply recorded by the server checks the right person in", async () => {
  let rows = [];
  const a = await openApp({ rpc: (fn) => (fn === "get_checkins" ? rows : null) });
  try {
    a.w.eval(OPEN + `view="recall";render()`);
    const w = await a.w.eval(`replyWords(S.roster[2])`);
    rows = [{ id: 5, words: w, code: 3, note: "ankle", created_at: new Date().toISOString() }];
    await a.w.eval("livePoll()");
    const ci = a.w.eval("S.rc.ci[S.roster[2].id]");
    assert.equal(ci.c, 3);
    assert.equal(ci.eta, "ankle");
  } finally { a.close(); }
});

test("School template: grades as groups, and family safe texts only for children accounted for", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    const keys = a.w.eval("Object.keys(SG_TPL)");
    assert.equal(keys[keys.indexOf("trip") + 1], "school");
    a.w.eval(`S.tpl="school";S.customV=Object.assign({},SG_TPL.school.v);setMode("custom")||(S.mode="custom");
      SECTIONS.splice(0,SECTIONS.length,...SG_TPL.school.secs.map(x=>x.slice()));S.secs=SECTIONS.map(x=>x.slice());
      S.roster=[{id:"s1",rank:"STUDENT",name:"RIVERA, ANA",sec:"G3",status:"On Hand",phone2:"8085550101"},
        {id:"s2",rank:"STUDENT",name:"RIVERA, LEO",sec:"G1",status:"On Hand",phone:"8085550101"},
        {id:"s3",rank:"STUDENT",name:"LEE, MAX",sec:"G3",status:"On Hand",phone2:"8085550199"},
        {id:"t1",rank:"TEACHER",name:"KAI, JO",sec:"STAF",status:"On Hand",phone:"8085550111"}];` + OPEN.replace(/S\.roster\.slice[^;]*;/, "") + `S.rc.res={s1:"ok",s2:"ok",t1:"ok"};save();view="recall";render()`);
    const p = a.$("#famPanel");
    assert.ok(p, "family panel");
    assert.match(p.textContent, /0 of 2 told/, "staff and children not yet accounted for are left out");
    const link = a.$("[data-famgrp]");
    assert.ok(link);
    assert.match(decodeURIComponent(link.getAttribute("href")), /^sms:\+18085550101,\+18085550101\?&body=.*your child is accounted for and safe as of \d{1,2}:\d\d [AP]M/);
    assert.ok(!/8085550199|8085550111/.test(link.getAttribute("href")));
    link.click();
    await sleep(500);
    assert.match(a.$("#famPanel").textContent, /2 of 2 told/);
    assert.equal(a.w.eval("famShortName(S.roster[0])"), "Ana R.");
  } finally { a.close(); }
});

test("family texts go through the server (Pro) with each child's first name", async () => {
  const sent = [];
  const a = await openApp({ rpc: () => null, fn: (n, b) => { if (b && b.ping) return { body: { ok: 1, ready: true } }; sent.push(b); return { body: { ok: 1, sent: 1, failed: 0 } }; } });
  try {
    a.w.eval(`S.tpl="youth";S.famPlace="North gym doors";S.roster=[{id:"s1",rank:"PLAYER",name:"RIVERA, ANA",sec:SECTIONS[0][0],status:"On Hand",phone:"8085550101"}];`
      + OPEN.replace(/S\.roster\.slice[^;]*;/, "") + `S.famSecs=[SECTIONS[0][0]];S.smsSrv=true;window.proTok=()=>"pro-token-1234567890";S.rc.res={s1:"ok"};save();view="recall";render()`);
    a.$("#famSend").click();
    await sleep(300);
    const b = sent.find((x) => x && x.family);
    assert.deepEqual(b.family, [{ to: "8085550101", n: "Ana R." }]);
    assert.equal(b.place, "North gym doors");
    assert.match(b.at, /^\d{1,2}:\d\d [AP]M$/);
    assert.equal(b.key, "read-key-000000000000");
    assert.match(a.$("#famPanel").textContent, /1 of 1 told/);
  } finally { a.close(); }
});

test("roster paste: spreadsheet rows with a Parent phone column; existing people get missing numbers", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(`S.source="mol";S.welcomed=1;S.onb=true;S.leaderMode=true;S.role="oic";S.roster=[{id:"x1",rank:"STUDENT",name:"LEE, MAX",sec:SECTIONS[0][0],status:"On Hand"}];save();view="data";render()`);
    assert.ok(a.$("#riPanel"));
    a.$("#riPaste").value = "Last\tFirst\tTeam\tParent / Guardian Phone\nRivera\tAna\tRed Team\t(808) 555-0101\nLee\tMax\tRed Team\t808-555-0199";
    a.$("#riGo").click();
    await sleep(300);
    const ana = a.w.eval(`S.roster.find(m=>/RIVERA/.test(m.name))`);
    assert.equal(ana.phone2, "8085550101");
    assert.equal(a.w.eval(`S.roster.find(m=>m.id==="x1").phone2`), "8085550199");
    assert.equal(a.w.eval("S.roster.length"), 2);
    // no header row: one person per line
    const r = await a.w.eval(`rosterPaste("Kai Jo, 808-555-0111")`);
    assert.equal(r.n, 1);
    assert.match(a.w.eval("rosterTemplate()").split("\r\n")[0], /^Name,Title,Team,Phone,/);
  } finally { a.close(); }
});
