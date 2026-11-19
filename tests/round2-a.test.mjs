// 4.127.0 (a): roster Email column, every team has a name, Settings → Tools switches.
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { openApp, sleep } from "./harness.mjs";
import { startPg, applySetup } from "./pg.mjs";

const J = (a, expr) => JSON.parse(a.w.eval(`JSON.stringify(${expr})`));
const OWNER = `S.mode="military";S.onb=true;S.welcomed=1;S.leaderMode=true;S.source="mol";S.role="oic";S.unit="ALPHA CO";`;

test("email: format check accepts real addresses and refuses the rest", async () => {
  const a = await openApp({});
  try {
    const ok = J(a, `["Ana.Rivera@Example.com"," mailto:max@x.co ","<sgt.lee@usmc.mil>","a+b@sub.example.org"].map(normEmail)`);
    assert.deepEqual(ok, ["ana.rivera@example.com", "max@x.co", "sgt.lee@usmc.mil", "a+b@sub.example.org"]);
    const bad = J(a, `["ana@","@x.com","ana x@x.com","ana@x","ana@@x.com","ana@x..com","ana@-x.com","x".repeat(65)+"@x.com"].map(normEmail)`);
    assert.deepEqual(bad, [null, null, null, null, null, null, null, null]);
    assert.equal(a.w.eval(`normEmail("")`), "", "blank is fine (no email)");
  } finally { await a.close(); }
});

test("email: import reads an Email column (even 'Email address'), skips bad ones and says how many; export has it", async () => {
  const a = await openApp({});
  try {
    a.w.eval(OWNER + `S.roster=[];save();`);
    const csv = "Name,Team,Phone,Email address\nRivera, Ana,HQ,808-555-0101,Ana.Rivera@Example.com\nLee, Max,HQ,808-555-0102,not-an-email\nKim, Jo,HQ,,\n";
    const P = J(a, `(()=>{const r=flexParse(parseCSV(${JSON.stringify(csv.replace(/Rivera, Ana/, '"Rivera, Ana"').replace(/Lee, Max/, '"Lee, Max"').replace(/Kim, Jo/, '"Kim, Jo"'))}));return {ems:r.roster.map(m=>m.email||""),bad:r.badEmails,cols:r.cols}})()`);
    assert.ok(P.cols.includes("email"), "the address column isn't dropped as sensitive");
    assert.deepEqual(P.ems, ["ana.rivera@example.com", "", ""]);
    assert.equal(P.bad, 1);
    // own CSV export and re-import keep the email
    a.w.eval(`S.roster=[{id:"x1",rank:"SGT",name:"RIVERA, ANA",sec:SECTIONS[0][0],status:"On Hand",email:"ana.rivera@example.com"},{id:"x2",rank:"CPL",name:"LEE, MAX",sec:SECTIONS[0][0],status:"On Hand"}];save();`);
    const out = a.w.eval(`exportCSV()`);
    assert.match(out.split("\n")[0], /,Email$/);
    assert.match(out, /"ana\.rivera@example\.com"/);
    const back = J(a, `importCSV(exportCSV()).roster.map(m=>m.email||"")`);
    assert.deepEqual(back.sort(), ["", "ana.rivera@example.com"]);
    const xl = J(a, `xlSheets("roster").Roster`);
    const col = xl[0].indexOf("Email");
    assert.ok(col > 0, "Excel roster has an Email column");
    assert.ok(xl.slice(1).some((r) => r[col] === "ana.rivera@example.com"));
    assert.match(a.w.eval(`rosterTemplate()`).split("\r\n")[0], /,Email$/, "sample file has the column");
  } finally { await a.close(); }
});

test("email: Add people refuses a bad address with a message and keeps what was typed; a good one is saved", async () => {
  const a = await openApp({});
  try {
    await a.w.eval(OWNER + `S.roster=[];view="people";render();addSheet("")`); await sleep(80);
    a.$("[data-apd-tab='man']").click(); await sleep(50);
    a.$("#apdM-fn").value = "Ana"; a.$("#apdM-ln").value = "Rivera"; a.$("#apdM-em").value = "ana at example";
    a.$("#apdSave").click(); await sleep(40);
    assert.equal(a.w.eval("S.roster.length"), 0, "nothing saved");
    assert.match(a.$("#apdOut").textContent, /isn't an email address/);
    assert.equal(a.$("#apdM-em").value, "ana at example", "the typing is kept");
    assert.equal(a.$("#apdM-em").getAttribute("aria-invalid"), "true");
    a.$("#apdM-em").value = "Ana@Example.com"; a.$("#apdSave").click(); await sleep(40);
    assert.equal(a.w.eval("S.roster[0].email"), "ana@example.com");
    // the person card shows it
    a.w.eval(`closeSheet();pid=S.roster[0].id;view="p";render();`); await sleep(20);
    const pe = a.$("#pxEmail");
    if (pe) assert.match(pe.querySelector("a").getAttribute("href"), /^mailto:ana@example\.com$/);
  } finally { await a.close(); }
});

test("team name: an owner's team with no name gets a screen that can't be dismissed until a name is saved", async () => {
  const state = JSON.stringify({ mode: "military", onb: true, welcomed: 1, leaderMode: true, source: "mol", role: "oic", unit: "",
    roster: [{ id: "a1", rank: "SGT", name: "RIVERA, ANA", sec: "HQ", status: "On Hand" }] });
  const a = await openApp({ storage: { "eoop-muster-v1": state } });
  try {
    await sleep(1100);
    const w = a.$("#tnWrap");
    assert.ok(w, "Name your team shows on open");
    assert.equal(w.getAttribute("aria-modal"), "true");
    assert.match(w.textContent, /Name your team/);
    assert.ok(!w.querySelector("[data-sclose],#tnClose"), "no close button");
    a.doc.dispatchEvent(new a.w.KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await sleep(20);
    assert.ok(a.$("#tnWrap"), "Escape doesn't close it");
    assert.equal(a.$("#tnSave").disabled, true, "can't save a blank name");
    a.$("#tnIn").value = "Bravo Co"; a.$("#tnIn").dispatchEvent(new a.w.Event("input", { bubbles: true }));
    assert.equal(a.$("#tnSave").disabled, false);
    a.$("#tnSave").click(); await sleep(30);
    assert.ok(!a.$("#tnWrap"), "gone once saved");
    assert.match(a.w.eval("unitName()"), /^bravo co$/i);
    a.w.eval(`S.unit="";save();`); await sleep(10);
    assert.match(a.w.eval("S.unit"), /^bravo co$/i, "a name can't be cleared");
  } finally { await a.close(); }
  const b = await openApp({ storage: { "eoop-muster-v1": JSON.stringify({ mode: "military", onb: true, welcomed: 1, source: "sample" }) } });
  try { await sleep(1100); assert.ok(!b.$("#tnWrap"), "sample data isn't asked"); } finally { await b.close(); }
});

test("Settings → Tools: every tool with a switch; off hides it everywhere and keeps its data; owner-only locks; reset", async () => {
  const a = await openApp({});
  try {
    a.w.eval(OWNER + `S.roster=S.roster.slice(0,4);save();view="settings";render();`); await sleep(20);
    a.$('[data-sp="tl"]').click(); await sleep(20);
    const names = a.$$(".tl-row b").map((b) => b.textContent);
    assert.deepEqual(names, ["Dashboard", "Invite", "Join code", "Ask to join", "Sign in", "Notifications", "Calendar", "Feed", "Reports"]);
    assert.equal(a.$$('.tl-row input[data-tool]').filter((i) => i.checked).length, 9, "all on by default");
    // Feed off: tab and buttons gone, data kept, the screen sends you Home
    a.w.eval(`S.feeds=[{id:"feedabc12345",mk:"m".repeat(30),ek:"E".repeat(43),unit:"ALPHA CO",posts:[{id:1,t:Date.now(),txt:"hi",to:{k:"all"}}],seen:0,mine:{}}];save();`);
    const sw = a.$('input[data-tool="feed"]'); sw.checked = false; sw.dispatchEvent(new a.w.Event("change", { bubbles: true })); await sleep(30);
    assert.equal(a.w.eval(`toolOn("feed")`), false);
    assert.match(a.$("#tlCss").textContent, /\[data-go="feed"\]/);
    assert.ok(!J(a, `tabsList().map(t=>t[0])`).includes("feed"));
    a.w.eval(`view="feed";render();`); await sleep(20);
    assert.equal(a.w.eval("view"), "board", "an off tool lands on Home");
    assert.equal(a.w.eval("S.feeds[0].posts.length"), 1, "its data stays saved");
    assert.ok(a.w.eval(`SYNC_SKIP.includes("toolsOff")`), "this phone only");
    // a tool's own page: switch, settings and related chips
    a.w.eval(`view="settings";spKit.go("tl");`); await sleep(20);
    a.$('[data-sp="tl:ntf"]').click(); await sleep(20);
    assert.ok(a.$("#ntfPanel") && a.$("#qhPanel"), "Notifications page has the per-type choices");
    a.$('[data-spback]').click(); await sleep(20);
    assert.ok(a.$('[data-sp="tl:cal"]'), "Back returns to the Tools list");
    a.$('[data-sp="tl:cal"]').click(); await sleep(20);
    assert.ok(a.$('#tlChips [data-go="cal"]') && a.$('#tlChips [data-go="events"]'), "chips to related features");
    // Notifications off: every kind muted on the sign-up
    a.w.eval(`toolSet("ntf",false)`);
    assert.deepEqual(J(a, `ntfMuted()`), ["word", "checkins", "messages", "chat", "sections", "team"]);
    // reset
    a.w.eval(`view="settings";spKit.go("tl");`); await sleep(20);
    a.$("#tlReset").click(); await sleep(20);
    assert.equal(a.w.eval(`toolsOffCount()`), 0);
    assert.equal(a.$("#tlCss").textContent, "");
    // a non-owner can't turn off Dashboard or Notifications
    a.w.eval(`S.role="view";S.sync={on:true,code:newCode(),ver:1,at:0,err:"",last:""};save();`);
    assert.equal(a.w.eval(`toolSet("dash",false)`), false);
    assert.equal(a.w.eval(`toolOn("dash")`), true);
    assert.equal(a.w.eval(`toolSet("cal",false)`), true, "other tools are theirs to switch");
    a.w.eval(`view="settings";spKit.go("tl");`); await sleep(20);
    assert.equal(a.$('.tl-row input[data-tool="dash"]').disabled, true);
    assert.match(a.$('[data-tlrow="dash"]').textContent, /only the owner/i);
  } finally { await a.close(); }
});

const pg = await startPg();
test("setup part 52: only the owner's leader key writes roster emails; only the signed-in owner of an address gets its row", { skip: pg ? false : "Postgres not installed" }, () => {
  const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
  const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
  const anon = (sql) => pg.psql(`set role anon; ${sql}`);
  const as = (uid, email, sql) => pg.psql(`set role authenticated; set "request.jwt.claims" to ${q(JSON.stringify({ sub: uid, role: "authenticated", email }))}; ${sql}`);
  applySetup(pg);
  const lk = "leader-key-0123456789abcdef", mk = "member-key-0123456789abcd";
  pg.psql(`insert into public.feeds(id, member_key_hash, leader_key_hash) values ('feedmail01', ${q(sha(mk))}, ${q(sha(lk))}) on conflict do nothing`);
  const h = sha("af-email-v1:ana@example.com");
  const rows = JSON.stringify([{ h, ct: "sealed-for-ana" }, { h: sha("af-email-v1:max@example.com"), ct: "sealed-for-max" }]);
  assert.throws(() => anon(`select public.roster_email_put('feedmail01', ${q(mk)}, ${q(rows)}::jsonb)`), /not allowed/, "the member key can't write");
  assert.throws(() => anon(`select public.roster_email_put('feedmail01', ${q(lk)}, '[{"h":"nothex","ct":"x"}]'::jsonb)`), /bad input/);
  assert.equal(anon(`select public.roster_email_put('feedmail01', ${q(lk)}, ${q(rows)}::jsonb)`), "2");
  assert.throws(() => anon(`select count(*) from public.roster_emails`), /permission denied/, "the table is closed");
  assert.throws(() => anon(`select * from public.roster_email_claim()`), /permission denied|sign in first/, "anon can't claim");
  const u1 = "44444444-4444-4444-4444-444444444444", u2 = "55555555-5555-5555-5555-555555555555";
  pg.psql(`insert into auth.users(id, email) values (${q(u1)}, 'ana@example.com'), (${q(u2)}, 'eve@example.com') on conflict do nothing`);
  assert.equal(as(u1, "Ana@Example.com", `select feed_id || ':' || ct from public.roster_email_claim()`), "feedmail01:sealed-for-ana");
  assert.equal(as(u2, "eve@example.com", `select count(*) from public.roster_email_claim()`), "0", "someone else gets nothing");
  assert.throws(() => as(u2, "eve@example.com", `select count(*) from public.roster_emails`), /permission denied/);
  assert.equal(anon(`select public.roster_email_put('feedmail01', ${q(lk)}, '[]'::jsonb)`), "0", "the owner can clear the list");
  assert.equal(as(u1, "ana@example.com", `select count(*) from public.roster_email_claim()`), "0");
});
test.after(() => { try { pg && pg.stop(); } catch {} });
