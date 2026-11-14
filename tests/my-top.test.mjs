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
    assert.ok(a.$("#main .mp-head"), "the new My Page");
    assert.ok(a.$("[data-go='sos']"), "SOS button on My Page");
    for (const id of ["#ppPanel", "#qhPanel", "#gfLead"]) assert.ok(a.$(id), id + " on My Page");
    assert.ok(!a.$("#sosHome"), "no duplicate SOS card");
  } finally { await a.close(); }
});

test("My page: a leader with a roster entry gets the member-style page plus SOS, photo and quiet hours", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.onb=true;S.welcomed=1;S.leaderMode=true;const m=S.roster[0];S.myName="CWO4 "+String(m.name).split(/[ ,]+/)[0];
      S.feeds=[{id:"abcdefghij1234",mk:"m".repeat(30),ek:"e".repeat(40),unit:"UT",secs:[]}];render();
      document.querySelector(".hic").insertAdjacentHTML("afterbegin",'<button id="v13Hdr">P</button>')`);
    a.$("#v13Hdr").click();
    await sleep(100);
    assert.equal(a.w.eval("view"), "mypg");
    assert.ok(!a.$("#meOff"), "no remove-link button");
    for (const id of ["#ppPanel", "#qhPanel", "#gfLead"]) assert.ok(a.$(id), id);
    assert.ok(a.$("[data-go='sos']"), "SOS button");
  } finally { await a.close(); }
});
