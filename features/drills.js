/* Accounted For 1.8 — Drill history and elapsed-time alarms.
   Drill history: every check-in (recall) that's closed out is logged on this phone: when, drill or real event, how
   long it ran, how many were accounted for, how long it took to get everyone, who was still missing, need-help and
   visitor counts. The list shows on the check-in screen with averages, and exports to a spreadsheet (fire-drill and
   safety-drill logs). Elapsed-time alarms: while a check-in is open, the phone buzzes every 2, 5 or 10 minutes with
   how many are still missing (in the app, and as phone notifications in the iPhone/Android app). */
(()=>{
const KEEP=200,LIDS=[7711,7712,7713,7714,7715,7716,7717,7718];
const dl=()=>{S.drills=Array.isArray(S.drills)?S.drills:[];return S.drills};
const pool=()=>recallPool();
const nameOf=m=>((m.rank?m.rank+" ":"")+m.name).trim();
const mins=ms=>ms==null?"":ms<60000?Math.max(1,Math.round(ms/1000))+" sec":(ms/60000).toFixed(ms<600000?1:0).replace(/\.0$/,"")+" min";
function tally(){const rc=S.rc,res=rc.res||{},ci=rc.ci||{},p=pool();const got=p.filter(m=>res[m.id]==="ok");
  const codes={1:0,2:0,3:0};for(const m of p){const x=ci[m.id];if(x&&codes[x.c]!=null)codes[x.c]++}
  const vis=(Array.isArray(S.vis)?S.vis:[]).filter(v=>!v.out);return {p,got,codes,vis,visOk:vis.filter(v=>v.ok===rc.rid).length}}
/* the moment everyone (team + visitors on site) is accounted for */
function watchAll(){const rc=S.rc;if(!rc||!rc.open||rc.allAt)return;const T=tally();if(T.p.length&&T.got.length===T.p.length&&T.visOk===T.vis.length){rc.allAt=Date.now();save();
  try{navigator.vibrate&&navigator.vibrate([80,60,80])}catch(e){}toast("✓ Everyone accounted for in "+mins(rc.allAt-rc.start))}}
function firstAt(){let t=0;for(const x of Object.values(S.rc.ci||{}))if(x&&x.t&&(!t||x.t<t))t=x.t;return t}
function record(){const rc=S.rc;if(!rc.open||!rc.start)return;watchAll();const T=tally();const end=Date.now();
  const miss=T.p.filter(m=>(rc.res||{})[m.id]!=="ok");
  const d={id:rc.rid||rc.start.toString(36),t:rc.start,end,kind:rc.kind==="real"?"real":"drill",n:T.p.length,ok:T.got.length,
    good:T.codes[1],late:T.codes[2],help:T.codes[3],vis:T.vis.length,visOk:T.visOk,
    first:firstAt()?firstAt()-rc.start:null,all:rc.allAt?rc.allAt-rc.start:null,
    miss:miss.slice(0,60).map(nameOf),missN:miss.length,mode:S.mode||"military",unit:typeof unitName==="function"?unitName():""};
  const L=dl();const i=L.findIndex(x=>x.id===d.id);if(i>=0)L[i]=d;else L.unshift(d);S.drills=L.slice(0,KEEP)}
window.drillRecord=record;

/* ---------- elapsed-time alarms ---------- */
let lastBeat=0;
function alarmMin(){const v=+S.rcAlarm;return [2,5,10].includes(v)?v:0}
function cancelLocal(){try{window.MBN&&MBN.on&&MBN.LN.cancel({notifications:LIDS.map(id=>({id}))})}catch(e){}}
function schedLocal(){cancelLocal();const a=alarmMin(),rc=S.rc;if(!a||!rc.open||!(window.MBN&&MBN.on))return;const step=a*60000;
  const k=Math.floor((Date.now()-rc.start)/step)+1;
  try{MBN.LN.schedule({notifications:LIDS.map((id,i)=>({id,title:"⏱ "+(k+i)*a+" min into the check-in",body:"Open it to see who's still missing.",schedule:{at:new Date(rc.start+(k+i)*step),allowWhileIdle:true},extra:{open:"recall"}}))})}catch(e){}}
function beat(){const a=alarmMin(),rc=S.rc;if(!a||!rc||!rc.open||!rc.start)return;const n=Math.floor((Date.now()-rc.start)/(a*60000));
  if(n<1||n<=(rc.beat||0))return;rc.beat=n;save();const T=tally();const left=T.p.length-T.got.length+(T.vis.length-T.visOk);
  if(left<=0)return;
  try{navigator.vibrate&&navigator.vibrate([300,120,300])}catch(e){}
  lastBeat=Date.now();toast("⏱ "+n*a+" min · "+left+" still missing");redraw()}
every(5000,()=>{if(S.rc&&S.rc.open){watchAll();beat()}},"drill-alarm");
window.drillBeat=()=>{watchAll();beat()};

/* ---------- screen ---------- */
function alarmHTML(){const a=alarmMin(),rc=S.rc;const el=Date.now()-rc.start;
  return `<div class="panel" id="dlAlarm"><b>⏱ ${mins(el)} elapsed</b>${rc.allAt?` <span class="chip" style="color:var(--s-onhand)">✓ All accounted for in ${esc(mins(rc.allAt-rc.start))}</span>`:""}
    <div class="note">Buzz me every:</div>
    <div class="evts" role="group" aria-label="Elapsed-time alarm">${[[0,"Off"],[2,"2 min"],[5,"5 min"],[10,"10 min"]].map(([v,l])=>`<button data-dlal="${v}" aria-pressed="${a===v}">${l}</button>`).join("")}</div>
    <div class="evts" role="group" aria-label="Drill or real event" style="margin-top:6px"><button data-dlkind="drill" aria-pressed="${rc.kind!=="real"}">Drill</button><button data-dlkind="real" aria-pressed="${rc.kind==="real"}">Real event</button></div>
    ${a?`<p class="note">Each alarm says how many are still missing. It stops once everyone is accounted for.</p>`:""}</div>`}
function histRows(){return dl().slice(0,12).map(d=>{const full=d.ok===d.n&&(d.visOk||0)===(d.vis||0);
  return `<div class="rrow" style="--sc:var(${d.help?"--warn":full?"--s-onhand":"--s-duty"})"><div class="rtop"><div class="who"><b>${esc(new Date(d.t).toLocaleDateString([],{month:"short",day:"numeric",year:"2-digit"}))} ${esc(new Date(d.t).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}))}</b> <span class="chip">${d.kind==="real"?"Real event":"Drill"}</span>
    <div class="ph">${d.ok}/${d.n} accounted for${d.vis?` · ${d.visOk||0}/${d.vis} visitors`:""} · ran ${esc(mins(d.end-d.t))}${d.all!=null?` · everyone in ${esc(mins(d.all))}`:""}${d.help?` · <b style="color:var(--warn)">${d.help} needed help</b>`:""}</div>
    ${d.missN?`<div class="ph">Missing: ${esc(d.miss.slice(0,8).join(", "))}${d.missN>8?` +${d.missN-8} more`:""}</div>`:""}</div></div></div>`}).join("")}
function stats(){const L=dl().filter(d=>d.kind!=="real");const done=L.filter(d=>d.all!=null);
  if(!L.length)return "";const avg=done.length?done.reduce((a,d)=>a+d.all,0)/done.length:null;const best=done.length?Math.min(...done.map(d=>d.all)):null;
  const pct=Math.round(100*L.reduce((a,d)=>a+(d.n?d.ok/d.n:1),0)/L.length);
  return `<div class="note">${L.length} drill${L.length>1?"s":""} · ${pct}% accounted for on average${avg!=null?` · everyone in ${esc(mins(avg))} on average (best ${esc(mins(best))})`:""}</div>`}
function histHTML(){if(!dl().length)return `<h2>Drill history</h2><div class="panel"><p class="note" style="margin:0">Each check-in you close out is logged here: how long it took, who was missing, and how many needed help. Export it for your safety records.</p></div>`;
  return `<h2>Drill history</h2><div class="panel">${stats()}<div class="alist" style="margin-top:6px">${histRows()}</div>
    <div class="row2" style="margin-top:8px"><button class="btn alt" id="dlCsv">⬇ Export log</button><button class="btn alt" id="dlClear">${armed==="dlclear"?"Tap again to clear":"Clear history"}</button></div>
    <p class="note">Stays on this phone (last ${KEEP}). The export includes names of anyone missing: share it only with people who need it.</p></div>`}
function csv(){const q=s=>'"'+String(s==null?"":s).replace(/"/g,'""')+'"';const sec=ms=>ms==null?"":Math.round(ms/1000);
  const L=[["Date","Start","End","Type","Expected","Accounted for","Percent","OK","Delayed","Need help","Visitors on site","Visitors accounted for","Seconds to first reply","Seconds to everyone","Missing"].map(q).join(",")];
  for(const d of dl())L.push([new Date(d.t).toLocaleDateString(),new Date(d.t).toLocaleTimeString(),new Date(d.end).toLocaleTimeString(),d.kind==="real"?"Real event":"Drill",d.n,d.ok,d.n?Math.round(100*d.ok/d.n)+"%":"",d.good,d.late,d.help,d.vis||0,d.visOk||0,sec(d.first),sec(d.all),(d.miss||[]).join("; ")].map(q).join(","));
  return L.join("\r\n")}
window.drillCSV=csv;
function redraw(){if(view==="recall"){const y=window.scrollY;const a=document.activeElement;if(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName))return;render();window.scrollTo(0,y)}}
const _rr=renderRecall;
renderRecall=function(){_rr.apply(this,arguments);const main=$("#main");if(!main)return;
  if(S.rc.open){const bar=main.querySelector(".mbar");if(bar)bar.insertAdjacentHTML("afterend",alarmHTML())}
  else{const at=main.querySelector("#rq");if(at)at.insertAdjacentHTML("beforebegin",histHTML());else main.insertAdjacentHTML("beforeend",histHTML())}};
/* close out = log it (runs before the app's own close-out handler) */
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;
  if(t.closest("#rcClose")&&S.rc.open){record();S.rc.beat=0;cancelLocal();return}
  if(t.closest("#rcStart")){setTimeout(()=>{S.rc.kind="drill";S.rc.allAt=0;S.rc.beat=0;save();schedLocal()},30);return}
  if(t.closest("#rcCancel"))setTimeout(()=>{if(!S.rc.open)cancelLocal()},50)},true);
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;
  const a=t.closest("[data-dlal]");if(a){S.rcAlarm=+a.dataset.dlal;S.rc.beat=Math.floor((Date.now()-S.rc.start)/((+a.dataset.dlal||1)*60000));save();schedLocal();redraw();toast(+a.dataset.dlal?"Alarm every "+a.dataset.dlal+" min":"Alarm off");return}
  const k=t.closest("[data-dlkind]");if(k){S.rc.kind=k.dataset.dlkind;save();redraw();return}
  if(t.closest("#dlCsv")){shareFile(csv(),(unitName()+" drill log "+new Date().toISOString().slice(0,10)).replace(/[^\w -]+/g,"")+".csv","text/csv");return}
  if(t.closest("#dlClear")){if(armed!=="dlclear"){armed="dlclear";redraw();setTimeout(()=>{if(armed==="dlclear"){armed=null;redraw()}},4000);return}armed=null;S.drills=[];save();redraw();toast("Drill history cleared")}});
setTimeout(schedLocal,1600);
/* the PDF report and the Send text mention the last drill */
{const _rt=recallText;recallText=function(){let t=_rt.apply(this,arguments);const d=dl()[0];if(!d||S.rc.open)return t;
  return t+"\n"+(d.kind==="real"?"Real event":"Drill")+": "+d.ok+"/"+d.n+" accounted for"+(d.all!=null?", everyone in "+mins(d.all):"")+(d.help?", "+d.help+" needed help":"")}}
if(typeof HELP==="object"&&HELP.recall&&Array.isArray(HELP.recall[2]))HELP.recall[2].push("Close out logs the check-in in Drill history: time to get everyone, who was missing, need-help count. Export it for safety records.","Buzz me every 2, 5 or 10 min: the phone tells you how many are still missing until everyone is accounted for.");
})();
