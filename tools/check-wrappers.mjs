// Guard against more layers of "render=function"/"save=function" overrides, the pattern behind repeated status-reverting bugs.
// Ceilings are today's counts (4.140.0). Adding a wrapper fails the test: put the logic in an existing module, or lower the
// count by merging layers and then lower the ceiling here.
import fs from "node:fs";
const root = new URL("../", import.meta.url).pathname;
const files = ["app.js", "v11.js", "v12.js", "v13.js", ...fs.readdirSync(root + "features").filter((f) => f.endsWith(".js")).map((f) => "features/" + f)];
const CEIL = { render: 85, save: 13, counts: 1 };
const got = { render: 0, save: 0, counts: 0 };
for (const f of files) { const t = fs.readFileSync(root + f, "utf8"); for (const k of Object.keys(got)) got[k] += (t.match(new RegExp("\\b" + k + "=function", "g")) || []).length; }
const over = Object.keys(CEIL).filter((k) => got[k] > CEIL[k]);
if (over.length) { console.error("Too many overrides: " + over.map((k) => `${k} ${got[k]} > ${CEIL[k]}`).join(", ")); process.exit(1); }
console.log("wrapper counts ok", JSON.stringify(got));
