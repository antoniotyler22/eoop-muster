/* Accounted For 4.13: the app owner.
   One username and password, set on the server, that work on the normal Sign in screen from any phone and open the
   Owner console (Tools → App owner): how the app is being used (counts only; team data is encrypted on phones), an
   announcement every phone shows on Home, switches for Ask and the news card, removing a team, Feed, page, login or
   company by id, comping Pro with a code, and crash reports. The sign-in lasts 12 hours on that phone.
   Every phone also reads the announcement and switches (app_cfg_get, setup part 29) once an hour. */
(()=>{
const LS="af-owner";
const tok=()=>{try{const o=JSON.parse(localStorage.getItem(LS)||"null");return o&&o.exp>Date.now()?o.tok:""}catch(e){return ""}};
const setTok=o=>{try{o?localStorage.setItem(LS,JSON.stringify(o)):localStorage.removeItem(LS)}catch(e){}};
window.ownerOn=()=>!!tok();
async function call(body){const r=await fetch(SB.url+"/functions/v1/owner",{method:"POST",headers:{apikey:SB.key,"Content-Type":"application/json"},body:JSON.stringify(Object.assign({tok:tok()},body))});
  let o={};try{o=await r.json()}catch(e){}if(r.status===404)throw new Error("The owner function isn't on the server yet.");if(r.status===401&&body.op!=="login"){setTok(null);throw new Error("Signed out. Sign in again.")}if(!r.ok)throw new Error(o.error||("HTTP "+r.status));return o}

/* ---- the owner's login works on the normal Sign in screen ---- */
async function tryOwner(user,pass,code){const o=await call(Object.assign({op:"login",user:String(user).trim().toLowerCase(),pass},code?{code}:{}));if(o.need==="code")return "code";setTok({tok:o.tok,exp:o.exp});return true}
let pend=null;
{const _si=lgSignIn;lgSignIn=async function(from){const R=lgScope(from),q=s=>R.querySelector(s);const U=q("#lgSU"),P=q("#lgSP"),o=q("#lgSOut");const u=U&&U.value.trim(),p=P&&P.value;const C=q("#lgCode");
  if(C&&pend){const code=C.value.trim();if(!code){o.textContent="Enter the 6-digit code from your authenticator app, or a recovery code.";return}o.textContent="Checking…";
    try{const r=await tryOwner(pend.u,pend.p,code);if(r===true){pend=null;closeSheet();open();toast("Signed in as the app owner")}else o.textContent="That code isn't right."}catch(e){o.textContent=String(e.message||e)}return}
  const r=await _si.apply(this,arguments);
  try{if(u&&p&&o&&/wrong/.test(o.textContent)){o.textContent="Checking…";let got=false;try{got=await tryOwner(u,p)}catch(e){got=false}
    if(got==="code"){pend={u,p};P.value="";o.textContent="";const box=P.closest(".panel")||R;box.insertAdjacentHTML("afterbegin",`<div class="panel" style="margin:0 0 8px;border-color:var(--brass)" data-noxl><b>2-step sign-in</b><p class="note">Enter the 6-digit code from your authenticator app, or one of your recovery codes.</p><input type="text" id="lgCode" inputmode="numeric" autocomplete="one-time-code" placeholder="123456" autocapitalize="none" autocorrect="off" spellcheck="false"></div>`);const i=q("#lgCode");if(i)i.focus();if(q("#lgGo"))q("#lgGo").textContent="Continue"}
    else if(got===true){P.value="";o.textContent="";closeSheet();open();toast("Signed in as the app owner")}
    else o.textContent="Username or password is wrong. Check with whoever gave it to you."}}catch(e){}return r}}
document.addEventListener("click",e=>{if(e.target.closest("[data-sclose],#lgGo"))return;if(pend&&!document.querySelector("#lgCode"))pend=null},true);

/* ---- the console ---- */
let st=null,cfg=null,errs=null,comps=null,busy="",msg="",tab="use",newComp=null,rm=null,hl=null,al=null,lg=null,totp=null,codes=null,ping=null;
function open(){view="owner";render();window.scrollTo(0,0);refresh()}
async function refresh(){if(!tok())return;busy="load";paint();try{[st,cfg,ping]=await Promise.all([call({op:"stats"}),call({op:"cfg"}).then(o=>o.cfg),call({op:"ping"})]);msg=""}catch(e){msg=String(e.message||e)}busy="";paint()}
const MB=b=>b==null?"–":(b/1048576).toFixed(b<10485760?2:0)+" MB";
const agoS=t=>{if(!t)return "never";const m=Math.round((Date.now()-Date.parse(t))/60000);return m<1?"just now":m<60?m+" min ago":m<1440?Math.round(m/60)+" h ago":Math.round(m/1440)+" d ago"};
const n=v=>v==null?"–":String(v);
const when=t=>{if(!t)return"";const d=new Date(t);return short(d)+" "+String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0")};
function html(){if(!tok())return `<h2>App owner</h2><div class="panel"><p class="note">Sign in with the owner username and password.</p><button class="btn" id="owSign">Sign in</button></div>`;
  const T=(k,l)=>`<button class="chip" data-owtab="${k}" aria-pressed="${tab===k}" style="cursor:pointer">${l}</button>`;
  let h=`<div class="sechead" style="margin-top:12px"><h2>App owner</h2><span class="note" style="margin:0">${busy?"Working…":""}</span></div>
    <div class="evts" style="margin:6px 0 10px">${T("use","Usage")}${T("health","Health")}${T("ann","Announcement")}${T("mod","Remove")}${T("pro","Pro comps")}${T("err","Crashes")}${T("sec","Security")}${T("log","Log")}</div>${msg?`<p class="note" style="color:var(--warn)">⚠ ${esc(msg)}</p>`:""}`;
  if(tab==="use"){const s=st||{};const C=(k,l,sub)=>`<div class="cdt"><div class="k">${l}</div><div class="v">${n(s[k])}</div>${sub?`<div class="note" style="margin:0">${sub}</div>`:""}</div>`;
    h+=`<div class="tgrid">${C("feeds","TEAMS (FEEDS)")}${C("boards","LIVE BOARDS")}${C("recOpen","OPEN RECALLS",n(s.recalls)+" ever")}${C("checkins7","CHECK-INS · 7 D")}${C("posts7","FEED POSTS · 7 D")}${C("logins","LOGINS")}${C("pages","PAGES")}${C("dms","MESSAGE THREADS")}${C("companies","COMPANIES")}${C("backups","BACKED-UP BOARDS")}${C("hubs","SERVER HUBS")}${C("pro","PRO SUBSCRIPTIONS",n(s.comps)+" comped")}${C("errs7","CRASHES · 7 D")}${C("ai","ASK CALLS TODAY")}</div>
      <p class="note">Counts only. Rosters, posts and messages are encrypted on phones; the server (and this console) can't read them.${s.at?" · "+when(s.at):""}</p><div class="row2"><button class="btn alt" id="owRefresh">Refresh</button><button class="btn alt" id="owOut">Sign out</button></div>`}
  if(tab==="ann"){const c=cfg||{};h+=`<div class="panel"><label for="owAnn">Announcement on every phone's Home</label><textarea id="owAnn" maxlength="300" rows="3" placeholder="e.g. Maintenance tonight 2200–2300. Alerts may be late.">${esc(c.announce||"")}</textarea>
      <label for="owUrl">Link (optional)</label><input type="url" id="owUrl" placeholder="https://" value="${esc(c.announce_url||"")}">
      <div class="row2"><button class="btn" id="owAnnPost">${c.announce?"Update":"Post"}</button><button class="btn alt" id="owAnnClear"${c.announce?"":" disabled"}>Take it down</button></div>${c.announce_at?`<p class="note">Showing since ${when(c.announce_at)}.</p>`:`<p class="note">Nothing showing.</p>`}
      <label class="tog"><input type="checkbox" id="owAsk"${c.ask_off?" checked":""}> Turn Ask (AI) off for everyone</label>
      <label class="tog"><input type="checkbox" id="owNews"${c.news_off?" checked":""}> Hide the news card for everyone</label><p class="note">Phones pick these up within an hour, or on their next open.</p></div>`}
  if(tab==="mod"){h+=`<div class="panel"><p class="note">Removing a team's Feed, board, page, login or company deletes it on the server for good; phones that had it lose the connection. Ids come from the person reporting a problem (their link or share sheet), or from a report emailed to you.</p>
      <label for="owKind">What</label><select id="owKind" class="wsel">${[["feed","Team Feed"],["board","Live board"],["recall","Recall"],["page","Page"],["company","Company"],["login","Login (uid)"],["backup","Backup (access code board)"],["dm","Message thread"]].map(([k,l])=>`<option value="${k}"${rm&&rm.kind===k?" selected":""}>${l}</option>`).join("")}</select>
      <label for="owId">Id</label><input type="text" id="owId" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="paste the id" value="${esc(rm?rm.id:"")}">
      <button class="btn warn" id="owRemove">${busy==="armrm"?"Tap again to remove it":"Remove"}</button></div>`}
  if(tab==="pro"){h+=`<div class="panel"><p class="note">Give a team Pro without a purchase. They paste the code at Tools → Pro → “Have a Pro code?”.</p>
      <div class="row2"><input type="number" id="owDays" min="1" max="3650" value="365" aria-label="Days"><input type="text" id="owNote" maxlength="60" placeholder="Who it's for (optional)"></div><button class="btn" id="owComp">Make a Pro code</button>
      ${newComp?`<div class="panel" style="margin:10px 0 0;border-color:var(--brass)" data-noxl><b>Pro code (shown once)</b><div style="font-family:ui-monospace,Menlo,monospace;font-size:13px;word-break:break-all;margin:6px 0">${esc(newComp.code)}</div><button class="btn alt" id="owCopy">Copy</button><p class="note">Good until ${when(Date.parse(newComp.exp))}.</p></div>`:""}
      ${comps?`<div class="sech"><h2>Comps · ${comps.length}</h2></div><div class="alist">${comps.map(c=>`<div class="rrow" style="--sc:var(${c.revoked?"--line":"--s-onhand"})"><div class="rtop"><div class="who"><b>${esc((c.product||"").replace(/^pro\.comp:?/,"")||"Comp")}</b><div class="ph">${c.revoked?"Ended":"Until "+when(Date.parse(c.expires_at))} · made ${when(Date.parse(c.created_at))}</div></div>${c.revoked?"":`<button class="chip" data-owend="${esc(c.id)}" style="cursor:pointer">End</button>`}</div></div>`).join("")||`<p class="note">None yet.</p>`}</div>`:`<button class="btn alt" id="owComps" style="margin-top:8px">Show comps</button>`}</div>`}
  if(tab==="health"){const H=hl;if(!H)h+=`<div class="panel"><p class="note">${busy?"Loading…":"Not loaded."}</p>${busy?"":`<button class="btn alt" id="owHealth">Load</button>`}</div>`;
    else{const warn=(x)=>`style="--sc:var(${x?"--warn":"--s-onhand"})"`;const cr=H.crash||{},ca=H.calls||{},q=H.queue,hb=H.hubs,db=H.db||{},ask=H.ask;const dbMax=500*1048576;
      const cronBad=(H.cron||[]).filter(j=>j.active===false||(j.status&&j.status!=="succeeded")||!j.last||Date.now()-Date.parse(j.last)>3*3600000);
      const A=al;h+=`<div class="alist">
        <div class="rrow" ${warn(!A||A.state!=="ok"||!A.owner)}><div class="who"><b>${!A?"–":A.state==="ok"?"✅":"❌"} Alerts going out</b><div class="ph">${!A?"Checking…":A.state==="ok"?"Nothing is waiting without an alert.":esc(A.state)} · ${A&&A.owner?"your phone gets a buzz if they stop":"your phone is NOT set to be warned: turn on owner alerts in Security"}${A?` · ${n(A.phones)} phones have alerts on`:""}</div></div>
        <div class="rrow" ${warn(cronBad.length)}><div class="who"><b>${cronBad.length?"❌":"✅"} Scheduled jobs · ${(H.cron||[]).length}</b><div class="ph">${(H.cron||[]).map(j=>`${esc(j.name.replace(/^accounted-for-/,""))}: ${j.active===false?"paused":esc(j.status||"no run yet")}${j.last?" "+agoS(j.last):""}`).join(" · ")||"none"}</div>${cronBad.length?`<div class="ph">${cronBad.map(j=>esc(j.name.replace(/^accounted-for-/,""))+(j.msg?": "+esc(j.msg):"")).join(" · ")}</div>`:""}</div></div>
        <div class="rrow" ${warn(ca.bad1h>0||(ca.n&&ca.bad>ca.n/4))}><div class="who"><b>${ca.bad1h>0?"❌":"✅"} Server calls (push, hub, queue) · 24 h</b><div class="ph">${n(ca.n)} calls, ${n(ca.bad)} failed · last hour: ${n(ca.n1h)} calls, ${n(ca.bad1h)} failed · last ${agoS(ca.last)}</div>${(H.fails||[]).length?`<div class="ph">${H.fails.slice(0,4).map(f=>esc((f.code||"")+" "+f.msg)).join(" · ")}</div>`:""}</div></div>
        <div class="rrow" ${warn(q&&(q.ready>20||(q.oldest&&Date.now()-Date.parse(q.oldest)>3600000)))}><div class="who"><b>${q?(q.ready>20?"❌":"✅"):"–"} Alert queue</b><div class="ph">${q?`${q.n} waiting, ${q.ready} ready now, ${q.retried} on retry · oldest ${agoS(q.oldest)}`:"Not set up (part 27)"}</div></div></div>
        <div class="rrow" ${warn(hb&&hb.err>0)}><div class="who"><b>${hb?(hb.err?"❌":"✅"):"–"} Server hubs</b><div class="ph">${hb?`${hb.n} boards, ${hb.err} with errors · last run ${agoS(hb.last)} · last save ${agoS(hb.saved)}`:"Not set up (part 18)"}</div>${hb&&(hb.errs||[]).length?`<div class="ph">${hb.errs.map(esc).join(" · ")}</div>`:""}</div></div>
        <div class="rrow" ${warn(cr.h1>=8)}><div class="who"><b>${cr.h1>=8?"❌":"✅"} Crashes</b><div class="ph">${n(cr.h1)} last hour · ${n(cr.h24)} last 24 h · ${n(cr.d7)} last 7 days</div><div class="ph">By version: ${Object.entries(cr.vers||{}).map(([k,v])=>esc(k)+" "+v).join(", ")||"–"} · by platform: ${Object.entries(cr.plats||{}).map(([k,v])=>esc(k)+" "+v).join(", ")||"–"}</div></div></div>
        <div class="rrow" ${warn(db.bytes>dbMax*0.8)}><div class="who"><b>${db.bytes>dbMax*0.8?"❌":"✅"} Database · ${MB(db.bytes)} of 500 MB (free plan)</b><div class="hbar" style="margin:6px 0"><i style="width:${Math.min(100,Math.round((db.bytes||0)/dbMax*100))}%"></i></div><div class="ph">${(db.tables||[]).slice(0,6).map(t=>esc(t.t)+" "+MB(t.b)).join(" · ")}</div><div class="ph">Bandwidth and function calls aren't readable from here: Supabase → Settings → Usage.</div></div></div>
        <div class="rrow" style="--sc:var(--line)"><div class="who"><b>Ask (AI)</b><div class="ph">${ask?`${ask.today} calls today · ${ask.d7} in 7 days`:"Not set up"}</div></div></div></div>
        <p class="note">As of ${when(Date.parse(H.at))}.</p><button class="btn alt" id="owHealth">Refresh</button>`}}
  if(tab==="sec"){const on=!!(ping&&ping.totp);const p30=!!(ping&&ping.p30);
    h+=`${p30?"":`<p class="note" style="color:var(--warn)">⚠ Run setup part 30 for password change, 2-step and alerts.</p>`}
      <div class="panel"><b>🔔 Alerts on this phone</b><p class="note">A push when anyone signs in as the owner, and when crashes spike. ${S.ownerSubAt?"On since "+when(S.ownerSubAt)+".":"Off."}</p><button class="btn${S.ownerSubAt?" alt":""}" id="owSub">${S.ownerSubAt?"Move alerts to this phone":"Turn on"}</button>${S.ownerSubAt?`<button class="btn alt" id="owSubOff">Turn off</button>`:""}</div>
      <div class="panel"><b>🔐 2-step sign-in ${on?"· on":"· off"}</b>${on?`<p class="note">Signing in needs a code from your authenticator app, or a recovery code.</p><label for="owOffCode">Code</label><input type="text" id="owOffCode" inputmode="numeric" placeholder="123456"><button class="btn alt" id="owTotpOff">Turn 2-step off</button>`
        :totp?`<p class="note">Scan this in Google Authenticator, Authy, 1Password or the iPhone Passwords app, then enter the code it shows.</p><div id="owQr" style="width:min(220px,60vw);margin:8px auto"></div><div class="note" style="text-align:center;font-family:ui-monospace,Menlo,monospace;word-break:break-all">${esc(totp.secret)}</div><label for="owOnCode">Code from the app</label><input type="text" id="owOnCode" inputmode="numeric" placeholder="123456"><button class="btn" id="owTotpOn">Turn 2-step on</button>`
        :`<p class="note">The one account that can remove any team deserves more than a password. Turn this on and sign-in also needs a code from an authenticator app.</p><button class="btn" id="owTotpStart"${p30?"":" disabled"}>Set up 2-step</button>`}
        ${codes?`<div class="panel" style="margin:10px 0 0;border-color:var(--brass)" data-noxl><b>Recovery codes (shown once)</b><p class="note">Each works once if you lose your authenticator. Keep them somewhere safe.</p><div style="font-family:ui-monospace,Menlo,monospace;font-size:14px;line-height:1.8;columns:2">${codes.map(esc).join("<br>")}</div><button class="btn alt" id="owCodesCopy">Copy</button></div>`:""}</div>
      <div class="panel"><b>🔑 Change the password</b><label for="owCur">Current password</label><input type="password" id="owCur" autocomplete="current-password"><label for="owNew">New password (12+ characters)</label><input type="password" id="owNew" autocomplete="new-password"><label for="owNew2">New password again</label><input type="password" id="owNew2" autocomplete="new-password"><button class="btn" id="owPass"${p30?"":" disabled"}>Change password</button><p class="note">Every other phone signed in as the owner is signed out.</p></div>
      <div class="panel"><b>Sign out everywhere</b><p class="note">Ends every owner sign-in, including this one. Use it if a phone is lost.</p><button class="btn warn" id="owAllOut"${p30?"":" disabled"}>${busy==="armout"?"Tap again to sign out everywhere":"Sign out everywhere"}</button></div>`}
  if(tab==="log"){h+=lg?`<div class="alist">${lg.map(e=>`<div class="rrow" style="--sc:var(${e.ok?"--line":"--warn"})"><div class="who"><b>${esc(e.op)}</b>${e.ok?"":" · failed"}${e.detail?" · "+esc(e.detail):""}<div class="ph">${esc(e.ip)} · ${when(Date.parse(e.t))}</div></div></div>`).join("")||`<p class="note">Nothing yet.</p>`}</div><p class="note">Everything done as the owner, with the address it came from. Keep an eye on sign-ins you don't recognize.</p>`:`<div class="panel"><button class="btn alt" id="owLog">Load the owner log</button></div>`}
  if(tab==="err"){h+=errs?`<div class="alist">${errs.map(e=>`<div class="rrow" style="--sc:var(--warn)"><div class="who"><b>${esc(e.kind)}</b> · ${esc(e.msg)}<div class="ph">v${esc(e.ver||"?")} · ${esc(e.plat||"")} · ${when(Date.parse(e.created_at))}</div></div></div>`).join("")||`<p class="note">No crash reports.</p>`}</div>`:`<div class="panel"><button class="btn alt" id="owErrs">Load the last 40 crash reports</button></div>`}
  return h}
function paint(){if(view!=="owner")return;const m=$("#main");if(m)m.innerHTML=html()}
{const _r=render;render=function(){if(view==="owner"){renderTabs();paint();if(typeof animateView==="function")animateView();return}return _r.apply(this,arguments)}}
{const _rt=renderTools;renderTools=function(){const r=_rt.apply(this,arguments);try{let g=[...document.querySelectorAll("#main .tgrid")].find(x=>x.id!=="sgGrid");if(!g){g=document.createElement("div");g.className="tgrid";$("#main").appendChild(g)}g.insertAdjacentHTML("beforeend",`<button data-go="owner"><span class="ic">🛡</span><span><b>App owner</b><small>${tok()?"Signed in":"Owner sign-in"}</small></span></button>`);if(typeof sgRegroup==="function")sgRegroup()}catch(e){}return r}}
async function drawQr(){const box=$("#owQr");if(!box||!totp)return;try{await loadLib("lib/qrcode.js","qrcode");const q=qrcode(0,"M");q.addData(totp.uri);q.make();box.innerHTML=q.createSvgTag({cellSize:4,margin:2,scalable:true});const sv=box.querySelector("svg");if(sv){sv.style.width="100%";sv.style.height="auto"}}catch(e){box.textContent="Enter the code below by hand."}}
async function act(fn){busy="work";paint();try{await fn();msg=""}catch(e){msg=String(e.message||e)}busy="";paint()}
document.addEventListener("click",e=>{const t=e.target;if(view!=="owner")return;const tb=t.closest("[data-owtab]");
  if(tb){tab=tb.dataset.owtab;busy="";rm=null;paint();if(tab==="pro"&&!comps)act(async()=>{comps=(await call({op:"comps"})).rows});if(tab==="health"&&!hl)act(async()=>{hl=(await call({op:"health"})).h;al=await call({op:"alerts"})});if(tab==="log"&&!lg)act(async()=>{lg=(await call({op:"log"})).rows});if(tab==="sec"&&totp)setTimeout(drawQr,30);return}
  if(t.closest("#owHealth")){act(async()=>{hl=(await call({op:"health"})).h;al=await call({op:"alerts"})});return}
  if(t.closest("#owLog")){act(async()=>{lg=(await call({op:"log"})).rows});return}
  if(t.closest("#owSub")){act(async()=>{const s=await pushSub(true);if(!s){throw new Error("Alerts aren't available on this phone yet. Allow notifications first.")}const j=s.toJSON?s.toJSON():s;const r=await call({op:"setsub",sub:j});S.ownerSubAt=Date.now();rawSave();toast(r.test==="ok"?"On. A test alert was sent.":"On. Test alert: "+String(r.test))});return}
  if(t.closest("#owSubOff")){act(async()=>{await call({op:"setsub",sub:null});delete S.ownerSubAt;rawSave();toast("Alerts off")});return}
  if(t.closest("#owTotpStart")){act(async()=>{totp=await call({op:"totp_start"});setTimeout(drawQr,30)});return}
  if(t.closest("#owTotpOn")){const code=($("#owOnCode").value||"").trim();act(async()=>{const r=await call({op:"totp_on",code});codes=r.codes;totp=null;ping=await call({op:"ping"});toast("2-step is on")});return}
  if(t.closest("#owTotpOff")){const code=($("#owOffCode").value||"").trim();act(async()=>{await call({op:"totp_off",code});codes=null;ping=await call({op:"ping"});toast("2-step is off")});return}
  if(t.closest("#owCodesCopy")){try{navigator.clipboard.writeText(codes.join("\n")).then(()=>toast("Copied"))}catch(x){toast("Copy blocked")}return}
  if(t.closest("#owPass")){const cur=$("#owCur").value,nx=$("#owNew").value,n2=$("#owNew2").value;if(nx!==n2){toast("The new passwords don't match.");return}if(nx.length<12){toast("12 characters or more.");return}
    act(async()=>{const r=await call({op:"setpass",cur,next:nx});setTok({tok:r.tok,exp:r.exp});toast("Password changed. Other phones are signed out.")});return}
  if(t.closest("#owAllOut")){if(busy!=="armout"){busy="armout";paint();return}act(async()=>{await call({op:"signoutall"})});setTok(null);view="tools";render();toast("Signed out everywhere");return}
  if(t.closest("#owSign")){lgSignSheet();return}
  if(t.closest("#owRefresh")){refresh();return}
  if(t.closest("#owOut")){setTok(null);view="tools";render();toast("Signed out");return}
  if(t.closest("#owAnnPost")){const announce=($("#owAnn").value||"").trim(),announce_url=($("#owUrl").value||"").trim();act(async()=>{cfg=(await call({op:"setcfg",announce,announce_url})).cfg;toast("Announcement posted")});return}
  if(t.closest("#owAnnClear")){act(async()=>{cfg=(await call({op:"setcfg",announce:"",announce_url:""})).cfg;toast("Taken down")});return}
  if(t.closest("#owRemove")){const kind=$("#owKind").value,id=($("#owId").value||"").trim();if(!id){toast("Paste the id first.");return}if(busy!=="armrm"){busy="armrm";rm={kind,id};paint();return}act(async()=>{const r=await call({op:"remove",kind,id});rm=null;toast(r.removed?"Removed":"Nothing with that id")});return}
  if(t.closest("#owComp")){const days=+$("#owDays").value||365,note=$("#owNote").value||"";act(async()=>{newComp=await call({op:"comp",days,note});comps=(await call({op:"comps"})).rows});return}
  if(t.closest("#owCopy")){try{navigator.clipboard.writeText(newComp.code).then(()=>toast("Copied"))}catch(x){toast("Copy blocked")}return}
  if(t.closest("#owComps")){act(async()=>{comps=(await call({op:"comps"})).rows});return}
  const en=t.closest("[data-owend]");if(en){act(async()=>{await call({op:"endcomp",id:en.dataset.owend});comps=(await call({op:"comps"})).rows});return}
  if(t.closest("#owErrs")){act(async()=>{errs=(await call({op:"errors"})).rows});return}},true);
document.addEventListener("change",e=>{if(view!=="owner")return;if(e.target.id==="owAsk"||e.target.id==="owNews"){const b={op:"setcfg"};b[e.target.id==="owAsk"?"ask_off":"news_off"]=e.target.checked;act(async()=>{cfg=(await call(b)).cfg})}});
document.addEventListener("click",e=>{const g=e.target.closest("[data-go=owner]");if(!g)return;e.stopImmediatePropagation();open()},true);
if(typeof HELP==="object")HELP.owner=["App owner","The owner's console: usage counts, an announcement for every phone, switches, removals, Pro comps and crash reports.",["Sign in with the owner username and password on any phone; it lasts 12 hours.","Team data is encrypted on phones, so the console only ever sees counts and ids."]];

/* ---- every phone: the announcement and switches ---- */
const A=()=>(S.appCfg=S.appCfg&&typeof S.appCfg==="object"?S.appCfg:{});
async function pull(force){const X=A();if(!force&&X.at&&Date.now()-X.at<3600000)return;try{const r=await SB.rpc("app_cfg_get",{});const c=Array.isArray(r)?r[0]:r;if(!c)return;
  const was=X.announce_at||"";Object.assign(X,{announce:String(c.announce||"").slice(0,300),announce_url:/^https?:\/\//.test(c.announce_url||"")?String(c.announce_url).slice(0,300):"",announce_at:c.announce_at||"",ask_off:!!c.ask_off,news_off:!!c.news_off,at:Date.now()});
  if(X.announce_at!==was)delete X.seen;rawSave();if(view==="board"||view==="today"||view==="feed"){const y=window.scrollY;render();window.scrollTo(0,y)}}catch(e){X.at=Date.now()}}
window.appCfgPull=pull;
function annHTML(){const X=A();if(!X.announce||X.seen===X.announce_at)return"";
  return `<div class="banner" id="annBan" style="border-color:var(--brass)"><span>📣 ${esc(X.announce)}${X.announce_url?` <a href="${esc(X.announce_url)}" target="_blank" rel="noopener">More</a>`:""}</span><button id="annOk">OK</button></div>`}
{const _b=banner;banner=function(){return annHTML()+_b.apply(this,arguments)}}
{const _rf=renderFeed;renderFeed=function(){const r=_rf.apply(this,arguments);try{const m=$("#main");if(m&&!$("#annBan")){const h=annHTML();if(h)m.insertAdjacentHTML("afterbegin",h)}}catch(e){}return r}}
{const _rt=renderToday;renderToday=function(){const r=_rt.apply(this,arguments);try{const m=$("#main");if(m&&!$("#annBan")){const h=annHTML();if(h)m.insertAdjacentHTML("afterbegin",h)}}catch(e){}return r}}
document.addEventListener("click",e=>{if(!e.target.closest("#annOk"))return;e.stopImmediatePropagation();A().seen=A().announce_at;rawSave();const b=$("#annBan");if(b)b.remove()},true);
/* the switches: akHidden (app.js) reads S.appCfg.ask_off; the news card reads appNewsOff() */
window.appNewsOff=()=>!!A().news_off;
every(3600000,()=>pull(false),"app-cfg");setTimeout(()=>pull(false),2500);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)pull(false)});
})();
