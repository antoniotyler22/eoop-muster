/* Accounted For 1.3 — clearing things off.
   1. Due-outs: an overdue or due-soon item can be marked Done, acknowledged ("Got it": it drops off the list and the
      counts until a new due date is set) or deleted.
   2. Alerts: someone past their leave/TAD end date can be marked Back (status goes to On Hand and the rest of their
      leave comes off the calendar) or hidden. Someone departing can be taken off the numbers (undo in Data → Fix a
      wrong list) or hidden. People whose status already changed drop off by themselves.
   3. Calendar: entries can be marked Done (they drop off), deleted, or hidden (automatic ones: leave, returns, EDD,
      due-outs, duty, events). A due-out on the calendar can be marked done from there. */
(()=>{
const viewOnly=()=>{if(S.role==="view"){toast("View only: ask your leader to change this.");return true}return false};
const keep=f=>{const y=window.scrollY;f();window.scrollTo(0,y)};
const CH=()=>S.calHide||(S.calHide={}),AH=()=>S.alHide||(S.alHide={});

/* ---------- 1. due-outs ---------- */
const _ds=dueState;
dueState=function(m,it){const r=((m.due||{})[it.n])||{};
  if(r.due&&r.ack===r.due){const d=parseD(r.due);return {st:"ack",col:"--muted",dd:99998,iso:r.due,txt:"Acknowledged · was due "+(d?short(d):r.due)}}
  return _ds.apply(this,arguments)};
function dueAck(m,n){const r=(m.due||{})[n];if(r&&r.due)r.ack=r.due}
function dueDel(m,n){if(m.due)delete m.due[n]}
const _rr=renderReady;
renderReady=function(){_rr.apply(this,arguments);
  document.querySelectorAll("#main [data-rddone]").forEach(b=>{if(b.parentElement.classList.contains("dueacts"))return;const id=b.dataset.rddone,n=b.dataset.rdn;
    const w=document.createElement("span");w.className="dueacts";b.replaceWith(w);b.textContent="Done";w.appendChild(b);
    w.insertAdjacentHTML("beforeend",`<button class="chip" data-dueack="${esc(id)}" data-rdn="${esc(n)}" title="Hide it until a new date is set">Got it</button><button class="chip" data-duedel="${esc(id)}" data-rdn="${esc(n)}" title="Delete this due date">${armed==="dd"+id+n?"Delete?":"✕"}</button>`)});
  const over=[];for(const m of S.roster.filter(x=>x.sec!=="ATT"))for(const it of readyItems())if(_ds(m,it).st==="over"&&dueState(m,it).st==="over")over.push(1);
  const h=[...document.querySelectorAll("#main h2")].find(x=>/needs action|Overdue and due/.test(x.textContent));
  if(h&&over.length&&!$("#dueAckAll"))h.insertAdjacentHTML("afterend",`<div class="row2" style="margin:6px 0"><button class="btn alt" id="dueAckAll">${armed==="dueall"?"Tap again: acknowledge all "+over.length+" overdue":"Acknowledge all overdue ("+over.length+")"}</button><span class="note" style="align-self:center">They drop off until a new date is set.</span></div>`)};

/* ---------- 2. alerts: back, departed, hide ---------- */
const AWAYS=["Leave","TAD","Operation","Appointment off Base"];
const alKey=(m,kind)=>m.id+"|"+kind+"|"+(kind==="dep"?(m.edd||""):(m.end||""));
const _al=alerts;
alerts=function(){const r=_al.apply(this,arguments);const H=AH();
  return {over:r.over.filter(a=>!H[alKey(a.m,"over")]),ret:r.ret.filter(a=>!H[alKey(a.m,"ret")]),dep:r.dep.filter(a=>!H[alKey(a.m,"dep")])}};
function backNow(m){const today=dkey();const was=m.status;m.status="On Hand";delete m.start;delete m.end;
  // the rest of any leave/TAD on their calendar comes off
  for(const e of m.cal||[]){if(!["LEAVE","TAD"].includes(e.ty))continue;const end=e.end&&e.end>e.d?e.end:e.d;if(end<today)continue;
    if(e.d>=today)e.done=1;else{const y=new Date(today0());y.setDate(y.getDate()-1);e.end=dkey(y)}}
  return was}
const _arow=arow;
arow=function(a){const html=_arow.apply(this,arguments);const m=a.m;const dep=/^EDD /.test(a.why||"");const kind=dep?"dep":a.dd<0?"over":"ret";
  const btns=dep?`<button class="chip" data-algone="${m.id}">${armed==="gone"+m.id?"Remove?":"Departed"}</button>`
    :m.sec==="ATT"?`<button class="chip" data-algone="${m.id}">${armed==="gone"+m.id?"Remove?":"Gone"}</button>`
    :`<button class="chip" data-alback="${m.id}">Back ✓</button>`;
  return html.replace(/<\/div>$/,`<div class="dueacts">${btns}<button class="chip" data-alhide="${esc(alKey(m,kind))}">Hide</button></div></div>`)};

const _ra=renderAlerts;
renderAlerts=function(){_ra.apply(this,arguments);const n=[...document.querySelectorAll("#main p.note")].find(p=>/^Overdue = status still/.test(p.textContent));
  if(n)n.textContent="Overdue = status still Leave, TAD, Operation or Appt off base after the end date. Tap Back ✓ when they check in, Departed when someone leaves for good (undo in Data → Fix a wrong list), or Hide to clear an alert."};

/* ---------- 3. calendar ---------- */
const calKey=e=>[e.m?e.m.id:"",e.ty,e.d,e.ti].join("|");
const _ce=calEntries;
calEntries=function(){const out=_ce.apply(this,arguments);const H=CH();
  return out.filter(e=>{if(H[calKey(e)])return false;
    if(e.own&&e.m){const src=(e.m.cal||[]).find(x=>x.id===e.id);if(src&&src.done)return false}
    if(e.auto&&e.m&&/^Returns \(/.test(e.ti)&&!AWAYS.includes(e.m.status))return false;
    if(e.auto&&e.ty==="DUE"&&e.m){const n=e.ti.replace(/ due$/,"");const r=(e.m.due||{})[n];if(r&&r.ack===r.due)return false}
    return true})};
const REG={};let regN=0;
const _cr=calRow;
calRow=function(e){const html=_cr.apply(this,arguments);const k="c"+(regN++);REG[k]=e;
  let b="";
  if(e.own)b+=`<button class="chip" data-cxdone="${k}">✓ Done</button>`;
  else if(e.auto&&e.ty==="DUE"&&e.m)b+=`<button class="chip" data-cxdue="${k}">✓ Done</button>`;
  else if(e.auto&&e.m&&AWAYS.includes(e.m.status)&&(/^Returns \(/.test(e.ti)||["LEAVE","TAD","APPT"].includes(e.ty)))b+=`<button class="chip" data-cxback="${k}">Back ✓</button>`;
  if(!e.own)b+=`<button class="chip" data-cxhide="${k}">Hide</button>`;
  // own entries already have ✕ delete: put the new buttons beside it
  if(e.own)return html.replace(/(<button class="chip" data-cdel=)/,`<span class="dueacts">${b}$1`).replace(/(data-cdel="[^"]*"[^>]*>[^<]*<\/button>)/,"$1</span>");
  return html.replace(/<\/div><\/div>$/,`<div class="dueacts">${b}</div></div></div>`)};

/* ---------- clicks ---------- */
document.addEventListener("click",ev=>{const t=ev.target;if(!t.closest)return;let x;
  if(t.closest("[data-dueack],[data-duedel],#dueAckAll,[data-alback],[data-algone],[data-alhide],[data-cxdone],[data-cxdue],[data-cxback],[data-cxhide]"))ev.stopPropagation();
  if((x=t.closest("[data-dueack]"))){if(viewOnly())return;const m=S.roster.find(p=>p.id===x.dataset.dueack);if(m){dueAck(m,x.dataset.rdn);save();toast(x.dataset.rdn+" acknowledged for "+m.rank+" "+lastOf(m))}keep(renderReady);return}
  if((x=t.closest("[data-duedel]"))){if(viewOnly())return;const id=x.dataset.duedel,n=x.dataset.rdn;if(armed!=="dd"+id+n){armed="dd"+id+n;keep(renderReady);return}armed=null;
    const m=S.roster.find(p=>p.id===id);if(m){dueDel(m,n);save();toast(n+" deleted for "+m.rank+" "+lastOf(m))}keep(renderReady);return}
  if(t.id==="dueAckAll"){if(viewOnly())return;if(armed!=="dueall"){armed="dueall";keep(renderReady);return}armed=null;let n=0;
    for(const m of S.roster.filter(p=>p.sec!=="ATT"))for(const it of readyItems())if(dueState(m,it).st==="over"){dueAck(m,it.n);n++}save();toast(n+" overdue items acknowledged");keep(renderReady);return}
  if((x=t.closest("[data-alback]"))){if(viewOnly())return;const m=S.roster.find(p=>p.id===x.dataset.alback);if(m){const was=backNow(m);save();try{if(S.board)rpPublish(true)}catch(e){}toast(m.rank+" "+lastOf(m)+" is back from "+(SHORT[was]||was).toLowerCase())}keep(render);renderTabs();return}
  if((x=t.closest("[data-algone]"))){if(viewOnly())return;const id=x.dataset.algone;if(armed!=="gone"+id){armed="gone"+id;keep(render);return}armed=null;const m=S.roster.find(p=>p.id===id);if(!m)return;
    if(typeof logLoad==="function")logLoad("Departed",m.rank+" "+lastOf(m));S.roster=S.roster.filter(p=>p.id!==id);save();try{if(S.board)rpPublish(true)}catch(e){}
    toast(m.rank+" "+lastOf(m)+" taken off the numbers. Undo in Data → Fix a wrong list.");keep(render);renderTabs();return}
  if((x=t.closest("[data-alhide]"))){AH()[x.dataset.alhide]=Date.now();save();toast("Hidden");keep(render);return}
  if((x=t.closest("[data-cxdone]"))){if(viewOnly())return;const e=REG[x.dataset.cxdone];const src=e&&e.m&&(e.m.cal||[]).find(c=>c.id===e.id);if(src){src.done=1;save();toast("Done: "+e.ti)}keep(render);return}
  if((x=t.closest("[data-cxdue]"))){if(viewOnly())return;const e=REG[x.dataset.cxdue];if(e&&e.m){const n=e.ti.replace(/ due$/,"");markDone(e.m,n);save();toast(n+" done for "+e.m.rank+" "+lastOf(e.m))}keep(render);return}
  if((x=t.closest("[data-cxback]"))){if(viewOnly())return;const e=REG[x.dataset.cxback];if(e&&e.m){const was=backNow(e.m);save();toast(e.m.rank+" "+lastOf(e.m)+" is back from "+(SHORT[was]||was).toLowerCase())}keep(render);renderTabs();return}
  if((x=t.closest("[data-cxhide]"))){const e=REG[x.dataset.cxhide];if(e){CH()[calKey(e)]=Date.now();save();toast("Hidden from the calendar")}keep(render);return}
},true);

/* keep the hide lists small: forget entries more than a year old */
{const cut=Date.now()-365*864e5;for(const o of [CH(),AH()])for(const k of Object.keys(o))if(o[k]<cut)delete o[k]}
window.__cleanup={dueAck,dueDel,backNow,calKey};
})();
