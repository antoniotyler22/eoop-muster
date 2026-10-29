/* Accounted For 4.18 — Photos on Feed posts.
   Leaders (and anyone who can post) attach up to 4 photos to a post. Photos are shrunk on the phone, travel inside
   the post's encrypted payload like the text, and each phone keeps them in its own store (IndexedDB) so the roster
   and feed in storage stay small. Tap a photo to see it full screen. */
(()=>{
const MAXP=4,MAXPX=1024,Q=0.7;
const DB={name:"af-feed",store:"pic"};
const cache=new Map();let pend=[];
function idb(){return new Promise((ok,no)=>{try{const r=indexedDB.open(DB.name,1);r.onupgradeneeded=()=>r.result.createObjectStore(DB.store);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}catch(e){no(e)}})}
async function put(id,data){cache.set(id,data);try{const d=await idb();await new Promise((ok,no)=>{const t=d.transaction(DB.store,"readwrite");t.objectStore(DB.store).put(data,id);t.oncomplete=ok;t.onerror=()=>no(t.error)});d.close()}catch(e){}}
async function get(id){if(cache.has(id))return cache.get(id);try{const d=await idb();const v=await new Promise((ok,no)=>{const r=d.transaction(DB.store).objectStore(DB.store).get(id);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});d.close();if(v)cache.set(id,v);return v||""}catch(e){return ""}}
window.feedPic=get;
function shrink(file){return new Promise(ok=>{try{const img=new Image();const u=URL.createObjectURL(file);img.onload=()=>{const r=Math.min(1,MAXPX/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.round(img.width*r);c.height=Math.round(img.height*r);c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);ok(c.toDataURL("image/jpeg",Q))};img.onerror=()=>ok("");img.src=u}catch(e){ok("")}})}
const raw=f=>new Promise(ok=>{try{const r=new FileReader();r.onload=()=>ok(String(r.result||""));r.onerror=()=>ok("");r.readAsDataURL(f)}catch(e){ok("")}});
async function addFiles(files){let n=0;for(const f of [...files]){const isImg=/^image\//.test(f.type||"")||!f.type||/\.(jpe?g|png|gif|webp|heic|heif)$/i.test(f.name||"");if(!isImg){toast("That file isn't a photo.");continue}
    if(pend.length>=MAXP){toast("Up to "+MAXP+" photos per post.");break}
    let data=await shrink(f);if(!data||!data.startsWith("data:image/")){const r=await raw(f);if(r.startsWith("data:image/")&&r.length<2500000)data=r}
    if(!data){toast("Couldn't read that photo. Try a JPEG or PNG.");continue}pend.push({id:"i"+Date.now().toString(36)+rndId(5),data});n++}
  drawPend();if(n)toast(n+" photo"+(n>1?"s":"")+" added · tap Post")}
window.feedAddPhoto=(id,data)=>{pend.push({id,data})};
window.feedPendingPhotos=()=>pend.length;
function pendHTML(){return `<div class="fp-box" id="fpBox"><div class="fp-pend">${pend.map(p=>`<span class="fp-th"><img src="${p.data}" alt=""><button type="button" class="fp-x" data-fpx="${p.id}" aria-label="Remove photo">×</button></span>`).join("")}</div>
  <div class="row2"><button type="button" class="btn alt" id="fpPick">📷 ${pend.length?"Add another photo":"Add photos"}</button><button type="button" class="btn alt" id="fpCam">📸 Take a photo</button></div>
  <input type="file" id="fpIn" accept="image/*" multiple class="fp-hid" aria-label="Choose photos"><input type="file" id="fpCamIn" accept="image/*" capture="environment" class="fp-hid" aria-label="Take a photo">${pend.length?`<p class="note" style="margin:4px 0 0">${pend.length} of ${MAXP} photos · you can post with no text</p>`:""}</div>`}
function drawPend(){const b=$("#fpBox");if(b)b.outerHTML=pendHTML();else{const p=$("#fdPost");if(p)p.insertAdjacentHTML("beforebegin",pendHTML())}}
/* compose box: the photo row sits right above Post */
if(typeof renderFeed==="function"){const _rf=renderFeed;renderFeed=function(){const r=_rf.apply(this,arguments);try{const b=$("#fdPost");if(b&&!$("#fpBox"))b.insertAdjacentHTML("beforebegin",pendHTML());fill()}catch(e){}return r}}
document.addEventListener("change",e=>{if(e.target.id!=="fpIn"&&e.target.id!=="fpCamIn")return;const f=e.target.files;if(f&&f.length)addFiles(f).then(()=>{try{e.target.value=""}catch(x){}})});
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;if(t.closest("#fpPick")){const i=$("#fpIn");if(i)i.click();return}if(t.closest("#fpCam")){const i=$("#fpCamIn");if(i)i.click();return}});
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;const x=t.closest("[data-fpx]");if(x){pend=pend.filter(p=>p.id!==x.dataset.fpx);drawPend();return}
  const im=t.closest("[data-fpview]");if(im){const src=im.querySelector("img")&&im.querySelector("img").src;if(!src||!/^data:|^blob:/.test(src))return;const o=document.createElement("div");o.className="rm-view";o.innerHTML=`<img src="${src}" alt=""><button type="button" class="btn alt">Close</button>`;o.addEventListener("click",()=>o.remove());document.body.appendChild(o)}},true);

/* outgoing: a post being encrypted takes the pending photos with it */
let lastImg=null,lastTxt="";
if(typeof fdEnc==="function"){const _enc=fdEnc;fdEnc=function(ek,o){if(o&&typeof o==="object"&&typeof o.t==="string"&&!o.c&&pend.length&&!o.img){o.img=pend.map(p=>p.id);o.pics={};for(const p of pend){o.pics[p.id]=p.data;put(p.id,p.data)}lastImg=o.img.slice();lastTxt=o.t;pend=[]}return _enc.apply(this,arguments)}}
/* incoming: photos come out of the payload into this phone's store; the post keeps only their ids */
if(typeof fdDec==="function"){const _dec=fdDec;fdDec=async function(){const o=await _dec.apply(this,arguments);try{if(o&&o.pics&&typeof o.pics==="object"){for(const [id,data] of Object.entries(o.pics))if(/^[a-z0-9]{6,24}$/i.test(id)&&typeof data==="string"&&data.startsWith("data:image/"))await put(id,data);delete o.pics}}catch(e){}return o}}
/* the post we just made shows its photos right away */
{const _rf=renderFeed;renderFeed=function(){if(lastImg){try{const f=fdCur();const p=f&&f.posts&&f.posts[0];if(p&&!p.img&&p.txt===lastTxt&&Date.now()-p.t<60000){p.img=lastImg;save()}}catch(e){}lastImg=null}return _rf.apply(this,arguments)}}

/* on the card */
function picsHTML(p){if(!Array.isArray(p.img)||!p.img.length)return "";return `<div class="fp-pics" data-fppics="1">${p.img.map(id=>`<button type="button" class="fp-pic" data-fpview="1" data-fpid="${esc(id)}"><img alt="Photo" hidden><span class="fp-miss" hidden>📷 photo not on this phone</span></button>`).join("")}</div>`}
window.feedPicsHTML=picsHTML;
if(typeof fdCard==="function"){const _fc=fdCard;fdCard=function(f,p){let h=_fc.apply(this,arguments);const g=picsHTML(p);
  if(f&&f.lk){const del=`<button class="chip" data-fddel="${p.id}" style="cursor:pointer;color:var(--warn)">${(typeof armed!=="undefined"&&armed==="fddel"+p.id)?"Tap again to delete":"🗑 Delete"}</button>`;const k=h.indexOf('data-fdpin="'+p.id+'"');if(k>0){const j=h.indexOf("</button>",k);if(j>0)h=h.slice(0,j+9)+del+h.slice(j+9)}}
  if(!g)return h;const i=h.lastIndexOf("</article>");return i<0?h+g:h.slice(0,i)+g+h.slice(i)}}
/* the leader can clear the whole feed */
let clearArm=false;
{const _rf=renderFeed;renderFeed=function(){const r=_rf.apply(this,arguments);try{const f=fdCur();if(f&&f.lk&&(f.posts||[]).length&&!$("#fpClear"))$("#main").insertAdjacentHTML("beforeend",`<button class="btn alt" id="fpClear" style="width:100%;margin-top:14px;color:var(--warn)">${clearArm?"Tap again: delete every post ("+f.posts.length+")":"Clear the whole feed"}</button>`)}catch(e){}return r}}
document.addEventListener("click",e=>{const t=e.target;if(!t.closest||!t.closest("#fpClear"))return;const f=fdCur();if(!f||!f.lk)return;
  if(!clearArm){clearArm=true;renderFeed();setTimeout(()=>{if(clearArm){clearArm=false;if(view==="feed")renderFeed()}},4000);return}
  clearArm=false;const ids=(f.posts||[]).map(p=>p.id);const b=t.closest("#fpClear");b.disabled=true;b.textContent="Deleting…";
  (async()=>{let n=0;for(const pid of ids){try{await SB.rpc("feed_delete_post",{p_feed:f.id,p_leader_key:f.lk,p_post:pid});f.posts=f.posts.filter(p=>p.id!==pid);n++}catch(err){}}f.pins=[];save();renderFeed();toast(n===ids.length?"Feed cleared":"Deleted "+n+" of "+ids.length+". Try again for the rest.")})()});
async function fill(){for(const el of document.querySelectorAll("[data-fpid]")){const id=el.dataset.fpid;const img=el.querySelector("img");if(!img||img.src)continue;const data=await get(id);if(!el.isConnected)continue;if(data){img.src=data;img.hidden=false}else{el.querySelector(".fp-miss").hidden=false}}}
window.feedPicsFill=fill;
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{if(document.querySelector("[data-fpid]"))fill()}catch(e){}return r}}

{const st=document.createElement("style");st.textContent=`.fp-box{margin:8px 0}.fp-hid{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden}.fp-pend{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px}.fp-th{position:relative;width:72px;height:72px;border-radius:12px;overflow:hidden;border:1px solid var(--line)}.fp-th img{width:100%;height:100%;object-fit:cover;display:block}
.fp-x{position:absolute;top:2px;right:2px;width:24px;height:24px;border-radius:12px;border:0;background:rgba(0,0,0,.6);color:#fff;font-size:16px;line-height:1;cursor:pointer}
.fp-pics{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px;margin-top:8px}.fp-pic{position:relative;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--surface-2);padding:0;min-height:96px;display:block}.fp-pic img{width:100%;height:140px;object-fit:cover;display:block}.fp-miss{display:block;font-size:12px;padding:12px;text-align:center}
.rm-view{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:12px}.rm-view img{max-width:100%;max-height:85vh;object-fit:contain;touch-action:pinch-zoom}`;document.head.appendChild(st)}
if(typeof SC==="object"&&Array.isArray(SC))SC.push({k:"fph",n:"4.18: photos on Feed posts (bigger posts)",f:["32_feed_photos"],t:[["feed_photos_ok",{}]]});
{const orig=toast;toast=function(t){let long=false;if(/feed_posts_ct_check/.test(String(t))){t="Photos need a one-time server update: Tools → Settings → System check → run part 32 (feed photos). Then post again.";long=true}const r=orig(t);if(long){clearTimeout(toast.t);toast.t=setTimeout(()=>{const el=$("#toast");if(el)el.hidden=true},7000)}return r}}
if(typeof HELP==="object"&&HELP.feed&&Array.isArray(HELP.feed[2]))HELP.feed[2].push("Add photos: attach up to 4 photos to a post. They travel with the post and open full screen with a tap.");
})();
