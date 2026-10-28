// Getting everyone on the app: formation QR, On the app numbers, reminders, company ask alerts.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep, waitFor } from "./harness.mjs";

// stand-in login server: same rules as setup parts 15/19 (ct only for the right verifier)
function loginServer() {
  const L = {}, tries = {};
  return (fn, b) => {
    if (fn === "login_put" || fn === "login_put2") { L[b.p_uid] = { vf: b.p_vf, ct: b.p_ct }; return "ok"; }
    if (fn === "login_get") { const r = L[b.p_uid]; if (!r) return []; if (r.vf !== b.p_vf) { tries[b.p_uid] = (tries[b.p_uid] || 0) + 1; return [{ ct: null, wait: tries[b.p_uid] >= 5 ? 900 : 0 }]; } return [{ ct: r.ct }]; }
    if (fn === "login_delete") { delete L[b.p_uid]; return null; }
    return null;
  };
}
const leader = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";`;
const click = (a, s) => { const el = a.$(s); assert.ok(el, "missing " + s); el.click(); };
const navErr = (errs) => errs.filter((e) => !/navigation|clipboard|Not implemented/i.test(e));

test("formation QR: leader makes it, a member scans, types name + last 4, and lands on their own page; wrong digits don't open it", async () => {
  const rpc = loginServer();
  const a = await openApp({ rpc });
  let link, who;
  try {
    a.w.eval(leader + `S.roster=S.roster.slice(0,6);const NM=["ADAMS, JOHN","BAKER, ANA","CRUZ, LUIS M","DIAZ, ROSA","EVANS, TOM","FOX, KIM"];S.roster.forEach((m,i)=>{m.name=NM[i];m.phone="80855501"+(10+i)});S.roster[5].phone="";save();view="invite";render();`); await sleep(20);
    assert.match(a.$("#qjGo").textContent, /Make the formation QR · 5 people/);
    click(a, "#qjGo");
    await waitFor(() => a.w.eval(`!!(S.qj&&S.qj.uids.length===5)`) && a.$("#qjBox"), 60000);
    assert.match(a.$("#qjPanel").textContent, /0 of 5 joined/);
    assert.match(a.$("#qjPanel").textContent, /1 can't use the QR/);
    link = a.w.eval(`PUB()+"#qj="+S.qj.id+"&s="+S.qj.sec+"&u=X"`);
    who = a.w.eval(`(()=>{const m=S.roster[2];return {last:m.name.split(",")[0],first:(m.name.split(",")[1]||"").trim().split(/\\s+/)[0],ph:m.phone.slice(-4),id:m.id}})()`);
  } finally { await a.close(); }
  const b = await openApp({ rpc, hash: link.split("#")[1] });
  try {
    await waitFor(() => b.$("#qjL"), 5000);
    b.w.eval(`$("#qjL").value=${JSON.stringify(who.last)};$("#qjF").value=${JSON.stringify(who.first)};$("#qjP").value="0000";const c=$("#qjTos");if(c)c.checked=true;`);
    click(b, "#qjJoin");
    await waitFor(() => /wrong/i.test((b.$("#lgSOut") || {}).textContent || ""), 20000);
    b.w.eval(`lgSignSheet();setTimeout(()=>{$("#lgSU").value="";},0)`);
    b.w.eval(`qjSheet(new URLSearchParams(${JSON.stringify(link.split("#")[1])}))`); await sleep(20);
    b.w.eval(`$("#qjL").value=${JSON.stringify(who.last)};$("#qjF").value=${JSON.stringify(who.first)};$("#qjP").value="${who.ph}";const c=$("#qjTos");if(c)c.checked=true;`);
    click(b, "#qjJoin");
    await waitFor(() => b.w.eval(`!!(S.lgSelf&&S.lgSelf.h)`), 20000);
    assert.match(b.w.eval(`S.lgSelf.h`), /^me=/);
    assert.deepEqual(navErr(b.errors), []);
  } finally { await b.close(); }
}, { timeout: 120000 });

test("On the app: count by section, Send to the rest opens Send out with them picked; Home reminds about logins not used after a day", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(leader + `S.roster=S.roster.slice(0,4);S.roster.forEach(m=>m.sec="HQ");S.seen={[S.roster[0].id]:{t:Date.now(),who:"x"}};
      S.logins=[{uid:"u1",dest:"me:"+S.roster[1].id,user:"a",pw:"b",label:"x",at:Date.now()-2*864e5}];S.lgOwner="o";save();view="access";render();`); await sleep(20);
    assert.match(a.$("#oaPanel").textContent, /1 of 4/);
    assert.match(a.$("#oaPanel").textContent, /HQ 1\/4/);
    click(a, "#oaSend"); await sleep(20);
    assert.equal(a.w.eval(`view`), "invite");
    assert.equal(a.w.eval(`__so().ids.size`), 3);
    a.w.eval(`view="board";render()`); await sleep(10);
    assert.match(a.$("#oaNudge").textContent, /1 haven't signed in/);
    click(a, "#oaLater"); await sleep(10);
    assert.equal(a.$("#oaNudge"), null, "snoozed for a day");
    assert.deepEqual(navErr(a.errors), []);
  } finally { await a.close(); }
});

test("a company ask buzzes each target platoon's team alerts", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(`S.coBoard={id:"cotest0001",rk:"${"r".repeat(32)}",wk:"",ek:"${"A".repeat(43)}",name:"CLC",own:false,units:{p1:{t:1,name:"1st",ms:[],secs:[],al:{f:"feed000001",k:"${"k".repeat(30)}"}},p2:{t:1,name:"2nd",ms:[],secs:[]}},err:""};save();`);
    a.w.eval(`coAskBuzz("all")`); await sleep(20);
    const sent = a.calls.filter((c) => /functions\/v1\/notify/.test(c.url)).map((c) => c.body);
    assert.equal(sent.length, 1);
    assert.deepEqual(sent[0].what, ["ask"]); assert.equal(sent[0].team, "feed000001");
  } finally { await a.close(); }
});
