// Everyone with a My page has a Check in button, Feed or no Feed. Without a Feed the check-in rides on the page
// itself (page_req, sealed with the page key) and the leader pulls it with one call (page_reqs_get).
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep, waitFor } from "./harness.mjs";

const click = (a, sel) => { const el = a.$(sel); assert.ok(el, "found " + sel); el.click(); };
const setVal = (a, sel, v) => { const el = a.$(sel); assert.ok(el, "found " + sel); el.value = v; };
const PK = "p".repeat(28);

test("member with a page but no Feed still gets Check in, and it goes out on the page channel", async () => {
  const sent = [];
  const a = await openApp({ rpc: (fn, body) => { if (fn === "page_req") { sent.push(body); return 9; } return []; } });
  try {
    await a.w.eval(`(async()=>{const m=S.roster[0];const D=mpDigest(m);D.feed=null;D.cofeed=null;D.cks=[];window.__mid=m.id;
      S.feeds=[];S.me={pk:"${PK}",unit:"UTILITIES",d:D,t:Date.now()};S.onb=true;S.welcomed=1;view="me";render()})()`);
    await sleep(50);
    assert.ok(a.$("#ckOpen"), "Check in button is there with no Feed");
    assert.doesNotMatch(a.$("#ckCard").textContent, /connected to your leader's Feed/);
    click(a, "#ckOpen");
    click(a, '[data-ckst="Leave"]');
    setVal(a, "#ckF", "2026-10-30"); setVal(a, "#ckT", "2026-11-02"); setVal(a, "#ckL", "Maui");
    click(a, "#ckSend");
    await waitFor(() => sent.length === 1);
    const K = await a.w.eval(`mpKeys("${PK}")`);
    assert.equal(sent[0].p_id, K.id, "dropped on this member's page id");
    assert.ok(!JSON.stringify(sent[0]).includes("Maui"), "nothing readable on the wire");
    const o = await a.w.eval(`(async()=>openBlob(await mpKeys("${PK}"),${JSON.stringify(sent[0].p_ct)}))()`);
    assert.equal(o.k, "ck"); assert.equal(o.st, "Leave"); assert.equal(o.loc, "Maui"); assert.equal(o.to, "2026-11-02");
    assert.equal(o.mid, a.w.eval("window.__mid"));
    await waitFor(() => /waiting for your leader/.test(a.$("#ckCard").textContent));
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("leader pulls page check-ins with one call and can confirm them", async () => {
  let rows = []; const calls = [];
  const a = await openApp({ rpc: (fn, body) => { if (fn === "page_reqs_get") { calls.push(body); return rows; } return []; } });
  try {
    await a.w.eval(`S.leaderMode=true;S.feeds=[];S.roster[0].pk="${PK}";S.roster[1].pk="q".repeat(28);save()`);
    const mid = a.w.eval("S.roster[0].id");
    const K = await a.w.eval(`mpKeys("${PK}")`);
    const ct = await a.w.eval(`(async()=>sealObj(await mpKeys("${PK}"),{k:"ck",cid:"pg1",me:"LCPL MUNIZ",mid:${JSON.stringify(mid)},st:"Appointment",from:"2026-10-30",to:"2026-10-30",loc:"On base · clinic"}))()`);
    rows = [{ id: 11, page_id: K.id, ct, created_at: new Date().toISOString() }];
    await a.w.eval(`pgPoll()`);
    await waitFor(() => a.w.eval("(S.cks||[]).length") === 1);
    assert.equal(calls.length, 1); assert.equal(calls[0].p_ids.length, 2, "both pages in one call"); assert.equal(calls[0].p_wks.length, 2);
    assert.equal(a.w.eval("S.pgAfter"), 11);
    await a.w.eval(`pgPoll()`); await sleep(50);
    assert.equal(a.w.eval("S.cks.length"), 1, "same check-in isn't added twice");
    a.w.eval(`view="checkins";render()`);
    click(a, '[data-ckok="pg1"]');
    const m = a.w.eval(`JSON.parse(JSON.stringify(S.roster.find(m=>m.id===${JSON.stringify(mid)})))`);
    assert.equal(m.status, "Appointment"); assert.equal(m.loc, "On base · clinic");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
