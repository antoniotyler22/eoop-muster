/* Accounted For 4.81.0: Licensing.
   For whoever runs a licensing program (forklift, MTVR, crane, first aid...). Turned on in Tools → Tool access.
   1. Classes: name, date, time, instructor, seats. Every class shows seats filled and a waitlist when it is full.
   2. Drop in a roster (paste or file) or add people one at a time; names are matched to the team roster, anyone else is kept as a guest.
   3. Documents per class (sign-in sheet, lesson plan, test results, license copy). Files stay on this phone (kept apart from the team data).
   4. Complete class: stamps a license on everyone enrolled, valid for the class's months (default 36). Licenses expiring in 30 days are listed
      with an Enroll button.
   5. Its own calendar: a month grid with only licensing classes on it, separate from the team Calendar. Can be sent to the phone calendar (.ics).
   Members see their classes and licenses on My page. */
(()=>{
const A=window.afTool;
const MS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],MF=["January","February","March","April","May","June","July","August","September","October","November","December"],DW=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const D0=iso=>new Date(iso+"T12:00:00");
const dl=iso=>{if(!iso)return "";const d=D0(iso);return isNaN(d)?iso:DW[d.getDay()]+" "+d.getDate()+" "+MS[d.getMonth()]};
const addMonths=(iso,n)=>{const d=D0(iso);d.setMonth(d.getMonth()+n);return dkey(d)};
const daysTo=iso=>Math.round((D0(iso)-D0(dkey()))/864e5);
const L=()=>{S.lic=S.lic&&typeof S.lic==="object"?S.lic:{};if(!Array.isArray(S.lic.classes))S.lic.classes=[];for(const c of S.lic.classes){if(!Array.isArray(c.en))c.en=[];if(!Array.isArray(c.ext))c.ext=[];if(!Array.isArray(c.wl))c.wl=[];if(!Array.isArray(c.docs))c.docs=[]}return S.lic};
const find=id=>(S.roster||[]).find(m=>m.id===id);
const seats=c=>c.en.length+c.ext.length;
const insName=c=>c.ins?(find(c.ins)?A.nm(find(c.ins)):"(removed)"):(c.insN||"");
const DOCTYPES=["Sign-in sheet","Lesson plan","Test results","License copy","Other"],NEED=["Sign-in sheet","Test results"];
let TAB="list",OPEN=null,NEW=false,DROP=null,ADDP=null,CUR=new Date(),DAY=dkey(),ARM=null,MSG="",DTYPE="Sign-in sheet";CUR.setDate(1);
const again=()=>{const y=window.scrollY;render();window.scrollTo(0,y)};
const sortC=a=>a.slice().sort((x,y)=>(x.d+(x.tm||"")).localeCompare(y.d+(y.tm||"")));
const lv=()=>A.level("lic");
const copy=t=>{try{navigator.clipboard.writeText(t).then(()=>toast("Copied"),()=>toast("Copy blocked here."))}catch(e){toast("Copy blocked here.")}};

/* ---------- people in a class ---------- */
function enroll(c,who){/* who: roster row or a plain name. returns "in" | "wl" | "dup" */
  const m=typeof who==="object"?who:null,name=m?"":String(who||"").trim().slice(0,40);if(!m&&!name)return "dup";
  const dup=m?(c.en.includes(m.id)||c.wl.some(w=>w.id===m.id)):(c.ext.some(x=>x.toLowerCase()===name.toLowerCase())||c.wl.some(w=>w.n&&w.n.toLowerCase()===name.toLowerCase()));if(dup)return "dup";
  if(seats(c)<(c.cap||0)){if(m)c.en.push(m.id);else c.ext.push(name);return "in"}
  c.wl.push(m?{id:m.id}:{n:name});return "wl"}
function promote(c){while(c.wl.length&&seats(c)<(c.cap||0)){const w=c.wl.shift();if(w.id&&find(w.id))c.en.push(w.id);else if(w.n)c.ext.push(w.n)}}
function unenroll(c,key){const k=key.slice(2);if(key[0]==="i")c.en=c.en.filter(x=>x!==k);else if(key[0]==="x")c.ext=c.ext.filter(x=>x!==k);else c.wl=c.wl.filter(w=>(w.id||"n:"+w.n)!==k&&(w.id?w.id:w.n)!==k);promote(c)}
function names(text){const lines=String(text||"").replace(/\r/g,"").split("\n").map(s=>s.trim()).filter(Boolean);if(!lines.length)return [];
  let col=0,body=lines;const head=lines[0];if(/(^|[\t,])\s*(name|student|marine|member|attendee|trainee)s?\s*([\t,]|$)/i.test(head)){const rows=(typeof parseCSV==="function"?parseCSV(A.csv(lines.join("\n"))):lines.map(l=>l.split(/\t|,/)));const h=rows[0].map(x=>String(x).toLowerCase());col=Math.max(0,h.findIndex(x=>/name|student|marine|member|attendee|trainee/.test(x)));return rows.slice(1).map(r=>String(r[col]||"").trim()).filter(Boolean)}
  return body.map(l=>l.split("\t")[0].trim()).filter(Boolean)}
function drop(c,text){let n=0,w=0,g=0,dup=0;for(const nm of names(text)){const m=A.match(nm);const r=enroll(c,m||nm);if(r==="in"){n++;if(!m)g++}else if(r==="wl")w++;else dup++}save();return {n,w,g,dup}}

/* ---------- licenses ---------- */
function expiring(){const out=[];for(const m of (S.roster||[]))for(const x of (m.lic||[]))if(x&&x.exp){const d=daysTo(x.exp);if(d<=30)out.push({m,n:x.n,exp:x.exp,d})}return out.sort((a,b)=>a.d-b.d)}
function enrollExpiring(mid,lic){const m=find(mid);if(!m)return;const c=sortC(L().classes).find(x=>!x.done&&x.d>=dkey()&&x.n.toLowerCase()===String(lic).toLowerCase()&&x.cap>seats(x)&&!x.en.includes(mid));
  if(!c){toast("No open "+lic+" class. Add one first.");return}const r=enroll(c,m);save();toast(r==="in"?A.nm(m)+" enrolled in "+c.n+" "+dl(c.d):"Already enrolled")}
function complete(c){let n=0;for(const id of c.en){const m=find(id);if(!m)continue;m.lic=(m.lic||[]).filter(x=>String(x.n).toLowerCase()!==c.n.toLowerCase()).concat({n:c.n,exp:addMonths(c.d,c.val||36),d:c.d});n++}
  c.done=true;try{if(typeof actAdd==="function")actAdd("🪪",c.n+" class done: "+n+" license"+(n===1?"":"s")+" stamped","lic")}catch(e){}save();return n}

/* ---------- documents (kept on this phone, apart from the team data) ---------- */
const DK="afLicDocs";
const dread=()=>{try{return JSON.parse(localStorage.getItem(DK)||"{}")}catch(e){return {}}};
const dwrite=o=>{try{localStorage.setItem(DK,JSON.stringify(o));return true}catch(e){return false}};
function addDoc(c,file,ty){return new Promise((res,rej)=>{if(file.size>400*1024){rej(new Error("That file is over 400 KB. Photograph it smaller or save it as a PDF."));return}
  const r=new FileReader();r.onerror=()=>rej(new Error("Couldn't read that file."));r.onload=()=>{const id=rndId(8);const o=dread();o[id]=r.result;if(!dwrite(o)){rej(new Error("This phone is out of room for files."));return}
    c.docs.push({id,n:String(file.name).slice(0,60),ty,sz:file.size,t:Date.now()});save();res(id)};r.readAsDataURL(file)})}
function openDoc(d){const u=dread()[d.id];if(!u){toast("That file isn't on this phone.");return}const a=document.createElement("a");a.href=u;a.download=d.n;document.body.appendChild(a);a.click();a.remove()}
function rmDoc(c,id){c.docs=c.docs.filter(d=>d.id!==id);const o=dread();delete o[id];dwrite(o);save()}

/* ---------- texts, calendar file ---------- */
function rosterText(c){const rows=c.en.map(id=>find(id)).filter(Boolean).map(m=>A.nm(m)).concat(c.ext);
  return c.n+" · "+dl(c.d)+" "+(c.tm||"")+(insName(c)?" · Instructor "+insName(c):"")+"\nSeats "+seats(c)+" of "+c.cap+"\n"+rows.map((r,i)=>(i+1)+". "+r).join("\n")+(c.wl.length?"\nWaitlist: "+c.wl.map(w=>w.id?(find(w.id)?A.nm(find(w.id)):"?"):w.n).join(", "):"")}
function ics(){const z=s=>s.replace(/-/g,"");const q=s=>String(s||"").replace(/[,;\n]/g," ");let o="BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Accounted For//Licensing//EN\r\n";
  for(const c of L().classes.filter(x=>!x.done)){o+="BEGIN:VEVENT\r\nUID:"+c.id+"@accountedfor\r\nDTSTAMP:"+z(dkey())+"T000000\r\nDTSTART:"+z(c.d)+"T"+String(c.tm||"0800").replace(":","").padEnd(4,"0")+"00\r\nDURATION:PT4H\r\nSUMMARY:"+q(c.n)+" class\r\nDESCRIPTION:Instructor "+q(insName(c))+" - seats "+seats(c)+" of "+c.cap+"\r\nEND:VEVENT\r\n"}
  return o+"END:VCALENDAR\r\n"}

/* ---------- screens ---------- */
function bar(c){const p=c.cap?Math.min(100,Math.round(seats(c)/c.cap*100)):0;return `<div class="afbar"><i style="width:${p}%;${seats(c)>=c.cap?"background:var(--warn,#c9822b)":""}"></i></div>`}
function tag(c){return c.done?`<span class="aft done">Done</span>`:seats(c)>=c.cap?`<span class="aft full">Full</span>`:`<span class="aft">${c.cap-seats(c)} open</span>`}
function personRows(c){const r=[];for(const id of c.en){const m=find(id);r.push([ "i:"+id, m?`<b>${esc(m.rank)}</b> ${esc(m.name)}`:"(removed)"])}for(const x of c.ext)r.push(["x:"+x,esc(x)+` <span class="note">guest</span>`]);
  return r.length?r.map(p=>`<div class="afr"><span>${p[1]}</span>${c.done?"":`<button class="chip afc" data-lrm="${c.id}|${esc(p[0])}" aria-label="Remove">✕</button>`}</div>`).join(""):`<p class="note">No one enrolled yet.</p>`}
function detail(c){const have=new Set(c.docs.map(d=>d.ty));
  let h=`<div class="afs"><div class="note">Enrolled</div>${personRows(c)}`;
  if(c.wl.length)h+=`<div class="note" style="margin-top:8px">Waitlist</div>${c.wl.map(w=>{const m=w.id&&find(w.id);return `<div class="afr"><span>${m?`<b>${esc(m.rank)}</b> ${esc(m.name)}`:esc(w.n||"(removed)")}</span><button class="chip afc" data-lrm="${c.id}|w:${esc(w.id||w.n)}" aria-label="Remove">✕</button></div>`}).join("")}`;
  if(!c.done){h+=`<div class="afl" style="margin-top:8px"><input type="text" id="lAddP" list="lPl" placeholder="Add a person" autocomplete="off" style="flex:1;min-width:0" value="${esc(ADDP===c.id?"":"")}"><datalist id="lPl">${sorted((S.roster||[]).filter(m=>m&&m.name)).map(m=>`<option value="${esc(m.rank+" "+m.name)}">`).join("")}</datalist><button class="btn alt" data-ladd="${c.id}" style="width:auto">Add</button></div>
    <button class="chip afc" data-ldropt="${c.id}" style="margin-top:8px">${DROP===c.id?"Close roster drop":"Drop in roster"}</button>`;
    if(DROP===c.id)h+=`<div class="panel" style="margin-top:8px"><p class="note" style="margin:0 0 6px">Paste names (one per line, or a column from Excel) or pick a file. Names are matched to your roster; anyone else is kept as a guest.</p><textarea id="lPaste" style="min-height:80px" placeholder="Hughes, Cole&#10;SGT Lopez&#10;Dana Reyes"></textarea><div class="row2"><button class="btn" data-ldropgo="${c.id}">Add these</button></div><label class="btn alt" style="display:block;text-align:center;margin-top:6px;cursor:pointer">Choose a file<input type="file" id="lFile" data-cid="${c.id}" accept=".csv,.txt,.xlsx,.xls,.tsv" style="display:none"></label></div>`}
  h+=`<div class="note" style="margin-top:12px">Documents</div>${c.docs.length?c.docs.map(d=>`<div class="afr"><span>📄 ${esc(d.n)} <span class="note">${esc(d.ty)}</span></span><span><button class="chip afc" data-ldoc="${c.id}|${d.id}">Open</button> <button class="chip afc" data-ldocrm="${c.id}|${d.id}" aria-label="Remove">✕</button></span></div>`).join(""):`<p class="note">None yet.</p>`}
    <div class="note">${NEED.map(n=>(have.has(n)?"✓ ":"○ ")+n).join(" · ")}</div>
    <div class="afl" style="margin-top:6px">${DOCTYPES.map(t=>`<button class="chip afc${DTYPE===t?" on":""}" data-ldty="${esc(t)}">${t}</button>`).join("")}</div>
    <label class="btn alt" style="display:block;text-align:center;margin-top:6px;cursor:pointer">Add a ${esc(DTYPE.toLowerCase())}<input type="file" id="lDoc" data-cid="${c.id}" style="display:none"></label>
    <div class="row2" style="margin-top:12px"><button class="btn alt" data-lcopy="${c.id}">Copy roster</button>${c.done?"":`<button class="btn" data-ldone="${c.id}">${ARM==="done"+c.id?"Tap again: stamp "+c.en.length+" license"+(c.en.length===1?"":"s"):"Complete class"}</button>`}</div>
    <div style="margin-top:8px"><button class="chip afc" data-ldel="${c.id}">${ARM==="del"+c.id?"Tap again: delete this class":"Delete class"}</button></div></div>`;
  return h}
function card(c){return `<div class="afcard"><div data-lopen="${c.id}" style="cursor:pointer"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(c.n)}</b>${tag(c)}</div>
  <div class="note">${esc(dl(c.d))}${c.tm?" · "+esc(c.tm):""}${insName(c)?" · Instructor: "+esc(insName(c)):""}</div>${bar(c)}<div class="note">${seats(c)} of ${c.cap} enrolled${c.wl.length?" · "+c.wl.length+" waitlisted":""}</div></div>${OPEN===c.id?detail(c):""}</div>`}
function newForm(){const nm=[...new Set(L().classes.map(c=>c.n))];const first=sorted((S.roster||[]).filter(m=>m&&m.name));
  return `<div class="panel" id="lNew"><b>New class</b><input type="text" id="lnN" list="lnNl" placeholder="Class (Forklift, MTVR, Crane)" maxlength="50"><datalist id="lnNl">${nm.concat(["Forklift (MHE)","MTVR license","Crane operator","First aid / CPR"]).filter((v,i,a)=>a.indexOf(v)===i).map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
  <div class="afl"><input type="date" id="lnD" value="${esc(dkey())}" style="flex:1;min-width:0"><input type="time" id="lnT" value="08:00" style="width:110px"></div>
  <input type="text" id="lnI" list="lnIl" placeholder="Instructor" autocomplete="off"><datalist id="lnIl">${first.map(m=>`<option value="${esc(m.rank+" "+m.name)}">`).join("")}</datalist>
  <div class="afl"><label class="note">Seats <input type="number" id="lnC" value="8" min="1" max="200" style="width:70px"></label><label class="note">Valid (months) <input type="number" id="lnV" value="36" min="1" max="120" style="width:70px"></label></div>
  <div class="row2"><button class="btn" data-lnew="1">Create class</button><button class="btn alt" data-lnx="1">Cancel</button></div></div>`}
function listTab(){const all=L().classes,t=dkey();const up=sortC(all.filter(c=>!c.done&&c.d>=t)),past=sortC(all.filter(c=>c.done||c.d<t)).reverse();
  const s=up.reduce((a,c)=>a+seats(c),0),cap=up.reduce((a,c)=>a+c.cap,0);let h="";
  if(!all.length)h+=`<div class="panel"><p class="note" style="margin:0">No classes yet. Create your first class, then drop in a roster.</p></div>`;
  else h+=`<div class="afm"><div><b>${up.length}</b>Upcoming</div><div><b>${s}</b>Seats filled</div><div><b>${Math.max(0,cap-s)}</b>Seats open</div></div>`;
  const ex=expiring();
  if(ex.length)h+=`<div class="panel" id="lExp" style="border-color:var(--warn,#c9822b)"><b>Licenses to renew</b><p class="note" style="margin:2px 0 6px">Expired or expiring in 30 days.</p>${ex.slice(0,8).map(x=>`<div class="afr"><span><b>${esc(x.m.rank)}</b> ${esc(lastOf(x.m))} · ${esc(x.n)}<div class="note">${x.d<0?"Expired "+esc(dl(x.exp)):"Expires "+esc(dl(x.exp))+" ("+x.d+" day"+(x.d===1?"":"s")+")"}</div></span><button class="chip afc" data-lenr="${esc(x.m.id)}|${esc(x.n)}">Enroll</button></div>`).join("")}${ex.length>8?`<p class="note">+${ex.length-8} more</p>`:""}</div>`;
  h+=up.map(card).join("");
  if(past.length)h+=`<div class="sech"><h2>Past and done</h2></div>`+past.slice(0,10).map(card).join("");
  return h}
function calTab(){const y=CUR.getFullYear(),mo=CUR.getMonth();const first=new Date(y,mo,1).getDay(),dim=new Date(y,mo+1,0).getDate();const today=dkey();
  const by={};for(const c of L().classes)(by[c.d]=by[c.d]||[]).push(c);
  let g=DW.map(d=>`<div class="afdw">${d[0]}</div>`).join("");for(let i=0;i<first;i++)g+=`<div></div>`;
  for(let d=1;d<=dim;d++){const iso=dkey(new Date(y,mo,d));const n=(by[iso]||[]).length;g+=`<button class="afday${iso===DAY?" sel":""}${iso===today?" today":""}" data-lday="${iso}" aria-label="${esc(dl(iso))}${n?", "+n+" class"+(n>1?"es":""):""}"><span>${d}</span>${n?`<i>${n>3?"●●●+":"●".repeat(n)}</i>`:""}</button>`}
  const day=sortC(by[DAY]||[]);
  return `<div class="afcal"><div class="afh"><button class="chip afc" data-lmv="-1" aria-label="Previous month">◂</button><b>${MF[mo]} ${y}</b><button class="chip afc" data-lmv="1" aria-label="Next month">▸</button></div><div class="afgrid">${g}</div><div style="text-align:center"><button class="chip afc" data-ltoday="1">Today</button></div></div>
  <div class="sech"><h2>${esc(dl(DAY))}</h2></div>${day.length?day.map(c=>`<div class="afcard"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(c.n)}</b>${tag(c)}</div><div class="note">${esc(c.tm||"")}${insName(c)?" · Instructor: "+esc(insName(c)):""}</div>${bar(c)}<div class="note">${seats(c)} of ${c.cap} seats filled${c.wl.length?" · "+c.wl.length+" waitlisted":""}</div><div style="margin-top:6px;line-height:1.7">${[...c.en.map(id=>find(id)).filter(Boolean).map(m=>esc(A.nm(m))),...c.ext.map(esc)].join(", ")||`<span class="note">No one enrolled yet.</span>`}</div><button class="chip afc" data-lgo="${c.id}" style="margin-top:6px">Open class</button></div>`).join(""):`<p class="note">No classes on this day.</p>`}
  <button class="btn alt" data-lics="1" style="width:100%;margin-top:10px">Add to phone calendar</button>`}
function html(){const back=`<button class="chip" data-go="tools" style="cursor:pointer;margin-top:12px">◂ Tools</button>`;
  if(!lv())return back+`<h2>Licensing</h2><div class="panel"><p class="note">Licensing isn't turned on for you. Ask your OIC to turn it on in Tool access.</p></div>`;
  let h=back+`<h2>Licensing</h2><div class="afl" style="margin:4px 0 8px"><button class="chip afc${TAB==="list"?" on":""}" data-ltab="list">Classes</button><button class="chip afc${TAB==="cal"?" on":""}" data-ltab="cal">Calendar</button><span style="flex:1"></span><button class="btn" data-lnewt="1" style="width:auto;min-height:38px;padding:0 14px">New class</button></div>`;
  if(MSG)h+=`<div class="note" role="status" style="font-weight:700">${esc(MSG)}</div>`;
  if(NEW)h+=newForm();
  return h+(TAB==="cal"?calTab():listTab())}
function css(){if(document.getElementById("afLicCss"))return;const s=document.createElement("style");s.id="afLicCss";
  s.textContent=`.afcard{background:var(--card,rgba(127,127,127,.1));border-radius:14px;padding:12px;margin:8px 0}.afr{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--line,#ddd)}
.aft{font-size:12px;padding:2px 9px;border-radius:99px;background:rgba(58,143,92,.18);color:var(--s-onhand,#3a8f5c);white-space:nowrap}.aft.full{background:rgba(201,130,43,.2);color:var(--warn,#c9822b)}.aft.done{background:rgba(127,127,127,.2);color:inherit}
.afgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin:8px 0}.afdw{text-align:center;font-size:12px;opacity:.65}.afh{display:flex;align-items:center;justify-content:space-between}
.afday{border:1px solid var(--line,#ccc);background:transparent;color:inherit;border-radius:10px;min-height:46px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:14px;cursor:pointer;padding:2px}.afday i{font-style:normal;font-size:8px;line-height:1;color:var(--brass,#b8963e)}
.afday.today{border-color:var(--brass,#b8963e);font-weight:700}.afday.sel{background:var(--brass,#b8963e);color:#fff}.afday.sel i{color:#fff}`;document.head.appendChild(s)}
css();
{const _r=render;render=function(){if(view==="lic"){renderTabs();$("#main").innerHTML=html();if(typeof animateView==="function")animateView();return}return _r.apply(this,arguments)}}
const cls=id=>L().classes.find(c=>c.id===id);
const need=()=>{if(lv()!=="mgr"){denyMsg();return false}return true};
document.addEventListener("click",e=>{const t=e.target;if(!t||!t.closest||view!=="lic")return;const a=s=>t.closest(s);let b;
  if(b=a("[data-ltab]")){TAB=b.dataset.ltab;again();return}
  if(b=a("[data-lnewt]")){NEW=!NEW;again();if(NEW){const n=$("#lnN");if(n)n.focus()}return}
  if(b=a("[data-lnx]")){NEW=false;again();return}
  if(b=a("[data-lnew]")){if(!need())return;const n=(($("#lnN")||{}).value||"").trim(),d=(($("#lnD")||{}).value||"").trim();if(!n||!d){toast("Add a class name and a date.");return}
    const iv=(($("#lnI")||{}).value||"").trim();const im=iv?A.match(iv):null;const cap=Math.max(1,Math.min(200,+($("#lnC")||{}).value||8)),val=Math.max(1,Math.min(120,+($("#lnV")||{}).value||36));
    const c={id:rndId(8),n:n.slice(0,50),d,tm:String((($("#lnT")||{}).value||"08:00")).replace(":",""),ins:im?im.id:"",insN:im?"":iv.slice(0,40),cap,val,en:[],ext:[],wl:[],docs:[],done:false};
    L().classes.push(c);save();NEW=false;OPEN=c.id;DAY=d;const dd=D0(d);CUR=new Date(dd.getFullYear(),dd.getMonth(),1);MSG="Created "+c.n+" on "+dl(d)+".";again();return}
  if(b=a("[data-lopen]")){OPEN=OPEN===b.dataset.lopen?null:b.dataset.lopen;ARM=null;DROP=null;again();return}
  if(b=a("[data-lgo]")){TAB="list";OPEN=b.dataset.lgo;again();window.scrollTo(0,0);return}
  if(b=a("[data-ladd]")){if(!need())return;const c=cls(b.dataset.ladd);const v=(($("#lAddP")||{}).value||"").trim();if(!c||!v){toast("Type a name first.");return}
    const m=A.match(v);const r=enroll(c,m||v);save();MSG=r==="in"?(m?A.nm(m):v)+" enrolled.":r==="wl"?"Class is full. "+(m?A.nm(m):v)+" is on the waitlist.":"Already in this class.";again();return}
  if(b=a("[data-lrm]")){if(!need())return;const [id,k]=b.dataset.lrm.split("|");const c=cls(id);if(c){unenroll(c,k);save();again()}return}
  if(b=a("[data-ldropt]")){DROP=DROP===b.dataset.ldropt?null:b.dataset.ldropt;again();return}
  if(b=a("[data-ldropgo]")){if(!need())return;const c=cls(b.dataset.ldropgo);const txt=(($("#lPaste")||{}).value||"").trim();if(!c||!txt){toast("Paste some names first.");return}
    const r=drop(c,txt);DROP=null;MSG="Added "+r.n+(r.g?" ("+r.g+" guest"+(r.g===1?"":"s")+")":"")+(r.w?" · "+r.w+" waitlisted":"")+(r.dup?" · "+r.dup+" already in":"")+".";again();return}
  if(b=a("[data-ldty]")){DTYPE=b.dataset.ldty;again();return}
  if(b=a("[data-ldoc]")){const [cid,id]=b.dataset.ldoc.split("|");const c=cls(cid);const d=c&&c.docs.find(x=>x.id===id);if(d)openDoc(d);return}
  if(b=a("[data-ldocrm]")){if(!need())return;const [cid,id]=b.dataset.ldocrm.split("|");const c=cls(cid);if(c){rmDoc(c,id);again()}return}
  if(b=a("[data-lcopy]")){const c=cls(b.dataset.lcopy);if(c)copy(rosterText(c));return}
  if(b=a("[data-ldone]")){if(!need())return;const c=cls(b.dataset.ldone);if(!c)return;if(ARM!=="done"+c.id){ARM="done"+c.id;again();return}ARM=null;const n=complete(c);MSG=c.n+" is done. "+n+" license"+(n===1?"":"s")+" stamped, valid "+(c.val||36)+" months.";again();return}
  if(b=a("[data-ldel]")){if(!need())return;const c=cls(b.dataset.ldel);if(!c)return;if(ARM!=="del"+c.id){ARM="del"+c.id;again();return}const o=dread();c.docs.forEach(d=>delete o[d.id]);dwrite(o);L().classes=L().classes.filter(x=>x.id!==c.id);ARM=null;OPEN=null;save();again();toast("Class deleted");return}
  if(b=a("[data-lenr]")){if(!need())return;const [id,n]=b.dataset.lenr.split("|");enrollExpiring(id,n);again();return}
  if(b=a("[data-lmv]")){CUR=new Date(CUR.getFullYear(),CUR.getMonth()+(+b.dataset.lmv),1);again();return}
  if(b=a("[data-ltoday]")){const n=new Date();CUR=new Date(n.getFullYear(),n.getMonth(),1);DAY=dkey();again();return}
  if(b=a("[data-lday]")){DAY=b.dataset.lday;again();return}
  if(b=a("[data-lics]")){shareFile(ics(),"Licensing classes.ics","text/calendar");return}});
document.addEventListener("change",async e=>{const el=e.target;if(!el||view!=="lic")return;const f=el.files&&el.files[0];if(!f)return;
  if(el.id==="lFile"){if(!need())return;const c=cls(el.dataset.cid);if(!c)return;try{const txt=typeof fileToCSV==="function"?await fileToCSV(f):await f.text();const r=drop(c,txt);DROP=null;MSG="Added "+r.n+(r.g?" ("+r.g+" guest"+(r.g===1?"":"s")+")":"")+(r.w?" · "+r.w+" waitlisted":"")+".";again()}catch(err){toast(String(err.message||"Couldn't read that file."))}return}
  if(el.id==="lDoc"){if(!need())return;const c=cls(el.dataset.cid);if(!c)return;try{await addDoc(c,f,DTYPE);MSG="Added "+f.name+".";again()}catch(err){toast(String(err.message||"Couldn't add that file."))}}});
window.afLic={enroll,drop,complete,expiring,enrollExpiring,names,state:L,ics,addDoc,docs:dread};

/* ---------- members see their classes and licenses on My page ---------- */
{const _md=mpDigest;mpDigest=function(m){const d=_md.apply(this,arguments);try{if(A.mods().lic){const t=dkey();d.cls=L().classes.filter(c=>!c.done&&c.d>=t&&c.en.includes(m.id)).slice(0,10).map(c=>({n:c.n,d:c.d,tm:c.tm||"",ins:insName(c)}));d.lics=(m.lic||[]).slice(0,12).map(x=>({n:x.n,exp:x.exp||""}))}}catch(e){}return d}}
function meLic(){if(view!=="me"&&view!=="mepv")return;const D=S.me&&S.me.d;const m=$("#main");if(!D||!m||m.querySelector("#afMyLic"))return;const C=D.cls||[],Q=D.lics||[];if(!C.length&&!Q.length)return;
  m.insertAdjacentHTML("beforeend",`<div class="panel" id="afMyLic" style="margin-top:12px">${C.length?`<b>My classes</b>${C.map(c=>`<div class="rrow" style="--sc:var(--brass)"><div class="who"><b>${esc(c.n)}</b><div class="ph">${esc(dl(c.d))}${c.tm?" · "+esc(c.tm):""}${c.ins?" · Instructor: "+esc(c.ins):""}</div></div></div>`).join("")}`:""}${Q.length?`<b style="display:block;margin-top:${C.length?10:0}px">My licenses</b>${Q.map(x=>{const d=x.exp?daysTo(x.exp):null;return `<div class="rrow" style="--sc:var(${d!=null&&d<=30?"--warn":"--s-onhand"})"><div class="who"><b>${esc(x.n)}</b><div class="ph">${x.exp?(d<0?"Expired ":"Expires ")+esc(dl(x.exp)):"No expiry set"}</div></div></div>`}).join("")}`:""}</div>`)}
if(typeof renderMe==="function"){const _rm=renderMe;renderMe=function(){const r=_rm.apply(this,arguments);try{meLic()}catch(e){}return r}}
if(typeof HELP==="object"){HELP.lic=["Licensing","Run licensing classes: seats, rosters, documents, and a calendar of just your classes.",["Tools → Tool access: turn Licensing on and pick who runs it.","Licensing → New class, then Drop in roster or add people. A full class starts a waitlist.","Complete class stamps a license on everyone enrolled. The Calendar tab shows only licensing classes."]]}
})();
