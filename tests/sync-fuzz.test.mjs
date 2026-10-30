// Two phones on one recovery code add, delete and edit people at random and sync in random order.
// When everything has settled, both phones must hold exactly the people nobody deleted on purpose.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp } from "./harness.mjs";

test("two synced phones never lose a person nobody deleted (random add/edit/delete/sync)", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    const bad = a.w.eval(`(()=>{
      const clone=o=>JSON.parse(JSON.stringify(o));
      const mul=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
      S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.sync={on:true,code:"X",ver:0};save();
      const seedState=clone(S);const fails=[];
      for(let seed=1;seed<=300;seed++){
        const r=mul(seed);const pick=a=>a[Math.floor(r()*a.length)];
        const put=o=>{for(const k of Object.keys(S))delete S[k];Object.assign(S,clone(o))};
        put(seedState);S.roster=Array.from({length:8},(_,j)=>({id:"b"+j,name:"BASEPERSON"+j+", ANN",rank:"SGT",sec:"HQ",status:"On Hand"}));S.gone={};S.back={};S.sync={on:true,code:"X",ver:0};
        let server={R:null,ver:0};
        const first=clone(S);const P=[clone(first),clone(first)];
        // seed server
        put(P[0]);{const R=syncObj();server={R:clone(R),ver:1};S.sync.ver=1;setBase(R);S.sync.last=sig(R);P[0]=clone(S)}
        put(P[1]);{mergeRemote(clone(server.R));S.sync.ver=1;P[1]=clone(S)}
        const E=new Set(P[0].roster.map(m=>m.id));let k=0;const log=[];
        const push=i=>{put(P[i]);if(S.sync.ver<server.ver){mergeRemote(clone(server.R));S.sync.ver=server.ver}
          const R=syncObj();server={R:clone(R),ver:server.ver+1};S.sync.ver=server.ver;setBase(R);S.sync.last=sig(R);P[i]=clone(S)};
        const pull=i=>{put(P[i]);if(server.ver>S.sync.ver){mergeRemote(clone(server.R));S.sync.ver=server.ver;if(sig(syncObj())!==S.sync.last){P[i]=clone(S);push(i);return}}P[i]=clone(S)};
        const step=()=>{const i=r()<.5?0:1;const op=r();log.push(i+":"+op.toFixed(2));put(P[i]);
          if(op<.22){const id="n"+seed+"_"+(k++);S.roster.push({id,name:"ZED"+id+", ANN",rank:"SGT",sec:"HQ",status:"On Hand"});E.add(id);save();P[i]=clone(S)}
          else if(op<.40&&S.roster.length>2){const m=pick(S.roster);logLoad("Removed people","x");S.roster=S.roster.filter(x=>x.id!==m.id);E.delete(m.id);save();P[i]=clone(S)}
          else if(op<.62&&S.roster.length){const m=pick(S.roster);m.status=pick(["Leave","On Hand","TAD","Appointment"]);save();P[i]=clone(S)}
          else if(op<.82){P[i]=clone(S);push(i)}
          else{P[i]=clone(S);pull(i)}};
        for(let n=0;n<30;n++)step();
        // settle
        push(0);pull(1);push(1);pull(0);push(0);pull(1);push(1);pull(0);
        for(let i=0;i<2;i++){const ids=new Set(P[i].roster.map(m=>m.id));
          const lost=[...E].filter(id=>!ids.has(id)),extra=[...ids].filter(id=>!E.has(id));
          if(lost.length||extra.length){fails.push({seed,phone:i,lost,extra,log:log.slice(-12).join(" ")})}}
        if(fails.length>=5)break}
      return JSON.stringify(fails)})()`);
    const f = JSON.parse(bad);
    assert.deepEqual(f, [], "people lost or resurrected: " + JSON.stringify(f.slice(0, 3)));
  } finally { a.close(); }
});
