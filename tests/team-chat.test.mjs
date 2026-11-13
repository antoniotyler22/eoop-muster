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

test("4.99.0: sending a message alerts the team's phones as a chat alert", async () => {
  const srv = server();
  const a = await openApp({ rpc: srv.rpc, fn: () => ({ body: {} }) });
  try {
    await setup(a);
    a.$("#tabbar [data-tab='talk']").click(); await sleep(200);
    a.$("#chIn").value = "Form up now";
    a.$("#chForm").dispatchEvent(new a.w.Event("submit", { cancelable: true, bubbles: true })); await sleep(400);
    const c = a.calls.find((x) => /functions\/v1\/notify/.test(x.url) && x.body && x.body.chat === true);
    assert.ok(c, "notify called with chat:true");
    assert.equal(c.body.talk, FEED.id);
    assert.equal(c.body.tx, "Form up now");
    const n = readFileSync(new URL("../supabase/functions/notify/index.ts", import.meta.url), "utf8");
    assert.match(n, /💬/);
  } finally { await a.close(); }
});

test("4.99.0: opening Chat shows a New messages divider above what you haven't read", async () => {
  const srv = server();
  const a = await openApp({ rpc: srv.rpc });
  try {
    await setup(a);
    await a.w.eval(`(async()=>{const ek=S.feeds[0].ek;const mk=async(by,tx,id)=>({id,ct:await fdEnc(ek,{k:"m",by,tx,t:Date.now()}),created_at:new Date().toISOString()});
      window.__r=[await mk("SGT JONES","old one",1),await mk("SGT JONES","new one",2)]})()`);
    srv.rows.push(...a.w.eval("window.__r"));
    a.w.eval(`S.chatSeen={"${FEED.id}":1}`);
    a.$("#tabbar [data-tab='talk']").click(); await sleep(500);
    const d = a.$("#chNew");
    assert.ok(d, "divider shown");
    assert.match(d.textContent, /New messages/);
    assert.match(d.nextElementSibling.textContent, /new one/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("4.100.0: Official tab shows updates from Accounted For, read-only, with an unread dot until opened", async () => {
  const posts = [
    { id: 1, body: "Welcome to Accounted For.", url: "", created_at: new Date(Date.now() - 864e5).toISOString() },
    { id: 2, body: "New: team chat is live.", url: "https://example.com/news", created_at: new Date().toISOString() },
  ];
  const a = await openApp({ rpc: (n, args) => (n === "official_get" ? posts.filter((p) => p.id > (args.p_after || 0)) : []) });
  try {
    await setup(a);
    await a.w.eval(`window.officialPull(true)`); await sleep(300);
    assert.equal(a.w.eval("officialUnread()"), 2);
    a.$("#tabbar [data-tab='talk']").click(); await sleep(200);
    assert.ok(a.$("[data-seg='official'] .of-dot"), "dot on the Official segment");
    a.$("[data-seg='official']").click(); await sleep(300);
    assert.equal(a.w.eval("view"), "official");
    assert.equal(a.$$(".of-row").length, 2);
    assert.match(a.$(".of-row .of-n").textContent, /Accounted For/);
    assert.match(a.$(".of-more").getAttribute("href"), /example\.com/);
    assert.ok(!a.$("#ofForm") && !a.$("#chIn"), "no composer for regular users");
    assert.match(a.$(".of-foot").textContent, /Only the Accounted For team can post/);
    assert.equal(a.w.eval("officialUnread()"), 0, "read once opened");
    assert.equal(a.$("#tabbar [data-tab='talk']").getAttribute("aria-current"), "page");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("4.100.0: the owner function and SQL part for the official channel are in place", () => {
  const sql = readFileSync(new URL("../supabase/setup/45_official_channel.sql", import.meta.url), "utf8");
  assert.match(sql, /create table if not exists public\.official_posts/);
  assert.match(sql, /grant execute on function public\.official_get/);
  assert.doesNotMatch(sql, /grant (insert|update|delete)[^;]*to anon/);
  const o = readFileSync(new URL("../supabase/functions/owner/index.ts", import.meta.url), "utf8");
  assert.match(o, /case "opost"/);
  assert.match(o, /case "odel"/);
});
