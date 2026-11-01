// Home: a second donut shows who is not on hand, by reason, and the old text line is gone.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("Home shows an off-deck donut with a legend and no 'Present · Off deck' text line", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.roster=S.roster.slice(0,12);
      const st=["On Hand","On Hand","On Hand","SIQ","SIQ","Leave","Leave","Leave","TAD","Operation","Other","Appointment"];
      S.roster.forEach((m,i)=>{m.sec="HQ";m.status=st[i]});save();view="board";render()`);
    await sleep(150);
    assert.ok(a.$("#main .card.hero .hdn"), "donut present");
    assert.equal(a.$("#main .hdn .tx b").textContent, "9", "9 not on hand (adds up with 3 on hand to 12)");
    const segs = a.w.eval(`document.querySelectorAll("#main .hdn svg circle:not(.bg)").length`);
    assert.equal(segs, 6, "Appointment, SIQ, Operation, TAD, Leave, Other");
    assert.match(a.$("#main .hdl").textContent, /Leave 3/);
    assert.doesNotMatch(a.$("#main .card.hero").textContent, /Present \d+ · Off deck/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
