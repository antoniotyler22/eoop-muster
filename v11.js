/* Accounted For 1.1 — loaded by index.html right after app.js.
   1. Feed safety: report a post, hide a post, block a poster, Terms agreement, leader review queue.
   2. Delete my account (member logins and the person running the team), server copies included.
   3. One-tap emergency muster + missed check-in alerts.
   4. Offline outbox: Got its, problems, requests and reports wait for signal and send themselves.
   5. Dashboard: the whole team on one wide screen (desktop web / iPad). */
(()=>{
const V11="1.1.0";
const TERMS_VER=1;
const REP_WHY=["Offensive or harassing","Threat or safety concern","Personal or private info","Spam or scam","Sexual content","Other"];
const NETERR=/abort|Failed to fetch|NetworkError|Load failed|network|ERR_|timed? ?out/i;
S.rep=S.rep||[];S.outbox=S.outbox||[];
const sheetOpen=()=>{const sh=$("#sheet");sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add("open")))};
const redraw=fn=>{const y=window.scrollY;fn();window.scrollTo(0,y)};

/* ================= 1. Feed SAFETY ================= */
function termsSheet(after){sheetCtx={kind:"terms"};termsAfter=after||null;
  $("#sheetT").innerHTML=`Community rules<small>Before you join, sign in or post, agree to the Terms of Use.</small>`;
  $("#sheetOpts").innerHTML=`<div class="panel" style="margin:0" data-noxl><ul class="note" style="margin:0;padding-left:18px;line-height:1.5">
    <li><b>No objectionable or abusive content.</b> No harassment, threats, hate, sexual content, or other people's private information.</li>
    <li>Anyone can <b>report</b> a post or <b>block</b> a poster. Reports go to the person running the team, who removes the content and the poster's access within 24 hours.</li>
    <li>People who break these rules lose access.</li></ul>
    <a class="note" href="terms.html" target="_blank" rel="noopener" style="font-weight:700">Read the full Terms of Use</a>
    <button class="btn" id="tosYes">I agree</button><button class="btn alt" data-sclose="1">Not now</button></div>`;sheetOpen()}
let termsAfter=null;
const termsOK=()=>(S.tos||0)>=TERMS_VER;
const tosLine=()=>`<label class="tog" style="align-items:flex-start"><input type="checkbox" id="tosChk"${termsOK()?" checked":""}> <span>I agree to the <a href="terms.html" target="_blank" rel="noopener">Terms of Use</a>: no objectionable or abusive content.</span></label>`;

/* member side: hidden posts and blocked posters never show */
const blkKey=p=>String(p.by||"").toUpperCase().trim();
{const _fv=fdVisible;fdVisible=function(f){const L=_fv.apply(this,arguments);if(f.lk)return L;const hid=new Set(f.hid||[]),blk=new Set(f.blk||[]);return L.filter(p=>!hid.has(p.id)&&!(p.by&&blk.has(blkKey(p))))}}

let repOpen=null,menuOpen=null;
{const _card=fdCard;fdCard=function(f,p){let h=_card.apply(this,arguments);if(f.lk)return h;
  const sent=(f.repd||{})[p.id];const nm=p.by||f.unit;
  let bar=`<div class="fcmod" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:2px">`;
  if(menuOpen===f.id+":"+p.id)bar+=`<button class="chip" data-v11rep="${p.id}" style="cursor:pointer;color:var(--warn)">⚑ Report</button><button class="chip" data-v11hide="${p.id}" style="cursor:pointer">Hide post</button>${p.by?`<button class="chip" data-v11blk="${p.id}" style="cursor:pointer">Block ${esc(nm)}</button>`:""}<button class="chip" data-v11menu="" style="cursor:pointer">Close</button>`;
  else bar+=`<button class="chip" data-v11menu="${f.id}:${p.id}" style="cursor:pointer" aria-label="Report, hide or block">⋯</button>${sent?`<span class="note" style="margin:0">⚑ Reported</span>`:""}`;
  bar+=`</div>`;
  if(repOpen===f.id+":"+p.id)bar+=`<div class="panel" style="margin-top:6px;border-color:var(--warn)"><b>Report this post</b>
    <label for="v11Why">What's wrong?</label><select id="v11Why" class="wsel">${REP_WHY.map(w=>`<option>${w}</option>`).join("")}</select>
    <label for="v11Note">Details (optional)</label><input type="text" id="v11Note" maxlength="140" placeholder="What should your leader know?">
    <label class="tog"><input type="checkbox" id="v11AlsoBlk"${p.by?"":" disabled"}> Also block ${esc(nm)}</label>
    <div class="row2"><button class="btn warn" data-v11send="${p.id}">Send report</button><button class="btn alt" data-v11rep="">Cancel</button></div>
    <p class="note">Goes to the person running the team, encrypted. The post is hidden on your phone right away. They review reports within 24 hours.</p></div>`;
  return h.replace(/<\/article>$/,bar+"</article>")}}

async function repSend(f,p,why,note,alsoBlk){const o={k:"rep",rid:"x"+Date.now().toString(36)+rndId(4),pid:p.id,why:String(why).slice(0,40),note:String(note||"").slice(0,140),me:f.me||"",by:p.by||"",sl:p.sl||"",snip:String(p.txt||"").slice(0,160)};
  const ct=await fdEnc(f.ek,o);await SB.rpc("feed_req",{p_feed:f.id,p_member_key:f.mk,p_ct:ct},{alert:{alert:"rep",feed:f.id,mk:f.mk}});
  SB.notify(null,{alert:"rep",feed:f.id,mk:f.mk});
  f.repd=f.repd||{};f.repd[p.id]=Date.now();f.hid=[...new Set((f.hid||[]).concat(p.id))].slice(-300);
  if(alsoBlk&&p.by)f.blk=[...new Set((f.blk||[]).concat(blkKey(p)))].slice(0,100);save()}

/* leader side: reports arrive on the request channel (k:"rep") */
window.repIn=function(f,o,r){if(S.rep.some(x=>x.rid===o.rid))return;
  const x={rid:String(o.rid).slice(0,20),feed:f.id,pid:+o.pid||0,why:String(o.why||"Other").slice(0,40),note:String(o.note||"").slice(0,140),me:String(o.me||"").slice(0,30),by:String(o.by||"").slice(0,30),sl:String(o.sl||"").replace(/[^A-Z0-9]/g,"").slice(0,6),snip:String(o.snip||"").slice(0,160),t:Date.parse(r.created_at)||Date.now(),st:"open"};
  S.rep.unshift(x);S.rep=S.rep.slice(0,200);actAdd("⚑",(x.me||"Someone")+" reported a post ("+x.why+"): “"+x.snip.slice(0,60)+"”","feed");
  toast("⚑ A post was reported. Review it in Feed.");try{navigator.vibrate&&navigator.vibrate([200,80,200])}catch(e){}};
const repOpenList=()=>S.rep.filter(x=>x.st==="open"&&S.feeds.some(f=>f.lk&&f.id===x.feed));
function repHTML(f){const L=S.rep.filter(x=>x.feed===f.id);if(!L.length)return"";const open=L.filter(x=>x.st==="open");const done=L.filter(x=>x.st!=="open").slice(0,10);
  const old=open.filter(x=>Date.now()-x.t>20*3600000).length;
  const row=x=>{const live=(f.posts||[]).some(p=>p.id===x.pid);return `<div class="rrow" style="--sc:var(${x.st==="open"?"--warn":"--line"})"><div class="who"><b>⚑ ${esc(x.why)}</b> · reported by ${esc(x.me||"a member")} · ${ago(x.t)}
      <div class="ph">Post${x.by?" by "+esc(x.by):""}${x.sl?" ("+esc(x.sl)+" leader)":""}: “${esc(x.snip)}”${live?"":" · <b>already removed</b>"}</div>${x.note?`<div class="ph">Note: “${esc(x.note)}”</div>`:""}${x.st!=="open"?`<div class="ph"><b>${esc(x.st==="removed"?"Removed":x.st==="cut"?"Removed + poster cut off":"Kept")}</b> ${x.dt?ago(x.dt):""}</div>`:""}</div>
    ${x.st==="open"?`<div class="row2">${live?`<button class="btn warn" data-v11rm="${x.rid}">Remove post</button>`:""}${x.sl&&S.board?`<button class="btn warn" data-v11cut="${x.rid}">Remove + cut off ${esc(x.sl)} leader</button>`:""}<button class="btn alt" data-v11keep="${x.rid}">Keep it (no violation)</button></div>`:""}</div>`};
  return `<div class="panel" style="border-color:var(${open.length?"--warn":"--line"})"><b>⚑ Reported posts${open.length?` · <span style="color:var(--warn)">${open.length} to review</span>`:""}</b>
    ${old?`<p class="note" style="color:var(--warn);font-weight:700">${old} report${old>1?"s are":" is"} almost 24 hours old. Review now.</p>`:""}
    ${open.length?`<div class="alist">${open.map(row).join("")}</div>`:`<p class="note">Nothing to review.</p>`}
    ${done.length?`<details><summary class="note">Reviewed (${done.length})</summary><div class="alist">${done.map(row).join("")}</div></details>`:""}
    <p class="note">Your rules: remove objectionable posts and the poster's access within 24 hours. Members can also hide posts and block posters on their own phones.</p></div>`}
{const _rf=renderFeed;renderFeed=function(){_rf.apply(this,arguments);const f=fdCur();if(!f||fdNew)return;
  if(f.lk){const r=repHTML(f);if(r){const anchor=$("#main .sechead");anchor?anchor.insertAdjacentHTML("afterend",r):$("#main").insertAdjacentHTML("afterbegin",r)}}
  else{const n=(f.hid||[]).length,b=(f.blk||[]).length;if(n||b)$("#main").insertAdjacentHTML("beforeend",`<details class="panel"><summary class="note">Hidden on this phone: ${n} post${n===1?"":"s"}${b?" · "+b+" blocked":""}</summary>
      ${(f.blk||[]).map(k=>`<div class="rtop"><span>${esc(k)}</span><button class="chip" data-v11unblk="${esc(k)}" style="cursor:pointer">Unblock</button></div>`).join("")}${n?`<button class="btn alt" id="v11Unhide">Show hidden posts again</button>`:""}</details>`)}
  if(!termsOK()){const b=$("#fdSlPost")||$("#fdPost");if(b)b.insertAdjacentHTML("beforebegin",tosLine())}}}

/* leaders see open reports on the board + tools */
function repBanner(){const n=repOpenList().length;return n?`<div class="banner" style="border-color:var(--warn)"><span>⚑ <b>${n}</b> reported post${n>1?"s":""} to review (within 24 hours).</span><button data-go="feed">Review</button></div>`:""}

/* ================= 2. DELETE MY ACCOUNT ================= */
function delHTML(){const own=typeof isOwner==="function"&&isOwner();const L=S.lgSelf;
  const what=[];if(L)what.push("your sign-in ("+esc(L.l||"login")+") on the server");if(own){const nf=S.feeds.filter(f=>f.lk).length;if(nf)what.push(nf+" feed"+(nf>1?"s":"")+" you run, with every post");if((S.logins||[]).length)what.push((S.logins||[]).length+" login"+((S.logins||[]).length>1?"s":"")+" you gave out");if(S.board)what.push("live section links");if(S.sync&&S.sync.on)what.push("your encrypted server backup");if(S.roster.some(m=>m.pk))what.push("My pages you published")}
  const jf=S.feeds.filter(f=>!f.lk).length;if(jf)what.push("your membership in "+jf+" feed"+(jf>1?"s":""));what.push("everything stored on this phone");
  return `<h2>Delete my account</h2><div class="panel" style="border-color:var(--warn)"><p class="note">Permanently deletes ${what.join(", ")}. This can't be undone.${own&&S.feeds.some(f=>f.lk)?" Your members lose the feeds you run.":""}</p>
    ${S.pro&&window.MBN&&MBN.on?`<p class="note">Deleting your account doesn't cancel an App Store subscription. Cancel in Settings → your name → Subscriptions.</p>`:`<p class="note">If you subscribe to Pro, cancel it in Settings → your name → Subscriptions. Deleting your account doesn't cancel it.</p>`}
    <button class="btn warn" id="v11Del">${armed==="v11del"?"Tap again: delete my account and all data":"Delete my account"}</button><div class="note" id="v11DelOut" role="status"></div></div>`}
async function delAccount(){const o=$("#v11DelOut");const say=t=>{if(o)o.textContent=t};const errs=[];const tryit=async(lbl,fn)=>{try{say(lbl+"…");await fn()}catch(e){errs.push(/find the function|PGRST202|schema cache/i.test(String(e&&e.message))?lbl+" (server needs the 1.1 update: System check)":lbl)}};
  if(S.lgSelf)await tryit("Deleting your sign-in",()=>SB.rpc("login_self_delete",{p_uid:S.lgSelf.uid,p_vf:S.lgSelf.vf}));
  if(typeof isOwner==="function"&&isOwner()){
    for(const L of S.logins||[])await tryit("Removing logins",()=>SB.rpc("login_delete",{p_uid:L.uid,p_owner:S.lgOwner}));
    for(const f of S.feeds.filter(f=>f.lk))await tryit("Deleting feeds",()=>SB.rpc("delete_feed",{p_feed:f.id,p_leader_key:f.lk}));
    if(S.board)await tryit("Deleting live sections",()=>SB.rpc("delete_board",{p_board:S.board.id,p_read_key:S.board.rk}));
    for(const m of S.roster.filter(m=>m.pk))await tryit("Deleting My pages",()=>mpKeys(m.pk).then(K=>SB.rpc("delete_page",{p_id:K.id,p_wk:K.wk})));
    if(S.sync&&S.sync.on&&S.sync.code)await tryit("Deleting server backup",()=>codeKeys(S.sync.code).then(K=>SB.rpc("backup_delete",{p_id:K.id,p_key:K.wk})))}
  for(const f of S.feeds.filter(f=>!f.lk&&f.push))await tryit("Turning off alerts",async()=>{const sub=await pushSub(false);if(sub)await SB.rpc("feed_unsub",{p_feed:f.id,p_member_key:f.mk,p_endpoint:sub.endpoint||sub.toJSON().endpoint||""})});
  if(errs.length){say("Couldn't finish: "+[...new Set(errs)].join(", ")+". Get signal and tap again so nothing is left on the server, or email Antoniotyler22@gmail.com and we'll delete it.");armed=null;const b=$("#v11Del");if(b)b.textContent="Try again";return}
  say("Done. Erasing this phone…");setTimeout(()=>{const V=window.VAULT;V?V.eraseAll():(localStorage.clear(),location.reload())},600)}
{const _sh=secHTML;secHTML=function(){return _sh.apply(this,arguments)+delHTML()}}

/* remember who signed in (needed so they can delete their own login) */
{const _si=lgSignIn;lgSignIn=async function(){if(!termsOK()){const c=$("#tosChk");if(c&&!c.checked){const o=$("#lgSOut");if(o)o.textContent="Agree to the Terms of Use first.";return}S.tos=TERMS_VER;save()}
  return _si.apply(this,arguments)}}
{const _ss=lgSignSheet;lgSignSheet=function(){_ss.apply(this,arguments);if(!termsOK()){const g=$("#lgGo");if(g)g.insertAdjacentHTML("beforebegin",tosLine())}}}
{const _jp=fdJoinPrompt;fdJoinPrompt=function(){_jp.apply(this,arguments);if(!termsOK()){const y=$("#fjYes");if(y)y.insertAdjacentHTML("beforebegin",tosLine())}}}

/* ================= 3. EMERGENCY MUSTER + MISSED CHECK-IN ALERTS ================= */
S.emMin=S.emMin||15;
const leaderPhone=()=>!(typeof memberMode==="function"&&memberMode())&&S.role!=="view"&&!S.link;
function emStart(){if(S.rc.open&&!S.rc.em){armed=null;}
  S.rc.open=true;S.rc.start=Date.now();S.rc.rid=S.rc.start.toString(36)+rndId(4);S.rc.live=S.live===false?null:{key:rndId(32),ok:false,after:0,un:[]};
  liveIdx=null;S.rc.end=0;S.rc.res={};S.rc.ci={};S.rc.sent={};S.rc.only=false;S.rc.att=true;S.rc.em=true;S.rc.dl=Date.now()+S.emMin*60000;S.rc.dlFired=0;armed=null;save();
  actAdd("🚨","Started an EMERGENCY MUSTER. Check-in deadline "+S.emMin+" min.","recall");
  setTimeout(livePoll,50);
  const f=mainFeed();if(f&&f.lk)setTimeout(()=>{const txt="🚨 EMERGENCY MUSTER. Check in NOW: Good, Delayed or Need help.\n"+ciLink();
    fdEnc(f.ek,{t:txt,u:true,to:{k:"all"},sa:SECTIONS.map(x=>x[0]),by:fdBy(f)}).then(ct=>SB.rpc("feed_post",{p_feed:f.id,p_leader_key:f.lk,p_ct:ct})).then(id=>{SB.notify(null,{feed:f.id,lk:f.lk,urg:true});f.posts=[{id:+id,t:Date.now(),txt,urg:true,to:{k:"all"},by:fdBy(f)}].concat(f.posts||[]);f.ra=f.ra||{};f.ra[+id]=Math.min(S.emMin,15);save()}).catch(()=>toast("Couldn't post to Feed. Text the check-in link below."))},400);
  view="recall";render();window.scrollTo(0,0);toast("🚨 Emergency muster started")}
const emBtn=()=>leaderPhone()?(S.rc.open?`<button class="btn warn" data-go="recall" style="width:100%;margin-top:12px">${S.rc.em?"🚨 Emergency muster in progress":"Recall in progress"} · ${recallPool().filter(m=>(S.rc.res||{})[m.id]==="ok").length}/${recallPool().length}</button>`
  :`<button class="btn warn" id="v11Em" style="width:100%;margin-top:12px;font-size:17px">${armed==="v11em"?"Tap again to start · texts + Feed alert to everyone":"🚨 Emergency muster"}</button>`):"";
function missing(){const ci=S.rc.ci||{},res=S.rc.res||{};return sorted(recallPool().filter(m=>!ci[m.id]&&res[m.id]!=="ok"))}
function dlHTML(){if(!S.rc.open)return"";const m=missing();const left=S.rc.dl?Math.ceil((S.rc.dl-Date.now())/60000):null;
  let h=`<div class="panel" style="border-color:var(${S.rc.dl&&left<=0&&m.length?"--warn":"--line"})">${S.rc.em?`<b style="color:var(--warn)">🚨 EMERGENCY MUSTER</b>`:""}
    <label for="v11Dl">Alert me if anyone hasn't checked in after</label><select id="v11Dl" class="wsel">${[[0,"Off"],[5,"5 min"],[10,"10 min"],[15,"15 min"],[30,"30 min"],[60,"1 hour"],[120,"2 hours"]].map(([v,l])=>`<option value="${v}"${(S.rc.dl?Math.round((S.rc.dl-S.rc.start)/60000):0)===v?" selected":""}>${l}</option>`).join("")}</select>`;
  if(S.rc.dl){if(left>0)h+=`<p class="note">⏱ Deadline in <b>${left} min</b>. ${m.length} not checked in yet.</p>`;
    else if(m.length)h+=`<p class="note" style="color:var(--warn);font-weight:800">⏰ ${m.length} MISSED the check-in deadline</p><div class="note">${m.slice(0,40).map(x=>esc((x.sec==="ATT"?"ATT":x.sec)+" "+x.rank+" "+lastOf(x))).join(" · ")}${m.length>40?" …":""}</div>
      ${bcBatches(m.filter(x=>x.phone),unitName()+(S.rc.em?" EMERGENCY MUSTER":" RECALL")+": you haven't checked in. Check in now: "+ciLink()).map((b,i,arr)=>`<a class="btn warn" href="${esc(b.href)}">Text the missing${arr.length>1?" ("+(i+1)+")":""} (${b.n})</a>`).join("")}
      ${m.filter(x=>x.phone).slice(0,3).map(x=>`<a class="btn alt" href="${telHref(x.phone)}">Call ${esc(x.rank+" "+lastOf(x))}</a>`).join("")}`;
    else h+=`<p class="note" style="color:var(--s-onhand);font-weight:700">✓ Everyone accounted for.</p>`}
  return h+`</div>`}
{const _rr=renderRecall;renderRecall=function(){if(!S.rc.open&&leaderPhone()&&!proOK()){}_rr.apply(this,arguments);if(S.rc.open){const mb=$("#main .mbar");mb?mb.insertAdjacentHTML("afterend",dlHTML()):$("#main").insertAdjacentHTML("afterbegin",dlHTML())}
  else if(leaderPhone()){const p=$("#main .panel");if(p)p.insertAdjacentHTML("beforebegin",`<div class="panel" style="border-color:var(--warn)"><b>🚨 Emergency muster</b> <span class="chip">Free</span><p class="note">One tap starts a live check-in, posts an URGENT alert to your Feed with the check-in link, and alerts you about anyone who hasn't checked in after the deadline.</p>
      <label for="v11EmMin">Check-in deadline</label><select id="v11EmMin" class="wsel">${[5,10,15,30,60].map(v=>`<option value="${v}"${S.emMin===v?" selected":""}>${v} min</option>`).join("")}</select>${emBtn()}</div>`)}}}
function dlCheck(){if(!S.rc.open||!S.rc.dl||S.rc.dlFired||Date.now()<S.rc.dl)return;S.rc.dlFired=Date.now();const m=missing();save();if(!m.length)return;
  const t=m.length+" missed the check-in deadline";actAdd("⏰",t+(S.rc.em?" (emergency muster)":""),"recall");toast("⏰ "+t);try{navigator.vibrate&&navigator.vibrate([250,100,250,100,250])}catch(e){}
  try{if(window.MBN&&MBN.on&&MBN.Local)MBN.Local.now({title:"⏰ "+t,body:"Open the recall to text or call them.",open:"recall"});else if("Notification" in window&&Notification.permission==="granted")navigator.serviceWorker.ready.then(r=>r.showNotification("⏰ "+t,{body:"Open the recall to text or call them.",tag:"v11dl",data:{open:"recall"},icon:"./icon-192.png"})).catch(()=>{})}catch(e){}
  if(view==="recall")redraw(renderRecall)}
every(20000,dlCheck,"v11-deadline");
every(30000,()=>{if(view==="recall"&&S.rc.open&&S.rc.dl&&!document.activeElement.matches("input,textarea,select"))redraw(renderRecall)},"v11-recall-tick");

/* ================= 4. OFFLINE OUTBOX ================= */
const QUEUE=new Set(["feed_ack","feed_req"]);
{const _rpc=SB.rpc.bind(SB);SB._rpc=_rpc;
  SB.rpc=async function(fn,args,meta){try{return await _rpc(fn,args)}catch(e){
      if(QUEUE.has(fn)&&(navigator.onLine===false||NETERR.test(String(e&&e.message||e)))){S.outbox.push({fn,args,n:(meta&&meta.alert)||null,t:Date.now()});S.outbox=S.outbox.slice(-200);save();obPaint();toast("No signal. Saved; it sends by itself when you're back online.");return null}
      throw e}}}
let obBusy=false;
async function obFlush(){if(obBusy||!S.outbox.length||navigator.onLine===false)return;obBusy=true;let sent=0;
  try{while(S.outbox.length){const x=S.outbox[0];try{await SB._rpc(x.fn,x.args)}catch(e){if(NETERR.test(String(e&&e.message||e)))break;}S.outbox.shift();sent++;if(x.n)SB.notify(null,x.n);else if(x.fn==="feed_req")SB.notify(null,{alert:"req",feed:x.args.p_feed,mk:x.args.p_member_key})}}
  finally{obBusy=false;save();obPaint();if(sent)toast("✓ Sent "+sent+" saved item"+(sent>1?"s":""))}}
function obPaint(){let el=$("#v11Off");const off=navigator.onLine===false,n=S.outbox.length;
  if(!off&&!n){if(el)el.remove();return}
  if(!el){el=document.createElement("div");el.id="v11Off";el.setAttribute("role","status");el.style.cssText="position:fixed;left:50%;transform:translateX(-50%);bottom:calc(74px + env(safe-area-inset-bottom,0px));z-index:40;background:var(--ink);color:var(--bg);border-radius:999px;padding:7px 14px;font-size:13px;font-weight:700;box-shadow:0 6px 20px rgba(0,0,0,.25);max-width:92vw;text-align:center";document.body.appendChild(el)}
  el.textContent=(off?"Offline · the app still works":"Back online")+(n?" · "+n+" waiting to send":"")}
window.addEventListener("online",()=>{obPaint();obFlush()});window.addEventListener("offline",obPaint);
every(30000,obFlush,"v11-outbox");setTimeout(()=>{obPaint();obFlush()},1500);

/* ================= 5. DASHBOARD ================= */
function tile(lbl,big,sub,col,go){return `<button class="v11t" ${go?`data-go="${go}"`:"disabled"} style="--tc:var(${col||"--ink"})"><span class="l">${lbl}</span><span class="b">${big}</span><span class="s">${sub||""}</span></button>`}
function renderDash(){const {c,T}=counts();const pres=present(T);const al=alerts();const f=mainFeed();const posts=f?(f.posts||[]).slice(0,6):[];
  const pend=reqPending().length,rep=repOpenList().length;const rcP=recallPool();const rcGot=rcP.filter(m=>(S.rc.res||{})[m.id]==="ok").length;
  let h=banner()+repBanner()+`<div class="sechead" style="margin-top:12px"><h2>Dashboard</h2><span class="note" style="margin:0">${esc(unitName())} · as of ${dtg()}</span></div>`;
  h+=`<div class="v11grid k">${tile("Present",pres+"<small>/"+T.total+"</small>",pct(pres,T.total)+"% · "+T["On Hand"]+" on hand","--s-onhand","board")}
    ${tile(S.rc.em?"🚨 Emergency":"Recall",S.rc.open?rcGot+"<small>/"+rcP.length+"</small>":"—",S.rc.open?(missing().length+" not checked in"):"No recall running",S.rc.open?"--warn":"--muted","recall")}
    ${tile("Requests",pend,pend?"waiting for you":"none waiting",pend?"--brass":"--muted","feed")}
    ${tile("Reports",rep,rep?"review within 24 h":"nothing to review",rep?"--warn":"--muted","feed")}
    ${tile("Overdue",al.over.length,al.ret.length+" returning soon",al.over.length?"--warn":"--muted","alerts")}
    ${tile("Logged in",(S.logins||[]).length,"logins given out","--muted",isOwner()?"logins":"")}</div>`;
  h+=`<div class="v11grid">`;
  h+=`<div class="panel"><b>By ${esc(LV().sec||"section")}</b><table class="v11tb"><thead><tr><th></th><th>Total</th><th>On hand</th><th>Present</th><th>%</th></tr></thead><tbody>${SECTIONS.map(([k])=>{const o=c[k];const p=present(o);return `<tr><td><b>${esc(k)}</b></td><td>${o.total}</td><td>${o["On Hand"]}</td><td>${p}</td><td>${pct(p,o.total)}%</td></tr>`}).join("")}<tr><td><b>ATT</b></td><td>${c.ATT.total}</td><td>${c.ATT["On Hand"]}</td><td>${present(c.ATT)}</td><td>${pct(present(c.ATT),c.ATT.total)}%</td></tr></tbody><tfoot><tr><td><b>Total</b></td><td>${T.total}</td><td>${T["On Hand"]}</td><td>${pres}</td><td>${pct(pres,T.total)}%</td></tr></tfoot></table>
    <div class="note">${STATUSES.filter(s=>T[s]).map(s=>esc(SHORT[s]||s)+" "+T[s]).join(" · ")}</div></div>`;
  h+=`<div class="panel"><b>Announcements · read receipts</b>${f?posts.length?posts.map(p=>{const st=fdStats(f,p);return `<div class="v11post"><div class="note" style="margin:0">${ago(p.t)}${p.urg?` · <b style="color:var(--warn)">URGENT</b>`:""}</div><div>${esc(p.txt.slice(0,140))}${p.txt.length>140?"…":""}</div><div class="v11bar"><i style="width:${pct(st.got,st.pool)}%"></i></div><div class="note" style="margin:0">${st.got}/${st.pool} confirmed${st.prob?` · <b style="color:var(--warn)">${st.prob} problem${st.prob>1?"s":""}</b>`:""}</div></div>`}).join(""):`<p class="note">Nothing posted yet.</p>`:`<p class="note">No Feed yet.</p>`}<button class="btn alt" data-go="feed">Open Feed</button></div>`;
  if(S.rc.open){const m=missing();h+=`<div class="panel" style="border-color:var(--warn)"><b>${S.rc.em?"🚨 Emergency muster":"Recall"} · not checked in (${m.length})</b><div class="note">${m.slice(0,60).map(x=>esc((x.sec==="ATT"?"ATT":x.sec)+" "+x.rank+" "+lastOf(x))).join(" · ")||"Everyone accounted for."}</div><button class="btn" data-go="recall">Open recall</button></div>`}
  else h+=`<div class="panel"><b>Emergency</b><p class="note">Start a live headcount with one tap. Everyone gets the check-in link; you get alerted about anyone who misses the deadline.</p>${emBtn()}</div>`;
  const A=(S.act||[]).slice(0,10);h+=`<div class="panel"><b>Activity</b>${A.length?A.map(a=>`<div class="note" style="margin:0">${esc(a.ic)} ${esc(a.txt)} · ${ago(a.t)}</div>`).join(""):`<p class="note">Nothing yet.</p>`}<button class="btn alt" data-go="act">See all</button></div>`;
  h+=`</div><p class="note v11tip" style="text-align:center">Tip: open this on a computer or iPad (same link or sign-in) for the full wide view.</p>`;
  $("#main").innerHTML=h}
{const _render=render;render=function(){document.body.classList.toggle("v11wide",view==="dash");if(view==="dash"){renderTabs();renderDash();if(typeof animateView==="function")animateView();return}if(view==="recall"&&S.rc.open&&S.rc.em&&!proOK()){renderTabs();renderRecall();if(typeof animateView==="function")animateView();return}return _render.apply(this,arguments)}}
{const _rt=renderTools;renderTools=function(){_rt.apply(this,arguments);const g=$("#main .tgrid");if(!g||!leaderPhone())return;
  g.insertAdjacentHTML("afterbegin",`<button data-go="dash" class="${repOpenList().length?"hot":""}"><span class="ic">${svg("trends")}</span><span><b>Dashboard</b><small>Everything on one screen</small></span></button>`);
  $("#main .sech").insertAdjacentHTML("beforebegin",repBanner()+emBtn())}}
{const _rb=renderBoard;renderBoard=function(){_rb.apply(this,arguments);if(!leaderPhone())return;const m=$("#main");const rb=repBanner();if(rb)m.insertAdjacentHTML("afterbegin",rb);
  const anchor=m.querySelector(".qa")||m.querySelector(".hero");const btn=emBtn();if(btn){anchor?anchor.insertAdjacentHTML("afterend",btn):m.insertAdjacentHTML("beforeend",btn)}}}

/* ================= events ================= */
document.addEventListener("click",e=>{const t=e.target;
  /* Terms gate on posting */
  if((t.id==="fdPost"||t.id==="fdSlPost")&&!termsOK()){const c=$("#tosChk");if(c&&c.checked){S.tos=TERMS_VER;save();return}e.stopImmediatePropagation();e.preventDefault();toast("Agree to the Terms of Use first (checkbox above Post).");return}
  if(t.id==="fjYes"&&!termsOK()){const c=$("#tosChk");if(!c||!c.checked){e.stopImmediatePropagation();e.preventDefault();toast("Agree to the Terms of Use to join.");return}S.tos=TERMS_VER;save()}
},true);
document.addEventListener("click",e=>{const t=e.target;
  if(t.id==="tosYes"){S.tos=TERMS_VER;save();closeSheet();if(termsAfter){const a=termsAfter;termsAfter=null;setTimeout(a,300)}return}
  const mn=t.closest("[data-v11menu]");if(mn){menuOpen=mn.dataset.v11menu||null;repOpen=null;redraw(renderFeed);return}
  const rp=t.closest("[data-v11rep]");if(rp){const f=fdCur();repOpen=rp.dataset.v11rep?f.id+":"+rp.dataset.v11rep:null;menuOpen=null;redraw(renderFeed);setTimeout(()=>{const s=$("#v11Why");if(s)s.scrollIntoView({block:"center",behavior:"smooth"})},60);return}
  const sd=t.closest("[data-v11send]");if(sd){const f=fdCur();const p=(f.posts||[]).find(x=>x.id===+sd.dataset.v11send);if(!p)return;sd.disabled=true;sd.textContent="Sending…";
    repSend(f,p,$("#v11Why").value,($("#v11Note").value||"").trim(),!!($("#v11AlsoBlk")||{}).checked).then(()=>{repOpen=null;redraw(renderFeed);toast("Report sent. The post is hidden on your phone.")})
      .catch(err=>{sd.disabled=false;sd.textContent="Send report";toast(/find the function/i.test(String(err&&err.message))?"Reports aren't set up on the server yet. Tell your leader to run System check.":"Couldn't send. Try again.")});return}
  const hd=t.closest("[data-v11hide]");if(hd){const f=fdCur();f.hid=[...new Set((f.hid||[]).concat(+hd.dataset.v11hide))].slice(-300);menuOpen=null;save();redraw(renderFeed);toast("Post hidden on this phone");return}
  const bk=t.closest("[data-v11blk]");if(bk){const f=fdCur();const p=(f.posts||[]).find(x=>x.id===+bk.dataset.v11blk);if(!p||!p.by)return;f.blk=[...new Set((f.blk||[]).concat(blkKey(p)))].slice(0,100);menuOpen=null;save();redraw(renderFeed);toast("Blocked "+p.by+". You won't see their posts. Report them if they broke the rules.");return}
  const ub=t.closest("[data-v11unblk]");if(ub){const f=fdCur();f.blk=(f.blk||[]).filter(k=>k!==ub.dataset.v11unblk);save();redraw(renderFeed);return}
  if(t.id==="v11Unhide"){const f=fdCur();f.hid=[];save();redraw(renderFeed);return}
  const rm=t.closest("[data-v11rm],[data-v11cut],[data-v11keep]");if(rm){const rid=rm.dataset.v11rm||rm.dataset.v11cut||rm.dataset.v11keep;const x=S.rep.find(r=>r.rid===rid);if(!x)return;const f=S.feeds.find(z=>z.id===x.feed&&z.lk);if(!f)return;
    if(rm.dataset.v11keep){x.st="kept";x.dt=Date.now();save();redraw(renderFeed);return}
    rm.disabled=true;rm.textContent="Working…";
    (async()=>{if((f.posts||[]).some(p=>p.id===x.pid)){await SB.rpc("feed_delete_post",{p_feed:f.id,p_leader_key:f.lk,p_post:x.pid});f.posts=f.posts.filter(p=>p.id!==x.pid)}
      for(const y of S.rep)if(y.feed===x.feed&&y.pid===x.pid&&y.st==="open"){y.st=rm.dataset.v11cut?"cut":"removed";y.dt=Date.now()}
      if(rm.dataset.v11cut&&x.sl&&S.board)await resetSecLink(x.sl);
      actAdd("⚑","Removed a reported post"+(rm.dataset.v11cut?" and cut off the "+x.sl+" leader link":"")+".","feed");save();redraw(renderFeed);toast(rm.dataset.v11cut?"Removed. New "+x.sl+" link made; the old one can't post.":"Post removed for everyone")})()
      .catch(err=>{rm.disabled=false;rm.textContent="Try again";toast("Couldn't finish: "+(err.message||err))});return}
  if(t.id==="v11Del"){if(armed!=="v11del"){armed="v11del";t.textContent="Tap again: delete my account and all data";return}t.disabled=true;delAccount().finally(()=>{if(t.isConnected)t.disabled=false});return}
  if(t.id==="v11Em"){if(armed!=="v11em"){armed="v11em";t.textContent="Tap again to start · texts + Feed alert to everyone";setTimeout(()=>{if(armed==="v11em"){armed=null;if(t.isConnected)t.textContent="🚨 Emergency muster"}},5000);return}emStart();return}
});
document.addEventListener("change",e=>{const t=e.target;
  if(t.id==="v11Dl"){const v=+t.value;S.rc.dl=v?S.rc.start+v*60000:0;S.rc.dlFired=0;save();redraw(renderRecall);setTimeout(dlCheck,100);return}
  if(t.id==="v11EmMin"){S.emMin=+t.value||15;save();return}
  if(t.id==="tosChk"&&t.checked){S.tos=TERMS_VER;save()}});

/* help, system check, version */
if(typeof HELP==="object"){HELP.dash=["Dashboard","Everything on one screen.",["Headcount, recall, requests, reported posts and overdue items at the top. Tap a tile to open it.","Announcements show read receipts: how many confirmed each post.","Open the app on a computer or iPad for the wide view."]];
  HELP.recall=HELP.recall||["Recall","",[]];}
if(typeof SC==="object"&&Array.isArray(SC))SC.push({k:"v11",n:"1.1: delete my account, reports",f:["16_v11"],t:[["login_self_delete",{p_uid:"zz",p_vf:"x"}]]});
if(typeof SYNC_SKIP==="object"&&Array.isArray(SYNC_SKIP))SYNC_SKIP.push("lgSelf","outbox","tos");
if(typeof IC==="object")IC.dash=IC.trends;
/* ================= 6. APP NAME + UNIT NAME (rename from the title) ================= */
window.appName=()=>String(S.appName||"").trim()||"Accounted For";
if(typeof WS_GLOBAL==="object"&&Array.isArray(WS_GLOBAL))WS_GLOBAL.push("appName");
function paintTitle(){const b=$("#bMode");if(b){b.setAttribute("data-noxl","");const n=[...b.childNodes].find(x=>x.nodeType===3);const want=appName();if(n){if(n.nodeValue!==want)n.nodeValue=want}else b.insertBefore(document.createTextNode(want),b.firstChild)}
  if(document.title!==appName())document.title=appName();try{const V=window.VAULT;if(V&&V.cfg&&V.cfg.title!==appName())V.set({title:appName()})}catch(e){}}
{const _rt=renderTabs;renderTabs=function(){_rt.apply(this,arguments);paintTitle()}}
{const _ms=openModeSheet;openModeSheet=function(first){_ms.apply(this,arguments);
  $("#sheetOpts").insertAdjacentHTML("afterbegin",`<div class="panel" data-noxl style="margin:0 0 10px"><b>Names</b>
    <label for="v11AppN">App name on your header</label><input type="text" id="v11AppN" maxlength="24" placeholder="Accounted For" value="${esc(S.appName||"")}">
    <label for="v11UnitN">Unit or team name (on reports, texts and the Feed)</label><input type="text" id="v11UnitN" maxlength="24" placeholder="1ST PLATOON" value="${esc(S.unit||"")}" autocapitalize="characters">
    <button class="btn" id="v11NameSave">Save names</button><p class="note" style="margin:0">Only changes this phone. People you invite still download <b>Accounted For</b>.</p></div>`)}}
document.addEventListener("click",e=>{if(e.target.id!=="v11NameSave")return;S.appName=String($("#v11AppN").value||"").replace(/[<>#|]/g,"").trim().slice(0,24);
  const u=cleanName($("#v11UnitN").value||"");if(u||S.unit)S.unit=u;save();closeSheet();paintTitle();render();toast("Saved: "+appName()+" · "+unitName())});
paintTitle();

/* ================= 7. FIX A WRONG LIST: undo a load, remove duplicates, remove people, clear numbers ================= */
S.loads=S.loads||[];
if(typeof SYNC_SKIP==="object"&&Array.isArray(SYNC_SKIP))SYNC_SKIP.push("loads");
const snap=()=>({roster:JSON.parse(JSON.stringify(S.roster)),source:S.source,loadedAt:S.loadedAt||""});
function logLoad(kind,label){const e={id:"L"+Date.now().toString(36)+rndId(3),t:Date.now(),kind,label:String(label||"").slice(0,60),before:snap(),n0:S.roster.length,ph0:S.roster.filter(m=>m.phone).length};
  S.loads.unshift(e);S.loads=S.loads.slice(0,5);save();setTimeout(()=>{e.n1=S.roster.length;e.ph1=S.roster.filter(m=>m.phone).length;save();if(view==="data")redraw(tabRedraw)},3500)}
/* snapshot right before the app reads a file or adds people */
document.addEventListener("change",e=>{const t=e.target;if(!t||t.type!=="file"||!t.files||!t.files[0])return;const nm=t.files[0].name;
  if(t.id==="file")logLoad("Loaded roster",nm);else if(t.id==="fileAdd"||t.id==="coFileAdd")logLoad("Added from file",nm);else if(t.id==="rcFile"||t.id==="rcFileR")logLoad("Phone numbers",nm)},true);
document.addEventListener("click",e=>{const t=e.target;if(!t||!t.id)return;
  if(t.id==="amListAdd")logLoad("Added people","typed list");else if(t.id==="rvSave")logLoad("Phone numbers","saved numbers");else if(t.id==="rcPasteGo")logLoad("Phone numbers","pasted numbers")},true);
const nkey2=m=>String(m.rank||"").toUpperCase().replace(/[^A-Z0-9]/g,"")+"|"+String(m.name||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
function dupes(){const seen=new Map(),out=[];for(const m of S.roster){const k=nkey2(m);if(!k.split("|")[1])continue;if(seen.has(k))out.push([seen.get(k),m]);else seen.set(k,m)}return out}
let rmSel=new Set(),rmQ="",rmOpen=false;
function fixHTML(){const D=dupes();const L=S.loads;const ph=S.roster.filter(m=>m.phone).length;
  let h=`<h2>Fix a wrong list</h2><div class="panel" id="v11Fix"><p class="note">Loaded the wrong file or the same one twice? Undo it, remove duplicates, or pick people to remove.</p>`;
  if(L.length)h+=`<b>Recent loads</b><div class="alist">${L.map((e,i)=>`<div class="rrow" style="--sc:var(--line)"><div class="who"><b>${esc(e.kind)}</b> · ${esc(e.label)}<div class="ph">${ago(e.t)} · ${e.kind==="Phone numbers"?(e.ph1!=null?`numbers ${e.ph0} → ${e.ph1}`:"numbers"):(e.n1!=null?`people ${e.n0} → ${e.n1}`:"")}</div></div>
      <button class="btn ${armed==="v11undo"+e.id?"warn":"alt"}" data-v11undo="${e.id}">${armed==="v11undo"+e.id?(i?"Tap again: undo this and the "+i+" newer":"Tap again to undo"):"Undo"}</button></div>`).join("")}</div>`;
  else h+=`<p class="note">No loads yet on this version. From now on every roster or number file you load shows here with an Undo.</p>`;
  h+=D.length?`<button class="btn warn" id="v11Dedupe">${armed==="v11dedupe"?"Tap again: remove "+D.length+" duplicate"+(D.length>1?"s":""):"Remove "+D.length+" duplicate"+(D.length>1?"s":"")+" (same rank and name)"}</button>`:`<p class="note" style="color:var(--s-onhand)">✓ No duplicates.</p>`;
  h+=`<button class="btn alt" id="v11RmOpen">${rmOpen?"Close":"Pick people to remove"}</button>`;
  if(rmOpen){const q=rmQ.toLowerCase();const list=sorted(S.roster).filter(m=>!q||(m.rank+" "+m.name+" "+m.sec).toLowerCase().includes(q));
    h+=`<input class="search" id="v11RmQ" type="search" placeholder="Find a person" value="${esc(rmQ)}"><div class="row2"><button class="btn alt" id="v11RmAll">Select all shown (${list.length})</button><button class="btn alt" id="v11RmNone">Clear selection</button></div>
      <div class="alist" style="max-height:340px;overflow:auto">${list.slice(0,400).map(m=>`<label class="tog" style="padding:6px 2px;border-bottom:1px solid var(--line)"><input type="checkbox" data-v11rm1="${m.id}"${rmSel.has(m.id)?" checked":""}> <span><b>${esc(m.rank)}</b> ${esc(m.name)} <span class="note">· ${esc(m.sec)}</span></span></label>`).join("")}</div>
      <button class="btn warn" id="v11RmGo"${rmSel.size?"":" disabled"}>${armed==="v11rmgo"?"Tap again: remove "+rmSel.size:"Remove "+rmSel.size+" selected"}</button>`}
  h+=ph?`<button class="btn warn" id="v11ClrPh">${armed==="v11clrph"?"Tap again: delete all "+ph+" phone numbers":"Delete all phone numbers ("+ph+")"}</button>`:"";
  return h+`</div>`}
{const _rd=renderData;renderData=function(){_rd.apply(this,arguments);const r=$("#reset");const pnl=r&&r.closest(".panel");if(pnl)pnl.insertAdjacentHTML("afterend",fixHTML());else $("#main").insertAdjacentHTML("afterbegin",fixHTML())}}
function afterRosterChange(msg){save();try{if(S.board)rpPublish(true)}catch(e){}redraw(tabRedraw);renderTabs();toast(msg)}
document.addEventListener("click",e=>{const t=e.target;
  const u=t.closest("[data-v11undo]");if(u){const id=u.dataset.v11undo;if(armed!=="v11undo"+id){armed="v11undo"+id;redraw(tabRedraw);return}armed=null;const i=S.loads.findIndex(x=>x.id===id);if(i<0)return;const b=S.loads[i].before;
    S.roster=b.roster;S.source=b.source;S.loadedAt=b.loadedAt;S.loads=S.loads.slice(i+1);afterRosterChange("Undone. Back to "+S.roster.length+" people.");return}
  if(t.id==="v11Dedupe"){if(armed!=="v11dedupe"){armed="v11dedupe";redraw(tabRedraw);return}armed=null;const D=dupes();logLoad("Removed duplicates",D.length+" removed");const gone=new Set();
    for(const [keep,dup] of D){if(!keep.phone&&dup.phone)keep.phone=dup.phone;if(!keep.phone2&&dup.phone2)keep.phone2=dup.phone2;gone.add(dup.id)}S.roster=S.roster.filter(m=>!gone.has(m.id));afterRosterChange(gone.size+" duplicates removed");return}
  if(t.id==="v11RmOpen"){rmOpen=!rmOpen;rmSel=new Set();armed=null;redraw(tabRedraw);return}
  if(t.id==="v11RmAll"){const q=rmQ.toLowerCase();S.roster.filter(m=>!q||(m.rank+" "+m.name+" "+m.sec).toLowerCase().includes(q)).forEach(m=>rmSel.add(m.id));redraw(tabRedraw);return}
  if(t.id==="v11RmNone"){rmSel=new Set();redraw(tabRedraw);return}
  if(t.id==="v11RmGo"){if(!rmSel.size)return;if(armed!=="v11rmgo"){armed="v11rmgo";redraw(tabRedraw);return}armed=null;const n=rmSel.size;logLoad("Removed people",n+" removed");S.roster=S.roster.filter(m=>!rmSel.has(m.id));rmSel=new Set();rmOpen=false;
    if(!S.roster.length){S.roster=sampleRoster();S.source="sample"}afterRosterChange(n+" removed");return}
  if(t.id==="v11ClrPh"){if(armed!=="v11clrph"){armed="v11clrph";redraw(tabRedraw);return}armed=null;logLoad("Phone numbers","deleted all numbers");S.roster.forEach(m=>{delete m.phone;delete m.phone2});afterRosterChange("All phone numbers deleted")}});
document.addEventListener("change",e=>{const c=e.target.closest&&e.target.closest("[data-v11rm1]");if(!c)return;const id=c.dataset.v11rm1;c.checked?rmSel.add(id):rmSel.delete(id);armed=null;const b=$("#v11RmGo");if(b){b.disabled=!rmSel.size;b.textContent="Remove "+rmSel.size+" selected"}});
document.addEventListener("input",e=>{if(e.target.id!=="v11RmQ")return;rmQ=e.target.value;const pos=e.target.selectionStart;redraw(tabRedraw);const q=$("#v11RmQ");if(q){q.focus();q.setSelectionRange(pos,pos)}});

render();
})();
