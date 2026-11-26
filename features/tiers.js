/* Accounted For 4.88.0: Free / Pro / Org tiers.
   Free  = up to 10 people. Pro = up to 50 people + the leader tools. Team = 100 people (+50 per step, 4.143.0). Org = unlimited people.
   The cap is checked on the phone every time someone is added to the roster (manual add, pasted list, CSV import,
   Contacts, Send out, a person adding themselves). Nobody already on the team is ever removed or locked out, and
   emergency muster stays free on every tier. The web app and Android stay unlocked until billing exists there. */
(()=>{
const ORG_IDS=["com.antoniotyler.accountedfor.org.yearly","com.antoniotyler.accountedfor.org.monthly"];
/* 4.143.0: Team = up to 100 people for $12.99 a month, then $2.99 a month more for every 50 more people (100, 150 ... 350; past that Org is cheaper).
   One monthly App Store product per size: com.antoniotyler.accountedfor.team.100 ... team.350 (the number is the people cap). */
const TEAM_SIZES=[100,150,200,250,300,350],TEAM_BASE=1299,TEAM_STEP=299;
const teamCents=n=>TEAM_BASE+TEAM_STEP*Math.max(0,Math.round((n-100)/50));
const TEAM_IDS=TEAM_SIZES.map(n=>"com.antoniotyler.accountedfor.team."+n);
window.afTeam={sizes:TEAM_SIZES,cents:teamCents,id:n=>"com.antoniotyler.accountedfor.team."+n,ids:TEAM_IDS};
for(const id of ORG_IDS.concat(TEAM_IDS))if(!PRO_IDS.includes(id))PRO_IDS.push(id);
const CAP={free:10,pro:50,team:100,org:Infinity};
const NAME={free:"Free",pro:"Pro",team:"Team",org:"Org"};
const teamCap=()=>{const N=window.MBN,m=/\.team\.(\d+)$/.exec(String((N&&N.pro&&N.pro.pid)||""));return m?Math.max(100,+m[1]):100};
const used=()=>S.source==="sample"?0:(S.roster||[]).length;

function tier(){const N=window.MBN;
  if(window.afSiteOn&&window.afSiteOn())return "org"; /* site license (addons.js) */
  if(!proOK())return "free";
  if(N&&N.on&&!(N.pro&&N.pro.active)&&window.afSrvPro&&window.afSrvPro())return "pro"; /* a Pro code (owner portal) or a web purchase, used on iPhone */
  if(!N||!N.on||!(N.pro&&N.pro.active))return "org"; /* web / Android / member views: unlocked */
  const pid=String(N.pro.pid||"");return /\.org\./.test(pid)?"org":/\.team\.\d+$/.test(pid)?"team":"pro"}
const cap=()=>Math.max(tier()==="team"?teamCap():CAP[tier()],window.afPassCap?window.afPassCap():0); /* an Event Pass (addons.js) lifts the limit while it lasts */
const room=()=>Math.max(0,cap()-used());
window.afTier=tier;window.afCap=cap;window.afRoom=room;

const li=a=>a.map(x=>`<li style="padding:6px 0;border-top:1px solid var(--line,rgba(128,128,128,.22))">✓ ${x}</li>`).join("");
const card=(k,price,items,hi)=>`<div style="border:${hi?"2px solid var(--brass)":"1px solid var(--line,rgba(128,128,128,.3))"};border-radius:16px;padding:12px 14px;margin:0 0 10px"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:17px">${NAME[k]}${tier()===k?' <small style="font-weight:700;opacity:.7">· your plan</small>':""}</b><b>${price}</b></div><ul style="list-style:none;margin:8px 0 0;padding:0;font-size:14px">${li(items)}</ul></div>`;
function meter(){const c=cap();if(!isFinite(c))return `<p class="note">${used()} people on your team. Org has no limit.</p>`;
  const p=Math.min(100,Math.round(used()/c*100));
  return `<div style="margin:8px 0 12px"><div style="display:flex;justify-content:space-between;font-size:13px"><span>Team size</span><b>${used()} of ${c}</b></div><div style="height:8px;border-radius:6px;background:var(--line,rgba(128,128,128,.25));margin-top:4px"><div style="height:100%;width:${p}%;border-radius:6px;background:var(--brass)"></div></div></div>`}

proList=function(){return meter()
  +card("free","$0",["Live board and headcount ring","Check-in link for everyone","Emergency muster","Word of Mouth and Calendar","Offline mode","Up to 10 people"],false)
  +card("pro","$9.99/mo",["Everything in Free","Up to 50 people","Company roll-up","Recall drills and QR muster","Trends and Excel export","6W incident reports","Member logins","Ask (AI)"],true)
  +card("team","$12.99/mo",["Everything in Pro","Up to 100 people","$2.99 a month more for every 50 more people"],false)
  +card("org","$29.99/mo",["Everything in Pro","Unlimited people","Texting (credits)","Priority support"],false)};

/* ---- the "team is full" screen ---- */
function fullHTML(adding){const t=tier(),c=cap(),next=t==="free"?"Pro":t==="pro"?"Team":"Org";
  const msg=t==="free"?"Free teams hold up to 10 people. Go Pro to add more.":t==="pro"?"Pro teams hold up to 50 people. Go Team for up to 100, with room to grow.":"Your plan holds up to "+c+" people. Go up a size, or go Org for no limit.";
  return `<div class="panel pro-wall"><span class="pro-badge">${next.toUpperCase()}</span><h2 style="margin:0">Your team is full</h2><p class="note">${msg} Everyone already on the team keeps working, and emergency muster stays free.</p>${meter()}${adding?`<p class="note">${adding} not added.</p>`:""}<button class="btn" data-pro-open="cap">See ${next}</button></div>`}
let shown=0;
function showFull(adding){if(Date.now()-shown<1500)return;shown=Date.now();
  try{closeSheet()}catch(e){}
  $("#main").innerHTML=fullHTML(adding);window.scrollTo(0,0);toast("Team is full ("+cap()+")")}
window.afShowFull=showFull;

/* ---- enforce: one person at a time ---- */
const _add=addMarine;
addMarine=function(o,defSec){
  if(isFinite(cap())&&used()>=cap()){showFull(o&&o.name?String(o.name).slice(0,30):"");return null}
  return _add.apply(this,arguments)};

/* ---- enforce: CSV import / pasted CSV (several at once) ---- */
const _merge=mergeFile;
mergeFile=async function(f){
  const n=await _merge.apply(this,arguments);const c=cap();
  if(isFinite(c)&&S.roster.length>c){const over=S.roster.length-c;
    S.roster.splice(S.roster.length-Math.min(over,n),Math.min(over,n));save();
    showFull(Math.min(over,n)+" "+(over===1?"person":"people"));return Math.max(0,n-over)}
  return n};
mergeFile.up=_merge.up;

/* ---- enforce: the quick Add form on a section page ---- */
document.addEventListener("submit",e=>{
  if(e.target&&e.target.id==="addf"&&isFinite(cap())&&used()>=cap()){e.preventDefault();e.stopPropagation();showFull("")}
},true);
})();
