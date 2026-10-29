/* Accounted For 4.17 — Welcome and greetings by full rank and name.
   Welcome screen: the line under the title is the day, date and time in 24-hour time ("Wednesday, October 28 · 17:36"),
   ticking every minute. When the app knows who is holding the phone, the title says "Welcome, Corporal Tyler";
   Home and My page greet the same way ("Good evening, Corporal Tyler"). Civilian versions use Mr, Ms, Mrs or Mx
   if the person picked one (Account → "How the app addresses you"), otherwise their role and last name. */
(()=>{
const RANKS={PVT:"Private",PV2:"Private",PFC:"Private First Class",LCPL:"Lance Corporal",CPL:"Corporal",SPC:"Specialist",SGT:"Sergeant",SSGT:"Staff Sergeant",SSG:"Staff Sergeant",
  GYSGT:"Gunnery Sergeant",GUNNY:"Gunnery Sergeant",SFC:"Sergeant First Class",MSGT:"Master Sergeant",MSG:"Master Sergeant","1STSGT":"First Sergeant","1SG":"First Sergeant",MGYSGT:"Master Gunnery Sergeant",
  SGTMAJ:"Sergeant Major",SGM:"Sergeant Major",CSM:"Command Sergeant Major",WO:"Warrant Officer",WO1:"Warrant Officer",CWO2:"Chief Warrant Officer 2",CWO3:"Chief Warrant Officer 3",CWO4:"Chief Warrant Officer 4",CWO5:"Chief Warrant Officer 5",
  "2NDLT":"Second Lieutenant","2LT":"Second Lieutenant","1STLT":"First Lieutenant","1LT":"First Lieutenant",LT:"Lieutenant",CAPT:"Captain",CPT:"Captain",MAJ:"Major",LTCOL:"Lieutenant Colonel",LTC:"Lieutenant Colonel",COL:"Colonel",
  BGEN:"Brigadier General",MAJGEN:"Major General",LTGEN:"Lieutenant General",GEN:"General",
  SN:"Seaman",SA:"Seaman Apprentice",SR:"Seaman Recruit",PO3:"Petty Officer Third Class",PO2:"Petty Officer Second Class",PO1:"Petty Officer First Class",CPO:"Chief Petty Officer",SCPO:"Senior Chief Petty Officer",MCPO:"Master Chief Petty Officer",
  ENS:"Ensign",LTJG:"Lieutenant Junior Grade",LCDR:"Lieutenant Commander",CDR:"Commander",
  AB:"Airman Basic",AMN:"Airman",A1C:"Airman First Class",SRA:"Senior Airman",TSGT:"Technical Sergeant",SMSGT:"Senior Master Sergeant",CMSGT:"Chief Master Sergeant",
  CHIEF:"Chief","DEP CHIEF":"Deputy Chief",DET:"Detective",OFC:"Officer",RECRUIT:"Recruit"};
const TITLES=["Mr","Ms","Mrs","Mx"];
if(typeof SYNC_SKIP==="object")SYNC_SKIP.push("title");
const cap=w=>w?w.charAt(0).toUpperCase()+w.slice(1).toLowerCase():"";
const lastOf2=n=>{n=String(n||"").trim();if(!n)return "";const l=n.includes(",")?n.split(",")[0]:n.split(/\s+/).slice(-1)[0];return l.split(/[\s-]+/).map(cap).join(l.includes("-")?"-":" ")};
function fullRank(r){r=String(r||"").toUpperCase().replace(/\./g,"").trim();if(!r)return "";if(RANKS[r])return RANKS[r];return r.length<=4?r:r.split(/\s+/).map(cap).join(" ")}
window.fullRank=fullRank;
const mil=()=>!S.mode||S.mode==="military"||S.mode==="police";
/* who is holding this phone, in the words they'd want to be called by: "Corporal Tyler", "Ms. Reyes", "Foreman Diaz" */
function addressName(){let rank="",name="";
  const D=S.me&&S.me.d;if(D&&D.name){rank=D.rank||"";name=D.name}
  else if(S.lgSelf&&S.lgSelf.l){const l=String(S.lgSelf.l).split(" · ")[0];const m=l.match(/^(\S+)\s+(.+)$/);if(m){rank=m[1];name=m[2]}else name=l}
  else if(S.who&&S.who.n){const m=String(S.who.n).match(/^(\S+)\s+(.+)$/);if(m&&RANKS[m[1].toUpperCase()]){rank=m[1];name=m[2]}else name=S.who.n}
  else if(S.myName||S.postAs){const n=String(S.postAs||S.myName);const m=n.match(/^(\S+)\s+(.+)$/);if(m&&(RANKS[m[1].toUpperCase()]||(MODE().ranks||[]).includes(m[1].toUpperCase()))){rank=m[1];name=m[2]}else name=n}
  const last=lastOf2(name);if(!last)return "";
  if(S.title&&TITLES.includes(S.title))return S.title+". "+last;
  if(rank){const fr=fullRank(rank);if(fr)return fr+" "+last}
  return last}
window.addressName=addressName;
const DAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
function clock(){const d=new Date();return DAYS[d.getDay()]+", "+MONTHS[d.getMonth()]+" "+d.getDate()+" · "+String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0")}
window.clock24=clock;
const hour=()=>new Date().getHours();
const greetWord=()=>{const h=hour();return h<12?"Good morning":h<17?"Good afternoon":"Good evening"};
window.greetLine=()=>{const n=addressName();return greetWord()+(n?", "+n:"")};

/* ---------- welcome screen ---------- */
function fixWelcome(){const w=$("#v11Welcome");if(!w||w.hidden)return;const inner=w.querySelector(".v11w-in");if(!inner)return;
  const p=inner.querySelector(":scope > p.note");if(p&&!p.querySelector("#wClock")){p.innerHTML=`<span id="wClock" style="font-weight:700;letter-spacing:.02em">${esc(clock())}</span>`}
  const h1=inner.querySelector("h1");const n=addressName();if(h1&&n&&!h1.dataset.named){h1.textContent="Welcome, "+n;h1.dataset.named="1"}}
if(typeof showWelcome==="function"){const _sw=showWelcome;showWelcome=function(){const r=_sw.apply(this,arguments);try{fixWelcome()}catch(e){}return r}}
every(20000,()=>{const c=$("#wClock");if(c&&!c.closest("[hidden]"))c.textContent=clock()},"welcome-clock");
/* the welcome may be rebuilt by other features after it shows: keep the line in place */
new MutationObserver(()=>{try{fixWelcome()}catch(e){}}).observe(document.body,{childList:true,subtree:true});

/* ---------- Home and My page greeting ---------- */
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{if(view==="board"||view==="me"||view==="today"){const n=addressName();if(!n)return r;
  const h=document.querySelector("#main .hm-h");if(h&&/^Good (morning|afternoon|evening)/.test(h.textContent.trim()))h.textContent=greetWord()+", "+n;
  if(view==="me"&&h&&!/^Good/.test(h.textContent)){h.textContent=greetWord()+", "+n}}}catch(e){}return r}}

/* ---------- "How the app addresses you" ---------- */
function titleHTML(){return `<div class="note" style="margin-top:8px">How the app addresses you</div><div class="evts" role="group" aria-label="How the app addresses you">${[["","By rank / role"],...TITLES.map(t=>[t,t+"."])].map(([v,l])=>`<button type="button" data-gtitle="${v}" aria-pressed="${(S.title||"")===v}">${l}</button>`).join("")}</div>`}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{const a=document.querySelector("#v13Acct");if(a&&!a.querySelector("[data-gtitle]"))a.insertAdjacentHTML("beforeend",titleHTML())
  const h=document.querySelector("#hmAsk");if(h&&!mil()&&!h.querySelector("[data-gtitle]"))h.insertAdjacentHTML("beforeend",titleHTML())}catch(e){}return r}}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-gtitle]");if(!b)return;S.title=b.dataset.gtitle||"";save();document.querySelectorAll("[data-gtitle]").forEach(x=>x.setAttribute("aria-pressed",x.dataset.gtitle===(S.title||"")));
  const n=addressName();toast(n?"The app will call you "+n:"The app will use your rank or role");render()});
})();
