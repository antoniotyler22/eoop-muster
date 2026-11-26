/* Accounted For 4.148.0: Safety, built out (Pro). Four additions to Tools → Safety:
   1. Chain tab: when a check-in deadline passes with people still missing, a timed chain of steps runs until someone says
      "I've got it": a push to this leader's phone, a text to the missing (server, needs Twilio text credits), a robot call
      (press 1; asks first), a count-only Word of Mouth post to section leaders, then the missing show red and the OIC is
      alerted. Each step's minutes after the deadline can be changed or the step turned off. It runs while the app is open on
      the leader's phone; the deadline push itself still comes from the server with the app closed (setup part 22).
      Steps that need Twilio are marked and skipped until texting is set up. Names never go in the Word of Mouth post.
   2. Tap-in: a Tag button per muster point. A daily tag opens accountedfor://safe (checks the person in as On Hand, names the
      place), a muster tag carries the open check-in's link (no app needed). Writes straight to an NFC tag on phones that allow it
      (Android); on iPhone copy the link into any NFC tag writer app, then iPhones read the tag with no app open.
   3. Reunite: a "Guardian at the gate" card on top of the existing Reunification tab: the next guardian who is here, release to an
      approved guardian with the ID check, or log "Not on list". Stays on this phone like the rest of Reunification.
   4. Drills: a Reconciliation PDF per drill with time to 100%, the check-in curve, the last-quarter arrivals, who was missing,
      visitors, releases during the drill and a Reviewed-by line. */
(()=>{
const E=s=>esc(String(s==null?"":s));
const sfx=()=>{S.sf=S.sf&&typeof S.sf==="object"?S.sf:{};return S.sf};
const hm=t=>new Date(t).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
/* ---------- 1. alert chain ---------- */
const STEPS=[{k:"push",l:"Push to this phone",m:0},{k:"text",l:"Text the missing",m:2},{k:"call",l:"Robot call: press 1",m:5},{k:"leader",l:"Alert section leaders",m:8},{k:"oic",l:"Red on the board + alert OIC",m:12}];
const MINS=[0,1,2,3,5,8,10,12,15,20,30];
function chain(){const c=sfx();if(!c.chain||typeof c.chain!=="object")c.chain={};const h=c.chain;
  if(h.on===undefined)h.on=true;
  if(!Array.isArray(h.steps)||h.steps.length!==STEPS.length)h.steps=STEPS.map(x=>({k:x.k,m:x.m,on:true}));
  if(!h.fired||typeof h.fired!=="object")h.fired={};if(!h.ack||typeof h.ack!=="object")h.ack={};if(!h.red||typeof h.red!=="object")h.red={};return h}
const real=()=>S.source!=="sample"&&Array.isArray(S.roster)&&S.roster.length>0;
const missing=()=>{if(!S.rc||!S.rc.open||typeof recallPool!=="function")return[];const ci=S.rc.ci||{},res=S.rc.res||{};return recallPool().filter(m=>!ci[m.id]&&res[m.id]!=="ok")};
const due=()=>S.rc&&S.rc.open&&S.rc.esc&&+S.rc.esc.due||0;
const pro=()=>typeof proTok==="function"&&!!proTok();
const canText=()=>pro()&&!!S.smsSrv;
const canCall=()=>pro()&&!!S.smsSrv;
const lab=k=>(STEPS.find(x=>x.k===k)||{}).l||k;
/* where each step stands right now: off, wait, done, live (fired in the last 2 min), skip (needs Twilio), due (waiting on a tap) */
function chainState(now=Date.now()){const h=chain(),d=due(),rid=S.rc&&S.rc.rid;if(!h.on||!d||!rid)return null;
  const miss=missing(),acked=!!h.ack[rid];
  const steps=h.steps.map(st=>{const key=rid+"|"+st.k,at=d+st.m*60000,f=h.fired[key];let s;
    if(!st.on)s="off";else if(f&&f.skip)s="skip";else if(f&&f.manual)s="due";else if(f)s=now-f.t<120000?"live":"done";else if(acked||!miss.length)s="idle";else s=now>=at?"due":"wait";
    return {k:st.k,m:st.m,on:st.on,at,s,l:lab(st.k)}});
  return {rid,due:d,miss,acked,steps}}
async function fire(k,miss){const h=chain(),rid=S.rc.rid,key=rid+"|"+k,n=miss.length;
  h.fired[key]={t:Date.now()};
  if(k==="push"){try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}try{typeof localAlert==="function"&&localAlert("⏰ "+n+" not checked in","Alert chain started. Open Accounted For.","chain")}catch(e){}toast("⏰ "+n+" not checked in. Alert chain started.")}
  else if(k==="text"){if(!canText()){h.fired[key]={t:Date.now(),skip:1};return}
    const b=document.createElement("button");b.setAttribute("data-sms-all","1");b.style.display="none";document.body.appendChild(b);b.click();b.remove();try{actAdd("📨","Chain: texted "+n+" not checked in","safety")}catch(e){}}
  else if(k==="call"){if(!canCall()){h.fired[key]={t:Date.now(),skip:1};return}
    h.fired[key]={t:Date.now(),manual:1};toast("Chain: time to call "+n+". Tap Call in the Chain tab.")}
  else if(k==="leader"){const ps=window.proSafety;let ok=false;try{ok=ps&&await ps.postTeam(n+" "+(n===1?"person hasn't":"people haven't")+" checked in. Leaders: open Check-ins and follow up.")}catch(e){}
    if(!ok)h.fired[key]={t:Date.now(),skip:1};else try{actAdd("📣","Chain: told section leaders "+n+" not checked in","safety")}catch(e){}}
  else if(k==="oic"){for(const m of miss)h.red[m.id]=rid+"|"+Date.now();try{actAdd("🔴",n+" still unaccounted for. Chain reached the OIC.","safety")}catch(e){}
    try{typeof localAlert==="function"&&localAlert("🔴 "+n+" unaccounted for","The alert chain reached the OIC step.","chain")}catch(e){}}
  save()}
async function tick(){if(!real()||(typeof memberMode==="function"&&memberMode()))return;const st=chainState();if(!st||st.acked||!st.miss.length)return;
  for(const s of st.steps){if(s.s==="due"&&!chain().fired[st.rid+"|"+s.k])await fire(s.k,st.miss)}
  if(view==="safety"&&chain&&sfx().tab==="chain")window.renderSafety&&renderSafety()}
window.spChainState=chainState;window.spChainTick=tick;window.spChainFire=fire;
const TXT={wait:"Waiting",done:"Sent",live:"Live",skip:"Needs Twilio text credits",due:"Tap to call",off:"Off",idle:"—"};
function chainHTML(){const h=chain(),st=chainState(),on=h.on;
  let top="";
  if(st&&st.miss.length&&Date.now()>=st.due){const first=st.miss.slice(0,3).map(m=>E((m.rank?m.rank+" ":"")+m.name)).join(", ");
    top=`<div class="panel" style="border-color:var(--warn)"><b style="color:var(--warn)">MISSED CHECK-IN · ${E(hm(st.due))}</b><div style="font-size:18px;font-weight:700;margin:4px 0">${st.miss.length} not checked in</div><div class="note" style="margin:0">${first}${st.miss.length>3?" …":""}</div></div>`}
  else if(!st)top=`<div class="panel"><b>Alert chain</b><p class="note">Starts on its own when a check-in deadline passes with people still missing. On Recall, start a check-in and set a deadline.</p></div>`;
  const rows=(st?st.steps:h.steps.map(x=>({...x,s:x.on?"idle":"off",l:lab(x.k)}))).map((s,i)=>`<div class="rrow" style="--sc:${s.s==="live"?"var(--accent,#0857e8)":s.s==="skip"?"var(--warn)":"var(--line)"};margin-top:8px"><div class="rtop"><div class="who"><b>${i+1}. ${E(s.l)}</b><div class="note" style="margin:0">${st?E(hm(s.at))+" · ":""}${s.m===0?"at the deadline":s.m+" min after"}${s.k==="call"?" · asks before dialing":""}</div></div><div class="evts"><span class="note" style="margin:0;font-weight:700">${E(TXT[s.s]||"")}</span>${s.s==="due"&&s.k==="call"?`<button data-sp-call="1">Call</button>`:""}</div></div></div>`).join("");
  const edit=h.steps.map((s,i)=>`<div class="row2" style="margin-top:6px;align-items:center"><label style="flex:1;font-size:13px;font-weight:600;display:flex;gap:8px;align-items:center"><input type="checkbox" data-sp-son="${i}" ${s.on?"checked":""}> ${E(lab(s.k))}</label><select data-sp-sm="${i}" aria-label="Minutes after the deadline for ${E(lab(s.k))}" style="max-width:110px">${MINS.map(m=>`<option value="${m}"${m===s.m?" selected":""}>${m} min</option>`).join("")}</select></div>`).join("");
  return top+`<div class="panel"><b>Chain</b><label class="note" style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" id="spChainOn" ${on?"checked":""}> Run the chain after a missed deadline</label>${rows}
    ${st&&st.miss.length&&!st.acked?`<button class="btn" id="spAck" style="width:100%;margin-top:10px;min-height:52px">I've got it · stop chain</button>`:st&&st.acked?`<p class="note">Stopped at ${E(hm(h.ack[st.rid]))}.</p>`:""}
    <p class="note" style="margin-top:10px">The chain stops the moment you tap I've got it. It runs while the app is open on this phone. Texts and calls need Twilio (Pro). The Word of Mouth post has a count only, never names.</p></div>
    <details class="panel"><summary><b>Edit chain timing</b></summary>${edit}</details>`}
/* people the chain reached the OIC step for show red on the board */
const redIds=()=>{const h=chain(),rid=S.rc&&S.rc.rid;const o=new Set();if(rid)for(const [id,v] of Object.entries(h.red))if(String(v).startsWith(rid+"|"))o.add(id);return o};
function markRed(){try{const ids=redIds();if(!ids.size||!(S.rc&&S.rc.open))return;for(const id of ids){if((S.rc.ci||{})[id])continue;
  const w=document.querySelector('.m [data-pcard="'+(window.CSS&&CSS.escape?CSS.escape(id):id)+'"]');if(!w)continue;const row=w.closest(".m");if(row)row.style.setProperty("--sc","#e5484d");if(!w.querySelector(".chred"))w.insertAdjacentHTML("beforeend",`<span class="tag chred" style="color:#e5484d;font-weight:700">Unaccounted</span>`)}}catch(e){}}
try{const mo=new MutationObserver(()=>{if(markRed.busy)return;markRed.busy=1;try{markRed()}finally{setTimeout(()=>{markRed.busy=0},0)}});const mm=document.getElementById("main");mm&&mo.observe(mm,{childList:true})}catch(e){}
if(typeof every==="function"){every(20000,()=>{tick().catch(()=>{})},"sp-chain")}
/* ---------- 2. NFC tags ---------- */
const enc=encodeURIComponent;
const dailyLink=n=>"accountedfor://safe?pt="+enc(n);
const musterLink=n=>S.rc&&S.rc.open&&typeof ciLink==="function"?ciLink()+"&pt="+enc(n):"";
window.spNfcHtml=c=>{const n=Array.isArray(c.pts)&&typeof c.nfc==="number"?c.pts[c.nfc]:null;if(!n)return "";const ml=musterLink(n),can=typeof window.NDEFReader==="function";
  return `<div class="panel" id="spNfc"><b>NFC tag · ${E(n)}</b><p class="note">Stick a tag at this point. Tap it with a phone to check in. Two kinds:</p>
    <div class="card" style="margin:6px 0;padding:10px 12px"><b>Daily tag</b><div class="note" style="margin:2px 0 6px">Opens Accounted For and checks in as On Hand at ${E(n)}. Stays good for every check-in.</div><div class="evts"><button data-sp-ncopy="d">Copy link</button>${can?`<button data-sp-nwrite="d">Write to tag</button>`:""}</div></div>
    <div class="card" style="margin:6px 0;padding:10px 12px"><b>Muster tag</b><div class="note" style="margin:2px 0 6px">${ml?"Opens this check-in's page, no app needed. Good for this check-in only.":"Start a check-in on Recall first: this tag carries that check-in's link."}</div><div class="evts"><button data-sp-ncopy="m"${ml?"":" disabled"}>Copy link</button>${can&&ml?`<button data-sp-nwrite="m">Write to tag</button>`:""}</div></div>
    <p class="note">${can?"Hold the tag to the back of the phone after you tap Write.":"This phone can't write tags itself. Paste the link into a free NFC tag writer app (for example NFC Tools), then hold a blank tag to the phone. iPhones read the tag with no app open."}</p></div>`};
async function nfcWrite(which){const c=sfx(),n=c.pts&&c.pts[c.nfc];if(!n)return;const link=which==="m"?musterLink(n):dailyLink(n);if(!link)return;
  try{const r=new window.NDEFReader();toast("Hold the tag to the back of the phone");await r.write({records:[{recordType:"url",data:link}]});toast("Tag written: "+n)}
  catch(e){toast("Couldn't write the tag: "+String(e&&e.message||e).slice(0,60))}}
/* ---------- 3. guardian at the gate ---------- */
const os=()=>{S.os=S.os&&typeof S.os==="object"?S.os:{};if(!S.os.reun||typeof S.os.reun!=="object")S.os.reun={site:"",state:{},guard:{},sel:""};return S.os};
const nm=m=>((m.rank?m.rank+" ":"")+m.name).trim();
const people=()=>(S.roster||[]).filter(m=>m.sec!=="ATT");
const atGate=()=>{const r=os().reun;return people().filter(m=>(r.state[m.id]||{}).s==="h").sort((a,b)=>((r.state[a.id]||{}).t||0)-((r.state[b.id]||{}).t||0))};
function gateHTML(){const r=os().reun,q=atGate(),m=q[0];
  if(!m)return `<div class="panel" id="spGate"><b>Guardian at the gate</b><p class="note">No one at the gate. When a guardian arrives, pick the child below and tap Mark guardian here. They line up here.</p></div>`;
  const gs=r.guard[m.id]||[];
  return `<div class="panel" id="spGate" style="border-color:var(--accent,#0857e8)"><div class="note" style="margin:0;font-weight:700">GUARDIAN AT THE GATE</div>
    <div style="font-size:18px;font-weight:700;margin:4px 0">${E(nm(m))}</div>
    ${gs.length?gs.map((g,i)=>`<div class="rrow" style="--sc:var(--brass);margin-top:6px"><div class="rtop"><div class="who"><b>${E(g.n)}</b> <span class="note">${E(g.rel||"")}${g.ph?" · "+E(g.ph):""} · on list</span></div><div class="evts"><button data-sp-grel="${E(m.id)}|${i}">Release</button></div></div></div>`).join(""):`<p class="note">No approved guardians on file for ${E(nm(m))}. Add them below, or log Not on list.</p>`}
    <label class="note" style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" id="spGId"> I checked the guardian's photo ID</label>
    <div class="row2" style="margin-top:6px"><input id="spGName" maxlength="40" placeholder="Name of the person at the gate" aria-label="Name of the person at the gate"><button class="btn alt" data-sp-gno="${E(m.id)}">Not on list</button></div>
    ${q.length>1?`<div class="note" style="margin-top:8px"><b>Next at the gate:</b> ${q.slice(1,4).map(x=>E(nm(x))).join(" · ")}${q.length>4?" …":""}</div>`:""}</div>`}
function release(id,i){const r=os().reun,m=people().find(x=>x.id===id),g=m&&(r.guard[id]||[])[i];if(!g)return;
  const chk=document.getElementById("spGId");if(!chk||!chk.checked){toast("Check the guardian's ID first");return}
  const t=Date.now();r.state[id]={s:"r",t,to:g.n};sfx().reun=Array.isArray(sfx().reun)?sfx().reun:[];sfx().reun.unshift({t,who:nm(m),to:g.n+(g.rel?" ("+g.rel+")":""),id:true,site:r.site||""});sfx().reun=sfx().reun.slice(0,500);
  try{actAdd("🤝",nm(m)+" released to "+g.n,"safety")}catch(e){}save();redrawSafety();toast(nm(m)+" released")}
function notOnList(id){const r=os().reun,m=people().find(x=>x.id===id);if(!m)return;const i=document.getElementById("spGName"),n=i&&i.value.trim();if(!n){toast("Type the name of the person at the gate");return}
  const t=Date.now();sfx().reun=Array.isArray(sfx().reun)?sfx().reun:[];sfx().reun.unshift({t,who:nm(m),to:"REFUSED: "+n.slice(0,40)+" (not on list)",id:false,site:r.site||""});sfx().reun=sfx().reun.slice(0,500);
  try{actAdd("⛔","Not on list at the gate for "+nm(m),"safety")}catch(e){}save();redrawSafety();toast("Logged: not on list")}
const redrawSafety=()=>{if(view==="safety"&&typeof window.renderSafety==="function"){const y=window.scrollY;renderSafety();window.scrollTo(0,y)}};
/* ---------- 4. reconciliation PDF ---------- */
function reconPDF(d){const P=window.proSafety,M=44,doc=window.makePDF("Drill reconciliation");
  const span=Math.max(1,(d.all||((d.end||d.t)-d.t)));const u=typeof unitName==="function"?unitName():"";
  doc.line(u+" · Drill reconciliation report",{size:16,bold:true});
  doc.line(P.typeName(d.type)+" · "+P.dd(d.t)+" · started "+P.hm(d.t),{size:10,gray:true});doc.gap(6);doc.rule();
  doc.row([{x:M,t:"Time to everyone accounted for",w:230},{x:300,t:d.all!=null?P.dur(d.all):"not reached",w:120,bold:true}]);
  doc.row([{x:M,t:"Accounted for",w:230},{x:300,t:d.ok+" of "+d.n+(d.vis?"  +  "+d.visOk+" of "+d.vis+" visitors":""),w:240,bold:true}]);
  doc.row([{x:M,t:"First check-in after",w:230},{x:300,t:d.first!=null?P.dur(d.first):"-",w:120}]);
  doc.row([{x:M,t:"Needed help",w:230},{x:300,t:String(d.help||0),w:120}]);
  doc.row([{x:M,t:"Arrived in the last quarter of the drill",w:230},{x:300,t:d.late3!=null?String(d.late3):"-",w:120}]);
  doc.gap(6);doc.rule();doc.line("Accounted for over time",{size:12,bold:true});
  const cv=Array.isArray(d.curve)?d.curve:[];const top=Math.max(1,d.n||1);
  if(cv.length)cv.forEach((n,i)=>{doc.bar(220,Math.min(1,n/top)*260,8);doc.row([{x:M,t:P.dur(span*(i+1)/6),w:60},{x:100,t:n+" of "+d.n,w:110}])});
  else doc.line("No timeline was recorded for this drill (it was logged before this report existed).",{gray:true});
  doc.gap(6);doc.rule();doc.line("Not accounted for at close ("+(d.missN||0)+")",{size:12,bold:true});
  doc.line((d.miss&&d.miss.length?d.miss.join(", "):"Everyone was accounted for."),{size:10});
  const rel=(sfx().reun||[]).filter(r=>r.t>=d.t&&r.t<=((d.end||d.t)+4*3600000));
  doc.gap(6);doc.rule();doc.line("Releases during and after this drill ("+rel.length+")",{size:12,bold:true});
  if(rel.length)rel.slice().reverse().forEach(r=>doc.row([{x:M,t:P.hm(r.t),w:50},{x:100,t:r.who,w:160},{x:270,t:r.to,w:220},{x:495,t:r.id?"ID checked":"-",w:60}]));else doc.line("None recorded.",{gray:true});
  doc.gap(26);doc.rule();doc.line("Reviewed by (sign here): ______________________________      Date: ______________",{size:10});
  return doc.out()}
/* ---------- wiring ---------- */
window.spTabs={chain:chainHTML,reunite:()=>{const o=(window.osTabs||{}).reunite;return gateHTML()+(o?o():"")}};
document.addEventListener("click",async e=>{const t=e.target;if(!t||!t.closest||view!=="safety")return;let x;
  if(x=t.closest("[data-sf-nfc]")){const c=sfx(),i=+x.dataset.sfNfc;c.nfc=c.nfc===i?null:i;save();redrawSafety();return}
  if(x=t.closest("[data-sp-ncopy]")){const c=sfx(),n=c.pts&&c.pts[c.nfc];if(!n)return;const l=x.dataset.spNcopy==="m"?musterLink(n):dailyLink(n);try{await navigator.clipboard.writeText(l);toast("Link copied")}catch(err){toast(l)}return}
  if(x=t.closest("[data-sp-nwrite]")){nfcWrite(x.dataset.spNwrite);return}
  if(t.closest("#spAck")){const st=chainState();if(st){chain().ack[st.rid]=Date.now();try{actAdd("✓","Alert chain stopped by "+(S.myName||"a leader"),"safety")}catch(err){}save();redrawSafety();toast("Chain stopped")}return}
  if(t.closest("[data-sp-call]")){const b=document.createElement("button");b.setAttribute("data-call-all","1");b.style.display="none";document.body.appendChild(b);b.click();b.remove();return}
  if(x=t.closest("[data-sp-grel]")){const[id,i]=x.dataset.spGrel.split("|");release(id,+i);return}
  if(x=t.closest("[data-sp-gno]")){notOnList(x.dataset.spGno);return}
  if(x=t.closest("[data-sf-recon]")){const d=(Array.isArray(S.drills)?S.drills:[]).find(z=>z.id===x.dataset.sfRecon);if(!d)return;try{window.proSafety.savePDF(reconPDF(d),safeName((typeof unitName==="function"?unitName():"")+" drill reconciliation "+d.id)+".pdf")}catch(err){toast("Couldn't make the PDF")}}});
document.addEventListener("change",e=>{const t=e.target;if(!t||view!=="safety")return;const h=chain();
  if(t.id==="spChainOn"){h.on=!!t.checked;save();redrawSafety();return}
  if(t.dataset&&t.dataset.spSon!=null){h.steps[+t.dataset.spSon].on=!!t.checked;save();redrawSafety();return}
  if(t.dataset&&t.dataset.spSm!=null){h.steps[+t.dataset.spSm].m=+t.value||0;save();redrawSafety()}});
window.spReconPDF=reconPDF;
})();
