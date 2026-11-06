// 4.81.0: Licensing (classes, seats, roster drop, waitlist, documents, license stamping, its own calendar).
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const ROSTER = `S.roster=[{id:"r1",rank:"SGT",name:"RUIZ, AL",sec:"HQ",status:"On Hand"},{id:"r2",rank:"CPL",name:"PARK, DEE",sec:"HQ",status:"On Hand"},{id:"r3",rank:"LCPL",name:"HUGHES, COLE",sec:"HQ",status:"On Hand"}]`;
const CLASS = (o = "") => `afLic.state().classes.push(Object.assign({id:"c1",n:"Forklift",d:dkey(),tm:"0800",ins:"r1",insN:"",cap:3,val:36,en:[],ext:[],wl:[],docs:[],done:false},${o||"{}"}))`;
async function boot(extra = "") {
  const a = await openApp();
  a.w.eval(`S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.mods={lic:true};${ROSTER};${extra};save()`);
  return a;
}

test("a roster drop fills the seats, the overflow waitlists, and a freed seat promotes the waitlist", async () => {
  const a = await boot();
  try {
    a.w.eval(`${CLASS()};view="lic";render()`);
    const r = a.w.eval(`afLic.drop(afLic.state().classes[0],"Hughes, Cole\\nSGT Ruiz\\nPark\\nDana Visitor")`);
    assert.equal(r.n, 3); assert.equal(r.w, 1);
    a.w.eval(`render()`);
    assert.match(a.$("#main").textContent, /3 of 3 enrolled/);
    assert.match(a.$("#main").textContent, /Full/);
    a.$('[data-lopen="c1"]').click(); await sleep(30);
    a.$('[data-lrm="c1|i:r1"]').click(); await sleep(30);
    const c = a.w.eval(`afLic.state().classes[0]`);
    assert.equal(c.en.length, 2); assert.deepEqual([...c.ext], ["Dana Visitor"]); assert.equal(c.wl.length, 0);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("spreadsheet paste with a Name column is read by column", async () => {
  const a = await boot();
  try {
    assert.deepEqual([...a.w.eval(`afLic.names("Name\\tUnit\\nHughes, Cole\\tHQ\\nPark, Dee\\tHQ")`)], ["Hughes, Cole", "Park, Dee"]);
    assert.deepEqual([...a.w.eval(`afLic.names("Hughes, Cole\\nPark, Dee")`)], ["Hughes, Cole", "Park, Dee"]);
  } finally { await a.close(); }
});

test("completing a class stamps licenses; expiring ones are listed with Enroll", async () => {
  const a = await boot();
  try {
    a.w.eval(`${CLASS(`{en:["r3","r2"],cap:5}`)};view="lic";render()`);
    a.$('[data-lopen="c1"]').click(); await sleep(30);
    a.$("[data-ldone]").click(); await sleep(30);
    assert.equal(a.w.eval(`afLic.state().classes[0].done`), false, "needs a second tap");
    a.$("[data-ldone]").click(); await sleep(30);
    assert.equal(a.w.eval(`afLic.state().classes[0].done`), true);
    const lic = a.w.eval(`S.roster[2].lic[0]`);
    assert.equal(lic.n, "Forklift");
    const want = a.w.eval(`(()=>{const d=new Date(dkey()+"T12:00:00");d.setMonth(d.getMonth()+36);return dkey(d)})()`);
    assert.equal(lic.exp, want, "valid 36 months");
    // an expiring license shows up and can be enrolled into the next open class of that name
    a.w.eval(`S.roster[0].lic=[{n:"Forklift",exp:dkey(new Date(Date.now()+10*864e5))}];${CLASS(`{id:"c2",d:dkey(new Date(Date.now()+864e5*3)),cap:4}`)};render()`);
    assert.equal(a.w.eval(`afLic.expiring().length`), 1);
    assert.match(a.$("#main").textContent, /Licenses to renew/);
    a.$("[data-lenr]").click(); await sleep(30);
    assert.deepEqual([...a.w.eval(`afLic.state().classes.find(c=>c.id==="c2").en`)], ["r1"]);
  } finally { await a.close(); }
});

test("the Licensing calendar shows only licensing classes, month by month", async () => {
  const a = await boot(`S.roster[0].cal=[{d:"${new Date().toISOString().slice(0, 10)}",ty:"LEAVE",ti:"Block leave"}]`);
  try {
    a.w.eval(`${CLASS(`{en:["r3"]}`)};view="lic";render()`);
    a.$('[data-ltab="cal"]').click(); await sleep(30);
    const t = a.$("#main").textContent;
    assert.match(t, /(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}/);
    assert.match(t, /Forklift/); assert.match(t, /1 of 3 seats filled/);
    assert.doesNotMatch(t, /Block leave/, "team calendar entries stay off the licensing calendar");
    assert.ok(a.$(".afday.today i"), "today has a dot");
    const before = a.$("#main .afh b").textContent;
    a.$('[data-lmv="1"]').click(); await sleep(30);
    assert.notEqual(a.$("#main .afh b").textContent, before);
    assert.match(a.w.eval(`afLic.ics()`), /BEGIN:VEVENT[\s\S]*SUMMARY:Forklift class/);
  } finally { await a.close(); }
});

test("documents attach to a class and stay off the team data", async () => {
  const a = await boot();
  try {
    a.w.eval(`${CLASS()};view="lic";render()`);
    const id = await a.w.eval(`afLic.addDoc(afLic.state().classes[0],new File(["hello"],"signin.pdf"),"Sign-in sheet")`);
    assert.equal(a.w.eval(`afLic.state().classes[0].docs.length`), 1);
    assert.ok(a.w.eval(`afLic.docs()["${id}"]`), "file body is in its own storage");
    assert.equal(a.w.eval(`JSON.stringify(S).includes("data:")`), false, "not in the synced state");
    await assert.rejects(() => a.w.eval(`afLic.addDoc(afLic.state().classes[0],new File([new Array(500*1024).join("x")],"big.pdf"),"Other")`), /400 KB/);
  } finally { await a.close(); }
});

test("My page shows a member's classes and licenses", async () => {
  const a = await boot();
  try {
    a.w.eval(`S.roster[2].lic=[{n:"MTVR",exp:dkey(new Date(Date.now()+400*864e5))}];${CLASS(`{en:["r3"]}`)};const d=mpDigest(S.roster[2]);S.me={pk:"preview",d};view="me";render()`);
    const t = a.$("#main").textContent;
    assert.match(t, /My classes/); assert.match(t, /Forklift/); assert.match(t, /My licenses/); assert.match(t, /MTVR/);
    assert.equal(a.w.eval(`mpDigest(S.roster[1]).cls.length`), 0, "others don't see it");
  } finally { await a.close(); }
});

test("Licensing is hidden for someone it isn't turned on for", async () => {
  const a = await boot(`S.role="sncoic"`);
  try {
    a.w.eval(`view="lic";render()`);
    assert.match(a.$("#main").textContent, /isn't turned on for you/);
    assert.equal(a.$("[data-lnewt]"), null);
  } finally { await a.close(); }
});
