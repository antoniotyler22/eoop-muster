// 4.59/4.60: Scan anything: roster update, HARP form, PDF document, text.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp } from "./harness.mjs";

const LEAD = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.roster=[{id:"r1",rank:"SGT",name:"RUIZ, AL",sec:"HQ",status:"On Hand"},{id:"r2",rank:"CPL",name:"PARK, DEE",sec:"HQ",status:"On Hand"}];SB.afn="ask";save();`;

test("statuses map from what people write", async () => {
  const a = await openApp();
  try {
    assert.equal(a.w.eval(`rosterScanMap("P")`), "On Hand");
    assert.equal(a.w.eval(`rosterScanMap("lv")`), "Leave");
    assert.equal(a.w.eval(`rosterScanMap("dental")`), "Appointment");
  } finally { await a.close(); }
});

test("Scan starts by asking what to make; four choices", async () => {
  const a = await openApp();
  try {
    a.w.eval(LEAD + `view="scan";render()`);
    assert.equal(a.$$("[data-sck]").length, 4);
    a.$('[data-sck="doc"]').click();
    assert.ok(a.$("#scFile[multiple]"), "document takes several pages");
    assert.ok(a.$("#scClean"), "scan look option");
  } finally { await a.close(); }
});

test("roster: rows matched; Apply changes only ticked rows", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(LEAD + `scanOpen("roster")`);
    a.w.eval(`rosterScanReview([{rank:"SGT",name:"RUIZ, AL",status:"Leave"},{rank:"",name:"NOBODY",status:"P"},{rank:"CPL",name:"PARK",status:"P"}])`);
    assert.equal(a.$$(".rs-row").length, 3);
    assert.ok(a.$('[data-rson="0"]').checked); assert.ok(!a.$('[data-rson="1"]').checked); assert.ok(!a.$('[data-rson="2"]').checked);
    a.$("#rsApply").click();
    assert.equal(a.w.eval(`S.roster[0].status`), "Leave");
    assert.equal(a.w.eval(`S.roster[1].status`), "On Hand");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("PDF writer makes a valid multi-page PDF", async () => {
  const a = await openApp();
  try {
    const head = a.w.eval(`(()=>{const c=document.createElement("canvas");c.width=10;c.height=10;const u="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
      const b=scanMakePdf([{url:u,w:1,h:1},{url:u,w:1,h:1}],"Test");let s="";for(const x of b.slice(0,8))s+=String.fromCharCode(x);let t="";for(const x of b)t+=String.fromCharCode(x);return [s,(t.match(/\\/Type \\/Page /g)||[]).length,t.includes("%%EOF")]})()`);
    assert.equal(head[0].slice(0, 5), "%PDF-"); assert.equal(head[1], 2); assert.equal(head[2], true);
  } finally { await a.close(); }
});

test("HARP: a scan fills a new HARP form", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(LEAD + `harpFromScan({a:{name:"RUIZ, AL",rank:"SGT",from:"20261120",to:"20261130",occ:"Annual",loc:"Off Island",trav:["Airplane","Spaceship"]},b:{dest:"Seattle, WA",alone:"No",risk:"Low",acts:[{act:"Hiking",ir:"Moderate",ctl:"Buddy system",rr:"Low"}]}})`);
    const h = a.w.eval("S.harps[0]");
    assert.equal(h.mid, "r1"); assert.equal(h.a.from, "20261120"); assert.equal(h.a.occ, "Annual"); assert.equal(JSON.stringify(h.a.trav), JSON.stringify(["Airplane"]));
    assert.equal(h.b.dest, "Seattle, WA"); assert.equal(h.b.acts[0].ctl, "Buddy system");
    assert.equal(a.w.eval("view"), "harp");
  } finally { await a.close(); }
});
