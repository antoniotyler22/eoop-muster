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
  assert.match(n, /if \(quietNow\(sub\) && !payload\.help && !payload\.dig\) \{ await digestHold\(sub, payload\); return "ok"; \}/);
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

test("Morning summary: panel adds the summary time to the alert sign-up only when Quiet hours and the summary are both on", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.onb=true;S.welcomed=1;S.leaderMode=true;view="data";render();`); await sleep(50);
    const d = a.w.document;
    assert.ok(d.getElementById("qhDg") && d.getElementById("qhDgAt"), "summary switch and time are in the panel");
    assert.equal(d.getElementById("qhDgAt").value, "07:00", "default 07:00");
    const flip = (id, fn) => { const el = d.getElementById(id); fn(el); el.dispatchEvent(new a.w.Event("change", { bubbles: true })); };
    flip("qhDg", (el) => { el.checked = true; }); await sleep(30);
    assert.equal(a.w.eval(`JSON.stringify(qhExtra())`), "{}", "Quiet hours off: nothing sent, summary or not");
    flip("qhOn", (el) => { el.checked = true; }); await sleep(30);
    assert.equal(a.w.eval(`qhExtra().dg`), 420, "07:00 = 420 local minutes");
    assert.match(d.getElementById("qhNote").textContent, /Summary at 07:00/);
    flip("qhDgAt", (el) => { el.value = "06:30"; }); await sleep(30);
    assert.equal(a.w.eval(`qhExtra().dg`), 390);
    flip("qhDg", (el) => { el.checked = false; }); await sleep(30);
    assert.equal(a.w.eval(`"dg" in qhExtra()`), false, "summary off: dropped like before");
    assert.doesNotMatch(d.getElementById("qhNote").textContent, /Summary/);
  } finally { await a.close(); }
});

test("Morning summary: delivery time, wording and the hold-back path in the notify function", () => {
  const n = readFileSync(new URL("../supabase/functions/notify/index.ts", import.meta.url), "utf8");
  const block = n.slice(n.indexOf("// <digest>"), n.indexOf("// </digest>")).replace(/: any|: boolean|: number|: string/g, "");
  const { nextDigestAt, digestPayload, digestCat, subKey } = new Function(block + "; return { nextDigestAt, digestPayload, digestCat, subKey };")();
  const at = (d, h, m = 0) => Date.UTC(2026, 9, d, h, m);
  const hst = { qh: [1320, 360], tz: -600, dg: 420 }; // quiet 2200-0600, summary 0700, Hawaii (UTC-10)
  assert.equal(nextDigestAt(hst, at(31, 8)), at(31, 17), "2200 HST: next 0700 HST is the next morning");
  assert.equal(nextDigestAt(hst, at(31, 16, 30)), at(31, 17), "0630 HST: same morning");
  assert.equal(nextDigestAt(hst, at(31, 17)), at(32, 17), "exactly 0700: tomorrow, not now");
  assert.equal(nextDigestAt({ qh: [1320, 360], tz: -600 }, at(31, 8)), null, "no dg: no summary");
  assert.equal(nextDigestAt({ dg: 1440, tz: 0 }, at(31, 8)), null, "bad time ignored");
  assert.equal(nextDigestAt({ dg: 0, tz: 0 }, at(31, 8)), at(32, 0), "midnight works");
  assert.equal(digestCat("feed"), "feed"); assert.equal(digestCat("recall"), "checkins"); assert.equal(digestCat("live"), "board"); assert.equal(digestCat(undefined), "board");
  assert.equal(subKey({ apns: "abc123def" }), "apns:abc123def");
  assert.equal(subKey({ endpoint: "https://push.example/x" }), "https://push.example/x");
  assert.equal(subKey(null), "");
  const p = digestPayload({ dm: 2, feed: 3 });
  assert.equal(p.body, "3 Word of Mouth posts, 2 messages. Open the app.");
  assert.equal(p.open, "feed"); assert.equal(p.dig, true); assert.equal(p.help, false);
  assert.equal(digestPayload({ dm: 1 }).body, "1 message. Open the app.");
  assert.equal(digestPayload({ feed: 5, dm: 4, talk: 3, checkins: 2, board: 1 }).body, "5 Word of Mouth posts, 4 messages, 3 Talk messages, 2 check-ins and more. Open the app.");
  assert.equal(digestPayload({}), null); assert.equal(digestPayload({ dm: 0 }), null);
  assert.match(n, /await digestSend\(\);/, "the minute job sends due summaries");
  assert.match(n, /rpc\("digest_take"/); assert.match(n, /rpc\("digest_add"/);
});
