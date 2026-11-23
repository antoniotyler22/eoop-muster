/* Accounted For 4.144.0: Org suite. Everything here is new in this version and carries a blue dot until the person opens it.
   Tools > Org suite (leaders):
     Console   every team on this phone: people, who is out, last drill and how it went, due drills, seat meter for the plan.
     Roster sync  keep the roster in step with a published CSV link (Google Sheets "Publish to web", a school or HR export):
                  preview who would be added or removed, apply, or let it run once a day. Removals are guarded.
     Event webhook  a JSON post to Zapier, Make, n8n or your own server when a drill closes and when someone is late.
     Trust center  export everything this team holds, links to the policies, and honest status of what is and isn't done.
     Share  your invite link and a tracker for who you sent it to.
     Data room (owner)  the numbers a buyer or board asks for. Anything this phone can't know shows [PENDING].
   Safety (Pro) gets three tabs: Plan (schedule drills, reminders, "at risk" for the year, calendar file), Reunite (guardians and
   release by person) and Quiet (a silent alert to the team leaders, then a plain screen).
   Home gets a first-drill checklist for new teams and a yearly-plan nudge for monthly Pro.
   iPhone: while a check-in is open the headcount is handed to the native Live Activity / widget plugin when it is installed
   (native-ios/MusterLiveActivity). Nothing here blocks emergency muster. */
(()=>{
const DAY=864e5;
const os=()=>{S.os=S.os&&typeof S.os==="object"?S.os:{};const o=S.os;
  if(!o.first)o.first=Date.now();
  if(!o.sync||typeof o.sync!=="object")o.sync={url:"",drop:false,auto:false,last:0,err:"",msg:""};
  if(!o.hook||typeof o.hook!=="object")o.hook={url:"",drill:true,late:true,last:0,err:"",sentLate:{}};
  if(!o.ref||typeof o.ref!=="object")o.ref={code:"",list:[]};
  if(!Array.isArray(o.plan))o.plan=[];
  if(!o.reun||typeof o.reun!=="object")o.reun={site:"",state:{},guard:{},sel:""};
  if(!o.ob||typeof o.ob!=="object")o.ob={hide:0,shared:0};
  return o};
const mem=()=>typeof memberMode==="function"&&memberMode();
const real=()=>S.source!=="sample"&&Array.isArray(S.roster)&&S.roster.length>0;
const people=()=>(S.roster||[]).filter(m=>m.sec!=="ATT");
const owner=()=>typeof isOwner==="function"&&isOwner();
const fmtD=t=>new Date(t).toLocaleDateString([],{month:"short",day:"numeric",year:"numeric"});
const fmtT=t=>new Date(t).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
const E=s=>esc(String(s==null?"":s));
const nm=m=>((m.rank?m.rank+" ":"")+m.name).trim();
const safe=s=>String(s).replace(/[^\w -]+/g,"").trim()||"file";
const TYPES=[["fire","Fire"],["tornado","Tornado"],["lockdown","Lockdown"],["secure","Secure"],["evac","Evacuate"],["shelter","Shelter"]];
const typeName=k=>(TYPES.find(x=>x[0]===k)||[0,"Drill"])[1];
const btn=(a,t,cls,extra)=>`<button type="button" class="${cls||"btn alt"}" ${a} style="min-height:44px;${extra||""}">${t}</button>`;
const again=()=>{const y=window.scrollY;if(view==="org")render();else if(view==="safety"&&typeof renderSafety==="function")renderSafety();window.scrollTo(0,y)};
const sfx=()=>{S.sf=S.sf&&typeof S.sf==="object"?S.sf:{};if(!Array.isArray(S.sf.reun))S.sf.reun=[];return S.sf};

/* ================= Console ================= */
function teamRows(){const cur=(S.wsCur==="co"||!S.wsCur)?"plt":S.wsCur;const ks=window.TEAMS&&TEAMS.list?TEAMS.list():[cur];
  return ks.map(k=>{const b=k===cur?S:((S.ws||{})[k]||{});
    const ro=Array.isArray(b.roster)&&b.source!=="sample"?b.roster.filter(m=>m.sec!=="ATT"):[];
    const dr=(Array.isArray(b.drills)?b.drills:[]).filter(d=>d.kind!=="real"),last=dr[0]||null;
    return {k,cur:k===cur,name:window.TEAMS&&TEAMS.nameOf?TEAMS.nameOf(k):unitName(),n:ro.length,out:ro.filter(m=>m.status!=="On Hand").length,
      last:last?last.t:0,pct:last&&last.n?Math.round(100*last.ok/last.n):null,due:!last||Date.now()-last.t>30*DAY}})}
function seatHTML(){let c=Infinity,u=people().length;try{c=afCap();u=Math.max(u,0)}catch(e){}
  if(!isFinite(c))return `<p class="note" style="margin:0">${u} people on this team. Your plan has no limit.</p>`;
  const p=Math.min(100,Math.round(100*u/c));
  return `<div style="display:flex;justify-content:space-between;font-size:13px"><span>Seats on this team</span><b>${u} of ${c}</b></div><div style="height:8px;border-radius:6px;background:var(--line);margin-top:4px"><div style="height:100%;width:${p}%;border-radius:6px;background:var(--brass)"></div></div>`}
function consoleHTML(){const R=teamRows(),tot=R.reduce((a,r)=>a+r.n,0);
  return `<div class="panel" id="osCon"><b>Console</b><p class="note">Every team on this phone in one list.</p>${seatHTML()}
    <p class="note" style="margin:8px 0 0">${R.length} ${R.length===1?"team":"teams"} · ${tot} people in all</p>
    ${R.map(r=>`<div class="rrow" style="--sc:var(${r.due?"--warn":"--s-onhand"});margin-top:8px"><div class="rtop"><div class="who"><b>${E(r.name)}</b>${r.cur?` <span class="chip">open</span>`:""}
      <div class="ph">${r.n} people · ${r.out} out${r.last?` · last drill ${E(fmtD(r.last))}${r.pct!=null?" ("+r.pct+"%)":""}`:" · no drill yet"}</div></div>
      ${r.due?`<span class="chip" style="background:var(--warn);color:#fff;border:0">Drill due</span>`:`<span class="chip">On track</span>`}</div>
      <div class="evts" style="margin-top:6px">${r.cur?btn('data-go="recall"',"Run drill","btn"):btn(`data-os-team="${E(r.k)}"`,"Open team")}</div></div>`).join("")}
    <div class="row2" style="margin-top:10px">${btn('data-go="teams"',"Add or switch team")}${btn('data-go="safety"',"Safety")}</div></div>`}

/* ================= Roster sync ================= */
const key=s=>String(s||"").toUpperCase().replace(/[^A-Z]/g,"");
const HDR={first:/^(first|given|fname)/,last:/^(last|sur|family|lname)/,name:/^(name|fullname|person|student|employee)/,rank:/^(rank|grade|title|role)/,sec:/^(section|group|team|unit|class|dept|department|homeroom)/};
function toName(raw){let n=String(raw||"").replace(/\s+/g," ").trim();if(!n)return "";if(n.includes(","))return n.toUpperCase();const p=n.split(" ");if(p.length===1)return n.toUpperCase();return (p[p.length-1]+", "+p.slice(0,-1).join(" ")).toUpperCase()}
function secOf(v){const x=String(v||"").trim();if(!x)return "";const u=x.toUpperCase();const hit=SECTIONS.find(s=>s[0].toUpperCase()===u||String(s[1]||"").toUpperCase()===u);return hit?hit[0]:""}
function parseRoster(text){const rows=parseCSV(String(text||"")).filter(r=>r.some(x=>x));if(rows.length<2)return [];
  const h=rows[0].map(x=>x.toLowerCase().replace(/[^a-z]/g,""));const ix={};for(const [k,re] of Object.entries(HDR)){const i=h.findIndex(x=>re.test(x));if(i>=0)ix[k]=i}
  if(ix.name==null&&(ix.first==null||ix.last==null))return [];
  const out=[],seen=new Set();
  for(const r of rows.slice(1)){const name=ix.name!=null?toName(h.length===1?r.filter(Boolean).join(", "):r[ix.name]):toName((r[ix.last]||"")+", "+(r[ix.first]||""));if(!name||name===","||seen.has(key(name)))continue;seen.add(key(name));
    out.push({name:name.slice(0,60),rank:ix.rank!=null?String(r[ix.rank]||"").slice(0,12):"",sec:ix.sec!=null?secOf(r[ix.sec]):""})}
  return out}
let pv=null;
function diff(list){const have=new Map(people().map(m=>[key(m.name),m])),inFile=new Set(list.map(x=>key(x.name)));
  return {add:list.filter(x=>!have.has(key(x.name))),miss:[...have.entries()].filter(([k])=>!inFile.has(k)).map(([,m])=>m),total:list.length}}
async function pull(){const o=os().sync,u=String(o.url||"").trim();
  if(!/^https:\/\//i.test(u))throw new Error("Use a link that starts with https://");
  const r=await fetch(u,{cache:"no-store"});if(!r.ok)throw new Error("The link answered "+r.status);
  const t=await r.text();const list=parseRoster(t);if(!list.length)throw new Error("No people found. The first row needs a Name column (or First and Last).");return list}
async function preview(){const o=os().sync;try{o.err="";const list=await pull();pv=diff(list);pv.list=list;o.msg="";save()}catch(e){pv=null;o.err=String(e.message||e).slice(0,120);save()}again()}
function applySync(auto){const o=os().sync;if(!pv)return 0;let add=0,rem=0;
  for(const x of pv.add){const r=addMarine({name:x.name,rank:x.rank||undefined,sec:x.sec||undefined},x.sec||undefined);if(r===null)break;add++}
  /* removals: only when switched on, never more than a quarter of the roster on an automatic run, never on an empty file */
  const base=people().length||1;
  if(o.drop&&pv.total>0&&pv.miss.length&&(!auto||pv.miss.length<=Math.ceil(base*0.25))){for(const m of pv.miss){try{if(typeof delPerson==="function")delPerson(m.id);else S.roster=S.roster.filter(z=>z.id!==m.id);rem++}catch(e){}}}
  o.last=Date.now();o.msg=add+" added"+(o.drop?", "+rem+" removed":"")+".";o.err=pv.miss.length&&o.drop&&auto&&!rem?"Skipped removals: more than a quarter of the roster is missing from the file. Check it, then sync by hand.":"";
  pv=null;save();return add+rem}
function syncHTML(){const o=os().sync;
  return `<div class="panel" id="osSync"><b>Roster sync</b>
    <p class="note">Keep your people in step with a spreadsheet. Publish it as CSV (Google Sheets: File, Share, Publish to web, CSV) and paste the link. Columns: Name (or First and Last), optional Rank and Section.</p>
    <input type="url" id="osSyncUrl" placeholder="https://docs.google.com/…/pub?output=csv" value="${E(o.url)}" autocomplete="off" aria-label="Roster CSV link">
    <label class="note" style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" id="osSyncDrop"${o.drop?" checked":""}> Remove people who are no longer in the file</label>
    <label class="note" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="osSyncAuto"${o.auto?" checked":""}> Sync by itself once a day when the app opens</label>
    <div class="row2" style="margin-top:8px">${btn('id="osSyncGo"',"Preview changes","btn")}</div>
    ${pv?`<div class="note" style="margin:8px 0 0"><b>${pv.add.length} to add</b>${pv.add.length?": "+E(pv.add.slice(0,6).map(x=>x.name).join("; "))+(pv.add.length>6?" +"+(pv.add.length-6):""):""}<br><b>${pv.miss.length} not in the file</b>${pv.miss.length?": "+E(pv.miss.slice(0,6).map(m=>m.name).join("; "))+(pv.miss.length>6?" +"+(pv.miss.length-6):""):""}${pv.miss.length&&!o.drop?" (kept: removal is off)":""}</div>
      <div class="row2" style="margin-top:8px">${btn('id="osSyncApply"',"Apply","btn")}${btn('id="osSyncCancel"',"Cancel")}</div>`:""}
    ${o.err?`<p class="note" style="color:var(--warn);margin:8px 0 0">${E(o.err)}</p>`:""}
    ${o.last?`<p class="note" style="margin:8px 0 0">Last sync ${E(fmtD(o.last))} ${E(fmtT(o.last))}. ${E(o.msg)}</p>`:""}
    <p class="note" style="margin:8px 0 0">Single sign-on and directory sync with Google Workspace, Microsoft Entra or Okta are not built yet. This link sync covers most schools and companies in the meantime.</p></div>`}
function autoSync(){const o=os().sync;if(!o.auto||!o.url||!real()||mem()||Date.now()-o.last<20*36e5)return;
  pull().then(list=>{pv=diff(list);pv.list=list;applySync(true)}).catch(e=>{o.err=String(e.message||e).slice(0,120);o.last=Date.now();save()})}

/* ================= Event webhook ================= */
function hookOK(u){return /^https:\/\/[^\s]+$/i.test(String(u||"").trim())}
async function fire(payload,quiet){const h=os().hook;if(!hookOK(h.url))return false;
  try{await fetch(h.url,{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain"},body:JSON.stringify(Object.assign({app:"Accounted For",team:unitName(),at:new Date().toISOString()},payload))});
    h.last=Date.now();h.err="";save();if(!quiet)toast("Sent");return true}
  catch(e){h.err=String(e.message||e).slice(0,100);save();if(!quiet)toast("Couldn't send: "+h.err);return false}}
function drillPayload(d){return {event:"muster.completed",kind:d.kind,type:d.type||"",expected:d.n,accounted:d.ok,need_help:d.help||0,visitors:d.vis||0,seconds_to_first:d.first!=null?Math.round(d.first/1000):null,seconds_to_all:d.all!=null?Math.round(d.all/1000):null,missing:(d.miss||[]).slice(0,60)}}
document.addEventListener("click",e=>{if(!e.target.closest||!e.target.closest("#rcClose"))return;const h=os().hook;if(!h.drill||!hookOK(h.url))return;
  setTimeout(()=>{const d=(S.drills||[])[0];if(d&&Date.now()-d.end<10000)fire(drillPayload(d),true)},120)},true);
function lateTick(){const h=os().hook;if(!h.late||!hookOK(h.url)||typeof lbLate!=="function")return;const k=dkey();if(h.sentLate.d!==k)h.sentLate={d:k};
  for(const m of lbLate()){if(h.sentLate[m.id])continue;h.sentLate[m.id]=1;save();fire({event:"person.late",person:nm(m),section:m.sec,status:m.status,back_by:typeof lbBackTs==="function"?lbBackTs(m)?new Date(lbBackTs(m)).toISOString():"":""},true)}}
every(60000,lateTick,"os-late");
function hookHTML(){const h=os().hook;
  return `<div class="panel" id="osHook"><b>Event webhook</b>
    <p class="note">Send a message to Zapier, Make, n8n or your own server when something happens. It arrives as JSON in the body of a POST.</p>
    <input type="url" id="osHookUrl" placeholder="https://hooks.zapier.com/hooks/catch/…" value="${E(h.url)}" autocomplete="off" aria-label="Webhook link">
    <label class="note" style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" id="osHookDrill"${h.drill?" checked":""}> When a check-in or drill is closed out</label>
    <label class="note" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="osHookLate"${h.late?" checked":""}> When someone is late signing back in (Logbook)</label>
    <div class="row2" style="margin-top:8px">${btn('id="osHookSave"',"Save","btn")}${btn('id="osHookTest"',"Send a test")}</div>
    ${h.err?`<p class="note" style="color:var(--warn);margin:8px 0 0">${E(h.err)}</p>`:""}${h.last?`<p class="note" style="margin:8px 0 0">Last sent ${E(fmtD(h.last))} ${E(fmtT(h.last))}</p>`:""}
    <p class="note" style="margin:8px 0 0">Names of missing people are included in the drill message. Send it only to a service you trust.</p></div>`}

/* ================= Trust center ================= */
function exportAll(){const R=people().map(m=>({name:m.name,rank:m.rank||"",section:m.sec,status:m.status,place:m.loc||"",note:m.detail||"",last_check_in:m.ckAt?new Date(m.ckAt).toISOString():""}));
  return {exported_at:new Date().toISOString(),app_version:window.AV||"",team:unitName(),people:R,drills:(S.drills||[]).map(d=>Object.assign({},d,{t:new Date(d.t).toISOString(),end:new Date(d.end).toISOString()})),
    logbook:((S.lb&&S.lb.log)||[]).map(e=>({person:e.n,section:e.sec,kind:e.k,status:e.st,place:e.pl,back:e.bk,at:new Date(e.t).toISOString()})),
    reunification:(sfx().reun||[]).map(r=>({person:r.who,released_to:r.to,id_checked:!!r.id,at:new Date(r.t).toISOString()})),
    visitors:Array.isArray(S.vis)?S.vis.map(v=>({name:v.name,company:v.co||"",in:v.in?new Date(v.in).toISOString():"",out:v.out?new Date(v.out).toISOString():""})):[]}}
window.osExportAll=exportAll;
function trustHTML(){const mail=s=>"mailto:administration@accountedforteam.com?subject="+encodeURIComponent(s);
  const row=(a,b,c)=>`<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid var(--line)"><span>${a}</span><b style="color:${c}">${b}</b></div>`;
  return `<div class="panel" id="osTrust"><b>Trust center</b><p class="note">What a school IT lead or a buyer's diligence team asks for.</p>
    <div class="row2">${btn('id="osExport"',"Export all data (JSON)","btn")}${btn('data-sf-open="org"',"Keep and delete records")}</div>
    <p class="note" style="margin:8px 0 0">The export has people, drills, Logbook, reunification and visitors for the open team. Keep it somewhere safe: it has names.</p>
    <div style="margin-top:6px;font-size:14px">${row("Privacy policy and terms","Published","var(--s-onhand)")}${row("Data Processing Agreement","On request","var(--brass)")}${row("Records retention and delete","In the app","var(--s-onhand)")}${row("Single sign-on","Not built","var(--warn)")}${row("Independent security audit","Not done","var(--warn)")}</div>
    <div class="row2" style="margin-top:8px"><a class="btn alt" href="privacy.html" target="_blank" style="text-align:center">Privacy</a><a class="btn alt" href="terms.html" target="_blank" style="text-align:center">Terms</a></div>
    <a class="btn alt" href="${mail("Security questionnaire request")}" style="display:block;text-align:center;margin-top:8px">Ask for the security questionnaire</a></div>`}

/* ================= Share and referral ================= */
function refCode(){const r=os().ref;if(!r.code){r.code=rndId(6).toLowerCase();save()}return r.code}
const refLink=()=>"https://accountedforteam.com/?ref="+refCode();
(function capture(){try{const q=new URLSearchParams(location.search.slice(1)||location.hash.replace(/^#/,""));const c=q.get("ref");if(c&&/^[a-z0-9]{4,12}$/i.test(c)){const o=os();if(!o.refBy){o.refBy=c.toLowerCase();save()}}}catch(e){}})();
const STS=["Invited","Joined","Ran a drill"];
function shareHTML(){const r=os().ref;
  return `<div class="panel" id="osRef"><b>Share Accounted For</b><p class="note">Know another leader who runs a group? Send them your link.</p>
    <div class="note" style="word-break:break-all;background:var(--line);border-radius:8px;padding:10px;margin:0">${E(refLink())}</div>
    <div class="row2" style="margin-top:8px">${btn('id="osRefShare"',"Share","btn")}${btn('id="osRefCopy"',"Copy link")}</div>
    <p class="note" style="margin:10px 0 4px"><b>Who you sent it to</b></p>
    ${r.list.map((x,i)=>`<div style="display:flex;gap:8px;align-items:center;padding:4px 0"><span style="flex:1;min-width:0">${E(x.n)}</span>${btn(`data-os-rst="${i}"`,E(STS[x.s||0]),"chip","cursor:pointer")}${btn(`data-os-rdel="${i}"`,"✕","chip","cursor:pointer")}</div>`).join("")||`<p class="note" style="margin:0">Nobody yet.</p>`}
    <div class="row2" style="margin-top:8px"><input id="osRefName" maxlength="40" placeholder="Name" aria-label="Who you sent it to">${btn('id="osRefAdd"',"Add","btn")}</div>
    <p class="note" style="margin:8px 0 0">This list is a note for you; sign-ups are not counted automatically yet, and no reward is promised.${os().refBy?" You joined through a link from a friend.":""}</p></div>`}

/* ================= Data room (owner) ================= */
function metrics(){const R=teamRows(),all=[];for(const k of (window.TEAMS&&TEAMS.list?TEAMS.list():["plt"])){const b=(k===((S.wsCur==="co"||!S.wsCur)?"plt":S.wsCur))?S:((S.ws||{})[k]||{});for(const d of (Array.isArray(b.drills)?b.drills:[]))all.push(d)}
  const dr=all.filter(d=>d.kind!=="real"),r30=dr.filter(d=>Date.now()-d.t<30*DAY),avg=dr.length?Math.round(100*dr.reduce((a,d)=>a+(d.n?d.ok/d.n:1),0)/dr.length):null;
  let tier="";try{tier=afTier()}catch(e){}
  return {teams:R.length,people:R.reduce((a,r)=>a+r.n,0),drills:dr.length,drills30:r30.length,avg,tier,steps:obSteps().filter(s=>s.ok).length+" of "+obSteps().length}}
function roomHTML(){if(!owner())return "";const m=metrics(),tile=(l,v,pend)=>`<div style="background:var(--line);border-radius:12px;padding:10px"><div class="note" style="margin:0">${l}</div><div style="font-size:22px;font-weight:800;${pend?"color:var(--warn)":""}">${v}</div></div>`;
  return `<div class="panel" id="osRoom"><b>Data room</b><p class="note">The numbers an acquirer asks for. The top row comes from this phone. The rest needs your store and billing accounts, so it shows [PENDING] instead of a guess.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${tile("Teams",m.teams)}${tile("People",m.people)}${tile("Drills run",m.drills)}${tile("Drills, last 30 days",m.drills30)}${tile("Avg accounted for",m.avg==null?"-":m.avg+"%")}${tile("Plan on this phone",m.tier||"-")}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">${tile("MRR","[PENDING]",1)}${tile("Trial to paid","[PENDING]",1)}${tile("Monthly churn","[PENDING]",1)}${tile("Organic installs","[PENDING]",1)}${tile("Retention D7/D30/D90","[PENDING]",1)}${tile("Yearly plan share","[PENDING]",1)}</div>
    <p class="note" style="margin:8px 0 0">To fill the rest: App Store Connect (installs, trials), your billing dashboard (revenue, churn), Supabase (usage). ${E(m.steps)} setup steps finished on this team.</p>
    ${btn('id="osRoomPack"',"Export data room pack","btn","width:100%;margin-top:8px")}</div>`}

/* ================= The Org suite screen ================= */
function html(){if(mem())return `<div class="card"><b>Org suite</b><p class="note">Leaders use this screen.</p></div>`;
  return `<div class="sech"><h2>Org suite</h2><button class="chip" data-go="tools" style="cursor:pointer">◂ Back</button></div>`+consoleHTML()+syncHTML()+hookHTML()+trustHTML()+shareHTML()+roomHTML()}
{const _r=render;render=function(){if(view==="org"){renderTabs();$("#main").innerHTML=html();if(typeof animateView==="function")animateView();return}return _r.apply(this,arguments)}}
{const _t=tabOf;tabOf=function(x){return x==="org"?"tools":_t.apply(this,arguments)}}
try{STAY_VIEWS.push("org")}catch(e){}
{const _rt=renderTools;renderTools=function(){_rt.apply(this,arguments);try{const g=document.querySelector("#main .tgrid");if(!g||mem()||g.querySelector('[data-go="org"]'))return;
  g.insertAdjacentHTML("beforeend",`<button data-go="org"><span class="ic">${svg("people")}</span><span><b>Org suite</b><small>Console, roster sync, webhook, data</small></span></button>`)}catch(e){}}}
document.addEventListener("click",async e=>{const t=e.target;if(!t||!t.closest)return;let x;
  if(view==="org"){
    if(x=t.closest("[data-os-team]")){if(window.TEAMS)TEAMS.switchTo(x.dataset.osTeam);return}
    if(t.closest("#osSyncGo")){const o=os().sync;o.url=$("#osSyncUrl").value.trim();o.drop=$("#osSyncDrop").checked;o.auto=$("#osSyncAuto").checked;save();await preview();return}
    if(t.closest("#osSyncApply")){const n=applySync(false);again();toast(n?"Roster updated":"Nothing to change");return}
    if(t.closest("#osSyncCancel")){pv=null;again();return}
    if(t.closest("#osHookSave")){const h=os().hook,u=$("#osHookUrl").value.trim();if(u&&!hookOK(u)){toast("Use a link that starts with https://");return}h.url=u;h.drill=$("#osHookDrill").checked;h.late=$("#osHookLate").checked;save();again();toast("Saved");return}
    if(t.closest("#osHookTest")){const h=os().hook,u=$("#osHookUrl").value.trim();if(!hookOK(u)){toast("Add a link that starts with https://");return}h.url=u;save();await fire({event:"test",message:"Test from Accounted For"});again();return}
    if(t.closest("#osExport")){shareFile(JSON.stringify(exportAll(),null,2),safe(unitName()+" data export "+dkey())+".json","application/json");return}
    if(x=t.closest("[data-sf-open]")){S.sf=sfx();S.sf.tab=x.dataset.sfOpen;save();view="safety";render();return}
    if(t.closest("#osRefCopy")){try{await navigator.clipboard.writeText(refLink());toast("Link copied")}catch(err){toast(refLink())}return}
    if(t.closest("#osRefShare")){const d={title:"Accounted For",text:"Accounted For: live team check-in for iPhone.",url:refLink()};try{if(navigator.share)await navigator.share(d);else{await navigator.clipboard.writeText(refLink());toast("Link copied")}}catch(err){}return}
    if(t.closest("#osRefAdd")){const i=$("#osRefName"),v=i&&i.value.trim();if(!v)return;const r=os().ref;r.list.push({n:v.slice(0,40),s:0,t:Date.now()});r.list=r.list.slice(-50);save();again();return}
    if(x=t.closest("[data-os-rst]")){const r=os().ref,it=r.list[+x.dataset.osRst];if(it){it.s=((it.s||0)+1)%3;save();again()}return}
    if(x=t.closest("[data-os-rdel]")){os().ref.list.splice(+x.dataset.osRdel,1);save();again();return}
    if(t.closest("#osRoomPack")){shareFile(JSON.stringify({exported_at:new Date().toISOString(),local:metrics(),pending:["MRR","Trial to paid","Monthly churn","Organic installs","Retention D7/D30/D90","Yearly plan share"],note:"Pending items need App Store Connect, billing and Supabase."},null,2),safe("Data room pack "+dkey())+".json","application/json");return}
  }
  if(x=t.closest("[data-go]")){const g=x.dataset.go;if(["invite","send","logins"].includes(g)){const o=os();if(!o.ob.shared){o.ob.shared=1;save()}}}
},true);

/* ================= First-drill checklist and yearly nudge (Home) ================= */
function obSteps(){const o=os();return [
  {k:"name",t:"Name your team",s:"Give it a name your people know",ok:!!cleanName(S.unit)&&real(),go:"tools"},
  {k:"add",t:"Add your people",s:"Paste a list or import a spreadsheet",ok:people().length>=2,go:"people"},
  {k:"drill",t:"Run a practice check-in",s:"Watch the headcount fill as people answer",ok:(S.drills||[]).length>0,go:"recall"},
  {k:"share",t:"Get your people on the app",s:"Send the check-in link or invite a co-leader",ok:!!o.ob.shared,go:"invite"}]}
function obHTML(){const st=obSteps(),n=st.filter(x=>x.ok).length,nx=st.find(x=>!x.ok);
  return `<div class="card" id="obCard" style="margin-top:10px"><b>Run your first drill in 60 seconds</b><div style="display:flex;align-items:center;gap:10px;margin:8px 0"><div style="flex:1;height:8px;border-radius:6px;background:var(--line)"><div style="height:100%;width:${25*n}%;border-radius:6px;background:var(--brass)"></div></div><span class="note" style="margin:0">${n} of ${st.length}</span></div>
    ${st.map(x=>`<div style="display:flex;gap:8px;align-items:center;padding:3px 0;${x.ok?"opacity:.6":""}"><span aria-hidden="true">${x.ok?"✓":"○"}</span><span style="flex:1"><b>${E(x.t)}</b></span></div>`).join("")}
    <div class="row2" style="margin-top:8px">${nx?btn(`data-go="${nx.go}"`,E(nx.t),"btn"):""}${btn('id="obHide"',"Hide")}</div></div>`}
function yrHTML(){return `<div class="card" id="yrCard" style="margin-top:10px"><b>Save with the yearly plan</b><p class="note" style="margin:4px 0 8px">Yearly Pro is $99.99 against $9.99 a month, about 17% less. Yearly Org is $249 against $29.99 a month, about 31% less.</p><div class="row2">${btn('data-pro-open="yr"',"See yearly","btn")}${btn('id="yrHide"',"Not now")}</div></div>`}
const monthly=()=>{try{const N=window.MBN;return !!(N&&N.on&&N.pro&&N.pro.active&&/\.(pro|org)\.monthly$/.test(String(N.pro.pid||"")))}catch(e){return false}};
{const _rb=renderBoard;renderBoard=function(){const r=_rb.apply(this,arguments);try{if(mem())return r;const main=$("#main");if(!main)return r;const o=os();
  const done=obSteps().every(x=>x.ok);
  if(!o.ob.hide&&!done&&!main.querySelector("#obCard"))main.insertAdjacentHTML("beforeend",obHTML());
  if(monthly()&&!(o.yrHide&&Date.now()-o.yrHide<30*DAY)&&Date.now()-o.first>14*DAY&&!main.querySelector("#yrCard"))main.insertAdjacentHTML("beforeend",yrHTML())}catch(e){}return r}}
document.addEventListener("click",e=>{const t=e.target;if(!t||!t.closest)return;
  if(t.closest("#obHide")){os().ob.hide=1;save();const c=$("#obCard");if(c)c.remove();return}
  if(t.closest("#yrHide")){os().yrHide=Date.now();save();const c=$("#yrCard");if(c)c.remove()}},true);

/* ================= Safety tabs: Plan, Reunite, Quiet ================= */
function yEnd(){const n=new Date(),y=n.getMonth()>=7?n.getFullYear()+1:n.getFullYear();return new Date(y,6,31,23,59,59).getTime()}
const dateOf=s=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||""));return m?new Date(+m[1],+m[2]-1,+m[3],8,0,0).getTime():0};
const planList=()=>os().plan.filter(p=>dateOf(p.d)).sort((a,b)=>dateOf(a.d)-dateOf(b.d));
function atRisk(){let P=[];try{P=window.proSafety?proSafety.progress():[]}catch(e){}const up=planList().filter(p=>dateOf(p.d)>=Date.now()&&dateOf(p.d)<=yEnd()&&!p.done);
  return P.map(it=>{const sched=up.filter(p=>it.of.includes(p.type)).length;return {l:it.l,need:Math.max(0,it.n-it.got),sched,short:Math.max(0,it.n-it.got-sched)}}).filter(x=>x.need>0)}
const LIDS=[7811,7812,7813,7814,7815,7816,7817,7818,7819,7820];
function remind(){try{if(!(window.MBN&&MBN.on&&MBN.LN))return;MBN.LN.cancel({notifications:LIDS.map(id=>({id}))});
  const up=planList().filter(p=>!p.done&&dateOf(p.d)-DAY>Date.now()).slice(0,LIDS.length);
  if(up.length)MBN.LN.schedule({notifications:up.map((p,i)=>({id:LIDS[i],title:typeName(p.type)+" drill tomorrow",body:unitName()+": "+typeName(p.type)+" drill is scheduled for "+fmtD(dateOf(p.d))+".",schedule:{at:new Date(dateOf(p.d)-DAY),allowWhileIdle:true}}))})}catch(e){}}
function planIcs(){const L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Accounted For//Drills//EN","X-WR-CALNAME:"+unitName()+" drills"];const st=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d+/,"");
  planList().forEach((p,i)=>{const d=p.d.replace(/-/g,"");const nx=new Date(dateOf(p.d)+DAY),n=nx.getFullYear()+String(nx.getMonth()+1).padStart(2,"0")+String(nx.getDate()).padStart(2,"0");
    L.push("BEGIN:VEVENT","UID:drill-"+d+"-"+p.type+"-"+i+"@accountedfor","DTSTAMP:"+st,"DTSTART;VALUE=DATE:"+d,"DTEND;VALUE=DATE:"+n,"SUMMARY:"+typeName(p.type)+" drill"+(p.note?" ("+String(p.note).replace(/[,;\\\n]/g," ")+")":""),"END:VEVENT")});
  L.push("END:VCALENDAR");return L.join("\r\n")+"\r\n"}
window.osPlanIcs=planIcs;
function planHTML(){const r=atRisk(),P=planList(),today=dkey();
  return `<div class="panel" id="osPlan"><b>Plan your drills</b><p class="note">Schedule the drills you still need this year. The phone reminds you the day before.</p>
    ${r.length?r.map(x=>`<div style="display:flex;justify-content:space-between;padding:4px 0"><span>${E(x.l)}: ${x.need} still needed, ${x.sched} planned</span><b style="color:var(${x.short?"--warn":"--s-onhand"})">${x.short?x.short+" not planned":"Planned"}</b></div>`).join(""):`<p class="note" style="margin:0">Nothing outstanding for this year's rules.</p>`}
    <div class="row2" style="margin-top:10px"><input type="date" id="osPlD" min="${E(today)}" aria-label="Drill date"><select id="osPlT" class="wsel" aria-label="Drill type">${TYPES.map(([k,l])=>`<option value="${k}">${l}</option>`).join("")}</select></div>
    <input id="osPlN" maxlength="40" placeholder="Note (optional): which grades, which building" aria-label="Note" style="margin-top:6px">
    ${btn('id="osPlAdd"',"Add to plan","btn","width:100%;margin-top:6px")}
    ${P.map(p=>`<div class="rrow" style="--sc:var(${p.done?"--s-onhand":dateOf(p.d)<Date.now()?"--warn":"--brass"});margin-top:8px"><div class="rtop"><div class="who"><b>${E(fmtD(dateOf(p.d)))} · ${E(typeName(p.type))}</b>${p.note?`<div class="ph">${E(p.note)}</div>`:""}</div><div class="evts">${p.done?`<span class="chip">Done</span>`:btn(`data-os-pdone="${E(p.id)}"`,"Done","chip","cursor:pointer")}${btn(`data-os-pdel="${E(p.id)}"`,"✕","chip","cursor:pointer")}</div></div></div>`).join("")}
    ${P.length?btn('id="osPlIcs"',"Add to my calendar (.ics)","btn alt","width:100%;margin-top:8px"):""}</div>`}
function reunHTML(){const r=os().reun,P=people(),stOf=m=>(r.state[m.id]||{}).s||"w";
  const c={w:0,h:0,r:0};P.forEach(m=>c[stOf(m)]++);const sel=P.find(m=>m.id===r.sel);
  const gs=sel?(r.guard[sel.id]||[]):[];
  return `<div class="panel" id="osReun"><b>Reunification</b><p class="note">Release each person to an approved guardian, with the time and who signed. Stays on this phone.</p>
    <input id="osRSite" maxlength="40" placeholder="Reunification site (Gym, Field…)" value="${E(r.site)}" aria-label="Site">
    <div style="display:flex;gap:8px;margin:8px 0"><div style="flex:1;text-align:center;background:var(--line);border-radius:10px;padding:8px"><b style="font-size:20px">${c.w}</b><div class="note" style="margin:0">Waiting</div></div><div style="flex:1;text-align:center;background:var(--line);border-radius:10px;padding:8px"><b style="font-size:20px">${c.h}</b><div class="note" style="margin:0">Guardian here</div></div><div style="flex:1;text-align:center;background:var(--line);border-radius:10px;padding:8px"><b style="font-size:20px">${c.r}</b><div class="note" style="margin:0">Released</div></div></div>
    <select id="osRPick" class="wsel" aria-label="Person"><option value="">Choose a person</option>${P.map(m=>`<option value="${E(m.id)}"${m.id===r.sel?" selected":""}>${E(nm(m))}${stOf(m)==="r"?" · released":stOf(m)==="h"?" · guardian here":""}</option>`).join("")}</select>
    ${sel?`<div class="card" style="margin-top:8px"><b>${E(nm(sel))}</b><div class="note" style="margin:2px 0 6px">Approved guardians</div>
      ${gs.map((g,i)=>`<div class="rrow" style="--sc:var(--brass);margin-top:6px"><div class="rtop"><div class="who"><b>${E(g.n)}</b> <span class="note">${E(g.rel||"")}${g.ph?" · "+E(g.ph):""}</span></div><div class="evts">${stOf(sel)==="r"?"":btn(`data-os-grel="${i}"`,"Release to","chip","cursor:pointer")}${btn(`data-os-gdel="${i}"`,"✕","chip","cursor:pointer")}</div></div></div>`).join("")||`<p class="note" style="margin:0">No guardians yet.</p>`}
      <div class="row2" style="margin-top:8px"><input id="osGN" maxlength="40" placeholder="Guardian name" aria-label="Guardian name"><input id="osGR" maxlength="20" placeholder="Relation" aria-label="Relation"></div><input id="osGP" type="tel" maxlength="20" placeholder="Phone (optional)" aria-label="Guardian phone" style="margin-top:6px">${btn('id="osGAdd"',"Add guardian","btn alt","width:100%;margin-top:6px")}
      <label class="note" style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" id="osRId"> I checked the guardian's ID</label>
      ${stOf(sel)==="r"?`<p class="note">Released ${E(fmtT((r.state[sel.id]||{}).t))} to ${E((r.state[sel.id]||{}).to||"")}.</p>${btn('id="osRUndo"',"Undo release","btn alt","width:100%")}`:`${stOf(sel)==="h"?"":btn('id="osRHere"',"Mark guardian here","btn alt","width:100%;margin-top:6px")}`}</div>`:""}
    <div class="row2" style="margin-top:10px">${btn('id="osRCsv"',"Export log")}${btn('id="osRReset"',armed==="osrreset"?"Tap again to reset":"New event")}</div></div>`}
function releaseTo(i){const r=os().reun,m=people().find(x=>x.id===r.sel);if(!m)return;const g=(r.guard[m.id]||[])[i];if(!g)return;const chk=$("#osRId");if(!chk||!chk.checked){toast("Check the guardian's ID first");return}
  const t=Date.now();r.state[m.id]={s:"r",t,to:g.n};sfx().reun.unshift({t,who:nm(m),to:g.n+(g.rel?" ("+g.rel+")":""),id:true,site:r.site||""});sfx().reun=sfx().reun.slice(0,500);
  try{actAdd("🤝",nm(m)+" released to "+g.n,"safety")}catch(e){}save();again();toast(nm(m)+" released")}
const holdMs=()=>window.__osHold||2000;
let hT=0,hS=0;
function quietHTML(){return `<div class="panel" id="osQuiet"><b>Quiet alert</b><p class="note">Quietly tell your team's leaders you need help. No sound and no banner on your screen.</p>
    <div style="display:flex;justify-content:center;padding:14px 0"><button type="button" id="osHold" aria-label="Hold for 2 seconds to send a quiet alert" style="width:170px;height:170px;border-radius:50%;border:0;background:#e5484d;color:#fff;font:800 18px/1.25 system-ui;touch-action:none"><span id="osHoldT">Hold 2 seconds<br>to send</span></button></div>
    <label class="note" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="osDisc"${os().quietDisc===false?"":" checked"}> After sending, show a plain screen</label>
    <p class="note" style="margin:8px 0 0">Goes to leaders with your name and, if allowed, your location. <b>This does not call 911.</b> In an emergency call your local emergency number. You need to be on a team with Word of Mouth set up.</p></div>`}
async function quietSend(){const _v=navigator.vibrate;try{navigator.vibrate=()=>true}catch(e){}
  try{if(typeof window.sosSend==="function"){window.sosSetKind&&window.sosSetKind("Help");await window.sosSend()}else toast("Quiet alert needs your team set up first")}finally{try{navigator.vibrate=_v}catch(e){}}
  if(os().quietDisc!==false)discreet()}
function discreet(){if(document.getElementById("osDiscScr"))return;const d=new Date();
  document.body.insertAdjacentHTML("beforeend",`<div id="osDiscScr" style="position:fixed;inset:0;z-index:99999;background:#fff;color:#111;font-family:system-ui;padding:60px 24px"><div style="font-size:15px;color:#c0392b;font-weight:700">${E(d.toLocaleDateString([],{weekday:"long"}))}</div><div style="font-size:54px;font-weight:300">${E(d.getDate())}</div><div style="font-size:18px;color:#555;margin-top:8px">${E(d.toLocaleDateString([],{month:"long",year:"numeric"}))}</div><div style="margin-top:28px;color:#888">No events today</div><button type="button" id="osDiscX" aria-label="Close" style="position:fixed;top:14px;left:14px;width:44px;height:44px;opacity:.02;border:0;background:#fff"></button></div>`);
  let n=0;const x=document.getElementById("osDiscX");x.addEventListener("click",()=>{if(++n>=3)document.getElementById("osDiscScr").remove()})}
window.osDiscreet=discreet;
window.osTabs={plan:planHTML,reunite:reunHTML,quiet:quietHTML};
document.addEventListener("pointerdown",e=>{const b=e.target.closest&&e.target.closest("#osHold");if(!b)return;hS=Date.now();clearTimeout(hT);const t=document.getElementById("osHoldT");if(t)t.innerHTML="Keep holding…";
  hT=setTimeout(()=>{hT=0;quietSend()},holdMs())},true);
for(const ev of ["pointerup","pointercancel","pointerleave"])document.addEventListener(ev,e=>{if(!hT)return;if(ev==="pointerleave"&&!(e.target.closest&&e.target.closest("#osHold")))return;clearTimeout(hT);hT=0;const t=document.getElementById("osHoldT");if(t)t.innerHTML="Hold 2 seconds<br>to send"},true);
document.addEventListener("click",e=>{const t=e.target;if(!t||!t.closest||view!=="safety")return;let x;
  if(t.closest("#osPlAdd")){const d=$("#osPlD").value;if(!dateOf(d)){toast("Pick a date");return}os().plan.push({id:"p"+Date.now().toString(36)+rndId(3),d,type:$("#osPlT").value,note:$("#osPlN").value.trim().slice(0,40)});save();remind();again();return}
  if(x=t.closest("[data-os-pdone]")){const p=os().plan.find(z=>z.id===x.dataset.osPdone);if(p){p.done=1;save();remind();again()}return}
  if(x=t.closest("[data-os-pdel]")){os().plan=os().plan.filter(z=>z.id!==x.dataset.osPdel);save();remind();again();return}
  if(t.closest("#osPlIcs")){shareFile(planIcs(),safe(unitName()+" drills")+".ics","text/calendar");return}
  if(x=t.closest("[data-os-grel]")){releaseTo(+x.dataset.osGrel);return}
  if(x=t.closest("[data-os-gdel]")){const r=os().reun;(r.guard[r.sel]||[]).splice(+x.dataset.osGdel,1);save();again();return}
  if(t.closest("#osGAdd")){const r=os().reun,n=$("#osGN").value.trim();if(!r.sel||!n){toast("Add the guardian's name");return}(r.guard[r.sel]=r.guard[r.sel]||[]).push({n:n.slice(0,40),rel:$("#osGR").value.trim().slice(0,20),ph:$("#osGP").value.trim().slice(0,20)});save();again();return}
  if(t.closest("#osRHere")){const r=os().reun;if(r.sel){r.state[r.sel]={s:"h",t:Date.now()};save();again()}return}
  if(t.closest("#osRUndo")){const r=os().reun;if(r.sel){delete r.state[r.sel];save();again()}return}
  if(t.closest("#osRCsv")){const q=s=>'"'+String(s).replace(/"/g,'""')+'"';shareFile(["Date","Time","Person","Released to","ID checked","Site"].map(q).join(",")+"\r\n"+sfx().reun.map(r=>[new Date(r.t).toLocaleDateString(),fmtT(r.t),r.who,r.to,r.id?"Yes":"No",r.site||""].map(q).join(",")).join("\r\n"),safe(unitName()+" reunification")+".csv","text/csv");return}
  if(t.closest("#osRReset")){if(armed!=="osrreset"){armed="osrreset";again();setTimeout(()=>{if(armed==="osrreset"){armed=null;if(view==="safety")again()}},4000);return}armed=null;const r=os().reun;r.state={};r.sel="";save();again();toast("New event started")}},true);
document.addEventListener("change",e=>{const t=e.target;if(!t||!t.id)return;
  if(t.id==="osRPick"){os().reun.sel=t.value;save();again()}
  else if(t.id==="osRSite"){os().reun.site=t.value.trim().slice(0,40);save()}
  else if(t.id==="osDisc"){os().quietDisc=!!t.checked;save()}});

/* ================= iPhone: hand the headcount to the Live Activity / widget plugin ================= */
let lastAct="";
function actBeat(){const N=window.MBN;if(!N||!N.on||!N.MusterActivity)return;const rc=S.rc;
  try{if(rc&&rc.open&&typeof recallPool==="function"){const p=recallPool(),res=rc.res||{},n=p.filter(m=>res[m.id]==="ok").length,t=p.length,sig=n+"/"+t;
      if(sig!==lastAct){lastAct=sig;N.MusterActivity.update({n,t,unit:unitName(),start:rc.start||Date.now(),kind:rc.kind==="real"?"real":"drill"}).catch(()=>{})}}
    else if(lastAct){lastAct="";N.MusterActivity.end().catch(()=>{})}}catch(e){}}
every(4000,actBeat,"os-activity");
window.osActBeat=actBeat;

setTimeout(()=>{try{os();autoSync();remind()}catch(e){}},2200);
window.orgSuite={parseRoster,diff,exportAll,planIcs,atRisk,obSteps,metrics,refLink};
})();
