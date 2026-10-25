// Smoke tests: the real app opens, every screen draws without a script error, and the
// public check-in page sends a check-in. Run: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep, waitFor } from "./harness.mjs";

const VIEWS = ["board", "att", "pt", "w6", "text", "data", "muster", "alerts", "recall", "events", "armory", "rollup",
  "live", "send", "feed", "trends", "ready", "duty", "cal", "log", "me", "sys", "today", "ask", "people", "tools", "co", "act"];

test("app opens on the board with sample people and no script errors", async () => {
  const a = await openApp();
  try {
    assert.match(a.$("#main").textContent, /ON HAND/i);
    assert.ok(a.w.eval("S.roster.length") > 5, "sample roster loaded");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("every screen renders without throwing", async () => {
  const a = await openApp();
  try {
    for (const v of VIEWS) {
      a.w.eval(`view=${JSON.stringify(v)};render()`);
      await sleep(10);
      assert.ok(a.$("#main").innerHTML.length > 20, v + " drew something");
    }
    await sleep(200);
    assert.deepEqual(a.errors, [], "no errors while visiting " + VIEWS.length + " screens");
  } finally { await a.close(); }
});

test("every version (military, police, jobs, hr, civilian) opens", async () => {
  for (const mode of ["military", "police", "jobs", "hr", "civilian"]) {
    const a = await openApp();
    try {
      a.w.eval(`setMode(${JSON.stringify(mode)});save();render()`);
      a.w.eval(`view="board";render()`);
      assert.ok(a.$("#main").innerHTML.length > 50, mode);
      assert.deepEqual(a.errors, [], mode);
    } finally { await a.close(); }
  }
});

test("public check-in link sends a hashed check-in, never the name", async () => {
  let got = null;
  const a = await openApp({ hash: "ci=abc12345xyz&u=1ST%20PLT&l=1", noWait: true, rpc: (fn, args) => { if (fn === "checkin") got = args; return null; } });
  try {
    await waitFor(() => a.$("#ciN"));
    a.$("#ciN").value = "cpl smith";
    a.$('[data-c="1"]').click();
    await waitFor(() => got);
    assert.equal(got.p_recall, "abc12345xyz");
    assert.equal(got.p_code, 1);
    assert.ok(Array.isArray(got.p_words) && got.p_words.length === 2);
    assert.ok(!JSON.stringify(got).includes("SMITH"), "name is hashed before it leaves the phone");
  } finally { await a.close(); }
});

test("PIN lock: wrong PIN is refused, right PIN opens the vault", async () => {
  // Make a locked vault with the app's own code, then reopen.
  const a = await openApp();
  await a.w.VAULT.setPin("246810", a.w.eval("JSON.stringify(S)"), {});
  const store = {};
  for (let i = 0; i < a.w.localStorage.length; i++) { const k = a.w.localStorage.key(i); store[k] = a.w.localStorage.getItem(k); }
  await a.close();
  const b = await openApp({ storage: store, noWait: true });
  try {
    await waitFor(() => !b.$("#lock").hidden);
    const press = (d) => b.$(`[data-k="${d}"]`).click();
    for (const d of "111111") press(d);
    await waitFor(() => /Wrong PIN/.test(b.$("#lockErr").textContent), 8000);
    for (const d of "246810") press(d);
    await waitFor(() => b.w.__appReady === true, 15000);
    assert.ok(b.$("#lock").hidden);
  } finally { await b.close(); }
});
