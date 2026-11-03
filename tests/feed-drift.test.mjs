// Word of Mouth Drift: Word of Mouth glides on its own; touch/typing stops it; a pill turns it off and on.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const FEED = { id: "feedabcdef12", mk: "m".repeat(30), ek: "" };
const setup = async (a) => {
  await a.w.eval(`(async()=>{const k=crypto.getRandomValues(new Uint8Array(32));const ek=b64e(k).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/,"");
    S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",lk:"l".repeat(30),ek,unit:"1ST PLT",me:"CPL TEST",sec:"1ST",mine:{},seen:0,posts:[]}];S.myName="CPL TEST";S.onb=true;S.welcomed=1;S.driftOff=false;fdSel="${FEED.id}";view="feed";render()})()`);
  await sleep(150);
  a.w.eval(`const t=document.querySelector('[data-fdtab="feed"]');if(t)t.click()`);await sleep(80);
};

test("Word of Mouth shows an auto-scroll pill that turns the glide off and on, and it is remembered", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await setup(a);
    const pill = a.$("#fdDrift");
    assert.ok(pill, "pill exists");
    assert.equal(pill.getAttribute("aria-pressed"), "true");
    pill.click(); await sleep(50);
    assert.equal(a.w.eval("S.driftOff"), true, "off is saved");
    assert.equal(a.$("#fdDrift").getAttribute("aria-pressed"), "false");
    assert.equal(a.w.eval("feedDrift.why()"), "off");
    a.$("#fdDrift").click(); await sleep(50);
    assert.equal(a.w.eval("S.driftOff"), false);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("touching or typing stops the glide, and it is hidden away from Word of Mouth", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await setup(a);
    a.w.document.dispatchEvent(new a.w.Event("pointerdown", { bubbles: true }));
    assert.equal(a.w.eval("feedDrift.why()"), "touch", "a finger on the screen stops it");
    a.w.document.dispatchEvent(new a.w.Event("pointerup", { bubbles: true }));
    assert.equal(a.w.eval("feedDrift.why()"), "touch", "and it waits a few seconds after you let go");
    a.w.eval(`view="home";render()`); await sleep(80);
    assert.equal(a.w.eval("feedDrift.why()"), "view");
    assert.notEqual(a.$("#fdDrift").style.display, "inline-flex", "pill hidden off Word of Mouth");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
