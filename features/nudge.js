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
/* say what really went wrong: the server allows 40 new app chats an hour, which is not a signal problem */
const reason=e=>{const t=String(e&&e.message||e||"");return /slow down|too many threads|busy/i.test(t)?"limit":/abort|Failed to fetch|NetworkError|Load failed|network|timed? ?out/i.test(t)||(typeof navigator!=="undefined"&&navigator.onLine===false)?"signal":"server"};
const WHY={limit:"The server allows 40 new app chats an hour. Try again later or use Text.",signal:"No signal. Try again, or use Text.",server:"Couldn't reach the server. Use Text."};
async function send(ids,quiet){const R=ids.map(id=>S.roster.find(m=>m.id===id)).filter(Boolean);let sent=0,wait=0,noapp=0,fail=0;const failed=[];let why="";
  const nm=S.postAs||S.myName||(typeof unitName==="function"?unitName():"Leader");
  for(const m of R){if(!m.pk){noapp++;continue}if(recent(m)){wait++;continue}
    try{const d=await dmApi.open(m);const txt=body(m);const msg=await dmApi.send(d,txt,null,"L",nm,null,0,nm);
      dmApi.push(d.id,{id:msg.id,t:Date.now(),txt,by:"L",n:nm});m.nudgeAt=Date.now();m.nudgeHow="app";sent++}catch(e){fail++;why=why||reason(e);failed.push(m.id)}}
  if(sent){save();/* the person learns their new chat only when their My page is republished: without this they get no alert */try{if(typeof mpPublish==="function")await mpPublish(true)}catch(e){}}
  const r={sent,wait,noapp,fail,failed,why};if(quiet)return r;
  const bits=[];if(sent)bits.push("Nudged "+sent);if(wait)bits.push(wait+" nudged within the hour");if(noapp)bits.push(noapp+" not on the app, use Text them a reminder");if(fail)bits.push(fail+" didn't send. "+(WHY[why]||WHY.server));
  toast(bits.join(" · ")||"Nobody to nudge");render();return r}
window.nudgeSend=send;
/* one person, one choice: mode is "app", "both" or "text" */
async function act(id,mode){const m=S.roster.find(x=>x.id===id);if(!m)return {ok:false};
  const how=[];
  if(mode!=="text"){if(!m.pk){if(mode==="app"){toast("Not on the app yet. Use Text.");return {ok:false}}}
    else if(recent(m)){toast("Already nudged within the hour");return {ok:false}}
    else{const r=await send([id],true);if(r.sent)how.push("app");else if(mode==="app"||!m.phone){toast(WHY[r.why]||WHY.server);return {ok:false}}else toast(WHY[r.why]||WHY.server)}}
  if(mode!=="app"){if(!m.phone){toast(how.length?"Nudged in the app. No phone number for a text.":"No phone number on file");if(!how.length)return {ok:false}}
    else{how.push("text");const href=bcBatches([m],body(m))[0].href;m.nudgeAt=Date.now();m.nudgeHow=how.join(" + ");save();toast("Nudged: "+how.join(" + "));render();try{location.href=href}catch(e){}return {ok:true,how}}}
  m.nudgeAt=Date.now();m.nudgeHow=how.join(" + ");save();toast("Nudged: "+how.join(" + "));render();return {ok:true,how}}
window.nudgeAct=act;
/* ===== Nudge everyone: tick the people, pick In app / Text / Both, send once ===== */
let NB=null;
function pool(){const seen=new Set(),out=[];const add=m=>{if(m&&!seen.has(m.id)){seen.add(m.id);out.push(m)}};
  try{ckMissing().miss.forEach(add)}catch(e){}try{ckStaleList().forEach(add)}catch(e){}return typeof sorted==="function"?sorted(out):out}
function nbHTML(){const P=NB.list,on=NB.on,md=NB.mode;const n=P.filter(m=>on.has(m.id)).length;
  const nApp=P.filter(m=>on.has(m.id)&&m.pk&&!recent(m)).length,nTxt=P.filter(m=>on.has(m.id)&&m.phone).length;
  const pill=(k,l)=>`<button type="button" class="nb-pill" data-nbm="${k}" aria-pressed="${md===k}">${l}</button>`;
  let h=`<div class="nb"><div class="nb-modes">${pill("app","In app")}${pill("both","Both")}${pill("text","Text")}</div>
    <p class="note nb-note">${md==="text"?"Opens Messages with the words filled in. You tap Send there.":md==="both"?"Sends the in-app nudge, then lets you text the same people.":"Sends a push and a private message to people with a My page. People without one are skipped."}</p>
    <div class="nb-all"><button type="button" class="chip" data-nball="1">${n===P.length?"Select none":"Select all"}</button><span class="note">${n} of ${P.length} selected · ${nApp} on the app · ${nTxt} with a phone</span></div><div class="nb-list">`;
  for(const m of P){const st=ckStale(m)?"Off Hand":"Not checked in";const tag=(m.pk?"on the app":"")+(m.pk&&m.phone?" · ":"")+(m.phone?"has phone":"")||"no phone or app";
    h+=`<label class="nb-row"><input type="checkbox" data-nbid="${esc(m.id)}" ${on.has(m.id)?"checked":""}><span><b>${esc(m.rank+" "+lastOf(m))}</b><small>${st} · ${esc(tag)}${recent(m)?" · nudged within the hour":""}</small></span></label>`}
  h+=`</div><button class="btn" id="nbGo" ${n?"":"disabled"}>🔔 Nudge ${n} ${n===1?"person":"people"}</button><button class="btn alt" data-sclose="1">Cancel</button><div id="nbOut" class="nb-out" role="status"></div></div>`;return h}
function nbPaint(){const o=$("#sheetOpts");if(o)o.innerHTML=nbHTML()}
function nbOpen(ids){const P=pool();if(!P.length){toast("Everyone has checked in");return}
  NB={list:P,on:new Set((ids&&ids.length?ids:P.map(m=>m.id)).filter(id=>P.some(m=>m.id===id))),mode:S.nbMode||"app"};
  $("#sheetT").innerHTML=`Nudge everyone<small>${P.length} not checked in</small>`;nbPaint();
  const sh=$("#sheet");sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add("open")))}
window.nudgeSheet=nbOpen;
async function nbGo(){if(!NB)return;const ids=NB.list.filter(m=>NB.on.has(m.id)).map(m=>m.id),mode=NB.mode;S.nbMode=mode;
  const out=$("#nbOut"),go=$("#nbGo");if(go)go.disabled=true;if(out)out.textContent="Sending…";
  let r={sent:0,wait:0,noapp:0,fail:0,failed:[],why:""},textIds=[];
  if(mode!=="text"){r=await send(ids,true)}
  if(mode==="text")textIds=ids.filter(id=>(S.roster.find(m=>m.id===id)||{}).phone);
  else if(mode==="both")textIds=ids.filter(id=>(S.roster.find(m=>m.id===id)||{}).phone);
  else textIds=r.failed.filter(id=>(S.roster.find(m=>m.id===id)||{}).phone);/* in app only: anyone the server refused falls back to Text */
  const tl=textIds.map(id=>S.roster.find(m=>m.id===id)),batches=tl.length?bcBatches(tl,body(tl[0])):[];
  const now=Date.now();for(const id of ids){const m=S.roster.find(x=>x.id===id);if(!m)continue;const app=mode!=="text"&&m.pk&&m.nudgeHow==="app"&&m.nudgeAt>=now-60000;const txt=textIds.includes(id);if(app||txt){m.nudgeAt=now;m.nudgeHow=[app?"app":"",txt?"text":""].filter(Boolean).join(" + ")}}
  save();
  const L=[];if(mode!=="text")L.push(`<div>✓ ${r.sent} nudged in the app</div>`);if(r.wait)L.push(`<div>${r.wait} already nudged within the hour</div>`);if(mode!=="text"&&r.noapp)L.push(`<div>${r.noapp} not on the app${tl.length?", texted instead":""}</div>`);if(r.fail)L.push(`<div style="color:var(--warn)">${r.fail} couldn't open an app chat. ${esc(WHY[r.why]||WHY.server)}</div>`);
  if(batches.length)L.push(`<div style="margin-top:8px"><b>Text ${tl.length} ${tl.length===1?"person":"people"}:</b></div>`+batches.map((b,i,a)=>`<a class="btn" href="${esc(b.href)}">📨 Open Messages${a.length>1?" · group "+(i+1)+" of "+a.length:""} (${b.n})</a>`).join(""));
  if(out)out.innerHTML=L.join("")||"Nothing to send.";if(go){go.textContent="Done";go.disabled=false;go.dataset.done="1"}
  toast(r.sent?"Nudged "+r.sent+" in the app":batches.length?"Ready to text":"Nobody nudged")}
document.addEventListener("click",e=>{const t=e.target;if(!t.closest||!NB)return;
  const pill=t.closest("[data-nbm]");if(pill){NB.mode=pill.dataset.nbm;nbPaint();return}
  if(t.closest("[data-nball]")){const all=NB.on.size===NB.list.length;NB.on=new Set(all?[]:NB.list.map(m=>m.id));nbPaint();return}
  if(t.closest("#nbGo")){e.preventDefault();const g=$("#nbGo");if(g&&g.dataset.done){closeSheet();NB=null;render();return}nbGo();return}
  const cb=t.closest("[data-nbid]");if(cb){e.stopPropagation();if(cb.checked)NB.on.add(cb.dataset.nbid);else NB.on.delete(cb.dataset.nbid);const o=$("#nbGo");const n=NB.on.size;if(o){o.disabled=!n;o.textContent="🔔 Nudge "+n+" "+(n===1?"person":"people")}const c=$(".nb-all .note");if(c)c.textContent=n+" of "+NB.list.length+" selected"}},true);

const BELL='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>';
/* stop positions as a share of the slide distance */
const STOPS=m=>m.pk?[["app","In app",.5],["both","Both",.75],["text","Text",1]]:[["text","Text",1]];
const btn=m=>{if(recent(m))return `<span class="ndg-done" aria-label="Nudged">✓ Nudged${m.nudgeHow?": "+esc(m.nudgeHow):""}</span>`;
  const st=STOPS(m);return `<div class="ndgs" data-ndgs="${esc(m.id)}" role="group" aria-label="Slide to nudge ${esc(who(m))}"><div class="ndgs-hint">Slide to nudge  →</div>${st.map(([k,l,f])=>`<span class="ndgs-st" data-k="${k}" style="left:calc(4px + 44px + (100% - 52px - 44px) * ${f} - 22px)">${l}</span>`).join("")}<button type="button" class="ndgs-knob" aria-label="Slide to nudge ${esc(who(m))}">${BELL}</button></div>`};
function dress(){if(!leader())return;const main=$("#main");if(!main)return;
  /* "Set everyone Off Hand" belongs right under Ask your roster, at the top where it never shifts when the lists below change */
  {const ar=$("#arCard"),ex=$("#exp24");if(view==="checkins"&&ar&&ex&&ar.nextElementSibling!==ex){const grp=[ex];let n=ex.nextElementSibling;while(n&&grp.length<3&&(n.id==="offRow"||n.classList.contains("note"))){grp.push(n);n=n.nextElementSibling}
    const f=document.createDocumentFragment();grp.forEach(x=>f.appendChild(x));ar.after(f)}}
  if(typeof ckStaleList==="function"&&typeof SECTIONS!=="undefined"&&SECTIONS.some(x=>x[0]===view)&&!$("#ndgSec")){const n=ckStaleList().filter(m=>m.sec===view).length;const lst=main.querySelector(".list");
    if(n&&lst)lst.insertAdjacentHTML("beforebegin",`<button type="button" class="btn alt" id="ndgSec" data-nudge-sec="${esc(view)}" style="margin:8px 0">🔔 Nudge everyone Off Hand in ${esc(view)} (${n})</button>`)}
  if(typeof ckStale==="function"){
    main.querySelectorAll(".m [data-pcard]").forEach(el=>{const row=el.closest(".m");if(!row||row.querySelector(".ndgs,.ndg-done"))return;const m=S.roster.find(x=>x.id===el.dataset.pcard);if(!m||!ckStale(m))return;
      const at=row.querySelector(".nmrow");if(at)at.insertAdjacentHTML("afterend",`<div class="ndg-line">${btn(m)}</div>`)})}
  const P=$("#ckMiss");if(P&&typeof ckMissing==="function"){const miss=ckMissing().miss;
    P.querySelectorAll(".cm-row").forEach(r=>{if(r.querySelector(".ndgs,.ndg-done"))return;const id=(r.querySelector("[data-pcard]")||{dataset:{}}).dataset.pcard;const m=S.roster.find(x=>x.id===id);if(m)r.insertAdjacentHTML("beforeend",`<div class="ndg-line ndg-full">${btn(m)}</div>`)});
    if(!P.querySelector("#ndgAll")&&miss.length){const lst=P.querySelector(".alist");const h=`<button type="button" class="btn" id="ndgAll" data-nudge-all="1" style="margin-top:8px">🔔 Nudge everyone… (${pool().length})</button>`;if(lst)lst.insertAdjacentHTML("afterend",h)}}}
{let busy=0,t=0;const go=()=>{if(busy)return;busy=1;try{dress()}catch(e){}busy=0};
  const mo=new MutationObserver(()=>{clearTimeout(t);t=setTimeout(go,30)});const main=document.getElementById("main");if(main)mo.observe(main,{childList:true,subtree:true});go()}
document.addEventListener("click",e=>{const sb=e.target.closest&&e.target.closest("[data-nudge-sec]");if(sb&&leader()){e.stopPropagation();e.preventDefault();nbOpen(ckStaleList().filter(m=>m.sec===sb.dataset.nudgeSec).map(m=>m.id));return}
  const b=e.target.closest&&e.target.closest("[data-nudge-all]");if(!b||!leader())return;e.stopPropagation();e.preventDefault();nbOpen()},true);
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
.nb-modes{display:flex;gap:6px;margin-bottom:6px}.nb-pill{flex:1;font:inherit;font-weight:800;font-size:14px;padding:10px 0;border-radius:999px;border:1.5px solid var(--line);background:transparent;color:var(--ink);cursor:pointer}#sheet .nb-pill[aria-pressed="true"]{background:#2563eb!important;color:#fff!important;border-color:#2563eb!important;opacity:1!important}#sheet .nb-pill[aria-pressed="true"] *{color:#fff!important}
.nb-all{display:flex;align-items:center;gap:10px;margin:8px 0}.nb-list{max-height:34vh;overflow:auto;border-top:1px solid var(--line);margin-bottom:10px}.nb-row{display:flex;align-items:center;gap:10px;padding:9px 2px;border-bottom:1px solid var(--line)}.nb-row small{display:block;font-size:12px;opacity:.7}.nb-row input{width:22px;height:22px}.nb-out{margin-top:8px;font-size:14px;display:flex;flex-direction:column;gap:4px}
.ndg-done{flex:none;font-size:12.5px;font-weight:700;color:var(--s-onhand)}#ndgAll[disabled]{opacity:.5}`;document.head.appendChild(st)}
})();
