/* Accounted For 4.65: Plan › Calendar, redesigned (Mix 1).
   - The month is a heat map: the darker the day, the more people are out. The number under each day says how many.
     Today has a red dot; the picked day has a dark outline. A Month / Week switch folds the month to just the
     picked day's week (remembered on this phone).
   - Under the month, the picked day shows three tiles: Leave, TAD and Appts (plus Other when there is any), each
     with a count and faces. Tap a tile to open its people with Back ✓ / Hide / Done, exactly as before.
   - Anything with a time that day sits on a timeline with a red now line. Tap one to open that person's card.
   The day list and buttons are the same rows as before, just organized. 4.66: the "Next 14 days" list is gone. */
(()=>{
if(typeof renderCal!=="function")return;
let mode="month";try{mode=localStorage.getItem("af-calmode")||"month"}catch(e){}
let open="";let openDay="";
const GROUP={LEAVE:"lv",TAD:"td",APPT:"ap"};const GN={lv:"Leave",td:"TAD",ap:"Appts",ot:"Other"};const GV={lv:"--s-leave",td:"--s-tad",ap:"--s-aob",ot:"--brass"};
const VARMAP={"--s-leave":"lv","--s-tad":"td","--s-aob":"ap"};
const ini=m=>{const n=String(lastOf?lastOf(m):m.name||"").replace(/[^A-Za-z]/g,"");return n.slice(0,2).toUpperCase()||"?"};
function monthData(){const [Y,Mo]=calM;const first=new Date(Y,Mo,1),last=new Date(Y,Mo+1,0);const from=dkey(first),to=dkey(last);
  const all=calEntries(from,to,calSec);const multi=calEntries(dkey(new Date(Y,Mo-2,1)),to,calSec).filter(e=>e.end&&e.end>e.d);
  const onDay=k=>all.filter(e=>e.d===k).concat(multi.filter(e=>e.d<k&&e.end>=k));return{first,last,onDay}}
function heat(main){const btns=[...main.querySelectorAll("[data-cday]")];if(!btns.length)return;const grid=btns[0].parentElement;const panel=grid.closest(".panel");
  const {first,onDay}=monthData();const today=dkey();const counts=btns.map(b=>onDay(b.dataset.cday).length);const max=Math.max(4,...counts);
  btns.forEach((b,i)=>{const n=counts[i];const k=b.dataset.cday;const lv=n?Math.min(3,Math.ceil(n/max*3)):0;const pct=[0,16,38,70][lv];
    b.className="cm-d"+(k===calDay?" sel":"")+(k===today?" today":"");b.removeAttribute("style");
    b.style.background=lv?`color-mix(in srgb,var(--s-aob) ${pct}%,var(--surface-solid,#fff))`:"var(--surface-solid,#fff)";if(!lv)b.style.boxShadow="inset 0 0 0 1px var(--line)";if(lv===3)b.style.color="#fff";
    const d=+k.slice(8);b.innerHTML=`<b>${d}</b>${n?`<small>${n}</small>`:""}`;b.setAttribute("aria-label",`${d}: ${n} on the calendar`)});
  grid.classList.add("cm-grid");
  /* week fold: keep only the picked day's row */
  const off=first.getDay();const wkOf=k=>Math.floor((off+(+k.slice(8))-1)/7);const sel=calDay&&calDay.slice(0,7)===dkey(first).slice(0,7)?wkOf(calDay):wkOf(today);
  const kids=[...grid.children];let blank=0;
  kids.forEach(el=>{if(el.dataset&&el.dataset.cday){el.hidden=mode==="week"&&wkOf(el.dataset.cday)!==sel;return}
    if(el.classList.contains("note"))return;/* S M T W headers */blank++;el.hidden=mode==="week"&&sel!==0;el.classList.add("cm-blank")});
  /* header: Month / Week */
  const head=panel&&panel.firstElementChild;if(head&&!head.querySelector(".cm-seg"))head.insertAdjacentHTML("beforeend",`<span class="cm-seg" role="group" aria-label="Month or week"><button type="button" data-cmmode="month" aria-pressed="${mode==="month"}">Month</button><button type="button" data-cmmode="week" aria-pressed="${mode==="week"}">Week</button></span>`);
  /* legend becomes a heat scale */
  const leg=panel&&panel.querySelector(":scope>.note");if(leg)leg.outerHTML=`<div class="cm-scale">${mode==="week"?"":`Fewer <i style="background:color-mix(in srgb,var(--s-aob) 16%,var(--surface-solid,#fff))"></i><i style="background:color-mix(in srgb,var(--s-aob) 38%,var(--surface-solid,#fff))"></i><i style="background:color-mix(in srgb,var(--s-aob) 70%,var(--surface-solid,#fff))"></i> More on the calendar`}</div>`}
function day(main){const h2=[...main.querySelectorAll("h2")].find(x=>x.querySelector("#caAddBtn"));if(!h2)return;
  let list=h2.nextElementSibling;while(list&&list.classList.contains("panel"))list=list.nextElementSibling;/* the add form */
  if(!list||!list.classList.contains("alist"))return;
  if(openDay!==calDay){open="";openDay=calDay}
  const rows=[...list.children].filter(r=>r.classList.contains("rrow")||r.classList.contains("sw"));
  const G={lv:[],td:[],ap:[],ot:[]};
  rows.forEach(r=>{const rr=r.classList.contains("rrow")?r:r.querySelector(".rrow");const st=(rr&&rr.getAttribute("style"))||"";const v=(st.match(/var\((--[a-z-]+)\)/)||[])[1];G[VARMAP[v]||"ot"].push(r)});
  const faces=rs=>rs.slice(0,4).map(r=>{const p=r.querySelector("[data-pcard]");const m=p&&S.roster.find(x=>x.id===p.dataset.pcard);return m?`<i>${esc(ini(m))}</i>`:""}).join("");
  const keys=["lv","td","ap"].concat(G.ot.length?["ot"]:[]);
  const n=rows.length;
  h2.insertAdjacentHTML("afterend",`<div class="cm-og" style="--cols:${keys.length}">${keys.map(k=>`<button type="button" class="cm-t${open===k?" on":""}" data-cmg="${k}" style="--c:var(${GV[k]})" aria-expanded="${open===k}" ${G[k].length?"":"disabled"}><b>${G[k].length}</b><span>${GN[k]}</span><span class="cm-av">${faces(G[k])}</span></button>`).join("")}</div>`);
  /* only the open group's rows show */
  rows.forEach(r=>{r.hidden=true});if(open&&G[open])G[open].forEach(r=>{r.hidden=false});
  list.classList.add("cm-list");list.hidden=!open||!G[open]||!G[open].length;
  if(!n){const og=h2.nextElementSibling;if(og&&og.classList.contains("cm-og"))og.remove()}
  /* timeline of timed things */
  const {onDay}=monthData();let es=[];try{es=(calDay.slice(0,7)===dkey(new Date(calM[0],calM[1],1)).slice(0,7)?onDay(calDay):calOn(calDay,calSec)).filter(e=>e.tm&&/^\d{1,2}:\d{2}/.test(e.tm))}catch(e){}
  if(es.length){const mins=e=>{const [a,b]=e.tm.split(":");return +a*60+ +b};const lo=Math.min(7,...es.map(e=>Math.floor(mins(e)/60))),hi=Math.max(17,...es.map(e=>Math.ceil(mins(e)/60)+1));
    const HH=44;let t=`<div class="cm-sub">Timed · ${es.length}</div><div class="cm-tl" style="height:${(hi-lo)*HH+8}px">`;
    for(let x=lo;x<=hi;x++)t+=`<div class="cm-h" style="top:${(x-lo)*HH}px"><b>${String(x).padStart(2,"0")}00</b></div>`;
    es.sort((a,b)=>mins(a)-mins(b)).forEach((e,i)=>{const top=(mins(e)/60-lo)*HH+2;const c=ctype(e.ty)[2];
      t+=`<button type="button" class="cm-e" ${e.m?`data-pcard="${e.m.id}"`:""} style="top:${top}px;--c:var(${c})">${esc(e.tm.replace(":",""))} · ${esc(e.ti)}<span>${e.m?esc(e.m.rank+" "+lastOf(e.m)+" · "+e.m.sec):esc(e.grp||"Unit")}</span></button>`});
    if(calDay===dkey()){const d=new Date();const nm=d.getHours()*60+d.getMinutes();if(nm>=lo*60&&nm<=hi*60)t+=`<span class="cm-now" style="top:${(nm/60-lo)*HH}px"></span>`}
    t+="</div>";list.insertAdjacentHTML("afterend",t)}}
function noNext(m){const h=[...m.querySelectorAll("h2")].find(x=>/^Next 14 days/.test(x.textContent.trim()));if(!h)return;const l=h.nextElementSibling;if(l&&l.classList.contains("alist"))l.remove();h.remove()}
{const _rc=renderCal;renderCal=function(){const r=_rc.apply(this,arguments);try{const m=$("#main");if(m&&(view==="cal"||m.querySelector("[data-cday]"))){noNext(m);heat(m);day(m)}}catch(e){console.warn(e)}return r}}
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;
  const md=t.closest("[data-cmmode]");if(md){e.stopImmediatePropagation();mode=md.dataset.cmmode;try{localStorage.setItem("af-calmode",mode)}catch(_){}const y=window.scrollY;renderCal();window.scrollTo(0,y);return}
  const g=t.closest("[data-cmg]");if(g){e.stopImmediatePropagation();open=open===g.dataset.cmg?"":g.dataset.cmg;openDay=calDay;const y=window.scrollY;renderCal();window.scrollTo(0,y);return}},true);
window.calMix={get mode(){return mode},set mode(v){mode=v==="week"?"week":"month"},get open(){return open},set open(v){open=v||""}};
const st=document.createElement("style");st.textContent=`
.cm-grid{gap:4px!important}
.cm-d{position:relative;border:0!important;border-radius:11px!important;min-height:44px;padding:4px 0 3px!important;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;cursor:pointer;color:var(--ink);font:inherit}
.cm-d b{font-size:14px;font-weight:800;line-height:1.1}.cm-d small{font-size:9.5px;font-weight:800;opacity:.75;line-height:1}
.cm-d.sel{outline:2.5px solid var(--ink);outline-offset:1px}
.cm-d.today:after{content:"";position:absolute;top:4px;right:5px;width:6px;height:6px;border-radius:50%;background:#e5484d}
.cm-grid>[hidden]{display:none!important}
.cm-seg{display:inline-flex;background:var(--line);border-radius:999px;padding:2px;margin-left:6px;vertical-align:middle}
.cm-seg button{border:0;background:none;border-radius:999px;font:inherit;font-size:11.5px;font-weight:800;padding:4px 10px;color:var(--muted);cursor:pointer}
.cm-seg button[aria-pressed="true"]{background:var(--surface-solid,#fff);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.15)}
.cm-scale{display:flex;align-items:center;gap:4px;font-size:11px;font-weight:700;color:var(--muted);margin-top:8px}.cm-scale i{display:inline-block;width:18px;height:9px;border-radius:3px}
.cm-og{display:grid;grid-template-columns:repeat(var(--cols),1fr);gap:7px;margin:4px 0 8px}
.cm-t{border:1px solid var(--line);border-top:3px solid var(--c);background:var(--surface-solid,var(--surface));border-radius:14px;padding:8px 9px;text-align:left;font:inherit;color:var(--ink);cursor:pointer;min-width:0}
.cm-t b{display:block;font-size:22px;font-weight:800;line-height:1}.cm-t>span{display:block;font-size:11.5px;font-weight:800;color:var(--muted);margin-top:2px}
.cm-t.on{outline:2px solid var(--ink)}.cm-t:disabled{opacity:.45;cursor:default}
.cm-av{display:flex!important;margin-top:6px!important;min-height:20px}.cm-av i{width:20px;height:20px;border-radius:50%;border:2px solid var(--surface-solid,#fff);margin-left:-6px;font-style:normal;font-size:7.5px;font-weight:800;color:#fff;display:grid;place-items:center;background:var(--c)}.cm-av i:first-child{margin-left:0}
.cm-list>[hidden]{display:none!important}
.cm-sub{font-size:11.5px;font-weight:800;color:var(--muted);letter-spacing:.04em;text-transform:uppercase;margin:14px 2px 6px}
.cm-tl{position:relative;margin-left:42px}
.cm-h{position:absolute;left:0;right:0;border-top:1px solid var(--line)}.cm-h b{position:absolute;left:-42px;top:-7px;font-size:10.5px;color:var(--muted);font-weight:800}
.cm-e{position:absolute;left:0;right:0;min-height:36px;border:0;border-left:4px solid var(--c);border-radius:10px;padding:5px 9px;text-align:left;font:inherit;font-size:12.5px;font-weight:800;color:var(--ink);background:color-mix(in srgb,var(--c) 16%,var(--surface-solid,#fff));cursor:pointer;z-index:1;overflow:hidden}
.cm-e span{display:block;font-size:11px;font-weight:600;color:var(--muted)}
.cm-now{position:absolute;left:-6px;right:0;height:2px;background:#e5484d;z-index:2}.cm-now:before{content:"";position:absolute;left:-4px;top:-3px;width:8px;height:8px;border-radius:50%;background:#e5484d}
`;document.head.appendChild(st);
})();
