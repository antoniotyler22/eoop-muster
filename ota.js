/* Accounted For 4.151.0: over-the-air updates for the iPhone and Android apps.
   The web app already updates itself. The store apps carry their own copy of the code, so until now a new version only
   reached them through an App Store or Google Play update. From this build on, a store app:
   1. checks accountedforteam.com/version.json when it opens, when you return to it, and every 10 minutes,
   2. downloads the newer app.bundle.js and app.css, checks they look whole, and keeps them on the phone,
   3. runs them the next time it opens (or when you come back to it), instead of the copy inside the app,
   4. goes back to the copy inside the app by itself if the downloaded code doesn't start within 12 seconds.
   version.json can carry "nb": the oldest app build the new code works with (raise it when a change needs a new native
   piece); older builds then wait for a store update instead of downloading code they can't run.
   Only phones that already have this build can update this way. Phones on an older build still need one store update. */
(()=>{
const O=window.AFOTA={native:false,base:"https://accountedforteam.com/",_bin:"",_run:"",store:null,pending:"",busy:false,last:0};
try{const C=window.Capacitor;O.native=!!(C&&C.isNativePlatform&&C.isNativePlatform())}catch(e){}
Object.defineProperty(O,"bin",{get:()=>O._bin||String(window.AV||"0"),set:v=>{O._bin=v},enumerable:true});
Object.defineProperty(O,"run",{get:()=>O._run||O.bin,set:v=>{O._run=v},enumerable:true});
const BAD="eop-ota-bad";
const cmp=(a,b)=>{const x=String(a||"0").split(".").map(Number),y=String(b||"0").split(".").map(Number);for(let i=0;i<3;i++){const d=(x[i]||0)-(y[i]||0);if(d)return d<0?-1:1}return 0};
O.cmp=cmp;O.reload=()=>location.reload();
const bad=()=>{try{return localStorage.getItem(BAD)||""}catch(e){return ""}};
const markBad=v=>{try{localStorage.setItem(BAD,v)}catch(e){}};

/* ---------- where the downloaded code is kept (IndexedDB: it's about 2 MB, too big for localStorage) ---------- */
function idbStore(){const open=()=>new Promise((res,rej)=>{try{const r=indexedDB.open("af-ota",1);r.onupgradeneeded=()=>r.result.createObjectStore("b");r.onerror=()=>rej(r.error);r.onsuccess=()=>res(r.result)}catch(e){rej(e)}});
  const tx=(mode,fn)=>open().then(db=>new Promise((res,rej)=>{const t=db.transaction("b",mode),q=fn(t.objectStore("b"));t.oncomplete=()=>{try{db.close()}catch(e){}res(q&&q.result)};t.onerror=()=>rej(t.error)}));
  return {get:()=>tx("readonly",s=>s.get("cur")),set:rec=>tx("readwrite",s=>s.put(rec,"cur")),del:()=>tx("readwrite",s=>s.delete("cur"))}}
O.store=idbStore();

/* does the downloaded copy look whole and newer than what's running? */
const whole=r=>!!(r&&typeof r.v==="string"&&typeof r.js==="string"&&r.js.length>200000&&/window\.__appReady\s*=\s*true/.test(r.js.slice(-400))&&typeof r.css==="string"&&r.css.length>1000);
const usable=r=>whole(r)&&cmp(r.v,O.bin)>0&&r.v!==bad()&&(!r.nb||cmp(O.bin,r.nb)>=0);

/* ---------- opening: use the downloaded copy if there is a good one ---------- */
O.boot=async function(){if(!O.native)return null;
  try{const r=await Promise.race([O.store.get(),new Promise(res=>setTimeout(()=>res(null),1500))]);
    if(usable(r))return r;
    if(r&&cmp(r.v,O.bin)<=0)O.store.del().catch(()=>{})}catch(e){}
  return null};
O.apply=function(r,doc){doc=doc||document;
  window.AV=r.v;O.run=r.v;
  const st=doc.createElement("style");st.id="otaCss";st.textContent=r.css;doc.head.appendChild(st);
  const s=doc.createElement("script");s.id="otaJs";s.textContent=r.js;doc.body.appendChild(s);
  /* if it doesn't start, drop it and open the copy inside the app */
  setTimeout(()=>{if(window.__appReady===true)return;markBad(r.v);O.store.del().catch(()=>{}).then(()=>O.reload())},12000)};

/* ---------- checking for and downloading a newer version ---------- */
const typing=()=>{const a=document.activeElement;return !!a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)};
O.check=async function(){if(!O.native||O.busy||Date.now()-O.last<20000)return "skip";O.busy=true;O.last=Date.now();
  try{const r=await fetch(O.base+"version.json?t="+Date.now(),{cache:"no-store"});if(!r.ok)return "offline";
    const j=await r.json(),v=String(j&&j.v||"");if(!v||cmp(v,O.run)<=0)return "current";
    if(v===bad())return "bad";
    if(j.nb&&cmp(O.bin,String(j.nb))<0)return "needs-store-update";
    if(O.pending===v)return "ready";
    const [a,b]=await Promise.all([fetch(O.base+"app.bundle.js?v="+encodeURIComponent(v),{cache:"no-store"}),fetch(O.base+"app.css?v="+encodeURIComponent(v),{cache:"no-store"})]);
    if(!a.ok||!b.ok)return "offline";
    const rec={v,nb:j.nb?String(j.nb):"",js:await a.text(),css:await b.text(),at:Date.now()};
    if(!whole(rec))return "incomplete";
    await O.store.set(rec);O.pending=v;return "ready"}
  catch(e){return "offline"}finally{O.busy=false}};

/* a downloaded version is waiting: switch to it when the person comes back, not while they're typing */
O.switchIfReady=function(){if(!O.native||!O.pending||cmp(O.pending,O.run)<=0||typing())return false;try{O.reload()}catch(e){return false}return true};
O.start=function(){if(!O.native)return;
  setTimeout(O.check,4000);setInterval(O.check,10*60000);
  document.addEventListener("visibilitychange",()=>{if(document.hidden)return;O.check().then(()=>O.switchIfReady())});
  window.addEventListener("online",()=>{O.check()})};
})();
