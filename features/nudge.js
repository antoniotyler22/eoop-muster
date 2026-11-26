/* Accounted For 4.149.0: Nudge. A leader can nudge anyone who is Off Hand or hasn't checked in.
   Where: a Nudge button on the Phone list row of anyone showing Off Hand, and on every row of the Check-ins
   "Haven't checked in" panel, plus "Nudge everyone" there.
   How: people with a My page get a private message with a push ("Check in please"). People without one are left for the
   "Text them a reminder" button next to it (one tap texts them). A person is not nudged twice inside an hour.
   The nudge is an ordinary private message, so it shows in their chat and the leader can see it. Members never see Nudge. */
(()=>{
const HOUR=3600000;
const leader=()=>!(typeof memberMode==="function"&&memberMode())&&S.source!=="sample"&&Array.isArray(S.roster)&&S.roster.length>0&&!(typeof role==="function"&&role()==="view");
const who=m=>(m.rank?m.rank+" ":"")+lastOf(m);
const body=m=>"⏰ "+(typeof unitName==="function"?unitName():"Team")+": you haven't checked in. Open My page → 📍 Check in.";
const recent=m=>m.nudgeAt&&Date.now()-m.nudgeAt<HOUR;
async function send(ids){const R=ids.map(id=>S.roster.find(m=>m.id===id)).filter(Boolean);let sent=0,wait=0,noapp=0,fail=0;
  const nm=S.postAs||S.myName||(typeof unitName==="function"?unitName():"Leader");
  for(const m of R){if(!m.pk){noapp++;continue}if(recent(m)){wait++;continue}
    try{const d=await dmApi.open(m);const txt=body(m);const msg=await dmApi.send(d,txt,null,"L",nm,null,0,nm);
      dmApi.push(d.id,{id:msg.id,t:Date.now(),txt,by:"L",n:nm});m.nudgeAt=Date.now();sent++}catch(e){fail++}}
  if(sent)save();
  const bits=[];if(sent)bits.push("Nudged "+sent);if(wait)bits.push(wait+" nudged within the hour");if(noapp)bits.push(noapp+" not on the app, use Text them a reminder");if(fail)bits.push(fail+" didn't send, check signal");
  toast(bits.join(" · ")||"Nobody to nudge");render();setTimeout(dress,0);return {sent,wait,noapp,fail}}
window.nudgeSend=send;
const btn=m=>recent(m)?`<span class="ndg-done" aria-label="Nudged">✓ Nudged</span>`:`<button type="button" class="ndg" data-nudge="${esc(m.id)}" aria-label="Nudge ${esc(who(m))}">🔔 Nudge</button>`;
function dress(){if(!leader())return;const main=$("#main");if(!main)return;
  if(typeof ckStale==="function"){
    main.querySelectorAll(".m [data-pcard]").forEach(el=>{const row=el.closest(".m");if(!row||row.querySelector(".ndg,.ndg-done"))return;const m=S.roster.find(x=>x.id===el.dataset.pcard);if(!m||!ckStale(m))return;
      const at=row.querySelector(".nmrow");if(at)at.insertAdjacentHTML("afterend",`<div class="ndg-line">${btn(m)}</div>`)})}
  const P=$("#ckMiss");if(P&&typeof ckMissing==="function"){const miss=ckMissing().miss;
    P.querySelectorAll(".cm-row").forEach(r=>{if(r.querySelector(".ndg,.ndg-done"))return;const id=(r.querySelector("[data-pcard]")||{dataset:{}}).dataset.pcard;const m=S.roster.find(x=>x.id===id);if(m)r.insertAdjacentHTML("beforeend",btn(m))});
    const app=miss.filter(m=>m.pk&&!recent(m));
    if(!P.querySelector("#ndgAll")&&miss.length){const lst=P.querySelector(".alist");const h=`<button type="button" class="btn" id="ndgAll" data-nudge-all="1" ${app.length?"":"disabled"} style="margin-top:8px">🔔 Nudge everyone on the app (${app.length})</button>`;if(lst)lst.insertAdjacentHTML("afterend",h)}}}
{let busy=0,t=0;const go=()=>{if(busy)return;busy=1;try{dress()}catch(e){}busy=0};
  const mo=new MutationObserver(()=>{clearTimeout(t);t=setTimeout(go,30)});const main=document.getElementById("main");if(main)mo.observe(main,{childList:true,subtree:true});go()}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-nudge],[data-nudge-all]");if(!b||!leader())return;e.stopPropagation();e.preventDefault();
  if(b.hasAttribute("data-nudge-all")){send(ckMissing().miss.map(m=>m.id));return}
  send([b.dataset.nudge])},true);
{const st=document.createElement("style");st.textContent=`.ndg{flex:none;font:inherit;font-size:12.5px;font-weight:800;padding:5px 10px;border-radius:999px;border:1.5px solid var(--warn);background:transparent;color:var(--warn);cursor:pointer;margin-right:6px}
.ndg-line{margin:6px 0 2px}.ndg-line .ndg,.ndg-line .ndg-done{margin-right:0}.ndg:active{background:var(--warn);color:#fff}.ndg-done{flex:none;font-size:12.5px;font-weight:700;color:var(--s-onhand);margin-right:6px}#ndgAll[disabled]{opacity:.5}`;document.head.appendChild(st)}
})();
