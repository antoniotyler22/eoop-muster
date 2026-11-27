/* Accounted For 4.149.0: Nudge. A leader can nudge anyone who is Off Hand or hasn't checked in.
   Where: a slide-to-nudge control on the Phone list row of anyone showing Off Hand, and on every row of the Check-ins
   "Haven't checked in" panel, plus "Nudge everyone on the app" there.
   Slide the bell along the track and let go on a stop: In app (push + private message), Both (push, then Messages opens with the words filled in) or
   Text (Messages opens, you tap Send). Letting go before the first stop cancels, so a nudge never goes out by accident. Someone not on the app only gets the Text stop.
   How: people with a My page get a private message with a push ("Check in please"). People without one are left for the
   "Text them a reminder" button next to it (one tap texts them). A person is not nudged twice inside an hour.
   The nudge is an ordinary private message, so it shows in their chat and the leader can see it. Members never see Nudge. */
(()=>{
const HOUR=3600000;
const leader=()=>!(typeof memberMode==="function"&&memberMode())&&S.source!=="sample"&&Array.isArray(S.roster)&&S.roster.length>0&&!(typeof role==="function"&&role()==="view");
const who=m=>(m.rank?m.rank+" ":"")+lastOf(m);
const body=m=>"⏰ "+(typeof unitName==="function"?unitName():"Team")+": you haven't checked in. Open My page → 📍 Check in.";
const recent=m=>m.nudgeAt&&Date.now()-m.nudgeAt<HOUR;
async function send(ids,quiet){const R=ids.map(id=>S.roster.find(m=>m.id===id)).filter(Boolean);let sent=0,wait=0,noapp=0,fail=0,why="";
  const nm=S.postAs||S.myName||(typeof unitName==="function"?unitName():"Leader");
  for(const m of R){if(!m.pk){noapp++;continue}if(recent(m)){wait++;continue}
    try{const d=await dmApi.open(m);const txt=body(m);const msg=await dmApi.send(d,txt,null,"L",nm,null,0,nm);
      dmApi.push(d.id,{id:msg.id,t:Date.now(),txt,by:"L",n:nm});m.nudgeAt=Date.now();m.nudgeHow="app";sent++}catch(e){fail++;if(!why)why=String(e&&e.message||e).replace(/\s+/g," ").slice(0,70)}}
  if(sent)save();
  const r={sent,wait,noapp,fail,why};if(quiet)return r;
  const bits=[];if(sent)bits.push("Nudged "+sent);if(wait)bits.push(wait+" nudged within the hour");if(noapp)bits.push(noapp+" not on the app, use Text them a reminder");if(fail)bits.push(fail+" didn't send"+(navigator.onLine===false?", no signal":(why?": "+why:"")));
  toast(bits.join(" · ")||"Nobody to nudge");render();return r}
window.nudgeSend=send;
/* one person, one choice: mode is "app", "both" or "text" */
async function act(id,mode){const m=S.roster.find(x=>x.id===id);if(!m)return {ok:false};
  const how=[];
  if(mode!=="text"){if(!m.pk){if(mode==="app"){toast("Not on the app yet. Use Text.");return {ok:false}}}
    else if(recent(m)){toast("Already nudged within the hour");return {ok:false}}
    else{const r=await send([id],true);if(r.sent)how.push("app");else{toast("Didn't send"+(navigator.onLine===false?", no signal":(r.why?": "+r.why:"")));return {ok:false}}}}
  if(mode!=="app"){if(!m.phone){toast(how.length?"Nudged in the app. No phone number for a text.":"No phone number on file");if(!how.length)return {ok:false}}
    else{how.push("text");const href=bcBatches([m],body(m))[0].href;m.nudgeAt=Date.now();m.nudgeHow=how.join(" + ");save();toast("Nudged: "+how.join(" + "));render();try{location.href=href}catch(e){}return {ok:true,how}}}
  m.nudgeAt=Date.now();m.nudgeHow=how.join(" + ");save();toast("Nudged: "+how.join(" + "));render();return {ok:true,how}}
window.nudgeAct=act;
const BELL='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>';
/* stop positions as a share of the slide distance */
const STOPS=m=>m.pk?[["app","In app",.5],["both","Both",.75],["text","Text",1]]:[["text","Text",1]];
const btn=m=>{if(recent(m))return `<span class="ndg-done" aria-label="Nudged">✓ Nudged${m.nudgeHow?": "+esc(m.nudgeHow):""}</span>`;
  const st=STOPS(m);return `<div class="ndgs" data-ndgs="${esc(m.id)}" role="group" aria-label="Slide to nudge ${esc(who(m))}"><div class="ndgs-hint">Slide to nudge  →</div>${st.map(([k,l,f])=>`<span class="ndgs-st" data-k="${k}" style="left:calc(4px + 44px + (100% - 52px - 44px) * ${f} - 22px)">${l}</span>`).join("")}<button type="button" class="ndgs-knob" aria-label="Slide to nudge ${esc(who(m))}">${BELL}</button></div>`};
function dress(){if(!leader())return;const main=$("#main");if(!main)return;
  if(typeof ckStale==="function"){
    main.querySelectorAll(".m [data-pcard]").forEach(el=>{const row=el.closest(".m");if(!row||row.querySelector(".ndgs,.ndg-done"))return;const m=S.roster.find(x=>x.id===el.dataset.pcard);if(!m||!ckStale(m))return;
      const at=row.querySelector(".nmrow");if(at)at.insertAdjacentHTML("afterend",`<div class="ndg-line">${btn(m)}</div>`)})}
  const P=$("#ckMiss");if(P&&typeof ckMissing==="function"){const miss=ckMissing().miss;
    P.querySelectorAll(".cm-row").forEach(r=>{if(r.querySelector(".ndgs,.ndg-done"))return;const id=(r.querySelector("[data-pcard]")||{dataset:{}}).dataset.pcard;const m=S.roster.find(x=>x.id===id);if(m)r.insertAdjacentHTML("beforeend",`<div class="ndg-line ndg-full">${btn(m)}</div>`)});
    const app=miss.filter(m=>m.pk&&!recent(m));
    if(!P.querySelector("#ndgAll")&&miss.length){const lst=P.querySelector(".alist");const h=`<button type="button" class="btn" id="ndgAll" data-nudge-all="1" ${app.length?"":"disabled"} style="margin-top:8px">🔔 Nudge everyone on the app (${app.length})</button>`;if(lst)lst.insertAdjacentHTML("afterend",h)}}}
{let busy=0,t=0;const go=()=>{if(busy)return;busy=1;try{dress()}catch(e){}busy=0};
  const mo=new MutationObserver(()=>{clearTimeout(t);t=setTimeout(go,30)});const main=document.getElementById("main");if(main)mo.observe(main,{childList:true,subtree:true});go()}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-nudge-all]");if(!b||!leader())return;e.stopPropagation();e.preventDefault();send(ckMissing().miss.map(m=>m.id))},true);
/* the slide: drag the bell right, let go on a stop. Short of the first stop it springs back and nothing is sent. */
let drag=null;
function near(box,f){const m=S.roster.find(x=>x.id===box.dataset.ndgs);if(!m)return null;let best=null;for(const [k,,sf] of STOPS(m)){const d=Math.abs(f-sf);if(d<.13&&(!best||d<best.d))best={k,d}}return best&&best.k}
document.addEventListener("pointerdown",e=>{const k=e.target.closest&&e.target.closest(".ndgs-knob");if(!k||!leader())return;const box=k.closest(".ndgs");e.preventDefault();
  drag={k,box,x0:e.clientX,travel:Math.max(40,box.clientWidth-k.offsetWidth-8),dx:0};box.classList.add("drag");try{k.setPointerCapture(e.pointerId)}catch(_){}},true);
document.addEventListener("pointermove",e=>{if(!drag)return;drag.dx=Math.max(0,Math.min(drag.travel,e.clientX-drag.x0));drag.k.style.transform="translateX("+drag.dx+"px)";
  const hit=near(drag.box,drag.dx/drag.travel);drag.box.querySelectorAll(".ndgs-st").forEach(s=>s.classList.toggle("on",s.dataset.k===hit))},true);
document.addEventListener("pointerup",e=>{if(!drag)return;const d=drag;drag=null;d.box.classList.remove("drag");const pick=near(d.box,d.dx/d.travel);
  d.k.style.transition="transform .2s";d.k.style.transform=pick?"translateX("+d.travel+"px)":"translateX(0)";d.box.querySelectorAll(".ndgs-st").forEach(s=>s.classList.remove("on"));
  if(pick)act(d.box.dataset.ndgs,pick);else if(d.dx<6)toast("Slide the bell right to nudge")},true);
document.addEventListener("pointercancel",()=>{if(!drag)return;const d=drag;drag=null;d.box.classList.remove("drag");d.k.style.transform="translateX(0)"},true);
{const st=document.createElement("style");st.textContent=`.ndg-line{margin:8px 0 4px}.ndg-full{flex-basis:100%;margin:0 0 8px}#ckMiss .cm-row{flex-wrap:wrap}
.ndgs{position:relative;height:52px;border-radius:999px;background:#fff4e5;border:1px solid #f2c27a;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none}
.ndgs-hint{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding-left:48px;font-weight:800;font-size:14px;color:#7a4a00;pointer-events:none}
.ndgs.drag .ndgs-hint{opacity:0}.ndgs-st{position:absolute;top:50%;width:44px;text-align:center;transform:translateY(-50%);font-size:11.5px;font-weight:800;color:#7a4a00;opacity:0;pointer-events:none;transition:opacity .15s}
.ndgs.drag .ndgs-st{opacity:.75}.ndgs-st.on{opacity:1!important;color:#fff;background:#b45309;border-radius:99px;padding:6px 0}
.ndgs-knob{position:absolute;left:4px;top:4px;width:44px;height:44px;border-radius:50%;border:0;padding:0;background:#b45309;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(180,83,9,.4);cursor:grab;touch-action:none}
.ndg-done{flex:none;font-size:12.5px;font-weight:700;color:var(--s-onhand)}#ndgAll[disabled]{opacity:.5}`;document.head.appendChild(st)}
})();
