import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("tour: when the app redraws the tab bar, the lit-up button is found again and still taps through", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.onb=true;S.welcomed=1;S.leaderMode=true;S.role="oic";S.source="mol";view="board";render()`);
    a.w.eval(`Element.prototype.getBoundingClientRect=function(){return {left:0,top:0,x:0,y:0,width:50,height:40,right:50,bottom:40}};Element.prototype.scrollIntoView=function(){}`);
    a.w.eval(`startTour("leader",[{s:'#tabbar [data-tab="people"]',tap:1,t:"People",b:"Tap <b>People</b>."},{t:"Next one",b:"x",end:1}])`);
    await sleep(400);
    const before = a.$('#tabbar [data-tab="people"]');
    assert.ok(before);
    a.w.eval(`renderTabs()`); // the app redraws the bar: the old button is gone
    await sleep(200);
    const after = a.$('#tabbar [data-tab="people"]');
    assert.notEqual(before, after, "the bar really was redrawn");
    assert.equal(a.$("#tour .tr-tap").hidden, false);
    after.dispatchEvent(new a.w.MouseEvent("click", { bubbles: true, cancelable: true }));
    assert.ok(a.w.eval("__tour().el.isConnected"), "the tour holds the new, visible button");
    assert.equal(a.w.eval(`__tour().el===document.querySelector('#tabbar [data-tab="people"]')`), true);
  } finally { await a.close(); }
});
