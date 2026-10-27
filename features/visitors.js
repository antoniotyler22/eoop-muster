/* Accounted For 1.7: Visitors.
   Guests sign in (name, who they're visiting, company, phone) and sign out. Anyone on site counts in an emergency:
   the emergency check-in screen lists visitors on site with a tap to mark each one accounted for, and the shared
   headcount adds a visitors line. Kiosk mode turns a phone or iPad at the door into a sign-in screen.
   The visitor log stays on this phone (per team) and exports to a spreadsheet. */
(()=>{
const KEEP_DAYS=90,MAX=1000;
const vlist=()=>{S.vis=Array.isArray(S.vis)?S.vis:[];return S.vis};
const onSite=()=>vlist().filter(v=>!v.out);
window.visitorsOnSite=()=>onSite().length;
const hm=t=>new Date(t).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
const day=t=>new Date(t).toLocaleDateString([],{weekday:"short",month:"short",day:"numeric"});
function prune(){const cut=Date.now()-KEEP_DAYS*864e5;const L=vlist();const keep=L.filter(v=>!v.out||v.out>cut).slice(0,MAX);if(keep.length!==L.length){S.vis=keep;save()}}
let vv={msg:"",armed:"",kiosk:false,last:""};

function signIn(){const g=id=>(($("#"+id)||{}).value||"").trim();const n=g("vsName");if(!n){vv.msg="Type the visitor's name.";draw();const i=$("#vsName");if(i)i.focus();return}
  const v={id:"v"+Date.now().toString(36)+rndId(3),n:n.slice(0,60),host:g("vsHost").slice(0,60),org:g("vsOrg").slice(0,60),ph:(typeof normPh==="function"?normPh(g("vsPh")):g("vsPh")).slice(0,20),in:Date.now(),out:0};
  vlist().unshift(v);save();vv.last=v.n;vv.msg="";if(!vv.kiosk)actAdd("🪪","Visitor signed in: "+v.n+(v.host?" (visiting "+v.host+")":""),"visitors");
  draw();toast(vv.kiosk?"Welcome, "+v.n.split(" ")[0]+". You're signed in.":"Signed in: "+v.n+". They count in an emergency check-in.");setTimeout(()=>{const i=$("#vsName");if(i)i.focus({preventScroll:true})},60)}
function signOut(id){const v=vlist().find(x=>x.id===id);if(!v||v.out)return;v.out=Date.now();save();if(!vv.kiosk)actAdd("👋","Visitor signed out: "+v.n,"visitors");
  toast(vv.kiosk?"Thanks, "+v.n.split(" ")[0]+". You're signed out.":"Signed out: "+v.n);draw()}
function csv(){const q=s=>'"'+String(s==null?"":s).replace(/"/g,'""')+'"';const L=[["Name","Visiting","Company","Phone","Signed in","Signed out"].map(q).join(",")];
  for(const v of vlist())L.push([v.n,v.host,v.org,v.ph,new Date(v.in).toLocaleString(),v.out?new Date(v.out).toLocaleString():"On site"].map(q).join(","));return L.join("\r\n")}

function formHTML(){return `<div class="panel" id="vsForm"><b style="font-size:18px">${vv.kiosk?"Welcome! Please sign in":"Sign a visitor in"}</b>
  <label for="vsName">Name</label><input id="vsName" type="text" maxlength="60" autocomplete="off" autocapitalize="words" placeholder="First and last name">
  <label for="vsHost">Visiting</label><input id="vsHost" type="text" maxlength="60" autocomplete="off" autocapitalize="words" placeholder="Who or which office">
  <div class="row2"><div><label for="vsOrg">Company (optional)</label><input id="vsOrg" type="text" maxlength="60" autocomplete="off"></div>
  <div><label for="vsPh">Phone (optional)</label><input id="vsPh" type="tel" inputmode="tel" maxlength="20" autocomplete="off"></div></div>
  <button class="btn" id="vsIn" style="min-height:56px;font-size:18px">Sign in</button></div>`}
function rowHTML(v,showOut){return `<div class="rrow" style="--sc:var(${v.out?"--line":"--s-onhand"})"><div class="rtop"><div class="who"><b>${esc(v.n)}</b>
  <div class="ph">${esc([v.host?"Visiting "+v.host:"",v.org].filter(Boolean).join(" · "))}${v.host||v.org?" · ":""}In ${esc(hm(v.in))}${v.out?" · Out "+esc(hm(v.out)):""}</div></div>
  ${showOut&&!v.out?`<button class="btn alt" data-vsout="${esc(v.id)}">Sign out</button>`:""}</div></div>`}
function draw(){if(view!=="visitors")return;const y=window.scrollY;renderVisitors();window.scrollTo(0,y)}
function renderVisitors(){prune();const on=onSite();const today=new Date().toDateString();
  const earlier=vlist().filter(v=>v.out&&new Date(v.in).toDateString()===today);
  let h="";
  if(vv.kiosk){h+=`<div class="vs-kiosk-top" data-noxl><b>${esc(unitName())}</b><button class="chip" id="vsKioskEnd" style="cursor:pointer">${vv.armed==="k"?"Tap again to exit kiosk mode":"Staff: exit kiosk"}</button></div>`;
    h+=formHTML();
    h+=`<h2>Leaving? Tap your name</h2>`+(on.length?`<div class="alist">${on.map(v=>`<button class="rrow vs-out-big" data-vsout="${esc(v.id)}" style="--sc:var(--s-onhand);width:100%;text-align:left"><b>${esc(v.n)}</b><span class="ph">Signed in ${esc(hm(v.in))} · tap to sign out</span></button>`).join("")}</div>`:`<div class="card"><p class="note" style="margin:0">No one is signed in.</p></div>`);
    $("#main").innerHTML=h;return}
  h+=`<div class="sech" style="margin-top:12px"><h2>Visitors</h2><span class="chip">${on.length} on site</span></div>`;
  h+=formHTML();
  h+=`<h2>On site now</h2>`+(on.length?`<div class="alist">${on.map(v=>rowHTML(v,true)).join("")}</div>`:`<div class="card"><p class="note" style="margin:0">No visitors on site.</p></div>`);
  if(earlier.length)h+=`<h2>Earlier today</h2><div class="alist">${earlier.map(v=>rowHTML(v,false)).join("")}</div>`;
  h+=`<div class="panel" style="margin-top:14px"><b>Front desk</b><p class="note" style="margin:2px 0 8px">Kiosk mode turns this phone or tablet into a sign-in screen for the door. Visitors sign themselves in and out.</p>
    <div class="row2"><button class="btn alt" id="vsKiosk">Start kiosk mode</button><button class="btn alt" id="vsCsv"${vlist().length?"":" disabled"}>Export log</button></div>
    <p class="note" style="margin:6px 0 0">The log stays on this phone for ${KEEP_DAYS} days.</p></div>`;
  h+=`<div class="note" role="status">${esc(vv.msg)}</div>`;
  $("#main").innerHTML=h}
function kiosk(on){vv.kiosk=on;vv.armed="";document.body.classList.toggle("vs-kiosk",on);if(on){view="visitors";try{document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen().catch(()=>{})}catch(e){}}
  else{try{document.fullscreenElement&&document.exitFullscreen()}catch(e){}}render();window.scrollTo(0,0)}
{const _r=render;render=function(){if(vv.kiosk&&view!=="visitors")view="visitors";if(view==="visitors"){renderTabs();renderVisitors();if(typeof animateView==="function")animateView();return}
  const r=_r.apply(this,arguments);try{homeChip()}catch(e){}return r}}
document.addEventListener("click",e=>{if(!e.target.closest)return;const t=e.target;
  if(t.closest("#vsIn")){signIn();return}
  const o=t.closest("[data-vsout]");if(o){signOut(o.dataset.vsout);return}
  if(t.closest("#vsKiosk")){kiosk(true);return}
  if(t.closest("#vsKioskEnd")){if(vv.armed!=="k"){vv.armed="k";draw();setTimeout(()=>{if(vv.armed==="k"){vv.armed="";draw()}},4000);return}kiosk(false);return}
  if(t.closest("#vsCsv")){shareFile(csv(),(unitName()+" visitors "+new Date().toISOString().slice(0,10)).replace(/[^\w -]+/g,"")+".csv","text/csv");return}
  const ok=t.closest("[data-vsok]");if(ok){const v=vlist().find(x=>x.id===ok.dataset.vsok);if(v&&S.rc){v.ok=v.ok===S.rc.rid?"":S.rc.rid;save();if(typeof render==="function"){const y=window.scrollY;render();window.scrollTo(0,y)}}return}});
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&/^vs(Name|Host|Org|Ph)$/.test(e.target.id||"")){e.preventDefault();signIn()}},true);
{const css=document.createElement("style");css.textContent=`body.vs-kiosk header.top,body.vs-kiosk #tabbar,body.vs-kiosk #subnav{display:none!important}
body.vs-kiosk #main{padding-top:calc(env(safe-area-inset-top,0px) + 12px)}
.vs-kiosk-top{display:flex;justify-content:space-between;align-items:center;margin:4px 2px 10px;font-size:18px}
.vs-out-big{display:flex;flex-direction:column;gap:2px;font:inherit;color:inherit;cursor:pointer;min-height:56px}
body.vs-kiosk #vsForm input{font-size:20px;min-height:52px}`;document.head.appendChild(css)}

/* ---------- emergency check-in: who else is in the building ---------- */
{const _rr=renderRecall;renderRecall=function(){_rr.apply(this,arguments);const on=onSite();if(!S.rc||!S.rc.open||!on.length)return;const main=$("#main");if(!main)return;
  const okN=on.filter(v=>v.ok===S.rc.rid).length;
  const html=`<div class="panel" id="vsEm" style="border-color:var(${okN===on.length?"--s-onhand":"--warn"})"><b>🪪 Visitors on site: ${okN} of ${on.length} accounted for</b>
    <div class="alist" style="margin-top:6px">${on.map(v=>`<div class="rrow" style="--sc:var(${v.ok===S.rc.rid?"--s-onhand":"--warn"})"><div class="rtop"><div class="who"><b>${esc(v.n)}</b><div class="ph">${esc(v.host?"Visiting "+v.host:"")}${v.ph?` · <a href="tel:${esc(v.ph)}">Call</a>`:""}</div></div>
      <button class="btn${v.ok===S.rc.rid?" alt":""}" data-vsok="${esc(v.id)}" aria-pressed="${v.ok===S.rc.rid}">${v.ok===S.rc.rid?"✓ Accounted for":"Mark accounted for"}</button></div></div>`).join("")}</div></div>`;
  const first=main.querySelector(".panel");if(first)first.insertAdjacentHTML("afterend",html);else main.insertAdjacentHTML("afterbegin",html)}}
/* the shared headcount gets a visitors line */
{const _rt=reportText;reportText=function(){let t=_rt.apply(this,arguments);const on=onSite();if(!on.length)return t;
  return t+"\nVISITORS ON SITE: "+on.length+" ("+on.slice(0,12).map(v=>v.n).join(", ")+(on.length>12?", …":"")+")"}}

/* ---------- Home: a line when visitors are on site ---------- */
function homeChip(){if(view!=="board"||vv.kiosk)return;const on=onSite().length;const old=$("#vsHome");if(!on){if(old)old.remove();return}
  const html=`<button class="chip" id="vsHome" data-go="visitors" style="cursor:pointer;margin:8px 0 0">🪪 ${on} visitor${on>1?"s":""} on site</button>`;
  if(old){old.outerHTML=html;return}const hero=document.querySelector("#main .card.hero");if(hero)hero.insertAdjacentHTML("afterend",html)}

/* ---------- Tools tile + help ---------- */
if(typeof HELP==="object")HELP.visitors=["Visitors","Sign guests in and out so everyone in the building counts in an emergency.",["Sign in: name and who they're visiting. Company and phone are optional.","On site now: tap Sign out as they go.","Emergency check-in lists visitors on site; tap Mark accounted for as you find each one. Shared headcount adds a visitors line.","Kiosk mode: a phone or tablet at the door where visitors sign themselves in and out. Staff tap Exit kiosk twice to close it.","Export log saves a spreadsheet of every visit."]];
})();
