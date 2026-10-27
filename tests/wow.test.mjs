// 1.6: templates, the headcount ring and celebration, demo drill, share card, Spanish.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("a template sets the groups and status words in one tap", async () => {
  const a = await openApp();
  try {
    await sleep(600);
    a.w.eval(`S.mode=null;S.welcomed=0;showWelcome()`); await sleep(50);
    a.$("[data-sgstart]").click(); await sleep(20);
    assert.equal(a.$$("[data-sgtpl]").length, 6, "six templates");
    a.$('[data-sgtpl="fire"]').click(); await sleep(20);
    a.$("#sgName").value = "Acme HQ";
    a.$("#sgGo").click(); await sleep(50);
    assert.equal(a.w.eval("S.mode"), "custom");
    assert.equal(a.w.eval("SECTIONS.map(s=>s[1]).join(',')"), "Floor 1,Floor 2,Floor 3,Wardens");
    assert.equal(a.w.eval("MODES.custom.v.here"), "At assembly point");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("Home ring counts up and celebrates at 100%", async () => {
  const a = await openApp();
  try {
    a.w.eval(`S.welcomed=1;S.onb=true;S.leaderMode=true;S.source="mol";S.roster=[];for(let i=0;i<4;i++)addMarine({name:"P "+i,sec:SECTIONS[0][0],status:i<3?"On Hand":"Leave"});save();view="board";render()`);
    const ring = a.$("#main .wring");
    assert.ok(ring, "ring on Home");
    assert.equal(ring.dataset.n, "3"); assert.equal(ring.dataset.t, "4");
    assert.ok(!a.$("#wWin"), "no celebration on first look");
    a.w.eval(`S.roster.forEach(m=>m.status="On Hand");render()`);
    assert.ok(a.$("#wWin"), "celebration at 100%");
    assert.match(a.$("#wWin").textContent, /All 4 accounted for/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("demo drill runs in its own screen and leaves real data alone", async () => {
  const a = await openApp();
  try {
    const before = a.w.eval("JSON.stringify(S.roster)");
    a.w.eval("startDemoDrill()");
    assert.ok(a.$("#wDrill") && !a.$("#wDrill").hidden);
    await sleep(2600);
    assert.ok(+a.$("#wDrill .wring").dataset.n >= 1, "people are checking in");
    a.$("#wDStop").click();
    assert.ok(a.$("#wDrill").hidden);
    assert.equal(a.w.eval("JSON.stringify(S.roster)"), before);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("Spanish: the main screens switch when the language is Español", async () => {
  const a = await openApp();
  try {
    a.w.eval(`S.welcomed=1;S.onb=true;S.leaderMode=true;S.lang="es";save()`);
    assert.equal(a.w.eval("afLangES()"), true);
    a.w.eval(`afStartES();view="board";render()`); await sleep(50);
    assert.match(a.$("#tabbar").textContent, /Inicio/);
    assert.match(a.$("#tabbar").textContent, /Herramientas/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
