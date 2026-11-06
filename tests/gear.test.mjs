// 4.81.0: Gear (tool room sign-out, inventory, equipment up/down) and the per-person tool switches.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const ROSTER = `S.roster=[{id:"r1",rank:"SGT",name:"RUIZ, AL",sec:"HQ",status:"On Hand"},{id:"r2",rank:"CPL",name:"PARK, DEE",sec:"HQ",status:"On Hand"},{id:"r3",rank:"LCPL",name:"HUGHES, COLE",sec:"HQ",status:"On Hand"}]`;
async function boot(extra = "") {
  const a = await openApp();
  a.w.eval(`S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";${ROSTER};${extra};save()`);
  return a;
}

test("Gear stays hidden until the OIC turns it on, then shows next to Armory", async () => {
  const a = await boot();
  try {
    assert.equal(a.w.eval(`afTool.level("gear")`), "", "off by default");
    a.w.eval(`view="tools";render()`);
    assert.doesNotMatch(a.$("#main").textContent, /Armory & gear/);
    a.w.eval(`afTool.setTeam("gear",true);view="tools";render()`);
    assert.equal(a.w.eval(`afTool.level("gear")`), "mgr");
    assert.match(a.$('[data-sgrp="armory"]').textContent, /Armory & gear/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("tool room NCO drops in a roster, signs gear out and takes it back", async () => {
  const a = await boot(`S.mods={gear:true}`);
  try {
    a.w.eval(`view="gear";render()`);
    assert.match(a.$("#main").textContent, /Drop in your gear roster/);
    a.$("#gPaste").value = "Item\tSerial\tCategory\nRadio PRC-117\t12\tComms\n7-ton keys\t4\tVehicles\nTorque wrench\t8\tTools";
    a.$("[data-gaddp]").click(); await sleep(50);
    assert.equal(a.w.eval(`afGear.state().items.length`), 3);
    assert.match(a.$("#main").textContent, /Added 3 items/);
    // the same roster dropped again adds nothing
    assert.equal(a.w.eval(`afGear.add(afGear.parse("Item,Serial\\nRadio PRC-117,12")).skip`), 1);
    // sign out to a person from the roster
    a.$("[data-gso]").click(); await sleep(30);
    a.$('[data-gpick="r3"]').click(); await sleep(30);
    const x = a.w.eval(`afGear.state().items.find(i=>i.h==="r3")`);
    assert.ok(x, "signed out to Hughes");
    assert.match(a.$("#main").textContent, /Out: HUGHES|Out: LCPL HUGHES/);
    // it appears in the member's My page data
    assert.equal(a.w.eval(`mpDigest(S.roster[2]).gear.length`), 1);
    assert.equal(a.w.eval(`mpDigest(S.roster[0]).gear.length`), 0);
    a.$("[data-gret]").click(); await sleep(30);
    assert.equal(a.w.eval(`afGear.state().items.filter(i=>i.h).length`), 0, "returned");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("an item due yesterday shows overdue", async () => {
  const a = await boot(`S.mods={gear:true}`);
  try {
    a.w.eval(`afGear.add([{n:"NVG set",sn:"031",cat:"Optics",hold:"Hughes"}]);const x=afGear.state().items[0];x.due=dkey(new Date(Date.now()-864e5));view="gear";render()`);
    assert.match(a.$("#main").textContent, /OVERDUE/);
    assert.match(a.$("#main").textContent, /Overdue/);
    assert.equal(a.w.eval(`afGear.state().items[0].h`), "r3", "holder matched to the roster by name");
  } finally { await a.close(); }
});

test("operations sees up and down and can mark an item down with a reason", async () => {
  const a = await boot(`S.mods={gear:true};S.role="sncoic"`);
  try {
    a.w.eval(`afGear.add([{n:"Welder",sn:"2",cat:"Maintenance"},{n:"MEP-803",sn:"6",cat:"Power"}]);view="gear";render()`);
    assert.equal(a.w.eval(`afTool.level("gear")`), "ops");
    assert.match(a.$("#main").textContent, /Equipment status/);
    assert.equal(a.$("[data-gso]"), null, "no sign-out for operations");
    a.$("[data-gdown]").click(); await sleep(30);
    a.$('[data-gwhy$="|Parts"]').click(); await sleep(30);
    assert.equal(a.w.eval(`afGear.state().items.filter(i=>i.dn).length`), 1);
    assert.match(a.$("#main").textContent, /DOWN: Parts/);
    assert.match(a.$("#main").textContent, /50% ready/);
  } finally { await a.close(); }
});

test("inventory count ends in a report with what wasn't counted", async () => {
  const a = await boot(`S.mods={gear:true}`);
  try {
    a.w.eval(`afGear.add([{n:"Radio",sn:"1",cat:"Comms"},{n:"Keys",sn:"2",cat:"Vehicles"}]);view="gear";render()`);
    a.$("[data-ginvstart]").click(); await sleep(30);
    a.$("[data-gcnt]").click(); await sleep(30);
    a.$("[data-ginvend]").click(); await sleep(30);
    const L = a.w.eval(`afGear.state().lastInv`);
    assert.equal(L.found, 1); assert.equal(L.total, 2); assert.equal(L.missing.length, 1);
    assert.match(a.$("#main").textContent, /1 of 2 accounted for/);
  } finally { await a.close(); }
});

test("per-person switches: Off hides it, Status is ops, Manager runs it", async () => {
  const a = await boot(`S.mods={gear:true,lic:true};S.role="sncoic";S.who={id:"r2",n:"PARK"}`);
  try {
    assert.equal(a.w.eval(`afTool.level("gear")`), "ops", "editors get status by default");
    assert.equal(a.w.eval(`afTool.level("lic")`), "");
    a.w.eval(`S.roster[1].tools={gear:"mgr",lic:"mgr"}`);
    assert.equal(a.w.eval(`afTool.level("gear")`), "mgr");
    assert.equal(a.w.eval(`afTool.level("lic")`), "mgr");
    a.w.eval(`S.role="oic";afTool.setPerson("r2","gear","");afTool.setPerson("r2","lic","")`);
    assert.equal(a.w.eval(`S.roster[1].tools`), undefined);
    // the OIC's page lists people with chips
    a.w.eval(`view="toolsw";render()`);
    assert.match(a.$("#main").textContent, /Who gets what/);
    a.$('[data-tper="r2|gear|ops"]').click(); await sleep(30);
    assert.equal(a.w.eval(`S.roster[1].tools.gear`), "ops");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("My page shows the member's own gear", async () => {
  const a = await boot(`S.mods={gear:true}`);
  try {
    a.w.eval(`afGear.add([{n:"Radio",sn:"12",cat:"Comms",hold:"Hughes"}]);const d=mpDigest(S.roster[2]);S.me={pk:"preview",d};view="me";render()`);
    assert.match(a.$("#main").textContent, /My gear/);
    assert.match(a.$("#main").textContent, /Radio/);
  } finally { await a.close(); }
});
