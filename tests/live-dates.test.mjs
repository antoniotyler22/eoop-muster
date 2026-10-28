// Live sections: every section's last update shows a plain date and time, and the "ago" keeps ticking.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";
const lead = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;save();`;

test("a UT update lands with its date and the total stays put", async () => {
  let rows = [];
  const a = await openApp({ rpc: (fn) => (fn === "get_board_updates" ? rows : []) });
  try {
    const pre = a.w.eval(`(()=>{${lead}S.board={id:"b1",rk:"r",wk:"w",ek:"e",after:0,last:{},sk:{UT:"k"}};save();return [counts().T.total,S.roster.filter(m=>m.sec==="UT").length]})()`);
    const items = await a.w.eval(`(async()=>{const m=S.roster.find(x=>x.sec==="UT");const was=m.status;m.status="Leave";const it=await itemsFor("b1",[m]);m.status=was;return it})()`);
    rows = [{ id: 5, sec: "ut", strength: pre[1], sender: [], items: [...items], created_at: new Date().toISOString() }];
    await a.w.eval(`livePollBoard()`); await sleep(60);
    const r = a.w.eval(`(()=>{view="live";render();const t=document.querySelector('#main').textContent;return [counts().T.total,!!S.board.last.UT,t,!!document.querySelector('#main [data-livet="UT"]')]})()`);
    assert.equal(r[0], pre[0], "an update changes statuses, never the total");
    assert.equal(r[1], true, "a lower-case section code still lands on UT");
    assert.match(r[2], /UT Utilities[\s\S]*Updated [A-Z][a-z]{2} \d{1,2}, \d{1,2}:\d{2}/, "shows a plain date and time");
    assert.equal(r[3], true);
    assert.match(a.w.eval(`(()=>{view="board";render();return liveStrip()})()`), /data-livet="UT"/);
  } finally { a.close(); }
});
