/* Accounted For 1.7: More than one team on one phone.
   A coach with two teams, or a manager with three sites, keeps each team separate (its own people, groups,
   Feed, calendar, settings and type) and switches with one tap. Built on the same stash the platoon/company
   views use: the open team lives in S, the others wait in S.ws. Only the open team refreshes; the others
   catch up when you open them. */
(()=>{
if(typeof WS_GLOBAL==="object"&&!WS_GLOBAL.includes("teams"))WS_GLOBAL.push("teams");
if(typeof SYNC_SKIP==="object"&&!SYNC_SKIP.includes("teams"))SYNC_SKIP.push("teams");
const cur=()=>S.wsCur||"plt";
const teamKey=k=>k==="co"?"plt":k;
const isTeam=k=>k==="plt"||/^t[a-z0-9]+$/.test(k);
function list(){const ks=new Set();if(cur()==="plt"||cur()==="co"||(S.ws&&(S.ws.plt||S.ws.co)))ks.add("plt");for(const k of Object.keys(S.ws||{}))if(isTeam(k))ks.add(k);if(isTeam(cur()))ks.add(cur());
  const order=(S.teams&&S.teams._o)||[];return [...ks].sort((a,b)=>{const ia=order.indexOf(a),ib=order.indexOf(b);return (ia<0?999:ia)-(ib<0?999:ib)||(a==="plt"?-1:b==="plt"?1:a.localeCompare(b))})}
function meta(k){S.teams=S.teams||{};return S.teams[k]||{}}
function nameOf(k){if(teamKey(cur())===k)return unitName();const b=(S.ws||{})[k];return cleanName(b&&b.unit)||meta(k).name||"Team"}
function modeOf(k){if(teamKey(cur())===k)return S.mode||"military";return meta(k).mode||S.mode||"military"}
function sizeOf(k){const b=teamKey(cur())===k?S:(S.ws||{})[k];return b&&Array.isArray(b.roster)&&b.source!=="sample"?b.roster.length:0}
function remember(){S.teams=S.teams||{};const k=teamKey(cur());S.teams[k]=Object.assign({},S.teams[k],{name:unitName(),mode:S.mode||"military"})}
function switchTo(k){if(k===teamKey(cur())&&cur()!=="co")return;remember();toast("Opening "+nameOf(k)+"…");setTimeout(()=>wsSwitch(k,{mode:modeOf(k)}),120)}
function newKey(){return "t"+Date.now().toString(36)+rndId(3)}
function create(mode,name){remember();const k=newKey();const nm=cleanName(name).slice(0,24);S.teams[k]={name:nm,mode};
  S.teams._o=list().concat(k);wsSwitch(k,{mode,unit:nm,welcomed:1,leaderMode:true,source:"mol",roster:[],loadedAt:""})}
/* open a link (invite or saved team) in a brand-new team so the open one isn't touched */
function openNew(hash){remember();const k=newKey();S.teams[k]={name:"",mode:S.mode||"military"};S.teams._o=list().concat(k);
  wsStash();S.wsCur=k;S.roster=[];S.source="sample";S.welcomed=1;S.onb=true;rawSave();
  try{history.replaceState(null,"",location.pathname+"#"+String(hash).replace(/^#/,""))}catch(e){location.hash=hash}location.reload()}
function remove(k){if(k===teamKey(cur()))return;if(S.ws)delete S.ws[k];if(S.teams){delete S.teams[k];if(S.teams._o)S.teams._o=S.teams._o.filter(x=>x!==k)}
  if(k==="plt"&&S.ws)delete S.ws.co;save()}
window.TEAMS={list,nameOf,switchTo,create,openNew,remove};

/* ---------- the Teams screen ---------- */
let tv={armed:"",adding:false,mode:"",msg:""};
const MK=["civilian","jobs","hr","police","military","custom"].filter(k=>typeof MODES==="object"&&MODES[k]);
function renderTeams(){const L=list();const here=teamKey(cur());
  let h=`<h2>Your teams</h2><p class="note" style="margin:0 4px 8px">Each team keeps its own people, groups, Feed and settings. Only the open team updates live; the others catch up when you open them.</p><div class="alist">`;
  for(const k of L){const on=k===here;const n=sizeOf(k);
    h+=`<div class="rrow" style="--sc:var(${on?"--s-onhand":"--line"})"><div class="rtop"><div class="who"><b>${on?"✓ ":""}${esc(nameOf(k))}</b><div class="ph">${esc((MODES[modeOf(k)]||{}).name||"")}${n?" · "+n+" people":""}${on?" · open now":""}</div></div>
      ${on?"":`<button class="btn" data-tmgo="${esc(k)}">Open</button><button class="chip" data-tmdel="${esc(k)}" style="cursor:pointer">${tv.armed===k?"Tap again: delete from this phone":"Delete"}</button>`}</div></div>`}
  h+=`</div>`;
  if(!tv.adding)h+=`<button class="btn" id="tmAdd" style="width:100%;margin-top:12px">+ New team</button>`;
  else{h+=`<div class="panel" style="margin-top:12px"><b>New team</b><label for="tmMode">Kind of team</label><select id="tmMode" style="width:100%">${MK.map(k=>`<option value="${k}"${k===(tv.mode||S.mode)?" selected":""}>${esc(MODES[k].name)}</option>`).join("")}</select>
      <label for="tmName">Team name</label><input id="tmName" type="text" maxlength="24" autocomplete="off" placeholder="Hilltop Run Club">
      <div class="row2"><button class="btn" id="tmGo">Create and open</button><button class="btn alt" id="tmCancel">Cancel</button></div><p class="note" style="margin:6px 0 0">Your other teams stay just as they are.</p></div>`}
  h+=`<div class="note" role="status">${esc(tv.msg)}</div>`;$("#main").innerHTML=h;
  if(tv.adding)setTimeout(()=>{const i=$("#tmName");if(i)i.focus({preventScroll:true})},60)}
{const _r=render;render=function(){if(view==="teams"){renderTabs();renderTeams();if(typeof animateView==="function")animateView();return}return _r.apply(this,arguments)}}
document.addEventListener("click",e=>{if(!e.target.closest)return;const t=e.target;
  const g=t.closest("[data-tmgo]");if(g){switchTo(g.dataset.tmgo);return}
  const d=t.closest("[data-tmdel]");if(d){const k=d.dataset.tmdel;if(tv.armed!==k){tv.armed=k;renderTeams();setTimeout(()=>{if(tv.armed===k){tv.armed="";if(view==="teams")renderTeams()}},5000);return}
    tv.armed="";const n=nameOf(k);remove(k);tv.msg="Deleted "+n+" from this phone.";renderTeams();return}
  if(t.closest("#tmAdd")){tv.adding=true;tv.msg="";renderTeams();return}
  if(t.closest("#tmCancel")){tv.adding=false;renderTeams();return}
  if(t.closest("#tmGo")){const nm=(($("#tmName")||{}).value||"").trim();const md=($("#tmMode")||{}).value||"civilian";if(!nm){tv.msg="Type the team name.";renderTeams();return}
    toast("Creating "+nm+"…");setTimeout(()=>create(md,nm),120);return}
  const sw=t.closest("[data-tmsw]");if(sw){view="teams";render();window.scrollTo(0,0)}});
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="tmName"){e.preventDefault();const b=$("#tmGo");if(b)b.click()}});

/* ---------- header: team switcher chip (only once there's more than one team) ---------- */
{const _rT=renderTabs;renderTabs=function(){_rT.apply(this,arguments);try{const wb=$("#wsBar");if(!wb)return;const L=list();const c=cur();
  const co=(c==="co"||(c==="plt"&&S.ws&&S.ws.co))&&(!S.mode||S.mode==="military");
  const views=co?[["plt","PLT"],["co","CO"]].map(([k,l])=>`<button data-wsgo="${k}" aria-pressed="${k===c}" aria-label="${k==="co"?"Company":"Platoon"} view">${l}</button>`).join(""):"";
  const chip=L.length>1?`<button data-tmsw="1" aria-label="Switch team. Open: ${esc(nameOf(teamKey(c)))}" data-noxl>${esc(nameOf(teamKey(c)))} ▾</button>`:"";
  wb.innerHTML=chip+views}catch(e){}}}

/* ---------- Tools tile + help ---------- */
if(typeof HELP==="object")HELP.teams=["Teams","Run more than one team on this phone.",["+ New team: pick the kind of team and a name. It opens empty, ready for people.","Open switches teams. Each keeps its own people, Feed, calendar and settings.","Once you have two or more, the team name under the title switches with one tap.","Delete removes a team from this phone only."]];
})();
