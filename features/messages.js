/* Accounted For 4.128.0: Message someone. Setup part 54.
   Pick a person from the roster and open a 1:1 conversation (bubbles, sent and read times). Only those two phones can
   read it:
   - each phone publishes a public key for its own roster spot (first claim wins; a secret token proves it later);
   - a new thread gets a fresh key, sent to the other person sealed to their public key;
   - messages are encrypted with that thread key, and the server only hands them to whoever presents it. The thread's
     inbox key is made per thread too, so the owner's Inbox never covers these threads.
   Also here: Official channel and Voice as cards on My page, and the read-only "Earlier team chat" archive under Feed.
   No push alerts are sent for these messages: they arrive while the app is open. */
(()=>{
const J=()=>window.afJoin;
const PM=()=>{S.pm=S.pm&&typeof S.pm==="object"?S.pm:{};S.pm.th=S.pm.th||{};return S.pm};
if(typeof SYNC_SKIP!=="undefined"&&Array.isArray(SYNC_SKIP))for(const k of ["pm","pmKey","pmMe"])if(!SYNC_SKIP.includes(k))SYNC_SKIP.push(k);
const own=()=>typeof isOwner==="function"&&isOwner();
/* the team (its Word of Mouth) and my roster spot on it */
function team(){const L=S.feeds||[];return (own()&&typeof mainFeed==="function"&&mainFeed())||L.find(f=>f.mk&&f.mid&&!f.lk)||L.find(f=>f.mk&&!f.lk)||L.find(f=>f.mk)||null}
const tkey=f=>f.mk||f.lk;
function me(){const f=team();if(!f)return null;if(f.mid)return {id:f.mid,n:f.me||S.myName||""};if(S.who&&S.who.id)return {id:S.who.id,n:S.who.n};if(S.pmMe&&S.pmMe.id)return S.pmMe;return null}
async function mhOf(f,mid){return J().sha("af-pm-v1:"+f.id+":"+mid)}
/* people I can message: the roster (leaders) or the team's names list (members) */
function people(){const f=team();const m=me();let L=[];
  if(Array.isArray(S.roster)&&S.roster.length&&S.source!=="sample")L=S.roster.map(x=>({id:x.uid||x.id,n:(x.rank+" "+lastOf(x)).trim(),full:x.rank+" "+x.name,sec:x.sec}));
  else if(f&&Array.isArray(f.names))L=f.names.map(x=>({id:x.i,n:(x.r+" "+String(x.n).split(",")[0]).trim(),full:x.r+" "+x.n,sec:x.s}));
  return L.filter(x=>!m||String(x.id)!==String(m.id))}
let keyBusy=false;
async function ensureKey(){const f=team(),m=me();if(!f||!m||!J())return null;const K=S.pmKey;
  if(K&&K.feed===f.id&&K.mid===m.id&&K.ok)return K;if(keyBusy)return null;keyBusy=true;
  try{let k=K&&K.feed===f.id&&K.mid===m.id?K:null;if(!k){const kp=await J().genKP();k={feed:f.id,mid:m.id,mh:await mhOf(f,m.id),pub:kp.pub,priv:kp.priv,tok:b64url(crypto.getRandomValues(new Uint8Array(24)))}}
    await SB.rpc("pm_key_put",{p_feed:f.id,p_key:tkey(f),p_mh:k.mh,p_pub:k.pub,p_tok:k.tok});k.ok=1;k.err="";S.pmKey=k;rawSave();return k}
  catch(e){const t=String(e.message||e);if(S.pmKey)S.pmKey.err=/taken/.test(t)?"Someone else already claimed this name on Messages. Check you picked your own name.":t.slice(0,80);else S.pmKey={err:t.slice(0,80)};rawSave();return null}
  finally{keyBusy=false}}
const rid=n=>[...crypto.getRandomValues(new Uint8Array(n))].map(x=>"abcdefghijklmnopqrstuvwxyz0123456789"[x%36]).join("");
const rkey=()=>b64url(crypto.getRandomValues(new Uint8Array(24)));
async function startThread(p){const f=team(),m=me();const K=await ensureKey();if(!f||!m||!K)throw new Error((S.pmKey&&S.pmKey.err)||"Pick your own name first.");
  const ex=Object.values(PM().th).find(t=>String(t.with.id)===String(p.id));if(ex)return ex;
  const rows=await SB.rpc("pm_key_get",{p_feed:f.id,p_key:tkey(f),p_mh:await mhOf(f,p.id)});const pub=rows&&rows[0]&&rows[0].pub;
  if(!pub)throw new Error(p.n+" isn't on Messages yet. They need the app (4.128 or later) and to pick their name.");
  const t={id:rid(20),k:rkey(),ib:rkey(),ek:b64url(crypto.getRandomValues(new Uint8Array(32))),with:{id:String(p.id),n:p.n},msgs:[],after:0,seen:0,theirRead:0,at:Date.now()};
  await SB.rpc("dm_open",{p_id:t.id,p_key:t.k,p_inbox:t.ib});
  await SB.rpc("pm_inv_send",{p_feed:f.id,p_key:tkey(f),p_to:await mhOf(f,p.id),p_ct:await J().sealTo(pub,{v:1,id:t.id,k:t.k,ek:t.ek,from:{id:String(m.id),n:m.n}})});
  PM().th[t.id]=t;save();return t}
/* invites for me (new threads someone started) */
let invBusy=false;
async function pullInv(){const f=team(),K=S.pmKey;if(invBusy||!f||!K||!K.ok||K.feed!==f.id)return;invBusy=true;
  try{const rows=await SB.rpc("pm_inv_get",{p_feed:f.id,p_mh:K.mh,p_tok:K.tok,p_after:PM().invAfter||0})||[];let ch=false;
    for(const r of rows){PM().invAfter=Math.max(PM().invAfter||0,+r.id);const o=await J().openSealed(K.priv,r.ct);if(!o||!o.id||PM().th[o.id])continue;
      PM().th[o.id]={id:String(o.id).slice(0,32),k:String(o.k),ib:"",ek:String(o.ek),with:{id:String(o.from&&o.from.id||""),n:String(o.from&&o.from.n||"Someone").slice(0,30)},msgs:[],after:0,seen:0,theirRead:0,at:Date.parse(r.created_at)||Date.now()};ch=true}
    if(rows.length||ch)rawSave()}catch(e){}finally{invBusy=false}}
async function pull(t){try{const rows=await SB.rpc("dm_get",{p_id:t.id,p_key:t.k,p_after:t.after||0})||[];const m=me();let ch=false;
  for(const r of rows){t.after=Math.max(t.after,+r.id);const o=await fdDec(t.ek,r.ct);if(!o)continue;
    if(o.r){if(String(o.by)!==String(m&&m.id))t.theirRead=Math.max(t.theirRead||0,+o.r||0),t.theirReadAt=+o.t||Date.now();ch=true;continue}
    if(t.msgs.some(x=>x.id===+r.id))continue;t.msgs.push({id:+r.id,by:String(o.by||""),txt:String(o.txt||"").slice(0,2000),t:+o.t||Date.parse(r.created_at)||Date.now()});ch=true}
  if(ch){t.msgs=t.msgs.slice(-300);rawSave()}return ch}catch(e){return false}}
async function send(t,txt){const m=me();txt=String(txt||"").trim().slice(0,2000);if(!txt||!m)return false;
  const o={by:String(m.id),txt,t:Date.now()};const id=+(await SB.rpc("dm_send",{p_id:t.id,p_key:t.k,p_ct:await fdEnc(t.ek,o)}));
  t.msgs.push({id,by:o.by,txt,t:o.t});t.after=Math.max(t.after,id);t.seen=Math.max(t.seen,id);save();return true}
async function receipt(t){const m=me();if(!m)return;const last=Math.max(0,...t.msgs.filter(x=>x.by!==String(m.id)).map(x=>x.id));if(!last||last<=(t.sentRead||0))return;
  t.sentRead=last;try{await SB.rpc("dm_send",{p_id:t.id,p_key:t.k,p_ct:await fdEnc(t.ek,{r:last,by:String(m.id),t:Date.now()})})}catch(e){}}
function unread(t){const m=me();return t.msgs.filter(x=>x.id>(t.seen||0)&&x.by!==String(m&&m.id)).length}
window.pmUnread=()=>Object.values(PM().th).reduce((a,t)=>a+unread(t),0);
Object.assign(window,{pmStart:startThread,pmSend:send,pmPull:pull,pmPullInv:pullInv,pmEnsureKey:ensureKey,pmMe:me});

/* ---------- screens ---------- */
let cur="",pickQ="",picking=false,msg="";
const hhmm=t=>{const d=new Date(t);return String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0")};
const css=`#pmWrap .pm-list{display:flex;flex-direction:column;gap:4px;padding:6px 0 90px}
#pmWrap .pmb{max-width:78%;padding:8px 12px;border-radius:18px;line-height:1.35;word-wrap:break-word;white-space:pre-wrap}
#pmWrap .pm-me{align-self:flex-end;background:#0a84ff;color:#fff;border-bottom-right-radius:6px}
#pmWrap .pm-them{align-self:flex-start;background:var(--line,#e5e5ea);color:var(--ink);border-bottom-left-radius:6px}
#pmWrap .pm-t{font-size:11px;color:var(--muted);margin:0 6px 4px}#pmWrap .pm-t.me{align-self:flex-end}#pmWrap .pm-t.them{align-self:flex-start}
#pmWrap .pm-form{position:sticky;bottom:calc(70px + env(safe-area-inset-bottom,0px));display:flex;gap:8px;background:var(--bg);padding:8px 0}
#pmWrap .pm-form input{flex:1;border-radius:20px;padding:10px 14px;border:1px solid var(--line)}`;
{const st=document.createElement("style");st.textContent=css;document.head.appendChild(st)}
function listHTML(){const ths=Object.values(PM().th).sort((a,b)=>(b.msgs.length?b.msgs[b.msgs.length-1].t:b.at)-(a.msgs.length?a.msgs[a.msgs.length-1].t:a.at));const m=me();
  if(!team())return `<div class="panel"><p class="note">Messages work once you're on a team's Word of Mouth.</p></div>`;
  if(!m)return `<div class="panel"><b>Who are you?</b><p class="note">Pick your own name on the roster first, so people know who's writing.</p>${own()?`<div class="alist">${people().slice(0,300).map(p=>`<button class="btn alt" data-pmme="${esc(p.id)}" style="width:100%;text-align:left;margin:2px 0">${esc(p.full)}</button>`).join("")}</div>`:`<button class="btn" id="whoGo">Pick my name</button>`}</div>`;
  if(picking){const q=pickQ.toLowerCase();const L=people().filter(p=>!q||p.full.toLowerCase().includes(q)).slice(0,300);
    return `<div class="panel"><b>Message someone</b><input id="pmQ" type="search" placeholder="Search names" value="${esc(pickQ)}" autocomplete="off"><div id="pmPick" style="max-height:52vh;overflow:auto">${L.map(p=>`<button class="btn alt" data-pmto="${esc(p.id)}" style="width:100%;text-align:left;margin:2px 0"><b>${esc(p.n)}</b> <span class="note" style="margin:0">${esc(p.sec||"")}</span></button>`).join("")||`<p class="note">No one by that name.</p>`}</div><button class="btn alt" id="pmCancel">Cancel</button><p class="note" role="status" id="pmOut">${esc(msg)}</p></div>`}
  return `<button class="btn" id="pmNew" style="width:100%">✉️ Message someone</button><p class="note" role="status" id="pmOut">${esc(msg||((S.pmKey&&S.pmKey.err)||""))}</p>
    ${ths.length?`<div class="alist">${ths.map(t=>{const u=unread(t),l=t.msgs[t.msgs.length-1];return `<button class="rrow" data-pmopen="${esc(t.id)}" style="width:100%;text-align:left;--sc:var(${u?"--brass":"--line"})"><div class="who"><b>${esc(t.with.n)}</b>${u?` <span class="chip">${u} new</span>`:""}<div class="ph">${l?esc((l.by===String(m.id)?"You: ":"")+l.txt.slice(0,70))+" · "+esc(ago(l.t)):"No messages yet"}</div></div></button>`}).join("")}</div>`
      :`<div class="panel"><p class="note">No conversations yet. Only you and the person you write to can read a conversation, not your leader and not the server.</p></div>`}`}
function threadHTML(t){const m=me();const mine=x=>x.by===String(m&&m.id);const lastMine=[...t.msgs].reverse().find(mine);
  const rows=t.msgs.map(x=>{const a=mine(x);const tail=a&&lastMine&&x.id===lastMine.id?(t.theirRead>=x.id?"Read "+hhmm(t.theirReadAt||x.t):"Sent "+hhmm(x.t)):hhmm(x.t);
    return `<div class="pmb ${a?"pm-me":"pm-them"}" data-pmmsg="${x.id}">${esc(x.txt)}</div><div class="pm-t ${a?"me":"them"}"${a&&lastMine&&x.id===lastMine.id?' id="pmStatus"':""}>${esc(tail)}</div>`}).join("");
  return `<div class="rtop" style="margin:10px 0"><button class="chip" id="pmBack" style="cursor:pointer">‹ Messages</button><b style="flex:1;text-align:center">${esc(t.with.n)}</b><span class="note" style="margin:0" title="Only the two of you can read this">🔒</span></div>
    <div class="pm-list" id="pmList">${rows||`<p class="note" style="text-align:center">Say hello. Only ${esc(t.with.n)} and you can read this.</p>`}</div>
    <form class="pm-form" id="pmForm"><input id="pmIn" type="text" placeholder="Message ${esc(t.with.n)}" autocomplete="off" maxlength="2000" aria-label="Message"><button class="btn" style="width:auto;margin:0">Send</button></form>`}
function screen(){const t=cur&&PM().th[cur];if(t){t.seen=Math.max(t.seen||0,...t.msgs.map(x=>x.id),0);setTimeout(()=>receipt(t),0)}
  const seg=typeof window.chatSeg==="function"&&!(typeof memberMode==="function"&&memberMode())?`<div style="display:flex;justify-content:center;margin:2px 0 12px">${window.chatSeg("pm")}</div>`:"";
  return `<div id="pmWrap">${t?threadHTML(t):seg+`<div class="sechead" style="margin-top:6px"><h2>Messages</h2></div>`+listHTML()}</div>`}
{const _r=render;render=function(){if(typeof view!=="undefined"&&view==="pm"){try{renderTabs()}catch(e){}$("#main").innerHTML=screen();const l=document.getElementById("pmList");if(l)window.scrollTo(0,document.body.scrollHeight);return}return _r.apply(this,arguments)}}
function redraw(){if(view!=="pm")return;const a=document.activeElement&&document.activeElement.id;const v=a==="pmIn"?document.getElementById("pmIn").value:null;render();if(v!==null){const i=document.getElementById("pmIn");if(i){i.value=v;i.focus()}}}
window.pmOpen=id=>{cur=id;view="pm";render()};
document.addEventListener("click",e=>{const t=e.target;if(!t||!t.closest)return;
  if(t.closest("#pmNew")){e.stopImmediatePropagation();picking=true;msg="";ensureKey();redraw();return}
  if(t.closest("#pmCancel")){e.stopImmediatePropagation();picking=false;msg="";redraw();return}
  if(t.closest("#pmBack")){e.stopImmediatePropagation();cur="";redraw();return}
  const mm=t.closest("[data-pmme]");if(mm){e.stopImmediatePropagation();const p=people().find(x=>String(x.id)===mm.dataset.pmme)||(S.roster||[]).map(x=>({id:x.id,n:x.rank+" "+lastOf(x)})).find(x=>String(x.id)===mm.dataset.pmme);if(p){S.pmMe={id:String(p.id),n:p.n};save();ensureKey().then(redraw)}return}
  const to=t.closest("[data-pmto]");if(to){e.stopImmediatePropagation();const p=people().find(x=>String(x.id)===to.dataset.pmto);if(!p)return;msg="Opening…";redraw();
    startThread(p).then(th=>{picking=false;msg="";cur=th.id;redraw()}).catch(err=>{msg=String(err.message||err).slice(0,140);redraw()});return}
  const op=t.closest("[data-pmopen]");if(op){e.stopImmediatePropagation();cur=op.dataset.pmopen;redraw();const th=PM().th[cur];if(th)pull(th).then(c=>{if(c)redraw()});return}},true);
document.addEventListener("input",e=>{if(e.target&&e.target.id==="pmQ"){pickQ=e.target.value;const y=e.target.selectionStart;redraw();const q=document.getElementById("pmQ");if(q){q.focus();try{q.setSelectionRange(y,y)}catch(x){}}}});
document.addEventListener("submit",e=>{if(!e.target||e.target.id!=="pmForm")return;e.preventDefault();const i=document.getElementById("pmIn");const th=PM().th[cur];if(!i||!th)return;const v=i.value;if(!v.trim())return;i.value="";
  send(th,v).then(()=>redraw()).catch(()=>{i.value=v;toast("Couldn't send. Check your connection.")})},true);
/* keep it fresh while the app is open: the open thread every 4 s, the rest every minute */
let tick=0;setInterval(()=>{if(document.hidden||!team())return;tick++;
  if(view==="pm"&&cur&&PM().th[cur]){pull(PM().th[cur]).then(c=>{if(c)redraw()})}
  if(tick%15===0){ensureKey().then(()=>pullInv()).then(()=>Promise.all(Object.values(PM().th).map(pull))).then(()=>{if(view==="pm")redraw()})}},4000);
setTimeout(()=>{ensureKey().then(()=>pullInv())},4000);

/* ---------- My page: Official channel, Voice, Messages as cards ---------- */
function cards(){const o=typeof window.officialUnread==="function"?window.officialUnread():0,v=typeof window.talkUnread==="function"?window.talkUnread():0,p=window.pmUnread();
  const C=(k,ic,t,s,n)=>`<button class="panel" data-afcard="${k}" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;cursor:pointer;margin:8px 0"><span style="font-size:26px" aria-hidden="true">${ic}</span><span style="flex:1;min-width:0"><b>${t}</b><span class="note" style="display:block;margin:0">${s}</span></span>${n?`<span class="chip" style="color:var(--warn)">${n} new</span>`:""}</button>`;
  return `<div id="afCards">${C("official","📣","Official channel","Updates from the app's official channel",o)}${C("voice","📻","Voice inbox","Push-to-talk voice messages",v)}${C("pm","✉️","Messages","Message someone, just the two of you",p)}</div>`}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{if((view==="me"||view==="today")&&!document.getElementById("afCards")){const m=$("#main");if(m)m.insertAdjacentHTML("beforeend",cards())}}catch(e){}return r}}
document.addEventListener("click",e=>{const c=e.target.closest&&e.target.closest("[data-afcard]");if(!c)return;e.stopImmediatePropagation();const k=c.dataset.afcard;armed=null;
  if(k==="official"){if(typeof window.officialEnter==="function")window.officialEnter();view="official";render();window.scrollTo(0,0);if(window.officialPull)window.officialPull(true);return}
  if(k==="voice"){view="talk";render();window.scrollTo(0,0);return}
  if(k==="pm"){cur="";view="pm";render();window.scrollTo(0,0)}},true);

/* ---------- Feed: the read-only archive of the old team chat ---------- */
{const _rf=renderFeed;renderFeed=function(){const r=_rf.apply(this,arguments);try{const f=typeof fdCur==="function"?fdCur():null;const L=typeof window.chatArchive==="function"&&f?window.chatArchive(f):[];
  if(L.length&&!document.getElementById("chArc")){const m=$("#main");if(m)m.insertAdjacentHTML("beforeend",`<details class="panel" id="chArc"><summary><b>Earlier team chat</b> · ${L.length} message${L.length===1?"":"s"} (read-only)</summary>
    <p class="note">Team chat is retired. Post in Feed, or use Messages to write to one person.</p>${L.slice(-200).map(x=>`<div class="note" style="margin:4px 0"><b>${esc(x.by)}</b> · ${esc(ago(x.t))}<br>${esc(x.tx)}</div>`).join("")}</details>`)}}catch(e){}return r}}
if(typeof SC==="object"&&Array.isArray(SC))SC.push({k:"pm",n:"4.128: Message someone",f:["54_messages"],t:[["pm_key_get",{p_feed:"zz",p_key:"x",p_mh:"0".repeat(64)}]]});
})();
