// 4.59.0: scan a paper roster; review rows; apply only ticked ones.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("statuses map from what people write", async () => {
  const a = await openApp();
  try {
    assert.equal(a.w.eval(`rosterScanMap("P")`), "On Hand");
    assert.equal(a.w.eval(`rosterScanMap("lv")`), "Leave");
    assert.equal(a.w.eval(`rosterScanMap("SIQ")`), "SIQ");
    assert.equal(a.w.eval(`rosterScanMap("dental")`), "Appointment");
  } finally { await a.close(); }
});

test("a scan shows each row matched to the roster; Apply changes only ticked rows", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.roster=[{id:"r1",rank:"SGT",name:"RUIZ, AL",sec:"HQ",status:"On Hand"},{id:"r2",rank:"CPL",name:"PARK, DEE",sec:"HQ",status:"On Hand"}];SB.afn="ask";save();view="scan";render()`);
    assert.ok(a.$("#rsFile"), "photo picker");
    a.w.eval(`rosterScanReview([{rank:"SGT",name:"RUIZ, AL",status:"Leave"},{rank:"",name:"NOBODY",status:"P"},{rank:"CPL",name:"PARK",status:"P"}])`);
    assert.equal(a.$$(".rs-row").length, 3);
    assert.ok(a.$('[data-rson="0"]').checked, "matched + changed: ticked");
    assert.ok(!a.$('[data-rson="1"]').checked, "unknown name: unticked");
    assert.ok(!a.$('[data-rson="2"]').checked, "no change: unticked");
    a.$("#rsApply").click();
    assert.equal(a.w.eval(`S.roster[0].status`), "Leave");
    assert.equal(a.w.eval(`S.roster[1].status`), "On Hand");
    assert.equal(a.w.eval("view"), "board");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
