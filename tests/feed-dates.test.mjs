import { test } from "node:test"; import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";
test("dates in Feed posts are tappable and fill the calendar form", async () => {
  const a = await openApp(); const w = a.w;
  try {
    const hits = JSON.parse(w.eval(`JSON.stringify(fdDatesIn("Range Friday 11/20/26, dental Nov 3rd at 9:30 am, leave 2026-12-20, tomorrow", Date.parse("2026-10-28T12:00:00")).map(x=>x.d))`));
    assert.deepEqual(hits, ["2026-10-30", "2026-11-20", "2026-11-03", "2026-12-20", "2026-10-29"]);
    w.eval(`S.feeds=[{id:"f1",unit:"CLC-33",lk:true,posts:[{id:1,t:Date.now(),by:"OIC",txt:"Formation 0645 at the motor pool on 15 NOV.",to:{k:"all"}}]}];view="feed";render()`);
    assert.equal(w.eval(`document.querySelectorAll('.fdt').length`), 1);
    w.eval(`document.querySelector('.fdt').click()`); await sleep(200);
    assert.equal(w.eval("view"), "cal");
    assert.equal(w.eval(`document.getElementById('caD').value`), "2026-11-15");
    assert.equal(w.eval(`document.getElementById('caT').value`), "06:45");
    assert.equal(w.eval(`document.getElementById('caTi').value`), "Formation at the motor pool");
    assert.equal(w.eval(`document.getElementById('caWho').value`), "EVERYONE");
  } finally { await a.close(); }
});
