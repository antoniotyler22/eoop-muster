/* Accounted For 4.104.0 — My Page, profile style (the "tab 14" design).
   Everyone has a My Page, laid out like a profile: a ring avatar with a check badge that says whether you're accounted for,
   Plan / Events / Posts counts, your status, Edit / Change status / SOS buttons, the slide-to-check-in card, then three tabs:
   Plan (the Plan of the Day, what needs you, the next 14 days), Calendar (the week and what's coming) and Feed (Word of Mouth).
   - Co-leaders, editors, section leaders and view-only phones open the app on My Page, and My Page takes the first slot in the
     bottom bar where Home was. The OIC's phone still opens on Home; the OIC reaches the same page from the person button at the top.
     Home (the team board) stays one tap away on a card on My Page.
   - The old My page items (SOS, profile photo, quiet hours, account) moved behind "Edit my page".
   - Members keep their own page and get the profile header on top of it. */
(()=>{
const DAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const plus=n=>{const d=new Date();d.setDate(d.getDate()+n);return iso(d)};
const pd=s=>{const m=String(s||"").match(/^(\d{4})-(\d{2})-(\d{2})/);return m?new Date(+m[1],+m[2]-1,+m[3]):null};
const memberM=()=>typeof memberMode==="function"&&memberMode();
/* the OIC's phone (and the incoming OIC) keeps Home as its front door; everyone below that lands on My Page */
const picOwner=()=>!S.link&&!S.lite&&(!S.role||S.role==="oic"||S.role==="newoic");
const lowLeader=()=>!memberM()&&!picOwner()&&S.level!=="co";
const real=()=>S.source!=="sample"&&Array.isArray(S.roster)&&S.roster.length>0;
let tab="plan",landed=false,touched=false,setOpen=false;

if(typeof IC==="object")IC.mpset='<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>';
if(typeof IC==="object")IC.mypg='<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="9.5" r="3"/><path d="M6.5 18.5c1.2-2.4 3.2-3.5 5.5-3.5s4.3 1.1 5.5 3.5"/>';

/* ---------- who am I, and my digest ---------- */
function selfRow(){try{const R=S.roster||[];
  if(S.who&&S.who.id){const w=R.find(m=>m.id===S.who.id||m.uid===S.who.id);if(w)return w}
  const parts=String(S.myName||"").toUpperCase().trim().split(/\s+/),n=parts.pop();if(!n||n.length<2)return null;const rk=parts[0]||"";
  const L=R.filter(m=>String(m.name||"").split(",")[0].trim().toUpperCase()===n);
  return L.find(m=>rk&&String(m.rank||"").toUpperCase()===rk)||L[0]||null}catch(e){return null}}
function digest(own){
  if(memberM()||!own){const D=S.me&&S.me.d;return D||null}
  try{const f=typeof mpDigest==="function"?mpDigest:(window.__v12&&window.__v12.mpDigest);return f?f(own):null}catch(e){return null}}
const dn=s=>{const d=pd(s);return d?`<span class="mp-dn"><b>${d.getDate()}</b><span>${MON[d.getMonth()].toUpperCase()}</span></span>`:`<span class="mp-dn"><b>•</b></span>`};
const tyName=t=>({DUTY:"Duty",LEAVE:"Leave",APPT:"Appointment",TAD:"TAD",DUE:"Due",OTHER:"",EVENT:"Event"})[t]||(typeof ctype==="function"?(ctype(t)||[])[1]||t:t);
function items(D){const out=[];if(!D)return out;
  for(const e of D.cal||[])out.push({d:e.d,end:e.end||"",tm:e.tm||"",t:e.ti,s:tyName(e.ty),ty:e.ty});
  for(const x of D.duties||[])out.push({d:x.d,t:x.r,s:"Duty · you",ty:"DUTY"});
  for(const ev of D.events||[])out.push({d:ev.d,t:ev.n,s:ev.all?"Event · everyone":"Event · "+(D.sec||"your section"),ty:"EVENT"});
  return out.sort((a,b)=>(a.d+(a.tm||"99")).localeCompare(b.d+(b.tm||"99")))}
const inDay=(x,k)=>x.d<=k&&(x.end||x.d)>=k;
const within=(L,a,b)=>L.filter(x=>(x.d>=a&&x.d<=b)||(x.end&&x.d<=a&&x.end>=a));
const row=(lead,t,sub)=>`<div class="mp-row">${lead}<span class="mp-rt"><b>${t}</b>${sub?`<small>${sub}</small>`:""}</span></div>`;
const dayLabel=k=>{const d=pd(k);if(!d)return "";const t=iso(new Date());return (k===t?"TODAY · ":k===plus(1)?"TOMORROW · ":"")+DAYS[d.getDay()].slice(0,3).toUpperCase()+" "+d.getDate()+" "+MON[d.getMonth()].toUpperCase()};

/* ---------- the profile header ---------- */
const initials=(own,D)=>{const raw=String((own&&own.name)||(D&&D.name)||S.myName||"").trim();if(!raw)return "ME";
  if(raw.includes(",")){const [l,f]=raw.split(",");return ((f||"").trim().charAt(0)+l.trim().charAt(0)).toUpperCase()||"ME"}
  const w=raw.split(/\s+/);return (w[0].charAt(0)+(w.length>1?w[w.length-1].charAt(0):"")).toUpperCase()};
const nameLine=(own,D)=>{try{const a=typeof addressName==="function"?addressName():"";if(a)return a}catch(e){}
  const raw=String((own&&own.name)||(D&&D.name)||"").split(",")[0].trim();const rk=(own&&own.rank)||(D&&D.rank)||"";
  return ((typeof fullRank==="function"?fullRank(rk):rk)+" "+raw.toLowerCase().replace(/(^|\s|-)\S/g,c=>c.toUpperCase())).trim()||"My Page"};
const photoFor=()=>{try{return typeof afPhoto==="function"?afPhoto(S.who&&S.who.n||S.myName||""):""}catch(e){return ""}};
function ckState(own){const t=own&&own.ckAt;return {at:t||0,ok:!!t&&Date.now()-t<24*3600000}}
function avatar(own,D){const p=photoFor(),ck=ckState(own);
  const face=p?`<img src="${esc(p)}" alt="" class="mp-face">`:`<span class="mp-face">${esc(initials(own,D))}</span>`;
  const bd=ck.ok?`<span class="mp-bd ok" title="Accounted for">${svg("check",15)}</span>`:own?`<span class="mp-bd no" title="Not checked in today">!</span>`:"";
  return `<div class="mp-av"><div class="mp-ring">${face}</div>${bd}</div>`}
function stats(D){const k=iso(new Date()),L=items(D);
  const plan=within(L,k,plus(7)).length,ev=within(L,k,plus(14)).filter(x=>x.ty==="EVENT").length;
  let posts=0;try{const f=typeof fdCur==="function"?fdCur():null;if(f&&Array.isArray(f.posts))posts=f.posts.filter(p=>!p.pod&&(typeof fdForMe!=="function"||fdForMe(f,p))).length}catch(e){}
  const c=(n,l)=>`<div><b>${n}</b><span>${l}</span></div>`;return c(plan,"Plan")+c(ev,"Events")+c(posts,"Posts")}
function statusLine(D){if(!D)return "";const dot=`<i style="background:var(${(typeof SVAR==="object"&&SVAR[D.status])||"--line"})"></i>`;
  let s=esc(D.statusShort||D.status||"");try{if(D.end&&D.status!=="On Hand")s+=" · through "+esc(short(parseD(D.end)))}catch(e){}
  s+=D.duty&&D.duty!=="Full Duty"?` · <b class="mp-warn">${esc(D.duty)}</b>`:" · Full duty";return `<div class="mp-st">${dot}${s}</div>`}
function unitLine(own,D){const u=D?[D.sec,D.secName,D.unit].filter(Boolean).join(" · "):"";return esc(u||(typeof unitName==="function"?unitName():""))}
function head(own,D,forMember){
  return `<section class="mp-head" aria-label="My Page">
    <div class="mp-top"><span class="mp-eye">MY PAGE</span></div>
    <div class="mp-prof">${avatar(own,D)}<div class="mp-stats">${stats(D)}</div></div>
    <div class="mp-name">${esc(nameLine(own,D))}</div><div class="mp-unit">${unitLine(own,D)}</div>${statusLine(D)}
    <div class="mp-btns"><button type="button" class="mp-b" data-mpgo="${forMember?"photo":"set"}">Edit my page</button><button type="button" class="mp-b" data-mpgo="ck">Change status</button><button type="button" class="mp-b mp-sos" data-go="sos">SOS</button></div></section>`}

/* ---------- check-in (slide) ---------- */
function ckBlock(own){
  if(!real())return `<div class="card"><p class="note" style="margin:0">Your page fills in once you're on a team roster. Add your people in Tools, or open the link your leader sent.</p></div>`;
  if(typeof window.myCkShow!=="function"||!window.myCkShow()||typeof window.myCkCard!=="function")return "";
  const ck=ckState(own);
  const top=`<div class="mp-ckh"><span class="mp-eye" style="color:${ck.ok?"var(--s-onhand)":"var(--brass)"}">${ck.ok?"ACCOUNTED FOR":"NOT CHECKED IN TODAY"}</span><h2>${ck.ok?"You're accounted for":"Are you accounted for?"}</h2><p class="note" style="margin:2px 0 0">${ck.ok?"Checked in "+esc(ago(ck.at))+". Slide again any time your status changes.":"Pick your status, then slide to check in."}</p></div>`;
  return `<div class="mp-ck">${top}${window.myCkCard()}</div>`}
function teamCard(){if(!real()||typeof counts!=="function")return "";let T;try{T=counts().T}catch(e){return ""}if(!T||!T.total)return "";
  const on=T["On Hand"]||0;return `<button type="button" class="mp-team" data-go="board"><span><b>Team board</b><small>${on} of ${T.total} on hand</small></span><span aria-hidden="true">▸</span></button>`}

/* ---------- the three tabs ---------- */
function highlights(D){const k=iso(new Date());const planN=within(items(D),k,plus(7)).length;let un=0;try{un=typeof fdUnread==="function"?fdUnread():0}catch(e){}
  const h=(ic,l,tabk,n)=>`<button type="button" class="mp-hl" data-mptab="${tabk}"><span class="mp-hc">${svg(ic,24)}${n?`<i class="mp-hn">${n>9?"9+":n}</i>`:""}</span><span>${l}</span></button>`;
  return `<div class="mp-hls">${h("plan","Plan","plan",planN)}${h("cal","Calendar","cal",0)}${h("feed","Feed","feed",un)}<button type="button" class="mp-hl" data-mpgo="quiet"><span class="mp-hc">${svg("today",24)}</span><span>Quiet</span></button><button type="button" class="mp-hl" data-mpgo="set"><span class="mp-hc">${svg("mpset",24)}</span><span>Settings</span></button></div>`}
function tabs(){return `<div class="mp-tabs" role="tablist">${[["feed","Feed"],["plan","Plan"],["cal","Calendar"]].map(([k,l])=>`<button type="button" role="tab" aria-selected="${tab===k}" data-mptab="${k}">${svg(k==="feed"?"feed":k==="plan"?"log":"plan",20)}${l}</button>`).join("")}</div>`}
function planTab(D){let h="";
  if(!D)return `<div class="card"><p class="note" style="margin:0">Pick which one is you above and your plan shows up here.</p></div>`;
  if(D.pod){const L=String(D.pod.txt||"").split("\n");h+=`<div class="card tone-a" style="border:0;margin-top:0"><div style="font-size:12px;font-weight:800;letter-spacing:.08em">PLAN OF THE DAY</div><div style="white-space:pre-wrap;font-weight:600;line-height:1.5;color:var(--ink)">${esc(L.slice(1).join("\n"))}</div><div class="note" style="margin:0">${esc(L[0]||"")}</div></div>`}
  const ny=[];for(const x of (D.due||[]).filter(x=>x.st==="over"))ny.push(row(`<span class="mp-dn bad"><b>!</b></span>`,esc(x.n),esc(x.txt)));
  for(const x of D.owe||[])ny.push(row(`<span class="mp-dn warn"><b>✓</b></span>`,esc(x.n),"You still owe"+(x.d?" · "+esc(x.d):"")));
  for(const r of (D.reqs||[]).filter(r=>r.st!=="approved"&&r.st!=="denied"))ny.push(row(`<span class="mp-dn"><b>⏳</b></span>`,esc(r.ty)+" request",esc(typeof reqDates==="function"?reqDates(r):"")+" · waiting"));
  if(ny.length)h+=`<div class="mp-lab">NEEDS YOU</div><div class="card ny mp-list">${ny.join("")}</div>`;
  const k=iso(new Date()),L=within(items(D),k,plus(14));
  h+=`<div class="mp-lab">NEXT 14 DAYS</div>`+(L.length?`<div class="card ny mp-list">${L.slice(0,12).map(x=>{const d=pd(x.d);return row(dn(x.d),(x.tm?esc(String(x.tm).replace(":",""))+" · ":"")+esc(x.t),(d?DAYS[d.getDay()].slice(0,3)+" · ":"")+esc(x.s))}).join("")}</div>`:`<div class="card"><p class="note" style="margin:0">Nothing on your plan for the next 14 days.</p></div>`);
  return h}
function calTab(D){const L=items(D),now=new Date(),mon=new Date(now);mon.setDate(now.getDate()-((now.getDay()+6)%7));
  let cells="";for(let i=0;i<7;i++){const d=new Date(mon);d.setDate(mon.getDate()+i);const k=iso(d);const t=k===iso(now),has=L.some(x=>inDay(x,k));
    cells+=`<div class="mp-wd"><span>${"MTWTFSS"[i]}</span><b class="${t?"today":""}">${d.getDate()}</b><i class="${has?"on":""}"></i></div>`}
  let h=`<div class="card mp-week" style="margin-top:0"><div class="mp-lab" style="margin:0 0 6px">${MON[now.getMonth()].toUpperCase()} ${now.getFullYear()}</div><div class="mp-wk">${cells}</div></div>`;
  const k0=iso(now),days={};for(const x of within(L,k0,plus(14))){const k=x.d<k0?k0:x.d;(days[k]=days[k]||[]).push(x)}
  const keys=Object.keys(days).sort();
  if(!keys.length)h+=`<div class="card"><p class="note" style="margin:0">Nothing on your calendar for the next 14 days.</p></div>`;
  for(const k of keys)h+=`<div class="mp-lab">${esc(dayLabel(k))}</div><div class="card ny mp-list">${days[k].map(x=>row(`<span class="mp-dot ${x.ty==="EVENT"?"ev":x.ty==="DUTY"?"du":""}"></span>`,(x.tm?esc(String(x.tm).replace(":",""))+" · ":"")+esc(x.t),esc(x.s))).join("")}</div>`;
  return h}
function feedTab(){const f=typeof fdCur==="function"?fdCur():null;
  const empty=`<div class="card"><p class="note" style="margin:0">Nothing new from your team yet.</p></div>`;
  if(!f||!Array.isArray(f.posts))return empty;
  const L=f.posts.filter(p=>!p.pod&&(typeof fdForMe!=="function"||fdForMe(f,p))).slice(0,6);if(!L.length)return empty;
  return `<div id="mpFeed">${L.map(p=>fdCard(f,p,false,false)).join("")}</div><button type="button" class="btn alt" data-go="feed" style="width:100%;margin-top:12px">Open Word of Mouth ▸</button>`}

const H=n=>{try{return typeof window[n]==="function"?window[n]():""}catch(e){return""}};
function settings(){if(!setOpen)return "";return `<div id="mpSet"><div class="sech" style="margin-top:18px"><h2>Settings for my page</h2></div>${H("ppPanelHtml")}${H("qhPanelHtml")}${(S.role!=="view")?H("gfLeadHtml"):""}${H("acctHtml")}</div>`}
function pageHTML(){const own=selfRow(),D=digest(own);
  const body=tab==="feed"?feedTab():tab==="cal"?calTab(D):planTab(D);
  let ban="";try{ban=typeof banner==="function"?banner():""}catch(e){}
  return ban+head(own,D,false)+ckBlock(own)+teamCard()+highlights(D)+tabs()+`<div class="mp-body" role="tabpanel">${body}</div>`+settings()+`<p class="note" id="afVer" style="text-align:center;margin:18px 0 6px">Version ${esc(window.AV||"")}</p>`}

/* ---------- render ---------- */
{const _r=render;render=function(){
  /* open on My Page, once, while the person is still on Home and hasn't touched anything */
  if(!landed&&!touched&&!window.mpNoLand&&lowLeader()&&S.onb&&S.welcomed!==0&&(view==="board"||view==="today")&&real()){landed=true;view="mypg"}
  if(view==="mypg"){renderTabs();const m=$("#main");if(m){m.innerHTML=pageHTML();try{if(typeof window.feedPicsFill==="function")window.feedPicsFill()}catch(e){}if(typeof animateView==="function")animateView()}return}
  return _r.apply(this,arguments)}}
{const _t=tabOf;tabOf=function(v){if(lowLeader()&&(v==="mypg"||v==="mypgset"))return "mypg";return _t.apply(this,arguments)}}
{const _tl=tabsList;tabsList=function(){const L=_tl.apply(this,arguments);if(!lowLeader())return L;const i=L.findIndex(x=>x[0]==="home");if(i<0)return L;const o=L.slice();o[i]=["mypg","My Page","mypg"];return o}}
/* a member's page: the profile header goes on top of the page they already have */
{const _rm=renderMe;renderMe=function(){const r=_rm.apply(this,arguments);try{
  if(view!=="me"||!S.me||String(S.me.pk)==="preview")return r;const m=$("#main");if(!m||m.querySelector(".mp-head"))return r;const D=S.me.d;if(!D)return r;
  m.insertAdjacentHTML("afterbegin",head(null,D,true));const mb=m.querySelector(".me-built");if(mb)mb.style.display="none"}catch(e){}return r}}

/* ---------- taps ---------- */
document.addEventListener("pointerdown",()=>{touched=true},true);document.addEventListener("keydown",()=>{touched=true},true);
let hidAt=0;document.addEventListener("visibilitychange",()=>{if(document.hidden){hidAt=Date.now();return}
  if(hidAt&&Date.now()-hidAt>3*60000&&lowLeader()&&(view==="board"||view==="today")){touched=false;landed=false;try{render()}catch(e){}}});
const keepY=()=>{const y=window.scrollY;render();window.scrollTo(0,y)};
document.addEventListener("click",e=>{const t=e.target;if(!t||!t.closest)return;
  const bar=t.closest('#tabbar [data-tab="mypg"]');if(bar){e.stopImmediatePropagation();view="mypg";armed=null;query="";render();window.scrollTo(0,0);return}
  const tb=t.closest("[data-mptab]");if(tb&&(view==="mypg")){tab=tb.dataset.mptab;keepY();return}
  const g=t.closest("[data-mpgo]");if(!g)return;const w=g.dataset.mpgo;
  if(w==="set"||w==="quiet"){const was=setOpen;setOpen=(w==="set"&&was)?false:true;if(setOpen!==was)keepY();
    if(setOpen){const c=document.getElementById(w==="quiet"?"qhPanel":"mpSet");if(c&&c.scrollIntoView)setTimeout(()=>c.scrollIntoView({block:"start",behavior:"smooth"}),30)}}
  else if(w==="back"){view="mypg";armed=null;render();window.scrollTo(0,0)}
  else if(w==="ck"){const c=document.getElementById("myCk")||document.getElementById("ckCard");if(c){c.scrollIntoView({block:"center",behavior:"smooth"});c.classList.add("mp-flash");setTimeout(()=>c.classList.remove("mp-flash"),1400)}else toast("Check in appears once you're on a roster.")}
  else if(w==="photo"){const c=document.getElementById("ppPanel");if(c)c.scrollIntoView({block:"center",behavior:"smooth"})}},true);

/* ---------- look ---------- */
{const st=document.createElement("style");st.textContent=`
.mp-head{margin-top:10px}.mp-top{display:flex;justify-content:space-between;align-items:center}.mp-eye{font-size:12px;font-weight:800;letter-spacing:.12em;color:var(--s-onhand)}
.mp-prof{display:flex;align-items:center;gap:18px;margin-top:8px}.mp-stats{flex:1;display:flex;justify-content:space-around;text-align:center}
.mp-stats b{display:block;font-size:20px;font-weight:800}.mp-stats span{font-size:13px;color:var(--muted)}
.mp-av{position:relative;width:92px;height:92px;flex:none}.mp-ring{width:92px;height:92px;border-radius:50%;border:3px solid var(--s-onhand);padding:4px;box-sizing:border-box}
.mp-face{width:100%;height:100%;border-radius:50%;object-fit:cover;display:grid;place-items:center;background:var(--s-onhand);color:#fff;font-size:28px;font-weight:800}
.mp-bd{position:absolute;right:-2px;bottom:2px;width:28px;height:28px;border-radius:50%;border:3px solid var(--bg);box-sizing:border-box;display:grid;place-items:center;color:#fff;font-size:15px;font-weight:800}
.mp-bd.ok{background:var(--s-onhand)}.mp-bd.no{background:var(--s-other)}
.mp-name{margin-top:10px;font-size:17px;font-weight:800}.mp-unit{font-size:13px;color:var(--muted);margin-top:1px}
.mp-st{display:flex;align-items:center;gap:8px;margin-top:6px;font-size:14px;font-weight:600}.mp-st i{width:10px;height:10px;border-radius:50%;flex:none}.mp-warn{color:var(--warn)}
.mp-btns{display:flex;gap:8px;margin-top:12px}.mp-b{flex:1;min-height:44px;border:0;border-radius:12px;background:var(--surface-2);color:var(--ink);font:inherit;font-size:14px;font-weight:700;cursor:pointer}
.mp-b.mp-sos{flex:0 0 72px;background:transparent;border:1.5px solid var(--warn);color:var(--warn);font-weight:800;letter-spacing:.04em}
.mp-ck{margin-top:14px}.mp-ckh h2{margin:2px 0 0;font-size:22px;letter-spacing:-.01em}.mp-ck .card{margin-top:10px}.mp-flash{animation:mpFlash 1.2s ease}
@keyframes mpFlash{0%,100%{box-shadow:none}30%{box-shadow:0 0 0 4px var(--s-onhand)}}
.mp-team{display:flex;justify-content:space-between;align-items:center;width:100%;margin-top:12px;min-height:54px;padding:0 16px;border:1px solid var(--line);border-radius:16px;background:var(--surface-solid,var(--surface));color:var(--ink);font:inherit;cursor:pointer;text-align:left}
.mp-team b{display:block;font-size:15px}.mp-team small{display:block;font-size:13px;color:var(--muted)}
.mp-hls{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;padding:16px 2px 14px;margin:0 -2px}.mp-hls::-webkit-scrollbar{display:none}
.mp-hl{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;gap:6px;border:0;background:transparent;color:var(--ink);font:inherit;font-size:12px;font-weight:600;cursor:pointer}
.mp-hc{position:relative;width:58px;height:58px;border-radius:50%;border:2.5px solid var(--s-onhand);display:grid;place-items:center;color:var(--s-onhand);background:var(--surface-2)}
.mp-hn{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;border-radius:10px;padding:0 4px;box-sizing:border-box;background:var(--warn);color:#fff;border:2px solid var(--bg);font-style:normal;font-size:11px;font-weight:700;display:grid;place-items:center}
.mp-tabs{display:flex;border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin:0 -2px}
.mp-tabs button{flex:1;min-height:48px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--muted);font:inherit;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}
.mp-tabs button[aria-selected="true"]{color:var(--ink);font-weight:800;border-bottom-color:var(--ink)}
.mp-body{padding-top:4px}.mp-lab{font-size:12px;font-weight:800;letter-spacing:.1em;color:var(--muted);margin:16px 4px 0}
.mp-list{padding:0;gap:0;overflow:hidden}.mp-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border-top:1px solid var(--line)}.mp-row:first-child{border-top:0}
.mp-rt{flex:1;min-width:0}.mp-rt b{display:block;font-size:16px}.mp-rt small{display:block;font-size:13px;color:var(--muted);margin-top:2px}
.mp-dn{flex:none;width:48px;height:52px;border-radius:12px;background:var(--brass-soft);display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.05}
.mp-dn b{font-size:19px;font-weight:800}.mp-dn span{font-size:10.5px;font-weight:800;letter-spacing:.08em;color:var(--s-aob)}.mp-dn.bad{background:var(--warn);color:#fff}.mp-dn.warn{background:var(--brass);color:#fff}
.mp-dot{flex:none;width:10px;height:10px;border-radius:50%;background:var(--s-aob)}.mp-dot.ev{background:var(--s-onhand)}.mp-dot.du{background:var(--s-duty)}
.mp-wk{display:flex}.mp-wd{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px}.mp-wd span{font-size:12px;font-weight:700;color:var(--muted)}
.mp-wd b{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font-size:16px;font-weight:800}.mp-wd b.today{background:var(--ink);color:var(--bg)}
.mp-wd i{width:6px;height:6px;border-radius:50%;background:transparent}.mp-wd i.on{background:var(--s-aob)}`;document.head.appendChild(st)}
window.mpOpenPage=()=>{view="mypg";armed=null;render();window.scrollTo(0,0)};
})();
