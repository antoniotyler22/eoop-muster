/* Accounted For 4.85.0: the Inbox is one tap away on every page, for every phone that can have one.
   - Members always get the Inbox tab (before, it showed only after they picked their name). Without a name, tapping it asks
     "Who are you?" first, because a private message needs to know who it is from.
   - The reply thread has "✉ Message <leader> privately" under the post, for members, so a private word is one tap from a post.
   - The OIC's phone already has the Inbox tab on every page. Co-leader, Editor and View-only phones still have no Inbox: that was
     done on purpose in 4.75 so those phones never hold anyone's message keys (features/inbox-private.js). */
(()=>{
const member=()=>typeof memberMode==="function"&&memberMode();
{const _tl=tabsList;tabsList=function(){const L=_tl.apply(this,arguments);
  if(!member()||L.some(x=>x[0]==="inbox"))return L;const o=L.slice();o.push(["inbox","Inbox","inbox"]);return o}}
{const _r=render;render=function(){
  if(member()&&!S.me&&view==="dm"){
    view=(S.feeds||[]).some(f=>!f.lk&&f.mk)?"feed":"today";armed=null;
    const r=_r.apply(this,arguments);
    setTimeout(()=>{try{const n=typeof whoNeed==="function"?whoNeed():null;if(n&&typeof whoSheet==="function")whoSheet(n);else toast("Pick your name first, then your Inbox opens.")}catch(e){}},50);
    return r}
  return _r.apply(this,arguments)}}

/* private message link inside the reply thread */
function put(){const o=document.getElementById("thrView");if(!o||o.querySelector(".thr-pm")||!member())return;
  const f=typeof fdCur==="function"?fdCur():null;if(!f||f.lk)return;
  const orig=o.querySelector(".thr-orig");if(!orig)return;
  orig.insertAdjacentHTML("afterend",`<button type="button" class="thr-pm" id="thrPm">✉ Message ${esc(f.unit||"your leader")} privately</button>`)}
const mo=new MutationObserver(put);mo.observe(document.body,{childList:true});
document.addEventListener("click",e=>{if(!e.target.closest||!e.target.closest("#thrPm"))return;e.preventDefault();
  if(typeof window.thrClose==="function")window.thrClose();view="dm";armed=null;render();window.scrollTo(0,0)});
{const c=document.createElement("style");c.textContent=`.thr-pm{all:unset;cursor:pointer;align-self:flex-start;margin:0 14px 2px;min-height:36px;padding:0 14px;border-radius:999px;border:1px solid var(--line);font-size:13px;font-weight:800;color:var(--pr-hi,#0857e8);display:inline-flex;align-items:center;max-width:calc(100% - 28px);box-sizing:border-box;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}`;document.head.appendChild(c)}
})();
