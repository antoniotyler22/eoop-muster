import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep, waitFor } from "./harness.mjs";

test("leader makes a group: thread opened, kept, and put in the member's My page digest", async () => {
  const calls = [];
  const a = await openApp({ rpc: (n, args) => { calls.push([n, args]); return n === "dm_send" ? 50 : []; } });
  try {
    await a.w.eval(`S.onb=true;S.welcomed=1;S.leaderMode=true;S.role="oic";S.roster[0].pk="p".repeat(24);S.roster[1].pk="q".repeat(24);view="dms";render()`);
    await sleep(60);
    a.$("#gNewBtn").click(); assert.equal(a.$("#gBox").hidden, false);
    a.$("#gName").value = "Shop";
    a.$('[data-gp]').checked = true;
    a.$("#gMake").click();
    await waitFor(() => a.w.eval("S.grps.length") === 1);
    assert.ok(calls.some((c) => c[0] === "dm_open" && c[1].p_inbox === a.w.eval("S.dmInbox")));
    const id = a.w.eval("S.roster.find(m=>S.grps[0].ids.includes(m.id)).id");
    const d = JSON.parse(a.w.eval(`JSON.stringify(window.__v12.mpDigest(S.roster.find(m=>m.id===${JSON.stringify(id)})).grps)`));
    assert.equal(d[0].name, "Shop"); assert.ok(d[0].ek && d[0].k);
    const other = a.w.eval(`JSON.stringify(window.__v12.mpDigest(S.roster.find(m=>!S.grps[0].ids.includes(m.id)&&m.pk)).grps||null)`);
    assert.equal(other, "null", "people outside the group don't get the keys");
  } finally { await a.close(); }
});

test("group message goes out with a device id, mentions are highlighted, unread counts", async () => {
  const sent = [];
  const a = await openApp({ rpc: (n, args) => { if (n === "dm_send") { sent.push(args); return 60; } return []; } });
  try {
    await a.w.eval(`S.onb=true;S.welcomed=1;S.leaderMode=true;S.role="oic";const g={id:"grp12345678901234567",k:"k".repeat(32),ek:"e".repeat(43),name:"Shop",ids:[S.roster[0].id],ok:1};S.grps=[g];
      S.dmMsgs["g:"+g.id]=[{id:5,t:Date.now(),txt:"Hey @all check in",by:"M",n:"Cpl Smith",img:"",aud:"",d:0,dv:"someoneelse1234"}];dmRx.grp(g.id)`);
    await sleep(80);
    assert.ok(a.$(".mn.me"), "@all is highlighted for everyone");
    assert.ok(a.$("[data-v12mn=Smith]"), "mention chip for the other sender");
    a.$("#v12DmTxt").value = "Roger @Smith"; a.$("#v12DmSend").click();
    await waitFor(() => sent.length === 1);
    assert.equal(sent[0].p_id, "grp12345678901234567");
    await sleep(60);
    assert.equal(a.w.eval(`S.dmMsgs["g:grp12345678901234567"].length`), 2);
    assert.equal(a.w.eval(`S.dmSeen["g:grp12345678901234567"]`), 60);
  } finally { await a.close(); }
});

test("member sees the group from the My page digest and reads messages from it", async () => {
  let ct = "";
  const a = await openApp({ rpc: (n) => (n === "dm_get" ? [{ id: 9, ct, created_at: new Date().toISOString() }] : []) });
  try {
    ct = await a.w.eval(`fdEnc("e".repeat(43),{t:"Fall in @all",by:"L",n:"MSgt Lee",dv:"leaderdev123456"})`);
    await a.w.eval(`(async()=>{const m=S.roster[0];const D=mpDigest(m);D.grps=[{id:"grp12345678901234567",k:"k".repeat(32),ek:"e".repeat(43),name:"Shop",n:4}];D.feed=null;D.cofeed=null;D.cks=[];
      S.me={pk:"${"p".repeat(28)}",unit:"UT",d:D,t:Date.now()};S.onb=true;S.welcomed=1;view="dm";render()})()`);
    await sleep(60);
    assert.ok(a.$('[data-v12g="grp12345678901234567"]'), "group chip");
    await a.w.eval(`window.__v12.dmPollGroupsM();0`);
    await a.w.eval(`dmRx.grp("grp12345678901234567");0`);
    await sleep(500);
    assert.equal(a.w.eval(`(S.dmMsgs["g:grp12345678901234567"]||[]).length`), 1);
  } finally { await a.close(); }
});
