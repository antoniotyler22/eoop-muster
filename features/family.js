/* Accounted For 1.8 — School version and family "safe" notices.
   School template: grades as groups, Students / Present / Absent words (custom version, renameable).
   Family notices: during a check-in, once students are accounted for, one tap tells each family their child is safe,
   with the time and an optional pickup place. With Pro server texting, each family gets their own text naming their
   child (siblings share one text) and nobody sees other numbers. Without it, the phone opens group texts of 20 with a
   general "your child is accounted for" message, sent only to families of children already accounted for.
   The family number is each person's alt phone (imports read Parent / Guardian phone columns into it), or their phone.
   On for the School, Field trip and Youth team templates; anyone else can turn it on from the check-in screen. */
(()=>{
const BATCH=20;
/* ---------- School template (joins the one-tap templates on the welcome screen) ---------- */
if(window.SG_TPL&&!SG_TPL.school){const school={n:"School",ic:"🏫",d:"Classes, roll call, drills, families",m:"custom",
    v:{pt:"Recess / PE",p:"Student",ps:"Students",here:"Present",aob:"Nurse / office",aoff:"Picked up early",cod:"Pulled out",op:"Field trip",tad:"Absent",lv:"Excused",mus:"Roll call",attPl:"Staff",eo:"SCHOOL"},
    secs:[["K","Kindergarten"],["G1","Grade 1"],["G2","Grade 2"],["G3","Grade 3"],["G4","Grade 4"],["G5","Grade 5"],["STAF","Staff"]]};
  const all=Object.entries(SG_TPL);for(const [k] of all)delete SG_TPL[k];
  for(const [k,t] of all){SG_TPL[k]=t;if(k==="trip")SG_TPL.school=school}if(!SG_TPL.school)SG_TPL.school=school}
const ON_TPL=["school","trip","youth"];
const famOn=()=>!!S.famOn||ON_TPL.includes(S.tpl);
window.famOn=famOn;
const STAFFISH=/^(staf+|staff|teachers?|coach(es)?|chaperones?|admin|office|faculty|volunteers?|leaders?)$/i;
const fam=()=>{S.rc.fam=S.rc.fam&&typeof S.rc.fam==="object"?S.rc.fam:{};return S.rc.fam};
const digits10=p=>{const d=String(p||"").replace(/\D/g,"");return d.length===11&&d[0]==="1"?d.slice(1):d};
const famPh=m=>{const a=digits10(m.phone2),b=digits10(m.phone);return a.length===10?a:b.length===10?b:""};
function secsOn(){const all=SECTIONS.map(s=>s[0]);let on=S.famSecs;if(!Array.isArray(on)||!on.length)on=SECTIONS.filter(s=>!STAFFISH.test(String(s[1]).trim())&&!STAFFISH.test(s[0])).map(s=>s[0]);return on.filter(k=>all.includes(k))}
/* children accounted for, with a family number, in the chosen groups */
function ready(){const res=S.rc.res||{},ci=S.rc.ci||{},on=new Set(secsOn());
  return recallPool().filter(m=>on.has(m.sec)&&res[m.id]==="ok"&&!(ci[m.id]&&ci[m.id].c===3)&&famPh(m))}
const title=w=>w.charAt(0)+w.slice(1).toLowerCase();
/* "SMITH, ANA M" -> "Ana S." (letters only: the server checks it too) */
function shortName(m){const [last,rest]=String(m.name||"").split(",");const first=(rest||"").trim().split(/\s+/)[0]||"";const L=(last||"").replace(/[^A-Za-z]/g,"");const F=first.replace(/[^A-Za-z'-]/g,"");
  if(F)return (title(F)+(L?" "+L.charAt(0).toUpperCase()+".":"")).slice(0,40);return title(L||"Your child").slice(0,40)}
window.famShortName=shortName;
function clock(t){const d=new Date(t||Date.now());let h=d.getHours();const ap=h<12?"AM":"PM";h=h%12||12;return h+":"+String(d.getMinutes()).padStart(2,"0")+" "+ap}
const place=()=>String(S.famPlace||"").replace(/[^A-Za-z0-9 .,\/'&()#-]/g,"").replace(/\s+/g," ").trim().slice(0,40);
const unitW=()=>String(typeof unitName==="function"?unitName():"").replace(/[^A-Za-z0-9 .,\/'&()#-]/g,"").replace(/\s+/g," ").trim().slice(0,30)||"School";
function genText(){return unitW()+": your child is accounted for and safe as of "+clock()+"."+(place()?" Pickup: "+place()+".":"")+" More updates will come by text."}
window.famText=genText;
const canServer=()=>!!(S.smsSrv&&typeof proTok==="function"&&proTok()&&S.rc.open&&S.rc.live&&S.rc.live.ok);
function panelHTML(){const R=ready();const F=fam();const todo=R.filter(m=>!F[m.id]);const sent=R.length-todo.length;
  const on=new Set(secsOn());const noPh=recallPool().filter(m=>on.has(m.sec)&&!famPh(m)).length;
  const groups=[];for(let i=0;i<todo.length;i+=BATCH)groups.push(todo.slice(i,i+BATCH));
  const href=g=>"sms:"+g.map(m=>"+1"+famPh(m)).join(",")+"?&body="+encodeURIComponent(genText());
  return `<details class="panel" id="famPanel"${todo.length?" open":""}><summary><b>👪 Tell families they're safe</b> · ${sent} of ${R.length} told</summary>
    <p class="note">Only families of children marked accounted for get a text${noPh?` · ${noPh} have no family number`:""}. Anyone marked Need help is left out until you clear it.</p>
    <div class="evts" role="group" aria-label="Groups to notify">${SECTIONS.map(([k,n])=>`<button data-famsec="${esc(k)}" aria-pressed="${on.has(k)}">${esc(n)}</button>`).join("")}</div>
    <label for="famPlace">Pickup or reunification spot (optional)</label><input id="famPlace" type="text" maxlength="40" value="${esc(S.famPlace||"")}" placeholder="North gym doors" autocomplete="off">
    <div class="note" style="margin:6px 0">Text: “${esc(canServer()?genText().replace("your child",R[0]?shortName(R[0]):"Ana S."):genText())}”</div>
    ${!todo.length?`<p class="note" style="color:var(--s-onhand);font-weight:700">${R.length?"✓ Every accounted-for family has been told.":"No one to tell yet. Families get a text once their child is marked accounted for."}</p>`
      :canServer()?`<button class="btn" id="famSend">📨 Text ${todo.length} famil${todo.length>1?"ies":"y"} now</button><p class="note">Sent from the server (Pro): each family gets their own text with their child's first name. Numbers aren't kept.</p>`
      :groups.map((g,i)=>`<a class="btn${i?" alt":""}" data-famgrp="${i}" href="${esc(href(g))}">Text families${groups.length>1?" group "+(i+1)+" of "+groups.length:""} (${g.length})</a>`).join("")+`<p class="note">Opens your messages app with up to ${BATCH} families at a time. Tap Send there, then come back for the next group.</p>`}
    ${sent?`<button class="chip" id="famReset" style="cursor:pointer;margin-top:6px">${armed==="famreset"?"Tap again: send to everyone again":"↺ Send again to all"}</button>`:""}</details>`}
function offHTML(){return `<div class="panel"><button class="btn alt" id="famTurnOn" style="width:100%">👪 Turn on family “safe” texts</button><p class="note" style="margin:6px 0 0">For schools, trips and youth teams: tell each family when their child is accounted for.</p></div>`}
function redraw(){if(view==="recall"){const y=window.scrollY;const a=document.activeElement;if(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName))return;render();window.scrollTo(0,y)}}
const _rr=renderRecall;
renderRecall=function(){_rr.apply(this,arguments);if(!S.rc.open)return;const main=$("#main");if(!main)return;const mil=!S.mode||S.mode==="military"||S.mode==="police";
  if(!famOn()&&mil)return;const html=famOn()?panelHTML():offHTML();
  const at=main.querySelector("#vsEm")||main.querySelector("#dlAlarm")||main.querySelector(".mbar");if(at)at.insertAdjacentHTML("afterend",html);else main.insertAdjacentHTML("afterbegin",html)};
async function serverSend(){const R=ready();const F=fam();const todo=R.filter(m=>!F[m.id]);if(!todo.length)return;
  const L=S.rc.live;const fnu=SB.url+"/functions/v1/sms";
  const body={pro:proTok(),recall:S.rc.rid,key:L.key,unit:unitW(),at:clock(),place:place(),family:todo.map(m=>({to:famPh(m),n:shortName(m)}))};
  const r=await fetch(fnu,{method:"POST",headers:{apikey:SB.key,"Content-Type":"application/json"},body:JSON.stringify(body)});const t=await r.text();let j={};try{j=t?JSON.parse(t):{}}catch(e){}
  if(!r.ok)throw new Error(j.error||("HTTP "+r.status));
  const now=Date.now();todo.forEach(m=>F[m.id]=now);S.rc.famAt=now;save();
  if(typeof actAdd==="function")actAdd("👪","Told "+todo.length+" families their child is safe","recall");
  toast(`Texted ${j.sent} famil${j.sent===1?"y":"ies"}`+(j.failed?` · ${j.failed} failed`:""));redraw()}
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;
  if(t.closest("#famTurnOn")){S.famOn=true;save();redraw();return}
  const sc=t.closest("[data-famsec]");if(sc){const k=sc.dataset.famsec;const on=new Set(secsOn());on.has(k)?on.delete(k):on.add(k);S.famSecs=[...on];if(!S.famSecs.length)S.famSecs=[k];save();redraw();return}
  if(t.closest("#famSend")){const b=t.closest("#famSend");b.disabled=true;serverSend().catch(err=>toast(String(err.message||err).slice(0,90))).finally(()=>{b.disabled=false});return}
  const g=t.closest("[data-famgrp]");if(g){const R=ready();const F=fam();const todo=R.filter(m=>!F[m.id]);const grp=todo.slice(+g.dataset.famgrp*BATCH,(+g.dataset.famgrp+1)*BATCH);
    const now=Date.now();grp.forEach(m=>F[m.id]=now);S.rc.famAt=now;save();if(typeof actAdd==="function")actAdd("👪","Texted "+grp.length+" families their child is safe","recall");setTimeout(redraw,400);return}
  if(t.closest("#famReset")){if(armed!=="famreset"){armed="famreset";redraw();setTimeout(()=>{if(armed==="famreset"){armed=null;redraw()}},4000);return}armed=null;S.rc.fam={};save();redraw()}});
document.addEventListener("input",e=>{if(e.target.id==="famPlace"){S.famPlace=e.target.value.slice(0,40);save()}});
/* a new check-in starts with no families told */
document.addEventListener("click",e=>{if(e.target.closest&&e.target.closest("#rcStart"))setTimeout(()=>{S.rc.fam={};S.rc.famAt=0;save()},20)},true);
if(typeof HELP==="object"&&HELP.recall&&Array.isArray(HELP.recall[2]))HELP.recall[2].push("Tell families they're safe (School, Field trip, Youth team): once a child is marked accounted for, text their family with the time and pickup spot. Uses the alt phone (family number) or phone.");
})();
