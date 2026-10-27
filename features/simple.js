/* Accounted For 1.5: simpler.
   1. Tools: about 40 tiles become 12. Tiles that do the same job sit together; tapping a group opens its tools.
   2. Home: Invite replaces Ask in the quick actions. Emergency check-in lives on Home only.
   3. Header: no refresh button. The app refreshes itself every minute and whenever it comes back on screen.
   4. Welcome: two big buttons, "I'm joining a team" and "I'm starting a team". Starting asks the type first, then the name.
      A new team starts empty (no sample people) with an "Add your people" card.
   5. Plain words outside Military: Share headcount, Phone list, Incident report, Combine teams, Group leaders update you.
      Groups show the full names people typed (Red Team, not RED).
   6. Members see three tabs: My status, Feed, Calendar.
   7. After common actions, the toast says what happens next. */
(()=>{
const mil=()=>!S.mode||S.mode==="military";
const leader=()=>!(typeof memberMode==="function"&&memberMode());

/* ================= 1. TOOLS: 12 groups ================= */
const GROUPS=[
  {k:"checkin",l:"Muster",s:"Check people in, confirm check-ins",ic:"muster",keys:["muster","checkins","alerts"]},
  {k:"feed",l:"Feed",s:"Post, text, messages, pages",ic:"feed",keys:["feed","send","dms","pages"]},
  {k:"people",l:"People & access",s:"Invite, logins, who has access",ic:"people",keys:["invite","access","logins","live"]},
  {k:"reports",l:"Reports",s:"Headcount, PDF, incident report, trends",ic:"text",keys:["text","pdfReport","w6","trends"]},
  {k:"plan",l:"Calendar",s:"Calendar, events, duty, meetings",ic:"cal",keys:["cal","events","duty","pt"]},
  {k:"ready",l:"Readiness",s:"Who's due for what",ic:"ready",keys:["ready"]},
  {k:"recall",l:"Recall",s:"Call or text everyone",ic:"recall",keys:["recall"]},
  {k:"armory",l:"Armory",s:"Sign gear in and out",ic:"armory",keys:["armory"]},
  {k:"rollup",l:"Rollup",s:"Add up the teams under you",ic:"rollup",keys:["co","rollup"]},
  {k:"home",l:"My day",s:"Dashboard, today, my log",ic:"today",keys:["dash","today","log"]},
  {k:"help",l:"Help",s:"Ask a question, guide, short tour",ic:"help",keys:["support","guide","trStart","v11SignInTool","v11ShareApp","ask"]},
  {k:"settings",l:"Settings",s:"Data, version, connections, system check",ic:"data",keys:["data","sys","modeOpen","integ"]}];
const tileKey=b=>{if(b.id)return b.id;if(b.dataset.go)return b.dataset.go;const d=Object.keys(b.dataset)[0];if(d)return d;
  const h=b.getAttribute&&b.getAttribute("href")||"";if(/help\.html/.test(h)||/Help guide/i.test(b.textContent))return "guide";return (b.textContent||"").trim().slice(0,20)};
let STORE={};
function groupTiles(){const main=$("#main");if(!main)return;const grids=[...main.querySelectorAll(".tgrid")];if(!grids.length)return;
  const tiles=[];grids.forEach(g=>[...g.children].forEach(c=>tiles.push(c)));
  STORE={};const left=[];for(const t of tiles){const k=tileKey(t);const g=GROUPS.find(G=>G.keys.includes(k));(g?(STORE[g.k]=STORE[g.k]||[]):left).push(t)}
  if(left.length)STORE.settings=(STORE.settings||[]).concat(left);
  for(const G of GROUPS)if(STORE[G.k])STORE[G.k].sort((a,b)=>G.keys.indexOf(tileKey(a))-G.keys.indexOf(tileKey(b)));
  const html=GROUPS.filter(G=>STORE[G.k]&&STORE[G.k].length).map(G=>{const L=STORE[G.k];
    if(L.length===1){const t=L[0].cloneNode(true);t.setAttribute("data-sg1",G.k);return t.outerHTML}
    const ND=window.__newDots,seen=S.newSeen||{},old=S.newFrom&&Date.now()-S.newFrom>45*864e5;
    const dot=ND&&!old&&ND.NEW.some(([k,,zone])=>!seen[k]&&L.some(t=>{try{return t.matches(zone)}catch(e){return false}}))?`<span class="newdot" role="img" aria-label="New" title="New"></span>`:"";
    return `<button data-sgrp="${G.k}"><span class="ic">${svg(G.ic)}</span><span><b>${esc(G.l)}${dot}</b><small>${esc(G.s)}</small></span></button>`}).join("");
  const first=grids[0];const head=first.previousElementSibling;const box=document.createElement("div");box.className="tgrid";box.id="sgGrid";box.innerHTML=html;
  (head&&head.classList.contains("sech")?head:first).before(box);
  grids.forEach(g=>{const h=g.previousElementSibling;if(h&&h.classList.contains("sech"))h.remove();g.remove()});
  main.querySelectorAll("#v11Em").forEach(b=>b.remove());
  main.querySelectorAll('.btn.warn[data-go="recall"]').forEach(b=>{if(b.previousElementSibling===null||b.parentNode===main)b.remove()})}
{const _rt=renderTools;renderTools=function(){_rt.apply(this,arguments);try{groupTiles()}catch(e){}}}
function openGroup(k){const G=GROUPS.find(x=>x.k===k);const L=STORE[k];if(!G||!L)return;sheetCtx={kind:"sgrp"};
  $("#sheetT").innerHTML=`${esc(G.l)}<small>${esc(G.s)}</small>`;
  $("#sheetOpts").innerHTML=`<div class="tgrid" style="margin:0">${L.map(t=>t.outerHTML).join("")}</div>`;
  const sh=$("#sheet");if(typeof sheetFocus==="function")sheetFocus();sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add("open")))}
window.openToolGroup=openGroup;
document.addEventListener("click",e=>{if(!e.target.closest)return;const g=e.target.closest("[data-sgrp]");if(g){e.stopImmediatePropagation();openGroup(g.dataset.sgrp);return}
  if(sheetCtx&&sheetCtx.kind==="sgrp"&&e.target.closest("#sheetOpts .tgrid > *"))closeSheet()},true);

/* ================= 2. HOME: Invite instead of Ask; emergency on Home only ================= */
{const _rb=renderBoard;renderBoard=function(){_rb.apply(this,arguments);if(!leader())return;
  const a=document.querySelector('#main .qa [data-go="ask"]')||(!document.querySelector('#main .qa [data-go="invite"]')&&document.querySelector('#main .qa [data-go="alerts"]'));if(a)a.outerHTML=`<button data-go="invite"><span class="ic">${svg("send",24)}</span>Invite</button>`;
  if(S.source!=="sample"&&!S.roster.length&&canEdit()&&!$("#sgAdd")){const hero=document.querySelector("#main .card.hero")||document.querySelector("#main .qa");
    const card=`<div class="panel" id="sgAdd" style="border-color:var(--brass)"><b style="font-size:18px">Add your people</b><p class="note" style="margin:2px 0 8px">Your team is empty. Pick the easiest way:</p>
      <div class="row2"><button class="btn" data-addm="">Type names</button><button class="btn alt" data-sgpaste="1">Paste a list</button></div>
      <div class="row2"><button class="btn alt" data-sgfile="1">Upload a file</button><button class="btn alt" data-go="invite">Send an invite</button></div></div>`;
    if(hero)hero.insertAdjacentHTML("beforebegin",card);else $("#main").insertAdjacentHTML("afterbegin",card)}}}
document.addEventListener("click",e=>{if(!e.target.closest)return;
  if(e.target.closest("[data-sgpaste]")){if(!canEdit())return denyMsg();addSheet("");setTimeout(()=>{const d=document.querySelector("#sheetOpts details");if(d){d.open=true;const t=d.querySelector("textarea");if(t)t.focus()}},80);return}
  if(e.target.closest("[data-sgfile]")){view="data";render();window.scrollTo(0,0);setTimeout(()=>{const f=$("#file");if(f){f.scrollIntoView({block:"center"});try{f.click()}catch(err){}}},120)}});

/* ================= 3. HEADER: refresh by itself ================= */
{const css=document.createElement("style");css.textContent="#hRef{display:none!important}";document.head.appendChild(css)}
if(typeof every==="function")every(60000,()=>{try{if(typeof refreshAll==="function")refreshAll(true)}catch(e){}},"auto-refresh");
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&typeof refreshAll==="function")setTimeout(()=>{try{refreshAll(true)}catch(e){}},400)});

/* ================= 4. WELCOME: joining or starting ================= */
const MK=["civilian","jobs","hr","police","military","custom"];
let wv={step:"pick",mode:""};
function startHTML(){if(wv.step==="type")return `<div class="panel sgw-start" style="margin:0"><b>What kind of team?</b><p class="note" style="margin:0">Sets the words the app uses. You can change it later.</p>
    ${MK.map(k=>`<button class="btn alt" data-sgmode="${k}" style="text-align:left;display:block"><b>${esc(MODES[k].name)}</b><br><span class="note" style="margin:0">${esc(MODES[k].desc)}</span></button>`).join("")}
    <button class="btn alt" data-sgback="1">Back</button></div>`;
  return `<div class="panel sgw-start" style="margin:0"><b>Name your team</b><p class="note" style="margin:0">${esc(MODES[wv.mode].name)}. Shows on your reports, texts and the Feed.</p>
    <label for="sgName">Team name</label><input type="text" id="sgName" maxlength="40" placeholder="${esc(MODES[wv.mode].v?MODES[wv.mode].v.coEx:"1ST PLATOON")}" autocomplete="off">
    <button class="btn" id="sgGo">Go</button><button class="btn alt" data-sgback="type">Back</button></div>`}
function shapeWelcome(){const w=$("#v11Welcome");if(!w||w.hidden)return;const inner=w.querySelector(".v11w-in");if(!inner)return;
  const panels=[...inner.querySelectorAll(":scope > .panel")];if(panels.length<3)return;
  let pick=inner.querySelector(".sgw-pick");
  if(!pick){inner.querySelector("h1").insertAdjacentHTML("afterend","");
    const p=inner.querySelector(":scope > p.note");p.insertAdjacentHTML("afterend",`<div class="sgw-pick" style="display:grid;gap:12px;margin:8px 0">
      <button class="btn" data-sgjoin="1" style="min-height:76px;font-size:19px">I'm joining a team<br><span style="font-size:13px;font-weight:500;opacity:.85">I got a link, username or invite</span></button>
      <button class="btn alt" data-sgstart="1" style="min-height:76px;font-size:19px">I'm starting a team<br><span style="font-size:13px;font-weight:500;opacity:.85">I'm the leader, coach or organizer</span></button></div><div class="sgw-slot"></div>`);pick=inner.querySelector(".sgw-pick")}
  const join=panels.filter(x=>x.querySelector("#lgSU,#v11WLink,#v11WShare"));const start=panels.find(x=>x.querySelector("#v11WLead"));
  if(start)start.hidden=true;
  join.forEach(x=>x.hidden=wv.step!=="join");pick.hidden=wv.step!=="pick";
  const slot=inner.querySelector(".sgw-slot");slot.innerHTML=wv.step==="type"||wv.step==="name"?startHTML():wv.step==="join"?`<button class="btn alt" data-sgback="1">Back</button>`:"";
  if(wv.step==="join"){const b=slot.firstElementChild;const last=join[join.length-1];if(last&&b)last.after(b)}
  if(wv.step==="name")setTimeout(()=>{const i=$("#sgName");if(i)i.focus({preventScroll:true})},60)}
new MutationObserver(()=>{const w=$("#v11Welcome");if(w&&!w.hidden&&!w.querySelector(".sgw-pick")){wv={step:"pick",mode:""};shapeWelcome()}}).observe(document.body,{childList:true,subtree:true});
function startTeam(){const k=wv.mode;const nm=(($("#sgName")||{}).value||"").trim();
  if(!nm){toast("Type your team name.");const i=$("#sgName");if(i)i.focus();return}
  if(!setMode(k)){S.mode=k;startXL()}S.unit=(typeof cleanName==="function"?cleanName(nm):nm).toUpperCase().slice(0,40);
  S.welcomed=1;S.leaderMode=true;if(S.source==="sample"){S.roster=[];S.source="mol";S.loadedAt=""}save();
  const w=$("#v11Welcome");if(w)w.hidden=true;document.body.classList.remove("v11w-open");try{closeSheet()}catch(e){}
  view="board";render();window.scrollTo(0,0);toast("Team ready. Add your people.");
  if(typeof window.startTour==="function"&&!(S.tour&&S.tour.leader))setTimeout(()=>window.startTour("leader"),700)}
document.addEventListener("click",e=>{if(!e.target.closest)return;const t=e.target;
  if(t.closest("[data-sgjoin]")){wv.step="join";shapeWelcome();return}
  if(t.closest("[data-sgstart]")){wv.step="type";shapeWelcome();return}
  const m=t.closest("[data-sgmode]");if(m){wv.mode=m.dataset.sgmode;wv.step="name";shapeWelcome();return}
  const bk=t.closest("[data-sgback]");if(bk){wv.step=bk.dataset.sgback==="type"?"type":"pick";shapeWelcome();return}
  if(t.id==="sgGo"){startTeam()}});
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="sgName"){e.preventDefault();startTeam()}});
setTimeout(shapeWelcome,500);

/* ================= 5. PLAIN WORDS outside Military ================= */
for(const k of ["civilian","jobs","hr"]){const v=MODES[k].v;v.rec="phone list";v.w6="Incident report";if(k==="civilian")v.lim="Can't take part"}
{const _md=modeDict;modeDict=function(md){const D=_md.apply(this,arguments);if(!D||md===MODES.military||md===MODES.police)return D;const v=md.v;
  const art=w=>(/^[aeiou]/i.test(w)?"an ":"a ")+w;
  const X=[["Send the numbers","Share headcount"],["Send numbers","Share headcount"],["send the numbers","share headcount"],["IR report","Incident report"],["6W report","Incident report"],["IR","Incident"],
    ["Live sections","Group leaders update you"],["Live section","Group leaders update you"],["Rollup","Combine teams"],["rollup","combine teams"],["ROLLUP","COMBINE"],["Call tree","Phone list"],["call tree","phone list"],
    ["a company",art(v.co)],["A company",cap(art(v.co))],["a organization",art(v.co)],["Load a organization roster","Load "+art(v.co)+" roster"]];
  for(const [a,b] of X){D.map[a]=b;D.mapU[a]=/^[A-Z0-9\/&-]+$/.test(a)?b.toUpperCase():b}
  const keys=Object.keys(D.map).sort((x,y)=>y.length-x.length).map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));
  D.re=new RegExp("(?<![A-Za-z0-9])(?:"+keys.join("|")+")(?![A-Za-z0-9])","g");D.ex=Object.assign({},D.ex,{ATT:v.attC||D.ex.ATT});return D}}
/* full group names on tabs and chips */
function fullNames(){if(mil())return;const att=(MODE().v&&MODE().v.attC)||"Attached";
  const name=k=>{k=String(k||"").toLowerCase();if(k==="att")return att;const s=SECTIONS.find(x=>x[0].toLowerCase()===k);return s&&s[1]?s[1]:""};
  document.querySelectorAll("#tabs [data-v], #main .card.hero [data-go], #subnav [data-go], #main [data-go].secchip").forEach(b=>{const k=b.dataset.v||b.dataset.go;const n=name(k);if(!n)return;
    const w=document.createTreeWalker(b,NodeFilter.SHOW_TEXT);let tn;while((tn=w.nextNode())){const x=tn.nodeValue.trim();if(!x)continue;
      if(x.toUpperCase()===String(k).toUpperCase()||x===(MODE().v||{}).code||x==="ATT"){tn.nodeValue=tn.nodeValue.replace(x,n);b.setAttribute("data-noxl","")}break}})}
{const _rT=renderTabs;renderTabs=function(){_rT.apply(this,arguments);try{fullNames()}catch(e){}}}

/* ================= 6. MEMBERS: My status, Feed, Calendar ================= */
{const _tl=tabsList;tabsList=function(){if(!(typeof memberMode==="function"&&memberMode()))return _tl.apply(this,arguments);
  return S.me?[["me","My status","me"],["feed","Feed","feed"],["mecal","Calendar","cal"]]:[["today","Today","today"],["feed","Feed","feed"]]}}
{const _to=tabOf;tabOf=function(v){if(v==="mecal")return "mecal";return _to.apply(this,arguments)}}
function renderMeCal(){const D=S.me&&S.me.d;let h=`<div class="sech" style="margin-top:12px"><h2>Calendar</h2><button class="chip" id="meIcs" style="cursor:pointer">Add to phone calendar</button></div>`;
  if(!D){$("#main").innerHTML=h+`<div class="card"><p class="note" style="margin:0">Your calendar shows up once your leader sends your link.</p></div>`;return}
  const rows=[];const k0=dkey();
  for(const x of D.duties||[])if(x.d>=k0)rows.push({d:x.d,t:"⚑ Duty",n:x.r||""});
  for(const e of D.cal||[])if((e.end||e.d)>=k0)rows.push({d:e.d,t:(e.tm?e.tm+" · ":"")+e.ti,n:(ctype(e.ty)[1]||"")+(e.end&&e.end!==e.d?" · thru "+short(parseD(e.end)):"")+(e.no?" · "+e.no:"")});
  if(D.pod&&D.pod.d>=k0)rows.push({d:D.pod.d,t:"📋 Plan of the Day",n:(D.pod.txt.split("\n")[1]||"")});
  rows.sort((a,b)=>a.d.localeCompare(b.d));let day="";
  if(!rows.length)h+=`<div class="card"><p class="note" style="margin:0">Nothing coming up.</p></div>`;
  for(const r of rows){if(r.d!==day){day=r.d;const d=parseD(r.d);h+=`<div class="note" style="margin:14px 4px 4px;font-weight:800">${d?DOW[d.getDay()]+" "+short(d):esc(r.d)}${r.d===k0?" · Today":""}</div>`}
    h+=`<div class="card" style="margin:4px 0;padding:10px 14px"><b>${esc(r.t)}</b>${r.n?`<div class="note" style="margin:0">${esc(r.n)}</div>`:""}</div>`}
  $("#main").innerHTML=h}
{const _r=render;render=function(){const mm=typeof memberMode==="function"&&memberMode();
  if(mm&&S.me&&["today","log","ask","pages"].includes(view))view="me";
  if(view==="mecal"){renderTabs();renderMeCal();if(typeof animateView==="function")animateView();return}
  const r=_r.apply(this,arguments);try{fullNames()}catch(e){}return r}}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest('[data-tab="mecal"]');if(t){e.stopImmediatePropagation();view="mecal";render();window.scrollTo(0,0)}},true);

/* ================= 7. WHAT HAPPENS NEXT ================= */
{const _t=toast;toast=function(msg){let m=String(msg==null?"":msg);
  try{if(m==="Posted"){const f=typeof fdCur==="function"&&fdCur();const p=f&&(f.posts||[])[0];
      m=f&&f.lk&&p?"Posted. 0 of "+fdPool(p).length+" have confirmed. Watch the count on the post.":"Posted. Your people see it in Feed now."}
    else if(m==="Got it sent")m="Confirmed. Your leader sees it.";
    else if(m==="Request sent")m="Request sent. You'll see the answer under My requests.";
    else if(/^(Invite|Join) link copied$/.test(m))m+=". Paste it in a text. They show up in People & access once they open it.";
    else if(m==="Marked as sent")m="Marked as sent. Read receipts show here as people tap Got it.";
    else if(/^🚨 Emergency/.test(m))m+=". Watch the count fill in here.";
    else if(m==="Feed created. Invite your people.")m="Feed created. Next: Invite your people so they can confirm posts."}catch(e){}
  return _t.call(this,m)}}

if(typeof HELP==="object"){if(HELP.tools)HELP.tools[1]="Everything else, in 12 groups. Tap a group to see its tools.";}
if(!mil()&&typeof startXL==="function")startXL();
if(typeof render==="function")try{render()}catch(e){}
})();
