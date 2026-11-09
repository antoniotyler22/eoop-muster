// 4.82.1: a check-in (or any change) must survive a full or failing browser store, and the banner must say why when it can't.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const lead = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;view="board";render();`;
const quota = (limit) => `(()=>{const o=Storage.prototype.setItem;window.__setOrig=o;Storage.prototype.setItem=function(k,v){if(k==="eoop-muster-v1"&&String(v).length>${limit})throw new DOMException("full","QuotaExceededError");return o.apply(this,arguments)}})()`;

test("browser store full: old caches are trimmed, the change is saved, no banner", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(lead);
    a.w.eval(`S.act=Array.from({length:300},(_,i)=>({t:i,ic:"x",txt:"a".repeat(1000),go:""}));S.dmMsgs={};for(let k=0;k<5;k++)S.dmMsgs["t"+k]=Array.from({length:300},(_,i)=>({t:i,txt:"b".repeat(300)}));`);
    a.w.eval(quota(250000));
    a.w.eval(`S.roster[0].status="Leave";S.roster[0].ckAt=Date.now();save()`);
    assert.equal(a.w.eval("storageOK"), true, "saved after trimming");
    const saved = JSON.parse(a.w.eval(`localStorage.getItem("eoop-muster-v1")`));
    assert.equal(saved.roster[0].status, "Leave", "the check-in is what got saved");
    assert.ok(saved.act.length < 300, "old activity trimmed");
    assert.ok(saved.savedAt > 0, "save time is stamped");
    assert.doesNotMatch(a.w.eval(`banner0()`) || "", /isn't saving/);
  } finally { await a.close(); }
});

test("state that can't be turned into JSON the normal way is still saved", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(lead);
    a.w.eval(`const loop={a:1};loop.self=loop;S.junk=loop;S.big=BigInt(5);S.roster[0].status="TAD";save()`);
    assert.equal(a.w.eval("storageOK"), true);
    const saved = JSON.parse(a.w.eval(`localStorage.getItem("eoop-muster-v1")`));
    assert.equal(saved.roster[0].status, "TAD");
  } finally { await a.close(); }
});

test("when nothing can be saved the banner says why", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(lead);
    a.w.eval(quota(10));
    a.w.eval(`save()`);
    assert.equal(a.w.eval("storageOK"), false);
    assert.match(a.w.eval(`(typeof storageErr==="object"&&storageErr)?storageErr.n:""`), /Quota/);
  } finally { await a.close(); }
});
