// 4.48.0: tapping an alert opens what it is about.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { openApp } from "./harness.mjs";

test("the service worker tells the open app where to go and keeps every alert target", () => {
  const sw = fs.readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  assert.match(sw, /postMessage\(\{ type: "open", open \}\)/);
  for (const k of ["checkins", "co", "owner", "feed", "live"]) assert.ok(sw.includes(`"${k}"`), k);
});

test("openFromAlert goes to the screen, even when already there or elsewhere", async () => {
  const a = await openApp();
  try {
    a.w.eval(`S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;view="board";render()`);
    a.w.eval(`openFromAlert("checkins")`); assert.equal(a.w.eval("view"), "checkins");
    a.w.eval(`openFromAlert("feed")`); assert.equal(a.w.eval("view"), "feed");
    a.w.eval(`openFromAlert("feed")`); assert.equal(a.w.eval("view"), "feed");
    a.w.eval(`openFromAlert("nonsense")`); assert.equal(a.w.eval("view"), "feed", "unknown targets are ignored");
    a.w.eval(`openFromAlert("owner")`); assert.notEqual(a.w.eval("view"), "owner", "not the owner: stays off the console");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
