/* Accounted For 4.123.1: a login never outlives the person it belongs to.
   When someone is deleted on purpose (Delete, Remove, Departed, Remove duplicates, a new roster without them) their
   username login used to stay behind: the list still showed it and the server still let it sign in, pointing at nobody.
   Now the OIC's phone drops that login from the list and from the server. Only people on the deleted list (S.gone) count,
   so a sync hiccup or a late backup that merely drops a name never costs anyone their login. Add the person back and
   they simply get a new login. A failed server delete is kept in S.lgDead and retried every few minutes. */
(()=>{
const own=()=>typeof isOwner==="function"&&isOwner();
if(typeof SYNC_SKIP==="object"&&Array.isArray(SYNC_SKIP)&&!SYNC_SKIP.includes("lgDead"))SYNC_SKIP.push("lgDead");
let busy=false;
function orphans(){if(!own()||S.source==="sample"||!Array.isArray(S.logins)||!Array.isArray(S.roster)||!S.gone)return [];
  const have=new Set(S.roster.map(m=>String(m.id)));
  return S.logins.filter(L=>L&&L.mid&&!have.has(String(L.mid))&&S.gone[String(L.mid)])}
function sweep(){const bad=orphans();if(!bad.length)return 0;
  S.lgDead=Array.isArray(S.lgDead)?S.lgDead:[];
  for(const L of bad)if(L.uid&&!S.lgDead.includes(L.uid))S.lgDead.push(L.uid);
  const ids=new Set(bad.map(L=>L.uid));S.logins=S.logins.filter(L=>!ids.has(L.uid));
  try{toast(bad.length===1?"Their login was removed too.":bad.length+" logins removed with those people.")}catch(e){}
  return bad.length}
async function flush(){if(busy||!own()||!S.lgOwner||!Array.isArray(S.lgDead)||!S.lgDead.length)return;busy=true;
  try{const left=[];for(const uid of S.lgDead){try{await SB.rpc("login_delete",{p_uid:uid,p_owner:S.lgOwner})}catch(e){left.push(uid)}}
    if(left.length!==S.lgDead.length){S.lgDead=left;try{rawSave()}catch(e){}}}
  finally{busy=false}}
{const _save=save;save=function(){let n=0;try{n=sweep()}catch(e){}const r=_save.apply(this,arguments);if(n)setTimeout(()=>{try{flush()}catch(e){}if(typeof view!=="undefined"&&view==="logins"&&typeof renderLogins==="function")try{renderLogins()}catch(e){}},0);return r}}
if(typeof every==="function")every(5*60000,flush,"login-links-flush");
window.lgOrphans=()=>(S.logins||[]).filter(L=>L&&L.mid&&!(S.roster||[]).some(m=>String(m.id)===String(L.mid)));
})();
