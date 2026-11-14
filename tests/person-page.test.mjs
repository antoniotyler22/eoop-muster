// 4.111.0: the person page is in the My Page look: header, circles, three tabs.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("person page: ring header, action circles, Plan/Details/More tabs hold every section", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.onb=true;S.welcomed=1;S.leaderMode=true;S.role="oic";S.roster=[{id:"p1",rank:"CPL",name:"MENSAH, SOLOMON G.",sec:"CE",status:"On Hand",pk:"k".repeat(28),ph:"3475559997"}];pid="p1";view="p";render()`);
    await sleep(300);
    assert.ok(a.$(".pg-head .mp-ring"), "ring header");
    assert.equal(a.$$(".pg-head .mp-hl").length, 5, "five circles");
    const vis = () => a.w.eval(`[...document.querySelectorAll("#main [data-pgt]")].filter(e=>e.style.display!=="none").map(e=>e.textContent.trim().slice(0,14)).join("|")`);
    assert.match(await vis(), /Due-outs/); assert.doesNotMatch(await vis(), /Notes|Dates/);
    a.$("[data-pgtab='det']").click(); await sleep(120);
    assert.match(await vis(), /Dates/); assert.match(a.$("#main").textContent, /Move to another section/);
    a.$("[data-pgtab='more']").click(); await sleep(120);
    assert.match(await vis(), /Notes/); assert.match(a.$("#main").textContent, /Delete person/);
    a.$("[data-pgc='msg']").click(); await sleep(300);
    assert.equal(a.w.eval(`view`), "dm");
  } finally { await a.close(); }
});
