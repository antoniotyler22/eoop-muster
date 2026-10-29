/* Accounted For 4.19 — Feed has two tabs inside the Feed button: "Feed" to read and confirm posts, "Post" to
   write one (with Plan of the Day, photos and the invite panel). After you post, it flips to Feed so you see it. */
(()=>{
let tab="",wantFeed=false;
function isCompose(el){return !!(el.id==="pdOpen"||el.querySelector&&(el.querySelector("#fdTxt")||el.querySelector("#pdForm,#pdTxt,[data-pod]"))||(el.tagName==="DETAILS"&&/invite people/i.test(el.textContent.slice(0,60))))}
function apply(){const main=$("#main");if(!main||view!=="feed")return;const f=typeof fdCur==="function"?fdCur():null;if(!f)return;
  const kids=[...main.children].filter(x=>x.id!=="fdTabs");const compose=kids.filter(isCompose);if(!compose.length){const t=$("#fdTabs");if(t)t.remove();return}
  const posts=(f.posts||[]).length;const newN=typeof fdNewCount==="function"?fdNewCount(f):0;
  if(!tab)tab=posts?"feed":"post";if(wantFeed&&typeof fdDraft==="object"&&!fdDraft.txt){tab="feed";wantFeed=false}
  for(const el of kids){if(el.classList.contains("sechead")||el.classList.contains("banner"))continue;el.hidden=isCompose(el)?tab!=="post":tab!=="feed"}
  let t=$("#fdTabs");const html=`<button type="button" data-fdtab="feed" aria-pressed="${tab==="feed"}">📣 Feed${posts?` <span class="fdt-n">${posts}</span>`:""}</button><button type="button" data-fdtab="post" aria-pressed="${tab==="post"}">✎ Post</button>`;
  if(!t){t=document.createElement("div");t.id="fdTabs";t.setAttribute("role","tablist");const head=main.querySelector(".sechead");(head||main).insertAdjacentElement(head?"afterend":"afterbegin",t)}t.innerHTML=html;
  if(tab==="feed"&&!posts){if(!$("#fdEmpty"))t.insertAdjacentHTML("afterend",`<div class="card" id="fdEmpty" style="align-items:center;text-align:center"><b>No posts yet</b><p class="note" style="margin:4px 0 8px">Pass the word from the Post tab.</p><button class="btn" data-fdtab="post">✎ Write a post</button></div>`)}else{const e=$("#fdEmpty");if(e)e.remove()}}
{const _rf=renderFeed;renderFeed=function(){const r=_rf.apply(this,arguments);try{apply()}catch(e){}return r}}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{if(view==="feed")apply()}catch(e){}return r}}
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;const b=t.closest("[data-fdtab]");if(b){e.stopImmediatePropagation();tab=b.dataset.fdtab;apply();window.scrollTo(0,0);if(tab==="post"){const i=$("#fdTxt");if(i)setTimeout(()=>i.focus({preventScroll:true}),60)}return}
  if(t.id==="fdPost")wantFeed=true},true);
/* an alert that opens the feed lands on the posts */
window.feedShowTab=k=>{tab=k==="post"?"post":"feed"};
{const st=document.createElement("style");st.textContent=`#fdTabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0 12px;padding:4px;border-radius:14px;background:var(--surface-2);border:1px solid var(--line)}
#fdTabs button{border:0;border-radius:11px;background:transparent;color:var(--muted);font:inherit;font-size:15px;font-weight:800;min-height:44px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px}
#fdTabs button[aria-pressed="true"]{background:var(--ink);color:#fff}.fdt-n{font-size:12px;padding:2px 8px;border-radius:999px;background:rgba(255,255,255,.18)}#fdTabs button[aria-pressed="false"] .fdt-n{background:var(--line)}`;document.head.appendChild(st)}
})();
