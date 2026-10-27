/* Accounted For 1.7: Add people from Contacts.
   iPhone/Android app: reads the phone's contacts (after the person allows it) and shows a list to tick.
   Web: uses the browser's contact picker where there is one (Android Chrome), otherwise takes a contact
   card file (.vcf), which iPhone Contacts can share for a whole list. Names, mobile numbers and emails
   are added to the roster in the group you pick. Nothing is uploaded. */
(()=>{
let pick={all:[],sel:new Set(),q:"",sec:"",msg:""};
const plugin=()=>typeof NP==="function"?NP("Contacts"):null;
const can=()=>!!(plugin()||(navigator.contacts&&navigator.contacts.select));
function nameOf(given,family,display){given=String(given||"").trim();family=String(family||"").trim();
  if(family&&given)return family+", "+given;return (display||given||family||"").trim()}
const firstPh=a=>{for(const p of a||[]){const n=typeof normPh==="function"?normPh(p):String(p||"").replace(/\D/g,"");if(n)return n}return ""};
/* vCard: FN, N, TEL, EMAIL (folded lines joined) */
function parseVCF(text){const out=[];const lines=String(text||"").replace(/\r\n[ \t]/g,"").replace(/\n[ \t]/g,"").split(/\r?\n/);let c=null;
  const val=l=>l.slice(l.indexOf(":")+1).replace(/\\,/g,",").replace(/\\;/g,";").replace(/\\n/gi," ").trim();
  for(const l of lines){const u=l.toUpperCase();
    if(u.startsWith("BEGIN:VCARD")){c={fn:"",g:"",f:"",ph:[],em:[]};continue}
    if(!c)continue;
    if(u.startsWith("END:VCARD")){const n=nameOf(c.g,c.f,c.fn);if(n)out.push({n,ph:firstPh(c.ph),em:c.em[0]||""});c=null;continue}
    if(/^(ITEM\d+\.)?FN[;:]/.test(u))c.fn=val(l);
    else if(/^(ITEM\d+\.)?N[;:]/.test(u)){const p=val(l).split(";");c.f=p[0]||"";c.g=p[1]||""}
    else if(/^(ITEM\d+\.)?TEL[;:]/.test(u))c.ph.push(val(l));
    else if(/^(ITEM\d+\.)?EMAIL[;:]/.test(u))c.em.push(val(l))}
  return out}
async function fromPhone(){const P=plugin();
  try{const p=await P.requestPermissions();const st=p&&(p.contacts||p.readContacts||p.display);if(st&&st!=="granted"&&st!=="limited"){toast("Contacts access is off. Turn it on in Settings → Accounted For → Contacts.");return null}}catch(e){}
  const r=await P.getContacts({projection:{name:true,phones:true,emails:true}});
  return (r&&r.contacts||[]).map(c=>{const nm=c.name||{};return {n:nameOf(nm.given,nm.family,nm.display),ph:firstPh((c.phones||[]).map(x=>x.number)),em:((c.emails||[])[0]||{}).address||""}}).filter(x=>x.n)}
async function fromBrowser(){const r=await navigator.contacts.select(["name","tel","email"],{multiple:true});
  return (r||[]).map(c=>{const full=String((c.name||[])[0]||"").trim();const parts=full.split(/\s+/);
    return {n:parts.length>1?nameOf(parts.slice(0,-1).join(" "),parts[parts.length-1],full):full,ph:firstPh(c.tel),em:(c.email||[])[0]||""}}).filter(x=>x.n)}
async function start(){if(!canEdit())return denyMsg();
  try{let L=null;if(plugin())L=await fromPhone();else if(navigator.contacts&&navigator.contacts.select)L=await fromBrowser();else{fileAsk();return}
    if(!L)return;if(!L.length){toast("No contacts picked.");return}
    const have=new Set(S.roster.map(m=>String(m.name).toUpperCase()));
    pick={all:L.sort((a,b)=>a.n.localeCompare(b.n)),sel:new Set(plugin()?[]:L.map((_,i)=>i).filter(i=>!have.has(L[i].n.toUpperCase()))),q:"",sec:pick.sec||SECTIONS[0][0],msg:""};sheet()}
  catch(e){if(e&&e.name==="AbortError")return;toast("Couldn't open Contacts here. Try a contact card file instead.");fileAsk()}}
function fileAsk(){let f=$("#ctFile");if(!f){document.body.insertAdjacentHTML("beforeend",`<input type="file" id="ctFile" accept=".vcf,text/vcard,text/x-vcard" hidden>`);f=$("#ctFile")}
  f.value="";f.click()}
document.addEventListener("change",async e=>{if(e.target.id!=="ctFile")return;const f=e.target.files&&e.target.files[0];if(!f)return;
  const L=parseVCF(await f.text());if(!L.length){toast("No contacts found in that file.");return}
  const have=new Set(S.roster.map(m=>String(m.name).toUpperCase()));
  pick={all:L.sort((a,b)=>a.n.localeCompare(b.n)),sel:new Set(L.map((_,i)=>i).filter(i=>!have.has(L[i].n.toUpperCase()))),q:"",sec:pick.sec||SECTIONS[0][0],msg:""};sheet()});

function listHTML(){const q=pick.q.toLowerCase();const have=new Set(S.roster.map(m=>String(m.name).toUpperCase()));
  const rows=pick.all.map((c,i)=>({c,i})).filter(({c})=>!q||(c.n+" "+c.ph+" "+c.em).toLowerCase().includes(q)).slice(0,400);
  return rows.map(({c,i})=>{const dup=have.has(c.n.toUpperCase());return `<label class="tog ct-row" style="display:flex;gap:10px;align-items:center;padding:8px 2px;border-bottom:1px solid var(--line)">
    <input type="checkbox" data-ctsel="${i}"${pick.sel.has(i)?" checked":""}${dup?" disabled":""}>
    <span style="flex:1;min-width:0"><b>${esc(c.n)}</b><span class="note" style="display:block;margin:0">${esc([c.ph?fmtPh(c.ph):"",c.em].filter(Boolean).join(" · ")||"No number")}${dup?" · already on your roster":""}</span></span></label>`}).join("")||`<p class="note">No matches.</p>`}
const fmtPh=p=>p.length===10?"("+p.slice(0,3)+") "+p.slice(3,6)+"-"+p.slice(6):p;
function sheet(){sheetCtx={kind:"contacts"};const n=pick.sel.size;
  $("#sheetT").innerHTML=`Add from Contacts<small>${pick.all.length} contact${pick.all.length===1?"":"s"}</small>`;
  $("#sheetOpts").innerHTML=`<div data-noxl><label for="ctQ" style="display:block">Search</label><input id="ctQ" type="text" style="width:100%;box-sizing:border-box" value="${esc(pick.q)}" autocomplete="off" placeholder="Name, number or email">
    <div class="row2" style="margin:6px 0"><button class="btn alt" id="ctAll">Select all shown</button><button class="btn alt" id="ctNone">Clear</button></div>
    <div id="ctList" style="max-height:46vh;overflow:auto;-webkit-overflow-scrolling:touch">${listHTML()}</div>
    <label for="ctSec">Add them to</label><select id="ctSec" style="width:100%">${SECTIONS.filter(s=>s[0]!=="ATT").map(s=>`<option value="${esc(s[0])}"${s[0]===pick.sec?" selected":""}>${esc(s[1]||s[0])}</option>`).join("")}</select>
    <button class="btn" id="ctAdd"${n?"":" disabled"}>Add ${n} ${n===1?"person":"people"}</button><div class="note" role="status">${esc(pick.msg)}</div></div>`;
  const sh=$("#sheet");if(sh.hidden){if(typeof sheetFocus==="function")sheetFocus();sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add("open")))}}
function refreshList(){const l=$("#ctList");if(l)l.innerHTML=listHTML();const b=$("#ctAdd");const n=pick.sel.size;if(b){b.disabled=!n;b.textContent="Add "+n+" "+(n===1?"person":"people")}}
function addPicked(){const sec=($("#ctSec")||{}).value||SECTIONS[0][0];pick.sec=sec;let n=0;
  for(const i of [...pick.sel].sort((a,b)=>a-b)){const c=pick.all[i];if(!c)continue;const r=addMarine({name:c.n,sec,phone:c.ph});if(r){if(c.em)r.email=c.em.slice(0,80);n++}}
  save();closeSheet();render();actAdd("📇","Added "+n+" from Contacts.","people");toast(n?"Added "+n+" "+(n===1?"person":"people")+". Next: Invite them, or start a check-in.":"They're already on your roster.")}
document.addEventListener("input",e=>{if(e.target.id==="ctQ"){pick.q=e.target.value;refreshList()}});
document.addEventListener("change",e=>{const c=e.target.closest&&e.target.closest("[data-ctsel]");if(c){const i=+c.dataset.ctsel;c.checked?pick.sel.add(i):pick.sel.delete(i);refreshList()}
  else if(e.target.id==="ctSec")pick.sec=e.target.value});
document.addEventListener("click",e=>{if(!e.target.closest)return;const t=e.target;
  if(t.closest("[data-ctstart]")){e.stopImmediatePropagation();start();return}
  if(t.closest("#ctAll")){const q=pick.q.toLowerCase();const have=new Set(S.roster.map(m=>String(m.name).toUpperCase()));pick.all.forEach((c,i)=>{if((!q||(c.n+" "+c.ph+" "+c.em).toLowerCase().includes(q))&&!have.has(c.n.toUpperCase()))pick.sel.add(i)});refreshList();return}
  if(t.closest("#ctNone")){pick.sel.clear();refreshList();return}
  if(t.closest("#ctAdd")){addPicked();return}},true);

/* buttons: the "Add your people" card and the Add sheet */
const btn=cls=>`<button class="btn${cls||""}" data-ctstart="1" style="width:100%">From Contacts</button>`;
{const _rb=renderBoard;renderBoard=function(){_rb.apply(this,arguments);const card=$("#sgAdd");if(card&&!card.querySelector("[data-ctstart]")){const r=card.querySelector(".row2");if(r)r.insertAdjacentHTML("beforebegin",btn(""))}}}
{const _as=addSheet;addSheet=function(){_as.apply(this,arguments);const o=$("#sheetOpts");if(o&&!o.querySelector("[data-ctstart]"))o.insertAdjacentHTML("afterbegin",`<div style="margin-bottom:8px">${btn(" alt")}<p class="note" style="margin:4px 0 0">${can()?"Pick people from your phone's contacts.":"iPhone: in Contacts, share a list as a contact card file, then pick it here."}</p></div>`)}}
if(typeof HELP==="object"&&HELP.people&&Array.isArray(HELP.people[2]))HELP.people[2]=HELP.people[2].concat(["From Contacts: tick people from your phone's contacts and pick their group. Their mobile number and email come along."]);
window.parseVCF=parseVCF;
/* last 1.7 file: draw once more so the header, tiles and screens above show on first open */
if(typeof render==="function")try{render()}catch(e){}
})();
