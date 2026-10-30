// 4.43.0: the news and weather card on a member's My page.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

async function memberApp() {
  const a = await openApp({ rpc: () => [] });
  await a.w.eval(`(async()=>{const m=S.roster[0];const D=mpDigest(m);D.cks=[];D.feed=null;
    S.feeds=[];S.me={pk:"p".repeat(24),unit:"1ST PLT",d:D,t:Date.now()};S.onb=true;S.welcomed=1;S.news={at:Date.now(),cards:[
      {k:"wx",t:"72° and sunny",s:"Kaneohe"},{k:"news",t:"A world headline",s:"Source · 2h"}]};view="me";render()})()`);
  await sleep(120);
  return a;
}

test("My page shows the news and weather card under Today for me, with an Add local weather prompt", async () => {
  const a = await memberApp();
  try {
    const card = a.$("#nwCard");
    assert.ok(card, "card is on My page");
    assert.match(card.textContent, /72° and sunny/);
    assert.match(card.textContent, /Add local weather/);
    const order = a.w.eval(`[...document.querySelectorAll('#main > *')].map(x=>x.id||x.className.split(' ')[0])`);
    assert.ok(order.indexOf("nwCard") > order.indexOf("ckCard"), order.join(","));
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("hiding the card on a member phone removes it; with location on the weather prompt goes away", async () => {
  const a = await memberApp();
  try {
    a.w.eval(`S.news.loc={lat:21.4,lon:-157.8};render()`); await sleep(60);
    assert.ok(a.$("#nwCard")); assert.doesNotMatch(a.$("#nwCard").textContent, /Add local weather/);
    a.w.eval(`S.news.off=true;render()`); await sleep(60);
    assert.ok(!a.$("#nwCard"));
  } finally { await a.close(); }
});
