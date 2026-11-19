/* Accounted For 4.126.0: once someone picks who they are, everything they do shows their name and role.
   Picking your name ("Who are you?") used to set the name in some places but not others: an older "Posting as" name
   could still go out on Inbox messages, a Word of Mouth link kept the name typed when it was joined, and status changes
   said who but not in what role. Now, the moment a name is picked:
   - every name this phone sends under is set to it: Posting as, My name, the section leader link, and every Word of
     Mouth this phone reads (so posts, replies, polls, Inbox, Talk and Team chat all carry it);
   - every status change is stamped with the name and the role ("Set by SGT SMITH · Can edit · 0745");
   - every Word of Mouth post carries the role next to the name ("SGT SMITH · 1ST section leader");
   - the change log already records the name and which link it came from.
   Changing the name later ("Messaging as → Change") still works; picking again re-applies it everywhere.
   The role comes from how this phone is connected; it never changes what the phone may do. */
(()=>{
const SHORT={oic:"OIC",co:"Same as OIC",sncoic:"Can edit",view:"View only",newoic:"Incoming OIC"};
const clean=v=>String(v||"").toUpperCase().replace(/[|#<>]/g," ").replace(/\s+/g," ").trim().slice(0,30);
function actorRole(){try{
  if(S.link)return ((S.link.sec||"")+" section leader").trim();
  if(typeof memberMode==="function"&&memberMode())return "Member";
  if(!(S.sync&&S.sync.on)&&!S.board&&(S.feeds||[]).some(f=>!f.lk&&f.mk)&&!(S.feeds||[]).some(f=>f.lk))return "Member";
  const r=typeof role==="function"?role():"oic";return SHORT[r]||String(r)}catch(e){return ""}}
function actorName(){return clean((S.who&&S.who.n)||S.myName||S.postAs||"")}
const actorTag=()=>{const n=actorName(),r=actorRole();return n?(r?n+" · "+r:n):r};
Object.assign(window,{actorRole,actorName,actorTag});

/* A picked name belongs to this phone. Posting as / My name normally travel with the board between linked phones
   (so the OIC's second phone shares them); once a person has picked who they are, this phone neither sends nor takes
   them, so one person's name never lands on the OIC's phone or anyone else's. */
const OWN=["postAs","myName"];
function keepOwn(){if(typeof SYNC_SKIP==="undefined"||!Array.isArray(SYNC_SKIP))return;if(!SYNC_SKIP.includes("whoApplied"))SYNC_SKIP.push("whoApplied");
  if(S.who&&S.who.n)for(const k of OWN)if(!SYNC_SKIP.includes(k))SYNC_SKIP.push(k)}
keepOwn();
/* one name everywhere, applied once per pick (S.who.t) so a later "Change" isn't undone on the next save */
function applyName(){keepOwn();const W=S.who;if(!W||!W.n||S.whoApplied===W.t)return false;const n=clean(W.n);if(!n)return false;
  S.myName=n;S.postAs=n;if(S.link)S.link.me=n;
  for(const f of S.feeds||[]){if(f.lk||f.me===n)continue;f.me=n;try{if(typeof fdMeHash==="function")fdMeHash(f)}catch(e){}}
  S.whoApplied=W.t;return true}
window.whoApplyName=applyName;
{const _save=save;save=function(){try{applyName()}catch(e){}return _save.apply(this,arguments)}}
setTimeout(()=>{try{if(applyName())rawSave()}catch(e){}},0);/* phones that picked before this version */

/* Word of Mouth posts carry the poster's role (old phones ignore the extra field) */
if(typeof fdEnc==="function"){const _enc=fdEnc;fdEnc=function(k,o){try{if(o&&typeof o==="object"&&typeof o.by==="string"&&Array.isArray(o.sa)&&!o.br){const r=actorRole();if(r)o=Object.assign({},o,{br:r.slice(0,30)})}}catch(e){}return _enc.call(this,k,o)}}

/* the "Messaging as" strip shows the role too */
function stripRole(){const b=document.querySelector("#dmAs .dmas-t");if(!b||b.querySelector(".dmas-r"))return;const r=actorRole();if(!r)return;
  b.insertAdjacentHTML("beforeend",`<small class="dmas-r" style="display:block;font-weight:700">${esc(r)}</small>`)}
{const _r=render;render=function(){const x=_r.apply(this,arguments);try{stripRole()}catch(e){}return x}}
})();
