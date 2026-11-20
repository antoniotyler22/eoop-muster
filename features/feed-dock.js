/* Accounted For 4.139.0: the Feed | Inbox | Messages | Official | Voice switch is a floating dock above the bottom tabs on the Feed and Inbox screens,
   so the top of the screen is just the title and the posts. The row that used to sit at the top is hidden (it stays for Messages, Official and Voice,
   which have message boxes at the bottom). Word of Mouth | Post becomes one "Post" button at the right (and "Back to posts" while writing).
   The dock is a copy of the real switch, so every tap, badge and unread dot still works through the same handler. */
(()=>{
const SHOW=()=>{try{return ["feed","send","dms"].includes(view)}catch(e){return false}};
{const c=document.createElement("style");c.textContent=`body.has-dock #main .ft-seg,body.has-dock #main>.ch-seg{display:none!important}
body.has-dock #main{padding-bottom:96px}
body.has-dock #tallyFab{bottom:calc(150px + env(safe-area-inset-bottom,0px))!important}
#chDock{position:fixed;left:16px;right:16px;z-index:29;max-width:528px;margin:0 auto;display:flex;padding:5px;border-radius:28px;background:var(--surface-solid,#18202a);border:1px solid var(--line);box-shadow:0 8px 24px rgba(0,0,0,.35)}
#chDock .ch-seg{display:flex!important;flex:1;width:100%;background:transparent;padding:0;border-radius:0;gap:2px}
#chDock .ch-seg button{flex:1;min-height:44px;padding:0 4px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;border-radius:22px;white-space:nowrap}
#chDock .ch-seg button[aria-selected="true"]{background:var(--brass);color:var(--on-brass,#fff)}
body.has-dock #fdTabs{display:flex;justify-content:flex-end;gap:8px;margin:0 0 10px;padding:0;background:none;border:0}
body.has-dock #fdTabs button[aria-pressed="true"]{display:none}
body.has-dock #fdTabs button[aria-pressed="false"]{flex:none;min-height:44px;padding:0 18px;border-radius:22px;background:var(--brass);color:var(--on-brass,#fff);box-shadow:0 2px 10px rgba(0,0,0,.25)}
body.has-dock #fdTabs button[aria-pressed="false"] .fdt-n{background:rgba(255,255,255,.22)}`;document.head.appendChild(c)}
function sync(){const seg=SHOW()?document.querySelector("#main .ch-seg"):null;let d=document.getElementById("chDock");
  if(!seg){if(d)d.remove();document.body.classList.remove("has-dock");return}
  if(!d){d=document.createElement("div");d.id="chDock";document.body.appendChild(d)}
  const html=seg.outerHTML;if(d.dataset.h!==html){d.innerHTML=html;d.dataset.h=html}
  const tb=document.getElementById("tabbar");d.style.bottom=((tb?tb.offsetHeight:62)+10)+"px";document.body.classList.add("has-dock")}
let q=0;const go=()=>{q=0;try{sync()}catch(e){}};
new MutationObserver(()=>{if(!q)q=setTimeout(go,30)}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["aria-selected"]});
window.addEventListener("resize",go);
})();
