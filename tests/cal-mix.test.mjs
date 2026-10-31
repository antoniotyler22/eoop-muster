// 4.65.0: Plan › Calendar: heat month with counts, Month/Week fold, Leave/TAD/Appts tiles, timeline.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const LEAD = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.sync=null;`;
const DATA = `const k=dkey();const p=n=>dkey(new Date(Date.now()+n*864e5));
  S.roster[0].status="Leave";S.roster[0].start=p(-2);S.roster[0].end=p(3);
  S.roster[1].status="TAD";S.roster[1].start=p(-1);S.roster[1].end=p(5);
  S.roster[2].cal=[{id:"a1",d:k,tm:"09:00",ty:"APPT",ti:"Dental"}];
  S.roster[3].cal=[{id:"a2",d:k,tm:"13:30",ty:"APPT",ti:"Medical"}];save();calDay=null;calM=null;calSec="ALL";view="cal";render();`;

test("heat month, tiles, open a tile to see its rows, timeline", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`try{localStorage.removeItem("af-calmode")}catch(e){};calMix.mode="month";calMix.open="";` + LEAD + DATA); await sleep(20);
    const today = a.w.eval("dkey()");
    const tb = a.$(`[data-cday="${today}"]`); assert.ok(tb.classList.contains("cm-d") && tb.classList.contains("today"));
    assert.match(tb.textContent, /\d+\s*4|4$/, "today shows how many are on the calendar");
    assert.ok(!a.$("#main .panel i[style*='border-radius:50%']"), "no more dots");
    const tiles = a.$$(".cm-t"); assert.ok(tiles.length >= 3);
    const txt = tiles.map(t => t.textContent.replace(/\s+/g, " ")).join("|");
    assert.match(txt, /1\s*Leave/); assert.match(txt, /1\s*TAD/); assert.match(txt, /2\s*Appts/);
    assert.ok(a.$(".cm-list").hidden, "rows tucked away until a tile is tapped");
    a.$('[data-cmg="ap"]').click(); await sleep(10);
    assert.ok(!a.$(".cm-list").hidden); assert.equal(a.$$(".cm-list .rrow:not([hidden])").length + a.$$(".cm-list .sw:not([hidden])").length >= 2, true);
    assert.equal(a.$$(".cm-e").length, 2, "two timed things on the timeline");
    assert.match(a.$(".cm-e").textContent, /0900 · Dental/);
    a.$('[data-cmmode="week"]').click(); await sleep(10);
    const shown = a.$$(".cm-grid [data-cday]").filter(b => !b.hidden).length; assert.ok(shown <= 7 && shown >= 1, "week shows one row");
    a.$('[data-cmmode="month"]').click(); await sleep(10);
    assert.ok(a.$$(".cm-grid [data-cday]").filter(b => !b.hidden).length >= 28);
    assert.doesNotMatch(a.$("#main").textContent, /Next 14 days/, "no Next 14 days list");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
