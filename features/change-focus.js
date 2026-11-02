/* Accounted For 4.77.0: tapping an alert shows you WHAT changed, not just the screen.
   - The phone keeps a small private log (never synced, never sent anywhere) of what other phones changed: a person's status,
     duty, a new calendar entry, someone added or removed, an event, the duty roster. Alerts themselves still carry no names.
   - Tap a Team update / board alert: the app syncs, jumps to the first person who changed, scrolls to them and highlights the row
     in bold with "Now: Leave · was On Hand". A "What changed" box at the top lists every change; each line jumps to that person.
   - Tap a Feed alert: the new posts are highlighted and the first one is scrolled into view.
   - Tap a Check-ins alert: the new check-ins are highlighted. Inbox alert: unread conversations are highlighted.
     Talk and Company alerts show a box saying what is new.
   - "Got it" clears the highlight. Highlights also clear when the app goes to the background. */
(()=>{
const LS="af-chg",DAY=86400000;
const KINDS=["board","live","feed","checkins","dm","dms","talk","co"];
let ST={last:null,log:[]};
try{const o=JSON.parse(localStorage.getItem(LS)||"null");if(o&&typeof o==="object")ST=Object.assign(ST,o);if(!Array.isArray(ST.log))ST.log=[]}catch(e){}
let storeT=0;const store=()=>{try{localStorage.setItem(LS,JSON.stringify(ST))}catch(e){}};
const storeSoon=()=>{clearTimeout(storeT);storeT=setTimeout(store,800)};
const E=s=>typeof esc==="function"?esc(s):String(s??"");
const Q=v=>typeof CSS!=="undefined"&&CSS.escape?CSS.escape(String(v)):String(v).replace(/["\\\]]/g,"\\$&");
const secOK=c=>typeof SECTIONS!=="undefined"&&SECTIONS.some(x=>String(x[0]).toUpperCase()===String(c).toUpperCase());

/* ---------- 1) what changed on other phones ---------- */
let touchT=0;["click","change","input","submit","keydown","touchstart"].forEach(t=>document.addEventListener(t,()=>{touchT=Date.now()},true));
const who=m=>((m.rank||"")+" "+(typeof lastOf==="function"?lastOf(m):String(m.name||"").split(",")[0])).trim().toUpperCase();
const dutyN=m=>{try{return typeof dutyOf==="function"?dutyOf(m):(m.duty||"Full Duty")}catch(e){return m.duty||"Full Duty"}};
const dLabel=d=>{try{const p=typeof parseD==="function"&&parseD(d);if(p&&p.getTime)return short(p);const q=new Date(d+"T00:00:00");return isNaN(q)?String(d):short(q)}catch(e){return String(d||"")}};
function snap(){const p={};for(const m of S.roster||[]){if(!m||m.id==null)continue;
  p[m.id]=[who(m),m.status||"",dutyN(m),m.end||"",String(m.detail||m.loc||"").slice(0,60),m.sec||"",(m.cal||[]).map(e=>(e.d||"")+"|"+(e.ti||e.ty||"")).slice(-40)]}
  return {p,ev:(S.events||[]).map(e=>String(e&&e.name||"")+"|"+String(e&&(e.date||"")||"")).slice(0,80),du:typeof sig==="function"?sig(S.duty||null):""}}
function diff(a,b){const out=[];const add=[],rm=[];
  for(const id in b.p){const x=a.p[id],y=b.p[id];if(!x){add.push({k:"add",id,who:y[0],now:"added to the roster"});continue}
    if(x[1]!==y[1]||x[3]!==y[3]||x[4]!==y[4])out.push({k:"status",id,who:y[0],now:y[1]+(y[3]?" thru "+y[3]:"")+(y[4]&&y[4]!==x[4]?" · "+y[4]:""),was:x[1]});
    if(x[2]!==y[2])out.push({k:"duty",id,who:y[0],now:y[2],was:x[2]});
    for(const c of y[6])if(!x[6].includes(c)){const [d,ti]=c.split("|");out.push({k:"cal",id,who:y[0],now:(ti||"Calendar")+(d?" · "+dLabel(d):"")})}
    if(x[5]!==y[5]&&y[5])out.push({k:"move",id,who:y[0],now:"moved to "+y[5],was:x[5]})}
  for(const id in a.p)if(!b.p[id])rm.push({k:"rm",id,who:a.p[id][0],now:"removed from the roster"});
  if(add.length>8||rm.length>8)out.push({k:"roster",now:"Roster changed: "+add.length+" added, "+rm.length+" removed"});else out.push(...add,...rm);
  const A=new Set(a.ev);for(const e of b.ev)if(!A.has(e))out.push({k:"events",now:"Event: "+(e.split("|")[0]||"changed")});
  if(a.du!==b.du)out.push({k:"duty-roster",now:"Duty roster changed"});
  return out.slice(0,60)}
function watch(){if(!Array.isArray(S.roster))return;const now=snap();
  if(!ST.last){ST.last=now;storeSoon();return}
  if(Date.now()-touchT>=2500){ /* nobody touched this phone: it came from another phone (or a sync) */
    const d=diff(ST.last,now);if(d.length){const t=Date.now();ST.log=d.map(e=>Object.assign(e,{t})).concat(ST.log).filter(e=>t-e.t<2*DAY).slice(0,100)}}
  ST.last=now;storeSoon()}
{const _s=save;save=function(){const r=_s.apply(this,arguments);try{watch()}catch(e){}return r}}
{const _r=rawSave;rawSave=function(){const r=_r.apply(this,arguments);try{watch()}catch(e){}return r}}
setTimeout(()=>{try{watch()}catch(e){}},1500);
const unseen=()=>ST.log.filter(e=>!e.ack&&Date.now()-e.t<2*DAY);

/* ---------- 2) tapping an alert ---------- */
let R=null,endT=0;
const rows=()=>document.getElementById("main");
async function refetch(o){const J=[];const run=fn=>{try{const p=fn();if(p&&p.then)J.push(p)}catch(e){}};
  if(["board","live","co"].includes(o)){
    if(S.sync&&S.sync.on&&typeof syncPull==="function")run(()=>syncPull(true));
    if(S.link&&typeof rosterPull==="function")run(()=>rosterPull(true));
    if(typeof bcPoll==="function")run(()=>bcPoll());
    if(typeof coPoll==="function"&&S.coBoard)run(()=>coPoll());
    if(typeof fdPollAll==="function"&&(S.feeds||[]).length)run(()=>fdPollAll(false))}
  if(["feed","checkins","dm","dms","talk"].includes(o)){
    if(typeof fdPollAll==="function"&&(S.feeds||[]).length)run(()=>fdPollAll(true));
    if(o==="checkins"&&typeof pgPoll==="function")run(()=>pgPoll());
    /* Inbox messages are fetched by the app's own poll (right after it opens); the screen redraws and this box follows */}
  await Promise.race([Promise.allSettled(J),new Promise(r=>setTimeout(r,9000))])}
window.chgReveal=function(o){o=String(o||"").toLowerCase();if(!KINDS.includes(o))return;
  const t=Date.now();R={o,t,nav:false,scrolled:false,busy:true,posts:{},cks:null,talk:0,asks:[]};clearTimeout(endT);endT=setTimeout(()=>{if(R&&R.t===t)finish(false)},10*60000);
  const done=()=>{if(R&&R.t===t){R.busy=false;settle()}};
  refetch(o).then(done,done);setTimeout(()=>{if(R&&R.t===t)settle()},0)};
/* where does a change live? straight to the first person who changed, unless the user already started tapping around */
function settle(){if(!R)return;
  if((R.o==="board"||R.o==="live")&&!R.nav&&touchT<R.t){
    const e=unseen().find(x=>x.id!=null&&x.k!=="rm");const m=e&&(S.roster||[]).find(x=>String(x.id)===String(e.id));
    if(m&&m.sec&&secOK(m.sec)){R.nav=true;R.scrolled=false;view=String(m.sec).toLowerCase();armed=null}}
  const y=window.scrollY;render();if(R&&R.scrolled)window.scrollTo(0,y)}
function finish(ack){if(ack&&R)for(const e of unseen())e.ack=1;
  if(R&&R.o==="checkins")ST.ckSeen=Date.now();R=null;clearTimeout(endT);storeSoon();const y=window.scrollY;try{render()}catch(e){}window.scrollTo(0,y)}
document.addEventListener("visibilitychange",()=>{if(document.hidden&&R){R=null;clearTimeout(endT);try{render()}catch(e){}}});
{const h=(location.hash||"").slice(1).toLowerCase();if(KINDS.includes(h))setTimeout(()=>window.chgReveal(h),700)}

/* ---------- 3) what the screens show ---------- */
const ent=(e,noWho)=>{const w=e.who&&!noWho?`<b>${E(e.who)}</b>: `:"";
  if(e.k==="status"||e.k==="duty"||e.k==="move")return `${w}<b>${E(e.now)}</b>${e.was?` <span class="chg-was">was ${E(e.was)}</span>`:""}`;
  if(e.k==="cal")return `${w}<b>+ ${E(e.now)}</b>`;
  return `${w}<b>${E(e.now)}</b>`};
function box(title,items,extra){const n=items.length;
  const li=items.slice(0,8).map(x=>`<li><button type="button" class="chg-l" ${x.go||""}>${x.h}</button></li>`).join("")+(n>8?`<li class="chg-more">+ ${n-8} more</li>`:"");
  return `<div class="chg-banner" id="chgBanner" role="status"><div class="chg-h"><b>🔔 ${title}</b><span class="chg-t">${n?n+(n===1?" change":" changes"):""}</span></div>${li?`<ul>${li}</ul>`:""}${extra||""}<div class="chg-f"><button type="button" class="btn" id="chgOk">Got it</button></div></div>`}
const put=(m,h)=>{if(m.querySelector("#chgBanner"))return;const hd=m.querySelector(".sechead");if(hd)hd.insertAdjacentHTML("beforebegin",h);else m.insertAdjacentHTML("afterbegin",h)};
const mark=(el,note)=>{if(!el)return;el.classList.add("chg-hit");
  if(note&&!el.querySelector(":scope > .chg-note"))el.insertAdjacentHTML("beforeend",`<div class="chg-note"><span class="chg-tag">CHANGED</span> ${note}</div>`)};
function focusEl(el){if(!el||!R||touchT>R.t)return;if(R.scrolled&&R.fe&&R.fe.isConnected)return;if((R.sn||0)>=3)return;R.fe=el;if(R.ft)return;
  /* jump (not glide): the screen can redraw mid-glide and drop the target. Tries again if the row was replaced. */
  R.ft=setTimeout(()=>{if(!R)return;R.ft=0;const x=R.fe;if(!x||!x.isConnected||touchT>R.t)return;R.scrolled=true;R.sn=(R.sn||0)+1;
    try{x.scrollIntoView({block:"center"})}catch(e){window.scrollTo(0,x.offsetTop-120)}},140)}

function decorate(){if(!R)return;const m=rows();if(!m)return;const o=R.o;
  if(o==="board"||o==="live"){
    if(view!=="board"&&view!=="live"&&!secOK(view))return;
    const L=unseen();const items=L.slice(0,40).map(e=>({h:ent(e),go:e.id!=null?`data-chg-p="${E(e.id)}"`:e.k==="events"?'data-chg-v="events"':e.k==="duty-roster"?'data-chg-v="duty"':""}));
    let first=null;const by={};for(const e of L)if(e.id!=null)(by[e.id]=by[e.id]||[]).push(e);
    for(const id in by){const row=m.querySelector(`[data-pcard="${Q(id)}"]`);const el=row&&row.closest(".m,.rrow");if(!el)continue;
      mark(el,by[id].map(e=>ent(e,true)).join("<br>"));if(!first)first=el}
    put(m,box(items.length?"What changed":R.busy?"Checking for changes…":"No new changes found",items,items.length?"":`<p class="chg-n">${R.busy?"Syncing with the team…":"Nothing new on this phone yet. It may still be syncing."}</p>`));
    focusEl(first);return}
  if(o==="feed"){if(view!=="feed")return;const f=typeof fdCur==="function"?fdCur():null;if(!f)return;const P=R.posts[f.id]||[];
    const items=P.slice(0,20).map(p=>({h:`<b>${E(p.by||"Leader")}</b>: “${E(String(p.txt||"").slice(0,90))}${String(p.txt||"").length>90?"…":""}”${p.urg?` <span class="chg-urg">URGENT</span>`:""}`,go:`data-chg-post="${p.id}"`}));
    let first=null;for(const p of P){const el=m.querySelector(`article[data-pid="${p.id}"]`)||m.querySelector(`[data-pid="${p.id}"]`);if(el){const a=el.closest("article")||el;mark(a);if(!a.querySelector(".chg-tag"))a.insertAdjacentHTML("afterbegin",`<span class="chg-tag">NEW</span>`);if(!first)first=a}}
    put(m,box(items.length?"New in Feed":R.busy?"Checking Feed…":"You're caught up",items,items.length?"":`<p class="chg-n">${R.busy?"Loading the newest posts…":"No new posts since you last looked."}</p>`));focusEl(first);return}
  if(o==="checkins"){if(view!=="checkins")return;const open=(S.cks||[]).filter(x=>x&&x.state==="new");
    const line=x=>{const st=x.st===(typeof CK_OTHER!=="undefined"?CK_OTHER:"Other")&&x.oth?x.oth:(x.st||"");return st+(x.from?" "+dLabel(x.from)+(x.to&&x.to!==x.from?" – "+dLabel(x.to):""):"")+(x.loc?" · "+x.loc:"")};
    const items=open.slice(0,20).map(x=>({h:`<b>${E(x.who)}</b>: <b>${E(line(x))}</b>`,go:`data-chg-ck="${E(x.cid)}"`}));
    let first=null;for(const x of open){const b=m.querySelector(`[data-ckok="${Q(x.cid)}"]`);const el=b&&b.closest(".rrow");if(el){mark(el);if(!first)first=el}}
    put(m,box(items.length?"New check-ins to confirm":R.busy?"Checking for check-ins…":"Nothing to confirm",items,""));focusEl(first);return}
  if(o==="dm"||o==="dms"){if(view!=="dms"&&view!=="dm")return;
    const un=[...m.querySelectorAll(".ib-row")].filter(r=>r.querySelector(".ib-un"));
    const items=un.slice(0,12).map(r=>({h:`<b>${E((r.querySelector(".ib-nm")||{}).textContent||"")}</b>: ${E(String((r.querySelector(".ib-pv")||{}).textContent||"").replace(/^[↗↙]\s*(You:)?\s*/,"").slice(0,80))}`,go:`data-chg-dmrow="${E(r.dataset.v12dm||"")}"`}));
    let first=null;for(const r of un){mark(r);if(!first)first=r}
    put(m,box(items.length?"New messages":R.busy?"Checking messages…":"No unread messages",items,""));focusEl(first);return}
  if(o==="talk"){if(view!=="talk")return;
    put(m,box(R.talk?"New on Talk":R.busy?"Checking Talk…":"Talk is up to date",R.talk?[{h:`<b>${R.talk}</b> new Talk message${R.talk>1?"s":""}. Newest at the bottom.`}]:[],""));return}
  if(o==="co"){if(view!=="co")return;
    put(m,box(R.asks.length?"New from the company":R.busy?"Checking Company…":"No new asks",R.asks.map(a=>({h:`<b>${E(String(a.q||a.t0||a.ti||"New ask").slice(0,90))}</b>`})),""));return}}

/* capture "what was new" BEFORE the screen marks it seen */
{const _f=renderFeed;renderFeed=function(){const f=typeof fdCur==="function"?fdCur():null;let prev=0;if(f)prev=f.seen||0;const r=_f.apply(this,arguments);
  try{if(R&&R.o==="feed"&&f){const mine=p=>typeof fsOwn==="function"&&fsOwn(f,p);const fresh=(f.posts||[]).filter(p=>p.id>prev&&!mine(p));
    const have=new Set((R.posts[f.id]||[]).map(p=>p.id));const all=(R.posts[f.id]||[]).concat(fresh.filter(p=>!have.has(p.id)));R.posts[f.id]=all.sort((a,b)=>b.id-a.id)}decorate()}catch(e){}return r}}
/* screens that redraw themselves (a poll finishing, a check-in arriving): draw the highlight again on whatever #main now holds */
{let mo=null,q=0;const arm=()=>{const m=rows();if(!m||mo)return;mo=new MutationObserver(()=>{if(!R||q)return;q=requestAnimationFrame(()=>{q=0;if(R)try{decorate()}catch(e){}})});mo.observe(m,{childList:true,subtree:true})};arm();document.addEventListener("DOMContentLoaded",arm);setTimeout(arm,1000);setTimeout(arm,4000)}
{const _r=render;render=function(){let tk=0,asks=null;
  try{if(R){if(R.o==="talk"&&view==="talk"&&!R.talk&&typeof window.talkUnread==="function")tk=window.talkUnread();
    if(R.o==="co"&&view==="co"&&!R.asks.length&&Array.isArray(S.coAsks)){const seen=(S.coRep&&S.coRep.seen)||{};asks=S.coAsks.filter(a=>a&&!seen[a.id])}}}catch(e){}
  const r=_r.apply(this,arguments);
  try{if(tk)R.talk=tk;if(asks&&asks.length)R.asks=asks;decorate();
    if(!R&&(view==="board"||secOK(view))&&!document.hidden){clearTimeout(window.__chgSeenT);window.__chgSeenT=setTimeout(()=>{if(!R&&(view==="board"||secOK(view))&&!document.hidden){let c=false;for(const e of ST.log)if(!e.ack){e.ack=1;c=true}if(c)storeSoon()}},4000)}}catch(e){}
  return r}}

document.addEventListener("click",e=>{const t=e.target&&e.target.closest?e.target:null;if(!t)return;
  if(t.closest("#chgOk")){e.stopImmediatePropagation();finish(true);return}
  const p=t.closest("[data-chg-p]");if(p&&R){e.stopImmediatePropagation();const id=p.dataset.chgP;const m=(S.roster||[]).find(x=>String(x.id)===id);
    if(m&&m.sec&&secOK(m.sec)){view=String(m.sec).toLowerCase();armed=null;R.scrolled=false;R.nav=true;touchT=0;render()}return}
  const v=t.closest("[data-chg-v]");if(v&&R){e.stopImmediatePropagation();const nv=v.dataset.chgV;R=null;view=nv;render();window.scrollTo(0,0);return}
  const q=t.closest("[data-chg-post],[data-chg-ck]");if(q&&R){e.stopImmediatePropagation();
    const el=q.dataset.chgPost?document.querySelector(`article[data-pid="${Q(q.dataset.chgPost)}"]`):(document.querySelector(`[data-ckok="${Q(q.dataset.chgCk)}"]`)||{closest:()=>null}).closest(".rrow");
    if(el)el.scrollIntoView({block:"center",behavior:"smooth"});return}
  const d=t.closest("[data-chg-dmrow]");if(d&&R){e.stopImmediatePropagation();const row=document.querySelector(`.ib-row[data-v12dm="${Q(d.dataset.chgDmrow)}"]`);if(row)row.scrollIntoView({block:"center",behavior:"smooth"})}},true);

/* styles */
{const s=document.createElement("style");s.id="chgCss";s.textContent=`
.chg-banner,.chg-hit,.chg-note,.chg-tag{--chg:#f5a600}
.chg-banner{margin:10px 0 12px;padding:12px 14px;border-radius:18px;border:2px solid var(--chg);background:linear-gradient(0deg,rgba(245,166,0,.13),rgba(245,166,0,.13)),var(--card,var(--surface-solid,var(--surface)));box-shadow:0 8px 26px rgba(245,166,0,.22)}
.chg-h{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:16px}
.chg-t{font-size:12px;font-weight:800;color:var(--muted)}
.chg-banner ul{list-style:none;margin:8px 0 2px;padding:0;display:flex;flex-direction:column;gap:2px}
.chg-l{all:unset;box-sizing:border-box;display:block;width:100%;padding:7px 8px;border-radius:10px;font-size:14.5px;line-height:1.35;cursor:pointer}
.chg-l:active{background:rgba(245,166,0,.22)}
.chg-l b{font-weight:900}
.chg-was{color:var(--muted);font-weight:600;font-size:12.5px}
.chg-more,.chg-n{font-size:13px;color:var(--muted);padding:4px 8px;margin:6px 0 0}
.chg-f{margin-top:8px;display:flex;justify-content:flex-end}
.chg-f .btn{width:auto;min-width:96px;padding:8px 18px}
.chg-urg{font-size:10.5px;font-weight:900;color:#fff;background:var(--warn,#c0392b);border-radius:999px;padding:1px 7px}
.chg-hit{position:relative;box-shadow:0 0 0 2px var(--chg),0 8px 24px rgba(245,166,0,.30)!important;background:linear-gradient(0deg,rgba(245,166,0,.15),rgba(245,166,0,.15)),var(--card,var(--surface-solid,var(--surface)))!important;animation:chgPulse 1.5s ease-out 2}
.chg-hit .nm,.chg-hit .who>div>b,.chg-hit .who>b,.chg-hit .ib-nm{font-weight:900}
.chg-note{grid-column:1/-1;margin-top:8px;padding:7px 10px;border-radius:12px;background:rgba(245,166,0,.2);font-size:14px;line-height:1.45}
.chg-note .chg-tag{margin:0 4px 0 0;vertical-align:1px}
.chg-note b{font-weight:900}
.chg-tag{display:inline-block;font-size:10px;font-weight:900;letter-spacing:.08em;color:#1a1405;background:var(--chg);border-radius:999px;padding:2px 8px;margin:0 0 6px}
@keyframes chgPulse{0%{box-shadow:0 0 0 2px var(--chg),0 0 0 0 rgba(245,166,0,.6)}100%{box-shadow:0 0 0 2px var(--chg),0 0 0 16px rgba(245,166,0,0)}}
@media (prefers-reduced-motion:reduce){.chg-hit{animation:none}}`;document.head.appendChild(s)}

window.__chg={ST,get R(){return R},diff,snap,unseen,watch};
if(typeof HELP==="object")HELP.changes=["What changed","Tap an alert and the app shows you exactly what changed.",["Team update alerts jump to the first person who changed and highlight them in bold with what they were before.","Feed alerts highlight the new posts.","Check-ins and Inbox alerts highlight the new check-ins and unread conversations.","Tap Got it to clear the highlight."]];
})();
