// 4.17: welcome shows the day, date and 24-hour time; greetings use the full rank and last name, or Mr/Ms/Mrs.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

test("welcome: the line under the title is the day, date and 24-hour time; a known person is welcomed by full rank", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`showWelcome()`);
    await sleep(50);
    const line = a.$("#wClock").textContent;
    assert.match(line, /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday), (January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2} · \d{4}$/, line);
    assert.equal(a.w.eval("fullRank('CPL')"), "Corporal");
    assert.equal(a.w.eval("fullRank('cwo4')"), "Chief Warrant Officer 4");
    a.w.eval(`S.lgSelf={uid:"u",vf:"v",l:"CPL TYLER, ANTONIO · HQ",user:"tyler",h:"me=x",at:Date.now()};save();document.getElementById("v11Welcome").remove();showWelcome()`);
    await sleep(50);
    assert.equal(a.w.eval("addressName()"), "Corporal Tyler");
    assert.match(a.$("#v11Welcome h1").textContent, /^Welcome, Corporal Tyler$/);
    a.w.eval(`S.title="Ms";save()`);
    assert.equal(a.w.eval("addressName()"), "Ms. Tyler");
    assert.match(a.w.eval("greetLine()"), /^Good (morning|afternoon|evening), Ms\. Tyler$/);
  } finally { a.close(); }
});

test("home: the greeting uses the full rank and last name", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";S.myName="CWO4 TYLER";save();view="board";render();`);
    assert.match(a.$("#main .hm-h").textContent, /^Good (morning|afternoon|evening), Chief Warrant Officer 4 Tyler$/);
  } finally { a.close(); }
});
