/* Accounted For 4.86.0: small buttons get a bigger tap area without changing how they look.
   Chips, remove (x) buttons and the small week/section buttons were 21-28 px tall; phones want 44. An invisible
   pseudo-element grows the hit area around them. */
(()=>{
const c=document.createElement("style");
c.textContent=`#main button.chip,#main button.rm,#main button.w6,#main .twd{position:relative}
#main button.chip::after,#main button.rm::after,#main button.w6::after{content:"";position:absolute;left:-6px;right:-6px;top:50%;height:max(100%,44px);transform:translateY(-50%)}`;
document.head.appendChild(c)})();
