/* Accounted For Pro — Safety suite.
   One Pro screen (Tools > Safety) with five parts:
   1. Drill report: state drill rules (Michigan, Texas, or your own), progress for the school year, a PDF report, and text for the school website.
   2. Tap-in posters: one printable QR poster per muster point (uses the live check-in link).
   3. Check-in timer: lone-worker timer; missed check-in reminds you, then alerts the team with your location.
   4. Response actions: one tap Hold / Secure / Lockdown / Evacuate / Shelter / All clear to everyone, plus a reunification log.
   5. Data & privacy: retention, delete, privacy links, Data Processing Agreement and single sign-on requests.
   Everything stays on this phone except the team alert, which goes through Word of Mouth like any urgent post. */
(()=>{
const TABS=[["drills","Drills"],["tapin","Tap-in"],["alone","Timer"],["actions","Actions"],["org","Data"]];
const TYPES=[["fire","Fire"],["tornado","Tornado"],["lockdown","Lockdown"],["secure","Secure"],["evac","Evacuate"],["shelter","Shelter"]];
const SEC_T=["lockdown","secure","shelter","evac"];
/* Rules from state agency pages (checked Nov 2026). Districts can require more: confirm with yours. */
const RULES={
  MI:{name:"Michigan",src:"Michigan State Police, MCL 29.19",post:30,items:[{k:"fire",l:"Fire",n:5,of:["fire"]},{k:"tornado",l:"Tornado",n:2,of:["tornado"]},{k:"sec",l:"Safety / security",n:3,of:SEC_T}]},
  TX:{name:"Texas",src:"19 TAC §103.1209",post:0,items:[{k:"secure",l:"Secure",n:1,of:["secure"]},{k:"lockdown",l:"Lockdown",n:2,of:["lockdown"]},{k:"evac",l:"Evacuation",n:1,of:["evac"]},{k:"shelter",l:"Shelter",n:1,of:["shelter"]},{k:"fire",l:"Fire",n:4,of:["fire"]}]}
};
const ACTS=[
  {k:"hold",l:"Hold",s:"Stay in your room, hallways clear",c:"#0857e8",t:"HOLD: Stay in your room or area. Keep hallways clear until further notice."},
  {k:"secure",l:"Secure",s:"Get inside, lock outside doors",c:"#1b6f8a",t:"SECURE: Get inside and lock outside doors. Business as usual inside."},
  {k:"lockdown",l:"Lockdown",s:"Lock doors, stay quiet",c:"#b3261e",t:"LOCKDOWN: Lock doors, lights off, stay quiet and out of sight."},
  {k:"evac",l:"Evacuate",s:"Go to your assembly point",c:"#9a5b00",t:"EVACUATE: Go to your assembly point now and check in."},
  {k:"shelter",l:"Shelter",s:"Weather or hazard",c:"#4b4fa3",t:"SHELTER: Take cover for the hazard. Stay put until told otherwise."},
  {k:"clear",l:"All clear",s:"End the event",c:"#1b7a3a",t:"ALL CLEAR: The event is over. Return to normal."}
];
const LIDS=[7801,7802,7803];
function sf(){if(!S.sf||typeof S.sf!=="object")S.sf={};const c=S.sf;const d={tab:"drills",rule:"MI",school:"",dtype:"fire",keep:0,act:null};
  for(const k of Object.keys(d))if(c[k]===undefined)c[k]=d[k];
  if(!Array.isArray(c.pts))c.pts=[];if(!Array.isArray(c.reun))c.reun=[];if(!c.custom||typeof c.custom!=="object")c.custom={};
  if(!c.al||typeof c.al!=="object")c.al={};const a=c.al;if(a.min===undefined)a.min=30;if(a.on===undefined)a.on=false;if(a.due===undefined)a.due=0;if(a.sup===undefined)a.sup="";if(a.st===undefined)a.st=0;return c}
const drills=()=>Array.isArray(S.drills)?S.drills:[];
const hm=t=>new Date(t).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
const dd=t=>new Date(t).toLocaleDateString([],{month:"short",day:"numeric",year:"numeric"});
const dur=ms=>{if(ms==null)return"";const s=Math.round(ms/1000);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
/* school year: Aug 1 to Jul 31 */
function yearStart(d=new Date()){const y=d.getMonth()>=7?d.getFullYear():d.getFullYear()-1;return new Date(y,7,1).getTime()}
const yearLabel=()=>{const y=new Date(yearStart()).getFullYear();return y+"-"+String(y+1).slice(2)};
function ruleSet(){const c=sf();if(c.rule==="custom"){const items=TYPES.map(([k,l])=>({k,l,n:+c.custom[k]||0,of:[k]})).filter(x=>x.n>0);return{name:"Your rules",src:"Set by you",post:0,items}}return RULES[c.rule]||RULES.MI}
function yearDrills(){const a=yearStart();return drills().filter(d=>d.kind!=="real"&&d.t>=a)}
function progress(){const L=yearDrills();return ruleSet().items.map(it=>({...it,got:L.filter(d=>it.of.includes(d.type)).length}))}
function typeName(k){const t=TYPES.find(x=>x[0]===k);return t?t[1]:"Untagged"}
const bar=(p,c)=>`<div style="height:8px;border-radius:99px;background:var(--line)"><div style="height:8px;width:${Math.min(100,p)}%;border-radius:99px;background:var(${c||"--brass"})"></div></div>`;
const ago=t=>{const m=Math.round((Date.now()-t)/60000);return m<1?"just now":m<60?m+" min ago":Math.round(m/60)+" hr ago"};

/* ---------- 1. drill report ---------- */
function drillsHTML(){const c=sf(),R=ruleSet(),P=progress(),L=yearDrills();
  let h=`<div class="panel"><b>Drill rules</b><div class="evts" role="group" aria-label="Rule set">${[["MI","Michigan"],["TX","Texas"],["custom","Custom"]].map(([k,l])=>`<button data-sf-rule="${k}" aria-pressed="${c.rule===k}">${l}</button>`).join("")}</div>
    <p class="note">${esc(R.src)}. Your district may require more: confirm with it. School year ${esc(yearLabel())}.</p>`;
  if(c.rule==="custom")h+=`<div class="grid2" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${TYPES.map(([k,l])=>`<label class="note" style="margin:0">${l} per year<input type="number" min="0" max="40" inputmode="numeric" data-sf-cus="${k}" value="${+c.custom[k]||0}"></label>`).join("")}</div>`;
  h+=P.length?P.map(p=>`<div style="margin-top:10px"><div style="display:flex;justify-content:space-between"><b>${esc(p.l)}</b><span class="note" style="margin:0">${p.got} of ${p.n}</span></div>${bar(100*p.got/p.n,p.got>=p.n?"--s-onhand":p.got?"--brass":"--warn")}</div>`).join(""):`<p class="note">Set how many of each drill you need per year.</p>`;
  h+=`</div><div class="panel"><b>This drill is a…</b><div class="evts" role="group" aria-label="Drill type for the next check-in you close">${TYPES.map(([k,l])=>`<button data-sf-dty="${k}" aria-pressed="${c.dtype===k}">${l}</button>`).join("")}</div>
    <p class="note">Close out a check-in on the Recall screen and it is logged with this type. You can fix the type below.</p></div>`;
  h+=`<div class="panel"><b>This school year (${L.length})</b>${L.length?L.slice(0,10).map(d=>`<div class="rrow" style="--sc:var(--s-onhand);margin-top:8px"><div class="rtop"><div class="who"><b>${esc(dd(d.t))} ${esc(hm(d.t))}</b> · ${d.ok}/${d.n} accounted${d.all!=null?` · ${dur(d.all)} to everyone`:""}
      <div class="evts" style="margin-top:6px">${TYPES.map(([k,l])=>`<button data-sf-tag="${esc(d.id)}|${k}" aria-pressed="${d.type===k}">${l}</button>`).join("")}</div></div></div></div>`).join(""):`<p class="note">No drills logged yet this year. Run one from Recall.</p>`}
    <div class="row2" style="margin-top:10px"><button class="btn" id="sfPdf">Export report (PDF)</button><button class="btn alt" id="sfWeb">Text for website</button></div>
    ${R.post?`<p class="note">${esc(R.name)} asks schools to post each drill within about ${R.post} school days. The website text has the date, time and drill type.</p>`:""}</div>`;
  return h}
function reportPDF(){const R=ruleSet(),P=progress(),L=yearDrills();const M=44,doc=makePDF("Drill report");
  doc.line(unitName()+" · Drill report",{size:16,bold:true});doc.line("School year "+yearLabel()+" · "+R.name+" ("+R.src+")",{size:10,gray:true});doc.gap(6);doc.rule();
  doc.line("Requirements this year",{size:12,bold:true});
  for(const p of P)doc.row([{x:M,t:p.l,w:200},{x:260,t:p.got+" of "+p.n+(p.got>=p.n?"  done":""),w:120}]);
  doc.gap(6);doc.rule();doc.line("Drills",{size:12,bold:true});
  doc.row([{x:M,t:"Date",w:90},{x:140,t:"Time",w:60},{x:205,t:"Type",w:80},{x:290,t:"Accounted",w:80},{x:375,t:"Time to everyone",w:100},{x:480,t:"Missing",w:60}],{bold:true,fill:true});
  for(const d of L.slice().reverse())doc.row([{x:M,t:dd(d.t),w:90},{x:140,t:hm(d.t),w:60},{x:205,t:typeName(d.type),w:80},{x:290,t:d.ok+"/"+d.n,w:80},{x:375,t:d.all!=null?dur(d.all):"-",w:100},{x:480,t:String(d.missN||0),w:60}]);
  if(!L.length)doc.line("No drills logged this year.",{gray:true});return doc.out()}
function webText(){const R=ruleSet(),L=yearDrills().slice().reverse();return L.map(d=>`${unitName()} · School year ${yearLabel()}\nDate and time: ${dd(d.t)} ${hm(d.t)}\nDrill type: ${typeName(d.type)}\nPeople accounted for: ${d.ok} of ${d.n}${d.all!=null?"\nTime to account for everyone: "+dur(d.all):""}`).join("\n\n")||"No drills logged yet."}
function savePDF(bytes,name){const blob=new Blob([bytes],{type:"application/pdf"});const file=typeof File==="function"?new File([blob],name,{type:"application/pdf"}):null;
  if(file&&navigator.canShare&&navigator.canShare({files:[file]})&&!(window.MBN&&MBN.on)){navigator.share({files:[file],title:name}).catch(()=>{});return}
  const u=URL.createObjectURL(blob);const a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000)}
const safeName=s=>String(s).replace(/[^\w -]+/g,"").trim()||"report";

/* ---------- 2. tap-in posters ---------- */
function tapinHTML(){const c=sf(),live=S.rc&&S.rc.open;
  return `<div class="panel"><b>Muster points</b><p class="note">One poster per assembly point. People scan it with their phone camera to check in at that point. No app needed to check in.</p>
    <div class="row2"><input id="sfPt" maxlength="30" placeholder="Assembly Point B, Front lot…" aria-label="Muster point name"><button class="btn" id="sfPtAdd">Add</button></div>
    ${c.pts.map((p,i)=>`<div class="rrow" style="--sc:var(--brass);margin-top:8px"><div class="rtop"><div class="who"><b>${esc(p)}</b></div><div class="evts"><button data-sf-poster="${i}"${live?"":" disabled"}>Poster</button><button data-sf-ptdel="${i}" aria-label="Remove ${esc(p)}">✕</button></div></div></div>`).join("")||`<p class="note">No points yet. Add your first one above.</p>`}
    <p class="note">${live?"Posters use the live check-in link for the check-in that is open now.":"Start a check-in on Recall first: each poster carries that check-in's link, so print them when you start a drill."}</p></div>`}
async function posterPDF(name){await loadLib("lib/qrcode.js","qrcode");const qr=qrcode(0,"M");qr.addData(ciLink()+"&pt="+encodeURIComponent(name));qr.make();
  const n=qr.getModuleCount(),size=360,cs=size/n,ox=126,oy=330;let ops="0 0 0 rg\n";
  for(let r=0;r<n;r++)for(let q=0;q<n;q++)if(qr.isDark(r,q))ops+=`${(ox+q*cs).toFixed(2)} ${(oy+(n-1-r)*cs).toFixed(2)} ${(cs+.2).toFixed(2)} ${(cs+.2).toFixed(2)} re f\n`;
  const T=(s,x,y,sz,f)=>`BT /${f} ${sz} Tf 0 0 0 rg ${x} ${y} Td (${String(s).replace(/[^\x20-\x7e]/g,"?").replace(/[\\()]/g,c=>"\\"+c)}) Tj ET\n`;
  const body=T("Scan to check in",150,700,34,"F2")+T(name.slice(0,34),Math.max(40,306-name.slice(0,34).length*8),650,24,"F2")+ops+T("Point your phone camera at the code.",160,290,16,"F1")+T(unitName().slice(0,40)+" · Accounted For",170,60,12,"F1");
  const o=["<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids [3 0 R] /Count 1 >>","<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>","<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>","<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",`<< /Length ${body.length} >>\nstream\n${body}endstream`];
  let s="%PDF-1.4\n";const off=[];o.forEach((x,i)=>{off.push(s.length);s+=`${i+1} 0 obj\n${x}\nendobj\n`});const xr=s.length;
  s+=`xref\n0 ${o.length+1}\n0000000000 65535 f \n`+off.map(v=>String(v).padStart(10,"0")+" 00000 n \n").join("")+`trailer\n<< /Size ${o.length+1} /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`;
  const b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i)&255;return b}

/* ---------- 3. check-in timer ---------- */
const alOn=()=>{const a=sf().al;return a.on&&a.due};
function cancelAl(){try{window.MBN&&MBN.on&&MBN.LN.cancel({notifications:LIDS.map(id=>({id}))})}catch(e){}}
function schedAl(){cancelAl();const a=sf().al;if(!a.on||!window.MBN||!MBN.on)return;
  const mk=(id,ms,title,body)=>({id,title,body,schedule:{at:new Date(a.due+ms),allowWhileIdle:true}});
  try{MBN.LN.schedule({notifications:[mk(LIDS[0],0,"Check in now","Tap I'm OK in Accounted For."),mk(LIDS[1],120000,"You missed your check-in","Call your supervisor or check in."),mk(LIDS[2],300000,"Your team is being alerted","You are 5 minutes late.")]})}catch(e){}}
function alStart(min){const a=sf().al;a.min=min;a.on=true;a.due=Date.now()+min*60000;a.st=0;save();schedAl();redraw()}
function alOK(){const a=sf().al;a.due=Date.now()+a.min*60000;a.st=0;save();schedAl();redraw();toast("Checked in. Next one in "+a.min+" min")}
function alStop(){const a=sf().al;a.on=false;a.due=0;a.st=0;save();cancelAl();redraw();toast("Timer off")}
function where(){return new Promise(res=>{if(!navigator.geolocation)return res("");navigator.geolocation.getCurrentPosition(p=>res(` Last location: https://maps.apple.com/?ll=${p.coords.latitude.toFixed(5)},${p.coords.longitude.toFixed(5)}`),()=>res(""),{timeout:6000,maximumAge:120000})})}
async function postTeam(txt){const f=typeof mainFeed==="function"&&mainFeed();if(!f||!f.lk){toast("Word of Mouth isn't set up on this phone, so no team alert was sent.");return false}
  try{const ct=await fdEnc(f.ek,{t:txt,u:true,to:{k:"all"},sa:SECTIONS.map(x=>x[0]),by:fdBy(f)});const id=await SB.rpc("feed_post",{p_feed:f.id,p_leader_key:f.lk,p_ct:ct});SB.notify(null,{feed:f.id,lk:f.lk,urg:true});
    f.posts=[{id:+id,t:Date.now(),txt,urg:true,to:{k:"all"},by:fdBy(f)}].concat(f.posts||[]);save();return true}catch(e){toast("Couldn't reach the team. Try again.");return false}}
async function alTick(){const a=sf().al;if(!a.on||!a.due)return;const late=Date.now()-a.due;if(late<0)return;
  if(a.st<1){a.st=1;save();try{navigator.vibrate&&navigator.vibrate([300,120,300])}catch(e){}toast("Check in now");redraw()}
  if(a.st<2&&late>=120000){a.st=2;save();redraw()}
  if(a.st<3&&late>=300000){a.st=3;save();const loc=await where();const ok=await postTeam("MISSED CHECK-IN: "+fdBy(mainFeed())+" has not checked in for "+Math.round(late/60000)+" min."+loc);if(ok){actAdd("🚨","Missed check-in alert sent to the team","safety");toast("Your team was alerted")}redraw()}}
function alHTML(){const a=sf().al;
  if(!a.on){return `<div class="panel"><b>Check-in timer</b><p class="note">For working alone. Pick how often you will check in. If you miss it, your phone reminds you, then your team gets an urgent alert with your location.</p>
    <div class="evts" role="group" aria-label="Start a timer">${[15,30,60,120].map(n=>`<button data-sf-al="${n}">${n<60?n+" min":n/60+" hr"}</button>`).join("")}</div>
    <label class="note" style="display:block">Supervisor phone (for the call button)<input type="tel" id="sfSup" inputmode="tel" value="${esc(a.sup)}" placeholder="808 555 0100"></label>
    <p class="note">Steps: reminder at 0 min, call button at +2, team alert at +5. The team alert needs Word of Mouth set up and the app able to send. If the phone is off or has no signal, only the reminders can fire.</p></div>`}
  const left=a.due-Date.now(),mm=Math.floor(Math.abs(left)/60000),ss=Math.floor(Math.abs(left)/1000)%60;
  return `<div class="panel" style="text-align:center;${left<0?"border-color:var(--warn)":""}"><b>${left<0?"Overdue":"Next check-in in"}</b>
    <div id="sfClock" style="font-size:48px;font-weight:800;margin:6px 0;color:${left<0?"var(--warn)":"inherit"}">${left<0?"-":""}${mm}:${String(ss).padStart(2,"0")}</div>
    <button class="btn" id="sfOK" style="width:100%;font-size:18px">I'm OK · check in</button>
    ${a.st>=2&&a.sup?`<a class="btn warn" href="tel:${esc(a.sup.replace(/[^\d+]/g,""))}" style="display:block;margin-top:8px;text-align:center">Call my supervisor</a>`:""}
    ${a.st>=3?`<p class="note"><b>Your team was alerted.</b></p>`:""}
    <button class="btn alt" id="sfSOS" style="width:100%;margin-top:8px;color:var(--warn)">${armed==="sfsos"?"Tap again to alert my team now":"SOS: alert my team now"}</button>
    <button class="btn alt" id="sfStop" style="width:100%;margin-top:8px">Done working alone</button></div>`}

/* ---------- 4. response actions + reunification ---------- */
async function doAct(k){const A=ACTS.find(x=>x.k===k),c=sf();c.act=k==="clear"?null:{k,t:Date.now()};actAdd(k==="clear"?"✓":"🚨",A.l+" sent to everyone","safety");save();
  const ok=await postTeam(A.t);redraw();toast(ok?A.l+" sent to everyone":A.l+" set on this phone only")}
function actHTML(){const c=sf(),cur=c.act&&ACTS.find(x=>x.k===c.act.k);
  let h=cur?`<div class="panel" style="border-color:${cur.c}"><b style="color:${cur.c}">${esc(cur.l)} is on · ${ago(c.act.t)}</b><p class="note">${esc(cur.s)}.</p>${S.rc&&S.rc.open?`<button class="btn warn" data-go="recall" style="width:100%">Headcount in progress</button>`:`<button class="btn" id="sfHead" style="width:100%">Start live headcount</button>`}</div>`:"";
  h+=`<div class="panel"><b>One tap to everyone</b><p class="note">Sends an urgent post to your team through Word of Mouth. Tap twice to confirm.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${ACTS.map(a=>`<button data-sf-act="${a.k}" style="min-height:64px;border-radius:18px;border:0;background:${a.c};color:#fff;text-align:left;padding:10px 14px"><div style="font-size:17px;font-weight:700">${armed==="sfact"+a.k?"Tap again":esc(a.l)}</div><div style="font-size:12px;opacity:.92">${esc(a.s)}</div></button>`).join("")}</div></div>`;
  h+=`<div class="panel"><b>Reunification log</b><p class="note">Who was released to whom. Stays on this phone.</p>
    <input id="sfRWho" placeholder="Person released" aria-label="Person released" maxlength="60"><input id="sfRTo" placeholder="Released to (name)" aria-label="Released to" maxlength="60" style="margin-top:6px">
    <label class="note" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="sfRId" checked> ID checked</label><button class="btn" id="sfRAdd" style="width:100%">Log release</button>
    ${c.reun.slice(0,8).map(r=>`<div class="note" style="margin:6px 0 0"><b>${esc(r.who)}</b> → ${esc(r.to)} · ${esc(hm(r.t))}${r.id?" · ID checked":""}</div>`).join("")}
    ${c.reun.length?`<div class="row2" style="margin-top:8px"><button class="btn alt" id="sfRCsv">Export log</button><button class="btn alt" id="sfRClr">${armed==="sfrclr"?"Tap again to clear":"Clear log"}</button></div>`:""}</div>`;return h}

/* ---------- 5. data & privacy ---------- */
function prune(){const c=sf();if(!c.keep)return;const cut=Date.now()-c.keep*30*864e5;const d0=drills().length,r0=c.reun.length;
  S.drills=drills().filter(d=>d.t>=cut);c.reun=c.reun.filter(r=>r.t>=cut);if(S.drills.length!==d0||c.reun.length!==r0)save()}
function orgHTML(){const c=sf();const mail=s=>"mailto:administration@accountedforteam.com?subject="+encodeURIComponent(s);
  return `<div class="panel"><b>Keep drill records for</b><div class="evts" role="group" aria-label="Retention">${[[0,"Always"],[12,"12 months"],[24,"24 months"],[36,"36 months"]].map(([v,l])=>`<button data-sf-keep="${v}" aria-pressed="${c.keep===v}">${l}</button>`).join("")}</div>
    <p class="note">Older drill history and reunification entries are deleted from this phone automatically. Many states want records kept for years: check yours before you shorten this.</p>
    <button class="btn alt" id="sfWipe" style="width:100%">${armed==="sfwipe"?"Tap again to delete":"Delete all safety records on this phone"}</button></div>
    <div class="panel"><b>For districts and companies</b><p class="note">Read how data is handled, or ask for the paperwork your IT or legal team needs.</p>
    <a class="btn alt" href="privacy.html" target="_blank" style="display:block;text-align:center">Privacy policy</a>
    <a class="btn alt" href="${mail("Data Processing Agreement request")}" style="display:block;text-align:center;margin-top:8px">Request a Data Processing Agreement</a>
    <a class="btn alt" href="${mail("Single sign-on request (Google or Microsoft)")}" style="display:block;text-align:center;margin-top:8px">Ask about single sign-on</a>
    <p class="note">Single sign-on and a security audit report are not available yet. Asking helps us decide what to build first.</p></div>`}

/* ---------- screen ---------- */
function renderSafety(){const c=sf();prune();
  const body={drills:drillsHTML,tapin:tapinHTML,alone:alHTML,actions:actHTML,org:orgHTML}[c.tab]||drillsHTML;
  $("#main").innerHTML=banner()+`<h2 style="display:flex;align-items:center;gap:8px"><span class="pro-badge">PRO</span> Safety</h2><div class="evts" role="tablist" aria-label="Safety sections">${TABS.map(([k,l])=>`<button role="tab" data-sf-tab="${k}" aria-selected="${c.tab===k}" aria-pressed="${c.tab===k}">${l}</button>`).join("")}</div>`+body()}
function redraw(){if(view!=="safety"||!proOK())return;const a=document.activeElement;if(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName))return;const y=window.scrollY;renderSafety();window.scrollTo(0,y)}
window.renderSafety=renderSafety;
{const _t=renderTools;renderTools=function(){_t.apply(this,arguments);const g=$("#main .tgrid");if(!g||$("[data-go=safety]"))return;g.insertAdjacentHTML("beforeend",`<button data-go="safety"><span class="ic">${svg("ready")}</span><span><b>Safety <span class="pro-badge" style="font-size:9px;padding:2px 6px">PRO</span></b><small>Drill report, timer, response</small></span></button>`)}}
every(1000,()=>{if(view==="safety"&&sf().tab==="alone"&&alOn()){const a=sf().al,left=a.due-Date.now(),el=$("#sfClock");if(el){const mm=Math.floor(Math.abs(left)/60000),ss=Math.floor(Math.abs(left)/1000)%60;el.textContent=(left<0?"-":"")+mm+":"+String(ss).padStart(2,"0")}}},"sf-clock");
every(5000,()=>{alTick()},"sf-alone");
setTimeout(()=>{schedAl();prune()},1700);
/* a closed check-in gets the drill type picked on the Safety screen */
document.addEventListener("click",e=>{if(e.target.closest&&e.target.closest("#rcClose")){setTimeout(()=>{const d=drills()[0];if(d&&!d.type&&d.kind!=="real"){d.type=sf().dtype;save()}},60)}},true);

/* ---------- events ---------- */
document.addEventListener("click",async e=>{const t=e.target;if(!t.closest||view!=="safety")return;const c=sf();let x;
  if(x=t.closest("[data-sf-tab]")){c.tab=x.dataset.sfTab;armed=null;save();renderSafety();return}
  if(x=t.closest("[data-sf-rule]")){c.rule=x.dataset.sfRule;save();renderSafety();return}
  if(x=t.closest("[data-sf-dty]")){c.dtype=x.dataset.sfDty;save();renderSafety();return}
  if(x=t.closest("[data-sf-tag]")){const[id,k]=x.dataset.sfTag.split("|");const d=drills().find(z=>z.id===id);if(d){d.type=d.type===k?"":k;save();renderSafety()}return}
  if(t.closest("#sfPdf")){try{savePDF(reportPDF(),safeName(unitName()+" drill report "+yearLabel())+".pdf")}catch(err){toast("Couldn't make the PDF")}return}
  if(t.closest("#sfWeb")){const tx=webText();try{await navigator.clipboard.writeText(tx);toast("Copied. Paste it on your website.")}catch(err){shareFile(tx,safeName(unitName()+" drills")+".txt","text/plain")}return}
  if(t.closest("#sfPtAdd")){const i=$("#sfPt"),v=i&&i.value.trim();if(!v)return toast("Type a name for the point");if(c.pts.length>=20)return toast("20 points is the limit");c.pts.push(v);save();renderSafety();return}
  if(x=t.closest("[data-sf-ptdel]")){c.pts.splice(+x.dataset.sfPtdel,1);save();renderSafety();return}
  if(x=t.closest("[data-sf-poster]")){const n=c.pts[+x.dataset.sfPoster];if(!n||!S.rc.open)return;try{savePDF(await posterPDF(n),safeName(n+" poster")+".pdf")}catch(err){toast("Couldn't make the poster")}return}
  if(x=t.closest("[data-sf-al]")){const s=$("#sfSup");if(s){c.al.sup=s.value.trim()}alStart(+x.dataset.sfAl);return}
  if(t.closest("#sfOK")){alOK();return}
  if(t.closest("#sfStop")){alStop();return}
  if(t.closest("#sfSOS")){if(armed!=="sfsos"){armed="sfsos";redraw();setTimeout(()=>{if(armed==="sfsos"){armed=null;redraw()}},4000);return}armed=null;const loc=await where();const ok=await postTeam("SOS: "+fdBy(mainFeed())+" needs help right now."+loc);toast(ok?"Your team was alerted":"Not sent");redraw();return}
  if(x=t.closest("[data-sf-act]")){const k=x.dataset.sfAct;if(armed!=="sfact"+k){armed="sfact"+k;redraw();setTimeout(()=>{if(armed==="sfact"+k){armed=null;redraw()}},4000);return}armed=null;doAct(k);return}
  if(t.closest("#sfHead")){emStart();return}
  if(t.closest("#sfRAdd")){const w=$("#sfRWho").value.trim(),o=$("#sfRTo").value.trim();if(!w||!o)return toast("Add who was released and to whom");c.reun.unshift({t:Date.now(),who:w,to:o,id:$("#sfRId").checked});c.reun=c.reun.slice(0,500);save();renderSafety();toast("Logged");return}
  if(t.closest("#sfRCsv")){const q=s=>'"'+String(s).replace(/"/g,'""')+'"';shareFile(["Date","Time","Released","Released to","ID checked"].map(q).join(",")+"\r\n"+c.reun.map(r=>[new Date(r.t).toLocaleDateString(),hm(r.t),r.who,r.to,r.id?"Yes":"No"].map(q).join(",")).join("\r\n"),safeName(unitName()+" reunification")+".csv","text/csv");return}
  if(t.closest("#sfRClr")){if(armed!=="sfrclr"){armed="sfrclr";redraw();setTimeout(()=>{if(armed==="sfrclr"){armed=null;redraw()}},4000);return}armed=null;c.reun=[];save();renderSafety();return}
  if(x=t.closest("[data-sf-keep]")){c.keep=+x.dataset.sfKeep;save();prune();renderSafety();return}
  if(t.closest("#sfWipe")){if(armed!=="sfwipe"){armed="sfwipe";renderSafety();setTimeout(()=>{if(armed==="sfwipe"){armed=null;if(view==="safety")renderSafety()}},4000);return}armed=null;S.drills=[];c.reun=[];c.act=null;save();renderSafety();toast("Safety records deleted")}
});
document.addEventListener("change",e=>{const t=e.target;if(!t.dataset||view!=="safety")return;if(t.dataset.sfCus){sf().custom[t.dataset.sfCus]=Math.max(0,Math.min(40,+t.value||0));save();renderSafety()}});
window.proSafety={rules:RULES,progress,webText,reportPDF,posterPDF,alStart,alOK,alTick,doAct,ruleSet};
})();
