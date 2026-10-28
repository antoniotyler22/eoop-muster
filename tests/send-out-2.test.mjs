// Send out, smoother: the send list survives a reload, missing numbers come from Contacts,
// who signed in shows up with a resend, group text for same-text lists, people added before come back.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep, waitFor } from "./harness.mjs";

const prep = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.sync={on:true,code:"ABCD-EFGH-JKMN-PQRS"};save();view="invite";render();`;
const click = (a, s) => { const el = a.$(s); assert.ok(el, "missing " + s); el.click(); };
const navErr = (errs) => errs.filter((e) => !/navigation|clipboard/i.test(e));

test("send list is kept after a reload, Home offers Continue, and signed-in people are shown with a resend for the rest", async () => {
  let used = null;
  const rpc = (fn, b) => fn === "login_states" ? b.p_uids.map((u, i) => ({ uid: u, used_at: i === 0 ? used : null, self_set: false })) : null;
  const a = await openApp({ rpc });
  let store;
  try {
    a.w.eval(prep); await sleep(20);
    const sec = a.w.eval(`S.roster[0].sec`);
    click(a, `[data-sosec="${sec}"]`); click(a, "#soMake");
    await waitFor(() => a.$("#soNext"), 60000);
    click(a, "#soNext"); click(a, "#soNext"); await sleep(10);
    assert.equal(a.w.eval(`S.soSend.sent.length`), 2);
    store = a.w.eval(`JSON.stringify(Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])))`);
  } finally { await a.close(); }
  used = new Date().toISOString();
  const b = await openApp({ rpc, storage: JSON.parse(store) });
  try {
    b.w.eval(`view="board";render()`); await sleep(10);
    assert.match(b.$("#soBan").textContent, /Send list: \d+ left/);
    b.w.eval(`view="invite";render()`); await sleep(30);
    await waitFor(() => /signed in/.test(b.$("#soBox").textContent), 5000);
    assert.equal(b.w.eval(`__so().sent.size`), 2, "place kept");
    assert.match(b.$("#soResend").textContent, /Resend to 1 who haven't signed in/);
    click(b, "#soResend"); await sleep(10);
    assert.equal(b.w.eval(`__so().sent.size`), 1);
    click(b, "#soDone"); await sleep(10);
    assert.equal(b.w.eval(`S.soSend`), undefined);
    assert.deepEqual(navErr(b.errors), []);
  } finally { await b.close(); }
}, { timeout: 120000 });

test("missing numbers filled from Contacts by name; group text for the same message; people added before come back", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(prep); await sleep(20);
    a.w.eval(`S.roster.forEach(m=>{m.phone="";m.email=""});const m=S.roster[0];m.name="SMITH, JOHN A";const n=S.roster[1];n.name="DOE, JANE";n.sec=m.sec;save();render()`);
    const sec = a.w.eval(`S.roster[0].sec`);
    click(a, `[data-sosec="${sec}"]`); await sleep(10);
    assert.match(a.$("#soFill").textContent, /Find \d+ missing numbers in Contacts/);
    a.w.eval(`window.ctFetch=async()=>[{n:"Smith, John",ph:"8085550101",em:""},{n:"Jane Doe",ph:"",em:"jane@example.com"},{n:"Nobody, Else",ph:"8085550199"}]`);
    click(a, "#soFill"); await sleep(30);
    assert.equal(a.w.eval(`S.roster[0].phone`), "8085550101");
    assert.equal(a.w.eval(`S.roster[1].email`), "jane@example.com");
    // own team to two phones: same text → group text, with a second tap to confirm
    a.w.eval(`S.roster[1].phone="8085550102";save()`);
    click(a, '[data-soconn="own"]'); click(a, "#soMake");
    await waitFor(() => a.$("#soNext"), 5000);
    click(a, "#soGroup"); await sleep(10);
    assert.match(a.$("#soGroup").textContent, /Tap again/);
    click(a, "#soGroup"); await sleep(10);
    assert.ok(a.w.eval(`__so().sent.size`) >= 2);
    click(a, "#soDone"); await sleep(10);
    // remembered extra
    a.w.eval(`$("#soXN").value="Pat Lee";$("#soXT").value="pat@example.com"`); click(a, "#soXAdd"); await sleep(10);
    click(a, '[data-soxdel="x:1"]'); await sleep(10);
    click(a, '[data-sorec="0"]'); await sleep(10);
    assert.match(a.$("#soBox").textContent, /Pat Lee/);
    assert.deepEqual(navErr(a.errors), []);
  } finally { await a.close(); }
});
