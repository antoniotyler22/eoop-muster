/* Accounted For: delete a person, and catch doubles.
   1) Every person's card has a Delete button (tap twice). If they had a My page link and a copy of them stays,
      the link moves to the copy, so it keeps working. Otherwise their page comes off the server.
   2) Doubles (same name, any rank or section) get flagged on the card and listed on the People screen. */
(()=>{
const nk=m=>String(m&&m.name||"").toUpperCase().replace(/[^A-Z0-9]+/g," ").trim();
function dupGroups(){const by=new Map();for(const m of S.roster){const k=nk(m);if(!k)continue;if(!by.has(k))by.set(k,[]);by.get(k).push(m)}return [...by.values()].filter(g=>g.length>1)}
function twinsOf(m){const k=nk(m);return k?S.roster.filter(x=>x!==m&&nk(x)===k):[]}
const who=m=>esc(m.rank+" "+m.name)+` <span class="note">· ${esc(m.sec)}${m.phone?" · "+esc(fmtPh(m.phone)):""}${m.pk?" · has My page":""}</span>`;

function delPerson(id){const m=S.roster.find(x=>x.id===id);if(!m)return;
  const keep=twinsOf(m).find(x=>!x.pk)||null;
  if(m.pk&&keep){for(const f of ["pk","pkSig","pkAt","pkSent","uid"])if(m[f]!=null&&keep[f]==null)keep[f]=m[f];}
  else if(m.pk){const pk=m.pk;mpKeys(pk).then(K=>SB.rpc("delete_page",{p_id:K.id,p_wk:K.wk})).catch(()=>{})}
  if(keep){if(!keep.phone&&m.phone)keep.phone=m.phone;if(!keep.phone2&&m.phone2)keep.phone2=m.phone2;if(!keep.email&&m.email)keep.email=m.email}
  for(const r of (S.duty&&S.duty.rosters)||[])for(const d of Object.keys(r.assign||{}))if(r.assign[d]===id){if(keep)r.assign[d]=keep.id;else delete r.assign[d]}
  if(typeof kdDelete==="function")try{kdDelete(id)}catch(e){}  // record the delete before the row goes, so sync carries it and the 60-second window never stays open
  S.roster=S.roster.filter(x=>x.id!==id);armed=null;
  if(typeof logLoad==="function")try{logLoad("Removed people",m.rank+" "+lastOf(m))}catch(e){}
  save();try{if(S.board)rpPublish(true)}catch(e){}
  toast(m.rank+" "+lastOf(m)+" deleted"+(keep&&m.pk?". Their link now opens "+keep.rank+" "+lastOf(keep)+".":""));return keep}

/* the person card: duplicate warning on top, Delete at the bottom */
{const _rp=renderPerson;renderPerson=function(){_rp.apply(this,arguments);const m=S.roster.find(x=>x.id===pid);const main=$("#main");if(!m||!main||!canEdit())return;
  const tw=twinsOf(m);
  if(tw.length){const head=main.querySelector(".sechead");const box=`<div class="panel" id="pdDup" style="border-color:var(--warn)"><b style="color:var(--warn)">Listed ${tw.length+1} times</b><p class="note" style="margin:2px 0 6px">Same name is on the roster more than once. Keep one, delete the extra.</p>
    ${tw.map(x=>`<div class="rtop" style="gap:8px"><div class="who">${who(x)}</div><button class="chip" data-pdopen="${x.id}" style="cursor:pointer">Open</button><button class="chip" data-pddel="${x.id}" style="cursor:pointer;color:var(--warn)">${armed==="pdd"+x.id?"Tap again":"Delete this one"}</button></div>`).join("")}</div>`;
    if(head&&head.nextElementSibling)head.nextElementSibling.insertAdjacentHTML("afterend",box);else main.insertAdjacentHTML("afterbegin",box)}
  main.insertAdjacentHTML("beforeend",`<div class="panel" id="pdBox" style="margin-top:16px"><button class="btn warn" data-pddel="${m.id}" style="width:100%">${armed==="pdd"+m.id?"Tap again: delete "+esc(m.rank+" "+lastOf(m)):"Delete person"}</button>
    <p class="note" style="margin:6px 0 0">${armed==="pdd"+m.id?(m.pk&&!tw.length?"Their My page link stops working.":"Removes them from every list on this phone and your section leaders' boards."):"Removes them from the roster."}</p></div>`)}}

/* People screen: list doubles with one-tap delete */
{const _rpe=renderPeople;renderPeople=function(){_rpe.apply(this,arguments);const main=$("#main");if(!main||!canEdit())return;const G=dupGroups();if(!G.length)return;
  const box=`<div class="panel" id="pdDups" style="border-color:var(--warn);margin-top:12px"><b style="color:var(--warn)">${G.length} ${G.length>1?"people are":"person is"} listed twice</b><p class="note" style="margin:2px 0 6px">Delete the extra copy. A My page link moves to the copy you keep.</p>
    ${G.map(g=>g.map(x=>`<div class="rtop" style="gap:8px"><div class="who">${who(x)}</div><button class="chip" data-pdopen="${x.id}" style="cursor:pointer">Open</button><button class="chip" data-pddel="${x.id}" style="cursor:pointer;color:var(--warn)">${armed==="pdd"+x.id?"Tap again":"Delete"}</button></div>`).join("")).join(`<hr style="border:0;border-top:1px solid var(--line);margin:6px 0">`)}</div>`;
  const s=main.querySelector(".search");const anchor=s?s.parentElement:null;if(anchor)anchor.insertAdjacentHTML("beforebegin",box);else main.insertAdjacentHTML("afterbegin",box)}}

document.addEventListener("click",e=>{const o=e.target.closest("[data-pdopen]");if(o){e.stopImmediatePropagation();openCard(o.dataset.pdopen);return}
  const b=e.target.closest("[data-pddel]");if(!b)return;e.stopImmediatePropagation();if(!canEdit())return typeof denyMsg==="function"?denyMsg():toast("You can't change this board.");
  const id=b.dataset.pddel;const y=window.scrollY;
  if(armed!=="pdd"+id){armed="pdd"+id;render();window.scrollTo(0,y);return}
  const onCard=view==="p"&&pid===id;const keep=delPerson(id);
  if(onCard){if(keep)openCard(keep.id);else{view=pBack&&pBack!=="p"?pBack:"people";render();window.scrollTo(0,0)}}else{render();window.scrollTo(0,y)}
  if(typeof renderTabs==="function")renderTabs()},true);

window.pdDupGroups=dupGroups;
if(typeof HELP==="object"&&HELP.people&&Array.isArray(HELP.people[2]))HELP.people[2].push("Delete person: open their card, scroll down, tap Delete person twice. Doubles show at the top of People.");
})();
