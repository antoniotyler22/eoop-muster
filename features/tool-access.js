/* Accounted For 4.81.0: tool switches.
   Gear and Licensing are extra tools. They start off, so a team that doesn't use them never sees them.
   1. The OIC opens Tools → People & access → Tool access and turns Gear and/or Licensing on for the team.
   2. Then, per person: Gear can be Off, Status (sees equipment up and down, can flip it) or Manager (tool room: sign out, returns,
      inventory); Licensing can be Off or Manager (classes, rosters, documents). Off means the tab and tile stay hidden for that person.
   3. The OIC (and Same-rights-as-OIC phones) always have the full tool once it is on for the team. Editors (SNCOIC) get Gear status.
   Shared helpers live on window.afTool for gear.js and licensing.js. */
(()=>{
const mem=()=>typeof memberMode==="function"&&memberMode();
const mods=()=>{S.mods=S.mods&&typeof S.mods==="object"?S.mods:{};return S.mods};
const ownerish=()=>(typeof isOwner==="function"&&isOwner())||!!S.lite;
const whoRow=()=>S.who&&S.who.id?(S.roster||[]).find(x=>x.id===S.who.id||x.uid===S.who.id)||null:null;
/* "" (hidden) | "mgr" | "ops" */
function level(k){if(mem()||!mods()[k])return "";if(ownerish())return "mgr";const m=whoRow();const v=m&&m.tools&&m.tools[k];if(v)return v;if(k==="gear"&&S.role==="sncoic")return "ops";return ""}
function setTeam(k,on){if(!ownerish())return false;mods()[k]=!!on;save();return true}
function setPerson(id,k,v){if(!ownerish())return false;const m=(S.roster||[]).find(x=>x.id===id);if(!m)return false;m.tools=m.tools||{};if(v)m.tools[k]=v;else delete m.tools[k];if(!Object.keys(m.tools).length)delete m.tools;save();return true}
/* "SGT Ramirez", "Ramirez, Al", "Al Ramirez" -> the roster row, or null when it isn't one clear person */
function match(txt){let s=String(txt||"").toUpperCase().replace(/[^A-Z,'\s-]/g," ").replace(/\s+/g," ").trim();if(!s)return null;let last,first="";
  if(s.includes(",")){const p=s.split(",");last=p[0].trim();first=(p[1]||"").trim().split(" ")[0]||""}
  else{const w=s.split(" ");last=w[w.length-1];first=w.length>1?w[0]:""}
  last=last.replace(/\s+/g,"");if(!last)return null;
  let c=(S.roster||[]).filter(m=>m&&m.name&&lastOf(m).replace(/[^A-Z'-]/g,"")===last);
  if(c.length>1&&first){const fn=m=>String((m.name.split(",")[1]||"").trim().split(" ")[0]||"").toUpperCase();const byF=c.filter(m=>fn(m).startsWith(first)||first.startsWith(fn(m))&&fn(m));
    if(byF.length)c=byF;else{const byR=c.filter(m=>String(m.rank||"").toUpperCase()===first);if(byR.length)c=byR}}
  return c.length===1?c[0]:null}
const nm=m=>m?((m.rank?m.rank+" ":"")+lastOf(m)).trim():"";
/* text copied from a spreadsheet is tab-separated; the app's CSV reader wants commas */
const csv=t=>String(t||"").includes("\t")?String(t).replace(/\r/g,"").split("\n").map(l=>l.split("\t").map(c=>/[",\n]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c).join(",")).join("\n"):String(t||"");
window.afTool={mods,level,setTeam,setPerson,match,nm,ownerish,csv};

/* ---------- the page ---------- */
let q="";
const lv=(m,k)=>(m.tools&&m.tools[k])||"";
function list(){const M=mods();const ppl=sorted((S.roster||[]).filter(m=>m&&m.name));const t=q.trim().toUpperCase();
  const L=t?ppl.filter(m=>(m.rank+" "+m.name).toUpperCase().includes(t)):ppl;
  if(!L.length)return `<p class="note">${ppl.length?"No one matches.":"Add people to your roster first."}</p>`;
  const chip=(m,k,v,t2)=>`<button class="chip afc${lv(m,k)===v?" on":""}" data-tper="${esc(m.id)}|${k}|${v}" aria-pressed="${lv(m,k)===v}">${t2}</button>`;
  return L.slice(0,80).map(m=>`<div class="afp"><div><b>${esc(m.rank)}</b> ${esc(m.name)}<span class="note"> · ${esc(m.sec)}</span></div>
    ${M.gear?`<div class="afl"><span>Gear</span>${chip(m,"gear","","Off")}${chip(m,"gear","ops","Status")}${chip(m,"gear","mgr","Manager")}</div>`:""}
    ${M.lic?`<div class="afl"><span>Licensing</span>${chip(m,"lic","","Off")}${chip(m,"lic","mgr","Manager")}</div>`:""}</div>`).join("")+(L.length>80?`<p class="note">Showing 80 of ${L.length}. Search to find someone.</p>`:"")}
function panel(){const M=mods();const own=ownerish();
  const row=(k,t,s)=>`<div class="rrow" style="--sc:var(${M[k]?"--s-onhand":"--line"})"><div class="who"><b>${t}</b><div class="ph">${s}</div></div><button class="chip afc${M[k]?" on":""}" data-tmod="${k}" aria-pressed="${!!M[k]}">${M[k]?"On":"Off"}</button></div>`;
  let h=`<button class="chip" data-go="tools" style="cursor:pointer;margin-top:12px">◂ Tools</button><h2>Tool access</h2><p class="note">Turn on the extra tools your team uses, then choose who gets them. Off means the tool stays hidden.</p>
    <div class="panel" id="afTeam">${row("gear","Gear","Tool room sign-out, inventory, equipment up and down")}${row("lic","Licensing","Classes, seats, rosters, documents and its own calendar")}${own?"":`<p class="note">Only the OIC can change these.</p>`}</div>`;
  if(own&&(M.gear||M.lic))h+=`<h2>Who gets what</h2><input type="text" id="afTq" placeholder="Search people" autocomplete="off" value="${esc(q)}"><div id="afTL">${list()}</div><p class="note">The OIC always has the full tool. Manager runs it; Status only sees and updates what's up or down.</p>`;
  return h}
function css(){if(document.getElementById("afToolCss"))return;const s=document.createElement("style");s.id="afToolCss";
  s.textContent=`.afc{cursor:pointer;border:1px solid var(--line,#ccc);background:transparent}.afc.on{background:var(--brass,#b8963e);color:#fff;border-color:transparent}
.afp{padding:9px 0;border-bottom:1px solid var(--line,#ddd)}.afl{display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap}.afl>span{min-width:74px;font-size:13px;opacity:.75}`;document.head.appendChild(s)}
css();
{const _r=render;render=function(){if(view==="toolsw"){renderTabs();$("#main").innerHTML=panel();if(typeof animateView==="function")animateView();return}return _r.apply(this,arguments)}}
{const _to=tabOf;tabOf=function(v){return v==="toolsw"||v==="gear"||v==="lic"?"tools":_to.apply(this,arguments)}}
/* tiles in Tools (simple.js folds them into groups) */
{const _rt=renderTools;renderTools=function(){const r=_rt.apply(this,arguments);try{
  const T=[];if(level("gear"))T.push(["gear","armory",level("gear")==="mgr"?"Gear":"Equipment",gearSub()]);if(level("lic"))T.push(["lic","events","Licensing",licSub()]);if(ownerish())T.push(["toolsw","people","Tool access","Turn Gear and Licensing on, choose who gets them"]);
  if(!T.length)return r;let g=[...document.querySelectorAll("#main .tgrid")].find(x=>x.id!=="sgGrid");if(!g){g=document.createElement("div");g.className="tgrid";$("#main").appendChild(g)}
  g.insertAdjacentHTML("beforeend",T.map(t=>`<button data-go="${t[0]}"><span class="ic">${svg(t[1])}</span><span><b>${esc(t[2])}</b><small>${esc(t[3])}</small></span></button>`).join(""));if(typeof sgRegroup==="function")sgRegroup()}catch(e){}return r}}
function gearSub(){const it=(S.gear&&S.gear.items)||[];if(!it.length)return "Sign gear out, run inventory";const out=it.filter(x=>x.h||x.hn).length,dn=it.filter(x=>x.dn).length;return out+" out · "+dn+" down"}
function licSub(){const c=((S.lic&&S.lic.classes)||[]).filter(x=>!x.done&&x.d>=dkey());return c.length?c.length+" upcoming class"+(c.length>1?"es":""):"Classes, seats, documents"}
document.addEventListener("click",e=>{const t=e.target;if(!t||!t.closest||view!=="toolsw")return;
  const m=t.closest("[data-tmod]");if(m){const k=m.dataset.tmod;if(!setTeam(k,!mods()[k])){denyMsg();return}const y=window.scrollY;render();window.scrollTo(0,y);toast((k==="gear"?"Gear":"Licensing")+(mods()[k]?" is on. It's in Tools now.":" is off."));return}
  const p=t.closest("[data-tper]");if(p){const [id,k,v]=p.dataset.tper.split("|");if(!setPerson(id,k,v)){denyMsg();return}const L=$("#afTL");if(L)L.innerHTML=list();return}});
document.addEventListener("input",e=>{if(e.target&&e.target.id==="afTq"){q=e.target.value;const L=$("#afTL");if(L)L.innerHTML=list()}});
if(typeof HELP==="object"){HELP.toolsw=["Tool access","Turn Gear and Licensing on for the team and pick who gets them.",["Tools → People & access → Tool access.","Switch Gear and/or Licensing on.","Pick Off, Status or Manager for each person. Off hides the tool for them."]]}
})();
