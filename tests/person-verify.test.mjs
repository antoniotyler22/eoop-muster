// 4.123.0: a leader vouches for a person (4 levels, Verify / Revoke, section filter, server mirror = SQL part 50).
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const boot = async (o = {}) => {
  const a = await openApp(Object.assign({ rpc: () => [] }, o));
  a.w.eval(`S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.myName="SGT Ruiz";
    S.roster=[{id:"r1",rank:"CPL",name:"DIAZ, ANA",sec:"HQ",status:"On Hand"},
              {id:"r2",rank:"LCPL",name:"KIM, JO",sec:"HQ",status:"On Hand",pk:"pagekey"},
              {id:"r3",rank:"PFC",name:"LEE, SAM",sec:"HQ",status:"On Hand",ckAt:Date.now()}];save()`);
  return a;
};
const lvl = (a, id) => a.w.eval(`afPersonVerify.level(S.roster.find(m=>m.id==="${id}"))`);

test("level is derived: nothing, claimed (has a page), confirmed (checked in), verified (vouched)", async () => {
  const a = await boot();
  try {
    assert.equal(lvl(a, "r1"), 0); assert.equal(lvl(a, "r2"), 1); assert.equal(lvl(a, "r3"), 2);
    a.w.eval(`S.roster[0].vf={by:"SGT Ruiz",at:Date.now()}`);
    assert.equal(lvl(a, "r1"), 3);
    a.w.eval(`S.roster[2].vf={by:"SGT Ruiz",at:Date.now()}`);
    assert.equal(lvl(a, "r3"), 3, "a vouch outranks a check-in");
  } finally { await a.close(); }
});

test("person card: Verify vouches with the leader's name and date; Revoke needs two taps", async () => {
  const calls = [];
  const a = await boot({ rpc: (fn, args) => { calls.push([fn, args]); return []; } });
  try {
    a.w.eval(`window.afBiz={tok:()=>"t".repeat(40)};openCard("r1")`); await sleep(20);
    assert.match(a.$("#pvCard").textContent, /Unverified/);
    a.$("[data-pvset]").click(); await sleep(60);
    assert.deepEqual(JSON.parse(a.w.eval(`JSON.stringify([S.roster[0].vf.by])`)), ["SGT Ruiz"]);
    assert.match(a.$("#pvCard").textContent, /Verified by SGT Ruiz/);
    assert.ok(calls.some((c) => c[0] === "vouch_set" && c[1].p_mid === "r1" && c[1].p_by === "SGT Ruiz"), "server copy written");
    a.$("[data-pvrev]").click(); await sleep(20);
    assert.ok(a.w.eval(`!!S.roster[0].vf`), "first tap only arms");
    assert.match(a.$("[data-pvrev]").textContent, /Tap again/);
    a.$("[data-pvrev]").click(); await sleep(60);
    assert.ok(a.w.eval(`!S.roster[0].vf`), "second tap revokes");
    assert.ok(calls.some((c) => c[0] === "vouch_clear" && c[1].p_mid === "r1"), "server copy revoked");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("a view-only phone sees the badge but no Verify or Revoke button", async () => {
  const a = await boot();
  try {
    a.w.eval(`S.role="view";S.roster[0].vf={by:"SGT Ruiz",at:Date.now()};openCard("r1")`); await sleep(20);
    assert.match(a.$("#pvCard").textContent, /Verified by SGT Ruiz/);
    assert.ok(!a.$("[data-pvrev]") && !a.$("[data-pvset]"));
    a.w.eval(`afPersonVerify.vouch(S.roster[1])`);
    assert.ok(a.w.eval(`!S.roster[1].vf`), "can't vouch without edit rights");
  } finally { await a.close(); }
});

test("section list: mark, Verify button and the All / Verified / Not yet filter", async () => {
  const a = await boot();
  try {
    a.w.eval(`S.roster[0].vf={by:"SGT Ruiz",at:Date.now()};view="hq";render()`); await sleep(20);
    const shown = () => a.$$("#main .list .m").filter((r) => r.style.display !== "none").length;
    assert.equal(a.$$("#main .list .m").length, 3);
    assert.equal(a.$$("[data-pvset]").length, 2, "Verify on the two not yet verified");
    assert.match(a.$("#pvF").textContent, /All 3.*Verified 1.*Not yet 2/);
    a.$('[data-pvf="ver"]').click(); await sleep(20); assert.equal(shown(), 1);
    a.$('[data-pvf="not"]').click(); await sleep(20); assert.equal(shown(), 2);
    a.$('[data-pvf="all"]').click(); await sleep(20); assert.equal(shown(), 3);
    a.$("[data-pvset]").click(); await sleep(20);
    assert.match(a.$("#pvF").textContent, /Verified 2/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("a new phone restores vouches from the server", async () => {
  const a = await boot({ rpc: (fn) => fn === "vouch_list" ? [{ mid: "r1", by_name: "SGT Ruiz", at: 1763300000000 }, { mid: "r2", by_name: "SSgt Cole", at: 1763300000000 }] : [] });
  try {
    a.w.eval(`window.afBiz={tok:()=>"t".repeat(40)};save()`);
    await sleep(4400);
    assert.equal(a.w.eval(`S.roster[0].vf&&S.roster[0].vf.by`), "SGT Ruiz");
  } finally { await a.close(); }
}, { timeout: 15000 });

test("How it works explains the four levels, who can verify and what's kept", async () => {
  const a = await boot();
  try {
    a.w.eval(`view="hq";render()`); await sleep(20);
    assert.ok(!a.$("#pvInfo"), "closed by default");
    a.$("[data-pvinfo]").click(); await sleep(20);
    const t = a.$("#pvInfo").textContent;
    for (const w of ["Unverified", "Claimed", "Confirmed", "Verified", "Who can verify", "No ID is collected", "Revoke"]) assert.ok(t.includes(w), w);
    a.$("[data-pvinfo]").click(); await sleep(20);
    assert.ok(!a.$("#pvInfo"), "closes again");
    a.w.eval(`openCard("r1")`); await sleep(20);
    a.$("[data-pvinfo]").click(); await sleep(20);
    assert.ok(a.$("#pvInfo"), "also on the person card");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("4.142.0: the vouch goes into the member's page, and the member sees Waiting / Verified by their leader", async () => {
  const a = await boot();
  try {
    const un = a.w.eval(`mpDigest(S.roster[1]).vf`); assert.equal(un, null, "not vouched: no vf in the page");
    a.w.eval(`S.roster[1].vf={by:"SGT Ruiz",at:Date.now()}`);
    const v = a.w.eval(`mpDigest(S.roster[1]).vf`); assert.equal(v.by, "SGT Ruiz");
    const base = `{v:1,mid:"r2",reqs:[],unit:"U",rank:"LCPL",name:"KIM, JO",sec:"HQ",secName:"HQ",status:"On Hand",statusShort:"On Hand",duty:"Full Duty",since:0,start:"",end:"",edd:"",eas:"",duties:[],due:[],cal:[],owe:[],events:[]`;
    a.w.eval(`S.roster=[];S.who=null;S.source="sample";S.board=null;S.link=null;S.feeds=[];S.leaderMode=false;S.me={pk:"pagekey",unit:"U",t:Date.now(),d:${base},vf:null}};view="me";renderMe()`);
    assert.match(a.$("#meVf").textContent, /Waiting for your leader/);
    a.w.eval(`S.me.d.vf={by:"SGT Ruiz",at:Date.now()};renderMe()`);
    assert.match(a.$("#meVf").textContent, /Verified by SGT Ruiz/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
