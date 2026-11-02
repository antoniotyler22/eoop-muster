/* Accounted For 4.76.0 — "Show me less", message-key reset, and "your name is your account".
   1. A phone with owner-level access (OIC, incoming OIC, Co-leader) can step down on its own: Co-leader view (no logins,
      access list, security or Inbox), Editor (edits, can't manage) or View only. Stepping back up asks for the recovery code.
      The phone keeps its message keys while it shows less, so stepping back up loses nothing.
   2. Reset message keys (OIC only): every member gets new message keys and the old threads are deleted on the server,
      so a phone that ever held the old keys reads nothing.
   3. Once a person picks their name on a linked phone, that name is their account on that phone. They can't swap to
      someone else's name; the OIC gives them a new link to change it. */
(()=>{
const OWNER_ROLES=["oic","newoic","co"];
const baseRole=()=>S.roleFrom||S.role||"oic";
const eligible=()=>!(typeof memberMode==="function"&&memberMode())&&!S.link&&OWNER_ROLES.includes(baseRole());
const lowered=()=>!!S.lite||(!!S.roleFrom&&S.role!==S.roleFrom);
const picOwner=()=>!S.link&&!S.lite&&(S.role==="oic"||S.role==="newoic"||(!S.role));
const LV={co:["Co-leader view","Hides Logins, access list, security and the Inbox. Still edits the board."],sncoic:["Editor","Updates statuses, posts and calendar. Can't manage access."],view:["View only","Sees the board, changes nothing."]};
const here=()=>S.lite?"Co-leader view":S.role==="sncoic"?"Editor":S.role==="view"?"View only":(typeof ROLE_N==="object"&&ROLE_N[S.role||"oic"])||"OIC";
if(Array.isArray(SYNC_SKIP)){for(const k of ["lite","roleFrom","dmInboxKeep"])if(!SYNC_SKIP.includes(k))SYNC_SKIP.push(k)}

/* a lowered phone stops polling the Inbox: the inbox key is set aside (not deleted) until the phone steps back up */

function stepDown(k){if(!eligible()||lowered()||!LV[k])return false;
  S.roleFrom=baseRole();if(S.dmInbox){S.dmInboxKeep=S.dmInbox;delete S.dmInbox}
  if(k==="co"){S.lite=1;if(!S.role)S.role="oic"}else{delete S.lite;S.role=k}
  armed=null;save();return true}
function stepUp(code){if(!lowered())return "ok";
  const Y=S.sync;if(Y&&Y.on){const a=String(code||"").toUpperCase().replace(/[^A-Z0-9]/g,"");const b=String(Y.code||"").toUpperCase().replace(/[^A-Z0-9]/g,"");if(!a||a!==b)return "bad"}
  const r=S.roleFrom;delete S.lite;delete S.roleFrom;if(S.dmInboxKeep){S.dmInbox=S.dmInboxKeep;delete S.dmInboxKeep}if(r==="oic")delete S.role;else S.role=r;save();return "ok"}

/* ---- reset message keys: new keys for everyone; old threads are deleted so old keys read nothing ---- */
let busy=false;
async function resetKeys(){if(busy||!picOwner())return false;busy=true;
  try{const old=[];for(const m of S.roster||[])if(m&&m.dm&&m.dm.id&&m.dm.k)old.push([m.dm.id,m.dm.k]);for(const g of S.grps||[])if(g&&g.id&&g.k)old.push([g.id,g.k]);
    for(const [id,k] of old){try{await SB.rpc("dm_delete_thread",{p_id:id,p_key:k})}catch(e){}}
    delete S.dmInbox;S.grps=[];for(const m of S.roster||[])if(m&&m.dm)delete m.dm;S.dmMsgs={};S.dmSeen={};S.dmAfter=0;save();
    try{if(typeof mpPublish==="function")await mpPublish(true)}catch(e){}
    try{if(typeof dmPushAttach==="function")dmPushAttach()}catch(e){}
    return true}finally{busy=false}}
window.resetMsgKeys=resetKeys;

/* ---- the panel on the Data page ---- */
let sup=false,msg="";
function panel(){
  let h="";
  if(eligible()){
    if(lowered()){
      h+=`<div class="panel" id="alPanel"><h3 style="margin:0">Role on this phone</h3><p class="note">Showing <b>${esc(here())}</b>. Your own level is <b>${esc((typeof ROLE_N==="object"&&ROLE_N[S.roleFrom])||S.roleFrom)}</b>.</p>
      ${S.sync&&S.sync.on?`<input type="text" id="alCode" placeholder="Recovery code" autocapitalize="characters" autocomplete="off" style="text-transform:uppercase">`:""}
      <button class="btn" id="alUp">Step back up</button><div class="note" id="alOut">${esc(msg)}</div></div>`}
    else{
      h+=`<div class="panel" id="alPanel"><h3 style="margin:0">Show me less</h3><p class="note">This phone is <b>${esc(here())}</b>. Pick a lower view if you don't want to see everything. You can step back up with the recovery code.</p>
      ${Object.keys(LV).map(k=>`<button class="btn alt" data-alDown="${k}" style="width:100%;text-align:left;margin:3px 0"><b>${esc(LV[k][0])}</b><br><span class="note">${esc(LV[k][1])}</span></button>`).join("")}</div>`}}
  if(picOwner()&&S.source!=="sample"){
    h+=`<div class="panel" id="alKeys"><h3 style="margin:0">Message keys</h3><p class="note">Makes new message keys for everyone and deletes the old threads on the server, so a phone that ever held your old keys can't read anything. Past messages are cleared.</p>
    <button class="btn warn" id="alReset">${sup?"Tap again: reset all message keys":"Reset message keys"}</button><div class="note" id="alKOut"></div></div>`}
  if(S.who&&S.who.n&&!(typeof memberMode==="function"&&memberMode())&&!picOwner()){
    h+=`<div class="panel" id="alAcct"><h3 style="margin:0">Your account</h3><p class="note">Signed in as <b>${esc(S.who.n)}</b> · ${esc(here())}. Your name is locked to this phone. To change it, ask your OIC for a new link.</p></div>`}
  return h}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{if(view==="data"){const m=$("#main");if(m&&!m.querySelector("#alPanel,#alKeys,#alAcct")){const h=panel();if(h)m.insertAdjacentHTML("afterbegin",h)}}}catch(e){}return r}}

/* ---- its own tile in Tools → Settings, and its own page, so nobody has to dig through Data ---- */
{const _to=tabOf;tabOf=function(v){return v==="alvl"?"tools":_to.apply(this,arguments)}}
{const _r=render;render=function(){if(view==="alvl"){renderTabs();const h=panel();$("#main").innerHTML=`<button class="chip" data-go="tools" style="cursor:pointer;margin-top:12px">◂ Tools</button><h2>Role and message keys</h2>`+(h||`<div class="panel"><p class="note">Nothing to change on this phone.</p></div>`);if(typeof animateView==="function")animateView();return}return _r.apply(this,arguments)}}
{const _rt=renderTools;renderTools=function(){const r=_rt.apply(this,arguments);try{if(!panel())return r;let g=[...document.querySelectorAll("#main .tgrid")].find(x=>x.id!=="sgGrid");if(!g){g=document.createElement("div");g.className="tgrid";$("#main").appendChild(g)}
  g.insertAdjacentHTML("beforeend",`<button data-go="alvl"><span class="ic">🔑</span><span><b>Role and message keys</b><small>${esc(here())} · show less, reset keys</small></span></button>`);if(typeof sgRegroup==="function")sgRegroup()}catch(e){}return r}}
const again=()=>{const y=window.scrollY;render();window.scrollTo(0,y)};
document.addEventListener("click",e=>{const t=e.target;if(!t||!t.closest)return;
  const d=t.closest("[data-alDown]");if(d){e.stopImmediatePropagation();if(stepDown(d.dataset.aldown)){view="board";render();window.scrollTo(0,0);toast("This phone now shows "+here()+".")}return}
  if(t.closest("#alUp")){e.stopImmediatePropagation();const r=stepUp(($("#alCode")||{}).value);if(r==="ok"){msg="";view="board";render();window.scrollTo(0,0);toast("Back to full access.")}else{msg="That isn't the recovery code.";again()}return}
  if(t.closest("#alReset")){e.stopImmediatePropagation();if(!picOwner())return;if(!sup){sup=true;again();setTimeout(()=>{if(sup){sup=false;if(view==="data"||view==="alvl")again()}},4000);return}
    sup=false;const b=t.closest("#alReset");b.disabled=true;b.textContent="Resetting…";
    resetKeys().then(()=>{if(view==="data"||view==="alvl")again();toast("Message keys reset. Members get new ones on their next update.")}).catch(()=>{b.disabled=false;b.textContent="Reset message keys";toast("Couldn't reset. Check signal.")});return}
  /* an account's name is locked once picked */
  if(t.closest("#myCkWho")&&lockedName()){e.stopImmediatePropagation();e.preventDefault();toast("This is your account. Ask your OIC for a new link to change it.")}},true);
document.addEventListener("change",e=>{if(e.target.id!=="myWho"||!lockedName())return;e.stopImmediatePropagation();e.target.value="";toast("This is your account. Ask your OIC for a new link to change it.")},true);
function lockedName(){return !!(S.who&&S.who.id&&!(typeof memberMode==="function"&&memberMode())&&!picOwner())}
window.accountLocked=lockedName;
})();
