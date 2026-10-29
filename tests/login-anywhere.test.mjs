// 4.16.3: Send out has Clear all · start over; the lock screen accepts any login that checks out, not only the one saved on the phone.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const LEAD = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.sync={on:true};save();`;

test("send out: Clear all unpicks everyone and resets the form", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(LEAD + `view="invite";render();`);
    assert.equal(a.$("#soClear"), null, "nothing picked yet, no clear button");
    a.$("[data-soall]").click();
    assert.equal(a.w.eval("__so().all"), true);
    assert.ok(a.$("#soClear"));
    a.$("#soClear").click();
    assert.equal(a.w.eval("__so().all"), false);
    assert.equal(a.w.eval("__so().ids.size+__so().secs.size+__so().extra.length"), 0);
    assert.equal(a.w.eval("[...document.querySelectorAll('[data-sop]')].filter(c=>c.checked).length"), 0);
    assert.equal(a.$("#soClear"), null);
  } finally { a.close(); }
});

test("lock screen: a different login that checks out signs that person in and opens their page", async () => {
  let ct = "";
  const a = await openApp({ rpc: (fn, args) => fn === "login_get" ? [{ ct }] : [] });
  try {
    // this phone is signed in as Ann (a leader login); Bob types his own username and password
    ct = await a.w.eval(`(async()=>{const K=await lgKeys("bob","password123");return lgSeal(K,{h:"me=bobpage",l:"Bob Jones"})})()`);
    a.w.eval(`S.source="mol";S.welcomed=1;S.onb=true;S.lgSelf={uid:"annuid",vf:"annvf",l:"Ann",user:"ann",h:"join=x",at:Date.now()};S.lgAsk=true;S.lgUnlocked=0;save();`);
    // the lock shows when the app is opened again after being hidden for a while
    a.w.eval(`Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"));`);
    await sleep(20);
    a.w.eval(`Object.defineProperty(document,"hidden",{configurable:true,get:()=>false});`);
    // fake the 5-minute gap by moving the clock
    a.w.eval(`const __n=Date.now;Date.now=()=>__n()+6*60000;`);
    a.w.eval(`document.dispatchEvent(new Event("visibilitychange"));`);
    assert.ok(a.$("#v13Lock"), "lock screen shows");
    a.$("#v13U").value = "bob"; a.$("#v13P").value = "password123";
    a.$("#v13Go").click();
    for (let i = 0; i < 60 && a.w.eval("S.lgSelf.user") !== "bob"; i++) await sleep(100);
    assert.equal(a.w.eval("S.lgSelf.user"), "bob");
    assert.equal(a.w.eval("S.lgSelf.l"), "Bob Jones");
    assert.equal(a.w.eval("document.getElementById('v13Lock').hidden"), true);
  } finally { a.close(); }
});
