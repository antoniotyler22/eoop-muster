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

test("send-to offers Everyone, My section and Pick people; anyone can build a group", async () => {
  const a = await openApp({ rpc: (fn) => (fn === "talk_send" ? 1 : []) });
  try {
    await setup(a, `S.feeds[0].lk=""`);
    a.$("#tabbar [data-tab='talk']").click(); await sleep(150);
    const t = a.$("#tkChips").textContent;
    assert.match(t, /Everyone/); assert.match(t, /My section \(1ST\)/); assert.match(t, /Pick people/);
    a.$("[data-tkg='sec:1ST']").click(); await sleep(50);
    assert.equal(a.$("[data-tkg='sec:1ST']").getAttribute("aria-pressed"), "true");
    assert.ok(a.$("#tkNewG"), "members can pick people too");
  } finally { await a.close(); }
});

test("the group picker lists roster people who never turned Talk on, and a group includes them", async () => {
  const sent = [];
  const a = await openApp({ rpc: (fn, b) => { if (fn === "talk_send") { sent.push(b); return sent.length; } return []; } });
  try {
    await setup(a, `S.source="mol";S.roster=[{id:"r1",rank:"CPL",name:"Reyes, Jo",sec:"1ST"},{id:"r2",rank:"SGT",name:"Dunn, Al",sec:"2ND"}]`);
    a.$("#tabbar [data-tab='talk']").click(); await sleep(400);
    a.$("#tkNewG").click(); await sleep(400);
    const txt = a.$("#tkG").textContent;
    assert.match(txt, /CPL REYES/); assert.match(txt, /SGT DUNN/); assert.match(txt, /Talk off/);
    a.$("#tkGN").value = "Crew";
    a.$$("[data-tkp]").find((b) => /DUNN/.test(b.textContent)).click(); await sleep(50);
    a.$("#tkGMake").click(); await sleep(300);
    assert.ok(sent.length >= 1);
    assert.match(a.$("#tkChips").textContent, /Crew\s*2/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("a Talk message can be deleted with its Delete button and stays deleted", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await setup(a, `S.talkLog=[{f:"${FEED.id}",id:7,by:"CPL TEST",g:"all",t:Date.now(),d:3,tx:"hello there"},{f:"${FEED.id}",id:8,by:"CPL TEST",g:"all",t:Date.now(),d:2,tx:"second one"}]`);
    a.$("#tabbar [data-tab='talk']").click(); await sleep(150);
    assert.equal(a.$$ ? a.$$(".tk-sl").length : a.w.eval("document.querySelectorAll('.tk-sl').length"), 2, "both messages are swipe rows");
    assert.ok(a.$("[data-tksl='7'] .tk-del"), "Delete sits behind the message");
    a.$("[data-tksl='7'] .tk-del").click(); await sleep(400);
    assert.ok(!a.$("[data-tksl='7']"), "message 7 is gone");
    assert.ok(a.$("[data-tksl='8']"), "message 8 stays");
    assert.equal(a.w.eval("S.talkLog.some(x=>x.id===7)"), false, "removed from the saved log");
    assert.equal(a.w.eval("S.talkHid.includes('" + FEED.id + ":7')"), true, "remembered as deleted so it can't come back");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
