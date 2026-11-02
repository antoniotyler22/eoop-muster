import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const owner = `S.onb=true;S.welcomed=1;S.leaderMode=true;S.source="real";
  S.dmInbox="i".repeat(32);const m=S.roster[0];m.pk="p".repeat(24);m.dm={id:"thread12345abcdefgh",k:"k".repeat(32),ek:"x",ok:1};`;

test("OIC can step down to Co-leader view: owner tools close, keys stay, code steps back up", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(owner + `S.sync={on:true,code:"ABCD-EFGH-JKMN",ver:1};`);
    assert.equal(a.w.eval(`isOwner()`), true);
    assert.equal(a.w.eval(`document.title,1`), 1);
    a.w.eval(`view="data";render()`);
    assert.ok(a.w.eval(`!!document.querySelector("[data-aldown='co']")`), "step-down choices shown");
    a.w.eval(`document.querySelector("[data-aldown='co']").click()`);
    assert.equal(a.w.eval(`isOwner()`), false);
    assert.equal(a.w.eval(`tabsList().some(x=>x[0]==="inbox")`), false);
    assert.ok(a.w.eval(`!!S.dmInboxKeep&&!!S.roster[0].dm`), "keys kept while lowered");
    assert.equal(a.w.eval(`S.dmInbox`), undefined, "inbox polling paused while lowered");
    assert.equal(a.w.eval(`syncObj().dmInbox`), undefined);
    a.w.eval(`view="data";render()`);
    a.w.eval(`document.querySelector("#alCode").value="WRONG";document.querySelector("#alUp").click()`);
    assert.equal(a.w.eval(`isOwner()`), false, "wrong code does not step up");
    a.w.eval(`view="data";render()`);
    a.w.eval(`document.querySelector("#alCode").value="abcd-efgh-jkmn";document.querySelector("#alUp").click()`);
    assert.equal(a.w.eval(`isOwner()`), true);
    assert.ok(a.w.eval(`tabsList().some(x=>x[0]==="inbox")`), "Inbox is back");
    assert.equal(a.w.eval(`S.dmInbox`), "i".repeat(32), "same inbox key restored");
  } finally { await a.close(); }
});

test("Stepping down to Editor or View only changes the real role", async () => {
  for (const k of ["sncoic", "view"]) {
    const a = await openApp({ rpc: () => [] });
    try {
      await a.w.eval(owner);
      a.w.eval(`view="data";render();document.querySelector("[data-aldown='${k}']").click()`);
      assert.equal(a.w.eval(`S.role`), k);
      assert.equal(a.w.eval(`isOwner()`), false);
      assert.equal(a.w.eval(`canEdit()`), k !== "view");
    } finally { await a.close(); }
  }
});

test("Reset message keys: old threads deleted, new keys made, only for the OIC", async () => {
  const calls = [];
  const a = await openApp({ rpc: (n, args) => { calls.push([n, args]); return []; } });
  try {
    await a.w.eval(owner);
    const oldInbox = a.w.eval(`S.dmInbox`);
    await a.w.eval(`window.resetMsgKeys()`); await sleep(200);
    assert.ok(calls.some((c) => c[0] === "dm_delete_thread" && c[1].p_id === "thread12345abcdefgh"), "old thread deleted");
    assert.notEqual(a.w.eval(`S.dmInbox||""`), oldInbox, "inbox key replaced");
    assert.notEqual(a.w.eval(`(S.roster[0].dm||{}).k||""`), "k".repeat(32), "member key replaced");
    a.w.eval(`S.role="sncoic"`);
    assert.equal(await a.w.eval(`window.resetMsgKeys()`), false, "non-OIC phones can't reset");
  } finally { await a.close(); }
});

test("A picked name is locked to the account on a linked phone", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.onb=true;S.welcomed=1;S.leaderMode=true;S.role="sncoic";S.who={id:"x1",n:"SGT SMITH",t:1};`);
    assert.equal(a.w.eval(`accountLocked()`), true);
    a.w.eval(`S.role="oic";delete S.who`);
    assert.equal(a.w.eval(`accountLocked()`), false);
  } finally { await a.close(); }
});

test("Role and message keys has its own page, reachable from Tools", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(owner);
    a.w.eval(`view="alvl";render()`);
    assert.ok(a.w.eval(`!!document.querySelector("#main #alKeys")`), "reset button is on the page");
    assert.ok(a.w.eval(`!!document.querySelector("#main [data-aldown='co']")`), "step-down choices are on the page");
    assert.equal(a.w.eval(`tabOf("alvl")`), "tools");
    a.w.eval(`view="tools";render()`);
    a.w.eval(`document.querySelector("[data-sgrp='settings'],[data-sg1='settings']").click()`);
    assert.ok(a.w.eval(`!!document.querySelector("#sheet [data-go='alvl']")`), "tile is in Tools → Settings");
  } finally { await a.close(); }
});
