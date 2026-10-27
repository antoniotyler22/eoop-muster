// Delete person, doubles, and member links that actually open.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const lead = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;`;

test("person card has Delete person (tap twice) and it removes them", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const id = a.w.eval(`${lead}save();const m=S.roster[0];openCard(m.id);m.id`);
    const n0 = a.w.eval("S.roster.length");
    const b = () => a.$(`#pdBox [data-pddel="${id}"]`);
    assert.ok(b(), "Delete person button on the card");
    b().click(); await sleep(10);
    assert.match(b().textContent, /Tap again/);
    assert.equal(a.w.eval("S.roster.length"), n0, "first tap only arms");
    b().click(); await sleep(10);
    assert.equal(a.w.eval("S.roster.length"), n0 - 1);
    assert.equal(a.w.eval(`S.roster.some(m=>m.id===${JSON.stringify(id)})`), false);
    assert.notEqual(a.w.eval("view"), "p");
  } finally { a.close(); }
});

test("doubles are flagged; deleting the extra moves the My page link to the copy kept", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`${lead}const m=S.roster[0];S.roster.push(Object.assign({},m,{id:"dup1",rank:"PFC",sec:S.roster[0].sec,pk:"k".repeat(28),phone:"8085550100"}));delete m.phone;save();view="people";render()`);
    assert.ok(a.$("#pdDups"), "People lists the double");
    a.w.eval(`openCard("dup1")`);
    assert.ok(a.$("#pdDup"), "card warns it's listed twice");
    a.$('#pdBox [data-pddel="dup1"]').click(); await sleep(5);
    a.$('#pdBox [data-pddel="dup1"]').click(); await sleep(5);
    const kept = a.w.eval(`(()=>{const m=S.roster[0];return {pk:m.pk,ph:m.phone,n:S.roster.filter(x=>x.name===m.name).length}})()`);
    assert.equal(kept.n, 1);
    assert.equal(kept.pk, "k".repeat(28), "link moved to the kept copy");
    assert.equal(kept.ph, "8085550100");
  } finally { a.close(); }
});

test("adding the same name again (other section) is not added twice", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const r = a.w.eval(`${lead}const m=S.roster[0];const other=SECTIONS.find(x=>x[0]!==m.sec)[0];const n=S.roster.length;const r=addMarine({name:m.name,sec:other});[!!r,S.roster.length-n]`);
    assert.deepEqual([...r], [false, 0]);
  } finally { a.close(); }
});

test("Turn on My page: the link is only given once the page is on the server", async () => {
  const puts = [];
  const a = await openApp({ rpc: (fn, b) => { if (fn === "put_page") puts.push(b); return []; } });
  try {
    const url = await a.w.eval(`(async()=>{${lead}save();mpBusy=true;const u=await mpTurnOn(S.roster[1]);mpBusy=false;return u})()`);
    assert.match(url, /#me=/);
    assert.equal(puts.length, 1, "published even while a background publish was running");
  } finally { a.close(); }
});

test("a phone that only tapped Start a team still opens a member link", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.welcomed=1;S.leaderMode=true;S.source="mol";S.roster=[];save();location.hash="me="+"a".repeat(28)+"&u=1ST";`);
    await sleep(80);
    assert.equal(a.w.eval("view"), "me");
    assert.equal(a.w.eval("S.me&&S.me.pk.length"), 28);
  } finally { a.close(); }
});

test("Text their link builds a good number from 11-digit phones", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    assert.equal(a.w.eval(`smsNum("18085550100")`), "+18085550100");
    assert.equal(a.w.eval(`smsNum("8085550100")`), "+18085550100");
  } finally { a.close(); }
});
