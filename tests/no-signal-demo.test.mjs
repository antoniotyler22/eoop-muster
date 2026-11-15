// 4.118: with no signal, My Page shows a short "you can still check in" demo next to the check-in slide.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("the no-signal demo shows only while offline, under the check-in block", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.source="mol";S.onb=true;S.welcomed=1;S.leaderMode=true;S.role="oic";S.sync={on:true,code:"X"};S.feeds=[{id:"f",mk:"m",lk:"l",ek:"e",posts:[]}];S.askSt={on:false,t:Date.now()};view="mypg";render()`);
    await sleep(150);
    assert.equal(a.$("#nsCard"), null, "hidden with signal");
    a.w.eval(`fieldMode.netDown=true;render()`); await sleep(150);
    assert.ok(a.$("#nsCard"), "shown with no signal");
    assert.match(a.$("#nsCard").textContent, /You can still check in/);
    assert.equal(a.$(".mp-ck").nextElementSibling.id, "nsCard", "sits right after the check-in block");
    a.w.eval(`fieldMode.netDown=false;render()`); await sleep(150);
    assert.equal(a.$("#nsCard"), null, "gone when signal returns");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("a saved check-in becomes a packet another phone can add once, and not when old", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.onb=true;S.welcomed=1;S.outbox=[{fn:"page_req",args:{p_feed:"f",p_ct:"abcDEF123456789xyz"},t:Date.now()-60000,fm:1,lb:"x"}];save()`);
    const txt = a.w.eval(`AFPass.outText()`);
    assert.match(txt, /#EOOP-OB\|1\|/);
    assert.doesNotMatch(txt, /abcDEF/, "ciphertext is encoded inside the packet, not shown plainly");
    // the receiving phone: nothing queued yet
    a.w.eval(`S.outbox=[];S.obSeen=[]`);
    const r1 = a.w.eval(`AFPass.addPackets(${JSON.stringify(txt)})`);
    assert.equal(r1.n, 1);
    assert.equal(a.w.eval(`S.outbox.length`), 1);
    assert.equal(a.w.eval(`S.outbox[0].carried`), 1);
    assert.equal(a.w.eval(`S.outbox[0].args.p_ct`), "abcDEF123456789xyz");
    const r2 = a.w.eval(`AFPass.addPackets(${JSON.stringify(txt)})`);
    assert.equal(r2.n, 0, "same packet twice is ignored");
    assert.equal(r2.dup, 1);
    const old = "#EOOP-OB|1|" + a.w.eval(`AFPass.enc({fn:"page_req",args:{p_feed:"f",p_ct:"zzz"},t:Date.now()-3*864e5})`);
    assert.equal(a.w.eval(`AFPass.addPackets(${JSON.stringify(old)})`).old, 1, "older than 48 hours is ignored");
    assert.equal(a.w.eval(`AFPass.addPackets("#EOOP-OB|1|!!!notbase64")`).n, 0, "junk is ignored");
    const bad = "#EOOP-OB|1|" + a.w.eval(`AFPass.enc({fn:"delete_account",args:{},t:Date.now()})`);
    assert.equal(a.w.eval(`AFPass.addPackets(${JSON.stringify(bad)})`).n, 0, "only check-in requests are carried");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("after a no-signal check-in the card offers Pass to a nearby phone; Field mode has the paste box", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.source="mol";S.onb=true;S.welcomed=1;S.leaderMode=true;S.role="oic";S.sync={on:true,code:"X"};S.feeds=[{id:"f",mk:"m",lk:"l",ek:"e",posts:[]}];S.askSt={on:false,t:Date.now()};S.outbox=[{fn:"page_req",args:{p_feed:"f",p_ct:"c1"},t:Date.now(),fm:1,lb:"x"}];fieldMode.netDown=true;view="mypg";render()`);
    await sleep(150);
    assert.ok(a.$("[data-nspass]"), "pass button shown");
    assert.match(a.$("#nsCard").textContent, /Saved on this phone/);
    a.w.eval(`view="field";render()`); await sleep(150);
    assert.ok(a.$("#nsRecv #nsIn"), "paste box in Field mode");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
