/* Accounted For 4.72.2 — SOS.
   Anyone on a team can press and hold the SOS button for 3 seconds (Tools → SOS, or the SOS card on Home). It sends a request
   to the team leaders through the same encrypted path as a request (name, what's wrong, and the phone's location if allowed),
   and the notify function buzzes every leader phone as an urgent alert (it gets through Quiet hours).
   Leaders see a red full-screen alert with the name, a map link, Call / Text, and "I'm responding". */
(()=>{
const KINDS=["Help","Medical","Unsafe","Lost"],HOLD=3000;
const feedOf=()=>(S.feeds||[]).find(f=>f.mk&&f.ek)||(S.me&&S.me.d&&S.me.d.feed&&S.me.d.feed.mk&&S.me.d.feed.ek&&String(S.me.pk)!=="preview"?S.me.d.feed:null);
const myNm=f=>{const D=S.me&&S.me.d;return String(f.me||S.myName||(D&&D.name?title(D.rank)+" "+title(String(D.name).split(",")[0].trim()):"")||(typeof fdBy==="function"?fdBy(f):"")||"Someone").slice(0,30)};
const list=()=>S.sos=Array.isArray(S.sos)?S.sos:[];
let kind="Help",hold=null,note="",busy=false,pos=null;
const hhmm=t=>{const d=new Date(t);return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")};

/* ---------- sender ---------- */
function warm(){try{if(!navigator.geolocation)return;navigator.geolocation.getCurrentPosition(p=>{pos={lat:p.coords.latitude,lng:p.coords.longitude,acc:p.coords.accuracy,t:Date.now()}},()=>{},{timeout:6000,maximumAge:60000,enableHighAccuracy:true})}catch(e){}}
function where(){return new Promise(ok=>{if(pos&&Date.now()-pos.t<120000)return ok(pos);if(!navigator.geolocation)return ok(null);
  let done=false;const fin=v=>{if(!done){done=true;ok(v)}};setTimeout(()=>fin(pos),5500);
  try{navigator.geolocation.getCurrentPosition(p=>{pos={lat:p.coords.latitude,lng:p.coords.longitude,acc:p.coords.accuracy,t:Date.now()};fin(pos)},()=>fin(pos),{timeout:5000,maximumAge:30000,enableHighAccuracy:true})}catch(e){fin(pos)}})}
function paintNote(){const e=document.getElementById("sosNote");if(e)e.textContent=note}
async function send(){if(busy)return;const f=feedOf();
  if(!f){note="Join your team first: SOS needs your team's link.";paintNote();return}
  busy=true;note="Getting your location…";paintNote();
  const p=await where();const me=myNm(f);
  const o={k:"sos",sid:"s"+Date.now().toString(36)+rndId(4),me,kind,t:Date.now()};
  if(p){o.lat=+p.lat.toFixed(5);o.lng=+p.lng.toFixed(5);o.acc=Math.round(p.acc||0)}
  note="Sending…";paintNote();
  try{const ct=await fdEnc(f.ek,o);await SB.rpc("feed_req",{p_feed:f.id,p_member_key:f.mk,p_ct:ct});
    try{SB.notify(null,{alert:"sos",feed:f.id,mk:f.mk,ti:me,tx:kind+(p?" · location shared":""),sid:o.sid,kd:kind,la:o.lat,ln:o.lng,ac:o.acc,dev:window.dmDev?window.dmDev():undefined})}catch(e){}
    note="🆘 SOS sent at "+hhmm(Date.now())+(p?" with your location":" (no location: allow it in Settings)")+". Stay where you are if you can.";
    try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}
  }catch(e){note="Couldn't send. Check signal and hold the button again. If it's an emergency call 911."}
  busy=false;paintNote()}
function ringStyle(p){return `background:conic-gradient(#fff ${Math.round(p*360)}deg,transparent 0)`}
function screen(){
  return `<div class="sos-wrap"><button class="chip" data-go="board" style="cursor:pointer">◂ Back</button><h2 style="margin:10px 0 4px">🆘 SOS</h2>
  <p class="note" style="margin:0 0 12px">Press and hold for 3 seconds. Everyone on your team gets an urgent alert with your name and location.</p>
  <div class="sos-kinds" role="radiogroup" aria-label="What's wrong">${KINDS.map(k=>`<button type="button" data-soskind="${k}" role="radio" aria-checked="${kind===k}" class="sos-k${kind===k?" on":""}">${k}</button>`).join("")}</div>
  <div class="sos-stage"><button id="sosBtn" type="button" class="sos-btn" aria-label="SOS: press and hold for 3 seconds"><span class="sos-ring" id="sosRing"></span><span class="sos-in"><b>SOS</b><small>Hold 3 sec</small></span></button></div>
  <div class="note sos-note" id="sosNote" role="status">${esc(note)}</div>
  <p class="note" style="text-align:center">In danger right now? Call <a href="tel:911"><b>911</b></a> first.</p></div>`}
function paintRing(){if(!hold)return;const p=Math.min(1,(Date.now()-hold.t0)/HOLD);const r=document.getElementById("sosRing");if(r)r.style.cssText=ringStyle(p);
  if(p>=1){hold=null;if(r)r.style.cssText="";send();return}hold.raf=requestAnimationFrame(paintRing)}
function start(){if(hold||busy)return;warm();note="";paintNote();hold={t0:Date.now()};try{navigator.vibrate&&navigator.vibrate(30)}catch(e){}paintRing()}
function stop(){if(!hold)return;cancelAnimationFrame(hold.raf);hold=null;const r=document.getElementById("sosRing");if(r)r.style.cssText="";note="Keep holding for the full 3 seconds.";paintNote()}
document.addEventListener("pointerdown",e=>{if(e.target.closest&&e.target.closest("#sosBtn")){e.preventDefault();start()}});
["pointerup","pointercancel","pointerleave"].forEach(ev=>document.addEventListener(ev,e=>{if(hold&&(ev!=="pointerleave"||(e.target.closest&&e.target.closest("#sosBtn"))))stop()},true));
document.addEventListener("contextmenu",e=>{if(e.target.closest&&e.target.closest("#sosBtn"))e.preventDefault()});
document.addEventListener("click",e=>{const k=e.target.closest&&e.target.closest("[data-soskind]");if(k){kind=k.dataset.soskind;const w=document.querySelector(".sos-kinds");if(w)w.querySelectorAll(".sos-k").forEach(b=>{const on=b.dataset.soskind===kind;b.classList.toggle("on",on);b.setAttribute("aria-checked",on)})}});
/* 4.74.2: SOS sits right under the Emergency muster button, same look */
function placeSos(){if(document.getElementById("sosHome")||!feedOf())return;const m=$("#main");if(!m)return;const em=m.querySelector("#v11Em")||m.querySelector('button.btn.warn[data-go="recall"]');if(em)em.insertAdjacentHTML("afterend",card())}
{const _r=render;render=function(){if(view==="sos"){renderTabs();const m=$("#main");if(m){m.innerHTML=screen();warm()}return}const r=_r.apply(this,arguments);try{placeSos()}catch(e){}return r}}
function card(){return `<button class="btn warn" id="sosHome" data-go="sos" type="button" style="width:100%;margin-top:12px;font-size:17px">🆘 SOS</button>`}
{const _rt=renderTools;renderTools=function(){const r=_rt.apply(this,arguments);try{const g=document.querySelector("#main .tgrid");if(g&&!document.getElementById("sosTile"))g.insertAdjacentHTML("afterbegin",`<button data-go="sos" id="sosTile" class="hot"><span class="ic">${svg("alert")}</span><span><b>SOS</b><small>Hold to alert your leaders</small></span></button>`)}catch(e){}return r}}
{const _td=renderToday;renderToday=function(){const r=_td.apply(this,arguments);try{const m=$("#main");if(m&&feedOf()&&!document.getElementById("sosHome"))m.insertAdjacentHTML("beforeend",card())}catch(e){}return r}}

{const _rm=renderMe;renderMe=function(){_rm.apply(this,arguments);try{if(view!=="me"||!feedOf()||document.getElementById("sosHome"))return;const m=$("#main"),t=m&&m.querySelector(".v12tabs");const h=card();if(t)t.insertAdjacentHTML("afterend",h);else if(m)m.insertAdjacentHTML("afterbegin",h)}catch(e){}}}

/* ---------- leader ---------- */
const clean=(v,n)=>String(v||"").replace(/[<>]/g,"").slice(0,n);
function sosIn(f,o,r){const id=clean(o.sid,20);if(!id||list().some(x=>x.id===id))return;
  const kd=KINDS.includes(o.kind)?o.kind:"Help";const la=+o.lat,ln=+o.lng;const ok=isFinite(la)&&isFinite(ln)&&Math.abs(la)<=90&&Math.abs(ln)<=180&&(la||ln);
  const x={id,feed:f.id,who:clean(o.me,30)||"Someone",kind:kd,t:Date.parse(r&&r.created_at)||+o.t||Date.now(),st:"open"};
  if(ok){x.lat=la;x.lng=ln;x.acc=Math.max(0,Math.min(99999,+o.acc||0))}
  list().unshift(x);S.sos=S.sos.slice(0,40);
  try{actAdd("🆘",x.who+" sent an SOS ("+kd+")","feed")}catch(e){}save();
  try{navigator.vibrate&&navigator.vibrate([300,120,300,120,300])}catch(e){}
  try{if(typeof localAlert==="function")localAlert("🆘 SOS: "+x.who,kd+". Open Accounted For now.","sos")}catch(e){}
  show(true)}
window.sosIn=sosIn;
/* 4.73.1: everyone on the team gets the SOS as a push that carries the details, so it also shows on member phones */
function sosRecv(o){if(!o||typeof o!=="object")return;sosIn({id:0},{sid:o.id,me:o.w,kind:o.k,lat:o.la,lng:o.ln,acc:o.ac,t:o.t},null)}
window.sosRecv=sosRecv;
if("serviceWorker" in navigator)navigator.serviceWorker.addEventListener("message",ev=>{const d=ev.data;if(d&&d.type==="sos")sosRecv(d.sos)});
{const h=String(location.hash||"");if(h.startsWith("#sos:")){try{const o=JSON.parse(decodeURIComponent(h.slice(5)));setTimeout(()=>sosRecv(o),1200)}catch(e){}}}
function open(){return list().filter(x=>x.st==="open"&&Date.now()-x.t<12*3600e3)}
function show(force){const L=open();const old=document.getElementById("sosOv");if(old)old.remove();if(!L.length)return;
  const d=document.createElement("div");d.id="sosOv";d.setAttribute("role","alertdialog");d.setAttribute("aria-label","SOS alert");
  d.innerHTML=`<div class="sos-ov-in"><div class="sos-ov-h">🆘 SOS</div>${L.map(x=>{const m=typeof matchMarine==="function"?matchMarine(x.who):null;const ph=m&&m.phone;
    const map=x.lat!=null?`https://maps.google.com/?q=${x.lat},${x.lng}`:"";
    return `<div class="sos-it"><div class="sos-who">${esc(x.who)}</div><div class="sos-kd">${esc(x.kind)} · ${esc(hhmm(x.t))}${typeof ago==="function"?" · "+esc(ago(x.t)):""}</div>
      ${map?`<a class="sos-b" href="${map}" target="_blank" rel="noopener">📍 Open map${x.acc?` (±${x.acc} m)`:""}</a>`:`<div class="sos-kd">No location shared</div>`}
      ${ph?`<div class="sos-row"><a class="sos-b" href="${telHref(ph)}">📞 Call</a><a class="sos-b" href="${smsTo(ph)}">💬 Text</a></div>`:""}
      <button class="sos-b sos-ok" data-sosack="${esc(x.id)}">I'm responding</button></div>`}).join("")}<button class="sos-x" id="sosClose">Close for now</button></div>`;
  document.body.appendChild(d)}
window.sosShow=show;
document.addEventListener("click",e=>{const a=e.target.closest&&e.target.closest("[data-sosack]");
  if(a){const x=list().find(y=>y.id===a.dataset.sosack);if(x){x.st="ack";x.ackAt=Date.now();save();try{actAdd("✓",x.who+" SOS: someone is responding","feed")}catch(er){}}show();return}
  if(e.target.closest&&e.target.closest("#sosClose")){const o=document.getElementById("sosOv");if(o)o.remove()}});
setTimeout(()=>{try{if(open().length)show()}catch(e){}},2500);

const st=document.createElement("style");st.textContent=`
.sos-wrap{display:flex;flex-direction:column;gap:6px}.sos-kinds{display:flex;gap:8px;margin-bottom:8px}
.sos-k{flex:1;border:1.5px solid var(--line);border-radius:12px;padding:10px 0;font-weight:700;background:var(--surface);color:inherit}.sos-k.on{border-color:#dc2626;color:#dc2626;background:color-mix(in srgb,#dc2626 10%,var(--surface))}
.sos-stage{display:flex;justify-content:center;margin:22px 0 14px}
.sos-btn{position:relative;width:230px;height:230px;border-radius:50%;border:0;background:radial-gradient(circle,#ef4444,#b91c1c);color:#fff;box-shadow:0 0 0 14px #ef444422,0 0 0 30px #ef444412,0 14px 34px #b91c1c88;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.sos-ring{position:absolute;inset:8px;border-radius:50%;-webkit-mask:radial-gradient(circle,transparent 62%,#000 64%);mask:radial-gradient(circle,transparent 62%,#000 64%);pointer-events:none}
.sos-in{position:relative;display:flex;flex-direction:column;align-items:center}.sos-in b{font-size:54px;font-weight:900;letter-spacing:2px}.sos-in small{font-size:13px;opacity:.9}
.sos-note{text-align:center;min-height:36px;font-weight:600}.sos-card{display:flex;gap:12px;align-items:center;text-align:left;width:100%;margin-top:12px;border-color:#dc2626!important}.sos-card small{display:block;color:var(--muted)}.sos-dot{font-size:26px}
#sosOv{position:fixed;inset:0;z-index:500;background:#7f1d1dF2;color:#fff;overflow:auto;padding:calc(18px + env(safe-area-inset-top)) 18px 30px;display:flex;justify-content:center}
.sos-ov-in{width:100%;max-width:460px}.sos-ov-h{font-size:34px;font-weight:900;text-align:center;margin-bottom:12px}.sos-it{background:#fff;color:#111;border-radius:18px;padding:16px;margin-bottom:12px;display:flex;flex-direction:column;gap:8px}
.sos-who{font-size:24px;font-weight:900}.sos-kd{font-size:13px;color:#6b7280}.sos-row{display:flex;gap:8px}.sos-row .sos-b{flex:1}
.sos-b{display:block;text-align:center;text-decoration:none;font-weight:800;border:0;border-radius:12px;padding:13px;background:#eef1f6;color:#111;font-size:15px}.sos-ok{background:#16a34a;color:#fff}.sos-x{display:block;margin:6px auto 0;background:none;border:0;color:#fff;text-decoration:underline;font-size:14px;padding:10px}`;
document.head.appendChild(st);
})();
