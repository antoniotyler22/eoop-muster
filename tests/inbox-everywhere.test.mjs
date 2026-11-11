// 4.85.0: Inbox on every page for members and the OIC; private message link in the thread.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";
const F = { id: "feedabcdef12", mk: "m".repeat(30) };
const member = `S.feeds=[{id:"${F.id}",mk:"${F.mk}",ek:"x",unit:"1ST PLT",me:"CPL TEST",sec:"1ST",mine:{5:{c:1,t:Date.now()}},seen:0,posts:[{id:5,t:Date.now(),txt:"Formation 0700"}]}];S.onb=true;S.welcomed=1;fdSel="${F.id}";view="feed";render()`;

test("a member with no name still has the Inbox tab; tapping it asks who they are", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(member);
    assert.ok(a.w.eval(`tabsList().some(x=>x[0]==="inbox")`), "Inbox tab present");
    a.w.eval(`view="dm";render()`); await sleep(150);
    assert.equal(a.w.eval(`view`), "feed", "back on Word of Mouth");
    assert.ok(a.$("#sheet.open,#sheet:not([hidden])"), "name sheet opened");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("the thread has a private message link for members that opens the Inbox", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(member);
    a.$('[data-thr="5"]').click(); await sleep(50);
    const b = a.$("#thrPm"); assert.ok(b, "private link");
    assert.match(b.textContent, /1ST PLT privately/);
    b.click();
    assert.ok(!a.$("#thrView"), "thread closed");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("Co-leader, Editor and View phones still have no Inbox (private to the OIC)", async () => {
  for (const role of ["co", "sncoic", "view"]) {
    const a = await openApp({ rpc: () => [] });
    try {
      a.w.eval(`S.onb=true;S.welcomed=1;S.leaderMode=true;S.role="${role}";render()`);
      assert.equal(a.w.eval(`tabsList().some(x=>x[0]==="inbox")`), false, role);
    } finally { await a.close(); }
  }
});
