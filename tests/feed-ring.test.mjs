// 4.54.0: leader Feed posts as Ring Receipt cards.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp } from "./harness.mjs";

const FEED = { id: "feedabcdef12", lk: "l".repeat(30), mk: "m".repeat(30) };
test("leader post: ring, section bars, one toolbar; no stat box; Who opens the list; Delete needs two taps", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;
      S.roster=[{id:"r1",rank:"CPL",name:"JONES, BEN",sec:"HQ",status:"On Hand",phone:"8085550101"},{id:"r2",rank:"PFC",name:"PARK, DEE",sec:"1ST",status:"On Hand",phone:"8085550102"},{id:"r3",rank:"SGT",name:"REED, AL",sec:"1ST",status:"On Hand"}];
      S.feeds=[{id:"${FEED.id}",lk:"${FEED.lk}",mk:"${FEED.mk}",ek:"x",unit:"1ST PLT",posts:[{id:7,t:Date.now(),txt:"Ball practice 1130",urg:true,by:"CWO4 TYLER"}],acks:{"7":{r1:{c:1,t:Date.now()}}},mine:{},pins:[]}];
      fdSel="${FEED.id}";view="feed";render()`);
    const card = a.$("article.fc.rr"); assert.ok(card, "ring card");
    assert.ok(card.querySelector(".rr-ring"), "ring in the header");
    assert.match(card.querySelector(".rr-ring").getAttribute("aria-label"), /1 of 3 confirmed/);
    assert.equal(card.querySelectorAll(".rr-seg > div").length, 2, "one bar per section");
    assert.ok(!/^Confirmed$/m.test([...card.querySelectorAll(".fci .ttl")].map(x => x.textContent).join("\n")), "stat box gone");
    const tool = card.querySelector(".rr-tool"); assert.ok(tool);
    assert.match(tool.textContent, /Who/); assert.match(tool.textContent, /Remind 2/); assert.match(tool.textContent, /Pin/); assert.match(tool.textContent, /Delete/);
    assert.ok(tool.querySelector('a.rr-b[href^="sms:"]'), "Remind texts the two who haven't confirmed");
    card.querySelector('.rr-tool [data-fdopen]').click();
    assert.match(a.$("article.fc.rr").textContent, /Not confirmed \(2\)/, "Who opens the list");
    a.$('article.fc.rr .rr-tool [data-fddel]').click();
    assert.match(a.$('article.fc.rr .rr-tool [data-fddel]').textContent, /Tap again/);
    assert.equal(a.$$('[data-fddel]').length, 1, "only one Delete");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
