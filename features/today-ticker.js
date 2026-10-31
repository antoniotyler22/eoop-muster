/* Accounted For 4.61: Today rolls like a ticker.
   The Today cards on Home (and "Today for me" on My page) sit in one slim row that rolls to the next card every
   4 seconds, with an icon for each kind (duty, plan of the day, event, due-outs, a time). Tap the row to open it,
   as before. Hold it to pause. Swipe left still shows Hide. The ‹ 1/5 › under it steps by hand, and "Show all"
   opens the full list (tap "Roll" to go back). With reduced motion on, it never rolls by itself. */
(()=>{
const MS=4000;let idx=0,open=false,held=false,lastN=0;
const reduce=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}};
function icon(k){k=String(k||"").trim().toUpperCase();
  if(/^DUTY/.test(k))return"🛡";if(/PLAN OF THE DAY/.test(k))return"📋";if(/^EVENT/.test(k))return"🎟";if(/DUE/.test(k))return"⏰";
  if(/^\d{1,2}:\d{2}/.test(k))return"🕒";if(/LEAVE/.test(k))return"🏝";if(/TAD|TDY/.test(k))return"✈️";if(/APPT|MED/.test(k))return"🩺";return"📌"}
function strips(){const m=document.getElementById("main");if(!m)return[];
  return[...m.querySelectorAll(".strip")].filter(s=>{const h=s.previousElementSibling;return h&&h.classList.contains("sech")&&/^(Today|Hoy)/.test((h.textContent||"").trim())})}
const vis=s=>[...s.children].filter(c=>!c.hidden);
function paint(s){const items=vis(s);const n=items.length;if(n!==lastN){lastN=n;if(idx>=n)idx=0}
  s.style.setProperty("--tki",String(idx));
  const c=s.parentElement&&s.parentElement.querySelector(":scope>.tk-ctl");if(c){const p=c.querySelector(".tk-n");const tx=(idx+1)+"/"+n;if(p&&p.textContent!==tx)p.textContent=tx}
  items.forEach((it,i)=>it.setAttribute("aria-hidden",open||i===idx?"false":"true"))}
function setup(){for(const s of strips()){
  [...s.querySelectorAll(".k")].forEach(k=>{const t=k.closest(".sw-t,button");if(t&&!t.dataset.tkic)t.dataset.tkic=icon(k.textContent)});
  const n=vis(s).length;let ctl=s.nextElementSibling&&s.nextElementSibling.classList.contains("tk-ctl")?s.nextElementSibling:null;
  if(n<2){s.classList.remove("tk");if(ctl)ctl.remove();continue}
  s.classList.toggle("tk",!open);s.classList.add("tk-on");
  if(!ctl){s.insertAdjacentHTML("afterend",`<div class="tk-ctl"><button type="button" class="tk-p" aria-label="Previous">‹</button><span class="tk-n" aria-live="polite"></span><button type="button" class="tk-x" aria-label="Next">›</button><button type="button" class="chip tk-all"></button></div>`);ctl=s.nextElementSibling}
  {const a=ctl.querySelector(".tk-all"),tx=open?"Roll":"Show all "+n;if(a.textContent!==tx)a.textContent=tx}ctl.querySelector(".tk-p").hidden=ctl.querySelector(".tk-x").hidden=ctl.querySelector(".tk-n").hidden=open;
  if(!s.dataset.tkw){s.dataset.tkw="1";
    s.addEventListener("pointerdown",()=>{held=true});
    const up=()=>{setTimeout(()=>{held=false},1500)};s.addEventListener("pointerup",up);s.addEventListener("pointercancel",up);s.addEventListener("pointerleave",up)}
  paint(s)}}
function step(d){const ss=strips();if(!ss.length)return;for(const s of ss){const n=vis(s).length;if(n<2)continue;
  const wrap=idx+d>=n||idx+d<0;idx=(idx+d+n)%n;
  if(wrap&&d>0){s.classList.add("tk-jump");paint(s);requestAnimationFrame(()=>requestAnimationFrame(()=>s.classList.remove("tk-jump")))}else paint(s)}}
setInterval(()=>{if(open||held||reduce()||document.hidden)return;if(document.querySelector("#main .strip.tk .sw.open"))return;step(1)},MS);
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;
  if(t.closest(".tk-x")){e.stopImmediatePropagation();held=true;step(1);setTimeout(()=>{held=false},MS);return}
  if(t.closest(".tk-p")){e.stopImmediatePropagation();held=true;step(-1);setTimeout(()=>{held=false},MS);return}
  if(t.closest(".tk-all")){e.stopImmediatePropagation();open=!open;setup();return}},true);
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{setup()}catch(e){}return r}}
const m=document.getElementById("main");if(m&&"MutationObserver" in window){let tm=null;new MutationObserver(()=>{clearTimeout(tm);tm=setTimeout(()=>{try{setup()}catch(e){}},0)}).observe(m,{childList:true,subtree:true})}
window.todayTicker={step,setup,get idx(){return idx},get open(){return open}};
const st=document.createElement("style");st.textContent=`
.strip.tk{display:block!important;height:68px;overflow:hidden;position:relative;border-radius:18px;margin-top:10px;padding:0}
.strip.tk>*{display:block;height:68px;margin:0!important;transform:translateY(calc(var(--tki,0) * -100%));transition:transform .55s cubic-bezier(.6,0,.2,1)}
.strip.tk>[hidden]{display:none!important}
.strip.tk.tk-jump>*{transition:none}
.strip.tk>.sw>.sw-t,.strip.tk>button{height:68px;border-radius:18px!important}
.strip.tk-on .sw-t[data-tkic],.strip.tk-on>button[data-tkic]{display:grid!important;grid-template-columns:30px 1fr;column-gap:10px;align-content:center;align-items:center}
.strip.tk-on [data-tkic]::before{content:attr(data-tkic);grid-row:1/4;font-size:21px;line-height:1;text-align:center}
.strip.tk-on [data-tkic]>.k,.strip.tk-on [data-tkic]>.v,.strip.tk-on [data-tkic]>.w{grid-column:2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0}
.strip.tk-on [data-tkic]>.v{font-size:15px}
.tk-ctl{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:6px;font-size:12.5px;font-weight:800;color:var(--muted)}
.tk-ctl .tk-p,.tk-ctl .tk-x{border:0;background:none;color:var(--muted);font:inherit;font-size:20px;line-height:1;width:34px;height:30px;border-radius:10px;cursor:pointer}
.tk-ctl .tk-p:active,.tk-ctl .tk-x:active{background:var(--line)}
.tk-ctl .tk-n{min-width:34px;text-align:center}.tk-ctl .tk-all{margin-left:8px;cursor:pointer}
@media (prefers-reduced-motion:reduce){.strip.tk>*{transition:none}}
`;document.head.appendChild(st);
})();
