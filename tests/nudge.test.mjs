import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const setup = `S.source="mol";S.welcomed=1;S.onb=true;S.role="oic";S.sync=null;
  const R=S.roster.filter(m=>m.sec!=="ATT");R.forEach(m=>{m.status="On Hand";m.ckAt=Date.now();delete m.start;delete m.end});
  R[0].ckAt=Date.now()-20*3600000;R[0].pk="pk0";R[1].ckAt=Date.now()-20*3600000;R[1].pk="";window.__ids=[R[0].id,R[1].id];save()`;

test("a stale person on the Check-ins panel gets a Nudge, and nudging sends a private message", async () => {
  const sent = [];
  const a = await openApp({ rpc: (fn, args) => { sent.push(fn); return fn === "dm_send" ? 1 : []; } });
  try {
    a.w.eval(setup + `;view="checkins";render()`);
    await sleep(150);
    assert.ok(a.$("#ckMiss .ndgs"), "slide control on a missing row");
    assert.equal(a.$("#ckMiss .ndgs .ndgs-st").dataset.k, "app", "app person gets the In app stop");
    assert.ok(a.$("#ndgAll"), "Nudge everyone");
    const r = await a.w.eval(`nudgeSend(__ids)`);
    assert.equal(r.sent, 1, "person with My page nudged "+JSON.stringify(r));
    assert.equal(r.noapp, 1, "person without My page left for text");
    assert.ok(sent.includes("dm_send"), "private message sent");
    const t = await a.w.eval(`nudgeAct(__ids[1],"text")`);
    assert.equal(t.ok, false, "no phone number, nothing sent");
    const bad = await a.w.eval(`nudgeAct(__ids[1],"app")`);
    assert.equal(bad.ok, false, "not on the app");
    const again = await a.w.eval(`nudgeSend(__ids)`);
    assert.equal(again.sent, 0); assert.equal(again.wait, 1, "not nudged twice in an hour");
  } finally { await a.close(); }
});

test("members never see Nudge", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.feeds=[{id:"f",mk:"m",ek:"e",posts:[]}];S.welcomed=1;view="checkins";render()`);
    assert.ok(!a.$(".ndgs") && !a.$("#ndgAll"));
  } finally { await a.close(); }
});
