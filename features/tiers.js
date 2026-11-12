/* Accounted For 4.88.0: Free / Pro / Org tiers.
   Free  = up to 10 people. Pro = up to 50 people + the leader tools. Org = unlimited people.
   The cap is checked on the phone every time someone is added to the roster (manual add, pasted list, CSV import,
   Contacts, Send out, a person adding themselves). Nobody already on the team is ever removed or locked out, and
   emergency muster stays free on every tier. The web app and Android stay unlocked until billing exists there. */
(()=>{
const ORG_IDS=["com.antoniotyler.accountedfor.org.yearly","com.antoniotyler.accountedfor.org.monthly"];
for(const id of ORG_IDS)if(!PRO_IDS.includes(id))PRO_IDS.push(id);
const CAP={free:10,pro:50,org:Infinity};
const NAME={free:"Free",pro:"Pro",org:"Org"};
const used=()=>S.source==="sample"?0:(S.roster||[]).length;

function tier(){const N=window.MBN;
  if(!proOK())return "free";
  if(!N||!N.on||!(N.pro&&N.pro.active))return "org"; /* web / Android / member views: unlocked */
  return /\.org\./.test(String(N.pro.pid||""))?"org":"pro"}
const cap=()=>CAP[tier()];
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
  +card("org","$29.99/mo",["Everything in Pro","Unlimited people","Texting (credits)","Priority support"],false)};

/* ---- the "team is full" screen ---- */
function fullHTML(adding){const t=tier(),c=cap(),next=t==="free"?"Pro":"Org";
  const msg=t==="free"?"Free teams hold up to 10 people. Go Pro to add more.":"Pro teams hold up to 50 people. Go Org for no limit.";
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
