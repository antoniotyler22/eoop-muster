// 4.101.0: Add people, one zone (Drop roster + Manual, with the people just added shown under it).
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const open = async (a) => {
  await a.w.eval(`S.mode="military";S.onb=true;S.welcomed=1;S.source="mol";S.roster=[];closeSheet&&0;view="people";render();addSheet("")`);
  await sleep(80);
};

test("the sheet shows Drop roster first with a Manual switch", async () => {
  const a = await openApp({});
  try {
    await open(a);
    assert.match(a.$("#sheetT").textContent, /Add people/);
    assert.ok(a.$("#apdDrop") && a.$("#apdFile"), "drop zone and file input");
    assert.equal(a.$("[data-apd-tab='drop']").getAttribute("aria-selected"), "true");
    a.$("[data-apd-tab='man']").click(); await sleep(50);
    for (const id of ["fn","ln","rk","sc","ro","ph","em","en","er","ep","nt"]) assert.ok(a.$("#apdM-" + id), "field " + id);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("manual entry saves every field and shows the person under the form, editable in place", async () => {
  const a = await openApp({});
  try {
    await open(a);
    a.$("[data-apd-tab='man']").click(); await sleep(50);
    const set = (id, v) => { a.$("#apdM-" + id).value = v; };
    set("fn", "Ana"); set("ln", "Rivera"); set("ro", "Driver"); set("ph", "808-555-0142"); set("em", "ana@x.com");
    set("en", "Maria"); set("er", "Mother"); set("ep", "808-555-0199"); set("nt", "Van 3");
    a.$("#apdSave").click(); await sleep(80);
    const m = a.w.eval(`S.roster.find(x=>x.name==="RIVERA, ANA")`);
    assert.ok(m, "person added");
    assert.equal(m.phone, "8085550142");
    assert.equal(m.role, "Driver"); assert.equal(m.email, "ana@x.com"); assert.equal(m.note, "Van 3");
    assert.equal(JSON.stringify(m.ec), JSON.stringify({ n: "Maria", r: "Mother", p: "8085550199" }));
    assert.match(a.$("#apdRoot").textContent, /Just added \(1\)/);
    assert.match(a.$(".apd-row").textContent, /Complete/);
    a.$("[data-apd-open]").click(); await sleep(50);
    a.$("#apdE-ph").value = ""; a.$("[data-apd-save]").click(); await sleep(50);
    assert.match(a.$(".apd-row").textContent, /Add phone/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("dropping a CSV reads everyone, then Undo import removes only that drop", async () => {
  const a = await openApp({});
  try {
    await open(a);
    const csv = JSON.stringify('Name,Team,Phone\n"Rivera, Ana",A,808-555-0101\nLee Max,B,\n');
    await a.w.eval(`window.__apdIngest([{name:"r.csv",type:"text/csv",text:async()=>${csv}}])`);
    await sleep(300);
    assert.equal(a.w.eval(`S.roster.length`), 2);
    assert.match(a.$("#apdOut").textContent, /2 people added/);
    assert.match(a.$("#apdOut").textContent, /1 need a phone/);
    a.$("#apdUndo").click(); await sleep(60);
    assert.equal(a.w.eval(`S.roster.length`), 0);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("a team with no roster shows Drop a roster up front on People", async () => {
  const a = await openApp({});
  try {
    await a.w.eval(`S.mode="military";S.onb=true;S.welcomed=1;S.source="sample";view="people";render()`);
    await sleep(80);
    assert.ok(a.$(".apd-first"), "drop prompt");
    a.$(".apd-first").click(); await sleep(80);
    assert.ok(a.$("#apdDrop"));
  } finally { await a.close(); }
});
