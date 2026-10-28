// Company command: CO/XO/1stSgt access, questions all command seats see, asks to platoons with answers back.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

// a tiny stand-in for the company tables (same rules as setup parts 14b and 25)
function server() {
  const rows = {};
  const rpc = (fn, b) => {
    if (fn === "put_unit") { if (/^cmd/.test(b.p_unit)) throw new Error("bad unit"); rows[b.p_unit] = { unit: b.p_unit, ct: b.p_ct, updated_at: new Date(Date.now() + Object.keys(rows).length).toISOString() }; return null; }
    if (fn === "put_cmd") { rows[b.p_unit] = { unit: b.p_unit, ct: b.p_ct, updated_at: new Date().toISOString() }; return null; }
    if (fn === "get_units") return Object.values(rows);
    if (fn === "get_cmd") return Object.values(rows).filter((r) => /^cmd/.test(r.unit));
    return null;
  };
  return { rows, rpc };
}
const EK = "A".repeat(43);
const board = (extra) => `S.coBoard={id:"cotest0001",rk:"${"r".repeat(32)}",wk:"${"w".repeat(32)}",ek:"${EK}",name:"CLC-33",units:{},err:"",${extra||""}};`;
const leader = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";`;
const click = (a, s) => { const el = a.$(s); assert.ok(el, "missing " + s); el.click(); };

test("owner gets a link and login for the CO, XO and 1stSgt; Send out can pick the seat", async () => {
  const a = await openApp({ rpc: server().rpc });
  try {
    a.w.eval(leader + board("own:true") + `save();view="co";render();`); await sleep(30);
    for (const s of ["co", "xo", "1sg"]) assert.ok(a.$(`[data-cocopy="${s}"]`), "link for " + s);
    assert.match(a.w.eval(`coLink("xo")`), /cov=.*&w=xo/);
    const ids = a.w.eval(`lgRoles().find(r=>r.k==="cmd").ds.map(d=>d.id).join(",")`);
    assert.equal(ids, "co:co,co:xo,co:1sg,co:view");
    assert.match(await a.w.eval(`lgHash("co:1sg",true)`), /w=1sg/);
    assert.equal(a.w.eval(`lgRoleOf("co:xo")`), "Company command");
    click(a, '[data-cmdlg="xo"]'); await sleep(20);
    assert.equal(a.w.eval(`view`), "logins"); assert.equal(a.w.eval(`lgForm.dest`), "co:xo");
    a.w.eval(`view="invite";render();$("#soXN").value="Capt Ruiz";$("#soXT").value="ruiz@example.com";$("#soXAdd").click()`); await sleep(10);
    a.w.eval(`{const s=$("#soRole");s.value="cmd";s.dispatchEvent(new Event("change",{bubbles:true}))}`); await sleep(10);
    assert.match(a.$("#soBox").textContent, /Pick which company command seat/);
    a.w.eval(`{const s=document.querySelector('[data-sorole="x:1"]');s.value="cmd:co:co";s.dispatchEvent(new Event("change",{bubbles:true}))}`); await sleep(10);
    assert.doesNotMatch(a.$("#soBox").textContent, /Pick which/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("XO marks a question; 1stSgt sees it and resolves it; an ask reaches the platoon and its answer comes back", async () => {
  const srv = server();
  const xo = await openApp({ rpc: srv.rpc });
  const plt = await openApp({ rpc: srv.rpc });
  const sg = await openApp({ rpc: srv.rpc });
  try {
    // platoon OIC reports in
    plt.w.eval(leader + `S.coRep={id:"cotest0001",wk:"${"w".repeat(32)}",ek:"${EK}",co:"CLC-33",name:"1st Plt",uid:"plt1abcdef",names:true,sig:"",at:0,err:""};save();`);
    await plt.w.eval(`coPush(true)`);
    // XO opens their command link
    xo.w.eval(`S.welcomed=1;S.onb=true;location.hash="cov=cotest0001&r=${"r".repeat(32)}&e=${EK}&u=CLC-33&w=xo"`); await sleep(500);
    await xo.w.eval(`coPoll()`); await sleep(20);
    assert.equal(xo.w.eval(`S.cmdMe.seat`), "xo");
    assert.match(xo.$("#main").textContent, /Company · XO/);
    click(xo, '[data-cqon="plt1abcdef"]'); await sleep(10);
    xo.w.eval(`$("#cqTxt").value="Why is the HE section short?"`); click(xo, "#cqSave"); await sleep(30);
    // 1stSgt sees it
    sg.w.eval(`S.welcomed=1;S.onb=true;location.hash="cov=cotest0001&r=${"r".repeat(32)}&e=${EK}&u=CLC-33&w=1sg"`); await sleep(500);
    await sg.w.eval(`coPoll()`); await sleep(20); sg.w.eval(`renderCo()`);
    assert.match(sg.$("#cmdQs").textContent, /Why is the HE section short\?.*XO/s);
    assert.match(sg.$("#main").textContent, /1 open/);
    click(sg, "[data-cqres]"); await sleep(30);
    await xo.w.eval(`coPoll()`); await sleep(20); xo.w.eval(`renderCo()`);
    assert.match(xo.$("#main").textContent, /Questions · 0 open/, "resolved for everyone");
    // 1stSgt sends an ask to all platoons, SNCOs only
    click(sg, "#caNew"); await sleep(10);
    click(sg, '[data-cafor="off"]'); await sleep(10);
    sg.w.eval(`$("#caTxt").value="Turn in rifle range rosters by 1600"`); click(sg, "#caSend"); await sleep(30);
    // platoon sees it on Home and answers on Company
    // run the platoon's poll directly
    await plt.w.eval(`(async()=>{for(const j of JOBS)if(j.name==="co-asks")await j.fn()})()`); await sleep(20);
    plt.w.eval(`view="board";render()`);
    assert.match(plt.$("#coAskBan").textContent, /1 ask from CLC-33/);
    plt.w.eval(`view="co";render()`); await sleep(10);
    plt.w.eval(`document.querySelector("[data-coans]").value="Done, rosters in the share drive"`);
    click(plt, "[data-cosend]"); await sleep(60);
    await sg.w.eval(`coPoll()`); await sleep(20); sg.w.eval(`renderCo()`);
    assert.match(sg.$("#cmdAsks").textContent, /1\/1 answered/);
    assert.match(sg.$("#cmdAsks").textContent, /Done, rosters in the share drive/);
    assert.match(sg.$("#cmdAsks").textContent, /SNCOs/, "ask was for SNCOs only");
    plt.w.eval(`S.role="sncoic"`); assert.equal(plt.w.eval(`myAsksN()`), 1, "SNCOIC phone sees the SNCO ask");
    for (const x of [xo, plt, sg]) assert.deepEqual(x.errors, []);
  } finally { await xo.close(); await plt.close(); await sg.close(); }
});
