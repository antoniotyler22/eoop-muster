// 4.113.0: Plans & add-ons (text credits, Event Pass, compliance log + kits, branding, site license).
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const ROSTER = `S.roster=[{id:"r1",rank:"SGT",name:"RUIZ, AL",sec:"HQ",status:"On Hand"},{id:"r2",rank:"CPL",name:"PARK, DEE",sec:"HQ",status:"On Hand"}]`;
const DRILL = `S.drills=[{id:"d1",t:Date.now()-3600e3,end:Date.now()-3500e3,kind:"drill",n:12,ok:12,good:12,late:0,help:0,vis:0,visOk:0,first:20000,all:95000,miss:[],missN:0,unit:"Maple Elementary"},{id:"d2",t:Date.now()-86400e3*9,end:Date.now()-86400e3*9+60000,kind:"drill",n:12,ok:11,good:10,late:1,help:0,vis:0,visOk:0,first:30000,all:null,miss:["Jo Park"],missN:1,unit:"Maple Elementary"}]`;
async function boot(o = {}, extra = "") {
  const a = await openApp(Object.assign({ rpc: () => [] }, o));
  a.w.eval(`S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";${ROSTER};${extra};save()`);
  return a;
}
// The test browser counts as the web app, which is unlocked. This makes it look like a free iPhone.
const freePhone = (a) => a.w.eval(`window.MBN={on:true,platform:"ios",pro:{active:false}};1`);
const grant = (a, o) => a.w.eval(`(()=>{const e=afBiz.state().ents;const o=${JSON.stringify(o)};for(const k in o)e[k]=o[k];return 1})()`);

test("Plans & add-ons shows from Tools and lists every add-on; iPhone buttons explain instead of buying", async () => {
  const a = await boot();
  try {
    a.w.eval(`view="tools";render()`);
    assert.ok(a.$('[data-go="store"]'), "tile in Tools");
    a.w.eval(`view="store";render()`);
    const t = a.$("#main").textContent;
    for (const w of ["Text credits", "Event Pass", "Compliance pack", "Template kits", "Your branding", "Site license", "Keep it going"]) assert.match(t, new RegExp(w), w);
    assert.match(t, /Emergency muster stays free/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("an Event Pass lifts the team-size limit while it lasts, then it drops back; nobody is removed", async () => {
  const a = await boot();
  try {
    freePhone(a);
    assert.equal(a.w.eval(`afCap()`), 10);
    grant(a, { pass: { q: 1, exp: Date.now() + 3 * 864e5 } });
    assert.equal(a.w.eval(`afCap()`), 200);
    assert.ok(a.w.eval(`afBiz.passLeft()`) > 2 * 864e5);
    grant(a, { pass: { q: 1, exp: Date.now() - 1000 } });
    assert.equal(a.w.eval(`afCap()`), 10);
    assert.equal(a.w.eval(`S.roster.length`), 2);
  } finally { await a.close(); }
});

test("a site license makes the team Org and counts as Pro; a lapsed one doesn't", async () => {
  const a = await boot();
  try {
    freePhone(a);
    assert.equal(a.w.eval(`afTier()`), "free");
    grant(a, { site: { q: 1, exp: Date.now() + 864e5 } });
    assert.equal(a.w.eval(`afTier()`), "org");
    assert.equal(a.w.eval(`proOK()`), true);
    grant(a, { site: { q: 1, exp: Date.now() - 1000 } });
    assert.equal(a.w.eval(`afSiteOn()`), false);
  } finally { await a.close(); }
});

test("redeeming a code asks the server with this team's key and refreshes what the team has", async () => {
  const seen = [];
  const a = await boot({ rpc: (fn, b) => { seen.push([fn, b]); if (fn === "addon_redeem") return "site"; if (fn === "addon_list") return [{ sku: "site", qty: 1, expires_at: null }]; return []; } });
  try {
    a.w.eval(`view="store";render()`);
    a.$("#abCode").value = "ab12-cd34"; a.$("#abCode").dispatchEvent(new a.w.Event("input", { bubbles: true }));
    a.$('[data-aopen="redeem"]').click(); await sleep(80);
    const r = seen.find((x) => x[0] === "addon_redeem");
    assert.ok(r && /^[0-9a-f]{48}$/.test(r[1].p_tok) && r[1].p_code === "ab12-cd34");
    assert.equal(a.w.eval(`afSiteOn()`), true);
    assert.match(a.$("#main").textContent, /Active/);
  } finally { await a.close(); }
});

test("text credits: a send the balance can't cover is stopped before it goes out; a covered one is counted after", async () => {
  const spent = [];
  const a = await boot({ rpc: (fn, b) => { if (fn === "addon_spend") { spent.push(b); return 2; } return []; }, fn: () => ({ ok: 1 }) }, `SB.credits=true`);
  try {
    grant(a, { credits: { q: 2, exp: 0 } });
    const smsCalls = () => a.calls.filter((c) => /functions\/v1\/sms$/.test(c.url)).length;
    const send = (n) => a.w.eval(`fetch(SB.url+"/functions/v1/sms",{method:"POST",body:JSON.stringify({pro:"x",to:${JSON.stringify(Array.from({ length: n }, (_, i) => "+1555000" + String(1000 + i)))},ppl:[],recall:"abc12345"})}).then(r=>r.status)`);
    assert.equal(await send(5), 402);
    assert.equal(smsCalls(), 0, "nothing was sent");
    assert.equal(await send(2), 200);
    await sleep(60);
    assert.equal(smsCalls(), 1);
    assert.equal(spent.length, 1); assert.equal(spent[0].p_n, 2);
    assert.equal(a.w.eval(`afBiz.bal()`), 2, "balance comes from the server's answer");
  } finally { await a.close(); }
});

test("credits are not counted while SB.credits is off, so today's Pro texting keeps working", async () => {
  const a = await boot({ fn: () => ({ ok: 1 }) });
  try {
    const st = await a.w.eval(`fetch(SB.url+"/functions/v1/sms",{method:"POST",body:JSON.stringify({pro:"x",to:["+15550001111"],recall:"abc12345"})}).then(r=>r.status)`);
    assert.equal(st, 200);
  } finally { await a.close(); }
});

test("compliance log: kits you don't own can't be used; signing is stored; exports carry the lines and the team name", async () => {
  const a = await boot({}, DRILL);
  try {
    assert.equal(a.w.eval(`afBiz.setNote("d1","school",{"Drill type":"Fire"},"Ms. Cruz")`), false, "kit not bought");
    grant(a, { compliance: { q: 1, exp: Date.now() + 864e5 }, kit_school: { q: 1, exp: 0 } });
    a.w.eval(`afBiz.state().brand={name:"Maple Elementary",color:"#aa3300"}`);
    grant(a, { brand: { q: 1, exp: Date.now() + 864e5 } });
    assert.equal(a.w.eval(`afBiz.setNote("d1","school",{"Drill type":"Fire","Route or zone":"North lot","All-clear given by":"Principal"},"Ms. Cruz, Principal")`), true);
    const csv = a.w.eval(`afBiz.logCSV()`);
    assert.match(csv, /Accounted for/); assert.match(csv, /School safety/); assert.match(csv, /Route or zone: North lot/); assert.match(csv, /Ms\. Cruz, Principal/); assert.match(csv, /Jo Park/);
    const html = a.w.eval(`afBiz.logHTML()`);
    assert.match(html, /Maple Elementary/); assert.match(html, /#aa3300/); assert.match(html, /North lot/); assert.match(html, /class="sig"/);
    a.w.eval(`view="store";afBiz.state();render()`);
    a.$('[data-aopen="comp"]').click(); await sleep(30);
    assert.match(a.$("#main").textContent, /Drill log/);
    assert.match(a.$("#main").textContent, /Not signed yet/);
    assert.match(a.$("#main").textContent, /signed Ms\. Cruz/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("a note can't be saved for an unsigned drill list that no longer has it; old notes are tidied", async () => {
  const a = await boot({}, DRILL);
  try {
    grant(a, { compliance: { q: 1, exp: Date.now() + 864e5 } });
    assert.equal(a.w.eval(`afBiz.setNote("d1","basic",{"What was practiced":"Fire"},"A")`), true);
    a.w.eval(`S.drills=S.drills.filter(d=>d.id!=="d1")`);
    a.w.eval(`afBiz.setNote("d2","basic",{},"B")`);
    assert.deepEqual([...a.w.eval(`Object.keys(afBiz.state().notes)`)], ["d2"]);
  } finally { await a.close(); }
});

test("branding colors the app only while the add-on is active", async () => {
  const a = await boot();
  try {
    a.w.eval(`afBiz.state().brand={color:"#aa3300"}`);
    assert.equal(a.w.eval(`document.documentElement.style.getPropertyValue("--brass")`), "");
    grant(a, { brand: { q: 1, exp: Date.now() + 864e5 } });
    a.w.eval(`view="store";render()`);
    a.$("#abColor").value = "#112233"; a.$("#abColor").dispatchEvent(new a.w.Event("input", { bubbles: true }));
    assert.equal(a.w.eval(`document.documentElement.style.getPropertyValue("--brass")`), "#112233");
    grant(a, { brand: { q: 1, exp: Date.now() - 5 } });
    a.w.eval(`afBiz.refresh()`); await sleep(40);
  } finally { await a.close(); }
});

test("add-on state stays on the phone (not synced to the team) and the key is never in the shared state", async () => {
  const a = await boot();
  try {
    a.w.eval(`afBiz.state().ents.credits={q:5,exp:0}`);
    assert.equal(a.w.eval(`syncObj().biz`), undefined);
    assert.ok(!JSON.stringify(a.w.eval(`syncObj()`)).includes(a.w.eval(`afBiz.tok()`)));
  } finally { await a.close(); }
});

test("drill plan: yearly goal counts drills (not real events), scheduled drills go overdue, then done when one is run", async () => {
  const a = await boot();
  try {
    grant(a, { compliance: { q: 1, exp: Date.now() + 864e5 } });
    const now = Date.now(), yr = new Date().getFullYear();
    a.w.eval(`S.drills=[{id:"a",t:new Date(${yr},0,2).getTime(),kind:"drill",n:2,ok:2},{id:"b",t:new Date(${yr},0,3).getTime(),kind:"real",n:2,ok:2},{id:"c",t:new Date(${yr - 1},5,3).getTime(),kind:"drill",n:2,ok:2}];afBiz.state().plan.goal=3;1`);
    assert.equal(a.w.eval(`afBiz.plan.yearDone()`), 1, "only this year's drills, not real events");
    a.w.eval(`afBiz.plan.addSched(${now - 5 * 864e5},"Fire drill");afBiz.plan.addSched(${now + 5 * 864e5},"Lockdown")`);
    assert.equal(a.w.eval(`afBiz.plan.overdue().length`), 1);
    assert.equal(a.w.eval(`afBiz.plan.nextUp().label`), "Lockdown");
    a.w.eval(`view="store";afBiz.state();render();document.querySelector('[data-aopen="comp"]').click()`);
    const t = a.$("#main").textContent;
    assert.match(t, /1 of 3/); assert.match(t, /Overdue/); assert.match(t, /Lockdown/);
    a.w.eval(`S.drills.push({id:"d",t:Date.now()-1000,kind:"drill",n:2,ok:2})`);
    assert.equal(a.w.eval(`afBiz.plan.overdue().length`), 0, "running a drill clears the overdue one");
    assert.equal(a.w.eval(`afBiz.plan.addSched(0,"x")`), false);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
