// Visitor logins: made on the leader's phone, cut off at the set time on both phones.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep, waitFor } from "./harness.mjs";

const lead = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.feeds=[{id:"feedaaaaaaaa",mk:"m".repeat(32),lk:"l".repeat(32),ek:b64url(crypto.getRandomValues(new Uint8Array(32))),unit:"1ST",posts:[]}];save();`;

test("leader makes a visitor login with an end time; it goes in the visitor log; time up ends it", async () => {
  const calls = [];
  const a = await openApp({ rpc: (fn, args) => { calls.push([fn, args]); return null; } });
  try {
    a.w.eval(lead + `view="visitors";render()`);
    assert.ok(a.$("#vlBox"), "panel on Visitors");
    a.$("#vlOpen").click(); await sleep(5);
    a.w.eval(`$("#vlName").value="Jordan Lee";$("#vlTo").value="jordan@example.com";location.href="about:blank#"`);
    a.$('[data-vlh="2"]').click(); await sleep(5);
    a.w.eval(`$("#vlName").value="Jordan Lee";$("#vlTo").value=""`);
    a.$("#vlMake").click();
    await waitFor(() => a.w.eval(`(S.logins||[]).some(L=>L.vis)`), 10000);
    const L = a.w.eval(`S.logins.find(L=>L.vis)`);
    assert.equal(L.who, "Jordan Lee"); assert.ok(L.until > Date.now() + 7000000 && L.until < Date.now() + 7300000, "about 2 h");
    assert.match(L.h, /^feed=.*&until=\d+&vis=1$/);
    assert.ok(calls.some(c => c[0] === "login_put")); assert.ok(calls.some(c => c[0] === "login_expire"));
    assert.ok(a.w.eval(`S.vis.some(v=>v.n==="Jordan Lee"&&!v.out)`), "signed in to the visitor log");
    a.w.eval(`S.logins.find(L=>L.vis).until=Date.now()-1000`);
    a.w.eval(`vlTick()`);
    await waitFor(() => !a.w.eval(`(S.logins||[]).some(L=>L.vis)`), 5000);
    assert.ok(calls.some(c => c[0] === "login_delete"), "deleted on the server");
    assert.ok(a.w.eval(`S.vis.find(v=>v.n==="Jordan Lee").out>0`), "signed out of the visitor log");
  } finally { await a.close(); }
});

test("visitor's phone: an ended login won't open; a live one drops the Feed at the end time", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const ek = "A".repeat(43);
    a.w.eval(`fdJoinPrompt(new URLSearchParams("feed=feedbbbbbbbb&k=${"k".repeat(32)}&e=${ek}&u=1ST&until=${Date.now() - 1000}&vis=1"))`);
    assert.ok(a.$("#sheet").hidden !== false || !a.$("#fjYes"), "no join sheet for an ended login");
    a.w.eval(`fdJoinPrompt(new URLSearchParams("feed=feedcccccccc&k=${"k".repeat(32)}&e=${ek}&u=1ST&until=${Date.now() + 60000}&vis=1"))`);
    assert.ok(a.$("#fjYes"), "join sheet for a live one");
    a.w.eval(`S.tos=99;$("#fjMe").value="JORDAN LEE"`); a.$("#fjYes").click(); await sleep(20);
    a.w.eval(`vlTick()`);
    assert.ok(a.w.eval(`S.feeds.find(f=>f.id==="feedcccccccc").until>Date.now()`), "end time kept on the feed");
    a.w.eval(`S.feeds.find(f=>f.id==="feedcccccccc").until=Date.now()-1;vlTick()`);
    assert.equal(a.w.eval(`S.feeds.some(f=>f.id==="feedcccccccc")`), false, "feed dropped at the end time");
  } finally { await a.close(); }
});
