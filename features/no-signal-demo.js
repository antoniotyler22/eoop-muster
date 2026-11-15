/* Accounted For 4.118: no signal? The My page shows a short demo next to the check-in slide saying you can still check in.
   Shows only while the phone is offline (or Field mode sees the network down). Check-ins made then are saved on the phone
   (field-mode.js) and send by themselves when a bar returns. Nothing here changes how check-in works. */
(()=>{
const off=()=>navigator.onLine===false||!!(window.fieldMode&&window.fieldMode.netDown);
const pend=()=>{try{return(S.outbox||[]).filter(x=>x&&x.fm).length}catch(e){return 0}};
function card(){const n=pend();
  const st=(i,ic,t,s)=>`<div class="ns-st" style="--i:${i}"><span class="ns-ic">${ic}</span><span><b>${t}</b><small>${s}</small></span></div>`;
  return `<div class="panel" id="nsCard" role="status" data-noxl>
    <div class="ns-h"><span class="ns-tag">NO SIGNAL</span><b>You can still check in</b></div>
    <p class="note" style="margin:4px 0 10px">Slide like normal. Your check-in is saved on this phone and goes to your leader as soon as you have a bar.</p>
    <div class="ns-demo" aria-hidden="true">${st(0,"➜","Slide to check in","Works with no service")}${st(1,"💾","Saved on this phone","Nothing is lost")}${st(2,"✓","Sent when you have a bar","Leader sees it then")}</div>
    ${n?`<p class="note ns-wait" style="margin:10px 0 0">${n} waiting to send. It sends by itself.</p>`:""}</div>`}
function paint(){if(view!=="mypg"&&view!=="me")return;const old=document.getElementById("nsCard");
  if(!off()){if(old)old.remove();return}
  const ck=document.querySelector(".mp-ck");if(!ck)return;
  if(old){if(old.previousElementSibling===ck){const w=old.querySelector(".ns-wait"),n=pend();if(!!w!==!!n){old.outerHTML=card()}else if(w)w.textContent=n+" waiting to send. It sends by itself.";return}old.remove()}
  ck.insertAdjacentHTML("afterend",card())}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{paint()}catch(e){}return r}}
window.addEventListener("offline",()=>{try{paint()}catch(e){}});window.addEventListener("online",()=>{try{paint()}catch(e){}});
if(typeof every==="function")every(4000,()=>{try{paint()}catch(e){}},"no-signal-demo");
const st=document.createElement("style");st.textContent=`#nsCard{margin-top:12px;border:1px solid var(--brass)}
#nsCard .ns-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap}#nsCard .ns-tag{font-size:11px;font-weight:700;letter-spacing:.06em;color:var(--brass)}
#nsCard .ns-demo{display:grid;gap:8px}#nsCard .ns-st{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:12px;background:var(--glass2,rgba(127,127,127,.1));animation:nsPulse 6s infinite;animation-delay:calc(var(--i)*2s);opacity:.55}
#nsCard .ns-ic{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--brass);color:#fff;font-size:14px;flex:none}
#nsCard .ns-st b{display:block;font-size:14px}#nsCard .ns-st small{display:block;font-size:12px;color:var(--muted)}
@keyframes nsPulse{0%,33%{opacity:1}34%,100%{opacity:.55}}@media(prefers-reduced-motion:reduce){#nsCard .ns-st{animation:none;opacity:1}}`;
document.head.appendChild(st);
})();
