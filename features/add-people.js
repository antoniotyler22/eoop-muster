/* Accounted For 4.101.0: Add people, one zone.
   "Add Marines" is now "Add people": one sheet with two ways in, switched at the top.
   - Drop roster: drop or pick an Excel, CSV, PDF, Word or contacts file, or a photo of a list. It reads the whole
     thing and adds everyone (name, rank, section, phone, anything else it can place). Nothing is dropped; people
     already on the roster are kept. Undo import removes just what that drop added.
   - Manual: one form with every field (name, rank, section, role, phone, email, emergency contact, notes).
   Under both, the people just added show as rows. Tap a row to open it and fix anything in place; rows missing a
   phone say so. A team that has no roster yet shows "Drop a roster" up front. */
(()=>{
const st={tab:"drop",added:[],last:[],open:"",busy:"",msg:"",paste:false};
const FIELDS=["fn","ln","rk","sc","ro","ph","em","en","er","ep","nt"];
const ini=n=>{const w=String(n||"").replace(/[^A-Za-z ,]/g,"").split(/[ ,]+/).filter(Boolean);return ((w[0]||"?")[0]+((w[1]||"")[0]||(w[0]||"?")[1]||"")).toUpperCase()};
const title=s=>String(s||"").toLowerCase().replace(/(^|[ ,.-])([a-z])/g,(m,a,b)=>a+b.toUpperCase());
const secOpts=sel=>SECTIONS.map(([k,n])=>`<option value="${esc(k)}"${k===sel?" selected":""}>${esc(k+" · "+n)}</option>`).join("")+`<option value="ATT"${sel==="ATT"?" selected":""}>ATT · Attached</option>`;
const rankOpts=sel=>RANKS.map(r=>`<option${r===sel?" selected":""}>${esc(r)}</option>`).join("");
const defRank=()=>(MODE().rankDef||RANKS[RANKS.length-1]||"");
const defSec=()=>SECTIONS.some(x=>x[0]===String(view).toUpperCase())?String(view).toUpperCase():SECTIONS[0][0];
const byId=id=>S.roster.find(m=>m.id===id);
const subtitle=m=>esc(m.sec)+" · "+(m.phone?esc(dashPh(m.phone)):"No phone number");

function rowHTML(m){const open=st.open===m.id;const miss=!m.phone;
  const ec=m.ec||{};
  return `<div class="apd-row${open?" open":""}" data-id="${esc(m.id)}"><button type="button" class="apd-hd" data-apd-open="${esc(m.id)}" aria-expanded="${open}">
    <span class="apd-av${miss?" warn":""}">${esc(ini(m.name))}</span><span class="apd-nm"><b>${esc(m.rank+" "+m.name)}</b><small>${subtitle(m)}</small></span>
    <span class="apd-bd ${miss?"warn":"ok"}">${miss?"Add phone":"Complete"}</span></button>
    ${open?`<div class="apd-ed"><div class="apd-g">
      <div><label>Rank</label><select class="wsel" id="apdE-rk">${rankOpts(m.rank)}</select></div>
      <div><label>${S.level==="co"?"Platoon":"Section"}</label><select class="wsel" id="apdE-sc">${secOpts(m.sec)}</select></div>
      <div><label>Phone</label><input type="tel" inputmode="tel" id="apdE-ph" value="${esc(dashPh(m.phone||""))}" placeholder="808-555-0100"></div>
      <div><label>Role</label><input type="text" id="apdE-ro" value="${esc(m.role||"")}" placeholder="Driver, medic"></div>
      <div style="grid-column:1/3"><label>Email</label><input type="text" inputmode="email" autocapitalize="none" id="apdE-em" value="${esc(m.email||"")}" placeholder="name@email.com"></div>
      <div><label>Emergency contact</label><input type="text" id="apdE-en" value="${esc(ec.n||"")}" placeholder="Name"></div>
      <div><label>Relationship</label><input type="text" id="apdE-er" value="${esc(ec.r||"")}" placeholder="Spouse, parent"></div>
      <div style="grid-column:1/3"><label>Emergency phone</label><input type="tel" inputmode="tel" id="apdE-ep" value="${esc(dashPh(ec.p||""))}" placeholder="808-555-0199"></div>
      <div style="grid-column:1/3"><label>Notes</label><input type="text" id="apdE-nt" value="${esc(m.note||"")}" placeholder="Allergies, leave dates, drives van 3"></div></div>
      <div class="row2" style="margin-top:8px"><button type="button" class="btn apd-primary" data-apd-save="${esc(m.id)}">Save</button>${m.phone?`<a class="btn alt" href="${telHref(m.phone)}" style="text-align:center">Call</a>`:`<button type="button" class="btn alt" data-apd-rm="${esc(m.id)}">Remove</button>`}</div>
      ${m.phone?`<button type="button" class="apd-link" data-apd-rm="${esc(m.id)}">Remove from roster</button>`:""}</div>`:""}</div>`}

function listHTML(){const rows=st.added.map(byId).filter(Boolean);if(!rows.length)return "";
  const need=rows.filter(m=>!m.phone).length;
  return `<div class="apd-sec"><b>Just added (${rows.length})</b>${need?`<span class="apd-bd warn">${need} need a phone</span>`:`<span class="apd-bd ok">All complete</span>`}</div><div class="apd-list">${rows.map(rowHTML).join("")}</div>`}

function dropHTML(){
  return `<label class="apd-drop" id="apdDrop" for="apdFile"><span class="apd-ic">${st.busy?`<i class="rs-spin"></i>`:"⬆"}</span>
    <b>${st.busy?esc(st.busy):"Drop your roster here"}</b><small>${st.busy?"Reading everything in it…":"Excel, CSV, PDF, Word, contacts, or a photo of a list. We read all of it."}</small>
    <input type="file" id="apdFile" multiple hidden accept=".csv,.txt,.xlsx,.xls,.vcf,.pdf,.docx,image/*,text/csv,text/plain,application/pdf"></label>
    <div class="row2" style="margin-top:8px"><label class="btn alt apd-pick" for="apdCam">📷 Take a photo<input type="file" id="apdCam" accept="image/*" capture="environment" hidden></label><button type="button" class="btn alt" id="apdTpl">Sample file</button></div>
    <button type="button" class="apd-link" id="apdPasteT">${st.paste?"Hide paste box":"Or paste names from a spreadsheet"}</button>
    ${st.paste?`<textarea id="apdPaste" style="min-height:96px" placeholder="Name&#9;Team&#9;Phone&#10;Rivera, Ana&#9;2nd&#9;808-555-0101"></textarea><button type="button" class="btn alt" id="apdPasteGo">Add pasted rows</button>`:""}
    ${st.last.length?`<div class="apd-done"><span><b>${st.last.length}</b> added from the drop</span><button type="button" class="apd-link" id="apdUndo" style="margin:0">Undo import</button></div>`:""}`}

function manualHTML(){const def=defSec();
  return `<div class="apd-form"><div class="apd-lb">Person</div><div class="apd-g">
    <div><label for="apdM-fn">First name</label><input type="text" id="apdM-fn" autocomplete="off" autocapitalize="words"></div>
    <div><label for="apdM-ln">Last name</label><input type="text" id="apdM-ln" autocomplete="off" autocapitalize="words"></div>
    <div><label for="apdM-rk">Rank</label><select class="wsel" id="apdM-rk">${rankOpts(defRank())}</select></div>
    <div><label for="apdM-sc">${S.level==="co"?"Platoon":"Section"}</label><select class="wsel" id="apdM-sc">${secOpts(def)}</select></div>
    <div style="grid-column:1/3"><label for="apdM-ro">Role</label><input type="text" id="apdM-ro" placeholder="Driver, medic, squad leader"></div></div>
    <div class="apd-lb">Contact</div><div class="apd-g">
    <div><label for="apdM-ph">Phone</label><input type="tel" inputmode="tel" id="apdM-ph" placeholder="808-555-0100"></div>
    <div><label for="apdM-em">Email</label><input type="text" inputmode="email" autocapitalize="none" id="apdM-em" placeholder="name@email.com"></div></div>
    <div class="apd-lb">Emergency contact</div><div class="apd-g">
    <div><label for="apdM-en">Name</label><input type="text" id="apdM-en"></div>
    <div><label for="apdM-er">Relationship</label><input type="text" id="apdM-er" placeholder="Spouse, parent"></div>
    <div style="grid-column:1/3"><label for="apdM-ep">Phone</label><input type="tel" inputmode="tel" id="apdM-ep"></div></div>
    <div class="apd-lb">Notes</div><input type="text" id="apdM-nt" placeholder="Allergies, leave dates, drives van 3">
    <button type="button" id="apdSave" class="btn apd-primary" style="width:100%;margin-top:10px">Save person</button></div>`}

function draw(){const o=$("#sheetOpts");if(!o||!$("#apdRoot"))return;
  o.innerHTML=body()}
function body(){return `<div class="panel" id="apdRoot" data-noxl style="margin:0">
  <div class="apd-seg" role="tablist" aria-label="How to add people"><button type="button" role="tab" data-apd-tab="drop" aria-selected="${st.tab==="drop"}">⬆ Drop roster</button><button type="button" role="tab" data-apd-tab="man" aria-selected="${st.tab==="man"}">⌨ Manual</button></div>
  ${st.tab==="drop"?dropHTML():manualHTML()}
  <div class="note apd-out" id="apdOut" role="status" aria-live="polite">${st.msg||""}</div>
  ${listHTML()}
  <button type="button" class="btn alt" id="apdDone" style="width:100%;margin-top:10px">Done</button></div>`}

addSheet=function(sec){sheetCtx={kind:"addm"};st.added=[];st.last=[];st.open="";st.busy="";st.msg="";st.paste=false;
  if(!st.tab||(S.source==="sample"||!S.roster.length))st.tab="drop";
  $("#sheetT").innerHTML=`Add people<small>Drop a roster and it's read for you, or type one person in.</small>`;
  $("#sheetOpts").innerHTML=body();
  const sh=$("#sheet");sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add("open")))};

/* ---------- reading files ---------- */
function newOnes(before){return S.roster.filter(m=>!before.has(m.id)).map(m=>m.id)}
async function readPhoto(f){if(!SB.afn)throw new Error("Reading photos needs the Ask function on the server. Use Excel, CSV, PDF or Word instead.");
  const url=URL.createObjectURL(f);const im=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error("That photo couldn't be opened."));i.src=url});
  const k=Math.min(1,1800/Math.max(im.width,im.height));const c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(url);
  const r=await fetch(SB.url+"/functions/v1/"+SB.afn,{method:"POST",headers:{apikey:SB.key,"Content-Type":"application/json"},body:JSON.stringify({scan:1,kind:"roster",img:c.toDataURL("image/jpeg",.82),statuses:STATUSES,dev:(S.dev=S.dev||rndId(24))})});
  const o=await r.json().catch(()=>({}));if(!r.ok||o.error)throw new Error(o.error||"Couldn't read the photo. Try again with the page flat and in good light.");
  let n=0;for(const x of (o.rows||[])){const nm=String(x.name||"").trim();if(!nm)continue;const rk=String(x.rank||"").toUpperCase();
    const rec=addMarine({rank:RANKS.includes(rk)?rk:"",name:nm,sec:defSec(),phone:normPh(x.phone||"")||undefined});if(rec)n++}
  save();return n}
/* the main importer is built for military detail lists and can skip phone columns; read them with the flexible reader too */
async function fillPhones(f){try{const P=flexParse(parseCSV(await fileToCSV(f)));let u=0;
    for(const x of P.roster){if(!x.phone&&!x.phone2)continue;const m=S.roster.find(r=>fullK(r)===fullK(x));if(!m)continue;
      if(x.phone&&!m.phone){m.phone=x.phone;u++}if(x.phone2&&!m.phone2&&x.phone2!==m.phone){m.phone2=x.phone2;u++}}
    if(u)save();mergeFile.up=(mergeFile.up||0)}catch(e){}}
async function readOne(f){const name=(f.name||"").toLowerCase();
  if(/\.(xlsx|xls|csv)$/.test(name)){const n=await mergeFile(f);await fillPhones(f);return n}
  if(/\.pdf$/.test(name)||f.type==="application/pdf"){const t=await pdfText(await f.arrayBuffer());return (await window.rosterPaste(t)).n}
  if(/\.docx$/.test(name)){const t=await docxText(await f.arrayBuffer());return (await window.rosterPaste(t)).n}
  if(/\.vcf$/.test(name)){const t=vcfToCSV(await f.text());return (await window.rosterPaste(t)).n}
  if(/\.(jpe?g|png|heic|heif|gif|webp)$/.test(name)||/^image\//.test(f.type))return readPhoto(f);
  if(/\.(doc|pages|numbers)$/.test(name))throw new Error("That file type can't be read here. Save it as Excel, CSV, PDF or Word (.docx).");
  return mergeFile(f)}
window.__apdIngest=ingest;
async function ingest(files){const list=[...(files||[])];if(!list.length)return;
  const before=new Set(S.roster.map(m=>m.id));let up=0;const errs=[];
  for(const f of list){st.busy="Reading "+f.name;st.msg="";draw();
    try{await readOne(f);up+=mergeFile.up||0}catch(e){errs.push(f.name+": "+String(e&&e.message||e).slice(0,140))}}
  st.busy="";const ids=newOnes(before);st.last=ids;st.added=ids.concat(st.added.filter(x=>!ids.includes(x)));
  const need=ids.map(byId).filter(m=>m&&!m.phone).length;
  st.msg=(ids.length?`✓ <b>${ids.length}</b> ${ids.length===1?"person":"people"} added${need?` · ${need} need a phone`:""}.`:"No new people found in that file.")+(up?` ${up} phone number${up===1?"":"s"} filled in for people already here.`:"")+(errs.length?`<br><span class="warnt">${esc(errs.join(" · "))}</span>`:"");
  save();if(S.board&&typeof rpPublish==="function")rpPublish(true);draw();if(ids.length)toast(ids.length+" added")}

/* ---------- manual ---------- */
const v=id=>($("#"+id)||{}).value||"";
function extras(rec,get){const ro=get("ro").trim(),em=get("em").trim(),nt=get("nt").trim(),en=get("en").trim(),er=get("er").trim(),ep=normPh(get("ep"));
  ro?rec.role=ro.slice(0,40):delete rec.role;em?rec.email=em.slice(0,80):delete rec.email;nt?rec.note=nt.slice(0,160):delete rec.note;
  (en||er||ep)?rec.ec={n:en.slice(0,60),r:er.slice(0,30),p:ep||""}:delete rec.ec}
function saveManual(){const fn=v("apdM-fn").trim(),ln=v("apdM-ln").trim();if(!fn&&!ln){toast("Enter a name.");const i=$("#apdM-ln");if(i)i.focus();return}
  const name=(ln&&fn)?ln+", "+fn:(ln||fn);const ph=normPh(v("apdM-ph"));
  const rec=addMarine({rank:v("apdM-rk"),name,sec:v("apdM-sc"),phone:ph||undefined});
  if(!rec){st.msg=`That name is already on the roster. Not added twice.`;draw();return}
  extras(rec,k=>v("apdM-"+k));save();if(S.board&&typeof rpPublish==="function")rpPublish(true);
  st.added.unshift(rec.id);st.msg=`✓ Added <b>${esc(rec.rank+" "+rec.name)}</b> to ${esc(rec.sec)}. Type the next one.`;
  const keepSec=rec.sec,keepRk=rec.rank;draw();const s=$("#apdM-sc"),r=$("#apdM-rk");if(s)s.value=keepSec;if(r)r.value=keepRk;const f=$("#apdM-fn");if(f)f.focus()}

/* ---------- events ---------- */
document.addEventListener("click",e=>{const t=e.target;if(!t.closest||!t.closest("#apdRoot"))return;
  const tab=t.closest("[data-apd-tab]");if(tab){st.tab=tab.dataset.apdTab;st.msg="";draw();return}
  if(t.closest("#apdDone")){closeSheet();render();return}
  if(t.closest("#apdSave")){saveManual();return}
  if(t.closest("#apdTpl")){try{const b=new Blob([window.rosterTemplate()],{type:"text/csv"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="roster-template.csv";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},3000)}catch(x){toast("Couldn't make the sample file.")}return}
  if(t.closest("#apdPasteT")){st.paste=!st.paste;draw();return}
  if(t.closest("#apdPasteGo")){const txt=v("apdPaste");const before=new Set(S.roster.map(m=>m.id));
    Promise.resolve().then(()=>window.rosterPaste(txt)).then(()=>{const ids=newOnes(before);st.last=ids;st.added=ids.concat(st.added);st.msg=ids.length?`✓ <b>${ids.length}</b> added.`:"No new people found in that text.";st.paste=false;save();draw()}).catch(x=>{st.msg=`<span class="warnt">${esc(x.message||x)}</span>`;draw()});return}
  if(t.closest("#apdUndo")){const ids=new Set(st.last);S.roster=S.roster.filter(m=>!ids.has(m.id));st.added=st.added.filter(x=>!ids.has(x));st.msg=`Undid the import: ${ids.size} removed.`;st.last=[];save();if(S.board&&typeof rpPublish==="function")rpPublish(true);draw();return}
  const op=t.closest("[data-apd-open]");if(op){st.open=st.open===op.dataset.apdOpen?"":op.dataset.apdOpen;draw();return}
  const sv=t.closest("[data-apd-save]");if(sv){const m=byId(sv.dataset.apdSave);if(!m)return;m.rank=v("apdE-rk")||m.rank;m.sec=v("apdE-sc")||m.sec;const ph=normPh(v("apdE-ph"));ph?m.phone=ph:delete m.phone;
    extras(m,k=>v("apdE-"+k));st.open="";st.msg=`✓ Saved <b>${esc(m.rank+" "+m.name)}</b>.`;save();if(S.board&&typeof rpPublish==="function")rpPublish(true);draw();return}
  const rm=t.closest("[data-apd-rm]");if(rm){const id=rm.dataset.apdRm;if(rm.dataset.sure!=="1"){rm.dataset.sure="1";rm.textContent="Tap again to remove";return}
    S.roster=S.roster.filter(m=>m.id!==id);st.added=st.added.filter(x=>x!==id);st.last=st.last.filter(x=>x!==id);st.open="";st.msg="Removed.";save();draw();return}});
document.addEventListener("change",e=>{const t=e.target;if(t.id==="apdFile"||t.id==="apdCam"){const fs=[...t.files];t.value="";ingest(fs)}});
document.addEventListener("dragover",e=>{if(e.target.closest&&e.target.closest("#apdDrop")){e.preventDefault();e.target.closest("#apdDrop").classList.add("over")}});
document.addEventListener("dragleave",e=>{const d=e.target.closest&&e.target.closest("#apdDrop");if(d)d.classList.remove("over")});
document.addEventListener("drop",e=>{const d=e.target.closest&&e.target.closest("#apdDrop");if(!d)return;e.preventDefault();d.classList.remove("over");ingest(e.dataTransfer&&e.dataTransfer.files)});

/* ---------- entry points: say "people", and put the drop first on a team with no roster ---------- */
{const _p=renderPeople;renderPeople=function(){const r=_p.apply(this,arguments);try{const b=document.querySelector('#main [data-addm]');if(b){b.textContent="＋ Add people";b.classList.remove("alt")}
  const empty=!S.roster.length||S.source==="sample";const m=$("#main");
  if(m&&canEdit()&&!memberMode()&&empty&&!m.querySelector(".apd-first")){m.querySelectorAll(".banner").forEach(x=>{if(/sample/i.test(x.textContent))x.remove()});m.querySelectorAll("button.btn[data-addm]").forEach(x=>x.remove());m.insertAdjacentHTML("afterbegin",`<button type="button" class="apd-first" data-addm=""><span class="apd-ic">⬆</span><span><b>Drop a roster to get started</b><small>Excel, CSV, PDF, Word or a photo. We read it and add everyone.</small></span></button>`)}}catch(x){}return r}}
if(typeof HELP==="object"&&HELP.people&&Array.isArray(HELP.people[2]))HELP.people[2].push("Add people: tap Add people, then drop a roster file or a photo of a list and everyone is read and added, or switch to Manual to type in one person with every detail. Tap anyone in the Just added list to fix their details in place.");

{const c=document.createElement("style");c.textContent=`.apd-seg{display:flex;background:var(--line);border-radius:12px;padding:3px;margin:0 0 12px}.apd-seg button{all:unset;cursor:pointer;box-sizing:border-box;flex:1;text-align:center;min-height:38px;line-height:38px;border-radius:10px;font-size:14px;font-weight:700;color:var(--ink)}
.apd-seg button[aria-selected="true"]{background:var(--brass);color:var(--on-brass,#fff)}
.apd-drop{display:flex;flex-direction:column;align-items:center;gap:2px;text-align:center;cursor:pointer;border:2px dashed var(--brass);background:var(--brass-soft,#dde8ff);border-radius:16px;padding:20px 14px;color:var(--ink)}.apd-drop.over{background:var(--line)}.apd-drop b{font-size:16px}.apd-drop small{font-size:12.5px;opacity:.75}
.apd-ic{font-size:30px;line-height:1.1;color:var(--brass)}.apd-pick{text-align:center;cursor:pointer;display:block}
.apd-link{all:unset;cursor:pointer;display:block;margin:10px auto 0;font-size:13px;font-weight:700;color:var(--brass);text-decoration:underline;text-underline-offset:3px}
.apd-done{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;font-size:13px}
.apd-lb{font-size:12px;font-weight:700;opacity:.65;margin:12px 0 6px;text-transform:uppercase;letter-spacing:.04em}.apd-lb:first-child{margin-top:0}
.apd-g{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px}.apd-g label{display:block;font-size:12px;margin:0 0 2px;opacity:.7}.apd-g input,.apd-g select{width:100%;box-sizing:border-box}
.apd-out{margin:8px 0 0;min-height:0}.warnt{color:var(--warn)}
.apd-sec{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:14px 0 6px}.apd-list{border:1px solid var(--line);border-radius:14px;overflow:hidden}
.apd-row+.apd-row{border-top:1px solid var(--line)}.apd-hd{all:unset;cursor:pointer;box-sizing:border-box;width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;min-height:56px}
.apd-av{width:36px;height:36px;border-radius:50%;background:var(--brass-soft,#dde8ff);color:var(--brass);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex:none}.apd-av.warn{background:#fdecc8;color:#7a4b00}
.apd-nm{flex:1;min-width:0;display:flex;flex-direction:column}.apd-nm b{font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.apd-nm small{font-size:12px;opacity:.7}
.apd-bd{font-size:12px;font-weight:700;padding:3px 9px;border-radius:8px;white-space:nowrap}.apd-bd.ok{background:#dff3e4;color:#14612b}.apd-bd.warn{background:#fdecc8;color:#7a4b00}
.apd-ed{padding:0 12px 12px;background:var(--card,transparent)}#sheetOpts .apd-hd,#sheetOpts .apd-link,#sheetOpts .apd-seg button{background:transparent!important;border:0!important;box-shadow:none!important;border-radius:0;width:auto;max-width:100%}#sheetOpts .apd-hd{width:100%;border-radius:0}#sheetOpts .apd-seg button{flex:1;border-radius:10px}#sheetOpts .apd-seg button[aria-selected="true"]{background:var(--brass)!important;color:var(--on-brass,#fff)}
#sheetOpts .apd-row+.apd-row{border-top:1px solid var(--line)}#sheetOpts .apd-primary{background:var(--brass)!important;color:var(--on-brass,#fff)!important}#sheetOpts .apd-g input,#sheetOpts .apd-g select{margin:0}.apd-row .row2>*,#apdRoot .row2>*{min-height:48px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;margin:0}
.apd-first{all:unset;cursor:pointer;box-sizing:border-box;width:100%;display:flex;align-items:center;gap:12px;margin:10px 0 0;padding:14px;border:2px dashed var(--brass);background:var(--brass-soft,#dde8ff);border-radius:16px;color:var(--ink)}.apd-first b{display:block;font-size:15px}.apd-first small{display:block;font-size:12.5px;opacity:.75}`;document.head.appendChild(c)}
})();
