import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("Search: the magnifier finds people, Inbox messages and Feed posts on this phone", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.onb=true;S.welcomed=1;S.leaderMode=true;
      const m=S.roster[0];m.dm={id:"thread12345abcdefgh",k:"k".repeat(32),ek:"x",ok:1};
      S.dmMsgs=S.dmMsgs||{};S.dmMsgs[m.dm.id]=[{id:1,t:Date.now(),txt:"Please bring the TRAILER to the range",by:"M",n:"",img:"",aud:"",d:0}];
      S.feeds=[{id:"f1",lk:"x",posts:[{id:5,t:Date.now(),txt:"Trailer inspections due Friday",by:"CO"}]}];`);
    assert.ok(a.w.document.getElementById("hSearch"), "the magnifier exists");
    a.w.document.getElementById("hSearch").click(); await sleep(60);
    assert.ok(a.w.document.getElementById("gsOv"), "search opens");
    const i = a.w.document.getElementById("gsQ"); i.value = "trailer";
    i.dispatchEvent(new a.w.Event("input", { bubbles: true })); await sleep(30);
    const res = a.w.document.getElementById("gsRes").innerHTML;
    assert.match(res, /MESSAGES · 1/); assert.match(res, /FEED · 1/);
    assert.match(res, /<mark>TRAILER<\/mark>/i, "the match is highlighted");
    a.w.document.querySelector('[data-gsc="feed"]').click(); await sleep(20);
    assert.doesNotMatch(a.w.document.getElementById("gsRes").innerHTML, /MESSAGES/);
    i.value = "<img src=x onerror=1>"; i.dispatchEvent(new a.w.Event("input", { bubbles: true })); await sleep(20);
    assert.doesNotMatch(a.w.document.getElementById("gsRes").innerHTML, /<img/, "typed text is escaped");
    a.w.document.getElementById("gsX").click();
    assert.equal(a.w.document.getElementById("gsOv"), null, "Cancel closes it");
  } finally { await a.close(); }
});
