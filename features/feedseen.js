/* ---------- Feed: "Confirm I saw it" on every post, for everyone ----------
   - Every post and every Plan of the Day has a Confirm button for whoever is reading it.
   - The person who posted it sees "✓ I posted it" instead (OIC on their own posts, section leaders on theirs).
   - OIC: confirming a section leader's post stays on this phone (f.lseen); "Confirm all" sits above the posts.
   - Members: Confirm sends a normal Got it, so the OIC's count goes up. Posts aimed at another section have it too.
   - Today and My page: the Plan of the Day and new word carry the same Confirm button. */
const FS_LBL="✓ Confirm I saw it";
function fsOwn(f,p){if(f.lk)return !p.sl;return !!(p.sl&&f.pk&&f.me&&String(p.by||"").toUpperCase().trim()===String(f.me).toUpperCase().trim())}
function fsNeeds(f,p){return !!f.lk&&!fsOwn(f,p)&&!(f.lseen||{})[p.id]}
function fsOpen(f){return f&&f.lk?fdVisible(f).filter(p=>fsNeeds(f,p)):[]}
const fsChip=(txt,t)=>`<div class="fsok"><span class="fcchip" style="color:var(--s-onhand)">${txt}${t?` · <span data-ago="${t}">${ago(t)}</span>`:""}</span></div>`;

{const _card=fdCard;fdCard=function(f,p){let h=_card.apply(this,arguments);
  if(fsOwn(f,p)){
    h=h.replace(/<div class="fcbtns"><button class="go" data-fdack=[\s\S]*?Problem<\/button><\/div>(<div class="addph">[\s\S]*?<\/div>)?/,"")
       .replace(/<div><span class="fcchip" style="color:var\(--s-onhand\)">✓ Confirmed · [\s\S]*?<\/span><\/span><\/div>/,"");
    return h.replace(/<\/article>$/,fsChip("✓ I posted it")+"</article>")}
  if(f.lk){const t=(f.lseen||{})[p.id];
    return h.replace(/<\/article>$/,(t?fsChip("✓ You confirmed",t):`<div class="fcbtns"><button class="go" data-fsok="${p.id}">${FS_LBL}</button></div>`)+"</article>")}
  h=h.replace(`data-c="1">✓ Got it</button>`,`data-c="1">${FS_LBL}</button>`);
  const mine=(f.mine||{})[p.id];
  return h.replace(/<div class="note" style="margin:0">For ([^<]*) · no Got it needed from you<\/div>/,()=>
    (mine?fsChip("✓ Confirmed",mine.t):`<div class="fcbtns"><button class="go" data-fdack="${p.id}" data-c="1">${FS_LBL}</button></div>`)+`<div class="note" style="margin:0">For ${esc(fdToLabel(p.to))}</div>`)}}

{const _rf=renderFeed;renderFeed=function(){_rf.apply(this,arguments);const f=fdCur();const n=fsOpen(f).length;if(!n)return;
  const first=document.querySelector("#main article.fc");if(!first||document.getElementById("fsAll"))return;
  first.insertAdjacentHTML("beforebegin",`<div style="display:flex;justify-content:space-between;align-items:center;margin:10px 0 4px"><span class="note" style="margin:0">${n} post${n>1?"s":""} to confirm</span><button class="chip" id="fsAll" style="cursor:pointer">✓ Confirm all (${n})</button></div>`)}}

/* Today: same label on the Plan of the Day and new word */
{const _rt=renderToday;renderToday=function(){_rt.apply(this,arguments);document.querySelectorAll("#main [data-tdack]").forEach(b=>{if(/Got it/.test(b.textContent))b.textContent=FS_LBL})}}

/* My page: the Plan of the Day card gets Confirm too */
function fsMePod(){const D=S.me&&S.me.d;if(!D||!D.pod)return null;for(const f of S.feeds.filter(f=>!f.lk))for(const p of f.posts||[])if(p.pod&&p.pod.d===D.pod.d)return {f,p};return null}
{const _rm=renderMe;renderMe=function(){_rm.apply(this,arguments);if(view!=="me"||!S.me||!S.me.d||!S.me.d.pod)return;
  const card=[...document.querySelectorAll("#main .card.tone-a")].find(c=>/PLAN OF THE DAY/.test(c.textContent));if(!card||card.querySelector(".fsme"))return;
  const x=fsMePod();const prev=String(S.me.pk)==="preview";const d=S.me.d.pod.d;
  const mine=x?(x.f.mine||{})[x.p.id]:(S.podSeen||{})[d];const t=mine&&(mine.t||mine);
  card.insertAdjacentHTML("beforeend",`<div class="fsme" style="margin-top:8px">${t?fsChip("✓ Confirmed",t):`<button class="btn" data-meack="${x?x.f.id+"|"+x.p.id:"d|"+esc(d)}"${prev?" disabled":""} style="width:100%">${FS_LBL}</button>`}</div>`)}}

document.addEventListener("click",e=>{if(!e.target.closest)return;
  const m=e.target.closest("[data-meack]");if(m){const [fid,pid]=m.dataset.meack.split("|");m.disabled=true;
    const done=()=>{const y=window.scrollY;renderMe();window.scrollTo(0,y);toast("✓ Confirmed")};
    if(fid==="d"){S.podSeen=S.podSeen||{};S.podSeen[pid]=Date.now();save();done();return}
    const f=S.feeds.find(x=>x.id===fid);if(!f)return;fdAck(f,+pid,1).then(done).catch(()=>{m.disabled=false;toast("Couldn't send. Check your signal.")});return}
  const b=e.target.closest("[data-fsok]");const all=e.target.id==="fsAll";if(!b&&!all)return;
  const f=fdCur();if(!f||!f.lk)return;f.lseen=f.lseen||{};const now=Date.now();
  if(b)f.lseen[+b.dataset.fsok]=now;else fsOpen(f).forEach(p=>f.lseen[p.id]=now);
  save();const y=window.scrollY;renderFeed();window.scrollTo(0,y);toast(all?"✓ Confirmed all":"✓ Confirmed")});

if(typeof HELP==="object"&&HELP.feed&&Array.isArray(HELP.feed[2]))HELP.feed[2].push("Every post and Plan of the Day has ✓ Confirm I saw it. Your own posts show ✓ I posted it. Leaders also get Confirm all.");
