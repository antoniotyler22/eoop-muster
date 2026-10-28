/* Accounted For: "Everyone" on the calendar.
   Add → Who → Everyone puts one entry on the whole roster without picking anybody. The leader's calendar shows it as one
   line ("Everyone"). It rides on each person's own calendar under one group id, so it reaches every My page and every
   synced phone the same way a personal appointment does, and people added later get it too.
   S.calAll keeps the list (synced with the rest of the board); S.calAllDel remembers deleted ones so stale copies go away. */
(()=>{
const keepFrom=()=>dkey(new Date(Date.now()-120*86400000));
const L=()=>Array.isArray(S.calAll)?S.calAll:(S.calAll=[]);
const DEL=()=>Array.isArray(S.calAllDel)?S.calAllDel:(S.calAllDel=[]);
const fullBoard=()=>!S.link||!!S.board;

/* make every person's calendar match the Everyone list */
function spread(){if(!Array.isArray(S.roster))return false;const list=L().filter(e=>(e.end||e.d)>=keepFrom());if(list.length!==L().length)S.calAll=list;
  const live=new Set(list.map(e=>e.g)),dead=new Set(DEL());let ch=false;
  for(const m of S.roster){const cal=m.cal||[];
    const kept=cal.filter(x=>!x.g||live.has(x.g)||!dead.has(x.g));if(kept.length!==cal.length){m.cal=kept;ch=true}
    const have=new Set((m.cal||[]).filter(x=>x.g).map(x=>x.g));
    for(const e of list)if(!have.has(e.g)){m.cal=(m.cal||[]).concat(Object.assign({},e,{id:"c"+e.g}));ch=true}}
  return ch}
window.calAllSpread=spread;
{const _s=save;save=function(){try{if(typeof canEdit!=="function"||canEdit())spread()}catch(e){}return _s.apply(this,arguments)}}
setTimeout(()=>{try{if((L().length||DEL().length)&&(typeof canEdit!=="function"||canEdit())&&spread())rawSave()}catch(e){}},0);

/* one line for Everyone instead of one per person */
const srcOf=e=>e&&e.own&&e.m&&(e.m.cal||[]).find(x=>x.id===e.id);
/* per-person lists (My page, the person's card, their phone calendar) keep their own copy */
let raw=0;const rawly=fn=>function(){raw++;try{return fn.apply(this,arguments)}finally{raw--}};
if(typeof mpDigest==="function")mpDigest=rawly(mpDigest);
if(typeof renderPerson==="function")renderPerson=rawly(renderPerson);
document.addEventListener("click",e=>{if(e.target&&e.target.id==="pcIcs"){raw++;setTimeout(()=>raw--,0)}},true);
{const _ce=calEntries;calEntries=function(){const out=_ce.apply(this,arguments);if(raw)return out;const seen=new Set();const res=[];
  for(const e of out){const s=srcOf(e);if(s&&s.g){if(seen.has(s.g))continue;seen.add(s.g);res.push(Object.assign({},e,{m:null,own:0,grp:"Everyone",gall:s.g}));continue}res.push(e)}
  return res}}
{const _cr=calRow;calRow=function(e,showDate){const h=_cr.apply(this,arguments);if(!e||!e.gall)return h;
  const btn=typeof canEdit==="function"&&!canEdit()?"":`<button class="chip" data-calldel="${esc(e.gall)}" style="cursor:pointer">${armed==="ca"+e.gall?"Delete?":"✕"}</button>`;
  return h.replace(/<\/div><\/div>$/,btn+"</div></div>")}}

/* Home "Today" strip: one card for each Everyone entry today */
if(typeof renderBoard==="function"){const _rb=renderBoard;renderBoard=function(){const r=_rb.apply(this,arguments);try{const st=document.querySelector("#main .strip");const k=dkey();
  const es=L().filter(e=>e.d<=k&&(e.end||e.d)>=k);if(st&&es.length)st.insertAdjacentHTML("afterbegin",es.map(e=>`<button data-go="cal"><div class="k">${esc(e.tm||ctype(e.ty)[1].toUpperCase())}</div><div class="v">${esc(e.ti)}</div><div class="w">Everyone</div></button>`).join(""))}catch(e){}return r}}

/* Who → Everyone */
{const _cf=calForm;calForm=function(pre){const h=_cf.apply(this,arguments);if(pre||!fullBoard()||(calSec&&calSec!=="ALL"))return h;
  return h.replace(`<option value="">Pick a person…</option>`,`<option value="">Pick a person…</option><option value="EVERYONE">Everyone</option>`)}}

document.addEventListener("click",e=>{const t=e.target;
  if(t.id==="caSave"&&!t.dataset.cafor&&(($("#caWho")||{}).value)==="EVERYONE"){e.stopImmediatePropagation();
    if(typeof canEdit==="function"&&!canEdit()){toast("This phone is view-only.");return}
    const d=$("#caD").value,ti=($("#caTi").value||"").trim().slice(0,60);if(!d){toast("Pick a date.");return}if(!ti){toast("Say what it is.");return}
    const end=$("#caE").value;const g="a"+Date.now().toString(36)+rndId(3);
    L().push({g,d,tm:$("#caT").value||"",end:end&&end>d?end:"",ty:$("#caTy").value,ti,no:($("#caNo").value||"").trim().slice(0,80)});
    armed=null;save();calAdd=false;calDay=d;toast("Added for everyone");const y=window.scrollY;render();window.scrollTo(0,y);return}
  const x=t.closest&&t.closest("[data-calldel]");if(x){e.stopImmediatePropagation();if(typeof canEdit==="function"&&!canEdit())return;const g=x.dataset.calldel;
    if(armed==="ca"+g){S.calAll=L().filter(v=>v.g!==g);S.calAllDel=DEL().concat(g).slice(-100);for(const m of S.roster||[])if(m.cal)m.cal=m.cal.filter(v=>v.g!==g);armed=null;save();toast("Removed for everyone")}
    else armed="ca"+g;
    const y=window.scrollY;render();window.scrollTo(0,y)}},true);

if(typeof HELP==="object"&&HELP.cal&&Array.isArray(HELP.cal[2]))HELP.cal[2].push("Who → Everyone adds one entry for the whole roster (it shows on everyone's calendar, new people too).");
})();
