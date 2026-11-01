// Home Today: a scrolling week strip; tap a day to see that day's agenda.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("Home shows a scrollable day strip and the tapped day's agenda", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";
      const d=n=>dkey(new Date(Date.now()+n*86400000));
      S.roster[1].cal=[{d:d(0),tm:"1000",ty:"APPT",ti:"Dental appointment",id:"a1"},{d:d(3),tm:"0800",ty:"TRNG",ti:"Range day",id:"a3"}];
      save();view="board";render()`);
    await sleep(150);
    const days = a.w.eval(`document.querySelectorAll("#twkDays .twd").length`);
    assert.ok(days >= 40, "a week back and weeks ahead: " + days);
    assert.match(a.$("#twkRows").textContent, /Dental appointment/, "today's agenda shows");
    const target = a.w.eval(`dkey(new Date(Date.now()+3*86400000))`);
    a.$(`[data-twd="${target}"]`).click(); await sleep(60);
    assert.match(a.$("#twkRows").textContent, /Range day/, "the tapped day's agenda shows");
    assert.doesNotMatch(a.$("#twkRows").textContent, /Dental appointment/);
    assert.ok(a.$("#twk .twk-h .chip"), "Back to today appears");
    a.$("#twk .twk-h .chip").click(); await sleep(60);
    assert.match(a.$("#twkRows").textContent, /Dental appointment/, "back on today");
    assert.deepEqual(a.errors.filter((e) => !/Not implemented|scrollTo/.test(e)), []);
  } finally { await a.close(); }
});

test("people away are collapsed into one row per type with counts; tap to see who", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";
      const d=n=>dkey(new Date(Date.now()+n*86400000));
      S.roster.slice(1,5).forEach(m=>{m.status="TAD";m.start=d(-1);m.end=d(2);m.detail="TAD(30 days or less)"});
      S.roster.slice(5,7).forEach(m=>{m.status="Leave";m.start=d(-3);m.end=d(9);m.detail="Leave(Annual)"});
      save();view="board";render()`);
    await sleep(150);
    assert.match(a.$("#twkRows .tws").textContent, /6\s*away/);
    assert.equal(a.w.eval(`document.querySelectorAll("#twkRows .twg").length`), 2, "one collapsed row per type");
    assert.equal(a.w.eval(`document.querySelectorAll("#twkRows .twp").length`), 0, "people hidden until tapped");
    a.$("[data-twg]").click(); await sleep(40);
    assert.ok(a.w.eval(`document.querySelectorAll("#twkRows .twp").length`) >= 2, "tapping lists who");
    assert.deepEqual(a.errors.filter((e) => !/scrollTo/.test(e)), []);
  } finally { await a.close(); }
});
