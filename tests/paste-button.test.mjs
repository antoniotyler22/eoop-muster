import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("Feed post box has a Paste button that inserts clipboard text", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.onb=true;S.welcomed=1;S.leaderMode=true;S.feeds=[{id:"t",lk:1,k:"x",nm:"T",me:"OIC",posts:[]}];view="feed";render()`);
    assert.ok(a.w.eval(`!!document.querySelector("#fdTxtPb")`), "paste button present");
    Object.defineProperty(a.w.navigator, "clipboard", { value: { readText: async () => "Formation 0700" }, configurable: true });
    a.w.eval(`document.querySelector("#fdTxtPb").click()`);
    await sleep(80);
    assert.equal(a.w.eval(`document.querySelector("#fdTxt").value`), "Formation 0700");
    assert.equal(a.w.eval(`fdDraft.txt`), "Formation 0700");
  } finally { await a.close(); }
});
