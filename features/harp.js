/* Accounted For 4.26: HARP — Holiday Accident Reduction Program form, filled out on the phone.
   Everyone has it (leaders from Home and Tools, members from My page). Every block of the paper form:
   - Part A (the Marine): date, name, rank, age, shop, period covered, occasion, SNCOIC, OIC, location, mode of travel.
   - Part B (the small unit leader, while counseling): destinations, travel/contingency plan, driving alone, the
     activity/hazard table (initial risk, control measures, resultant risk), drugs/alcohol talk, valid license,
     off-limits areas, overall potential for injury, vehicle inspection.
   - POV inspection checklist: all 22 items with SAT / UNSAT and recommendations ("All SAT" for a clean car).
   - Pre-Trip Safety Checklist: the 9 hazards; tap the causes that apply and the controls in place, add how.
   - Signatures drawn with a finger: supervisor, Marine/Sailor, SNCO (print name + date for each).
   Make PDF builds it on the phone (no server). Email / Share opens Mail (or any app) with the PDF attached; where a
   phone can't attach, it saves the PDF and opens an email to fill in. Forms stay on this phone only (never synced:
   they hold age and license answers). Unit name, SNCOIC, OIC and "email to" are remembered for next time. */
(()=>{
if(typeof SYNC_SKIP==="object"&&Array.isArray(SYNC_SKIP))SYNC_SKIP.push("harps","harpDef");
const POV=["DOCUMENTS: Appropriate documents present and up to date? (Registration, Insurance, Safety Inspection)","BRAKELIGHTS: Operational, lenses intact?","TAIL LIGHTS: Operational, lenses intact?","TURN SIGNALS & PARKING LIGHTS: Operational front & rear?","FOUR-WAY EMERGENCY FLASHERS: Operational front & rear?","BACKUP LIGHTS: Operational?","LICENSE PLATE LIGHT: Operational?","TIRES: At least 1mm of tread over entire traction surface, free of breaks or cuts? Properly inflated? Spare tire, jack, lug wrench, etc. available? NO MIXING RADIAL WITH BIAS TIRES.","WINDSHIELD & WINDOWS: Not cracked, broken or scratched to the degree that impairs vision?","WINDSHIELD & WIPERS: Both wipers present, good blades and operational?","MIRRORS: Outside and inside not cracked?","BUMPERS: Not bent or damaged in a way that would be hazardous?","SEAT BELTS: Sufficient number of seat belts for all passengers? Serviceable?","MOTORCYCLE SAFETY EQUIPMENT (if applicable): Approved helmet, protective clothing, gloves, reflective vest and face/eye protection?","BRAKES: Operational and brake fluid appropriate level?","HEADLIGHTS: Both high and low beams operational?","PARKING BRAKE: Adjusted to prevent movement when engaged?","EXHAUST SYSTEM: Free of leaks?","HORN: Functional?","DEFROSTER: Operational?","EMERGENCY EQUIPMENT: First Aid Kit, flashlight, warning triangle, fire extinguisher, blanket, flares, shovel, chains, tools, etc.","HAZARDOUS MATERIALS IN CAR: (i.e. oil, gas, antifreeze) ensure in approved containers."];
const PRE=[["Transportation",["Flying","Driving","Boating/Ferry","Motorcycle/ATV on & off road","Bus","Train","Walking"],["Car inspected","Use of seatbelt / airbag in vehicle / ABS brakes","Use of PPE","Tools and spare parts for repairs","Maintain proper speed","Recon course prior to driving off road","Toolkit/emergency kit"],"Regular maint., leadership/counseling, policy/SOP, training/assistance, licensing, checklist"],
  ["Location",["In state","Out of state","Other country","Inbounds/out of bounds"],["Planned trip/allot enough time","Ensure enough money to complete trip","Back up plan ($ for airline ticket)"],"Save, budget, emergency funds; out of bounds chit in hand"],
  ["Weather/Time",["Rain","Snow","Clear","Fog","Day","Night"],["Know weather report","Change departure time","Increase following distance and decrease speed during inclement weather","Safety check headlights, wiper blades, tires","Visibility: if jogging/biking, wear reflective gear/light colored clothing","Delay outdoor PT during inclement weather"],""],
  ["Activities",["Clubs","Parties","Swimming/Diving","Boating","Hiking/Climbing","Extreme sports"],["Use of PPE","Buddy system","Experience/classes/lessons/certification, proper conditioning","Warm-up/stretch & cool down","Adequate fluid intake","Review activity/course before doing"],""],
  ["Alcohol",["Drinking","Not drinking (others)","No designated driver"],["Designated drivers/taxi","Know your limit/drink in moderation","Serve food","Buddy system"],""],
  ["Fatigue",["Lack of sleep","PT","Just out of field/wire","Several activities"],["Sleep plan/rest","Delay trip","A-driver","Periodic stops for exercise/refreshment"],"Switch drivers periodically; planned and frequent rest stops; 8-hour driving limit"],
  ["Other individuals (fight/criminal assault)",["Drunks","Thieves","Gangs"],["Know the area","Situational awareness","Buddy system"],"Avoid known trouble spots"],
  ["Uncontrollable",["Road conditions/traffic","Tide"],["DOT reports","Radio/traffic reports","Maps, AAA recommended routes","Alternate routes"],""],
  ["Speed",["Rushing back to base/home"],["Allow extra time for delays","Observe speed limits","Plan travel times"],""]];
const OCC=["Holiday","Annual","Emergency LV"],LOC=["On Island","Off Island","Out of Country"],TRAV=["Car","Motorcycle","Airplane","Boat","Bus","Train"],RISK=["Low","Moderate","High","Very High"],YN=["Yes","No","N/A"];
const L=()=>{S.harps=Array.isArray(S.harps)?S.harps:[];return S.harps};
const D=()=>{S.harpDef=S.harpDef&&typeof S.harpDef==="object"?S.harpDef:{};return S.harpDef};
const ymd=d=>d.getFullYear()+String(d.getMonth()+1).padStart(2,"0")+String(d.getDate()).padStart(2,"0");
const isMember=()=>!!(S.me&&S.me.d)&&!S.board&&!S.link&&!(S.sync&&S.sync.on)&&!(S.feeds||[]).some(f=>f.lk);
let cur=null,armed2="",sec="a";
function blank(m){const d=D();const me=S.me&&S.me.d;
  const nm=m?m.name:(me&&me.name)||"";const rk=m?m.rank:(me&&me.rank)||"";
  return {id:"h"+Date.now().toString(36)+rndId(3),t:Date.now(),mid:m?m.id:"",unit:d.unit||unitName(),
    a:{date:ymd(new Date()),name:nm,rank:rk,age:"",shop:m?((S.unit||unitName())+"/"+m.sec):(me&&me.sec)||"",from:"",to:"",occ:"Holiday",sncoic:d.sncoic||"",oic:d.oic||"",loc:"",trav:[]},
    b:{dest:"",plan:"",alone:"",acts:[{},{},{}],drugs:"",lic:"",licN:"",offl:"",offN:"",risk:"",veh:""},
    pov:POV.map(()=>({r:"",n:""})),pre:PRE.map(()=>({c:[],k:[],how:""})),
    sig:{sup:{nm:"",dt:"",img:""},mar:{nm:"",dt:"",img:""},snco:{nm:d.sncoic||"",dt:"",img:""}},to:d.to||""}}
/* ---------- screen ---------- */
const sel=(id,opts,v,ph)=>`<select id="${id}" class="wsel" data-hp="${id}"><option value="">${ph||"Pick…"}</option>${opts.map(o=>`<option${o===v?" selected":""}>${esc(o)}</option>`).join("")}</select>`;
const inp=(id,v,ph,o)=>`<input type="${(o&&o.type)||"text"}" id="${id}" data-hp="${id}" value="${esc(v||"")}" placeholder="${esc(ph||"")}"${o&&o.max?` maxlength="${o.max}"`:""}${o&&o.cap?` autocapitalize="characters"`:""}>`;
const ta=(id,v,ph)=>`<textarea id="${id}" data-hp="${id}" maxlength="400" style="min-height:64px" placeholder="${esc(ph||"")}">${esc(v||"")}</textarea>`;
const pills=(key,opts,v,multi)=>`<div class="evts">${opts.map(o=>`<button type="button" data-hpp="${key}" data-hv="${esc(o)}" aria-pressed="${multi?(v||[]).includes(o):v===o}">${esc(o)}</button>`).join("")}</div>`;
const lab=(t,f)=>`<label${f?` for="${f}"`:""}>${t}</label>`;
const head=(k,t,done)=>`<button type="button" class="hp-sec${sec===k?" on":""}" data-hpsec="${k}"><span>${t}</span><span class="note" style="margin:0">${done}</span></button>`;
function doneA(h){const a=h.a;return [a.name,a.rank,a.from,a.to,a.loc,a.trav.length].filter(Boolean).length+"/6"}
function doneB(h){const b=h.b;return [b.dest,b.plan,b.alone,b.lic,b.offl,b.risk,b.veh].filter(Boolean).length+"/7"}
const doneP=h=>h.pov.filter(x=>x.r).length+"/22";
const doneT=h=>h.pre.filter(x=>x.c.length||x.k.length).length+"/9";
const doneS=h=>["sup","mar","snco"].filter(k=>h.sig[k].img).length+"/3";
function listHTML(){const H=L();const R=S.source!=="sample"?sorted(S.roster||[]):[];
  let h=`<div class="sech"><h2>HARP forms</h2></div><div class="panel"><p class="note" style="margin:0 0 8px">Holiday Accident Reduction Program. Fill it out here, sign with your finger, then make the PDF and email it. Forms stay on this phone.</p>`;
  if(!isMember()&&R.length)h+=`${lab("New form for","hpFor")}<select id="hpFor" class="wsel"><option value="">Myself</option>${R.map(m=>`<option value="${esc(m.id)}">${esc(m.rank+" "+m.name+" · "+m.sec)}</option>`).join("")}</select>`;
  h+=`<button class="btn" id="hpNew" style="width:100%;margin-top:8px">+ New HARP form</button></div>`;
  if(H.length)h+=`<div class="card ny">${H.map(x=>`<div class="hc-row"><button class="lrow" data-hpopen="${x.id}" style="flex:1;text-align:left;background:none;border:0;cursor:pointer;color:inherit;border-top:0"><span class="n tone-${x.pdfAt?"g":"a"}">${x.pdfAt?"✓":"✎"}</span><span style="flex:1;min-width:0"><span class="t" style="display:block">${esc((x.a.rank+" "+x.a.name).trim()||"No name yet")}</span><span class="s" style="display:block">${esc(x.a.date)} · ${esc(x.a.occ||"")}${x.a.from?" · "+esc(x.a.from.replace("T"," "))+" to "+esc((x.a.to||"").replace("T"," ")):""}${x.pdfAt?" · sent "+esc(ago(x.pdfAt)):""}</span></span></button><button class="hc-x" data-hpdel="${x.id}" title="Delete">${armed2==="del"+x.id?"✓?":"🗑"}</button></div>`).join("")}</div>`;
  return h}
function formHTML(h){const a=h.a,b=h.b;
  let o=`<div style="display:flex;gap:8px;align-items:center;margin-top:10px"><button class="chip" id="hpBack" style="cursor:pointer">‹ Forms</button><b style="flex:1">HARP · ${esc((a.rank+" "+a.name).trim()||"New form")}</b></div>`;
  o+=`<div class="panel" style="margin-top:8px">${lab("Unit (top of the form)","hp_unit")}${inp("hp_unit",h.unit,"Combat Logistics Company 33",{max:60})}</div>`;
  /* Part A */
  o+=head("a","Part A · Personal information",doneA(h));
  if(sec==="a")o+=`<div class="panel hp-body"><p class="note">Filled out by the Marine/Sailor.</p>
    <div class="row2"><div>${lab("Date","hp_date")}${inp("hp_date",a.date,"YYYYMMDD",{max:8})}</div><div>${lab("Age","hp_age")}${inp("hp_age",a.age,"24",{type:"number"})}</div></div>
    ${lab("Name (last, first)","hp_name")}${inp("hp_name",a.name,"DANZI, ROBERT",{cap:1,max:60})}
    <div class="row2"><div>${lab("Rank","hp_rank")}${inp("hp_rank",a.rank,"SGT",{cap:1,max:12})}</div><div>${lab("Shop","hp_shop")}${inp("hp_shop",a.shop,"EOP/UT",{cap:1,max:30})}</div></div>
    ${lab("Period covered")}<div class="row2"><div>${lab("From","hp_from")}${inp("hp_from",a.from,"",{type:"datetime-local"})}</div><div>${lab("To","hp_to")}${inp("hp_to",a.to,"",{type:"datetime-local"})}</div></div>
    ${lab("Occasion")}${pills("occ",OCC,a.occ)}
    <div class="row2"><div>${lab("SNCOIC name/rank","hp_sncoic")}${inp("hp_sncoic",a.sncoic,"MSGT BERGAOUI, AFIF",{cap:1,max:40})}</div><div>${lab("OIC name/rank","hp_oic")}${inp("hp_oic",a.oic,"CWO4 TYLER, ANTONIO",{cap:1,max:40})}</div></div>
    ${lab("Location")}${pills("loc",LOC,a.loc)}
    ${lab("Mode of travel (all that apply)")}${pills("trav",TRAV,a.trav,true)}</div>`;
  /* Part B */
  o+=head("b","Part B · Small unit leader questions",doneB(h));
  if(sec==="b"){o+=`<div class="panel hp-body"><p class="note">Filled out by the small unit leader while counseling the Marine in Part A. The Pre-Trip checklist below helps the talk.</p>
    ${lab("1. What is/are your destination(s)?","hp_dest")}${ta("hp_dest",b.dest,"Gym, Target, beach")}
    ${lab("2. Mode of travel / contingency plan","hp_plan")}<p class="note" style="margin:0 0 4px">Proper planning to get there and back in the time allotted? Emergency road plan if transportation breaks down: money to fix it or rent a car? Area weather forecast for the period. Over 300 miles in a day or multiple driving days need a travel plan attached; over 500 miles in a day needs the CO's approval.</p>${ta("hp_plan",b.plan,"I will always have my CAC, cash, charged phone, recall roster, and a plan.")}
    ${lab("3. Are you driving alone?")}${pills("alone",YN,b.alone)}
    ${lab("4. What control measures exist for your planned activities?")}`;
    b.acts.forEach((x,i)=>{o+=`<div class="hp-act"><b>Activity ${i+1}</b>${inp("hp_act"+i,x.act,"Activity / hazard (e.g. swimming at the beach)",{max:60})}<div class="row2"><div>${lab("Initial risk")}${sel("hp_ir"+i,RISK,x.ir)}</div><div>${lab("Resultant risk")}${sel("hp_rr"+i,RISK,x.rr)}</div></div>${lab("Control measures to reduce risk","hp_ctl"+i)}${inp("hp_ctl"+i,x.ctl,"PPE worn, buddy, experience/training level…",{max:120})}</div>`});
    o+=`${lab("5. Drugs / alcohol","hp_drugs")}<p class="note" style="margin:0 0 4px">Emphasize the zero tolerance policy the Marine Corps has on drugs. Discuss alcohol, drinking in moderation, having a designated driver.</p>${ta("hp_drugs",b.drugs,"Discussed zero tolerance; designated driver is …")}
    ${lab("6. Do you have a valid license?")}${pills("lic",YN,b.lic)}<p class="note" style="margin:4px 0">Review the expiration date and the Drivers' License Extension Program for their state. Discuss having a plan if drinking.</p>${inp("hp_licN",b.licN,"Expires …  / notes",{max:120})}
    ${lab("7. Do you know the off-limits areas in Hawaii?")}${pills("offl",["Yes","No"],b.offl)}${inp("hp_offN",b.offN,"Notes (optional)",{max:120})}
    ${lab("8. Your overall potential for injury during this period?")}${pills("risk",["Low","Moderate","High","Extremely High"],b.risk)}
    ${lab("9. Vehicle inspection completed? (checklist below)")}${pills("veh",YN,b.veh)}
    <p class="note" style="margin:8px 0 0"><b>Note:</b> Small unit leaders will ensure their Marines/Sailors know how they may get in contact with them if their plans change or they need assistance.</p></div>`}
  /* POV */
  o+=head("p","POV inspection checklist",doneP(h));
  if(sec==="p"){o+=`<div class="panel hp-body"><div class="row2"><button type="button" class="btn alt" id="hpAllSat">All SAT</button><button type="button" class="btn alt" id="hpPovClr">Clear</button></div>`;
    POV.forEach((t,i)=>{const x=h.pov[i];o+=`<div class="hp-pov"><div class="hp-q"><b>${i+1}.</b> ${esc(t)}</div><div class="evts">${["SAT","UNSAT","N/A"].map(r=>`<button type="button" data-hppov="${i}" data-hv="${r}" aria-pressed="${x.r===r}"${r==="UNSAT"?` class="hp-un"`:""}>${r}</button>`).join("")}</div>${x.r==="UNSAT"||x.n?inp("hp_pn"+i,x.n,"Recommendation",{max:100}):""}</div>`});
    o+=`</div>`}
  /* Pre-trip */
  o+=head("t","Pre-Trip safety checklist",doneT(h));
  if(sec==="t"){o+=`<div class="panel hp-body"><p class="note">Designed to foster conversation when completing the HARP. Not an inclusive list. Tap the causes that apply and the controls in place.</p>`;
    PRE.forEach(([hz,cs,ks,how],i)=>{const x=h.pre[i];o+=`<div class="hp-pre"><b>${i+1}. ${esc(hz)}</b><div class="note" style="margin:4px 0 2px">Causes</div><div class="evts">${cs.map(c=>`<button type="button" data-hppre="${i}" data-k="c" data-hv="${esc(c)}" aria-pressed="${x.c.includes(c)}">${esc(c)}</button>`).join("")}</div>
      <div class="note" style="margin:6px 0 2px">Controls</div><div class="evts">${ks.map(c=>`<button type="button" data-hppre="${i}" data-k="k" data-hv="${esc(c)}" aria-pressed="${x.k.includes(c)}">${esc(c)}</button>`).join("")}</div>
      ${inp("hp_how"+i,x.how,how?"How to implement: "+how:"How to implement",{max:140})}</div>`});
    o+=`</div>`}
  /* signatures */
  o+=head("s","Signatures",doneS(h));
  if(sec==="s"){o+=`<div class="panel hp-body">`;
    for(const [k,t] of [["sup","Supervisor"],["mar","Marine/Sailor"],["snco","SNCO (Pre-Trip checklist)"]]){const g=h.sig[k];
      o+=`<div class="hp-sig"><b>${t}</b><div class="row2"><div>${lab("Print name","hp_sn_"+k)}${inp("hp_sn_"+k,g.nm,"RANK LAST, FIRST",{cap:1,max:40})}</div><div>${lab("Date","hp_sd_"+k)}${inp("hp_sd_"+k,g.dt||"","",{type:"date"})}</div></div>
        <canvas class="hp-pad" data-pad="${k}" width="600" height="160" aria-label="${t} signature: draw with your finger"></canvas><div style="display:flex;justify-content:space-between"><span class="note" style="margin:0">${g.img?"✓ Signed":"Sign with your finger"}</span><button type="button" class="chip" data-padclr="${k}" style="cursor:pointer">Clear</button></div></div>`}
    o+=`</div>`}
  /* send */
  o+=`<div class="panel" style="margin-top:12px;border-color:var(--s-onhand)"><b>PDF & email</b>${lab("Email to","hp_to2")}${inp("hp_to2",h.to,"name@usmc.mil, another@usmc.mil",{max:200,type:"email"})}
    <div class="row2" style="margin-top:8px"><button type="button" class="btn" id="hpSend">✉ Email / Share PDF</button><button type="button" class="btn alt" id="hpPdf">⬇ Save PDF</button></div>
    <p class="note" style="margin:6px 0 0">Email / Share opens Mail (or Messages, Files, Teams) with the PDF attached. The PDF holds personal information: send it only to people who need it.</p></div>`;
  return o}
function renderHarp(){const m=$("#main");if(!m)return;m.innerHTML=cur?formHTML(cur):listHTML();if(cur&&sec==="s")pads()}
function draw(keepY){const y=window.scrollY;renderHarp();if(keepY!==false)window.scrollTo(0,y)}
{const _r=render;render=function(){if(view==="harp"){renderTabs();renderHarp();if(typeof animateView==="function")animateView();return}return _r.apply(this,arguments)}}
/* ---------- inputs ---------- */
const MAP={hp_unit:h=>["",h,"unit"],hp_date:h=>[h.a,"date"],hp_age:h=>[h.a,"age"],hp_name:h=>[h.a,"name"],hp_rank:h=>[h.a,"rank"],hp_shop:h=>[h.a,"shop"],hp_from:h=>[h.a,"from"],hp_to:h=>[h.a,"to"],hp_sncoic:h=>[h.a,"sncoic"],hp_oic:h=>[h.a,"oic"],
  hp_dest:h=>[h.b,"dest"],hp_plan:h=>[h.b,"plan"],hp_drugs:h=>[h.b,"drugs"],hp_licN:h=>[h.b,"licN"],hp_offN:h=>[h.b,"offN"],hp_to2:h=>[h,"to"]};
function setVal(id,v){const h=cur;if(!h)return;let m;
  if(id==="hp_unit"){h.unit=v;return}
  if(MAP[id]){const [o,k]=MAP[id](h);o[k]=v;return}
  if((m=id.match(/^hp_(act|ir|rr|ctl)(\d)$/))){h.b.acts[+m[2]][m[1]]=v;return}
  if((m=id.match(/^hp_pn(\d+)$/))){h.pov[+m[1]].n=v;return}
  if((m=id.match(/^hp_how(\d)$/))){h.pre[+m[1]].how=v;return}
  if((m=id.match(/^hp_s([nd])_(\w+)$/))){h.sig[m[2]][m[1]==="n"?"nm":"dt"]=v}}
function keep(){if(!cur)return;cur.t=Date.now();const d=D();if(cur.unit)d.unit=cur.unit;if(cur.a.sncoic)d.sncoic=cur.a.sncoic;if(cur.a.oic)d.oic=cur.a.oic;if(cur.to)d.to=cur.to;rawSave()}
document.addEventListener("input",e=>{const id=e.target&&e.target.dataset&&e.target.dataset.hp;if(!id||view!=="harp")return;setVal(id,e.target.value);keep()});
document.addEventListener("change",e=>{const id=e.target&&e.target.dataset&&e.target.dataset.hp;if(!id||view!=="harp")return;setVal(id,e.target.value);keep()});
/* ---------- taps ---------- */
document.addEventListener("click",e=>{const t=e.target;if(!t.closest||view!=="harp")return;let b;
  if(t.closest("#hpNew")){const id=($("#hpFor")||{}).value;const m=id?S.roster.find(x=>x.id===id):null;cur=blank(m);L().unshift(cur);S.harps=L().slice(0,60);sec="a";rawSave();draw(false);window.scrollTo(0,0);return}
  if((b=t.closest("[data-hpopen]"))){cur=L().find(x=>x.id===b.dataset.hpopen)||null;sec="a";draw(false);window.scrollTo(0,0);return}
  if((b=t.closest("[data-hpdel]"))){const id=b.dataset.hpdel;if(armed2!=="del"+id){armed2="del"+id;draw();setTimeout(()=>{if(armed2==="del"+id){armed2="";draw()}},4000);return}armed2="";S.harps=L().filter(x=>x.id!==id);rawSave();draw();toast("Form deleted");return}
  if(t.closest("#hpBack")){cur=null;draw(false);window.scrollTo(0,0);return}
  if(!cur)return;
  if((b=t.closest("[data-hpsec]"))){const k=b.dataset.hpsec;sec=sec===k?"":k;draw(false);const el=document.querySelector(`[data-hpsec="${k}"]`);if(el&&el.scrollIntoView)el.scrollIntoView({block:"start"});return}
  if((b=t.closest("[data-hpp]"))){const k=b.dataset.hpp,v=b.dataset.hv;const o=["occ","loc","trav"].includes(k)?cur.a:cur.b;
    if(k==="trav"){o.trav=o.trav.includes(v)?o.trav.filter(x=>x!==v):o.trav.concat(v)}else o[k]=o[k]===v?"":v;keep();draw();return}
  if((b=t.closest("[data-hppov]"))){const x=cur.pov[+b.dataset.hppov];x.r=x.r===b.dataset.hv?"":b.dataset.hv;keep();draw();if(x.r==="UNSAT"){const el=$("#hp_pn"+b.dataset.hppov);if(el)el.focus()}return}
  if(t.closest("#hpAllSat")){cur.pov.forEach(x=>{if(!x.r)x.r="SAT"});keep();draw();toast("Every open item marked SAT");return}
  if(t.closest("#hpPovClr")){cur.pov.forEach(x=>{x.r="";x.n=""});keep();draw();return}
  if((b=t.closest("[data-hppre]"))){const x=cur.pre[+b.dataset.hppre],k=b.dataset.k,v=b.dataset.hv;x[k]=x[k].includes(v)?x[k].filter(y=>y!==v):x[k].concat(v);keep();draw();return}
  if((b=t.closest("[data-padclr]"))){cur.sig[b.dataset.padclr].img="";keep();draw();return}
  if(t.closest("#hpPdf")){out(false);return}
  if(t.closest("#hpSend")){out(true);return}},true);
/* ---------- signature pads ---------- */
function pads(){document.querySelectorAll("canvas.hp-pad").forEach(c=>{const k=c.dataset.pad;const g=cur.sig[k];const x=c.getContext("2d");if(!x)return;
  x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.strokeStyle="#d0d4da";x.beginPath();x.moveTo(20,c.height-30);x.lineTo(c.width-20,c.height-30);x.stroke();
  if(g.img){const im=new Image();im.onload=()=>x.drawImage(im,0,0,c.width,c.height);im.src=g.img}
  let on=false,last=null,dirty=false;const pt=ev=>{const r=c.getBoundingClientRect();return [(ev.clientX-r.left)*c.width/r.width,(ev.clientY-r.top)*c.height/r.height]};
  c.style.touchAction="none";
  c.addEventListener("pointerdown",ev=>{on=true;last=pt(ev);try{c.setPointerCapture(ev.pointerId)}catch(e){}ev.preventDefault()});
  c.addEventListener("pointermove",ev=>{if(!on)return;const p=pt(ev);x.strokeStyle="#0b1f44";x.lineWidth=3.2;x.lineCap="round";x.lineJoin="round";x.beginPath();x.moveTo(last[0],last[1]);x.lineTo(p[0],p[1]);x.stroke();last=p;dirty=true;ev.preventDefault()});
  const end=()=>{if(!on)return;on=false;if(dirty){g.img=c.toDataURL("image/jpeg",0.7);if(!g.dt)g.dt=new Date().toISOString().slice(0,10);keep();const n=c.nextElementSibling&&c.nextElementSibling.querySelector(".note");if(n)n.textContent="✓ Signed";const d=$("#hp_sd_"+k);if(d&&!d.value)d.value=g.dt}};
  c.addEventListener("pointerup",end);c.addEventListener("pointercancel",end);c.addEventListener("pointerleave",end)})}
/* ---------- the PDF (letter, 2 pages: the form, then the checklists) ---------- */
const WIN={"—":"-","–":"-","‘":"'","’":"'","“":'"',"”":'"',"✓":"X","…":"..."};
const ps=s=>"("+String(s==null?"":s).replace(/[—–‘’“”✓…]/g,c=>WIN[c]).replace(/[^\x20-\x7e\xa0-\xff]/g,"?").replace(/[\\()]/g,c=>"\\"+c)+")";
const tw=(s,sz,bd)=>String(s).length*sz*(bd?0.56:0.5);
function wrap(s,sz,w,bd){const out=[];for(const para of String(s||"").split(/\n/)){let line="";for(const word of para.split(/\s+/)){const t=line?line+" "+word:word;if(tw(t,sz,bd)>w&&line){out.push(line);line=word}else line=t}out.push(line)}return out}
function pdfDoc(){const pages=[],imgs=[];let c=null;const P=()=>{c=[];pages.push(c)};P();
  const api={page:P,
    t(x,y,s,o={}){const sz=o.sz||9;c.push(`BT /${o.b?"F2":o.m?"F3":"F1"} ${sz} Tf ${o.g?"0.35 0.35 0.35 rg ":"0 0 0 rg "}${x.toFixed(1)} ${y.toFixed(1)} Td ${ps(s)} Tj ET`)},
    tc(x,y,w,s,o={}){const sz=o.sz||9;api.t(x+(w-tw(s,sz,o.b))/2,y,s,o)},
    tw(x,y,w,s,o={}){const sz=o.sz||9;const ls=wrap(s,sz,w,o.b);ls.forEach((l,i)=>api.t(x,y-i*sz*1.18,l,o));return ls.length*sz*1.18},
    r(x,y,w,h,o={}){c.push(`${o.fill?o.fill+" rg "+x+" "+y+" "+w+" "+h+" re f ":""}${o.nos?"":`0 0 0 RG ${o.lw||0.6} w ${x} ${y} ${w} ${h} re S`}`)},
    l(x1,y1,x2,y2,lw){c.push(`0 0 0 RG ${lw||0.6} w ${x1} ${y1} m ${x2} ${y2} l S`)},
    box(x,y,on,s){s=s||8;const k=s/8;api.r(x,y,s,s,{lw:0.6});if(on)c.push(`0 0 0 RG 1.1 w ${x+1.5*k} ${y+4*k} m ${x+3.5*k} ${y+1.5*k} l ${x+7*k} ${y+7*k} l S`)},
    circ(x,y,w,h){const k=0.5523,rx=w/2,ry=h/2,cx=x+rx,cy=y+ry;c.push(`0 0 0 RG 0.9 w ${cx+rx} ${cy} m ${cx+rx} ${cy+ry*k} ${cx+rx*k} ${cy+ry} ${cx} ${cy+ry} c ${cx-rx*k} ${cy+ry} ${cx-rx} ${cy+ry*k} ${cx-rx} ${cy} c ${cx-rx} ${cy-ry*k} ${cx-rx*k} ${cy-ry} ${cx} ${cy-ry} c ${cx+rx*k} ${cy-ry} ${cx+rx} ${cy-ry*k} ${cx+rx} ${cy} c S`)},
    img(dataUrl,x,y,w,h){const m=String(dataUrl||"").match(/^data:image\/jpeg;base64,(.+)$/);if(!m)return;const bin=atob(m[1]);const sz=jpgSize(bin);if(!sz)return;imgs.push({bin,w:sz[0],h:sz[1]});c.push(`q ${w} 0 0 ${h} ${x} ${y} cm /Im${imgs.length} Do Q`)},
    out(title){const objs=[];const add=s=>{objs.push(s);return objs.length};add("<< /Type /Catalog /Pages 2 0 R >>");add("");
      const f1=add("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>"),f2=add("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>"),f3=add("<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>");
      const im=imgs.map(i=>add(`<< /Type /XObject /Subtype /Image /Width ${i.w} /Height ${i.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${i.bin.length} >>\nstream\n${i.bin}\nendstream`));
      const xo=im.length?` /XObject << ${im.map((o,i)=>`/Im${i+1} ${o} 0 R`).join(" ")} >>`:"";const kids=[];
      pages.forEach((p,i)=>{const body=p.concat(`BT /F1 7 Tf 0.45 0.45 0.45 rg 36 18 Td ${ps("Made with Accounted For · "+new Date().toLocaleString()+" · Page "+(i+1)+" of "+pages.length+" · Contains personal information")} Tj ET`).join("\n");
        const cc=add(`<< /Length ${body.length} >>\nstream\n${body}\nendstream`);kids.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R /F3 ${f3} 0 R >>${xo} >> /Contents ${cc} 0 R >>`))});
      objs[1]=`<< /Type /Pages /Kids [${kids.map(k=>k+" 0 R").join(" ")}] /Count ${kids.length} >>`;
      let s="%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";const off=[];objs.forEach((o,i)=>{off.push(s.length);s+=`${i+1} 0 obj\n${o}\nendobj\n`});
      const xr=s.length;s+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`+off.map(o=>String(o).padStart(10,"0")+" 00000 n \n").join("")+`trailer\n<< /Size ${objs.length+1} /Root 1 0 R /Info << /Title ${ps(title)} /Producer (Accounted For) >> >>\nstartxref\n${xr}\n%%EOF`;
      const u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i)&255;return u}};
  return api}
function jpgSize(b){let i=2;while(i<b.length){if(b.charCodeAt(i)!==0xFF)return null;const mk=b.charCodeAt(i+1);const len=b.charCodeAt(i+2)*256+b.charCodeAt(i+3);
  if(mk>=0xC0&&mk<=0xC3)return [b.charCodeAt(i+7)*256+b.charCodeAt(i+8),b.charCodeAt(i+5)*256+b.charCodeAt(i+6)];i+=2+len}return null}
const dt=v=>String(v||"").replace("T"," @ ").replace(/-/g,"");
function build(h){const d=pdfDoc(),a=h.a,b=h.b,X=36,R=576,Wd=R-X;let y;
  /* page 1: header, Part A, Part B, signatures */
  d.tc(X,744,Wd,h.unit||unitName(),{sz:15,b:1,m:1});d.tc(X,726,Wd,"Holiday Accident Reduction Program",{sz:12.5,b:1,m:1});
  d.t(380,700,"DATE:",{sz:9,m:1});d.t(414,700,a.date,{sz:11});d.l(410,697,R,697);
  y=684;const row=(hgt)=>{d.r(X,y-hgt,Wd,hgt);y-=hgt};
  d.r(X,y-14,Wd,14,{fill:"0.93 0.93 0.93"});d.t(X+4,y-10,"Part A: PERSONAL INFORMATION",{sz:9.5,b:1,m:1});d.t(X+238,y-10,"(TO BE FILLED OUT BY INDIVIDUAL MARINE/SAILOR)",{sz:6.5,m:1,g:1});row(14);
  const cell=(x,w,lbl,val)=>{d.t(x+3,y-11,lbl,{sz:7,m:1});d.t(x+3+tw(lbl,7)*1.15+4,y-11,val,{sz:10})};
  cell(X,250,"NAME:",a.name);d.l(X+250,y,X+250,y-15);cell(X+250,95,"RANK:",a.rank);d.l(X+345,y,X+345,y-15);cell(X+345,70,"AGE:",a.age);d.l(X+415,y,X+415,y-15);cell(X+415,125,"SHOP:",a.shop);row(15);
  cell(X,280,"PERIOD COVERED:",dt(a.from)+(a.to?"  to  "+dt(a.to):""));d.l(X+300,y,X+300,y-15);d.t(X+304,y-11,"OCCASION:",{sz:7,m:1});
  {let x=X+352;for(const o of ["HOLIDAY","ANNUAL","EMERGENCY LV"]){d.t(x,y-11,o,{sz:7.5,m:1});if(a.occ.toUpperCase()===o)d.circ(x-3,y-14,tw(o,7.5)*1.2+6,11);x+=tw(o,7.5)*1.2+14}}row(15);
  cell(X,280,"SNCOIC NAME/RANK:",a.sncoic);d.l(X+300,y,X+300,y-15);cell(X+300,240,"OIC NAME/RANK:",a.oic);row(15);
  d.t(X+3,y-11,"LOCATION (circle one):",{sz:7,m:1});{let x=X+120;for(const o of LOC){d.t(x,y-11,o,{sz:8,m:1});if(a.loc===o)d.circ(x-3,y-14,tw(o,8)*1.2+6,11);x+=tw(o,8)*1.2+26}}row(15);
  d.t(X+3,y-11,"MODE OF TRAVEL (circle all that apply):",{sz:7,m:1});{let x=X+180;for(const o of TRAV){d.t(x,y-11,o,{sz:8,m:1});if(a.trav.includes(o))d.circ(x-3,y-14,tw(o,8)*1.2+6,11);x+=tw(o,8)*1.2+16}}row(15);
  y-=8;d.r(X,y-14,Wd,14,{fill:"0.93 0.93 0.93"});d.t(X+4,y-10,"Part B: SMALL UNIT LEADER QUESTIONS",{sz:9.5,b:1,m:1});d.t(X+250,y-10,"(TO BE FILLED OUT BY SUPERVISOR)",{sz:6.5,m:1,g:1});row(14);
  const q=(lbl,val,minH)=>{const top=y;d.t(X+3,y-11,lbl,{sz:8.5,b:1,m:1});let hh=16;if(val){hh+=d.tw(X+10,y-24,Wd-16,val,{sz:10})+2}hh=Math.max(hh,minH||0);d.r(X,top-hh,Wd,hh);y=top-hh};
  q("1. What is/are your destination(s)?",b.dest,28);
  q("2. Mode of travel/Contingency Plan:",b.plan,30);
  const circ=(lbl,opts,v)=>{d.t(X+3,y-11,lbl,{sz:8.5,b:1,m:1});let x=X+Math.max(250,tw(lbl,8.5,1)*1.1+20);for(const o of opts){d.t(x,y-11,o,{sz:8.5,m:1});if(v===o)d.circ(x-3,y-14,tw(o,8.5)*1.2+6,11);x+=tw(o,8.5)*1.2+26}row(15)};
  circ("3. Are you driving alone?",YN,b.alone);
  d.t(X+3,y-11,"4. What control measures exist for your planned activities?",{sz:8.5,b:1,m:1});row(15);
  const C=[X,X+130,X+215,X+455,R];d.r(X,y-14,Wd,14,{fill:"0.96 0.96 0.96"});["Activity/Hazard","Initial Risk","Control Measures to Reduce Risk","Resultant Risk"].forEach((t,i)=>d.tc(C[i],y-10,C[i+1]-C[i],t,{sz:7.5,b:1}));for(let i=1;i<4;i++)d.l(C[i],y,C[i],y-14);row(14);
  for(const x of b.acts){d.t(C[0]+3,y-11,x.act||"",{sz:8.5});d.tc(C[1],y-11,C[2]-C[1],x.ir||"",{sz:8.5});d.t(C[2]+3,y-11,String(x.ctl||"").slice(0,62),{sz:8});d.tc(C[3],y-11,C[4]-C[3],x.rr||"",{sz:8.5});for(let i=1;i<4;i++)d.l(C[i],y,C[i],y-15);row(15)}
  q("5. Drugs/alcohol:",b.drugs,26);
  circ("6. Do you have a valid License?",YN,b.lic);if(b.licN){d.t(X+10,y-11,b.licN,{sz:9});row(15)}
  circ("7. Do you know the off-limit areas in Hawaii?",["Yes","No"],b.offl);if(b.offN){d.t(X+10,y-11,b.offN,{sz:9});row(15)}
  d.t(X+3,y-11,"8. Your overall potential for injury during this period?",{sz:8.5,b:1,m:1});row(15);{let x=X+40;for(const o of ["Low","Moderate","High","Extremely High"]){d.t(x,y-11,o,{sz:9,m:1});if(b.risk===o)d.circ(x-3,y-14,tw(o,9)*1.2+6,12);x+=128}}row(15);
  circ("9. Vehicle inspection completed? (Check list on back)",YN,b.veh);
  d.tw(X+3,y-10,Wd-8,"Note: Small Unit Leaders will insure their Marines/Sailors know how they may get in contact with them if their plans change or they need assistance.",{sz:8});row(22);
  const sig=(lbl,g)=>{const top=y;d.t(X+3,y-11,lbl,{sz:8.5,b:1,m:1});d.t(X+303,y-11,"Date:",{sz:8.5,b:1,m:1});if(g.img)d.img(g.img,X+110,top-38,150,36);if(g.nm)d.t(X+6,top-34,g.nm,{sz:8,g:1});d.t(X+340,y-24,g.dt||"",{sz:10});d.l(X+300,top,X+300,top-40);d.r(X,top-40,Wd,40);y=top-40};
  sig("Supervisor Signature:",h.sig.sup);sig("Marine/Sailor's Signature:",h.sig.mar);
  /* page 2: POV checklist + Pre-Trip checklist + SNCO */
  d.page();y=756;const P2=[X,X+360,X+398,X+440,R];
  d.r(X,y-24,Wd,24);d.tc(P2[0],y-11,P2[1]-P2[0],"POV INSPECTION CHECKLIST",{sz:10,b:1});d.tc(P2[0],y-21,P2[1]-P2[0],"ITEM & CHECK",{sz:8});["SAT","UNSAT","RECOMMENDATIONS"].forEach((t,i)=>d.tc(P2[i+1],y-15,P2[i+2]-P2[i+1],t,{sz:i===2?6.6:7.5,b:1}));for(let i=1;i<4;i++)d.l(P2[i],y,P2[i],y-24);y-=24;
  POV.forEach((t,i)=>{const x=h.pov[i];const ls=wrap((i+1)+". "+t,7.2,P2[1]-P2[0]-6);const hh=Math.max(10.5,ls.length*8.2+2.5);ls.forEach((l,j)=>d.t(X+3,y-8-j*8.2,l,{sz:7.2}));
    if(x.r==="SAT")d.tc(P2[1],y-8,P2[2]-P2[1],"X",{sz:9,b:1});if(x.r==="UNSAT")d.tc(P2[2],y-8,P2[3]-P2[2],"X",{sz:9,b:1});
    const rec=x.r==="N/A"?"N/A"+(x.n?" - "+x.n:""):x.n||"";if(rec)d.tw(P2[3]+3,y-8,P2[4]-P2[3]-6,rec,{sz:7});for(let k=1;k<4;k++)d.l(P2[k],y,P2[k],y-hh);d.r(X,y-hh,Wd,hh);y-=hh});
  y-=13;d.tc(X,y,Wd,"Pre-Trip Safety Checklist",{sz:11,b:1});y-=10;d.tc(X,y,Wd,"This checklist is designed to foster conversation when completing the HARP Form. It is by no means an inclusive list.",{sz:7.5});y-=6;
  const T2=[X,X+92,X+210,X+420,R];d.r(X,y-12,Wd,12,{fill:"0.96 0.96 0.96"});["Hazards","Causes","Controls","How to Implement"].forEach((t,i)=>d.t(T2[i]+3,y-9,t,{sz:7.5,b:1}));for(let i=1;i<4;i++)d.l(T2[i],y,T2[i],y-12);y-=12;
  PRE.forEach(([hz,cs,ks,how],i)=>{const x=h.pre[i];const sz=6.2,lh=6.9;
    const col=(arr,sel,x0,w)=>{const L2=[];for(const it of arr){const on=sel.includes(it);const ls=wrap(it,sz,w-12);ls.forEach((l,j)=>L2.push({l,on:j===0?on:null}))}return L2};
    const cc=col(cs,x.c,T2[1],T2[2]-T2[1]),kk=col(ks,x.k,T2[2],T2[3]-T2[2]);const hw=wrap([how,x.how].filter(Boolean).join(" · "),sz,T2[4]-T2[3]-6);const hz2=wrap((i+1)+". "+hz,7,T2[1]-T2[0]-6);
    const hh=Math.max(cc.length,kk.length,hw.length,hz2.length)*lh+3.5;if(y-hh<40){d.page();y=756}
    hz2.forEach((l,j)=>d.t(T2[0]+3,y-7.4-j*lh,l,{sz:7}));
    cc.forEach((o,j)=>{if(o.on!==null)d.box(T2[1]+3,y-8.6-j*lh,o.on,6);d.t(T2[1]+12,y-7.4-j*lh,o.l,{sz})});
    kk.forEach((o,j)=>{if(o.on!==null)d.box(T2[2]+3,y-8.6-j*lh,o.on,6);d.t(T2[2]+12,y-7.4-j*lh,o.l,{sz})});
    hw.forEach((l,j)=>d.t(T2[3]+3,y-7.4-j*lh,l,{sz}));for(let k=1;k<4;k++)d.l(T2[k],y,T2[k],y-hh);d.r(X,y-hh,Wd,hh);y-=hh});
  y-=22;if(y<44){d.page();y=740}const g=h.sig.snco;d.t(X,y,"SNCO Print & Sign:",{sz:11});d.l(X+110,y-2,X+380,y-2);if(g.nm)d.t(X+114,y+2,g.nm,{sz:9});if(g.img)d.img(g.img,X+250,y-6,120,30);d.t(X+392,y,"Date:",{sz:11});d.l(X+425,y-2,R,y-2);d.t(X+430,y+2,g.dt||"",{sz:10});
  return d.out("HARP "+(a.rank+" "+a.name).trim())}
function fname(h){return ("HARP_"+[h.a.rank,(h.a.name||"").split(",")[0],h.a.date].filter(Boolean).join("_")).replace(/[^\w.-]+/g,"_")+".pdf"}
function missing(h){const m=[];if(!h.a.name)m.push("name");if(!h.a.from||!h.a.to)m.push("period covered");if(!h.sig.mar.img)m.push("Marine's signature");if(!h.sig.sup.img)m.push("supervisor's signature");return m}
async function out(send){const h=cur;if(!h)return;keep();const miss=missing(h);
  if(miss.length&&armed2!=="go"){armed2="go";toast("Still open: "+miss.join(", ")+". Tap again to make it anyway.");setTimeout(()=>{armed2=""},5000);return}armed2="";
  let bytes;try{bytes=build(h)}catch(e){toast("Couldn't make the PDF: "+(e&&e.message||e));return}
  const name=fname(h);const blob=new Blob([bytes],{type:"application/pdf"});const file=typeof File==="function"?new File([blob],name,{type:"application/pdf"}):null;
  const subj="HARP - "+(h.a.rank+" "+h.a.name).trim()+" - "+h.a.date;const body="HARP form attached for "+(h.a.rank+" "+h.a.name).trim()+(h.a.from?", "+dt(h.a.from)+" to "+dt(h.a.to):"")+".";
  if(send&&file&&navigator.canShare&&navigator.canShare({files:[file]})&&navigator.share){try{await navigator.share({files:[file],title:subj,text:body});h.pdfAt=Date.now();keep();if(view==="harp")draw();return}catch(e){if(e&&e.name==="AbortError")return}}
  const u=URL.createObjectURL(blob);const a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);
  if(send){h.pdfAt=Date.now();keep();setTimeout(()=>{location.href="mailto:"+encodeURIComponent(h.to||"").replace(/%40/g,"@").replace(/%2C/g,",")+"?subject="+encodeURIComponent(subj)+"&body="+encodeURIComponent(body+"\n\n(Attach "+name+" from your Downloads.)")},400);toast("PDF saved. Attach it to the email that opens.")}
  else toast("PDF saved: "+name)}
window.harpPDF=h=>build(h||cur);window.harpOpen=()=>{view="harp";cur=null;render();window.scrollTo(0,0)};
/* ---------- ways in: Home, Tools, My page ---------- */
const btn=`<button class="btn alt" data-go="harp" id="hpGo" style="width:100%;margin-top:10px">📝 HARP form (holiday safety brief)</button>`;
{const _rb=renderBoard;renderBoard=function(){const r=_rb.apply(this,arguments);try{const m=$("#main");if(m&&!$("#hpGo")&&S.mode!=="civilian"){const ck=$("#myCk");if(ck)ck.insertAdjacentHTML("afterend",btn);else m.insertAdjacentHTML("beforeend",btn)}}catch(e){}return r}}
if(typeof renderMe==="function"){const _rm=renderMe;renderMe=function(){const r=_rm.apply(this,arguments);try{const m=$("#main");if(m&&!$("#hpGo"))m.insertAdjacentHTML("beforeend",btn)}catch(e){}return r}}
if(typeof renderTools==="function"){const _rt=renderTools;renderTools=function(){const r=_rt.apply(this,arguments);try{const m=$("#main");if(m&&!$("#hpGo")){const s=m.querySelector(".hc-search");if(s)s.insertAdjacentHTML("afterend",btn);else m.insertAdjacentHTML("afterbegin",btn)}}catch(e){}return r}}
if(typeof HELP==="object")HELP.harp=["HARP form","Holiday Accident Reduction Program, filled out and signed on the phone, then sent as a PDF.",["Home, Tools or My page → HARP form → New.","Part A for the Marine, Part B for the small unit leader, the POV checklist (All SAT for a clean car) and the Pre-Trip checklist.","Everyone signs with a finger. Email / Share sends the PDF from Mail."]];
{const st=document.createElement("style");st.textContent=`.hp-sec{display:flex;justify-content:space-between;align-items:center;width:100%;margin-top:10px;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--surface);font:inherit;font-weight:800;color:var(--ink);cursor:pointer;text-align:left}
.hp-sec.on{border-color:var(--brass);border-bottom-left-radius:0;border-bottom-right-radius:0}.hp-sec+.hp-body{margin-top:0;border-top-left-radius:0;border-top-right-radius:0;border-color:var(--brass)}
.hp-body label{margin-top:10px}.hp-act,.hp-pov,.hp-pre,.hp-sig{padding:10px 0;border-top:1px solid var(--line)}.hp-act:first-of-type{border-top:0}
.hp-q{font-size:14px;margin-bottom:6px}.hp-pov .evts button.hp-un[aria-pressed=true]{background:var(--warn);color:#fff;border-color:var(--warn)}
.hp-pad{width:100%;height:110px;border:1px solid var(--line);border-radius:10px;background:#fff;margin-top:8px;touch-action:none;display:block}`;document.head.appendChild(st)}
})();
