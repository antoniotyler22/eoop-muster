// 4.102.0: five tabs, what's new card, backup nudge, new person fields survive a roster reload.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const lead = async (a, extra = "") => {
  await a.w.eval(`S.feeds=[{id:"feedabcdef12",mk:"m".repeat(30),lk:"l".repeat(30),ek:"",unit:"ALPHA",me:"CPL TEST",sec:"1ST",mine:{},seen:0,posts:[]}];S.myName="CPL TEST";S.mode="military";S.onb=true;S.welcomed=1;S.leaderMode=true;S.source="real";${extra};view="board";render()`);
  await sleep(150);
};

test("a leader's bar has five tabs; Feed and Inbox live under Chat", async () => {
  const a = await openApp({});
  try {
    await lead(a);
    const tabs = [...a.w.document.querySelectorAll("#tabbar [data-tab]")].map((b) => b.dataset.tab);
    assert.deepEqual(tabs, ["home", "talk", "people", "plan", "tools"]);
    a.$("#tabbar [data-tab='talk']").click(); await sleep(200);
    assert.equal(a.w.eval("view"), "chat");
    for (const k of ["chat", "feed", "inbox", "official", "voice"]) assert.ok(a.$(`.ch-seg [data-seg='${k}']`), "switch has " + k);
    a.$(".ch-seg [data-seg='feed']").click(); await sleep(250);
    assert.ok(["feed", "send"].includes(a.w.eval("view")));
    assert.equal(a.$("#tabbar [data-tab='talk']").getAttribute("aria-current"), "page", "Chat tab stays lit on Feed");
    assert.ok(a.$("#main .ch-seg"), "switch shown on Feed too");
    a.$(".ch-seg [data-seg='inbox']").click(); await sleep(250);
    assert.equal(a.w.eval("view"), "dms");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("members keep their own tab bar", async () => {
  const a = await openApp({});
  try {
    await a.w.eval(`S.mode="military";S.onb=true;S.welcomed=1;S.me={};view="today";render()`);
    await sleep(100);
    const tabs = [...a.w.document.querySelectorAll("#tabbar [data-tab]")].map((b) => b.dataset.tab);
    assert.ok(tabs.includes("feed"), "members still have the Word of Mouth tab: " + tabs.join());
    assert.ok(!tabs.includes("home"), "member bar is not the leader bar");
  } finally { await a.close(); }
});

test("Home shows What's new once, then a backup reminder until dismissed", async () => {
  const a = await openApp({});
  try {
    await lead(a, `S.roster=S.roster.slice(0,10)`);
    assert.ok(a.$("#ftNew"), "what's new card");
    a.$("#ftNewOk").click(); await sleep(150);
    assert.equal(a.w.eval("S.seenVer"), a.w.eval("window.AV"));
    assert.ok(!a.$("#ftNew"));
    assert.ok(a.$("#ftBk"), "backup reminder follows");
    a.$("#ftBkLater").click(); await sleep(100);
    assert.ok(!a.$("#ftBk"));
    a.w.eval("view='board';render()"); await sleep(150);
    assert.ok(!a.$("#ftBk"), "stays away for two weeks");
  } finally { await a.close(); }
});

test("role, email, emergency contact and note survive a roster reload", async () => {
  const a = await openApp({});
  try {
    const r = await a.w.eval(`(()=>{S.roster=[{id:"x1",rank:"CPL",name:"RIVERA, ANA",sec:"HQ",status:"On Hand",role:"Driver",email:"a@x.com",ec:{n:"Maria",r:"Mother",p:"8085550199"},note:"Van 3"}];
      S.preLink={roster:[{id:"p1",rank:"CPL",name:"RIVERA, ANA",sec:"HQ",status:"On Hand",duty:"Full Duty",detail:"",loc:"",start:"",end:""}]};
      restoreFrom("pre");const m=S.roster[0];return JSON.stringify([m.role,m.email,m.ec&&m.ec.n,m.note])})()`);
    assert.equal(r, JSON.stringify(["Driver", "a@x.com", "Maria", "Van 3"]));
  } finally { await a.close(); }
});
