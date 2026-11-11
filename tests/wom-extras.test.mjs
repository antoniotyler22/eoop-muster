// 4.83.0: links in posts are tappable; post starters and a kept draft.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const FEED = { id: "feedabcdef12", mk: "m".repeat(30), lk: "l".repeat(30) };

test("web addresses, emails and phone numbers in a post are tappable; dates still work", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",ek:"x",unit:"1ST PLT",me:"CPL TEST",sec:"1ST",mine:{5:{c:1,t:Date.now()}},seen:0,
      posts:[{id:5,t:Date.now(),txt:"Sign up at https://example.com/form?a=1&b=2. Call 808-555-0142 or email sgt.smith@example.com. Formation tomorrow 0700."}]}];S.onb=true;S.welcomed=1;fdSel="${FEED.id}";view="feed";render()`);
    const body = a.$("#main article.fc .bd");
    const hrefs = [...body.querySelectorAll("a.womlink")].map(x => x.getAttribute("href"));
    assert.deepEqual(hrefs, ["https://example.com/form?a=1&b=2", "tel:+18085550142", "mailto:sgt.smith@example.com"]);
    assert.equal(body.querySelector("a.womlink").textContent, "https://example.com/form?a=1&b=2", "trailing full stop stays outside the link");
    assert.equal(body.querySelector("a.womlink").getAttribute("rel"), "noopener noreferrer");
    assert.ok(body.querySelector("[data-fdt]"), "the date is still a calendar button");
    assert.ok(!body.querySelector("button a, a a"), "no nesting");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("a post can't smuggle a script link", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",ek:"x",unit:"1ST PLT",me:"CPL TEST",sec:"1ST",mine:{5:{c:1,t:Date.now()}},seen:0,
      posts:[{id:5,t:Date.now(),txt:"javascript:alert(1) <a href=x>hi</a> www.example.org"}]}];S.onb=true;S.welcomed=1;fdSel="${FEED.id}";view="feed";render()`);
    const hrefs = [...a.$$("#main article.fc .bd a")].map(x => x.getAttribute("href"));
    assert.deepEqual(hrefs, ["https://www.example.org"]);
  } finally { await a.close(); }
});

test("starters fill the post box with the [blanks] selected; the draft is kept, restored on a fresh start, cleared when emptied", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    // a draft saved by an earlier session comes back the first time the box opens
    a.w.eval(`S.womDraft={"${FEED.id}":"Range moves to 0900. Bring water."};S.leaderMode=true;S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",lk:"${FEED.lk}",ek:"x",unit:"1ST PLT",main:true,acks:{},un:{},mine:{},seen:0,posts:[]}];fdSel="${FEED.id}";view="feed";render()`);
    assert.equal(a.$("#fdTxt").value, "Range moves to 0900. Bring water.", "draft restored");
    assert.match(a.$("#main").textContent, /Draft kept from last time/);
    assert.equal(a.$$("#womTpl [data-womtpl]").length, 5, "five starters");
    a.$("#fdTxt").value = ""; fdClear(a);
    a.$('[data-womtpl="0"]').click();
    const ta = a.$("#fdTxt");
    assert.match(ta.value, /^Formation \[time\] at \[place\]/);
    assert.equal(a.w.eval(`fdDraft.txt`), ta.value);
    ta.value += " Bring water."; ta.dispatchEvent(new a.w.Event("input", { bubbles: true }));
    await sleep(1000);
    assert.match(a.w.eval(`S.womDraft["${FEED.id}"]`), /Bring water/, "draft kept");
    a.$("#fdTxt").value = ""; fdClear(a);
    await sleep(1000);
    assert.equal(a.w.eval(`S.womDraft["${FEED.id}"]`), undefined, "cleared when the box is emptied");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
function fdClear(a) { a.$("#fdTxt").dispatchEvent(new a.w.Event("input", { bubbles: true })); }
