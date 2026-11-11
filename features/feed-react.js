/* Accounted For 4.68.0 — Word of Mouth, the WhatsApp way: reactions, "seen by" and swipe to reply.
   Reactions: tap + under a post and pick one (thumbs up, check, heart, fire, thanks). One per person per post; tap yours
   again to take it back. Seen by: opening Word of Mouth marks the posts you can see as seen; leaders see "Seen by N of M" and
   can tap it for who has and hasn't. Swipe right on a post to open the reply box (the same reply as the 💬 Reply button).
   Uses AFS (features/signals.js) and supabase/setup/39_signals.sql. */
(()=>{
const EMO=["👍","✅","❤️","🔥","🙏"];
let pick=null,sheet=null;
const seenKey=(f,pid)=>f.id+":"+pid;
const rxOf=(f,pid)=>{const by={};for(const r of AFS.all(f,"rx")){const o=r.o;if(o&&o.pid===pid&&o.e){by[o.by]=o.e}}return by};
const seenOf=(f,pid)=>{const m={};for(const r of AFS.all(f,"seen")){const o=r.o;if(o&&o.pid===pid)m[o.by]={t:r.t,w:o.w||[]}}return m};
const total=f=>{try{return typeof window.talkPeople==="function"?window.talkPeople(f).length:0}catch(e){return 0}};

/* ---- the bar under each post ---- */
function bar(f,p){const me=AFS.me(f),by=rxOf(f,p.id),cnt={};for(const n in by)cnt[by[n]]=(cnt[by[n]]||0)+1;
  const mine=by[me]||"";
  let h=`<div class="rxbar" data-rxbar="${p.id}">`;
  for(const e of EMO)if(cnt[e])h+=`<button type="button" class="rxp${mine===e?" on":""}" data-rx="${p.id}" data-e="${e}" aria-pressed="${mine===e}" aria-label="${e} ${cnt[e]}">${e} ${cnt[e]}</button>`;
  h+=`<button type="button" class="rxp add" data-rxadd="${p.id}" aria-label="Add a reaction" aria-expanded="${pick===p.id}">＋</button>`;
  if(pick===p.id)h+=`<span class="rxpick">${EMO.map(e=>`<button type="button" data-rx="${p.id}" data-e="${e}" aria-label="React ${e}">${e}</button>`).join("")}</span>`;
  h+=`</div>`;
  if(f.lk){const n=Object.keys(seenOf(f,p.id)).length,tot=total(f);
    if(n)h+=`<button type="button" class="rxseen" data-seenwho="${p.id}">✓✓ Seen by ${n}${tot>=n?` of ${tot}`:""}</button>`}
  return h}
{const _card=fdCard;fdCard=function(f,p){let h=_card.apply(this,arguments);
  try{if(!f||!p||!f.mk||!h||typeof h!=="string")return h;
    h=h.replace(/<article /,'<article data-wpid="'+p.id+'" ');
    return /<\/article>\s*$/.test(h)?h.replace(/<\/article>\s*$/,bar(f,p)+"</article>"):h}catch(e){return h}}}

/* ---- tap handling ---- */
async function react(f,pid,e){const me=AFS.me(f),cur=rxOf(f,pid)[me]||"",next=cur===e?"":e;
  await AFS.put(f,"rx",pid+":"+me,{pid,e:next,by:me,w:f.meH||[]});pick=null;redraw()}
document.addEventListener("click",ev=>{const t=ev.target;if(!t.closest||view!=="feed")return;const f=fdCur();if(!f)return;
  const a=t.closest("[data-rxadd]");if(a){ev.stopImmediatePropagation();const id=+a.dataset.rxadd;pick=pick===id?null:id;redraw();return}
  const r=t.closest("[data-rx]");if(r){ev.stopImmediatePropagation();react(f,+r.dataset.rx,r.dataset.e);return}
  const w=t.closest("[data-seenwho]");if(w){ev.stopImmediatePropagation();sheet=+w.dataset.seenwho;showSheet(f);return}},true);
function redraw(){if(view!=="feed")return;const a=document.activeElement;if(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName))return;const y=window.scrollY;renderFeed();window.scrollTo(0,y)}
AFS.onChange(redraw);

/* ---- who has seen it (leaders) ---- */
function showSheet(f){closeSheet0();const pid=sheet,S1=seenOf(f,pid),names=Object.keys(S1);
  const ppl=typeof window.talkPeople==="function"?window.talkPeople(f):[];
  const seen=n=>S1[n]||null;
  const fmt=t=>{const d=new Date(t);return d.toLocaleDateString([],{weekday:"short",day:"numeric",month:"short"})+" "+String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0")};
  const o=document.createElement("div");o.id="rxSheet";o.className="rx-ov";o.innerHTML=`<div class="rx-pn" role="dialog" aria-label="Seen by"><div class="rx-gr"></div><b>Seen by ${names.length}</b>
    <div class="rx-ls">${names.sort().map(n=>`<div class="rx-r"><span>${esc(n)}</span><small>${esc(fmt(S1[n].t))}</small></div>`).join("")||`<p class="rx-n">Nobody yet.</p>`}</div>
    <button class="btn alt" id="rxClose" style="width:100%;margin-top:12px">Close</button></div>`;
  const pn=o.querySelector(".rx-pn");
  o.addEventListener("click",e=>{if(e.target===o||e.target.closest("#rxClose")){e.stopPropagation();closeSheet0()}});
  /* swipe the sheet down (from the top of it) or tap outside to put it away */
  let y0=null,dy=0;
  pn.addEventListener("touchstart",e=>{if(e.touches.length!==1||pn.scrollTop>0){y0=null;return}y0=e.touches[0].clientY;dy=0;pn.style.transition="none"},{passive:true});
  pn.addEventListener("touchmove",e=>{if(y0==null)return;dy=e.touches[0].clientY-y0;if(dy>0)pn.style.transform="translateY("+dy+"px)";else dy=0},{passive:true});
  const endDrag=()=>{if(y0==null)return;const go=dy>70;y0=null;if(go){closeSheet0();return}pn.style.transition="transform .18s";pn.style.transform=""};
  pn.addEventListener("touchend",endDrag);pn.addEventListener("touchcancel",endDrag);
  o.addEventListener("touchend",e=>{if(e.target===o){e.preventDefault();closeSheet0()}});
  document.body.appendChild(o)}
function closeSheet0(){const o=document.getElementById("rxSheet");if(o)o.remove()}
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSheet0()});

/* ---- mark posts as seen when Word of Mouth is open ---- */
let marking=false;
async function markSeen(){if(marking||view!=="feed"||document.hidden)return;const f=fdCur();if(!f||!f.mk)return;marking=true;
  try{S.waSeen=S.waSeen&&typeof S.waSeen==="object"?S.waSeen:{};const me=AFS.me(f);let n=0;
    for(const p of (typeof fdVisible==="function"?fdVisible(f):f.posts||[])){if(n>=12)break;const k=seenKey(f,p.id);if(S.waSeen[k])continue;
      S.waSeen[k]=1;n++;const ok=await AFS.put(f,"seen",p.id+":"+me,{pid:p.id,by:me,w:f.meH||[]});if(!ok)delete S.waSeen[k]}
    if(n)save()}catch(e){}finally{marking=false}}
{const _rf=renderFeed;renderFeed=function(){const r=_rf.apply(this,arguments);setTimeout(markSeen,600);return r}}

/* ---- swipe right on a post to reply ---- */
let sw=null;
document.addEventListener("touchstart",e=>{const a=e.target.closest&&e.target.closest("article.fc[data-wpid]");if(!a||view!=="feed"||e.touches.length!==1){sw=null;return}
  sw={a,x:e.touches[0].clientX,y:e.touches[0].clientY,dx:0,go:false}},{passive:true});
document.addEventListener("touchmove",e=>{if(!sw)return;const t=e.touches[0],dx=t.clientX-sw.x,dy=t.clientY-sw.y;
  if(!sw.go&&Math.abs(dy)>16&&Math.abs(dy)>Math.abs(dx)){sw=null;return}
  if(dx>8&&Math.abs(dy)<24){sw.go=true;sw.dx=Math.min(dx,90);sw.a.style.transform="translateX("+sw.dx*.6+"px)";sw.a.style.transition="none"}},{passive:true});
function endSwipe(){if(!sw)return;const {a,dx,go}=sw;sw=null;a.style.transition="transform .18s";a.style.transform="";
  if(go&&dx>=70){const b=a.querySelector("[data-fdrep]");if(b){try{navigator.vibrate&&navigator.vibrate(10)}catch(e){}b.click()}}}
document.addEventListener("touchend",endSwipe);document.addEventListener("touchcancel",endSwipe);

/* ---- looks ---- */
{const c=document.createElement("style");c.textContent=`.rxbar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:10px}
.rxp{all:unset;cursor:pointer;box-sizing:border-box;min-height:32px;padding:0 11px;border-radius:999px;background:var(--line);color:var(--ink);font-size:14px;font-weight:600;display:inline-flex;align-items:center;gap:4px}
.rxp.on{background:var(--brass-soft,rgba(23,121,95,.14));color:var(--brass);box-shadow:inset 0 0 0 1.5px var(--brass)}.rxp.add{color:var(--muted);min-width:32px;justify-content:center}.rxp:focus-visible,.rxpick button:focus-visible{outline:2px solid var(--brass);outline-offset:2px}
.rxpick{display:inline-flex;gap:2px;border:1px solid var(--glass-line,var(--line));border-radius:999px;background:var(--surface-solid,#fff);padding:2px 4px;box-shadow:var(--shadow)}.rxpick button{all:unset;cursor:pointer;width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;font-size:21px;border-radius:50%}.rxpick button:active{background:var(--line)}
.rxseen{all:unset;cursor:pointer;display:inline-flex;margin-top:8px;font-size:12.5px;font-weight:700;color:var(--brass)}.rxseen:focus-visible{outline:2px solid var(--brass);outline-offset:2px}
article.fc[data-wpid]{touch-action:pan-y pinch-zoom}
.rx-ov{position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center}.rx-pn{width:100%;max-width:520px;max-height:80vh;overflow:auto;background:var(--surface-solid,#fff);color:var(--ink);border-radius:22px 22px 0 0;padding:10px 18px calc(18px + env(safe-area-inset-bottom))}
.rx-gr{width:40px;height:4px;border-radius:2px;background:var(--line);margin:0 auto 12px}.rx-ls{margin-top:6px}.rx-r{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);font-size:14px;font-weight:600}.rx-r small{color:var(--muted);font-weight:400}.rx-n{font-size:12.5px;color:var(--muted)}`;document.head.appendChild(c)}
})();
