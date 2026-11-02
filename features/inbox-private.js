/* Accounted For 4.75.0 — "Inbox stays private". The Inbox belongs to the phone that owns it (the OIC, or the incoming OIC
   after a turnover). Co-leaders, Editors (SNCOIC) and View-only phones that link with the recovery code never get the
   inbox key, the group keys or any member's message key, and never see the Inbox tab or message screens. Before this, those
   keys rode along in the synced board, so every linked leader phone could read the owner's Inbox. */
(()=>{
const myRole=()=>S.role||"oic";
const keyRole=()=>{const r=S.roleFrom||myRole();return (r==="oic"||r==="newoic")&&!S.link};  /* this phone is the OIC's, even while it is showing less */
const owner=()=>keyRole()&&!S.lite&&(myRole()==="oic"||myRole()==="newoic");
const member=()=>typeof memberMode==="function"&&memberMode();
const closed=()=>!member()&&!owner();
if(Array.isArray(SYNC_SKIP)){for(const k of ["dmInbox","grps"])if(!SYNC_SKIP.includes(k))SYNC_SKIP.push(k)}

const noDm=r=>(Array.isArray(r)?r:[]).map(m=>{if(!m||!m.dm)return m;const c=Object.assign({},m);delete c.dm;return c});
function scrub(R){if(!R||typeof R!=="object")return R;delete R.dmInbox;delete R.grps;if(Array.isArray(R.roster))R.roster=noDm(R.roster);return R}

/* 1. the synced board never carries message keys */
{const _so=syncObj;syncObj=function(){const o=_so.apply(this,arguments);if(o&&Array.isArray(o.roster))o.roster=noDm(o.roster);return o}}

/* 2. a pull keeps this phone's own keys (owner) and drops anyone else's (older backups still hold them) */
{const _mr=mergeRemote;mergeRemote=function(R){scrub(R);const keep={};if(keyRole())for(const m of S.roster)if(m&&m.dm)keep[m.id]=m.dm;for(const m of S.roster)if(m&&m.dm)delete m.dm;
  try{return _mr.apply(this,arguments)}finally{if(keyRole()){for(const m of S.roster)if(m&&keep[m.id]&&!m.dm)m.dm=keep[m.id]}else wipe()}}}
{const _ar=applyRestore;applyRestore=function(code,x){if(x&&x.R)scrub(x.R);return _ar.apply(this,arguments)}}

/* 3. a phone that isn't the owner holds no message keys or messages, even from an earlier sync */
function wipe(){let ch=false;if(keyRole()||member())return false;
  if(S.dmInbox){delete S.dmInbox;ch=true}
  if(Array.isArray(S.grps)&&S.grps.length){S.grps=[];ch=true}
  for(const m of S.roster||[])if(m&&m.dm){delete m.dm;ch=true}
  const M=S.dmMsgs||{};for(const k of Object.keys(M))if(!k.startsWith("mine:")){delete M[k];ch=true}
  if(ch){S.dmAfter=0;try{rawSave()}catch(e){}}return ch}
try{wipe()}catch(e){}

/* 4. no Inbox tab, no message screens, no Inbox button on the other roles */
{const _tl=tabsList;tabsList=function(){const L=_tl.apply(this,arguments);return closed()?L.filter(x=>x[0]!=="inbox"):L}}
{const _r=render;render=function(){if(closed()&&(view==="dms"||view==="dm"||view==="grp")){view="board";armed=null}
  const r=_r.apply(this,arguments);if(closed()){try{document.querySelectorAll("#dmAsInbox").forEach(b=>b.remove())}catch(e){}}return r}}
document.addEventListener("click",e=>{if(!closed())return;const t=e.target.closest&&e.target.closest("[data-tab='inbox'],[data-go='dms'],[data-go='dm'],[data-go='grp']");
  if(!t)return;e.stopImmediatePropagation();e.preventDefault();try{toast("The Inbox is private to the OIC's phone.")}catch(x){}},true);
window.inboxOwner=owner;window.inboxKeys=keyRole;
})();
