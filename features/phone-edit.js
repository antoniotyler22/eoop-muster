/* Accounted For 4.77.16: fix or remove a wrong phone number.
   A person's card now has Edit number and Remove number (tap twice) for the main number, and the same for the alt number.
   Removing the main number moves the alt number up. Saving an empty box is refused (use Remove). The change goes to
   section leaders' boards like any other roster edit. View-only phones can't change numbers. */
(()=>{
const find=()=>S.roster.find(x=>x.id===pid);
const chip=(attrs,label,warn)=>`<button class="chip" ${attrs} style="cursor:pointer${warn?";color:var(--warn)":""}">${label}</button>`;
function after(){save();try{if(S.board)rpPublish(true)}catch(e){}}

/* the card: Edit / Remove under the Call and Text buttons */
{const _rp=renderPerson;renderPerson=function(){_rp.apply(this,arguments);const m=find();const main=$("#main");if(!m||!main||!canEdit())return;
  const pick=main.querySelector(".pick");const panel=pick&&pick.parentElement;if(!panel)return;
  let h="";
  if(m.phone){
    h+=`<div class="rtop" id="pxMain" style="gap:8px;margin-top:6px"><div class="note" style="flex:1;margin:0">Number ${esc(fmtPh(m.phone))}</div>${chip(`data-pxedit="ph"`,"Edit number")}${chip(`data-pxrm="ph"`,armed==="pxrm"+m.id?"Tap again: remove":"Remove number",true)}</div>`;
  }
  if(m.phone2){
    h+=`<div class="rtop" id="pxAlt" style="gap:8px;margin-top:6px"><div class="note" style="flex:1;margin:0">Alt ${esc(fmtPh(m.phone2))}</div>${chip(`data-pxedit="ph2"`,"Edit alt")}${chip(`data-pxrm="ph2"`,armed==="pxrm2"+m.id?"Tap again: remove":"Remove alt",true)}</div>`;
  }else if(m.phone){
    h+=`<div class="rtop" style="margin-top:6px">${chip(`data-pxedit="ph2"`,"+ Add alt number")}</div>`;
  }
  if(pEdit==="ph"&&m.phone)h+=`<div class="rtop" style="margin-top:6px">${chip(`data-pxcancel="1"`,"Cancel")}</div>`;
  if(pEdit==="ph2")h+=`<div class="addph" id="pxAddAlt"><input type="tel" id="pPh2" placeholder="808 555 0100" inputmode="tel" value="${esc(fmtPh(m.phone2||""))}"><button data-pxsave="ph2">Save</button></div><div class="rtop" style="margin-top:6px">${chip(`data-pxcancel="1"`,"Cancel")}</div>`;
  const edit=panel.querySelector(".addph");
  if(edit&&edit.id!=="pxAddAlt"){edit.insertAdjacentHTML("beforebegin",h)}else panel.insertAdjacentHTML("beforeend",h)}}

function savePh(field){const m=find();if(!m)return;const inp=$(field==="ph2"?"#pPh2":"#pPh");const raw=String(inp&&inp.value||"").trim();
  if(!raw){toast("Enter a 10-digit number, or tap Remove number.");return}
  const d=normPh(raw);if(!d){toast("That isn't a 10-digit number. Check it and try again.");return}
  if(field==="ph"){if(m.phone2===d){toast("That's already their alt number.");return}m.phone=d}
  else{if(m.phone===d){toast("That's already their main number.");return}m.phone2=d}
  pEdit=null;armed=null;after();renderPerson();toast("Number saved")}

function removePh(field){const m=find();if(!m)return;let msg;
  if(field==="ph"){if(m.phone2){m.phone=m.phone2;delete m.phone2;msg="Number removed. Their alt number is now the main number."}else{delete m.phone;msg="Number removed."}}
  else{delete m.phone2;msg="Alt number removed."}
  pEdit=null;armed=null;after();render();toast(msg);if(typeof renderTabs==="function")renderTabs()}

document.addEventListener("click",e=>{
  const ed=e.target.closest("[data-pxedit]");if(ed){e.stopImmediatePropagation();if(!canEdit())return denyMsg();pEdit=ed.dataset.pxedit;armed=null;const y=window.scrollY;renderPerson();window.scrollTo(0,y);const i=$(pEdit==="ph2"?"#pPh2":"#pPh");if(i){i.focus();try{i.select()}catch(x){}}return}
  const cn=e.target.closest("[data-pxcancel]");if(cn){e.stopImmediatePropagation();pEdit=null;renderPerson();return}
  const sv=e.target.closest("[data-pxsave]");if(sv){e.stopImmediatePropagation();if(!canEdit())return denyMsg();savePh(sv.dataset.pxsave);return}
  const ps=e.target.closest("[data-psave]");if(ps&&ps.dataset.psave==="ph"){e.stopImmediatePropagation();if(!canEdit())return denyMsg();savePh("ph");return}
  const rm=e.target.closest("[data-pxrm]");if(rm){e.stopImmediatePropagation();if(!canEdit())return denyMsg();const m=find();if(!m)return;const f=rm.dataset.pxrm;const key=(f==="ph2"?"pxrm2":"pxrm")+m.id;
    if(armed!==key){armed=key;const y=window.scrollY;renderPerson();window.scrollTo(0,y);return}
    removePh(f)}},true);

if(typeof HELP==="object"&&HELP.people&&Array.isArray(HELP.people[2]))HELP.people[2].push("Wrong number: open their card, tap Edit number to fix it or Remove number (tap twice) to clear it.");
})();
