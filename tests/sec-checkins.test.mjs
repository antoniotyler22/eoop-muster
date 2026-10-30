// 4.31/4.33: section leaders see their people's check-ins as they land and can confirm their own section's.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("OIC: each section's check-ins (36 h) ride along in that section's sealed roster, and a new one republishes", async () => {
  const puts = [];
  const a = await openApp({ rpc: (fn, b) => { if (fn === "put_roster") puts.push(b); return []; } });
  try {
    await a.w.eval(`(async()=>{const k=b64url(crypto.getRandomValues(new Uint8Array(32)));window.__k=k;S.mode="military";S.source="mol";S.leaderMode=true;S.onb=true;S.welcomed=1;
      S.board={id:"b1",rk:"r".repeat(30),wk:"w".repeat(30),sk:{UT:k},rsig:{},rat:{}};
      S.roster=[{id:"u1",rank:"LCPL",name:"MUNIZ, LUIS",sec:"UT",status:"On Hand"},{id:"h1",rank:"SGT",name:"HALL, TOM",sec:"HQ",status:"On Hand"}];
      S.cks=[{cid:"c1",mid:"u1",who:"LCPL MUNIZ",sec:"UT",st:"Appointment",from:"2026-10-29",loc:"BAS",t:Date.now()-60000,state:"new"},
             {cid:"c2",mid:"h1",who:"SGT HALL",sec:"HQ",st:"On Hand",t:Date.now()-60000,state:"new"},
             {cid:"c3",mid:"u1",who:"LCPL MUNIZ",sec:"UT",st:"At PT",t:Date.now()-40*3600000,state:"ok"}];save()})()`);
    await a.w.eval("rpPublish(true)"); await sleep(80);
    assert.equal(puts.length, 1, "one section published");
    const body = await a.w.eval(`fdDec(window.__k,${JSON.stringify(puts[0].p_ct)})`);
    assert.equal(JSON.stringify(body.cks.map(x => x.cid)), JSON.stringify(["c1"]), "only UT's recent check-in, not HQ's, not the 40 h old one");
    assert.equal(body.cks[0].mid, "u1"); assert.equal(body.cks[0].state, "new"); assert.equal(body.cks[0].loc, "BAS");
    // a confirm changes the sealed body, so it goes out again
    await a.w.eval(`ckApply(S.cks[0],"Appointment","TEST")`);
    await a.w.eval("rpPublish(true)"); await sleep(80);
    const body2 = await a.w.eval(`fdDec(window.__k,${JSON.stringify(puts[1].p_ct)})`);
    assert.equal(body2.cks[0].state, "ok"); assert.equal(body2.cks[0].by, "TEST");
    // a check-in landing schedules a republish by itself
    const before = a.w.eval("typeof rpT==='undefined'?null:rpT");
    await a.w.eval(`ckIn({id:"f1"},{cid:"c9",me:"LCPL MUNIZ",mid:"u1",sec:"UT",st:"On Hand",at:Date.now()},null)`);
    assert.notEqual(a.w.eval("rpT"), before, "republish scheduled after a check-in landed");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("section leader phone: check-ins arrive with the roster pull, buzz, show with Confirm controls, flip to confirmed on the next pull", async () => {
  let payload = null;
  const a = await openApp({ rpc: (fn) => fn === "get_roster" ? (payload ? [payload] : []) : [] });
  try {
    await a.w.eval(`(async()=>{const ek=b64url(crypto.getRandomValues(new Uint8Array(32)));window.__ek=ek;S.leaderMode=true;S.mode="military";S.source="link";S.onb=true;S.welcomed=1;
      S.link={board:"b1",wk:"w".repeat(30),sec:"UT",mysec:"UT",unit:"1ST PLT",rk2:ek,pulled:true,pt:1};
      S.roster=[{id:"l1",uid:"o1",rank:"LCPL",name:"MUNIZ, LUIS",sec:"UT",status:"On Hand"}];save()})()`);
    const ms = `[{id:"o1",rank:"LCPL",name:"MUNIZ, LUIS",sec:"UT",status:"On Hand"}]`;
    const ct = await a.w.eval(`fdEnc(window.__ek,{ms:${ms},unit:"1ST PLT",cks:[{cid:"c1",who:"LCPL MUNIZ",mid:"o1",sec:"UT",st:"Appointment",from:"2026-10-29",loc:"BAS",t:Date.now()-30000,state:"new"}]})`);
    payload = { ct, updated_at: new Date(Date.now() + 60000).toISOString() };
    await a.w.eval("rosterPull(true)"); await sleep(80);
    const x = a.w.eval("S.cks[0]");
    assert.equal(x.cid, "c1"); assert.equal(x.src, "oic"); assert.equal(x.mid, "l1", "matched to this phone's row by uid"); assert.equal(x.state, "new");
    assert.match(JSON.stringify(a.w.eval("S.act")), /MUNIZ checked in/);
    assert.match(a.$("#toast") ? a.$("#toast").textContent : a.w.document.body.textContent, /MUNIZ checked in/);
    // Check-ins screen: name, what, when; confirm controls like the OIC's; no auto-confirm toggle
    await a.w.eval(`view="checkins";render()`); await sleep(30);
    const main = a.$("#main").textContent;
    assert.match(main, /MUNIZ, LUIS/); assert.match(main, /Appt/); assert.match(main, /BAS/);
    assert.match(main, /To confirm · 1/);
    assert.equal(a.$("#ckAuto"), null, "no auto-confirm toggle"); assert.ok(a.$("[data-ckok]"), "confirm button");
    await a.w.eval(`view="board";render()`); await sleep(30);
    assert.match(a.$("#main").textContent, /check-in to confirm/);
    // OIC confirms → next pull flips it
    const ct2 = await a.w.eval(`fdEnc(window.__ek,{ms:${ms},unit:"1ST PLT",cks:[{cid:"c1",who:"LCPL MUNIZ",mid:"o1",sec:"UT",st:"Appointment",from:"2026-10-29",loc:"BAS",t:Date.now()-30000,state:"ok",dt:Date.now(),by:"1ST PLT"}]})`);
    payload = { ct: ct2, updated_at: new Date(Date.now() + 120000).toISOString() };
    await a.w.eval("rosterPull(true)"); await sleep(80);
    assert.equal(a.w.eval("S.cks[0].state"), "ok");
    assert.equal(a.w.eval("S.cks.length"), 1, "same row, not a second copy");
    await a.w.eval(`view="checkins";render()`); await sleep(30);
    assert.match(a.$("#main").textContent, /✓ Confirmed/);
    assert.equal(a.$("[data-ckok]"), null, "settled rows have no confirm button");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("section leader phone: a repeated pull with the same list changes nothing and doesn't buzz again", async () => {
  let payload = null;
  const a = await openApp({ rpc: (fn) => fn === "get_roster" ? (payload ? [payload] : []) : [] });
  try {
    await a.w.eval(`(async()=>{const ek=b64url(crypto.getRandomValues(new Uint8Array(32)));window.__ek=ek;S.leaderMode=true;S.mode="military";S.source="link";S.onb=true;S.welcomed=1;
      S.link={board:"b1",wk:"w".repeat(30),sec:"UT",mysec:"UT",unit:"1ST PLT",rk2:ek,pulled:true,pt:1};
      S.roster=[{id:"l1",uid:"o1",rank:"LCPL",name:"MUNIZ, LUIS",sec:"UT",status:"On Hand"}];save()})()`);
    const mk = (n) => a.w.eval(`fdEnc(window.__ek,{ms:[{id:"o1",rank:"LCPL",name:"MUNIZ, LUIS",sec:"UT",status:"On Hand"}],unit:"1ST PLT",cks:[{cid:"c1",who:"LCPL MUNIZ",mid:"o1",sec:"UT",st:"On Hand",t:${Date.now() - 30000},state:"new"}]})`);
    payload = { ct: await mk(1), updated_at: new Date(Date.now() + 60000).toISOString() };
    await a.w.eval("rosterPull(true)"); await sleep(80);
    const acts = a.w.eval("(S.act||[]).length");
    payload = { ct: await mk(2), updated_at: new Date(Date.now() + 120000).toISOString() };
    await a.w.eval("rosterPull(true)"); await sleep(80);
    assert.equal(a.w.eval("S.cks.length"), 1); assert.equal(a.w.eval("(S.act||[]).length"), acts, "no second activity line");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("section leader confirms their own check-in: status goes on their roster, the result rides the calendar blob, OIC settles the row; a stale 'new' can't undo it", async () => {
  let payload = null; const cals = [];
  const a = await openApp({ rpc: (fn, b) => { if (fn === "push_cal") cals.push(b); return fn === "get_roster" ? (payload ? [payload] : []) : []; } });
  try {
    await a.w.eval(`(async()=>{const ek=b64url(crypto.getRandomValues(new Uint8Array(32)));window.__ek=ek;S.leaderMode=true;S.mode="military";S.source="link";S.onb=true;S.welcomed=1;
      S.link={board:"b1",wk:"w".repeat(30),ek:window.__ek,sec:"UT",mysec:"UT",unit:"1ST PLT",me:"SGT HALL",rk2:ek,pulled:true,pt:1};
      S.roster=[{id:"l1",uid:"o1",rank:"LCPL",name:"MUNIZ, LUIS",sec:"UT",status:"On Hand"}];save()})()`);
    const mk = (state) => a.w.eval(`fdEnc(window.__ek,{ms:[{id:"o1",rank:"LCPL",name:"MUNIZ, LUIS",sec:"UT",status:"On Hand"}],unit:"1ST PLT",cks:[{cid:"c1",who:"LCPL MUNIZ",mid:"o1",sec:"UT",st:"Appointment",from:"2026-10-29",loc:"BAS",t:${Date.now() - 30000},state:"${state}"}]})`);
    payload = { ct: await mk("new"), updated_at: new Date(Date.now() + 60000).toISOString() };
    await a.w.eval("rosterPull(true)"); await sleep(80);
    await a.w.eval(`view="checkins";render()`); await sleep(30);
    a.$('[data-ckok="c1"]').click(); await sleep(80);
    assert.equal(a.w.eval("S.roster[0].status"), "Appointment", "status on the leader's own roster (this is what reaches the OIC)");
    assert.equal(a.w.eval("S.cks[0].state"), "ok");
    // the confirm goes out with the section's calendar blob
    await a.w.eval("linkPush(true)"); await sleep(120);
    assert.ok(cals.length >= 1, "calendar blob pushed");
    const body = await a.w.eval(`fdDec(window.__ek,${JSON.stringify(cals[cals.length - 1].p_ct)})`);
    assert.equal(JSON.stringify(body.k.map(x => [x.cid, x.state])), JSON.stringify([["c1", "ok"]]));
    // the OIC hasn't caught up: a pull that still says "new" must not undo it
    payload = { ct: await mk("new"), updated_at: new Date(Date.now() + 120000).toISOString() };
    await a.w.eval("rosterPull(true)"); await sleep(80);
    assert.equal(a.w.eval("S.cks[0].state"), "ok", "stale new doesn't revert");
    // once the OIC settles it, that decision is what stays, and the leader stops re-sending it
    payload = { ct: await mk("ok"), updated_at: new Date(Date.now() + 180000).toISOString() };
    await a.w.eval("rosterPull(true)"); await sleep(80);
    assert.equal(a.w.eval("S.cks[0].oic"), 1); assert.equal(a.w.eval("ckOut().length"), 0);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("OIC: a section leader's confirm settles that section's row only, once, and republishes", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.leaderMode=true;S.source="mol";S.onb=true;S.welcomed=1;S.board={id:"b1",rk:"r".repeat(30),wk:"w".repeat(30),sk:{},rsig:{},rat:{}};
      S.roster=[{id:"u1",rank:"LCPL",name:"MUNIZ, LUIS",sec:"UT",status:"On Hand"},{id:"h1",rank:"SGT",name:"HALL, TOM",sec:"HQ",status:"On Hand"}];
      S.cks=[{cid:"c1",mid:"u1",who:"LCPL MUNIZ",sec:"UT",st:"Appointment",t:Date.now(),state:"new"},{cid:"c2",mid:"h1",who:"SGT HALL",sec:"HQ",st:"Leave",t:Date.now(),state:"new"}];save()`);
    assert.equal(a.w.eval(`ckFromLeader("UT",[{cid:"c1",state:"ok",by:"SGT HALL"},{cid:"c2",state:"ok",by:"SGT HALL"},{cid:"zz",state:"ok"}])`), true);
    assert.equal(a.w.eval("S.cks[0].state"), "ok"); assert.equal(a.w.eval("S.cks[0].by"), "SGT HALL");
    assert.equal(a.w.eval("S.cks[1].state"), "new", "UT's leader can't settle HQ's check-in");
    assert.match(JSON.stringify(a.w.eval("S.act")), /confirmed by SGT HALL/);
    assert.equal(a.w.eval(`ckFromLeader("UT",[{cid:"c1",state:"no"}])`), false, "already settled: not changed again");
    assert.equal(a.w.eval("S.cks[0].state"), "ok");
    assert.equal(a.w.eval(`ckFromLeader("HQ",[{cid:"c2",state:"no",dnote:"call me"}])`), true);
    assert.equal(a.w.eval("S.cks[1].state"), "no"); assert.equal(a.w.eval("S.cks[1].dnote"), "call me");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
