// After Apple/Google sign-in the person can join a team with a code; photos replace initials on the new card.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("code sheet after sign-in rejects a bad code and shows the field", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.welcomed=1;window.afOfferCode("a@b.com")`); await sleep(150);
    assert.match(a.$("#sheetT").textContent, /Signed in as a@b\.com/);
    assert.ok(a.$("#ajCode2"), "code field");
    a.w.eval(`document.querySelector("#ajCode2").value="abc";document.querySelector("#ajc2Go").click()`); await sleep(100);
    assert.match(a.$("#ajc2Out").textContent, /6 letters and numbers/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("a saved photo replaces initials in search results", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.source="mol";S.roster=S.roster.slice(0,3)`);
    const nm = a.w.eval(`(S.roster[0].rank+" "+lastOf(S.roster[0])).trim()`);
    a.w.eval(`S.who={id:S.roster[0].id,n:${JSON.stringify(nm)},t:Date.now()};S.myPhoto="data:image/jpeg;base64,"+"A".repeat(80);localStorage.setItem("af-pp",S.myPhoto.length+":"+S.myPhoto.slice(30,70)+S.myPhoto.slice(-30))`);
    assert.match(a.w.eval(`window.afPhoto(${JSON.stringify(nm)})`), /^data:image\/jpeg/);
  } finally { await a.close(); }
});

test("B: code switch above Google/Apple is checked before sign-in and kept for after", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`showWelcome()`); await sleep(150);
    assert.equal(a.w.eval(`document.querySelector("#pvCodeBox").hidden`), true);
    a.w.eval(`const c=document.querySelector("#pvCodeOn");c.checked=true;c.dispatchEvent(new Event("change",{bubbles:true}))`);
    assert.equal(a.w.eval(`document.querySelector("#pvCodeBox").hidden`), false);
    a.w.eval(`document.querySelector("#pvCode").value="zz"`);
    a.w.eval(`window.afOauth("google")`);
    assert.equal(a.w.eval(`localStorage.getItem("af-join-code")`), null, "bad code is not kept and sign-in does not start");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
