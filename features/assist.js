// 4.96: Smart help. Six practical helpers on one Tools page: roster check, morning brief, paste-to-calendar,
// what did I miss, check-before-sending, and match-an-unknown-reply. They run on the phone with plain rules:
// nothing is sent anywhere and no AI server is needed. (An AI model can polish the wording later; the checks stay.)
(()=>{
const MON=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"],DOW=["SUN","MON","TUE","WED","THU","FRI","SAT"];
const iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const lev=(a,b)=>{if(a===b)return 0;const p=[...Array(b.length+1).keys()];for(let i=1;i<=a.length;i++){let prev=p[0];p[0]=i;for(let j=1;j<=b.length;j++){const t=p[j];p[j]=Math.min(p[j]+1,p[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=t}}return p[b.length]};
const nm=m=>((m.rank?m.rank+" ":"")+m.name).replace(/\s+/g," ").trim();
const away=m=>AWAY.includes(m.status);
const A={cal:"",calOut:null,chk:"",phone:"",rep:"",fix:null};

/* 1. roster check */
function rosterIssues(){const R=S.roster.filter(m=>m.sec!=="ATT"||true),out=[];const t=dkey();
  const seen=new Map();R.forEach(m=>{const k=String(m.name||"").toUpperCase().replace(/\s+/g," ").trim();if(seen.has(k))out.push({k:"dup",t:`${nm(m)} and ${nm(seen.get(k))} look like the same person.`});else seen.set(k,m)});
  for(let i=0;i<R.length;i++)for(let j=i+1;j<R.length;j++){const a=(R[i].name||"").toUpperCase(),b=(R[j].name||"").toUpperCase();if(a!==b&&a.length>4&&a.replace(/\d/g,"")!==b.replace(/\d/g,"")&&lev(a,b)===1&&lastOf(R[i])[0]===lastOf(R[j])[0])out.push({k:"typo",t:`"${R[i].name}" and "${R[j].name}" differ by one letter. Typo?`})}
  const ph=new Map();R.forEach(m=>{const p=String(m.phone||"").replace(/\D/g,"").slice(-10);if(p.length===10){if(ph.has(p))out.push({k:"ph",t:`${nm(m)} and ${nm(ph.get(p))} share a phone number.`});else ph.set(p,m)}});
  const nop=R.filter(m=>!String(m.phone||"").replace(/\D/g,"")&&m.sec!=="ATT");if(nop.length)out.push({k:"nop",t:`${nop.length} ${nop.length===1?"person has":"people have"} no phone number: ${nop.slice(0,4).map(nm).join(", ")}${nop.length>4?" …":""}.`});
  R.filter(m=>away(m)&&isoOf(m.end)&&isoOf(m.end)<t).forEach(m=>out.push({k:"back",id:m.id,t:`${nm(m)} is still ${m.status}, but that ended ${m.end}.`}));
  R.filter(m=>away(m)&&!isoOf(m.end)).slice(0,5).forEach(m=>out.push({k:"noend",t:`${nm(m)} is ${m.status} with no end date.`}));
  return out}
/* 2. morning brief */
function brief(){const t=dkey(),R=S.roster.filter(m=>m.sec!=="ATT");const aw=R.filter(m=>away(m)&&(!isoOf(m.start)||isoOf(m.start)<=t)&&(!isoOf(m.end)||isoOf(m.end)>=t));
  const soon=R.filter(m=>away(m)&&isoOf(m.end)&&isoOf(m.end)>=t&&isoOf(m.end)<=dkey(new Date(Date.now()+3*864e5)));
  const stale=R.filter(m=>!away(m)&&(!m.ckAt||Date.now()-m.ckAt>864e5));const tm=dkey(new Date(Date.now()+864e5));
  const evs=(S.events||[]).filter(e=>[t,tm].includes(isoOf(e.date)||e.date));
  const L=[`${new Date().toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"})}: ${R.length} on the roster, ${R.length-aw.length} expected today.`];
  if(aw.length)L.push(`Away today (${aw.length}): ${aw.slice(0,5).map(m=>nm(m)+" ("+m.status+")").join(", ")}${aw.length>5?" and "+(aw.length-5)+" more":""}.`);
  if(soon.length)L.push(`Back within 3 days: ${soon.slice(0,5).map(m=>nm(m)+" "+m.end).join(", ")}.`);
  if(stale.length&&R.some(m=>m.ckAt))L.push(`${stale.length} haven't checked in for 24 hours.`);
  if(evs.length)L.push(`On the calendar: ${evs.map(e=>e.name+((isoOf(e.date)||e.date)===t?" today":" tomorrow")+(e.tm?" "+e.tm.replace(":",""):"")).join("; ")}.`);
  if(S.rc&&S.rc.open)L.push("A recall is open right now.");
  return L.join("\n")}
/* 3. paste to calendar */
function parseLines(text){const today=new Date();today.setHours(0,0,0,0);const out=[],skipped=[];
  String(text).split(/\r?\n|;/).map(x=>x.trim()).filter(x=>x.length>2).forEach(line=>{let s=line,d=null,tm="";
    let m=s.match(/\b(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\.?(?:,?\s+(\d{4}))?/i);
    if(m){d=new Date(m[3]?+m[3]:today.getFullYear(),MON.indexOf(m[2].toUpperCase()),+m[1]);s=s.replace(m[0]," ")}
    else if((m=s.match(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?\b/i))){d=new Date(m[3]?+m[3]:today.getFullYear(),MON.indexOf(m[1].toUpperCase()),+m[2]);s=s.replace(m[0]," ")}
    else if((m=s.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))){const y=m[3]?(+m[3]<100?2000+ +m[3]:+m[3]):today.getFullYear();d=new Date(y,+m[1]-1,+m[2]);s=s.replace(m[0]," ")}
    else if((m=s.match(/\b(today|tomorrow)\b/i))){d=new Date(today.getTime()+(/tom/i.test(m[1])?864e5:0));s=s.replace(m[0]," ")}
    else if((m=s.match(/\b(?:next\s+)?(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/i))){const w=DOW.indexOf(m[1].toUpperCase());d=new Date(today);d.setDate(d.getDate()+((w-d.getDay()+7)%7));s=s.replace(m[0]," ")}
    if(d&&!/\d{4}/.test(line.slice(0,0))&&d<today&&!/\b\d{4}\b/.test(line))d.setFullYear(d.getFullYear()+1);
    if(!d||isNaN(d)){skipped.push(line);return}
    let t;if((t=s.match(/\b(\d{1,2}):(\d\d)\s?(am|pm)?\b/i))){let h=+t[1];if(t[3]){h=h%12+(/p/i.test(t[3])?12:0)}tm=String(h).padStart(2,"0")+":"+t[2];s=s.replace(t[0]," ")}
    else if((t=s.match(/\b(\d{1,2})\s?(am|pm)\b/i))){const h=+t[1]%12+(/p/i.test(t[2])?12:0);tm=String(h).padStart(2,"0")+":00";s=s.replace(t[0]," ")}
    else if((t=s.match(/\b([01]\d|2[0-3])([0-5]\d)\b(?:\s?(?:hrs?|hours))?/i))&&!(+t[0].slice(0,4)>=2020&&+t[0].slice(0,4)<=2035)){tm=t[1]+":"+t[2];s=s.replace(t[0]," ")}
    const name=s.replace(/\b(on|at|@)\b/ig," ").replace(/[,;:\-–]+/g," ").replace(/\s+/g," ").trim()||"Event";
    out.push({name:name.slice(0,60),date:iso(d),tm,on:true})});
  return {out,skipped}}
/* 4. what did I miss */
function missed(){const L=[];for(const f of S.feeds||[]){const posts=(f.posts||[]).filter(p=>Date.now()-p.t<7*864e5&&!p.pod);
  if(f.lk){posts.filter(p=>Date.now()-p.t<3*864e5).forEach(p=>{const st=typeof fdStats==="function"?fdStats(f,p):null;if(st&&st.pool-st.got>0)L.push({u:!!p.urg,t:p.t,x:`${st.pool-st.got} of ${st.pool} haven't confirmed: "${String(p.txt).slice(0,70)}"`})})}
  else posts.filter(p=>!(f.mine||{})[p.id]&&(typeof fdVisible!=="function"||fdVisible(f).includes(p))).forEach(p=>L.push({u:!!p.urg,t:p.t,x:`${p.urg?"URGENT: ":""}${String(p.txt).slice(0,90)}`}))}
  return L.sort((a,b)=>b.u-a.u||b.t-a.t)}
/* 5. check before sending */
function checkMsg(t){const s=String(t||"").trim(),I=[];if(!s)return I;
  if(s.length<15)I.push("Very short. Say what people should do.");
  if(!/\b(\d{3,4}\s?(hrs?|hours)?|\d{1,2}(:\d\d)?\s?(am|pm)|noon|midnight|tonight|tomorrow|today|now|asap|immediately|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(s))I.push("No time. When?");
  if(!/\b(at|in|@|room|bldg|building|gate|field|hall|lot|pool|office|range|gym|base|site|online|call|zoom|teams)\b/i.test(s))I.push("No place. Where?");
  if(s.length>8&&s===s.toUpperCase()&&/[A-Z]{6}/.test(s))I.push("All capitals reads as shouting.");
  return I}
/* 6. match an unknown reply */
function matchReply(text){const W=String(text||"").toUpperCase().split(/[^A-Z0-9]+/).filter(w=>w.length>1);if(!W.length)return [];
  return S.roster.map(m=>{let sc=0;const l=lastOf(m),f=((m.name.split(",")[1]||"").trim().split(/\s+/)[0]||"").toUpperCase();
    if(W.includes(l))sc+=3;else if(W.some(w=>l.length>3&&lev(w,l)<=1))sc+=2;
    if(f&&W.includes(f))sc+=2;else if(f&&W.some(w=>f.length>3&&lev(w,f)<=1))sc+=1;
    if(m.rank&&W.includes(m.rank.toUpperCase()))sc+=1;return {m,sc}}).filter(x=>x.sc>0).sort((a,b)=>b.sc-a.sc).slice(0,3)}

/* page */
const sec=(t,sub,body)=>`<div class="panel" data-noxl><b>${t}</b><p class="note" style="margin:2px 0 8px">${sub}</p>${body}</div>`;
function html(){const iss=rosterIssues(),ms=missed(),mt=matchReply(A.rep);
  const calP=A.calOut?(A.calOut.out.length?A.calOut.out.map((e,i)=>`<label class="tog" style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" data-asev="${i}"${e.on?" checked":""}> <span><b>${esc(e.name)}</b> · ${esc(e.date)}${e.tm?" "+esc(e.tm):""}</span></label>`).join("")+`<button class="btn" data-asadd="1">Add ${A.calOut.out.filter(e=>e.on).length} to the calendar</button>`:"")+(A.calOut.skipped.length?`<p class="note">No date found in: ${A.calOut.skipped.map(esc).join(" | ")}</p>`:""):"";
  const ck=checkMsg(A.chk);
  return `<button class="btn alt" data-go="tools" style="margin:8px 0">‹ Tools</button><h2>Smart help</h2>
  <p class="note">Runs on this phone. Nothing is sent anywhere.</p>
  ${sec("Roster check","Finds duplicates, typos, missing numbers and expired leave.",iss.length?`<ul id="asIss" style="padding-left:18px;margin:0">${iss.slice(0,12).map(i=>`<li style="margin:6px 0">${esc(i.t)}${i.k==="back"?` <button class="chip" data-asback="${esc(i.id)}" style="cursor:pointer">Mark On Hand</button>`:""}</li>`).join("")}</ul>`+(iss.length>12?`<p class="note">+${iss.length-12} more</p>`:""):`<p class="note" id="asIss">Nothing to fix. Roster looks clean.</p>`)}
  ${sec("Morning brief","Today in a few lines.",`<div id="asBrief" style="white-space:pre-wrap">${esc(brief())}</div><button class="btn alt" data-ascopy="1">Copy</button>`)}
  ${sec("Paste to calendar","Paste an email or text with dates. Check the list, then add.",`<textarea id="asCal" style="min-height:70px" placeholder="Range Tuesday 0700&#10;Inspection 19 NOV 1300">${esc(A.cal)}</textarea><button class="btn" data-asfind="1">Find the events</button>${calP}`)}
  ${sec("What did I miss","Posts that still need you, urgent first.",ms.length?`<ul style="padding-left:18px;margin:0">${ms.slice(0,8).map(x=>`<li style="margin:6px 0${x.u?";color:var(--warn)":""}">${esc(x.x)}</li>`).join("")}</ul>`:`<p class="note">You're caught up.</p>`)}
  ${sec("Check before sending","Paste a message. It points out what's missing.",`<textarea id="asChk" style="min-height:60px">${esc(A.chk)}</textarea>${A.chk.trim()?(ck.length?`<ul style="padding-left:18px;margin:6px 0 0" id="asChkOut">${ck.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:`<p class="note" id="asChkOut">Reads clear: has a time, a place and an action.</p>`):""}`)}
  ${sec("Who is this?","A reply came from a number that isn't on the roster. Paste it.",`<textarea id="asRep" style="min-height:50px" placeholder="Hi this is Smith, running late">${esc(A.rep)}</textarea><input id="asPh" type="tel" placeholder="Their number (optional)" value="${esc(A.phone)}">${mt.length?`<div id="asMatch">${mt.map(x=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin:6px 0"><span>${esc(nm(x.m))}</span>${A.phone.replace(/\D/g,"").length>=10?`<button class="chip" data-assave="${esc(x.m.id)}" style="cursor:pointer">Save number</button>`:""}</div>`).join("")}</div>`:(A.rep.trim()?`<p class="note" id="asMatch">No likely match.</p>`:"")}`)}`}
const _r=render;render=function(){if(view==="assist"){if(typeof renderTabs==="function")try{renderTabs()}catch(e){}const y=window.scrollY;$("#main").innerHTML=html();window.scrollTo(0,y);return}return _r.apply(this,arguments)};
const _t=renderTools;renderTools=function(){_t.apply(this,arguments);const g=[...document.querySelectorAll("#main .tgrid")];const last=g[g.length-1];
  if(last&&!document.querySelector("[data-go='assist']"))last.insertAdjacentHTML("beforeend",`<button data-go="assist"><span class="ic">${svg("help")}</span><span><b>Smart help</b><small>Roster check, brief, calendar</small></span></button>`)};
const keep=()=>{const g=id=>(document.getElementById(id)||{}).value;if(g("asCal")!=null)A.cal=g("asCal");if(g("asChk")!=null)A.chk=g("asChk");if(g("asRep")!=null)A.rep=g("asRep");if(g("asPh")!=null)A.phone=g("asPh")};
document.addEventListener("click",e=>{const t=e.target.closest("[data-asfind],[data-asadd],[data-asback],[data-ascopy],[data-assave]");if(!t||view!=="assist")return;keep();
  if(t.dataset.asfind){A.calOut=parseLines(A.cal);render();return}
  if(t.dataset.asadd){const all=SECTIONS.map(s=>s[0]);let n=0;A.calOut.out.filter(x=>x.on).forEach(x=>{S.events.push({id:"e"+Date.now()+n++,name:x.name,date:x.date,tm:x.tm,type:"",secs:all,att:false,done:{}})});save();A.calOut=null;A.cal="";render();toast(n+" event"+(n===1?"":"s")+" added");return}
  if(t.dataset.asback){const m=S.roster.find(x=>x.id===t.dataset.asback);if(m){m.status="On Hand";m.start="";m.end="";save();render();toast(m.name+": On Hand")}return}
  if(t.dataset.ascopy){try{navigator.clipboard.writeText(brief());toast("Copied")}catch(err){}return}
  if(t.dataset.assave){const m=S.roster.find(x=>x.id===t.dataset.assave);const p=A.phone.replace(/\D/g,"").slice(-10);if(m&&p.length===10){if(!m.phone)m.phone=p;else m.alt=p;save();toast("Saved to "+m.name)}return}});
document.addEventListener("change",e=>{if(view!=="assist")return;const c=e.target.closest("[data-asev]");if(c&&A.calOut){A.calOut.out[+c.dataset.asev].on=c.checked;keep();render()}});
document.addEventListener("input",e=>{if(view!=="assist")return;if(/^(asChk|asRep|asPh)$/.test(e.target.id)){const id=e.target.id,pos=e.target.selectionStart;keep();render();const n=document.getElementById(id);if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(err){}}}});
/* 5b. before an Urgent post goes out, stop once if it has no time or place */
document.addEventListener("click",e=>{const b=e.target.closest("#fdPost,#fdSlPost");if(!b)return;
  const urg=($("#fdUrg")||$("#fdSlUrg")||{}).checked;const txt=(($("#fdTxt")||$("#fdSlTxt")||{}).value||"");if(!urg)return;
  const iss=checkMsg(txt);if(!iss.length||A.warned===txt)return;A.warned=txt;e.stopImmediatePropagation();e.preventDefault();toast("Before you send: "+iss.join(" ")+" Tap Post again to send anyway.")},true);
window.AFAssist={rosterIssues,brief,parseLines,missed,checkMsg,matchReply};
})();
