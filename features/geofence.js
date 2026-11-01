/* Accounted For 4.74.0 — Place check-in (geofence).
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
function lpanel(){const z=zone();
  return `<div class="panel" id="gfLead"><b>📍 Muster place</b>
    ${z?`<p class="note" style="margin:6px 0">${esc(z.name||"Muster place")} · ${lbl(z.r)}. People who turn on place check-in are checked in On Hand when they open the app here.</p>
      <div class="evts">${R.map(r=>`<button data-gfr="${r}" aria-pressed="${z.r===r}">${lbl(r)}</button>`).join("")}</div>
      <div class="row2"><button class="btn alt" id="gfSet">Move it to where I am</button><button class="btn alt" id="gfClr">Remove</button></div>`
    :`<p class="note" style="margin:6px 0">Stand at your muster place and tap below. People can choose to be checked in automatically when they open the app there. Their location never leaves their phone.</p>
      <input id="gfName" maxlength="30" placeholder="Name it (e.g. Motor pool)" style="margin-bottom:8px"><button class="btn" id="gfSet">Use where I am now</button>`}
    <div class="note" id="gfNote"></div></div>`}
{const _r=render;render=function(){const r=_r.apply(this,arguments);
  try{if(view==="data"&&!(typeof memberMode==="function"&&memberMode())&&S.role!=="view"){const m=document.querySelector("#main");if(m&&!m.querySelector("#gfLead")){const q=m.querySelector("#qhPanel")||m.querySelector("#ppPanel");if(q)q.insertAdjacentHTML("afterend",lpanel());else m.insertAdjacentHTML("afterbegin",lpanel())}}}catch(e){}return r}}
{const _m=mpDigest;mpDigest=function(m){const d=_m.apply(this,arguments);try{const z=zone();if(z)d.gz={name:clean(z.name,30),lat:z.lat,lng:z.lng,r:z.r}}catch(e){}return d}}
window.gfLeadHtml=()=>lpanel();
function repaintLead(){const o=document.getElementById("gfLead");if(o)o.outerHTML=lpanel()}
document.addEventListener("click",async e=>{const t=e.target;if(!t||!t.closest)return;
  const rb=t.closest("[data-gfr]");if(rb&&S.gz){S.gz.r=+rb.dataset.gfr;save();repaintLead();try{mpSchedule()}catch(x){}return}
  if(t.closest("#gfClr")){delete S.gz;save();repaintLead();try{mpSchedule()}catch(x){}return}
  if(t.closest("#gfSet")){const n=document.getElementById("gfNote");if(n)n.textContent="Getting your location…";
    try{const c=await here();const nm=clean((document.getElementById("gfName")||{}).value,30)||(S.gz&&S.gz.name)||"Muster place";
      S.gz={name:nm,lat:+c.latitude.toFixed(5),lng:+c.longitude.toFixed(5),r:(S.gz&&S.gz.r)||250};save();repaintLead();try{mpSchedule()}catch(x){}toast("📍 Muster place saved")}
    catch(x){if(n)n.textContent=String(x.message||x)}}});

/* ---------- member: check in when I'm there ---------- */
const D=()=>S.me&&S.me.d&&String(S.me.pk)!=="preview"?S.me.d:null;
const mz=()=>{const d=D(),z=d&&d.gz;return okZ(z)&&d.feed&&d.feed.mk&&d.feed.ek?z:null};
let busy=false;
async function sendIn(z){const d=D(),f=d.feed;
  const me=(typeof title==="function"?title(d.rank)+" "+title(String(d.name||"").split(",")[0].trim()):String(d.name||"")).trim().slice(0,40);
  const o={k:"ck",cid:"c"+Date.now().toString(36)+rndId(4),me,mid:d.mid||"",sec:d.sec||"",st:"On Hand",oth:"",from:"",to:"",loc:"",note:("Auto: arrived at "+(z.name||"muster place")).slice(0,80),at:Date.now()};
  const ct=await fdEnc(f.ek,o);const meta={alert:{alert:"ck",feed:f.id,mk:f.mk}};
  const r=await SB.rpc("feed_req",{p_feed:f.id,p_member_key:f.mk,p_ct:ct},meta);if(r===null)throw new Error("offline");
  try{SB.notify(null,meta.alert)}catch(e){}}
async function check(manual){if(busy)return;const z=mz();if(!z||!(S.gfOn||manual))return;if(!manual&&S.gfDay===day())return;
  busy=true;try{const c=await here();const d=dist(c.latitude,c.longitude,z.lat,z.lng);
    if(d<=z.r+Math.min(100,c.accuracy||0)){await sendIn(z);S.gfDay=day();save();paint();toast("📍 Checked in: you're at "+(z.name||"the muster place"))}
    else if(manual){toast("You're about "+(d>=1000?(d/1000).toFixed(1)+" km":Math.round(d)+" m")+" from "+(z.name||"the muster place")+".")}}
  catch(e){if(manual)toast(String(e.message||"Couldn't check in. Try again."))}finally{busy=false}}
function card(){const z=mz();if(!z)return "";const done=S.gfDay===day();
  return `<div class="panel" id="gfMe"><b>📍 ${esc(z.name||"Muster place")}</b>
    <label class="lrow" style="margin:8px 0;cursor:pointer"><input type="checkbox" id="gfOn" ${S.gfOn?"checked":""}><span style="flex:1;min-width:0"><span class="t" style="display:block">Check me in when I'm there</span><span class="s" style="display:block">Checked in On Hand once a day when you open the app at this place. Your location stays on your phone.</span></span></label>
    <button class="btn alt" id="gfNow" type="button">I'm here: check in now</button>
    <div class="note">${done?"✓ Checked in today.":S.gfOn?"On. Open the app at the place.":"Off."}</div></div>`}
function paint(){const o=document.getElementById("gfMe");if(o)o.outerHTML=card()}
{const _rm=renderMe;renderMe=function(){_rm.apply(this,arguments);try{if(view!=="me"||document.getElementById("gfMe"))return;const h=card();if(!h)return;const m=$("#main"),t=m&&(m.querySelector("#sosHome")||m.querySelector(".v12tabs"));if(t)t.insertAdjacentHTML("afterend",h);else if(m)m.insertAdjacentHTML("afterbegin",h)}catch(e){}}}
document.addEventListener("change",e=>{if(e.target&&e.target.id==="gfOn"){S.gfOn=!!e.target.checked;save();paint();if(S.gfOn)check(false)}});
document.addEventListener("click",e=>{if(e.target.closest&&e.target.closest("#gfNow"))check(true)});
document.addEventListener("visibilitychange",()=>{if(!document.hidden)setTimeout(()=>check(false),1500)});
setTimeout(()=>check(false),4500);
if(typeof every==="function")every(300000,()=>{if(!document.hidden)check(false)},"geofence");
window.gfCheck=check;
})();
