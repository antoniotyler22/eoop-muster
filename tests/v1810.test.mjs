// 4.10.1: System check knows about server-sent alerts (setup part 27) and tells an old notify (no retry queue) apart.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp } from "./harness.mjs";

test("System check lists part 27 and flags a notify without the retry queue", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    const ph = a.w.eval(`JSON.stringify(SC.find(g=>g.k==="ph"))`);
    assert.ok(ph, "part 27 entry present");
    assert.deepEqual(JSON.parse(ph).f, ["27_push_hooks"]);
    assert.deepEqual(JSON.parse(ph).t, [["push_hooks_ok", {}]]);
    const st = (nt) => a.w.eval(`JSON.stringify(ntState(${JSON.stringify(nt)}))`);
    assert.deepEqual(JSON.parse(st({ s: 400, t: "bad", s2: 200, s3: 200, s4: 200, v: "4.33.0" })), { ok: 1, msg: "Deployed and current (4.33.0)." });
    assert.match(JSON.parse(st({ s: 400, t: "bad", s2: 200, s3: 200, s4: 200, v: "" })).msg, /older than 4\.33\.0/, "no version answer = older notify");
    const old = JSON.parse(st({ s: 400, t: "bad", s2: 200, s3: 200, s4: 400 }));
    assert.equal(old.ok, 0);
    assert.match(old.msg, /aren't retried/);
    assert.match(JSON.parse(st({ s: 400, t: "bad", s2: 200, s3: 400 })).msg, /no Team alerts/, "older checks unchanged");
  } finally { a.close(); }
});
