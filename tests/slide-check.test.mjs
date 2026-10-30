// 4.52.0: slide to check in. Status options stay; the send button becomes a slider.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const lead = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;save();view="board";render();`;

test("pick a status, then the slider (keyboard or drag) checks you in; before a status it is greyed out", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(lead);
    const id = a.w.eval("S.roster[0].id");
    a.w.eval(`{const s=$("#myWho");s.value=${JSON.stringify(id)};s.dispatchEvent(new Event("change",{bubbles:true}))}`);
    a.$("#myCkOpen").click(); await sleep(20);
    assert.ok(a.$("#myCk .slck.off"), "greyed out before a status is picked");
    assert.match(a.$("#myCk .slck").textContent, /Pick a status/);
    assert.ok(a.$("#myCkSend").hidden, "the old button is hidden");
    a.$('[data-myst="SIQ"]').click(); await sleep(20);
    const sl = a.$("#myCk .slck"); assert.ok(sl && !sl.classList.contains("off"), "slider ready after picking");
    assert.match(sl.textContent, /slide to check in/);
    assert.ok(a.$("#myCk [data-myst]"), "status options still there");
    a.w.eval(`$("#myL").value="Barracks"`);
    a.$("#myCk .slck-knob").dispatchEvent(new a.w.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await sleep(400);
    const m = a.w.eval(`S.roster.find(x=>x.id===${JSON.stringify(id)})`);
    assert.equal(m.status, "SIQ"); assert.equal(m.loc, "Barracks");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("a short slide springs back and sends nothing", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(lead);
    const id = a.w.eval("S.roster[0].id");
    a.w.eval(`{const s=$("#myWho");s.value=${JSON.stringify(id)};s.dispatchEvent(new Event("change",{bubbles:true}))}`);
    a.$("#myCkOpen").click(); await sleep(20); a.$('[data-myst="Leave"]').click(); await sleep(20);
    const k = a.$("#myCk .slck-knob");
    const PE = a.w.PointerEvent || a.w.MouseEvent;
    k.dispatchEvent(new PE("pointerdown", { clientX: 10, bubbles: true }));
    k.dispatchEvent(new PE("pointermove", { clientX: 20, bubbles: true }));
    k.dispatchEvent(new PE("pointerup", { clientX: 20, bubbles: true }));
    await sleep(350);
    assert.notEqual(a.w.eval(`S.roster.find(x=>x.id===${JSON.stringify(id)}).status`), "Leave");
  } finally { await a.close(); }
});
