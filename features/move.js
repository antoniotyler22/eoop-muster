/* Accounted For: moving someone to another section is one obvious tap.
   1) Person card: a "↔ Move to another section" button (the old plain "Section" dropdown read like a label, not a control).
   2) Any roster row: the status sheet gets a "↔ Move to another section" row at the bottom, so a leader on a section
      page can move someone without opening their card.
   Both open the same sheet: big buttons, one per section, current one marked. Tap one and they move. */
(()=>{
const canMove=()=>typeof canEdit==="function"&&canEdit()&&!(typeof memberMode==="function"&&memberMode());
const secName=k=>k==="ATT"?"Attached":((SECTIONS.find(x=>x[0]===k)||[])[1]||k);
function moveSheet(id){const m=S.roster.find(x=>x.id===id);if(!m||!canMove())return;sheetCtx={kind:"mv",id};
  $("#sheetT").innerHTML=`Move to another section<small>${esc(m.rank+" "+m.name)} · now in ${esc(m.sec)}</small>`;
  const ks=SECTIONS.map(s=>s[0]).concat("ATT");
  $("#sheetOpts").innerHTML=ks.map(k=>`<button data-mvto="${esc(k)}" aria-pressed="${k===m.sec}"${k===m.sec?" disabled":""}><b>${esc(k)}</b> <span class="note" style="margin:0">${esc(secName(k))}${k===m.sec?" · here now":""}</span></button>`).join("")
    +`<button class="btn alt" data-sclose="1" style="margin-top:8px">Cancel</button>`;
  const sh=$("#sheet");if(typeof sheetFocus==="function")sheetFocus();sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add("open")));try{buzz()}catch(e){}}
window.moveSheet=moveSheet;
function doMove(id,to){const m=S.roster.find(x=>x.id===id);if(!m||!canMove())return;if(!SECTIONS.some(s=>s[0]===to)&&to!=="ATT")return;
  const from=m.sec;if(from===to)return;m.sec=to;if(to!=="ATT")delete m.parent;
  S.secAt=S.secAt||{};S.secAt[to]=Date.now();if(from)S.secAt[from]=Date.now();
  try{actAdd("↔",m.rank+" "+lastOf(m)+" moved "+from+" → "+to,to.toLowerCase())}catch(e){}
  if(typeof afterRoster==="function")afterRoster(m.rank+" "+lastOf(m)+" moved to "+to);else{save();toast("Moved to "+to)}
  try{if(typeof syncSchedule==="function")syncSchedule()}catch(e){}}
window.doMove=doMove;

/* person card: swap the dropdown panel for a clear button */
{const _rp=renderPerson;renderPerson=function(){const r=_rp.apply(this,arguments);try{if(!canMove())return r;const m=S.roster.find(x=>x.id===pid);if(!m)return r;
  const sel=$("#v12Sec");const btn=`<button class="btn alt" data-mvopen="${esc(m.id)}" style="width:100%">↔ Move to another section <span class="note" style="margin:0">(now ${esc(m.sec)})</span></button>`;
  if(sel){const wrap=sel.closest("div");(wrap&&wrap.parentElement&&wrap.parentElement.classList.contains("row2")?wrap:sel).outerHTML=btn}
  else{const p=$("#v12PMove");if(p)p.insertAdjacentHTML("afterbegin",btn);else{const h2=$("#main .sechead");if(h2)h2.insertAdjacentHTML("afterend",`<div class="panel">${btn}</div>`)}}}catch(e){}return r}}

/* status sheet: a Move row at the bottom */
{const _os=openSheet;openSheet=function(kind,id){const r=_os.apply(this,arguments);try{if(kind==="s"&&canMove()&&sheetCtx&&sheetCtx.id===id&&!$("#sheetOpts [data-mvopen]"))
  $("#sheetOpts").insertAdjacentHTML("beforeend",`<button data-mvopen="${esc(id)}" style="margin-top:8px;border-style:dashed">↔ Move to another section</button>`)}catch(e){}return r}}

document.addEventListener("click",e=>{const o=e.target.closest&&e.target.closest("[data-mvopen]");
  if(o){e.preventDefault();e.stopImmediatePropagation();const id=o.dataset.mvopen;if(typeof closeSheet==="function"&&$("#sheet")&&!$("#sheet").hidden){closeSheet();setTimeout(()=>moveSheet(id),RM()?20:280)}else moveSheet(id);return}
  const t=e.target.closest&&e.target.closest("[data-mvto]");if(!t||!sheetCtx||sheetCtx.kind!=="mv")return;e.preventDefault();e.stopImmediatePropagation();
  const id=sheetCtx.id,to=t.dataset.mvto;closeSheet();doMove(id,to);const y=window.scrollY;render();window.scrollTo(0,y)},true);

/* People page: the bulk mover is open, not folded away */
{const _rpe=renderPeople;renderPeople=function(){const r=_rpe.apply(this,arguments);try{const d=$("#v12MoveWrap");if(d&&!d.open&&!d.dataset.userClosed)d.open=true}catch(e){}return r}}
document.addEventListener("toggle",e=>{if(e.target&&e.target.id==="v12MoveWrap"&&!e.target.open)e.target.dataset.userClosed="1"},true);

if(typeof HELP==="object")HELP.move=["Move someone to another section","Tap their name → ↔ Move to another section, or tap their status on any list and pick Move at the bottom.",["Tools → People has a bulk mover: tick names, pick the section, tap Move.","Moves sync to every phone and update the section counts."]];
})();
