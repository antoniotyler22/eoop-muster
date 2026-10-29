// 4.18: My page layout A and photos on Feed posts.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const FEED = { id: "feedtest00", mk: "m".repeat(32) };
async function memberApp(rpc) {
  const a = await openApp({ rpc });
  await a.w.eval(`(async()=>{
    const ek=b64url(crypto.getRandomValues(new Uint8Array(32)));
    const m=S.roster[0];const k=dkey();S.duty.rosters.push({id:"d1",name:"Duty NCO",secs:[],att:false,skip:[],order:[],ptr:0,assign:{[k]:m.id},excl:{}});
    S.events=[{id:"e1",name:"Unit 5K",date:new Date(Date.now()+3*864e5).toISOString().slice(0,10),secs:SECTIONS.map(x=>x[0]),att:false,done:{}}];
    const D=mpDigest(m);D.feed={id:"${FEED.id}",mk:"${FEED.mk}",ek,unit:"1ST PLT",secs:["HQ"]};D.cks=[];
    S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",ek,unit:"1ST PLT",me:"CPL TEST",mid:m.id,sec:m.sec,posts:[{id:5,t:Date.now()-60000,txt:"Formation 0630 Thursday.",urg:false,to:{k:"all"},by:"Lt Park"}],seen:0,mine:{},hub:1}];
    S.me={pk:"p".repeat(24),unit:"1ST PLT",d:D,t:Date.now()};S.onb=true;S.welcomed=1;window.__ek=ek;view="me";render()})()`);
  await sleep(80);
  return a;
}

test("my page: greeting with 24-hour clock, check-in on top, the word with Got it, today, coming up with events for everyone", async () => {
  const a = await memberApp(() => []);
  try {
    const main = a.$("#main");
    assert.ok(main.querySelector(".me-built"), "rebuilt");
    assert.match(a.$("#meDay").textContent, /^(SUNDAY|MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY), [A-Z]{3} \d{1,2} · \d{4}/);
    assert.match(main.querySelector(".me-built .hm-h").textContent, /^Good (morning|afternoon|evening), /);
    const order = a.w.eval(`[...document.querySelectorAll('#main > *')].map(x=>x.id||x.className.split(' ')[0])`);
    assert.ok(order.indexOf("ckCard") < order.indexOf("meWord"), order.join(","));
    assert.ok(a.$("#meWord [data-fdack]"), "the word has a Got it button");
    assert.match(main.textContent, /Today for me/);
    assert.match(main.textContent, /Duty NCO/);
    assert.match(main.textContent, /Coming up · 7 days/);
    assert.match(main.textContent, /Unit 5K/);
    assert.match(main.textContent, /Event · everyone/);
    assert.ok(a.$(".me-bottom"));
    assert.ok(main.querySelector('[data-go="mecal"]'));
  } finally { a.close(); }
});

test("my page: an open emergency muster shows on top with a reply button", async () => {
  const a = await memberApp(() => []);
  try {
    a.w.eval(`S.feeds[0].posts.unshift({id:6,t:Date.now()-30000,txt:"Storm — account for everyone now.",urg:true,to:{k:"all"},by:"Lt Park",ci:"https://antoniotyler22.github.io/eoop-muster/#ci=abc&u=1ST"});save();render()`);
    const order = a.w.eval(`[...document.querySelectorAll('#main > *')].map(x=>x.className.split(' ')[0])`);
    assert.ok(order.indexOf("card") >= 0 && a.$(".me-muster"), order.join(","));
    assert.ok(a.$('[data-meci="ci=abc&u=1ST"]'));
  } finally { a.close(); }
});

test("feed photos: pending photos ride inside the post, come out on the other side, and show on the card", async () => {
  let stored = "";
  const a = await openApp({ rpc: (fn, args) => { if (fn === "feed_post") { stored = args.p_ct; return 9; } return []; } });
  try {
    a.w.eval(`S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.tos=99;const ek=b64url(crypto.getRandomValues(new Uint8Array(32)));S.feeds=[{id:"f1",lk:"l".repeat(32),mk:"m".repeat(32),ek,unit:"1ST PLT",posts:[],mine:{},acks:{}}];save();view="feed";render();`);
    assert.ok(a.$("#fpIn"), "add-photos input in the compose box");
    const px = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
    a.w.eval(`feedAddPhoto("i1abc234",${JSON.stringify(px)});`);
    a.$("#fdTxt").value = "Range photo";
    a.$("#fdPost").click();
    for (let i = 0; i < 40 && !stored; i++) await sleep(50);
    assert.ok(stored, "posted");
    const o = await a.w.eval(`fdDec(S.feeds[0].ek,${JSON.stringify(stored)})`);
    assert.deepEqual(JSON.parse(JSON.stringify(o.img)), ["i1abc234"]);
    assert.equal(o.pics, undefined, "photos were taken out of the payload into this phone's store");
    assert.equal(await a.w.eval(`feedPic("i1abc234")`), px);
    await sleep(50);
    assert.deepEqual(JSON.parse(JSON.stringify(a.w.eval("S.feeds[0].posts[0].img"))), ["i1abc234"]);
    assert.ok(a.$('[data-fpid="i1abc234"]'), "the card shows the photo");
  } finally { a.close(); }
});

test("feed: a photo-only post goes through; the leader has Delete on each post and Clear the whole feed", async () => {
  const dels = [];
  const a = await openApp({ rpc: (fn, args) => { if (fn === "feed_post") return 11; if (fn === "feed_delete_post") { dels.push(args.p_post); return true; } return []; } });
  try {
    a.w.eval(`S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.tos=99;const ek=b64url(crypto.getRandomValues(new Uint8Array(32)));S.feeds=[{id:"f1",lk:"l".repeat(32),mk:"m".repeat(32),ek,unit:"1ST PLT",posts:[{id:3,t:Date.now()-5000,txt:"Old word",urg:false,to:{k:"all"},by:"Me"}],mine:{},acks:{}}];save();view="feed";render();`);
    assert.ok(a.$("#fpPick") && a.$("#fpCam"), "photo buttons");
    a.w.eval(`feedAddPhoto("i2abc234","data:image/jpeg;base64,/9j/4AAQSkZJRg==");`);
    a.$("#fdTxt").value = "";
    a.$("#fdPost").click();
    for (let i = 0; i < 40 && a.w.eval("S.feeds[0].posts.length") < 2; i++) await sleep(50);
    assert.equal(a.w.eval("S.feeds[0].posts[0].id"), 11, "posted with no text");
    assert.ok(a.$('[data-fddel="3"]'), "Delete chip on a post");
    a.$('[data-fddel="3"]').click(); a.$('[data-fddel="3"]').click();
    for (let i = 0; i < 40 && !dels.length; i++) await sleep(50);
    assert.deepEqual(dels, [3]);
    assert.ok(a.$("#fpClear"), "Clear the whole feed");
    a.$("#fpClear").click(); a.$("#fpClear").click();
    for (let i = 0; i < 40 && a.w.eval("S.feeds[0].posts.length"); i++) await sleep(50);
    assert.equal(a.w.eval("S.feeds[0].posts.length"), 0);
    assert.ok(dels.includes(11));
  } finally { a.close(); }
});

test("feed: two tabs — Feed shows posts and hides the compose box; Post shows the compose box; posting flips to Feed", async () => {
  const a = await openApp({ rpc: (fn) => fn === "feed_post" ? 12 : [] });
  try {
    a.w.eval(`S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.tos=99;const ek=b64url(crypto.getRandomValues(new Uint8Array(32)));S.feeds=[{id:"f1",lk:"l".repeat(32),mk:"m".repeat(32),ek,unit:"1ST PLT",posts:[{id:3,t:Date.now()-5000,txt:"Old word",urg:false,to:{k:"all"},by:"Me"}],mine:{},acks:{}}];save();view="feed";render();`);
    assert.ok(a.$("#fdTabs"));
    assert.equal(a.w.eval("document.querySelector('#fdTabs [data-fdtab=feed]').getAttribute('aria-pressed')"), "true");
    assert.equal(a.w.eval("document.querySelector('article.fc').hidden"), false);
    assert.equal(a.w.eval("document.getElementById('fdTxt').closest('.panel').hidden"), true, "compose hidden on Feed tab");
    a.$('[data-fdtab="post"]').click();
    assert.equal(a.w.eval("document.getElementById('fdTxt').closest('.panel').hidden"), false);
    assert.equal(a.w.eval("document.querySelector('article.fc').hidden"), true);
    a.$("#fdTxt").value = "New word";
    a.$("#fdPost").click();
    for (let i = 0; i < 40 && a.w.eval("S.feeds[0].posts.length") < 2; i++) await sleep(50);
    await sleep(50);
    assert.equal(a.w.eval("document.querySelector('#fdTabs [data-fdtab=feed]').getAttribute('aria-pressed')"), "true", "back on Feed after posting");
    assert.equal(a.w.eval("[...document.querySelectorAll('article.fc')].filter(x=>!x.hidden).length"), 2);
  } finally { a.close(); }
});
