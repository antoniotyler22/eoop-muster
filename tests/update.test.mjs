// The installed web app updates itself: version.json matches the app, and a newer one triggers a reload.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./harness.mjs";

test("version.json matches the app version", () => {
  const av = fs.readFileSync(path.join(ROOT, "index.html"), "utf8").match(/window\.AV="([^"]+)"/)[1];
  assert.equal(JSON.parse(fs.readFileSync(path.join(ROOT, "version.json"), "utf8")).v, av);
});
test("index.html checks for a new version on open and when the app comes back", () => {
  const h = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  assert.match(h, /fetch\("version\.json\?t="/);
  assert.match(h, /visibilitychange",\(\)=>\{if\(!document\.hidden\)check\(\)/);
  assert.match(fs.readFileSync(path.join(ROOT, "sw.js"), "utf8"), /version\.json"\)\) return/);
});
