// 4.108.0: Ask sits at the bottom of My Page for everyone.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("My Page ends with an Ask box that asks and shows the answer in place", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.onb=true;S.welcomed=1;S.leaderMode=true;S.role="oic";S.askSt={on:true,who:"all",setup:true,t:Date.now()};S.ask=[];view="mypg";render()`);
    await sleep(200);
    assert.ok(a.$("#mpAsk"), "Ask card is on My Page");
    assert.ok(a.$("#mpAsk #akQ") && a.$("#mpAsk #akGo"));
    const kids = [...a.$("#main").children]; const i = kids.findIndex((e) => e.id === "mpAsk");
    assert.ok(i >= kids.length - 2, "near the bottom, just above the version line");
    a.w.eval(`window.fetch=async()=>({ok:true,status:200,json:async()=>({answer:"Carry over 60 days.",sources:[{title:"MCO",url:"https://www.marines.mil/x"}]})})`);
    a.w.eval(`document.getElementById("akQ").value="How many days of leave carry over?"`);
    a.$("#akGo").click(); await sleep(400);
    assert.equal(a.w.eval(`view`), "mypg", "stays on My Page");
    assert.match(a.$("#mpAsk").textContent, /Carry over 60 days/);
  } finally { await a.close(); }
});

test("It is gone when the owner turns Ask off", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    await a.w.eval(`S.onb=true;S.welcomed=1;S.leaderMode=true;S.role="oic";S.appCfg={ask_off:true};view="mypg";render()`);
    await sleep(200);
    assert.ok(!a.$("#mpAsk"), "hidden when the owner turned Ask off");
  } finally { await a.close(); }
});
