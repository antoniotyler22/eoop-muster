/* Accounted For 4.77.17: every event is a Go / No-Go roster.
   Tap a person's name to cycle GO, then NO-GO, then cleared. NO-GO takes a reason: Medical, Duty, Leave, Appointment, Other.
   A name shows red when that person has a conflict on the event date. The event shows GO / NO-GO / not marked counts, and the
   Text and Copy lists read GO, NO-GO with reasons, and NOT MARKED. GO is the same mark as "attended" was, so older events and the
   Excel export keep working; the export adds Go/No-Go and Reason columns. */
(()=>{
const REASONS=["Medical","Duty","Leave","Appointment","Other"];
const cur=()=>evOpen&&S.events.find(e=>e.id===evOpen);
const ng=(ev,m)=>{const v=(ev.nogo||{})[nkey(m)];return v===undefined?null:v};
const state=(ev,m)=>evDone(ev,m)?"go":ng(ev,m)!==null?"no":"";
function setState(ev,m,st,reason){ev.done=ev.done||{};ev.nogo=ev.nogo||{};const k=nkey(m);
  delete ev.done[k];delete ev.nogo[k];
  if(st==="go")ev.done[k]=1;else if(st==="no")ev.nogo[k]=reason||""}
function tally(ev){const req=evReq(ev);let go=0,no=0;for(const m of req){const s=state(ev,m);if(s==="go")go++;else if(s==="no")no++}return {go,no,left:req.length-go-no,n:req.length}}

/* the Text / Copy list */
evText=function(ev){const req=sorted(evReq(ev));const t=tally(ev);
  const d=parseD(ev.date);const L=[(ev.name||"EVENT").toUpperCase()+(d?" "+short(d)+" "+String(d.getFullYear()).slice(2):"")+(ev.type?" ("+ev.type.toUpperCase()+")":"")+" GO/NO-GO"];
  L.push("GO "+t.go+" · NO-GO "+t.no+" · NOT MARKED "+t.left+" · REQUIRED "+t.n);
  const line=(m,x)=>"- "+(m.sec==="ATT"?"ATT":m.sec)+" "+m.rank+" "+m.name.split(",")[0]+x;
  const no=req.filter(m=>state(ev,m)==="no"),left=req.filter(m=>!state(ev,m));
  if(no.length){L.push("");L.push("NO-GO ("+no.length+")");no.forEach(m=>L.push(line(m,ng(ev,m)?" - "+ng(ev,m):"")))}
  if(left.length){L.push("");L.push("NOT MARKED ("+left.length+")");left.forEach(m=>L.push(line(m," ("+SHORT[m.status]+")")))}
  return L.join("\n")};

function rowHTML(ev,m,cf){const s=state(ev,m),k=esc(nkey(m));
  const red=cf&&cf.length;const why=red?cf.map(x=>x.why).join(" · "):"";
  const tag=s==="go"?`<b style="color:var(--s-onhand)">GO</b>`:s==="no"?`<b style="color:var(--warn)">NO-GO</b>`:`<span class="note">tap</span>`;
  return `<div class="mrow gng" data-gk="${k}" style="display:block;padding:0"><button type="button" data-gng="1" data-gk="${k}" aria-pressed="${s!==""}" ${why?`title="${esc(why)}" `:""}style="display:flex;align-items:center;gap:8px;width:100%;padding:10px 0;background:none;border:0;text-align:left;cursor:pointer;font:inherit;color:inherit"><span class="nm2" style="flex:1;min-width:0;${red?"color:var(--warn);":""}"><b>${esc(m.rank)}</b> ${esc(m.name)} <span class="note">${esc(SHORT[m.status])}</span></span>${tag}</button>
    ${s==="no"?`<select class="wsel" data-gnr="${k}" aria-label="Reason" style="margin:0 0 8px;width:100%"><option value="">Reason…</option>${REASONS.map(r=>`<option${ng(ev,m)===r?" selected":""}>${r}</option>`).join("")}</select>`:""}</div>`}

{const _re=renderEvents;renderEvents=function(){_re.apply(this,arguments);const main=$("#main");if(!main)return;const ev=cur();
  if(!ev){ /* list of events + new-event form */
    main.querySelectorAll("[data-evopen]").forEach(b=>{const e=S.events.find(x=>x.id===b.dataset.evopen);if(!e)return;const t=tally(e);const note=b.querySelector(".note");
      if(note)note.textContent=(e.type||"")+(e.date?(e.type?" · ":"")+e.date:"")+" · GO "+t.go+" · NO-GO "+t.no+" · "+t.left+" not marked";
      const p=b.querySelector(".p");if(p)p.innerHTML=t.go+"/"+t.n+"<small>go</small>"});
    const h=main.querySelector(".ahead h2");if(h)h.textContent="Events · Go / No-Go";
    const nt=[...main.querySelectorAll("p.note")].find(x=>/No events yet/.test(x.textContent));if(nt)nt.textContent="No events yet. Create one for a range day, MCMAP, a required class or a working party, then mark each person GO or NO-GO.";
    return}
  const t=tally(ev);
  const ct=main.querySelector(".mbar .ct");if(ct)ct.innerHTML=t.go+"/"+t.n+"<small>go</small>";
  const bar=main.querySelector(".mbar");
  if(bar)bar.insertAdjacentHTML("afterend",`<div class="note" id="gngSum" style="margin:6px 0"><b style="color:var(--s-onhand)">GO ${t.go}</b> · <b style="color:var(--warn)">NO-GO ${t.no}</b> · Not marked ${t.left}</div>`);
  const own=main.querySelector("label.tog input#evOnly");if(own)own.parentElement.lastChild.textContent=" Show only people not yet GO";
  /* no separate conflicts panel: a conflict just turns the name red */
  [...main.querySelectorAll(".panel")].filter(x=>/Conflicts on/.test(x.textContent)).forEach(x=>x.remove());
  [...main.querySelectorAll("p.note")].filter(x=>/No conflicts on the event date/.test(x.textContent)).forEach(x=>x.remove());
  const d=isoOf(ev.date)||ev.date;const dated=/^\d{4}-\d{2}-\d{2}$/.test(d||"")&&d>=dkey();
  main.querySelectorAll("a.btn").forEach(x=>{if(/^Text owe list$/.test(x.textContent.trim()))x.textContent="Text Go/No-Go list"});
  /* rows */
  main.querySelectorAll("button.mrow[data-evtog]").forEach(b=>{const k=b.dataset.evtog;const m=evReq(ev).find(x=>nkey(x)===k);if(m)b.outerHTML=rowHTML(ev,m,dated?busyOn(m,d,{event:ev.id,tm:ev.tm||""}):[])});
  main.querySelectorAll("button[data-evall]").forEach(b=>{b.textContent="All "+b.dataset.evall+" GO"});
  /* group counts: GO/total */
  main.querySelectorAll(".mgrp h3 > span").forEach(sp=>{const k=(sp.textContent.match(/^([A-Z0-9]+) ·/)||[])[1];if(!k)return;const ms=evReq(ev).filter(m=>m.sec===k);sp.textContent=k+" · GO "+ms.filter(m=>state(ev,m)==="go").length+"/"+ms.length})}}

document.addEventListener("click",e=>{
  const b=e.target.closest("[data-gng]");if(b){e.stopImmediatePropagation();if(!canEdit())return denyMsg();const ev=cur();if(!ev)return;const m=evReq(ev).find(x=>nkey(x)===b.dataset.gk);if(!m)return;
    const s0=state(ev,m);setState(ev,m,s0===""?"go":s0==="go"?"no":"","");save();const y=window.scrollY;renderEvents();window.scrollTo(0,y);return}
  const a=e.target.closest("[data-evall]");if(a){e.stopImmediatePropagation();if(!canEdit())return denyMsg();const ev=cur();if(!ev)return;evReq(ev).filter(m=>m.sec===a.dataset.evall).forEach(m=>{if(state(ev,m)!=="no")setState(ev,m,"go")});save();const y=window.scrollY;renderEvents();window.scrollTo(0,y);return}
},true);
document.addEventListener("change",e=>{const s=e.target.closest&&e.target.closest("[data-gnr]");if(!s)return;e.stopImmediatePropagation();if(!canEdit())return denyMsg();
  const ev=cur();if(!ev)return;const m=evReq(ev).find(x=>nkey(x)===s.dataset.gnr);if(!m)return;setState(ev,m,"no",s.value);save()},true);

if(typeof HELP==="object"){HELP.events=HELP.events||["Events","Go / No-Go roster for any event.",[]];if(Array.isArray(HELP.events[2]))HELP.events[2].push("Tap GO or NO-GO for each person. NO-GO takes a reason. Text or Copy sends GO, NO-GO and not marked.")}
})();
