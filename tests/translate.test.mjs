// 4.95: translate Word of Mouth posts on the phone
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const FEED = { id: "feedabcdef12", mk: "m".repeat(30), lk: "l".repeat(30) };
const setup = (a, txt) => a.w.eval(`S.lang="";S.trLang="es";S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",ek:"x",unit:"1ST PLT",me:"CPL TEST",sec:"1ST",mine:{},seen:0,posts:[{id:5,t:Date.now(),txt:${JSON.stringify(txt)},to:{k:"all"}}]}];S.onb=true;S.welcomed=1;fdSel="${FEED.id}";view="feed";render()`);

test("a post gets a Translate button; with the on-device API the text is translated and nothing leaves the phone", async () => {
  const a = await openApp();
  try {
    a.w.eval(`window.__net=0;window.LanguageDetector={create:async()=>({detect:async()=>[{detectedLanguage:"en",confidence:.99}]})};
      window.Translator={availability:async()=>"available",create:async o=>({translate:async t=>"ES("+o.targetLanguage+"): "+t})}`);
    setup(a, "Muster at 0600");
    const b = a.$("[data-trp]");
    assert.ok(b, "Translate button on the post");
    b.click(); await sleep(80);
    assert.match(a.$(".trout").textContent, /ES\(es\): Muster at 0600/);
    assert.match(a.$(".trout").textContent, /Translated from English on this phone/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("no on-device translator: offers a Google link and says it sends the text", async () => {
  const a = await openApp();
  try {
    a.w.eval(`delete window.Translator;delete window.LanguageDetector`);
    setup(a, "Bring your gear");
    a.$("[data-trp]").click(); await sleep(60);
    const link = a.$(".trout a");
    assert.match(link.getAttribute("href"), /translate\.google\.com.*tl=es.*Bring%20your%20gear/);
    assert.match(a.$(".trout").textContent, /sends this post's text to Google/);
  } finally { await a.close(); }
});

test("a post already in the reader's language says so", async () => {
  const a = await openApp();
  try {
    a.w.eval(`window.LanguageDetector={create:async()=>({detect:async()=>[{detectedLanguage:"es",confidence:.9}]})};window.Translator={availability:async()=>"available",create:async()=>({translate:async t=>t})}`);
    setup(a, "Reunión a las 0600");
    a.$("[data-trp]").click(); await sleep(60);
    assert.match(a.$(".trout").textContent, /already in Español/);
  } finally { await a.close(); }
});
