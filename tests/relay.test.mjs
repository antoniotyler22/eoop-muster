// 4.93: no-signal relay
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("packets dedupe, count hops, and mark the roster on the leader's phone", async () => {
  const a = await openApp();
  try {
    a.w.eval(`S.rc.open=true;S.rc.start=Date.now();S.rc.rid="rc00000001";save();view="recall";render()`);
    await sleep(30);
    assert.ok(a.$("#rlBox"), "relay panel shows in check-ins");
    a.w.eval(`recallPool()[0].name="ZZQUUX, ALEX"`);
    const nm = "CPL ZZQUUX";
    const pk = `#EOOP-RLY|rc00000001|1|${nm}|AT RP|1700000000000|2|0`;
    assert.equal(a.w.eval(`AFRelay.add(AFRelay.parse(${JSON.stringify(pk + "\n" + pk)}))`), 1, "duplicate dropped");
    assert.equal(a.w.eval(`AFRelay.add(AFRelay.parse("#EOOP-RLY|rc00000001|1|X Y|a|1|99|0"))`), 0, "too many hops dropped");
    assert.match(a.w.eval(`AFRelay.outText()`), /\|3\|0$/m, "passing on adds a hop");
    a.w.eval(`render()`); await sleep(30);
    a.$("[data-rlapply]").click(); await sleep(40);
    assert.equal(a.w.eval(`S.rc.res[recallPool()[0].id]`), "ok");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("first phone with signal uploads live packets once", async () => {
  const a = await openApp();
  try {
    a.w.eval(`window.__calls=[];SB.words=n=>[n];SB.h=async(r,w)=>r+w;SB.notify=()=>{};SB.rpc=async(f,args)=>{window.__calls.push([f,args.p_code]);return {}};
      AFRelay.add(AFRelay.parse("#EOOP-RLY|rc00000009|2|SMITH|late|1700000000001|1|1\\n#EOOP-RLY|rc00000009|1|JONES||1700000000002|0|0"))`);
    const n = await a.w.eval(`AFRelay.upload()`);
    assert.equal(n, 1, "only the live packet uploads");
    assert.equal(a.w.eval(`window.__calls.length`), 1);
    assert.equal(a.w.eval(`window.__calls[0][0]`), "checkin");
    assert.equal(await a.w.eval(`AFRelay.upload()`), 0, "not sent twice");
  } finally { await a.close(); }
});
