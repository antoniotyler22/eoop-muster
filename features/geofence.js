/* Accounted For 4.120.0 — Place check-in (geofence), built out: map card with the zone and your dot, "Accounted for · HHMM",
   Undo, a leader choice of Ask them to confirm (default) or Count right away, and live detection while the app is open.
   Still no background tracking in the web app; the store apps can do that after a native rebuild.
   Accounted For 4.74.0 — Place check-in (geofence).
   A leader saves a muster place (Settings → Muster place: where they stand now + a radius). It rides on each person's My page.
   A person who turns on "Check me in when I'm there" is checked in as On Hand, once a day, when they open the app (or it
   comes back to the screen) inside that place. Their location is read only when the app is open and is never sent:
   what goes to the leader is the normal check-in, noted "Auto: arrived at <place>". A phone web app can't watch the
   location in the background, so this runs when the app is open; the store apps can do it in the background after a rebuild. */
(()=>{
const R=[100,250,500,1000],lbl=r=>r>=1000?(r/1000)+" km":r+" m";
const day=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const clean=(v,n)=>String(v||"").replace(/[<>|#]/g,"").trim().slice(0,n);
const okZ=z=>z&&isFinite(z.lat)&&isFinite(z.lng)&&Math.abs(z.lat)<=90&&Math.abs(z.lng)<=180&&z.r>=50&&z.r<=5000;
function dist(a,b,c,d){const r=Math.PI/180,x=(c-a)*r,y=(d-b)*r,s=Math.sin(x/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin(y/2)**2;return 12742000*Math.asin(Math.min(1,Math.sqrt(s)))}
function here(){return new Promise((res,rej)=>{if(!navigator.geolocation)return rej(new Error("Location isn't available on this device."));
  navigator.geolocation.getCurrentPosition(p=>res(p.coords),e=>rej(new Error(e.code===1?"Location is turned off for this app. Allow it in Settings.":"Couldn't get your location. Try again outside.")),{enableHighAccuracy:true,timeout:15000,maximumAge:20000})})}
window.gfDist=dist;

/* ---------- leader: set the place ---------- */
const zone=()=>okZ(S.gz)?S.gz:null;
const mode=z=>z&&z.m==="auto"?"auto":"ask";
function lpanel(){const z=zone();
  return `<div class="panel" id="gfLead"><b>📍 Muster place</b>
    ${z?`<p class="note" style="margin:6px 0">${esc(z.name||"Muster place")} · ${lbl(z.r)}. People who turn on place check-in are counted On Hand when they arrive here.</p>
      <div class="evts">${R.map(r=>`<button data-gfr="${r}" aria-pressed="${z.r===r}">${lbl(r)}</button>`).join("")}</div>
      <div class="note" style="margin:8px 0 4px">When someone arrives</div>
      <div class="evts"><button data-gfm="ask" aria-pressed="${mode(z)==="ask"}">Ask them to confirm</button><button data-gfm="auto" aria-pressed="${mode(z)==="auto"}">Count right away</button></div>
      <div class="row2"><button class="btn alt" id="gfSet">Move it to where I am</button><button class="btn alt" id="gfClr">Remove</button></div>`
    :`<p class="note" style="margin:6px 0">Stand at your muster place and tap below. People can choose to be checked in automatically when they open the app there. Their location never leaves their phone.</p>
      <input id="gfName" maxlength="30" placeholder="Name it (e.g. Motor pool)" style="margin-bottom:8px"><button class="btn" id="gfSet">Use where I am now</button>`}
    <div class="note" id="gfNote"></div></div>`}
{const _r=render;render=function(){const r=_r.apply(this,arguments);
  try{if(view==="data"&&!(typeof memberMode==="function"&&memberMode())&&S.role!=="view"){const m=document.querySelector("#main");if(m&&!m.querySelector("#gfLead")){const q=m.querySelector("#qhPanel")||m.querySelector("#ppPanel");if(q)q.insertAdjacentHTML("afterend",lpanel());else m.insertAdjacentHTML("afterbegin",lpanel())}}}catch(e){}return r}}
{const _m=mpDigest;mpDigest=function(m){const d=_m.apply(this,arguments);try{const z=zone();if(z)d.gz={name:clean(z.name,30),lat:z.lat,lng:z.lng,r:z.r,m:mode(z)}}catch(e){}return d}}
window.gfLeadHtml=()=>lpanel();
function repaintLead(){const o=document.getElementById("gfLead");if(o)o.outerHTML=lpanel()}
document.addEventListener("click",async e=>{const t=e.target;if(!t||!t.closest)return;
  const mb=t.closest("[data-gfm]");if(mb&&S.gz){S.gz.m=mb.dataset.gfm==="auto"?"auto":"ask";save();repaintLead();try{mpSchedule()}catch(x){}return}
  const rb=t.closest("[data-gfr]");if(rb&&S.gz){S.gz.r=+rb.dataset.gfr;save();repaintLead();try{mpSchedule()}catch(x){}return}
  if(t.closest("#gfClr")){delete S.gz;save();repaintLead();try{mpSchedule()}catch(x){}return}
  if(t.closest("#gfSet")){const n=document.getElementById("gfNote");if(n)n.textContent="Getting your location…";
    try{const c=await here();const nm=clean((document.getElementById("gfName")||{}).value,30)||(S.gz&&S.gz.name)||"Muster place";
      S.gz={name:nm,lat:+c.latitude.toFixed(5),lng:+c.longitude.toFixed(5),r:(S.gz&&S.gz.r)||250};save();repaintLead();try{mpSchedule()}catch(x){}toast("📍 Muster place saved")}
    catch(x){if(n)n.textContent=String(x.message||x)}}});

/* ---------- member: check in when I'm there ---------- */
const D=()=>S.me&&S.me.d&&String(S.me.pk)!=="preview"?S.me.d:null;
const mz=()=>{const d=D(),z=d&&d.gz;return okZ(z)&&d.feed&&d.feed.mk&&d.feed.ek?z:null};
/* S.gfDay is "YYYY-MM-DD|HHMM" (counted) or "YYYY-MM-DD|undo" (took it back). Either way, no more automatic counts today. */
const tag=()=>String(S.gfDay||"").split("|");
const blocked=()=>tag()[0]===day();
const isDone=()=>blocked()&&tag()[1]&&tag()[1]!=="undo";
const hhmm=()=>{const d=new Date();return String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0")};
let busy=false,LAST=null,PEND=false;
function fix(z,c){const r=Math.PI/180;LAST={dx:(c.longitude-z.lng)*111320*Math.cos(z.lat*r),dy:(c.latitude-z.lat)*110540,d:dist(c.latitude,c.longitude,z.lat,z.lng),acc:c.accuracy||0};
  return {d:LAST.d,inside:LAST.d<=z.r+Math.min(100,LAST.acc)}}
async function sendIn(z,undo){const d=D(),f=d.feed;
  const me=(typeof title==="function"?title(d.rank)+" "+title(String(d.name||"").split(",")[0].trim()):String(d.name||"")).trim().slice(0,40);
  const o={k:"ck",cid:"c"+Date.now().toString(36)+rndId(4),me,mid:d.mid||"",sec:d.sec||"",st:undo?"Off Hand":"On Hand",oth:"",from:"",to:"",loc:"",note:(undo?"Auto check-in undone":"Auto: arrived at "+(z.name||"muster place")).slice(0,80),at:Date.now()};
  const ct=await fdEnc(f.ek,o);const meta={alert:{alert:"ck",feed:f.id,mk:f.mk}};
  const r=await SB.rpc("feed_req",{p_feed:f.id,p_member_key:f.mk,p_ct:ct},meta);if(r===null)throw new Error("offline");
  try{SB.notify(null,meta.alert)}catch(e){}}
async function arrive(z){await sendIn(z,false);S.gfDay=day()+"|"+hhmm();PEND=false;save();paint();stopWatch();toast("📍 Accounted for: you're at "+(z.name||"the muster place"))}
function askNow(z){if(PEND)return;PEND=true;paint();toast("📍 You're at "+(z.name||"the muster place")+". Tap to confirm.")}
async function check(manual){if(busy)return;const z=mz();if(!z||!(S.gfOn||manual))return;if(!manual&&blocked())return;
  busy=true;try{const c=await here();const r=fix(z,c);
    if(r.inside){if(manual||mode(z)==="auto")await arrive(z);else askNow(z)}
    else{PEND=false;paint();if(manual)toast("You're about "+(r.d>=1000?(r.d/1000).toFixed(1)+" km":Math.round(r.d)+" m")+" from "+(z.name||"the muster place")+".")}}
  catch(e){if(manual)toast(String(e.message||"Couldn't check in. Try again."))}finally{busy=false}}
async function undo(){const z=mz();if(!z||busy)return;busy=true;try{await sendIn(z,true);S.gfDay=day()+"|undo";PEND=false;save();paint();toast("Undone. You're back to Off Hand.")}catch(e){toast("Couldn't undo. Try again.")}finally{busy=false}}
/* While the app is open, watch for arriving instead of waiting for the next 5-minute look. */
let wid=null,lastW=0;
function stopWatch(){if(wid!=null&&navigator.geolocation&&navigator.geolocation.clearWatch){try{navigator.geolocation.clearWatch(wid)}catch(e){}}wid=null}
function startWatch(){if(wid!=null||!navigator.geolocation||!navigator.geolocation.watchPosition)return;if(!S.gfOn||!mz()||blocked()||document.hidden)return;
  try{wid=navigator.geolocation.watchPosition(p=>{const n=Date.now();if(n-lastW<20000)return;lastW=n;const z=mz();if(!z||!S.gfOn||blocked()){stopWatch();return}
    const r=fix(z,p.coords);if(r.inside){if(busy)return;busy=true;(mode(z)==="auto"?arrive(z):Promise.resolve(askNow(z))).catch(()=>{}).finally(()=>{busy=false})}else{PEND=false;paint()}},()=>{},{enableHighAccuracy:false,maximumAge:30000,timeout:30000})}catch(e){wid=null}}
function mapSvg(z){const R=64,sc=R/z.r;let dot="";
  if(LAST){let dx=LAST.dx*sc,dy=-LAST.dy*sc;const m=Math.hypot(dx,dy);if(m>88){dx*=88/m;dy*=88/m}
    dot=`<circle cx="${(150+dx).toFixed(1)}" cy="${(100+dy).toFixed(1)}" r="14" fill="rgba(76,141,255,.35)"/><circle cx="${(150+dx).toFixed(1)}" cy="${(100+dy).toFixed(1)}" r="7" fill="#4C8DFF" stroke="#fff" stroke-width="3"/>`}
  const nm=esc(z.name||"Muster place");
  return `<svg viewBox="0 0 300 200" width="100%" role="img" aria-label="Map: the ${nm} zone${LAST?" and where you are":""}" style="display:block;border-radius:14px;max-width:420px">
  <rect width="300" height="200" rx="14" fill="#0B1B38"/><path d="M0 50H300M0 100H300M0 150H300M50 0V200M150 0V200M250 0V200" stroke="rgba(255,255,255,.08)"/>
  <circle cx="150" cy="100" r="${R}" fill="rgba(76,141,255,.14)" stroke="#7DB7FF" stroke-width="2" stroke-dasharray="6 5"/>
  <rect x="134" y="88" width="32" height="24" rx="4" fill="rgba(255,255,255,.14)" stroke="rgba(255,255,255,.4)"/>
  <text x="150" y="192" text-anchor="middle" fill="#A9B8D3" font-size="11">${nm} · ${lbl(z.r)}</text>${dot}</svg>`}
function card(){const z=mz();if(!z)return "";const nm=esc(z.name||"Muster place"),done=isDone(),undone=blocked()&&!done;
  let body="";
  if(S.gfOn){
    if(done)body=`<div class="gfok" style="display:flex;gap:12px;align-items:center;margin:10px 0"><span style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#7DB7FF,#1E4FD8);display:flex;align-items:center;justify-content:center;flex:none"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span><b style="font-size:17px">Accounted for · ${esc(tag()[1])}</b><span class="note" style="display:block">Counted when you arrived. Your leader sees it.</span></span></span></div>
      <button class="btn alt" id="gfUndo" type="button">Not here yet: undo</button>`;
    else if(PEND)body=`<div style="margin:10px 0"><b style="font-size:17px">You're at ${nm}</b><span class="note" style="display:block">Tap to be counted.</span></div><button class="btn" id="gfConfirm" type="button">Confirm I'm here</button>`;
    else body=`<div class="note" style="margin:10px 0">${undone?"Undone for today. Tap below if you're here.":LAST?(LAST.d>=1000?(LAST.d/1000).toFixed(1)+" km":Math.round(LAST.d)+" m")+" from "+nm+".":"Open the app at the place."}</div><button class="btn alt" id="gfNow" type="button">I'm here: check in now</button>`}
  return `<div class="panel" id="gfMe"><b>📍 ${nm}</b>
    <label class="lrow" style="margin:8px 0;cursor:pointer"><input type="checkbox" id="gfOn" ${S.gfOn?"checked":""}><span style="flex:1;min-width:0"><span class="t" style="display:block">Check me in when I'm there</span><span class="s" style="display:block">${mode(z)==="auto"?"Counted On Hand once a day when you arrive.":"You'll be asked to confirm once a day when you arrive."}</span></span></label>
    ${S.gfOn?mapSvg(z):""}${body}
    <div class="note" style="margin-top:8px">🔒 Your location is read on your phone only while the app is open and is never sent. Your leader sees counted, the time, and Auto.</div></div>`}
function paint(){const o=document.getElementById("gfMe");if(o)o.outerHTML=card()}
{const _rm=renderMe;renderMe=function(){_rm.apply(this,arguments);try{if(view!=="me"||document.getElementById("gfMe"))return;const h=card();if(!h)return;const m=$("#main"),t=m&&(m.querySelector("#sosHome")||m.querySelector(".v12tabs"));if(t)t.insertAdjacentHTML("afterend",h);else if(m)m.insertAdjacentHTML("afterbegin",h)}catch(e){}}}
document.addEventListener("change",e=>{if(e.target&&e.target.id==="gfOn"){S.gfOn=!!e.target.checked;if(!S.gfOn){PEND=false;stopWatch()}save();paint();if(S.gfOn){check(false);startWatch()}}});
document.addEventListener("click",e=>{const t=e.target;if(!t||!t.closest)return;
  if(t.closest("#gfNow")||t.closest("#gfConfirm"))check(true);
  else if(t.closest("#gfUndo"))undo()});
document.addEventListener("visibilitychange",()=>{if(document.hidden)stopWatch();else{setTimeout(()=>check(false),1500);setTimeout(startWatch,2000)}});
setTimeout(()=>{check(false);startWatch()},4500);
if(typeof every==="function")every(300000,()=>{if(!document.hidden){check(false);startWatch()}},"geofence");
window.gfCheck=check;
})();
