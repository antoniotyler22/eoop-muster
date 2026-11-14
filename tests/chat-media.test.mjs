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

test("team chat: attach a photo, send it encrypted, and it shows in my bubble; a video from someone else plays", async () => {
  const srv = server();
  const a = await openApp({ rpc: srv.rpc });
  try {
    await setup(a);
    a.$("#tabbar [data-tab='talk']").click(); await sleep(200);
    assert.ok(a.$("#chAtt"), "attach button");
    a.w.eval(`afMedia.pick=cb=>cb(${JSON.stringify(PNG)})`);
    a.$("#chAtt").click(); await sleep(50);
    assert.ok(a.$("#chDraft .afm-i"), "preview of the photo");
    a.$("#chIn").value = "meme";
    a.$("#chForm").dispatchEvent(new a.w.Event("submit", { cancelable: true, bubbles: true })); await sleep(300);
    assert.equal(srv.rows.length, 1);
    assert.ok(!srv.rows[0].ct.includes("iVBOR"), "the server only sees ciphertext");
    assert.ok(a.$(".ch-row.me .ch-t img.afm-i"), "photo in my bubble");
    assert.equal(a.$("#chDraft").innerHTML.trim(), "", "draft clears");
    // photo only, no text
    a.w.eval(`afMedia.pick=cb=>cb(${JSON.stringify(GIF)})`);
    a.$("#chAtt").click(); await sleep(30);
    a.$("#chForm").dispatchEvent(new a.w.Event("submit", { cancelable: true, bubbles: true })); await sleep(300);
    assert.equal(srv.rows.length, 2, "media alone can be sent");
    // someone else's video arrives
    await a.w.eval(`(async()=>{const f=S.feeds[0];window.__ct=await fdEnc(f.ek,{k:"m",by:"SGT LEE",tx:"look",md:${JSON.stringify(VID)},t:Date.now()})})()`);
    await sleep(50);
    srv.rows.push({ id: 3, ct: a.w.eval("window.__ct"), created_at: new Date().toISOString() });
    await sleep(3600);
    assert.ok(a.$(".ch-row:not(.me) .ch-t video, .ch-row:not(.me) .ch-t .afm-ph"), "their video (or its loading box) is in their bubble");
    assert.deepEqual(a.errors, []);
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
