/* Accounted For 4.82.0: the "B2" alert card on Word of Mouth.
   The one-at-a-time "N to confirm" card at the top of Word of Mouth (features/feed-chat.js) becomes an alert card:
   sender avatar, title, preview, a Word of Mouth tag, and a slide to confirm track (same slide feel as slide to check in).
   Leaders also see "41 of 100 confirmed" with a light-to-dark blue bar that climbs as people confirm.
   Sliding presses the card's own Confirm button (kept in the card, hidden), so nothing about how Got it is stored changes:
   leaders' phones remember it (lseen), everyone else sends a Got it. Members keep their Reply button.
   The Confirm buttons on each post and "Confirm all" stay. Works with touch, mouse and keyboard (Enter or right arrow). */
(()=>{
const ARROW=`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`;
const CHECK=`<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
const buzz=ms=>{try{if(navigator.vibrate)navigator.vibrate(ms)}catch(e){}try{if(window.Capacitor&&typeof NP==="function"){const H=NP("Haptics");if(H)H.impact({style:ms>15?"MEDIUM":"LIGHT"})}}catch(e){}};
const initials=by=>{const w=String(by||"").replace(/[^A-Za-z0-9 ]/g," ").trim().split(/\s+/).filter(Boolean);if(!w.length)return"WM";const a=w[w.length-1][0]||"",b=w.length>1?w[w.length-2][0]:(w[0][1]||"");return (b+a).toUpperCase()};
function count(f,p){if(!f.lk||typeof fdPool!=="function")return null;const pool=fdPool(p)||[];if(!pool.length)return null;
  const A=(f.acks||{})[String(p.id)]||{};const n=pool.filter(m=>A[m.id]).length;return {n,of:pool.length}}
const title=p=>p.pod?"Plan of the Day":"New word";
const preview=p=>{const t=String(p.txt||"").replace(/\s+/g," ").trim();return t.length>110?t.slice(0,107)+"…":t};
function html(f,x){const p=x.p,c=count(f,p),pct=c?Math.round(c.n/c.of*100):0;
  return `<div class="b2" id="b2Alert" data-b2="${p.id}"><div class="b2-row"><div class="b2-av" aria-hidden="true">${esc(initials(p.by||f.unit))}</div>
<div class="b2-tx"><div class="b2-top"><b>${esc(title(p))}</b><span data-ago="${p.t}">${ago(p.t)}</span></div><div class="b2-body">${esc(preview(p))}</div><span class="b2-tag">Word of Mouth</span></div></div>
${c?`<div class="b2-cnt"><span id="b2N">${c.n} of ${c.of} confirmed</span></div><div class="b2-bar" role="img" aria-label="${pct} percent confirmed"><i style="width:${pct}%"></i></div>`:""}
<div class="b2-sl"><div class="b2-fill"></div><div class="b2-txt">Slide to confirm</div><div class="b2-knob" role="slider" tabindex="0" aria-label="Slide to confirm" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">${ARROW}</div></div></div>`}
function wire(card,btn){const wrap=card.querySelector(".b2-sl"),knob=wrap.querySelector(".b2-knob"),fill=wrap.querySelector(".b2-fill"),txt=wrap.querySelector(".b2-txt");
  let drag=false,x0=0,pos=0,done=false;
  const kw=()=>knob.offsetWidth||46;const max=()=>Math.max(1,(wrap.clientWidth||280)-kw()-8);
  function set(v,anim){pos=Math.max(0,Math.min(max(),v));const tr=anim?"transform .35s cubic-bezier(.3,1.4,.5,1),width .35s cubic-bezier(.3,1.4,.5,1)":"none";
    knob.style.transition=tr;fill.style.transition=tr;knob.style.transform=`translateX(${pos}px)`;fill.style.width=(pos+kw()+8)+"px";
    txt.style.opacity=String(Math.max(0,1-pos/max()*1.6));knob.setAttribute("aria-valuenow",String(Math.round(pos/max()*100)))}
  function finish(){if(done)return;done=true;set(max(),true);wrap.classList.add("done");knob.innerHTML=CHECK;txt.textContent="Confirmed";txt.style.opacity="1";buzz(25);
    setTimeout(()=>{try{btn.click()}catch(e){}},450)}
  knob.addEventListener("pointerdown",e=>{if(done)return;drag=true;x0=e.clientX-pos;try{knob.setPointerCapture(e.pointerId)}catch(_){}buzz(8);e.preventDefault()});
  knob.addEventListener("pointermove",e=>{if(!drag)return;set(e.clientX-x0,false);if(pos>=max()*.92){drag=false;finish()}});
  const end=()=>{if(!drag)return;drag=false;if(pos>=max()*.85)finish();else set(0,true)};
  knob.addEventListener("pointerup",end);knob.addEventListener("pointercancel",end);knob.addEventListener("lostpointercapture",end);
  knob.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "||e.key==="ArrowRight"||e.key==="End"){e.preventDefault();finish()}});
  wrap.addEventListener("click",e=>{if(done||e.target.closest(".b2-knob"))return;wrap.classList.remove("nudge");void wrap.offsetWidth;wrap.classList.add("nudge")});
  set(0,false)}
function put(){if(typeof view==="undefined"||view!=="feed")return;
  const st=document.getElementById("fStack"),old=st&&st.querySelector(".fscard");if(!old||st.querySelector("#b2Alert"))return;
  const f=typeof fdCur==="function"?fdCur():null;if(!f)return;
  const p=(typeof fdVisible==="function"?fdVisible(f):f.posts||[]).find(x=>String(x.id)===String(st.dataset.spid));if(!p)return;
  const n=+((st.querySelector(".fsp b")||{}).textContent||"").replace(/\D/g,"")||1;
  const btns=old.querySelector(".fsbtns");const go=btns&&btns.querySelector("[data-fsok],[data-fdack]");if(!go)return;
  const rep=btns.querySelector("[data-fdrep]");
  old.insertAdjacentHTML("afterend",html(f,{p,n}));const card=document.getElementById("b2Alert");if(!card)return;
  go.hidden=true;go.tabIndex=-1;card.appendChild(go);
  if(rep){rep.classList.add("b2-rep");card.appendChild(rep)}
  old.remove();wire(card,go)}
{const _rf=renderFeed;renderFeed=function(){const r=_rf.apply(this,arguments);try{put()}catch(e){}return r}}
const st=document.createElement("style");st.textContent=`
.b2{background:var(--surface-2);border:1px solid var(--line,rgba(127,127,127,.25));border-radius:20px;padding:14px;margin:10px 0 12px}
.b2-row{display:flex;gap:10px;align-items:flex-start}
.b2-av{width:38px;height:38px;border-radius:50%;background:#0c447c;color:#b5d4f4;display:grid;place-items:center;font-size:13px;font-weight:700;flex:none}
.b2-tx{flex:1;min-width:0}
.b2-top{display:flex;justify-content:space-between;gap:8px;align-items:baseline}
.b2-top b{font-size:15px}.b2-top span{font-size:11px;color:var(--muted)}
.b2-body{font-size:14px;color:var(--muted);margin-top:2px;line-height:1.35;overflow-wrap:anywhere}
.b2-tag{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px;background:#0c447c;color:#b5d4f4;margin-top:6px}
.b2-cnt{display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-top:12px}
.b2-bar{height:6px;border-radius:3px;background:var(--surface-1,rgba(127,127,127,.2));margin-top:6px;overflow:hidden}
.b2-bar i{display:block;height:100%;border-radius:3px;background-image:linear-gradient(90deg,var(--pr-lo,#a9ccff),var(--pr-hi,#0857e8));background-color:var(--pr-lo,#a9ccff);transition:width .5s}
.b2-sl{position:relative;height:50px;border-radius:25px;background:var(--surface-1,rgba(127,127,127,.2));overflow:hidden;touch-action:pan-y;-webkit-user-select:none;user-select:none;margin-top:12px}
.b2-fill{position:absolute;left:0;top:0;bottom:0;width:50px;border-radius:25px;background:var(--pr-hi,#0857e8)}
.b2-txt{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding-left:44px;font-size:15px;font-weight:700;color:var(--muted);pointer-events:none}
.b2-knob{position:absolute;left:4px;top:4px;width:42px;height:42px;border-radius:50%;background:#fff;color:var(--pr-hi,#0857e8);display:grid;place-items:center;box-shadow:0 2px 8px rgba(0,0,0,.2);touch-action:none;cursor:grab;z-index:2}
.b2-knob:focus-visible{outline:3px solid var(--brass);outline-offset:2px}
.b2-sl.done .b2-txt{color:#fff;padding-left:0}
.b2-rep{display:block;margin:10px auto 0;background:none;border:0;color:var(--muted);font-weight:600;font-size:14px;padding:6px 12px}
.b2-sl.nudge .b2-knob{animation:b2Nudge .6s ease}
@keyframes b2Nudge{30%{transform:translateX(26px)}60%{transform:translateX(-4px)}100%{transform:none}}
@media (prefers-reduced-motion:reduce){.b2-sl.nudge .b2-knob{animation:none}.b2-bar i{transition:none}}`;
document.head.appendChild(st);
if(typeof HELP==="object"&&HELP.feed&&Array.isArray(HELP.feed[2]))HELP.feed[2].push("A post waiting for you shows at the top as an alert card. Slide the arrow to confirm you saw it.");
})();
