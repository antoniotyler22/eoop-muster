/* Accounted For 4.127.0: joining a team without a link. Setup parts 52 and 53.
   B) Join code. Each team gets a 6-character code (letters and numbers, never 0, O, 1 or I). The owner sees it in
      Settings → Tools → Join code (or Tools → Join code), can make a new one (the old one stops working at once) and
      can turn it off. Someone types it on Join a team, joins the team's Word of Mouth, and picks their own name on
      the roster ("Who are you?"), so they're matched to their roster spot. The server stores only a hash of the code
      and the team's member link sealed with a key made from the code.
   C) Sign in with Apple or Google (optional). The signed-in email is matched to the roster's Email column (setup part 52:
      only salted hashes on the server, and a row comes back only to the person whose verified email it is). A match
      joins the team as that roster spot. No match sends the person to Ask to join.
   D) Ask to join. The owner can list the team by name. A person finds it, fills in who they are and sends a request
      sealed to the owner's key. The owner's Requests list has one-tap Approve or Decline. Approve adds them to the
      roster (or matches them to their spot) and seals the team link for them; the person's phone checks while the app
      is open and tells them the result. No push alerts are added for any of this.
   E) The team's name shows on every join screen. */
(()=>{
const ALPH="23456789ABCDEFGHJKLMNPQRSTUVWXYZ";/* no 0, O, 1, I */
const TE=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
async function sha(s){return hex(await crypto.subtle.digest("SHA-256",TE.encode(s)))}
async function kdf(secret,salt,it){const km=await crypto.subtle.importKey("raw",TE.encode(secret),"PBKDF2",false,["deriveBits"]);
  return b64url(new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:TE.encode(salt),iterations:it||100000},km,256)))}
function newJoinCode(){const r=crypto.getRandomValues(new Uint8Array(6));return [...r].map(x=>ALPH[x%32]).join("")}
const cleanCode=v=>String(v||"").toUpperCase().replace(/[\s-]/g,"");
const codeOK=c=>c.length===6&&[...c].every(ch=>ALPH.includes(ch));
const codeHash=c=>sha("af-join-v1:"+c);
const codeKey=c=>kdf("af-join-v1:"+c,"af-join-v1",100000);
/* sealing to a public key (ECDH P-256 + AES-GCM): only the private key's phone can open it */
async function genKP(){const k=await crypto.subtle.generateKey({name:"ECDH",namedCurve:"P-256"},true,["deriveBits"]);
  const pub=await crypto.subtle.exportKey("jwk",k.publicKey),priv=await crypto.subtle.exportKey("jwk",k.privateKey);return {pub:JSON.stringify({x:pub.x,y:pub.y}),priv}}
const pubKey=p=>{const o=typeof p==="string"?JSON.parse(p):p;return crypto.subtle.importKey("jwk",{kty:"EC",crv:"P-256",x:o.x,y:o.y,ext:true},{name:"ECDH",namedCurve:"P-256"},false,[])};
const privKey=j=>crypto.subtle.importKey("jwk",j,{name:"ECDH",namedCurve:"P-256"},false,["deriveBits"]);
async function shared(priv,pub){return b64url(new Uint8Array(await crypto.subtle.deriveBits({name:"ECDH",public:pub},priv,256)))}
async function sealTo(pubStr,obj){const e=await crypto.subtle.generateKey({name:"ECDH",namedCurve:"P-256"},true,["deriveBits"]);const ej=await crypto.subtle.exportKey("jwk",e.publicKey);
  const k=await shared(e.privateKey,await pubKey(pubStr));return JSON.stringify({e:{x:ej.x,y:ej.y},c:await fdEnc(k,obj)})}
async function openSealed(privJwk,s){try{const o=JSON.parse(s);const k=await shared(await privKey(privJwk),await pubKey(o.e));return await fdDec(k,o.c)}catch(e){return null}}
Object.assign(window,{afJoin:{newJoinCode,cleanCode,codeOK,codeHash,codeKey,sealTo,openSealed,genKP,sha,kdf,ALPH}});

const owner=()=>typeof isOwner==="function"&&isOwner()&&!(typeof memberMode==="function"&&memberMode());
const real=()=>S.source!=="sample"&&Array.isArray(S.roster);
const feedOf=()=>typeof mainFeed==="function"?mainFeed():null;
/* what a member needs to join: the team's Word of Mouth member link and the team's name */
function memberLink(f){return {v:1,id:f.id,mk:f.mk,ek:f.ek,unit:unitName(),secs:SECTIONS.map(x=>x[0])}}
const NOFN=/could not find|schema cache|PGRST202|404/i;
const why=e=>NOFN.test(String(e&&e.message||e))?"Your server needs setup part 53 (Settings → System check).":String(e&&e.message||e).slice(0,90);

/* ---------- joining a team's Word of Mouth from a sealed link ---------- */
function joinFeed(L,me,mid){if(!L||!L.id||!L.mk||!L.ek)return null;let f=(S.feeds||[]).find(x=>x.id===L.id);
  if(!f){f={id:String(L.id).slice(0,20),mk:String(L.mk).slice(0,40),ek:String(L.ek).slice(0,60),unit:String(L.unit||"Team").slice(0,30),me:String(me||S.myName||"").slice(0,30),sec:"",secsLink:(L.secs||[]).slice(0,12),posts:[],seen:0,mine:{}};S.feeds.push(f)}
  if(mid){f.mid=String(mid).slice(0,40);if(me)f.me=String(me).slice(0,30);f.whoAt=Date.now();if(!S.myName&&me)S.myName=String(me).slice(0,30)}
  if(typeof fdSel!=="undefined")fdSel=f.id;if(!S.mode)S.mode="military";S.onb=true;S.welcomed=1;save();
  try{if(typeof fdMeHash==="function")fdMeHash(f).then(()=>{try{fdPollAll(true)}catch(e){}})}catch(e){}return f}
window.afJoinFeed=joinFeed;
async function pickName(f){try{if(typeof window.whoNamesGet==="function")await window.whoNamesGet(f,true)}catch(e){}
  if(!f.mid&&typeof window.whoSheet==="function")window.whoSheet({k:"feed",id:f.id})}

/* ================= B. owner: the join code ================= */
const JC=()=>{S.jc=S.jc&&typeof S.jc==="object"?S.jc:{};return S.jc};
let jcBusy=false,jcMsg="";
async function jcPublish(code){const f=feedOf();if(!f||!f.lk)throw new Error("Start your team's Word of Mouth first.");
  const ct=await fdEnc(await codeKey(code),memberLink(f));await SB.rpc("join_code_set",{p_feed:f.id,p_leader_key:f.lk,p_h:await codeHash(code),p_ct:ct});
  Object.assign(JC(),{code,on:true,at:Date.now(),sig:jcSig(f),err:""})}
const jcSig=f=>[f.id,unitName(),SECTIONS.map(x=>x[0]).join(",")].join("|");
async function jcNew(){if(jcBusy||!owner())return;jcBusy=true;jcMsg="";redrawJ();
  try{for(let i=0;i<4;i++){try{await jcPublish(newJoinCode());break}catch(e){if(!/code taken/i.test(String(e.message))||i===3)throw e}}save();jcMsg="New code ready. The old code no longer works."}
  catch(e){JC().err=why(e);jcMsg=JC().err;rawSave()}finally{jcBusy=false;redrawJ()}}
async function jcEnable(on){const f=feedOf();if(!f||!f.lk||!JC().code||jcBusy)return;jcBusy=true;redrawJ();
  try{await SB.rpc("join_code_enable",{p_feed:f.id,p_leader_key:f.lk,p_on:!!on});JC().on=!!on;save();jcMsg=on?"Code on. People can join with it.":"Code off. Nobody can join with it until you turn it back on."}
  catch(e){jcMsg=why(e)}finally{jcBusy=false;redrawJ()}}
/* the team name or sections changed: re-seal the same code */
every(60000,()=>{try{const f=feedOf(),J=S.jc;if(!owner()||!f||!f.lk||!J||!J.code||!J.on||jcBusy)return;if(J.sig!==jcSig(f)){jcBusy=true;jcPublish(J.code).then(rawSave).catch(e=>{J.err=why(e);rawSave()}).finally(()=>{jcBusy=false})}}catch(e){}},"jc-reseal");
const fmtCode=c=>c?c.slice(0,3)+" "+c.slice(3):"";
function jcHTML(){if(!owner())return `<p class="note">Only the team's owner can see and change the join code.</p>`;const f=feedOf(),J=JC();
  if(!f||!f.lk)return `<div class="panel" id="jcPanel"><b>Join code</b><p class="note">The join code opens your team's Word of Mouth, so start that first.</p><button class="btn" id="jcFeed"${jcBusy?" disabled":""}>Start our Word of Mouth</button><p class="note" role="status">${esc(jcMsg)}</p></div>`;
  return `<div class="panel" id="jcPanel"><b>Join code · ${esc(unitName())}</b>
    ${J.code?`<div id="jcCode" aria-label="Join code ${esc([...J.code].join(" "))}" style="font:800 34px/1.2 ui-monospace,Menlo,monospace;letter-spacing:.12em;text-align:center;margin:10px 0;${J.on?"":"opacity:.4;text-decoration:line-through"}">${esc(fmtCode(J.code))}</div>
      <p class="note" style="text-align:center;margin:0 0 8px">${J.on?"On: people type this in Join a team, then pick their name on your roster.":"Off: nobody can join with it."}</p>
      <div class="row2"><button class="btn alt" id="jcShare"${J.on?"":" disabled"}>Share</button><button class="btn alt" id="jcNew"${jcBusy?" disabled":""}>${armed==="jcnew"?"Tap again: new code":"New code"}</button></div>
      <button class="btn ${J.on?"warn":""}" id="jcToggle" style="width:100%"${jcBusy?" disabled":""}>${J.on?"Turn off the code":"Turn the code back on"}</button>`
     :`<p class="note">Make a 6-character code people can type in the app to join. No 0, O, 1 or I, so it's easy to read out.</p><button class="btn" id="jcNew"${jcBusy?" disabled":""}>Make a join code</button>`}
    <p class="note" id="jcOut" role="status">${esc(jcMsg||J.err||"")}</p></div>`}
window.jcHTML=jcHTML;
function redrawJ(){const p=document.getElementById("jcPanel");if(p)p.outerHTML=jcHTML()}

/* ================= D. owner: Ask to join ================= */
const ASK=()=>{S.ask=S.ask&&typeof S.ask==="object"?S.ask:{};return S.ask};
let reqs=[],reqAt=0,reqBusy=false,reqMsg="",reqErr="";
async function askList(on){const f=feedOf();if(!owner()||!f||!f.lk)throw new Error("Start your team's Word of Mouth first.");const A=ASK();
  if(on&&!A.priv){const kp=await genKP();A.pub=kp.pub;A.priv=kp.priv}
  await SB.rpc("team_dir_put",{p_feed:f.id,p_leader_key:f.lk,p_name:unitName(),p_pub:A.pub||"",p_on:!!on});A.on=!!on;A.name=unitName();save()}
async function reqLoad(force){const f=feedOf(),A=ASK();if(!owner()||!f||!f.lk||!A.priv||reqBusy)return;if(!force&&Date.now()-reqAt<25000)return;reqBusy=true;
  try{const rows=await SB.rpc("join_req_list",{p_feed:f.id,p_leader_key:f.lk})||[];const out=[];
    for(const r of rows){const o=await openSealed(A.priv,r.ct);if(!o)continue;out.push({id:+r.id,status:r.status,at:Date.parse(r.created_at)||0,dt:Date.parse(r.decided_at)||0,
      rank:String(o.rank||"").toUpperCase().slice(0,8),last:String(o.last||"").toUpperCase().slice(0,30),first:String(o.first||"").toUpperCase().slice(0,30),sec:String(o.sec||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6),
      phone:String(o.phone||"").replace(/\D/g,"").slice(-10),email:typeof normEmail==="function"?(normEmail(o.email)||""):"",note:String(o.note||"").slice(0,160),rpub:o.rpub})}
    reqs=out;reqAt=Date.now();reqErr="";const n=out.filter(x=>x.status==="pending").length;if(n!==S.askWaiting){S.askWaiting=n;rawSave()}}
  catch(e){reqErr=why(e)}finally{reqBusy=false}if(view==="joinreqs")redrawR()}
every(30000,()=>{if(!document.hidden&&ASK().on)reqLoad(false)},"join-reqs");setTimeout(()=>{if(ASK().on)reqLoad(true)},2500);
async function decide(id,ok){const r=reqs.find(x=>x.id===id),f=feedOf();if(!r||!f||!f.lk)return;
  try{if(!ok){await SB.rpc("join_req_decide",{p_feed:f.id,p_leader_key:f.lk,p_id:id,p_status:"declined",p_reply_ct:null});r.status="declined";reqMsg="Declined. They'll see it the next time they open the app.";redrawR();return}
    const name=(r.last+(r.first?", "+r.first:"")).slice(0,60);let m=S.roster.find(x=>(r.email&&x.email===r.email)||fullK(x)===fullK({name}));
    if(!m){const sec=SECTIONS.some(s=>s[0]===r.sec)?r.sec:SECTIONS[0][0];m=addMarine({rank:RANKS.includes(r.rank)?r.rank:(MODE().rankDef||"LCPL"),name,sec,phone:r.phone.length===10?r.phone:undefined},sec);
      if(!m)m=S.roster.find(x=>fullK(x)===fullK({name}));if(m){m.detail=m.detail||"Asked to join";if(r.email)m.email=r.email}}
    if(!m)throw new Error("Couldn't add them to the roster.");
    const me=(m.rank+" "+lastOf(m)).trim();const reply=await sealTo(r.rpub,Object.assign(memberLink(f),{mid:m.id,me}));
    await SB.rpc("join_req_decide",{p_feed:f.id,p_leader_key:f.lk,p_id:id,p_status:"approved",p_reply_ct:reply});r.status="approved";save();
    try{if(typeof window.whoNamesPub==="function")window.whoNamesPub(true)}catch(e){}
    reqMsg="Approved: "+me+" is on your roster and gets the team the next time they open the app.";redrawR()}
  catch(e){reqMsg="Couldn't "+(ok?"approve":"decline")+": "+why(e);redrawR()}}
function reqsHTML(){if(!owner())return `<p class="note">Only the team's owner sees requests to join.</p>`;const A=ASK(),f=feedOf();
  const pend=reqs.filter(x=>x.status==="pending"),done=reqs.filter(x=>x.status!=="pending");
  const row=r=>`<div class="rrow" data-req="${r.id}" style="--sc:var(${r.status==="pending"?"--brass":r.status==="approved"?"--s-onhand":"--line"})"><div class="who"><b>${esc((r.rank+" "+r.last+(r.first?", "+r.first:"")).trim())}</b>
      <div class="ph">${esc([r.sec&&"Section "+r.sec,r.phone&&fmtPh(r.phone),r.email].filter(Boolean).join(" · ")||"No details")} · asked ${esc(ago(r.at))}</div>${r.note?`<div class="ph">“${esc(r.note)}”</div>`:""}</div>
      ${r.status==="pending"?`<div class="row2"><button class="btn" data-reqok="${r.id}">Approve</button><button class="btn alt" data-reqno="${r.id}">Decline</button></div>`:`<span class="chip">${r.status==="approved"?"Approved":"Declined"}</span>`}</div>`;
  return `<div id="jrWrap"><div class="sechead" style="margin-top:12px"><h2>Requests to join</h2><span class="note" style="margin:0">${esc(unitName())}</span></div>
    <div class="panel"><label class="lrow" style="cursor:pointer"><input type="checkbox" id="askOn"${A.on?" checked":""}${f&&f.lk?"":" disabled"}><span style="flex:1"><span class="t" style="display:block">Let people find ${esc(unitName())} by name</span><span class="s" style="display:block">They search for your team in Join a team and ask. Only your phone can read who's asking.</span></span></label>
      ${f&&f.lk?"":`<p class="note">Start your team's Word of Mouth first.</p><button class="btn" id="jcFeed">Start our Word of Mouth</button>`}</div>
    <p class="note" role="status" id="jrOut">${esc(reqMsg||reqErr||"")}</p>
    ${A.on?(pend.length?`<div class="alist">${pend.map(row).join("")}</div>`:`<div class="panel"><p class="note">No one is waiting. New requests show up here while the app is open.</p></div>`):""}
    ${done.length?`<h2>Decided this week</h2><div class="alist">${done.map(row).join("")}</div>`:""}</div>`}
window.reqsHTML=reqsHTML;window.afReqLoad=reqLoad;
function redrawR(){const w=document.getElementById("jrWrap");if(w)w.outerHTML=reqsHTML()}

/* ================= member side: Join a team ================= */
let jq="",jRes=null,jMsg="",jBusy=false,jPick=null,jFound=null;
if(typeof SYNC_SKIP!=="undefined"&&Array.isArray(SYNC_SKIP))for(const k of ["myReqs","askWaiting"])if(!SYNC_SKIP.includes(k))SYNC_SKIP.push(k);
const myReqs=()=>{S.myReqs=Array.isArray(S.myReqs)?S.myReqs:[];return S.myReqs};
function askJoinHTML(){const pend=myReqs().filter(r=>r.status==="pending"),done=myReqs().filter(r=>r.status!=="pending").slice(0,3);
  const res=jRes?(jRes.length?jRes.map(t=>`<button class="btn alt" data-askteam="${esc(t.feed_id)}" style="width:100%;text-align:left;margin:3px 0"><b>${esc(t.name)}</b> <span class="note" style="margin:0">· Ask to join</span></button>`).join(""):`<p class="note">No team by that name takes requests. Check the spelling, or ask your leader for the join code.</p>`):"";
  return `<div id="ajWrap"><div class="sechead" style="margin-top:12px"><h2>Join a team</h2></div>
    ${pend.map(r=>`<div class="banner" data-myreq="${r.id}"><span>⏳ <b>Waiting for ${esc(r.name)}</b> to approve your request. You'll see the answer here when you open the app.</span><button data-reqcheck="${r.id}">Check now</button></div>`).join("")}
    ${done.map(r=>`<div class="note" data-myreq="${r.id}">${r.status==="approved"?"✅ "+esc(r.name)+" approved your request.":"✖ "+esc(r.name)+" declined your request."}</div>`).join("")}
    <div class="panel"><b>Have a join code?</b><p class="note" style="margin:2px 0 8px">6 letters and numbers from your leader.</p>
      <input id="ajCode" type="text" inputmode="text" autocapitalize="characters" autocomplete="off" spellcheck="false" maxlength="8" placeholder="ABC 234" style="text-transform:uppercase;font:700 22px ui-monospace,Menlo,monospace;letter-spacing:.12em;text-align:center">
      <button class="btn" id="ajJoin"${jBusy?" disabled":""}>Join with code</button></div>
    <div class="panel"><b>Find your team by name</b><input id="ajQ" type="search" placeholder="At least 3 letters" value="${esc(jq)}" autocomplete="off"><button class="btn alt" id="ajFind"${jBusy?" disabled":""}>Search</button><div id="ajRes">${res}</div></div>
    ${typeof SB==="object"&&(SB.apple||SB.google)?`<div class="panel"><b>Sign in instead</b><p class="note" style="margin:2px 0 8px">If your leader put your email on the roster, signing in finds your spot.</p>${SB.apple?`<button class="btn alt" id="ajApple">Sign in with Apple</button>`:""}${SB.google?`<button class="btn alt" id="ajGoogle">Sign in with Google</button>`:""}</div>`:""}
    <p class="note" id="ajOut" role="status">${esc(jMsg)}</p></div>`}
window.askJoinHTML=askJoinHTML;
function redrawA(){const w=document.getElementById("ajWrap");if(w)w.outerHTML=askJoinHTML()}
const sayA=t=>{jMsg=t;const o=document.getElementById("ajOut");if(o)o.textContent=t};
async function byCode(){const c=cleanCode(($("#ajCode")||{}).value);if(!codeOK(c)){sayA("A join code is 6 letters and numbers, like ABC234 (never 0, O, 1 or I).");return}
  jBusy=true;sayA("Checking…");
  try{const rows=await SB.rpc("join_code_get",{p_h:await codeHash(c)});const r=rows&&rows[0];if(!r){jBusy=false;sayA("That code didn't work. Check it with your leader; it may have been changed or turned off.");return}
    const L=await fdDec(await codeKey(c),r.ct);if(!L||L.id!==r.feed_id){jBusy=false;sayA("That code didn't work.");return}
    jBusy=false;jFound=L;confirmJoin(L)}
  catch(e){jBusy=false;sayA(why(e))}}
function confirmJoin(L){sheetCtx={kind:"ajoin"};
  $("#sheetT").innerHTML=`Join ${esc(L.unit||"this team")}?<small>You'll see ${esc(L.unit||"the team")}'s Word of Mouth and pick your name on their roster.</small>`;
  $("#sheetOpts").innerHTML=`<div class="panel" style="margin:0" data-noxl><p class="note" style="margin:0 0 6px">Team: <b id="ajTeam">${esc(L.unit||"")}</b></p>
    <label class="tog"><input type="checkbox" id="ajTos"${typeof termsOK==="function"&&termsOK()?" checked":""}> I agree to the <a href="terms.html" target="_blank" rel="noopener">Terms of Use</a>: no objectionable or abusive content.</label>
    <button class="btn" id="ajYes">Join ${esc(L.unit||"team")}</button><button class="btn alt" data-sclose="1">Not now</button></div>`;
  const sh=$("#sheet");sh.hidden=false;void sh.offsetWidth;sh.classList.add("open")}
async function doJoin(){const L=jFound;if(!L)return;const t=$("#ajTos");if(t&&!t.checked){toast("Agree to the Terms of Use to join.");return}
  if(typeof TERMS_VER!=="undefined")S.tos=TERMS_VER;const f=joinFeed(L);closeSheet();view="feed";render();toast("You're in "+(L.unit||"the team")+". Pick your name on the roster.");jFound=null;if(f)pickName(f)}
async function search(){jq=String(($("#ajQ")||{}).value||"").trim();if(jq.length<3){sayA("Type at least 3 letters of the team's name.");return}
  jBusy=true;sayA("Searching…");try{jRes=await SB.rpc("team_dir_find",{p_q:jq})||[];jMsg=""}catch(e){jRes=null;jMsg=why(e)}jBusy=false;redrawA()}
function askForm(t){jPick=t;sheetCtx={kind:"askform"};
  $("#sheetT").innerHTML=`Ask to join ${esc(t.name)}<small>Only ${esc(t.name)}'s owner can read this. They approve or decline, and you'll see the answer here.</small>`;
  $("#sheetOpts").innerHTML=`<div class="panel" style="margin:0" data-noxl><p class="note" style="margin:0 0 6px">Team: <b>${esc(t.name)}</b></p>
    <label for="afRank">Rank or title</label><input id="afRank" maxlength="8" autocapitalize="characters" style="text-transform:uppercase" placeholder="SGT">
    <div class="row2"><input id="afLast" maxlength="30" placeholder="LAST NAME" autocapitalize="characters" style="text-transform:uppercase"><input id="afFirst" maxlength="30" placeholder="FIRST NAME" autocapitalize="characters" style="text-transform:uppercase"></div>
    <input id="afSec" maxlength="6" placeholder="Section (if you know it)" autocapitalize="characters" style="text-transform:uppercase">
    <input id="afPhone" type="tel" inputmode="tel" placeholder="Phone (optional)"><input id="afEmail" type="text" inputmode="email" autocapitalize="none" placeholder="Email (optional)">
    <input id="afNote" maxlength="160" placeholder="Note for the owner (optional)">
    <button class="btn" id="afSend">Send request</button><button class="btn alt" data-sclose="1">Cancel</button><p class="note" id="afOut" role="status"></p></div>`;
  const sh=$("#sheet");sh.hidden=false;void sh.offsetWidth;sh.classList.add("open")}
async function sendReq(){const t=jPick;if(!t)return;const g=id=>String(($("#"+id)||{}).value||"").trim();const out=$("#afOut");const say=x=>{if(out)out.textContent=x};
  const last=g("afLast").toUpperCase(),em=g("afEmail");if(!last){say("Enter your last name.");return}
  const emn=em?(typeof normEmail==="function"?normEmail(em):em):"";if(em&&!emn){say("That email isn't valid. Use name@example.com or leave it blank.");return}
  try{say("Sending…");const kp=await genKP();const tok=b64url(crypto.getRandomValues(new Uint8Array(24)));
    const ct=await sealTo(t.pub,{rank:g("afRank").toUpperCase(),last,first:g("afFirst").toUpperCase(),sec:g("afSec").toUpperCase(),phone:g("afPhone"),email:emn||"",note:g("afNote"),rpub:JSON.parse(kp.pub)});
    const id=await SB.rpc("join_req_send",{p_feed:t.feed_id,p_ct:ct,p_tok_hash:await sha(tok)});
    myReqs().unshift({id:+id,tok,feed:t.feed_id,name:t.name,priv:kp.priv,at:Date.now(),status:"pending"});S.myReqs=myReqs().slice(0,10);S.onb=true;S.welcomed=1;save();
    closeSheet();jMsg="Request sent to "+t.name+".";redrawA();toast("Request sent. You'll see the answer here.")}
  catch(e){say("Couldn't send: "+why(e))}}
/* the person's phone: check pending requests while the app is open */
async function checkReqs(){for(const r of myReqs()){if(r.status!=="pending")continue;
  try{const rows=await SB.rpc("join_req_status",{p_id:r.id,p_tok:r.tok});const x=rows&&rows[0];if(!x||x.status==="pending")continue;
    r.status=x.status;r.dt=Date.now();
    if(x.status==="approved"){const L=await openSealed(r.priv,x.reply_ct);if(L){const f=joinFeed(L,L.me,L.mid);toast("✅ "+r.name+" approved your request. You're in as "+(L.me||"yourself")+".");if(f&&!f.mid)pickName(f)}}
    else toast("✖ "+r.name+" declined your request.");
    delete r.priv;delete r.tok;save();if(view==="askjoin")redrawA()}catch(e){}}}
window.afCheckReqs=checkReqs;
every(30000,()=>{if(!document.hidden&&myReqs().some(r=>r.status==="pending"))checkReqs()},"my-reqs");setTimeout(()=>{if(myReqs().some(r=>r.status==="pending"))checkReqs()},3000);

/* ================= C. sign in with Apple or Google: find my roster spot ================= */
const emailKey=em=>kdf("af-email-key-v1:"+em,"af-email-v1",20000);
/* owner's phone: the roster's emails, hashed, each with that person's sealed join link (setup part 52) */
let emBusy=false;
async function emailsPub(force){const f=feedOf();if(emBusy||!owner()||!real()||!f||!f.lk)return;
  const people=S.roster.filter(m=>m.email&&typeof normEmail==="function"&&normEmail(m.email));const sg=sigF([f.id,unitName()].concat(people.map(m=>[m.id,m.email,m.rank,m.name])));
  if(!force&&S.emSig===sg)return;emBusy=true;
  try{const rows=[];for(const m of people.slice(0,2000)){const em=normEmail(m.email);rows.push({h:await sha("af-email-v1:"+em),ct:await fdEnc(await emailKey(em),Object.assign(memberLink(f),{mid:m.id,me:(m.rank+" "+lastOf(m)).trim()}))})}
    await SB.rpc("roster_email_put",{p_feed:f.id,p_leader_key:f.lk,p_rows:rows});S.emSig=sg;S.emErr="";rawSave()}
  catch(e){S.emErr=NOFN.test(String(e.message||e))?"part 52":String(e.message||e).slice(0,60);rawSave()}finally{emBusy=false}}
window.afEmailsPub=emailsPub;
if(typeof SYNC_SKIP!=="undefined"&&Array.isArray(SYNC_SKIP))for(const k of ["emSig","emErr"])if(!SYNC_SKIP.includes(k))SYNC_SKIP.push(k);
every(60000,()=>{try{emailsPub(false)}catch(e){}},"roster-emails");
/* a person who just signed in: match their verified email to a roster */
const noTeam=()=>!real()||(!S.roster.length&&!(S.feeds||[]).length)||S.source==="sample";
async function claim(){const A=window.AUTH;if(!A||!A.rpc)return {n:0};const em=String((A.s&&A.s.user&&A.s.user.email)||"").toLowerCase();
  const rows=await A.rpc("roster_email_claim",{})||[];let n=0,last=null;
  for(const r of rows){if(!em)break;const L=await fdDec(await emailKey(em),r.ct);if(!L||L.id!==r.feed_id)continue;last=joinFeed(L,L.me,L.mid);if(last)n++;last&&(last.unit=L.unit||last.unit)}
  return {n,f:last,email:em}}
window.afClaim=claim;
async function afterSignIn(){let wanted=false;try{wanted=sessionStorage.getItem("af-join-signin")==="1";sessionStorage.removeItem("af-join-signin")}catch(e){}
  if(!wanted)return;/* only Apple/Google sign-ins and sign-ins started from Join a team look for a roster spot */
  try{const r=await claim();if(r.n){view="feed";render();toast("Found you on "+(r.f&&r.f.unit||"your team")+"'s roster. You're in.");return}
    view="askjoin";jMsg=r.email?"We didn't find "+r.email+" on a team's roster. Find your team and ask to join.":"Find your team and ask to join.";render()}
  catch(e){view="askjoin";jMsg=NOFN.test(String(e.message||e))?"Signing in to join needs setup part 52 on the server.":"Find your team and ask to join.";render()}}
window.addEventListener("af-signed-in",()=>{setTimeout(afterSignIn,300)});
function oauth(p){try{sessionStorage.setItem("af-join-signin","1")}catch(e){}
  const back=window.NATIVE?"accountedfor://auth":PUB();const u=SB.url+"/auth/v1/authorize?provider="+p+"&redirect_to="+encodeURIComponent(back);
  if(window.NATIVE)window.open(u);else location.href=u}
window.afOauth=oauth;

/* ================= screens ================= */
const V={joincode:()=>jcHTML(),joinreqs:()=>{reqLoad(false);return reqsHTML()},askjoin:()=>askJoinHTML()};
const vOff=v=>typeof toolOn==="function"&&!toolOn(v==="joincode"?"joincode":"ask");
{const _r=render;render=function(){if(typeof view!=="undefined"&&V[view]&&!vOff(view)){try{renderTabs()}catch(e){}$("#main").innerHTML=(typeof banner==="function"?banner():"")+(view==="joincode"?`<div class="sechead" style="margin-top:12px"><h2>Join code</h2></div>`:"")+V[view]();return}return _r.apply(this,arguments)}}
window.toolExtra=(k=>{const prev=window.toolExtra;return k2=>k2==="joincode"?jcHTML():k2==="ask"?`<button class="btn alt" data-go="joinreqs" style="width:100%">Requests to join${S.askWaiting?" · "+S.askWaiting+" waiting":""}</button>`:typeof prev==="function"?prev(k2):""})();
/* Home: owner sees waiting requests; a phone with no team gets a Join a team button */
{const _b=banner;banner=function(){let h="";try{if(owner()&&S.askWaiting>0&&(typeof toolOn!=="function"||toolOn("ask")))h=`<div class="banner" id="jrBan"><span>🙋 <b>${S.askWaiting} ${S.askWaiting===1?"person asks":"people ask"}</b> to join ${esc(unitName())}.</span><button data-go="joinreqs">Review</button></div>`;
  const p=myReqs().find(r=>r.status==="pending");if(p&&view!=="askjoin")h+=`<div class="banner" id="ajBan"><span>⏳ Waiting for <b>${esc(p.name)}</b> to approve your request.</span><button data-go="askjoin">See</button></div>`}catch(e){}return h+_b.apply(this,arguments)}}
document.addEventListener("click",e=>{const t=e.target;if(!t||!t.closest)return;const c=(s)=>t.closest(s);
  if(c("#jcNew")){e.stopImmediatePropagation();if(JC().code&&armed!=="jcnew"){armed="jcnew";redrawJ();return}armed=null;jcNew();return}
  if(c("#jcToggle")){e.stopImmediatePropagation();jcEnable(!JC().on);return}
  if(c("#jcShare")){e.stopImmediatePropagation();const code=JC().code;const txt="Join "+unitName()+" on Accounted For: open the app, tap Join a team, and type the code "+code+". Get the app: "+PUB();
    if(navigator.share)navigator.share({title:"Join "+unitName(),text:txt}).catch(()=>{});else{try{navigator.clipboard.writeText(txt).then(()=>toast("Code and how-to copied"),()=>toast(txt))}catch(x){toast(txt)}}return}
  if(c("#jcFeed")){e.stopImmediatePropagation();Promise.resolve(typeof fdCreate==="function"?fdCreate():null).then(()=>{const f=feedOf();if(f){f.main=true;save()}render()}).catch(err=>toast("Couldn't start it: "+why(err)));return}
  const ok=c("[data-reqok]");if(ok){e.stopImmediatePropagation();decide(+ok.dataset.reqok,true);return}
  const no=c("[data-reqno]");if(no){e.stopImmediatePropagation();decide(+no.dataset.reqno,false);return}
  if(c("#ajJoin")){e.stopImmediatePropagation();byCode();return}
  if(c("#v11WJoin")){e.stopImmediatePropagation();S.welcomed=1;if(!S.mode)S.mode="military";save();try{hideWelcome()}catch(x){}view="askjoin";render();window.scrollTo(0,0);return}
  if(c("#ajYes")){e.stopImmediatePropagation();doJoin();return}
  if(c("#ajFind")){e.stopImmediatePropagation();search();return}
  const at=c("[data-askteam]");if(at){e.stopImmediatePropagation();const tm=(jRes||[]).find(x=>x.feed_id===at.dataset.askteam);if(tm)askForm(tm);return}
  if(c("#afSend")){e.stopImmediatePropagation();sendReq();return}
  if(c("[data-reqcheck]")){e.stopImmediatePropagation();checkReqs().then(()=>{if(myReqs().some(r=>r.status==="pending"))sayA("Still waiting.")});return}
  if(c("#ajApple")){e.stopImmediatePropagation();oauth("apple");return}
  if(c("#ajGoogle")){e.stopImmediatePropagation();oauth("google");return}},true);
document.addEventListener("change",e=>{if(e.target&&e.target.id==="askOn"){const on=!!e.target.checked;askList(on).then(()=>{reqMsg=on?unitName()+" is listed. People can find it by name and ask.":"Taken off the list. Nobody new can ask.";if(on)reqLoad(true);redrawR()}).catch(err=>{reqMsg=why(err);e.target.checked=!on;redrawR()})}});
document.addEventListener("keydown",e=>{if(e.key!=="Enter")return;if(e.target.id==="ajCode"){e.preventDefault();byCode()}else if(e.target.id==="ajQ"){e.preventDefault();search()}});
/* when the team's name changes, the listing follows */
every(120000,()=>{try{const A=S.ask;if(owner()&&A&&A.on&&A.name!==unitName())askList(true).catch(()=>{})}catch(e){}},"ask-name");
if(typeof SC==="object"&&Array.isArray(SC))SC.push({k:"join",n:"4.127: join codes and Ask to join",f:["53_join"],t:[["team_dir_find",{p_q:"zzz"}]]},{k:"remail",n:"4.127: sign in finds your roster spot",f:["52_roster_email"],t:[["roster_email_put",{p_feed:"zz",p_leader_key:"x",p_rows:[]}]]});
})();
