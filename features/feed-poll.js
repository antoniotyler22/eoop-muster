/* Accounted For: a poll on the Feed.
   The leader writes the word, taps "+ Poll" and types 2–6 choices, one per line. The post carries the choices
   (encrypted with the rest of it). Members see the choices as buttons and tap one; a vote is their Got it for
   that post, with the choice in the note, so changing a vote just sends again. The leader's card shows a bar per
   choice with the count, who picked what under "Who", and who hasn't voted. Members see only their own vote. */
(()=>{
const PV="🗳 ";
let draft={on:false,txt:""};
window.fdPollOpts=()=>{if(!draft.on)return null;const el=document.getElementById("fdPollTxt");const t=el?el.value:draft.txt;
  const o=[...new Set(String(t||"").split(/\n|;/).map(x=>x.trim().slice(0,40)).filter(Boolean))].slice(0,6);if(o.length<2)return null;draft={on:false,txt:""};return o};
const votesOf=(f,p)=>{const A=(f.acks||{})[String(p.id)]||{};const by={};for(const [mid,a] of Object.entries(A)){if(a&&a.c===1&&String(a.note||"").startsWith(PV)){const v=a.note.slice(PV.length);if(p.poll.includes(v))by[mid]=v}}return by};
const bar=(label,n,tot,on)=>`<div style="margin:4px 0"><div style="display:flex;justify-content:space-between;font-size:13px"><span>${on?"✓ ":""}<b>${esc(label)}</b></span><span class="note">${n}${tot?" · "+Math.round(n/tot*100)+"%":""}</span></div><div style="height:8px;border-radius:999px;background:var(--surface-2);overflow:hidden"><div style="height:100%;width:${tot?Math.round(n/tot*100):0}%;background:var(--s-onhand)"></div></div></div>`;
function leaderHTML(f,p){const by=votesOf(f,p);const pool=fdPool(p);const tot=Object.keys(by).filter(id=>pool.some(m=>m.id===id)).length;
  const cnt={};for(const o of p.poll)cnt[o]=0;for(const v of Object.values(by))cnt[v]=(cnt[v]||0)+1;
  let h=`<div class="fci"><span class="ttl">🗳 Poll · ${tot} of ${pool.length} voted</span>${p.poll.map(o=>bar(o,cnt[o]||0,tot)).join("")}`;
  if(fdOpen===p.id){for(const o of p.poll){const ms=sorted(pool.filter(m=>by[m.id]===o));if(ms.length)h+=`<div class="note" style="margin-top:4px"><b>${esc(o)}:</b> ${ms.map(m=>esc(m.rank+" "+lastOf(m))).join(", ")}</div>`}
    const no=sorted(pool.filter(m=>!by[m.id]));if(no.length)h+=`<div class="note" style="margin-top:4px"><b>Haven't voted (${no.length}):</b> ${no.map(m=>esc(m.rank+" "+lastOf(m))).join(", ")}</div>`}
  return h+`</div>`}
function memberHTML(f,p){const mine=(f.mine||{})[p.id];const my=mine&&String(mine.note||"").startsWith(PV)?mine.note.slice(PV.length):"";
  return `<div class="fci"><span class="ttl">🗳 Poll${my?" · you picked "+esc(my):" · tap one"}</span><div class="evts" style="margin-top:6px">${p.poll.map(o=>`<button type="button" data-fdvote="${p.id}" data-opt="${esc(o)}" aria-pressed="${o===my}"${fdForMe(f,p)?"":" disabled"}>${esc(o)}</button>`).join("")}</div>${my?`<div class="note" style="margin:4px 0 0">Tap another to change it.</div>`:""}</div>`}
{const _card=fdCard;fdCard=function(f,p){let h=_card.apply(this,arguments);if(!p||!Array.isArray(p.poll)||p.poll.length<2)return h;
  if(f.lk)return h.replace(/<\/article>$/,leaderHTML(f,p)+"</article>");
  // members: the choices replace Got it / Confirm; a vote counts as both
  h=h.replace(/<div class="fcbtns">[\s\S]*?<\/div>/g,"").replace(/<div><span class="fcchip" style="color:var\(--s-onhand\)">✓ Confirmed · [\s\S]*?<\/span><\/span><\/div>/,"").replace(/<div class="fsok">[\s\S]*?<\/div><\/div>/,"");
  return h.replace(/<\/article>$/,memberHTML(f,p)+"</article>")}}
async function vote(f,pid,opt){if(!f.me){toast("Add your rank and last name first.");return}
  const hs=await Promise.all(SB.words(f.me).slice(0,f.mid?5:6).map(w=>SB.h(f.id,w)));if(f.mid)hs.push(await SB.h(f.id,"ID:"+f.mid));
  await SB.rpc("feed_ack",{p_feed:f.id,p_member_key:f.mk,p_post:pid,p_words:hs,p_code:1,p_note:(PV+opt).slice(0,60)});
  f.mine=f.mine||{};f.mine[pid]={c:1,note:PV+opt,t:Date.now()};save()}
document.addEventListener("click",e=>{const b=e.target.closest("[data-fdvote]");if(!b)return;e.stopImmediatePropagation();const f=fdCur();if(!f)return;const pid=+b.dataset.fdvote,opt=b.dataset.opt;
  b.disabled=true;vote(f,pid,opt).then(()=>{const y=window.scrollY;renderFeed();window.scrollTo(0,y);toast("Voted: "+opt)}).catch(err=>{b.disabled=false;toast("Couldn't vote: "+(err&&err.message||err))})},true);
/* compose: + Poll under the Post button */
{const _rf=renderFeed;renderFeed=function(){_rf.apply(this,arguments);const f=fdCur();if(!f||!f.lk)return;const post=document.getElementById("fdPost");if(!post||document.getElementById("fdPollBox"))return;
  post.insertAdjacentHTML("beforebegin",`<div id="fdPollBox">${draft.on?`<label for="fdPollTxt">🗳 Poll choices (one per line, 2–6)</label><textarea id="fdPollTxt" maxlength="300" style="min-height:70px" placeholder="Yes&#10;No&#10;Maybe">${esc(draft.txt)}</textarea><button type="button" class="chip" id="fdPollOff" style="cursor:pointer;margin-bottom:8px">Remove poll</button>`:`<button type="button" class="chip" id="fdPollOn" style="cursor:pointer;margin-bottom:8px">+ Poll</button>`}</div>`)}}
document.addEventListener("click",e=>{if(e.target.id==="fdPollOn"){draft.on=true;fdDraft.txt=($("#fdTxt")||{}).value||fdDraft.txt;renderFeed();const t=$("#fdPollTxt");if(t)t.focus();return}
  if(e.target.id==="fdPollOff"){draft={on:false,txt:""};fdDraft.txt=($("#fdTxt")||{}).value||fdDraft.txt;renderFeed()}});
document.addEventListener("input",e=>{if(e.target.id==="fdPollTxt")draft.txt=e.target.value});
document.addEventListener("click",e=>{if(e.target.id!=="fdPost"||!draft.on)return;const el=document.getElementById("fdPollTxt");const n=new Set(String(el?el.value:"").split(/\n|;/).map(x=>x.trim()).filter(Boolean)).size;
  if(n<2){e.stopImmediatePropagation();toast("Give the poll at least 2 choices, one per line.");if(el)el.focus()}},true);
})();
