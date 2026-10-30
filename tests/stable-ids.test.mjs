// Nobody drops: ids stay stable across reloads and sync; leader pulls never wipe a section; stale synced phones don't publish.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("reloading a file keeps ids for the same names and never gives two people one id", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.leaderMode=true;S.mode="military";S.onb=true;S.welcomed=1;save()`);
    const r1 = a.w.eval(`const r=importCSV("Rank,Name,Unit\\nSGT,SMITH JOHN,HQ\\nCPL,JONES AMY,HQ\\nLCPL,MUNIZ LUIS,UT");S.roster=r.roster;S.source="mol";save();S.roster.map(m=>[m.name,m.id])`);
    const ids = new Set(r1.map(x => x[1])); assert.equal(ids.size, 3, "unique ids");
    assert.ok(r1.every(x => !/^m\\d+$/.test(x[1])), "no row-number ids");
    const smith = r1.find(x => x[0] === "SMITH JOHN")[1];
    // reload with a changed order and a new person: Smith keeps his id, newcomer gets a fresh one
    const r2 = a.w.eval(`const r=importCSV("Rank,Name,Unit\\nPVT,NEW GUY,HQ\\nSGT,SMITH JOHN,HQ\\nLCPL,MUNIZ LUIS,UT");r.roster.map(m=>[m.name,m.id])`);
    assert.equal(r2.find(x => x[0] === "SMITH JOHN")[1], smith, "same name, same id");
    assert.equal(new Set(r2.map(x => x[1])).size, 3);
    // the save guard: force a duplicate id and it gets fixed
    a.w.eval(`S.roster[1].id=S.roster[0].id;save()`);
    assert.equal(new Set(a.w.eval("S.roster.map(m=>m.id)")).size, 3, "guard fixed the duplicate");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("sync: the other phone's copy lines up by name, so nobody is dropped or doubled", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.leaderMode=true;S.mode="military";S.source="mol";S.sync={on:true,code:"AAAA-BBBB-CCCC",ver:1,at:1,err:"",last:"",baseSig:{},baseMem:{}};
      S.roster=[{id:"x1",rank:"SGT",name:"SMITH JOHN",sec:"HQ",status:"On Hand"},{id:"x2",rank:"CPL",name:"JONES AMY",sec:"HQ",status:"On Hand"}];save()`);
    // other phone: Smith under a different id (reloaded file), and a different person who happens to have our x2
    const R = { roster: [{ id: "m1", rank: "SGT", name: "SMITH JOHN", sec: "HQ", status: "Leave" }, { id: "x2", rank: "PFC", name: "PEREZ ANA", sec: "UT", status: "On Hand" }], gone: {}, back: {} };
    a.w.eval(`mergeRemote(${JSON.stringify(R)});save()`);
    const names = a.w.eval("S.roster.map(m=>m.name).sort()");
    assert.equal(JSON.stringify(names), JSON.stringify(["JONES AMY", "PEREZ ANA", "SMITH JOHN"]), "three people, nobody dropped, Smith not doubled");
    assert.equal(new Set(a.w.eval("S.roster.map(m=>m.id)")).size, 3);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("section leader: an empty pull doesn't wipe the section, and their own adds stay", async () => {
  let payload = null;
  const a = await openApp({ rpc: (fn) => fn === "get_roster" ? (payload ? [payload] : []) : [] });
  try {
    await a.w.eval(`(async()=>{const ek=b64url(crypto.getRandomValues(new Uint8Array(32)));window.__ek=ek;S.leaderMode=true;S.mode="military";S.source="link";
      S.link={board:"b1",wk:"w".repeat(30),sec:"UT",mysec:"UT",rk2:ek,pulled:true,pt:1};
      S.roster=[{id:"u1",uid:"o1",rank:"LCPL",name:"MUNIZ LUIS",sec:"UT",status:"On Hand"},{id:"u2",rank:"PVT",name:"LOCAL ADD",sec:"UT",status:"On Hand"}];save()})()`);
    const ct = await a.w.eval(`fdEnc(window.__ek,{ms:[]})`);
    payload = { ct, updated_at: new Date(Date.now() + 60000).toISOString() };
    await a.w.eval("rosterPull(true)"); await sleep(50);
    assert.equal(a.w.eval("S.roster.filter(m=>m.sec==='UT').length"), 2, "empty pull kept the section");
    const ct2 = await a.w.eval(`fdEnc(window.__ek,{ms:[{id:"o1",rank:"LCPL",name:"MUNIZ LUIS",status:"On Hand"}]})`);
    payload = { ct: ct2, updated_at: new Date(Date.now() + 120000).toISOString() };
    await a.w.eval("rosterPull(true)"); await sleep(50);
    assert.equal(JSON.stringify(a.w.eval("S.roster.map(m=>m.name).sort()")), JSON.stringify(["LOCAL ADD", "MUNIZ LUIS"]), "local add stayed, OIC's person kept");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("a joined synced phone doesn't publish rosters to leaders until it has pulled", async () => {
  const calls = [];
  const a = await openApp({ rpc: (fn, b) => { calls.push(fn); return []; } });
  try {
    await a.w.eval(`S.mode="military";S.source="mol";S.role="sncoic";S.sync={on:true,code:"AAAA-BBBB-CCCC",ver:1,at:1,err:"",last:""};
      S.board={id:"b1",rk:"r".repeat(30),wk:"w".repeat(30),sk:{UT:b64url(crypto.getRandomValues(new Uint8Array(32)))},rsig:{},rat:{}};S.roster=[{id:"u1",rank:"LCPL",name:"MUNIZ LUIS",sec:"UT",status:"On Hand"}];save()`);
    await a.w.eval("rpPublish(true)"); await sleep(50);
    assert.ok(!calls.includes("put_roster"), "no publish before the first pull");
    await a.w.eval("S.sync.pulledOnce=Date.now()");
    await a.w.eval("rpPublish(true)"); await sleep(50);
    assert.ok(calls.includes("put_roster"), "publishes after pulling: " + a.w.eval("S.board.rerr") + " " + calls.join(","));
  } finally { await a.close(); }
});
