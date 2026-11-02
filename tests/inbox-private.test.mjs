import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const seed = (role) => `S.onb=true;S.welcomed=1;S.leaderMode=true;${role ? `S.role="${role}";` : ""}
  S.dmInbox="i".repeat(32);S.grps=[{id:"g1",k:"k",ek:"e",ok:1,ids:[]}];
  const m=S.roster[0];m.pk="p".repeat(24);m.dm={id:"thread12345abcdefgh",k:"k".repeat(32),ek:"x",ok:1};
  S.dmMsgs={"thread12345abcdefgh":[{id:1,txt:"secret",by:"M"}]};`;

test("Inbox keys never ride along in the synced board", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(seed(""));
    assert.equal(a.w.eval(`syncObj().dmInbox`), undefined);
    assert.equal(a.w.eval(`syncObj().grps`), undefined);
    assert.equal(a.w.eval(`syncObj().roster.some(m=>m.dm)`), false);
    assert.ok(a.w.eval(`S.roster[0].dm&&S.dmInbox`), "the owner keeps their own keys locally");
    assert.equal(a.w.eval(`inboxOwner()`), true);
    assert.ok(a.w.eval(`tabsList().some(x=>x[0]==="inbox")`), "owner sees the Inbox tab");
  } finally { await a.close(); }
});

test("Co-leader, Editor and View phones have no Inbox, no keys and no messages", async () => {
  for (const role of ["co", "sncoic", "view"]) {
    const a = await openApp({ rpc: () => [] });
    try {
      await a.w.eval(seed(role));
      assert.equal(a.w.eval(`inboxOwner()`), false, role);
      assert.equal(a.w.eval(`tabsList().some(x=>x[0]==="inbox")`), false, role + " has no Inbox tab");
      await a.w.eval(`view="dms";render()`);
      assert.equal(a.w.eval(`view`), "board", role + " cannot open the Inbox screen");
    } finally { await a.close(); }
  }
});

test("A pull from an older backup that still holds keys drops them on a co-leader phone", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.onb=true;S.welcomed=1;S.leaderMode=true;S.role="co";S.sync={on:true,code:"AAAA-BBBB",ver:1,baseSig:{},baseMem:{}};`);
    await a.w.eval(`mergeRemote({dmInbox:"x".repeat(32),grps:[{id:"g"}],roster:[Object.assign({},S.roster[0],{dm:{id:"t",k:"k",ek:"e",ok:1}})]})`);
    assert.equal(a.w.eval(`S.dmInbox`), undefined);
    assert.equal(a.w.eval(`(S.grps||[]).length`), 0);
    assert.equal(a.w.eval(`S.roster.some(m=>m.dm)`), false);
  } finally { await a.close(); }
});
