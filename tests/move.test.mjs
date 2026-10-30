// Moving someone to another section: button on the person card, Move row in the status sheet, big section buttons.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";
const click=(a,sel)=>{const el=a.$(sel);assert.ok(el,"found "+sel);el.click()};

test("move from the person card and from the status sheet", async()=>{
  const a=await openApp({rpc:()=>[]});
  try{
    await a.w.eval(`S.leaderMode=true;S.source="file";S.mode="military";S.onb=true;S.welcomed=1;save();openCard(S.roster[0].id)`);await sleep(40);
    const id=a.w.eval("pid");const from=a.w.eval("S.roster.find(x=>x.id===pid).sec");
    assert.ok(a.$("[data-mvopen]"),"person card has the Move button");
    assert.equal(a.$("#v12Sec"),null,"plain dropdown replaced");
    click(a,"[data-mvopen]");await sleep(60);
    assert.match(a.$("#sheetT").textContent,/Move to another section/);
    const to=a.w.eval(`[...document.querySelectorAll("[data-mvto]")].map(b=>b.dataset.mvto).find(k=>k!==${JSON.stringify(from)}&&k!=="ATT")`);
    click(a,`[data-mvto="${to}"]`);await sleep(80);
    assert.equal(a.w.eval(`S.roster.find(x=>x.id===${JSON.stringify(id)}).sec`),to,"moved");
    assert.match(JSON.stringify(a.w.eval("S.act")),/moved/);
    // status sheet on a section page carries a Move row
    await a.w.eval(`view=${JSON.stringify(to.toLowerCase())};render()`);await sleep(40);
    await a.w.eval(`openSheet("s",${JSON.stringify(id)})`);await sleep(40);
    assert.ok(a.$("#sheetOpts [data-mvopen]"),"status sheet has Move");
    click(a,"#sheetOpts [data-mvopen]");await sleep(400);
    assert.match(a.$("#sheetT").textContent,/Move to another section/);
    click(a,`[data-mvto="${from}"]`);await sleep(80);
    assert.equal(a.w.eval(`S.roster.find(x=>x.id===${JSON.stringify(id)}).sec`),from,"moved back");
    // view-only phones don't get it
    await a.w.eval(`S.role="view";openCard(${JSON.stringify(id)})`);await sleep(40);
    assert.equal(a.$("[data-mvopen]"),null,"view-only: no Move");
    assert.deepEqual(a.errors,[]);
  }finally{await a.close()}
});
