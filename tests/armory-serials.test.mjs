// 4.137.0: the Armory keeps the rack, the full weapon serial and the RCO serial for each person.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("weapon serial and RCO serial save, show, import and export", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.source="mol";S.welcomed=1;S.onb=true;S.role="oic";S.roster=[{id:"x1",rank:"SGT",name:"LEE, JAMIE",sec:"UT",status:"On Hand"}];save();view="armory";render()`);
    a.w.eval(`wEdit="x1";renderArmory()`); await sleep(40);
    a.w.eval(`document.querySelector("#wR").value="12";document.querySelector("#wS").value="ab-123456";document.querySelector("#wO").value="rco 998877";document.querySelector('[data-wsave="x1"]').click()`); await sleep(80);
    assert.equal(a.w.eval(`(()=>{const w=S.roster[0].wpn;return [w.rack,w.sn,w.rco,w.s4].join("|")})()`), "12|AB123456|RCO998877|3456");
    assert.match(a.$("#main").textContent, /SN AB123456/);
    assert.match(a.$("#main").textContent, /RCO RCO998877/);
    // template with the new columns, matched by name
    a.w.eval(`S.roster.push({id:"x2",rank:"CPL",name:"RIVERA, ANA",sec:"UT",status:"On Hand"});importWeapons("Name,Weapon,Rack,Serial,RCO Serial\\nRIVERA ANA,M4A1,7,W555111,R222333\\n")`);
    assert.equal(a.w.eval(`(()=>{const w=S.roster[1].wpn;return [w.t,w.rack,w.sn,w.rco].join("|")})()`), "M4A1|7|W555111|R222333");
    const csv = a.w.eval(`exportCSV()`);
    assert.match(csv, /Weapon Serial,RCO Serial/);
    assert.match(csv, /"AB123456","RCO998877"/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
