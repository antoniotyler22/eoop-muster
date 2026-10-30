/* Accounted For: nobody drops off the numbers because two people shared an id, or a stale phone published over the OIC.
   Why people were dropping: every file load numbered people m1, m2, m3… by row. After a reload, "m7" could be a
   different Marine. Sync, the deleted list and the hub all match people by id, so a reused id meant one of the two
   was thrown away. Fixes:
   1) Every import, restore or company load keeps the id of anyone whose name is already on the roster, and gives
      everyone else a fresh unique id. No two people ever share an id (a guard on every save catches the rest).
   2) Sync: before merging, the other phone's copy is lined up to this phone's ids by name, so one person never
      arrives under two ids and two people never arrive under one.
   3) A synced phone doesn't publish the section rosters to leaders until it has pulled the latest copy, so a phone
      that was off for a day can't overwrite the OIC's roster with an old one. A pull that changes the roster re-publishes.
   4) Section leaders: a pull never wipes a section that had people (an empty or missing section from a renamed tab is
      ignored), people the leader added themselves stay until the OIC has them, and the section codes get fixed after
      a tab swap so nobody stops counting.
   5) Only sections that still exist are published; old section keys from renamed tabs no longer publish an empty list. */
(()=>{
const freshId=()=>"a"+Date.now().toString(36)+rndId(4);
const nk=m=>typeof fullK==="function"?fullK(m):String(m&&m.name||"").toUpperCase();
/* give `list` stable ids against `base` (the people already here): same name → same id; otherwise unique */
function stableIds(list,base){if(!Array.isArray(list))return list;const byN={};const used=new Set();
  for(const m of base||[]){if(!m)continue;const k=nk(m);if(!byN[k])byN[k]=m.id;used.add(String(m.id))}
  const seen=new Set();
  for(const m of list){if(!m)continue;const k=nk(m);const want=byN[k];
    if(want&&!seen.has(want)){m.id=want}
    else if(!m.id||seen.has(String(m.id))||(used.has(String(m.id))&&!want)){m.id=freshId()}
    seen.add(String(m.id))}
  return list}
window.stableIds=stableIds;
/* guard: on every save, no two people on the roster share an id */
function uniqGuard(){if(!Array.isArray(S.roster))return;const seen=new Set();let ch=false;
  for(const m of S.roster){if(!m)continue;if(!m.id||seen.has(String(m.id))){m.id=freshId();ch=true}seen.add(String(m.id))}
  return ch}
{const _save=save;save=function(){try{uniqGuard()}catch(e){}return _save.apply(this,arguments)}}

/* 1) imports, restores and company loads */
if(typeof importCSV==="function"){const _ic=importCSV;importCSV=function(){const r=_ic.apply(this,arguments);try{if(r&&Array.isArray(r.roster))stableIds(r.roster,S.source==="sample"?[]:S.roster)}catch(e){}return r}}
if(typeof companyParse==="function"){const _cp=companyParse;companyParse=function(){const r=_cp.apply(this,arguments);try{const list=Array.isArray(r)?r:(r&&r.roster);const base=(S.ws&&S.ws.co&&S.ws.co.roster)||(S.level==="co"?S.roster:[]);if(Array.isArray(list))stableIds(list,base)}catch(e){}return r}}
if(typeof flexParse==="function"){const _fp=flexParse;flexParse=function(){const r=_fp.apply(this,arguments);try{if(Array.isArray(r))stableIds(r,S.source==="sample"?[]:S.roster)}catch(e){}return r}}
if(typeof restoreFrom==="function"){const _rf=restoreFrom;restoreFrom=function(){const r=_rf.apply(this,arguments);try{if(uniqGuard())save()}catch(e){}return r}}

/* 2) sync: line the other phone's people up to ours by name before merging */
if(typeof mergeRemote==="function"){const _mr=mergeRemote;mergeRemote=function(R){try{if(R&&Array.isArray(R.roster)&&Array.isArray(S.roster)){
    const byN={},byId={};for(const m of S.roster){byN[nk(m)]=byN[nk(m)]||m;byId[String(m.id)]=m}
    const seen=new Set();
    for(const r of R.roster){if(!r)continue;const l=byN[nk(r)];
      if(l&&String(l.id)!==String(r.id)){r.id=l.id}                                    // same person, other id → ours
      else if(!l&&byId[String(r.id)]&&nk(byId[String(r.id)])!==nk(r)){r.id=freshId()}  // different person, our id → fresh
      if(seen.has(String(r.id)))r.id=freshId();seen.add(String(r.id))}
  }}catch(e){}return _mr.apply(this,arguments)}}

/* 3) synced phones: don't publish to leaders before the first pull; re-publish after a pull changes the roster */
if(typeof rpPublish==="function"){const _rp=rpPublish;rpPublish=function(){try{const Y=S.sync;if(Y&&Y.on&&!Y.pulledOnce&&(S.role||"oic")!=="oic")return Promise.resolve(0)}catch(e){}return _rp.apply(this,arguments)}}
if(typeof syncPull==="function"){const _sp=syncPull;syncPull=async function(){const before=JSON.stringify((S.roster||[]).map(m=>[m.id,m.sec,m.status]));const r=await _sp.apply(this,arguments);
  try{if(S.sync){S.sync.pulledOnce=Date.now()}const after=JSON.stringify((S.roster||[]).map(m=>[m.id,m.sec,m.status]));if(after!==before&&typeof rpSchedule==="function"&&canEdit())rpSchedule()}catch(e){}return r}}

/* 4) section leader pulls never wipe a section, keep local adds, and fix codes after a tab swap */
if(typeof rosterPull==="function"){const _pull=rosterPull;rosterPull=async function(){const L=S.link;if(!L)return _pull.apply(this,arguments);
  const mine=L.mysec?S.roster.filter(m=>m.sec===L.mysec):[];const all=S.roster.slice();const had=L.whole?all.length:mine.length;
  const r=await _pull.apply(this,arguments);
  try{const now=L.whole?S.roster:S.roster.filter(m=>m.sec===L.mysec);
    if(had>0&&now.length===0&&!(L.own)){ // an empty pull wiped a section that had people: put them back
      S.roster=L.whole?all:S.roster.filter(m=>m.sec!==L.mysec).concat(mine);L.perr="Your OIC's board sent an empty "+(L.whole?"roster":L.sec)+". Kept yours.";rawSave()}
    else if(!L.whole&&L.mysec&&!L.own){ // people this phone added itself stay until the OIC has them
      const names=new Set(S.roster.filter(m=>m.sec===L.mysec).map(nk));const back=mine.filter(m=>!m.uid&&!names.has(nk(m)));
      if(back.length){S.roster=S.roster.concat(back);rawSave()}}
    if(typeof secFix==="function")secFix();uniqGuard()}catch(e){}
  return r}}

/* 5) publish only the sections that still exist */
if(typeof rpPublish==="function"){const _rp2=rpPublish;rpPublish=function(){try{const B=S.board;if(B&&B.sk&&typeof B.sk==="object"){for(const k of Object.keys(B.sk))if(!SECTIONS.some(s=>s[0]===k)&&k!=="ATT")delete B.sk[k]}}catch(e){}return _rp2.apply(this,arguments)}}
})();
