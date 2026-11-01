import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("My page: member page has SOS, Profile photo and Quiet hours", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`(async()=>{const m=S.roster[0];const D=mpDigest(m);D.feed={id:"abcdefghij1234",mk:"m".repeat(30),ek:"e".repeat(40),unit:"UT",secs:[]};D.cofeed=null;D.cks=[];
      S.feeds=[];S.me={pk:"${"p".repeat(28)}",unit:"UT",d:D,t:Date.now()};S.onb=true;S.welcomed=1;view="me";render()})()`);
    await sleep(80);
    for (const id of ["#sosHome", "#ppPanel", "#qhPanel"]) assert.ok(a.$(id), id + " on the member page");
  } finally { await a.close(); }
});

test("My page: the person button opens a leader's My page with SOS, photo, quiet hours and muster place", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.onb=true;S.welcomed=1;S.leaderMode=true;S.feeds=[{id:"abcdefghij1234",mk:"m".repeat(30),ek:"e".repeat(40),unit:"UT",secs:[]}];render();
      document.querySelector(".hic").insertAdjacentHTML("afterbegin",'<button id="v13Hdr">P</button>')`);
    a.$("#v13Hdr").click();
    await sleep(80);
    assert.equal(a.w.eval("view"), "mypg");
    for (const id of ["#sosHome", "#ppPanel", "#qhPanel", "#gfLead"]) assert.ok(a.$(id), id + " on My page");
  } finally { await a.close(); }
});
