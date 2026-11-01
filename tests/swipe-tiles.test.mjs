// 4.58.0: tiles with a × / Hide now slide left to show Hide (and Done / Delete).
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const LEAD = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.board={id:"b1",rk:"r",wk:"w",ek:"e",after:0,last:{},sk:{}};S.sync=null;save();`;
test("Needs-you rows get swipe choices; Hide works; the × is out of sight", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(LEAD + `S.rc.open=true;S.rc.start=Date.now();S.rc.rid="x1";S.rc.res={};S.rc.ci={};S.rc.live=null;save();view="utilities";render();`);
    await sleep(30);
    const sw = a.$$(".ny .sw"); assert.ok(sw.length >= 1, "needs-you rows are swipeable");
    assert.ok(a.$(".ny .sw [data-nyhide].sw-sr"), "the × is visually hidden but still there");
    const n = sw.length;
    a.$(".ny .sw .sw-b.hide").click(); await sleep(400);
    assert.equal(a.$$(".ny .sw").length, n - 1, "Hide removes the row");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("4.61.1: an opened tile stays open when Home redraws", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(LEAD + `S.rc.open=true;S.rc.start=Date.now();S.rc.rid="x1";S.rc.res={};S.rc.ci={};S.rc.live=null;save();view="utilities";render();`);
    await sleep(30);
    const t = a.$(".ny .sw .sw-t");
    const ev = (type, x) => t.dispatchEvent(new a.w.MouseEvent(type, { bubbles: true, clientX: x, clientY: 10, button: 0 }));
    ev("pointerdown", 200); for (let i = 1; i <= 8; i++) ev("pointermove", 200 - i * 15); ev("pointerup", 80);
    assert.ok(a.$(".ny .sw.open"), "slide opens it");
    a.w.eval(`render()`); await sleep(30);
    assert.ok(a.$(".ny .sw.open"), "still open after a redraw");
    a.w.document.body.dispatchEvent(new a.w.MouseEvent("pointerdown", { bubbles: true }));
    a.w.eval(`render()`); await sleep(30);
    assert.ok(!a.$(".ny .sw.open"), "a tap elsewhere closes it for good");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
