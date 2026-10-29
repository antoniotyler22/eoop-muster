/* Accounted For 1.9 — Room sweep.
   Set up the rooms, floors or areas of your building once. During a check-in, wardens walk the building and tap
   each room as they clear it; a room with a problem (someone inside, smoke, blocked exit) gets a short note.
   A grid shows cleared, problem and not-yet-checked rooms live, with how many are left. Phones synced to the same
   team (co-leaders, editors) merge their taps room by room, so several wardens can sweep at once. Closing out the
   check-in logs the sweep in Drill history and the shared headcount text. Rooms stay with the team. */
(()=>{
const MAXR=120;
const rooms=()=>{S.rooms=Array.isArray(S.rooms)?S.rooms:[];return S.rooms};
const sw=()=>{if(!S.sweep||typeof S.sweep!=="object")S.sweep={rid:"",r:{}};if(!S.sweep.r||typeof S.sweep.r!=="object")S.sweep.r={};return S.sweep};
const rid=()=>S.rc&&S.rc.open&&S.rc.rid||"";
/* the sweep belongs to one check-in: a new check-in starts with every room unchecked */
function cur(){const W=sw();const id=rid();if(id&&W.rid!==id){W.rid=id;W.r={}}return W}
function me(){const n=(S.who&&S.who.n)||S.myName||(S.link&&S.link.me)||"";return n?String(n).slice(0,30):"this phone"}
function marks(){const W=cur(),R=rooms();const m=rooms().map(r=>W.r[r.id]).filter(Boolean);
  return {n:R.length,clear:m.filter(x=>x.s==="clear").length,prob:m.filter(x=>x.s==="prob").length}}
const left=()=>{const m=marks();return m.n-m.clear-m.prob};
window.roomsLeft=left;
function mark(id,s,note){const W=cur();if(!rooms().some(r=>r.id===id))return;
  if(!s){delete W.r[id]}else W.r[id]={s,t:Date.now(),by:me(),note:String(note||"").slice(0,80)};save();
  const r=rooms().find(x=>x.id===id);
  if(s==="prob"&&typeof actAdd==="function")actAdd("⚠","Room sweep: problem in "+r.n+(note?" — "+note:""),"rooms");
  if(s==="clear"&&!left()&&typeof actAdd==="function")actAdd("✓","Room sweep: every room clear ("+me()+")","rooms");
  if(typeof syncSchedule==="function")syncSchedule()}
function add(n,area){n=String(n||"").trim().slice(0,40);if(!n)return false;if(rooms().length>=MAXR){toast("That's the most rooms the sweep can hold ("+MAXR+").");return false}
  if(rooms().some(r=>r.n.toLowerCase()===n.toLowerCase()&&(r.a||"")===(area||""))){toast(n+" is already on the list.");return false}
  rooms().push({id:"r"+Date.now().toString(36)+rndId(3),n,a:String(area||"").trim().slice(0,30)});save();if(typeof syncSchedule==="function")syncSchedule();return true}
function remove(id){S.rooms=rooms().filter(r=>r.id!==id);const W=sw();delete W.r[id];save();if(typeof syncSchedule==="function")syncSchedule()}
/* "Room 101, Room 102, Gym" or one per line; "Floor 2: 201, 202" puts those rooms on Floor 2 */
function addMany(text){let n=0;for(const line of String(text||"").split(/\n/)){let area="";let body=line;const m=line.match(/^\s*([^:,]{1,30}):(.*)$/);if(m){area=m[1].trim();body=m[2]}
  for(const p of body.split(/[,;]/))if(add(p,area))n++}return n}
window.roomsAdd=addMany;

/* ---------- screen ---------- */
let ui={edit:false,note:""};
const summary=()=>{const m=marks();return m.clear+"/"+m.n+" clear"+(m.prob?" · "+m.prob+" problem"+(m.prob>1?"s":""):"")};
window.roomsSummary=()=>rooms().length?summary():"";
function tileHTML(r){const x=cur().r[r.id];const s=x?x.s:"";
  const col=s==="clear"?"var(--s-onhand)":s==="prob"?"var(--warn)":"var(--line)";
  const sub=s==="clear"?"✓ Clear · "+esc(x.by):s==="prob"?"⚠ "+esc(x.note||"Problem")+" · "+esc(x.by):"Tap when clear";
  return `<button class="rm-tile" data-swtap="${esc(r.id)}" aria-pressed="${s==="clear"}" style="--sc:${col}"><b>${esc(r.n)}</b>${r.a?`<small>${esc(r.a)}</small>`:""}<small class="rm-sub">${sub}</small></button>`}
function gridHTML(){const R=rooms();if(!R.length)return "";const areas=[...new Set(R.map(r=>r.a||""))];
  return areas.map(a=>`${a?`<div class="note" style="margin:6px 0 2px"><b>${esc(a)}</b></div>`:""}<div class="rm-grid">${R.filter(r=>(r.a||"")===a).map(tileHTML).join("")}</div>`).join("")}
function setupHTML(){const R=rooms();
  return `<div class="panel" id="rmSetup"><b>Rooms to sweep</b><p class="note" style="margin:2px 0 8px">${R.length?R.length+" room"+(R.length>1?"s":"")+". ":""}Type rooms, floors or areas: one per line or separated by commas. Put a floor name and a colon first to group them (Floor 2: 201, 202, Break room).</p>
    <textarea id="rmAdd" style="min-height:64px" placeholder="Room 101, Room 102, Gym&#10;Floor 2: 201, 202, Break room"></textarea>
    <div class="row2" style="margin-top:6px"><button class="btn" id="rmAddGo">Add rooms</button><button class="btn alt" id="rmDone">${R.length?"Done":"Skip"}</button></div>
    ${R.length?`<div class="alist" style="margin-top:8px">${R.map(r=>`<div class="rrow" style="--sc:var(--line)"><div class="rtop"><div class="who"><b>${esc(r.n)}</b>${r.a?` <span class="chip">${esc(r.a)}</span>`:""}</div><button class="chip" data-swrm="${esc(r.id)}" style="cursor:pointer">Remove</button></div></div>`).join("")}</div>`:""}
    </div>`}
function panelHTML(){const R=rooms(),rc=S.rc;
  if(ui.edit)return setupHTML();
  if(!R.length)return rc.open?`<div class="panel"><b>Room sweep</b><p class="note" style="margin:2px 0 8px">Wardens tap each room as they clear it. Add your rooms once and the grid shows up in every check-in.</p><button class="btn alt" id="rmEdit">Set up rooms</button></div>`
    :`<h2>Room sweep</h2><div class="panel"><p class="note" style="margin:0 0 8px">Add the rooms, floors or areas of your building. During a check-in, wardens tap each room as they clear it and everyone sees which rooms are still unchecked.</p><button class="btn alt" id="rmEdit">Set up rooms</button></div>`;
  const m=marks(),l=left();const all=!l&&m.n;
  const head=rc.open?`<b>Room sweep · ${esc(summary())}</b> ${all?`<span class="chip" style="color:var(--s-onhand)">✓ All rooms ${m.prob?"checked":"clear"}</span>`:`<span class="chip">${l} left</span>`}`:`<b>Room sweep</b> <span class="chip">${m.n} room${m.n>1?"s":""} ready</span>`;
  return `<div class="panel" id="rmPanel">${head}
    ${rc.open?`<p class="note" style="margin:2px 0 6px">Tap a room when it's clear. Tap it again if there's a problem (someone inside, smoke, blocked exit); a third tap resets it.</p>${gridHTML()}
      ${ui.note?`<div style="margin-top:8px"><label for="rmNote">What's wrong in ${esc((R.find(r=>r.id===ui.note)||{}).n||"that room")}?</label><input id="rmNote" maxlength="80" placeholder="Someone still inside, smoke, blocked exit…"><div class="row2" style="margin-top:6px"><button class="btn" id="rmNoteGo">Save</button><button class="btn alt" id="rmNoteSkip">No note</button></div></div>`:""}`
      :`<p class="note" style="margin:2px 0 6px">The grid shows up as soon as a check-in starts. Other phones synced to this team sweep at the same time.</p>`}
    <div class="row2" style="margin-top:8px"><button class="btn alt" id="rmEdit">Edit rooms</button>${rc.open&&(m.clear||m.prob)?`<button class="btn alt" id="rmReset">${ui.armed?"Tap again to reset all":"Reset all"}</button>`:""}</div></div>`}
function redraw(){if(view!=="recall")return;const a=document.activeElement;if(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName)&&a.id!=="rmNote")return;const y=window.scrollY;render();window.scrollTo(0,y)}
const _rr=renderRecall;
renderRecall=function(){_rr.apply(this,arguments);const main=$("#main");if(!main)return;cur();
  const html=panelHTML();
  if(S.rc.open){const at=main.querySelector("#dlAlarm")||main.querySelector(".mbar");if(at)at.insertAdjacentHTML("afterend",html);else main.insertAdjacentHTML("afterbegin",html)}
  else{const at=main.querySelector("#rq");if(at)at.insertAdjacentHTML("beforebegin",html);else main.insertAdjacentHTML("beforeend",html)}
  if(ui.note){const i=$("#rmNote");if(i)setTimeout(()=>i.focus({preventScroll:true}),40)}};

document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;
  const tap=t.closest("[data-swtap]");if(tap){const id=tap.dataset.swtap;const x=cur().r[id];
    if(!x){mark(id,"clear");ui.note="";redraw();if(!left())toast("✓ Every room checked");return}
    if(x.s==="clear"){ui.note=id;redraw();return}
    mark(id,"");ui.note="";redraw();return}
  if(t.closest("#rmNoteGo")||t.closest("#rmNoteSkip")){const id=ui.note;const note=t.closest("#rmNoteGo")?(($("#rmNote")||{}).value||""):"";ui.note="";if(id)mark(id,"prob",note);redraw();return}
  if(t.closest("#rmEdit")){ui.edit=true;ui.note="";redraw();setTimeout(()=>{const i=$("#rmAdd");if(i)i.focus({preventScroll:true})},40);return}
  if(t.closest("#rmDone")){ui.edit=false;redraw();return}
  if(t.closest("#rmAddGo")){const i=$("#rmAdd");const n=addMany(i?i.value:"");if(n){if(i)i.value="";toast(n+" room"+(n>1?"s":"")+" added");redraw()}else if(i&&!i.value.trim()){toast("Type at least one room.")}return}
  const rm=t.closest("[data-swrm]");if(rm){remove(rm.dataset.swrm);redraw();return}
  if(t.closest("#rmReset")){if(!ui.armed){ui.armed=true;redraw();setTimeout(()=>{if(ui.armed){ui.armed=false;redraw()}},4000);return}ui.armed=false;const W=cur();W.r={};save();if(typeof syncSchedule==="function")syncSchedule();redraw();toast("Sweep reset: every room unchecked");return}});
/* a problem room shows in the Attention list, so the leader sees it even from another tab */
document.addEventListener("click",e=>{const t=e.target;if(t.closest&&t.closest("#rcStart")){ui.note="";ui.edit=false}},true);

/* ---------- other phones: merge the sweep room by room, newest tap wins; rooms lists are joined ---------- */
if(typeof mergeRemote==="function"){const _mr=mergeRemote;mergeRemote=function(R){const lr=rooms().slice(),lw=JSON.parse(JSON.stringify(sw()));
  const r=_mr.apply(this,arguments);
  try{const rr=Array.isArray(R.rooms)?R.rooms:[];    /* rooms: keep every room either phone has, unless this phone removed it on purpose since the last sync */
    const base=S.sync&&S.sync.baseRooms||[];const out=[];const seen=new Set();
    for(const x of rr.concat(lr)){if(!x||!x.id||seen.has(x.id))continue;const inL=lr.some(y=>y.id===x.id),inR=rr.some(y=>y.id===x.id),inB=base.includes(x.id);
      if((inL&&inR)||(inL&&!inB)||(inR&&!inB))out.push(x);seen.add(x.id)}
    S.rooms=out.slice(0,MAXR);S.sync=S.sync||{};S.sync.baseRooms=out.map(x=>x.id);
    const rw=R.sweep&&typeof R.sweep==="object"?R.sweep:null;
    if(rw&&rw.rid){if(rw.rid===lw.rid){const m=Object.assign({},rw.r||{});for(const [k,v] of Object.entries(lw.r||{})){if(!m[k]||(v&&v.t>m[k].t))m[k]=v}S.sweep={rid:lw.rid,r:m}}
      else if(lw.rid===rid())S.sweep=lw;else S.sweep={rid:rw.rid,r:Object.assign({},rw.r||{})}}
    else S.sweep=lw}catch(e){}
  return r}}

/* ---------- close-out: log the sweep ---------- */
document.addEventListener("click",e=>{const t=e.target;if(!t.closest||!t.closest("#rcClose")||!S.rc.open||!rooms().length)return;
  const m=marks();const probs=rooms().filter(r=>(cur().r[r.id]||{}).s==="prob").map(r=>r.n+((cur().r[r.id]||{}).note?" ("+cur().r[r.id].note+")":""));
  setTimeout(()=>{const d=Array.isArray(S.drills)?S.drills[0]:null;if(d&&!d.rooms){d.rooms={n:m.n,clear:m.clear,prob:m.prob,probs:probs.slice(0,20)};save()}},60)},true);
{const _rt=recallText;recallText=function(){let t=_rt.apply(this,arguments);if(!rooms().length)return t;const m=marks();
  const W=cur();const probs=rooms().filter(r=>(W.r[r.id]||{}).s==="prob").map(r=>r.n+((W.r[r.id]||{}).note?" ("+W.r[r.id].note+")":""));
  if(S.rc.open||S.rc.rid&&W.rid===S.rc.rid)return t+"\nRooms: "+m.clear+"/"+m.n+" clear"+(m.prob?", "+m.prob+" problem"+(m.prob>1?"s":"")+": "+probs.join("; "):"")+(left()?", "+left()+" not checked":"");
  return t}}
{const _d=window.drillCSV;if(typeof _d==="function")window.drillCSV=function(){const c=_d.apply(this,arguments);const L=c.split("\r\n");if(!L.length)return c;L[0]+=',"Rooms clear","Room problems"';
  const D=Array.isArray(S.drills)?S.drills:[];for(let i=1;i<L.length&&i-1<D.length;i++){const r=D[i-1].rooms;L[i]+=r?',"'+r.clear+"/"+r.n+'","'+String((r.probs||[]).join("; ")).replace(/"/g,'""')+'"':',"",""'}return L.join("\r\n")}}

/* ---------- looks ---------- */
{const st=document.createElement("style");st.textContent=`.rm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:6px;margin-top:4px}
.rm-tile{display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;border:1px solid var(--line);border-left:5px solid var(--sc);border-radius:12px;background:var(--surface-2);padding:8px 10px;min-height:58px;color:inherit;font:inherit}
.rm-tile[aria-pressed="true"]{background:color-mix(in srgb,var(--s-onhand) 14%,var(--surface-2))}
.rm-tile b{font-size:14px;line-height:1.2}.rm-tile small{font-size:11px;color:var(--muted,inherit);opacity:.85;line-height:1.2}.rm-tile .rm-sub{margin-top:2px}`;document.head.appendChild(st)}
if(typeof HELP==="object"&&HELP.recall&&Array.isArray(HELP.recall[2]))HELP.recall[2].push("Room sweep: add your rooms once (Set up rooms). During a check-in, wardens tap each room as they clear it; a second tap marks a problem with a note. Phones synced to the team sweep together.");
})();
