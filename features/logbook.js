/* Accounted For 4.138.0: Logbook. One place to sign a person OUT or IN, tied to their section and the company.
   Sign OUT = pick where they're going (a real status: Appointment, At PT, Duty Recovery, SIQ, Operation, TAD, Leave or Other),
   a place, and when they'll be back. It sets that person's status, place, dates and note on the roster, so the board, the
   section count, Home, Check-ins, the calendar, the activity feed and every synced phone show it, and it counts as a check-in.
   "Back by" travels in the note ("back 1745") so it syncs too; past that time with no sign-in the person shows LATE.
   Sign IN puts them back On Hand and clears the place. Open it from Home (Logbook card) or My page (Logbook button).
   4.143.0: History. Go back to any earlier day (arrows, a date, or the last 7 days with entries) and filter by person to see who signed out and in.
   Each version names it its own way (mode-words.js: Duty Log, Crew Log, Sign-Out Sheet); the screen and functions are the same. */
(()=>{
const OUTS=["Appointment","At PT","Duty Recovery","SIQ","Operation","TAD","Leave","Other"],MULTI=["SIQ","Operation","TAD","Leave"];
let tab="ALL",mode="out",st="Appointment",who="",v={place:"",back:"",to:"",oth:""};
const real=()=>S.source!=="sample"&&Array.isArray(S.roster)&&S.roster.length>0;
const mem=()=>typeof memberMode==="function"&&memberMode();
const LOG=()=>{S.lb=S.lb&&typeof S.lb==="object"?S.lb:{};if(!Array.isArray(S.lb.log))S.lb.log=[];return S.lb.log};
const hhmm=t=>{const d=new Date(t);return String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0")};
const day0=()=>{const d=new Date();d.setHours(0,0,0,0);return d.getTime()};
const pool=()=>{const l=S.link;let r=S.roster.filter(m=>m.sec!=="ATT");if(l&&l.mysec&&!l.whole)r=r.filter(m=>m.sec===l.mysec);return sorted(r)};
const me=()=>{const w=S.who&&S.who.id;return w?S.roster.find(m=>m.id===w||m.uid===w)||null:null};
const nm=m=>m.rank+" "+lastOf(m);
const isOut=m=>m.status!=="On Hand"&&m.sec!=="ATT";
/* back-by rides in the note as "back 1745" and counts only for a same-day sign-out */
function backTs(m){const x=/\bback (\d{2})(\d{2})\b/.exec(String(m.detail||""));if(!x)return 0;const e=(typeof isoOf==="function"&&isoOf(m.end))||"";if(e&&e!==dkey())return 0;const d=new Date();d.setHours(+x[1],+x[2],0,0);return d.getTime()}
const isLate=m=>isOut(m)&&backTs(m)>0&&Date.now()>backTs(m);
const secList=()=>{const have=new Set(pool().map(m=>m.sec));return SECTIONS.filter(x=>have.has(x[0]))};
const inSec=s=>pool().filter(m=>s==="ALL"||m.sec===s);
const lbl=s=>{const x=SECTIONS.find(y=>y[0]===s);return x?x[1]||x[0]:s};
function ring(n,t,sz){const r=36,c=2*Math.PI*r,f=t?Math.min(1,n/t):0;
  return `<svg width="${sz}" height="${sz}" viewBox="0 0 86 86" role="img" aria-label="${n} of ${t} in"><circle cx="43" cy="43" r="${r}" fill="none" stroke="rgba(128,140,160,.25)" stroke-width="10"/><circle cx="43" cy="43" r="${r}" fill="none" stroke="var(--s-onhand)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(c*f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 43 43)"/><text x="43" y="50" text-anchor="middle" fill="currentColor" font-size="22" font-weight="800">${n}</text></svg>`}
function personPick(){const ps=inSec(tab==="ALL"?(S.link&&S.link.mysec&&!S.link.whole?S.link.mysec:"ALL"):tab);
  if(who&&!ps.some(m=>m.id===who)&&!pool().some(m=>m.id===who))who="";
  if(!who){const m=me();who=m&&pool().some(x=>x.id===m.id)?m.id:(ps[0]||{}).id||""}
  return `<label for="lbWho">Who</label><select id="lbWho" class="wsel">${(tab==="ALL"?pool():ps).map(m=>`<option value="${esc(m.id)}"${m.id===who?" selected":""}>${esc(m.rank+" "+m.name)}${isOut(m)?" · "+esc(SHORT[m.status]||m.status):""}</option>`).join("")}</select>`}
const DOWN=t=>{try{return new Date(t).toLocaleDateString([],{weekday:"short",month:"short",day:"numeric"})}catch(e){return t}};
function eRow(e){const p=S.roster.find(x=>x.id===e.mid);const lt=e.k==="out"&&p&&isLate(p)&&e.t>=day0();
  return `<div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)"><span class="note" style="margin:0;width:42px;font-weight:700">${hhmm(e.t)}</span><span style="flex:1;min-width:0"><b>${esc(e.n)}</b> <span class="note">${esc(lbl(e.sec))}${e.pl?" · "+esc(e.pl):""}${e.st&&e.k==="out"?" · "+esc(SHORT[e.st]||e.st):""}${e.bk?" · back "+esc(e.bk):""}</span></span>${lt?`<span class="chip" style="background:var(--warn);color:#fff;border:0">LATE</span>`:""}<span class="chip" style="${e.k==="out"?"background:var(--brass);color:#fff;border:0":""}">${e.k==="out"?"OUT":"IN"}</span></div>`}
let hd="",hw="ALL";
const dayK=t=>dkey(new Date(t));
function histHtml(){const today=dkey();if(!hd||hd>today)hd=today;
  const all=LOG().filter(e=>tab==="ALL"||e.sec===tab);
  const people=[...new Map(all.map(e=>[e.mid,e.n])).entries()].sort((a,b)=>String(a[1]).localeCompare(String(b[1])));
  if(hw!=="ALL"&&!people.some(x=>x[0]===hw))hw="ALL";
  const sel=all.filter(e=>dayK(e.t)===hd&&(hw==="ALL"||e.mid===hw)).sort((a,b)=>b.t-a.t),outs=sel.filter(e=>e.k==="out").length;
  const days=[...new Set(all.map(e=>dayK(e.t)))].sort().reverse().slice(0,7);
  const btn="cursor:pointer;min-height:40px";
  return `<div class="sech"><h2>History</h2></div><div class="panel" id="lbHist"><p class="note" style="margin:0 0 8px">Go back to any day to see who signed out and in.</p>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button type="button" class="chip" data-lbhd="-1" style="${btn}">‹ Day before</button><input type="date" id="lbHd" value="${esc(hd)}" max="${esc(today)}" style="flex:1;min-width:140px"><button type="button" class="chip" data-lbhd="1" style="${btn}"${hd>=today?" disabled":""}>Next day ›</button></div>
    ${days.length?`<div class="evts" style="flex-wrap:wrap;margin-top:8px">${days.map(k=>`<button type="button" data-lbhday="${esc(k)}" aria-pressed="${k===hd}" style="min-height:40px">${k===today?"Today":esc(DOWN(k+"T12:00:00"))}</button>`).join("")}</div>`:""}
    <label for="lbHw">Person</label><select id="lbHw" class="wsel"><option value="ALL"${hw==="ALL"?" selected":""}>Everyone</option>${people.map(([id,n])=>`<option value="${esc(id)}"${id===hw?" selected":""}>${esc(n)}</option>`).join("")}</select>
    <p class="note" style="margin:8px 0 0"><b>${hd===today?"Today":esc(DOWN(hd+"T12:00:00"))}</b> · ${sel.length} ${sel.length===1?"entry":"entries"} · ${outs} out · ${sel.length-outs} in</p>
    ${sel.length?sel.map(eRow).join(""):`<p class="note" style="margin:6px 0 0">No entries on this day.</p>`}</div>`}
function entries(){const t0=day0();return LOG().filter(e=>e.t>=t0&&(tab==="ALL"||e.sec===tab)).sort((a,b)=>b.t-a.t).slice(0,40)}
function html(){
  if(!real())return `<div class="card"><b>Logbook</b><p class="note">Add your people first, then sign them out and in here.</p></div>`;
  const back=mem()?"today":"board",P=pool(),secs=secList(),S1=inSec(tab),tot=S1.length,out=S1.filter(isOut).length,inn=tot-out,all=P.length,allIn=all-P.filter(isOut).length;
  const late=P.filter(isLate);
  let h=`<div class="sech"><h2>Logbook</h2><button class="chip" data-go="${back}" style="cursor:pointer">◂ Back</button></div>`;
  if(late.length)h+=`<div class="banner" style="border-color:var(--warn)"><span><b style="color:var(--warn)">${late.length} late</b> · ${late.slice(0,4).map(m=>esc(nm(m))+" (back "+hhmm(backTs(m))+")").join(", ")}${late.length>4?" +"+(late.length-4):""}</span></div>`;
  h+=`<div class="evts" role="tablist" aria-label="Section books" style="flex-wrap:wrap">${[["ALL","All"]].concat(secs.map(x=>[x[0],x[1]||x[0]])).map(([k,l])=>`<button data-lbtab="${esc(k)}" aria-pressed="${tab===k}" style="min-height:44px">${esc(l)}</button>`).join("")}</div>`;
  h+=`<div class="card" id="lbRing" style="display:flex;gap:14px;align-items:center;margin-top:8px">${ring(inn,tot,78)}<div style="flex:1;min-width:0"><b style="font-size:17px">${esc(tab==="ALL"?"Whole team":lbl(tab)+" book")}</b><div class="note" style="margin:2px 0">${inn} in · ${out} out · ${tot} on the roster</div><div class="note" style="margin:0">Company ${allIn} of ${all} in</div></div></div>`;
  const m=S.roster.find(x=>x.id===who);
  h+=`<div class="card" id="lbSign" style="gap:8px;margin-top:10px"><span class="lbl">SIGN THE BOOK</span>${personPick()}
    <div class="evts" style="margin-top:4px"><button data-lbmode="out" aria-pressed="${mode==="out"}" style="min-height:48px">Sign OUT</button><button data-lbmode="in" aria-pressed="${mode==="in"}" style="min-height:48px">Sign IN</button></div>`;
  if(mode==="out"){
    h+=`<label>Where to (sets the status)</label><div class="evts" style="flex-wrap:wrap">${OUTS.map(s=>`<button data-lbst="${esc(s)}" aria-pressed="${st===s}" style="min-height:44px">${esc(SHORT[s]||s)}</button>`).join("")}</div>`;
    if(st==="Other")h+=`<label for="lbO">What's going on?</label><input type="text" id="lbO" maxlength="40" value="${esc(v.oth)}" placeholder="Write it in">`;
    h+=`<div class="row2"><div><label for="lbP">Place</label><input type="text" id="lbP" maxlength="60" value="${esc(v.place)}" placeholder="Medical, Bldg 1220"></div><div><label for="lbB">Back by</label><input type="time" id="lbB" value="${esc(v.back)}"></div></div>`;
    if(MULTI.includes(st))h+=`<label for="lbT">To (last day, optional)</label><input type="date" id="lbT" value="${esc(v.to)}">`;
    h+=`<p class="note" style="margin:0">One sign-out sets their status, place and back-by on the roster, their section and company counts, Check-ins, the calendar, and every phone on the team. It counts as a check-in.</p>`}
  else h+=`<p class="note" style="margin:0">${m&&isOut(m)?esc(nm(m))+" is "+esc(SHORT[m.status]||m.status)+(m.loc?" · "+esc(m.loc):"")+". Signing in puts them back On Hand and clears the place.":"Puts them back On Hand and clears the place."}</p>`;
  h+=`<button class="btn" id="lbGo" style="min-height:52px">${mode==="out"?"Sign out":"Sign in"}</button></div>`;
  const E=entries();
  h+=`<div class="sech"><h2>Today's entries</h2></div><div class="panel" id="lbLog">${E.length?E.map(eRow).join(""):`<p class="note" style="margin:0">No entries yet today.</p>`}</div>`;
  h+=histHtml();
  return h}
function grab(){for(const [k,id] of [["oth","lbO"],["place","lbP"],["back","lbB"],["to","lbT"]]){const el=document.getElementById(id);if(el)v[k]=el.value}}
const again=()=>{const y=window.scrollY;render();window.scrollTo(0,y)};
function allowed(m){if(typeof role==="function"&&role()==="view"){const me0=me();if(!me0||me0.id!==m.id)return false}return true}
function sign(){grab();const m=S.roster.find(x=>x.id===who);if(!m)return;if(!allowed(m))return denyMsg();
  const now=Date.now();let bk="";
  if(mode==="out"){
    if(st==="Other"&&!String(v.oth||"").trim()){toast("Write what's going on.");return}
    if(MULTI.includes(st)&&v.to&&v.to<dkey()){toast("To can't be before today.");return}
    m.status=st;delete m.noAuto;m.start=dkey();if(MULTI.includes(st)&&v.to)m.end=v.to;else m.end=dkey();
    const pl=String(v.place||"").trim().slice(0,60);if(pl)m.loc=pl;else delete m.loc;
    if(v.back&&/^\d{2}:\d{2}$/.test(v.back)&&!(MULTI.includes(st)&&v.to&&v.to!==dkey()))bk=v.back.replace(":","");
    const det=[st==="Other"?String(v.oth||"").trim().slice(0,30):"",bk?"back "+bk:""].filter(Boolean).join(" · ");if(det)m.detail=det;else delete m.detail}
  else{m.status="On Hand";delete m.start;delete m.end;delete m.loc;delete m.detail;delete m.noAuto}
  m.ckAt=now;m.ut=now;S.secAt=S.secAt||{};S.secAt[m.sec]=now;
  const L=LOG();L.unshift({id:"l"+now.toString(36)+rndId(3),mid:m.id,n:nm(m),sec:m.sec,k:mode,t:now,st:m.status,pl:m.loc||"",bk});if(L.length>3000)L.length=3000;
  try{actAdd("📒",nm(m)+" signed "+(mode==="out"?"OUT":"IN")+": "+(SHORT[m.status]||m.status)+(m.loc?" · "+m.loc:"")+(bk?" · back "+bk:""),"board")}catch(e){}
  v={place:"",back:"",to:"",oth:""};save();try{if(S.board&&typeof rpPublish==="function")rpPublish(true)}catch(e){}
  again();try{buzz()}catch(e){}toast(nm(m)+": signed "+(mode==="out"?"OUT":"IN"))}
{const _r=render;render=function(){if(view==="lb"){renderTabs();$("#main").innerHTML=html();if(typeof animateView==="function")animateView();return}return _r.apply(this,arguments)}}
{const _t=tabOf;tabOf=function(x){return x==="lb"?(mem()?"today":"people"):_t.apply(this,arguments)}}
{const _rs=renderShell;renderShell=function(){const r=_rs.apply(this,arguments);try{if(mem())return r;const sn=document.getElementById("subnav");if(!sn||tabOf(view)!=="people"||sn.querySelector('[data-go="lb"]'))return r;
  const b=document.createElement("button");b.setAttribute("data-go","lb");b.textContent="Logbook";if(view==="lb")b.setAttribute("aria-current","page");const f=sn.querySelector("button");if(f&&f.nextSibling)sn.insertBefore(b,f.nextSibling);else sn.appendChild(b)}catch(e){}return r}}
try{STAY_VIEWS.push("lb")}catch(e){}
document.addEventListener("click",e=>{const t=e.target;if(!t||!t.closest||view!=="lb")return;let b;
  if(b=t.closest("[data-lbtab]")){grab();tab=b.dataset.lbtab;who="";again();return}
  if(b=t.closest("[data-lbmode]")){grab();mode=b.dataset.lbmode;again();return}
  if(b=t.closest("[data-lbst]")){grab();st=b.dataset.lbst;again();return}
  if(b=t.closest("[data-lbhd]")){const d=new Date((hd||dkey())+"T12:00:00");d.setDate(d.getDate()+(+b.dataset.lbhd));const k=dkey(d);hd=k>dkey()?dkey():k;again();return}
  if(b=t.closest("[data-lbhday]")){hd=b.dataset.lbhday;again();return}
  if(t.closest("#lbGo")){sign();return}},true);
document.addEventListener("change",e=>{if(view!=="lb")return;const id=e.target.id;
  if(id==="lbWho"){grab();who=e.target.value;again()}
  else if(id==="lbHd"){if(/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)){hd=e.target.value>dkey()?dkey():e.target.value;again()}}
  else if(id==="lbHw"){hw=e.target.value||"ALL";again()}});
/* Home: a Logbook card under the check-in card, and a button on My page */
function card(){const P=pool(),o=P.filter(isOut).length,l=P.filter(isLate).length;
  return `<div class="card" id="lbCard" style="margin-top:10px;display:flex;gap:10px;align-items:center"><div style="flex:1;min-width:0"><span class="lbl">LOGBOOK</span><div class="note" style="margin:2px 0 0">${o} out${l?` · <b style="color:var(--warn)">${l} late</b>`:""} · sign people out and in</div></div><button class="btn" data-go="lb" style="width:auto;flex:none;min-height:44px;padding:0 16px">Open</button></div>`}
function lift(){try{const main=$("#main"),c=$("#lbCard");if(!main||!c||c.parentElement!==main)return;const h=main.querySelector(".greet,.hero");const to=h&&h.parentElement===main?h.nextElementSibling:main.firstElementChild;if(to&&to!==c)main.insertBefore(c,to)}catch(e){}}
{const _rb=renderBoard;renderBoard=function(){const r=_rb.apply(this,arguments);try{if(!real()||mem()||$("#lbCard"))return r;const main=$("#main");if(!main)return r;
  const h=main.querySelector(".greet,.hero");if(h&&h.parentElement===main)h.insertAdjacentHTML("afterend",card());else main.insertAdjacentHTML("afterbegin",card());setTimeout(lift,0);setTimeout(lift,250)}catch(e){}return r}}
window.lbLate=()=>real()?pool().filter(isLate):[];window.lbBackTs=backTs;
})();
