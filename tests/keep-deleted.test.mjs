// Deleted people stay deleted (sync can't bring them back), and Delete sits beside every name.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const lead = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;save();`;

test("a person deleted here stays off when the other phone syncs back an edited copy", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const r = a.w.eval(`(()=>{${lead}
      S.sync={on:true,code:"X"};const all=JSON.parse(JSON.stringify(S.roster));setBase({roster:all});
      const gone=S.roster[0].id;S.roster=S.roster.filter(m=>m.id!==gone);save();
      const R={roster:all.map(m=>m.id===gone?Object.assign({},m,{status:"Leave",pkAt:Date.now()}):m)};
      mergeRemote(R);return [S.roster.some(m=>m.id===gone),!!S.gone[gone]]})()`);
    assert.deepEqual([...r], [false, true]);
  } finally { a.close(); }
});

test("a delete made on the other phone also comes off here, even if this phone edited them", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const r = a.w.eval(`(()=>{${lead}
      S.sync={on:true,code:"X"};setBase({roster:S.roster});const id=S.roster[1].id;S.roster[1].status="Leave";save();
      mergeRemote({roster:S.roster.filter(m=>m.id!==id),gone:{[id]:Date.now()}});return S.roster.some(m=>m.id===id)})()`);
    assert.equal(r, false);
  } finally { a.close(); }
});

test("Undo / adding the same person back clears the delete note", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const r = a.w.eval(`(()=>{${lead}const m=S.roster[0];S.roster=S.roster.slice(1);save();const was=!!S.gone[m.id];S.roster.push(m);save();return [was,!!S.gone[m.id]]})()`);
    assert.deepEqual([...r], [true, false]);
  } finally { a.close(); }
});

test("Delete sits beside every name in a section list and works", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`${lead}view=SECTIONS[0][0].toLowerCase();render()`);
    const rows = a.$$("#main .m");
    assert.ok(rows.length > 0);
    assert.equal(a.$$("#main .m .kdDel").length, rows.length, "one Delete per person");
    const id = a.$("#main .m .kdDel").dataset.pddel;
    const n0 = a.w.eval("S.roster.length");
    a.$(`#main .kdDel[data-pddel="${id}"]`).click(); await sleep(5);
    a.$(`#main .kdDel[data-pddel="${id}"]`).click(); await sleep(5);
    assert.equal(a.w.eval("S.roster.length"), n0 - 1);
  } finally { a.close(); }
});

test("Delete shows in People search results", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const h = a.w.eval(`${lead}gqHTML(S.roster[0].name.split(",")[0])`);
    assert.match(h, /kdDel/);
    assert.equal((h.match(/class="rrow"/g) || []).length, (h.match(/kdDel/g) || []).length);
  } finally { a.close(); }
});

test("the add box inside a section won't add a double", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`${lead}view=SECTIONS[0][0].toLowerCase();render()`);
    const n0 = a.w.eval("S.roster.length");
    a.$("#aName").value = a.w.eval("S.roster[0].name");
    a.$("#addf").dispatchEvent(new a.w.Event("submit", { bubbles: true, cancelable: true }));
    await sleep(5);
    assert.equal(a.w.eval("S.roster.length"), n0);
  } finally { a.close(); }
});
