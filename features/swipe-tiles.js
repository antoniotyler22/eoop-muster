/* Accounted For 4.58: swipe a tile left to Hide (or Done / Delete), like Mail.
   Every tile that had a small × or a Hide button now slides left to show its choices; a slide alone does nothing
   until you tap one. The choices press the same buttons as before, so hiding works exactly as it did (Today and
   Needs you come back tomorrow; Needs attention can be deleted for good). The × itself is gone from view but still
   there for screen readers and the keyboard. Today's cards now stack as a short list, so the slide doesn't fight the
   sideways scroll. The first time, one tile nudges left to show how. */
(()=>{
const RULES=[
  {ctl:"[data-tdhide]",tile:"[data-tdk]",acts:[["hide","Hide","[data-tdhide]"]]},
  {ctl:"[data-nyhide]",tile:".hc-row",acts:[["hide","Hide","[data-nyhide]"]]},
  {ctl:"[data-hhide],[data-hgone]",tile:".hc-row",acts:[["hide","Hide","[data-hhide]"],["del","Delete","[data-hgone]"]]},
  {ctl:"[data-ahide]",tile:".hc-row",acts:[["hide","Remove","[data-ahide]"]]},
  {ctl:"[data-hpdel]",tile:".hc-row",acts:[["del","Delete","[data-hpdel]"]]},
  {ctl:"[data-alhide]",tile:".arow",acts:[["hide","Hide","[data-alhide]"],["done","Done","[data-alback],[data-algone]"]]},
  {ctl:"[data-cxhide],[data-cdel]",tile:".rrow",acts:[["hide","Hide","[data-cxhide]"],["done","Done","[data-cxdone],[data-cxdue],[data-cxback]"],["del","Delete","[data-cdel],[data-cxdel]"]]}];
const SR="sw-sr";const AW=76;let openW=null,quietUntil=0;
/* 4.61.1: the app redraws Home every couple of minutes; remember which tile was open so it stays open */
let openKey=null;
function keyOf(tile,rule){for(const a of rule.acts){const b=tile.querySelector(a[2]);if(b){const at=[...b.attributes].find(x=>x.name.startsWith("data-"));if(at)return at.name+"="+at.value}}return null}
/* a slide must never count as a tap: catch the click before any other handler sees it */
window.addEventListener("click",e=>{if(Date.now()<quietUntil&&e.target.closest&&e.target.closest(".sw")){e.preventDefault();e.stopImmediatePropagation()}},true);
function close(w){if(!w)return;if(w.isConnected)openKey=null;w.classList.remove("open");const t=w.querySelector(":scope>.sw-t");if(t)t.style.transform="";if(openW===w)openW=null}
function press(tile,sel,kind){const b=tile.querySelector(sel);if(!b)return;const attr=[...b.attributes].find(a=>a.name.startsWith("data-"));b.click();
  /* deletes that ask for a second tap: the swipe button counts as that second tap */
  if(kind==="del"&&attr)setTimeout(()=>{const again=document.querySelector(`[${attr.name}="${CSS.escape(attr.value)}"]`);if(again&&again.isConnected)again.click()},40)}
function build(tile,rule){if(tile.closest(".sw")||tile.hidden)return;
  const acts=rule.acts.filter(a=>tile.querySelector(a[2]));if(!acts.length)return;
  const w=document.createElement("div");w.className="sw";w.style.setProperty("--aw",AW*acts.length+"px");
  const A=document.createElement("div");A.className="sw-a";A.setAttribute("aria-hidden","true");
  A.innerHTML=acts.map(([k,l])=>`<button type="button" tabindex="-1" class="sw-b ${k}" data-swk="${k}">${k==="del"?"🗑":k==="done"?"✓":"🙈"}<span>${l}</span></button>`).join("");
  tile.replaceWith(w);w.append(A,tile);tile.classList.add("sw-t");const myKey=keyOf(tile,rule);
  /* the old × / Hide stays for keyboards and screen readers, out of sight */
  rule.acts.forEach(a=>{if(a[0]!=="done")tile.querySelectorAll(a[2]).forEach(x=>x.classList.add(SR))});
  A.addEventListener("click",e=>{const b=e.target.closest("[data-swk]");if(!b)return;e.stopPropagation();const a=acts.find(x=>x[0]===b.dataset.swk);close(w);w.classList.add("sw-go");setTimeout(()=>press(tile,a[2],a[0]),160)});
  let x0=0,y0=0,dx=0,on=false,lock=null,moved=false;const max=AW*acts.length;
  tile.addEventListener("pointerdown",e=>{if(e.button>0)return;on=true;moved=false;lock=null;dx=0;x0=e.clientX;y0=e.clientY;if(openW&&openW!==w)close(openW)});
  tile.addEventListener("pointermove",e=>{if(!on)return;const mx=e.clientX-x0,my=e.clientY-y0;
    if(lock===null&&(Math.abs(mx)>8||Math.abs(my)>8)){lock=Math.abs(mx)>Math.abs(my)*1.2?"x":"y";if(lock==="x"){try{tile.setPointerCapture(e.pointerId)}catch(_){}tile.style.transition="none"}}
    if(lock!=="x")return;moved=true;quietUntil=Date.now()+600;dx=mx;const base=w.classList.contains("open")?-max:0;let v=base+dx;if(v>0)v=v/4;if(v<-max)v=-max+(v+max)/4;tile.style.transform=`translateX(${v}px)`});
  const end=()=>{if(!on)return;on=false;tile.style.transition="";if(lock!=="x")return;quietUntil=Date.now()+400;const base=w.classList.contains("open")?-max:0;const v=base+dx;
    if(v<-max*.45){w.classList.add("open");tile.style.transform=`translateX(${-max}px)`;openW=w;openKey=myKey?{k:myKey,t:Date.now()}:null;try{navigator.vibrate&&navigator.vibrate(8)}catch(_){}}else close(w)};
  tile.addEventListener("pointerup",end);tile.addEventListener("pointercancel",end);
  /* a slide is not a tap */
  tile.addEventListener("click",e=>{if(moved){e.preventDefault();e.stopImmediatePropagation();moved=false;return}if(w.classList.contains("open")){e.preventDefault();e.stopImmediatePropagation();close(w)}},true);
  if(openKey&&myKey===openKey.k&&Date.now()-openKey.t<120000&&(!openW||!openW.isConnected)){tile.style.transition="none";w.classList.add("open");tile.style.transform=`translateX(${-max}px)`;openW=w;requestAnimationFrame(()=>{tile.style.transition=""})}}
function scan(){const m=document.getElementById("main");if(!m)return;let any=null;
  for(const r of RULES)m.querySelectorAll(r.ctl).forEach(c=>{const t=c.closest(r.tile);if(t&&!t.closest(".sw")){build(t,r);any=any||t.closest(".sw")}});
  m.querySelectorAll(".strip").forEach(s=>{if(s.querySelector(".sw"))s.classList.add("sw-list")});
  if(any)hint(any)}
function hint(w){let seen="";try{seen=localStorage.getItem("af-swhint")||""}catch(e){}if(seen)return;try{localStorage.setItem("af-swhint","1")}catch(e){}
  setTimeout(()=>{if(!w.isConnected)return;w.classList.add("sw-nudge");setTimeout(()=>w.classList.remove("sw-nudge"),1400)},900)}
document.addEventListener("pointerdown",e=>{if(openW&&!openW.contains(e.target))close(openW)},true);
const main=document.getElementById("main");if(main&&"MutationObserver" in window){let t=null;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(scan,0)}).observe(main,{childList:true,subtree:true})}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{scan()}catch(e){}return r}}
window.swipeScan=scan;
const st=document.createElement("style");st.textContent=`
.sw{position:relative;overflow:hidden;border-radius:16px}
.sw>.sw-t{position:relative;z-index:1;touch-action:pan-y;transition:transform .25s cubic-bezier(.3,1,.4,1);background:var(--surface-solid,var(--surface));will-change:transform}
.sw-a{position:absolute;top:0;right:0;bottom:0;width:var(--aw);display:flex;z-index:0}
.sw-b{flex:1;border:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:#fff;font:700 12px inherit;font-family:inherit;font-size:12.5px;cursor:pointer}
.sw-b span{font-size:12px}.sw-b.hide{background:#8b95a5}.sw-b.done{background:var(--s-onhand)}.sw-b.del{background:#e5484d}
.sw.sw-go{animation:swGo .3s ease forwards}@keyframes swGo{to{opacity:0;transform:translateX(-30px)}}
.sw.sw-nudge>.sw-t{animation:swNudge 1.3s ease}@keyframes swNudge{25%,60%{transform:translateX(calc(-1 * var(--aw) * .6))}}
.${SR}{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;white-space:nowrap!important;padding:0!important;border:0!important;margin:-1px!important}
.${SR}:focus{position:static!important;width:auto!important;height:auto!important;clip:auto!important;margin:0!important}
.card.ny .sw{border-radius:0}.card.ny .sw+.sw{border-top:1px solid var(--line)}
.strip.sw-list{flex-direction:column;overflow:visible;gap:8px}
.strip.sw-list>.sw{flex:none;background:none!important;border:0!important;padding:0!important;border-radius:18px}
.strip.sw-list>.sw>.sw-t{display:block;width:100%;flex:none;margin:0;background:var(--surface-solid,var(--surface));border:1px solid var(--line);border-radius:18px;padding:10px 14px;text-align:left;font:inherit;color:var(--ink);box-shadow:none}
.strip.sw-list>[hidden]{display:none}
@media (prefers-reduced-motion:reduce){.sw>.sw-t{transition:none}.sw.sw-nudge>.sw-t{animation:none}}`;document.head.appendChild(st);
})();
