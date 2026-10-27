/* Accounted For 1.2 — loaded by index.html after v11.js.
   1. Move people between sections (person card + bulk move).
   2. 6W in the BLUF / Who / What / When / Where / Why / WAWDAI / FPC / Domicile / EAS format, editable, email or text.
   3. Account for anything: a Custom version you name yourself, event quick-picks (5K, run, TAD…), your own event types.
   4. Leaders can open any person's My page and see exactly what they see.
   5. Messages: private chat between the leader and each member (inside the app).
   6. Pages: a social page for each person (invite only) and group pages where people post, ask and give advice.
   7. Ask (AI) is an optional Pro feature, off until you turn it on.
   All server traffic goes to the team's Supabase project; messages, posts and photos are encrypted on the phone first. */
(()=>{
const sheetOpen=()=>{const sh=$("#sheet");sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add("open")))};
const redraw=fn=>{const y=window.scrollY;fn();window.scrollTo(0,y)};
const leader=()=>!(typeof memberMode==="function"&&memberMode())&&S.role!=="view";
const RK={LCPL:"LCpl",SSGT:"SSgt",GYSGT:"GySgt",MSGT:"MSgt","1STSGT":"1stSgt",MGYSGT:"MGySgt",SGTMAJ:"SgtMaj","2NDLT":"2ndLt","1STLT":"1stLt",LTCOL:"LtCol",CWO2:"CWO2",CWO3:"CWO3",CWO4:"CWO4",CWO5:"CWO5",WO:"WO",PFC:"PFC",PVT:"Pvt",CPL:"Cpl",SGT:"Sgt",CAPT:"Capt",MAJ:"Maj",COL:"Col"};
const title=s=>{const u=String(s||"").toUpperCase().trim();return RK[u]||String(s||"").toLowerCase().replace(/\b[a-z]/g,c=>c.toUpperCase())};
const secOpts=cur=>SECTIONS.map(s=>s[0]).concat("ATT").map(k=>`<option value="${esc(k)}"${k===cur?" selected":""}>${esc(k==="ATT"?"ATT (attached)":k+" · "+((SECTIONS.find(x=>x[0]===k)||[])[1]||""))}</option>`).join("");
const dmTime=t=>{const d=new Date(t);const td=new Date();return d.toDateString()===td.toDateString()?d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):d.toLocaleDateString([],{month:"short",day:"numeric"})+" "+d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})};
async function sha16(s){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
const newEk=()=>b64url(crypto.getRandomValues(new Uint8Array(32)));
function afterRoster(msg){save();try{if(S.board)rpPublish(true)}catch(e){}try{mpSchedule()}catch(e){}renderTabs();if(msg)toast(msg)}

/* shrink a photo so it fits in one encrypted post */
function shrinkPhoto(file){return new Promise((res,rej)=>{const url=URL.createObjectURL(file);const im=new Image();
  im.onload=()=>{let max=900,q=.78,out="";for(let i=0;i<9;i++){const sc=Math.min(1,max/Math.max(im.width,im.height));const c=document.createElement("canvas");c.width=Math.round(im.width*sc);c.height=Math.round(im.height*sc);
      c.getContext("2d").drawImage(im,0,0,c.width,c.height);out=c.toDataURL("image/jpeg",q);if(out.length<100000)break;if(q>.5)q-=.1;else{max=Math.round(max*.8)}}
    URL.revokeObjectURL(url);out.length<115000?res(out):rej(new Error("That photo is too big. Try a smaller one."))};
  im.onerror=()=>{URL.revokeObjectURL(url);rej(new Error("Couldn't read that photo."))};im.src=url})}
const imgOK=s=>typeof s==="string"&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s)&&s.length<130000;

/* ================= 1. MOVE PEOPLE BETWEEN SECTIONS ================= */
{const _rp=renderPerson;renderPerson=function(){_rp.apply(this,arguments);const m=S.roster.find(x=>x.id===pid);if(!m)return;const main=$("#main");
  const blk=`<div class="panel" id="v12PMove"><div class="row2" style="align-items:end"><div><label for="v12Sec">Section</label><select id="v12Sec" class="wsel">${secOpts(m.sec)}</select></div>
    ${leader()?`<button class="btn alt" id="v12PView">👁 View their My page</button>`:""}</div>${leader()?`<button class="btn alt" id="v12PMsg">💬 Message ${esc(title(m.rank)+" "+title(lastOf(m)))}</button>`:""}</div>`;
  const h2=main.querySelector(".sechead");const note=h2&&h2.nextElementSibling;(note||h2||main.firstElementChild).insertAdjacentHTML("afterend",blk)}}
let mvSel=new Set(),mvQ="",mvTo="";
function moveHTML(){const q=mvQ.toLowerCase();const list=sorted(S.roster).filter(m=>!q||(m.rank+" "+m.name+" "+m.sec).toLowerCase().includes(q));
  return `<div class="panel" id="v12Move"><b>Move people between sections</b><input class="search" id="v12MvQ" type="search" placeholder="Find people" value="${esc(mvQ)}">
    <div class="alist" style="max-height:300px;overflow:auto">${list.slice(0,400).map(m=>`<label class="tog" style="padding:6px 2px;border-bottom:1px solid var(--line)"><input type="checkbox" data-v12mv="${m.id}"${mvSel.has(m.id)?" checked":""}> <span><b>${esc(m.rank)}</b> ${esc(m.name)} <span class="note">· ${esc(m.sec)}</span></span></label>`).join("")}</div>
    <div class="row2" style="align-items:end"><div><label for="v12MvTo">Move to</label><select id="v12MvTo" class="wsel"><option value="">Pick a section…</option>${secOpts(mvTo)}</select></div><button class="btn" id="v12MvGo"${mvSel.size&&mvTo?"":" disabled"}>Move ${mvSel.size||""}</button></div></div>`}
{const _rpe=renderPeople;renderPeople=function(){_rpe.apply(this,arguments);if(!leader()||!canEdit())return;const s=[...document.querySelectorAll("#main .sech")].pop();
  const b=`<details class="panel" id="v12MoveWrap"${mvSel.size||mvQ?" open":""}><summary><b>↔ Move people between sections</b></summary>${moveHTML()}</details>`;s?s.insertAdjacentHTML("beforebegin",b):$("#main").insertAdjacentHTML("beforeend",b)}}

/* ================= 2. 6W — YOUR FORMAT ================= */
const W6_DEF=[{k:"bluf",l:"BLUF",t:"long",h:"Bottom line up front: one or two sentences"},{k:"who",l:"Who",t:"short",h:"Rank Name (ID) and who else is involved"},{k:"what",l:"What",t:"long",h:"What happened and what is happening now"},
  {k:"when",l:"When",t:"short",h:"Time, e.g. 1452"},{k:"where",l:"Where",t:"short",h:"Place"},{k:"why",l:"Why",t:"long",h:"Why it happened / why this action"},
  {k:"wawdai",l:"WAWDAI",t:"long",h:"What are we doing about it"},{k:"fpc",l:"FPC Status",t:"choice",o:["High","Medium","Low","N/A"]},{k:"dom",l:"Domicile",t:"long",h:"Street\nCity, State ZIP"},{k:"eas",l:"EAS",t:"short",h:"YYYYMMDD"}];
const w6T=()=>(Array.isArray(S.w6t)&&S.w6t.length?S.w6t:W6_DEF);
let W2=null,w6Edit=false;
const hhmm=()=>{const d=new Date();return String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0")};
function w6New(){return {id:"x"+Date.now().toString(36),mid:"",f:{when:hhmm()},t:Date.now()}}
function w6Text(w){const L=[];for(const fd of w6T()){const v=String((w.f||{})[fd.k]||"").trim();L.push(v.includes("\n")?fd.l+": \n"+v:fd.l+": "+v)}return L.join("\n\n")}
function w6Subj(w){const f=w.f||{};return "6W"+(f.who?": "+String(f.who).slice(0,60):f.bluf?": "+String(f.bluf).slice(0,60):"")}
function w6Fill(w,m){if(!m)return;w.mid=m.id;w.f=w.f||{};w.f.who=title(m.rank)+" "+title(lastOf(m));const e=isoOf(m.eas||"");if(e)w.f.eas=e.replace(/-/g,"")}
function w6Mail(w){const to=String(S.w6To||"").split(/[,;\s]+/).filter(x=>/@/.test(x)).join(",");return "mailto:"+to.replace(/[^A-Za-z0-9@._+,-]/g,"")+"?subject="+encodeURIComponent(w6Subj(w))+"&body="+encodeURIComponent(w6Text(w))}
function renderW6(){if(!W2)W2=w6New();const w=W2;const T=w6T();
  const opts=SECTIONS.map(s=>s[0]).concat("ATT").map(k=>{const ms=sorted(S.roster.filter(m=>m.sec===k));return ms.length?`<optgroup label="${k}">${ms.map(m=>`<option value="${m.id}"${m.id===w.mid?" selected":""}>${esc(m.rank+" "+m.name)}</option>`).join("")}</optgroup>`:""}).join("");
  let h=banner()+`<h2>6W report</h2><div class="panel"><label for="v12WMar">Fill from a person (optional)</label><select id="v12WMar" class="wsel"><option value="">Pick a person…</option>${opts}</select>`;
  for(const fd of T){const v=(w.f||{})[fd.k]||"";h+=`<label for="v12f_${esc(fd.k)}">${esc(fd.l)}</label>`;
    if(fd.t==="long")h+=`<textarea class="wta" id="v12f_${esc(fd.k)}" data-v12wf="${esc(fd.k)}" placeholder="${esc(fd.h||"")}">${esc(v)}</textarea>`;
    else if(fd.t==="choice")h+=`<div class="evts">${(fd.o||[]).map(o=>`<button data-v12wc="${esc(fd.k)}" data-val="${esc(o)}" aria-pressed="${v===o}">${esc(o)}</button>`).join("")}</div>`;
    else h+=`<input type="text" id="v12f_${esc(fd.k)}" data-v12wf="${esc(fd.k)}" value="${esc(v)}" placeholder="${esc(fd.h||"")}">`}
  h+=`<details class="panel" style="margin:4px 0 0"${w6Edit?" open":""} id="v12WFmt"><summary><b>Edit the format</b> · add, remove, rename or reorder lines</summary>
    ${T.map((fd,i)=>`<div class="row2" style="align-items:center;gap:6px"><input type="text" data-v12tl="${i}" value="${esc(fd.l)}" aria-label="Line name" style="flex:2"><select data-v12tt="${i}" class="wsel" style="flex:1">${[["short","Short"],["long","Long"],["choice","Choices"]].map(([k,l])=>`<option value="${k}"${fd.t===k?" selected":""}>${l}</option>`).join("")}</select>
      <button class="chip" data-v12tu="${i}" aria-label="Move up"${i?"":" disabled"}>▲</button><button class="chip" data-v12td="${i}" aria-label="Move down"${i<T.length-1?"":" disabled"}>▼</button><button class="chip" data-v12tx="${i}" aria-label="Remove" style="color:var(--warn)">✕</button></div>
      ${fd.t==="choice"?`<input type="text" data-v12to="${i}" value="${esc((fd.o||[]).join(", "))}" placeholder="Choices, separated by commas" style="margin-bottom:6px">`:""}`).join("")}
    <div class="row2"><button class="btn alt" id="v12TAdd">+ Add a line</button><button class="btn alt" id="v12TReset">${armed==="v12treset"?"Tap again to reset":"Reset to standard"}</button></div></details></div>`;
  h+=`<h2>Preview</h2><div class="panel"><textarea id="v12WMsg" readonly style="min-height:260px" aria-label="6W preview">${esc(w6Text(w))}</textarea>
    <label for="v12WTo">Email to (separate with commas)</label><input type="email" id="v12WTo" multiple value="${esc(S.w6To||"")}" placeholder="sgtmaj@example.mil, oic@example.mil">
    <div class="row2"><a class="btn" id="v12WMail" href="${esc(w6Mail(w))}">✉ Email it</a><a class="btn" id="v12WSms" href="${esc(smsHref(w6Text(w)))}">💬 Text it</a></div>
    <div class="row2"><button class="btn alt" id="v12WCopy">Copy</button><button class="btn alt" id="v12WShare">Share…</button></div>
    <div class="row2"><button class="btn alt" id="v12WSave">Save</button><button class="btn alt" id="v12WNew">New report</button></div>
    <p class="note">Texts go to the numbers on the TEXT screen. It includes personal information: send it only to people who need it, over channels your organization approves.</p></div>`;
  const log=(S.w62||[]).slice().reverse();
  h+=`<h2>Saved 6Ws</h2>`+(log.length?`<div class="alist">${log.map(r=>`<div class="rrow" style="--sc:var(--brass)"><div class="who"><b>${esc(String((r.f||{}).who||"6W"))}</b><div class="ph">${esc(String((r.f||{}).bluf||"").slice(0,90))}</div><div class="ph">${new Date(r.t).toLocaleString([],{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</div></div>
      <div class="row2"><button class="btn alt" data-v12wo="${r.id}">Open</button><button class="btn warn" data-v12wd="${r.id}">${armed==="v12wd"+r.id?"Tap again":"Delete"}</button></div></div>`).join("")}</div>`:`<p class="note">No saved reports on this phone yet.</p>`);
  $("#main").innerHTML=h}
function w6Refresh(){const t=w6Text(W2);const a=$("#v12WMsg");if(a)a.value=t;const s=$("#v12WSms");if(s)s.href=smsHref(t);const m=$("#v12WMail");if(m)m.href=w6Mail(W2)}
renderW=renderW6;

/* ================= 3. ACCOUNT FOR ANYTHING ================= */
const CUSTOM_KEYS=[["p","One person","Runner"],["ps","People","Runners"],["here","Present / here","Checked in"],["aob","Status 2","At the start"],["aoff","Status 3","Running"],["cod","Status 4","Finished"],["op","Status 5","Water station"],["tad","Status 6","DNF"],["lv","Status 7","Not coming"],
  ["mus","Check-in word","check-in"],["attPl","Extra people (not on roster)","Guests"],["eo","Report name","5K RACE"]];
const EV_QUICK=["5K run","Unit run","PT","TAD","Training","Meeting","Shift","Field trip","Volunteer event","Practice","Class","Inspection","Range","Drill","Travel","Game day"];
{const _al=applyLists;applyLists=function(){_al.apply(this,arguments);for(const t of (S.evTypesX||[]))if(!EV_TYPES.includes(t))EV_TYPES.push(t);for(const t of ["5K / Run","TAD / Travel"])if(!EV_TYPES.includes(t))EV_TYPES.push(t)}}
{const _re=renderEvents;renderEvents=function(){_re.apply(this,arguments);const f=$("#evForm");if(!f)return;const nm=$("#evName");
  nm.insertAdjacentHTML("afterend",`<div class="note" style="margin:6px 0 2px">Quick pick: account for anything</div><div class="evts">${EV_QUICK.map(q=>`<button type="button" data-v12q="${esc(q)}">${esc(q)}</button>`).join("")}</div>`);
  const ty=f.querySelector('input[name="evType"]');const box=ty&&ty.closest(".evts");if(box)box.insertAdjacentHTML("afterend",`<div class="row2"><input type="text" id="v12EvT" placeholder="Add your own type (e.g. Field day)" maxlength="30"><button type="button" class="btn alt" id="v12EvTAdd">Add type</button></div>`)}}
function customHTML(){if(S.mode!=="custom")return"";const c=S.customV||{};const v=MODES.custom.v;
  return `<h2>Name everything</h2><div class="panel" id="v12Cust"><p class="note">Custom version: rename the people, statuses and report name for whatever you're accounting for (a 5K, a field trip, a shift, a class).</p>
    ${CUSTOM_KEYS.map(([k,l,ph])=>`<label for="v12c_${k}">${esc(l)}</label><input type="text" id="v12c_${k}" data-v12c="${k}" maxlength="30" value="${esc(c[k]||"")}" placeholder="${esc(v[k]||ph)}">`).join("")}
    <p class="note">Sections (the tabs across the top) are renamed in Tabs below.</p><button class="btn" id="v12CustSave">Save names</button></div>`}
{const _rd2=renderData;renderData=function(){_rd2.apply(this,arguments);const vp=$("#main .vpanel");const h=customHTML()+aiHTML();if(vp)vp.insertAdjacentHTML("afterend",h);else $("#main").insertAdjacentHTML("afterbegin",h)}}
try{applyLists()}catch(e){}

/* ================= 7. ASK (AI): optional Pro feature ================= */
if(typeof PRO_FEAT==="object")PRO_FEAT.ask="Ask (AI)";
const aiOn=()=>S.aiOn===true||(S.aiOn!==false&&proOK());
function aiHTML(){return `<h2>AI</h2><div class="panel"><label class="tog"><input type="checkbox" id="v12Ai"${aiOn()?" checked":""}> <b>Ask</b>: an AI helper that answers questions from official sources (Pro)</label>
  <p class="note">On automatically with Pro. Turn it off here if you don't want it. Questions go to the AI service (Anthropic) through your Supabase server. Not official guidance.</p></div>`}
function aiPaint(){document.body.classList.toggle("v12noai",!aiOn())}
{const _tl=tabsList;tabsList=function(){let L=_tl.apply(this,arguments);if(!aiOn())L=L.filter(x=>x[0]!=="ask");if(typeof memberMode==="function"&&memberMode()&&!L.some(x=>x[0]==="pages")&&L.length<5)L.push(["pages","Pages","feed"]);return L}}
{const _to=tabOf;tabOf=function(v){if(["pages","pg"].includes(v))return memberMode()?"pages":"tools";if(v==="dm"||v==="dms")return memberMode()?"me":"tools";if(v==="mepv")return "people";if(v==="w6")return memberMode()?"today":"tools";return _to.apply(this,arguments)}}

/* ================= 4. LEADER VIEW OF A MY PAGE ================= */
let pvId=null;window.setPv=id=>{pvId=id};window.getPv=()=>pvId;
function renderMePv(){const m=S.roster.find(x=>x.id===pvId);if(!m){view="people";return render()}const saved=S.me;
  try{S.me={pk:m.pk||"preview",d:Object.assign(mpDigest(m),{at:Date.now()}),t:Date.now()};renderMe()}finally{S.me=saved}
  const main=$("#main");main.querySelectorAll("#meOff,#meRe,#tdLeader,#meIcs").forEach(x=>x.remove());
  main.insertAdjacentHTML("afterbegin",`<div class="banner" style="margin-top:12px"><span>👁 <b>Leader view.</b> This is what ${esc(title(m.rank)+" "+title(lastOf(m)))} sees on their My page${m.pk?"":" (not turned on for them yet)"}.</span><button data-pcard="${m.id}">Back</button></div>`)}

/* ================= 5. MESSAGES (leader <-> member) ================= */
S.dmMsgs=S.dmMsgs||{};S.dmSeen=S.dmSeen||{};
if(typeof SYNC_SKIP==="object"&&Array.isArray(SYNC_SKIP))SYNC_SKIP.push("dmMsgs","dmSeen","dmAfter","pages","w62","w6t","w6To","aiOn","customV","evTypesX");
if(typeof WS_GLOBAL==="object"&&Array.isArray(WS_GLOBAL))WS_GLOBAL.push("aiOn","w6t","w6To","pages","dmMineAfter","dmMine");
function dmEnsure(m){if(!m.dm){m.dm={id:rndId(20),k:rndId(32),ek:newEk(),ok:0};save()}if(!S.dmInbox){S.dmInbox=rndId(32);save()}return m.dm}
async function dmOpenSrv(m){const d=dmEnsure(m);if(d.ok)return d;await SB.rpc("dm_open",{p_id:d.id,p_key:d.k,p_inbox:S.dmInbox});d.ok=1;save();return d}
{const _md=mpDigest;mpDigest=function(m){const d=_md.apply(this,arguments);if(m&&m.dm&&m.dm.ok)d.dm={id:m.dm.id,k:m.dm.k,ek:m.dm.ek,from:String(S.postAs||S.myName||unitName()).slice(0,30)};return d}}
{const _mp=mpPublish;mpPublish=async function(){try{for(const m of S.roster.filter(m=>m.pk))await dmOpenSrv(m).catch(()=>{})}catch(e){}return _mp.apply(this,arguments)}}
async function dmSend(th,txt,img,by,name){const o={t:String(txt||"").slice(0,2000),by,n:String(name||"").slice(0,30)};if(img)o.img=img;const ct=await fdEnc(th.ek,o);const id=await SB.rpc("dm_send",{p_id:th.id,p_key:th.k,p_ct:ct});return {id:+id,t:Date.now(),...o,me:1}}
function dmPush(tid,msg){const L=S.dmMsgs[tid]=S.dmMsgs[tid]||[];if(L.some(x=>x.id===msg.id))return false;L.push(msg);L.sort((a,b)=>a.id-b.id);if(L.length>200)L.splice(0,L.length-200);return true}
let dmBusy=false;
async function dmPollLeader(){if(dmBusy||!S.dmInbox||!leader())return;dmBusy=true;let n=0;
  try{const rows=await SB.rpc("dm_inbox",{p_inbox:S.dmInbox,p_after:S.dmAfter||0});const byId={};S.roster.forEach(m=>{if(m.dm)byId[m.dm.id]=m});
    for(const r of rows||[]){S.dmAfter=Math.max(S.dmAfter||0,+r.id);const m=byId[r.thread_id];if(!m)continue;const o=await fdDec(m.dm.ek,r.ct);if(!o)continue;
      const msg={id:+r.id,t:Date.parse(r.created_at)||Date.now(),txt:String(o.t||"").slice(0,2000),by:o.by==="L"?"L":"M",n:String(o.n||"").slice(0,30),img:imgOK(o.img)?o.img:""};
      if(dmPush(r.thread_id,msg)&&msg.by==="M"){n++;actAdd("💬",title(m.rank)+" "+title(lastOf(m))+": “"+msg.txt.slice(0,60)+"”","dms")}}
    if(rows&&rows.length)save();if(n){toast("💬 "+n+" new message"+(n>1?"s":""));try{navigator.vibrate&&navigator.vibrate([60,40,60])}catch(e){}renderTabs();if(view==="dms"||view==="dm")redraw(render)}}
  catch(e){}finally{dmBusy=false}}
const myDm=()=>S.me&&S.me.d&&S.me.d.dm&&S.me.d.dm.id?S.me.d.dm:null;
async function dmPollMember(){const th=myDm();if(dmBusy||!th)return;dmBusy=true;let n=0;
  try{const rows=await SB.rpc("dm_get",{p_id:th.id,p_key:th.k,p_after:S.dmMineAfter||0});
    for(const r of rows||[]){S.dmMineAfter=Math.max(S.dmMineAfter||0,+r.id);const o=await fdDec(th.ek,r.ct);if(!o)continue;const msg={id:+r.id,t:Date.parse(r.created_at)||Date.now(),txt:String(o.t||"").slice(0,2000),by:o.by==="L"?"L":"M",n:String(o.n||"").slice(0,30),img:imgOK(o.img)?o.img:""};
      if(dmPush("mine:"+th.id,msg)&&msg.by==="L")n++}
    if(rows&&rows.length)save();if(n){toast("💬 New message from "+(th.from||"your leader"));renderTabs();if(view==="dm")redraw(render)}}catch(e){}finally{dmBusy=false}}
every(20000,()=>{if(document.hidden)return;if(leader()&&S.dmInbox)dmPollLeader();if(myDm())dmPollMember()},"v12-dm");
setTimeout(()=>{if(leader()&&S.dmInbox)dmPollLeader();if(myDm())dmPollMember()},2500);
const dmUnreadLeader=()=>S.roster.reduce((a,m)=>a+(m.dm?((S.dmMsgs[m.dm.id]||[]).filter(x=>x.by==="M"&&x.id>(S.dmSeen[m.dm.id]||0)).length):0),0);
const dmUnreadMine=()=>{const th=myDm();return th?(S.dmMsgs["mine:"+th.id]||[]).filter(x=>x.by==="L"&&x.id>(S.dmSeen["mine:"+th.id]||0)).length:0};
let dmWith=null;
function bubble(x,mine){return `<div class="v12b ${mine?"me":""}">${x.img?`<img src="${x.img}" alt="Photo" class="v12img">`:""}${x.txt?`<div>${esc(x.txt).replace(/\n/g,"<br>")}</div>`:""}<span class="v12bt">${esc(dmTime(x.t))}</span></div>`}
function chatHTML(list,mineBy,who,sub){return `<div class="sechead" style="margin-top:12px"><h2>${esc(who)}</h2><span class="note" style="margin:0">${esc(sub||"")}</span></div>
  <div class="v12chat" id="v12Chat">${list.length?list.map(x=>bubble(x,x.by===mineBy)).join(""):`<p class="note" style="text-align:center">No messages yet. Say hello.</p>`}</div>
  <div class="v12comp"><textarea id="v12DmTxt" maxlength="2000" placeholder="Message" rows="2"></textarea><div class="row2"><label class="btn alt" style="cursor:pointer">📷 Photo<input type="file" id="v12DmImg" accept="image/*" hidden></label><button class="btn" id="v12DmSend">Send</button></div><div class="note" id="v12DmOut"></div></div>
  <p class="note">Private: encrypted on this phone; only you two can read it. Don't send anything your organization says not to.</p>`}
function renderDmList(){let h=banner()+`<div class="sechead" style="margin-top:12px"><h2>Messages</h2></div>`;
  const ms=S.roster.filter(m=>m.dm&&(S.dmMsgs[m.dm.id]||[]).length).sort((a,b)=>{const la=(S.dmMsgs[a.dm.id]||[]).slice(-1)[0],lb=(S.dmMsgs[b.dm.id]||[]).slice(-1)[0];return (lb?lb.t:0)-(la?la.t:0)});
  h+=ms.length?`<div class="alist">${ms.map(m=>{const L=S.dmMsgs[m.dm.id];const last=L[L.length-1];const un=L.filter(x=>x.by==="M"&&x.id>(S.dmSeen[m.dm.id]||0)).length;
      return `<button class="lrow card" data-v12dm="${m.id}" style="width:100%;text-align:left;cursor:pointer;color:inherit;margin:4px 0">${fdAv(m.rank+" "+lastOf(m))}<span style="flex:1;min-width:0"><span class="t" style="display:block">${esc(title(m.rank)+" "+title(lastOf(m)))}${un?` <b style="color:var(--brass)">· ${un} new</b>`:""}</span><span class="s" style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${last.by==="L"?"You: ":""}${esc(last.img&&!last.txt?"📷 Photo":last.txt)} · ${esc(dmTime(last.t))}</span></span></button>`}).join("")}</div>`:`<div class="panel"><p class="note" style="margin:0">No conversations yet.</p></div>`;
  h+=`<label for="v12DmPick">Start a message</label><select id="v12DmPick" class="wsel"><option value="">Pick a person…</option>${sorted(S.roster).map(m=>`<option value="${m.id}">${esc(m.rank+" "+m.name)}${m.pk?"":" (needs My page)"}</option>`).join("")}</select>
    <p class="note">People read and answer on their My page. Turn on My page for someone from their card first.</p>`;
  $("#main").innerHTML=h}
function renderDm(){if(memberMode()||!leader()){const th=myDm();if(!th){$("#main").innerHTML=`<div class="panel" style="margin-top:14px"><p class="note" style="margin:0">Messages open once your leader turns on your My page.</p></div>`;return}
    const L=S.dmMsgs["mine:"+th.id]||[];$("#main").innerHTML=meTabs("dm")+chatHTML(L,"M",th.from||"Your leader","Private chat");const top=L.length?L[L.length-1].id:0;if(top>(S.dmSeen["mine:"+th.id]||0)){S.dmSeen["mine:"+th.id]=top;save();setTimeout(renderTabs,0)}scrollChat();return}
  const m=S.roster.find(x=>x.id===dmWith);if(!m){view="dms";return render()}
  if(!m.pk){$("#main").innerHTML=banner()+`<div class="panel" style="margin-top:14px"><p class="note">${esc(title(m.rank)+" "+title(lastOf(m)))} reads messages on their private My page. Turn it on first, then text them the link.</p><button class="btn" data-mpon="${m.id}">Turn on My page</button><button class="btn alt" data-go="dms">All messages</button></div>`;return}
  const d=dmEnsure(m);const L=S.dmMsgs[d.id]||[];$("#main").innerHTML=`<button class="chip" data-go="dms" style="cursor:pointer;margin-top:12px">◂ All messages</button>`+chatHTML(L,"L",title(m.rank)+" "+title(lastOf(m)),m.sec);
  const top=L.length?L[L.length-1].id:0;if(top>(S.dmSeen[d.id]||0)){S.dmSeen[d.id]=top;save();setTimeout(renderTabs,0)}scrollChat();if(!d.ok)dmOpenSrv(m).then(()=>mpPublish(true)).catch(()=>{})}
function scrollChat(){const c=$("#v12Chat");if(c)c.scrollTop=c.scrollHeight}
let dmImg="";

/* ================= 6. PAGES (social) ================= */
S.pages=S.pages||[];
let pgCur=null,pgOpenC=null,pgImg="",pgBusy=false,pgMenu=null;
const pgFind=id=>S.pages.find(p=>p.id===id);
const pgKey=p=>p.ok||p.mk;
const myName=()=>{const D=S.me&&S.me.d;return String(S.myName||(D?(title(D.rank)+" "+title((D.name.split(",")[0]||"").trim())):"")||S.postAs||"Me").slice(0,30)};
function pgLink(p){const q=new URLSearchParams();q.set("pg",p.id);q.set("k",p.mk);q.set("e",p.ek);q.set("n",p.name);if(p.group)q.set("g","1");return PUB()+"#"+q.toString()}
async function pgCreate(group){const p={id:rndId(16),ok:rndId(32),mk:rndId(32),ek:newEk(),author:rndId(32),name:(group?(unitName()+" group"):myName()+"'s page").slice(0,40),group:!!group,open:!!group,posts:[],at:Date.now()};
  await SB.rpc("page_create",{p_id:p.id,p_owner:p.ok,p_member:p.mk,p_open:p.open});p.ah=await sha16(p.author);p.oh=await sha16(p.ok);S.pages.unshift(p);save();return p}
async function pgFetch(p){const rows=await SB.rpc("page_get",{p_id:p.id,p_key:pgKey(p),p_after:0,p_before:null});const out=[];if(!p.ah)p.ah=await sha16(p.author);
  for(const r of rows||[]){const o=await fdDec(p.ek,r.ct);if(!o)continue;out.push({id:+r.id,par:r.parent==null?null:+r.parent,k:+r.kind,t:Date.parse(r.created_at)||Date.now(),txt:String(o.t||"").slice(0,2200),n:String(o.n||"Someone").slice(0,30),img:imgOK(o.img)?o.img:"",mine:r.mine_hash===p.ah,ah:String(r.mine_hash||"").slice(0,16)})}
  if(rows&&rows[0])p.open=!!rows[0].open_posts;p.posts=out;p.err="";p.at=Date.now();const top=out.filter(x=>x.k===0).reduce((a,x)=>Math.max(a,x.id),0);p.top=top;save();return out}
async function pgPost(p,kind,parent,txt,img){const o={t:String(txt||"").slice(0,2200),n:myName()};if(img)o.img=img;const ct=await fdEnc(p.ek,o);
  return SB.rpc("page_post",{p_id:p.id,p_key:pgKey(p),p_author:p.author,p_kind:kind,p_parent:parent||null,p_ct:ct})}
function pgJoin(q){const id=(q.get("pg")||"").replace(/[^a-z0-9]/g,"").slice(0,24),mk=(q.get("k")||"").replace(/[^a-z0-9]/g,"").slice(0,40),ek=(q.get("e")||"").replace(/[^A-Za-z0-9_-]/g,"").slice(0,60),name=(q.get("n")||"Page").replace(/[<>#|]/g,"").slice(0,40);
  try{history.replaceState(null,"",location.pathname)}catch(e){}if(id.length<12||mk.length<24||ek.length<40)return toast("That page link is incomplete.");
  if(pgFind(id)){pgCur=id;view="pg";render();return}
  sheetCtx={kind:"v12pg",id,mk,ek,name,group:q.get("g")==="1"};$("#sheetT").innerHTML=`Join ${esc(name)}?<small>${q.get("g")==="1"?"A group page: people post, ask and share advice.":"Someone invited you to their page."}</small>`;
  $("#sheetOpts").innerHTML=`<div class="panel" style="margin:0" data-noxl><label for="v12PgMe">Your name on this page</label><input type="text" id="v12PgMe" maxlength="30" value="${esc(myName()==="Me"?"":myName())}" placeholder="Cpl Smith">
    <label class="tog" style="align-items:flex-start"><input type="checkbox" id="v12PgTos"${(S.tos||0)>=1?" checked":""}> <span>I agree to the <a href="terms.html" target="_blank" rel="noopener">Terms of Use</a>: no objectionable or abusive content.</span></label>
    <button class="btn" id="v12PgJoin">Join page</button><button class="btn alt" data-sclose="1">Not now</button></div>`;sheetOpen()}
function pgCard(p,x){const C=p.posts.filter(y=>y.k===1&&y.par===x.id).sort((a,b)=>a.id-b.id);const Lk=p.posts.filter(y=>y.k===2&&y.par===x.id);const liked=Lk.some(y=>y.mine);const canDel=p.ok||x.mine;const key=p.id+":"+x.id;
  return `<article class="fc v12pc"><div class="fch">${fdAv(x.n)}<div class="hd"><div><span class="nm">${esc(x.n)}</span> <span class="tm">· ${ago(x.t)}</span></div></div><button class="chip" data-v12pm="${x.id}" aria-label="More" style="margin-left:auto;cursor:pointer">⋯</button></div>
    ${pgMenu===key?`<div class="evts">${canDel?`<button data-v12pdel="${x.id}" style="color:var(--warn)">${armed==="v12pdel"+x.id?"Tap again to delete":"Delete"}</button>`:""}${!x.mine?`<button data-v12prep="${x.id}">⚑ Report</button><button data-v12pblk="${esc(x.ah)}">Block ${esc(x.n)}</button>`:""}<button data-v12pm="">Close</button></div>`:""}
    ${x.img?`<img src="${x.img}" alt="Photo" class="v12img" loading="lazy">`:""}${x.txt?`<div class="bd">${esc(x.txt).replace(/\n/g,"<br>")}</div>`:""}
    <div style="display:flex;gap:8px;align-items:center"><button class="chip" data-v12like="${x.id}" style="cursor:pointer;${liked?"color:var(--warn);font-weight:800":""}">${liked?"♥":"♡"} ${Lk.length||""}</button><button class="chip" data-v12cm="${x.id}" style="cursor:pointer">💬 ${C.length||""} ${pgOpenC===x.id?"Hide":"Comment"}</button></div>
    ${pgOpenC===x.id?`<div class="v12cms">${C.filter(c=>!(p.blk||[]).includes(c.ah)).map(c=>`<div class="v12cm"><b>${esc(c.n)}</b> ${esc(c.txt)} <span class="note" style="margin:0">· ${ago(c.t)}</span>${(p.ok||c.mine)?` <button class="chip" data-v12pdel="${c.id}" style="cursor:pointer">✕</button>`:""}</div>`).join("")}
      <div class="addph"><input type="text" id="v12Cm${x.id}" maxlength="500" placeholder="Add a comment or advice"><button data-v12cms="${x.id}">Post</button></div></div>`:""}</article>`}
function renderPages(){let h=(memberMode()?meTabs("pages"):banner())+`<div class="sechead" style="margin-top:12px"><h2>Pages</h2></div>`;
  const mine=S.pages.filter(p=>p.ok),fol=S.pages.filter(p=>!p.ok);
  h+=`<div class="panel"><p class="note" style="margin:0">Your own page, like a small Instagram, and group pages where people post, ask questions and give advice. Only people you invite can see a page. Posts and photos are encrypted on your phone.</p>
    <div class="row2"><button class="btn" id="v12PgNew">+ My page</button><button class="btn alt" id="v12PgNewG">+ Group page</button></div></div>`;
  const row=p=>`<button class="lrow card" data-v12pg="${p.id}" style="width:100%;text-align:left;cursor:pointer;color:inherit;margin:4px 0">${fdAv(p.name)}<span style="flex:1;min-width:0"><span class="t" style="display:block">${esc(p.name)}</span><span class="s" style="display:block">${p.ok?(p.group?"Your group page":"Your page"):(p.group?"Group page":"Following")}${p.posts.length?" · "+p.posts.filter(x=>x.k===0).length+" posts":""}${p.top>(p.seen||0)&&!p.ok?` · <b style="color:var(--brass)">new</b>`:""}</span></span></button>`;
  if(mine.length)h+=`<div class="sech"><h2>Yours</h2></div><div class="alist">${mine.map(row).join("")}</div>`;
  h+=`<div class="sech"><h2>Following</h2></div>`+(fol.length?`<div class="alist">${fol.map(row).join("")}</div>`:`<p class="note">When someone invites you, tap their link and the page shows up here. Or paste the link: <button class="chip" id="v11SignInTool" style="cursor:pointer">Open a link</button></p>`);
  $("#main").innerHTML=h}
function renderPg(){const p=pgFind(pgCur);if(!p){view="pages";return render()}if(!p.at||Date.now()-p.at>30000)pgRefresh(p);
  const canPost=!!p.ok||p.open;const posts=p.posts.filter(x=>x.k===0&&!(p.hid||[]).includes(x.id)&&!(p.blk||[]).includes(x.ah)).sort((a,b)=>b.id-a.id);
  let h=(memberMode()?meTabs("pages"):"")+`<button class="chip" data-go="pages" style="cursor:pointer;margin-top:12px">◂ Pages</button><div class="sechead" style="margin-top:6px"><h2>${esc(p.name)}</h2><span class="note" style="margin:0">${p.group?"Group":"Page"}${p.err?` · <span style="color:var(--warn)">${esc(p.err)}</span>`:""}</span></div>`;
  if(p.ok)h+=`<details class="panel"><summary><b>Invite and settings</b></summary>
    <a class="btn" href="${esc("sms:?&body="+encodeURIComponent("Join my page “"+p.name+"” on Accounted For: "+pgLink(p)+"\nNo app yet? iPhone: "+((typeof STORE_URL==="object"&&STORE_URL.ios)||"")))}">Text an invite link</a><button class="btn alt" id="v12PgCopy">Copy invite link</button>
    <p class="note">Anyone with the link can see this page. Send it only to people you want here.</p>
    <label for="v12PgName">Page name</label><input type="text" id="v12PgName" maxlength="40" value="${esc(p.name)}">
    <label class="tog"><input type="checkbox" id="v12PgOpen"${p.open?" checked":""}> Let invited people post (group style: questions, advice). Off: only you post; they can like and comment.</label>
    <button class="btn alt" id="v12PgReset">${armed==="v12pgreset"?"Tap again: new link, everyone must be re-invited":"Replace the invite link (removes everyone)"}</button>
    <button class="btn warn" id="v12PgDel">${armed==="v12pgdel"?"Tap again: delete this page for everyone":"Delete page"}</button></details>`;
  if(canPost)h+=`<div class="panel v12comp"><textarea id="v12PgTxt" maxlength="2200" placeholder="${p.group?"Ask a question or share advice…":"Write a caption…"}" rows="3"></textarea>${pgImg?`<img src="${pgImg}" class="v12img" alt="Selected photo"><button class="chip" id="v12PgImgX" style="cursor:pointer">Remove photo</button>`:""}
    ${(S.tos||0)<1?`<label class="tog" style="align-items:flex-start"><input type="checkbox" id="v12PgTos2"> <span>I agree to the <a href="terms.html" target="_blank" rel="noopener">Terms of Use</a>: no objectionable or abusive content.</span></label>`:""}<div class="row2"><label class="btn alt" style="cursor:pointer">📷 Photo<input type="file" id="v12PgImg" accept="image/*" hidden></label><button class="btn" id="v12PgPost">Post</button></div><div class="note" id="v12PgOut"></div></div>`;
  else h+=`<p class="note">Only the owner posts here. You can like and comment.</p>`;
  h+=posts.length?posts.map(x=>pgCard(p,x)).join(""):`<p class="note" style="text-align:center;margin-top:14px">${p.posts.length||p.at?"No posts yet.":"Loading…"}</p>`;
  if(!p.ok)h+=`<button class="btn warn" id="v12PgLeave" style="margin-top:12px">${armed==="v12pgleave"?"Tap again to leave":"Leave page"}</button>`;
  $("#main").innerHTML=h;if(posts.length&&posts[0].id>(p.seen||0)){p.seen=posts[0].id;save()}}
async function pgRefresh(p){if(pgBusy)return;pgBusy=true;try{await pgFetch(p)}catch(e){const t=String(e.message||e);p.err=/could not find|schema/i.test(t)?"Server needs the 1.2 update":/not allowed/i.test(t)?"You no longer have access":"Offline";save()}finally{pgBusy=false;if(view==="pg"&&pgCur===p.id){const a=document.activeElement;if(!(a&&/^(TEXTAREA|INPUT)$/.test(a.tagName)))redraw(renderPg)}}}
every(60000,()=>{if(!document.hidden&&view==="pg"&&pgCur){const p=pgFind(pgCur);if(p)pgRefresh(p)}},"v12-pages");

/* My page tabs for members */
function meTabs(cur){const un=dmUnreadMine();return `<div class="evts v12tabs" style="margin-top:12px">${[["me","Important"],["dm","Messages"+(un?" ("+un+")":"")],["pages","Pages"]].map(([k,l])=>`<button data-go="${k}" aria-pressed="${cur===k}">${esc(l)}</button>`).join("")}</div>`}
{const _rm=renderMe;renderMe=function(){_rm.apply(this,arguments);if(view!=="me"||!S.me||String(S.me.pk)==="preview")return;$("#main").insertAdjacentHTML("afterbegin",meTabs("me"))}}

/* ================= render hook ================= */
{const _r=render;render=function(){if(view==="w6"&&(!PRO_FEAT.w6||proOK())){renderTabs();renderW6();return}
  if(["mepv","dms","dm","pages","pg"].includes(view)){renderTabs();({mepv:renderMePv,dms:renderDmList,dm:renderDm,pages:renderPages,pg:renderPg})[view]();if(typeof animateView==="function")animateView();return}
  if(view==="ask"&&!aiOn()){renderTabs();$("#main").innerHTML=`<div class="panel" style="margin-top:14px"><b>Ask (AI) is off</b><p class="note">Ask is an AI helper that comes with Pro. It's on automatically with Pro, or turn it back on in Data and settings → AI.</p>${leader()?`<button class="btn" data-go="data">Open settings</button>`:""}</div>`;return}
  return _r.apply(this,arguments)}}
{const _rt=renderTools;renderTools=function(){_rt.apply(this,arguments);const g=$("#main .tgrid");if(!g)return;const un=dmUnreadLeader();
  g.insertAdjacentHTML("beforeend",`<button data-go="dms" class="${un?"hot":""}"><span class="ic">${svg("feed")}</span><span><b>Messages</b><small>${un?un+" new":"Private chat with your people"}</small></span></button><button data-go="pages"><span class="ic">${svg("people")}</span><span><b>Pages</b><small>Your page and group pages</small></span></button>`)}}
{const _tb=tabBadge;tabBadge=function(k){let n=_tb.apply(this,arguments)||0;if(k==="tools")n+=dmUnreadLeader();if(k==="me")n+=dmUnreadMine();if(k==="pages")n+=S.pages.filter(p=>!p.ok&&p.top>(p.seen||0)).length;return n}}

/* ================= events ================= */
document.addEventListener("click",e=>{const t=e.target.closest("[data-tab]");if(t&&t.dataset.tab==="pages"){e.stopImmediatePropagation();view="pages";armed=null;render();window.scrollTo(0,0)}},true);
document.addEventListener("click",e=>{const t=e.target;let b;
  /* sections */
  if(t.id==="v12PView"){pvId=pid;view="mepv";render();window.scrollTo(0,0);return}
  if(t.id==="v12PMsg"){dmWith=pid;view="dm";render();window.scrollTo(0,0);return}
  if(t.id==="v12MvGo"){if(!mvSel.size||!mvTo)return;let n=0;S.roster.forEach(m=>{if(mvSel.has(m.id)&&m.sec!==mvTo){m.sec=mvTo;n++}});mvSel=new Set();afterRoster(n+" moved to "+mvTo);redraw(renderPeople);return}
  /* 6W */
  if((b=t.closest("[data-v12wc]"))){W2.f[b.dataset.v12wc]=W2.f[b.dataset.v12wc]===b.dataset.val?"":b.dataset.val;redraw(renderW6);return}
  if(t.id==="v12WCopy"){const s=w6Text(W2);try{navigator.clipboard.writeText(s).then(()=>toast("Copied"),()=>toast("Copy blocked here."))}catch(err){toast("Copy blocked here.")}return}
  if(t.id==="v12WShare"){const s=w6Text(W2);if(navigator.share)navigator.share({title:w6Subj(W2),text:s}).catch(()=>{});else{try{navigator.clipboard.writeText(s);toast("Copied")}catch(err){}}return}
  if(t.id==="v12WSave"){S.w62=(S.w62||[]).filter(x=>x.id!==W2.id).concat(JSON.parse(JSON.stringify(Object.assign(W2,{t:Date.now()})))).slice(-60);save();redraw(renderW6);toast("Saved on this phone");return}
  if(t.id==="v12WNew"){W2=w6New();redraw(renderW6);window.scrollTo(0,0);return}
  if((b=t.closest("[data-v12wo]"))){const r=(S.w62||[]).find(x=>x.id===b.dataset.v12wo);if(r){W2=JSON.parse(JSON.stringify(r));renderW6();window.scrollTo(0,0)}return}
  if((b=t.closest("[data-v12wd]"))){const id=b.dataset.v12wd;if(armed!=="v12wd"+id){armed="v12wd"+id;redraw(renderW6);return}armed=null;S.w62=(S.w62||[]).filter(x=>x.id!==id);save();redraw(renderW6);return}
  const T=()=>{S.w6t=JSON.parse(JSON.stringify(w6T()));return S.w6t};
  if((b=t.closest("[data-v12tu],[data-v12td],[data-v12tx]"))){const L=T();const i=+(b.dataset.v12tu??b.dataset.v12td??b.dataset.v12tx);if(b.dataset.v12tx!=null)L.splice(i,1);else{const j=b.dataset.v12tu!=null?i-1:i+1;if(j<0||j>=L.length)return;[L[i],L[j]]=[L[j],L[i]]}w6Edit=true;save();redraw(renderW6);return}
  if(t.id==="v12TAdd"){T().push({k:"f"+Date.now().toString(36),l:"New line",t:"short"});w6Edit=true;save();redraw(renderW6);return}
  if(t.id==="v12TReset"){if(armed!=="v12treset"){armed="v12treset";w6Edit=true;redraw(renderW6);return}armed=null;delete S.w6t;save();redraw(renderW6);return}
  /* account for anything */
  if((b=t.closest("[data-v12q]"))){const q=b.dataset.v12q;const nm=$("#evName");if(nm)nm.value=q;const types=[...document.querySelectorAll('input[name="evType"]')];const want=/5k|run|pt/i.test(q)?"5K / Run":/tad|travel/i.test(q)?"TAD / Travel":/class|training/i.test(q)?"Class":/meeting/i.test(q)?"Meeting":"";const r=types.find(x=>x.value===want)||types.find(x=>x.value.toLowerCase()===q.toLowerCase());if(r)r.checked=true;return}
  if(t.id==="v12EvTAdd"){const v=($("#v12EvT").value||"").replace(/[<>|#]/g,"").trim().slice(0,30);if(!v)return;S.evTypesX=[...new Set((S.evTypesX||[]).concat(v))].slice(0,30);if(!EV_TYPES.includes(v))EV_TYPES.push(v);save();const nm=($("#evName")||{}).value||"";redraw(renderEvents);const n2=$("#evName");if(n2)n2.value=nm;const r=[...document.querySelectorAll('input[name="evType"]')].find(x=>x.value===v);if(r)r.checked=true;toast("Type added");return}
  if(t.id==="v12CustSave"){const c={};document.querySelectorAll("[data-v12c]").forEach(i=>{const v=i.value.replace(/[<>|#]/g,"").trim().slice(0,30);if(v)c[i.dataset.v12c]=v});S.customV=c;save();toast("Saved. Reloading…");setTimeout(()=>location.reload(),400);return}
  /* messages */
  if((b=t.closest("[data-v12dm]"))){dmWith=b.dataset.v12dm;view="dm";render();window.scrollTo(0,0);return}
  if(t.id==="v12DmSend"){const txt=($("#v12DmTxt").value||"").trim();if(!txt&&!dmImg){toast("Write a message.");return}const o=$("#v12DmOut");t.disabled=true;if(o)o.textContent="Sending…";
    (async()=>{if(memberMode()||!leader()){const th=myDm();if(!th)return;const msg=await dmSend(th,txt,dmImg,"M",myName());dmPush("mine:"+th.id,{id:msg.id,t:Date.now(),txt,by:"M",n:myName(),img:dmImg});}
      else{const m=S.roster.find(x=>x.id===dmWith);const d=await dmOpenSrv(m);const msg=await dmSend(d,txt,dmImg,"L",S.postAs||S.myName||unitName());dmPush(d.id,{id:msg.id,t:Date.now(),txt,by:"L",n:"",img:dmImg});S.dmSeen[d.id]=Math.max(S.dmSeen[d.id]||0,msg.id)}
      dmImg="";save();redraw(render);scrollChat()})().catch(err=>{t.disabled=false;const s=String(err&&err.message||err);if(o)o.textContent=/find the function|schema/i.test(s)?"Messages aren't set up on the server yet (System check → 1.2).":"Couldn't send. Check signal and try again."});return}
  /* pages */
  if(t.id==="v12PgNew"||t.id==="v12PgNewG"){t.disabled=true;pgCreate(t.id==="v12PgNewG").then(p=>{pgCur=p.id;view="pg";render();window.scrollTo(0,0);toast("Page made. Invite people from Invite and settings.")}).catch(err=>{t.disabled=false;toast(/find the function|schema/i.test(String(err.message))?"Pages aren't set up on the server yet (System check → 1.2).":"Couldn't make the page: "+(err.message||err))});return}
  if((b=t.closest("[data-v12pg]"))){pgCur=b.dataset.v12pg;pgOpenC=null;pgMenu=null;view="pg";render();window.scrollTo(0,0);return}
  if(t.id==="v12PgJoin"){const X=sheetCtx;if(!X||X.kind!=="v12pg")return;if(!$("#v12PgTos").checked){toast("Agree to the Terms of Use to join.");return}S.tos=Math.max(S.tos||0,1);const nm=($("#v12PgMe").value||"").replace(/[<>|#]/g,"").trim().slice(0,30);if(nm)S.myName=S.myName||nm;
    const p={id:X.id,mk:X.mk,ek:X.ek,author:rndId(32),name:X.name,group:X.group,posts:[],seen:0,nm:nm};sha16(p.author).then(h=>{p.ah=h;S.pages.unshift(p);save();closeSheet();pgCur=p.id;view="pg";render();pgRefresh(p)});return}
  if(t.id==="v12PgPost"){const p=pgFind(pgCur);const txt=($("#v12PgTxt").value||"").trim();if(!txt&&!pgImg){toast("Write something or add a photo.");return}if((S.tos||0)<1){const c=$("#v12PgTos2");if(c&&c.checked){S.tos=1;save()}else{toast("Agree to the Terms of Use first (checkbox above Post).");return}}t.disabled=true;$("#v12PgOut").textContent="Posting…";
    pgPost(p,0,null,txt,pgImg).then(()=>{pgImg="";p.at=0;return pgFetch(p)}).then(()=>{redraw(renderPg);toast("Posted")}).catch(err=>{t.disabled=false;$("#v12PgOut").textContent=/owner only/.test(String(err.message))?"Only the owner can post here.":"Couldn't post: "+(err.message||err)});return}
  if(t.id==="v12PgImgX"){pgImg="";redraw(renderPg);return}
  if((b=t.closest("[data-v12like]"))){const p=pgFind(pgCur);const id=+b.dataset.v12like;const mine=p.posts.find(y=>y.k===2&&y.par===id&&y.mine);b.disabled=true;
    (mine?SB.rpc("page_delete_post",{p_id:p.id,p_key:p.author,p_post:mine.id}):pgPost(p,2,id,"")).then(()=>pgFetch(p)).then(()=>redraw(renderPg)).catch(()=>{b.disabled=false;toast("Couldn't update. Try again.")});return}
  if((b=t.closest("[data-v12cm]"))){const id=+b.dataset.v12cm;pgOpenC=pgOpenC===id?null:id;redraw(renderPg);return}
  if((b=t.closest("[data-v12cms]"))){const p=pgFind(pgCur);const id=+b.dataset.v12cms;const i=$("#v12Cm"+id);const txt=(i&&i.value||"").trim();if(!txt)return;b.disabled=true;pgPost(p,1,id,txt).then(()=>pgFetch(p)).then(()=>redraw(renderPg)).catch(()=>{b.disabled=false;toast("Couldn't comment. Try again.")});return}
  if((b=t.closest("[data-v12pm]"))){pgMenu=b.dataset.v12pm?pgCur+":"+b.dataset.v12pm:null;redraw(renderPg);return}
  if((b=t.closest("[data-v12pdel]"))){const p=pgFind(pgCur);const id=+b.dataset.v12pdel;const x=p.posts.find(y=>y.id===id);if(!x)return;if(x.k===0&&armed!=="v12pdel"+id){armed="v12pdel"+id;redraw(renderPg);return}armed=null;
    SB.rpc("page_delete_post",{p_id:p.id,p_key:p.ok&&!x.mine?p.ok:p.author,p_post:id}).then(()=>pgFetch(p)).then(()=>{pgMenu=null;redraw(renderPg);toast("Removed")}).catch(()=>toast("Couldn't remove. Try again."));return}
  if((b=t.closest("[data-v12prep]"))){const p=pgFind(pgCur);const x=p.posts.find(y=>y.id===+b.dataset.v12prep);if(!x)return;p.hid=[...new Set((p.hid||[]).concat(x.id))];save();pgMenu=null;redraw(renderPg);
    location.href="mailto:Antoniotyler22@gmail.com?subject="+encodeURIComponent("Report: post on "+p.name)+"&body="+encodeURIComponent("Page: "+p.name+" ("+p.id+")\nPost by: "+x.n+"\nWhen: "+new Date(x.t).toLocaleString()+"\nText: "+x.txt.slice(0,400)+"\n\nWhat's wrong:\n");toast("Post hidden. Finish the report email and send it; we act within 24 hours.");return}
  if((b=t.closest("[data-v12pblk]"))){const p=pgFind(pgCur);p.blk=[...new Set((p.blk||[]).concat(b.dataset.v12pblk))];save();pgMenu=null;redraw(renderPg);toast("Blocked. You won't see their posts or comments.");return}
  if(t.id==="v12PgCopy"){const p=pgFind(pgCur);try{navigator.clipboard.writeText(pgLink(p)).then(()=>toast("Invite link copied"),()=>toast(pgLink(p)))}catch(err){toast(pgLink(p))}return}
  if(t.id==="v12PgReset"){const p=pgFind(pgCur);if(armed!=="v12pgreset"){armed="v12pgreset";redraw(renderPg);return}armed=null;const nk=rndId(32);SB.rpc("page_set",{p_id:p.id,p_owner:p.ok,p_open:p.open,p_member:nk}).then(()=>{p.mk=nk;save();redraw(renderPg);toast("New invite link made. Old links no longer work.")}).catch(()=>toast("Couldn't change it. Try again."));return}
  if(t.id==="v12PgDel"){const p=pgFind(pgCur);if(armed!=="v12pgdel"){armed="v12pgdel";redraw(renderPg);return}armed=null;SB.rpc("page_delete",{p_id:p.id,p_owner:p.ok}).catch(()=>{}).then(()=>{S.pages=S.pages.filter(x=>x.id!==p.id);save();view="pages";render();toast("Page deleted")});return}
  if(t.id==="v12PgLeave"){const p=pgFind(pgCur);if(armed!=="v12pgleave"){armed="v12pgleave";redraw(renderPg);return}armed=null;S.pages=S.pages.filter(x=>x.id!==p.id);save();view="pages";render();return}
});
document.addEventListener("change",e=>{const t=e.target;
  if(t.id==="v12Sec"){const m=S.roster.find(x=>x.id===pid);if(m&&t.value){m.sec=t.value;afterRoster("Moved to "+t.value);redraw(renderPerson)}return}
  if(t.matches&&t.matches("[data-v12mv]")){t.checked?mvSel.add(t.dataset.v12mv):mvSel.delete(t.dataset.v12mv);const g=$("#v12MvGo");if(g){g.disabled=!(mvSel.size&&mvTo);g.textContent="Move "+(mvSel.size||"")}return}
  if(t.id==="v12MvTo"){mvTo=t.value;const g=$("#v12MvGo");if(g)g.disabled=!(mvSel.size&&mvTo);return}
  if(t.id==="v12WMar"){const m=S.roster.find(x=>x.id===t.value);if(m)w6Fill(W2,m);redraw(renderW6);return}
  if(t.matches&&t.matches("[data-v12tt]")){const L=(S.w6t=JSON.parse(JSON.stringify(w6T())));const f=L[+t.dataset.v12tt];f.t=t.value;if(f.t==="choice"&&!f.o)f.o=["Yes","No"];w6Edit=true;save();redraw(renderW6);return}
  if(t.id==="v12Ai"){S.aiOn=t.checked;save();aiPaint();renderTabs();toast(t.checked?"Ask (AI) is on"+(proOK()?"":" (needs Pro)"):"Ask (AI) is off");return}
  if(t.id==="v12PgOpen"){const p=pgFind(pgCur);SB.rpc("page_set",{p_id:p.id,p_owner:p.ok,p_open:t.checked,p_member:null}).then(()=>{p.open=t.checked;save();toast(t.checked?"Invited people can post":"Only you can post")}).catch(()=>{t.checked=!t.checked;toast("Couldn't change it. Try again.")});return}
  if(t.id==="v12PgName"){const p=pgFind(pgCur);p.name=t.value.replace(/[<>|#]/g,"").trim().slice(0,40)||p.name;save();return}
  if(t.id==="v12DmPick"){if(!t.value)return;dmWith=t.value;view="dm";render();window.scrollTo(0,0);return}
  if(t.id==="v12DmImg"||t.id==="v12PgImg"){const f=t.files&&t.files[0];if(!f)return;shrinkPhoto(f).then(d=>{if(t.id==="v12DmImg"){dmImg=d;const o=$("#v12DmOut");if(o)o.textContent="📷 Photo ready. Tap Send."}else{pgImg=d;const keep=($("#v12PgTxt")||{}).value||"";redraw(renderPg);const a=$("#v12PgTxt");if(a)a.value=keep}}).catch(err=>toast(err.message));t.value="";return}});
document.addEventListener("input",e=>{const t=e.target;
  if(t.matches&&t.matches("[data-v12wf]")){W2.f[t.dataset.v12wf]=t.value;w6Refresh();return}
  if(t.id==="v12WTo"){S.w6To=t.value;save();w6Refresh();return}
  if(t.matches&&t.matches("[data-v12tl]")){const L=(S.w6t=JSON.parse(JSON.stringify(w6T())));L[+t.dataset.v12tl].l=t.value.slice(0,40)||"Line";save();w6Refresh();return}
  if(t.matches&&t.matches("[data-v12to]")){const L=(S.w6t=JSON.parse(JSON.stringify(w6T())));L[+t.dataset.v12to].o=t.value.split(",").map(x=>x.trim()).filter(Boolean).slice(0,12);save();return}
  if(t.id==="v12MvQ"){mvQ=t.value;const pos=t.selectionStart;redraw(renderPeople);const q=$("#v12MvQ");if(q){q.focus();q.setSelectionRange(pos,pos)}return}});

/* page invite links (#pg=…) */
function pgHash(){const q=new URLSearchParams((location.hash||"").slice(1));if(q.get("pg"))setTimeout(()=>pgJoin(q),300)}
window.addEventListener("hashchange",pgHash);pgHash();

/* account deletion also removes pages you own, your message threads and your inbox */
document.addEventListener("click",e=>{if(e.target.id!=="v11Del"||armed!=="v11del")return;
  for(const p of S.pages.filter(p=>p.ok))SB.rpc("page_delete",{p_id:p.id,p_owner:p.ok}).catch(()=>{});
  for(const m of S.roster.filter(m=>m.dm))SB.rpc("dm_delete_thread",{p_id:m.dm.id,p_key:m.dm.k}).catch(()=>{});
  const th=myDm();if(th)SB.rpc("dm_delete_thread",{p_id:th.id,p_key:th.k}).catch(()=>{})},true);

/* system check + help */
if(typeof SC==="object"&&Array.isArray(SC))SC.push({k:"v12",n:"1.2: messages and pages",f:["17_social"],t:[["dm_get",{p_id:"zz",p_key:"x",p_after:0}],["dm_inbox",{p_inbox:"x",p_after:0}],["page_get",{p_id:"zz",p_key:"x",p_after:0,p_before:null}]]});
if(typeof HELP==="object"){HELP.dms=["Messages","Private chat with each person.",["Pick a person to start. They answer on their My page.","Turn on My page for someone first (their card → My page).","Messages are encrypted on the phone; only the two of you can read them."]];
  HELP.pages=["Pages","Your page and group pages.",["+ My page: your own page, like a small Instagram. + Group page: people post questions and advice.","Invite people with the link. Only people you invite can see it.","Tap ⋯ on a post to report, block or delete."]];
  HELP.w6=["6W","Incident report in your format.",["Fill the lines, then Email it or Text it.","Edit the format to add, remove, rename or reorder lines. Your format stays on this phone."]]}
window.__v12={w6T,myDm,pgFetch,pgLink,dmPollLeader,dmPollMember,pgJoin,mpDigest:m=>mpDigest(m)};
{const _rtb=renderTabs;renderTabs=function(){_rtb.apply(this,arguments);aiPaint()}}
aiPaint();
render();
})();
