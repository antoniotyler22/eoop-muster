// Profile photos: a photo replaces the initials, travels inside encrypted posts, and others' photos are learned.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const PHOTO = "data:image/jpeg;base64," + "A".repeat(400);
const setup = async (a) => {
  await a.w.eval(`(async()=>{const k=crypto.getRandomValues(new Uint8Array(32));const ek=b64e(k).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/,"");
    S.feeds=[{id:"feedabcdef12",mk:"m".repeat(30),lk:"l".repeat(30),ek,unit:"1ST PLT",me:"CPL TEST",sec:"1ST",mine:{},acks:{},pins:[],seen:0,posts:[]}];S.myName="CPL TEST";S.onb=true;S.welcomed=1;fdSel="feedabcdef12";view="data";render()})()`);
  await sleep(150);
};

test("Settings offers a profile photo; a saved photo replaces my initials", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await setup(a);
    assert.ok(a.$("#ppTake"), "Take photo button in Settings");
    assert.ok(a.$("#ppPick"), "Upload photo button in Settings");
    assert.match(a.w.eval(`fdAv("CPL TEST")`), />CT</, "initials before a photo");
    a.w.eval(`S.myPhoto=${JSON.stringify(PHOTO)};render()`); await sleep(60);
    assert.match(a.w.eval(`fdAv("CPL TEST")`), /class="av avp"/, "photo instead of initials");
    assert.ok(a.$("#ppDel"), "Use my initials button once there is a photo");
    assert.match(a.w.eval(`fdAv("SGT OTHER")`), />SO</, "other people keep initials");
    a.$("#ppDel").click(); await sleep(60);
    assert.equal(a.w.eval("S.myPhoto"), undefined);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("my photo rides inside encrypted posts and another phone's photo is learned from theirs", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await setup(a);
    a.w.eval(`S.myPhoto=${JSON.stringify(PHOTO)}`);
    const ct = await a.w.eval(`fdEnc(S.feeds[0].ek,{t:"hello",u:false,to:{},by:"CPL TEST"})`);
    assert.ok(!ct.includes("CPL TEST") && !ct.includes("AAAA"), "payload is encrypted");
    const back = await a.w.eval(`fdDec(S.feeds[0].ek,${JSON.stringify(ct)})`);
    assert.equal(back.av, PHOTO, "my photo is inside the post");
    const theirs = "data:image/jpeg;base64," + "B".repeat(300);
    const ct2 = await a.w.eval(`fdEnc(S.feeds[0].ek,{t:"hi",u:false,to:{},by:"SGT OTHER",av:${JSON.stringify(theirs)}})`);
    await a.w.eval(`fdDec(S.feeds[0].ek,${JSON.stringify(ct2)})`);
    assert.match(a.w.eval(`fdAv("SGT OTHER")`), /class="av avp"/, "their photo shows");
    const bad = await a.w.eval(`fdEnc(S.feeds[0].ek,{t:"x",u:false,to:{},by:"SGT EVIL",av:"javascript:alert(1)"})`);
    await a.w.eval(`fdDec(S.feeds[0].ek,${JSON.stringify(bad)})`);
    assert.match(a.w.eval(`fdAv("SGT EVIL")`), />SE</, "anything that isn't a small JPEG is ignored");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("my photo only travels on things posted by me, never on a payload about someone else", async () => {
  const { openApp } = await import("./harness.mjs");
  const a = await openApp({ rpc: () => [] });
  try {
    const r = await a.w.eval(`(async()=>{S.myPhoto="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==";S.myName="GYSGT TYLER";S.postAs="";
      const k=b64e(crypto.getRandomValues(new Uint8Array(32))).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/,"");
      const mine=await fdDec(k,await fdEnc(k,{t:"hi",by:"GYSGT TYLER",to:{},u:0}));
      const other=await fdDec(k,await fdEnc(k,{t:"status",by:"CPL JONES",to:{},u:0}));
      return JSON.stringify({mine:!!(mine&&mine.av),other:!!(other&&other.av)})})()`);
    const o = JSON.parse(r);
    assert.equal(o.mine, true, "my own post carries my photo");
    assert.equal(o.other, false, "someone else's name never gets my photo");
  } finally { await a.close(); }
});
