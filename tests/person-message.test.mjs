// 4.107.1: the Message button on a person's page always does something.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("Message on a person turns on their My page and opens the chat", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.onb=true;S.welcomed=1;S.leaderMode=true;S.role="oic";S.roster=[{id:"p1",rank:"GYSGT",name:"MARROQUIN, JOSEPH P.",sec:"HE",status:"On Hand"}];pid="p1";view="p";render()`);
    await sleep(150);
    a.w.eval(`mpTurnOn=async m=>{m.pk="k".repeat(28)}`);
    const b = a.$("#v12PMsg"); assert.ok(b, "button is there");
    b.click(); await sleep(250);
    assert.equal(a.w.eval(`view`), "dm");
    assert.ok(a.w.eval(`S.roster.find(x=>x.id==="p1").pk`));
  } finally { await a.close(); }
});

test("On a phone without an Inbox the Message button says why instead of doing nothing", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.onb=true;S.welcomed=1;S.leaderMode=true;S.role="co";S.link={x:1};S.roster=[{id:"p1",rank:"GYSGT",name:"MARROQUIN, JOSEPH P.",sec:"HE",status:"On Hand"}];pid="p1";view="p";render()`);
    await sleep(150);
    a.$("#v12PMsg").click(); await sleep(150);
    const t = a.w.eval(`(document.getElementById("toast")||{}).textContent||""`);
    assert.match(t, /Inbox|OIC/);
    assert.equal(a.w.eval(`view`), "p", "stays on the person");
  } finally { await a.close(); }
});
