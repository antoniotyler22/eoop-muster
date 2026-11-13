// 4.98.0: Team chat, a WhatsApp-style group conversation with the headcount on top.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { openApp, sleep } from "./harness.mjs";

const FEED = { id: "feedabcdef12", mk: "m".repeat(30) };
const setup = async (a, extra = "") => {
  await a.w.eval(`(async()=>{const k=crypto.getRandomValues(new Uint8Array(32));const ek=b64e(k).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/,"");
    S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",lk:"l".repeat(30),ek,unit:"1ST PLT",me:"CPL TEST",sec:"1ST",mine:{},seen:0,posts:[]}];S.myName="CPL TEST";S.onb=true;S.welcomed=1;fdSel="${FEED.id}";${extra};render()})()`);
  await sleep(100);
};
// a tiny in-memory server for chat_send / chat_get that keeps the ciphertext
const server = () => { const rows = []; return { rows, rpc: (n, args) => {
  if (n === "chat_send") { rows.push({ id: rows.length + 1, ct: args.p_ct, created_at: new Date().toISOString() }); return rows.length; }
  if (n === "chat_get") return rows.filter((r) => r.id > (args.p_after || 0));
  return []; } }; };

test("the Chat tab opens the team chat; Voice switch goes to Talk and back", async () => {
  const srv = server();
  const a = await openApp({ rpc: srv.rpc });
  try {
    await setup(a);
    assert.match(a.$("#tabbar [data-tab='talk']").textContent, /Chat/);
    a.$("#tabbar [data-tab='talk']").click(); await sleep(200);
    assert.equal(a.w.eval("view"), "chat");
    assert.ok(a.$("#chIn") && a.$("#chAcc"), "composer and I'm accounted for button shown");
    assert.equal(a.$("#tabbar [data-tab='talk']").getAttribute("aria-current"), "page");
    a.$("[data-seg='voice']").click(); await sleep(150);
    assert.equal(a.w.eval("view"), "talk");
    assert.ok(a.$("#tkSw"), "Talk screen shown");
    assert.ok(a.$("#main .ch-seg"), "Chat | Voice switch is on the Talk screen too");
    a.$("[data-seg='chat']").click(); await sleep(150);
    assert.equal(a.w.eval("view"), "chat");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("sending a message encrypts it and shows it as my bubble", async () => {
  const srv = server();
  const a = await openApp({ rpc: srv.rpc });
  try {
    await setup(a);
    a.$("#tabbar [data-tab='talk']").click(); await sleep(200);
    a.$("#chIn").value = "Headcount at 1600, form up by the vans";
    a.$("#chForm").dispatchEvent(new a.w.Event("submit", { cancelable: true, bubbles: true })); await sleep(300);
    assert.equal(srv.rows.length, 1);
    assert.ok(!srv.rows[0].ct.includes("Headcount"), "the server only sees ciphertext");
    const mine = a.$(".ch-row.me .ch-t");
    assert.ok(mine, "my bubble is on the right");
    assert.match(mine.textContent, /Headcount at 1600/);
    assert.equal(a.$("#chIn").value, "", "composer clears");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("a message from someone else shows on the left with their name, and badges the tab until Chat is open", async () => {
  const srv = server();
  const a = await openApp({ rpc: srv.rpc });
  try {
    await setup(a);
    a.$("#tabbar [data-tab='talk']").click(); await sleep(200);
    a.$("[data-seg='voice']").click(); await sleep(100);
    await a.w.eval(`(async()=>{const ct=await fdEnc(S.feeds[0].ek,{k:"m",by:"SGT JONES",tx:"On my way, 10 min out",t:Date.now()});
      window.__rows=[{id:1,ct,created_at:new Date().toISOString()}]})()`);
    srv.rows.push(...a.w.eval("window.__rows"));
    await a.w.eval(`(async()=>{await new Promise(r=>setTimeout(r,10));})()`);
    a.w.eval(`document.querySelector("[data-seg='chat']").click()`); await sleep(500);
    const other = a.$(".ch-row:not(.me) .ch-t");
    assert.ok(other, "their bubble is on the left");
    assert.match(a.$(".ch-row:not(.me) .ch-n").textContent, /SGT JONES/);
    assert.equal(a.w.eval("chatUnread()"), 0, "nothing unread once Chat is open");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("the bar shows how many are accounted for from the roster", async () => {
  const srv = server();
  const a = await openApp({ rpc: srv.rpc });
  try {
    await setup(a, `S.source="real";S.roster=S.roster.slice(0,4).map((m,i)=>({...m,status:i<3?"On Hand":"Leave"}))`);
    a.$("#tabbar [data-tab='talk']").click(); await sleep(250);
    const b = a.$("#chBar");
    assert.ok(b, "bar shown");
    assert.match(b.textContent, /3 of 4 accounted for/);
    assert.equal(a.$(".ch-bw i").style.width, "75%");
  } finally { await a.close(); }
});

test("I'm accounted for checks in through My check-in and posts a line in the chat", async () => {
  const srv = server();
  const a = await openApp({ rpc: srv.rpc });
  try {
    await setup(a, `S.source="real";S.roster=S.roster.slice(0,3).map(m=>({...m,status:"Leave"}));S.who={id:S.roster[0].id,n:"CPL TEST"}`);
    a.$("#tabbar [data-tab='talk']").click(); await sleep(250);
    a.$("#chAcc").click(); await sleep(500);
    assert.equal(a.w.eval("S.roster[0].status"), "On Hand");
    assert.ok(a.$(".ch-sys"), "a system line appears");
    assert.match(a.$(".ch-sys").textContent, /is accounted for/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("setup: the SQL part, the system check and the bundle are in place", () => {
  const sql = readFileSync(new URL("../supabase/setup/44_team_chat.sql", import.meta.url), "utf8");
  assert.match(sql, /create table if not exists public\.chat_msgs/);
  assert.match(sql, /talk_key_ok\(p_feed, p_key\)/);
  assert.match(sql, /interval '30 days'/);
  const b = readFileSync(new URL("../tools/bundle.mjs", import.meta.url), "utf8");
  assert.match(b, /features\/team-chat\.js/);
});
