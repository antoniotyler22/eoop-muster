// 1.3 features, end to end in the real app: PDF report, any-spreadsheet import, missed check-in alerts,
// rally point, integrations, Pro token handling and crash reports.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openApp, sleep, waitFor } from "./harness.mjs";

const has = (bin) => { try { execFileSync("which", [bin], { stdio: "pipe" }); return true; } catch { return false; } };

test("PDF headcount report is a valid PDF with the numbers and who's out", async () => {
  const a = await openApp();
  try {
    const bytes = a.w.headcountPDF();
    const s = Buffer.from(bytes).toString("latin1");
    assert.ok(s.startsWith("%PDF-1.4"));
    // every xref offset points at its object
    const xref = +s.match(/startxref\n(\d+)/)[1];
    const offs = s.slice(xref).split("\n").slice(3).filter((l) => / n $/.test(l)).map((l) => +l.slice(0, 10));
    offs.forEach((o, i) => assert.ok(s.startsWith(`${i + 1} 0 obj`, o), "object " + (i + 1)));
    const f = path.join(os.tmpdir(), "af-report.pdf");
    fs.writeFileSync(f, bytes);
    if (has("qpdf")) execFileSync("qpdf", ["--check", f], { stdio: "pipe" });
    if (has("pdftotext")) {
      const txt = execFileSync("pdftotext", ["-layout", f, "-"], { encoding: "utf8" });
      assert.match(txt, /Headcount report/);
      assert.match(txt, /Present \d+ of \d+/);
      const out = a.w.eval("S.roster.find(m=>m.status==='Leave')");
      if (out) assert.ok(txt.includes(out.name.split(",")[0]), "someone on leave is listed");
    }
    a.w.eval(`view="text";render()`);
    assert.ok(a.$("[data-pdf-report]"), "button on the Send screen");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("any spreadsheet imports: First/Last/Team/Cell, new teams become sections", async () => {
  const a = await openApp();
  try {
    a.w.eval("setMode('civilian');save()");
    const csv = "Volunteer roster,,,\nFirst Name,Last Name,Team,Cell Phone,DOB\nAna,Lopez,Setup,808-555-0101,1990-01-01\nBo,Kim,Setup,(808) 555-0102,\nCy,Park,Food,8085550103,\n";
    const r = a.w.importCSV(csv);
    assert.equal(r.roster.length, 3);
    const ana = r.roster.find((m) => m.name === "LOPEZ, ANA");
    assert.ok(ana); assert.equal(ana.phone, "8085550101");
    assert.ok(!JSON.stringify(r.roster).includes("1990"), "date of birth column is ignored");
    const secs = a.w.eval("SECTIONS.map(s=>s[1])");
    assert.ok(secs.includes("Setup") && secs.includes("Food"), "teams added as sections: " + secs.join(","));
    assert.equal(r.roster.find((m) => m.name === "PARK, CY").sec, a.w.eval("SECTIONS.find(s=>s[1]==='Food')[0]"));
    assert.throws(() => a.w.importCSV("foo,bar\n1,2\n"), /Name column/);
    // the original Marine Corps MOL format still goes through the original importer
    const mol = a.w.importCSV("Rank,Name,Unit,Duty Status\nSGT,SMITH JOHN,CLC-33-HQ,Present\n");
    assert.equal(mol.roster[0].rank, "SGT");
  } finally { await a.close(); }
});

async function openRecall(a, rpc) {
  a.w.eval(`S.rc.open=true;S.rc.start=Date.now();S.rc.rid="rc00000001";S.rc.live={key:"read-key-000000000000",ok:true};S.roster.slice(0,6).forEach((m,i)=>m.phone="80855501"+String(i).padStart(2,"0"));save();view="recall";render()`);
  await sleep(20);
}

test("missed check-in alert: set a deadline, server gets it, missing people listed after", async () => {
  const calls = [];
  const a = await openApp({ rpc: (fn, args) => { calls.push([fn, args]); return null; } });
  try {
    await openRecall(a);
    assert.ok(a.$(".esc-panel"), "deadline panel on a running recall");
    a.$('[data-esc-min="15"]').click();
    await waitFor(() => calls.some((c) => c[0] === "esc_set"));
    const [, args] = calls.find((c) => c[0] === "esc_set");
    assert.equal(args.p_recall, "rc00000001");
    assert.equal(args.p_expected, 6, "expected = people who got the link");
    assert.ok(Math.abs(Date.parse(args.p_due) - Date.now() - 15 * 60000) < 5000);
    // deadline passes with one person checked in
    a.w.eval(`S.rc.ci={[S.roster[0].id]:{c:1}};S.rc.esc.due=Date.now()-1000;save();render()`);
    await sleep(20);
    assert.match(a.$(".esc-panel").textContent, /Deadline passed: 5 not checked in/);
    a.$("[data-esc-clear]").click();
    await waitFor(() => calls.filter((c) => c[0] === "esc_set").length === 2);
    assert.equal(calls.filter((c) => c[0] === "esc_set")[1][1].p_due, null);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("rally point rides in the check-in link; check-in page offers the distance check", async () => {
  const a = await openApp();
  try {
    await openRecall(a);
    a.w.eval(`S.rc.rp={lat:21.4389,lon:-157.7464,r:250};save();render()`);
    assert.ok(a.$(".rp-panel"));
    const link = a.w.ciLink();
    assert.match(link, /&g=21\.4389,-157\.7464,250$/);
  } finally { await a.close(); }
  const b = await openApp({ hash: "ci=abc12345xyz&u=1ST&l=1&g=21.4389,-157.7464,250", noWait: true, geo: { latitude: 21.4391, longitude: -157.7466, accuracy: 10 } });
  try {
    await waitFor(() => b.$("#ciE"));
    const btn = [...b.doc.querySelectorAll("button")].find((x) => /rally point/.test(x.textContent));
    assert.ok(btn, "rally point button");
    btn.click();
    await waitFor(() => b.$("#ciE").value === "AT RP");
  } finally { await b.close(); }
  const c = await openApp({ hash: "ci=abc12345xyz&u=1ST&l=1&g=21.4389,-157.7464,250", noWait: true, geo: { latitude: 21.4500, longitude: -157.7464, accuracy: 10 } });
  try {
    await waitFor(() => c.$("#ciE"));
    [...c.doc.querySelectorAll("button")].find((x) => /rally point/.test(x.textContent)).click();
    await waitFor(() => /KM FROM RP$/.test(c.$("#ciE").value));
  } finally { await c.close(); }
});

test("integrations: Slack link validated, numbers posted through the relay, calendar exports", async () => {
  const fns = [];
  const a = await openApp({ fn: (name, body) => { fns.push([name, body]); return { ok: 1 }; } });
  try {
    a.w.eval(`view="integ";render()`);
    a.$("#intHook").value = "https://evil.example/hook";
    a.$("#intSave").click();
    assert.equal(a.w.eval("(S.integ||{}).hook||''"), "");
    a.$("#intHook").value = "https://hooks.slack.com/services/T000/B000/XXXX";
    a.$("#intSave").click();
    a.$("#intPost").click();
    await waitFor(() => fns.some((f) => f[0] === "relay"));
    const [, body] = fns.find((f) => f[0] === "relay");
    assert.match(body.text, /ON HAND|On Hand|\d+\/\d+/);
    a.w.eval(`S.events.push({id:"e1",name:"Range day",type:"Range",date:dkey(new Date(Date.now()+3*864e5)),secs:SECTIONS.map(s=>s[0]),att:false,done:{}});save()`);
    const ics = a.w.icsExport();
    assert.match(ics.text, /^BEGIN:VCALENDAR\r\n/);
    assert.match(ics.text, /SUMMARY:Range day/);
    assert.ok(ics.text.split("\r\n").every((l) => l.length <= 75), "lines folded");
    a.w.eval(`view="tools";render()`);
    assert.ok(a.$("[data-sgrp='settings']"), "Settings group in Tools");
    a.w.openToolGroup("settings");
    assert.ok(a.$("#sheetOpts [data-go='integ']"), "Integrations inside Settings");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("Pro: team token is added to Ask requests; web gate only when web billing is on", async () => {
  const fns = [];
  const a = await openApp({ fn: (name, body) => { fns.push([name, body]); return name === "pro" ? { active: true, exp: Date.now() + 9e8, source: "stripe" } : { answer: "ok", sources: [] }; } });
  try {
    a.w.localStorage.setItem("af-pro-tok", "f".repeat(64));
    await a.w.fetch(a.w.SB.url + "/functions/v1/ask", { method: "POST", body: JSON.stringify({ q: "test" }) });
    assert.equal(fns.at(-1)[1].pro, "f".repeat(64));
    await a.w.fetch(a.w.SB.url + "/functions/v1/notify", { method: "POST", body: JSON.stringify({ recall: "x" }) });
    assert.equal(fns.at(-1)[1].pro, undefined, "token not sent to other functions");
    assert.equal(a.w.proOK(), true, "web stays unlocked while webBilling is off");
    a.w.SB.webBilling = true;
    a.w.eval("S.proSrv=null");
    assert.equal(a.w.proOK(), false);
    a.w.eval(`S.proSrv={on:true,exp:Date.now()+864e5}`);
    assert.equal(a.w.proOK(), true);
    a.w.eval(`S.proSrv=null;openPro("ask")`);
    assert.ok(a.$("[data-pro-web='yearly']"), "Stripe plans on the web");
  } finally { await a.close(); }
});

test("crash reports: errors are sent scrubbed, at most 5, and can be turned off", async () => {
  const calls = [];
  const a = await openApp({ rpc: (fn, args) => { calls.push([fn, args]); return null; } });
  try {
    a.w.__crashReport("error", 'Cannot read "SGT SMITH" of undefined', "at x (https://antoniotyler22.github.io/eoop-muster/app.bundle.js?v=4.1.0:10:5)");
    const c = calls.find((x) => x[0] === "err_report");
    assert.ok(c);
    assert.ok(!c[1].p_msg.includes("SMITH"), "quoted text removed");
    assert.match(c[1].p_stack, /app\.bundle\.js/);
    assert.ok(!c[1].p_stack.includes("github.io"));
    for (let i = 0; i < 10; i++) a.w.__crashReport("error", "boom " + i, "");
    assert.equal(calls.filter((x) => x[0] === "err_report").length, 5);
    a.w.eval(`view="data";render()`);
    assert.ok(a.$("#crashTog"));
  } finally { await a.close(); }
});

test("green dots mark what's new, and each goes away once it's opened", async () => {
  const a = await openApp();
  try {
    a.w.eval(`view="tools";render()`);
    assert.ok(a.$("[data-sgrp='settings'] .newdot"), "Settings group shows a green dot");
    a.w.openToolGroup("settings");
    a.w.__newDots.paint();
    const dot = () => a.$("#sheetOpts [data-go='integ'] .newdot");
    assert.ok(dot(), "Integrations has a green dot");
    a.$("#sheetOpts [data-go='integ']").click();
    assert.equal(a.w.eval("S.newSeen.integ"), 1, "remembered as seen");
    a.w.eval(`view="tools";render()`);
    a.w.openToolGroup("settings");
    a.w.__newDots.paint();
    assert.equal(dot(), null, "no dot after it was opened");
    a.w.openToolGroup("reports");
    a.w.__newDots.paint();
    assert.ok(a.$("#sheetOpts [data-pdf-report] .newdot"), "others still marked");
    a.w.eval(`S.newFrom=Date.now()-46*864e5;view="tools";render()`);
    a.w.eval("closeSheet()");await sleep(300);a.w.eval(`document.getElementById("sheetOpts").innerHTML=""`);
    a.w.__newDots.paint();
    assert.equal(a.$(".newdot"), null, "all dots retire after 45 days");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("clearing things off: due-outs, leave alerts, departed people and the calendar", async () => {
  const a = await openApp();
  try {
    const w = a.w;
    // due-outs: one overdue item for two people
    w.eval(`S.source="mol";const it=readyItems()[0].n;S.roster.slice(0,2).forEach(m=>{m.due=m.due||{};m.due[it]={due:"2020-01-01",done:""}});save()`);
    const it = w.eval("readyItems()[0].n");
    const over = () => w.eval(`readySum().over`);
    const before = over();
    assert.ok(before >= 2);
    w.eval(`view="ready";render()`);
    const m0 = w.eval("S.roster[0].id"), m1 = w.eval("S.roster[1].id");
    a.$(`[data-dueack="${m0}"]`).click();
    assert.equal(over(), before - 1, "acknowledged item drops off the overdue count");
    assert.match(w.eval(`dueState(S.roster[0],readyItems()[0]).txt`), /Acknowledged/);
    a.$(`[data-duedel="${m1}"]`).click();
    a.$(`[data-duedel="${m1}"]`).click();
    assert.equal(w.eval(`!!(S.roster[1].due||{})[${JSON.stringify(it)}]`), false, "deleted after two taps");
    assert.equal(over(), before - 2);
    // a new due date brings it back
    w.eval(`S.roster[0].due[readyItems()[0].n].due="2020-02-01";save()`);
    assert.equal(over(), before - 1);

    // leave: past the end date → Back ✓ sets On Hand and the rest of the leave comes off the calendar
    w.eval(`const m=S.roster[2];m.status="Leave";m.start="01 JAN 20";m.end="05 JAN 20";m.cal=[{id:"cL",d:dkey(new Date(Date.now()-3*864e5)),end:dkey(new Date(Date.now()+5*864e5)),ty:"LEAVE",ti:"Leave"}];save();view="alerts";render()`);
    const m2 = w.eval("S.roster[2].id");
    assert.ok(w.eval("alerts().over.some(a=>a.m.id===S.roster[2].id)"));
    a.$(`[data-alback="${m2}"]`).click();
    assert.equal(w.eval("S.roster[2].status"), "On Hand");
    assert.ok(!w.eval("alerts().over.some(a=>a.m.id===S.roster[2].id)"), "falls off overdue");
    assert.ok(w.eval("S.roster[2].cal[0].end < dkey()"), "rest of the leave trimmed off the calendar");

    // departing: hide, then take off the numbers (with undo kept)
    w.eval(`const m=S.roster[3];m.edd=fmtD(dkey(new Date(Date.now()+10*864e5)));save();view="alerts";render()`);
    const m3 = w.eval("S.roster[3].id"), n0 = w.eval("S.roster.length");
    a.$(`[data-algone="${m3}"]`).click();
    a.$(`[data-algone="${m3}"]`).click();
    assert.equal(w.eval("S.roster.length"), n0 - 1, "departed person removed");
    assert.equal(w.eval("S.loads[0].kind"), "Departed", "undo entry kept");

    // calendar: own entry done → drops off; automatic entry hidden → drops off
    const day = w.eval("dkey()");
    w.eval(`S.roster[4].cal=[{id:"cA",d:dkey(),ty:"APPT",ti:"Dental"}];S.roster[4].edd=fmtD(dkey());save();calDay=dkey();calSec="ALL";view="cal";render()`);
    const count = (ti) => w.eval(`calEntries(dkey(),dkey(),"ALL").filter(e=>e.ti===${JSON.stringify(ti)}&&e.m&&e.m.id===S.roster[4].id).length`);
    assert.equal(count("Dental"), 1);
    a.$("[data-cxdone]").click();
    assert.equal(count("Dental"), 0, "done entry drops off");
    assert.equal(count("EDD"), 1);
    w.eval(`view="cal";render()`);
    const hb = [...a.w.document.querySelectorAll("[data-cxhide]")].find((b) => b.closest(".rrow").textContent.includes("EDD"));
    hb.click();
    assert.equal(count("EDD"), 0, "hidden automatic entry drops off");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("mistakes can be undone: unhide, undo Back, undo Done, and delete at the source", async () => {
  const a = await openApp();
  try {
    const w = a.w;
    w.eval(`S.source="mol";const m=S.roster[2];m.status="Leave";m.start="01 JAN 20";m.end="05 JAN 20";m.cal=[{id:"cL",d:"2019-12-30",end:dkey(new Date(Date.now()+5*864e5)),ty:"LEAVE",ti:"Leave"}];S.roster[3].edd=fmtD(dkey(new Date(Date.now()+10*864e5)));save();view="alerts";render()`);
    const id2 = w.eval("S.roster[2].id"), id3 = w.eval("S.roster[3].id");
    const inOver = () => w.eval(`alerts().over.some(a=>a.m.id===${JSON.stringify(id2)})`);
    // hide → unhide
    a.$(`[data-alhide^="${id2}|over"]`).click();
    assert.equal(inOver(), false);
    w.eval(`view="alerts";render()`);
    a.$(`[data-unhide^="al:${id2}"]`).click();
    assert.equal(inOver(), true, "unhidden alert is back");
    // Back ✓ → Undo restores status, dates and calendar
    a.$(`[data-alback="${id2}"]`).click();
    assert.equal(w.eval("S.roster[2].status"), "On Hand");
    a.$("[data-unback]").click();
    assert.equal(w.eval("S.roster[2].status"), "Leave");
    assert.equal(w.eval("S.roster[2].end"), "05 JAN 20");
    assert.ok(w.eval("S.roster[2].cal[0].end > dkey()"), "calendar restored");
    // hidden departing alert → Delete date removes the EDD for good
    a.$(`[data-alhide^="${id3}|dep"]`).click();
    w.eval(`view="alerts";render()`);
    a.$(`[data-hdel^="al:${id3}"]`).click(); a.$(`[data-hdel^="al:${id3}"]`).click();
    assert.equal(w.eval("S.roster[3].edd"), undefined);

    // readiness: acknowledged → Unhide
    w.eval(`const it=readyItems()[0].n;S.roster[0].due={};S.roster[0].due[it]={due:"2020-01-01",done:"",ack:"2020-01-01"};save();view="ready";render()`);
    assert.equal(w.eval("dueState(S.roster[0],readyItems()[0]).st"), "ack");
    a.$("[data-unack]").click();
    assert.equal(w.eval("dueState(S.roster[0],readyItems()[0]).st"), "over");

    // calendar: done → Undo; automatic EDD added by mistake → ✕ deletes it at the source
    w.eval(`S.roster[4].cal=[{id:"cA",d:dkey(),ty:"APPT",ti:"Dental",done:1}];S.roster[4].edd=fmtD(dkey());save();calDay=dkey();calSec="ALL";view="cal";render()`);
    a.$("[data-undone]").click();
    assert.equal(w.eval("!!S.roster[4].cal[0].done"), false);
    w.eval(`view="cal";render()`);
    const del = () => [...w.document.querySelectorAll("[data-cxdel]")].find((b) => b.closest(".rrow").textContent.includes("EDD"));
    del().click(); del().click();
    assert.equal(w.eval("S.roster[4].edd"), undefined, "EDD deleted at the source");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
