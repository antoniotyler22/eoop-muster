/* Accounted For 1.7: Account (optional), with Supabase Auth.
   Nobody has to sign in. Signing in (email code, text code, or Sign in with Apple on the web) adds three things:
   1) Your teams follow you: each team's recovery code is kept in your account, so another phone gets them back.
   2) Teams sent to you: a leader can send a team to your email or phone number. Sign in with it and it's waiting.
   3) Leaders can send a team (any role link) straight to someone's account from Invite, and see when it was opened.
   Needs setup part 23 (supabase/setup/23_accounts.sql) and the Supabase Auth settings in store/setup-1.7.md. */
(()=>{
const AK="af-auth";
const NOFN=/could not find the function|schema cache|PGRST202/i;
const isEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||"").trim());
const phoneE164=v=>{let d=String(v||"").replace(/\D/g,"");if(d.length===10)d="1"+d;return d.length>=8&&d.length<=15?"+"+d:""};
const normTo=v=>isEmail(v)?String(v).trim().toLowerCase():(phoneE164(v)||"").slice(1);
const nice=u=>u?(u.email||(u.phone?"+"+String(u.phone).replace(/^\+/,""):"")):"";
const sheetUp=()=>{const sh=$("#sheet");sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add("open")))};

/* ---------- session ---------- */
const A=window.AUTH={s:null,
  load(){try{this.s=JSON.parse(localStorage.getItem(AK)||"null")}catch(e){this.s=null}return this.s},
  keep(o){this.s=o;try{o?localStorage.setItem(AK,JSON.stringify(o)):localStorage.removeItem(AK)}catch(e){}},
  on(){return !!(this.s&&this.s.refresh_token)},
  user(){return this.s&&this.s.user||null}};
A.load();
async function authFetch(path,body,bearer){const h={apikey:SB.key,"Content-Type":"application/json"};if(bearer)h.Authorization="Bearer "+bearer;
  const r=await fetch(SB.url+"/auth/v1/"+path,{method:"POST",headers:h,body:JSON.stringify(body||{})});const t=await r.text();let o={};try{o=t?JSON.parse(t):{}}catch(e){}
  if(!r.ok)throw new Error(authMsg(o,r.status));return o}
function authMsg(o,st){const m=String(o.msg||o.message||o.error_description||o.error||"").trim();
  if(/rate limit|security purposes|too many/i.test(m))return "Too many tries. Wait a minute, then try again.";
  if(/expired|invalid/i.test(m)&&/otp|token|code/i.test(m))return "That code didn't work. Check it, or send a new one.";
  if(/provider|disabled|not enabled|unsupported phone|sms/i.test(m))return "That sign-in way isn't turned on yet. Use another one.";
  if(/signups not allowed/i.test(m))return "New accounts are turned off on this server.";
  return m||("Couldn't sign in (error "+st+").")}
function takeSession(o){if(!o||!o.access_token)throw new Error("Couldn't sign in. Try again.");
  const exp=o.expires_at?o.expires_at*1000:Date.now()+(+o.expires_in||3600)*1000;
  A.keep({access_token:o.access_token,refresh_token:o.refresh_token,exp,user:o.user?{id:o.user.id,email:o.user.email||"",phone:o.user.phone||""}:(A.s&&A.s.user)||null})}
let refreshing=null;
async function token(){if(!A.on())return null;if(A.s.exp-Date.now()>60000)return A.s.access_token;
  if(!refreshing)refreshing=authFetch("token?grant_type=refresh_token",{refresh_token:A.s.refresh_token}).then(o=>{takeSession(o);return A.s.access_token})
    .catch(e=>{if(/invalid|not found|revoked|expired/i.test(String(e.message)))A.keep(null);throw e}).finally(()=>{refreshing=null});
  return refreshing}
A.token=token;
/* signed-in server call */
async function arpc(fn,args){const tk=await token();if(!tk)throw new Error("Sign in first.");
  const r=await fetch(SB.url+"/rest/v1/rpc/"+fn,{method:"POST",headers:{apikey:SB.key,Authorization:"Bearer "+tk,"Content-Type":"application/json"},body:JSON.stringify(args||{})});
  const t=await r.text();if(!r.ok){let m=t;try{m=JSON.parse(t).message||t}catch(e){}throw new Error(m||("HTTP "+r.status))}return t?JSON.parse(t):null}
A.rpc=arpc;
const setupMsg=e=>NOFN.test(String(e&&e.message||e))?"Accounts aren't set up on your server yet. Run setup part 23 (Tools → Settings → System check shows it).":String(e&&e.message||e);

/* Sign in with Apple (web): Supabase sends the person back here with the session in the address */
{const h=location.hash||"";if(/access_token=/.test(h)&&/refresh_token=/.test(h)){const q=new URLSearchParams(h.slice(1));
  try{takeSession({access_token:q.get("access_token"),refresh_token:q.get("refresh_token"),expires_at:+q.get("expires_at")||0,expires_in:+q.get("expires_in")||3600});
    fetch(SB.url+"/auth/v1/user",{headers:{apikey:SB.key,Authorization:"Bearer "+q.get("access_token")}}).then(r=>r.json()).then(u=>{if(u&&u.id){A.s.user={id:u.id,email:u.email||"",phone:u.phone||""};A.keep(A.s);afterSignIn()}}).catch(()=>{})}catch(e){}
  try{history.replaceState(null,"",location.pathname+"#acct")}catch(e){}setTimeout(()=>{view="acct";render()},300)}
 else if(/error_description=/.test(h)){const q=new URLSearchParams(h.slice(1));setTimeout(()=>toast("Sign in didn't finish: "+(q.get("error_description")||"").replace(/\+/g," ")),800);try{history.replaceState(null,"",location.pathname)}catch(e){}}}

/* ---------- account data ---------- */
let ac={step:"how",how:"email",to:"",busy:false,msg:"",teams:null,inv:null,sent:null,sentFor:"",armed:""};
function localTeams(){const out=[];const cur=S.wsCur||"plt";
  const add=(k,b,mode)=>{if(!b||!b.sync||!b.sync.on||!b.sync.code)return;if(b.role==="view")return;out.push({code:b.sync.code,w:k==="co"?"co":"",n:(cleanName(b.unit)||"Team").slice(0,40),m:mode||"",k})};
  add(cur,S,S.mode);for(const [k,b] of Object.entries(S.ws||{}))add(k,b,(S.teams&&S.teams[k]&&S.teams[k].mode)||"");return out}
const codeK=c=>String(c||"").replace(/[^A-Z0-9]/gi,"").toUpperCase();
async function teamsPull(){try{ac.teams=await arpc("acct_get",{})||[]}catch(e){ac.teams=null;ac.msg=setupMsg(e)}}
let lastPut="";
async function teamsPush(force){if(!A.on())return;const L=localTeams();if(!L.length&&!force)return;
  let have=ac.teams;if(!Array.isArray(have)){await teamsPull();have=ac.teams;if(!Array.isArray(have))return}
  const m=new Map(have.map(t=>[codeK(t.code),t]));for(const t of L)m.set(codeK(t.code),{code:t.code,w:t.w,n:t.n,m:t.m,at:Date.now()});
  const next=[...m.values()].slice(-50);const sig=JSON.stringify(next.map(t=>[t.code,t.n,t.w,t.m]));if(!force&&sig===lastPut)return;
  try{await arpc("acct_put",{p_teams:next});ac.teams=next;lastPut=sig}catch(e){}}
async function invPull(){if(!A.on())return;try{ac.inv=await arpc("inv_mine",{})||[];homeBanner()}catch(e){ac.inv=null}}
async function afterSignIn(){S.welcomed=1;save();await teamsPull();await teamsPush();await invPull();watchMine();if(view==="acct")redraw()}
async function watchMine(){if(!A.on()||!window.LIVE)return;const u=A.user()||{};
  for(const v of [u.email&&u.email.toLowerCase(),u.phone&&String(u.phone).replace(/\D/g,"")].filter(Boolean)){
    const t=await SB.topic("to",v);LIVE.watchTopic(t,"to",()=>{invPull().then(()=>{const n=(ac.inv||[]).filter(x=>!x.opened_at).length;if(n)toast("📨 A team was sent to your account. Open it from Home.");if(view==="acct")redraw()})})}}
every(5*60000,()=>{if(A.on()){invPull();teamsPush()}},"acct");
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&A.on())invPull()});
setTimeout(()=>{if(A.on()){invPull();watchMine();teamsPush()}},2500);

/* open a team that was sent to you, or one from your account */
const busyHere=()=>S.source!=="sample"||!!(S.board||S.feeds&&S.feeds.length||S.me||S.link||S.coBoard);
function openHash(hash){hash=String(hash||"").replace(/^#/,"");if(!hash)return;
  if(busyHere()&&window.TEAMS&&TEAMS.openNew){TEAMS.openNew(hash);return}
  location.hash=hash}
async function openInvite(id){const x=(ac.inv||[]).find(i=>i.id===id);if(!x)return;try{await arpc("inv_opened",{p_id:id})}catch(e){}
  const i=x.link.indexOf("#");if(i<0){toast("That invite has no link in it. Ask for a new one.");return}openHash(x.link.slice(i+1))}
function openSaved(code){const t=(ac.teams||[]).find(x=>codeK(x.code)===codeK(code));if(!t)return;
  openHash("sync="+codeK(t.code).match(/.{4}/g).join("-")+"&r=co"+(t.w==="co"?"&w=co":""))}

/* ---------- Home: "a team is waiting for you" ---------- */
function homeBanner(){if(view!=="board"&&view!=="me"&&view!=="today")return;const L=(ac.inv||[]).filter(x=>!x.opened_at);const old=$("#acInv");
  if(!L.length){if(old)old.remove();return}const x=L[0];
  const html=`<div class="panel" id="acInv" style="border-color:var(--s-onhand)"><b>📨 ${esc(x.team_name||"A team")} sent you ${L.length>1?L.length+" invites":"an invite"}</b>
    <div class="note" style="margin:2px 0 8px">${esc([x.role,x.label].filter(Boolean).join(" · "))}</div><button class="btn" data-acopen="${esc(x.id)}">Open it</button></div>`;
  if(old)old.outerHTML=html;else{const m=$("#main");if(m)m.insertAdjacentHTML("afterbegin",html)}}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{if(A.on())homeBanner()}catch(e){}return r}}

/* ---------- the Account screen ---------- */
function redraw(){const y=window.scrollY;renderAcct();window.scrollTo(0,y)}
function signInHTML(){const apple=SB.apple&&!window.NATIVE;
  let h=`<div class="panel"><b>Sign in (optional)</b><p class="note" style="margin:2px 0 8px">You don't need an account. Sign in to keep your teams on any phone, get teams your leader sends you, and send teams to your people.</p>`;
  if(ac.step==="code"){h+=`<p class="note" style="margin:0 0 6px">We sent a 6-digit code to <b>${esc(ac.to)}</b>.</p>
      <label for="acCode">Code</label><input id="acCode" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="123456" style="font-size:22px;letter-spacing:.2em">
      <button class="btn" id="acVerify"${ac.busy?" disabled":""}>${ac.busy?"Checking…":"Sign in"}</button>
      <div class="row2"><button class="btn alt" id="acResend">Send a new code</button><button class="btn alt" id="acBack">Change ${ac.how==="email"?"email":"number"}</button></div>`}
  else{h+=`<div class="row2" role="group" aria-label="How to sign in"><button class="btn${ac.how==="email"?"":" alt"}" data-achow="email" aria-pressed="${ac.how==="email"}">Email</button><button class="btn${ac.how==="phone"?"":" alt"}" data-achow="phone" aria-pressed="${ac.how==="phone"}">Text message</button></div>
      <label for="acTo">${ac.how==="email"?"Your email":"Your mobile number"}</label>
      <input id="acTo" type="text" inputmode="${ac.how==="email"?"email":"tel"}" autocomplete="${ac.how==="email"?"email":"tel"}" autocapitalize="none" spellcheck="false" value="${esc(ac.to)}" placeholder="${ac.how==="email"?"name@example.com":"(808) 555-0123"}">
      <button class="btn" id="acSend"${ac.busy?" disabled":""}>${ac.busy?"Sending…":"Send me a code"}</button>
      ${apple?`<button class="btn alt" id="acApple" style="margin-top:8px">Sign in with Apple</button>`:""}`}
  h+=`<div class="note" role="status" style="margin-top:6px">${esc(ac.msg)}</div></div>`;return h}
function renderAcct(){let h=`<h2>Account</h2>`;
  if(!A.on()){$("#main").innerHTML=h+signInHTML();return}
  const u=A.user();h+=`<div class="panel"><b>👤 Signed in</b><div class="note" style="margin:2px 0 8px">${esc(nice(u))}</div><button class="btn alt" id="acOut">Sign out</button></div>`;
  const inv=ac.inv||[];if(inv.length){h+=`<h2>Sent to you</h2><div class="alist">${inv.map(x=>`<div class="rrow"><div class="rtop"><div class="who"><b>${esc(x.team_name||"A team")}</b><div class="ph">${esc([x.role,x.label].filter(Boolean).join(" · "))}${x.opened_at?" · opened":""}</div></div>
      <button class="btn${x.opened_at?" alt":""}" data-acopen="${esc(x.id)}">${x.opened_at?"Open again":"Open"}</button></div></div>`).join("")}</div>`}
  const here=new Set(localTeams().map(t=>codeK(t.code)));const saved=Array.isArray(ac.teams)?ac.teams:[];
  h+=`<h2>Your teams</h2>`;
  if(!saved.length)h+=`<div class="card"><p class="note" style="margin:0">No teams saved yet.</p></div>`;
  else h+=`<div class="alist">${saved.map(t=>{const k=codeK(t.code);const on=here.has(k);return `<div class="rrow" style="--sc:var(${on?"--s-onhand":"--line"})"><div class="rtop"><div class="who"><b>${esc(t.n||"Team")}</b><div class="ph">${on?"On this phone":"Not on this phone yet"}${t.m&&MODES[t.m]?" · "+esc(MODES[t.m].name):""}</div></div>
      ${on?"":`<button class="btn" data-acteam="${esc(k)}">Open here</button>`}<button class="chip" data-acdrop="${esc(k)}" style="cursor:pointer">${ac.armed==="d"+k?"Tap again to remove":"Remove"}</button></div></div>`}).join("")}</div>`;
  const cur=S.sync&&S.sync.on&&here.has(codeK(S.sync.code));const savedCur=cur&&saved.some(t=>codeK(t.code)===codeK(S.sync.code));
  if(S.source!=="sample"||S.board)h+=`<div class="panel">${savedCur?`<b>✓ ${esc(unitName())} is in your account</b><p class="note" style="margin:0">Sign in on another phone and tap Open here to get it.</p>`
      :`<b>Keep ${esc(unitName())} in your account</b><p class="note" style="margin:2px 0 8px">Turns on backup for this team (if it's off) and saves its recovery code to your account.</p><button class="btn" id="acSave">Save this team to my account</button>`}</div>`;
  h+=`<h2>Account settings</h2><div class="panel"><p class="note" style="margin:0 0 8px">Deleting your account removes your sign-in, your saved team list and every team you sent to someone. Your teams stay on this phone.</p>
    <button class="btn warn" id="acDel">${ac.armed==="del"?"Tap again to delete my account":"Delete my account"}</button></div>`;
  h+=`<div class="note" role="status">${esc(ac.msg)}</div>`;
  $("#main").innerHTML=h}
{const _r=render;render=function(){if(view==="acct"){renderTabs();renderAcct();if(typeof animateView==="function")animateView();
    if(A.on()&&ac.teams===null&&!ac.loading){ac.loading=1;Promise.all([teamsPull(),invPull()]).then(()=>{ac.loading=0;teamsPush();if(view==="acct")redraw()})}return}
  return _r.apply(this,arguments)}}

/* ---------- clicks ---------- */
async function sendCode(){const v=(($("#acTo")||{}).value||"").trim();ac.to=v;
  if(ac.how==="email"&&!isEmail(v)){ac.msg="Type your email.";return redraw()}
  if(ac.how==="phone"&&!phoneE164(v)){ac.msg="Type your mobile number with area code.";return redraw()}
  ac.busy=true;ac.msg="";redraw();
  try{await authFetch("otp",ac.how==="email"?{email:v.toLowerCase(),create_user:true}:{phone:phoneE164(v),create_user:true});ac.step="code";ac.msg="";
    setTimeout(()=>{const c=$("#acCode");if(c)c.focus()},80)}
  catch(e){ac.msg=e.message}finally{ac.busy=false;redraw()}}
async function verify(){const code=(($("#acCode")||{}).value||"").replace(/\D/g,"");if(code.length<6){ac.msg="Type the code from the "+(ac.how==="email"?"email":"text")+".";return redraw()}
  ac.busy=true;ac.msg="";redraw();
  try{const o=await authFetch("verify",ac.how==="email"?{type:"email",email:ac.to.toLowerCase(),token:code}:{type:"sms",phone:phoneE164(ac.to),token:code});takeSession(o);
    ac.step="how";ac.msg="";toast("Signed in. Your teams follow you now.");await afterSignIn()}
  catch(e){ac.msg=e.message}finally{ac.busy=false;redraw()}}
document.addEventListener("click",async e=>{if(!e.target.closest)return;const t=e.target;
  const how=t.closest("[data-achow]");if(how){ac.how=how.dataset.achow;ac.msg="";redraw();return}
  if(t.closest("#acSend")){sendCode();return}
  if(t.closest("#acVerify")){verify();return}
  if(t.closest("#acResend")){ac.step="how";sendCode();return}
  if(t.closest("#acBack")){ac.step="how";ac.msg="";redraw();return}
  if(t.closest("#acApple")){location.href=SB.url+"/auth/v1/authorize?provider=apple&redirect_to="+encodeURIComponent(PUB());return}
  if(t.closest("#acOut")){const tk=A.s&&A.s.access_token;A.keep(null);ac={step:"how",how:ac.how,to:"",busy:false,msg:"Signed out. Your teams stay on this phone.",teams:null,inv:null,sent:null,sentFor:"",armed:""};
    if(tk)fetch(SB.url+"/auth/v1/logout",{method:"POST",headers:{apikey:SB.key,Authorization:"Bearer "+tk}}).catch(()=>{});homeBanner();redraw();return}
  const op=t.closest("[data-acopen]");if(op){e.stopImmediatePropagation();if(!ac.inv)await invPull();openInvite(op.dataset.acopen);return}
  const tm=t.closest("[data-acteam]");if(tm){openSaved(tm.dataset.acteam);return}
  const dr=t.closest("[data-acdrop]");if(dr){const k=dr.dataset.acdrop;if(ac.armed!=="d"+k){ac.armed="d"+k;redraw();return}ac.armed="";
    const next=(ac.teams||[]).filter(x=>codeK(x.code)!==k);try{await arpc("acct_put",{p_teams:next});ac.teams=next;lastPut="";ac.msg="Removed from your account. It stays on any phone that has it."}catch(err){ac.msg=setupMsg(err)}redraw();return}
  if(t.closest("#acSave")){if(typeof isOwner==="function"&&!isOwner()&&!(S.sync&&S.sync.on))return denyMsg();
    if(!(S.sync&&S.sync.on)){S.sync={on:true,code:newCode(),ver:0,at:0,err:"",last:""};save();ac.msg="Backing up…";redraw();await syncPush(true);if(S.sync.err){ac.msg="Backup failed: "+S.sync.err;return redraw()}}
    await teamsPush(true);ac.msg=Array.isArray(ac.teams)&&ac.teams.some(x=>codeK(x.code)===codeK(S.sync.code))?"Saved. Sign in on another phone to get it.":"Couldn't save to your account. "+(ac.msg||"");redraw();return}
  if(t.closest("#acDel")){if(ac.armed!=="del"){ac.armed="del";redraw();setTimeout(()=>{if(ac.armed==="del"){ac.armed="";if(view==="acct")redraw()}},5000);return}ac.armed="";
    try{await arpc("acct_delete",{});A.keep(null);ac={step:"how",how:"email",to:"",busy:false,msg:"Account deleted. Your teams stay on this phone.",teams:null,inv:null,sent:null,sentFor:"",armed:""};toast("Account deleted")}
    catch(err){ac.msg=setupMsg(err)}redraw();return}
  if(t.closest("[data-acwelcome]")){const w=$("#v11Welcome");if(w)w.hidden=true;document.body.classList.remove("v11w-open");view="acct";render();window.scrollTo(0,0)}});
document.addEventListener("keydown",e=>{if(e.key!=="Enter")return;if(e.target.id==="acTo"){e.preventDefault();sendCode()}else if(e.target.id==="acCode"){e.preventDefault();verify()}});

/* ---------- Invite: send the link to someone's account ---------- */
function teamId(){if(!S.teamId){S.teamId=rndId(20);save()}return S.teamId}
function inviteBox(){const main=$("#main");if(!main||view!=="invite")return;const box=main.querySelector('.invsend [id="invToC"]');const panel=box&&box.closest(".panel");
  if(panel&&!panel.querySelector("#acSendBox")){const url=(panel.querySelector('.note[style*="break-all"]')||{}).textContent||"";const role=(panel.querySelector(".chip")||{}).textContent||"";
    const label=((panel.querySelector("b")||{}).textContent||"").replace(/^Link ready · /,"");
    panel.insertAdjacentHTML("beforeend",`<div id="acSendBox" class="panel" style="margin:10px 0 0" data-url="${esc(url)}" data-role="${esc(role)}" data-label="${esc(label)}" data-noxl>
      <b>Or send it to their account</b><p class="note" style="margin:2px 0 6px">They sign in to Accounted For with this email or number and it's waiting. You see when they open it.</p>
      ${A.on()?`<label for="acInvTo">Their email or mobile number</label><input id="acInvTo" type="text" inputmode="email" autocapitalize="none" spellcheck="false" placeholder="name@example.com or (808) 555-0123">
        <button class="btn" id="acInvGo">Send to their account</button>`:`<button class="btn alt" data-go="acct">Sign in first to send to accounts</button>`}
      <div class="note" id="acInvMsg" role="status"></div></div>`)}
  if(A.on()&&!main.querySelector("#acSent")){main.insertAdjacentHTML("beforeend",`<div id="acSent"></div>`);sentList()}}
async function sentList(){const el=$("#acSent");if(!el)return;try{if(ac.sentFor!==teamId()||!ac.sent){ac.sent=await arpc("inv_sent",{p_team:teamId()})||[];ac.sentFor=teamId()}}catch(e){ac.sent=[]}
  const L=ac.sent||[];if(!L.length){el.innerHTML="";return}
  el.innerHTML=`<h2>Sent to accounts</h2><div class="alist">${L.map(x=>`<div class="rrow" style="--sc:var(${x.opened_at?"--s-onhand":"--line"})"><div class="rtop"><div class="who"><b>${esc(x.to_addr)}</b><div class="ph">${esc([x.role,x.label].filter(Boolean).join(" · "))} · ${x.opened_at?"opened "+esc(ago(Date.parse(x.opened_at))):"not opened yet"}</div></div>
    <button class="chip" data-acunsend="${esc(x.id)}" style="cursor:pointer">${ac.armed==="u"+x.id?"Tap again to cancel":"Cancel"}</button></div></div>`).join("")}</div>`}
async function sendInvite(){const box=$("#acSendBox");const to=(($("#acInvTo")||{}).value||"").trim();const out=$("#acInvMsg");const say=m=>{if(out)out.textContent=m};
  if(!isEmail(to)&&!phoneE164(to)){say("Type an email or a mobile number with area code.");return}
  const b=$("#acInvGo");if(b){b.disabled=true;b.textContent="Sending…"}
  try{await arpc("inv_send",{p_to:to,p_team:teamId(),p_team_name:unitName(),p_role:box.dataset.role||"",p_label:box.dataset.label||"",p_link:box.dataset.url});
    SB.topic("to",normTo(to)).then(t=>SB.pingTopic(t,"to"));actAdd("📨","Sent "+(box.dataset.label||"a link")+" to "+to+"'s account.","live");
    say("Sent. It's waiting in their account. They'll get it when they sign in with "+to+".");const i=$("#acInvTo");if(i)i.value="";ac.sent=null;sentList()}
  catch(e){say(setupMsg(e))}finally{if(b){b.disabled=false;b.textContent="Send to their account"}}}
document.addEventListener("click",async e=>{if(!e.target.closest)return;if(e.target.closest("#acInvGo")){e.stopImmediatePropagation();sendInvite();return}
  const u=e.target.closest("[data-acunsend]");if(u){const id=u.dataset.acunsend;if(ac.armed!=="u"+id){ac.armed="u"+id;sentList();return}ac.armed="";
    try{await arpc("inv_cancel",{p_id:id})}catch(err){}ac.sent=null;sentList()}});
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="acInvTo"){e.preventDefault();sendInvite()}});
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{inviteBox()}catch(e){}return r}}
new MutationObserver(()=>{if(view==="invite")try{inviteBox()}catch(e){}}).observe(document.getElementById("main")||document.body,{childList:true});

/* ---------- Welcome: "I'm joining" gets a Sign in option ---------- */
new MutationObserver(()=>{const w=$("#v11Welcome");if(!w||w.hidden)return;const slot=w.querySelector(".sgw-slot");if(!slot)return;
  const join=w.querySelector('[data-sgback="1"]');if(join&&!w.querySelector("[data-acwelcome]"))join.insertAdjacentHTML("beforebegin",`<div class="panel" style="margin:0"><b>Got sent a team by email or text?</b><p class="note" style="margin:2px 0 8px">Sign in with that email or number and it's waiting for you.</p><button class="btn alt" data-acwelcome="1">Sign in to my account</button></div>`)}).observe(document.body,{childList:true,subtree:true});

/* ---------- Tools tile, help, system check ---------- */
if(typeof HELP==="object")HELP.acct=["Account","Optional. Sign in so your teams follow you to any phone, and so leaders can send teams straight to you.",["Sign in with your email or mobile number. We send a 6-digit code.","Your teams: each team's recovery code is saved in your account. On a new phone, sign in and tap Open here.","Sent to you: when a leader sends a team to your email or number, it waits here and on Home.","Leaders: Invite → make a link → Send to their account. You see when they open it.","Delete my account removes your sign-in and saved list. Your teams stay on your phones."]];
if(typeof SC==="object"&&Array.isArray(SC))SC.push({k:"acct",n:"1.7: accounts (sign in, teams follow you, send to accounts)",f:["23_accounts"],t:[["acct_get",{}],["inv_mine",{}]]});
window.acctState=()=>({on:A.on(),user:A.user(),teams:ac.teams,inv:ac.inv});
})();
