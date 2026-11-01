// 4.70.2: Home's Today is now the scrolling week strip (it replaced the one-card rolling ticker; "Today for me" on My page keeps the ticker).
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const LEAD = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.board={id:"b1",rk:"r",wk:"w",ek:"e",after:0,last:{},sk:{}};S.sync=null;save();`;

test("Home's Today is the week strip, not the one-card ticker", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(LEAD + `const k=dkey();S.roster[1].cal=[{id:"c2",d:k,tm:"",ty:"LEAVE",ti:"Parental leave"}];save();view="board";render();`); await sleep(40);
    assert.ok(a.$("#twk #twkDays"), "week strip on Home");
    assert.ok(!a.$(".strip.tk"), "no one-card ticker on Home");
    assert.match(a.$("#twkRows").textContent, /Parental leave|Leave/);
    assert.deepEqual(a.errors.filter((e) => !/scrollTo/.test(e)), []);
  } finally { await a.close(); }
});
