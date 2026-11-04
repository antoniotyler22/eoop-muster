// OOD, Duty Driver, DNCO and DANCO replace Company Duties in the military version.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("military version: four duty statuses, no Company Duties, all count as present", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const st = a.w.eval(`STATUSES.slice()`);
    for (const s of ["OOD", "Duty Driver", "DNCO", "DANCO"]) assert.ok(st.includes(s), s);
    assert.ok(!st.includes("Company Duties"));
    const n = a.w.eval(`(()=>{const ms=S.roster.filter(m=>m.sec!=="ATT").slice(0,4);["OOD","Duty Driver","DNCO","DANCO"].forEach((s,i)=>ms[i].status=s);return ms.every(isPresent)})()`);
    assert.equal(n, true);
  } finally { await a.close(); }
});

test("old Company Duties people become On Hand; other versions keep Company Duties", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const r = a.w.eval(`(()=>{S.roster[0].status="Company Duties";S.pt.inc=["On Hand","Company Duties"];syncStatuses();
      const a1=S.roster[0].status,a2=S.pt.inc.slice();
      S.mode="police";syncStatuses();const b=STATUSES.includes("Company Duties")&&!STATUSES.includes("OOD");
      S.roster[1].status="Company Duties";S.mode="military";syncStatuses();return {a1,a2,b,c:S.roster[1].status}})()`);
    assert.equal(r.a1, "On Hand");
    assert.deepEqual([...r.a2].sort(), ["DANCO", "DNCO", "Duty Driver", "OOD", "On Hand"]);
    assert.equal(r.b, true);
    assert.equal(r.c, "On Hand");
  } finally { await a.close(); }
});

test("section-update codes round trip for the new statuses", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const r = a.w.eval(`["OOD","Duty Driver","DNCO","DANCO"].map(s=>okSt(SDEC[SCODE[s]]))`);
    assert.deepEqual([...r], ["OOD", "Duty Driver", "DNCO", "DANCO"]);
    assert.equal(a.w.eval(`okSt(SDEC.DUTY)`), "On Hand");
  } finally { await a.close(); }
});
