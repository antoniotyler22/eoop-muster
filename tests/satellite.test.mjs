// 4.94: satellite-ready check-in line and last-gasp battery ping
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("leader decodes the short satellite line into a check-in", async () => {
  const a = await openApp();
  try {
    a.w.eval(`S.rc.open=true;S.rc.start=Date.now();S.rc.rid="k1abc2defXY7";recallPool()[0].name="ZZQUUX, ALEX";save();view="recall";render()`);
    await sleep(30);
    a.w.eval(`applyCheckins("AF1 FXY7 2 zzquux")`);
    assert.equal(a.w.eval(`S.rc.res[recallPool()[0].id]`), "ok");
    assert.equal(a.w.eval(`S.rc.ci[recallPool()[0].id].c`), 2);
  } finally { await a.close(); }
});

test("no signal: the check-in page offers a satellite-ready text under 30 characters", async () => {
  const a = await openApp({ hash: "ci=k1abc2defXY7&u=1ST&to=8085550100", noWait: true });
  try {
    await sleep(300);
    a.w.eval(`Object.defineProperty(navigator,"onLine",{get:()=>false,configurable:true})`);
    a.$("#ciN").value = "cpl smith";
    a.$('[data-c="1"]').click(); await sleep(40);
    const href = a.$("#ciSat").getAttribute("href");
    assert.match(href, /^sms:\+18085550100\?&body=AF1%20FXY7%201%20CPL%20SMITH$/);
    assert.ok(decodeURIComponent(href.split("body=")[1]).length <= 30);
  } finally { await a.close(); }
});

test("last gasp: a low battery sends one PHONE DYING check-in", async () => {
  const a = await openApp({ hash: "ci=k1abc2defxy7&u=1ST&l=1", noWait: true });
  try {
    await sleep(300);
    a.w.eval(`window.__c=[];const b=new EventTarget();b.level=.5;b.charging=false;window.__b=b;navigator.getBattery=async()=>b;
      SB.words=n=>[n];SB.h=async(r,w)=>r+w;SB.notify=()=>{};SB.rpc=async(f,x)=>{window.__c.push(x.p_note+"|"+x.p_code);return {}};
      Object.defineProperty(navigator,"onLine",{get:()=>true,configurable:true});Object.defineProperty(window,"crypto",{value:{subtle:{}},configurable:true})`);
    a.$("#ciN").value = "CPL SMITH";
    a.$('[data-c="1"]').click(); await sleep(80);
    const box = a.$("#ciGasp");
    assert.ok(box, "toggle appears after a live check-in: "+a.$("#ciMsg").textContent);
    box.checked = true; box.dispatchEvent(new a.w.Event("change")); await sleep(40);
    a.w.eval(`__b.level=.04;__b.dispatchEvent(new Event("levelchange"));__b.dispatchEvent(new Event("levelchange"))`); await sleep(60);
    const calls = JSON.parse(a.w.eval(`JSON.stringify(window.__c)`));
    assert.deepEqual(calls.filter(x => x.startsWith("PHONE DYING")), ["PHONE DYING|1"], "sent once, keeps the last code");
  } finally { await a.close(); }
});
