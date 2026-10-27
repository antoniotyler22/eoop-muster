// 1.7: live updates, optional accounts (send a team to someone's account), visitors, more than one team, add from Contacts.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep, waitFor } from "./harness.mjs";

const lead = `S.welcomed=1;S.onb=true;S.leaderMode=true;`;

test("live: reading a channel joins its hashed Realtime topic; a change pings it; a ping fetches right away", async () => {
  const a = await openApp({ rpc: (fn) => (fn === "feed_get" ? [] : null) });
  try {
    await a.w.eval(`SB.rpc("feed_get",{p_feed:"feed000001",p_member_key:"x",p_after:0})`);
    await waitFor(() => a.w.__ws.length > 0);
    const ws = a.w.__ws[a.w.__ws.length - 1];
    assert.match(ws.url, /^wss:\/\/vdhxhvklwbimjpoomnui\.supabase\.co\/realtime\/v1\/websocket\?apikey=/);
    ws.open();
    const topic = await a.w.eval(`SB.topic("p_feed","feed000001")`);
    assert.match(topic, /^af-[0-9a-f]{24}$/, "hashed: the channel id never goes over Realtime");
    const join = ws.sent.find((m) => m.event === "phx_join");
    assert.equal(join.topic, "realtime:" + topic);
    ws.recv({ topic: "realtime:" + topic, event: "phx_reply", payload: { status: "ok" }, ref: join.ref });
    a.w.eval(`renderTabs()`);
    assert.ok(a.$("#liveDot"), "Live shows in the header once joined");
    // a write pings the same topic, with nothing but the kind
    a.calls.length = 0;
    await a.w.eval(`SB.rpc("feed_post",{p_feed:"feed000001",p_leader_key:"y",p_ct:"QQ=="})`);
    await waitFor(() => a.calls.some((c) => /realtime\/v1\/api\/broadcast/.test(c.url)));
    const b = a.calls.find((c) => /realtime\/v1\/api\/broadcast/.test(c.url)).body.messages[0];
    assert.equal(b.topic, topic);
    assert.deepEqual(Object.keys(b.payload).sort(), ["k", "s"]);
    // someone else's ping makes this phone fetch now; its own echo doesn't
    a.w.eval(`window.__polls=0;const _f=fdPollAll;fdPollAll=function(){window.__polls++;return _f.apply(this,arguments)}`);
    ws.recv({ topic: "realtime:" + topic, event: "broadcast", payload: { type: "broadcast", event: "ping", payload: { s: a.w.SB.sid, k: "p_feed" } } });
    await sleep(500);
    assert.equal(a.w.__polls, 0, "ignores its own ping");
    ws.recv({ topic: "realtime:" + topic, event: "broadcast", payload: { type: "broadcast", event: "ping", payload: { s: "other", k: "p_feed" } } });
    await waitFor(() => a.w.__polls === 1, 2000);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("account: sign in with an email code; a team sent to you waits on Home; delete account", async () => {
  let teams = [];
  const inv = [{ id: "11111111-1111-1111-1111-111111111111", team: "t1", team_name: "HILLTOP RUN CLUB", role: "Member", label: "Sam Okafor", link: "https://antoniotyler22.github.io/eoop-muster/#me=abcdefghijklmnopqrst&k=zz", created_at: new Date().toISOString(), opened_at: null }];
  const authCalls = [];
  const a = await openApp({
    auth: (path, body) => {
      authCalls.push(path);
      if (path === "otp") return {};
      if (path === "verify") { assert.equal(body.token, "123456"); assert.equal(body.email, "lead@example.com"); return { access_token: "AT", refresh_token: "RT", expires_in: 3600, user: { id: "u1", email: "lead@example.com" } }; }
      return {};
    },
    rpc: (fn, body) => {
      if (fn === "acct_get") return teams;
      if (fn === "acct_put") { teams = body.p_teams; return null; }
      if (fn === "inv_mine") return inv;
      if (fn === "inv_opened") { inv[0].opened_at = new Date().toISOString(); return null; }
      if (fn === "acct_delete") return null;
      return null;
    },
  });
  try {
    a.w.eval(`${lead}view="acct";render()`);
    assert.match(a.$("#main").textContent, /Sign in \(optional\)/);
    a.$("#acTo").value = "Lead@Example.com";
    a.$("#acSend").click();
    await waitFor(() => a.$("#acCode"));
    a.$("#acCode").value = "123456";
    a.$("#acVerify").click();
    await waitFor(() => /Signed in/.test(a.$("#main").textContent));
    assert.deepEqual(authCalls.slice(0, 2), ["otp", "verify"]);
    assert.match(a.$("#main").textContent, /lead@example\.com/);
    const rpcAuth = a.calls.find((c) => /rpc\/acct_get/.test(c.url));
    assert.equal(rpcAuth.headers.Authorization, "Bearer AT", "account calls carry the sign-in");
    assert.match(a.$("#main").textContent, /HILLTOP RUN CLUB/, "sent to you");
    a.w.eval(`view="board";render()`);
    await waitFor(() => a.$("#acInv"));
    assert.match(a.$("#acInv").textContent, /HILLTOP RUN CLUB sent you an invite/);
    // tile lives in People & access
    a.w.eval(`view="tools";render();openToolGroup("people")`);
    assert.ok(a.$('#sheetOpts [data-go="acct"]'));
    a.w.eval(`closeSheet();view="acct";render()`);
    a.$("#acDel").click(); a.$("#acDel").click();
    await waitFor(() => /Account deleted/.test(a.$("#main").textContent));
    assert.equal(a.w.eval(`AUTH.on()`), false);
    assert.equal(a.w.localStorage.getItem("af-auth"), null);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("visitors: sign in and out; they show in an emergency check-in and the shared headcount", async () => {
  const a = await openApp();
  try {
    a.w.eval(`${lead}view="visitors";render()`);
    a.$("#vsName").value = "Jordan Lee"; a.$("#vsHost").value = "Front office";
    a.$("#vsIn").click();
    assert.match(a.$("#main").textContent, /1 on site/);
    assert.match(a.w.eval(`reportText()`), /VISITORS ON SITE: 1 \(Jordan Lee\)/);
    a.w.eval(`view="board";render()`);
    a.$("#v11Em").click(); a.$("#v11Em").click();
    await sleep(80);
    assert.ok(a.$("#vsEm"), "emergency screen lists visitors on site");
    assert.match(a.$("#vsEm").textContent, /0 of 1 accounted for/);
    a.$("[data-vsok]").click();
    assert.match(a.$("#vsEm").textContent, /1 of 1 accounted for/);
    a.w.eval(`view="visitors";render()`);
    a.$("[data-vsout]").click();
    assert.match(a.$("#main").textContent, /0 on site/);
    assert.doesNotMatch(a.w.eval(`reportText()`), /VISITORS/);
    // kiosk mode hides the app around it; staff leave with two taps
    a.$("#vsKiosk").click();
    assert.ok(a.doc.body.classList.contains("vs-kiosk"));
    a.$("#vsKioskEnd").click(); a.$("#vsKioskEnd").click();
    assert.ok(!a.doc.body.classList.contains("vs-kiosk"));
    a.w.eval(`view="tools";render();openToolGroup("checkin")`);
    assert.ok(a.$('#sheetOpts [data-go="visitors"]'), "Visitors sits under Muster");
    assert.deepEqual(a.errors.filter((e) => !/Not implemented/.test(e)), []);
  } finally { await a.close(); }
});

test("teams: list, header switcher once there are two, and each team keeps its own people", async () => {
  const a = await openApp();
  try {
    a.w.eval(`${lead}S.unit="HILLTOP";S.mode="civilian";S.ws={t1:{unit:"ROOM 12",roster:[{id:"x1",name:"LEE, AVA",sec:"RED",status:"On Hand"}],source:"mol"}};S.teams={t1:{name:"ROOM 12",mode:"civilian"}};save();view="teams";render()`);
    const names = a.$$("#main .rrow b").map((b) => b.textContent);
    assert.deepEqual(names, ["✓ HILLTOP", "ROOM 12"]);
    assert.match(a.$("#main").textContent, /1 people/);
    a.w.eval(`renderTabs()`);
    assert.match(a.$("#wsBar").textContent, /HILLTOP ▾/);
    assert.ok(!a.$('#wsBar [data-wsgo]'), "no platoon/company buttons for a civilian team");
    a.$('[data-tmdel="t1"]').click(); a.$('[data-tmdel="t1"]').click();
    assert.equal(a.w.eval(`TEAMS.list().length`), 1);
    a.w.eval(`renderTabs()`);
    assert.equal(a.$("#wsBar").textContent, "", "one team: no switcher");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("contacts: contact cards parse; picked people land in the group you choose", async () => {
  const a = await openApp();
  try {
    const vcf = "BEGIN:VCARD\r\nVERSION:3.0\r\nN:Okafor;Sam;;;\r\nFN:Sam Okafor\r\nTEL;type=CELL:(808) 555-0101\r\nEMAIL:sam@example.com\r\nEND:VCARD\r\nBEGIN:VCARD\r\nVERSION:3.0\r\nFN:Coach Dee\r\nTEL:+1 808 555 0102\r\nEND:VCARD\r\n";
    const L = a.w.parseVCF(vcf);
    assert.deepEqual(JSON.parse(JSON.stringify(L)), [{ n: "Okafor, Sam", ph: "8085550101", em: "sam@example.com" }, { n: "Coach Dee", ph: "8085550102", em: "" }]);
    await sleep(600); // let the first-open version picker show itself, then close it
    a.w.eval(`${lead}setMode("civilian");S.roster=[];S.source="mol";save();closeSheet();view="board";render()`);
    Object.defineProperty(a.w.navigator, "contacts", { value: { select: async () => [{ name: ["Maria Lopez"], tel: ["808-555-0103"], email: ["maria@example.com"] }, { name: ["Dev Patel"], tel: [], email: [] }] }, configurable: true });
    a.w.eval(`renderBoard()`);
    const btn = a.$("#sgAdd [data-ctstart]");
    assert.ok(btn, "From Contacts on the Add your people card");
    btn.click();
    await waitFor(() => a.$("#ctAdd"));
    assert.match(a.$("#ctAdd").textContent, /Add 2 people/);
    a.$("#ctAdd").click();
    const r = a.w.eval(`JSON.stringify(S.roster.map(m=>[m.name,m.phone||"",m.email||""]))`);
    assert.deepEqual(JSON.parse(r), [["LOPEZ, MARIA", "8085550103", "maria@example.com"], ["PATEL, DEV", "", ""]]);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
