/* Accounted For: Today with a scrolling week strip. A row of days you can scroll sideways (a week back, a month ahead); tap a
   day and its agenda shows underneath: duty, appointments, training, events, due-outs, and the Plan of the Day for today.
   Replaces the old sideways row of cards on Home. Tap any row to open it, same as the cards did. */
(()=>{
const BACK=7,FWD=35;let sel=null;
const today=()=>dkey();
const addDays=n=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return d};
const timeKey=e=>e.tm||"99";
const GROUPS={LEAVE:["Leave","--s-leave"],TAD:["TAD / travel","--s-tad"],APPT:["Appointments","--s-aob"]};
const openG=new Set();
function agenda(k){const rows=[],groups={};const T=today();
  try{for(const r of (S.duty&&S.duty.rosters)||[]){const id=(r.assign||{})[k];const m=id&&S.roster.find(x=>x.id===id);rows.push({tm:"",c:"--s-duty",t:"Duty · "+(m?m.rank+" "+lastOf(m):"Open"),s:r.name||"Duty roster",go:'data-go="duty"'})}}catch(e){}
  try{const seen=new Set();calEntries(k,k,"ALL").filter(e=>e.ty!=="DUTY"&&e.ty!=="DUE"&&e.d<=k&&(e.end||e.d)>=k).forEach(e=>{const key=(e.m&&e.m.id)+"|"+e.ty+"|"+e.ti+"|"+(e.tm||"");if(seen.has(key))return;seen.add(key);
    const ty=ctype(e.ty),thru=e.end&&e.end>e.d?"thru "+short(parseD(e.end)):"";
    if(e.auto&&e.m&&GROUPS[e.ty]&&!e.tm){(groups[e.ty]=groups[e.ty]||[]).push({c:ty[2],t:e.m.rank+" "+lastOf(e.m),s:[String(e.ti||"").replace(/^(Leave|TAD|Appt)\s*·\s*/i,""),thru].filter(Boolean).join(" · "),go:`data-pcard="${esc(e.m.id)}"`});return}
    rows.push({tm:e.tm||"",c:ty[2],t:e.ti,s:(e.m?e.m.rank+" "+lastOf(e.m)+" · ":"")+ty[1]+(thru?" · "+thru:""),go:e.m?`data-pcard="${esc(e.m.id)}"`:'data-go="cal"'})})}catch(e){}
  try{for(const ev of (S.events||[]).filter(ev=>(isoOf(ev.date)||ev.date)===k))rows.push({tm:"",c:"--brass",t:ev.name,s:"Event · "+evReq(ev).filter(m=>!evDone(ev,m)).length+" still owe",go:'data-go="events"'})}catch(e){}
  if(k===T){try{const pod=latestPod();if(pod&&pod.d===k)rows.unshift({tm:"",c:"--brass",t:"Plan of the Day",s:podParse(pod.txt).f||"Posted · tap to view",go:'data-go="feed"'})}catch(e){}
    try{const R=readySum();if(R.items&&R.soon)rows.push({tm:"",c:"--warn",t:R.soon+" due-outs",s:"Next 30 days",go:'data-go="ready"'})}catch(e){}}
  rows.sort((a,b)=>timeKey(a).localeCompare(timeKey(b)));
  return {rows,groups,n:rows.length+Object.keys(groups).length}}
function rowsHTML(k){const A=agenda(k);const gk=Object.keys(A.groups);
  if(!A.n)return `<p class="note" style="margin:6px 2px">${k===today()?"Nothing scheduled today.":"Nothing scheduled."} <button class="chip" data-go="cal" style="cursor:pointer">+ Add to calendar</button></p>`;
  const away=gk.reduce((a,t)=>a+A.groups[t].length,0);
  let h=away?`<div class="tws" aria-label="${away} away"><b>${away}</b><span>away</span>${gk.map(t=>`<span class="twn" style="--c:var(${GROUPS[t][1]})"><i></i>${esc(GROUPS[t][0].split(" ")[0])} <b>${A.groups[t].length}</b></span>`).join("")}</div>`:"";
  h+=A.rows.map(r=>`<button type="button" class="twr" ${r.go} style="--c:var(${r.c})"><span class="twr-t">${esc(r.tm||"All day")}</span><span class="twr-b"><b>${esc(r.t)}</b><small>${esc(r.s)}</small></span></button>`).join("");
  h+=gk.map(t=>{const id=k+"|"+t,o=openG.has(id),L=A.groups[t];
    return `<div class="twg${o?" open":""}" style="--c:var(${GROUPS[t][1]})"><button type="button" class="twg-h" data-twg="${esc(id)}" aria-expanded="${o}"><span class="twr-b"><b>${esc(GROUPS[t][0])}</b><small>${L.length} ${L.length===1?"person":"people"}${o?"":" · tap to see who"}</small></span><span class="twg-n">${L.length}</span><span class="twg-c" aria-hidden="true">▾</span></button>${o?`<div class="twg-l">${L.map(r=>`<button type="button" class="twp" ${r.go}><b>${esc(r.t)}</b><small>${esc(r.s)}</small></button>`).join("")}</div>`:""}</div>`}).join("");
  return h}
function daysHTML(){const T=today();let h="";
  for(let i=-BACK;i<=FWD;i++){const d=addDays(i),k=dkey(d);const has=agenda(k).n>0;
    h+=`<button type="button" class="twd${k===sel?" on":""}${k===T?" now":""}" data-twd="${k}" aria-pressed="${k===sel}" aria-label="${DOW[d.getDay()]} ${short(d)}${has?", has items":""}"><span class="dw">${k===T?"TODAY":DOW[d.getDay()]}</span><b>${d.getDate()}</b><span class="mo">${d.getDate()===1||i===-BACK?MON[d.getMonth()]:""}</span><i${has?"":' class="nil"'}></i></button>`}
  return h}
function html(){const T=today();if(sel&&(sel<dkey(addDays(-BACK))||sel>dkey(addDays(FWD))))sel=null;
  const d=parseD(sel||T)||new Date();
  const head=sel?`${sel===T?"Today":DOW[d.getDay()]} · ${esc(short(d))}`:`Today · ${esc(short(d))}`;
  const chips=sel?`<span style="display:flex;gap:6px">${sel!==T?`<button type="button" class="chip" data-twd="${T}" style="cursor:pointer">Back to today</button>`:""}<button type="button" class="chip" data-twx="1" style="cursor:pointer">Hide ▴</button></span>`:`<span class="note" style="margin:0">Tap a day to see what's on</span>`;
  return `<div id="twk"><div class="twk-h"><span class="note" style="margin:0;font-weight:700">${head}</span>${chips}</div>
    <div class="twk-days" id="twkDays" role="group" aria-label="Pick a day">${daysHTML()}</div>${sel?`<div class="twk-rows" id="twkRows">${rowsHTML(sel)}</div>`:""}</div>`}
window.todayWeekHTML=()=>{try{return html()}catch(e){return ""}};
function centre(smooth){const s=document.getElementById("twkDays"),b=s&&s.querySelector(".twd.on");if(!s||!b)return;
  s.scrollTo({left:Math.max(0,b.offsetLeft-(s.clientWidth-b.offsetWidth)/2),behavior:smooth?"smooth":"auto"})}
function refresh(){const el=document.getElementById("twk");if(!el)return;const s=document.getElementById("twkDays"),x=s?s.scrollLeft:0;
  el.outerHTML=html();const s2=document.getElementById("twkDays");if(s2)s2.scrollLeft=x;centre(true)}
document.addEventListener("click",e=>{const g=e.target.closest&&e.target.closest("[data-twg]");if(g){e.preventDefault();e.stopImmediatePropagation();const id=g.dataset.twg;if(openG.has(id))openG.delete(id);else openG.add(id);const r=document.getElementById("twkRows");if(r)r.innerHTML=rowsHTML(sel);return}
  const x=e.target.closest&&e.target.closest("[data-twx]");if(x){e.preventDefault();e.stopImmediatePropagation();sel=null;refresh();return}
  const b=e.target.closest&&e.target.closest("[data-twd]");if(!b)return;e.preventDefault();e.stopImmediatePropagation();sel=(b.dataset.twd===sel&&sel!==today())||(b.dataset.twd===sel&&sel===today())?null:b.dataset.twd;refresh()},true);
/* centre today the first time Home draws, and refresh the dots when Home redraws */
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{if(document.getElementById("twkDays")&&!document.getElementById("twkDays").dataset.c){document.getElementById("twkDays").dataset.c="1";centre(false)}}catch(e){}return r}}
{const c=document.createElement("style");c.textContent=`.twk-h{display:flex;justify-content:space-between;align-items:center;margin:2px 2px 8px;min-height:30px}
.twk-days{display:flex;gap:6px;overflow-x:auto;padding:2px 2px 10px;margin:0 -2px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.twk-days::-webkit-scrollbar{display:none}
.twd{all:unset;box-sizing:border-box;cursor:pointer;flex:none;scroll-snap-align:center;width:54px;display:flex;flex-direction:column;align-items:center;gap:1px;padding:8px 0 6px;border-radius:16px;background:var(--surface-2,#f3f5f8);color:var(--muted);font-weight:700}
.twd .dw{font-size:10.5px;letter-spacing:.04em}.twd b{font-size:18px;color:var(--ink);line-height:1.2}.twd .mo{font-size:9.5px;min-height:11px;letter-spacing:.06em;color:var(--muted)}
.twd i{width:5px;height:5px;border-radius:50%;background:var(--brass,#0857e8);margin-top:1px}.twd i.nil{background:transparent}
.twd.now:not(.on) b{color:var(--brass,#0857e8)}.twd.on{background:var(--brass,#0857e8);color:var(--on-brass,#fff)}.twd.on b,.twd.on .mo{color:var(--on-brass,#fff)}.twd.on i{background:var(--on-brass,#fff)}.twd.on i.nil{background:transparent}
.twd:focus-visible{outline:2px solid var(--brass,#0857e8);outline-offset:2px}
.twk-rows{display:flex;flex-direction:column;gap:8px;margin-top:2px}
.twr{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;background:var(--surface-2,#f5f7fa);border-left:4px solid var(--c,var(--line))}
.twr-t{flex:none;min-width:48px;font-size:12px;font-weight:800;color:var(--muted)}.twr-b{min-width:0;display:flex;flex-direction:column}.twr-b b{font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.twr-b small{font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tws{display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px;padding:4px 4px 2px;font-size:12.5px;font-weight:700;color:var(--muted)}.tws>b{font-size:20px;color:var(--ink)}
.twn{display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:99px;background:var(--surface-2,#f3f5f8);color:var(--ink)}.twn i{width:8px;height:8px;border-radius:50%;background:var(--c)}
.twg{border-radius:16px;background:var(--surface-2,#f5f7fa);border-left:4px solid var(--c,var(--line));overflow:hidden}
.twg-h{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px}.twg-n{margin-left:auto;min-width:28px;text-align:center;font-size:13px;font-weight:800;padding:4px 8px;border-radius:99px;background:var(--c);color:#fff}
.twg-c{color:var(--muted);transition:transform .2s}.twg.open .twg-c{transform:rotate(180deg)}.twg-h:focus-visible{outline:2px solid var(--brass,#0857e8);outline-offset:-2px}
.twg-l{display:flex;flex-direction:column;border-top:1px solid var(--line)}.twp{all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;padding:9px 14px 9px 16px;border-bottom:1px solid var(--line)}.twp:last-child{border-bottom:0}
.twp b{font-size:14px}.twp small{font-size:12px;color:var(--muted)}.twp:focus-visible{outline:2px solid var(--brass,#0857e8);outline-offset:-2px}
.twr:focus-visible{outline:2px solid var(--brass,#0857e8);outline-offset:2px}`;document.head.appendChild(c)}

/* the strip rolls on its own, like a ticker: it drifts toward the days ahead, you can grab it any time (touch, scroll or tap a day stops it,
   it picks up again a few seconds later), and at the far end it eases back to today. Off if the phone asks for reduced motion. */
{const SPEED=26,IDLE=4500,HOLD=1600;let idle=0,down=false,t0=0,acc=0,hold=0,back=0,lastLeft=-1;
  const reduced=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}};
  const bump=(ms)=>{idle=Date.now()+(ms||IDLE)};
  document.addEventListener("pointerdown",e=>{if(e.target.closest&&e.target.closest("#twkDays")){down=true;bump()}},{capture:true,passive:true});
  document.addEventListener("touchstart",e=>{if(e.target.closest&&e.target.closest("#twkDays")){down=true;bump()}},{capture:true,passive:true});
  for(const ev of ["pointerup","pointercancel","touchend","touchcancel"])document.addEventListener(ev,()=>{if(down){down=false;bump()}},{capture:true,passive:true});
  document.addEventListener("wheel",e=>{if(e.target.closest&&e.target.closest("#twkDays"))bump()},{capture:true,passive:true});
  document.addEventListener("click",e=>{if(e.target.closest&&e.target.closest("[data-twd]"))bump(9000)},true);
  document.addEventListener("keydown",e=>{if(e.target.closest&&e.target.closest("#twkDays"))bump(9000)},true);
  function frame(t){requestAnimationFrame(frame);const dt=Math.min(.05,t0?(t-t0)/1e3:0);t0=t;
    const s=document.getElementById("twkDays");if(!s||view!=="board"||document.hidden||down||reduced()||Date.now()<idle||s.contains(document.activeElement)&&document.activeElement.matches(":focus-visible")){acc=0;return}
    if(!s.offsetParent)return;const r=s.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight){return}   /* only while it's on screen */
    const max=s.scrollWidth-s.clientWidth;if(max<=4)return;
    if(back){return}
    if(s.scrollLeft>=max-2){if(!hold)hold=Date.now()+HOLD;else if(Date.now()>hold){hold=0;back=1;const b=s.querySelector(".twd.now")||s.querySelector(".twd.on");
      s.scrollTo({left:b?Math.max(0,b.offsetLeft-(s.clientWidth-b.offsetWidth)/2):0,behavior:"smooth"});setTimeout(()=>{back=0;bump(2500)},1200)}return}
    hold=0;acc+=SPEED*dt;const px=Math.floor(acc);if(!px)return;acc-=px;s.scrollLeft=Math.min(max,s.scrollLeft+px)}
  requestAnimationFrame(frame);
  window.twkRoll={left:()=>{const s=document.getElementById("twkDays");return s?Math.round(s.scrollLeft):-1}}}
})();
