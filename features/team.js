/* Accounted For 1.4: Team.
   1) People with access: everyone who can open your board, on your roster or not (My pages, logins, invites, open links).
   2) Check in from My page (or the Feed): pick a status or Other (write it in). Anything but On Hand asks From, To and Location.
      It goes to the leader, encrypted, on the request channel. Nothing new on the server.
   3) Leader: check-ins land in Check-ins and Activity. Confirm puts them on the roster. Every Activity item can be confirmed.
   4) Status details: picking anything but On Hand asks From, To and Location. Sections show when they were last updated.
   5) Members get an alert when their page changes (status, a check-in confirmed), with Confirm.
   6) Help & support: AI customer service for the app (the ask function's support mode), with a person one tap away. */
(()=>{
const SUPPORT_EMAIL="Antoniotyler22@gmail.com";
const CK_OTHER="Other";
const fmtD=s=>{const d=parseD(s);return d?DOW[d.getDay()]+" "+short(d):String(s||"")};
const hhmm=t=>{const d=new Date(t);return String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0")};
const stLabel=x=>x.st===CK_OTHER?(x.oth?"Other: "+x.oth:"Other"):(SHORT[x.st]||x.st);
const rangeTxt=(from,to)=>(from?"From "+fmtD(from):"")+(to?(from?" – ":"")+"To "+fmtD(to):"");
const ckLine=x=>[stLabel(x),x.st!=="On Hand"?rangeTxt(x.from,x.to):"",x.loc?"📍 "+x.loc:""].filter(Boolean).join(" · ");
const leaderHere=()=>typeof isLeaderPhone==="function"&&isLeaderPhone()&&!(typeof memberMode==="function"&&memberMode());
window.localAlert=localAlert;
function localAlert(title,body,open){if(!document.hidden)return;
  try{if(window.MBN&&MBN.on&&MBN.Local)MBN.Local.now({title,body,open});else if("Notification" in window&&Notification.permission==="granted")navigator.serviceWorker.ready.then(r=>r.showNotification(title,{body,data:{open},icon:"./icon-192.png"})).catch(()=>{})}catch(e){}}

IC.access='<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 11l2 2 4-4"/>';
IC.checkin='<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><path d="M9 10l2 2 4-4"/>';
IC.support='<path d="M4 14v-3a8 8 0 0 1 16 0v3"/><path d="M4 14h3v5H5a1 1 0 0 1-1-1zM20 14h-3v5h2a1 1 0 0 0 1-1z"/><path d="M17 19c0 1.5-2 2-5 2"/>';

/* =============== 1. SECTION UPDATE TIME + FROM/TO/LOCATION ON EVERY ROW =============== */
function secAt(k){let t=0;const B=S.board;if(B&&B.last&&B.last[k])t=Math.max(t,+B.last[k].t||0);t=Math.max(t,+((S.secAt||{})[k])||0);
  for(const m of S.roster)if(m.sec===k){const L=(S.tl||{})[m.id];if(L&&L.length)t=Math.max(t,+L[L.length-1][0]||0);if(m.upd)t=Math.max(t,+m.upd.t||0);if(m.ckAt)t=Math.max(t,m.ckAt)}
  return t}
window.secAt=secAt;
const updTxt=t=>t?"Updated "+hhmm(t)+" "+fmtD(dkey(new Date(t)))+" · "+ago(t):"Not updated yet";
function rowDet(m){if(m.status==="On Hand")return null;
  return [m.parent?"From "+m.parent:"",rangeTxt(isoOf(m.start)||m.start,isoOf(m.end)||m.end),m.loc?"📍 "+m.loc:"",m.detail||""].filter(Boolean).join(" · ")}
{const _rs=renderSection;renderSection=function(code){_rs.apply(this,arguments);const main=$("#main");if(!main)return;
  const hd=main.querySelector(".sechead");if(hd&&code!=="ATT")hd.insertAdjacentHTML("afterend",`<p class="note secupd" style="margin:2px 4px 6px">↻ ${esc(updTxt(secAt(code)))}</p>`);
  main.querySelectorAll(".m").forEach(row=>{const p=row.querySelector("[data-pcard]");const m=p&&S.roster.find(x=>x.id===p.dataset.pcard);if(!m)return;const t=rowDet(m);if(t==null)return;
    let d=row.querySelector(".det");if(!t&&!canEdit()){if(d)d.remove();return}if(!d){d=document.createElement("div");d.className="det";const rm=row.querySelector(".who .rm");rm?rm.before(d):row.querySelector(".who").appendChild(d)}d.textContent=t;
    if(canEdit())d.insertAdjacentHTML("beforeend",` <button class="chip" data-stdet="${esc(m.id)}" style="cursor:pointer">${!m.start&&!m.end&&!m.loc?"+ Dates, location":"✎ Edit"}</button>`)})}}
{const _rb=renderBoard;renderBoard=function(){_rb.apply(this,arguments);
  for(const [k] of SECTIONS){const t=secAt(k);
    const g=[...document.querySelectorAll("#main .sgrid button")].find(x=>x.dataset.go===k.toLowerCase());if(g&&t&&!g.querySelector(".sgupd"))g.insertAdjacentHTML("beforeend",`<small class="sgupd" style="display:block;font-size:10px;opacity:.75;font-weight:600">↻ ${hhmm(t)}</small>`);
    const b=[...document.querySelectorAll("#main button.pcard")].find(x=>x.dataset.go===k.toLowerCase());if(!b)continue;const n=b.querySelectorAll(".note");const last=n[n.length-1];if(!last)continue;
    last.textContent=last.textContent.split(" · updated")[0]+(t?" · updated "+hhmm(t)+" ("+ago(t)+")":"")}}}

/* the details sheet: picking anything but On Hand asks From, To, Location */
let stPend=null;
window.addEventListener("click",e=>{const so=e.target.closest&&e.target.closest("[data-sopt]");if(!so||!sheetCtx||sheetCtx.kind!=="s")return;
  const st=so.dataset.sopt;const m=S.roster.find(x=>x.id===sheetCtx.id);if(!m||!STATUSES.includes(st)||S.role==="view")return;
  // a new status starts clean: the last one's dates, location and detail come off (On Hand clears them for good;
  // another status opens the sheet blank, and Skip or tapping out leaves it blank instead of carrying the old location)
  if(st!==m.status){delete m.start;delete m.end;delete m.loc;delete m.detail}
  if(st==="On Hand")return;
  stPend={id:m.id,st};setTimeout(()=>{const p=stPend;stPend=null;if(p)stDetSheet(p.id)},RM()?20:320)},true);
document.addEventListener("click",e=>{const b=e.target.closest("[data-stdet]");if(b){e.stopImmediatePropagation();stDetSheet(b.dataset.stdet)}},true);
function stDetSheet(id){const m=S.roster.find(x=>x.id===id);if(!m)return;sheetCtx={kind:"stdet",id};
  const inp="width:100%;padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)";
  $("#sheetT").innerHTML=`${esc(SHORT[m.status]||m.status)}: dates and location<small>${esc(m.rank+" "+m.name)}</small>`;
  $("#sheetOpts").innerHTML=`<div class="panel" style="margin:0" data-noxl>
    <div class="row2"><div><label for="sdF">From</label><input type="date" id="sdF" value="${esc(isoOf(m.start)||dkey())}" style="${inp}"></div><div><label for="sdT">To</label><input type="date" id="sdT" value="${esc(isoOf(m.end))}" style="${inp}"></div></div>
    <label for="sdL">Location</label>${m.status==="Appointment"?`<div class="evts" style="margin-bottom:6px"><button type="button" class="chip" data-sdloc="On base">🏠 On base</button><button type="button" class="chip" data-sdloc="Off base">🚗 Off base</button></div>`:""}<input type="text" id="sdL" maxlength="60" value="${esc(m.loc||"")}" placeholder="${m.status==="Appointment"?"On base · clinic, or Off base · city, address":"City, clinic, base, address"}">
    <label for="sdD">${m.status==="Other"?"What's going on?":"Detail (optional)"}</label><input type="text" id="sdD" maxlength="80" value="${esc(m.detail||"")}" placeholder="${m.status==="Other"?"Write it in: sick call, car trouble, at the shop…":"Reason, who they're with, phone"}">
    <div class="row2"><button class="btn" id="sdSave">Save</button><button class="btn alt" data-sclose="1">Skip</button></div></div>`;
  const sh=$("#sheet");sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add("open")))}
document.addEventListener("click",e=>{const lb=e.target.closest&&e.target.closest("[data-sdloc]");if(!lb||!sheetCtx||sheetCtx.kind!=="stdet")return;e.stopImmediatePropagation();const el=$("#sdL");if(!el)return;
  const cur=el.value.replace(/^(on|off) base\s*(·\s*)?/i,"").trim();el.value=(lb.dataset.sdloc+(cur?" · "+cur:"")).slice(0,60);el.focus()},true);
document.addEventListener("click",e=>{if(e.target.id!=="sdSave"||!sheetCtx||sheetCtx.kind!=="stdet")return;const m=S.roster.find(x=>x.id===sheetCtx.id);if(!m)return closeSheet();
  const f=$("#sdF").value,t=$("#sdT").value;if(f&&t&&t<f){toast("To can't be before From.");return}
  const set=(k,v)=>{v=String(v||"").trim();if(v)m[k]=v;else delete m[k]};set("start",f);set("end",t);set("loc",($("#sdL").value||"").slice(0,60));set("detail",($("#sdD").value||"").slice(0,80));
  S.secAt=S.secAt||{};S.secAt[m.sec]=Date.now();save();closeSheet();const y=window.scrollY;render();window.scrollTo(0,y);toast("Saved")});

/* =============== 2. CHECK IN (members: My page and the Feed) =============== */
let ck={open:false,st:"",busy:false,v:{}};
function ckFeed(){const D=S.me&&S.me.d;if(D&&D.feed&&D.feed.id){const f=S.feeds.find(x=>x.id===D.feed.id&&!x.lk);if(f)return f}
  if(view==="feed"){const f=fdCur();if(f&&!f.lk)return f}return S.feeds.find(x=>!x.lk)||null}
/* No Feed on the page yet? The page itself is the channel: sealed with the page key, read by the leader's page write key.
   So anyone with a My page always has a Check in button. */
const ckPage=()=>S.me&&S.me.d&&String(S.me.pk)!=="preview"?S.me:null;
function ckGrab(){for(const [k,id] of [["from","ckF"],["to","ckT"],["loc","ckL"],["oth","ckO"],["note","ckN"]]){const el=document.getElementById(id);if(el)ck.v[k]=el.value}}
function ckState(x){const D=S.me&&S.me.d;const r=D&&(D.cks||[]).find(c=>c.cid===x.cid);return r?r:{state:"sent"}}
function ckExampleHTML(){const inp="width:100%;padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)";const d0=dkey(),d1=dkey(new Date(Date.now()+3*86400000));
  return `<div class="card" id="ckCard" style="gap:8px"><div style="display:flex;justify-content:space-between;align-items:baseline"><span class="lbl">CHECK IN</span><span class="chip">Example</span></div>
    <p class="note" style="margin:0">They pick where they are, then slide to check in:</p>
    <div class="evts">${STATUSES.map(s=>`<button disabled aria-pressed="${s==="Leave"}">${s===CK_OTHER?"✎ Other":`<span class="dot" style="background:var(${SVAR[s]})"></span>${esc(SHORT[s]||s)}`}</button>`).join("")}</div>
    <div class="row2"><div><label>From</label><input type="date" disabled value="${d0}" style="${inp}"></div><div><label>To</label><input type="date" disabled value="${d1}" style="${inp}"></div></div>
    <label>Location</label><input type="text" disabled value="Honolulu" style="${inp}">
    <div class="slck" aria-hidden="true"><div class="slck-fill"></div><div class="slck-txt">slide to check in</div><div class="slck-knob"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></div></div><p class="note" style="margin:0">You get it in Check-ins and tap Confirm. Their page then shows <b>✓ Confirmed</b>.</p></div>`}
function ckCardHTML(){const f=ckFeed();const last=(S.myCks||[])[0];
  let h=`<div class="card" id="ckCard" style="gap:8px"><div style="display:flex;justify-content:space-between;align-items:baseline"><span class="lbl">CHECK IN</span>${last?`<span class="chip">Last ${esc(ago(last.t))}</span>`:""}</div>`;
  if(last){const s=ckState(last);h+=`<div class="note" style="margin:0"><b>${esc(ckLine(last))}</b> · ${s.state==="ok"?`<span style="color:var(--s-onhand);font-weight:700">✓ Confirmed</span>`:s.state==="no"?`<span style="color:var(--warn);font-weight:700">✕ Not confirmed</span>${s.dnote?" · "+esc(s.dnote):""}`:"Sent · waiting for your leader"}</div>`}
  if(last&&!S.pushOn&&!(typeof Notification!=="undefined"&&Notification.permission==="denied"))h+=`<div class="note" id="ckAl" style="margin:0;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span style="flex:1;min-width:160px">🔔 Get your leader's confirmation on this phone.</span><button class="btn" id="taOn" style="min-height:40px">Turn on alerts</button></div>`;
  const P=f?null:ckPage();
  if(!f&&!P){h+=`<p class="note" style="margin:0">Check-in turns on once your page loads. Pull down to refresh, or ask your leader for a new link.</p></div>`;return h}
  /* 4.53: no "Check in" button to open first: the choices and the slider show right away, On Hand picked */
  if(!ck.open){ck.open=true;ck.st=ck.st||"On Hand";ck.v=ck.v||{};ck.auto=1}
  const v=ck.v;const inp="width:100%;padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)";
  h+=`<div class="evts" role="radiogroup" aria-label="Your status">${STATUSES.map(s=>`<button data-ckst="${esc(s)}" aria-pressed="${ck.st===s}" role="radio" aria-checked="${ck.st===s}">${s===CK_OTHER?"✎ Other":`<span class="dot" style="background:var(${SVAR[s]})"></span>${esc(SHORT[s]||s)}`}</button>`).join("")}</div>`;
  if(ck.st===CK_OTHER)h+=`<label for="ckO">What's going on?</label><input type="text" id="ckO" maxlength="80" value="${esc(v.oth||"")}" placeholder="Write it in: sick call, car trouble, at the shop…">`;
  if(ck.st&&ck.st!=="On Hand")h+=`<div class="row2"><div><label for="ckF">From</label><input type="date" id="ckF" value="${esc(v.from||dkey())}" style="${inp}"></div><div><label for="ckT">To</label><input type="date" id="ckT" value="${esc(v.to||"")}" style="${inp}"></div></div>
    <label for="ckL">Location</label><input type="text" id="ckL" maxlength="60" value="${esc(v.loc||"")}" placeholder="Where you are: base, city, clinic">`;
  if(ck.st)h+=`<label for="ckN">Note (optional)</label><input type="text" id="ckN" maxlength="120" value="${esc(v.note||"")}" placeholder="Anything your leader should know">`;
  h+=`<div class="row2"><button class="btn" id="ckSend"${!ck.st||ck.busy?" disabled":""}>${ck.busy?"Sending…":"Send check-in"}</button>${ck.auto?"":`<button class="btn alt" id="ckX">Cancel</button>`}</div>
    <p class="note" style="margin:0">Goes to ${esc((f?f.unit:P.d.unit)||"your leader")}, encrypted. Your leader confirms it and your page updates.</p></div>`;
  return h}
function ckRedraw(){const el=document.getElementById("ckCard");if(el){el.outerHTML=ckCardHTML()}else{const y=window.scrollY;render();window.scrollTo(0,y)}}
async function ckSend(){ckGrab();const f=ckFeed();const P=f?null:ckPage();if(!f&&!P)return;const v=ck.v;const st=ck.st;
  if(f&&!f.me){toast("Set your name in the Feed first.");return}
  if(st===CK_OTHER&&!String(v.oth||"").trim()){toast("Write what's going on.");return}
  if(st!=="On Hand"){if(!v.from){toast("Pick the From date.");return}if(v.to&&v.to<v.from){toast("To can't be before From.");return}}
  const D=P&&P.d;const pgMe=D?String((D.rank||"")+" "+((String(D.name||"").split(",")[0])||D.name||"")).trim().toUpperCase().slice(0,30):"";
  const o={k:"ck",cid:"c"+Date.now().toString(36)+rndId(4),me:f?f.me:pgMe,mid:f?(f.mid||""):String(D.mid||""),sec:f?(f.sec||""):String(D.sec||""),st,oth:st===CK_OTHER?String(v.oth).trim().slice(0,80):"",
    from:st==="On Hand"?"":String(v.from||"").slice(0,10),to:st==="On Hand"?"":String(v.to||"").slice(0,10),loc:st==="On Hand"?"":String(v.loc||"").trim().slice(0,60),note:String(v.note||"").trim().slice(0,120),at:Date.now()};
  ck.busy=true;ckRedraw();
  try{let r;
    if(f){const ct=await fdEnc(f.ek,o);const meta={alert:{alert:"ck",feed:f.id,mk:f.mk}};r=await SB.rpc("feed_req",{p_feed:f.id,p_member_key:f.mk,p_ct:ct},meta);if(r!==null)try{SB.notify(null,meta.alert)}catch(e){}}
    else{const K=await mpKeys(P.pk);const ct=await sealObj(K,o);r=await SB.rpc("page_req",{p_id:K.id,p_ct:ct});const F=D&&D.feed;if(r!==null&&F&&F.id&&F.mk)try{SB.notify(null,{alert:"ck",feed:F.id,mk:F.mk})}catch(e){}}
    S.myCks=[{cid:o.cid,st:o.st,oth:o.oth,from:o.from,to:o.to,loc:o.loc,t:o.at}].concat(S.myCks||[]).slice(0,20);ck={open:false,st:"",busy:false,v:{}};save();buzz();if(r!==null)toast("📍 Checked in. Your leader confirms it.")}
  catch(e){ck.busy=false;toast(/find the function|schema/i.test(String(e&&e.message))?"Check-in isn't set up on your leader's server yet. Tell your leader: setup part 34.":"Couldn't send. Check signal and try again.")}
  finally{ck.busy=false;ckRedraw()}}
document.addEventListener("click",e=>{const t=e.target;
  if(t.closest("#ckOpen")){ck.open=true;ck.st="";ck.v={};ckRedraw();return}
  if(t.closest("#ckX")){ck={open:false,st:"",busy:false,v:{}};ckRedraw();return}
  const s=t.closest("[data-ckst]");if(s){ckGrab();ck.st=s.dataset.ckst;ckRedraw();buzz();return}
  if(t.closest("#ckSend")){ckSend();return}});

/* =============== 5. MEMBER ALERTS: their page changed =============== */
function meSnap(D){return D?{st:D.status,end:D.end||"",duty:D.duty,cks:(D.cks||[]).map(c=>c.cid+":"+c.state),reqs:(D.reqs||[]).map(r=>r.rid+":"+r.st)}:null}
function meUpd(txt){S.meUpd=[{id:"u"+Date.now().toString(36)+rndId(3),t:Date.now(),txt:String(txt).slice(0,160),ok:0}].concat(S.meUpd||[]).slice(0,30)}
{const _mf=mpFetch;mpFetch=async function(){const before=meSnap(S.me&&S.me.d);const r=await _mf.apply(this,arguments);
  try{const D=S.me&&S.me.d;const now=meSnap(D);if(!before||!now)return r;const msgs=[];
    if(before.st!==now.st)msgs.push("Your status is now "+(D.statusShort||now.st)+(D.end&&now.st!=="On Hand"?" through "+fmtD(D.end):""));
    else if(before.end!==now.end&&now.end&&now.st!=="On Hand")msgs.push("Your return date changed to "+fmtD(now.end));
    if(before.duty!==now.duty)msgs.push("Your duty status is now "+now.duty);
    for(const c of D.cks||[]){const k=c.cid+":"+c.state;if(before.cks.includes(k)||c.state==="new")continue;msgs.push(c.state==="ok"?"Your check-in was confirmed":"Your check-in wasn't confirmed"+(c.dnote?": "+c.dnote:""))}
    for(const q of D.reqs||[]){const k=q.rid+":"+q.st;if(before.reqs.includes(k)||!["approved","denied"].includes(q.st))continue;msgs.push("Your "+q.ty+" request was "+q.st)}
    if(msgs.length){msgs.forEach(meUpd);rawSave();toast("🔔 "+msgs[0]);localAlert("🔔 "+(D.unit||"Your team"),msgs.join(". "),"me");if(view==="me"){const y=window.scrollY;renderMe();window.scrollTo(0,y)}}}catch(e){}
  return r}}
function meUpdHTML(){const L=(S.meUpd||[]).filter(x=>!x.ok);if(!L.length)return"";
  return `<div class="sech"><h2>🔔 Updates</h2><button class="chip" id="meUpdAll" style="cursor:pointer">Confirm all</button></div><div class="card ny" id="meUpd">${L.slice(0,6).map(x=>`<div class="lrow"><span class="n tone-a">🔔</span><span style="flex:1;min-width:0"><span class="t" style="display:block">${esc(x.txt)}</span><span class="s" style="display:block">${ago(x.t)}</span></span><button class="chip" data-meok="${esc(x.id)}" style="cursor:pointer">✓ Confirm</button></div>`).join("")}</div>`}
document.addEventListener("click",e=>{const b=e.target.closest("[data-meok]");if(b){const x=(S.meUpd||[]).find(u=>u.id===b.dataset.meok);if(x){x.ok=Date.now();rawSave();const y=window.scrollY;renderMe();window.scrollTo(0,y)}return}
  if(e.target.id==="meUpdAll"){(S.meUpd||[]).forEach(u=>{if(!u.ok)u.ok=Date.now()});rawSave();const y=window.scrollY;renderMe();window.scrollTo(0,y)}});

/* My page: updates, check-in, start your own team, help */
const startTeamHTML=()=>`<div class="panel" style="margin-top:12px"><b>Run your own team?</b><p class="note" style="margin:0">Start your own board for a squad, crew, club or job. Nothing connects back to this team.</p><a class="btn alt" href="#start" style="text-align:center">Start my own team</a></div>`;
{const _rm=renderMe;renderMe=function(){_rm.apply(this,arguments);if(!S.me||!S.me.d)return;const main=$("#main");
  if(view==="mepv"){const hero=main.querySelector(".card.hero");if(hero)hero.insertAdjacentHTML("afterend",ckExampleHTML());
    const ex=`<div class="sech"><h2>🔔 Updates</h2><span class="chip">Example</span></div><div class="card ny" id="meUpd"><div class="lrow"><span class="n tone-a">🔔</span><span style="flex:1;min-width:0"><span class="t" style="display:block">Your check-in was confirmed</span><span class="s" style="display:block">just now</span></span><button class="chip" disabled>✓ Confirm</button></div></div>`;
    hero?hero.insertAdjacentHTML("beforebegin",ex):main.insertAdjacentHTML("afterbegin",ex);main.insertAdjacentHTML("beforeend",startTeamHTML().replace('href="#start"','href="#start" aria-disabled="true" onclick="return false"')+`<p class="note" style="text-align:center;margin-top:10px"><span class="chip" data-go="support">💬 Help & support</span></p>`);return}
  if(view!=="me"||String(S.me.pk)==="preview")return;
  const hero=main.querySelector(".card.hero");if(hero)hero.insertAdjacentHTML("afterend",ckCardHTML());
  const u=meUpdHTML();if(u){const anchor=main.querySelector(".v12tabs")||main.firstElementChild;anchor?anchor.insertAdjacentHTML("afterend",u):main.insertAdjacentHTML("afterbegin",u)}
  const off=$("#meOff");const extra=startTeamHTML()+`<p class="note" style="text-align:center;margin-top:10px"><button class="chip" data-go="support" style="cursor:pointer">💬 Help & support</button></p>`;off?off.insertAdjacentHTML("beforebegin",extra):main.insertAdjacentHTML("beforeend",extra)}}
/* Feed-only members (no My page) check in from the Feed */
{const _rf=renderFeed;renderFeed=function(){_rf.apply(this,arguments);const f=fdCur();if(!f||f.lk||S.me||(typeof fdNew!=="undefined"&&fdNew))return;
  const main=$("#main");const anchor=main.querySelector(".sechead");anchor?anchor.insertAdjacentHTML("afterend",ckCardHTML()):main.insertAdjacentHTML("afterbegin",ckCardHTML())}}
/* the leader's page publish carries check-in confirmations back to each member */
{const _d=mpDigest;mpDigest=function(m){const d=_d.apply(this,arguments);d.cks=(S.cks||[]).filter(x=>x.mid===m.id).slice(0,6).map(x=>({cid:x.cid,state:x.state,dnote:x.dnote||""}));return d}}

/* =============== 3. LEADER: check-ins in, Confirm puts them on the roster =============== */
window.ckIn=function(f,o,r){S.cks=S.cks||[];const cid=String(o.cid||"").slice(0,20);if(!cid||S.cks.some(x=>x.cid===cid))return;
  const st=STATUSES.includes(fixStatus(o.st))?fixStatus(o.st):CK_OTHER;const who=String(o.me||"Someone").slice(0,30);
  let m=o.mid&&S.roster.find(x=>x.id===String(o.mid)||x.uid===String(o.mid));if(!m){const mm=typeof matchMarine==="function"?matchMarine(who):null;m=Array.isArray(mm)?(mm.length===1?mm[0]:null):mm||null}
  if(!m&&typeof sameNameLoose==="function"){const w=who.toUpperCase().replace(/[^A-Z0-9\s]/g," ").trim().split(/\s+/);  // "LCPL REAM KYLE" → rank, last, first
    if(w.length>=3){const guess={rank:w[0],name:w[1]+", "+w.slice(2).join(" ")};const hits=S.roster.filter(x=>sameNameLoose(x,guess));if(hits.length===1)m=hits[0]}}
  const clean=(v,n)=>String(v||"").replace(/[<>]/g,"").slice(0,n);const date=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||""))?String(v):"";
  const x={cid,feed:f.id,mid:m?m.id:"",who,sec:clean(o.sec,6),st,oth:clean(o.oth,80),from:date(o.from),to:date(o.to),loc:clean(o.loc,60),note:clean(o.note,120),t:Date.parse(r&&r.created_at)||+o.at||Date.now(),state:"new"};
  S.cks.unshift(x);S.cks=S.cks.slice(0,300);S.seen=S.seen||{};S.seen[x.mid||"n:"+who.toUpperCase()]={t:x.t,who,how:"check-in"};
  if(S.ckAuto&&m&&st!==CK_OTHER&&canEdit()){ckApply(x,st,"auto");actAdd("📍",who+" checked in: "+ckLine(x)+" · put on the roster","checkins")}
  else actAdd("📍",who+" checked in: "+ckLine(x)+(m?"":" · not matched to your roster"),"checkins");
  toast("📍 "+who+" checked in");try{navigator.vibrate&&navigator.vibrate([80,60,80])}catch(e){}
  localAlert("📍 "+who+" checked in",ckLine(x)+(canEdit()?". Open Check-ins to confirm.":". Open Check-ins to see it."),"checkins");
  if(view==="checkins"){const y=window.scrollY;renderCk();window.scrollTo(0,y)}};
/* leader: pull check-ins dropped on My pages (members with no Feed on their page). One call for every page. */
const pgK={};let pgBusy=false;
async function pgPoll(){if(pgBusy||!leaderHere())return;const L=S.roster.filter(m=>m.pk);if(!L.length)return;pgBusy=true;
  try{const ids=[],wks=[],by={};for(const m of L){const K=pgK[m.pk]||(pgK[m.pk]=await mpKeys(m.pk));ids.push(K.id);wks.push(K.wk);by[K.id]=K}
    const rows=await SB.rpc("page_reqs_get",{p_ids:ids,p_wks:wks,p_after:S.pgAfter||0});let got=0;
    for(const r of [...(rows||[])].sort((a,b)=>a.id-b.id)){S.pgAfter=Math.max(S.pgAfter||0,+r.id);const K=by[r.page_id];if(!K)continue;
      let o=null;try{o=await openBlob(K,r.ct)}catch(e){}if(!o||o.k!=="ck")continue;ckIn({id:"page:"+r.page_id},o,r);got++}
    if(got||rows&&rows.length)rawSave();S.pgErr=""}
  catch(e){const t=String(e&&e.message||e);S.pgErr=/find the function|schema|PGRST202/i.test(t)?"Run setup part 34 so My page check-ins reach you.":"";}
  finally{pgBusy=false}}
window.pgPoll=pgPoll;
every(60000,()=>{pgPoll()},"page-checkins");
document.addEventListener("visibilitychange",()=>{if(!document.hidden)pgPoll()});
function ckApply(x,st,by){const m=S.roster.find(y=>y.id===x.mid);if(!m)return false;
  if(STATUSES.includes(st))m.status=st;
  if(m.status==="On Hand"){delete m.start;delete m.end;delete m.loc;delete m.detail}
  else{if(x.from)m.start=x.from;if(x.to)m.end=x.to;else if(x.from)delete m.end;if(x.loc)m.loc=x.loc}
  const det=[x.oth,x.note].filter(Boolean).join(" · ");if(det)m.detail=det.slice(0,80);
  m.ckAt=Date.now();S.secAt=S.secAt||{};S.secAt[m.sec]=m.ckAt;x.state="ok";x.dt=Date.now();x.by=by||"";save();return true}
window.ckApply=ckApply;window.ckLine=ckLine;
const ckOpen=()=>(S.cks||[]).filter(x=>x.state==="new");
function ckRow(x){const m=x.mid&&S.roster.find(y=>y.id===x.mid);const open=x.state==="new";
  let h=`<div class="rrow" style="--sc:var(${open?"--brass":x.state==="ok"?"--s-onhand":"--warn"})"><div class="who"><b>${m?`<span data-pcard="${esc(m.id)}" style="cursor:pointer;text-decoration:underline;text-decoration-color:var(--line)">${esc(m.rank+" "+m.name)}</span>`:esc(x.who)}</b>${x.sec?` <span class="chip">${esc(x.sec)}</span>`:""}
    <div class="ph"><b>${esc(ckLine(x))}</b></div>${x.note?`<div class="ph">“${esc(x.note)}”</div>`:""}<div class="ph">${hhmm(x.t)} · ${ago(x.t)}${x.state==="ok"?" · ✓ Confirmed"+(x.by==="auto"?" (auto)":""):x.state==="no"?" · ✕ Not confirmed"+(x.dnote?": "+esc(x.dnote):""):""}</div></div>`;
  if(open){const sel=x.st===CK_OTHER?(m?m.status:""):x.st;
    h+=`${m?"":`<label for="ckWho${x.cid}">Who is this?</label><select id="ckWho${x.cid}" class="wsel" data-ckwho="${x.cid}"><option value="">Not on my roster</option>${sorted(S.roster).map(r=>`<option value="${esc(r.id)}">${esc(r.rank+" "+r.name)} · ${esc(r.sec)}</option>`).join("")}</select>`}
      <label for="ckSt${x.cid}">Put on the roster as</label><select id="ckSt${x.cid}" class="wsel">${STATUSES.map(s=>`<option${s===sel?" selected":""}>${esc(s)}</option>`).join("")}</select>
      <input type="text" id="ckDn${x.cid}" maxlength="80" placeholder="Note back to them (optional)">
      <div class="row2"><button class="btn" data-ckok="${x.cid}">✓ Confirm</button><button class="btn alt" data-ckno="${x.cid}">Not right</button></div>`}
  return h+`</div>`}
function renderCk(){let h=banner()+`<div class="sechead" style="margin-top:12px"><h2>Check-ins</h2><span class="note" style="margin:0">From My page and the Feed</span></div>`;
  if(!leaderHere()){$("#main").innerHTML=h+`<div class="panel"><p class="note">Check in from your My page. Your leader sees it here.</p></div>`;return}
  const open=ckOpen(),done=(S.cks||[]).filter(x=>x.state!=="new").slice(0,30);
  h+=`<div class="panel"><label class="tog"><input type="checkbox" id="ckAuto"${S.ckAuto?" checked":""}> Confirm check-ins from people on my roster by themselves</label><p class="note" style="margin:0">Off: you confirm each one before it changes the roster. Other always waits for you.</p></div>`;
  if(S.pgErr)h+=`<div class="panel" style="border-color:var(--warn)"><p class="note" style="margin:0">⚠️ ${esc(S.pgErr)} (DATA → System check → My page check-in)</p></div>`;
  if(!(S.feeds||[]).some(f=>f.lk)&&!S.roster.some(m=>m.pk))h+=`<div class="panel"><p class="note">Check-ins come in from My pages and the Feed. Send people their My page link (Tools → Invite) and the Check in button is on their page.</p><button class="btn alt" data-go="invite">Invite</button></div>`;
  h+=open.length?`<div class="sech"><h2>To confirm · ${open.length}</h2>${open.length>1?`<button class="chip" id="ckAll" style="cursor:pointer">Confirm all matched</button>`:""}</div><div class="alist">${open.map(ckRow).join("")}</div>`:`<div class="panel"><p class="note">Nothing to confirm. New check-ins show up here and in Activity.</p></div>`;
  if(done.length)h+=`<details class="panel"><summary class="note">Confirmed and not confirmed (${done.length})</summary><div class="alist">${done.map(ckRow).join("")}</div></details>`;
  $("#main").innerHTML=h}
document.addEventListener("change",e=>{if(e.target.id==="ckAuto"){S.ckAuto=e.target.checked;save();toast(S.ckAuto?"Check-ins from your roster confirm by themselves":"You confirm each check-in");return}
  const w=e.target.closest("[data-ckwho]");if(w){const x=(S.cks||[]).find(c=>c.cid===w.dataset.ckwho);if(x){x.mid=w.value;save();const y=window.scrollY;renderCk();window.scrollTo(0,y)}}});
document.addEventListener("click",e=>{const t=e.target;
  const ok=t.closest("[data-ckok]"),no=t.closest("[data-ckno]");
  if(ok||no){if(!canEdit())return denyMsg();const cid=(ok||no).dataset[ok?"ckok":"ckno"];const all=(S.cks||[]).filter(c=>c.cid===cid);const x=all[0];if(!x)return;if(all.length>1)S.cks=(S.cks||[]).filter(c=>c.cid!==cid||c===x);x.dnote=((document.getElementById("ckDn"+x.cid)||{}).value||"").trim().slice(0,80);
    if(ok){const st=(document.getElementById("ckSt"+x.cid)||{}).value||x.st;if(x.mid){ckApply(x,st,S.unit||unitName());toast("✓ Confirmed · on the roster")}else{x.state="ok";x.dt=Date.now();save();toast("✓ Confirmed (not on your roster, so nothing changed)")}}
    else{x.state="no";x.dt=Date.now();save();toast("Marked not right"+(x.mid?". They see it on My page.":""))}
    if(typeof mpSchedule==="function")mpSchedule();const y=window.scrollY;render();window.scrollTo(0,y);return}
  if(t.id==="ckAll"){if(!canEdit())return denyMsg();let n=0;for(const x of ckOpen())if(x.mid&&x.st!==CK_OTHER&&ckApply(x,x.st,S.unit||unitName()))n++;if(typeof mpSchedule==="function")mpSchedule();renderCk();toast(n?"✓ Confirmed "+n:"Nothing matched to confirm. Pick who each one is first.")}});
/* banner on every leader screen while check-ins wait */
{const _b=banner;banner=function(){const n=leaderHere()&&view!=="checkins"&&view!=="act"?ckOpen().length:0;return (n?`<div class="banner" style="border-color:var(--brass)"><span>📍 <b>${n}</b> check-in${n>1?"s":""} to confirm.</span><button data-go="checkins">Confirm</button></div>`:"")+_b.apply(this,arguments)}}

/* Activity: every item can be confirmed */
renderAct=function(){const A=S.act||[];const seen=S.actSeen||0;let h=banner()+`<div class="sechead" style="margin-top:12px"><h2>Activity</h2><span class="note" style="margin:0">Everything that happens on your team</span></div>`;
  const open=ckOpen();if(open.length)h+=`<div class="panel" style="border-color:var(--brass)"><b>📍 ${open.length} check-in${open.length>1?"s":""} to confirm</b><div class="alist">${open.slice(0,3).map(ckRow).join("")}</div>${open.length>3?`<button class="btn alt" data-go="checkins">See all ${open.length}</button>`:""}</div>`;
  if(!A.length)h+=`<div class="panel"><p class="note">Nothing yet. Check-ins, section updates, leader posts, Got its, problems, requests and calendar changes show up here as they come in.</p></div>`;
  const un=A.filter(a=>!a.ok).length;if(un)h+=`<div style="display:flex;justify-content:flex-end;margin-top:8px"><button class="chip" id="actOkAll" style="cursor:pointer">✓ Confirm all (${un})</button></div>`;
  let day="";for(const a of A){const d=new Date(a.t);const k=DOW[d.getDay()]+" "+short(d);if(k!==day){day=k;h+=`<div class="note" style="margin:14px 4px 4px;font-weight:800">${esc(k)}</div>`}
    h+=`<div class="lrow card" style="margin:4px 0;align-items:center"><button data-go="${esc(a.go||"act")}" style="display:flex;gap:10px;flex:1;min-width:0;text-align:left;background:none;border:0;cursor:pointer;color:inherit;padding:0"><span class="n tone-${a.ok?"g":a.t>seen?"a":"b"}">${esc(a.ic)}</span><span style="flex:1;min-width:0"><span class="t" style="display:block">${esc(a.txt)}</span><span class="s" style="display:block">${hhmm(a.t)} · ${ago(a.t)}${a.ok?" · ✓ confirmed":""}</span></span></button>${a.ok?"":`<button class="chip" data-actok="${a.t}" style="cursor:pointer;flex:none">✓ Confirm</button>`}</div>`}
  if(A.length)h+=`<button class="btn alt" id="actClear" style="width:100%;margin-top:14px">${armed==="actclr"?"Tap again to clear the list":"Clear the list"}</button>`;
  $("#main").innerHTML=h;if(actNew()){S.actSeen=Date.now();rawSave();setTimeout(renderTabs,0)}};
document.addEventListener("click",e=>{const b=e.target.closest("[data-actok]");if(b){const a=(S.act||[]).find(x=>String(x.t)===b.dataset.actok&&!x.ok);if(a){a.ok=Date.now();rawSave()}const y=window.scrollY;renderAct();window.scrollTo(0,y);return}
  if(e.target.id==="actOkAll"){const now=Date.now();(S.act||[]).forEach(a=>{if(!a.ok)a.ok=now});rawSave();renderAct()}});

/* =============== 1. PEOPLE WITH ACCESS =============== */
/* remember every invite sent from the Invite screen, so people who aren't on the roster still show up */
window.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-invgo]");if(!b)return;const box=b.closest(".invsend");if(!box)return;
  const how=b.dataset.invgo,text=box.dataset.invtext||"",to=((box.querySelector(".invto")||{}).value||"").trim().slice(0,60);
  if((how==="sms"||how==="mail")&&!to)return;
  const kind=/^Try Accounted For/.test(text)?"start":/login\nUsername/.test(text)?"login":"team";const rm=text.match(/Role: ([^·\n]+?) · ([^\n]+?)(?:\.|\n|$)/);
  const x={t:Date.now(),to:to||(how==="copy"?"Copied":"Shared"),kind,role:rm?rm[1].trim().slice(0,30):kind==="start"?"Own team":"",label:rm?rm[2].trim().slice(0,50):"",how};
  S.invLog=S.invLog||[];const dup=S.invLog.find(y=>y.to===x.to&&y.label===x.label&&y.kind===x.kind&&x.t-y.t<120000);if(dup)return;
  S.invLog.unshift(x);S.invLog=S.invLog.slice(0,200);rawSave()},true);
function accData(){const R=[],out=[],links=[];const Ls=S.logins||[];const seen=S.seen||{};
  for(const m of S.roster){if(S.source==="sample")break;const lg=Ls.filter(L=>L.dest==="me:"+m.id);const sn=seen[m.id];const acked=(S.feeds||[]).some(f=>f.lk&&Object.values(f.acks||{}).some(A=>A&&A[m.id]));
    if(m.pk||lg.length||sn||acked)R.push({m,page:!!m.pk,logins:lg,seen:sn,acked})}
  for(const L of Ls)if(!L.dest.startsWith("me:"))out.push({k:"login",n:L.label,role:L.role||lgRoleOf(L.dest),sub:"Login · "+L.user+" · made "+ago(L.at)+(L.gone?" · page gone":""),t:L.at});
  for(const [k,v] of Object.entries(seen))if(k.startsWith("n:"))out.push({k:"seen",n:v.who,role:"Checked in",sub:"Not on your roster · last check-in "+ago(v.t),t:v.t});
  for(const x of S.invLog||[])out.push({k:"inv",n:x.to,role:x.kind==="start"?"Own team":x.role||"Invited",sub:(x.kind==="start"?"Sent the app to start their own team (not connected to you)":"Invited"+(x.label?" · "+x.label:""))+" · "+ago(x.t),t:x.t,own:x.kind==="start"});
  let un=0;for(const f of S.feeds||[])if(f.lk)un=Math.max(un,...Object.values(f.un||{}).map(Number),0);
  const B=S.board;if(B)for(const [k] of SECTIONS){const last=B.last&&B.last[k];const keyed=B.sk&&B.sk[k];if(keyed||last)links.push({n:k+" section leader link",sub:last?"Last update "+ago(last.t):"Not opened yet",go:"live"})}
  if(S.sync&&S.sync.on)links.push({n:"Access links (view, edit, same as you)",sub:"Anyone with one of these links sees your whole board",go:"data"});
  if(S.coBoard)links.push({n:"Company links",sub:(S.coBoard.name||"Company")+" · CO, 1stSgt, XO and platoon reporting",go:"co"});
  for(const f of S.feeds||[])if(f.lk)links.push({n:"Feed · "+(f.unit||unitName()),sub:"Anyone with the Feed link reads it and taps Got it",go:"feed"});
  return {R,out:out.sort((a,b)=>b.t-a.t),links,un}}
function renderAccess(){let h=`<div class="sechead" style="margin-top:12px"><h2>People with access</h2></div>`;
  if(!isOwner()||!leaderHere()){$("#main").innerHTML=h+`<div class="panel"><p class="note">Only the phone that runs the team sees who has access.</p></div>`;return}
  const {R,out,links,un}=accData();
  h+=`<div class="tgrid"><div class="cdt"><div class="k">ON ROSTER</div><div class="v">${R.length}</div></div><div class="cdt"><div class="k">NOT ON ROSTER</div><div class="v">${out.filter(x=>!x.own).length+un}</div></div><div class="cdt"><div class="k">OPEN LINKS</div><div class="v">${links.length}</div></div></div>`;
  h+=`<div class="row2" style="margin-top:8px"><button class="btn" data-go="invite">Invite someone</button><button class="btn alt" data-go="logins">Logins</button></div>`;
  h+=`<div class="sech"><h2>On your roster · ${R.length}</h2></div>`+(R.length?`<div class="alist">${R.map(({m,page,logins,seen,acked})=>`<div class="rrow" style="--sc:var(${SVAR[m.status]||"--line"})"><div class="who"><b><span data-pcard="${esc(m.id)}" style="cursor:pointer;text-decoration:underline;text-decoration-color:var(--line)">${esc(m.rank+" "+m.name)}</span></b> <span class="chip">${esc(m.sec)}</span>
      <div class="ph">${[page?"My page link":"",...logins.map(L=>"Login "+L.user),acked?"In the Feed":""].filter(Boolean).map(esc).join(" · ")}</div>${seen?`<div class="ph">${seen.how&&seen.how!=="check-in"?"On the app · "+esc(seen.how)+" · "+ago(seen.t):"Last check-in "+ago(seen.t)}</div>`:""}</div></div>`).join("")}</div>`:`<div class="panel"><p class="note">No one on your roster has a link or login yet. Send My page links from Invite.</p></div>`);
  h+=`<div class="sech"><h2>Not on your roster · ${out.length+(un?1:0)}</h2></div>`;
  if(out.length||un)h+=`<div class="alist">${out.map(x=>`<div class="rrow" style="--sc:var(${x.own?"--line":"--brass"})"><div class="who"><b>${esc(x.n)}</b> <span class="chip">${esc(x.role)}</span><div class="ph">${esc(x.sub)}</div></div></div>`).join("")}${un?`<div class="rrow" style="--sc:var(--brass)"><div class="who"><b>${un} in the Feed</b> <span class="chip">Feed</span><div class="ph">Tapped Got it but didn't match a name on your roster. Their names are scrambled before they leave their phone.</div></div></div>`:""}</div>`;
  else h+=`<div class="panel"><p class="note">No one yet. Logins, invites and check-ins from people who aren't on your roster show up here.</p></div>`;
  h+=`<div class="sech"><h2>Open links · ${links.length}</h2></div>`+(links.length?`<div class="alist">${links.map(x=>`<div class="rrow" style="--sc:var(--line)"><div class="rtop"><div class="who"><b>${esc(x.n)}</b><div class="ph">${esc(x.sub)}</div></div><button class="chip" data-go="${esc(x.go)}" style="cursor:pointer">Manage</button></div></div>`).join("")}</div>`:`<div class="panel"><p class="note">No shared links yet.</p></div>`);
  h+=`<p class="note">To cut someone off: remove their login (Logins), turn off their My page (their card), or make new section or access links (Manage). Invites to start their own team never connect to you.</p>`;
  $("#main").innerHTML=h}

/* =============== 6. HELP & SUPPORT (AI customer service) =============== */
let sup={busy:false,err:""};
const SUP_EX=["How do I invite someone who isn't on my roster?","How do check-ins work?","How do I give someone a login?","How do I cancel or restore Pro?","Why isn't my leader seeing my updates?"];
function supLocal(q){const w=String(q).toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>3);let best=null,bs=0;
  for(const [k,v] of Object.entries(typeof HELP==="object"?HELP:{})){const txt=(v[0]+" "+v[1]+" "+(v[2]||[]).join(" ")).toLowerCase();const s=w.filter(x=>txt.includes(x)).length;if(s>bs){bs=s;best=v}}
  return best&&bs?"**"+best[0]+"**: "+best[1]+"\n"+(best[2]||[]).map(x=>"• "+x).join("\n"):""}
function supMail(){const last=(S.sup||[])[0];const body="What happened:\n\n\nApp: Accounted For "+(typeof APP_VER!=="undefined"?APP_VER:"")+" · "+(window.MBN&&MBN.on?"iPhone app":"web")+(last?"\n\nI asked the help chat: "+last.q:"");
  return "mailto:"+SUPPORT_EMAIL+"?subject="+encodeURIComponent("Accounted For support")+"&body="+encodeURIComponent(body)}
function fmtA(t){return esc(t).replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>").replace(/\n/g,"<br>")}
function renderSupport(){const H=S.sup||[];let h=`<div class="sechead" style="margin-top:12px"><h2>Help & support</h2></div>
  <div class="panel"><p class="note" style="margin:0">Ask anything about using Accounted For. An AI answers right away; it can be wrong, so check anything important. For billing, account or bug problems, a person reads every email.</p>
    <div class="row2"><a class="btn alt" href="${esc(supMail())}">Email a person</a><a class="btn alt" href="help.html">Help guide</a></div></div>`;
  h+=`<div class="panel" data-noxl><label for="supQ">Your question</label><textarea id="supQ" rows="3" maxlength="800" placeholder="How do I…" style="width:100%;padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);font:inherit"></textarea>
    <button class="btn" id="supGo"${sup.busy?" disabled":""}>${sup.busy?"Thinking…":"Ask"}</button><div class="note" role="status">${esc(sup.err)}</div>
    ${H.length?"":`<div class="evts">${SUP_EX.map(q=>`<button data-supex="${esc(q)}">${esc(q)}</button>`).join("")}</div>`}</div>`;
  h+=H.map((x,i)=>`<div class="card" style="gap:6px"><div class="note" style="margin:0;font-weight:800">You · ${ago(x.t)}</div><div>${esc(x.q)}</div><div class="note" style="margin:6px 0 0;font-weight:800">${x.local?"Help guide":"Support"}</div><div style="line-height:1.5">${fmtA(x.a)}</div>
    ${x.local?"":`<div class="row2"><button class="chip" data-supok="${i}" style="cursor:pointer"${x.fb?" disabled":""}>${x.fb==="y"?"✓ Thanks!":"👍 That helped"}</button><a class="chip" href="${esc(supMail())}">Still stuck? Email a person</a></div>`}</div>`).join("");
  if(H.length)h+=`<button class="btn alt" id="supClear" style="width:100%;margin-top:10px">${armed==="supclr"?"Tap again to clear":"Clear chat"}</button>`;
  $("#main").innerHTML=h}
async function supAsk(q){q=String(q||"").trim();if(q.length<3){sup.err="Type a question.";return renderSupport()}
  sup.busy=true;sup.err="";renderSupport();const hist=(S.sup||[]).filter(x=>!x.local).slice(0,3).reverse().map(x=>({q:x.q,a:x.a}));
  let a="",local=false;
  try{const r=await fetch(SB.url+"/functions/v1/"+(SB.afn||"ask"),{method:"POST",headers:{apikey:SB.key,"Content-Type":"application/json"},body:JSON.stringify({support:1,q,dev:(S.dev=S.dev||rndId(24)),mode:MODES[S.mode]?S.mode:"military",hist,leader:leaderHere(),member:!!S.me})});
    const o=await r.json().catch(()=>({}));if(r.ok&&o&&o.answer)a=String(o.answer).slice(0,4000);else if(o&&o.error&&!o.pro&&r.status===429)sup.err=String(o.error)}
  catch(e){}
  if(!a){a=supLocal(q);local=true;if(!a)a="I couldn't reach support right now. Tap Email a person and we'll get back to you."}
  S.sup=[{q:q.slice(0,800),a,t:Date.now(),local}].concat(S.sup||[]).slice(0,20);sup.busy=false;save();renderSupport();const box=$("#supQ");if(box)box.value=""}
document.addEventListener("click",e=>{const t=e.target;
  if(t.id==="supGo"){supAsk(($("#supQ")||{}).value);return}
  const ex=t.closest("[data-supex]");if(ex){supAsk(ex.dataset.supex);return}
  const fb=t.closest("[data-supok]");if(fb){const x=(S.sup||[])[+fb.dataset.supok];if(x){x.fb="y";rawSave();renderSupport()}return}
  if(t.id==="supClear"){if(armed==="supclr"){S.sup=[];armed=null;save()}else armed="supclr";renderSupport()}});

/* "See an example My page": opens the leader's preview of a real person's page */
const pvBtn=()=>`<button class="btn alt" data-go="mepv" data-pvpick="1" style="width:100%">👁 See an example My page</button>`;
window.addEventListener("click",e=>{if(e.target.closest&&e.target.closest("[data-pvpick]")&&window.setPv){const sel=document.getElementById("invDest");const v=sel&&/^me:/.test(sel.value)?sel.value.slice(3):"";
  const m=S.roster.find(x=>x.id===v)||S.roster.find(x=>x.id===window.getPv())||S.roster.find(x=>x.sec!=="ATT")||S.roster[0];if(m)window.setPv(m.id)}},true);
window.invPvBtn=pvBtn;
/* =============== hook into the app =============== */
const VIEWS={access:renderAccess,checkins:renderCk,support:renderSupport};
{const _render=render;render=function(){const f=VIEWS[view];if(f){renderTabs();f();if(view!=="support"&&leaderHere())$("#main").insertAdjacentHTML("beforeend",`<div style="margin-top:14px">${pvBtn()}</div>`);if(typeof animateView==="function")animateView();return}
  return _render.apply(this,arguments)}}
{const _rt=renderTools;renderTools=function(){_rt.apply(this,arguments);const g=document.querySelector("#main .tgrid");if(!g)return;const n=ckOpen().length;
  g.insertAdjacentHTML("beforeend",`<button data-go="checkins"${n?' class="hot"':""}><span class="ic">${svg("checkin")}</span><span><b>Check-ins</b><small>${n?n+" to confirm":"From My page and the Feed"}</small></span></button>
    <button data-go="access"><span class="ic">${svg("access")}</span><span><b>People with access</b><small>On your roster or not</small></span></button>
    <button data-go="support"><span class="ic">${svg("support")}</span><span><b>Help & support</b><small>Ask, or email a person</small></span></button>`)}}
if(typeof HELP==="object"){
  HELP.access=["People with access","Everyone who can open your team, whether they're on your roster or not.",["On your roster: people with a My page link, a login, or who tapped Got it in the Feed.","Not on your roster: logins for section leaders, viewers and editors, invites you sent to any number or email, and people who checked in without a roster match.","Open links: section leader, access, company and Feed links. Tap Manage to cut them off."]];
  HELP.checkins=["Check-ins","People check in from their phone. You confirm, and the roster updates.",["They pick a status or Other (and write it in). Anything but On Hand asks From, To and Location.","Confirm puts it on their roster line. Not right sends your note back to their My page.","Turn on auto-confirm to skip this for people on your roster."]];
  HELP.support=["Help & support","Answers about the app, any time.",["Type a question; the answer comes from AI and can be wrong.","Email a person for billing, account or bug problems."]];
  HELP.act=HELP.act||["Activity","Everything that happens on your team.",[]];HELP.act[2]=(HELP.act[2]||[]).concat("Tap ✓ Confirm on an item once you've seen it, or Confirm all.")}
})();
