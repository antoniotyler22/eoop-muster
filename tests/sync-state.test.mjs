// Home: saved numbers are dimmed and labelled "Updating…" until the fresh pull lands, then the badge goes back to live.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const SETUP = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.roster=S.roster.slice(0,12);
  S.sync={on:true};S.board={id:"bd1",rk:"r",wk:"w",ek:"e",after:0,last:{}};S.secAt={HQ:Date.now()-3600000};save();view="board";render()`;
const badge = (a) => a.$("#main .card.hero > div:first-child > span:last-child");

test("Home dims the numbers and says Updating… until the pull finishes, then shows live + synced time", async () => {
  let release;
  const gate = new Promise((r) => { release = r; });
  const a = await openApp({ rpc: (fn) => (fn === "get_board_updates" ? gate : []) });
  try {
    a.w.eval(SETUP);
    await sleep(100);
    const hero = a.$("#main .card.hero");
    assert.ok(hero.classList.contains("af-sync"), "dimmed while syncing");
    assert.match(badge(a).textContent, /^Updating… · saved \d{4}$/);
    assert.ok(a.$("#sysIc").classList.contains("af-sync"), "status icon greyed while syncing");
    assert.match(a.$("#sysIc").getAttribute("aria-label"), /Updating… showing saved numbers/);
    const p = a.w.eval(`livePollBoard()`);
    release([]);
    await p; await sleep(100);
    assert.ok(!a.$("#main .card.hero").classList.contains("af-sync"), "undimmed after the pull");
    assert.match(badge(a).textContent, /^● Live sections · synced \d{4}$/);
    assert.ok(!a.$("#sysIc").classList.contains("af-sync"), "status icon back to blue");
    assert.match(a.$("#sysIc").getAttribute("aria-label"), /All systems working/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("Home says it can't reach the server (and how old the saved numbers are) when the pull fails", async () => {
  const a = await openApp({ rpc: (fn) => { if (fn === "get_board_updates") throw new Error("offline"); return []; } });
  try {
    a.w.eval(SETUP);
    await sleep(100);
    await a.w.eval(`livePollBoard()`);
    await sleep(100);
    assert.ok(!a.$("#main .card.hero").classList.contains("af-sync"), "not dimmed once we know it failed");
    assert.match(badge(a).textContent, /^Can't reach server · saved \d{4}$/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("Boards without Live sections are untouched", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.roster=S.roster.slice(0,12);S.board=null;save();view="board";render()`);
    await sleep(100);
    assert.ok(!a.$("#main .card.hero").classList.contains("af-sync"));
    assert.doesNotMatch(a.$("#main").textContent, /Updating…/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
