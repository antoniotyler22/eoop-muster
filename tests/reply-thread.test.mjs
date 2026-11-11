// 4.84.0: replies open as a thread, like iMessage.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const FEED = { id: "feedabcdef12", mk: "m".repeat(30), lk: "l".repeat(30) };
const member = (a, to = "") => a.w.eval(`S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",ek:"x",unit:"1ST PLT",me:"CPL TEST",sec:"1ST",mine:{5:{c:1,t:Date.now()}},seen:0,
  posts:[{id:5,t:Date.now(),txt:"Formation 0700. Can everyone make it?"${to}}]}];S.onb=true;S.welcomed=1;fdSel="${FEED.id}";view="feed";render()`);
const sigs = () => { const rows = []; return { rows, rpc: (fn, b) => { if (fn === "signal_put") rows.push(b); if (fn === "signal_get") return []; return []; } }; };

test("the feed shows one chip, no inline reply box; the chip opens a thread screen", async () => {
  const s = sigs(); const a = await openApp({ rpc: s.rpc });
  try {
    member(a);
    assert.ok(!a.$("[data-fdrep]") && !a.$("#fdRep5"), "no inline reply button or box");
    const chip = a.$('[data-thr="5"]'); assert.ok(chip); assert.match(chip.textContent, /Reply/);
    chip.click();
    const v = a.$("#thrView"); assert.ok(v, "thread screen opens");
    assert.match(v.querySelector(".thr-orig").textContent, /Formation 0700/);
    assert.match(v.textContent, /No replies yet/);
    assert.ok(v.querySelector("#thrInp") && v.querySelector("#thrSend"));
    v.querySelector("[data-thrclose]").click();
    assert.ok(!a.$("#thrView"), "Back closes it");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("sending puts my bubble on the right, others on the left with names, and the chip counts them", async () => {
  const s = sigs(); const a = await openApp({ rpc: s.rpc });
  try {
    member(a);
    // someone else's reply is already in the thread
    a.w.eval(`AFS.all=(f,k)=>k==="rp"?(window.__rp||[]).map(o=>({o,t:o.t})):[];window.__rp=[{pid:5,by:"PFC PARK",txt:"Dentist at 0630, can I link up late?",t:Date.now()-60000,id:"5:PFC PARK:1"}]`);
    a.$('[data-thr="5"]').click();
    assert.match(a.$("#thrView .thr-who").textContent, /PFC PARK/);
    assert.equal(a.$$("#thrView .thr-b.l").length, 1);
    a.w.eval(`AFS.put=async(f,k,id,o)=>{window.__rp.push(o);window.__put=[k,id,o];return true}`);
    a.$("#thrInp").value = "I'll be there";
    a.$("#thrForm").dispatchEvent(new a.w.Event("submit", { bubbles: true, cancelable: true }));
    await sleep(100);
    assert.equal(a.w.eval(`JSON.stringify([__put[0],__put[2].pid,__put[2].by,__put[2].txt])`), JSON.stringify(["rp", 5, "CPL TEST", "I'll be there"]));
    assert.equal(a.$$("#thrView .thr-b.r").length, 1, "mine on the right");
    assert.equal(a.$("#thrInp").value, "", "box clears");
    a.$("#thrView [data-thrclose]").click();
    assert.match(a.$('[data-thr="5"]').textContent, /2 replies/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("a failed send says so and keeps what was typed; my own reply can be taken back", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    member(a);
    a.w.eval(`window.__rp=[{pid:5,by:"CPL TEST",txt:"Mine",t:Date.now(),id:"5:CPL TEST:9"}];AFS.all=(f,k)=>k==="rp"?window.__rp.map(o=>({o,t:o.t})):[];AFS.put=async()=>false`);
    a.$('[data-thr="5"]').click();
    a.$("#thrInp").value = "Hello"; a.$("#thrForm").dispatchEvent(new a.w.Event("submit", { bubbles: true, cancelable: true })); await sleep(100);
    assert.equal(a.$("#thrInp").value, "Hello", "kept for another try");
    a.w.eval(`AFS.put=async(f,k,id,o)=>{window.__rp=window.__rp.map(x=>x.id===id?o:x);return true}`);
    a.$("#thrView .thr-b.r").click();
    const del = a.$("#thrView [data-thrdel]"); assert.ok(del, "Delete shows under my reply");
    del.click(); await sleep(100);
    assert.equal(a.$$("#thrView .thr-b").length, 0, "gone");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("posts for one person or a section keep the private reply and get no thread", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    member(a, `,to:{k:"secs",s:["1ST"]}`);
    assert.ok(!a.$("[data-thr]"), "no thread chip");
    assert.ok(a.$('[data-fdrep="5"]'), "private Reply stays");
  } finally { await a.close(); }
});

test("the leader can open and answer a thread too", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.leaderMode=true;S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",lk:"${FEED.lk}",ek:"x",unit:"1ST PLT",main:true,acks:{},un:{},mine:{},seen:0,posts:[{id:1,t:Date.now(),txt:"Formation 0700",by:"1ST PLT"}]}];fdSel="${FEED.id}";view="feed";render()`);
    const chip = a.$('article [data-thr="1"]'); assert.ok(chip, "chip on the leader's card");
    a.w.eval(`AFS.put=async(f,k,id,o)=>{window.__put=o;return true}`);
    chip.click();
    a.$("#thrInp").value = "Yes, just tell your squad leader";
    a.$("#thrForm").dispatchEvent(new a.w.Event("submit", { bubbles: true, cancelable: true })); await sleep(100);
    assert.equal(a.w.eval(`__put.txt`), "Yes, just tell your squad leader");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
