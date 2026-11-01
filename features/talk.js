/* Accounted For 4.67.0 — Talk: push-to-talk voice for your Feed.
   Hold the big button, speak, let go: the clip goes to everyone in the group you picked. A group is a shared channel:
   everyone in it hears everyone else. Talk has an on/off switch (off = nothing plays and you can't send; clips
   still land in the log). A radio icon sits by the name of anyone who has Talk on.
   Everything (voice, groups, who has Talk on, "heard by" receipts) is encrypted with the Feed key before it leaves
   the phone, so the server only stores ciphertext for 3 days. Needs supabase/setup/38_talk.sql.
   Talk works while the app is open: it is not a background phone call. */
(()=>{
const MAXS=60,MINMS=450,STALE=15*60e3,BEAT=5*60e3,LOGMAX=100;
const tk=()=>{if(!S.talk||typeof S.talk!=="object")S.talk={on:false,sel:"all"};return S.talk};
const logs=()=>{S.talkLog=Array.isArray(S.talkLog)?S.talkLog:[];return S.talkLog};
/* messages you delete are remembered here (on this phone only) so a later poll doesn't bring them back */
const hid=()=>{S.talkHid=Array.isArray(S.talkHid)?S.talkHid:[];return S.talkHid};
const hk=(f,id)=>f.id+":"+id;
const isHid=(f,id)=>hid().includes(hk(f,id));
const feed=()=>{const l=(S.feeds||[]);return (typeof fdCur==="function"&&fdCur())||l[0]||null};
const me=f=>String(typeof fdBy==="function"?fdBy(f):(S.myName||"ME")).toUpperCase().slice(0,30);
const RADIO=sz=>`<svg class="tk-ic" width="${sz||14}" height="${sz||14}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19.1 4.9a10 10 0 0 1 0 14.2M4.9 19.1a10 10 0 0 1 0-14.2"/></svg>`;
if(typeof IC==="object")IC.talk='<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19.1 4.9a10 10 0 0 1 0 14.2M4.9 19.1a10 10 0 0 1 0-14.2"/>';

/* ---------- per-feed state (in memory; the server holds the last 3 days) ---------- */
const ST={};
const st=f=>ST[f.id]=ST[f.id]||{after:0,msgs:new Map(),groups:new Map(),pres:new Map(),rc:new Map(),del:new Map(),init:false,beat:0,watch:false,busy:false};
const ui={rec:null,note:"",newg:false,gname:"",gpick:new Map(),playing:"",q:[],last:null,dirty:false,err:"",open:"",drag:false,swiped:false};
let audio=null,unlocked=false;

/* ---------- who is listening ---------- */
const listening=f=>{const s=st(f),now=Date.now(),me0=me(f),out=[];
  for(const [n,p] of s.pres)if(n!==me0&&p.on&&now-p.t<STALE)out.push(n);
  if(tk().on)out.push(me0);return out};
const isOn=(f,n)=>{if(n===me(f))return !!tk().on;const p=st(f).pres.get(n);return !!(p&&p.on&&Date.now()-p.t<STALE)};
window.talkPeople=f=>people(f);
window.talkIsOn=n=>{const f=feed();return !!(f&&n&&isOn(f,String(n).toUpperCase().slice(0,30)))};
const mySec=f=>String(f.sec||"").toUpperCase().slice(0,12);
const mineH=f=>f.meH||[];
/* a person is {n:name, w:[hashes of the name's words], s:section}. Name or hashes can match (the same way Feed posts to one person work) */
const match=(e,by,w)=>e.n===by||(Array.isArray(e.w)&&e.w.length>0&&Array.isArray(w)&&e.w.every(h=>w.includes(h)));
const entryMe=(f,e)=>match(e,me(f),mineH(f));
const entryOn=(f,e)=>{if(entryMe(f,e))return !!tk().on;const now=Date.now();for(const [n,p] of st(f).pres)if(p.on&&now-p.t<STALE&&match(e,n,p.w))return true;return false};
const secOf=(f,e)=>e.s||(entryMe(f,e)?mySec(f):"")||String((st(f).pres.get(e.n)||{}).s||"");
/* everyone: roster people (leaders and anyone with a roster) plus anyone who has opened Talk */
const people=f=>{const s=st(f),out=[],seen=new Set();
  const add=e=>{if(!e||!e.n||seen.has(e.n))return;if(out.some(x=>x.w&&x.w.length&&e.w&&e.w.length&&x.w.length===e.w.length&&x.w.every(h=>e.w.includes(h))))return;seen.add(e.n);out.push(e)};
  for(const e of rosterOf(f))add(e);
  for(const [n,p] of s.pres)add({n,w:p.w||[],s:p.s||""});
  add({n:me(f),w:mineH(f),s:mySec(f)});
  return out.sort((a,b)=>a.n.localeCompare(b.n))};
const secs=f=>[...new Set(people(f).map(e=>secOf(f,e)).filter(Boolean))].sort();
const groupsOf=f=>[...st(f).groups.values()].filter(g=>!g.x&&(f.lk||g.m.some(e=>entryMe(f,e)))).sort((a,b)=>a.n.localeCompare(b.n));
const targets=(f,g)=>{if(g==="all")return people(f);if(g.startsWith("sec:")){const c=g.slice(4);return people(f).filter(e=>secOf(f,e)===c)}const G=st(f).groups.get(g);return G&&!G.x?G.m.slice():people(f)};
const forMe=(f,m)=>m.g==="all"||(m.g.startsWith("sec:")?m.g.slice(4)===mySec(f)||targets(f,m.g).some(e=>entryMe(f,e)):targets(f,m.g).some(e=>entryMe(f,e)));
/* roster -> people with name hashes (hashing is async, so it fills in a moment after the screen opens) */
function rosterOf(f){const s=st(f);if(S.source==="sample"||!Array.isArray(S.roster)||!S.roster.length||!SB.words||!SB.h)return [];
  const key=S.roster.length+":"+f.id;if(s.rkey===key)return s.rost||[];
  if(!s.rbusy){s.rbusy=true;const R=S.roster.slice(0,400);
    Promise.all(R.map(async m=>{const n=String(m.rank||"")+" "+(typeof lastOf==="function"?lastOf(m):String(m.name||"").split(",")[0].trim().toUpperCase());const nn=n.trim().toUpperCase().slice(0,30);
      return {n:nn,w:await Promise.all(SB.words(nn).map(w=>SB.h(f.id,w))),s:String(m.sec||"").toUpperCase().slice(0,12)}}))
      .then(L=>{s.rost=L;s.rkey=key;s.rbusy=false;if(view==="talk"&&!ui.rec&&!(document.activeElement&&document.activeElement.id==="tkGN"))draw()}).catch(()=>{s.rbusy=false})}
  return s.rost||[]}
/* ---------- talking to the server ---------- */
async function put(f,o){const ct=await fdEnc(f.ek,o);const id=await SB.rpc("talk_send",{p_feed:f.id,p_key:f.mk,p_ct:ct});
  try{if(SB.topic&&SB.pingTopic)SB.topic("p_talk",f.id).then(t=>SB.pingTopic(t,"p_talk")).catch(()=>{})}catch(e){}return +id}
const sendPres=f=>{const s=st(f);s.beat=Date.now();return put(f,{k:"p",by:me(f),on:!!tk().on,t:Date.now(),s:mySec(f),w:mineH(f)}).catch(()=>{})};
async function poll(f){const s=st(f);if(s.busy||!f.mk||!f.ek)return;s.busy=true;let fresh=0;
  try{const rows=await SB.rpc("talk_get",{p_feed:f.id,p_key:f.mk,p_after:s.after});
    for(const r of [...(rows||[])].sort((a,b)=>a.id-b.id)){s.after=Math.max(s.after,+r.id);const o=await fdDec(f.ek,r.ct);if(!o||!o.k)continue;const id=+r.id,t=Date.parse(r.created_at)||o.t||Date.now();
      if(o.k==="p"&&o.by){const cur=s.pres.get(String(o.by));if(!cur||t>=cur.t)s.pres.set(String(o.by).slice(0,30),{on:!!o.on,t:Math.min(Date.now(),Math.max(t,0)),s:String(o.s||"").slice(0,12),w:Array.isArray(o.w)?o.w.slice(0,6).map(String):[]})}
      else if(o.k==="g"&&o.id){const cur=s.groups.get(o.id);if(!cur||id>=cur.rid)s.groups.set(String(o.id).slice(0,20),{id:String(o.id).slice(0,20),n:String(o.n||"Group").slice(0,24),m:(Array.isArray(o.m)?o.m:[]).map(x=>typeof x==="string"?{n:x.toUpperCase().slice(0,30),w:[],s:""}:{n:String(x.n||"").toUpperCase().slice(0,30),w:Array.isArray(x.w)?x.w.slice(0,6).map(String):[],s:String(x.s||"").slice(0,12)}).filter(e=>e.n).slice(0,200),x:!!o.x,rid:id})}
      else if(o.k==="h"&&o.m){let a=s.rc.get(+o.m);if(!a)s.rc.set(+o.m,a=[]);a.push({by:String(o.by),w:Array.isArray(o.w)?o.w.map(String):[]})}
      else if(o.k==="x"&&o.m){const mid=+o.m,by=String(o.by||"").slice(0,30),l=!!o.l;s.del.set(mid,{by,l});const cur=s.msgs.get(mid)||logs().find(x=>x.f===f.id&&x.id===mid);if(cur&&(l||cur.by===by)){dropMsg(f,mid);fresh++}}
      else if(o.k==="v"&&o.a&&!s.msgs.has(id)&&!isHid(f,id)&&!((d=>d&&(d.l||d.by===String(o.by||"?").slice(0,30)))(s.del.get(id)))){const m={id,by:String(o.by||"?").slice(0,30),g:String(o.g||"all"),t:o.t||t,d:+o.d||0,tx:String(o.tx||"").slice(0,400),mt:String(o.mt||"audio/mp4"),a:o.a,seen:s.init};s.msgs.set(id,m);fresh++;
        if(!isHid(f,id)&&!logs().some(x=>x.f===f.id&&x.id===id)){logs().unshift({f:f.id,id,by:m.by,g:m.g,t:m.t,d:m.d,tx:m.tx});if(logs().length>LOGMAX)logs().length=LOGMAX}}}
    for(const m of s.msgs.values())if(m.seen===true&&!m.did){m.did=1;incoming(f,m)}
    for(const m of s.msgs.values())if(m.seen===false)m.seen=true;
    if(!s.init){s.init=true;for(const m of s.msgs.values())m.did=1}
    if(fresh)save();
    if(view==="talk"){if(ui.rec||ui.drag)ui.dirty=true;else draw()}
    decorate()}catch(e){ui.err=String(e&&e.message||e).slice(0,80)}finally{s.busy=false}}
/* a clip from another phone just arrived */
function incoming(f,m){if(m.by===me(f)||!forMe(f,m))return;
  if(!tk().on)return;                                   /* Talk off: it stays in the log, nothing plays, no receipt */
  if(Date.now()-m.t<2*60e3){put(f,{k:"h",m:m.id,by:me(f),w:mineH(f)}).catch(()=>{});queue(f,m)}}

/* ---------- playing ---------- */
function blobURL(m){if(m.url)return m.url;try{const bin=atob(m.a),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);m.url=URL.createObjectURL(new Blob([u],{type:m.mt}));return m.url}catch(e){return ""}}
function queue(f,m){ui.q.push({f,m});next()}
function next(){if(ui.playing||ui.rec||!ui.q.length)return;const {f,m}=ui.q.shift();play(f,m)}
function play(f,m){const u=blobURL(m);if(!u){toast("Couldn't play that clip.");return}
  if(!audio)audio=new Audio();audio.pause();audio.src=u;ui.playing=f.id+":"+m.id;
  audio.onended=audio.onerror=()=>{ui.playing="";if(view==="talk")draw();next()};
  audio.ontimeupdate=()=>{const el=document.querySelector(`[data-tkm="${m.id}"] .tk-wave`);if(el&&audio.duration){const k=Math.round(audio.currentTime/audio.duration*el.children.length);[...el.children].forEach((b,i)=>b.classList.toggle("on",i<k))}};
  const p=audio.play();if(p&&p.catch)p.catch(()=>{ui.playing="";toast("Tap play to hear it (the phone blocked auto-play).");if(view==="talk")draw()});
  if(view==="talk")draw()}
function unlock(){if(unlocked)return;unlocked=true;try{if(!audio)audio=new Audio();audio.src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";const p=audio.play();if(p&&p.catch)p.catch(()=>{})}catch(e){}}

/* ---------- recording ---------- */
const MIMES=["audio/mp4","audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus"];
async function startRec(){const f=feed();if(!f||ui.rec||!tk().on)return;unlock();
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||typeof MediaRecorder==="undefined"){toast("This phone can't record voice in the app.");return}
  const r={t0:Date.now(),chunks:[],stop:false,tx:"",f,g:tk().sel};ui.rec=r;
  try{if(audio)audio.pause();ui.playing="";ui.q=[];
    r.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
    if(r.stop){r.stream.getTracks().forEach(t=>t.stop());ui.rec=null;return}                 /* let go before the mic opened */
    const mt=MIMES.find(m=>{try{return MediaRecorder.isTypeSupported(m)}catch(e){return false}})||"";
    r.mr=new MediaRecorder(r.stream,Object.assign({audioBitsPerSecond:24000},mt?{mimeType:mt}:{}));r.mt=r.mr.mimeType||mt||"audio/mp4";
    r.mr.ondataavailable=e=>{if(e.data&&e.data.size)r.chunks.push(e.data)};
    r.mr.onstop=()=>done(r);r.mr.start();r.t0=Date.now();
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(SR){try{const sr=new SR();sr.continuous=true;sr.interimResults=false;sr.lang=navigator.language||"en-US";sr.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal)r.tx+=e.results[i][0].transcript+" "};sr.onerror=()=>{};sr.start();r.sr=sr}catch(e){}}
    beat(f,"rec");r.cap=setTimeout(()=>stopRec(),MAXS*1e3);r.tick=setInterval(()=>tickUI(),200);paintRec(true);try{navigator.vibrate&&navigator.vibrate(15)}catch(e){}
  }catch(e){ui.rec=null;paintRec(false);toast(/denied|NotAllowed/i.test(String(e&&e.name||e))?"Allow the microphone to use Talk.":"Couldn't open the microphone.")}}
function stopRec(){const r=ui.rec;if(!r)return;r.stop=true;if(!r.mr||r.mr.state==="inactive")return;clearTimeout(r.cap);clearInterval(r.tick);try{r.sr&&r.sr.stop()}catch(e){}try{r.mr.stop()}catch(e){}r.stream&&r.stream.getTracks().forEach(t=>t.stop())}
function toB64(blob){return new Promise((ok,no)=>{const fr=new FileReader();fr.onload=()=>ok(String(fr.result).split(",")[1]||"");fr.onerror=()=>no(fr.error);fr.readAsDataURL(blob)})}
async function done(r){const ms=Date.now()-r.t0;ui.rec=null;paintRec(false);beat(r.f,"on");
  if(ms<MINMS){toast("Hold the button while you talk.");finish();return}
  const f=r.f,s=st(f);try{const blob=new Blob(r.chunks,{type:r.mt});const a=await toB64(blob);
    const o={k:"v",by:me(f),g:r.g,d:Math.max(1,Math.round(ms/1e3)),tx:r.tx.trim().slice(0,400),mt:r.mt,a,t:Date.now()};
    ui.note="Sending…";draw();
    const id=await put(f,o);const m={id,by:o.by,g:o.g,t:o.t,d:o.d,tx:o.tx,mt:o.mt,a,seen:true,did:1};s.msgs.set(id,m);
    s.after=Math.max(s.after,id);logs().unshift({f:f.id,id,by:m.by,g:m.g,t:m.t,d:m.d,tx:m.tx});if(logs().length>LOGMAX)logs().length=LOGMAX;save();
    ui.last={id,g:o.g,t:Date.now()};ui.note="";
    if(typeof actAdd==="function")actAdd("📻","Talk: sent to "+gname(f,o.g),"talk")}
  catch(e){ui.note="";toast(/not allowed|PGRST|404|talk_send/i.test(String(e&&e.message||e))?"Talk isn't set up on the server yet (run part 38).":"Couldn't send. Check your connection.")}
  finish()}
function finish(){if(ui.dirty){ui.dirty=false}beat(feed(),"on");draw();next()}

/* ---------- online, recording, live location (rides on AFS signals) ---------- */
const ONLINE=150e3,REC_FRESH=20e3;
const liveOf=(f,n)=>{for(const r of AFS.all(f,"live")){const o=r.o;if(o&&o.by===n)return {st:o.st,t:Math.max(r.t,0)}}return null};
const online=(f,e)=>{if(entryMe(f,e))return !!tk().on;const now=Date.now();for(const r of AFS.all(f,"live")){const o=r.o;if(o&&o.st!=="off"&&now-r.t<ONLINE&&match(e,o.by,o.w))return true}return false};
const lastSeen=(f,e)=>{let t=0;for(const r of AFS.all(f,"live")){const o=r.o;if(o&&match(e,o.by,o.w))t=Math.max(t,r.t)}return t};
const recorders=f=>{const now=Date.now(),out=[];for(const r of AFS.all(f,"live")){const o=r.o;if(o&&o.st==="rec"&&o.by!==me(f)&&now-r.t<REC_FRESH)out.push(o.by)}return out};
const beat=(f,stt)=>{if(!f||!tk().on)return;AFS.put(f,"live",me(f),{by:me(f),st:stt||"on",t:Date.now(),w:mineH(f)})};
const hhmm=t=>{const d=new Date(t);return String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0")};
let geo={id:null,last:0,pos:null};
const sharing=()=>tk().locUntil&&tk().locUntil>Date.now();
function locStart(f,mins){tk().locUntil=Date.now()+mins*60e3;save();watchPos(f);draw()}
function watchPos(f){if(geo.id!==null||!navigator.geolocation||!sharing())return;
  geo.id=navigator.geolocation.watchPosition(p=>{geo.pos=p.coords;const now=Date.now();
    if(!sharing()){locStop(f,true);return}
    if(now-geo.last<20e3)return;geo.last=now;
    AFS.put(f,"loc",me(f),{by:me(f),lat:+p.coords.latitude.toFixed(5),lon:+p.coords.longitude.toFixed(5),acc:Math.round(p.coords.accuracy||0),t:now,until:tk().locUntil,w:mineH(f)}).then(()=>{if(view==="talk"&&!ui.rec)draw()})},
    e=>{if(e&&e.code===1){toast("Location is turned off for this app. Allow it in Settings.");locStop(f)}},{enableHighAccuracy:true,maximumAge:10e3,timeout:30e3})}
function locStop(f,quiet){if(geo.id!==null){try{navigator.geolocation.clearWatch(geo.id)}catch(e){}geo.id=null}
  const was=tk().locUntil;tk().locUntil=0;save();if(was&&f)AFS.put(f,"loc",me(f),{by:me(f),off:1,t:Date.now()});if(!quiet)draw()}
const dist=(a,b)=>{const R=6371e3,rad=x=>x*Math.PI/180,dl=rad(b.lat-a.lat),dn=rad(b.lon-a.lon),q=Math.sin(dl/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(q))};
const fmtD=m=>m<1000?Math.round(m/10)*10+" m":(m/1609.34).toFixed(1)+" mi";
function locCard(f){const now=Date.now(),mine=sharing();
  const others=AFS.all(f,"loc").map(r=>r.o).filter(o=>o&&!o.off&&o.by!==me(f)&&o.until>now&&now-o.t<30*60e3).sort((a,b)=>a.by.localeCompare(b.by));
  const me0=geo.pos?{lat:geo.pos.latitude,lon:geo.pos.longitude}:null;
  return `<div class="tk-card" id="tkLoc"><b>Live location</b>
    ${mine?`<p class="tk-note" style="margin:4px 0 8px">You're sharing · ${Math.max(1,Math.ceil((tk().locUntil-now)/60e3))} min left. Everyone in this Feed can see where you are.</p><button class="btn alt" id="tkLocStop" style="width:100%">Stop sharing</button>`
    :`<p class="tk-note" style="margin:4px 0 8px">Share where you are with this Feed. Updates while the app is open. You can stop any time.</p><div class="tk-row"><button class="btn alt" data-tkloc="15">15 min</button><button class="btn alt" data-tkloc="60">1 hour</button><button class="btn alt" data-tkloc="480">8 hours</button></div>`}
    ${others.map(o=>{const d=me0?fmtD(dist(me0,o))+" away · ":"";return `<div class="tk-lr">${av(f,o.by,36)}<div class="tk-who"><b>${esc(o.by)}</b><small>${d}updated ${esc(hhmm(o.t))} · ${Math.max(1,Math.ceil((o.until-now)/60e3))} min left</small></div><a class="tk-map" href="https://maps.apple.com/?ll=${o.lat},${o.lon}&q=${encodeURIComponent(o.by)}" target="_blank" rel="noopener">Map</a></div>`}).join("")}</div>`}
document.addEventListener("click",e=>{const t=e.target;if(!t.closest||view!=="talk")return;const f=feed();if(!f)return;
  const l=t.closest("[data-tkloc]");if(l){if(!navigator.geolocation){toast("Location isn't available on this device.");return}locStart(f,+l.dataset.tkloc);return}
  if(t.closest("#tkLocStop")){locStop(f);return}});
setInterval(()=>{const f=feed();if(!f)return;if(tk().locUntil&&!sharing())locStop(f);if(!document.hidden)beat(f,ui.rec?"rec":"on")},60e3);
AFS.onChange(()=>{if(view==="talk"&&!ui.rec)draw()});
setTimeout(()=>{const f=feed();if(f&&sharing())watchPos(f);if(f)beat(f)},3500);

/* ---------- screen ---------- */
const gname=(f,g)=>g==="all"?"Everyone":g.startsWith("sec:")?(g.slice(4)===mySec(f)?"My section":g.slice(4)+" section"):((st(f).groups.get(g)||{}).n||"Group");
const fmtT=t=>{const d=new Date(t);return d.toLocaleDateString([],{weekday:"short",day:"numeric",month:"short"})+" "+String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0")};
function initials(n){const w=String(n||"?").split(/\s+/).filter(Boolean);return (w.length>1?w[0][0]+w[w.length-1][0]:(w[0]||"?").slice(0,2)).toUpperCase()}
function av(f,n,sz,on0){const on=on0===undefined?isOn(f,n):on0,ph=window.afPhoto?window.afPhoto(n):"";return `<span class="tk-av" style="--sz:${sz||44}px${ph?`;background:center/cover no-repeat url(${ph})`:""}">${ph?"":esc(initials(n))}${on?`<i class="tk-badge">${RADIO(11)}</i>`:""}</span>`}
function bars(id){let h=0;for(const c of String(id))h=(h*31+c.charCodeAt(0))>>>0;return Array.from({length:28},(_,i)=>{h=(h*1103515245+12345)>>>0;return 6+((h>>>8)%20)}).map(x=>`<i style="height:${x}px"></i>`).join("")}
function status(f){const on=tk().on,g=tk().sel;
  if(ui.rec)return {cls:"live",t:"You are live",s:"Sending to "+gname(f,g)+". Let go to send."};
  if(!on)return {cls:"off",t:"Talk is off",s:"Nothing plays and you can't send. Clips go to the log."};
  {const R=recorders(f);if(R.length)return {cls:"busy",t:R.slice(0,2).join(" and ")+" "+(R.length>1?"are":"is")+" recording…",s:"Wait for them to finish."}}
  if(ui.playing)return {cls:"busy",t:"Channel busy",s:"Someone is talking. Wait for the end."};
  if(ui.note)return {cls:"",t:ui.note,s:""};
  const L=ui.last;if(L&&Date.now()-L.t<60e3){const T=targets(f,L.g).filter(e=>!entryMe(f,e));const R=st(f).rc.get(L.id)||[];const heard=T.filter(e=>R.some(r=>match(e,r.by,r.w))).length;const off=T.filter(e=>!entryOn(f,e)).length;
    return {cls:"sent",t:"Sent to "+gname(f,L.g),s:"Heard by "+heard+" of "+T.length+(off?", "+off+" have Talk off":"")}}
  return {cls:"",t:"Channel clear",s:"Hold the button to talk to "+gname(f,g)+"."}}
function chips(f){const g=tk().sel,mine=mySec(f);
  const L=[["all","Everyone",people(f).length]];
  if(mine)L.push(["sec:"+mine,"My section ("+mine+")",targets(f,"sec:"+mine).length]);
  if(f.lk)for(const c of secs(f))if(c!==mine)L.push(["sec:"+c,c+" section",targets(f,"sec:"+c).length]);
  groupsOf(f).forEach(x=>L.push([x.id,x.n,x.m.length]));
  return L.map(([id,n,c])=>`<button type="button" class="tk-chip" data-tkg="${esc(id)}" aria-pressed="${g===id}">${esc(n)} <b>${c}</b></button>`).join("")+`<button type="button" class="tk-chip dash" id="tkNewG">+ Pick people</button>`}
function newGroup(f){if(!ui.newg)return "";const ppl=people(f);
  return `<div class="tk-card" id="tkG"><b>Pick people for a group</b><p class="tk-note">Anyone on your list, even if they haven't turned Talk on. Everyone you pick hears everyone else once their Talk is on.</p>
    <input id="tkGN" maxlength="24" placeholder="Group name" value="${esc(ui.gname)}" aria-label="Group name">
    <div class="tk-pick">${ppl.map(e=>{const on=entryOn(f,e),sc=secOf(f,e);return `<button type="button" data-tkp="${esc(e.n)}" aria-pressed="${ui.gpick.has(e.n)}">${av(f,e.n,32,on)}<span>${esc(e.n)}${sc?` <small>${esc(sc)}</small>`:""}${on?"":` <small class="off">Talk off</small>`}${online(f,e)?` <small class="ol">Online</small>`:(lastSeen(f,e)?` <small>last seen ${esc(hhmm(lastSeen(f,e)))}</small>`:"")}</span><i></i></button>`}).join("")}</div>
    <div class="tk-err" id="tkGE" role="alert"></div>
    <div class="tk-row"><button class="btn" id="tkGMake">Create group</button><button class="btn alt" id="tkGNo">Cancel</button></div></div>`}
const TRASH=`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5"/></svg>`;
/* a message row you can swipe left to reveal Delete (or swipe all the way to delete) */
const slide=(f,id,inner)=>{const o=ui.open===hk(f,id);return `<div class="tk-sl${o?" open":""}" data-tksl="${id}"><button type="button" class="tk-del" data-tkdel="${id}" aria-label="Delete message"${o?"":' tabindex="-1"'}>${TRASH}<span>Delete</span></button>${inner}</div>`};
function dropMsg(f,id){const s=st(f),m=s.msgs.get(+id);
  if(m&&m.url){try{URL.revokeObjectURL(m.url)}catch(e){}}
  if(ui.playing===f.id+":"+id&&audio){audio.pause();ui.playing=""}
  ui.q=ui.q.filter(x=>!(x.f===f&&x.m.id===+id));
  s.msgs.delete(+id);S.talkLog=logs().filter(x=>!(x.f===f.id&&x.id===+id));
  const H=hid(),k=hk(f,id);if(!H.includes(k)){H.push(k);if(H.length>400)H.splice(0,H.length-400)}
  if(ui.open===k)ui.open=""}
/* your own messages (or any message, if you hold the leader link) are deleted for everyone: a small encrypted "deleted" note goes out and every phone drops the clip. Anything else is removed from this phone only. */
function delMsg(f,id){const s=st(f),m=s.msgs.get(+id)||logs().find(x=>x.f===f.id&&x.id===+id);
  const all=!!m&&(m.by===me(f)||!!f.lk);
  dropMsg(f,id);save();draw();
  if(all)put(f,{k:"x",m:+id,by:me(f),l:!!f.lk}).then(()=>toast("Deleted for everyone")).catch(()=>toast("Deleted here, but couldn't reach the others. Check your connection."));
  else toast("Removed from this phone only")}
function msgCard(f,m){const mine=m.by===me(f),on=ui.playing===f.id+":"+m.id;
  return slide(f,m.id,`<article class="tk-msg" data-tkm="${m.id}" tabindex="0">
    <div class="tk-mh">${av(f,m.by,40)}<div class="tk-who"><b>${esc(m.by)}${isOn(f,m.by)?` <span class="tk-ri" title="Talk is on">${RADIO(13)}</span>`:""}</b><small>${esc(fmtT(m.t))} · ${m.d}s · ${esc(gname(f,m.g))}${mine?" · you":""}</small></div></div>
    <div class="tk-mp"><button type="button" class="tk-play" data-tkplay="${m.id}" aria-label="${on?"Playing":"Play message"}">${on?"❚❚":"▶"}</button><div class="tk-wave">${bars(m.id)}</div></div>
    ${m.tx?`<p class="tk-tx">${esc(m.tx)}</p>`:`<p class="tk-tx dim">Voice message</p>`}</article>`)}
function logCard(f,x){return slide(f,x.id,`<article class="tk-msg old" data-tkm="${x.id}" tabindex="0"><div class="tk-mh">${av(f,x.by,40)}<div class="tk-who"><b>${esc(x.by)}</b><small>${esc(fmtT(x.t))} · ${x.d}s · ${esc(gname(f,x.g))} · saved</small></div></div>${x.tx?`<p class="tk-tx">${esc(x.tx)}</p>`:`<p class="tk-tx dim">Voice message (audio expired)</p>`}</article>`)}
function listHTML(f){const s=st(f);const live=[...s.msgs.values()].filter(m=>!isHid(f,m.id)&&(forMe(f,m)||m.by===me(f))).sort((a,b)=>b.id-a.id).slice(0,30);
  const have=new Set(live.map(m=>m.id));const old=logs().filter(x=>x.f===f.id&&!have.has(x.id)&&!isHid(f,x.id)&&(forMe(f,x)||x.by===me(f))).slice(0,30);
  if(!live.length&&!old.length)return `<p class="tk-note" style="text-align:center">No messages yet. Hold the button and say hello.</p>`;
  return live.map(m=>msgCard(f,m)).join("")+old.map(x=>logCard(f,x)).join("")}
function html(){const f=feed();
  if(!f)return `<h2>Talk</h2><div class="tk-card"><p class="tk-note" style="margin:0">Talk runs on your Feed. Start a Feed (or open the link your leader sent), then come back.</p><button class="btn" data-go="feed" style="margin-top:10px">Go to Feed</button></div>`;
  if(tk().sel!=="all"&&!chips(f).includes(`data-tkg="${esc(tk().sel)}"`))tk().sel="all";
  const on=tk().on,S0=status(f),n=listening(f).length,nm=me(f);
  return `<div class="tk">
   <div class="tk-top"><h2>Talk</h2><span class="tk-listen">${n?`<i></i> ${n} listening`:"Nobody listening"}</span></div>
   ${n?`<div class="tk-lw" aria-label="Talk is on for">${listening(f).sort((a,b)=>a===nm?-1:b===nm?1:a.localeCompare(b)).map(w=>`<span class="tk-lc">${av(f,w,28,true)}<b>${w===nm?"You":esc(w)}</b></span>`).join("")}</div>`:""}
   <div class="tk-card tk-you">${av(f,nm,48)}<div class="tk-who"><b>${esc(nm)}${on?` <span class="tk-ri" title="Your Talk is on">${RADIO(14)}</span>`:""}</b><small>${on?"Talk is on · others can hear you":"Talk is off"}</small></div>
     <button type="button" id="tkSw" class="tk-sw" role="switch" aria-checked="${!!on}" aria-label="Talk on or off"><i></i></button></div>
   <div class="tk-lbl">Send to</div><div class="tk-chips" id="tkChips">${chips(f)}</div>
   ${newGroup(f)}
   <div class="tk-card tk-st ${S0.cls}" id="tkSt" role="status"><b>${esc(S0.t)}</b>${S0.s?`<small>${esc(S0.s)}</small>`:""}</div>
   <div class="tk-ptt${on?"":" off"}${ui.rec?" live":""}"><div class="tk-ring"><button type="button" id="tkBtn" ${on?"":"disabled"} aria-label="Hold to talk to ${esc(gname(f,tk().sel))}">${ui.rec?"<span id=\"tkT\">0:00</span>":"Hold<br>to talk"}</button></div></div>
   <p class="tk-note" style="text-align:center">Release to send. Voice is saved, turned into text where this phone can, and kept in the log. Works while the app is open.</p>
   ${ui.err?`<p class="tk-note" style="color:var(--warn);text-align:center">${esc(ui.err)}</p>`:""}
   ${locCard(f)}
   <div class="tk-lbl">Messages</div><p class="tk-note" style="margin:0">Swipe a message left to delete it. Your own messages (or any, if you're a leader) are deleted for everyone; others are removed from this phone only.</p><div id="tkList">${listHTML(f)}</div></div>`}
function draw(){if(view!=="talk")return;const main=$("#main");if(!main)return;const a=document.activeElement;if(a&&a.id==="tkGN"){ui.gname=a.value;const keep=a.selectionStart;main.innerHTML=html();const i=$("#tkGN");if(i){i.focus();try{i.setSelectionRange(keep,keep)}catch(e){}}return}
  const y=window.scrollY;main.innerHTML=html();window.scrollTo(0,y)}
function tickUI(){const r=ui.rec;if(!r)return;const s=Math.floor((Date.now()-r.t0)/1e3);const el=$("#tkT");if(el)el.textContent=Math.floor(s/60)+":"+String(s%60).padStart(2,"0")}
function paintRec(on){const w=document.querySelector(".tk-ptt"),sc=$("#tkSt");if(w)w.classList.toggle("live",on);if(on){const f=feed();if(sc){sc.className="tk-card tk-st live";sc.innerHTML=`<b>You are live</b><small>Sending to ${esc(gname(f,tk().sel))}. Let go to send.</small>`}const b=$("#tkBtn");if(b)b.innerHTML='<span id="tkT">0:00</span>'}}

/* ---------- decorations: radio icon by names in the Feed ---------- */
function decorate(){const f=feed();if(!f||view!=="feed")return;
  document.querySelectorAll(".fc .fch").forEach(h=>{const nm=h.querySelector(".nm");if(!nm)return;const n=nm.textContent.trim().toUpperCase().slice(0,30);const on=isOn(f,n);
    const has=nm.querySelector(".tk-ri");if(on&&!has)nm.insertAdjacentHTML("beforeend",` <span class="tk-ri" title="Talk is on">${RADIO(13)}</span>`);else if(!on&&has)has.remove();
    const a=h.firstElementChild;if(a&&!a.classList.contains("hd")){const b=a.querySelector(".tk-badge");if(on&&!b){a.style.position="relative";a.insertAdjacentHTML("beforeend",`<i class="tk-badge">${RADIO(11)}</i>`)}else if(!on&&b)b.remove()}})}
{const _rf=renderFeed;renderFeed=function(){const r=_rf.apply(this,arguments);try{decorate()}catch(e){}return r}}

/* ---------- wire into the app: a Talk tab and the "talk" view ---------- */
{const _to=tabOf;tabOf=function(v){return v==="talk"?"talk":_to.apply(this,arguments)}}
{const _tl=tabsList;tabsList=function(){const L=_tl.apply(this,arguments).slice();if(L.some(x=>x[0]==="mecal"))return L;const i=L.findIndex(x=>x[0]==="feed");L.splice(i<0?L.length:i+1,0,["talk","Talk","talk"]);return L}}
{const _r=render;render=function(){if(view==="talk"){renderTabs();const m=$("#main");if(m){m.className=m.className.replace(/\bfchat\b/g,"").trim();draw()}return}return _r.apply(this,arguments)}}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-tab='talk']");if(!t)return;e.stopImmediatePropagation();e.preventDefault();view="talk";armed=null;query="";render();window.scrollTo(0,0);start()},true);

document.addEventListener("click",e=>{const t=e.target;if(!t.closest||view!=="talk")return;const f=feed();if(!f)return;
  if(t.closest("#tkSw")){unlock();const T=tk();T.on=!T.on;save();sendPres(f);if(T.on)beat(f);if(!T.on){if(audio)audio.pause();ui.playing="";ui.q=[]}draw();if(T.on)poll(f);return}
  const dl=t.closest("[data-tkdel]");if(dl){const r=dl.closest(".tk-sl");if(r)fling(f,r);return}
  const g=t.closest("[data-tkg]");if(g){tk().sel=g.dataset.tkg;save();draw();return}
  if(t.closest("#tkNewG")){ui.newg=true;ui.gname="";ui.gpick=new Map();draw();return}
  if(t.closest("#tkGNo")){ui.newg=false;draw();return}
  const p=t.closest("[data-tkp]");if(p){const n=p.dataset.tkp;const i=$("#tkGN");if(i)ui.gname=i.value;if(ui.gpick.has(n))ui.gpick.delete(n);else{const e=people(f).find(x=>x.n===n);if(e)ui.gpick.set(n,e)}draw();return}
  if(t.closest("#tkGMake")){const i=$("#tkGN"),name=((i&&i.value)||"").trim(),er=$("#tkGE");ui.gname=name;
    if(!name){if(er)er.textContent="Enter a group name first";return}
    if(ui.gpick.size<1){if(er)er.textContent="Pick at least one member";return}
    if(groupsOf(f).some(x=>x.n.toLowerCase()===name.toLowerCase())){if(er)er.textContent="You already have a group with that name";return}
    const id="g"+Date.now().toString(36)+rndId(3),m=[...ui.gpick.values()].map(e=>({n:e.n,w:(e.w||[]).slice(0,6),s:e.s||""}));if(!m.some(e=>entryMe(f,e)))m.push({n:me(f),w:mineH(f).slice(0,6),s:mySec(f)});
    put(f,{k:"g",id,n:name,m}).then(rid=>{st(f).groups.set(id,{id,n:name,m,x:false,rid});tk().sel=id;save();ui.newg=false;draw();toast("Group "+name+" created")}).catch(()=>toast("Couldn't create the group. Check your connection."));return}
  const pl=t.closest("[data-tkplay]");if(pl){unlock();const m=st(f).msgs.get(+pl.dataset.tkplay);if(!m)return;if(ui.playing===f.id+":"+m.id){audio.pause();ui.playing="";draw();return}ui.q=[];play(f,m);return}});

/* swipe a message left: it slides to show Delete; swipe most of the way across (or tap Delete) and it's gone.
   Delete goes to everyone for your own messages (and any message for a leader), otherwise just this phone. Keyboard: focus a message and press Delete. */
const OPENW=96;let sw=null;
function fling(f,row){const id=row.dataset.tksl,a=row.querySelector(".tk-msg");
  row.style.height=row.offsetHeight+"px";row.style.transition="height .2s,opacity .2s,margin .2s";if(a){a.style.transition="transform .2s";a.style.transform="translateX(-110%)"}
  void row.offsetHeight;row.style.height="0";row.style.opacity="0";row.style.marginBottom="0";setTimeout(()=>delMsg(f,id),210)}
const shut=keep=>document.querySelectorAll(".tk-sl.open").forEach(r=>{if(r!==keep){r.classList.remove("open");const b=r.querySelector(".tk-del");if(b)b.tabIndex=-1}});
document.addEventListener("pointerdown",e=>{if(view!=="talk"||(e.pointerType==="mouse"&&e.button!==0))return;const a=e.target.closest&&e.target.closest(".tk-sl .tk-msg");if(!a)return;
  const row=a.parentElement;sw={a,row,x:e.clientX,y:e.clientY,base:row.classList.contains("open")?-OPENW:0,id:e.pointerId,lock:0,dx:0,w:row.offsetWidth||320}},true);
document.addEventListener("pointermove",e=>{if(!sw||e.pointerId!==sw.id)return;const dx=e.clientX-sw.x,dy=e.clientY-sw.y;
  if(!sw.lock){if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)){sw=null;return}
    if(Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)){sw.lock=1;ui.drag=true;sw.row.classList.add("drag");sw.a.style.transition="none";try{sw.a.setPointerCapture(e.pointerId)}catch(x){}}else return}
  sw.dx=Math.max(-sw.w,Math.min(0,sw.base+dx));sw.a.style.transform="translateX("+sw.dx+"px)";e.preventDefault()},true);
function swEnd(e){if(!sw||e.pointerId!==sw.id)return;const s=sw;sw=null;if(!s.lock)return;
  ui.drag=false;ui.swiped=true;setTimeout(()=>{ui.swiped=false},350);
  s.a.style.transition="";s.a.style.transform="";s.row.classList.remove("drag");
  const f=feed();if(!f)return;const k=hk(f,s.row.dataset.tksl),b=s.row.querySelector(".tk-del");
  if(s.dx<-s.w*0.6){fling(f,s.row)}
  else if(s.dx<-OPENW/2){shut(s.row);ui.open=k;s.row.classList.add("open");if(b)b.tabIndex=0}
  else{if(ui.open===k)ui.open="";s.row.classList.remove("open");if(b)b.tabIndex=-1}}
for(const ev of ["pointerup","pointercancel"])document.addEventListener(ev,swEnd,true);
/* a swipe shouldn't also press Play; a tap elsewhere closes an open row */
document.addEventListener("click",e=>{if(view!=="talk")return;const t=e.target;if(!t.closest)return;
  if(ui.swiped&&t.closest(".tk-sl")){e.stopImmediatePropagation();e.preventDefault();return}
  if(ui.open&&!t.closest(".tk-sl.open")){ui.open="";shut(null)}},true);
document.addEventListener("keydown",e=>{if(view!=="talk"||(e.key!=="Delete"&&e.key!=="Backspace"))return;const a=document.activeElement;if(!a||!a.classList||!a.classList.contains("tk-msg"))return;const f=feed(),r=a.parentElement;if(f&&r&&r.dataset.tksl){e.preventDefault();fling(f,r)}});

/* hold to talk: press and hold (pointer events cover finger and mouse) */
document.addEventListener("pointerdown",e=>{const b=e.target.closest&&e.target.closest("#tkBtn");if(!b||b.disabled)return;e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch(x){}startRec()},true);
for(const ev of ["pointerup","pointercancel","lostpointercapture"])document.addEventListener(ev,e=>{if(ui.rec&&e.target.closest&&e.target.closest("#tkBtn"))stopRec()},true);
document.addEventListener("contextmenu",e=>{if(e.target.closest&&e.target.closest("#tkBtn"))e.preventDefault()});
document.addEventListener("keydown",e=>{if(view==="talk"&&(e.key===" "||e.key==="Enter")&&document.activeElement&&document.activeElement.id==="tkBtn"&&!e.repeat){e.preventDefault();startRec()}});
document.addEventListener("keyup",e=>{if(ui.rec&&(e.key===" "||e.key==="Enter"))stopRec()});

/* ---------- keep it fresh: live pings when connected, a slow poll otherwise ---------- */
function start(){const f=feed();if(!f||!f.mk||!f.ek)return;const s=st(f);
  if(!s.watch&&window.LIVE&&LIVE.watchTopic&&SB.topic){s.watch=true;SB.topic("p_talk",f.id).then(t=>LIVE.watchTopic(t,"p_talk",()=>poll(f))).catch(()=>{s.watch=false})}
  poll(f).then(()=>{if(tk().on&&Date.now()-s.beat>BEAT)sendPres(f)})}
setInterval(()=>{if(document.hidden)return;const f=feed();if(!f)return;const fast=view==="talk";if(fast||tk().on||st(f).init){poll(f);if(tk().on&&Date.now()-st(f).beat>BEAT)sendPres(f)}},4000);
setTimeout(()=>{try{start()}catch(e){}},2500);

if(typeof SC==="object"&&Array.isArray(SC))SC.push({k:"tk",n:"4.67: Talk (push-to-talk voice)",f:["38_talk"],t:[["talk_ok",{}]]});
if(typeof HELP==="object"&&HELP.feed&&Array.isArray(HELP.feed[2]))HELP.feed[2].push("Talk: hold the big button to send a voice clip to your team or a group. Turn Talk off with the switch and nothing plays. A radio icon sits by anyone who has Talk on. Swipe a message left to delete it. Your own messages are deleted for everyone.");

/* ---------- looks (the app's Glass design) ---------- */
{const c=document.createElement("style");c.textContent=`.tk{display:flex;flex-direction:column;gap:12px;padding-bottom:20px}
.tk-top{display:flex;align-items:center;justify-content:space-between}.tk-top h2{margin:0}
.tk-listen{font-size:13px;font-weight:700;color:var(--brass);display:inline-flex;align-items:center;gap:6px}.tk-listen i{width:8px;height:8px;border-radius:50%;background:currentColor}
.tk-card{border:1px solid var(--glass-line);border-radius:20px;background:var(--card,var(--surface));box-shadow:var(--shadow);padding:14px 16px}
.tk-card input{width:100%;box-sizing:border-box;margin:8px 0}.tk-note{font-size:12.5px;color:var(--muted);margin:4px 0}
.tk-lw{display:flex;gap:8px;overflow-x:auto;padding:2px 0 10px;margin:0 -2px;scrollbar-width:none}.tk-lw::-webkit-scrollbar{display:none}.tk-lc{display:inline-flex;align-items:center;gap:6px;flex:none;padding:3px 10px 3px 3px;border-radius:999px;background:var(--brass-soft,#dde8ff)}.tk-lc b{font-size:12.5px;font-weight:700;white-space:nowrap}
.tk-you{display:flex;align-items:center;gap:12px}.tk-who{flex:1;min-width:0;display:flex;flex-direction:column}.tk-who b{font-size:15px;display:flex;align-items:center;gap:6px}.tk-who small{font-size:12.5px;color:var(--muted)}
.tk-av{position:relative;flex:none;width:var(--sz);height:var(--sz);border-radius:50%;background:var(--brass);color:var(--on-brass,#fff);display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:calc(var(--sz)*.34)}
.tk-badge{position:absolute;right:-3px;bottom:-3px;width:18px;height:18px;border-radius:50%;background:var(--surface-solid,#fff);color:var(--brass);border:1.5px solid var(--brass);display:inline-flex;align-items:center;justify-content:center;font-style:normal}
.tk-ri{color:var(--brass);display:inline-flex;vertical-align:-2px}
.tk-sw{all:unset;cursor:pointer;width:54px;height:32px;border-radius:999px;background:var(--line);position:relative;transition:background .2s;flex:none}.tk-sw i{position:absolute;top:3px;left:3px;width:26px;height:26px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform .2s}
.tk-sw[aria-checked="true"]{background:var(--brass)}.tk-sw[aria-checked="true"] i{transform:translateX(22px)}.tk-sw:focus-visible{outline:2px solid var(--brass);outline-offset:2px}
.tk-lbl{font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-top:2px}
.tk-chips{display:flex;gap:8px;flex-wrap:wrap}.tk-chip{all:unset;cursor:pointer;box-sizing:border-box;min-height:40px;padding:0 16px;border-radius:999px;background:var(--line);color:var(--ink);font-size:14px;font-weight:600;display:inline-flex;align-items:center;gap:6px}
.tk-chip b{font-size:12px;opacity:.7}.tk-chip[aria-pressed="true"]{background:var(--brass);color:var(--on-brass,#fff)}.tk-chip.dash{background:transparent;border:1.5px dashed var(--muted);color:var(--muted)}.tk-chip:focus-visible{outline:2px solid var(--brass);outline-offset:2px}
.tk-pick{display:flex;flex-direction:column;gap:6px;margin:8px 0;max-height:240px;overflow:auto}.tk-pick button{all:unset;cursor:pointer;display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:14px;border:1px solid var(--line)}.tk-pick button span{flex:1;font-weight:600;font-size:14px}.tk-pick small.off{color:var(--warn);font-weight:700}.tk-pick small{color:var(--muted);font-weight:700;font-size:11px;margin-left:4px}
.tk-pick button i{width:22px;height:22px;border-radius:50%;border:2px solid var(--muted)}.tk-pick button[aria-pressed="true"]{border-color:var(--brass);background:var(--brass-soft,transparent)}.tk-pick button[aria-pressed="true"] i{background:var(--brass);border-color:var(--brass)}
.tk-err{color:var(--warn);font-size:13px;min-height:18px;font-weight:600}.tk-row{display:flex;gap:8px}.tk-row .btn{flex:1}
.tk-st{display:flex;flex-direction:column;gap:2px}.tk-st b{font-size:15px}.tk-st small{font-size:12.5px;color:var(--muted)}.tk-st.live{border-color:var(--warn)}.tk-st.live b{color:var(--warn)}.tk-st.sent b{color:var(--brass)}.tk-st.off,.tk-st.busy{opacity:.85}
.tk-ptt{display:flex;justify-content:center;padding:6px 0}.tk-ring{width:176px;height:176px;border-radius:50%;border:2px solid color-mix(in srgb,var(--brass) 45%,transparent);display:flex;align-items:center;justify-content:center;transition:border-color .2s}
#tkBtn{all:unset;cursor:pointer;width:136px;height:136px;border-radius:50%;background:var(--brass);color:var(--on-brass,#fff);font-weight:800;font-size:17px;line-height:1.25;text-align:center;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow);user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:none;transition:transform .12s,background .2s}
#tkBtn:active,.tk-ptt.live #tkBtn{transform:scale(.95)}.tk-ptt.live #tkBtn{background:var(--warn);color:#fff}.tk-ptt.live .tk-ring{border-color:var(--warn);animation:tkp 1.2s ease-out infinite}
.tk-ptt.off #tkBtn{background:var(--line);color:var(--muted);cursor:not-allowed;box-shadow:none}#tkBtn:focus-visible{outline:3px solid var(--ink);outline-offset:3px}
@keyframes tkp{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--warn) 45%,transparent)}100%{box-shadow:0 0 0 18px transparent}}@media (prefers-reduced-motion:reduce){.tk-ptt.live .tk-ring{animation:none}}
.tk-msg{border:1px solid var(--glass-line);border-radius:20px;background:var(--card,var(--surface));box-shadow:var(--shadow);padding:12px 14px;display:flex;flex-direction:column;gap:8px}.tk-msg.old{opacity:.75}
.tk-mh{display:flex;align-items:center;gap:10px}.tk-mp{display:flex;align-items:center;gap:10px}
.tk-play{all:unset;cursor:pointer;width:44px;height:44px;flex:none;border-radius:50%;background:var(--brass);color:var(--on-brass,#fff);display:inline-flex;align-items:center;justify-content:center;font-size:15px}.tk-play:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
.tk-wave{flex:1;height:34px;display:flex;align-items:center;gap:3px}.tk-wave i{flex:1;max-width:5px;border-radius:3px;background:var(--line)}.tk-wave i.on{background:var(--brass)}
.tk-lr{display:flex;align-items:center;gap:10px;margin-top:10px}.tk-map{font-weight:700;font-size:13px;color:var(--brass);text-decoration:none;padding:8px 12px;border-radius:999px;background:var(--line)}.tk-pick small.ol{color:var(--brass);font-weight:700}
.tk-tx{font-size:14px;line-height:1.4;margin:0}.tk-tx.dim{color:var(--muted)}
.tk-sl{position:relative;border-radius:20px;overflow:hidden;margin-bottom:10px}.tk-sl .tk-msg{position:relative;transition:transform .22s ease;touch-action:pan-y;will-change:transform}.tk-sl.drag .tk-msg{user-select:none;-webkit-user-select:none}.tk-sl.open .tk-msg{transform:translateX(-96px)}
.tk-del{all:unset;cursor:pointer;position:absolute;top:0;right:0;bottom:0;width:96px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;background:var(--warn);color:#fff;font-size:12px;font-weight:800;opacity:0;transition:opacity .15s}.tk-sl.open .tk-del,.tk-sl.drag .tk-del{opacity:1}.tk-del:focus-visible{outline:3px solid var(--ink);outline-offset:-3px;opacity:1}
@media (prefers-reduced-motion:reduce){.tk-sl .tk-msg{transition:none}}`;document.head.appendChild(c)}
})();
