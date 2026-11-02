// On Hand rows carry no leftover status text ("Urgent care"); other statuses still show their note and location.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";
test("a person back On Hand shows no old note under their name", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.source="mol";S.onb=true;S.welcomed=1;S.roster=[{id:"a1",rank:"CPL",name:"SAHAGUN, IVAN A.",sec:"HE",status:"On Hand",detail:"Urgent care",loc:"Clinic"},{id:"a2",rank:"CPL",name:"WEBSTER, B",sec:"HE",status:"TAD",detail:"Range week",loc:"Puuloa",start:"01 NOV 2026",end:"05 NOV 2026"}];view="he";render()`);
    await sleep(250);
    const txt = a.w.eval(`[...document.querySelectorAll("#main .m")].map(r=>r.textContent).join("|")`);
    assert.ok(!/Urgent care/.test(txt), "no stale note on On Hand");
    assert.ok(/Range week/.test(txt) && /Puuloa/.test(txt), "TAD still shows its note and location");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
