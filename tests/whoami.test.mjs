// 4.11: everyone on someone else's team picks who they are (or adds themselves); changes carry their name;
// calendar conflicts only for the same person, and events only at the same date, time and people.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const EK = "A".repeat(43);
const LINK = `S.source="link";S.leaderMode=true;S.welcomed=1;S.onb=true;S.mode="military";
  S.roster=S.roster.slice(0,4);S.roster.forEach((m,i)=>{m.sec="HE";m.uid="own"+i});
  S.link={board:"b".repeat(14),wk:"w".repeat(32),ek:"${EK}",sec:"HE",unit:"1ST PLT",mysec:"HE",me:"",sig:"",sent:0,err:"",rk2:"r".repeat(43),pulled:true,pt:Date.now()};save();view="board";render();`;
const OWNER = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.mode="military";S.role="oic";
  S.board={id:"b".repeat(14),rk:"k".repeat(32),wk:"w".repeat(32),ek:"${EK}",after:0,last:{}};save();`;
const push = async (a) => { for (let i = 0; i < 80 && a.w.eval("lkBusy"); i++) await sleep(25); await a.w.eval("linkPush(true)"); };
const calCt = (rpcs) => [...rpcs].reverse().find(([fn]) => fn === "push_cal");

test("an old section-leader link shows the Who are you banner; picking a name sends it with the next update", async () => {
  const rpcs = [];
  const a = await openApp({ rpc: (fn, b) => { rpcs.push([fn, b]); return null; } });
  try {
    a.w.eval(LINK);
    assert.ok(a.$("#whoBan"), "banner for a phone that hasn't picked");
    assert.match(a.$("#whoBan").textContent, /role stays the same/);
    a.$("#whoGo").click();
    const btns = a.$$("[data-whoid]");
    assert.equal(btns.length, 4, "the section's people");
    const id = btns[1].dataset.whoid, want = a.w.eval(`(()=>{const m=S.roster.find(x=>x.uid==="${id}");return m.rank+" "+lastOf(m)})()`);
    btns[1].click();
    await sleep(20);
    assert.equal(a.w.eval("S.who.id"), id, "the OIC's id for that person");
    assert.equal(a.w.eval("S.link.me"), want);
    assert.equal(a.w.eval("S.role||''"), "", "role untouched");
    assert.ok(!a.$("#whoBan"), "banner gone");
    await push(a);
    const o = await a.w.eval(`fdDec("${EK}", ${JSON.stringify(calCt(rpcs)[1].p_ct)})`);
    assert.equal(o.by.n, want);
    assert.equal(o.by.id, id);
  } finally { a.close(); }
});

test("not on the section's roster: add yourself, it goes up with the update, the OIC's phone adds you and logs who", async () => {
  const rpcs = [];
  const a = await openApp({ rpc: (fn, b) => { rpcs.push([fn, b]); return null; } });
  let o;
  try {
    a.w.eval(LINK);
    a.$("#whoGo").click();
    a.$("#whoNew").click();
    a.$("#whoLast").value = "doe"; a.$("#whoFirst").value = "jane"; a.$("#whoPh").value = "(808) 555-0100";
    a.$("#whoRank").value = "SGT";
    a.$("#whoAdd").click();
    await sleep(20);
    assert.equal(a.w.eval(`S.roster.filter(m=>m.name==="DOE, JANE"&&m.sec==="HE"&&m.phone==="8085550100").length`), 1, "on this phone's roster right away");
    assert.equal(a.w.eval("S.link.adds.length"), 1);
    assert.equal(a.w.eval("S.who.n"), "SGT DOE");
    await push(a);
    o = await a.w.eval(`fdDec("${EK}", ${JSON.stringify(calCt(rpcs)[1].p_ct)})`);
    assert.equal(o.a[0].name, "DOE, JANE");
    assert.ok(o.c.some((e) => e.f === "added" && e.by === "SGT DOE"), "their change log goes up too");
  } finally { a.close(); }
  const b = await openApp({ rpc: () => null });
  try {
    b.w.eval(OWNER);
    const ch = b.w.eval(`whoCalIn("HE", ${JSON.stringify(o)})`);
    assert.equal(ch, true);
    const m = JSON.parse(b.w.eval(`JSON.stringify(S.roster.find(m=>m.name==="DOE, JANE"))`));
    assert.equal(m.sec, "HE");
    assert.equal(m.rank, "SGT");
    assert.equal(m.phone, "8085550100");
    assert.match(b.w.eval(`S.seen["${m.id}"].how`), /HE section leader link/, "shows as on the app");
    assert.ok(b.w.eval(`S.act.some(x=>/added themselves/.test(x.txt))`));
    assert.ok(b.w.eval(`S.chg.some(e=>e.by==="SGT DOE"&&e.f==="added"&&e.src==="HE section leader link")`), "who changed what");
    b.w.eval(`whoCalIn("HE", ${JSON.stringify(o)})`);
    assert.equal(b.w.eval(`S.roster.filter(m=>m.name==="DOE, JANE").length`), 1, "never added twice");
  } finally { b.close(); }
});

test("a change made on an access phone is logged with that person's name; arriving data is not", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(`S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="sncoic";S.who={id:S.roster[0].id,n:"SSGT ROE"};save();`);
    a.w.eval(`document.body.click();S.roster[1].status=S.roster[1].status==="Leave"?"On Hand":"Leave";save();`);
    const e = JSON.parse(a.w.eval("JSON.stringify(S.chg[0])"));
    assert.equal(e.by, "SSGT ROE");
    assert.equal(e.f, "status");
    assert.equal(e.src, "SNCOIC (can edit) access link");
    assert.equal(e.mid, a.w.eval("S.roster[1].id"));
    const n = a.w.eval("S.chg.length");
    await sleep(2600);
    a.w.eval(`S.roster[2].status="TAD";save();`);
    assert.equal(a.w.eval("S.chg.length"), n, "no tap on this phone: not logged as theirs");
    a.w.eval(`pid=S.roster[1].id;view="p";render()`);
    assert.match(a.$("#main").textContent, /Changes and who made them[\s\S]*SSGT ROE/);
  } finally { a.close(); }
});

test("syncing keeps both phones' change logs and on-the-app marks", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(`S.source="mol";S.role="oic";S.chg=[{id:"aaa",t:Date.now()-1000,by:"OIC",f:"status",mid:"x"}];S.seen={p1:{t:5,who:"A",how:"Feed link"}};
      S.sync={on:false,baseSig:{chg:sig([]),seen:sig({})},baseMem:{}};
      mergeRemote({roster:S.roster,chg:[{id:"bbb",t:Date.now(),by:"SSGT ROE",f:"duty",mid:"y"}],seen:{p1:{t:9,who:"A",how:"View only access link"},p2:{t:3,who:"B",how:"Feed link"}}});`);
    assert.deepEqual(JSON.parse(a.w.eval("JSON.stringify(S.chg.map(e=>e.id).sort())")), ["aaa", "bbb"]);
    assert.equal(a.w.eval("S.seen.p1.how"), "View only access link", "newest wins");
    assert.equal(a.w.eval("S.seen.p2.who"), "B");
  } finally { a.close(); }
});

test("a Feed link picks from names only (part 28), and the leader sees them on the app", async () => {
  const reqs = [];
  let A;
  const a = (A = await openApp({ rpc: (fn, b) => {
    if (fn === "feed_names_get") return [{ ct: A.w.__ct, updated_at: new Date().toISOString() }];
    if (fn === "feed_req") reqs.push(b);
    return null;
  } }));
  try {
    await a.w.eval(`(async()=>{window.__ct=await fdEnc("${EK}",{v:1,ms:[{i:"m1",r:"SGT",n:"SMITH, JOHN",s:"HE"},{i:"m2",r:"CPL",n:"LEE, ANN",s:"HQ"}]})})()`);
    a.w.eval(`S.welcomed=1;S.onb=true;S.mode="military";S.feeds=[{id:"feedabcdef12",mk:"${"m".repeat(30)}",ek:"${EK}",unit:"1ST PLT",posts:[],seen:0,me:"SGT SMITH",mine:{}}];save();view="feed";render();`);
    assert.ok(a.$("#whoBan"), "old Feed link sees the banner");
    await sleep(1600); a.w.eval("closeSheet()"); // the first-run welcome (decided before this test set up the phone) is out of the way
    a.$("#whoGo").click();
    for (let i = 0; i < 80 && a.$$("[data-whoid]").length < 2; i++) await sleep(25);
    const btns = a.$$("[data-whoid]");
    assert.equal(btns.length, 2);
    assert.doesNotMatch(a.$("#whoList").textContent, /\d{3}/, "no phone numbers");
    a.$("[data-whoid='m1']").click();
    for (let i = 0; i < 40 && !reqs.length; i++) await sleep(25);
    assert.equal(a.w.eval("S.feeds[0].mid"), "m1");
    assert.equal(a.w.eval("S.feeds[0].me"), "SGT SMITH");
    const o = await a.w.eval(`fdDec("${EK}", ${JSON.stringify(reqs[0].p_ct)})`);
    assert.equal(o.k, "who");
    assert.equal(o.mid, "m1");
  } finally { a.close(); }
  const b = await openApp({ rpc: () => null });
  try {
    b.w.eval(OWNER + `S.roster[0].id="m1";`);
    b.w.eval(`whoIn(S.feeds[0]||{},{k:"who",mid:"m1",me:"SGT SMITH"},{created_at:new Date().toISOString()})`);
    assert.equal(b.w.eval(`S.seen.m1.how`), "Feed link");
    b.w.eval(`whoIn({},{k:"join",rid:"j1",rank:"CPL",name:"NEW, GUY",sec:"HQ",phone:"8085550111",me:"CPL NEW"},{})`);
    b.w.eval(`whoIn({},{k:"join",rid:"j1",rank:"CPL",name:"NEW, GUY",sec:"HQ",phone:"8085550111",me:"CPL NEW"},{})`);
    assert.equal(b.w.eval(`S.roster.filter(m=>m.name==="NEW, GUY"&&m.sec==="HQ"&&m.rank==="CPL"&&m.phone==="8085550111").length`), 1, "added once");
    assert.ok(b.w.eval(`S.chg.some(e=>e.f==="added"&&e.by==="CPL NEW"&&e.src==="Feed link")`));
  } finally { b.close(); }
});

test("the leader's phone shares names only with its Feed", async () => {
  const puts = [];
  const a = await openApp({ rpc: (fn, b) => { if (fn === "feed_names_put") puts.push(b); return null; } });
  try {
    a.w.eval(OWNER + `S.roster[0].phone="8085550199";S.feeds=[{id:"feedabcdef12",mk:"${"m".repeat(30)}",lk:"${"l".repeat(30)}",ek:"${EK}",unit:"1ST",posts:[],seen:0}];save();`);
    await a.w.eval("whoNamesPub(true)");
    assert.equal(puts.length, 1);
    const o = await a.w.eval(`fdDec("${EK}", ${JSON.stringify(puts[0].p_ct)})`);
    assert.equal(o.ms.length, a.w.eval("S.roster.length"));
    assert.deepEqual(Object.keys(o.ms[0]).sort(), ["i", "n", "r", "s"]);
    assert.doesNotMatch(JSON.stringify(o), /8085550199/);
  } finally { a.close(); }
});

test("My page and the owner's own phone are never asked who they are", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(OWNER + `view="board";render();`);
    assert.equal(a.w.eval("whoNeed()"), null);
    assert.ok(!a.$("#whoBan"));
    a.w.eval(`S.board=null;S.source="sample";S.leaderMode=false;S.me={pk:"p".repeat(30),unit:"1ST",d:null,t:0};S.feeds=[{id:"feedabcdef12",mk:"${"m".repeat(30)}",ek:"${EK}",unit:"1ST",posts:[],seen:0,hub:1,mid:"x"}];save();`);
    assert.equal(a.w.eval("whoNeed()"), null);
  } finally { a.close(); }
});

test("calendar conflicts: same person on the same day; events only at the same date, time and people", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(OWNER + `S.roster=S.roster.slice(0,3);S.roster.forEach(m=>{m.sec="HE";m.status="On Hand";m.cal=[];m.duty="Full Duty"});S.roster[2].sec="HQ";
      const d=new Date();d.setDate(d.getDate()+2);window.__D=dkey(d);save();`);
    const set = (evs) => a.w.eval(`S.events=${JSON.stringify(evs)}.map(e=>Object.assign({date:window.__D,type:"",att:false,done:{}},e));save();upcomingConflicts(7).filter(c=>c.kind==="event").length`);
    assert.equal(set([{ id: "e1", name: "Range", tm: "08:00", secs: ["HE"] }, { id: "e2", name: "PT test", tm: "08:00", secs: ["HE"] }]), 4, "same date, time and people: both events flag both people");
    assert.equal(set([{ id: "e1", name: "Range", tm: "08:00", secs: ["HE"] }, { id: "e2", name: "PT test", tm: "13:00", secs: ["HE"] }]), 0, "different time: not a conflict");
    assert.equal(set([{ id: "e1", name: "Range", tm: "08:00", secs: ["HE"] }, { id: "e2", name: "PT test", tm: "08:00", secs: ["HQ"] }]), 0, "different people: not a conflict");
    assert.equal(set([{ id: "e1", name: "Range", secs: ["HE"] }, { id: "e2", name: "PT test", secs: ["HE"] }]), 0, "no times: not a conflict");
    a.w.eval(`S.roster[0].cal=[{id:"c1",d:window.__D,ty:"LEAVE",ti:"Leave"}];save();`);
    assert.equal(set([{ id: "e1", name: "Range", tm: "08:00", secs: ["HE"] }]), 1, "the person is somewhere else that day");
    a.w.eval(`S.roster[0].cal=[];S.roster[1].duty="LIMDU";S.events=[{id:"e1",name:"Range",date:window.__D,tm:"08:00",secs:["HE"],att:false,done:{}}];save();evOpen="e1";view="events";render();`);
    assert.match(a.$("#main").textContent, /No conflicts on the event date/, "LIMDU isn't being somewhere else");
    assert.match(a.$("#main").textContent, /08:00/, "event shows its time");
    assert.equal(a.w.eval(`busyOn(S.roster[0],window.__D,{}).filter(x=>x.ty==="EVENT").length`), 1, "adding something for that person that day still warns");
  } finally { a.close(); }
});

test("new events take an optional start time", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(OWNER + `evNew=true;view="events";render();`);
    assert.ok(a.$("#evTm"), "time field");
    a.$("#evName").value = "Rifle qual"; a.$("#evTm").value = "07:30";
    a.$("#evForm").dispatchEvent(new a.w.Event("submit", { bubbles: true, cancelable: true }));
    await sleep(10);
    assert.equal(a.w.eval(`S.events.find(e=>e.name==="Rifle qual").tm`), "07:30");
  } finally { a.close(); }
});

test("a co-leader's Feed posts carry the name they picked, not the OIC's synced 'post as'; posts are logged", async () => {
  const a = await openApp({ rpc: () => null });
  try {
    a.w.eval(`S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.role="co";S.postAs="EOP OIC";S.who={id:S.roster[0].id,n:"SSGT ROE"};
      S.feeds=[{id:"feedabcdef12",mk:"${"m".repeat(30)}",lk:"${"l".repeat(30)}",ek:"${EK}",unit:"1ST",posts:[],seen:0}];save();`);
    assert.equal(a.w.eval("fdBy(S.feeds[0])"), "SSGT ROE");
    a.w.eval(`S.role="oic";`);
    assert.equal(a.w.eval("fdBy(S.feeds[0])"), "EOP OIC", "the owner's own override still works on the owner's phone");
    a.w.eval(`S.role="co";document.body.click();`);
    await a.w.eval(`SB.rpc("feed_post",{p_feed:"feedabcdef12"})`);
    const e = JSON.parse(a.w.eval("JSON.stringify(S.chg[0])"));
    assert.equal(e.f, "feed");
    assert.equal(e.by, "SSGT ROE");
  } finally { a.close(); }
});
