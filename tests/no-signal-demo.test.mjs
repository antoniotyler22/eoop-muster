// 4.118: with no signal, My Page shows a short "you can still check in" demo next to the check-in slide.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("the no-signal demo shows only while offline, under the check-in block", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.source="mol";S.onb=true;S.welcomed=1;S.leaderMode=true;S.role="oic";S.sync={on:true,code:"X"};S.feeds=[{id:"f",mk:"m",lk:"l",ek:"e",posts:[]}];S.askSt={on:false,t:Date.now()};view="mypg";render()`);
    await sleep(150);
    assert.equal(a.$("#nsCard"), null, "hidden with signal");
    a.w.eval(`fieldMode.netDown=true;render()`); await sleep(150);
    assert.ok(a.$("#nsCard"), "shown with no signal");
    assert.match(a.$("#nsCard").textContent, /You can still check in/);
    assert.equal(a.$(".mp-ck").nextElementSibling.id, "nsCard", "sits right after the check-in block");
    a.w.eval(`fieldMode.netDown=false;render()`); await sleep(150);
    assert.equal(a.$("#nsCard"), null, "gone when signal returns");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
