// Builds supabase/functions/hub/index.ts from app.js so the server hub runs the exact same
// merge / publish code as the OIC's phone. Run after changing app.js:  node tools/build-hub.mjs
// Needs: npm i -D acorn acorn-walk
import * as acorn from "acorn"; import * as walk from "acorn-walk"; import fs from "fs";
const root = new URL("..", import.meta.url).pathname;
const src = fs.readFileSync(root + "app.js", "utf8");
const ROOTS = ["livePollBoard", "livePollCal", "rpPublish", "coPush", "codeKeys", "sealObj", "openBlob", "syncObj", "setBase", "sig", "SECTIONS", "DEF_SECS", "MODES", "secFix"];
// Phone-only things the server replaces with no-ops or its own versions.
const STOP = new Set(("render,renderTabs,toast,save,rawSave,view,armed,syncSchedule,rpSchedule,mpSchedule,coSchedule,linkSchedule,tabRedraw," +
  "fdPushAttach,fdPollAll,S,sampleRoster,renderLive,renderAct,mpPublish,syncPush,syncPull,rosterPull,linkPush,fdMeHash,joinCoFeed,tabBadge").split(","));
const ast = acorn.parse(src, { ecmaVersion: "latest", sourceType: "script" });
const defs = new Map();
for (const st of ast.body) {
  if (st.type === "FunctionDeclaration") defs.set(st.id.name, st);
  else if (st.type === "VariableDeclaration") for (const d of st.declarations) walk.full(d.id, n => { if (n.type === "Identifier") defs.set(n.name, st); });
}
const used = st => { const s = new Set(); walk.full(st, n => { if (n.type === "Identifier") s.add(n.name); }); return s; };
const want = new Set(), stmts = new Set(), q = [...ROOTS];
while (q.length) { const n = q.pop(); if (want.has(n)) continue; want.add(n); if (STOP.has(n)) continue;
  const st = defs.get(n); if (!st) continue; stmts.add(st); for (const u of used(st)) if (!want.has(u)) q.push(u); }
let core = ast.body.filter(s => stmts.has(s)).map(s => src.slice(s.start, s.end)).join("\n");
// The phone fires the calendar pull alongside the board pull; the server runs them one after the other.
const P1 = "livePollCal();lvBusy=true;"; if (!core.includes(P1)) throw new Error("app.js changed: update the livePollBoard patch");
core = core.replace(P1, "lvBusy=true;");
const tpl = fs.readFileSync(root + "supabase/functions/hub/template.ts", "utf8");
if (!tpl.includes("/*__CORE__*/")) throw new Error("template marker missing");
const out = tpl.replace("/*__CORE__*/", () => core);
fs.writeFileSync(root + "supabase/functions/hub/index.ts", out);
console.log("hub/index.ts written:", stmts.size, "pieces from app.js,", out.length, "chars");
