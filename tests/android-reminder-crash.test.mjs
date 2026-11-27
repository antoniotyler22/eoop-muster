// 4.149.3: the Android app (4.125.1) crashed on Data and settings because MBN.on was true while MBN.reminder was missing.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p) => fs.readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("native.js sets up the daily reminder before the platform-specific blocks", () => {
  const n = read("native.js");
  const rem = n.indexOf("N.reminder = {"), store = n.indexOf("var store = {");
  assert.ok(store > 0 && rem > store, "the reminder comes after the store it uses");
  for (const later of ['N.platform === "ios"', 'N.platform === "android"', "LN.addListener("]) {
    const at = n.indexOf(later);
    assert.ok(at > rem, "the reminder is set up before " + later);
  }
});

test("the Phone panel and its buttons need MBN.reminder, not just MBN.on", () => {
  for (const f of ["app.js", "app.bundle.js"]) {
    const s = read(f);
    assert.match(s, /function nativeHTML\(\)\{if\(!\(window\.MBN&&MBN\.on&&MBN\.reminder\)\)return"";/, f + ": Data and settings opens without a reminder");
    assert.doesNotMatch(s, /if\(!\(window\.MBN&&MBN\.on\)\)return;const id=e\.target\.id;/, f + ": the reminder buttons check for MBN.reminder");
  }
});
