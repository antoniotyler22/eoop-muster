// Home: the status chips under the rings are real, visible buttons and tapping one lists only those people.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const seed = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.roster=S.roster.slice(0,12);
  const st=["On Hand","On Hand","On Hand","SIQ","SIQ","Leave","Leave","Leave","TAD","Operation","Other","Appointment"];
  S.roster.forEach((m,i)=>{m.sec="HQ";m.status=st[i]});save();view="board";render()`;

test("tapping a status chip opens a list of only those names", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(seed); await sleep(200);
    const chips = a.w.eval(`[...document.querySelectorAll("#main .hdl span[data-hdk]")].map(s=>s.getAttribute("role")+":"+s.dataset.hdk)`);
    assert.ok(chips.length >= 5 && chips.every(c => c.startsWith("button:")), "every legend chip is a button");
    assert.match(a.$("#main .hdh").textContent, /Tap one/, "hint under the chips");
    a.w.eval(`document.querySelector('.hdl span[data-hdk="Leave"]').click()`); await sleep(100);
    assert.match(a.$("#sheetT").textContent, /^Leave · 3/);
    assert.equal(a.w.eval(`document.querySelectorAll("#sheetOpts .sfl .rrow").length`), 3, "only the 3 on Leave");
    a.w.eval(`document.querySelector("[data-sclose]").click()`); await sleep(50);
    a.w.eval(`document.querySelector('.hdl span[data-hdk="SIQ"]').click()`); await sleep(100);
    assert.equal(a.w.eval(`document.querySelectorAll("#sheetOpts .sfl .rrow").length`), 2, "only the 2 SIQ");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("a legend that is redrawn without a full render is made tappable again", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(seed); await sleep(200);
    a.w.eval(`const l=document.querySelector("#main .hdl");l.innerHTML=l.innerHTML.replace(/ data-hdk="[^"]*"/g,"").replace(/ role="button"/g,"")`);
    assert.equal(a.w.eval(`document.querySelectorAll("#main .hdl span[data-hdk]").length`), 0, "untagged");
    await sleep(120);
    assert.ok(a.w.eval(`document.querySelectorAll("#main .hdl span[data-hdk]").length`) >= 5, "re-tagged by the observer");
    assert.equal(a.w.eval(`document.querySelectorAll("#main .hdh").length`), 1, "one hint only");
  } finally { await a.close(); }
});
