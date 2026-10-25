/* Accounted For 1.3 — logins for groups, people set their own password, stay signed in or sign in each time, log out.
   Loaded by index.html after hub.js. Needs setup part 19 (falls back to part 15 when 19 isn't run yet). */
(()=>{
const sheetOpen=()=>{const sh=$("#sheet");sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add("open")))};
const redraw=fn=>{const y=window.scrollY;fn();window.scrollTo(0,y)};
const NOFN=/could not find the function|schema cache|PGRST202/i;
const RK={LCPL:"LCpl",SSGT:"SSgt",GYSGT:"GySgt",MSGT:"MSgt","1STSGT":"1stSgt",MGYSGT:"MGySgt",SGTMAJ:"SgtMaj","2NDLT":"2ndLt","1STLT":"1stLt",LTCOL:"LtCol",PFC:"PFC",PVT:"Pvt",CPL:"Cpl",SGT:"Sgt",CAPT:"Capt",MAJ:"Maj",COL:"Col"};
const rk=r=>RK[String(r||"").toUpperCase()]||String(r||"");
const signedIn=()=>!!(S.lgSelf&&S.lgSelf.uid);

/* ---------- leader side: never overwrite a password the person set themselves ---------- */
lgPut=async function(L,h){const K=await lgKeys(L.user,L.pw);const ct=await lgSeal(K,{v:1,h,m:S.mode||"",u:unitName(),l:L.label});
  try{const r=await SB.rpc("login_put2",{p_uid:K.uid,p_owner:S.lgOwner,p_vf:K.vf,p_ct:ct,p_force:!!L.force});
    if(r==="self"){L.self=1}else{delete L.self;delete L.force}}
  catch(e){if(!NOFN.test(String(e&&e.message)))throw e;await SB.rpc("login_put",{p_uid:K.uid,p_owner:S.lgOwner,p_vf:K.vf,p_ct:ct})}
  return K.uid};
async function lgStates(){const Ls=(S.logins||[]);if(!Ls.length||!S.lgOwner)return;
  try{const rows=await SB.rpc("login_states",{p_uids:Ls.map(L=>L.uid),p_owner:S.lgOwner});const m={};(rows||[]).forEach(r=>m[r.uid]=r);let ch=false;
    for(const L of Ls){const r=m[L.uid];if(!r)continue;const self=r.self_set?1:0,used=r.used_at?Date.parse(r.used_at):0;if((L.self||0)!==self||(L.used||0)!==used){L.self=self;L.used=used;ch=true}}
    if(ch){save();if(view==="logins")redraw(renderLogins)}}catch(e){}}
setTimeout(lgStates,4000);every(5*60000,lgStates,"v13-login-states");

/* ---------- leader side: make logins for a group ---------- */
let gSel=new Set(),gRanks=new Set(),gSecs=new Set(),gQ="",gBusy=false,gOut=[],gMsg="";
function gPeople(){return S.roster.filter(m=>gSel.has(m.id)||gRanks.has(String(m.rank).toUpperCase())||gSecs.has(m.sec))}
const hasLogin=m=>(S.logins||[]).some(L=>L.dest==="me:"+m.id);
function groupHTML(){if(S.source==="sample")return `<div class="panel"><b>Logins for a group</b><p class="note">Load your real roster in DATA first. Logins open each person's own My page.</p></div>`;
  const ranks=[...new Set(S.roster.map(m=>String(m.rank).toUpperCase()))].sort((a,b)=>rankIdx(a)-rankIdx(b));
  const cnt=r=>S.roster.filter(m=>String(m.rank).toUpperCase()===r).length;
  const sel=gPeople();const nNew=sel.filter(m=>!hasLogin(m)).length;const q=gQ.toLowerCase();
  const list=sorted(S.roster).filter(m=>!q||(m.rank+" "+m.name+" "+m.sec).toLowerCase().includes(q));
  let h=`<div class="panel" id="v13Grp"><b>Make logins for a group</b><p class="note">Pick ranks, sections or people (mix them). Each person gets their own username and a temporary password that opens their My page. They can change the password after they sign in.</p>
    <div class="note" style="margin:0">Ranks</div><div class="evts">${ranks.map(r=>`<button data-v13r="${esc(r)}" aria-pressed="${gRanks.has(r)}">${esc(rk(r))} · ${cnt(r)}</button>`).join("")}</div>
    <div class="note" style="margin:0">Sections</div><div class="evts">${SECTIONS.map(s=>s[0]).concat("ATT").map(k=>`<button data-v13s="${esc(k)}" aria-pressed="${gSecs.has(k)}">${esc(k)}</button>`).join("")}</div>
    <details${gSel.size?" open":""}><summary class="note">Pick people one by one (${gSel.size} picked)</summary><input class="search" id="v13Q" type="search" placeholder="Find people" value="${esc(gQ)}">
      <div class="alist" style="max-height:280px;overflow:auto">${list.slice(0,400).map(m=>`<label class="tog" style="padding:6px 2px;border-bottom:1px solid var(--line)"><input type="checkbox" data-v13p="${m.id}"${gSel.has(m.id)?" checked":""}> <span><b>${esc(m.rank)}</b> ${esc(m.name)} <span class="note">· ${esc(m.sec)}${hasLogin(m)?" · has a login":""}</span></span></label>`).join("")}</div></details>
    <div class="note"><b>${sel.length}</b> selected${sel.length-nNew?` · ${sel.length-nNew} already have a login (skipped)`:""}</div>
    <div class="row2"><button class="btn" id="v13Make"${nNew&&!gBusy?"":" disabled"}>${gBusy?"Making…":"Make "+nNew+" login"+(nNew===1?"":"s")}</button><button class="btn alt" id="v13Clear">Clear</button></div>
    <div class="note" role="status">${esc(gMsg)}</div>`;
  if(gOut.length){const Ls=gOut.map(uid=>(S.logins||[]).find(L=>L.uid===uid)).filter(Boolean);
    h+=`<b>Send them out</b><p class="note">Each text has that person's own username, temporary password, and links to the iPhone app and the web sign-in page. Send them one at a time.</p>
      <div class="alist">${Ls.map(L=>`<div class="rrow" style="--sc:var(--s-onhand)"><div class="who"><b>${esc(L.label)}</b><div class="ph" style="font-family:ui-monospace,Menlo,monospace">${esc(L.user)} · ${esc(L.pw)}</div></div><div class="row2">${lgSmsBtn(L)}<button class="btn alt" data-lgcopy="${L.uid}">Copy</button></div></div>`).join("")}</div>
      <button class="btn alt" id="v13CopyAll">Copy all ${Ls.length} (one list)</button><button class="btn alt" id="v13Done">Done</button>`}
  return h+`</div>`}
{const _rl=renderLogins;renderLogins=function(){_rl.apply(this,arguments);if(!isOwner()||!proOK())return;const m=$("#main");const first=m.querySelector(".panel");
  const g=groupHTML();first?first.insertAdjacentHTML("beforebegin",g):m.insertAdjacentHTML("beforeend",g);
  /* show who set their own password + reset */
  m.querySelectorAll("[data-lgarm]").forEach(b=>{const L=(S.logins||[]).find(x=>x.uid===b.dataset.lgarm);if(!L)return;const row=b.closest(".rrow");const ph=row&&row.querySelector(".ph");
    if(ph)ph.insertAdjacentHTML("beforeend",(L.used?" · signed in "+ago(L.used):" · not used yet")+(L.self?` · <b>set their own password</b>`:""));
    b.insertAdjacentHTML("beforebegin",`<button class="btn alt" data-v13reset="${L.uid}">${armed==="v13reset"+L.uid?"Tap again: new temporary password":"Reset password"}</button>`)})}}
async function makeGroup(){const people=gPeople().filter(m=>!hasLogin(m));if(!people.length)return;gBusy=true;gOut=[];gMsg="";redraw(renderLogins);let n=0,bad=0;
  for(const m of people){let tries=0;while(tries<3){tries++;try{const L=await lgCreate("me:"+m.id,lgUser(String(m.name||"").split(",")[0]),lgPw());gOut.push(L.uid);n++;break}
      catch(e){const t=String(e&&e.message||e);if(/taken/.test(t))continue;bad++;gMsg=lgErr(e);break}}
    gMsg="Made "+n+" of "+people.length+"…";const s=$("#v13Grp .note[role=status]");if(s)s.textContent=gMsg}
  gBusy=false;gMsg="Made "+n+" login"+(n===1?"":"s")+(bad?" · "+bad+" failed: "+gMsg:"")+".";gSel=new Set();gRanks=new Set();gSecs=new Set();
  if(n)actAdd("🔑","Made "+n+" logins for a group.","live");save();redraw(renderLogins);const g=$("#v13Grp");if(g)g.scrollIntoView({block:"start"})}

/* ---------- person side: stay signed in, change password, log out ---------- */
S.lgAsk=S.lgAsk!==false;  /* ask for the password each time the app opens (default on) */
function lockHTML(){const L=S.lgSelf;return `<div class="v11w-in" data-noxl><img src="icon-192.png" alt="" width="72" height="72" style="border-radius:18px">
  <h1>Sign in</h1><p class="note" style="margin:0">${esc(unitName())} · ${esc(L.l||"your page")}</p>
  <div class="panel" style="margin:0"><label for="v13U">Username</label><input type="text" id="v13U" value="${esc(L.user||"")}" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false">
    <label for="v13P">Password</label><input type="password" id="v13P" autocomplete="current-password" autocapitalize="none" autocorrect="off" spellcheck="false">
    <button class="btn" id="v13Go">Sign in</button><div class="note" id="v13Out" role="status"></div>
    <label class="tog"><input type="checkbox" id="v13AskT"${S.lgAsk?" checked":""}> Ask for my password every time the app opens</label></div>
  <p class="note" style="text-align:center">Forgot your password? Ask your leader to reset it.</p>
  <button class="btn alt" id="v13Out2">${armed==="v13out"?"Tap again: log out and clear this phone":"Log out"}</button></div>`}
function showLock(){let w=$("#v13Lock");if(!w){w=document.createElement("div");w.id="v13Lock";w.setAttribute("role","dialog");w.setAttribute("aria-label","Sign in");document.body.appendChild(w)}
  w.innerHTML=lockHTML();w.hidden=false;document.body.classList.add("v11w-open");setTimeout(()=>{const p=$("#v13P");if(p)p.focus({preventScroll:true})},250)}
function hideLock(){const w=$("#v13Lock");if(w)w.hidden=true;document.body.classList.remove("v11w-open")}
async function unlock(){const u=($("#v13U").value||""),p=($("#v13P").value||""),o=$("#v13Out"),b=$("#v13Go");if(!u.trim()||!p.trim()){o.textContent="Enter your username and password.";return}
  b.disabled=true;o.textContent="Checking…";
  try{const K=await lgKeys(u,p);
    if(K.uid===S.lgSelf.uid&&K.vf===S.lgSelf.vf){S.lgUnlocked=Date.now();save();hideLock();toast("Welcome back");return}
    /* the password may have been reset by the leader: check with the server */
    const r=await SB.rpc("login_get",{p_uid:K.uid,p_vf:K.vf});const row=Array.isArray(r)?r[0]:r;
    if(row&&row.ct&&K.uid===S.lgSelf.uid){const X=await lgOpen(K,row.ct);S.lgSelf.vf=K.vf;S.lgSelf.h=X.h;S.lgUnlocked=Date.now();save();hideLock();toast("Welcome back");return}
    o.textContent=row&&row.wait>0?"Too many tries. Wait "+Math.ceil(row.wait/60)+" min.":"Username or password is wrong."}
  catch(e){o.textContent=/fetch|network|Load failed/i.test(String(e&&e.message))?"Wrong password, or no signal to check a new one.":"Username or password is wrong."}
  finally{b.disabled=false}}
function logOut(){try{SB.rpc&&0}catch(e){}const V=window.VAULT;toast("Logging out…");setTimeout(()=>{if(V&&V.eraseAll)V.eraseAll();else{try{localStorage.clear()}catch(e){}location.replace(location.pathname)}},300)}
/* account panel: Tools, My page, Today */
function acctHTML(){if(!signedIn())return"";const L=S.lgSelf;return `<div class="panel" id="v13Acct"><b>👤 Signed in as ${esc(L.user||"")}</b><div class="note">${esc(L.l||"")}</div>
  <details${chg?" open":""}><summary class="note">Change my password</summary>
    <label for="v13Old">Current password</label><input type="password" id="v13Old" autocomplete="current-password" autocapitalize="none">
    <label for="v13New">New password (8 or more characters)</label><input type="password" id="v13New" autocomplete="new-password" autocapitalize="none">
    <label for="v13New2">New password again</label><input type="password" id="v13New2" autocomplete="new-password" autocapitalize="none">
    <button class="btn" id="v13Chg">Save new password</button><div class="note" id="v13ChgOut" role="status"></div></details>
  <label class="tog"><input type="checkbox" id="v13AskT2"${S.lgAsk?" checked":""}> Ask for my password every time the app opens</label>
  <button class="btn warn" id="v13Out3">${armed==="v13out"?"Tap again: log out and clear this phone":"Log out"}</button></div>`}
let chg=false;
async function changePw(){const o=$("#v13ChgOut"),b=$("#v13Chg");const old=$("#v13Old").value,n1=$("#v13New").value,n2=$("#v13New2").value;
  if(lgNormP(n1).length<8){o.textContent="New password: at least 8 characters.";return}if(lgNormP(n1)!==lgNormP(n2)){o.textContent="The new passwords don't match.";return}
  b.disabled=true;o.textContent="Saving…";
  try{const L=S.lgSelf;const Ko=await lgKeys(L.user,old);if(Ko.uid!==L.uid){o.textContent="Current password is wrong.";return}
    const r=await SB.rpc("login_get",{p_uid:Ko.uid,p_vf:Ko.vf});const row=Array.isArray(r)?r[0]:r;if(!row||!row.ct){o.textContent=row&&row.wait>0?"Too many tries. Wait "+Math.ceil(row.wait/60)+" min.":"Current password is wrong.";return}
    const X=await lgOpen(Ko,row.ct);const Kn=await lgKeys(L.user,n1);const ct=await lgSeal(Kn,X);
    const ok=await SB.rpc("login_change",{p_uid:L.uid,p_vf_old:Ko.vf,p_vf_new:Kn.vf,p_ct_new:ct});
    if(!ok){o.textContent="Current password is wrong.";return}
    L.vf=Kn.vf;S.lgUnlocked=Date.now();save();chg=false;o.textContent="";toast("Password changed");if(sheetCtx&&sheetCtx.kind==="v13pw")closeSheet();else redraw(render)}
  catch(e){o.textContent=NOFN.test(String(e&&e.message))?"Your leader's server needs the 1.3 update (System check → 19).":"Couldn't save. Check signal and try again."}
  finally{if(b.isConnected)b.disabled=false}}
/* right after the first sign-in: offer to set their own password */
window.lgAfterSignIn=function(n){if(!signedIn())return;n=n||0;const sh=$("#sheet");if(sh&&!sh.hidden&&n<60){setTimeout(()=>window.lgAfterSignIn(n+1),1000);return}sheetCtx={kind:"v13pw"};
  $("#sheetT").innerHTML=`You're signed in<small>Set your own password now, or keep the one you were given.</small>`;
  $("#sheetOpts").innerHTML=`<div class="panel" style="margin:0" data-noxl><input type="hidden" id="v13Old" value="">
    <label for="v13New">New password (8 or more characters)</label><input type="password" id="v13New" autocomplete="new-password" autocapitalize="none">
    <label for="v13New2">New password again</label><input type="password" id="v13New2" autocomplete="new-password" autocapitalize="none">
    <button class="btn" id="v13Chg">Save my password</button><button class="btn alt" data-sclose="1">Keep the one I was given</button><div class="note" id="v13ChgOut" role="status"></div>
    <label class="tog"><input type="checkbox" id="v13AskT2"${S.lgAsk?" checked":""}> Ask for my password every time the app opens</label></div>`;
  sheetOpen();window.__v13tmp=1};
/* where the account panel shows */
{const _rm=renderMe;renderMe=function(){_rm.apply(this,arguments);if(view==="me"&&signedIn())$("#main").insertAdjacentHTML("beforeend",acctHTML())}}
{const _rt=renderTools;renderTools=function(){_rt.apply(this,arguments);if(signedIn()){const s=$("#main .sech");s?s.insertAdjacentHTML("beforebegin",acctHTML()):$("#main").insertAdjacentHTML("afterbegin",acctHTML())}}}
{const _td=renderToday;renderToday=function(){_td.apply(this,arguments);if(signedIn())$("#main").insertAdjacentHTML("beforeend",acctHTML())}}
{const _ss=secHTML;secHTML=function(){return (signedIn()?acctHTML():"")+_ss.apply(this,arguments)}}
/* a Log out chip in the header for signed-in people */
function hdrPaint(){const hic=document.querySelector(".hic");if(!hic)return;let b=$("#v13Hdr");if(!signedIn()){if(b)b.remove();return}
  if(!b){hic.insertAdjacentHTML("afterbegin",`<button id="v13Hdr" aria-label="Account and log out" title="Account and log out"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg></button>`)}}
{const _rtb=renderTabs;renderTabs=function(){_rtb.apply(this,arguments);hdrPaint()}}

/* ---------- events ---------- */
document.addEventListener("click",e=>{const t=e.target;let b;
  if((b=t.closest("[data-v13r]"))){const r=b.dataset.v13r;gRanks.has(r)?gRanks.delete(r):gRanks.add(r);gOut=[];redraw(renderLogins);return}
  if((b=t.closest("[data-v13s]"))){const k=b.dataset.v13s;gSecs.has(k)?gSecs.delete(k):gSecs.add(k);gOut=[];redraw(renderLogins);return}
  if(t.id==="v13Clear"){gSel=new Set();gRanks=new Set();gSecs=new Set();gOut=[];gMsg="";redraw(renderLogins);return}
  if(t.id==="v13Make"){makeGroup();return}
  if(t.id==="v13Done"){gOut=[];gMsg="";redraw(renderLogins);return}
  if(t.id==="v13CopyAll"){const s=gOut.map(uid=>(S.logins||[]).find(L=>L.uid===uid)).filter(Boolean).map(L=>L.label+": username "+L.user+" · password "+L.pw).join("\n")+"\n\niPhone app: "+((typeof STORE_URL==="object"&&STORE_URL.ios)||"")+"\nWeb sign-in: "+PUB()+"#login";
    try{navigator.clipboard.writeText(s).then(()=>toast("Copied "+gOut.length+" logins"),()=>toast("Copy blocked here."))}catch(err){toast("Copy blocked here.")}return}
  if((b=t.closest("[data-v13reset]"))){const uid=b.dataset.v13reset;if(armed!=="v13reset"+uid){armed="v13reset"+uid;redraw(renderLogins);return}armed=null;const L=(S.logins||[]).find(x=>x.uid===uid);if(!L)return;b.disabled=true;
    (async()=>{L.pw=lgPw();L.force=1;const h=await lgHash(L.dest,true);await lgPut(L,h||L.h);L.h=h||L.h;delete L.self;save();toast("New temporary password. Text it to them.");gOut=[L.uid];redraw(renderLogins)})().catch(err=>{toast("Couldn't reset: "+lgErr(err));redraw(renderLogins)});return}
  if(t.id==="v13Go"){unlock();return}
  if(t.id==="v13Chg"){if(window.__v13tmp&&!$("#v13Old").value){/* first-time: prove with the password they just used */const pw=window.__v13pw;if(pw)$("#v13Old").value=pw}changePw();return}
  if(t.id==="v13Out2"||t.id==="v13Out3"){if(armed!=="v13out"){armed="v13out";t.textContent="Tap again: log out and clear this phone";setTimeout(()=>{if(armed==="v13out"){armed=null;if(t.isConnected)t.textContent="Log out"}},5000);return}armed=null;logOut();return}
  if(t.closest("#v13Hdr")){view=memberMode()?"me":"tools";if(!S.me&&memberMode())view="today";chg=false;render();setTimeout(()=>{const a=$("#v13Acct");if(a)a.scrollIntoView({block:"center",behavior:"smooth"})},80);return}
},false);
/* remember the password typed at sign-in for the "set your own password" sheet right after (memory only, never saved) */
document.addEventListener("click",e=>{if(e.target.id==="lgGo"){const p=$("#lgSP");window.__v13pw=p?p.value:""}},true);
document.addEventListener("change",e=>{const t=e.target;
  if(t.matches&&t.matches("[data-v13p]")){t.checked?gSel.add(t.dataset.v13p):gSel.delete(t.dataset.v13p);gOut=[];const y=window.scrollY;const open=true;renderLogins();window.scrollTo(0,y);return}
  if(t.id==="v13AskT"||t.id==="v13AskT2"){S.lgAsk=t.checked;save();toast(t.checked?"The app will ask for your password when it opens":"You'll stay signed in until you log out");return}});
document.addEventListener("input",e=>{if(e.target.id==="v13Q"){gQ=e.target.value;const pos=e.target.selectionStart;redraw(renderLogins);const q=$("#v13Q");if(q){q.focus();q.setSelectionRange(pos,pos)}}});
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.target.id==="v13P"||e.target.id==="v13U")){e.preventDefault();unlock()}});

/* ---------- app opens: signed-in people see the sign-in page (unless they chose to stay signed in) ---------- */
let hiddenAt=0;
document.addEventListener("visibilitychange",()=>{if(document.hidden){hiddenAt=Date.now();return}if(signedIn()&&S.lgAsk&&hiddenAt&&Date.now()-hiddenAt>5*60000)showLock()});
if(signedIn()&&S.lgAsk&&Date.now()-(S.lgUnlocked||0)>60000)showLock();

if(typeof SC==="object"&&Array.isArray(SC))SC.push({k:"v13",n:"1.3: group logins, people set their own password",f:["19_login_self"],t:[["login_states",{p_uids:["zz"],p_owner:"x"}],["login_change",{p_uid:"zz",p_vf_old:"x",p_vf_new:"0".repeat(64),p_ct_new:"QUFBQUFBQUFBQUFBQUFBQUFBQUFB"}]]});
if(typeof SYNC_SKIP==="object"&&Array.isArray(SYNC_SKIP))SYNC_SKIP.push("lgAsk","lgUnlocked");
if(typeof WS_GLOBAL==="object"&&Array.isArray(WS_GLOBAL))WS_GLOBAL.push("lgSelf","lgAsk","lgUnlocked");
if(typeof HELP==="object"&&HELP.logins){HELP.logins[2]=HELP.logins[2].concat(["Make logins for a group: pick ranks (all SSgts, GySgts, MSgts…), sections, or people, then Make logins. Text each person theirs.","People can change their password after they sign in. If they forget it, tap Reset password and text them the new one."])}
hdrPaint();render();
})();
