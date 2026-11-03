// Fix or remove a wrong phone number from a person's card.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const lead = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;`;

test("Edit number replaces a wrong number", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const id = a.w.eval(`${lead}const m=S.roster[0];m.phone="8085550100";delete m.phone2;save();openCard(m.id);m.id`);
    a.$('[data-pxedit="ph"]').click(); await sleep(10);
    assert.ok(a.$("#pPh"), "edit box opens");
    a.$("#pPh").value = "808 555 0199";
    a.$('[data-psave="ph"]').click(); await sleep(10);
    assert.equal(a.w.eval(`S.roster.find(m=>m.id===${JSON.stringify(id)}).phone`), "8085550199");
  } finally { a.close(); }
});

test("a bad or empty number is refused and the old one stays", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const id = a.w.eval(`${lead}const m=S.roster[0];m.phone="8085550100";save();openCard(m.id);m.id`);
    a.$('[data-pxedit="ph"]').click(); await sleep(10);
    for (const bad of ["12345", ""]) {
      a.$("#pPh").value = bad;
      a.$('[data-psave="ph"]').click(); await sleep(10);
      assert.equal(a.w.eval(`S.roster.find(m=>m.id===${JSON.stringify(id)}).phone`), "8085550100");
    }
  } finally { a.close(); }
});

test("Remove number needs two taps; the alt number moves up", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const id = a.w.eval(`${lead}const m=S.roster[0];m.phone="8085550100";m.phone2="8085550111";save();openCard(m.id);m.id`);
    const get = () => a.w.eval(`(()=>{const m=S.roster.find(x=>x.id===${JSON.stringify(id)});return JSON.stringify([m.phone||null,m.phone2||null])})()`);
    a.$('[data-pxrm="ph"]').click(); await sleep(10);
    assert.match(a.$('[data-pxrm="ph"]').textContent, /Tap again/);
    assert.equal(get(), '["8085550100","8085550111"]', "first tap only arms");
    a.$('[data-pxrm="ph"]').click(); await sleep(10);
    assert.equal(get(), '["8085550111",null]');
    a.$('[data-pxrm="ph"]').click(); await sleep(10);
    a.$('[data-pxrm="ph"]').click(); await sleep(10);
    assert.equal(get(), "[null,null]");
    assert.ok(a.$('[data-pedit="ph"]'), "card offers Add phone again");
  } finally { a.close(); }
});

test("alt number can be added, edited and removed; view-only phones get no buttons", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const id = a.w.eval(`${lead}const m=S.roster[0];m.phone="8085550100";delete m.phone2;save();openCard(m.id);m.id`);
    a.$('[data-pxedit="ph2"]').click(); await sleep(10);
    a.$("#pPh2").value = "808-555-0122";
    a.$('[data-pxsave="ph2"]').click(); await sleep(10);
    assert.equal(a.w.eval(`S.roster.find(m=>m.id===${JSON.stringify(id)}).phone2`), "8085550122");
    a.$('[data-pxrm="ph2"]').click(); await sleep(10);
    a.$('[data-pxrm="ph2"]').click(); await sleep(10);
    assert.equal(a.w.eval(`S.roster.find(m=>m.id===${JSON.stringify(id)}).phone2`), undefined);
    a.w.eval(`S.role="view";openCard(${JSON.stringify(id)})`);
    assert.equal(a.$("[data-pxedit]"), null);
  } finally { a.close(); }
});

test("Rank box on the card changes rank (promotion) and view-only phones don't get it", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const id = a.w.eval(`${lead}const m=S.roster[0];m.rank="LCPL";save();openCard(m.id);m.id`);
    const sel = a.$("#rkSel");
    assert.ok(sel, "Rank box on the card");
    sel.value = "CPL";
    sel.dispatchEvent(new a.w.Event("change", { bubbles: true })); await sleep(10);
    assert.equal(a.w.eval(`S.roster.find(m=>m.id===${JSON.stringify(id)}).rank`), "CPL");
    a.w.eval(`S.role="view";openCard(${JSON.stringify(id)})`);
    assert.equal(a.$("#rkSel"), null);
  } finally { a.close(); }
});
