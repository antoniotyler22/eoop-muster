// Feed and Inbox: the five-way switch floats above the bottom tabs as a dock and still switches screens.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";
test("the Feed/Inbox/Messages/Official/Voice switch becomes a dock on Feed", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";save();view="feed";render()`); await sleep(300);
    assert.ok(a.$("#chDock .ch-seg"), "dock present");
    assert.equal(a.w.eval(`document.body.classList.contains("has-dock")`), true);
    assert.equal(a.w.eval(`document.querySelectorAll("#chDock [data-seg]").length`) >= 4, true, "tabs in the dock");
    a.w.eval(`document.querySelector('#chDock [data-seg="inbox"]').click()`); await sleep(300);
    assert.equal(a.w.eval(`view`), "dms", "Inbox opens from the dock");
    assert.ok(a.$("#chDock"), "dock stays on Inbox");
    a.w.eval(`view="board";render()`); await sleep(300);
    assert.equal(a.$("#chDock"), null, "no dock on Home");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
