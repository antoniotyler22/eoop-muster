/* Accounted For 4.80: a status that is 24 hours old stops counting.
   Everyone's status is only good for 24 hours after their last check-in or update (their own check-in, a leader's
   Confirm, a section leader's live update, or any status change). After that they default to Off Hand: out of the On Hand / present
   numbers and show "Off Hand" on the board, so you can see who hasn't checked in. Their last known status is
   kept (nothing is erased or synced); the next check-in or update starts a fresh 24 hours.
   Not affected: people away with dates covering today (Leave, TAD, Operation, SIQ, Appointment, etc. are not expected to
   check in), Attached people (ATT), sample data, and member phones. Check-ins screen: switch it off or on there. */
(()=>{
const DAY=86400000;
const on=()=>S.exp24!==false;
const real=()=>S.source!=="sample"&&Array.isArray(S.roster)&&S.roster.length>0&&!(typeof memberMode==="function"&&memberMode());
function away(m){if(!AWAY.includes(m.status))return false;const s=isoOf(m.start)||"",e=isoOf(m.end)||"",d=dkey();return (!s||s<=d)&&(!e||e>=d)}
function touched(m){let t=+m.ckAt||0;if(m.upd&&+m.upd.t>t)t=+m.upd.t;const L=(S.tl||{})[m.id];if(L&&L.length){const x=+L[L.length-1][0]||0;if(x>t)t=x}return t}
function pending(){const p=new Set();for(const x of S.cks||[])if(x&&x.mid&&Date.now()-(+x.t||0)<DAY)p.add(x.mid);return p}
function isStale(m,pend){if(!on()||!real()||!m||m.sec==="ATT"||away(m))return false;const p=pend||pending();if(p.has(m.id)||(m.uid&&p.has(m.uid)))return false;const t=touched(m);return !!t&&Date.now()-t>=DAY}
window.ckStale=m=>isStale(m);
window.ckStaleList=()=>{if(!on()||!real())return[];const p=pending();return S.roster.filter(m=>isStale(m,p))};
{const _c=counts;counts=function(){const r=_c.apply(this,arguments);
  try{if(!on()||!real())return r;const {c,T}=r;const p=pending();T.stale=0;T["Off Hand"]=0;for(const k of Object.keys(c))if(c[k]){c[k].stale=0;c[k]["Off Hand"]=0}
    for(const m of S.roster){if(!isStale(m,p))continue;const o=c[m.sec];if(!o)continue;
      if(o[m.status]>0)o[m.status]--;if(T[m.status]>0)T[m.status]--;if(typeof apptOff==="function"&&apptOff(m)){if(o.off>0)o.off--;if(T.off>0)T.off--}o.stale++;T.stale++;o["Off Hand"]++;T["Off Hand"]++}}catch(e){}
  return r}}
function tagRows(){if(!on()||!real())return;const p=pending();
  for(const m of S.roster){if(!isStale(m,p))continue;const who=document.querySelector('.m [data-pcard="'+(window.CSS&&CSS.escape?CSS.escape(m.id):m.id)+'"]');if(!who)continue;
    const row=who.closest(".m");if(row){row.style.setProperty("--sc","var(--warn)");row.classList.add("st24")}
    if(!who.querySelector(".st24t"))who.insertAdjacentHTML("beforeend",`<span class="tag st24t" title="Off Hand: no check-in or update in 24 hours. Last: ${esc(SHORT[m.status]||m.status)}">Off Hand</span>`)}}
function note(){if(!real()||(typeof role==="function"&&role()==="view"))return "";const n=window.ckStaleList().length;
  return `<div class="note" id="exp24" style="margin:6px 4px 0">${on()?`Status goes to Off Hand after 24 hrs without a check-in or update${n?" · <b style=\"color:var(--warn)\">"+n+" Off Hand now</b>":""}. `:"24-hour expiry is off. "}<button class="chip" id="exp24t" style="cursor:pointer">${on()?"Turn off":"Turn on"}</button></div>`}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{tagRows();
  if(view==="checkins"&&!document.getElementById("exp24")){const a=document.getElementById("ckMiss");if(a)a.insertAdjacentHTML("afterend",note())}}catch(e){}return r}}
document.addEventListener("click",e=>{const t=e.target;if(!t.closest||!t.closest("#exp24t"))return;e.stopImmediatePropagation();
  S.exp24=on()?false:true;rawSave();const y=window.scrollY;render();window.scrollTo(0,y);toast(on()?"Off Hand after 24 hrs":"24-hour expiry off")},true);
if(typeof every==="function")every(600000,()=>{try{if(on()&&real()&&window.ckStaleList().length&&(view==="board"||view==="people"||view==="checkins")){const y=window.scrollY;render();window.scrollTo(0,y)}}catch(e){}},"stale-24h");
{const st=document.createElement("style");st.textContent=`.tag.st24t{color:var(--warn);font-weight:700}`;document.head.appendChild(st)}
})();
