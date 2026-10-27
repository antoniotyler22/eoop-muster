// 1.4 Team: check-ins from My page, the leader confirming them, Activity confirm, status dates and location,
// section update times, people with access, member alerts and the Help & support chat.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep, waitFor } from "./harness.mjs";

const FEED = { id: "feedabcdef12", mk: "m".repeat(30), lk: "l".repeat(30) };
const click = (a, sel) => { const el = a.$(sel); assert.ok(el, "found " + sel); el.click(); };
const setVal = (a, sel, v) => { const el = a.$(sel); assert.ok(el, "found " + sel); el.value = v; };

/* a member phone: My page open, joined to the leader's Feed */
async function memberApp(rpc) {
  const a = await openApp({ rpc });
  await a.w.eval(`(async()=>{
    const ek=b64url(crypto.getRandomValues(new Uint8Array(32)));
    const m=S.roster[0];const D=mpDigest(m);D.feed={id:"${FEED.id}",mk:"${FEED.mk}",ek,unit:"1ST PLT",secs:["HQ"]};D.cks=[];
    S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",ek,unit:"1ST PLT",me:"CPL TEST",mid:m.id,sec:m.sec,posts:[],seen:0,mine:{},hub:1}];
    S.me={pk:"p".repeat(24),unit:"1ST PLT",d:D,t:Date.now()};S.onb=true;S.welcomed=1;window.__ek=ek;window.__mid=m.id;view="me";render()})()`);
  await sleep(50);
  return a;
}

test("member checks in from My page: Other needs words, dates and location ride along encrypted", async () => {
  const sent = [];
  const a = await memberApp((fn, body) => { if (fn === "feed_req") { sent.push(body); return 7; } return []; });
  try {
    click(a, "#ckOpen");
    click(a, '[data-ckst="Other"]');
    assert.ok(a.$("#ckO"), "Other asks what's going on");
    setVal(a, "#ckF", "2026-10-26");
    click(a, "#ckSend");
    await sleep(30);
    assert.equal(sent.length, 0, "Other without words is not sent");
    setVal(a, "#ckO", "Car broke down on H-3");
    setVal(a, "#ckL", "Kaneohe");
    setVal(a, "#ckT", "2026-10-27");
    click(a, "#ckSend");
    await waitFor(() => sent.length === 1);
    assert.equal(sent[0].p_feed, FEED.id);
    assert.ok(!JSON.stringify(sent[0]).includes("Kaneohe"), "nothing readable on the wire");
    const o = await a.w.eval(`fdDec(window.__ek,${JSON.stringify(sent[0].p_ct)})`);
    assert.equal(o.k, "ck"); assert.equal(o.st, "Other"); assert.equal(o.oth, "Car broke down on H-3");
    assert.equal(o.from, "2026-10-26"); assert.equal(o.to, "2026-10-27"); assert.equal(o.loc, "Kaneohe");
    assert.equal(o.mid, a.w.eval("window.__mid"));
    await waitFor(() => /waiting for your leader/.test(a.$("#ckCard").textContent));
    // On Hand needs no dates
    click(a, "#ckOpen"); click(a, '[data-ckst="On Hand"]');
    assert.equal(a.$("#ckF"), null, "On Hand doesn't ask for dates");
    assert.ok(a.$("#meOff").previousElementSibling, "start your own team + help sit above Remove");
    assert.match(a.$("#main").textContent, /Start my own team/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("leader gets the check-in through the Feed, confirms it, roster updates with dates and location", async () => {
  let rows = [];
  const a = await openApp({ rpc: (fn) => fn === "feed_reqs_get" ? rows : [] });
  try {
    await a.w.eval(`(async()=>{const ek=b64url(crypto.getRandomValues(new Uint8Array(32)));window.__ek=ek;S.leaderMode=true;
      S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",lk:"${FEED.lk}",ek,unit:"1ST PLT",main:true,posts:[],acks:{},un:{},mine:{},seen:0}];save()})()`);
    const mid = a.w.eval("S.roster.find(m=>m.status==='On Hand').id");
    const ct = await a.w.eval(`fdEnc(window.__ek,{k:"ck",cid:"cabc1",me:"CPL TEST",mid:${JSON.stringify(mid)},st:"Leave",from:"2026-10-26",to:"2026-10-30",loc:"Maui",note:"Family"})`);
    const ct2 = await a.w.eval(`fdEnc(window.__ek,{k:"ck",cid:"cabc2",me:"MR NOBODY STRANGER",st:"On Hand"})`);
    rows = [{ id: 3, ct, created_at: new Date().toISOString() }, { id: 4, ct: ct2, created_at: new Date().toISOString() }];
    await a.w.eval(`fdPoll(S.feeds[0],true)`);
    assert.equal(a.w.eval("S.cks.length"), 2);
    a.w.eval(`fdPoll(S.feeds[0],false)`); await sleep(50);
    assert.equal(a.w.eval("S.cks.length"), 2, "same check-in isn't added twice");
    assert.equal(a.w.eval(`S.roster.find(m=>m.id===${JSON.stringify(mid)}).status`), "On Hand", "nothing changes until confirmed");
    a.w.eval(`view="board";render()`);
    assert.match(a.$("#main").textContent, /2 check-ins to confirm/);
    a.w.eval(`view="checkins";render()`);
    click(a, '[data-ckok="cabc1"]');
    const m = a.w.eval(`JSON.parse(JSON.stringify(S.roster.find(m=>m.id===${JSON.stringify(mid)})))`);
    assert.equal(m.status, "Leave"); assert.equal(m.start, "2026-10-26"); assert.equal(m.end, "2026-10-30"); assert.equal(m.loc, "Maui"); assert.equal(m.detail, "Family");
    assert.equal(a.w.eval(`mpDigest(S.roster.find(m=>m.id===${JSON.stringify(mid)})).cks[0].state`), "ok", "confirmation goes back on their page");
    // the stranger shows up under people with access, not on the roster
    a.w.eval(`view="access";render()`);
    assert.match(a.$("#main").textContent, /MR NOBODY STRANGER/);
    // Activity: each item can be confirmed
    a.w.eval(`view="act";render()`);
    const n0 = a.$$("[data-actok]").length; assert.ok(n0 >= 2);
    a.$("[data-actok]").click();
    assert.equal(a.$$("[data-actok]").length, n0 - 1);
    click(a, "#actOkAll");
    assert.equal(a.$$("[data-actok]").length, 0);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("picking anything but On Hand asks From, To and Location; sections show when they were updated", async () => {
  const a = await openApp();
  try {
    const sec = a.w.eval("SECTIONS[0][0]");
    a.w.eval(`view=${JSON.stringify(sec.toLowerCase())};render()`);
    assert.match(a.$(".secupd").textContent, /Updated|Not updated/);
    const pill = a.$$('.m [data-pick="s"]').find((p) => /On Hand/.test(p.textContent));
    const id = pill.dataset.pid;
    pill.click();
    click(a, '[data-sopt="TAD"]');
    await waitFor(() => a.$("#sdF"), 2000);
    setVal(a, "#sdF", "2026-11-01"); setVal(a, "#sdT", "2026-11-20"); setVal(a, "#sdL", "Camp Pendleton");
    click(a, "#sdSave");
    const m = a.w.eval(`JSON.parse(JSON.stringify(S.roster.find(m=>m.id===${JSON.stringify(id)})))`);
    assert.equal(m.status, "TAD"); assert.equal(m.start, "2026-11-01"); assert.equal(m.end, "2026-11-20"); assert.equal(m.loc, "Camp Pendleton");
    const row = a.$(`.m [data-pcard="${id}"]`).closest(".m");
    assert.match(row.querySelector(".det").textContent, /From .* – To .*📍 Camp Pendleton/);
    a.w.eval(`view="board";render()`);
    const tiles = a.$$(`#main [data-go="${sec.toLowerCase()}"]`).map((x) => x.textContent).join(" | ");
    assert.match(tiles, /↻ \d{4}|updated \d{4}/, "section tile shows when it was updated");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("people with access lists invites sent to anyone, even off the roster", async () => {
  const a = await openApp();
  try {
    a.w.eval(`S.leaderMode=true;view="invite";render()`);
    const box = a.$('.invsend input.invto');
    box.value = "friend@example.com";
    a.$('.invsend [data-invgo="copy"]').click();
    a.w.eval(`view="access";render()`);
    assert.match(a.$("#main").textContent, /Copied|friend@example.com/);
    assert.match(a.$("#main").textContent, /Own team/);
    assert.deepEqual(a.errors.filter((e) => !/clipboard/i.test(e)), []);
  } finally { await a.close(); }
});

test("member gets an alert with Confirm when the leader changes their page", async () => {
  let page = [];
  const a = await memberApp((fn) => fn === "get_page" ? page : []);
  try {
    const ct = await a.w.eval(`(async()=>{const K=await mpKeys(S.me.pk);const D=JSON.parse(JSON.stringify(S.me.d));D.status="Leave";D.statusShort="Leave";D.end="2026-11-02";return sealObj(K,D)})()`);
    page = [{ ct, updated_at: new Date(Date.now() + 5000).toISOString() }];
    await a.w.eval("mpFetch()");
    assert.match(a.$("#meUpd").textContent, /Your status is now Leave/);
    click(a, "[data-meok]");
    assert.equal(a.$("#meUpd"), null, "confirmed updates go away");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("Help & support: AI answers app questions; falls back to the help guide; a person is one tap away", async () => {
  let reply = { answer: "Go to **Tools → Invite**, then Make a link." };
  const asked = [];
  const a = await openApp({ fn: (name, body) => { asked.push({ name, body }); return reply; } });
  try {
    a.w.eval(`view="support";render()`);
    assert.ok(a.$('a[href^="mailto:Antoniotyler22@gmail.com"]'), "email a person");
    setVal(a, "#supQ", "How do I invite someone?");
    click(a, "#supGo");
    await waitFor(() => /Tools → Invite/.test(a.$("#main").textContent));
    assert.equal(asked[0].name, "ask"); assert.equal(asked[0].body.support, 1);
    reply = { status: 402, body: { error: "Ask is part of Pro", pro: true } };
    setVal(a, "#supQ", "how do check-ins get confirmed");
    click(a, "#supGo");
    await waitFor(() => /Help guide/.test(a.$$(".card .note").map((x) => x.textContent).join(" ")));
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
