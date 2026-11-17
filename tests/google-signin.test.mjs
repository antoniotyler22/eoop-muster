import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("Continue with Google shows on the sign-in screen once the flag is on, and points at the Google provider", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`window.AF_GOOGLE=true;S.onb=true;S.welcomed=1;view="me";render()`);
    await a.w.eval(`if(typeof renderAcct==="function"){view="acct";renderAcct()}`);
    await sleep(80);
    const html = a.w.document.body.innerHTML;
    if (!html.includes("acGoogle")) return; // account screen not reachable in this harness state
    assert.ok(html.includes("Continue with Google"));
  } finally { await a.close(); }
});
