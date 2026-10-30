/* Accounted For 4.31/4.33: section (squad) leaders see check-ins as they land, and confirm their own section's.
   The OIC's phone (or the server hub) seals each section's roster for that section leader (put_roster, section key) and packs that
   section's check-ins from the last 36 h into the same blob (ckPack in app.js); the leader's phone pulls it every 30 s, on foreground
   and on a live push (rosterPull), and hands the list to ckFromOIC below.
   4.33: the leader confirms or marks "Not right" on their own phone, exactly like the OIC. A confirm puts the status on the leader's
   roster (it already reaches the OIC with the section update) and rides the section's sealed calendar blob (ckOut -> ckFromLeader in
   app.js) so the OIC's check-in row settles, the member's page flips, and every other role sees it. If the OIC decides first, the OIC wins. */
(()=>{
const secLeaderPhone=()=>!!(S.link&&S.link.rk2&&!S.board);
const oicName=()=>String((S.link&&S.link.unit)||"OIC").slice(0,24);
const leader=()=>typeof isLeaderPhone==="function"&&isLeaderPhone()&&!(typeof memberMode==="function"&&memberMode());

/* ---- section leader phone: take the OIC's list ---- */
window.ckFromOIC=function(list,unit){if(!Array.isArray(list)||!secLeaderPhone())return;S.cks=S.cks||[];const by={};S.cks.forEach(x=>{if(x&&x.cid)by[x.cid]=x});
  const clean=(v,n)=>String(v||"").replace(/[<>]/g,"").slice(0,n);let fresh=[],chg=false;
  for(const o of list.slice(0,60)){const cid=clean(o.cid,20);if(!cid)continue;const st=["new","ok","no"].includes(o.state)?o.state:"new";
    const m=o.mid&&S.roster.find(y=>y.uid===String(o.mid)||y.id===String(o.mid));const cur=by[cid];
    if(!cur){const x={oic:st!=="new"?1:0,cid,src:"oic",mid:m?m.id:"",who:clean(o.who||"Someone",30),sec:clean(o.sec,6),st:clean(o.st,30),oth:clean(o.oth,80),from:clean(o.from,10),to:clean(o.to,10),loc:clean(o.loc,60),note:clean(o.note,120),t:+o.t||Date.now(),state:st,dt:+o.dt||0,by:clean(o.by,24),dnote:clean(o.dnote,80)};
      S.cks.push(x);by[cid]=x;chg=true;if(st==="new")fresh.push(x);continue}
    if(cur.src!=="oic")continue;  // this phone's own check-in rows stay its own
    if(cur.state!=="new"&&!cur.oic&&st==="new")continue;  // confirmed here, the OIC hasn't caught up yet: keep it
    if(st!=="new")cur.oic=1;
    if(cur.state!==st||(cur.dnote||"")!==clean(o.dnote,80)||(!cur.mid&&m)){cur.state=st;cur.dt=+o.dt||cur.dt||0;cur.by=clean(o.by,24);cur.dnote=clean(o.dnote,80);if(m)cur.mid=m.id;chg=true}}
  if(!chg)return;S.cks.sort((a,b)=>(b.t||0)-(a.t||0));S.cks=S.cks.slice(0,300);
  for(const x of fresh){const line=typeof ckLine==="function"?ckLine(x):x.st;actAdd("📍",x.who+" checked in: "+line+" · "+(unit||oicName())+" confirms","checkins")}
  save();
  if(fresh.length&&leader()){toast("📍 "+(fresh.length===1?fresh[0].who+" checked in":fresh.length+" new check-ins"));try{navigator.vibrate&&navigator.vibrate([80,60,80])}catch(e){}
    try{if(typeof localAlert==="function")localAlert("📍 "+(fresh.length===1?fresh[0].who+" checked in":fresh.length+" check-ins"),(typeof ckLine==="function"&&fresh.length===1?ckLine(fresh[0])+". ":"")+(unit||oicName())+" confirms.","checkins")}catch(e){}}
  if(view==="checkins"||view==="board"||view==="act"){const y=window.scrollY;render();window.scrollTo(0,y)}};

/* ---- section leader phone: what this phone settled goes back out with the section's calendar blob ---- */
window.ckOut=function(){if(!secLeaderPhone())return[];const now=Date.now();
  return (S.cks||[]).filter(x=>x&&x.src==="oic"&&x.state!=="new"&&!x.oic&&now-(+x.t||0)<36*3600000).slice(0,40).map(x=>({cid:x.cid,state:x.state,dt:+x.dt||0,by:x.by||"",dnote:x.dnote||""}))};
/* ---- section leader phone: Check-ins screen is the OIC's, minus the OIC-only panels ---- */
function trimScreen(){if(view!=="checkins"||!secLeaderPhone())return;const m=$("#main");if(!m)return;
  const auto=$("#ckAuto");if(auto){const p=auto.closest(".panel");if(p)p.remove()}
  const inv=m.querySelector('.panel [data-go="invite"]');if(inv&&inv.closest(".panel"))inv.closest(".panel").remove();  // inviting is the OIC's job
  const sub=m.querySelector(".sechead .note");if(sub)sub.textContent="Confirm your people's check-ins. "+oicName()+" sees what you decide"}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{trimScreen()}catch(e){}try{oicRepublish()}catch(e){}return r}}

/* ---- OIC phone: check-in changes reach section leaders ---- */
let lastSig="";
function ckSig(){return (S.cks||[]).slice(0,80).map(x=>x.cid+":"+x.state+":"+(x.mid||"")).join(",")}
function oicRepublish(){if(!S.board||!S.board.sk||typeof rpSchedule!=="function")return;const s=ckSig();if(s===lastSig)return;lastSig=s;rpSchedule()}
if(typeof window.ckIn==="function"){const _ci=window.ckIn;window.ckIn=function(){const r=_ci.apply(this,arguments);try{oicRepublish()}catch(e){}return r}}
if(typeof window.ckApply==="function"){const _ca=window.ckApply;window.ckApply=function(){const r=_ca.apply(this,arguments);try{oicRepublish()}catch(e){}return r}}
if(typeof HELP==="object"&&HELP.checkins&&Array.isArray(HELP.checkins[2]))HELP.checkins[2].push("Section leaders see their people's check-ins on their own phone as they come in and can confirm their own section's. Whichever of you confirms first settles it.");
{const st=document.createElement("style");st.textContent=`.sc-wait{color:var(--brass);font-weight:700;margin-top:6px}`;document.head.appendChild(st)}
})();
