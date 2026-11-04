// The ATT (Attached) tab opens the Attached list, not another screen or person.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const setup = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;view="board";render();`;

test("tapping the ATT tab / Home ATT card shows the Attached list", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(setup);
    a.w.eval(`S.roster.push({id:"att1",rank:"SGT",name:"DOE, JOHN A.",sec:"ATT",status:"On Hand",duty:"Full Duty",parent:"CLB-3",detail:"Attached"});save();render();`);
    const btn = a.w.document.querySelector('[data-go="att"]');
    assert.ok(btn, "there is an ATT button");
    btn.click();
    await sleep(200);
    assert.equal(a.w.eval("view"), "att");
    const head = a.w.document.querySelector("#main .sechead h2");
    assert.ok(head && /^ATT/.test(head.textContent), "Attached section page is shown, got: " + (head && head.textContent));
    assert.match(a.w.document.querySelector("#main").textContent, /DOE, JOHN A\./);
  } finally { await a.close(); }
});
