// 4.110.0: "View their My page" is the new My Page, read-only, with no "Messaging as" strip.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("View their My page shows the new My Page for that person", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.onb=true;S.welcomed=1;S.leaderMode=true;S.role="oic";S.postAs="MSGT BERGAOUI";S.roster=[{id:"p1",rank:"CPL",name:"MENSAH, SOLOMON G.",sec:"CE",status:"On Hand",pk:"k".repeat(28)}];pid="p1";view="p";render()`);
    await sleep(150);
    a.$("#v12PView").click(); await sleep(250);
    assert.equal(a.w.eval(`view`), "mepv");
    assert.ok(a.$(".mp-head"), "new My Page header");
    assert.ok(a.$(".mp-tabs"), "new tabs");
    assert.match(a.$(".mp-name").textContent, /Mensah/i);
    assert.ok(!a.$("#dmAs"), "no Messaging as strip");
    assert.ok(!a.$("#ckCard"), "no check-in controls for the leader");
    a.$("[data-mptab='cal']").click(); await sleep(150);
    assert.equal(a.w.eval(`view`), "mepv");
    assert.ok(a.$(".mp-week"), "calendar tab");
    a.$("#v12PMsg").click(); await sleep(250);
    assert.equal(a.w.eval(`view`), "dm");
  } finally { await a.close(); }
});
