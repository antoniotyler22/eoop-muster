// HARP form: every section fillable, signatures, a valid PDF, available to members too.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { openApp, sleep } from "./harness.mjs";

const lead = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;save();`;

test("leader: new form for a Marine, fill every section, PDF is valid and carries the answers", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(lead + `view="board";render()`);
    assert.ok(a.$("#hpGo"), "button on Home");
    a.w.eval(`view="harp";render()`);
    const mid = a.w.eval("S.roster[0].id");
    a.w.eval(`$("#hpFor").value=${JSON.stringify(mid)}`);
    a.$("#hpNew").click(); await sleep(5);
    assert.ok(a.w.eval(`S.harps[0].a.name===S.roster[0].name`), "prefilled from roster");
    const type = (id, v) => a.w.eval(`{const e=$("#${id}");e.value=${JSON.stringify(v)};e.dispatchEvent(new Event("input",{bubbles:true}))}`);
    type("hp_age", "24"); type("hp_from", "2026-11-09T16:30"); type("hp_to", "2026-11-13T07:30");
    type("hp_sncoic", "MSGT BERGAOUI, AFIF"); type("hp_oic", "CWO4 TYLER, ANTONIO");
    a.$('[data-hpp="loc"][data-hv="On Island"]').click(); a.$('[data-hpp="trav"][data-hv="Car"]').click();
    a.$('[data-hpsec="b"]').click(); await sleep(5);
    type("hp_dest", "Gym, Target, beach"); type("hp_plan", "CAC, cash, charged phone, recall roster, and a plan.");
    a.$('[data-hpp="alone"][data-hv="No"]').click(); type("hp_act0", "Swimming"); type("hp_ctl0", "Buddy, lifeguard beach");
    a.w.eval(`{const e=$("#hp_ir0");e.value="Moderate";e.dispatchEvent(new Event("change",{bubbles:true}))}`);
    a.$('[data-hpp="risk"][data-hv="Low"]').click(); a.$('[data-hpp="veh"][data-hv="Yes"]').click();
    a.$('[data-hpsec="p"]').click(); await sleep(5);
    a.$('[data-hppov="7"][data-hv="UNSAT"]').click(); type("hp_pn7", "Replace rear tire");
    a.$("#hpAllSat").click(); await sleep(5);
    a.$('[data-hpsec="t"]').click(); await sleep(5);
    a.$('[data-hppre="0"][data-k="c"][data-hv="Driving"]').click(); a.$('[data-hppre="0"][data-k="k"][data-hv="Car inspected"]').click();
    const h = a.w.eval("S.harps[0]");
    assert.equal(h.pov.filter(x => x.r === "SAT").length, 21); assert.equal(h.pov[7].r, "UNSAT"); assert.equal(h.pov[7].n, "Replace rear tire");
    assert.deepEqual([...h.pre[0].c], ["Driving"]); assert.equal(h.b.acts[0].ir, "Moderate"); assert.deepEqual([...h.a.trav], ["Car"]);
    // a signature image (tiny real JPEG made by the canvas stand-in isn't available in jsdom: use a fixture)
    const jpg = "data:image/jpeg;base64," + fs.readFileSync(new URL("../icon-180.png", import.meta.url)).toString("base64");
    a.w.eval(`S.harps[0].sig.mar.img="";S.harps[0].sig.sup.nm="SSGT DOE"`);
    const bytes = a.w.eval(`Array.from(harpPDF(S.harps[0]).slice(0,8))`);
    assert.equal(String.fromCharCode(...bytes), "%PDF-1.4");
    const txt = a.w.eval(`(()=>{const b=harpPDF(S.harps[0]);let s="";for(const c of b)s+=String.fromCharCode(c);return s})()`);
    for (const want of ["Holiday Accident Reduction Program", "Gym, Target, beach", "MSGT BERGAOUI, AFIF", "Replace rear tire", "POV INSPECTION CHECKLIST", "Pre-Trip Safety Checklist", "/Count 2"]) assert.ok(txt.includes(want), want);
    assert.ok(/xref\n0 \d+/.test(txt) && /%%EOF$/.test(txt));
  } finally { await a.close(); }
});

test("a member's My page has the HARP form too, and its forms never sync", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    assert.ok(a.w.eval(`SYNC_SKIP.includes("harps")&&SYNC_SKIP.includes("harpDef")`));
    a.w.eval(`view="harp";render()`);
    assert.ok(a.$("#hpNew"));
    assert.equal(a.$("#hpFor"), null, "no roster picker on a phone without a roster");
  } finally { await a.close(); }
});

test("a drawn signature goes into the PDF as an image", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    // smallest valid baseline JPEG header with SOF0 8x4 so the writer can read its size
    const r = a.w.eval(`(()=>{const sof=[0xFF,0xD8,0xFF,0xC0,0,11,8,0,4,0,8,1,1,0x11,0,0xFF,0xD9];const b64=btoa(String.fromCharCode(...sof));
      view="harp";render();$("#hpNew").click();S.harps[0].sig.mar.img="data:image/jpeg;base64,"+b64;const u=harpPDF(S.harps[0]);let s="";for(const c of u)s+=String.fromCharCode(c);return [/\\/Subtype \\/Image \\/Width 8 \\/Height 4/.test(s),/\\/Im1 Do/.test(s)]})()`);
    assert.deepEqual([...r], [true, true]);
  } finally { await a.close(); }
});
