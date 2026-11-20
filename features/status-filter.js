/* Accounted For 4.131.0: tap a status on Home to see just those names.
   The "off deck" legend under the rings (Appointment 2, Leave 1, At PT 3 ...) used to be plain text. Each one is now a
   button: tap it and a list opens with only the people in that status (rank and name, section, where and until when).
   Tap a name to open that person. Off Hand = no check-in or update in 15 hours, same as the donut. */
(()=>{
const SEG=[["Appointment","Appointment"],["duty","Duties"],["At PT","At PT"],["SIQ","SIQ"],["Operation","Operation"],["TAD","TAD"],["Leave","Leave"],["Other","Other"],["Off Hand","Off Hand"]];
const DUTY=["Company Duties","OOD","Duty Driver","DNCO","DANCO","Duty Recovery"];
const stale=m=>{try{return typeof window.ckStale==="function"&&window.ckStale(m)}catch(e){return false}};
const eff=m=>stale(m)?"Off Hand":m.status;
const inSeg=(k,m)=>{const s=eff(m);return k==="duty"?DUTY.includes(s):s===k};
const dt=x=>{try{const i=typeof isoOf==="function"?isoOf(x):"";return i&&typeof fmtD==="function"?fmtD(i):""}catch(e){return ""}};
{const c=document.createElement("style");c.textContent=`.hdl span[data-hdk]{cursor:pointer;min-height:32px;padding:4px 10px;border-radius:999px;background:var(--line,#e3e6ea);-webkit-tap-highlight-color:transparent}.hdl span[data-hdk]:active{opacity:.7}
.sfl{display:flex;flex-direction:column;gap:6px;margin:6px 0;max-height:52vh;overflow:auto}.sfl .rrow{cursor:pointer}`;document.head.appendChild(c)}
function tag(){const l=document.querySelector("#main .hdl");if(!l)return;
  l.querySelectorAll("span").forEach(sp=>{if(sp.dataset.hdk)return;const t=sp.textContent.trim().replace(/\s*\d+$/,"");const s=SEG.find(x=>x[1]===t);if(s){sp.dataset.hdk=s[0];sp.setAttribute("role","button");sp.tabIndex=0}})}
function open(k){const label=(SEG.find(x=>x[0]===k)||[k,k])[1];
  const L=(typeof sorted==="function"?sorted(S.roster||[]):(S.roster||[]).slice()).filter(m=>inSeg(k,m));
  sheetCtx={kind:"sfilter",k};
  $("#sheetT").innerHTML=`${esc(label)} · ${L.length}<small>${L.length?"Tap a name to open them.":"No one right now."}</small>`;
  $("#sheetOpts").innerHTML=`<div class="sfl">${L.map(m=>{const when=[dt(m.start),dt(m.end)].filter(Boolean).join(" to ");
    const sub=[m.sec,k==="duty"||k==="Other"?(SHORT&&SHORT[m.status])||m.status:"",m.loc||"",when].filter(Boolean).join(" · ");
    return `<div class="rrow" data-pcard="${esc(m.id)}"><div class="who" style="flex:1;min-width:0"><b>${esc(m.rank)} ${esc(m.name)}</b><div class="ph">${esc(sub)}</div></div></div>`}).join("")}</div><button class="btn alt" data-sclose="1" style="margin-top:8px">Close</button>`;
  if(typeof sheetOpen==="function")sheetOpen();else{const sh=$("#sheet");sh.hidden=false;void sh.offsetWidth;sh.classList.add("open")}}
document.addEventListener("click",e=>{const sp=e.target&&e.target.closest&&e.target.closest(".hdl span[data-hdk]");if(!sp)return;e.stopImmediatePropagation();e.preventDefault();open(sp.dataset.hdk)},true);
document.addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ")return;const sp=e.target&&e.target.closest&&e.target.closest(".hdl span[data-hdk]");if(sp){e.preventDefault();open(sp.dataset.hdk)}});
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{if(view==="board")tag()}catch(e){}return r}}
window.statusFilterOpen=open;
})();
