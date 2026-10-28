/* Accounted For 4.9.2: getting everyone on the app.
   1) Formation QR: one code on the leader's phone. People scan it, type their last name, first name and the last 4 of
      their phone number, and land on their own My page. Each person is a login behind the scenes, so wrong guesses lock
      out after 5 tries (server rule). Turn it off after formation; people who joined keep their page.
   2) On the app: how many of your people are on it, by section, with one tap to send to the rest.
   3) Reminders: people who got a login a day ago and haven't signed in show up on Home with Remind.
   4) Company asks buzz the platoon's phones (team alerts). */
(()=>{
const own=()=>typeof isOwner==="function"&&isOwner();
const real=()=>S.source!=="sample"?(S.roster||[]):[];
const digits=v=>String(v||"").replace(/\D/g,"");
const nrm=s=>String(s||"").toLowerCase().replace(/[^a-z]/g,"");
const lastN=m=>nrm(String(m.name||"").split(",")[0]);
const firstN=m=>nrm(String(String(m.name||"").split(",")[1]||"").trim().split(/\s+/)[0]);
if(typeof SYNC_SKIP==="object")SYNC_SKIP.push("qj");

/* ---------- 1) formation QR ---------- */
const qUser=(jc,last,first)=>("q"+jc+nrm(last).slice(0,18)+nrm(first).slice(0,2)).slice(0,32);
const qPw=(sec,ph)=>sec+"-"+digits(ph).slice(-4);
function qLink(){const Q=S.qj;const q=new URLSearchParams();q.set("qj",Q.id);q.set("s",Q.sec);q.set("u",unitName());return PUB()+"#"+q.toString()}
let qBusy=false,qMsg="";
async function qStart(){if(qBusy)return;const R=real();if(!R.length){toast("Load your roster first.");return}
  qBusy=true;qMsg="";const id=rndId(6),sec=rndId(10);const Q={id,sec,at:Date.now(),uids:[],skip:[]};
  const keys={};for(const m of R){const k=qUser(id,lastN(m),firstN(m));(keys[k]=keys[k]||[]).push(m)}
  const go=[];for(const [k,ms] of Object.entries(keys)){if(ms.length>1){ms.forEach(m=>Q.skip.push({id:m.id,why:"shares a name with someone"}));continue}
    const m=ms[0];if(digits(m.phone).length<7){Q.skip.push({id:m.id,why:"no phone number on the roster"});continue}go.push({m,k})}
  S.qj=Q;redraw();let n=0;
  for(const x of go){try{const L=await lgCreate("me:"+x.m.id,x.k,qPw(sec,x.m.phone),{mid:x.m.id,label:x.m.rank+" "+x.m.name+" · QR"});L.qr=id;Q.uids.push(L.uid);n++}
    catch(e){Q.skip.push({id:x.m.id,why:typeof lgErr==="function"?lgErr(e):"couldn't make it"});if(/aren't set up|No connection/.test(String(typeof lgErr==="function"?lgErr(e):"")))break}
    qMsg="Setting up "+n+" of "+go.length+"…";const s=document.getElementById("qjMsg");if(s)s.textContent=qMsg}
  qBusy=false;qMsg=n?"":"Couldn't set it up. "+((Q.skip[Q.skip.length-1]||{}).why||"");if(!n)S.qj=null;
  if(n)actAdd("▦","Formation QR ready for "+n+" people.","live");save();redraw()}
async function qStop(){const Q=S.qj;if(!Q)return;const L=(S.logins||[]).filter(x=>Q.uids.includes(x.uid));
  for(const x of L){try{await SB.rpc("login_delete",{p_uid:x.uid,p_owner:S.lgOwner})}catch(e){}}
  S.logins=(S.logins||[]).filter(x=>!Q.uids.includes(x.uid));S.qj=null;save();toast("QR turned off. People who joined keep their page.");redraw()}
const qJoined=()=>{const Q=S.qj;return Q?(S.logins||[]).filter(x=>Q.uids.includes(x.uid)&&x.used).length:0};
async function qDraw(){const box=document.getElementById("qjBox");if(!box||!S.qj)return;
  try{await loadLib("lib/qrcode.js","qrcode");const qr=qrcode(0,"M");qr.addData(qLink());qr.make();box.innerHTML=qr.createSvgTag({cellSize:6,margin:2,scalable:true});const sv=box.querySelector("svg");if(sv){sv.style.width="100%";sv.style.height="auto";sv.style.background="#fff";sv.style.borderRadius="12px"}}
  catch(e){box.innerHTML=`<p class="note">Couldn't draw the QR code here. Connect once so the app can load it.</p>`}}
function qHTML(){if(!own())return "";const Q=S.qj;const nm=id=>{const m=S.roster.find(x=>x.id===id);return m?m.rank+" "+m.name:"Someone"};
  let h=`<div class="panel" id="qjPanel" data-noxl><b>▦ Join at formation (QR)</b>`;
  if(!Q){const R=real();const ok=R.filter(m=>digits(m.phone).length>=7).length;
    h+=`<p class="note" style="margin:2px 0 6px">Show one code. People scan it, type their name and the last 4 of their phone number, and land on their own page. No texting.</p>
      ${R.length?`<button type="button" class="btn" id="qjGo"${qBusy||!ok?" disabled":""}>${qBusy?"Setting up…":"Make the formation QR · "+ok+" people"}</button>${R.length-ok?`<p class="note" style="margin:4px 0 0">${R.length-ok} have no phone number on the roster. Use <b>Find missing numbers in Contacts</b> in Send out first.</p>`:""}`:`<p class="note">Load your roster first.</p>`}
      <div class="note" id="qjMsg" role="status">${esc(qMsg)}</div></div>`;return h}
  if(qBusy)return h+`<div class="note" id="qjMsg" role="status">${esc(qMsg||"Setting up…")}</div></div>`;
  h+=`<p class="note" style="margin:2px 0 6px">Scan with the phone camera. Type last name, first name and the last 4 of your phone number.</p>
    <div id="qjBox" style="max-width:340px;margin:0 auto"></div>
    <div class="note" style="margin:6px 0"><b>${qJoined()}</b> of ${Q.uids.length} joined · set up ${esc(ago(Q.at))}</div>
    ${Q.skip.length?`<details><summary class="note">${Q.skip.length} can't use the QR</summary>${Q.skip.map(x=>`<div class="ph">${esc(nm(x.id))} · ${esc(x.why)}</div>`).join("")}<button type="button" class="btn alt" id="qjSkipSend" style="width:100%;margin-top:6px">Send them a login instead</button></details>`:""}
    <div class="row2"><button type="button" class="btn alt" id="qjCopy">Copy the link</button><button type="button" class="btn warn" id="qjStop">${armed==="qjstop"?"Tap again to turn off":"Turn off QR"}</button></div>
    <p class="note" style="margin:4px 0 0">Turn it off after formation. People who joined keep their page.</p></div>`;setTimeout(qDraw,0);return h}
function redraw(){const p=document.getElementById("qjPanel");if(p){const y=window.scrollY;p.outerHTML=qHTML();window.scrollTo(0,y)}}

/* scanner side */
function qSheet(q){const jc=(q.get("qj")||"").replace(/[^a-z0-9]/g,"").slice(0,8),sec=(q.get("s")||"").replace(/[^a-z0-9]/g,"").slice(0,12),u=(q.get("u")||"your team").replace(/[<>#|]/g,"").slice(0,40);
  try{history.replaceState(null,"",location.pathname)}catch(e){}if(jc.length<6||sec.length<10){toast("That QR code is incomplete. Scan it again.");return}
  S.welcomed=1;save();const w=document.getElementById("v11Welcome");if(w){w.hidden=true;document.body.classList.remove("v11w-open")}if(typeof window.hideWelcome==="function")window.hideWelcome();
  sheetCtx={kind:"qj",jc,sec};$("#sheetT").innerHTML=`Join ${esc(u)}<small>Type your name the way it's on the roster, and the last 4 of your phone number.</small>`;
  $("#sheetOpts").innerHTML=`<div class="panel" style="margin:0" data-noxl><label for="qjL">Last name</label><input type="text" id="qjL" autocomplete="family-name" autocapitalize="words">
    <label for="qjF">First name</label><input type="text" id="qjF" autocomplete="given-name" autocapitalize="words">
    <label for="qjP">Last 4 of your phone number</label><input type="text" id="qjP" inputmode="numeric" maxlength="4" autocomplete="off">
    ${(S.tos||0)<1?`<label class="tog" style="align-items:flex-start"><input type="checkbox" id="qjTos"> <span>I agree to the <a href="terms.html" target="_blank" rel="noopener">Terms of Use</a>: no objectionable or abusive content.</span></label>`:""}
    <button class="btn" id="qjJoin">Open my page</button><button class="btn alt" data-sclose="1">Cancel</button><div class="note" id="qjOut" role="status"></div></div>`;
  const sh=$("#sheet");sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add("open")))}
window.qjSheet=qSheet;
function qJoin(){const c=sheetCtx;if(!c||c.kind!=="qj")return;const L=($("#qjL")||{}).value||"",F=($("#qjF")||{}).value||"",P=digits(($("#qjP")||{}).value||"");const o=$("#qjOut");
  if(!nrm(L)||!nrm(F)||P.length!==4){if(o)o.textContent="Fill in all three.";return}
  if((S.tos||0)<1){const c=$("#qjTos");if(!c||!c.checked){if(o)o.textContent="Agree to the Terms of Use first.";return}S.tos=1;save()}
  const user=qUser(c.jc,L,F),pw=qPw(c.sec,P);lgSignSheet();setTimeout(()=>{const u=$("#lgSU"),p=$("#lgSP");const tc=$("#tosChk");if(tc)tc.checked=true;if(u&&p){u.value=user;p.value=pw;lgSignIn($("#lgGo"))}},50)}
const qHash=()=>{const q=new URLSearchParams((location.hash||"").slice(1));if(q.get("qj"))setTimeout(()=>qSheet(q),700)};
window.addEventListener("hashchange",qHash);qHash();

/* ---------- 2) on the app ---------- */
function onApp(m){const Ls=S.logins||[];if(Ls.some(L=>L.dest==="me:"+m.id&&L.used))return true;if((S.seen||{})[m.id])return true;
  return (S.feeds||[]).some(f=>f.lk&&Object.values(f.acks||{}).some(A=>A&&A[m.id]))}
window.onApp=onApp;
function oaData(){const R=real().filter(m=>m.sec!=="ATT");const on=R.filter(onApp);const secs=[...new Set(R.map(m=>m.sec))].map(k=>{const all=R.filter(m=>m.sec===k);return {k,n:all.length,on:all.filter(onApp).length}});return {R,on,secs,off:R.filter(m=>!onApp(m))}}
function oaHTML(full){if(!own())return "";const D=oaData();if(!D.R.length)return "";const P=pct(D.on.length,D.R.length);
  let h=`<div class="panel" id="oaPanel"><div style="display:flex;justify-content:space-between;align-items:baseline"><b>📱 On the app</b><span style="font-weight:800">${D.on.length} of ${D.R.length} · ${P}%</span></div><div class="hbar" style="margin:6px 0"><i style="width:${P}%"></i></div>`;
  h+=`<div style="display:flex;flex-wrap:wrap;gap:6px">${D.secs.map(s=>`<span class="chip"${s.on<s.n?' style="color:var(--warn)"':""}>${esc(s.k)} ${s.on}/${s.n}</span>`).join("")}</div>`;
  if(D.off.length){if(full)h+=`<details><summary class="note">Not on yet (${D.off.length})</summary>${sorted(D.off).map(m=>`<div class="ph">${esc(m.sec+" · "+m.rank+" "+m.name)}${digits(m.phone).length>=7?"":" · no phone"}</div>`).join("")}</details>`;
    h+=`<button type="button" class="btn${full?"":" alt"}" id="oaSend" style="width:100%;margin-top:8px">Send to the ${D.off.length} not on the app</button>`}
  else h+=`<p class="note" style="margin:6px 0 0">Everyone is on. 🎉</p>`;
  return h+`<p class="note" style="margin:6px 0 0">On the app: signed in with their login, checked in, or tapped Got it in the Feed.</p></div>`}

/* ---------- 3) reminders on Home ---------- */
const DAY=864e5;
function stale(){const R=real();return R.filter(m=>{const Ls=(S.logins||[]).filter(L=>L.dest==="me:"+m.id);return Ls.length&&!Ls.some(L=>L.used)&&Ls.every(L=>Date.now()-(L.at||0)>DAY)&&!onApp(m)})}
if(typeof renderBoard==="function"){const _rb=renderBoard;renderBoard=function(){const r=_rb.apply(this,arguments);try{if(!own()||S.source==="sample")return r;const m=$("#main");
  const st=stale();const snooze=S.oaSnooze&&Date.now()-S.oaSnooze<DAY;
  if(st.length&&!snooze)m.insertAdjacentHTML("afterbegin",`<div class="banner" id="oaNudge" style="border-color:var(--warn)"><span><b>🔔 ${st.length} haven't signed in</b> a day after getting their login.</span><button type="button" id="oaRemind">Remind</button><button type="button" id="oaLater" class="alt">Later</button></div>`);
  const D=oaData();if(D.R.length&&D.off.length&&!document.getElementById("oaPanel")){const qa=m.querySelector(".qa");const html=oaHTML(false);if(qa)qa.insertAdjacentHTML("afterend",html)}}catch(e){}return r}}

/* ---------- Invite: the QR panel under Send out ---------- */
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{if(view==="invite"&&own()&&!document.getElementById("qjPanel")){const b=document.getElementById("soBox");if(b)b.insertAdjacentHTML("afterend",qHTML())}
  if(view==="access"&&!document.getElementById("oaPanel")){const h2=document.querySelector("#main .sechead");if(h2)h2.insertAdjacentHTML("afterend",oaHTML(true))}}catch(e){}return r}}
new MutationObserver(()=>{if(view==="invite"&&own()&&!document.getElementById("qjPanel")){const b=document.getElementById("soBox");if(b)b.insertAdjacentHTML("afterend",qHTML())}}).observe(document.getElementById("main")||document.body,{childList:true,subtree:false});

/* ---------- 4) company asks buzz the platoon ---------- */
const tFeed=()=>{const F=S.feeds||[];return F.find(f=>f.lk&&f.main)||F.find(f=>f.lk)||null};
if(typeof coPayload==="function"){const _cp=coPayload;coPayload=function(){const b=_cp.apply(this,arguments);const f=tFeed();if(f&&f.mk)b.al={f:f.id,k:f.mk};return b}}
window.coAskBuzz=to=>{const C=S.coBoard;if(!C)return;const U=Object.entries(C.units||{}).filter(([k,u])=>(to==="all"||to===k)&&u.al&&u.al.f&&u.al.k);
  for(const [,u] of U)try{SB.notify(null,{team:u.al.f,k:u.al.k,what:["ask"]})}catch(e){}};

/* ---------- taps ---------- */
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;
  if(t.closest("#qjGo")){qStart();return}
  if(t.closest("#qjStop")){if(armed!=="qjstop"){armed="qjstop";return redraw()}armed=null;qStop();return}
  if(t.closest("#qjCopy")){const u=qLink();try{navigator.clipboard.writeText(u).then(()=>toast("Link copied"),()=>toast(u))}catch(err){toast(u)}return}
  if(t.closest("#qjSkipSend")){window.soPreset((S.qj.skip||[]).map(x=>x.id));return}
  if(t.closest("#qjJoin")){qJoin();return}
  if(t.closest("#oaSend")){window.soPreset(oaData().off.map(m=>m.id));return}
  if(t.closest("#oaRemind")){e.stopImmediatePropagation();window.soPreset(stale().map(m=>m.id));return}
  if(t.closest("#oaLater")){e.stopImmediatePropagation();S.oaSnooze=Date.now();save();render();return}},true);
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="qjP"){e.preventDefault();qJoin()}});

if(typeof HELP==="object"){if(HELP.invite&&Array.isArray(HELP.invite[2]))HELP.invite[2].push("Join at formation (QR): show one code; people scan it, type their name and the last 4 of their phone, and land on their own page. Turn it off after formation.");
  HELP.access=HELP.access||["People with access","",[]];if(Array.isArray(HELP.access[2]))HELP.access[2].unshift("On the app: how many of your people are on it, by section. Send to the ones who aren't with one tap.")}
})();
