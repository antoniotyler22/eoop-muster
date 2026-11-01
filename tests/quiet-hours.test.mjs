import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { openApp, sleep } from "./harness.mjs";

test("Quiet hours: Settings panel saves the window and puts it on this phone's alert sign-up", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.onb=true;S.welcomed=1;S.leaderMode=true;view="data";render();`); await sleep(50);
    const d = a.w.document;
    assert.ok(d.getElementById("qhPanel"), "panel is in Settings");
    assert.equal(a.w.eval(`JSON.stringify(qhExtra())`), "{}", "off by default: nothing added to the sign-up");
    const cb = d.getElementById("qhOn"); cb.checked = true; cb.dispatchEvent(new a.w.Event("change", { bubbles: true })); await sleep(40);
    const x = a.w.eval(`JSON.parse(JSON.stringify(qhExtra()))`);
    assert.equal(JSON.stringify(x.qh), "[1320,360]");
    assert.equal(typeof x.tz, "number");
    assert.ok(a.w.eval(`SYNC_SKIP.includes("quiet")`), "the window stays on this phone");
  } finally { await a.close(); }
});

test("Quiet hours: the notify function holds back non-urgent alerts inside the window only", () => {
  const n = readFileSync(new URL("../supabase/functions/notify/index.ts", import.meta.url), "utf8");
  assert.match(n, /if \(quietNow\(sub\) && !payload\.help\) return "ok"/);
  const src = n.match(/function quietNow\(sub: any\): boolean \{[\s\S]*?\n\}\n/)[0].replace(/: any|: boolean/g, "");
  const quietNow = new Function(src + "; return quietNow;")();
  const at = (h, m = 0) => { const t = new Date(Date.UTC(2026, 9, 31, h, m)); return t.getTime(); };
  const real = Date.now;
  try {
    const sub = { qh: [1320, 360], tz: -600 }; // 2200–0600 in Hawaii (UTC-10)
    Date.now = () => at(8);   // 2200 HST
    assert.equal(quietNow(sub), true);
    Date.now = () => at(15);  // 0500 HST
    assert.equal(quietNow(sub), true);
    Date.now = () => at(16);  // 0600 HST
    assert.equal(quietNow(sub), false);
    Date.now = () => at(22);  // 1200 HST
    assert.equal(quietNow(sub), false);
    assert.equal(quietNow({}), false, "no window, always on");
    assert.equal(quietNow({ qh: [0, 0], tz: 0 }), false, "empty window ignored");
  } finally { Date.now = real; }
});
