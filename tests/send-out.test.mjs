// Send out (top of Invite): pick people, connection, role, login or link; then a send list with Send next.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep, waitFor } from "./harness.mjs";

const prep = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.sync={on:true,code:"ABCD-EFGH-JKMN-PQRS"};save();view="invite";render();`;
const click = (a, s) => { const el = a.$(s); assert.ok(el, "missing " + s); el.click(); };
const navErr = (errs) => errs.filter((e) => !/navigation|clipboard/i.test(e));

test("a section as Member logins: one login each, sent again (not duplicated) the second time; Send next marks ✓ Sent", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(prep); await sleep(20);
    assert.ok(a.$("#main #soBox"), "Send out is on Invite");
    assert.ok(a.$("#main details#invOld"), "older tools folded below");
    const sec = a.w.eval(`S.roster[0].sec`), n = a.w.eval(`S.roster.filter(m=>m.sec===S.roster[0].sec).length`);
    click(a, `[data-sosec="${sec}"]`);
    assert.equal(a.$("#soN").textContent, String(n));
    assert.match(a.$("#soMake").textContent, new RegExp("Make " + n + " login"));
    click(a, "#soMake");
    await waitFor(() => a.$("#soNext"), 60000);
    assert.equal(a.w.eval(`S.logins.length`), n);
    assert.match(a.w.eval(`__so().list[0].text`), /Username: .+\nPassword: /);
    click(a, "#soNext"); await sleep(10);
    assert.equal(a.w.eval(`__so().sent.size`), 1);
    assert.match(a.$("#soBox").textContent, /✓/);
    click(a, "#soDone"); await sleep(10);
    a.w.eval(`S.logins[0].self=1`);
    click(a, "#soMake");
    await waitFor(() => a.$("#soNext"), 60000);
    assert.equal(a.w.eval(`S.logins.length`), n, "no duplicate logins");
    assert.match(a.$("#soBox").textContent, /already had one/);
    assert.equal(a.w.eval(`__so().list.filter(x=>/use the one you set yourself/.test(x.text)).length`), 1);
    assert.deepEqual(navErr(a.errors), []);
  } finally { await a.close(); }
}, { timeout: 120000 });

test("someone off the roster can be sent a Member link (added to the roster) or given another role; links work for them", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(prep); await sleep(20);
    a.w.eval(`$("#soXN").value="Pat Lee";$("#soXT").value="(808) 555-0199"`);
    click(a, "#soXAdd"); await sleep(10);
    assert.doesNotMatch(a.$("#soBox").textContent, /Not on your roster/, "Member now adds them to the roster");
    assert.ok(!a.$("#soMake").disabled, "ready to make");
    a.w.eval(`{const s=document.querySelector('[data-sorole="x:1"]');s.value="view";s.dispatchEvent(new Event("change",{bubbles:true}))}`); await sleep(10);
    assert.doesNotMatch(a.$("#soBox").textContent, /Not on your roster/);
    click(a, '[data-soas="link"]');
    click(a, "#soMake");
    await waitFor(() => a.$("#soNext"), 20000);
    const it = a.w.eval(`__so().list[0]`);
    assert.equal(it.role, "Viewer"); assert.match(it.text, /Open this link on your phone: https:/);
    assert.match(a.$("#soNext").textContent, /Pat Lee \(text\)/);
    assert.deepEqual(navErr(a.errors), []);
  } finally { await a.close(); }
});

test("Building their own team: everyone gets the same start text, Email all at once (BCC) shows", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(prep); await sleep(20);
    for (const [nm, to] of [["A One", "a@example.com"], ["B Two", "b@example.com"]]) { a.w.eval(`$("#soXN").value="${nm}";$("#soXT").value="${to}"`); click(a, "#soXAdd"); await sleep(5); }
    click(a, '[data-soconn="own"]');
    assert.equal(a.$("#soRole"), null, "no role for own teams");
    assert.match(a.$("#soMake").textContent, /Get 2 messages ready/);
    click(a, "#soMake");
    await waitFor(() => a.$("#soNext"), 5000);
    assert.ok(a.$("#soBcc"), "BCC button");
    assert.match(a.w.eval(`__so().list[0].text`), /run your own team/);
    click(a, "#soBcc"); await sleep(10);
    assert.equal(a.w.eval(`__so().sent.size`), 2);
    a.w.eval(`view="logins";render()`); await sleep(10);
    assert.ok(a.$("#soLg"), "Logins screen opens Send out");
    assert.deepEqual(navErr(a.errors), []);
  } finally { await a.close(); }
});

test("Member link to someone not on the roster puts them on the roster and links to their page", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(prep); await sleep(20);
    const n0 = a.w.eval("S.roster.length");
    a.w.eval(`$("#soXN").value="SGT Pat Lee";$("#soXT").value="(808) 555-0199"`);
    click(a, "#soXAdd"); await sleep(10);
    click(a, '[data-soas="link"]');
    click(a, "#soMake");
    await waitFor(() => a.$("#soNext"), 20000);
    const it = a.w.eval(`__so().list[0]`);
    assert.ok(!it.err, it.err);
    assert.equal(it.role, "Member");
    assert.equal(a.w.eval("S.roster.length"), n0 + 1);
    const m = a.w.eval(`S.roster.find(m=>/LEE/.test(m.name))`);
    assert.equal(m.rank, "SGT"); assert.equal(m.phone, "8085550199");
    assert.ok(m.pk, "their My page is on");
  } finally { await a.close(); }
});
