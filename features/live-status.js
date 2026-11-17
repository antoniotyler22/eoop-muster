/* Accounted For 4.124: live status through the server.
   Every phone on a board sends its status changes straight to the server (part 51) and every other phone picks them up,
   so a change reaches the OIC, section leaders and access-link phones without the OIC's phone being open.
   One sealed row per person; the server sees a hashed person id and a section code, never a name or a status.
   Phones are told the moment something changes (Realtime ping), and also check every 10 seconds.
   Until part 51 is run on the server this stays quiet and the older relay (leader -> OIC -> everyone) keeps working. */
(()=>{
/* what goes to the server (u = when they were last updated) and what counts as a change: the status, duty, dates, place, note, or a refresh tap */
const FIELDS=m=>({st:m.status,du:dutyOf(m),s:m.start||"",e:m.end||"",l:m.loc||"",x:m.detail||"",u:(window.ckTouched&&window.ckTouched(m))||0});
const refreshed=m=>Math.max(+m.ckAt||0,(m.upd&&+m.upd.t)||0,+m.ut||0);
const sigOf=m=>sigF([m.status,dutyOf(m),m.start||"",m.end||"",m.loc||"",m.detail||"",refreshed(m)]);
let busy=false,pushT=null,pidCache={},off=false;
function wire(){if(S.source==="sample"||!Array.isArray(S.roster))return null;
  try{if(typeof memberMode==="function"&&memberMode())return null}catch(e){}
  const B=S.board;if(B&&B.id&&B.rk&&B.ek)return {id:B.id,key:B.rk,ek:B.ek,sec:"",write:S.role!=="view",mine:()=>true,uid:m=>m.id};
  const L=S.link;if(L&&L.board&&L.wk&&L.ek&&L.rk2&&L.pulled)return {id:L.board,key:L.wk,ek:L.ek,sec:L.sec,write:true,mine:m=>L.whole||m.sec===L.mysec,uid:m=>m.uid||(L.own?m.id:"")};
  return null}
async function pidOf(w,m){const u=w.uid(m);if(!u)return "";const k=w.id+"|"+u;if(!pidCache[k])pidCache[k]=await SB.h(w.id,"I:"+u);return pidCache[k]}
const known=()=>{S.stLast=S.stLast||{};return S.stLast};
async function pull(){const w=wire();if(!w||off)return 0;let n=0;
  try{const rows=await SB.rpc("get_status",{p_board:w.id,p_key:w.key,p_after:+S.stAfter||0});if(!Array.isArray(rows))return 0;
    if(!rows.length)return 0;const byPid={};for(const m of S.roster){const p=await pidOf(w,m);if(p)byPid[p]=m}
    const K=known(),who=[],secs=new Set();let after=+S.stAfter||0;
    for(const r of rows){after=Math.max(after,+r.seq||0);const m=byPid[r.pid];if(!m)continue;
      const last=K[r.pid];if(last&&sigOf(m)!==last.sg)continue; /* this phone has a change not sent yet: it wins */
      const localT=Math.max(+(last&&last.t)||0,window.ckTouched?window.ckTouched(m):0);if((+r.t||0)<=localT)continue;
      const o=await fdDec(w.ek,r.ct);if(!o||typeof o!=="object")continue;
      const st=okSt?okSt(o.st):o.st;if(!STATUSES.includes(st))continue;
      const before=m.status;const d=String(o.du||"Full Duty");
      m.status=st;m.duty=d;for(const [k,v] of [["start",o.s],["end",o.e],["loc",o.l],["detail",o.x]]){const nv=String(v||"").slice(0,120);if(nv)m[k]=nv;else delete m[k]}
      const ut=Math.min(Math.max(+o.u||0,+r.t||0),Date.now()+60000);m.upd={t:ut,sec:m.sec};
      K[r.pid]={sg:sigOf(m),t:+r.t||0};n++;secs.add(m.sec);
      if(before!==st)who.push(m.rank+" "+lastOf(m)+" → "+(SHORT[st]||st))}
    S.stAfter=after;
    if(n){if(who.length)try{actAdd("📋",who.slice(0,6).join(", ")+(who.length>6?" +"+(who.length-6)+" more":""),"board")}catch(e){}
      save();try{renderTabs()}catch(e){}
      const a=document.activeElement&&document.activeElement.tagName;if(a!=="INPUT"&&a!=="TEXTAREA"&&a!=="SELECT"){const y=window.scrollY;render();window.scrollTo(0,y)}}
    else rawSave()}
  catch(e){const t=String(e.message||e);if(/could not find|schema cache|404|PGRST202/i.test(t))off=true}
  return n}
async function push(){const w=wire();if(!w||!w.write||off||busy)return;busy=true;
  try{const K=known(),items=[];
    for(const m of S.roster){if(m.sec==="ATT"&&!w.mine(m))continue;if(!w.mine(m))continue;const p=await pidOf(w,m);if(!p)continue;
      const f=FIELDS(m),sg=sigOf(m),last=K[p];if(last&&last.sg===sg)continue;
      const t=last?Date.now():Math.max(1,window.ckTouched?window.ckTouched(m):0)||1;
      items.push({p,s:w.sec||m.sec,c:await fdEnc(w.ek,f),t,_sg:sg})}
    if(!items.length)return;
    for(let i=0;i<items.length;i+=100){const part=items.slice(i,i+100);
      await SB.rpc("put_status",{p_board:w.id,p_key:w.key,p_sec:w.sec||part[0].s,p_items:part.map(x=>({p:x.p,s:x.s,c:x.c,t:x.t}))});
      for(const x of part)K[x.p]={sg:x._sg,t:x.t}}
    rawSave()}
  catch(e){const t=String(e.message||e);if(/could not find|schema cache|404|PGRST202/i.test(t))off=true}
  finally{busy=false}}
async function tick(){if(off)return;await pull();await push()}
window.stPull=pull;window.stPush=push;window.stTick=tick;
window.stReset=()=>{off=false;pidCache={}};
/* a change on this phone goes out right away; a new section leader's link starts reading as soon as the roster has loaded */
{const _s=save;save=function(){const r=_s.apply(this,arguments);try{if(!off&&wire()){clearTimeout(pushT);pushT=setTimeout(push,700)}}catch(e){}return r}}
if(typeof every==="function")every(10000,()=>{tick()},"live-status");
document.addEventListener("visibilitychange",()=>{if(!document.hidden)tick()});
window.addEventListener("online",()=>{off=false;tick()});
/* these phones keep their own place in the server's list */
try{SYNC_SKIP.push("stAfter","stLast")}catch(e){}
})();
