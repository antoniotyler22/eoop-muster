import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("Inbox phone alerts: a leader phone signs up for each thread; the person's phone for theirs", async () => {
  const calls = [];
  const a = await openApp({ rpc: (name, args) => { calls.push([name, args]); return []; } });
  try {
    await a.w.eval(`S.onb=true;S.welcomed=1;S.leaderMode=true;S.pushOn=true;
      const m=S.roster[0];m.pk="p".repeat(24);m.dm={id:"thread12345abcdefgh",k:"k".repeat(32),ek:"x",ok:1};
      window.pushSub=async()=>({toJSON:()=>({endpoint:"https://push.example/abc",keys:{p256dh:"a",auth:"b"}})});`);
    await a.w.eval(`window.dmPushAttach()`); await sleep(120);
    const c = calls.find((x) => x[0] === "dm_sub");
    assert.ok(c, "dm_sub called");
    assert.equal(c[1].p_role, "L");
    assert.equal(c[1].p_id, "thread12345abcdefgh");
    assert.ok(c[1].p_sub.dev, "device id included so the sender's own phone is skipped");
    const n = calls.filter((x) => x[0] === "dm_sub").length;
    await a.w.eval(`window.dmPushAttach()`); await sleep(80);
    assert.equal(calls.filter((x) => x[0] === "dm_sub").length, n, "no repeat sign-ups for the same phone");
    assert.ok(a.w.eval(`SYNC_SKIP.includes("dmSubs")`), "sign-ups stay on this phone");
  } finally { await a.close(); }
});

import { readFileSync } from "node:fs";
test("alerts show the sender and a preview (style A), for Inbox and Talk", () => {
  const n = readFileSync(new URL("../supabase/functions/notify/index.ts", import.meta.url), "utf8");
  assert.match(n, /body\.talk === "string"/);
  assert.match(n, /title: ti \? "💬 " \+ ti/);
  assert.match(n, /title: ti \? "📻 " \+ ti/);
  assert.match(n, /member_key_hash/);
  const t = readFileSync(new URL("../features/talk.js", import.meta.url), "utf8");
  assert.match(t, /SB\.notify\(null,\{talk:f\.id,k:f\.mk/);
  const v = readFileSync(new URL("../v12.js", import.meta.url), "utf8");
  assert.match(v, /SB\.notify\(null,\{dm:th\.id,k:th\.k/);
});

test("Talk alerts go only to the people a message was sent to", async () => {
  const n = readFileSync(new URL("../supabase/functions/notify/index.ts", import.meta.url), "utf8");
  assert.match(n, /want\.has\(String\(s\.sub\?\.nm/);
  const t = readFileSync(new URL("../features/talk.js", import.meta.url), "utf8");
  assert.match(t, /to:targets\(f,o\.g\)\.filter\(e=>!entryMe\(f,e\)\)/);
  const calls = [];
  const a = await openApp({ rpc: (name, args) => { calls.push([name, args]); return []; } });
  try {
    await a.w.eval(`S.onb=true;S.welcomed=1;S.leaderMode=true;S.pushOn=true;S.myName="gysgt tyler";
      S.feeds=[{id:"feedabcdef12",mk:"m".repeat(30),ek:"x",unit:"TEAM",me:"A",posts:[],seen:0,mine:{},hub:1}];
      window.pushSub=async()=>({toJSON:()=>({endpoint:"https://push.example/zzz"}),endpoint:"https://push.example/zzz"});`);
    await a.w.eval(`taAttach(true)`); await sleep(150);
    const c = calls.find((x) => x[0] === "feed_sub");
    assert.ok(c && c[1].p_sub.nm, "phone signs up with its name so Talk can find it");
  } finally { await a.close(); }
});

test("Word of Mouth photo pickers live outside the page so a Word of Mouth redraw can't throw the chosen photo away", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.onb=true;S.welcomed=1;S.leaderMode=true;S.feeds=[{id:"feedabcdef12",mk:"m".repeat(30),lk:"l".repeat(30),ek:"x",unit:"TEAM",me:"A",posts:[],seen:0,mine:{},hub:1,pk:1}];view="feed";render()`);
    await sleep(150);
    a.$("#fpPick").click(); await sleep(30);
    const n = a.w.eval(`[...document.body.children].filter(e=>e.tagName==="INPUT"&&e.type==="file"&&e.accept==="image/*").length`);
    assert.ok(n >= 1, "picker input sits on the body");
    a.w.eval(`render()`); await sleep(60);
    assert.equal(a.w.eval(`[...document.body.children].filter(e=>e.tagName==="INPUT"&&e.type==="file"&&e.accept==="image/*").length`), n, "survives a redraw");
  } finally { await a.close(); }
});

test("Word of Mouth auto-scroll stays off while you are on the Post tab", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.onb=true;S.welcomed=1;S.leaderMode=true;S.feeds=[{id:"feedabcdef12",mk:"m".repeat(30),lk:"l".repeat(30),ek:"x",unit:"TEAM",me:"A",posts:[],seen:0,mine:{},hub:1,pk:1}];view="feed";render()`);
    await sleep(200);
    a.$('[data-fdtab="post"]').click(); await sleep(120);
    assert.equal(a.$('#fdTabs [data-fdtab="post"]').getAttribute("aria-pressed"), "true");
    const pill = a.w.eval(`(()=>{const e=document.getElementById("fdDrift");return e&&e.isConnected&&getComputedStyle(e).display!=="none"?"shown":"none"})()`);
    assert.equal(pill, "none", "no Auto-scroll pill on the Post tab");
    assert.equal(a.w.eval("feedDrift.why()"), "post", "glide is blocked");
  } finally { await a.close(); }
});

test("Inbox voice notes: record button, encrypted audio field, safe playback", () => {
  const v = readFileSync(new URL("../v12.js", import.meta.url), "utf8");
  assert.match(v, /id="v12DmRec"/);
  assert.match(v, /id="v12DmDel"/, "a draft can be deleted or cancelled");
  assert.match(v, /r\.cancel/, "cancelling a recording saves nothing");
  assert.match(v, /if\(aud\)\{o\.aud=aud/, "audio goes inside the encrypted message");
  assert.match(v, /<audio class="tl-aud" controls/);
  assert.match(v, /Voice note/, "inbox list and alert preview name it");
  const m = v.match(/const audOK=(.*)\n/);
  const audOK = new Function("return " + m[1].replace(/;$/, ""))();
  assert.ok(audOK("data:audio/mp4;base64,AAAA"));
  assert.ok(audOK("data:audio/webm;base64,AAAA"));
  assert.ok(!audOK("data:text/html;base64,AAAA"), "only audio types play");
  assert.ok(!audOK("data:audio/mp4;base64,AA\" onerror=\"x"), "no markup injection");
  assert.ok(!audOK("data:audio/mp4;base64," + "A".repeat(100000)), "too big is dropped");
});
