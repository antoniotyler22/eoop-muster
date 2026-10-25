/* Accounted For 1.3 — Missed check-in alerts.
   On a live recall, the leader picks a deadline. When it passes:
   - the server (setup part 22 + the notify function) pushes "N not checked in" to the leader's phone, even if the app is closed;
   - this phone also schedules its own reminder, and when the app is open it lists exactly who is missing.
   The server only ever has counts; names stay on this phone. */
(()=>{
const pool=()=>{const p=recallPool();const ph=p.filter(m=>m.phone);return ph.length?ph:p};
const missing=()=>{const ci=S.rc.ci||{},res=S.rc.res||{};return pool().filter(m=>!ci[m.id]&&res[m.id]!=="ok")};
const fmtT=t=>new Date(t).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
let tm=null;

function escHTML(){const rc=S.rc;if(!rc.open)return "";const E=rc.esc;const live=rc.live&&rc.live.ok;
  if(E&&E.due){const left=E.due-Date.now();const miss=missing();
    return `<div class="panel esc-panel" style="border-color:var(${left<=0&&miss.length?"--warn":"--line"})">
      <b>⏰ Check-in deadline ${esc(fmtT(E.due))}</b>
      <div class="note">${left>0?`${Math.ceil(left/60000)} min left · ${miss.length} not checked in yet`:miss.length?`<b style="color:var(--warn)">Deadline passed: ${miss.length} not checked in</b>`:"Deadline passed: everyone answered ✓"}</div>
      ${left<=0&&miss.length?`<div class="note">${miss.slice(0,40).map(m=>esc((m.rank?m.rank+" ":"")+m.name)).join(" · ")}${miss.length>40?" …":""}</div>`:""}
      <div class="note">${E.srv?"The server will alert this phone if people are missing, even with the app closed.":E.err?`Server alert not set (${esc(E.err)}). This phone will still remind you.`:live?"Setting the server alert…":"This phone will remind you."}</div>
      <div class="evts"><button data-esc-clear>Remove deadline</button>${[15,30].map(n=>`<button data-esc-add="${n}">+${n} min</button>`).join("")}</div></div>`}
  return `<div class="panel esc-panel"><b>⏰ Alert me if people haven't checked in by…</b>
    <div class="evts">${[15,30,60,120].map(n=>`<button data-esc-min="${n}">${n<60?n+" min":n/60+" hr"}</button>`).join("")}</div>
    <div class="row2"><input type="time" id="escAt" aria-label="Deadline time"><button class="btn alt" data-esc-at>Set time</button></div>
    <p class="note">${live?"You get one alert with how many are missing, even if the app is closed (turn on alerts above).":"Turn on live check-ins to get the alert with the app closed. Until then this phone reminds you."}</p></div>`}

async function setDue(due){const rc=S.rc;rc.esc={due,set:Date.now()};save();redraw();schedLocal();
  const L=rc.live;if(!L||!L.ok)return;
  try{await SB.rpc("esc_set",{p_recall:rc.rid,p_key:L.key,p_due:new Date(due).toISOString(),p_expected:pool().length});rc.esc.srv=true;rc.esc.err="";if(typeof pushAttach==="function")pushAttach()}
  catch(e){rc.esc.srv=false;rc.esc.err=/could not find|schema/i.test(String(e.message))?"server needs setup part 22":String(e.message||e).slice(0,60)}
  save();redraw()}
async function clearDue(){const rc=S.rc;const L=rc.live;rc.esc=null;save();redraw();cancelLocal();
  if(L&&L.ok)try{await SB.rpc("esc_set",{p_recall:rc.rid,p_key:L.key,p_due:null,p_expected:1})}catch(e){}}

/* this phone's own reminder (works without the server) */
const LID=7701;
function cancelLocal(){clearTimeout(tm);try{window.MBN&&MBN.on&&MBN.LN.cancel({notifications:[{id:LID}]})}catch(e){}}
function schedLocal(){cancelLocal();const E=S.rc.esc;if(!S.rc.open||!E||!E.due)return;const ms=E.due-Date.now();
  if(window.MBN&&MBN.on&&ms>0)try{MBN.LN.schedule({notifications:[{id:LID,title:"⏰ Check-in deadline",body:"Open the recall to see who hasn't checked in.",schedule:{at:new Date(E.due),allowWhileIdle:true},extra:{open:"recall"}}]})}catch(e){}
  if(ms<=2147483647)tm=setTimeout(fire,Math.max(0,ms))}
function fire(){const E=S.rc.esc;if(!S.rc.open||!E||E.fired)return;E.fired=Date.now();save();const miss=missing();
  if(miss.length){try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}toast("⏰ Deadline: "+miss.length+" not checked in")}
  redraw()}

function redraw(){if(view==="recall"){const y=window.scrollY;render();window.scrollTo(0,y)}}
const _rr=renderRecall;
renderRecall=function(){_rr.apply(this,arguments);if(!S.rc.open)return;const bar=$("#main .mbar");if(!bar)return;bar.insertAdjacentHTML("afterend",escHTML())};

document.addEventListener("click",e=>{
  const m=e.target.closest("[data-esc-min]");if(m){setDue(Date.now()+ +m.dataset.escMin*60000);return}
  const a=e.target.closest("[data-esc-add]");if(a&&S.rc.esc){setDue(Math.max(Date.now(),S.rc.esc.due)+ +a.dataset.escAdd*60000);return}
  if(e.target.closest("[data-esc-clear]")){clearDue();return}
  if(e.target.closest("[data-esc-at]")){const v=($("#escAt")||{}).value||"";if(!/^\d\d:\d\d$/.test(v)){toast("Pick a time first.");return}
    const d=new Date();d.setHours(+v.slice(0,2),+v.slice(3,5),0,0);if(d.getTime()<=Date.now())d.setDate(d.getDate()+1);setDue(d.getTime());return}
});
/* closing out a recall removes its deadline */
document.addEventListener("click",e=>{if(e.target.closest("#rcClose,#rcCancel"))setTimeout(()=>{if(!S.rc.open&&S.rc.esc){S.rc.esc=null;cancelLocal();save()}},50)},true);
setInterval(()=>{const a=document.activeElement;if(view==="recall"&&S.rc.open&&S.rc.esc&&!document.hidden&&!(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName)))redraw()},30000);
setTimeout(schedLocal,1500);

if(typeof SC==="object"&&Array.isArray(SC))SC.push({k:"esc",n:"1.3: missed check-in alerts",f:["22_escalate"],t:[["esc_set",{p_recall:"zz",p_key:"x",p_due:null,p_expected:1}]]});
})();
