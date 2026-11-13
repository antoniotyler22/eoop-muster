// 4.97: iPhone-style Settings
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("the gear opens grouped Settings; rows drill down and Back returns", async () => {
  const a = await openApp();
  try {
    a.$("#hSet").click(); await sleep(40);
    assert.equal(a.w.eval(`view`), "settings");
    assert.ok(a.$(".ios-grp"), "grouped list");
    assert.ok(a.$("#spPush") && a.$("#fmOn"), "toggles");
    a.$('[data-sp="appear"]').click(); await sleep(20);
    assert.ok(a.$(".ios-phs"), "Appearance page");
    a.$("[data-spback]").click(); await sleep(20);
    assert.ok(a.$(".ios-h1"), "back to the list");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("Appearance: Dark sets the theme, Automatic clears it", async () => {
  const a = await openApp();
  try {
    a.$("#hSet").click(); await sleep(20);
    a.$('[data-sp="appear"]').click(); await sleep(20);
    a.$("#spAuto").click(); await sleep(20);            // turn Automatic off
    a.$('[data-sptheme="dark"]').click(); await sleep(20);
    assert.equal(a.w.document.documentElement.getAttribute("data-theme"), "dark");
    assert.equal(a.w.eval(`S.theme`), "dark");
    a.$("#spAuto").click(); await sleep(20);
    assert.equal(a.w.document.documentElement.getAttribute("data-theme"), null);
  } finally { await a.close(); }
});

test("Field mode toggle works from Settings", async () => {
  const a = await openApp();
  try {
    a.$("#hSet").click(); await sleep(20);
    const sw = a.$("#fmOn"); sw.click(); await sleep(40);
    assert.equal(a.w.eval(`!!S.field`), true);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("Join a team with a link: a bad link is refused, a good one opens as its own team", async () => {
  const a = await openApp();
  try {
    a.w.eval(`S.source="file";S.roster=S.roster.slice(0,3);window.__h=null;TEAMS.openNew=h=>{window.__h=h}`);
    a.$("#hSet").click(); await sleep(20);
    a.$('[data-sp="join"]').click(); await sleep(20);
    a.$("#spLink").value = "hello"; a.$("#spJoin").click(); await sleep(20);
    assert.match(a.$("#spMsg").textContent, /doesn't look like an invite link/);
    a.$("#spLink").value = "https://x.github.io/eoop-muster/#fd=abc123def"; a.$("#spJoin").click(); await sleep(20);
    assert.equal(a.w.eval(`window.__h`), "#fd=abc123def");
  } finally { await a.close(); }
});
