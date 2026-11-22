/* Accounted For 4.80 (4.137.0: 15 hours): a status that is 15 hours old stops counting, so a leader knows what they see is fresh.
   Everyone's status is only good for 15 hours after their last check-in or update (their own check-in, a leader's
   Confirm, a section leader's live update, or any status change). After that they default to Off Hand: out of the On Hand / present
   numbers and show "Off Hand" on the board, so you can see who hasn't checked in. Their last known status is
   kept (nothing is erased or synced); the next check-in or update starts a fresh 15 hours.
   Not affected: people away with a From and To date covering today (Leave, TAD, Operation, SIQ, Appointment, etc. are not expected to
   check in), Attached people (ATT), sample data, and member phones. Check-ins screen: switch it off or on there. */
(()=>{
const DAY=15*3600000;/* 4.137.0: 15 hours (was 24) */
const on=()=>S.exp24!==false;
const real=()=>S.source!=="sample"&&Array.isArray(S.roster)&&S.roster.length>0&&!(typeof memberMode==="function"&&memberMode());
function away(m){if(!AWAY.includes(m.status))return false;const s=isoOf(m.start)||"",e=isoOf(m.end)||"",d=dkey();
  /* 4.137.0: only someone with a From and To date (an operation, leave, TAD) skips the 15-hour rule; with no dates they expire like anyone who hasn't updated */
  if(!s||!e)return false;
  return s<=d&&e>=d}
function touched(m){let t=+m.ckAt||0;if(+m.ut>t)t=+m.ut;if(m.upd&&+m.upd.t>t)t=+m.upd.t;const L=(S.tl||{})[m.id];if(L&&L.length){const x=+L[L.length-1][0]||0;if(x>t)t=x}return t}
/* 4.143.0: a leader can set everyone who is On Hand to Off Hand (S.offAt = the moment they did it, synced with the team).
   Anyone On Hand whose last check-in or update is at or before that moment shows Off Hand; their next check-in or update brings them back.
   It is a way to test that everyone is checking in and the check-in button works. Nothing is erased. */
const reset=()=>+S.offAt||0;
function pending(){const p=new Set();const R=reset();for(const x of S.cks||[])if(x&&x.mid&&Date.now()-(+x.t||0)<DAY&&(+x.t||0)>R)p.add(x.mid);return p}
function isStale(m,pend){if(!on()||!real()||!m||m.sec==="ATT"||away(m))return false;const p=pend||pending();if(p.has(m.id)||(m.uid&&p.has(m.uid)))return false;const t=touched(m);const R=reset();if(R&&m.status==="On Hand"&&t<=R)return true;return !!t&&Date.now()-t>=DAY}
const canReset=()=>real()&&!(typeof role==="function"&&role()==="view");
let offArm=false;
const onHandN=()=>(S.roster||[]).filter(m=>m&&m.status==="On Hand"&&m.sec!=="ATT").length;
function offBtns(){if(!canReset())return "";const R=reset();
  return `<div id="offRow" style="margin:8px 4px 0;display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="chip" id="offReset" style="cursor:pointer;min-height:40px">${offArm?"Tap again: set "+onHandN()+" On Hand to Off Hand":"Set everyone Off Hand"}</button>${R?`<button class="chip" id="offUndo" style="cursor:pointer;min-height:40px">Undo reset</button>`:""}</div><div class="note" style="margin:4px 4px 0">${R?"Reset at "+new Date(R).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})+". Each person goes back to On Hand when they check in.":"Test that everyone is checking in: everyone On Hand shows Off Hand until they check in again."}</div>`}
window.ckStale=m=>isStale(m);
/* 4.120.2: the last-update time travels with the roster (ut) so every phone with a link agrees on who is Off Hand */
window.ckTouched=touched;
window.ckStaleList=()=>{if(!on()||!real())return[];const p=pending();return S.roster.filter(m=>isStale(m,p))};
{const _c=counts;counts=function(){const r=_c.apply(this,arguments);
  try{if(!on()||!real())return r;const {c,T}=r;const p=pending();T.stale=0;T["Off Hand"]=0;for(const k of Object.keys(c))if(c[k]){c[k].stale=0;c[k]["Off Hand"]=0}
    for(const m of S.roster){if(!isStale(m,p))continue;const o=c[m.sec];if(!o)continue;
      if(o[m.status]>0)o[m.status]--;if(T[m.status]>0)T[m.status]--;if(typeof apptOff==="function"&&apptOff(m)){if(o.off>0)o.off--;if(T.off>0)T.off--}o.stale++;T.stale++;o["Off Hand"]++;T["Off Hand"]++}}catch(e){}
  return r}}
/* 4.120.1: tapping the status someone already has (On Hand on a person showing Off Hand because 15 hrs passed) counts as an update.
   4.120.2: stamped as an update (m.upd), not a check-in (m.ckAt), so a leader's tap doesn't mark them as checked in. */
window.addEventListener("click",e=>{const so=e.target.closest&&e.target.closest("[data-sopt]");if(!so||!sheetCtx||sheetCtx.kind!=="s"||S.role==="view")return;
  const m=S.roster.find(x=>x.id===sheetCtx.id);if(!m||so.dataset.sopt!==m.status)return;m.upd={t:Date.now(),sec:m.sec};try{save()}catch(x){}},true);
/* a note that names another status ("TAD(30 days)" on someone now Appt) is leftover from before the change: drop it */
function oldNotes(){if(!real()||!Array.isArray(S.roster))return;let n=0;
  for(const m of S.roster){const d=String(m.detail||"").trim();if(!d||m.sec==="ATT")continue;
    const k=/^(tad|fap|leave|siq|field duty)\b/i.exec(d);if(!k)continue;
    const w=/^leave/i.test(d)?"Leave":/^(tad|fap)/i.test(d)?"TAD":/^field/i.test(d)?"Operation":"SIQ";
    if(m.status!==w){delete m.detail;n++}}
  if(n){try{save()}catch(e){}}}
function tagRows(){if(!on()||!real())return;const p=pending();
  for(const m of S.roster){if(!isStale(m,p))continue;const who=document.querySelector('.m [data-pcard="'+(window.CSS&&CSS.escape?CSS.escape(m.id):m.id)+'"]');if(!who)continue;
    const row=who.closest(".m");if(row){row.style.setProperty("--sc","var(--warn)");row.classList.add("st24")}
    const pill=row&&row.querySelector('.pill[data-pick="s"]');if(pill){pill.style.setProperty("--pc","var(--warn)");const lb=pill.querySelector("span:last-child");if(lb)lb.textContent="Off Hand"}
    if(!who.querySelector(".st24t"))who.insertAdjacentHTML("beforeend",`<span class="tag st24t" title="Off Hand: no check-in or update in 15 hours. Last: ${esc(SHORT[m.status]||m.status)}">Off Hand</span>`)}}
function note(){if(!real()||(typeof role==="function"&&role()==="view"))return "";const n=window.ckStaleList().length;
  return `<div class="note" id="exp24" style="margin:6px 4px 0">${on()?`Status goes to Off Hand after 15 hrs without a check-in or update${n?" · <b style=\"color:var(--warn)\">"+n+" Off Hand now</b>":""}. `:"15-hour expiry is off. "}<button class="chip" id="exp24t" style="cursor:pointer">${on()?"Turn off":"Turn on"}</button></div>`+offBtns()}
{const _r=render;render=function(){try{oldNotes()}catch(e){}const r=_r.apply(this,arguments);try{tagRows();
  if(view==="checkins"&&!document.getElementById("exp24")){const a=document.getElementById("ckMiss");if(a)a.insertAdjacentHTML("afterend",note())}}catch(e){}return r}}
document.addEventListener("click",e=>{const t=e.target;if(!t.closest||!t.closest("#exp24t"))return;e.stopImmediatePropagation();
  S.exp24=on()?false:true;rawSave();const y=window.scrollY;render();window.scrollTo(0,y);toast(on()?"Off Hand after 15 hrs":"15-hour expiry off")},true);
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;
  if(t.closest("#offReset")){e.stopImmediatePropagation();if(!canReset())return;
    if(!offArm){offArm=true;const y=window.scrollY;render();window.scrollTo(0,y);setTimeout(()=>{if(offArm){offArm=false;if(view==="checkins")render()}},4000);return}
    offArm=false;const n=onHandN();S.offAt=Date.now();S.exp24=true;try{save()}catch(x){}
    try{if(typeof actAdd==="function")actAdd("🔄","Set "+n+" On Hand to Off Hand to test check-ins","checkins")}catch(x){}
    const y=window.scrollY;render();window.scrollTo(0,y);toast(n+" set to Off Hand. They come back when they check in.");return}
  if(t.closest("#offUndo")){e.stopImmediatePropagation();delete S.offAt;try{save()}catch(x){}const y=window.scrollY;render();window.scrollTo(0,y);toast("Reset undone")}},true);
window.ckOffReset=()=>reset();
/* every 10 min: redraw only when someone newly went Off Hand since the last draw, so typing and open forms aren't wiped */
let seen="";const sig=()=>window.ckStaleList().map(m=>m.id).sort().join(",");
{const _r2=render;render=function(){try{seen=sig()}catch(e){}return _r2.apply(this,arguments)}}
if(typeof every==="function")every(600000,()=>{try{if(!on()||!real())return;const n=sig();if(n!==seen&&(view==="board"||view==="people"||view==="checkins")&&!/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement||{}).tagName||"")){const y=window.scrollY;render();window.scrollTo(0,y)}}catch(e){}},"stale-24h");
{const st=document.createElement("style");st.textContent=`.tag.st24t{color:var(--warn);font-weight:700}`;document.head.appendChild(st)}
})();
