// 4.103.0: accessibility pass + no dead Inbox button on phones that can't have an Inbox.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const lead = async (a, extra = "") => {
  await a.w.eval(`S.feeds=[{id:"feedabcdef12",mk:"m".repeat(30),lk:"l".repeat(30),ek:"",unit:"ALPHA",me:"CPL TEST",sec:"1ST",mine:{},seen:0,posts:[]}];S.myName="CPL TEST";S.mode="military";S.onb=true;S.welcomed=1;S.leaderMode=true;S.source="real";${extra};view="chat";render()`);
  await sleep(200);
};

test("a lowered phone still has the Inbox button; tapping it explains why and opens the fix", async () => {
  const a = await openApp({});
  try {
    await lead(a, `S.lite=1;S.roleFrom="oic";S.role="oic"`);
    const btn = a.$(".ch-seg [data-seg='inbox']");
    assert.ok(btn, "Inbox button is there");
    btn.click(); await sleep(250);
    assert.match(a.$("#toast").textContent, /lowered view/);
    assert.equal(a.w.eval("view"), "data", "goes to the page with Step back up");
    assert.ok(a.$("#alUp"), "Step back up button is on that page");
  } finally { await a.close(); }
});

test("fields and icon buttons get spoken names; tab rows use arrow keys; chat rows say who sent them", async () => {
  const a = await openApp({});
  try {
    await lead(a);
    const d = a.w.document;
    d.getElementById("main").insertAdjacentHTML("beforeend", `<input id="zz" placeholder="Find people"><button id="zb">➤</button><div id="chList"><div class="ch-row first"><small class="ch-n">SGT Ray</small><div class="ch-t">hi<time datetime="2026-01-01T10:00:00Z">10:00</time></div></div><div class="ch-row me"><div class="ch-t">yo<time datetime="2026-01-01T10:01:00Z">10:01</time></div></div></div>`);
    a.w.a11yRun();
    assert.equal(d.getElementById("zz").getAttribute("aria-label"), "Find people");
    assert.equal(d.getElementById("zb").getAttribute("aria-label"), "Send");
    const rows = [...d.querySelectorAll("#chList .ch-row")].map((r) => r.getAttribute("aria-label"));
    assert.deepEqual(rows, ["SGT Ray at 10:00", "You at 10:01"]);
    const tabs = [...d.querySelectorAll(".ch-seg [role=tab]")];
    assert.equal(tabs.filter((t) => t.tabIndex === 0).length, 1, "one tab stop in the switch");
    tabs[0].focus();
    tabs[0].dispatchEvent(new a.w.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await sleep(250);
    assert.equal(a.w.eval("view"), "feed", "arrow right moves to Feed");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("sheet: focus moves in, Esc closes, focus returns", async () => {
  const a = await openApp({});
  try {
    await lead(a);
    const d = a.w.document;
    const opener = d.createElement("button"); opener.id = "op"; opener.textContent = "Open"; d.body.appendChild(opener); opener.focus();
    a.w.eval(`addSheet("")`); await sleep(300);
    const panel = d.querySelector("#sheet .sheet-panel");
    assert.ok(panel.contains(d.activeElement), "focus is inside the sheet");
    assert.equal(d.getElementById("main").getAttribute("aria-hidden"), "true", "page behind is hidden from screen readers");
    d.dispatchEvent(new a.w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await sleep(500);
    assert.ok(d.getElementById("sheet").hidden, "Esc closes the sheet");
    assert.equal(d.activeElement.id, "op", "focus goes back");
    assert.equal(d.getElementById("main").getAttribute("aria-hidden"), null);
  } finally { await a.close(); }
});
