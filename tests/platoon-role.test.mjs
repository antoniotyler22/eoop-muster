// Company level: a "Platoon" role gives one platoon only (EOOP, GEMP…).
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("company level: Platoon role per platoon in Logins, Invite and Send out; a login opens that platoon only", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(`S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.level="co";
      SECTIONS.splice(0,SECTIONS.length,["EOOP","Engineer Ops"],["GEMP","General Engineering"]);S.secs=SECTIONS.map(x=>x.slice());
      S.roster=S.roster.slice(0,4);S.roster.forEach((m,i)=>m.sec=i<2?"EOOP":"GEMP");
      S.board={id:"board00001",rk:"${"r".repeat(32)}",wk:"${"w".repeat(32)}",ek:"${"A".repeat(43)}"};save();`);
    const r = a.w.eval(`(()=>{const s=lgRoles().find(r=>r.k==="secl");return {n:s.n,ds:s.ds.map(d=>d.id+"|"+d.l).join(";")}})()`);
    assert.equal(r.n, "Platoon");
    assert.equal(r.ds, "sec:EOOP|EOOP (Engineer Ops) platoon;sec:GEMP|GEMP (General Engineering) platoon");
    assert.equal(a.w.eval(`lgRoleOf("sec:GEMP")`), "Platoon");
    assert.match(await a.w.eval(`lgHash("sec:GEMP",true)`), /s=GEMP/, "the link opens GEMP only");
    a.w.eval(`view="invite";render();{const s=$("#soRole");s.value="secl";s.dispatchEvent(new Event("change",{bubbles:true}))}`); await sleep(10);
    a.w.eval(`$("[data-soall]").click()`); await sleep(10);
    const opts = JSON.parse(a.w.eval(`JSON.stringify([...document.querySelectorAll("[data-sorole] option")].map(o=>o.textContent))`));
    assert.ok(opts.includes("Platoon · EOOP") && opts.includes("Platoon · GEMP"), opts.join(","));
    const sel = JSON.parse(a.w.eval(`JSON.stringify([...document.querySelectorAll("[data-sorole]")].map(s=>s.value))`));
    assert.deepEqual(sel, ["secl:EOOP", "secl:EOOP", "secl:GEMP", "secl:GEMP"], "each person defaults to their own platoon");
    a.w.eval(`view="logins";render();{const s=$("#lgRole");s.value="secl";s.dispatchEvent(new Event("change",{bubbles:true}))}`); await sleep(10);
    assert.match(a.$('label[for="lgDest"]').textContent, /Platoon/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
