import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep, waitFor } from "./harness.mjs";

test("tap a message, pick an emoji: it is sent as a quiet reaction and shown on the bubble", async () => {
  const calls = [];
  const a = await openApp({ rpc: (name, args) => { calls.push([name, args]); return name === "dm_send" ? 77 : []; } });
  try {
    await a.w.eval(`(async()=>{S.onb=true;S.welcomed=1;S.leaderMode=true;S.role="oic";const m=S.roster[0];m.pk="p".repeat(24);m.dm={id:"thread12345abcdefgh",k:"k".repeat(32),ek:"e".repeat(43),ok:1};S.dmInbox="i".repeat(32);
      S.dmMsgs[m.dm.id]=[{id:5,t:Date.now(),txt:"Hello",by:"M",n:"Cpl",img:"",aud:"",d:0}];dmRx.open(m.id)})()`);
    await sleep(80);
    a.$('.tl-e[data-mid="5"] .tl-c').click();
    assert.equal(a.$('.tl-pick[data-pickfor="5"]').hidden, false);
    a.$('[data-v12rx="5"][data-e="👍"]').click();
    await waitFor(() => calls.some((c) => c[0] === "dm_send"));
    await sleep(60);
    assert.equal(a.w.eval(`JSON.stringify(S.dmRx[5])`), '{"L":"👍"}');
    assert.ok(a.$(".tl-rx"), "chip shows");
    assert.equal(a.w.eval(`(S.dmMsgs[S.roster[0].dm.id]||[]).length`), 1, "reaction is not a chat message");
    // same emoji again removes it
    a.$('.tl-e[data-mid="5"] .tl-c').click(); a.$('[data-v12rx="5"][data-e="👍"]').click();
    await sleep(120);
    assert.equal(a.w.eval(`S.dmRx[5]===undefined`), true);
  } finally { await a.close(); }
});

test("incoming reaction folds into the target and never counts as a message", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    assert.equal(a.w.eval(`(dmRx.set({r:9,e:"❤️"},"M"),JSON.stringify(S.dmRx[9]))`), '{"M":"❤️"}');
    assert.equal(a.w.eval(`dmRx.set({r:9,e:"bad"},"M");S.dmRx[9]===undefined`), true, "unknown emoji clears, never stored");
  } finally { await a.close(); }
});
