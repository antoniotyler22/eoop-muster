// 1.9 Room sweep: rooms set up once, tapped clear/problem during a check-in, merged across synced phones,
// logged on close-out and in the headcount text.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const LEAD = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";save();`;
const OPEN = `S.rc.open=true;S.rc.start=Date.now()-60000;S.rc.rid="rc00000009";S.rc.res={};S.rc.ci={};S.rc.live=null;save();`;

test("rooms: set up from text with floors, grid shows during a check-in, taps cycle clear → problem → reset", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(LEAD + `view="recall";render();`);
    assert.match(a.$("#main").textContent, /Room sweep/);
    a.$("#rmEdit").click();
    a.$("#rmAdd").value = "Room 101, Room 102\nFloor 2: 201, 202";
    a.$("#rmAddGo").click();
    assert.equal(a.w.eval("S.rooms.length"), 4);
    assert.equal(a.w.eval("S.rooms[3].a"), "Floor 2");
    a.$("#rmDone").click();
    assert.match(a.$("#main").textContent, /4 rooms ready/);
    assert.equal(a.$("[data-swtap]"), null, "no grid before the check-in opens");
    a.w.eval(OPEN + `render();`);
    assert.equal(a.w.eval("document.querySelectorAll('[data-swtap]').length"), 4);
    assert.match(a.$("#main").textContent, /0\/4 clear/);
    const first = a.w.eval("S.rooms[0].id");
    a.$(`[data-swtap="${first}"]`).click();
    assert.equal(a.w.eval(`S.sweep.r["${first}"].s`), "clear");
    assert.equal(a.w.eval("S.sweep.rid"), "rc00000009");
    assert.match(a.$("#main").textContent, /1\/4 clear/);
    a.$(`[data-swtap="${first}"]`).click();           // second tap asks what's wrong
    assert.ok(a.$("#rmNote"));
    a.$("#rmNote").value = "Smoke";
    a.$("#rmNoteGo").click();
    assert.equal(a.w.eval(`S.sweep.r["${first}"].s`), "prob");
    assert.equal(a.w.eval(`S.sweep.r["${first}"].note`), "Smoke");
    assert.match(a.$("#main").textContent, /1 problem/);
    assert.match(a.w.eval("recallText()"), /Rooms: 0\/4 clear, 1 problem: Room 101 \(Smoke\), 3 not checked/);
    a.$(`[data-swtap="${first}"]`).click();           // third tap resets the room
    assert.equal(a.w.eval(`S.sweep.r["${first}"]`), undefined);
    assert.equal(a.w.eval("S.sweep.rid"), "rc00000009");
  } finally { a.close(); }
});

test("rooms: close-out logs the sweep in Drill history and the drill log export", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(LEAD + OPEN + `roomsAdd("A, B, C");view="recall";render();`);
    const ids = a.w.eval("S.rooms.map(r=>r.id)");
    a.$(`[data-swtap="${ids[0]}"]`).click();
    a.$(`[data-swtap="${ids[1]}"]`).click();
    a.$("#rcClose").click();
    await sleep(120);
    const d = JSON.parse(a.w.eval("JSON.stringify(S.drills[0].rooms)"));
    assert.deepEqual(d, { n: 3, clear: 2, prob: 0, probs: [] });
    const csv = a.w.eval("drillCSV()").split("\r\n");
    assert.match(csv[0], /Rooms clear/);
    assert.match(csv[1], /"2\/3"/);
    assert.match(a.w.eval("recallText()"), /Rooms: 2\/3 clear, 1 not checked/);
    // a new check-in starts with every room unchecked
    a.w.eval(`S.rc.open=true;S.rc.rid="rc00000010";S.rc.start=Date.now();save();render();`);
    assert.equal(a.w.eval("Object.keys(S.sweep.r).length"), 0);
  } finally { a.close(); }
});

test("rooms: two synced phones merge their taps room by room; newest tap wins; rooms lists join", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(LEAD + OPEN + `roomsAdd("A, B");S.sync={on:true,baseSig:{},baseMem:{}};save();`);
    const ids = a.w.eval("S.rooms.map(r=>r.id)");
    const now = Date.now();
    a.w.eval(`S.sweep={rid:"rc00000009",r:{"${ids[0]}":{s:"clear",t:${now - 5000},by:"Phone 1"}}};save();`);
    const remote = a.w.eval(`JSON.stringify(Object.assign({},S,{rooms:S.rooms.concat([{id:"rX",n:"C",a:""}]),sweep:{rid:"rc00000009",r:{"${ids[1]}":{s:"prob",t:${now - 4000},by:"Phone 2",note:"Blocked exit"},"${ids[0]}":{s:"clear",t:${now - 9000},by:"Phone 2"}}}}))`);
    a.w.eval(`mergeRemote(JSON.parse(${JSON.stringify(remote)}))`);
    assert.equal(a.w.eval("S.rooms.length"), 3, "the other phone's room is kept");
    assert.equal(a.w.eval(`S.sweep.r["${ids[0]}"].by`), "Phone 1", "newer tap wins");
    assert.equal(a.w.eval(`S.sweep.r["${ids[1]}"].note`), "Blocked exit", "the other phone's tap is kept");
    assert.equal(a.w.eval("roomsLeft()"), 1);
  } finally { a.close(); }
});

test("rooms: the picture list syncs; a picture another phone added shows as a name until this phone has it", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(LEAD + `roomsAdd("A");S.roomPics=[{id:"pZ",n:"Floor plan",t:Date.now()}];save();view="recall";render();`);
    assert.ok(a.$("[data-rmpic]"));
    a.$("#rmEdit").click();
    assert.ok(a.$("#rmPic"), "add-pictures input in setup");
    a.$("[data-rmpicx]").click();
    assert.equal(a.w.eval("S.roomPics.length"), 0);
  } finally { a.close(); }
});
