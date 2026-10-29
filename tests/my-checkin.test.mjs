// Everyone checks in; quiet-section line gone from Needs attention; team alerts connect waits its turn.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const lead = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;save();view="board";render();`;

test("the leader's Home has My check-in: pick yourself, check in, your row changes", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(lead);
    assert.ok(a.$("#myCk"), "card on Home");
    const id = a.w.eval("S.roster[0].id");
    a.w.eval(`{const s=$("#myWho");s.value=${JSON.stringify(id)};s.dispatchEvent(new Event("change",{bubbles:true}))}`);
    a.$("#myCkOpen").click(); await sleep(5);
    a.$('[data-myst="SIQ"]').click(); await sleep(5);
    a.w.eval(`$("#myL").value="Barracks";$("#myT").value=dkey(new Date(Date.now()+864e5))`);
    a.$("#myCkSend").click(); await sleep(10);
    const m = a.w.eval(`S.roster.find(x=>x.id===${JSON.stringify(id)})`);
    assert.equal(m.status, "SIQ"); assert.equal(m.loc, "Barracks"); assert.ok(m.ckAt);
  } finally { await a.close(); }
});

test("quiet-section line no longer shows in Needs attention", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const r = a.w.eval(`(()=>{${lead}S.board={sk:{UT:"x"},last:{UT:{t:Date.now()-30*3600000}}};return healthIssues().some(x=>/hasn't sent an update/.test(x.t))})()`);
    assert.equal(r, false);
  } finally { await a.close(); }
});

test("team alerts connect: overlapping runs both finish instead of giving up", async () => {
  const a = await openApp({ rpc: (fn) => fn === "feed_sub" ? null : [] });
  try {
    const n = await a.w.eval(`(async()=>{S.pushOn=true;S.feeds=[{id:"f1",mk:"m",lk:"l",ek:"e",posts:[]}];window.pushSub=async()=>({toJSON:()=>({endpoint:"e1"}),endpoint:"e1"});
      const p1=taAttach(true),p2=taAttach(true);const r=await Promise.all([p1,p2]);return r})()`);
    assert.deepEqual([...n], [1, 1]);
  } finally { await a.close(); }
});

test("leader phone: team alerts mark the sub as lead and make the OIC's phone the leader alert phone", async () => {
  const calls = [];
  const a = await openApp({ rpc: (fn, args) => { calls.push([fn, args]); return null; } });
  try {
    await a.w.eval(`(async()=>{S.pushOn=true;S.feeds=[{id:"f1",mk:"m",lk:"l",ek:"e",posts:[]}];window.pushSub=async()=>({toJSON:()=>({endpoint:"e1"}),endpoint:"e1"});await taAttach(true)})()`);
    const sub = calls.find(c => c[0] === "feed_sub");
    assert.equal(sub[1].p_sub.lead, 1);
    assert.ok(calls.some(c => c[0] === "set_feed_leader_sub" && c[1].p_leader_key === "l"));
  } finally { await a.close(); }
});

test("pins and poll tallies are marked as control posts and still decode", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const r = await a.w.eval(`(async()=>{const ek=b64url(crypto.getRandomValues(new Uint8Array(32)));const ct="c:"+await fdEnc(ek,{c:"tally",pid:1});const o=await fdDec(ek,ct);return o&&o.c})()`);
    assert.equal(r, "tally");
  } finally { await a.close(); }
});
