// 4.92: buddy check
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";
test("silent person gets buddy row; Seen marks them accounted", async () => {
  const a = await openApp();
  try {
    a.w.eval(`S.rc.open=true;S.rc.start=Date.now();S.rc.rid="rc00000001";S.rc.live={key:"k",ok:true};
      const R=recallPool();const sec=R[0].sec;const same=R.filter(m=>m.sec===sec);
      same.forEach((m,i)=>m.phone="80855502"+String(i).padStart(2,"0"));
      same.slice(1,4).forEach(m=>{S.rc.ci[m.id]={c:1,eta:"",t:Date.now()}});S.rc.ci[same[0].id]=undefined;delete S.rc.ci[same[0].id];S.rc.res[same[0].id]="";
      window.__id=same[0].id;save();view="recall";render()`);
    await sleep(40);
    const box = a.$("#bdBox");
    assert.ok(box, "Buddy check panel shows");
    const href = box.querySelector("a").getAttribute("href");
    assert.match(href, /^sms:\+1808555\d+,/);
    assert.match(decodeURIComponent(href), /Eyes on /);
    box.querySelector("[data-bdseen]").click(); await sleep(40);
    assert.equal(a.w.eval(`S.rc.res[window.__id]`), "ok");
    assert.equal(a.w.eval(`S.rc.ci[window.__id].eta`), "Seen by buddy");
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});
