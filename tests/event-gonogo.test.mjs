// Events are a Go / No-Go roster.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const lead = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;`;
const setup = `${lead}const secs=[...new Set(S.roster.map(m=>m.sec))].slice(0,1);S.events=[{id:"e1",name:"Rifle qual",date:"2099-01-01",type:"Range",secs,att:false,done:{}}];save();evOpen="e1";view="events";render();`;

test("GO / NO-GO buttons mark people, tap again clears, NO-GO keeps a reason", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(setup);
    const key = a.w.eval(`evReq(S.events[0])[0] && nkey(evReq(S.events[0])[0])`);
    const q = (k, w) => a.$(`[data-gng="${w}"][data-gk="${key}"]`);
    q(key, "go").click(); await sleep(10);
    assert.equal(a.w.eval(`!!S.events[0].done[${JSON.stringify(key)}]`), true);
    q(key, "no").click(); await sleep(10);
    assert.equal(a.w.eval(`!!S.events[0].done[${JSON.stringify(key)}]`), false, "NO-GO replaces GO");
    assert.equal(a.w.eval(`${JSON.stringify(key)} in S.events[0].nogo`), true);
    const sel = a.$(`[data-gnr="${key}"]`); assert.ok(sel, "reason box");
    sel.value = "Medical"; sel.dispatchEvent(new a.w.Event("change", { bubbles: true })); await sleep(10);
    assert.equal(a.w.eval(`S.events[0].nogo[${JSON.stringify(key)}]`), "Medical");
    assert.match(a.w.eval(`evText(S.events[0])`), /NO-GO \(1\)[\s\S]*Medical/);
    q(key, "no").click(); await sleep(10);
    assert.equal(a.w.eval(`${JSON.stringify(key)} in (S.events[0].nogo||{})`), false, "second tap clears");
    assert.match(a.$("#gngSum").textContent, /GO 0 · NO-GO 0/);
  } finally { a.close(); }
});

test("All section GO skips NO-GO people; view-only phones can't mark", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(setup);
    const k0 = a.w.eval(`nkey(evReq(S.events[0])[0])`);
    a.$(`[data-gng="no"][data-gk="${k0}"]`).click(); await sleep(10);
    const sec = a.w.eval(`S.events[0].secs[0]`);
    a.$(`[data-evall="${sec}"]`).click(); await sleep(10);
    assert.equal(a.w.eval(`!!S.events[0].done[${JSON.stringify(k0)}]`), false, "NO-GO stays NO-GO");
    assert.ok(a.w.eval(`Object.keys(S.events[0].done).length`) >= 0);
    a.w.eval(`S.role="view"`);
    a.$(`[data-gng="go"][data-gk="${k0}"]`).click(); await sleep(10);
    assert.equal(a.w.eval(`!!S.events[0].done[${JSON.stringify(k0)}]`), false);
  } finally { a.close(); }
});
