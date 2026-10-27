/* ---------- Feed: a Confirm button on every post ----------
   1. Leader: posts from section leaders (or anyone but you) get "✓ Confirm I saw it". It stays on this phone
      (f.lseen) and shows "✓ You confirmed · 2 min ago". "✓ Confirm all" sits above the posts.
   2. Members: posts aimed at another section or person used to say "no Got it needed from you" with no button.
      They now get "✓ Confirm I saw it" too, which sends a normal Got it so the leader sees it. */
function fsOwn(f,p){if(p.sl)return false;const by=String(p.by||"").toUpperCase().trim();return !by||by===String(f.unit||"").toUpperCase().trim()||by===fdBy(f)}
function fsNeeds(f,p){return !!f.lk&&!fsOwn(f,p)&&!(f.lseen||{})[p.id]}
function fsOpen(f){return f&&f.lk?fdVisible(f).filter(p=>fsNeeds(f,p)):[]}

{const _card=fdCard;fdCard=function(f,p){let h=_card.apply(this,arguments);
  if(f.lk){if(fsOwn(f,p))return h;const t=(f.lseen||{})[p.id];
    const box=t?`<div><span class="fcchip" style="color:var(--s-onhand)">✓ You confirmed · <span data-ago="${t}">${ago(t)}</span></span></div>`
      :`<div class="fcbtns"><button class="go" data-fsok="${p.id}">✓ Confirm I saw it</button></div>`;
    return h.replace(/<\/article>$/,box+"</article>")}
  const mine=(f.mine||{})[p.id];
  const box=mine?`<div><span class="fcchip" style="color:var(--s-onhand)">✓ Confirmed · <span data-ago="${mine.t}">${ago(mine.t)}</span></span></div>`
    :`<div class="fcbtns"><button class="go" data-fdack="${p.id}" data-c="1">✓ Confirm I saw it</button></div>`;
  return h.replace(/<div class="note" style="margin:0">For ([^<]*) · no Got it needed from you<\/div>/,()=>box+`<div class="note" style="margin:0">For ${esc(fdToLabel(p.to))}</div>`)}}

{const _rf=renderFeed;renderFeed=function(){_rf.apply(this,arguments);const f=fdCur();const n=fsOpen(f).length;if(!n)return;
  const first=document.querySelector("#main article.fc");if(!first||document.getElementById("fsAll"))return;
  first.insertAdjacentHTML("beforebegin",`<div style="display:flex;justify-content:space-between;align-items:center;margin:10px 0 4px"><span class="note" style="margin:0">${n} post${n>1?"s":""} to confirm</span><button class="chip" id="fsAll" style="cursor:pointer">✓ Confirm all (${n})</button></div>`)}}

document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-fsok]");const all=e.target.id==="fsAll";if(!b&&!all)return;
  const f=fdCur();if(!f||!f.lk)return;f.lseen=f.lseen||{};const now=Date.now();
  if(b)f.lseen[+b.dataset.fsok]=now;else fsOpen(f).forEach(p=>f.lseen[p.id]=now);
  save();const y=window.scrollY;renderFeed();window.scrollTo(0,y);toast(all?"✓ Confirmed all":"✓ Confirmed")});

if(typeof HELP==="object"&&HELP.feed&&Array.isArray(HELP.feed[2]))HELP.feed[2].push("Tap ✓ Confirm I saw it on a post once you've read it. Leaders: section leaders' posts have it too, plus Confirm all.");
