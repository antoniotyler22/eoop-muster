/* Accounted For: deleted people stay deleted, and only deleted people leave the numbers.
   Someone goes on the deleted list (S.gone: id → when) only when a person deletes them on purpose: Delete, Remove,
   Departed, Remove duplicates, Clear, or loading a new roster that no longer has them. Every one of those paths
   calls logLoad first, which arms the next save to note who went. Anything else that drops a name without a
   delete (a sync hiccup, a link pull, a team switch, a status change) is NOT a delete, so it never spreads to the
   other phones: on sync, someone this phone still has stays unless the other phone deleted them on purpose.
   Adding someone back (Undo, re-add) clears their note. Also: a Delete button beside every name. */
(()=>{
const KEEP_DAYS=365,MAX=1500;
if(Array.isArray(window.SYNC_SKIP||(typeof SYNC_SKIP!=="undefined"&&SYNC_SKIP))&&!SYNC_SKIP.includes("rids"))SYNC_SKIP.push("rids","ridsS");
let kdArmed=null;  // ids on the roster when a delete/remove/load was announced (logLoad); the next save notes who left
function arm(){try{kdArmed={t:Date.now(),ids:new Set((S.roster||[]).map(m=>m.id))}}catch(e){kdArmed=null}}
window.kdArm=arm;
/* an explicit delete of these ids (used by paths that don't go through logLoad) */
window.kdDelete=ids=>{S.gone=S.gone&&typeof S.gone==="object"?S.gone:{};S.back=S.back&&typeof S.back==="object"?S.back:{};const now=Date.now();for(const id of [].concat(ids||[])){if(!id)continue;S.gone[String(id)]=now;delete S.back[String(id)]}};
function track(){if(!Array.isArray(S.roster))return;const now=Date.now();const cur=new Set(S.roster.map(m=>m.id));S.gone=S.gone&&typeof S.gone==="object"?S.gone:{};S.back=S.back&&typeof S.back==="object"?S.back:{};
  if(S.source==="sample"){S.rids=[...cur];S.ridsS=1;kdArmed=null;return}
  // only an announced delete/remove/load (within the last minute) notes who left; a status change or a sync never does
  if(kdArmed){if(now-kdArmed.t>60000)kdArmed=null;else{let n=0;for(const id of kdArmed.ids)if(!cur.has(id)){S.gone[id]=now;delete S.back[id];n++}if(n)kdArmed=null}}
  for(const id of cur)if(S.gone[id]){delete S.gone[id];S.back[id]=now}
  const ks=Object.keys(S.gone);if(ks.length){const old=now-KEEP_DAYS*864e5;for(const k of ks)if(S.gone[k]<old)delete S.gone[k];
    const left=Object.keys(S.gone);if(left.length>MAX)left.sort((a,b)=>S.gone[a]-S.gone[b]).slice(0,left.length-MAX).forEach(k=>delete S.gone[k])}
  for(const k of Object.keys(S.back))if(S.back[k]<now-KEEP_DAYS*864e5)delete S.back[k];
  S.rids=[...cur];delete S.ridsS}
window.kdTrack=track;
if(typeof logLoad==="function"){const _ll=logLoad;logLoad=function(kind){if(/^(Removed|Departed|Loaded roster)/.test(String(kind||"")))arm();return _ll.apply(this,arguments)}}
{const _save=save;save=function(){try{track()}catch(e){}return _save.apply(this,arguments)}}
{const _raw=rawSave;rawSave=function(){try{if(Array.isArray(S.rids))track()}catch(e){}return _raw.apply(this,arguments)}}

/* sync: union both phones' deleted lists, then keep those people off */
{const _mr=mergeRemote;mergeRemote=function(R){const lg=Object.assign({},S.gone||{}),lb=Object.assign({},S.back||{});const mine=(S.roster||[]).slice();
  const rg=(R&&R.gone)||{},rb=(R&&R.back)||{};
  _mr.apply(this,arguments);
  const G={},B={};for(const src of [rg,lg])for(const k of Object.keys(src))G[k]=Math.max(G[k]||0,+src[k]||0);
  for(const src of [rb,lb])for(const k of Object.keys(src))B[k]=Math.max(B[k]||0,+src[k]||0);
  for(const k of Object.keys(B))if(G[k]&&B[k]>G[k])delete G[k];else if(G[k])delete B[k];
  // nobody leaves the numbers over a sync unless a phone deleted them on purpose: put back anyone the merge dropped
  // who is on neither deleted list (a changed status, a late backup or a half-synced copy is not a delete)
  {const have=new Set(S.roster.map(m=>m.id));const nk=m=>String(m.rank||"").toUpperCase().replace(/[^A-Z0-9]/g,"")+"|"+String(m.name||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
    const haveN=new Set(S.roster.map(nk));const back=[];
    // ...but not a second copy of someone already here under another id (the other phone re-added or re-loaded them)
    for(const m of mine)if(!have.has(m.id)&&!G[m.id]&&!haveN.has(nk(m)))back.push(m);
    if(back.length)S.roster=S.roster.concat(back)}
  S.gone=G;S.back=B;const n0=S.roster.length;S.roster=S.roster.filter(m=>!G[m.id]);
  S.rids=S.roster.map(m=>m.id);if(S.roster.length!==n0&&typeof syncSchedule==="function")setTimeout(()=>{try{syncSchedule()}catch(e){}},0)}}

/* the add box in a section: no doubles */
document.addEventListener("submit",e=>{if(!e.target||e.target.id!=="addf")return;const name=(($("#aName")||{}).value||"").trim().toUpperCase();if(!name)return;
  const x=S.roster.find(m=>fullK(m)===fullK({name}));if(x){e.preventDefault();e.stopImmediatePropagation();toast(x.rank+" "+lastOf(x)+" is already on the roster in "+x.sec+". Not added twice.")}},true);

/* Delete beside every name */
const delBtn=id=>`<button type="button" class="chip kdDel" data-pddel="${esc(id)}" style="cursor:pointer;color:var(--warn);margin-left:6px;flex:none">${armed==="pdd"+id?"Tap again":"Delete"}</button>`;
{const _rs=renderSection;renderSection=function(){_rs.apply(this,arguments);if(!canEdit())return;
  document.querySelectorAll("#main .m").forEach(row=>{const p=row.querySelector("[data-pcard]");if(!p||row.querySelector(".kdDel"))return;const id=p.dataset.pcard;
    const rm=row.querySelector(".who .rm");if(rm)rm.insertAdjacentHTML("afterend",delBtn(id));else p.insertAdjacentHTML("afterend",delBtn(id))})}}
{const _gq=gqHTML;gqHTML=function(q){let h=_gq.apply(this,arguments);if(!canEdit()||!h||!/data-pcard/.test(h))return h;
  return h.replace(/(<div class="rrow"[^>]*>)<div class="who" data-pcard="([^"]+)"([\s\S]*?)(?=<div class="rrow"|$)/g,(all,open,id,rest)=>open+`<div class="who" data-pcard="${id}"`+rest.replace(/<\/div>$/,"")+delBtn(id)+"</div>")}}
/* keep the search box results fresh after a delete from them */
document.addEventListener("click",e=>{if(!e.target.closest(".kdDel"))return;setTimeout(()=>{const q=$("#gq"),r=$("#gqr");if(q&&r&&q.value)r.innerHTML=gqHTML(q.value)},0)});
})();
