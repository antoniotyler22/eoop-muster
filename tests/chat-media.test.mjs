// 4.106.0: photos, memes and short videos in chat.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const FEED = { id: "feedabcdef12", mk: "m".repeat(30) };
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const GIF = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const VID = "data:video/mp4;base64," + "A".repeat(200000); // bigger than the inline limit
const setup = async (a) => {
  await a.w.eval(`(async()=>{const k=crypto.getRandomValues(new Uint8Array(32));const ek=b64e(k).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/,"");
    S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",lk:"l".repeat(30),ek,unit:"1ST PLT",me:"CPL TEST",sec:"1ST",mine:{},seen:0,posts:[]}];S.myName="CPL TEST";S.onb=true;S.welcomed=1;fdSel="${FEED.id}";render()})()`);
  await sleep(100);
};
const server = () => { const rows = []; return { rows, rpc: (n, args) => {
  if (n === "chat_send") { rows.push({ id: rows.length + 1, ct: args.p_ct, created_at: new Date().toISOString() }); return rows.length; }
  if (n === "chat_get") return rows.filter((r) => r.id > (args.p_after || 0));
  return []; } }; };

test("media rules: photos, GIFs and mp4/webm are valid; scripts and oversized are not; big media goes to a reference", async () => {
  const a = await openApp({});
  try {
    const r = a.w.eval(`(()=>{const M=afMedia;return {png:M.valid(${JSON.stringify(PNG)}),gif:M.valid(${JSON.stringify(GIF)}),vid:M.valid(${JSON.stringify(VID)}),
      bad:M.valid("data:text/html;base64,AAAA"),js:M.valid("javascript:alert(1)"),ref:M.valid("af:abc123def"),huge:M.valid("data:video/mp4;base64,"+"A".repeat(1600000)),
      kp:M.keep(${JSON.stringify(PNG)}),kv:M.keep(${JSON.stringify(VID)}),tagV:M.tag(${JSON.stringify(VID)},"x").slice(0,6)}})()`);
    assert.ok(r.png && r.gif && r.vid && r.ref);
    assert.ok(!r.bad && !r.js && !r.huge);
    assert.equal(r.kp, PNG, "small stays inline");
    assert.match(r.kv, /^af:[a-z0-9]+$/, "big video becomes a reference");
    assert.equal(r.tagV, "<video");
  } finally { await a.close(); }
});

test("4.128.0: team chat is retired; a photo message in its history is kept as a line in the read-only archive", async () => {
  const rows = [];
  const a = await openApp({ rpc: (n, args) => (n === "chat_get" ? rows.filter((r) => r.id > (args.p_after || 0)) : []) });
  try {
    await a.w.eval(`(async()=>{const k=crypto.getRandomValues(new Uint8Array(32));const ek=b64e(k).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/,"");
      S.feeds=[{id:"feedmedia001",mk:"m".repeat(30),lk:"l".repeat(30),ek,unit:"1ST PLT",me:"CPL TEST",sec:"1ST",mine:{},seen:0,posts:[]}];S.myName="CPL TEST";S.onb=true;S.welcomed=1;fdSel="feedmedia001";render()})()`);
    rows.push({ id: 1, ct: await a.w.eval(`fdEnc(S.feeds[0].ek,{k:"m",by:"SGT RAY",tx:"",md:"data:image/png;base64,iVBORw0KGgo=",t:Date.now()})`), created_at: new Date().toISOString() });
    for (let i = 0; i < 60 && !a.w.eval(`(S.chatArc&&S.chatArc.feedmedia001&&S.chatArc.feedmedia001.done)||0`); i++) await sleep(250);
    assert.match(a.w.eval(`chatArchive(S.feeds[0]).map(x=>x.by+": "+x.tx).join("|")`), /SGT RAY: 📷 Photo or video/);
  } finally { await a.close(); }
});

test("direct messages: a video shows as a video in the bubble", async () => {
  const a = await openApp({});
  try {
    const h = a.w.eval(`__v12.bubble({id:5,t:Date.now(),txt:"",n:"Lee",img:afMedia.keep(${JSON.stringify(VID)})},false)`);
    assert.ok(/class="tl-c"/.test(h));
    const html = a.w.eval(`__v12.bubble({id:6,t:Date.now(),txt:"hi",n:"Lee",img:${JSON.stringify(PNG)}},true)`);
    assert.match(html, /<img class="afm-i v12img"/);
    assert.match(a.w.eval(`__v12.bubble({id:7,t:Date.now(),txt:"",n:"Lee",img:${JSON.stringify("data:video/mp4;base64,AAAA")}},true)`), /<video class="afm-v v12img"/);
  } finally { await a.close(); }
});

test("official channel: a post with media shows a placeholder, fetches it, and the owner can attach one", async () => {
  const a = await openApp({ rpc: (n, args) => {
    if (n === "official_get") return [{ id: 7, body: "New video", url: "", created_at: new Date().toISOString(), has_media: true }];
    if (n === "official_media") return PNG;
    return []; } });
  try {
    await setup(a);
    await a.w.eval(`S.official={posts:[],seen:0,at:0};window.officialPull(true)`); await sleep(200);
    a.w.eval(`view="official";render()`); await sleep(400);
    assert.ok(a.$(".of-t img.afm-i, .of-t .afm-ph"), "media or its placeholder");
    await sleep(300);
    assert.ok(a.$(".of-t img.afm-i"), "media loaded from the server");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
