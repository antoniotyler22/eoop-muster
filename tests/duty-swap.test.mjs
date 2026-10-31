// 4.59.0: duty swap board.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const FEED = { id: "feedabcdef12", lk: "l".repeat(30), mk: "m".repeat(30) };
test("leader: a swap request is posted to the Feed; an offer can be approved and the duty roster changes", async () => {
  const posts = [];
  const a = await openApp({ rpc: (fn, b) => { if (fn === "feed_post") { posts.push(b); return 50 + posts.length; } return []; } });
  try {
    a.w.eval(`S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="oic";
      S.roster=[{id:"r1",rank:"SGT",name:"RUIZ, AL",sec:"HQ",status:"On Hand"},{id:"r2",rank:"CPL",name:"PARK, DEE",sec:"HQ",status:"On Hand"}];
      S.duty.rosters=[{id:"d1",name:"Duty NCO",secs:[],att:false,skip:[],order:[],ptr:0,assign:{"2026-11-01":"r1"},excl:{}}];
      S.reqs=[{rid:"rx1",feed:"${FEED.id}",mid:"r1",who:"SGT RUIZ",ty:"Duty swap",from:"2026-11-01",to:"",tm:"",note:"Duty NCO · family thing",t:Date.now(),st:"pending"}];
      S.feeds=[{id:"${FEED.id}",lk:"${FEED.lk}",mk:"${FEED.mk}",ek:"x",unit:"1ST",posts:[],acks:{},mine:{},pins:[]}];fdSel="${FEED.id}";save()`);
    a.w.eval("fdEnc=async(k,o)=>JSON.stringify(o)");
    await a.w.eval("swapPostNow(S.feeds[0])");
    assert.equal(posts.length, 1, "posted to the Feed");
    assert.equal(a.w.eval("S.reqs[0].posted>0"), true);
    a.w.eval(`S.feeds[0].posts=[{id:51,t:Date.now(),txt:"swap",to:{k:"all"},swap:{rid:"rx1",d:"2026-11-01",ro:"Duty NCO",who:"SGT RUIZ",done:""}}];
      S.feeds[0].acks={"51":{r2:{c:1,note:"🔁 take",t:Date.now()}}};view="feed";render()`);
    assert.match(a.$("#main").textContent, /1 offered to take it/);
    a.$('[data-swok="51|r2"]').click(); await sleep(150);
    assert.equal(a.w.eval(`S.duty.rosters[0].assign["2026-11-01"]`), "r2", "roster changed");
    assert.equal(a.w.eval("S.reqs[0].st"), "approved");
    assert.equal(posts.length, 2, "Swap done posted");
    assert.match(a.$("#main").textContent, /Covered by CPL PARK|Duty swap done/);
    assert.deepEqual(a.errors, []);
  } finally { await a.close(); }
});

test("member: I'll take it sends an offer", async () => {
  const sent = [];
  const a = await openApp({ rpc: (fn, b) => { if (fn === "feed_ack") sent.push(b); return []; } });
  try {
    a.w.eval(`S.welcomed=1;S.onb=true;S.feeds=[{id:"${FEED.id}",mk:"${FEED.mk}",ek:"x",unit:"1ST",me:"CPL PARK",posts:[{id:51,t:Date.now(),txt:"swap",to:{k:"all"},swap:{rid:"rx1",d:"2026-11-01",ro:"Duty NCO",who:"SGT RUIZ",done:""}}],mine:{}}];fdSel="${FEED.id}";view="feed";save();render()`);
    a.$('[data-swtake="51"]').click(); await sleep(150);
    assert.equal(sent.length, 1); assert.equal(sent[0].p_note, "🔁 take");
    assert.match(a.$("#main").textContent, /You offered/);
  } finally { await a.close(); }
});
