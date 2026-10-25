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
    a.w.eval(`S.roster[0].cal=[{id:"c1",d:dkey(new Date(Date.now()+864e5)),tm:"2330",ty:"APPT",ti:"Late duty"}];save()`);
    const late = a.w.icsExport().text.split("BEGIN:VEVENT").find((v) => /Late duty/.test(v));
    const st = late.match(/DTSTART:(\d{8})T(\d{4})/), en = late.match(/DTEND:(\d{8})T(\d{4})/);
    assert.ok(en[1] > st[1] && en[2] === "0030", "11:30 pm event ends 12:30 am the next day");
    a.w.eval(`view="tools";render()`);
    assert.ok(a.$("[data-go='integ']"));
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
    a.w.__crashReport("error", "Bad link https://antoniotyler22.github.io/eoop-muster/#ci=abc&u=1ST%20PLT&to=8085551234 failed", "");
    const last = calls.filter((x) => x[0] === "err_report").at(-1)[1].p_msg;
    assert.ok(!/1ST|8085551234|ci=/.test(last), "link details stripped: " + last);
    for (let i = 0; i < 10; i++) a.w.__crashReport("error", "boom " + i, "");
    assert.equal(calls.filter((x) => x[0] === "err_report").length, 5, "at most 5 per session");
    a.w.eval(`view="data";render()`);
    assert.ok(a.$("#crashTog"));
  } finally { await a.close(); }
});
