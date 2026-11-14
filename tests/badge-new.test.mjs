// 4.109.0: a new official message shows a red number on the Chat tab and on the Official switch.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("official post -> red number on Chat tab and on the Official segment", async () => {
  const posts = [{ id: 7, body: "Hello team", url: "", media: "", created_at: new Date().toISOString() }, { id: 8, body: "Second", url: "", media: "", created_at: new Date().toISOString() }];
  const a = await openApp({ rpc: (n) => (n === "official_get" ? posts : []) });
  try {
    await a.w.eval(`S.onb=true;S.welcomed=1;S.leaderMode=true;S.role="oic";S.official={posts:[],seen:0,at:0};view="board";render()`);
    await sleep(4500);
    const bd = a.w.eval(`(()=>{const b=document.querySelector('#tabbar [data-tab="talk"] .bd');return b?b.textContent:""})()`);
    assert.equal(bd, "2", "Chat tab shows 2");
    a.w.eval(`view="chat";render()`); await sleep(400);
    const seg = a.w.eval(`(()=>{const b=document.querySelector(".ch-seg [data-seg='official'] .of-dot, .ch-seg [data-seg='official'] .of-num");return b?b.textContent:"NONE"})()`);
    assert.equal(seg, "2", "Official switch shows a red 2");
  } finally { await a.close(); }
});
