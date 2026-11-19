/* Accounted For 4.127.0: one People screen.
   The People tab used to be section cards plus a separate "Move people between sections" box. Now it's one screen:
   - Filter chips: All, each section, ATT.
   - Select people (tick them), then "Move to…" on the bar at the bottom moves them all at once.
   - The owner sees a Sections summary first: each section's leader, how many are on hand, and who's missing (Off Hand:
     no check-in or update in 24 hours). A section with no leader has "Assign leader": pick the person, then text them
     their section leader link.
   - A section leader (section leader link) sees and edits only their own section, and can't move people out of it.
   - Members don't have the People tab. */
(()=>{
let pf="all",sel=new Set(),selOn=false;
const own=()=>typeof isOwner==="function"&&isOwner();
const leaderLink=()=>!!(S.link&&!S.link.whole);
const canMove=()=>typeof canEdit==="function"&&canEdit()&&!leaderLink()&&!(typeof memberMode==="function"&&memberMode());
const mySecs=()=>leaderLink()?[S.link.mysec||S.link.sec]:SECTIONS.map(s=>s[0]).concat("ATT");
const secName=k=>k==="ATT"?"Attached":((SECTIONS.find(x=>x[0]===k)||[])[1]||k);
const stale=m=>{try{return typeof window.ckStale==="function"&&window.ckStale(m)}catch(e){return false}};
const people=()=>{const ok=new Set(mySecs());return (typeof sorted==="function"?sorted(S.roster):S.roster.slice()).filter(m=>ok.has(m.sec)&&(pf==="all"||m.sec===pf))};
const lead=k=>{const L=(S.secLead||{})[k];if(L&&L.n)return {n:L.n,set:true};const r=typeof secLast==="function"?secLast(k):null;/* a change made on this phone isn't a leader */return r&&r.by&&!r.local&&r.by!=="this phone"?{n:r.by,set:false}:null};
function summary(){if(!own()||leaderLink())return "";const {c}=counts();
  const rows=SECTIONS.map(([k])=>{const o=c[k]||{total:0,"On Hand":0};const ms=S.roster.filter(m=>m.sec===k&&stale(m));const L=lead(k);
    return `<tr data-secsum="${esc(k)}"><td><b>${esc(k)}</b><div class="note" style="margin:0">${esc(secName(k))}</div></td>
      <td>${L?esc(L.n)+(L.set?"":` <span class="note" style="margin:0">(sent last update)</span>`):`<button class="chip" data-seclead="${esc(k)}" style="cursor:pointer">Assign leader</button>`}</td>
      <td style="text-align:right">${o["On Hand"]}/${o.total}</td>
      <td>${ms.length?`<span style="color:var(--warn);font-weight:700">${ms.length}</span> <span class="note" style="margin:0">${esc(ms.slice(0,3).map(m=>m.rank+" "+lastOf(m)).join(", "))}${ms.length>3?" +"+(ms.length-3):""}</span>`:`<span class="note" style="margin:0">None</span>`}</td></tr>`}).join("");
  return `<div class="panel" id="secSum"><b>Sections</b><table class="v11tb" style="width:100%"><thead><tr><th>Section</th><th>Leader</th><th style="text-align:right">On hand</th><th>Missing</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="note" style="margin:4px 0 0">Missing: no check-in or update in 24 hours (Off Hand).</p></div>`}
function chips(){const ks=mySecs();if(ks.length<2)return "";return `<div class="evts" id="pplChips" role="group" aria-label="Filter by section">${["all"].concat(ks).map(k=>`<button data-pchip="${esc(k)}" aria-pressed="${pf===k}">${k==="all"?"All":esc(k)}</button>`).join("")}</div>`}
function rowsHTML(){const L=people();if(!L.length)return `<div class="panel"><p class="note">No one here yet.</p></div>`;
  return `<div class="alist" id="pplList">${L.slice(0,600).map(m=>{const st=stale(m)?"Off Hand":(typeof SHORT==="object"&&SHORT[m.status])||m.status;
    return `<div class="rrow ppl-row" style="--sc:var(${stale(m)?"--warn":(typeof SVAR==="object"&&SVAR[m.status])||"--line"})">${selOn&&canMove()?`<input type="checkbox" class="ppl-ck" data-psel="${esc(m.id)}" aria-label="Select ${esc(m.rank+" "+m.name)}"${sel.has(m.id)?" checked":""}>`:""}
      <div class="who" data-pcard="${esc(m.id)}" style="cursor:pointer;flex:1;min-width:0"><b>${esc(m.rank)} ${esc(m.name)}</b><div class="ph">${esc(m.sec)} · ${esc(st)}</div></div></div>`}).join("")}</div>`}
function bar(){if(!selOn||!canMove())return "";return `<div id="pmBar" role="region" aria-label="Move selected people" style="position:sticky;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:5;display:flex;gap:8px;align-items:center;background:var(--ink);color:var(--bg);border-radius:14px;padding:10px 12px;margin:10px 0">
  <b style="flex:1">${sel.size} selected</b><button class="btn" id="pmMove"${sel.size?"":" disabled"} style="width:auto;margin:0">Move to…</button><button class="btn alt" id="pmClear" style="width:auto;margin:0">${sel.size?"Clear":"Done"}</button></div>`}
window.peopleScreen=function(){if(leaderLink()&&!mySecs().includes(pf))pf="all";
  return (typeof canEdit==="function"&&canEdit()&&!leaderLink()&&typeof isLeaderPhone==="function"&&isLeaderPhone()?`<button class="btn" data-addm="" style="width:100%;margin-top:10px">＋ Add people</button>`:"")
    +`<div id="pplWrap"><div style="margin-top:12px"><input class="search" id="gq" type="search" placeholder="Find anyone: name, rank or section" autocomplete="off" style="margin:0"><div id="gqr" class="alist" style="margin-top:6px"></div></div>
    ${summary()}
    <div class="sech"><h2>${leaderLink()?"Your section · "+esc(mySecs()[0]):"People"}</h2>${canMove()?`<button class="chip" id="pplSel" style="cursor:pointer">${selOn?"Cancel":"Select"}</button>`:`<span class="note" style="margin:0">${people().length}</span>`}</div>
    ${chips()}${rowsHTML()}${bar()}</div>`};
function redraw(){const y=window.scrollY;if(typeof view!=="undefined"&&view==="people")render();window.scrollTo(0,y)}
function moveTo(){const ids=[...sel].filter(id=>S.roster.some(m=>m.id===id));if(!ids.length)return;sheetCtx={kind:"pmv"};
  $("#sheetT").innerHTML=`Move ${ids.length} ${ids.length===1?"person":"people"} to…<small>Pick the section.</small>`;
  $("#sheetOpts").innerHTML=SECTIONS.map(s=>s[0]).concat("ATT").map(k=>`<button data-pmto="${esc(k)}"><b>${esc(k)}</b> <span class="note" style="margin:0">${esc(secName(k))}</span></button>`).join("")+`<button class="btn alt" data-sclose="1" style="margin-top:8px">Cancel</button>`;
  const sh=$("#sheet");sh.hidden=false;void sh.offsetWidth;sh.classList.add("open")}
function assign(k){sheetCtx={kind:"slead",k};const ms=(typeof sorted==="function"?sorted(S.roster):S.roster).filter(m=>m.sec===k);
  $("#sheetT").innerHTML=`Leader for ${esc(k)}<small>${esc(secName(k))}. Pick who runs this section.</small>`;
  $("#sheetOpts").innerHTML=(ms.length?ms.map(m=>`<button data-sleadid="${esc(m.id)}"><b>${esc(m.rank)}</b> ${esc(m.name)}</button>`).join(""):`<p class="note">No one is in ${esc(k)} yet.</p>`)+`<button class="btn alt" data-sclose="1" style="margin-top:8px">Cancel</button>`;
  const sh=$("#sheet");sh.hidden=false;void sh.offsetWidth;sh.classList.add("open")}
function assigned(k,m){S.secLead=Object.assign({},S.secLead||{},{[k]:{id:m.id,n:(m.rank+" "+lastOf(m)).trim(),t:Date.now()}});save();
  const link=S.board&&typeof boardLink==="function"?boardLink(k):"";
  $("#sheetT").innerHTML=`${esc(m.rank+" "+lastOf(m))} leads ${esc(k)}<small>Send them their section leader link so their phone runs ${esc(k)}.</small>`;
  $("#sheetOpts").innerHTML=link?`<a class="btn" href="${esc("sms:"+(m.phone?m.phone:"")+"?&body="+encodeURIComponent(unitName()+" · Accounted For: you lead "+k+". Open this on your phone to run your section: "+link))}">Text their link</a><button class="btn alt" data-sclose="1">Done</button>`
    :`<p class="note">Turn on live section updates first; then their link is ready.</p><button class="btn" data-go="live">Set up live section updates</button><button class="btn alt" data-sclose="1">Done</button>`;
  try{redraw()}catch(e){}}
document.addEventListener("click",e=>{const t=e.target;if(!t||!t.closest)return;
  const ch=t.closest("[data-pchip]");if(ch&&t.closest("#pplWrap")){e.stopImmediatePropagation();pf=ch.dataset.pchip;redraw();return}
  if(t.closest("#pplSel")){e.stopImmediatePropagation();selOn=!selOn;sel.clear();redraw();return}
  if(t.closest("#pmClear")){e.stopImmediatePropagation();if(sel.size)sel.clear();else selOn=false;redraw();return}
  if(t.closest("#pmMove")){e.stopImmediatePropagation();moveTo();return}
  const to=t.closest("[data-pmto]");if(to&&sheetCtx&&sheetCtx.kind==="pmv"){e.stopImmediatePropagation();const k=to.dataset.pmto;let n=0;
    for(const id of [...sel]){const m=S.roster.find(x=>x.id===id);if(m&&m.sec!==k&&typeof window.doMove==="function"){window.doMove(id,k);n++}}
    sel.clear();selOn=false;closeSheet();redraw();toast(n?"Moved "+n+" to "+k:"They're already in "+k);return}
  const sl=t.closest("[data-seclead]");if(sl){e.stopImmediatePropagation();if(!own())return;assign(sl.dataset.seclead);return}
  const si=t.closest("[data-sleadid]");if(si&&sheetCtx&&sheetCtx.kind==="slead"){e.stopImmediatePropagation();const m=S.roster.find(x=>x.id===si.dataset.sleadid);if(m)assigned(sheetCtx.k,m);return}},true);
document.addEventListener("change",e=>{const t=e.target;if(!t||!t.dataset||!t.dataset.psel)return;if(t.checked)sel.add(t.dataset.psel);else sel.delete(t.dataset.psel);
  const b=document.getElementById("pmBar");if(b){const o=document.createElement("div");o.innerHTML=bar();b.replaceWith(o.firstElementChild)}});
})();
