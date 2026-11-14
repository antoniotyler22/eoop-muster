/* Accounted For 4.98.0 (4.99.0: phone alerts for new messages, "New messages" divider) — Team chat: a WhatsApp-style group conversation for your team, with the headcount on top.
   - The Talk tab is now "Chat". It opens the team conversation; a Chat | Voice switch at the top goes to Talk (push-to-talk).
   - The bar on top shows "21 of 24 accounted for" from the roster; tap it to open the board.
   - "I'm accounted for" checks you in as On Hand (same as the I'm safe button) and drops a line in the chat.
   - Messages are encrypted on the phone with the Word of Mouth key before they leave it (the server stores ciphertext
     for 30 days). Needs supabase/setup/44_team_chat.sql. Works while the app is open; it is not a background service. */
(()=>{
const MAXTX=1000,LOGMAX=200,POLL_FAST=3000,POLL_SLOW=20000;
const feed=()=>{const l=(S.feeds||[]);return (typeof fdCur==="function"&&fdCur())||l.find(f=>f.mk&&f.ek)||l[0]||null};
const me=f=>String(typeof fdBy==="function"?fdBy(f):(S.myName||"ME")).toUpperCase().slice(0,30);
const ready=f=>!!(f&&f.mk&&f.ek&&f.id);
const seenMap=()=>{if(!S.chatSeen||typeof S.chatSeen!=="object")S.chatSeen={};return S.chatSeen};
const ST={};
const st=f=>ST[f.id]=ST[f.id]||{after:0,msgs:new Map(),busy:false,init:false,err:""};
const ui={draft:"",stick:true,base:undefined};
const enter=()=>{const f=feed();ui.base=f&&seenMap()[f.id]!==undefined?seenMap()[f.id]:undefined};
if(typeof SYNC_SKIP!=="undefined"&&Array.isArray(SYNC_SKIP)&&!SYNC_SKIP.includes("chatSeen"))SYNC_SKIP.push("chatSeen");

/* ---------- server ---------- */
async function put(f,o){const ct=await fdEnc(f.ek,o);return +(await SB.rpc("chat_send",{p_feed:f.id,p_key:f.mk,p_ct:ct}))}
async function poll(f){const s=st(f);if(s.busy||!ready(f))return;s.busy=true;let fresh=0,loops=0;
  try{for(;;){const rows=await SB.rpc("chat_get",{p_feed:f.id,p_key:f.mk,p_after:s.after});const L=[...(rows||[])].sort((a,b)=>a.id-b.id);
      for(const r of L){s.after=Math.max(s.after,+r.id);const o=await fdDec(f.ek,r.ct);if(!o||(o.k!=="m"&&o.k!=="a"))continue;const id=+r.id;if(s.msgs.has(id))continue;
        const t=Date.parse(r.created_at)||o.t||Date.now();
        s.msgs.set(id,{id,k:o.k,by:String(o.by||"?").slice(0,30),tx:String(o.tx||"").slice(0,MAXTX),t:Math.min(Date.now(),t),st:String(o.st||"").slice(0,24)});fresh++}
      if(L.length<100||++loops>8)break}
    s.err="";s.init=true;
    if(fresh){trim(s);if(view==="chat")draw(true);else{renderTabs()}}
  }catch(e){s.err=String(e&&e.message||e).slice(0,80);if(view==="chat")paintErr(s.err)}finally{s.busy=false}}
function trim(s){if(s.msgs.size<=LOGMAX)return;const ids=[...s.msgs.keys()].sort((a,b)=>a-b);for(const id of ids.slice(0,ids.length-LOGMAX))s.msgs.delete(id)}
const list=f=>[...st(f).msgs.values()].sort((a,b)=>a.id-b.id);

/* ---------- unread ---------- */
function unread(){let n=0;try{for(const f of (S.feeds||[])){if(!ready(f))continue;const base=seenMap()[f.id];const s=st(f);if(!s.init)continue;const b=base===undefined?0:base;
    for(const m of s.msgs.values())if(m.id>b&&m.by!==me(f)&&m.k==="m")n++}}catch(e){}return n}
function markSeen(){let ch=false;try{for(const f of (S.feeds||[])){const s=st(f);let mx=seenMap()[f.id]||0;for(const m of s.msgs.values())if(m.id>mx)mx=m.id;if(mx!==(seenMap()[f.id]||0)){seenMap()[f.id]=mx;ch=true}}}catch(e){}if(ch)save()}
window.chatUnread=unread;

/* ---------- look ---------- */
const esc2=s=>typeof esc==="function"?esc(s):String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const initials=n=>{const w=String(n||"?").split(/\s+/).filter(Boolean);return (w.length>1?w[0][0]+w[w.length-1][0]:(w[0]||"?").slice(0,2)).toUpperCase()};
const av=(n,sz)=>{const ph=window.afPhoto?window.afPhoto(n):"";return `<span class="tk-av" style="--sz:${sz||32}px${ph?`;background:url(${ph}) center/cover`:""}">${ph?"":esc2(initials(n))}</span>`};
const hm=t=>{const d=new Date(t);return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")};
const dayKey=t=>{const d=new Date(t);return d.getFullYear()+"-"+d.getMonth()+"-"+d.getDate()};
const dayLabel=t=>{const d=new Date(t),n=new Date();if(dayKey(t)===dayKey(n.getTime()))return "Today";const y=new Date(n.getTime()-864e5);if(dayKey(t)===dayKey(y.getTime()))return "Yesterday";
  return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]+" "+["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]+" "+d.getDate()};
function counts2(){try{if(S.source==="sample"||!Array.isArray(S.roster)||!S.roster.length)return null;const T=counts().T;if(!T.total)return null;return {ok:Math.max(0,Math.min(T.total,present(T))),n:T.total}}catch(e){return null}}
const sub=f=>{const s=st(f);const n=new Set(list(f).map(m=>m.by)).size;return (s.init?(n?`${n} in the conversation`:"No messages yet"):"Connecting…")+" · private to this team"};
function bar(){const c=counts2();if(!c)return "";const p=Math.round(100*c.ok/c.n);const all=c.ok>=c.n;
  return `<button type="button" class="ch-bar${all?" done":""}" id="chBar" aria-label="${c.ok} of ${c.n} accounted for. Open the board"><span class="ch-bt"><b>${c.ok} of ${c.n}</b> accounted for</span><span class="ch-bw" aria-hidden="true"><i style="width:${p}%"></i></span></button>`}
function inboxOk(){try{return typeof window.inboxOwner==="function"?!!window.inboxOwner():true}catch(e){return true}}
function seg(active){const ld=!(typeof memberMode==="function"&&memberMode());const dot=(k,n)=>n&&active!==k?`<i class="of-dot" aria-label="${n} new"></i>`:"";const tb=k=>{try{return typeof tabBadge==="function"?tabBadge(k):0}catch(e){return 0}};
  const o=typeof window.officialUnread==="function"?window.officialUnread():0;const B=(k,l,n)=>`<button type="button" role="tab" data-seg="${k}" aria-selected="${active===k}">${l}${dot(k,n)}</button>`;
  return `<div class="ch-seg" role="tablist" aria-label="Chat, feed, inbox, official updates or voice">${B("chat","Chat",0)}${ld?B("feed","Feed",tb("feed")):""}${ld&&inboxOk()?B("inbox","Inbox",tb("inbox")):""}${B("official","Official",o)}${B("voice","Voice",0)}</div>`}
window.chatSeg=seg;
function bubbles(f){const L=list(f),nm=me(f);if(!L.length)return `<div class="ch-empty"><b>${st(f).init?"No messages yet":"Loading the conversation…"}</b>${st(f).init?"<span>Say something to your team. Messages are private to this team and stay for 30 days.</span>":""}</div>`;
  let out="",day="",prev=null,div=false;
  for(const m of L){if(!div&&ui.base!==undefined&&m.id>ui.base&&m.by!==nm&&m.k==="m"){div=true;out+=`<div class="ch-new" id="chNew"><span>New messages</span></div>`;prev=null}
    const dk=dayKey(m.t);if(dk!==day){day=dk;prev=null;out+=`<div class="ch-day"><span>${dayLabel(m.t)}</span></div>`}
    if(m.k==="a"){out+=`<div class="ch-sys"><span>✓ ${esc2(m.by)} is accounted for · ${hm(m.t)}</span></div>`;prev=null;continue}
    const mine=m.by===nm,first=!prev||prev.by!==m.by||m.t-prev.t>5*60e3;prev=m;
    out+=`<div class="ch-row${mine?" me":""}${first?" first":""}">${!mine&&first?av(m.by,28):`<span class="ch-sp"></span>`}<div class="ch-b">${!mine&&first?`<small class="ch-n">${esc2(m.by)}</small>`:""}<div class="ch-t">${esc2(m.tx).replace(/\n/g,"<br>")}<time datetime="${new Date(m.t).toISOString()}">${hm(m.t)}</time></div></div></div>`}
  return out}
function html(){const f=feed();
  if(!ready(f))return `<div class="ch">${seg("chat")}<div class="ch-empty"><b>Chat runs on your Word of Mouth</b><span>Start a Word of Mouth (or open the link your leader sent), then come back.</span><button class="btn" data-go="feed" style="margin-top:10px">Go to Word of Mouth</button></div></div>`;
  const s=st(f);
  return `<div class="ch">
   <div class="ch-top"><div class="ch-ti"><b>${esc2(f.unit||"Team chat")}</b><small id="chSub">${sub(f)}</small></div>${seg("chat")}</div>
   ${bar()}
   <div class="ch-list" id="chList" role="log" aria-live="polite">${bubbles(f)}</div>
   <p class="ch-err" id="chErr" role="status">${esc2(s.err?"Couldn't reach the team. Messages will send when you're back online.":"")}</p>
   <div class="ch-send"><button type="button" class="ch-acc" id="chAcc"><span aria-hidden="true">✓</span> I'm accounted for</button>
    <form class="ch-comp" id="chForm"><textarea id="chIn" rows="1" maxlength="${MAXTX}" placeholder="Message the team" aria-label="Message the team">${esc2(ui.draft)}</textarea><button type="submit" class="ch-go" id="chGo" aria-label="Send">➤</button></form></div></div>`}
function paintErr(t){const e=document.getElementById("chErr");if(e)e.textContent=t?"Couldn't reach the team. Messages will send when you're back online.":""}
function grow(){const t=document.getElementById("chIn");if(t){t.style.height="auto";t.style.height=Math.min(120,t.scrollHeight)+"px"}}
function draw(keepFocus){if(view!=="chat")return;const main=document.getElementById("main");if(!main)return;const f=feed();
  const old=document.getElementById("chList");const atBottom=!old||old.scrollHeight-old.scrollTop-old.clientHeight<80;
  const ta=document.getElementById("chIn");if(ta)ui.draft=ta.value;const hadFocus=keepFocus&&document.activeElement&&document.activeElement.id==="chIn";
  if(old&&ready(f)&&document.getElementById("chBar")!==null||old&&ready(f)){ /* only the changing parts are redrawn, so typing and the keyboard are never disturbed */
    old.innerHTML=bubbles(f);const sb=document.getElementById("chSub");if(sb)sb.textContent=sub(f);const b=document.getElementById("chBar"),nb=bar();if(b&&nb){b.outerHTML=nb}else if(b&&!nb){b.remove()}else if(!b&&nb){document.querySelector(".ch-top").insertAdjacentHTML("afterend",nb)}
    if(atBottom||ui.stick)old.scrollTop=old.scrollHeight;markSeen();renderTabs();return}
  main.innerHTML=html();const l=document.getElementById("chList");if(l)l.scrollTop=l.scrollHeight;grow();markSeen();if(hadFocus){const t=document.getElementById("chIn");if(t)t.focus()}}

/* ---------- wiring ---------- */
{const _tb=tabBadge;tabBadge=function(k){const n=_tb.apply(this,arguments);return k==="talk"?n+(view==="chat"?0:unread()):n}}
{const _to=tabOf;tabOf=function(v){return v==="chat"?"talk":_to.apply(this,arguments)}}
{const _tl=tabsList;tabsList=function(){return _tl.apply(this,arguments).map(x=>x[0]==="talk"?["talk","Chat",x[2]]:x)}}
if(typeof IC==="object"&&!IC.chat)IC.chat='<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z"/>';
if(typeof IC==="object"&&IC.chat){const _tl2=tabsList;tabsList=function(){return _tl2.apply(this,arguments).map(x=>x[0]==="talk"?["talk","Chat","chat"]:x)}}
{const _r=render;render=function(){if(view==="chat"){renderTabs();const m=document.getElementById("main");if(m){m.className=m.className.replace(/\bfchat\b/g,"").trim();m.innerHTML=html();const l=document.getElementById("chList"),nw=document.getElementById("chNew");if(l)l.scrollTop=nw?Math.max(0,nw.offsetTop-l.offsetTop-8):l.scrollHeight;grow();markSeen();renderTabs()}return}return _r.apply(this,arguments)}}
/* the Talk tab opens Chat first. This listener is on window so it runs before Talk's own tab handler. */
window.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("#tabbar [data-tab='talk']");if(!t)return;e.stopImmediatePropagation();e.preventDefault();
  enter();view="chat";armed=null;query="";render();window.scrollTo(0,0);start()},true);
/* Chat | Voice switch (also injected on the Talk screen, which draws itself) */
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-seg]");if(!b)return;e.preventDefault();
  if(b.dataset.seg==="feed"||b.dataset.seg==="inbox"){const x=document.createElement("button");x.dataset.tab=b.dataset.seg;x.hidden=true;document.body.appendChild(x);x.click();x.remove();return}
  if(b.dataset.seg==="voice"&&view!=="talk"){view="talk";armed=null;render();window.scrollTo(0,0);const t=document.querySelector("#tabbar [data-tab='talk']");return}
  if(b.dataset.seg==="official"&&view!=="official"){if(typeof window.officialEnter==="function")window.officialEnter();view="official";armed=null;render();window.scrollTo(0,0);if(window.officialPull)window.officialPull(true);return}
  if(b.dataset.seg==="chat"&&view!=="chat"){enter();view="chat";armed=null;render();window.scrollTo(0,0);start()}},true);
function injectSeg(){if(view!=="talk")return;const m=document.getElementById("main");if(!m||m.querySelector(".ch-seg"))return;const top=m.querySelector(".tk-top");
  if(top)top.insertAdjacentHTML("afterend",`<div style="display:flex;justify-content:center">${seg("voice")}</div>`);else if(m.querySelector(".tk"))m.querySelector(".tk").insertAdjacentHTML("afterbegin",seg("voice"))}
new MutationObserver(()=>{try{injectSeg()}catch(e){}}).observe(document.documentElement,{childList:true,subtree:true});

async function send(f,text){const tx=String(text||"").trim().slice(0,MAXTX);if(!tx||!ready(f))return false;const s=st(f);
  const o={k:"m",by:me(f),tx,t:Date.now()};
  try{const id=await put(f,o);if(id&&!s.msgs.has(id)){s.msgs.set(id,{id,k:"m",by:o.by,tx,t:o.t,st:""});s.after=Math.max(s.after,id)}ui.stick=true;s.err="";try{SB.notify(null,{talk:f.id,k:f.mk,chat:true,dev:window.dmDev?window.dmDev():undefined,ti:o.by,tx:tx.slice(0,90)})}catch(e){}return true}
  catch(e){s.err=String(e&&e.message||e).slice(0,80);paintErr(s.err);toast("Couldn't send. Check your connection and try again.");return false}}
document.addEventListener("submit",async e=>{if(!e.target.closest||!e.target.closest("#chForm"))return;e.preventDefault();const f=feed(),t=document.getElementById("chIn");if(!f||!t)return;
  const v=t.value;if(!v.trim())return;t.value="";ui.draft="";grow();const ok=await send(f,v);if(!ok){t.value=v;ui.draft=v;grow()}draw(true)},true);
document.addEventListener("keydown",e=>{const t=e.target;if(!t||t.id!=="chIn")return;if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){e.preventDefault();const fm=document.getElementById("chForm");if(fm){if(fm.requestSubmit)fm.requestSubmit();else fm.dispatchEvent(new Event("submit",{cancelable:true,bubbles:true}))}}});
document.addEventListener("input",e=>{if(e.target&&e.target.id==="chIn"){ui.draft=e.target.value;grow()}},true);
document.addEventListener("click",async e=>{if(view!=="chat")return;const t=e.target;if(!t.closest)return;
  if(t.closest("#chBar")){if(typeof memberMode==="function"&&memberMode())return;view="board";armed=null;render();window.scrollTo(0,0);return}
  if(t.closest("#chAcc")){const f=feed();if(!f)return;const btn=t.closest("#chAcc");if(btn.dataset.busy)return;btn.dataset.busy="1";
    try{const r=typeof window.quickSafe==="function"?await window.quickSafe():"no";
      if(r==="ok"){try{const id=await put(f,{k:"a",by:me(f),st:"On Hand",t:Date.now()});const s=st(f);if(id&&!s.msgs.has(id)){s.msgs.set(id,{id,k:"a",by:me(f),tx:"",t:Date.now(),st:"On Hand"});s.after=Math.max(s.after,id)}}catch(x){}
        toast("You're accounted for.");if(view==="chat")draw(true)}
      else if(r==="no")toast("Use your My page check-in to check in.")}
    finally{delete btn.dataset.busy}return}},true);

/* ---------- keep it fresh ---------- */
function start(){const f=feed();if(!ready(f))return;poll(f)}
setInterval(()=>{if(document.hidden)return;const f=feed();if(!ready(f))return;const s=st(f);const now=Date.now();
  if(view==="chat"){s.last=now;poll(f);return}
  if(!s.last||now-s.last>=POLL_SLOW){s.last=now;poll(f)}},POLL_FAST);
setTimeout(()=>{try{start()}catch(e){}},3000);

if(typeof SC==="object"&&Array.isArray(SC))SC.push({k:"ch",n:"4.98: Team chat",f:["44_team_chat"],t:[["chat_ok",{}]]});
if(typeof HELP==="object"&&HELP.feed&&Array.isArray(HELP.feed[2]))HELP.feed[2].push("Chat: the Chat tab is a group conversation for your team. The bar on top shows how many are accounted for. Tap I'm accounted for to check in. Messages are private to the team and kept 30 days. Voice (push-to-talk) is one tap away.");

{const c=document.createElement("style");c.textContent=`.ch{display:flex;flex-direction:column;gap:10px;height:calc(100dvh - 190px);min-height:380px}
.ch-top{display:flex;align-items:center;justify-content:space-between;gap:10px}.ch-ti{display:flex;flex-direction:column;min-width:0}.ch-ti b{font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ch-ti small{font-size:12.5px;color:var(--muted)}
.ch-seg{display:inline-flex;background:var(--line);border-radius:999px;padding:3px;flex:none}.ch-seg button{all:unset;cursor:pointer;box-sizing:border-box;min-height:32px;padding:0 9px;position:relative;border-radius:999px;font-size:13.5px;font-weight:700;color:var(--muted);display:inline-flex;align-items:center}
.ch-seg button[aria-selected="true"]{background:var(--brass);color:var(--on-brass,#fff)}.ch-seg button:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
.ch-bar{all:unset;cursor:pointer;box-sizing:border-box;display:flex;flex-direction:column;gap:6px;padding:10px 14px;border-radius:16px;background:var(--brass-soft,#dde8ff);color:var(--ink)}.ch-bt{font-size:14px}.ch-bt b{font-weight:800}
.ch-bw{height:6px;border-radius:999px;background:color-mix(in srgb,var(--brass) 22%,transparent);overflow:hidden}.ch-bw i{display:block;height:100%;border-radius:999px;background:var(--brass);transition:width .4s}.ch-bar.done .ch-bw i{background:var(--ok,#1f9d55)}.ch-bar:focus-visible{outline:2px solid var(--brass);outline-offset:2px}
.ch-list{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:2px;padding:8px 2px;border-radius:16px;overscroll-behavior:contain}
.ch-day{display:flex;justify-content:center;margin:10px 0 6px}.ch-day span{font-size:12px;font-weight:700;color:var(--muted);background:var(--line);padding:3px 12px;border-radius:999px}
.ch-new{display:flex;align-items:center;gap:10px;margin:12px 0 4px;color:var(--brass);font-size:12px;font-weight:800}.ch-new:before,.ch-new:after{content:"";flex:1;height:1px;background:var(--brass);opacity:.5}
.ch-sys{display:flex;justify-content:center;margin:6px 0}.ch-sys span{font-size:12.5px;font-weight:700;color:var(--brass);background:var(--brass-soft,#dde8ff);padding:4px 12px;border-radius:999px}
.ch-row{display:flex;align-items:flex-end;gap:8px;max-width:86%}.ch-row.first{margin-top:8px}.ch-row.me{align-self:flex-end;flex-direction:row-reverse}.ch-sp{width:28px;flex:none}.ch-row.me .ch-sp{display:none}
.ch-b{min-width:0;display:flex;flex-direction:column}.ch-n{font-size:11.5px;font-weight:700;color:var(--muted);margin:0 0 2px 4px}
.ch-t{position:relative;padding:8px 12px 18px;border-radius:18px;background:var(--card,var(--surface));border:1px solid var(--glass-line);font-size:15px;line-height:1.35;overflow-wrap:anywhere;min-width:64px}
.ch-row.me .ch-t{background:var(--brass);color:var(--on-brass,#fff);border-color:transparent}.ch-t time{position:absolute;right:10px;bottom:3px;font-size:10.5px;opacity:.65}
.ch-empty{margin:auto;text-align:center;display:flex;flex-direction:column;gap:6px;padding:24px 16px;color:var(--muted)}.ch-empty b{color:var(--ink);font-size:16px}.ch-empty span{font-size:13.5px}
.ch-err{min-height:16px;margin:0;font-size:12.5px;color:var(--warn);text-align:center}
.ch-send{display:flex;flex-direction:column;gap:8px}.ch-acc{all:unset;cursor:pointer;box-sizing:border-box;min-height:44px;border-radius:14px;border:1.5px solid var(--brass);color:var(--brass);font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;gap:8px}
.ch-acc:active{background:var(--brass-soft,#dde8ff)}.ch-acc:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
.ch-comp{display:flex;align-items:flex-end;gap:8px}.ch-comp textarea{flex:1;box-sizing:border-box;resize:none;min-height:44px;max-height:120px;padding:11px 14px;border-radius:22px;border:1px solid var(--line);background:var(--surface-2,var(--card,#fff));color:var(--ink);font:inherit;font-size:16px;line-height:1.3}
.ch-go{all:unset;cursor:pointer;flex:none;width:44px;height:44px;border-radius:50%;background:var(--brass);color:var(--on-brass,#fff);display:flex;align-items:center;justify-content:center;font-size:18px}.ch-go:focus-visible{outline:2px solid var(--ink);outline-offset:2px}`;document.head.appendChild(c)}
})();
