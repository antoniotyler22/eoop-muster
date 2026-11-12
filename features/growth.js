/* Accounted For 4.89.0: growth and retention.
   1. After a real 100% check-in on the free plan: a short offer for Pro (once a week at most, easy to dismiss).
   2. Home cards: team streak (days at 100%), "2 spots left" warning near the free/Pro size limit, the free-trial end
      reminder (read from Apple's own signed purchase), and "Your week" (drills, average check-in, best time, who keeps
      missing). Free teams see a teaser; Pro and Org see the real numbers and can email the summary.
   At most two cards show, at the bottom of Home, so the headcount always leads.
   Nothing here blocks a feature. Emergency muster is never behind any of it. */
(()=>{
const DAY=864e5,WEEK=7*DAY;
const G=()=>{S.grow=S.grow&&typeof S.grow==="object"?S.grow:{};return S.grow};
const native=()=>!!(window.MBN&&MBN.on);
const paid=()=>{try{return proOK()}catch(e){return true}};
const tierOf=()=>typeof afTier==="function"?afTier():"org";
const esc2=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const box=(inner,hi)=>`<div class="panel" style="${hi?"border:2px solid var(--brass);":""}margin-bottom:12px">${inner}</div>`;

/* ---- team streak: days the whole team was On Hand at once ---- */
function markFull(){try{const T=counts().T;if(T.total>=2&&T["On Hand"]>=T.total){const g=G();g.full=g.full||{};const k=dkey();if(!g.full[k]){g.full[k]=1;const keep=Object.keys(g.full).sort().slice(-120);const o={};keep.forEach(x=>o[x]=1);g.full=o;save()}}}catch(e){}}
function streak(){const f=G().full||{};let n=0;const d=new Date();if(!f[dkey(d)])d.setDate(d.getDate()-1);while(f[dkey(d)]){n++;d.setDate(d.getDate()-1)}
  let best=0,run=0;const ks=Object.keys(f).sort();let prev=null;for(const k of ks){const t=Date.parse(k+"T12:00:00");run=prev!==null&&Math.round((t-prev)/DAY)===1?run+1:1;prev=t;if(run>best)best=run}
  return {n,best:Math.max(best,n)}}

/* ---- trial: read Apple's signed purchase (the phone already has it) ---- */
function trial(){try{const N=window.MBN;if(!native()||!N.pro||!N.pro.active||!N.pro.jws)return null;
  const p=JSON.parse(decodeURIComponent(escape(atob(String(N.pro.jws).split(".")[1].replace(/-/g,"+").replace(/_/g,"/")))));
  if(!(p.offerType===1&&String(p.offerDiscountType||"").toUpperCase()==="FREE_TRIAL"))return null;
  const start=+p.purchaseDate||0,end=+p.expiresDate||0;if(!start||!end||end<Date.now())return null;
  return {start,end,day:Math.floor((Date.now()-start)/DAY)+1,left:Math.max(0,Math.ceil((end-Date.now())/DAY))}}catch(e){return null}}

/* ---- the week ---- */
function week(){const since=Date.now()-WEEK;const L=(Array.isArray(S.drills)?S.drills:[]).filter(d=>d.t>=since&&d.n>0);
  if(!L.length)return null;const avg=Math.round(L.reduce((a,d)=>a+d.ok/d.n,0)/L.length*100);
  const times=L.map(d=>d.all).filter(x=>x>0);const best=times.length?Math.min(...times):null;
  const c={};for(const d of L)for(const n of d.miss||[])c[n]=(c[n]||0)+1;
  const missed=Object.entries(c).filter(x=>x[1]>=2).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]);
  return {n:L.length,avg,best,missed}}
const fmt=ms=>{const s=Math.round(ms/1000);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};

function cards(){const A=[];const add=x=>A.push(x);
  const t=tierOf(),c=typeof afCap==="function"?afCap():Infinity,used=typeof afRoom==="function"?c-afRoom():0;
  /* trial reminder */
  const tr=trial();
  if(tr&&tr.day>=5){const L=(S.drills||[]).filter(d=>d.t>=tr.start).length;
    add(box(`<b>Your free trial ends in ${tr.left} day${tr.left===1?"":"s"}</b><p class="note">${L?`You ran ${L} drill${L===1?"":"s"} so far. `:""}Pro continues automatically after the trial. Cancel any time in your App Store subscriptions.</p><button class="btn alt" data-pro-manage="1">Manage subscription</button>`,false))}
  /* near the size limit */
  if(isFinite(c)&&c-used<=2&&c-used>=0&&used>0){const left=c-used,p=Math.min(100,Math.round(used/c*100)),next=t==="free"?"Pro":"Org";
    add(box(`<div style="display:flex;justify-content:space-between"><b>Team size</b><b>${used} of ${c}</b></div><div style="height:8px;border-radius:6px;background:var(--line,rgba(128,128,128,.25));margin:6px 0"><div style="height:100%;width:${p}%;border-radius:6px;background:var(--brass)"></div></div><p class="note">${left===0?"Your team is full.":left+" spot"+(left===1?"":"s")+" left on "+(t==="free"?"Free":"Pro")+"."} ${next==="Pro"?"Pro holds 50.":"Org has no limit."}</p><button class="btn alt" data-pro-open="cap">See ${next}</button>`,false))}
  /* streak */
  const s=streak();
  const streakCard=s.n>=2?box(`<div style="display:flex;justify-content:space-between"><b>🔥 Team streak</b><b>${s.n} days at 100%</b></div><p class="note" style="margin:4px 0 0">Longest: ${s.best} days</p>`,false):"";
  /* your week */
  const w=week();
  if(w){
    if(paid()&&t!=="free"){
      add(box(`<span class="pro-badge">PRO</span><h3 style="margin:8px 0 2px">Your week</h3><p class="note" style="margin:0">Last 7 days${typeof unitName==="function"&&unitName()?", "+esc2(unitName()):""}</p><div style="display:flex;gap:8px;margin:10px 0"><div style="flex:1;text-align:center"><b style="font-size:26px">${w.avg}%</b><div class="note">avg check-in</div></div><div style="flex:1;text-align:center"><b style="font-size:26px">${w.n}</b><div class="note">drill${w.n===1?"":"s"}</div></div><div style="flex:1;text-align:center"><b style="font-size:26px">${w.best!=null?fmt(w.best):"–"}</b><div class="note">best time</div></div></div>${w.missed.length?`<p class="note"><b>Missed 2 or more:</b> ${w.missed.map(esc2).join(", ")}</p>`:""}<button class="btn alt" data-gr-mail="1">Email me this</button>`,false))}
    else add(box(`<span class="pro-badge">PRO</span><h3 style="margin:8px 0 2px">Your week</h3><p class="note">You ran ${w.n} drill${w.n===1?"":"s"} this week. Pro shows your average check-in, best time and who keeps missing, and emails it to you.</p><button class="btn alt" data-pro-open="trends">See Pro</button>`,false))}
  if(streakCard)add(streakCard);
  return A.slice(0,2).join("")}

function paint(){try{if(typeof view==="undefined"||view!=="board")return;const m=$("#main");if(!m)return;
  markFull();const old=$("#afGrow");if(old)old.remove();
  if(typeof memberMode==="function"&&memberMode())return; /* members never see leader offers */
  if(S.role==="view")return;
  const h=cards();if(!h)return;m.insertAdjacentHTML("beforeend",`<div id="afGrow" style="margin-top:12px">${h}</div>`)}catch(e){}}
{const _r=render;render=function(){const r=_r.apply(this,arguments);paint();return r}}

/* ---- offer after a real 100% check-in (free plan, iPhone app) ---- */
new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){
  if(!(n&&n.id==="wWin"))continue;
  if(!native()||paid()||!n.querySelector('[data-wshare="now"]'))continue;
  const g=G();if(g.upAt&&Date.now()-g.upAt<WEEK)continue;g.upAt=Date.now();save();
  const row=n.querySelector(".row2");
  const o=document.createElement("div");o.id="afUp";o.style.cssText="margin:12px 0 0;padding-top:10px;border-top:1px solid rgba(128,128,128,.25);text-align:left";
  o.innerHTML=`<b>Keep track of every drill</b><div class="note" style="margin:3px 0 8px">Pro adds Trends, Excel export, incident reports and up to 50 people.</div><button class="btn" data-pro-open="trends">Try Pro free for 7 days</button>`;
  if(row)row.after(o);else n.appendChild(o)}}).observe(document.body,{childList:true});

/* ---- buttons ---- */
document.addEventListener("click",e=>{
  if(e.target.closest&&e.target.closest("[data-gr-mail]")){e.preventDefault();const w=week();if(!w)return;
    const nm=typeof unitName==="function"?unitName():"";
    const body=["Last 7 days"+(nm?" – "+nm:""),"","Drills: "+w.n,"Average check-in: "+w.avg+"%",w.best!=null?"Best time to everyone accounted for: "+fmt(w.best):"",w.missed.length?"Missed 2 or more: "+w.missed.join(", "):"","","Sent from Accounted For"].filter((x,i,a)=>x!==""||a[i-1]!=="").join("\n");
    location.href="mailto:?subject="+encodeURIComponent("My week"+(nm?" – "+nm:""))+"&body="+encodeURIComponent(body)}});
window.afGrowCards=cards;
})();
