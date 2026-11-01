import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { openApp, sleep } from "./harness.mjs";

test("SOS: a leader phone gets a red alert with name, map link and 'I'm responding'", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.onb=true;S.welcomed=1;S.leaderMode=true;
      sosIn({id:"abcdefghij1"},{k:"sos",sid:"s1abc",me:"CPL DIAZ",kind:"Medical",lat:21.4389,lng:-157.7,acc:12,t:Date.now()},{created_at:new Date().toISOString()});`);
    await sleep(40);
    const d = a.w.document, ov = d.getElementById("sosOv");
    assert.ok(ov, "alert overlay shows");
    assert.match(ov.textContent, /CPL DIAZ/); assert.match(ov.textContent, /Medical/);
    assert.match(ov.innerHTML, /maps\.google\.com\/\?q=21\.4389,-157\.7/);
    a.w.eval(`sosIn({id:"abcdefghij1"},{k:"sos",sid:"s1abc",me:"CPL DIAZ",kind:"Medical"},{})`);
    assert.equal(a.w.eval(`S.sos.length`), 1, "the same SOS is not added twice");
    d.querySelector("[data-sosack]").click(); await sleep(20);
    assert.equal(d.getElementById("sosOv"), null, "acknowledged: the alert clears");
    assert.equal(a.w.eval(`S.sos[0].st`), "ack");
    a.w.eval(`sosIn({id:"abcdefghij1"},{k:"sos",sid:"s2",me:"<b>X</b>",kind:"Evil",lat:999,lng:1},{})`);
    const o2 = d.getElementById("sosOv").innerHTML;
    assert.doesNotMatch(o2, /<b>X/); assert.doesNotMatch(o2, /maps\.google/, "bad coordinates are dropped");
    assert.match(o2, /Help/, "unknown kinds fall back to Help");
  } finally { await a.close(); }
});

test("SOS: holding the button for 3 seconds sends an encrypted request and a leader alert", async () => {
  const calls = [];
  const a = await openApp({ rpc: (n, args) => { calls.push([n, args]); return 1; } });
  try {
    await a.w.eval(`S.onb=true;S.welcomed=1;
      S.feeds=[{id:"abcdefghij1",mk:"m".repeat(24),ek:"A".repeat(43),me:"CPL DIAZ",posts:[]}];
      window.__n=null;SB.notify=function(_,b){window.__n=b};
      view="sos";render();`);
    await sleep(40);
    const d = a.w.document, b = d.getElementById("sosBtn");
    assert.ok(b, "SOS screen is open");
    b.dispatchEvent(new a.w.Event("pointerdown", { bubbles: true, cancelable: true }));
    await sleep(1000);
    b.dispatchEvent(new a.w.Event("pointerup", { bubbles: true }));
    await sleep(60);
    assert.equal(calls.filter((c) => c[0] === "feed_req").length, 0, "letting go early sends nothing");
    b.dispatchEvent(new a.w.Event("pointerdown", { bubbles: true, cancelable: true }));
    await sleep(3500);
    const c = calls.find((x) => x[0] === "feed_req");
    assert.ok(c, "feed_req sent after a full hold");
    assert.equal(c[1].p_member_key, "m".repeat(24));
    assert.ok(!/CPL DIAZ/.test(JSON.stringify(c[1])), "name is inside the encrypted payload only");
    const n = a.w.eval(`JSON.parse(JSON.stringify(window.__n))`);
    assert.equal(n.alert, "sos"); assert.equal(n.ti, "CPL DIAZ"); assert.match(n.tx, /^Help/);
  } finally { await a.close(); }
});

test("SOS: notify has an urgent leader alert, and alert taps open the right screen", () => {
  const n = readFileSync(new URL("../supabase/functions/notify/index.ts", import.meta.url), "utf8");
  assert.match(n, /body\.alert === "sos"/);
  assert.match(n, /help: true, open: "sos"/, "urgent so it gets through Quiet hours");
  assert.match(n, /member_key_hash/);
  const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  assert.match(sw, /"dm", "talk", "sos"/, "Inbox, Talk and SOS alerts no longer open the recall screen");
  const no = readFileSync(new URL("../features/notif-open.js", import.meta.url), "utf8");
  assert.match(no, /data-tab="\$\{o==="dm"\?"inbox":"talk"\}"/);
});
