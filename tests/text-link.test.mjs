// 4.91: the no-app text link in the check-in panel.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const open = async (a, phone) => {
  a.w.eval(`S.rc.open=true;S.rc.start=Date.now();S.rc.rid="rc00000001";S.rc.live={key:"read-key-000000000000",ok:true};S.myPh=${JSON.stringify(phone)};S.roster.slice(0,3).forEach((m,i)=>m.phone="80855501"+String(i).padStart(2,"0"));save();view="recall";render()`);
  await sleep(30);
};

test("no-app link is the check-in link without the live flag, and carries the leader's cell", async () => {
  const a = await openApp();
  try {
    await open(a, "8085550100");
    const box = a.$("#nlBox");
    assert.ok(box, "No app? panel is in the check-in section");
    const link = a.w.eval("nlLink()");
    assert.match(link, /#ci=rc00000001&/);
    assert.match(link, /&to=8085550100/);
    assert.doesNotMatch(link, /[#&]l=1/, "text-only: no live flag");
    assert.match(a.w.eval("ciLink()"), /&l=1/, "the normal link stays live");
    const sms = a.$("[data-nlsms]").getAttribute("href");
    assert.match(sms, /^sms:\?&body=/);
    assert.match(decodeURIComponent(sms), /No app needed/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("no cell yet: the panel asks for it instead of making a link that texts nobody", async () => {
  const a = await openApp();
  try {
    await open(a, "");
    assert.ok(a.$("#nlBox"));
    assert.equal(a.$("[data-nlcopy]"), null);
    assert.match(a.$("#nlBox").textContent, /Add your cell/);
  } finally { await a.close(); }
});

test("the link opens a text-only check-in page that needs no app", async () => {
  const a = await openApp({ hash: "ci=rc00000001&u=1ST&to=8085550100", noWait: true });
  try {
    await sleep(300);
    assert.match(a.$("#ciMsg").textContent, /^No app needed\. Opens a text to your leader/);
    assert.ok(a.$('[data-c="1"]'));
  } finally { await a.close(); }
});
