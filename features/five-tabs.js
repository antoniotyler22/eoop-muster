/* Accounted For 4.102.0: Five tabs, what's new, backup nudge.
   - The bottom bar had seven tabs on a leader's phone. Now it has five: Home, Chat, People, Plan, Tools.
     Chat holds Chat, Feed (Word of Mouth), Inbox, Official and Voice, switched at the top. Badges roll up on the tab.
   - Home shows a one-time "What's new" card per version, then (if sync is off) a backup reminder every two weeks. */
(()=>{
const lead=()=>!(typeof memberMode==="function"&&memberMode());
const HUB=["chat","talk","feed","send","dms","official"];

/* ---------- five tabs ---------- */
{const _tl=tabsList;tabsList=function(){const L=_tl.apply(this,arguments);if(!lead())return L;
  const o=L.filter(x=>x[0]!=="feed"&&x[0]!=="inbox");if(!o.some(x=>x[0]==="talk")){const i=Math.max(0,o.findIndex(x=>x[0]==="home"));o.splice(i+1,0,["talk","Chat","chat"])}return o}}
{const _tb=tabBadge;tabBadge=function(k){const n=_tb.apply(this,arguments);if(k!=="talk"||!lead())return n;
  let x=0;if(view!=="feed"&&view!=="send")x+=_tb.call(this,"feed")||0;if(view!=="dms"&&view!=="dm")x+=_tb.call(this,"inbox")||0;return n+x}}
{const _rs=renderShell;renderShell=function(){const r=_rs.apply(this,arguments);try{if(lead()&&HUB.includes(view)){document.querySelectorAll("#tabbar [data-tab]").forEach(b=>{if(b.dataset.tab==="talk")b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")})}}catch(e){}return r}}
/* the Feed and Inbox screens get the same Chat | Feed | Inbox | Official | Voice switch on top */
function injectSeg(){if(!lead()||typeof window.chatSeg!=="function")return;const act=view==="feed"||view==="send"?"feed":view==="dms"?"inbox":"";if(!act)return;
  const m=document.getElementById("main");if(!m||m.querySelector(".ch-seg"))return;
  m.insertAdjacentHTML("afterbegin",`<div class="ft-seg" style="display:flex;justify-content:center;margin:2px 0 12px">${window.chatSeg(act)}</div>`)}
new MutationObserver(()=>{try{injectSeg()}catch(e){}}).observe(document.documentElement,{childList:true,subtree:true});

/* ---------- Home cards: what's new, then backup ---------- */
const NEWS=["Photos, memes and videos in chat. Tap the 📎 next to the message box in Team chat and in Messages and groups.","Videos can be about 10 seconds. A bigger clip is shrunk on your phone first. Memes (GIFs) keep moving.","The official Accounted For channel can now carry photos and videos too.","Everything you send in chat is still private to your team. Photos and videos are kept for 7 days."];
function cards(){if(!lead()||!S.onb||S.welcomed===0)return "";
  if(S.seenVer!==window.AV)return `<div class="panel ft-card" id="ftNew" style="margin:12px 0"><b>What's new in ${esc(window.AV)}</b><ul style="margin:6px 0 8px;padding-left:18px">${NEWS.map(x=>`<li style="margin:3px 0">${esc(x)}</li>`).join("")}</ul><button class="btn alt" id="ftNewOk" style="width:100%">Got it</button></div>`;
  const synced=!!(S.sync&&S.sync.on);const due=!S.bkAt||Date.now()-S.bkAt>14*864e5;
  if(!synced&&S.source!=="sample"&&S.roster.length>=3&&due)return `<div class="panel ft-card" id="ftBk" style="margin:12px 0"><b>Back up your team</b><p class="note" style="margin:4px 0 8px">Your roster lives on this phone. Save a copy so a lost phone doesn't lose the team.</p><div class="row2"><button class="btn" id="ftBkGo">Back up now</button><button class="btn alt" id="ftBkLater">Later</button></div></div>`;
  return ""}
{const _rb=renderBoard;renderBoard=function(){const r=_rb.apply(this,arguments);try{const m=document.getElementById("main"),h=cards();if(m&&h&&!m.querySelector(".ft-card"))m.insertAdjacentHTML("afterbegin",h)}catch(e){}return r}}
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;
  if(t.closest("#ftNewOk")){S.seenVer=window.AV;save();const c=document.getElementById("ftNew");if(c)c.remove();render();return}
  if(t.closest("#ftBkLater")){S.bkAt=Date.now();save();const c=document.getElementById("ftBk");if(c)c.remove();return}
  if(t.closest("#ftBkGo")){S.bkAt=Date.now();save();view="data";armed=null;render();window.scrollTo(0,0);setTimeout(()=>{const x=document.getElementById("exp");if(x){x.hidden=false;x.scrollIntoView({block:"center"})}toast("Tap Export backup to save a copy.")},120)}});
})();
