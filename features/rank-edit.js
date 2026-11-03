/* Accounted For 4.77.16: change a person's rank when they are promoted.
   The person card has a Rank box above the status pickers. Pick the new rank and it saves at once: the roster re-sorts,
   greetings use the new rank, and section leaders' boards get it like any other roster edit. View-only phones can't change it. */
(()=>{
const find=()=>S.roster.find(x=>x.id===pid);
{const _rp=renderPerson;renderPerson=function(){_rp.apply(this,arguments);const m=find();const main=$("#main");if(!m||!main||!canEdit())return;
  const pick=main.querySelector(".pick");const panel=pick&&pick.parentElement;if(!panel)return;
  const list=RANKS.includes(m.rank)||!m.rank?RANKS:[m.rank].concat(RANKS);
  panel.insertAdjacentHTML("afterbegin",`<div class="row2" id="rkBox" style="align-items:center;margin-bottom:8px"><label for="rkSel" style="margin:0"><b>Rank</b></label><select id="rkSel" class="wsel" aria-label="Rank">${list.map(r=>`<option${r===m.rank?" selected":""}>${esc(r)}</option>`).join("")}</select></div>`)}}
document.addEventListener("change",e=>{const s=e.target.closest&&e.target.closest("#rkSel");if(!s)return;e.stopImmediatePropagation();
  if(!canEdit()){denyMsg();renderPerson();return}
  const m=find();if(!m)return;const old=m.rank;const nu=s.value;if(!nu||nu===old)return;
  m.rank=nu;save();try{if(S.board)rpPublish(true)}catch(x){}
  const y=window.scrollY;renderPerson();window.scrollTo(0,y);if(typeof renderTabs==="function")renderTabs();
  toast((old?old+" → ":"")+nu+" · "+lastOf(m)+" rank updated")},true);
if(typeof HELP==="object"&&HELP.people&&Array.isArray(HELP.people[2]))HELP.people[2].push("Promotion: open their card and pick the new Rank at the top.");
})();
