/* Accounted For 4.126.0: losing the connection to a roster, and the invite link that fixes it.
   1. "Reconnect to your roster". A phone joined by an access link (view only / can edit / same as me / incoming OIC)
      or a section leader link stops syncing when the owner taps "Cut off everyone" or sends a replacement link. It used
      to say so only in a small line on Settings; the person kept looking at old numbers. Now every screen shows a
      "Reconnect to your roster" notice with what to do: paste the new invite link, text the leader for one, or check
      again. Nothing on the phone is deleted; the old copy stays readable until they reconnect.
   2. Invite link. The owner's "Give someone access" list of three links is replaced by one invite link: pick the role,
      then Share, Copy or show a QR code. The link carries the current connection (the board's access code, the role,
      platoon or company, the unit's name and when the connection was made), so after "Cut off everyone" the card shows
      the new link straight away, marked New. Links open the app on iPhone (accountedforteam.com universal links).
   Old links keep working exactly as before; the extra fields are only read for display. */
(()=>{
const ROLES=[["view","View only","Sees everything, changes nothing"],["sncoic","Can edit","Updates statuses, posts, runs musters"],["co","Same as me","Full OIC rights on their phone"]];
const hhmm=t=>{const d=new Date(t);return String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0")};
const dshort=t=>{try{return short(new Date(t))}catch(e){return new Date(t).toDateString().slice(4,10)}};

/* ---------- 1. is this phone cut off? ---------- */
function lost(){try{
  const Y=S.sync;if(Y&&Y.on&&role()!=="oic"&&/access to this board ended/i.test(Y.err||""))return {k:"sync",unit:unitName(),how:(ROLE_N[role()]||role())+" access link"};
  const L=S.link;if(L&&/link was replaced|couldn't open the roster/i.test(L.perr||""))return {k:"link",unit:L.unit||"your OIC",how:(L.sec||"")+" section leader link"};
  return null}catch(e){return null}}
window.rcnLost=lost;
function banHTML(c){return `<div class="banner" id="rcnBan" role="status" style="border-color:var(--warn)"><span>🔌 <b>Reconnect to your roster.</b> Your link to ${esc(c.unit)} stopped working, so these numbers aren't updating. Nothing on this phone was deleted.</span><button id="rcnGo">Reconnect</button></div>`}
function place(){const c=lost(),m=$("#main"),old=$("#rcnBan");if(!c){if(old)old.remove();return}if(!m||old)return;m.insertAdjacentHTML("afterbegin",banHTML(c))}
let out="";
function sheet(){const c=lost()||{k:"sync",unit:unitName(),how:"link"};sheetCtx={kind:"rcn"};
  const ask=`My Accounted For link to ${c.unit} stopped working. Can you send me a new invite link? (People → Live → Invite link)`;
  $("#sheetT").innerHTML=`Reconnect to your roster<small>Your ${esc(String(c.how).replace(/^View only|^Same rights as the OIC|^SNCOIC \(can edit\)/,x=>x.toLowerCase()))} to ${esc(c.unit)} was cut off or replaced. Get a new invite link from your leader and open it, or paste it here. Nothing on this phone was deleted.</small>`;
  $("#sheetOpts").innerHTML=`<div class="panel" style="margin:0" data-noxl id="rcnSheet">
    <label for="rcnLink"><b>1. Paste the new invite link</b></label>
    <input type="url" id="rcnLink" placeholder="https://accountedforteam.com/app.html#…" autocapitalize="none" autocorrect="off" spellcheck="false">
    <button class="btn" id="rcnJoin">Reconnect</button>
    <p class="note" style="margin:10px 0 4px"><b>2. Don't have one?</b> Ask your leader for a new invite link. If they show you a QR code, scan it with the Camera and this app opens.</p>
    <a class="btn alt" id="rcnAsk" href="${esc("sms:?&body="+encodeURIComponent(ask))}">Text my leader for a new link</a>
    <button class="btn alt" id="rcnCheck">Check again</button>
    <button class="btn alt" data-sclose="1">Not now</button>
    <p class="note" id="rcnOut" role="status">${esc(out)}</p></div>`;
  const sh=$("#sheet");sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add("open")))}
window.rcnSheet=sheet;
const KEYS=/(^|[#&])(sync|join|feed|me|coj|cov|lk|pg)=/;
function join(){const v=String(($("#rcnLink")||{}).value||"").trim();const i=v.indexOf("#");const say=t=>{out=t;const o=$("#rcnOut");if(o)o.textContent=t};
  if(i<0||!KEYS.test(v.slice(i))){say("That doesn't look like an invite link. Copy the whole link from the text, starting with https.");return}
  out="";closeSheet();location.hash=v.slice(i);setTimeout(()=>location.reload(),60)}
async function check(){const say=t=>{out=t;const o=$("#rcnOut");if(o)o.textContent=t};say("Checking…");
  try{if(S.sync&&S.sync.on&&typeof syncPull==="function")await syncPull(true);if(S.link&&typeof rosterPull==="function")await rosterPull(true)}catch(e){}
  if(lost()){say("Still cut off. You need a new invite link from your leader.");return}
  out="";closeSheet();render();toast("Connected again")}
document.addEventListener("click",e=>{const t=e.target;if(!t||!t.closest)return;
  if(t.closest("#rcnGo")){e.stopImmediatePropagation();out="";sheet();return}
  if(!sheetCtx||sheetCtx.kind!=="rcn")return;
  if(t.closest("#rcnJoin")){e.stopImmediatePropagation();join();return}
  if(t.closest("#rcnCheck")){e.stopImmediatePropagation();check();return}},true);
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target&&e.target.id==="rcnLink"){e.preventDefault();join()}});
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{place()}catch(e){}return r}}
/* open the notice once per app session when the cut-off is first seen */
const ASK="af-rcn-asked";
every(5000,()=>{try{const c=lost();if(!c){place();return}place();const sh=$("#sheet");if(sh&&!sh.hidden)return;let k="";try{k=sessionStorage.getItem(ASK)||""}catch(x){}
  if(k===c.k)return;try{sessionStorage.setItem(ASK,c.k)}catch(x){}out="";sheet()}catch(e){}},"rcn");

/* ---------- 2. the owner's invite link ---------- */
let invRole="sncoic",qrOn=false;
/* when this connection was made, as seen by this phone: the first code it ever sees has no known date (old links still
   work); a code that replaces one it saw ("Cut off everyone") is stamped with the time it appeared */
const MK="af-inv-made";
function made(){const Y=S.sync;if(!Y||!Y.code)return 0;let o=null;try{o=JSON.parse(localStorage.getItem(MK)||"null")}catch(e){}
  if(!o||!o.code){o={code:Y.code,t:0}}else if(o.code!==Y.code){o={code:Y.code,t:Date.now()}}else return +o.t||0;
  try{localStorage.setItem(MK,JSON.stringify(o))}catch(e){}return +o.t||0}
function inviteLink(r){r=ROLES.some(x=>x[0]===r)?r:"sncoic";const q=new URLSearchParams();q.set("sync",normCode(S.sync.code));q.set("r",r);
  if((S.wsCur||"plt")==="co")q.set("w","co");q.set("u",String(unitName()||"").slice(0,30));const t=made();if(t){const d=new Date(t);q.set("c",String(d.getFullYear())+String(d.getMonth()+1).padStart(2,"0")+String(d.getDate()).padStart(2,"0"))}
  return PUB()+"#"+q.toString()}
window.inviteLink=inviteLink;
function inviteText(r){const l=(ROLES.find(x=>x[0]===r)||ROLES[1])[1];return unitName()+" · Accounted For\nInvite: "+l+"\n\nOpen this link on your phone to connect to our roster: "+inviteLink(r)+"\n\nNo app yet? Get it on iPhone, then tap the link again. Keep this link private."}
function cardHTML(){const t=made(),fresh=t&&Date.now()-t<36*3600000,u=inviteLink(invRole);
  return `<div class="panel" style="margin:10px 0 0" id="invCard"><div style="display:flex;align-items:center;gap:8px"><b>Invite link</b>${fresh?`<span class="chip" style="display:inline-block;width:auto;color:var(--s-onhand)">New</span>`:""}</div>
    <p class="note">One link that connects a phone to your roster and keeps it in sync. Pick what they can do, then send it.${t?` Made ${esc(dshort(t))} ${hhmm(t)}; links from before then don't work.`:""}</p>
    <div class="evts" role="group" aria-label="What they can do">${ROLES.map(([r,l])=>`<button data-invrole="${r}" aria-pressed="${r===invRole}">${l}</button>`).join("")}</div>
    <p class="note" style="margin:4px 0 8px">${esc((ROLES.find(x=>x[0]===invRole)||[])[2]||"")}</p>
    <div class="note" id="invUrl" style="word-break:break-all;font-family:ui-monospace,Menlo,monospace;font-size:12px;background:var(--bg2,rgba(127,127,127,.08));border-radius:10px;padding:8px 10px;margin:0 0 8px">${esc(u)}</div>
    <div class="row2"><button class="btn" id="invShare">Share link</button><button class="btn alt" id="invCopy">Copy</button></div>
    <button class="btn alt" id="invQr" style="width:100%">${qrOn?"Hide QR code":"Show QR code"}</button>${qrOn?`<div id="invQrBox" style="max-width:240px;margin:8px auto"></div>`:""}
    <p class="note">Keep it private: anyone with it can open your roster as ${esc(((ROLES.find(x=>x[0]===invRole)||[])[1]||"").toLowerCase())}.</p>
    <button class="btn warn" id="accReset" style="width:100%">${armed==="accreset"?"Tap again: cut off every phone I shared with":"Cut off everyone I shared with"}</button>
    <p class="note">Makes a new connection. Old links and linked phones stop syncing and see "Reconnect to your roster"; send this invite link to the people you keep.</p></div>`}
async function drawQr(){const box=$("#invQrBox");if(!box)return;
  try{await loadLib("lib/qrcode.js","qrcode");const q=qrcode(0,"M");q.addData(inviteLink(invRole));q.make();box.innerHTML=q.createSvgTag({cellSize:5,margin:2,scalable:true});const sv=box.querySelector("svg");if(sv){sv.style.width="100%";sv.style.height="auto";sv.style.background="#fff";sv.style.borderRadius="12px";sv.setAttribute("role","img");sv.setAttribute("aria-label","QR code for the invite link")}}
  catch(e){box.innerHTML=`<p class="note">Couldn't draw the QR code here. Connect once so the app can load it.</p>`}}
{const _a=accessHTML;accessHTML=function(){if(!isOwner()||!S.sync||!S.sync.on||!S.sync.code)return _a.apply(this,arguments);return cardHTML()}}
function redraw(){const c=$("#invCard");if(!c)return;c.outerHTML=cardHTML();if(qrOn)drawQr()}
document.addEventListener("click",e=>{const t=e.target;if(!t||!t.closest)return;
  const rb=t.closest("[data-invrole]");if(rb){e.stopImmediatePropagation();invRole=rb.dataset.invrole;redraw();return}
  if(t.closest("#invCopy")){e.stopImmediatePropagation();const u=inviteLink(invRole);try{navigator.clipboard.writeText(u).then(()=>toast("Invite link copied"),()=>toast(u))}catch(err){toast(u)}return}
  if(t.closest("#invShare")){e.stopImmediatePropagation();const u=inviteLink(invRole),txt=inviteText(invRole);
    if(navigator.share){navigator.share({title:unitName()+" invite",text:txt}).catch(err=>{if(!err||err.name!=="AbortError"){try{navigator.clipboard.writeText(txt).then(()=>toast("Couldn't open sharing. Invite copied instead."),()=>toast(u))}catch(x){toast(u)}}})}
    else{try{navigator.clipboard.writeText(txt).then(()=>toast("Invite copied. Paste it in a text."),()=>toast(u))}catch(x){toast(u)}}return}
  if(t.closest("#invQr")){e.stopImmediatePropagation();qrOn=!qrOn;redraw();return}},true);

/* ---------- 3. opening an invite link: say whose roster it is ---------- */
{const _p=syncJoinPrompt;syncJoinPrompt=function(code,r,w){let u="",c="";try{const q=new URLSearchParams((location.hash||"").slice(1));if(q.get("sync")===code){u=String(q.get("u")||"").slice(0,30);c=String(q.get("c")||"").replace(/\D/g,"").slice(0,8)}}catch(e){}
  const res=_p.apply(this,arguments);
  try{if(u||c){const T=$("#sheetT small");if(T)T.insertAdjacentHTML("afterbegin",`<b>${esc(u||"A team")}</b>${c.length===8?" · invite made "+esc(c.slice(4,6)+"/"+c.slice(6,8)):""}<br>`)}}catch(e){}
  return res}}
})();
