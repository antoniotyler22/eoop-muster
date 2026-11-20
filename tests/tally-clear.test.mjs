import test from "node:test";
import assert from "node:assert/strict";
import { openApp } from "./harness.mjs";
const sleep = ms => new Promise(r => setTimeout(r, ms));
test("Tally history can be deleted from the top, one at a time or all", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.source='mol';S.welcomed=1;S.onb=true;S.role='oic';S.ask=[{q:"one",a:"A",src:[],t:Date.now()},{q:"two",a:"B",src:[],t:Date.now()}];S.sup=[{q:"x",a:"y",t:1}];view="ask";render()`);
    await sleep(80);
    assert.ok(a.$("#akClear"), "Delete all button");
    a.w.eval(`document.querySelector('[data-akdel="0"]').click()`); await sleep(50);
    assert.equal(a.w.eval(`S.ask.length`), 1);
    a.w.eval(`document.querySelector('#akClear').click()`); await sleep(50);
    assert.equal(a.w.eval(`S.ask.length`), 1, "first tap only arms");
    a.w.eval(`document.querySelector('#akClear').click()`); await sleep(50);
    assert.equal(a.w.eval(`S.ask.length`), 0);
    assert.equal(a.w.eval(`S.sup.length`), 0);
  } finally { await a.close(); }
});
