/* Accounted For 4.131.0: tap a status on Home to see just those names.
   The "off deck" legend under the rings (Appointment 2, Leave 1, At PT 3 ...) used to be plain text. Each one is now a
   button: tap it and a list opens with only the people in that status (rank and name, section, where and until when).
   Tap a name to open that person. Off Hand = no check-in or update in 15 hours, same as the donut.
   4.138.4: the chips looked like plain text (the pill was an 8% white wash on the dark glass look), so nobody found them. They are
   now real buttons: tinted in their own ring color, outlined, with a chevron, a "Tap one to see who" hint, a pressed state, and they
   re-tag themselves whenever the legend is redrawn (live sync, 60-second refresh), not only on a full render. */
(()=>{
const SEG=[["Appointment","Appointment"],["duty","Duties"],["At PT","At PT"],["SIQ","SIQ"],["Operation","Operation"],["TAD","TAD"],["Leave","Leave"],["Other","Other"],["Off Hand","Off Hand"]];
const DUTY=["Company Duties","OOD","Duty Driver","DNCO","DANCO","Duty Recovery"];
const stale=m=>{try{return typeof window.ckStale==="function"&&window.ckStale(m)}catch(e){return false}};
const eff=m=>stale(m)?"Off Hand":m.status;
const inSeg=(k,m)=>{const s=eff(m);return k==="duty"?DUTY.includes(s):s===k};
const dt=x=>{try{const i=typeof isoOf==="function"?isoOf(x):"";return i&&typeof fmtD==="function"?fmtD(i):""}catch(e){return ""}};
const HV={"Appointment":"--hd1","duty":"--hd7","At PT":"--hd8","SIQ":"--hd2","Operation":"--hd3","TAD":"--hd4","Leave":"--hd5","Other":"--hd6","Off Hand":"--warn"};
{const c=document.createElement("style");c.textContent=`.hdl{gap:8px!important;margin:2px 0 6px!important}
.hdl span[data-hdk]{--hc:var(--hd2);cursor:pointer;min-height:36px;padding:6px 10px 6px 11px;border-radius:999px;color:var(--ink);background:color-mix(in srgb,var(--hc) 20%,transparent);border:1px solid color-mix(in srgb,var(--hc) 55%,transparent);box-shadow:0 1px 0 rgba(255,255,255,.05) inset;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;transition:transform .12s,background .12s}
.hdl span[data-hdk] i{width:10px;height:10px}.hdl span[data-hdk]::after{content:"\\203A";font-size:16px;line-height:1;margin-left:2px;opacity:.7;font-weight:600}
.hdl span[data-hdk]:active{transform:scale(.96);background:color-mix(in srgb,var(--hc) 38%,transparent)}
.hdl span[data-hdk]:focus-visible{outline:2px solid var(--hc);outline-offset:2px}
.hdh{margin:0 0 10px;font-size:11px;font-weight:600;color:var(--muted)}
.sfl{display:flex;flex-direction:column;gap:6px;margin:6px 0;max-height:52vh;overflow:auto}.sfl .rrow{cursor:pointer}`;document.head.appendChild(c)}
function tag(){const l=document.querySelector("#main .hdl");if(!l)return;
  l.querySelectorAll("span").forEach(sp=>{if(sp.dataset.hdk)return;const t=sp.textContent.trim().replace(/\s*\d+$/,"");const s=SEG.find(x=>x[1]===t);if(s){sp.dataset.hdk=s[0];sp.setAttribute("role","button");sp.tabIndex=0;sp.style.setProperty("--hc","var("+(HV[s[0]]||"--hd2")+")")}});
  if(l.querySelector("span[data-hdk]")&&!(l.nextElementSibling&&l.nextElementSibling.classList.contains("hdh")))l.insertAdjacentHTML("afterend",'<div class="hdh">Tap one to see who</div>')}
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
{let q=0;const go=()=>{q=0;try{tag()}catch(e){}};const m=document.getElementById("main");
  if(m&&window.MutationObserver)new MutationObserver(()=>{if(!q)q=requestAnimationFrame?requestAnimationFrame(go):setTimeout(go,16)}).observe(m,{childList:true,subtree:true})}
window.statusFilterOpen=open;
})();
