/* Accounted For 4.29: visitor logins that cut off at a time you set.
   Visitors screen → "Visitor login": name, phone or email, and how long (2 h … 1 week, or an exact end time).
   It makes a username + password that opens the team Feed (read the word, tap Got it), signs them into the
   visitor log, and opens a text/email with the login and when it ends.
   When the time is up:
   - the leader's phone deletes the login, signs them out of the visitor log, and notes it in Activity;
   - the visitor's phone drops the Feed and the login by itself (the end time is sealed inside the login);
   - with setup part 33, the server also refuses the login after that time, even if the leader's phone is off.
   "End now" cuts one off early. A visitor never sees the roster, the board or anyone's numbers. */
(()=>{
const DUR=[[2,"2 hours"],[4,"4 hours"],[8,"8 hours"],[24,"1 day"],[72,"3 days"],[168,"1 week"]];
const isEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||"").trim());
const hm=t=>{const d=new Date(t);return String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0")};
const until=t=>{const d=new Date(t);return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]+" "+d.getDate()+" "+["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]+" "+hm(t)};
const teamFeed=()=>(S.feeds||[]).find(f=>f.lk&&f.main)||(S.feeds||[]).find(f=>f.lk)||null;
const vis=()=>(S.logins||[]).filter(L=>L.vis);
let vf={open:false,h:8,end:"",msg:"",busy:false,armed:""};

/* ---------- leader: make one ---------- */
async function make(){const g=id=>((document.getElementById(id)||{}).value||"").trim();const name=g("vlName").slice(0,60),to=g("vlTo").slice(0,80);
  if(!name){vf.msg="Type the visitor's name.";return draw()}
  if(to&&!isEmail(to)&&String(to).replace(/\D/g,"").length<10){vf.msg="Phone with area code, or an email (or leave it blank and copy the login).";return draw()}
  const f=teamFeed();if(!f){vf.msg="Start your team Feed first (Feed tab). Visitors sign in to the Feed.";return draw()}
  let end=vf.h?Date.now()+vf.h*3600000:Date.parse(g("vlEnd"));if(!end||end<Date.now()+5*60000){vf.msg="Pick an end time at least 5 minutes from now.";return draw()}
  if(end>Date.now()+31*864e5){vf.msg="Visitor logins last 31 days at most.";return draw()}
  vf.busy=true;vf.msg="Making the login…";draw();
  try{if(!S.lgOwner)S.lgOwner=rndId(32);const base=await lgHash("feed:"+f.id,true);if(!base)throw new Error("Couldn't make the Feed link.");
    const h=base+"&until="+end+"&vis=1";const L={user:lgUser(name.split(/\s+/).pop()),pw:lgPw(),dest:"feed:"+f.id,label:"Visitor · "+name,role:"Visitor",h,at:Date.now(),until:end,vis:1,who:name,to};
    let tries=0;while(!L.uid&&tries<3){tries++;try{const K=await lgKeys(L.user,L.pw);await SB.rpc("login_put",{p_uid:K.uid,p_owner:S.lgOwner,p_vf:K.vf,p_ct:await lgSeal(K,{v:1,h,m:S.mode||"",u:unitName(),l:L.label,until:end})});L.uid=K.uid}
      catch(e){if(/taken/.test(String(e&&e.message)))L.user=lgUser(name.split(/\s+/).pop());else throw e}}
    if(!L.uid)throw new Error("Couldn't find a free username.");
    try{await SB.rpc("login_expire",{p_uid:L.uid,p_owner:S.lgOwner,p_until:new Date(end).toISOString()});L.srv=1}catch(e){L.srv=0}
    S.logins=[L].concat(S.logins||[]);
    if(($("#vlLog")||{}).checked!==false){S.vis=Array.isArray(S.vis)?S.vis:[];const v={id:"v"+Date.now().toString(36)+rndId(3),n:name,ty:"Visitor",host:"",org:"",ph:to&&!isEmail(to)?String(to).replace(/\D/g,"").slice(-10):"",in:Date.now(),out:0,vend:end,vl:L.uid};S.vis.unshift(v);L.vid=v.id}
    actAdd("🪪","Visitor login for "+name+" until "+until(end),"visitors");save();vf={open:false,h:vf.h,end:"",msg:"",busy:false,armed:""};send(L);draw()}
  catch(e){vf.busy=false;vf.msg="Couldn't make it: "+(typeof lgErr==="function"?lgErr(e):String(e&&e.message||e));draw()}}
const text=L=>unitName()+" · Accounted For visitor login\nUsername: "+L.user+"\nPassword: "+L.pw+"\nGood until "+until(L.until)+".\n\nOn the web: "+PUB()+"#login\niPhone app: "+(typeof STORE_URL==="object"?STORE_URL.ios:"")+" (tap Sign in)";
function send(L){const t=text(L);if(L.to&&isEmail(L.to)){location.href="mailto:"+L.to+"?subject="+encodeURIComponent(unitName()+" visitor login")+"&body="+encodeURIComponent(t);return}
  const d=String(L.to||"").replace(/\D/g,"");if(d.length>=10){location.href="sms:+1"+d.slice(-10)+"?&body="+encodeURIComponent(t);return}
  try{navigator.clipboard.writeText(t).then(()=>toast("Login copied. Paste it to the visitor."),()=>toast("Login made. Tap Copy to send it."))}catch(e){toast("Login made. Tap Copy to send it.")}}
async function end(L,why){try{await SB.rpc("login_delete",{p_uid:L.uid,p_owner:S.lgOwner})}catch(e){if(why!=="time")throw e}
  S.logins=(S.logins||[]).filter(x=>x.uid!==L.uid);const v=(S.vis||[]).find(x=>x.vl===L.uid||x.id===L.vid);if(v&&!v.out)v.out=Math.min(Date.now(),L.until||Date.now());
  actAdd("🪪","Visitor login for "+(L.who||L.label)+(why==="time"?" ended (time up)":" ended early"),"visitors");save()}
/* the leader's phone ends what's due (also signs the visitor out of the log) */
async function sweepLeader(){if(typeof isOwner!=="function"||!isOwner())return;const due=vis().filter(L=>L.until&&L.until<=Date.now());let n=0;
  for(const L of due){try{await end(L,"time");n++}catch(e){}}if(n&&view==="visitors")draw()}

/* ---------- visitor's phone: drop access at the end time ---------- */
const pend={};
{const _jp=fdJoinPrompt;fdJoinPrompt=function(q){const u=+(q.get("until")||0);if(u){if(u<=Date.now()){try{history.replaceState(null,"",location.pathname)}catch(e){}if(S.lgSelf&&/until=/.test(S.lgSelf.h||""))delete S.lgSelf;save();return toast("This visitor login has ended. Ask your host for a new one.")}
    const id=(q.get("feed")||"").replace(/[^a-z0-9]/g,"").slice(0,20);pend[id]=u;const f=(S.feeds||[]).find(x=>x.id===id);if(f){f.until=u;f.vis=1;save()}}
  return _jp.apply(this,arguments)}}
function sweepVisitor(){let ch=false;for(const f of S.feeds||[])if(!f.lk&&pend[f.id]&&!f.until){f.until=pend[f.id];f.vis=1;ch=true}
  const gone=(S.feeds||[]).filter(f=>!f.lk&&f.until&&f.until<=Date.now());
  if(gone.length){S.feeds=S.feeds.filter(f=>!gone.includes(f));if(S.lgSelf&&/until=/.test(S.lgSelf.h||"")){const u=+((S.lgSelf.h.match(/until=(\d+)/)||[])[1]||0);if(u&&u<=Date.now())delete S.lgSelf}
    ch=true;toast("Your visitor access ended. Thanks for visiting.");if(view==="feed"){view="board";setTimeout(()=>{try{render()}catch(e){}},0)}}
  if(ch)save()}
/* a Feed banner so the visitor knows when it ends */
{const _rf=renderFeed;renderFeed=function(){_rf.apply(this,arguments);try{const f=fdCur();if(f&&!f.lk&&f.until&&!$("#vlBan")){const m=$("#main");if(m)m.insertAdjacentHTML("afterbegin",`<div class="banner" id="vlBan" style="border-color:var(--brass)"><span>🪪 Visitor access until <b>${esc(until(f.until))}</b></span></div>`)}}catch(e){}}}

/* ---------- Visitors screen panel ---------- */
function panelHTML(){if(typeof isOwner!=="function"||!isOwner())return "";const L=vis();const f=teamFeed();
  let h=`<div class="panel" id="vlBox" style="border-color:var(--brass)"><div style="display:flex;justify-content:space-between;align-items:center"><b>🪪 Visitor logins</b>${vf.open?"":`<button class="btn" id="vlOpen" style="width:auto;padding:8px 14px;margin:0">+ Visitor login</button>`}</div>
    <p class="note" style="margin:4px 0 0">A login that opens your Feed only and cuts off at the time you set. No roster, no numbers.</p>`;
  if(!f)h+=`<p class="note" style="color:var(--warn)">Start your team Feed first (Feed tab): visitors sign in to it.</p>`;
  if(vf.open)h+=`<label for="vlName">Visitor's name</label><input type="text" id="vlName" maxlength="60" placeholder="Jordan Lee" autocomplete="off">
    <label for="vlTo">Their phone or email (to send the login)</label><input type="text" id="vlTo" maxlength="80" inputmode="email" autocapitalize="none" placeholder="(808) 555-0123 or name@example.com">
    <div class="note" style="margin:10px 0 4px">Cuts off after</div><div class="evts">${DUR.map(([v,l])=>`<button type="button" data-vlh="${v}" aria-pressed="${vf.h===v}">${l}</button>`).join("")}<button type="button" data-vlh="0" aria-pressed="${!vf.h}">Pick a time</button></div>
    ${vf.h?`<p class="note" style="margin:6px 0 0">Ends <b>${esc(until(Date.now()+vf.h*3600000))}</b></p>`:`<label for="vlEnd">Ends at</label><input type="datetime-local" id="vlEnd" value="${esc(vf.end)}">`}
    <label class="tog" style="margin-top:8px"><input type="checkbox" id="vlLog" checked> Sign them in to the visitor log (counts in an emergency check-in)</label>
    ${vf.msg?`<p class="note" style="color:var(${vf.busy?"--ink":"--warn"})">${esc(vf.msg)}</p>`:""}
    <div class="row2"><button type="button" class="btn" id="vlMake"${vf.busy?" disabled":""}>${vf.busy?"Making…":"Make login & send"}</button><button type="button" class="btn alt" id="vlX">Cancel</button></div>`;
  if(L.length)h+=`<div class="alist" style="margin-top:8px">${L.map(x=>{const left=x.until-Date.now();return `<div class="cm-row" style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--line)"><div style="flex:1;min-width:0"><b>${esc(x.who||x.label)}</b><div class="note" style="margin:0">${esc(x.user)} · until ${esc(until(x.until))} · ${left>3600000?Math.round(left/3600000)+" h left":Math.max(1,Math.round(left/60000))+" min left"}${x.srv?"":" · server cutoff off (part 33)"}</div></div><button type="button" class="chip" data-vlcopy="${esc(x.uid)}" style="cursor:pointer">Copy</button><button type="button" class="chip" data-vlend="${esc(x.uid)}" style="cursor:pointer;color:var(--warn)">${vf.armed===x.uid?"Tap again":"End now"}</button></div>`}).join("")}</div>`;
  return h+`</div>`}
function place(){if(view!=="visitors")return;const m=$("#main");if(!m)return;const old=$("#vlBox");const h=panelHTML();if(!h){if(old)old.remove();return}
  if(old){old.outerHTML=h;return}const first=m.querySelector(".panel,.sech,h2");if(first)first.insertAdjacentHTML("beforebegin",h);else m.insertAdjacentHTML("afterbegin",h)}
function draw(){const y=window.scrollY;if(view==="visitors"){const keep=vf.open&&$("#vlName")?{n:$("#vlName").value,t:($("#vlTo")||{}).value||"",e:($("#vlEnd")||{}).value||""}:null;place();if(keep){const a=$("#vlName"),b=$("#vlTo"),c=$("#vlEnd");if(a)a.value=keep.n;if(b)b.value=keep.t;if(c&&keep.e)c.value=keep.e}}window.scrollTo(0,y)}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{place()}catch(e){}return r}}
/* the Visitors screen redraws itself on taps: put the panel back */
new MutationObserver(()=>{if(view==="visitors"&&!$("#vlBox")&&$("#main")&&$("#main").childElementCount)try{place()}catch(e){}}).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener("click",e=>{const t=e.target;if(!t.closest||!t.closest("#vlBox"))return;let b;
  if(t.closest("#vlOpen")){vf.open=true;vf.msg="";draw();const i=$("#vlName");if(i)i.focus();return}
  if(t.closest("#vlX")){vf={open:false,h:vf.h,end:"",msg:"",busy:false,armed:""};draw();return}
  if((b=t.closest("[data-vlh]"))){vf.h=+b.dataset.vlh;draw();return}
  if(t.closest("#vlMake")){make();return}
  if((b=t.closest("[data-vlcopy]"))){const L=vis().find(x=>x.uid===b.dataset.vlcopy);if(L)try{navigator.clipboard.writeText(text(L)).then(()=>toast("Copied"),()=>toast("Copy blocked here"))}catch(e2){}return}
  if((b=t.closest("[data-vlend]"))){const id=b.dataset.vlend;if(vf.armed!==id){vf.armed=id;draw();setTimeout(()=>{if(vf.armed===id){vf.armed="";draw()}},4000);return}vf.armed="";const L=vis().find(x=>x.uid===id);
    if(L)end(L,"now").then(()=>{draw();toast("Visitor login ended")}).catch(()=>toast("Couldn't reach the server. Try again."));return}},true);
document.addEventListener("change",e=>{if(e.target.id==="vlEnd")vf.end=e.target.value});

if(typeof SC!=="undefined"&&Array.isArray(SC))SC.push({k:"vl",n:"Visitor logins cut off on the server too",f:["33_visitor_logins"],t:[["login_expire",{p_uid:"zz",p_owner:"x",p_until:new Date(0).toISOString()}]]});
const tick=()=>{try{sweepVisitor()}catch(e){}try{sweepLeader()}catch(e){}};
setTimeout(tick,1500);if(typeof every==="function")every(60000,tick,"visitor-logins");document.addEventListener("visibilitychange",()=>{if(!document.hidden)tick()});
window.vlTick=tick;window.__vl=()=>vf;
})();
