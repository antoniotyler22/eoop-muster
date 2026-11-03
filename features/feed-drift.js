/* Accounted For: Word of Mouth Drift. Word of Mouth glides upward on its own, like a live ticker, with soft fades at the top and bottom.
   You are always in control: touching, scrolling, typing, or opening anything stops the glide at once (every button and link
   still works while it moves), and it picks up again a few seconds after you let go. At the end it fades and starts over.
   The pill at the bottom right pauses/resumes it (remembered on this phone). Off by default if the phone asks for reduced motion. */
(()=>{
const SPEED=48,IDLE=3500,HOLD=1400;            /* points per second; wait after your last touch; pause at the end */
const st={acc:0,t:0,idle:0,down:false,downAt:0,hold:0,fade:0,expect:null,raf:0};
const reduced=()=>{try{return window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}};
const isOn=()=>S.driftOff===undefined?!reduced():!S.driftOff;
const mk=(tag,id,css)=>{let e=document.getElementById(id);if(!e){e=document.createElement(tag);e.id=id;e.style.cssText=css||"";document.body.appendChild(e)}return e};

/* ---------- the pill and the fades ---------- */
{const c=document.createElement("style");c.textContent=`#fdDrift{position:fixed;right:12px;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:29;border:1px solid var(--glass-line,var(--line));border-radius:999px;padding:0 14px;min-height:36px;background:var(--card,var(--surface-solid,#fff));color:var(--ink);font:inherit;font-size:12.5px;font-weight:700;display:none;align-items:center;gap:6px;box-shadow:var(--shadow,0 4px 14px rgba(0,0,0,.18))}
#fdDrift i{width:8px;height:8px;border-radius:50%;background:var(--muted)}#fdDrift.on i{background:var(--brass)}#fdDrift:focus-visible{outline:2px solid var(--brass);outline-offset:2px}
.fdFade{position:fixed;left:0;right:0;height:34px;z-index:5;pointer-events:none;display:none}
#fdFadeT{top:var(--hdr,110px);background:linear-gradient(var(--bg),transparent)}#fdFadeB{bottom:calc(60px + env(safe-area-inset-bottom,0px));background:linear-gradient(transparent,var(--bg))}
#main.fdOut{opacity:0}#main.fdBack{transition:opacity .45s ease}#main.fdOut.fdBack{transition:opacity .35s ease}
@media (prefers-reduced-motion:reduce){#main.fdBack,#main.fdOut.fdBack{transition:none}}`;document.head.appendChild(c)}
function chrome(show){
  const b=mk("button","fdDrift");b.type="button";
  if(!b.dataset.w){b.dataset.w=1;b.addEventListener("click",()=>{S.driftOff=isOn();save();paint();bump()})}
  b.style.display=show?"inline-flex":"none";b.className=isOn()?"on":"";
  b.setAttribute("aria-pressed",String(isOn()));b.setAttribute("aria-label",isOn()?"Pause auto-scroll":"Resume auto-scroll");
  b.innerHTML=`<i></i>${isOn()?"Auto-scroll on":"Auto-scroll off"}`;
  const fade=show&&isOn()?"block":"none";
  mk("div","fdFadeT").className="fdFade";mk("div","fdFadeB").className="fdFade";
  $("#fdFadeT").style.display=fade;$("#fdFadeB").style.display=fade}
const postTab=()=>!!document.querySelector('#fdTabs [data-fdtab="post"][aria-pressed="true"]');
function paint(){chrome(view==="feed"&&!postTab()&&!document.body.classList.contains("locked")&&!document.body.classList.contains("onb-open"))}
const bump=()=>{st.idle=Date.now()+IDLE};

/* ---------- when we must not move the page ---------- */
function blocked(){
  if(view!=="feed")return "view";
  if(postTab())return "post";            /* writing a post: the page stays put */
  if(!isOn())return "off";
  if(document.hidden)return "hidden";
  if(document.body.classList.contains("locked")||document.body.classList.contains("onb-open"))return "locked";
  if(st.down&&Date.now()-st.downAt>15000)st.down=false;           /* a missed finger-up can't freeze it for good */
  if(st.down)return "touch";
  if(Date.now()<st.idle)return "touch";
  const a=document.activeElement;
  if(a&&a.matches&&a.matches("input,textarea,select,[contenteditable='true']"))return "typing";
  for(const e of document.querySelectorAll(".sheet.open .sheet-panel,[role='dialog'],#tour"))if(e.getClientRects().length&&!e.closest("[hidden]"))return "open";
  const el=document.scrollingElement||document.documentElement;
  if(el.scrollHeight-window.innerHeight<60)return "short";
  return ""}
window.feedDrift={why:()=>blocked()||"running",on:isOn};

/* ---------- your hands always win ---------- */
const hand=()=>{st.down=true;st.downAt=Date.now();bump()};
const letgo=()=>{st.down=false;bump()};
document.addEventListener("pointerdown",hand,{capture:true,passive:true});
document.addEventListener("touchstart",hand,{capture:true,passive:true});
for(const ev of ["pointerup","pointercancel","touchend","touchcancel"])document.addEventListener(ev,letgo,{capture:true,passive:true});
document.addEventListener("wheel",bump,{capture:true,passive:true});
document.addEventListener("keydown",bump,{capture:true});
document.addEventListener("focusin",bump,{capture:true});
window.addEventListener("scroll",()=>{if(st.expect!==null&&Math.abs(window.scrollY-st.expect)<=2)return;bump()},{passive:true});   /* a scroll we didn't make = you */

/* ---------- the glide ---------- */
function loopBack(){const m=$("#main");if(!m||st.fade)return;st.fade=1;
  m.classList.add("fdBack","fdOut");
  setTimeout(()=>{window.scrollTo(0,0);st.expect=0;st.acc=0;m.classList.remove("fdOut");setTimeout(()=>{m.classList.remove("fdBack");st.fade=0;st.hold=0},460)},380)}
function frame(t){st.raf=requestAnimationFrame(frame);
  const dt=Math.min(.05,st.t?(t-st.t)/1e3:0);st.t=t;
  {const want=view==="feed"&&!postTab();if(want){if(!st.shown){st.shown=true;paint()}}else if(st.shown){st.shown=false;paint()}}
  if(blocked()||st.fade){st.acc=0;st.expect=null;return}
  const el=document.scrollingElement||document.documentElement,max=el.scrollHeight-window.innerHeight;
  if(window.scrollY>=max-2){if(!st.hold)st.hold=Date.now()+HOLD;else if(Date.now()>st.hold)loopBack();return}
  st.hold=0;st.acc+=SPEED*dt;const px=Math.floor(st.acc);if(!px)return;st.acc-=px;
  const to=Math.min(max,window.scrollY+px);st.expect=to;window.scrollTo(0,to)}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{st.shown=view==="feed"&&!postTab();paint()}catch(e){}return r}}
document.addEventListener("visibilitychange",()=>{st.t=0;bump()});
st.raf=requestAnimationFrame(frame);
setTimeout(()=>{try{paint()}catch(e){}},1500);
})();
