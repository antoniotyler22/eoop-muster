import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep, waitFor } from "./harness.mjs";

const geo = (lat, lng, acc = 10) => `Object.defineProperty(navigator,"geolocation",{configurable:true,value:{getCurrentPosition:(ok)=>ok({coords:{latitude:${lat},longitude:${lng},accuracy:${acc}}})}})`;

test("leader saves a muster place and it rides on the My page digest", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`${geo(21.45, -157.76)};S.onb=true;S.welcomed=1;S.leaderMode=true;S.role="oic";S.roster[0].pk="p".repeat(24);view="data";render()`);
    await sleep(80);
    a.$("#gfName").value = "Motor pool"; a.$("#gfSet").click();
    await waitFor(() => a.w.eval("!!S.gz"));
    assert.equal(a.w.eval("S.gz.name"), "Motor pool");
    assert.equal(a.w.eval("S.gz.r"), 250);
    const d = JSON.parse(a.w.eval(`JSON.stringify(window.__v12.mpDigest(S.roster[0]).gz)`));
    assert.equal(d.name, "Motor pool"); assert.equal(d.lat, 21.45);
  } finally { await a.close(); }
});

test("member with place check-in on is checked in once, only when inside the radius", async () => {
  const sent = [];
  const a = await openApp({ rpc: (n, args) => { if (n === "feed_req") { sent.push(args); return 3; } return []; } });
  try {
    const setup = (lat, lng) => `${geo(lat, lng)};(async()=>{const m=S.roster[0];const D=mpDigest(m);D.feed={id:"abcdefghij1234",mk:"m".repeat(30),ek:"e".repeat(43),unit:"UT",secs:[]};D.cofeed=null;D.cks=[];D.gz={name:"Motor pool",lat:21.45,lng:-157.76,r:250};
      S.feeds=[];S.me={pk:"${"p".repeat(28)}",unit:"UT",d:D,t:Date.now()};S.onb=true;S.welcomed=1;S.gfOn=true;delete S.gfDay;view="me";render()})()`;
    await a.w.eval(setup(21.50, -157.76)); // about 5.5 km away
    await sleep(80);
    a.$("[data-mpgo='set']").click(); await sleep(100);
    assert.ok(a.$("#gfMe"), "card on the member page, under Settings");
    await a.w.eval("gfCheck(false)"); await sleep(150);
    assert.equal(sent.length, 0, "outside: nothing sent");
    await a.w.eval(geo(21.4505, -157.7601)); // ~ 15 m
    await a.w.eval("gfCheck(false)");
    await waitFor(() => sent.length === 1);
    assert.equal(sent[0].p_feed, "abcdefghij1234");
    await a.w.eval("gfCheck(false)"); await sleep(150);
    assert.equal(sent.length, 1, "only once a day");
  } finally { await a.close(); }
});
