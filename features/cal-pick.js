/* Accounted For: pick people for a calendar event.
   Add → Who → "Pick people…" opens a checklist (search, by section, "All" per section). Check the people, fill in the
   event, tap Add: it goes on each picked person's calendar (their My page shows it) and the leader's calendar shows it
   as one line with their names. ✕ on that line removes it for all of them. */
(()=>{
const who3=ms=>{const n=ms.map(m=>m.rank+" "+lastOf(m));return n.slice(0,3).join(", ")+(n.length>3?" +"+(n.length-3):"")};
const viewOnly=()=>typeof canEdit==="function"&&!canEdit();

/* the checklist */
function pickHtml(){const sec=calSec&&calSec!=="ALL"?calSec:null;const people=sorted(S.roster.filter(m=>!sec||m.sec===sec));
  const secs=SECTIONS.map(s=>s[0]).concat("ATT").filter(k=>!sec||k===sec);
  return `<div id="caPick" hidden style="margin:6px 0 10px;border:1px solid var(--line);border-radius:10px;padding:8px">
    <input type="search" id="caPkQ" placeholder="Search names" style="margin:0 0 6px;width:100%;box-sizing:border-box">
    <div class="note" id="caPkN" style="margin:0 0 4px;font-weight:700">0 picked</div>
    <div style="max-height:280px;overflow:auto">${secs.map(k=>{const ms=people.filter(m=>m.sec===k);if(!ms.length)return "";
      return `<div data-pksec="${esc(k)}"><div style="display:flex;justify-content:space-between;align-items:center;margin:8px 2px 2px"><b>${esc(k)}</b><button type="button" class="chip" data-pkall="${esc(k)}" style="cursor:pointer">All</button></div>
        ${ms.map(m=>`<label data-pkrow="${esc((m.rank+" "+m.name).toLowerCase())}" style="display:flex;align-items:center;gap:10px;padding:7px 4px;border-bottom:1px solid var(--line);cursor:pointer"><input type="checkbox" data-pk="${m.id}" style="width:20px;height:20px;margin:0">${esc(m.rank+" "+m.name)}</label>`).join("")}</div>`}).join("")}</div></div>`}
const picked=()=>[...document.querySelectorAll("#caPick [data-pk]:checked")].map(x=>x.dataset.pk);
function count(){const n=picked().length;const c=$("#caPkN");if(c)c.textContent=n+" picked";const b=$("#caSave");if(b&&($("#caWho")||{}).value==="PICK")b.textContent=n?"Add for "+n+(n===1?" person":" people"):"Add"}

{const _cf=calForm;calForm=function(pre){const h=_cf.apply(this,arguments);if(pre||!h.includes('id="caWho"'))return h;
  return h.replace(`<option value="">Pick a person…</option>`,`<option value="">Pick a person…</option><option value="PICK">Pick people…</option>`)
    .replace(/(<select id="caWho"[\s\S]*?<\/select>)/,"$1"+pickHtml())}}

document.addEventListener("change",e=>{const t=e.target;
  if(t.id==="caWho"){const p=$("#caPick");if(p)p.hidden=t.value!=="PICK";if(t.value==="PICK"){const q=$("#caPkQ");if(q)q.focus()}count();return}
  if(t.dataset&&t.dataset.pk!=null)count()});
document.addEventListener("input",e=>{if(e.target.id!=="caPkQ")return;const q=e.target.value.trim().toLowerCase();
  document.querySelectorAll("#caPick [data-pkrow]").forEach(r=>r.style.display=!q||r.dataset.pkrow.includes(q)?"flex":"none")});
document.addEventListener("click",e=>{const t=e.target;
  const all=t.closest&&t.closest("[data-pkall]");if(all){e.preventDefault();const box=[...document.querySelectorAll(`#caPick [data-pksec="${all.dataset.pkall}"] [data-pk]`)].filter(x=>x.closest("label").style.display!=="none");
    const on=!box.every(x=>x.checked);box.forEach(x=>x.checked=on);count();return}
  if(t.id==="caSave"&&!t.dataset.cafor&&(($("#caWho")||{}).value)==="PICK"){e.stopImmediatePropagation();
    if(viewOnly()){toast("This phone is view-only.");return}
    const ids=picked();if(!ids.length){toast("Check the people for this event.");return}
    const d=$("#caD").value,ti=($("#caTi").value||"").trim().slice(0,60);if(!d){toast("Pick a date.");return}if(!ti){toast("Say what it is.");return}
    const end=$("#caE").value;const gp="p"+Date.now().toString(36)+rndId(3);
    const e2={d,tm:$("#caT").value||"",end:end&&end>d?end:"",ty:$("#caTy").value,ti,no:($("#caNo").value||"").trim().slice(0,80),gp};
    const ms=S.roster.filter(m=>ids.includes(m.id));
    ms.forEach(m=>{m.cal=(m.cal||[]).concat(Object.assign({id:"c"+Date.now().toString(36)+rndId(3)},e2))});
    armed=null;save();calAdd=false;calDay=d;toast("Added for "+(ms.length===1?ms[0].rank+" "+lastOf(ms[0]):ms.length+" people"));const y=window.scrollY;render();window.scrollTo(0,y);return}
  const x=t.closest&&t.closest("[data-cgdel]");if(x){e.stopImmediatePropagation();if(viewOnly())return;const gp=x.dataset.cgdel;
    if(armed==="cg"+gp){let n=0;for(const m of S.roster||[])if(m.cal&&m.cal.some(v=>v.gp===gp)){m.cal=m.cal.filter(v=>v.gp!==gp);n++}armed=null;save();toast("Removed for "+n+(n===1?" person":" people"))}
    else armed="cg"+gp;
    const y=window.scrollY;render();window.scrollTo(0,y)}},true);

/* the leader's calendar: one line per picked-people event, with their names */
const srcOf=e=>e&&e.own&&e.m&&(e.m.cal||[]).find(x=>x.id===e.id);
let raw=0;const rawly=fn=>function(){raw++;try{return fn.apply(this,arguments)}finally{raw--}};
if(typeof mpDigest==="function")mpDigest=rawly(mpDigest);
if(typeof renderPerson==="function")renderPerson=rawly(renderPerson);
document.addEventListener("click",e=>{if(e.target&&e.target.id==="pcIcs"){raw++;setTimeout(()=>raw--,0)}},true);
{const _ce=calEntries;calEntries=function(){const out=_ce.apply(this,arguments);if(raw)return out;const by={};const res=[];
  for(const e of out){const s=srcOf(e);if(s&&s.gp){if(!by[s.gp]){by[s.gp]=Object.assign({},e,{own:0,gpid:s.gp,gms:[]});res.push(by[s.gp])}by[s.gp].gms.push(e.m);continue}res.push(e)}
  for(const g of Object.values(by)){if(g.gms.length>1){g.m=null;g.grp=who3(g.gms)}}
  return res}}
{const _cr=calRow;calRow=function(e,showDate){const h=_cr.apply(this,arguments);if(!e||!e.gpid)return h;
  const btn=viewOnly()?"":`<button class="chip" data-cgdel="${esc(e.gpid)}" style="cursor:pointer">${armed==="cg"+e.gpid?"Delete?":"✕"}</button>`;
  return h.replace(/<\/div><\/div>$/,btn+"</div></div>")}}

/* Home "Today" strip: picked-people events today */
if(typeof renderBoard==="function"){const _rb=renderBoard;renderBoard=function(){const r=_rb.apply(this,arguments);try{const st=document.querySelector("#main .strip");if(!st)return r;const k=dkey();
  const es=calEntries(k,k,"ALL").filter(e=>e.gpid&&!e.m);if(es.length)st.insertAdjacentHTML("afterbegin",es.map(e=>`<button data-go="cal"><div class="k">${esc(e.tm||ctype(e.ty)[1].toUpperCase())}</div><div class="v">${esc(e.ti)}</div><div class="w">${esc(e.gms.length+" people")}</div></button>`).join(""))}catch(e){}return r}}

if(typeof HELP==="object"&&HELP.cal&&Array.isArray(HELP.cal[2]))HELP.cal[2].push("Who → Pick people… lets you check several people (search or All per section), then Add puts the event on each of their calendars.");
})();
