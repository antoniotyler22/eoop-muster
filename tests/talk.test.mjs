// 4.67.0: Talk, push-to-talk voice on the Feed.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const FEED = { id: "feedabcdef12", mk: "m".repeat(30), ek: "" };
const setup = async (a, extra = "") => {
  await a.w.eval(`(async()=>{const k=crypto.getRandomValues(new Uint8Array(32));const ek=b64e(k).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/,"");
    S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",lk:"l".repeat(30),ek,unit:"1ST PLT",me:"CPL TEST",sec:"1ST",mine:{},seen:0,posts:[]}];S.myName="CPL TEST";S.onb=true;S.welcomed=1;fdSel="${FEED.id}";${extra};render()})()`);
  await sleep(100);
};

test("Talk tab opens the Talk screen with the switch off", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await setup(a);
    a.$("#tabbar [data-tab='talk']").click(); await sleep(150);
    assert.equal(a.w.eval("view"), "talk");
    assert.ok(a.$("#tkSw"), "switch shown");
    assert.equal(a.$("#tkSw").getAttribute("aria-checked"), "false");
    assert.ok(a.$("#tkBtn").disabled, "can't talk while off");
    assert.match(a.$("#tkSt").textContent, /Talk is off/);
    assert.equal(a.$("#tabbar [data-tab='talk']").getAttribute("aria-current"), "page");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("switching Talk on shows the radio icon by my name and tells the server", async () => {
  const sent = [];
  const a = await openApp({ rpc: (fn, b) => { if (fn === "talk_send") { sent.push(b); return 1; } return []; } });
  try {
    await setup(a);
    a.$("#tabbar [data-tab='talk']").click(); await sleep(100);
    a.$("#tkSw").click(); await sleep(250);
    assert.equal(a.$("#tkSw").getAttribute("aria-checked"), "true");
    assert.ok(a.$(".tk-you .tk-ri"), "radio icon by my name");
    assert.ok(!a.$("#tkBtn").disabled);
    assert.equal(sent.length >= 1, true, "presence sent");
    assert.equal(sent[0].p_key, FEED.mk);
    assert.ok(!/CPL TEST/.test(sent[0].p_ct), "payload is encrypted");
  } finally { await a.close(); }
});

test("a leader builds a group and everyone picked is in it", async () => {
  const sent = [];
  const a = await openApp({ rpc: (fn, b) => { if (fn === "talk_send") { sent.push(b); return sent.length; } return []; } });
  try {
    await setup(a);
    a.$("#tabbar [data-tab='talk']").click(); await sleep(100);
    a.$("#tkNewG").click(); await sleep(50);
    a.$("#tkGMake").click(); await sleep(50);
    assert.match(a.$("#tkGE").textContent, /Enter a group name first/);
    a.$("#tkGN").value = "Bldg 4";
    a.$("#tkGMake").click(); await sleep(50);
    assert.match(a.$("#tkGE").textContent, /Pick at least one member/);
    a.$("#tkGN").value = "Bldg 4";
    a.$("[data-tkp]").click(); await sleep(50);
    a.$("#tkGMake").click(); await sleep(250);
    assert.ok(sent.length >= 1, "group saved");
    assert.match(a.$("#tkChips").textContent, /Bldg 4/);
  } finally { await a.close(); }
});
