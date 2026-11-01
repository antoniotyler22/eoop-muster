/* Accounted For: Profile photos.
   Anyone can add a photo (Settings → Profile photo: take one with the camera or upload one; or tap your picture on the Talk screen). It shows instead of your
   initials wherever you appear: Feed posts, People, Talk. Your team sees it too: a small 128-pixel copy rides inside your
   encrypted Feed posts and Talk presence, so the server never holds a separate picture. Photos from other people are
   kept on this phone only (IndexedDB), up to 80 of them. "Use my initials" removes yours. */
(()=>{
const SZ=128,MAXB=16000,KEEP=80,OK=/^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/;
const key=n=>String(n||"").toUpperCase().replace(/\s+/g," ").trim().slice(0,30);
/* The photo is mine only if THIS phone took or chose it. (State that syncs between a team's phones carried one person's
   photo onto the others, who then sent it out under their own names.) A phone-local mark says which photo is mine. */
const hsh=d=>{d=String(d||"");return d.length+":"+d.slice(30,70)+d.slice(-30)};
const LSK="af-pp";
const mine=()=>{try{return S.myPhoto&&localStorage.getItem(LSK)===hsh(S.myPhoto)?S.myPhoto:""}catch(e){return ""}};
window.afPhotoOwn=p=>{S.myPhoto=p;try{localStorage.setItem(LSK,hsh(p))}catch(e){}};
const mem=new Map();                                     /* NAME -> data URL, other people's photos */
const DB={name:"af-avatars",store:"av"};
const idb=()=>new Promise((ok,no)=>{try{const r=indexedDB.open(DB.name,1);r.onupgradeneeded=()=>r.result.createObjectStore(DB.store);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}catch(e){no(e)}});
async function store(k,v){try{const d=await idb();await new Promise((ok,no)=>{const t=d.transaction(DB.store,"readwrite"),s=t.objectStore(DB.store);if(v)s.put(v,k);else s.delete(k);t.oncomplete=ok;t.onerror=()=>no(t.error)});d.close()}catch(e){}}
async function loadAll(){try{const d=await idb();const rows=await new Promise((ok,no)=>{const out=[],c=d.transaction(DB.store).objectStore(DB.store).openCursor();c.onsuccess=()=>{const x=c.result;if(x){out.push([x.key,x.value]);x.continue()}else ok(out)};c.onerror=()=>no(c.error)});d.close();
  let n=0;for(const [k,v] of rows)if(typeof v==="string"&&OK.test(v)&&v.length<=MAXB&&!mem.has(k)){mem.set(k,v);n++}return n}catch(e){return 0}}
/* who am I, by every name this phone uses for me */
function myKeys(){const s=new Set();const add=n=>{n=key(n);if(n)s.add(n)};add(S.myName);add(S.postAs);if(S.who)add(S.who.n);
  for(const f of (S.feeds||[])){add(f.me);try{add(fdBy(f))}catch(e){}}return s}
const photoOf=name=>{const k=key(name);if(!k)return "";if(mine()&&myKeys().has(k))return mine();return mem.get(k)||""};
window.afPhoto=photoOf;
function learn(by,av){const k=key(by);if(!k||typeof av!=="string"||av.length>MAXB||!OK.test(av)||myKeys().has(k)||mem.get(k)===av)return;
  mem.set(k,av);if(mem.size>KEEP){const old=mem.keys().next().value;mem.delete(old);store(old,null)}store(k,av);
  if(typeof view!=="undefined"&&(view==="talk"||view==="people")&&!document.querySelector("input:focus,textarea:focus")){clearTimeout(learn.t);learn.t=setTimeout(()=>{try{render()}catch(e){}},400)}}

/* the picture itself replaces the initials circle */
{const _a=fdAv;fdAv=function(name){const p=photoOf(name);if(!p)return _a.apply(this,arguments);return `<div class="av avp" role="img" aria-label="${esc(String(name||""))}" style="background-image:url(${p})"></div>`}}

/* the team gets it: small copy inside encrypted posts and Talk presence. Only when the post is BY me: my photo never rides on
   anything written about or for someone else, so it can never become another person's picture. */
{const _e=fdEnc;fdEnc=function(k,o){try{if(mine()&&mine().length<=MAXB&&o&&typeof o==="object"&&!o.av&&o.by&&myKeys().has(key(o.by))&&(typeof o.t==="string"||o.k==="p"))o=Object.assign({},o,{av:mine()})}catch(e){}return _e.call(this,k,o)}}
{const _d=fdDec;fdDec=async function(){const o=await _d.apply(this,arguments);try{if(o&&o.av&&o.by)learn(o.by,o.av)}catch(e){}return o}}

/* ---------- taking / choosing a photo ---------- */
function shrink(file){return new Promise((ok,no)=>{const img=new Image(),u=URL.createObjectURL(file);
  img.onload=()=>{try{const s=Math.min(img.naturalWidth,img.naturalHeight),sx=(img.naturalWidth-s)/2,sy=(img.naturalHeight-s)/2;
    const c=document.createElement("canvas");c.width=c.height=SZ;const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,SZ,SZ);x.drawImage(img,sx,sy,s,s,0,0,SZ,SZ);
    let q=.8,d=c.toDataURL("image/jpeg",q);while(d.length>MAXB&&q>.35){q-=.1;d=c.toDataURL("image/jpeg",q)}
    URL.revokeObjectURL(u);d.length<=MAXB&&OK.test(d)?ok(d):no(new Error("big"))}catch(e){no(e)}};
  img.onerror=()=>{URL.revokeObjectURL(u);no(new Error("bad"))};img.src=u})}
const inps={};                                           /* "up" = choose or upload from the phone, "cam" = open the camera */
function pick(mode){let inp=inps[mode];if(!inp){inp=inps[mode]=document.createElement("input");inp.type="file";inp.accept="image/*";if(mode==="cam")inp.setAttribute("capture","user");inp.style.display="none";document.body.appendChild(inp);
  inp.addEventListener("change",async()=>{const f=inp.files&&inp.files[0];inp.value="";if(!f)return;
    try{S.myPhoto=await shrink(f);try{localStorage.setItem(LSK,hsh(S.myPhoto))}catch(e){}save();toast("Photo saved");try{render()}catch(e){}}catch(e){toast("Couldn't use that photo. Try another.")}})}
  inp.click()}
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;
  if(t.closest("#ppTake")){pick("cam");return}
  if(t.closest("#ppPick")||t.closest("#main .tk-you .tk-av")){pick("up");return}
  if(t.closest("#ppDel")){delete S.myPhoto;try{localStorage.removeItem(LSK)}catch(x){}save();toast("Using your initials");try{render()}catch(x){}}});

/* ---------- Settings panel ---------- */
window.ppPanelHtml=()=>panel();
function panel(){const nm=S.myName||(typeof fdCur==="function"&&fdCur()?fdBy(fdCur()):"")||"ME";
  return `<div class="panel" id="ppPanel"><b>Profile photo</b><div class="lrow" style="margin:8px 0"><div class="fch">${fdAv(nm)}</div><span style="flex:1;min-width:0"><span class="t" style="display:block">${esc(nm)}</span><span class="s" style="display:block">${mine()?"Your team sees this photo":"Showing your initials"}</span></span></div>
  <div style="display:flex;gap:8px"><button class="btn" id="ppTake" style="flex:1">Take photo</button><button class="btn" id="ppPick" style="flex:1">Upload photo</button></div>${mine()?`<button class="btn alt" id="ppDel" style="width:100%;margin-top:8px">Use my initials</button>`:""}
  <p class="note">It shows instead of your initials. Your team sees a small copy that travels inside your encrypted posts, never as a separate file.</p></div>`}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{if(view==="data"){const m=document.querySelector("#main");if(m&&!m.querySelector("#ppPanel"))m.insertAdjacentHTML("afterbegin",panel())}}catch(e){}return r}}

{const c=document.createElement("style");c.textContent=`.av.avp{background-size:cover;background-position:center;background-repeat:no-repeat;font-size:0}#main .tk-you .tk-av{cursor:pointer}`;document.head.appendChild(c)}
/* one-time clean-up: a photo this phone didn't take is dropped, and pictures learned from others are re-learned fresh */
try{if(S.myPhoto&&!mine()){delete S.myPhoto;save()}if(!localStorage.getItem("af-av-v2")){localStorage.setItem("af-av-v2","1");idb().then(d=>{const t=d.transaction(DB.store,"readwrite");t.objectStore(DB.store).clear();t.oncomplete=()=>d.close()}).catch(()=>{})}}catch(e){}
loadAll().then(n=>{if(n&&typeof view!=="undefined"&&(view==="feed"||view==="talk"||view==="people"))try{render()}catch(e){}});
})();
