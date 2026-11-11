import test from "node:test";
import assert from "node:assert/strict";
import { openApp } from "./harness.mjs";
test("chips, remove and section buttons get an invisible 44px tap area", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const css = [...a.w.document.querySelectorAll("style")].map((s) => s.textContent).join("\n");
    assert.match(css, /button\.chip::after[\s\S]*?max\(100%,44px\)/);
    assert.match(css, /button\.rm::after/);
    assert.match(css, /button\.w6::after/);
  } finally { await a.close(); }
});
