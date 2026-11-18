// A hand-set status stays put (here, across saves and over a sync), and every person stays linked to their login / page / history.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const lead = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.sync={on:true,code:"X"};save();`;
const people = `var P=S.roster.filter(m=>m.sec!=="ATT");`;

async function pick(a, id, st) {
  a.$(`[data-pick="s"][data-pid="${id}"]`).click(); await sleep(120);
  a.$(`[data-sopt="${st}"]`).click(); await sleep(150);
  await sleep(450); a.w.eval(`closeSheet()`); await sleep(450); // a non-On Hand status opens its dates/location sheet; close it
}

test("a status set by hand sticks: an older copy from another phone cannot flip it back", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`${lead}${people}view=P[0].sec.toLowerCase();render()`); await sleep(60);
    const id = a.w.eval(`P[0].id`);
    a.w.eval(`setBase({roster:JSON.parse(JSON.stringify(S.roster))})`);
    const old = a.w.eval(`JSON.parse(JSON.stringify(S.roster))`);
    await pick(a, id, "At PT");
    assert.equal(a.w.eval(`S.roster.find(m=>m.id==="${id}").status`), "At PT");
    a.w.eval(`mergeRemote(${JSON.stringify({ roster: old })})`);
    assert.equal(a.w.eval(`S.roster.find(m=>m.id==="${id}").status`), "At PT", "stale copy did not revert it");
    await pick(a, id, "On Hand");
    a.w.eval(`mergeRemote(${JSON.stringify({ roster: old.map(m => m.id === id ? { ...m, status: "At PT" } : m) })})`);
    assert.equal(a.w.eval(`S.roster.find(m=>m.id==="${id}").status`), "On Hand", "On Hand set by hand stays");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("hand-set On Hand counts, and nobody leaves the numbers over a sync", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`${lead}${people}P.forEach(m=>{m.status="Off Hand"});save();view=P[0].sec.toLowerCase();render()`); await sleep(60);
    const id = a.w.eval(`P[0].id`); const n0 = a.w.eval(`counts().T.total`);
    await pick(a, id, "On Hand");
    assert.equal(a.w.eval(`counts().T["On Hand"]`), 1);
    a.w.eval(`mergeRemote({roster:S.roster.filter((m,i)=>i!==3)})`);
    assert.equal(a.w.eval(`counts().T.total`), n0, "total unchanged");
    assert.equal(a.w.eval(`counts().T["On Hand"]`), 1, "still on hand");
  } finally { await a.close(); }
});

test("renaming or re-ranking a person by hand keeps their login, page and history linked", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const r = a.w.eval(`(()=>{${lead}${people}const m=P[0],id=m.id;
      S.logins=[{uid:"u1",user:"abc1",dest:"me:"+id,mid:id,label:"x",role:"member"}];S.me=id;S.tl={[id]:[[Date.now(),"On Hand",""]]};
      m.rank="GYSGT";m.name="RENAMED, PERSON";save();
      return [S.roster.some(x=>x.id===id),S.logins[0].mid===id,S.me===id,!!S.tl[id]]})()`);
    assert.deepEqual([...r], [true, true, true, true]);
  } finally { await a.close(); }
});

test("a sync keeps every login pointing at the right person, even if the other phone renumbers ids", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const r = a.w.eval(`(()=>{${lead}${people}
      S.logins=P.slice(0,3).map((m,i)=>({uid:"u"+i,user:"user"+i,dest:"me:"+m.id,mid:m.id,label:m.name,role:"member"}));save();
      const names=S.logins.map(L=>S.roster.find(m=>m.id===L.mid).name);
      const copy=JSON.parse(JSON.stringify(S.roster)).map((m,i)=>Object.assign(m,{id:"zz"+i}));
      mergeRemote({roster:copy});
      const after=S.logins.map(L=>{const m=S.roster.find(x=>x.id===L.mid);return m&&m.name});
      return {names,after,total:S.roster.length,copy:copy.length}})()`);
    assert.deepEqual([...r.after], [...r.names], "each login still opens the same person");
    assert.equal(r.total, r.copy, "no doubles after a renumbered sync");
  } finally { await a.close(); }
});

test("deleting a person by hand also removes their login, so no login points at nobody", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`${lead}${people}S.logins=P.slice(0,4).map((m,i)=>({uid:"u"+i,user:"user"+i,dest:"me:"+m.id,mid:m.id,label:m.name,role:"member"}));save();view=P[0].sec.toLowerCase();render()`); await sleep(60);
    const id = a.w.eval(`S.logins[0].mid`);
    a.$(`#main .kdDel[data-pddel="${id}"]`).click(); await sleep(5);
    a.$(`#main .kdDel[data-pddel="${id}"]`).click(); await sleep(60);
    assert.equal(a.w.eval(`S.roster.some(m=>m.id==="${id}")`), false, "person deleted");
    const orphans = a.w.eval(`S.logins.filter(L=>L.mid&&!S.roster.some(m=>m.id===L.mid)).length`);
    assert.equal(orphans, 0, "no login left pointing at a deleted person");
  } finally { await a.close(); }
});

test("a check-in from a person's phone lands on the roster by itself, counts, and says it was them", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`${lead}${people}P.forEach(m=>{m.status="Off Hand";m.ckAt=Date.now()-30*36e5});save();view="board";render()`); await sleep(40);
    const id = a.w.eval(`P[0].id`);
    a.w.eval(`ckIn({id:"f"},{cid:"c1",mid:"${id}",me:"X",st:"On Hand",at:Date.now()},null)`);
    assert.equal(a.w.eval(`S.roster.find(m=>m.id==="${id}").status`), "On Hand", "applied without waiting for Confirm");
    assert.equal(a.w.eval(`ckStale(S.roster.find(m=>m.id==="${id}"))`), false, "not Off Hand");
    assert.equal(a.w.eval(`S.roster.find(m=>m.id==="${id}").by.w`), "self");
    assert.match(a.w.eval(`byLabel(S.roster.find(m=>m.id==="${id}"))`), /Self check-in/);
    // another leader's phone still has the old copy, edits something else on the same person, and syncs: it must not undo the check-in
    a.w.eval(`setBase({roster:JSON.parse(JSON.stringify(S.roster))})`);
    const old = a.w.eval(`JSON.parse(JSON.stringify(S.roster))`); const o = old.find(m => m.id === id); o.status = "Off Hand"; o.ckAt = Date.now() - 30 * 36e5; delete o.by; o.phone = "8085550101";
    a.w.eval(`mergeRemote(${JSON.stringify({ roster: old })})`);
    assert.equal(a.w.eval(`S.roster.find(m=>m.id==="${id}").status`), "On Hand", "stale copy did not send them back to Off Hand");
    assert.equal(a.w.eval(`ckStale(S.roster.find(m=>m.id==="${id}"))`), false);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("a leader changing someone's status is marked as someone else; the person's own is marked self; sync keeps the mark", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`${lead}${people}S.who={id:P[1].id,n:"SSGT LEADER"};save();view=P[0].sec.toLowerCase();render()`); await sleep(60);
    const id = a.w.eval(`P[0].id`);
    await pick(a, id, "At PT");
    assert.deepEqual([...a.w.eval(`[S.roster.find(m=>m.id==="${id}").by.w,S.roster.find(m=>m.id==="${id}").by.n]`)], ["other", "SSGT LEADER"]);
    assert.match(a.$(".by-t").textContent, /Set by SSGT LEADER/);
    const id2 = a.w.eval(`P[1].id`);
    a.w.eval(`P[1].status="Leave";save()`);
    assert.equal(a.w.eval(`S.roster.find(m=>m.id==="${id2}").by.w`), "self", "leader's own row is self");
    const copy = a.w.eval(`JSON.parse(JSON.stringify(S.roster))`);
    a.w.eval(`mergeRemote(${JSON.stringify({ roster: copy })})`);
    assert.equal(a.w.eval(`S.roster.find(m=>m.id==="${id}").by.w`), "other", "mark survives sync");
  } finally { await a.close(); }
});
