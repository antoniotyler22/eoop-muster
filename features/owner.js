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
async function tryOwner(user,pass){const o=await call({op:"login",user:String(user).trim().toLowerCase(),pass});setTok({tok:o.tok,exp:o.exp});return true}
{const _si=lgSignIn;lgSignIn=async function(from){const R=lgScope(from),q=s=>R.querySelector(s);const U=q("#lgSU"),P=q("#lgSP"),o=q("#lgSOut");const u=U&&U.value.trim(),p=P&&P.value;
  const r=await _si.apply(this,arguments);
  try{if(u&&p&&o&&/wrong/.test(o.textContent)){o.textContent="Checking…";if(await tryOwner(u,p).catch(()=>false)){P.value="";o.textContent="";closeSheet();open();toast("Signed in as the app owner")}else o.textContent="Username or password is wrong. Check with whoever gave it to you."}}catch(e){}return r}}

/* ---- the console ---- */
let st=null,cfg=null,errs=null,comps=null,busy="",msg="",tab="use",newComp=null,rm=null;
function open(){view="owner";render();window.scrollTo(0,0);refresh()}
async function refresh(){if(!tok())return;busy="load";paint();try{[st,cfg]=await Promise.all([call({op:"stats"}),call({op:"cfg"}).then(o=>o.cfg)]);msg=""}catch(e){msg=String(e.message||e)}busy="";paint()}
const n=v=>v==null?"–":String(v);
const when=t=>{if(!t)return"";const d=new Date(t);return short(d)+" "+String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0")};
function html(){if(!tok())return `<h2>App owner</h2><div class="panel"><p class="note">Sign in with the owner username and password.</p><button class="btn" id="owSign">Sign in</button></div>`;
  const T=(k,l)=>`<button class="chip" data-owtab="${k}" aria-pressed="${tab===k}" style="cursor:pointer">${l}</button>`;
  let h=`<div class="sechead" style="margin-top:12px"><h2>App owner</h2><span class="note" style="margin:0">${busy?"Working…":""}</span></div>
    <div class="evts" style="margin:6px 0 10px">${T("use","Usage")}${T("ann","Announcement")}${T("mod","Remove")}${T("pro","Pro comps")}${T("err","Crashes")}</div>${msg?`<p class="note" style="color:var(--warn)">⚠ ${esc(msg)}</p>`:""}`;
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
  if(tab==="err"){h+=errs?`<div class="alist">${errs.map(e=>`<div class="rrow" style="--sc:var(--warn)"><div class="who"><b>${esc(e.kind)}</b> · ${esc(e.msg)}<div class="ph">v${esc(e.ver||"?")} · ${esc(e.plat||"")} · ${when(Date.parse(e.created_at))}</div></div></div>`).join("")||`<p class="note">No crash reports.</p>`}</div>`:`<div class="panel"><button class="btn alt" id="owErrs">Load the last 40 crash reports</button></div>`}
  return h}
function paint(){if(view!=="owner")return;const m=$("#main");if(m)m.innerHTML=html()}
{const _r=render;render=function(){if(view==="owner"){renderTabs();paint();if(typeof animateView==="function")animateView();return}return _r.apply(this,arguments)}}
{const _rt=renderTools;renderTools=function(){const r=_rt.apply(this,arguments);try{let g=[...document.querySelectorAll("#main .tgrid")].find(x=>x.id!=="sgGrid");if(!g){g=document.createElement("div");g.className="tgrid";$("#main").appendChild(g)}g.insertAdjacentHTML("beforeend",`<button data-go="owner"><span class="ic">🛡</span><span><b>App owner</b><small>${tok()?"Signed in":"Owner sign-in"}</small></span></button>`);if(typeof sgRegroup==="function")sgRegroup()}catch(e){}return r}}
async function act(fn){busy="work";paint();try{await fn();msg=""}catch(e){msg=String(e.message||e)}busy="";paint()}
document.addEventListener("click",e=>{const t=e.target;if(view!=="owner")return;const tb=t.closest("[data-owtab]");
  if(tb){tab=tb.dataset.owtab;busy="";rm=null;paint();if(tab==="pro"&&!comps)act(async()=>{comps=(await call({op:"comps"})).rows});return}
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
