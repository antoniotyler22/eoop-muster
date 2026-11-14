/* Accounted For 4.106.0 — Photos, memes (GIFs) and short videos in chat.
   One helper used by Team chat, Messages and groups, and the official channel.
   - Photos are shrunk on the phone. A GIF meme that is small enough is sent as is, so it keeps moving.
   - Videos are limited to about 10 seconds. A clip that is too big is re-encoded on the phone (smaller picture, lower
     bitrate) before it is sent. Everything travels inside the encrypted message like the text does (official posts are public).
   - Big media is kept in this phone's IndexedDB; the saved chat only keeps a short "af:id" reference, so storage stays small.
   Needs supabase/setup/46_chat_media.sql on the server. */
(()=>{
const MAXSEC=10,MAXV=1400000,MAXP=330000,KEEP_INLINE=130000;
const DB={name:"af-media",store:"m"};
const cache=new Map();
function idb(){return new Promise((ok,no)=>{try{const r=indexedDB.open(DB.name,1);r.onupgradeneeded=()=>r.result.createObjectStore(DB.store);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}catch(e){no(e)}})}
async function put(id,data){cache.set(id,data);try{const d=await idb();await new Promise((ok,no)=>{const t=d.transaction(DB.store,"readwrite");t.objectStore(DB.store).put(data,id);t.oncomplete=ok;t.onerror=()=>no(t.error)});d.close()}catch(e){}}
async function get(id){if(cache.has(id))return cache.get(id);try{const d=await idb();const v=await new Promise((ok,no)=>{const r=d.transaction(DB.store).objectStore(DB.store).get(id);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});d.close();if(v)cache.set(id,v);return v||""}catch(e){return ""}}
const rid=()=>"m"+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const esc2=s=>typeof esc==="function"?esc(s):String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* ---------- what is allowed ---------- */
const IMG=/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/,VID=/^data:video\/(mp4|webm|quicktime);base64,[A-Za-z0-9+/=]+$/,REF=/^af:[a-z0-9]{6,24}$/;
const isVideo=s=>typeof s==="string"&&(/^data:video\//.test(s));
const valid=s=>typeof s==="string"&&(REF.test(s)||(IMG.test(s)&&s.length<=MAXP+20000)||(VID.test(s)&&s.length<=MAXV+20000));
/* an incoming or sent media string -> what gets saved: small ones stay, big ones go to the phone's media store */
function keep(s){if(!valid(s))return "";if(REF.test(s)||s.length<=KEEP_INLINE)return s;const id=rid();put(id,s);return "af:"+id}

/* ---------- showing it ---------- */
function tag(src,cls){if(!valid(src))return "";const c=cls?" "+esc2(cls):"";
  if(REF.test(src)){const id=src.slice(3);const hit=cache.get(id);if(hit)return tag(hit,cls);return `<span class="afm-ph${c}" data-afm="${id}" aria-label="Loading media">⏳</span>`}
  if(isVideo(src))return `<video class="afm-v${c}" src="${src}" controls playsinline preload="metadata" aria-label="Video"></video>`;
  return `<img class="afm-i${c}" src="${src}" alt="Photo" data-afview="1" loading="lazy">`}
async function fill(){for(const el of document.querySelectorAll("[data-afm]")){const id=el.dataset.afm;let d=await get(id);if(!d&&typeof window.afMedia.remote==="function")d=await window.afMedia.remote(id);if(!el.isConnected)continue;
    if(d){el.outerHTML=tag(d,(el.className||"").replace(/afm-ph\s*/,""))}else{el.textContent="Media not on this phone";el.removeAttribute("data-afm")}}}
let fillT=0;new MutationObserver(()=>{if(fillT)return;fillT=setTimeout(()=>{fillT=0;if(document.querySelector("[data-afm]"))fill().catch(()=>{})},60)}).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener("click",e=>{const im=e.target&&e.target.closest&&e.target.closest("[data-afview]");if(!im)return;const src=im.src;if(!src)return;
  const o=document.createElement("div");o.className="afm-view";o.innerHTML=`<img src="${src}" alt=""><button type="button" class="btn alt" aria-label="Close">Close</button>`;o.addEventListener("click",()=>o.remove());document.body.appendChild(o)},true);

/* ---------- making it from a file ---------- */
const read=f=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result||""));r.onerror=()=>no(new Error("Couldn't read that file."));r.readAsDataURL(f)});
function photo(file){return new Promise(async(ok,no)=>{
  try{if(/gif$/i.test(file.type||"")&&file.size<=MAXP*0.72){const d=await read(file);if(IMG.test(d))return ok(d)}}catch(e){}
  const url=URL.createObjectURL(file),im=new Image();
  im.onload=()=>{let max=1280,q=.8,out="";for(let i=0;i<10;i++){const sc=Math.min(1,max/Math.max(im.width,im.height));const c=document.createElement("canvas");c.width=Math.max(1,Math.round(im.width*sc));c.height=Math.max(1,Math.round(im.height*sc));
      c.getContext("2d").drawImage(im,0,0,c.width,c.height);out=c.toDataURL("image/jpeg",q);if(out.length<=MAXP)break;if(q>.5)q-=.1;else max=Math.round(max*.8)}
    URL.revokeObjectURL(url);out.length<=MAXP?ok(out):no(new Error("That photo is too big. Try a smaller one."))};
  im.onerror=()=>{URL.revokeObjectURL(url);no(new Error("Couldn't read that photo. Try a JPEG or PNG."))};im.src=url})}
const meta=v=>new Promise((ok,no)=>{const t=setTimeout(()=>no(new Error("Couldn't read that video.")),9000);v.onloadedmetadata=()=>{clearTimeout(t);ok()};v.onerror=()=>{clearTimeout(t);no(new Error("Couldn't read that video."))}});
async function video(file){
  if(!/^video\//.test(file.type||"")&&!/\.(mp4|mov|m4v|webm)$/i.test(file.name||""))throw new Error("That isn't a video.");
  const url=URL.createObjectURL(file);const v=document.createElement("video");v.muted=true;v.playsInline=true;v.preload="auto";v.src=url;
  try{await meta(v);const dur=isFinite(v.duration)?v.duration:0;
    if(file.size>250e6)throw new Error("That video is too big. Pick a shorter clip.");
    if(dur>MAXSEC+.5)toast("Using the first "+MAXSEC+" seconds of the video.");
    if(file.size<=MAXV*0.74&&dur>0&&dur<=MAXSEC+.5){let d=await read(file);d=d.replace(/^data:video\/quicktime/,"data:video/mp4").replace(/^data:(?!video)[^;]*;/,"data:video/mp4;");if(VID.test(d))return d}
    return await encode(v,dur)}
  finally{URL.revokeObjectURL(url)}}
async function encode(v,dur){
  if(typeof MediaRecorder==="undefined"||!HTMLCanvasElement.prototype.captureStream)throw new Error("This phone can't shrink videos. Pick a shorter clip.");
  const mt=["video/mp4;codecs=avc1","video/mp4","video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"].find(m=>{try{return MediaRecorder.isTypeSupported(m)}catch(e){return false}});
  const sc=Math.min(1,480/Math.max(v.videoWidth||480,v.videoHeight||480));const W=Math.max(2,Math.round((v.videoWidth||480)*sc/2)*2),H=Math.max(2,Math.round((v.videoHeight||480)*sc/2)*2);
  const c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");const stream=c.captureStream(24);
  try{v.muted=false;v.volume=0.0001;const vs=v.captureStream?v.captureStream():v.mozCaptureStream&&v.mozCaptureStream();if(vs)vs.getAudioTracks().forEach(t=>stream.addTrack(t))}catch(e){}
  const rec=new MediaRecorder(stream,Object.assign({videoBitsPerSecond:520000,audioBitsPerSecond:32000},mt?{mimeType:mt}:{}));const parts=[];rec.ondataavailable=e=>{if(e.data&&e.data.size)parts.push(e.data)};
  const done=new Promise(ok=>{rec.onstop=ok});rec.start(500);
  try{await v.play()}catch(e){rec.stop();throw new Error("Couldn't read that video.")}
  const end=dur>0?Math.min(dur,MAXSEC):MAXSEC;let stop=false;
  await new Promise(ok=>{const tick=()=>{g.drawImage(v,0,0,W,H);if(v.ended||v.currentTime>=end||stop){ok();return}requestAnimationFrame(tick)};setTimeout(()=>{stop=true},(end+2)*1000);tick()});
  try{v.pause()}catch(e){}if(rec.state!=="inactive")rec.stop();await done;
  const type=(rec.mimeType||mt||"video/webm").split(";")[0];const blob=new Blob(parts,{type});
  if(!blob.size)throw new Error("Couldn't shrink that video. Try another.");
  const d=(await read(blob)).replace(/^data:[^;]*;/,"data:"+type+";");
  if(!VID.test(d)||d.length>MAXV)throw new Error("That video is too big. Pick a shorter clip (about "+MAXSEC+" seconds).");return d}
async function fromFile(file){if(!file)throw new Error("No file.");
  const isV=/^video\//.test(file.type||"")||/\.(mp4|mov|m4v|webm)$/i.test(file.name||"");
  if(isV){toast("Preparing video…");return video(file)}
  if(/^image\//.test(file.type||"")||!file.type||/\.(jpe?g|png|gif|webp|heic|heif)$/i.test(file.name||""))return photo(file);
  throw new Error("Pick a photo, meme or video.")}

/* ---------- the picker (lives outside the page so a redraw can't throw it away) ---------- */
let inp=null,cb=null;
function pick(fn){cb=fn;if(!inp){inp=document.createElement("input");inp.type="file";inp.accept="image/*,video/*";inp.style.display="none";inp.setAttribute("aria-label","Choose a photo, meme or video");document.body.appendChild(inp);
    inp.addEventListener("change",async()=>{const f=inp.files&&inp.files[0];try{inp.value=""}catch(e){}if(!f||!cb)return;const h=cb;try{h(await fromFile(f),f)}catch(e){toast(String(e&&e.message||"Couldn't use that file."))}})}
  inp.click()}

window.afMedia={peek:id=>cache.get(id)||"",tag,valid,keep,isVideo,fromFile,photo,video,pick,fill,get,put,MAXSEC};

{const c=document.createElement("style");c.textContent=`.afm-i,.afm-v,.afm-ph{display:block;max-width:100%;width:100%;border-radius:12px;margin:2px 0 4px;background:var(--surface-2,#eee)}
.afm-i,.afm-v{max-height:340px;object-fit:contain}.afm-ph{min-height:90px;display:flex;align-items:center;justify-content:center;font-size:20px;color:var(--muted)}
.afm-view{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:12px}.afm-view img{max-width:100%;max-height:85vh;object-fit:contain;touch-action:pinch-zoom}
.afm-draft{display:flex;align-items:center;gap:10px;padding:8px;border:1px solid var(--line);border-radius:14px;background:var(--surface-2,var(--card,#fff))}.afm-draft .afm-i,.afm-draft .afm-v{width:72px;height:72px;max-height:72px;object-fit:cover;margin:0}
.ch-t:has(.afm-i),.ch-t:has(.afm-v),.ch-t:has(.afm-ph){width:min(74vw,300px)}.of-t:has(.afm-ph),.of-t:has(.afm-i),.of-t:has(.afm-v){width:min(80vw,320px)}
.afm-draft span{flex:1;font-size:13px;color:var(--muted)}.afm-att{all:unset;cursor:pointer;flex:none;width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;background:var(--line)}.afm-att:focus-visible{outline:2px solid var(--ink);outline-offset:2px}`;document.head.appendChild(c)}
if(typeof HELP==="object"&&HELP.feed&&Array.isArray(HELP.feed[2]))HELP.feed[2].push("Photos, memes and videos: tap the 📎 next to the message box. Videos can be about 10 seconds. Tap a photo to see it full screen.");
})();
