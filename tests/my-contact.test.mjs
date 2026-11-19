// 4.129.0: My contact. A person adds their own email and phone so they get matched to their roster spot.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const ROSTER = `[{id:"r1",rank:"CPL",name:"REYES, JORDAN",sec:"HQ",status:"On Hand"},{id:"r2",rank:"SGT",name:"LEE, SAM",sec:"HQ",status:"On Hand",phone:"8085550100"},{id:"r3",rank:"LCPL",name:"DIAZ, ANA",sec:"HQ",status:"On Hand",email:"ana@example.com"}]`;
const setup = async (a, extra = "") => {
  await a.w.eval(`S.mode="military";S.onb=true;S.welcomed=1;S.leaderMode=true;S.source="real";S.roster=${ROSTER};
    S.who={id:"r2",n:"SGT LEE"};S.myName="SGT LEE";${extra};view="board";render()`);
  await sleep(200);
};
const openSettings = async (a) => { a.$("#main [data-mpgo='set']").click(); await sleep(150); };
const type = (a, id, v) => { a.$(id).value = v; };

test("every role finds My contact under My page settings", async () => {
  const a = await openApp({});
  try {
    await setup(a, `S.role="co"`);
    assert.equal(a.w.eval("view"), "mypg");
    assert.ok(!a.$("#mcPanel"), "closed until Settings is opened");
    await openSettings(a);
    assert.ok(a.$("#mcPanel"), "My contact panel");
    assert.ok(a.$("#mcEmail") && a.$("#mcPhone"), "email and phone fields");
    assert.match(a.$("#mcMatch").textContent, /Save to my roster spot|Match me|Find my team/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("a bad email or phone is refused and nothing is saved", async () => {
  const a = await openApp({});
  try {
    await setup(a, `S.role="view"`);
    await openSettings(a);
    type(a, "#mcEmail", "not-an-email"); a.$("#mcSave").click(); await sleep(60);
    assert.match(a.$("#mcOut").textContent, /isn't valid/);
    type(a, "#mcEmail", ""); type(a, "#mcPhone", "12345"); a.$("#mcSave").click(); await sleep(60);
    assert.match(a.$("#mcOut").textContent, /phone number isn't valid/);
    type(a, "#mcPhone", ""); a.$("#mcSave").click(); await sleep(60);
    assert.match(a.$("#mcOut").textContent, /Add an email or a phone/);
    assert.equal(a.w.eval(`(S.mc&&S.mc.email)||""`), "");
  } finally { await a.close(); }
});

test("Save only keeps a cleaned email and 10-digit phone on this phone", async () => {
  const a = await openApp({});
  try {
    await setup(a, `S.role="view"`);
    await openSettings(a);
    type(a, "#mcEmail", "  Sam.Lee@Example.COM "); type(a, "#mcPhone", "+1 (808) 555-0142");
    a.$("#mcSave").click(); await sleep(80);
    assert.equal(a.w.eval("S.mc.email"), "sam.lee@example.com");
    assert.equal(a.w.eval("S.mc.phone"), "8085550142");
    assert.match(a.$("#mcOut").textContent, /Saved on this phone/);
    // not written onto the roster by a non-owner
    assert.equal(a.w.eval(`S.roster.find(m=>m.id==="r2").email||""`), "");
  } finally { await a.close(); }
});

test("the OIC's phone writes email and phone onto their own roster spot", async () => {
  const a = await openApp({});
  try {
    await setup(a, `S.role="oic"`);
    a.w.eval(`view="mypg";render()`); await sleep(150);
    await openSettings(a);
    assert.match(a.$("#mcMatch").textContent, /Save to my roster spot/);
    type(a, "#mcEmail", "sam@example.com"); type(a, "#mcPhone", "808-555-0199");
    a.$("#mcMatch").click(); await sleep(150);
    assert.equal(a.w.eval(`S.roster.find(m=>m.id==="r2").email`), "sam@example.com");
    assert.equal(a.w.eval(`S.roster.find(m=>m.id==="r2").phone`), "8085550199");
    assert.match(a.$("#mcOut").textContent, /Saved to your roster spot/);
  } finally { await a.close(); }
});

test("the owner's request list matches a person by roster spot, email, phone, then name", async () => {
  const a = await openApp({});
  try {
    await setup(a, `S.role="oic"`);
    const by = (r) => a.w.eval(`(()=>{const h=afMatchOf(${JSON.stringify(r)});return h?h.m.id+":"+h.by:""})()`);
    assert.equal(await by({ kind: "contact", mid: "r1", email: "", phone: "", last: "X", first: "" }), "r1:roster spot");
    assert.equal(await by({ kind: "join", email: "ana@example.com", phone: "", last: "X", first: "" }), "r3:email");
    assert.equal(await by({ kind: "join", email: "", phone: "8085550100", last: "X", first: "" }), "r2:phone");
    assert.equal(await by({ kind: "join", email: "", phone: "", last: "REYES", first: "JORDAN" }), "r1:name");
    assert.equal(await by({ kind: "join", email: "no@example.com", phone: "8085550000", last: "NOBODY", first: "" }), "");
  } finally { await a.close(); }
});

test("a member's contact update is sealed to the owner, who matches and saves it", async () => {
  const calls = [];
  let kp;
  const a = await openApp({
    rpc: async (fn, body) => {
      calls.push([fn, body]);
      if (fn === "team_dir_get") return [{ feed_id: "F1", name: "Alpha Team", pub: kp.pub }];
      if (fn === "join_req_send") return 7;
      return null;
    },
  });
  try {
    await setup(a, `S.role="view";S.feeds=[{id:"F1",mk:"mk",ek:"ek",unit:"Alpha Team",me:"SGT Lee",mid:"r2",posts:[],seen:0,mine:{},main:true}]`);
    kp = await a.w.eval(`afJoin.genKP().then(k=>({pub:k.pub,priv:k.priv}))`);
    await openSettings(a);
    type(a, "#mcEmail", "sam@example.com"); type(a, "#mcPhone", "8085550142");
    a.$("#mcMatch").click(); await sleep(400);
    const send = calls.find((c) => c[0] === "join_req_send");
    assert.ok(send, "the request was sent");
    assert.ok(!JSON.stringify(send[1]).includes("sam@example.com"), "the email isn't readable on the server");
    assert.ok(!JSON.stringify(send[1]).includes("8085550142"), "the phone isn't readable on the server");
    assert.match(a.$("#mcOut").textContent, /Sent to Alpha Team/);
    assert.ok(a.w.eval("afContactPending()"), "pending shows");
    assert.ok(a.$("#mcPend"), "waiting banner");
    // the owner's phone opens it
    const o = await a.w.eval(`afJoin.openSealed(${JSON.stringify(kp.priv)},${JSON.stringify(send[1].p_ct)})`);
    assert.equal(o.kind, "contact");
    assert.equal(o.mid, "r2");
    assert.equal(o.email, "sam@example.com");
    assert.equal(o.phone, "8085550142");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("the Ask to join form starts with the email and phone from My contact", async () => {
  const a = await openApp({ rpc: async (fn) => (fn === "team_dir_find" ? [{ feed_id: "F9", name: "Bravo Team", pub: "x".repeat(30) }] : null) });
  try {
    await setup(a, `S.role="view";S.mc={email:"sam@example.com",phone:"8085550142"}`);
    a.w.eval(`view="askjoin";render()`); await sleep(120);
    type(a, "#ajQ", "bra"); a.$("#ajFind").click(); await sleep(200);
    a.$("[data-askteam='F9']").click(); await sleep(150);
    assert.equal(a.$("#afEmail").value, "sam@example.com");
    assert.equal(a.$("#afPhone").value, "8085550142");
  } finally { await a.close(); }
});
