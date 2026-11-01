/* Accounted For: progress bars in blue. Every check-in bar and ring runs from light blue (nobody in yet) to deep blue
   (everyone in): the fill itself fades from light to dark, and the dark end only shows once the bar is nearly full.
   Covers the Home headcount bar, the Feed post bar, the per-section bars and ring on each post, and the % bar. */
(()=>{
const css=document.createElement("style");css.textContent=`:root{--pr-lo:#a9ccff;--pr-hi:#0857e8}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--pr-lo:#8fbaff;--pr-hi:#2f6bff}}
:root[data-theme="dark"]{--pr-lo:#8fbaff;--pr-hi:#2f6bff}
.hbar i,.v11bar i,.bar i,.rr-seg i b{background-image:linear-gradient(90deg,var(--pr-lo),var(--pr-hi))!important;background-repeat:no-repeat!important;background-color:var(--pr-lo)!important}
.tone-g{background:#dde8ff;color:#0b3a9e}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .tone-g{background:#12284d;color:#a9c8ff}}
:root[data-theme="dark"] .tone-g{background:#12284d;color:#a9c8ff}
.fm-ok{background:#0f2a5c!important;color:#a9c8ff!important}`;
document.head.appendChild(css);
/* the gradient is anchored to the whole track, so a bar at 30% shows only the light part and a full bar reaches deep blue */
const SEL=".hbar i,.v11bar i,.bar i,.rr-seg i b";
function fit(root){(root||document).querySelectorAll(SEL).forEach(el=>{const w=parseFloat(el.style.width);if(!(w>0))return;
  const v=Math.min(1e4,Math.max(100,1e4/w)).toFixed(1)+"% 100%";if(el.dataset.pr!==v){el.dataset.pr=v;el.style.backgroundSize=v}})}
let q=0;const later=()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;try{fit()}catch(e){}})};
try{new MutationObserver(later).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["style"]})}catch(e){}
later();
})();
