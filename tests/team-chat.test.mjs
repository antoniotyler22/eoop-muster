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

// 4.128.0: the big team chat is retired. The tab opens Feed, there's no Chat segment or composer, the old messages are kept
// read-only under Feed ("Earlier team chat"), and the Official channel is untouched.
test("4.128.0: team chat is retired: the tab opens Feed, no Chat segment, no composer", async () => {
  const srv = server();
  const a = await openApp({ rpc: srv.rpc });
  try {
    await setup(a);
    a.$("#tabbar [data-tab='talk']").click(); await sleep(250);
    assert.ok(["feed", "send"].includes(a.w.eval("view")));
    assert.ok(!a.$(".ch-seg [data-seg='chat']"), "no Chat segment");
    a.w.eval(`view="chat";render()`); await sleep(100);
    assert.equal(a.w.eval("view"), "feed", "the old chat screen lands on Feed");
    assert.ok(!a.$("#chIn") && !a.$("#chForm"), "nowhere to type a team chat message");
    assert.ok(!srv.rows.length, "nothing sent");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("4.128.0: old team chat messages are kept read-only under Feed", async () => {
  const srv = server();
  const a = await openApp({ rpc: srv.rpc });
  try {
    await setup(a);
    for (const [by, tx] of [["SGT RAY", "Formation at 0600"], ["CPL TEST", "Copy, see you there"]])
      srv.rows.push({ id: srv.rows.length + 1, ct: await a.w.eval(`fdEnc(S.feeds[0].ek,{k:"m",by:${JSON.stringify(by)},tx:${JSON.stringify(tx)},t:Date.now()})`), created_at: new Date().toISOString() });
    for (let i = 0; i < 60 && !a.w.eval(`(S.chatArc&&S.chatArc["${FEED.id}"]&&S.chatArc["${FEED.id}"].done)||0`); i++) await sleep(250);
    assert.equal(a.w.eval(`chatArchive(S.feeds[0]).length`), 2, "copied to this phone");
    a.w.eval(`view="feed";render()`); await sleep(150);
    const arc = a.$("#chArc");
    assert.ok(arc, "shown under Feed");
    assert.match(arc.textContent, /Earlier team chat · 2 messages \(read-only\)/);
    assert.match(arc.textContent, /SGT RAY/); assert.match(arc.textContent, /Formation at 0600/);
    assert.ok(a.w.eval(`SYNC_SKIP.includes("chatArc")`));
  } finally { await a.close(); }
});

test("setup: the SQL part, the system check and the bundle are in place", () => {
  const sql = readFileSync(new URL("../supabase/setup/44_team_chat.sql", import.meta.url), "utf8");
  assert.match(sql, /create table if not exists public\.chat_msgs/);
  assert.match(sql, /talk_key_ok\(p_feed, p_key\)/);
  assert.match(sql, /interval '30 days'/);
  const b = readFileSync(new URL("../tools/bundle.mjs", import.meta.url), "utf8");
  assert.match(b, /features\/team-chat\.js/);
  const p54 = readFileSync(new URL("../supabase/setup/54_messages.sql", import.meta.url), "utf8");
  assert.match(p54, /create or replace function public\.chat_send[\s\S]*?raise exception 'team chat is retired/, "part 54 stops new team chat messages");
  assert.doesNotMatch(p54, /(drop|delete|truncate|update)[^;]*official/i, "and leaves the Official channel alone");
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
