/* Accounted For: everyone on the team gets an alert when something is posted or changed.
   "The team" is everyone whose phone is on the team's Feed: the OIC, co-leaders, editors and viewers (linked by
   sync or login), section leaders (board link) and members (My page or Feed link). Each of them is on the Feed's
   alert list once alerts are on for that phone.
   1) Posts: every phone on the list gets "New word in Feed", leaders included, except the phone that posted.
   2) Changes: when someone with edit rights changes people, statuses, calendar, duty, due-outs or events, the
      whole team gets "📋 Team update" (no names in the alert; at most one every 90 s, batched).
      A platoon that rolls up to a company also alerts the company's Feed.
   3) A "Team alerts" switch on Home and Feed for any phone on the team that doesn't have alerts on yet. */
(()=>{
const LS="af-tsub";
const teamFeed=()=>{const F=S.feeds||[];return F.find(f=>f.lk&&f.main)||F.find(f=>f.lk)||F.find(f=>f.hub&&f.mk)||F.find(f=>f.mk)||null};
const subMap=()=>{try{return JSON.parse(localStorage.getItem(LS)||"{}")||{}}catch(e){return {}}};
const putMap=m=>{try{localStorage.setItem(LS,JSON.stringify(m))}catch(e){}};
let myEnd="";
/* 4.56: a device id kept on this phone only (not synced), so the server can skip the phone that posted even when it
   has an older alert sign-up too, and keep one sign-up per phone */
function devId(){let d="";try{d=localStorage.getItem("af-dev")||""}catch(e){}if(!/^[a-z0-9]{8,40}$/.test(d)){d=rndId(20);try{localStorage.setItem("af-dev",d)}catch(e){}}return d}
window.afDevId=devId;
async function endpoint(){if(myEnd)return myEnd;try{const s=await pushSub(false);myEnd=s&&(s.endpoint||(s.toJSON&&s.toJSON().endpoint))||""}catch(e){}return myEnd}

/* 1) put this phone on the alert list of every feed it's on, leader phones included */
/* one at a time: a tap waits for a background run instead of giving up (that used to read as "Couldn't connect") */
let running=Promise.resolve(0),lastErr="";
function attachAll(force){const go=()=>attachOnce(force);running=running.then(go,go);return running}
async function attachOnce(force){if(!S.pushOn)return 0;let n=0;lastErr="";
  try{const s=await pushSub(false);if(!s){lastErr=window.__pushWhy==="notoken"?"this phone didn't get an alert token from Apple. Close the app fully, open it and try again.":window.__pushWhy==="noplugin"?"alerts aren't in this build of the app.":"alerts aren't allowed for this app in Settings.";return 0}
    const j=Object.assign({},s.toJSON(),{dev:devId()});myEnd=j.endpoint||myEnd;const M=subMap();
    /* v2: leader phones are marked "lead" so member check-ins, requests and problem reports reach them (co-leaders
       too), and the OIC's phone is also the feed's leader alert phone. Phones attached before re-attach once. */
    if(M.__v!==3){force=true;M.__v=3}
    for(const f of S.feeds||[]){if(!f.mk)continue;if(!force&&M[f.id]===j.endpoint){f.push=true;continue}
      try{await SB.rpc("feed_sub",{p_feed:f.id,p_member_key:f.mk,p_sub:f.lk?Object.assign({},j,{lead:1}):j});M[f.id]=j.endpoint;f.push=true;n++;
        if(f.lk&&(!S.role||S.role==="oic"||S.role==="newoic"))try{await SB.rpc("set_feed_leader_sub",{p_feed:f.id,p_leader_key:f.lk,p_sub:j})}catch(e2){}}
      catch(e){const msg=String(e&&e.message||e);lastErr=/full/.test(msg)?"the team's alert list is full (500 phones).":/find the function|schema|does not exist/i.test(msg)?"alerts aren't set up on the server yet (DATA → System check).":/fetch|network|Failed/i.test(msg)?"no signal reaching the server. Try again.":msg.slice(0,80)}}
    putMap(M);if(n)rawSave()}catch(e){lastErr=String(e&&e.message||e).slice(0,80)}return n}
window.taLastErr=()=>lastErr;
window.taAttach=attachAll;
fdPushAttach=async function(f){return attachAll()};
const hasAlerts=()=>{const f=teamFeed();return !!(f&&S.pushOn&&subMap()[f.id])};

/* 2) team changes: only what a person did on this phone counts (not data arriving from other phones) */
let touchT=0;["click","change","input","submit","keydown"].forEach(t=>document.addEventListener(t,()=>{touchT=Date.now()},true));
const snap=()=>{const R=S.roster||[];const per={status:{},cal:{},ready:{}};
  for(const m of R){per.status[m.id]=sig([m.status,m.duty||"",m.start||"",m.end||"",m.loc||""]);per.cal[m.id]=sig(m.cal||[]);per.ready[m.id]=sig(m.due||null)}
  return {ids:R.map(m=>m.id),per,secCal:sig(S.secCal||null),duty:sig(S.duty||null),events:sig(S.events||null)}};
/* what changed between two snapshots; per-person items only count for people on both sides */
function diff(a,b){const out=[];const A=new Set(a.ids),B=new Set(b.ids);
  if(a.ids.length!==b.ids.length||b.ids.some(id=>!A.has(id)))out.push("roster");
  for(const k of ["status","cal","ready"])if(b.ids.some(id=>A.has(id)&&a.per[k][id]!==b.per[k][id]))out.push(k);
  if(a.secCal!==b.secCal&&!out.includes("cal"))out.push("cal");if(a.duty!==b.duty)out.push("duty");if(a.events!==b.events)out.push("events");return out}
let base=null,pend=new Set(),sendT=null;
const eligible=()=>S.source!=="sample"&&typeof canEdit==="function"&&canEdit()&&!!teamFeed();
function watch(){if(!Array.isArray(S.roster))return;const now=snap();
  if(base&&eligible()&&Date.now()-touchT<2500){for(const k of diff(base,now))pend.add(k);
    if(pend.size){clearTimeout(sendT);sendT=setTimeout(flush,30000)}}
  base=now}
async function flush(){if(!pend.size)return;const f=teamFeed();if(!f||!eligible()){pend.clear();return}
  const what=[...pend];pend.clear();const skip=await endpoint();
  SB.notify(null,Object.assign({team:f.id,k:f.lk||f.mk,what},skip?{skip}:{}));
  /* the company this platoon rolls up to sees the same people: its Feed (CO, XO, 1stSgt, other platoons) gets it too */
  for(const c of (S.feeds||[]).filter(x=>x.hub2&&x.mk&&x.id!==f.id).slice(0,2))SB.notify(null,Object.assign({team:c.id,k:c.lk||c.mk,what},skip?{skip}:{}))}
window.taFlush=flush;
{const _save=save;save=function(){const r=_save.apply(this,arguments);try{watch()}catch(e){}return r}}
{const _raw=rawSave;rawSave=function(){const r=_raw.apply(this,arguments);try{if(base)base=snap()}catch(e){}return r}}
setTimeout(()=>{try{base=snap()}catch(e){}},0);
document.addEventListener("visibilitychange",()=>{if(document.hidden&&pend.size){clearTimeout(sendT);flush()}});
/* a section leader's update to the board is a team change too */
{const SL=["push_update","push_cal","put_roster"];const _rpc=SB.rpc.bind(SB);SB.rpc=async function(fn,args){const r=await _rpc(fn,args);
  try{if(SL.includes(fn)&&S.link&&!S.board&&Date.now()-touchT<60000){pend.add(fn==="push_cal"?"cal":"sec");clearTimeout(sendT);sendT=setTimeout(flush,30000)}}catch(e){}return r}}

/* 4.57: every phone gets the "new post" alert, the one that posted it too (you asked for that). Team updates still
   skip the phone that made the change, by device id. */
{const _n=SB.notify.bind(SB);SB.notify=function(rid,body){
  if(body&&body.team&&!body.dev)body=Object.assign({},body,{dev:devId()});
  if(body&&body.feed&&body.lk&&!body.team){const b=Object.assign({},body);delete b.skip;delete b.dev;return _n(rid,b)}
  return _n(rid,body)}}

/* 3) the switch */
function card(){const f=teamFeed();if(!f||hasAlerts())return "";
  if(typeof pushOK==="function"&&!NATIVE&&!pushOK())return typeof isIOS==="function"&&isIOS()&&typeof standalone==="function"&&!standalone()?`<div class="panel" id="taCard"><b>🔔 Team alerts</b><p class="note" style="margin:2px 0 0">To get alerts when anything is posted or changed: Share → <b>Add to Home Screen</b>, then open the app from there.</p></div>`:"";
  if(typeof Notification!=="undefined"&&Notification.permission==="denied")return `<div class="panel" id="taCard"><b>🔔 Team alerts are blocked</b><p class="note" style="margin:2px 0 0">Turn notifications on for this app in your phone's Settings.</p></div>`;
  return `<div class="panel" id="taCard" style="border-color:var(--brass)"><b>🔔 Team alerts</b><p class="note" style="margin:2px 0 8px">Get an alert on this phone when anything is posted to the Feed or changed on the team.</p><button class="btn" id="taOn">Turn on team alerts</button></div>`}
/* leader only: how many phones are on the alert list, against the people on the roster */
let stat=null,statAt=0,statBusy=false;
async function loadStat(){const f=teamFeed();if(!f||!f.lk||statBusy||Date.now()-statAt<300000)return;statBusy=true;
  try{const r=await SB.rpc("feed_sub_stats",{p_feed:f.id,p_leader_key:f.lk});const x=Array.isArray(r)?r[0]:r;if(x){stat={t:+x.total||0,l:+x.leads||0};statAt=Date.now();placeStat()}}catch(e){statAt=Date.now()}finally{statBusy=false}}
function placeStat(){const m=$("#main");if(!m)return;const old=$("#taStat");if(old)old.remove();const f=teamFeed();if(!stat||!f||!f.lk)return;
  const n=(S.roster||[]).length,low=n>0&&stat.t<n;
  m.insertAdjacentHTML("afterbegin",`<div class="panel" id="taStat"${low?' style="border-color:var(--warn)"':""}><b>🔔 ${stat.t} phone${stat.t===1?"":"s"} get your alerts</b><p class="note" style="margin:2px 0 0">${stat.l} leader phone${stat.l===1?"":"s"}. Your roster has ${n} ${n===1?"person":"people"}.${low?" Some may not hear your Feed posts. Ask them to open the app and tap <b>Turn on team alerts</b>.":""}</p></div>`)}
function place(){const m=$("#main");if(!m)return;if(!$("#taCard")){const h=card();if(h)m.insertAdjacentHTML("afterbegin",h)}placeStat();loadStat()}
{const _rf=renderFeed;renderFeed=function(){_rf.apply(this,arguments);place()}}
if(typeof renderToday==="function"){const _rt=renderToday;renderToday=function(){_rt.apply(this,arguments);place()}}
if(typeof renderBoard==="function"){const _rb=renderBoard;renderBoard=function(){_rb.apply(this,arguments);if(teamFeed())place()}}
if(typeof renderMe==="function"){const _rm=renderMe;renderMe=function(){_rm.apply(this,arguments);place()}}
document.addEventListener("click",e=>{if(!e.target.closest("#taOn"))return;e.stopImmediatePropagation();const b=e.target.closest("#taOn");b.disabled=true;b.textContent="Asking…";
  pushSub(true).then(async sub=>{if(!sub){toast(window.__pushWhy==="notoken"?"Apple didn't send an alert token. Close the app fully and try again.":window.__pushWhy==="noplugin"?"Alerts aren't in this build of the app yet.":"Alerts are off for this app. Turn them on in Settings → Notifications → Accounted For.");b.disabled=false;b.textContent="Turn on team alerts";return}
    S.pushOn=true;save();await attachAll(true);try{if(S.board&&typeof boardPush==="function")await boardPush()}catch(e){}
    const c=$("#taCard");if(c)c.remove();const q=$("#ckAl");if(q)q.remove();if(hasAlerts())toast("🔔 Team alerts on");else{toast("Couldn't connect alerts: "+(lastErr||"try again."));const y=window.scrollY;render();window.scrollTo(0,y)}})
  .catch(()=>{toast("Couldn't turn on alerts here.");b.disabled=false;b.textContent="Turn on team alerts"})},true);

/* keep the list current: new feeds (joined, synced) and refreshed phone tokens */
setTimeout(()=>attachAll(),3000);
every(10*60000,()=>attachAll(),"team-alerts");
document.addEventListener("visibilitychange",()=>{if(!document.hidden)attachAll()});

if(typeof HELP==="object")HELP.teamalerts=["Team alerts","Everyone on the team gets an alert when something is posted or changed.",["Turn on team alerts on Home or Feed (once per phone).","New Feed posts alert everyone on the team except the person who posted.","Changes to people, statuses, calendar, duty, due-outs or events send one \"Team update\" alert to the team, at most every 90 seconds. Alerts never include names."]];
})();
