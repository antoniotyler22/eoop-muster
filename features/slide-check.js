/* Accounted For 4.52: slide to check in.
   The check-in cards (member "Check in" on My page, and "My check-in" on Home for leaders) keep their status buttons,
   dates, location and note. Only the final Send button changes: it becomes a "slide to check in" track, like the
   iPhone's slide to power off, so a pocket tap can't send it. The real button stays in the page (hidden) and the
   slider presses it when it reaches the end, so nothing about how check-ins are sent changes.
   Works with touch (Android and iPhone browsers, the apps), a mouse, and the keyboard (Enter or the right arrow).
   Until a status is picked, the slider is greyed out and says so. */
(()=>{
const TARGETS=["ckSend","myCkSend"];
const ARROW=`<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`;
const CHECK=`<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
function buzzy(ms){try{if(navigator.vibrate)navigator.vibrate(ms)}catch(e){}try{if(window.Capacitor&&typeof NP==="function"){const H=NP("Haptics");if(H)H.impact({style:ms>15?"MEDIUM":"LIGHT"})}}catch(e){}}
function enhance(btn){if(!btn||btn.dataset.slid)return;btn.dataset.slid="1";
  const off=btn.disabled,busy=/Sending/.test(btn.textContent);
  const label=busy?"Sending…":off?"Pick a status above first":"slide to check in";
  const wrap=document.createElement("div");wrap.className="slck"+(off?" off":"")+(busy?" busy":"");
  wrap.innerHTML=`<div class="slck-fill"></div><div class="slck-txt">${label}</div><div class="slck-knob" role="slider" tabindex="${off?-1:0}" aria-label="Slide to check in" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"${off?' aria-disabled="true"':""}>${busy?CHECK:ARROW}</div>`;
  const row=btn.closest(".row2");(row||btn).insertAdjacentElement("beforebegin",wrap);
  btn.hidden=true;btn.setAttribute("aria-hidden","true");btn.tabIndex=-1;
  if(row){row.classList.add("slck-row");const x=row.querySelector("button:not([hidden])");if(x)x.classList.add("slck-cancel")}
  if(off||busy)return;
  const knob=wrap.querySelector(".slck-knob"),fill=wrap.querySelector(".slck-fill"),txt=wrap.querySelector(".slck-txt");
  let drag=false,x0=0,pos=0,done=false;
  const kw=()=>knob.offsetWidth||52;
  const max=()=>Math.max(1,(wrap.clientWidth||280)-kw()-8);
  function set(v,anim){pos=Math.max(0,Math.min(max(),v));const tr=anim?"transform .35s cubic-bezier(.3,1.4,.5,1),width .35s cubic-bezier(.3,1.4,.5,1)":"none";
    knob.style.transition=tr;fill.style.transition=tr;knob.style.transform=`translateX(${pos}px)`;fill.style.width=(pos+kw()+8)+"px";
    txt.style.opacity=String(Math.max(0,1-pos/max()*1.6));knob.setAttribute("aria-valuenow",String(Math.round(pos/max()*100)))}
  function finish(){if(done)return;done=true;set(max(),true);wrap.classList.add("done");knob.innerHTML=CHECK;txt.textContent="Checking in…";txt.style.opacity="1";buzzy(25);
    setTimeout(()=>{btn.disabled=false;btn.click()},260)}
  knob.addEventListener("pointerdown",e=>{if(done)return;drag=true;x0=e.clientX-pos;try{knob.setPointerCapture(e.pointerId)}catch(_){}buzzy(8);e.preventDefault()});
  knob.addEventListener("pointermove",e=>{if(!drag)return;set(e.clientX-x0,false);if(pos>=max()*.92){drag=false;finish()}});
  const end=()=>{if(!drag)return;drag=false;if(pos>=max()*.85)finish();else set(0,true)};
  knob.addEventListener("pointerup",end);knob.addEventListener("pointercancel",end);knob.addEventListener("lostpointercapture",end);
  knob.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "||e.key==="ArrowRight"||e.key==="End"){e.preventDefault();finish()}});
  /* a tap on the track (not a slide) shows how */
  wrap.addEventListener("click",e=>{if(done||e.target.closest(".slck-knob"))return;wrap.classList.remove("nudge");void wrap.offsetWidth;wrap.classList.add("nudge")});
  set(0,false)}
function scan(){for(const id of TARGETS){const b=document.getElementById(id);if(b&&!b.dataset.slid)enhance(b)}}
window.slideCheckScan=scan;
const main=document.getElementById("main");
if(main&&"MutationObserver" in window)new MutationObserver(()=>scan()).observe(main,{childList:true,subtree:true});
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{scan()}catch(e){}return r}}
const st=document.createElement("style");st.textContent=`
.slck{position:relative;height:60px;border-radius:30px;background:var(--surface-2);overflow:hidden;touch-action:pan-y;-webkit-user-select:none;user-select:none;margin-top:4px}
.slck-fill{position:absolute;left:0;top:0;bottom:0;width:60px;border-radius:30px;background:var(--s-onhand)}
.slck-txt{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding-left:52px;font-size:17px;font-weight:700;pointer-events:none;
  background:linear-gradient(90deg,var(--muted) 0%,var(--muted) 40%,var(--ink) 50%,var(--muted) 60%,var(--muted) 100%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:slckShim 2.6s linear infinite}
@keyframes slckShim{from{background-position:100% 0}to{background-position:-150% 0}}
.slck-knob{position:absolute;left:4px;top:4px;width:52px;height:52px;border-radius:50%;background:#fff;color:var(--s-onhand);display:grid;place-items:center;box-shadow:0 3px 10px rgba(0,0,0,.2);touch-action:none;cursor:grab;z-index:2}
.slck-knob:active{cursor:grabbing}
.slck-knob:focus-visible{outline:3px solid var(--brass);outline-offset:2px}
.slck.done .slck-txt{animation:none;background:none;color:#fff;padding-left:0;-webkit-background-clip:border-box;background-clip:border-box}
.slck.off{opacity:.55}.slck.off .slck-txt{animation:none;background:none;color:var(--muted);-webkit-background-clip:border-box;background-clip:border-box}.slck.off .slck-knob{color:var(--muted);cursor:default}
.slck.busy .slck-fill{width:100%}.slck.busy .slck-knob{left:auto;right:4px}.slck.busy .slck-txt{animation:none;background:none;color:#fff;padding-left:0;-webkit-background-clip:border-box;background-clip:border-box}
.slck.nudge .slck-knob{animation:slckNudge .6s ease}
@keyframes slckNudge{30%{transform:translateX(26px)}60%{transform:translateX(-4px)}100%{transform:none}}
.slck-row{grid-template-columns:1fr!important}
.slck-row:not(:has(button:not([hidden]))){display:none}
#myCk .evts,#ckCard .evts{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin:0 -4px;padding:2px 4px;-webkit-overflow-scrolling:touch}
#myCk .evts::-webkit-scrollbar,#ckCard .evts::-webkit-scrollbar{display:none}
#myCk .evts button,#ckCard .evts button{flex:0 0 auto}
.slck-row .slck-cancel{background:none!important;border:0!important;color:var(--muted)!important;min-height:40px!important;box-shadow:none!important}
@media (prefers-reduced-motion:reduce){.slck-txt{animation:none}.slck.nudge .slck-knob{animation:none}}`;
document.head.appendChild(st);
if(typeof HELP==="object"&&HELP.me&&Array.isArray(HELP.me[2]))HELP.me[2].push("To send a check-in, pick your status, then slide the green arrow all the way to the right.");
})();
