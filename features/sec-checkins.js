/* Accounted For 4.31: section (squad) leaders see check-ins as they land.
   The OIC's phone already seals each section's roster for that section leader (put_roster, section key). It now packs
   that section's check-ins from the last 36 h into the same blob (ckPack in app.js); the leader's phone pulls it every
   30 s, on foreground and on a live push (rosterPull), and hands the list to ckFromOIC below.
   On the leader's phone those rows are read-only: the OIC confirms, and the row flips to ✓ Confirmed on the next pull.
   OIC side: a check-in arriving, being confirmed or marked not right republishes the roster (debounced). */
(()=>{
const secLeaderPhone=()=>!!(S.link&&S.link.rk2&&!S.board);
const oicName=()=>String((S.link&&S.link.unit)||"OIC").slice(0,24);
const leader=()=>typeof isLeaderPhone==="function"&&isLeaderPhone()&&!(typeof memberMode==="function"&&memberMode());

/* ---- section leader phone: take the OIC's list ---- */
window.ckFromOIC=function(list,unit){if(!Array.isArray(list)||!secLeaderPhone())return;S.cks=S.cks||[];const by={};S.cks.forEach(x=>{if(x&&x.cid)by[x.cid]=x});
  const clean=(v,n)=>String(v||"").replace(/[<>]/g,"").slice(0,n);let fresh=[],chg=false;
  for(const o of list.slice(0,60)){const cid=clean(o.cid,20);if(!cid)continue;const st=["new","ok","no"].includes(o.state)?o.state:"new";
    const m=o.mid&&S.roster.find(y=>y.uid===String(o.mid)||y.id===String(o.mid));const cur=by[cid];
    if(!cur){const x={cid,src:"oic",mid:m?m.id:"",who:clean(o.who||"Someone",30),sec:clean(o.sec,6),st:clean(o.st,30),oth:clean(o.oth,80),from:clean(o.from,10),to:clean(o.to,10),loc:clean(o.loc,60),note:clean(o.note,120),t:+o.t||Date.now(),state:st,dt:+o.dt||0,by:clean(o.by,24),dnote:clean(o.dnote,80)};
      S.cks.push(x);by[cid]=x;chg=true;if(st==="new")fresh.push(x);continue}
    if(cur.src!=="oic")continue;  // this phone's own check-in rows stay its own
    if(cur.state!==st||(cur.dnote||"")!==clean(o.dnote,80)||(!cur.mid&&m)){cur.state=st;cur.dt=+o.dt||cur.dt||0;cur.by=clean(o.by,24);cur.dnote=clean(o.dnote,80);if(m)cur.mid=m.id;chg=true}}
  if(!chg)return;S.cks.sort((a,b)=>(b.t||0)-(a.t||0));S.cks=S.cks.slice(0,300);
  for(const x of fresh){const line=typeof ckLine==="function"?ckLine(x):x.st;actAdd("📍",x.who+" checked in: "+line+" · "+(unit||oicName())+" confirms","checkins")}
  save();
  if(fresh.length&&leader()){toast("📍 "+(fresh.length===1?fresh[0].who+" checked in":fresh.length+" new check-ins"));try{navigator.vibrate&&navigator.vibrate([80,60,80])}catch(e){}
    try{if(typeof localAlert==="function")localAlert("📍 "+(fresh.length===1?fresh[0].who+" checked in":fresh.length+" check-ins"),(typeof ckLine==="function"&&fresh.length===1?ckLine(fresh[0])+". ":"")+(unit||oicName())+" confirms.","checkins")}catch(e){}}
  if(view==="checkins"||view==="board"||view==="act"){const y=window.scrollY;render();window.scrollTo(0,y)}};

/* ---- section leader phone: the Check-ins screen is read-only for the OIC's rows ---- */
function trimScreen(){if(view!=="checkins"||!secLeaderPhone())return;const m=$("#main");if(!m)return;const U=esc(oicName());
  const rows=(S.cks||[]).filter(x=>x.src==="oic");if(!rows.length)return;
  for(const x of rows){const sel=document.getElementById("ckSt"+x.cid);const row=sel&&sel.closest(".rrow");if(!row)continue;
    row.querySelectorAll("label,select,input,[data-ckok],[data-ckno]").forEach(el=>el.remove());
    row.insertAdjacentHTML("beforeend",`<div class="ph sc-wait">⏳ Waiting on ${U} to confirm</div>`)}
  if(!(S.cks||[]).some(x=>x.state==="new"&&x.src!=="oic")){const all=$("#ckAll");if(all)all.remove();const auto=$("#ckAuto");if(auto){const p=auto.closest(".panel");if(p)p.remove()}
    m.querySelectorAll(".sech h2").forEach(h=>{if(/^To confirm/.test(h.textContent))h.textContent=h.textContent.replace(/^To confirm/,"Waiting on "+oicName())})}
  const inv=m.querySelector('.panel [data-go="invite"]');if(inv&&inv.closest(".panel"))inv.closest(".panel").remove();  // inviting is the OIC's job
  const sub=m.querySelector(".sechead .note");if(sub)sub.textContent="Your people's check-ins, as "+oicName()+" gets them"}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{trimScreen()}catch(e){}try{oicRepublish()}catch(e){}return r}}
{const _b=banner;banner=function(){let h=_b.apply(this,arguments);try{if(secLeaderPhone()&&view!=="checkins"&&view!=="act"&&/check-in/.test(h)&&(S.cks||[]).some(x=>x.state==="new"&&x.src==="oic")&&!(S.cks||[]).some(x=>x.state==="new"&&x.src!=="oic"))
  h=h.replace(/ to confirm\.<\/span><button data-go="checkins">Confirm<\/button>/,` waiting on ${esc(oicName())}.</span><button data-go="checkins">See</button>`)}catch(e){}return h}}
document.addEventListener("click",e=>{if(e.target.id!=="ckAll"||!secLeaderPhone())return;if((S.cks||[]).some(x=>x.state==="new"&&x.src==="oic")&&!(S.cks||[]).some(x=>x.state==="new"&&x.src!=="oic")){e.stopImmediatePropagation();toast(oicName()+" confirms these")}},true);

/* ---- OIC phone: check-in changes reach section leaders ---- */
let lastSig="";
function ckSig(){return (S.cks||[]).slice(0,80).map(x=>x.cid+":"+x.state+":"+(x.mid||"")).join(",")}
function oicRepublish(){if(!S.board||!S.board.sk||typeof rpSchedule!=="function")return;const s=ckSig();if(s===lastSig)return;lastSig=s;rpSchedule()}
if(typeof window.ckIn==="function"){const _ci=window.ckIn;window.ckIn=function(){const r=_ci.apply(this,arguments);try{oicRepublish()}catch(e){}return r}}
if(typeof window.ckApply==="function"){const _ca=window.ckApply;window.ckApply=function(){const r=_ca.apply(this,arguments);try{oicRepublish()}catch(e){}return r}}
if(typeof HELP==="object"&&HELP.checkins&&Array.isArray(HELP.checkins[2]))HELP.checkins[2].push("Section leaders see their people's check-ins on their own phone as they come in; you still confirm.");
{const st=document.createElement("style");st.textContent=`.sc-wait{color:var(--brass);font-weight:700;margin-top:6px}`;document.head.appendChild(st)}
})();
