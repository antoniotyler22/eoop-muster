// Each version names Word of Mouth its own way.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const setup = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.roster=[{id:"r1",rank:"",name:"RUIZ, AL",sec:"HQ",status:"On Hand"}];`;

test("Names by version, and an own name wins", async () => {
  const a = await openApp();
  try {
    const n = m => a.w.eval(`S.mode="${m}";womName()`);
    assert.equal(n("military"), "Word of Mouth");
    assert.equal(n("police"), "Roll Call Board");
    assert.equal(n("jobs"), "Toolbox Board");
    assert.equal(n("hr"), "Bulletin Board");
    assert.equal(n("civilian"), "Bulletin Board");
    assert.equal(a.w.eval(`S.womName="Town Square";womName()`), "Town Square");
  } finally { await a.close(); }
});

test("Screens rewrite the name; military screens are left alone", async () => {
  const a = await openApp();
  try {
    a.w.eval(setup + `S.mode="civilian";save();render()`);
    await sleep(150);
    assert.match(a.$("#bFeed").textContent, /Bulletin Board/);
    assert.doesNotMatch(a.$("body").textContent, /Word of Mouth/i);
    a.w.eval(`toast("Word of Mouth isn't set up on this phone");`); await sleep(120);
    assert.doesNotMatch(a.$("body").textContent, /Word of Mouth/i);
    assert.match(a.$("body").textContent, /Bulletin Board isn't set up/);
    a.w.eval(`S.mode="military";S.womName="";save();render()`); await sleep(150);
    assert.match(a.$("#bFeed").textContent, /Word of Mouth/, "switching back restores the name");
    assert.equal(a.errors.length, 0, a.errors.join("\n"));
  } finally { await a.close(); }
});

test("Names belong to people: two leaders with no name never share one, a picked name wins even for the OIC", async () => {
  const a = await openApp();
  try {
    a.w.eval(setup);
    const noname = a.w.eval(`S.who=null;S.postAs="";S.myName="";fdBy({unit:"OAK RIDGE"})`);
    assert.match(noname, /^LEADER [A-Z0-9]{4}$/, noname);
    assert.doesNotMatch(noname, /OAK RIDGE/);
    a.w.eval(`S.role="view"`);
    assert.match(a.w.eval(`fdBy({})`), /^MEMBER [A-Z0-9]{4}$/);
    a.w.eval(`S.role="oic";S.who={n:"Sgt Park",t:1}`);
    assert.equal(a.w.eval(`fdBy({})`), "SGT PARK");
    assert.equal(a.w.eval(`S.who=null;S.postAs="";S.myName="";fdBy({})===fdBy({})`), true, "stable on one phone");
  } finally { await a.close(); }
});

test("Screens say permission, not role, for access levels", async () => {
  const a = await openApp();
  try {
    a.w.eval(setup + `S.mode="military";S.sync={on:true};view="alvl";render()`);
    await sleep(150);
    assert.match(a.$("#main").textContent, /Permission/);
    assert.doesNotMatch(a.$("#main").textContent, /\bRoles?\b/);
  } finally { await a.close(); }
});
