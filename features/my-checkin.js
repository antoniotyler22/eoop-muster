/* Accounted For: everyone checks in, not just members.
   A "My check-in" card at the top of Home for every phone that isn't a member's My page: the OIC, co-leaders,
   editors, section leaders and view-only phones. Same choices as a member: status (SIQ and Other included),
   From/To and Location for anything but On Hand, and a note.
   - Phones that can edit (OIC, co-leader, editor, section leader): the check-in goes straight onto their own row on
     the roster, so it shows on the board, syncs and rolls up like any other status change.
   - View-only phones: it goes to the leader as a check-in to Confirm (through the team Feed), like a member's.
   First time, the phone asks "Which one is you?" (pick from the roster) and remembers it (S.who). */
(()=>{
let c={open:false,st:"",v:{}};
const real=()=>S.source!=="sample"&&Array.isArray(S.roster)&&S.roster.length>0;
const viewOnly=()=>typeof role==="function"&&role()==="view";
const isMemberPhone=()=>!!(S.me&&S.me.d)&&!S.board&&!S.link&&!(S.sync&&S.sync.on)&&!S.feeds.some(f=>f.lk);
const memberFeed=()=>(S.feeds||[]).find(f=>!f.lk&&f.mk&&f.ek)||null;
const me=()=>{const w=S.who&&S.who.id;if(!w)return null;return S.roster.find(m=>m.id===w||m.uid===w)||null};
const pool=()=>{const L=S.link;return sorted(L&&L.mysec&&!L.whole?S.roster.filter(m=>m.sec===L.mysec):S.roster)};
const inp="width:100%;padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)";
const show=()=>real()&&!isMemberPhone()&&(!viewOnly()||!!memberFeed());
function cardHTML(){const m=me();
  let h=`<div class="card" id="myCk" style="gap:8px;margin-top:10px"><div style="display:flex;justify-content:space-between;align-items:baseline"><span class="lbl">MY CHECK-IN</span>${m&&m.ckAt?`<span class="chip">Last ${esc(ago(m.ckAt))}</span>`:""}</div>`;
  if(!m){h+=`<label for="myWho">Which one is you?</label><select id="myWho" class="wsel"><option value="">Pick your name…</option>${pool().map(x=>`<option value="${esc(x.id)}">${esc(x.rank+" "+x.name)}${S.link&&S.link.whole||!S.link?" · "+esc(x.sec):""}</option>`).join("")}</select>
      <p class="note" style="margin:0">Not on the list? Add yourself in your section first.</p></div>`;return h}
  const cur=`<span class="dot" style="background:var(${SVAR[m.status]||"--line"})"></span> <b>${esc(SHORT[m.status]||m.status)}</b>${m.end?" thru "+esc(fmtD(isoOf(m.end)||m.end)):""}${m.loc?" · 📍 "+esc(m.loc):""}`;
  h+=`<div class="note" style="margin:0">${esc(m.rank+" "+m.name)} · ${cur}</div>`;
  /* 4.53: the choices and the slider show right away, with your current status picked */
  if(!c.open){const st=STATUSES.includes(m.status)?m.status:"On Hand";const io=x=>x?(typeof isoOf==="function"&&isoOf(x))||String(x):"";
    c={open:true,st,v:st==="On Hand"?{}:{from:io(m.start),to:io(m.end),loc:m.loc||"",note:m.detail||""},auto:1}}
  const v=c.v;
  h+=`<div class="evts" role="radiogroup" aria-label="Your status">${STATUSES.map(s=>`<button type="button" data-myst="${esc(s)}" aria-pressed="${c.st===s}" role="radio" aria-checked="${c.st===s}">${s==="Other"?"✎ Other":`<span class="dot" style="background:var(${SVAR[s]})"></span>${esc(SHORT[s]||s)}`}</button>`).join("")}</div>`;
  if(c.st==="Other")h+=`<label for="myO">What's going on?</label><input type="text" id="myO" maxlength="80" value="${esc(v.oth||"")}" placeholder="Write it in">`;
  if(c.st&&c.st!=="On Hand")h+=`<div class="row2"><div><label for="myF">From</label><input type="date" id="myF" value="${esc(v.from||dkey())}" style="${inp}"></div><div><label for="myT">To</label><input type="date" id="myT" value="${esc(v.to||"")}" style="${inp}"></div></div>
    <label for="myL">Location</label><input type="text" id="myL" maxlength="60" value="${esc(v.loc||"")}" placeholder="Where you are: base, city, clinic">`;
  if(c.st)h+=`<label for="myN">Note (optional)</label><input type="text" id="myN" maxlength="80" value="${esc(v.note||"")}" placeholder="Anything the team should know">`;
  return h+`<div class="row2"><button class="btn" id="myCkSend"${c.st?"":" disabled"}>Check in</button>${c.auto?"":`<button class="btn alt" id="myCkX">Cancel</button>`}</div>${viewOnly()?`<p class="note" style="margin:0">Goes to your leader to confirm.</p>`:""}<button class="chip" id="myCkWho" style="cursor:pointer;align-self:flex-start">Not you? Change</button></div>`}
function grab(){for(const [k,id] of [["from","myF"],["to","myT"],["loc","myL"],["oth","myO"],["note","myN"]]){const el=document.getElementById(id);if(el)c.v[k]=el.value}}
function redraw(){const el=document.getElementById("myCk");if(el)el.outerHTML=cardHTML()}
function place(){if(!show())return;const main=$("#main");if(!main||$("#myCk"))return;
  const after=main.querySelector(".greet,.hero,.sech");if(after&&after.parentElement===main)after.insertAdjacentHTML(after.classList.contains("sech")?"beforebegin":"afterend",cardHTML());else main.insertAdjacentHTML("afterbegin",cardHTML())}
{const _rb=renderBoard;renderBoard=function(){const r=_rb.apply(this,arguments);try{place()}catch(e){}return r}}
async function send(){grab();const m=me();if(!m)return;const st=c.st,v=c.v;
  if(st==="Other"&&!String(v.oth||"").trim()){toast("Write what's going on.");return}
  if(st!=="On Hand"){if(!v.from){toast("Pick the From date.");return}if(v.to&&v.to<v.from){toast("To can't be before From.");return}}
  const x={st,oth:st==="Other"?String(v.oth||"").trim().slice(0,80):"",from:st==="On Hand"?"":String(v.from||"").slice(0,10),to:st==="On Hand"?"":String(v.to||"").slice(0,10),loc:st==="On Hand"?"":String(v.loc||"").trim().slice(0,60),note:String(v.note||"").trim().slice(0,80)};
  if(viewOnly()){const f=memberFeed();if(!f){toast("No team Feed on this phone to send it through.");return}
    const o={k:"ck",cid:"c"+Date.now().toString(36)+rndId(4),me:m.rank+" "+lastOf(m),mid:m.uid||m.id,sec:m.sec||"",st,oth:x.oth,from:x.from,to:x.to,loc:x.loc,note:x.note,at:Date.now()};
    try{const ct=await fdEnc(f.ek,o);const meta={alert:{alert:"ck",feed:f.id,mk:f.mk}};const r=await SB.rpc("feed_req",{p_feed:f.id,p_member_key:f.mk,p_ct:ct},meta);if(r!==null)try{SB.notify(null,meta.alert)}catch(e){}
      m.ckAt=Date.now();c={open:false,st:"",v:{}};rawSave();redraw();toast("📍 Sent. Your leader confirms it.")}catch(e){toast("Couldn't send. Check signal and try again.")}return}
  if(st!==m.status){delete m.start;delete m.end;delete m.loc;delete m.detail}
  m.status=st;delete m.noAuto;
  if(st==="On Hand"){delete m.start;delete m.end;delete m.loc;delete m.detail}
  else{if(x.from)m.start=x.from;if(x.to)m.end=x.to;else delete m.end;if(x.loc)m.loc=x.loc;else delete m.loc;const det=[x.oth,x.note].filter(Boolean).join(" · ");if(det)m.detail=det.slice(0,80);else delete m.detail}
  m.ckAt=Date.now();S.secAt=S.secAt||{};S.secAt[m.sec]=m.ckAt;
  try{actAdd("📍",m.rank+" "+lastOf(m)+" checked in: "+(SHORT[st]||st)+(x.to?" thru "+x.to:"")+(x.loc?" · "+x.loc:""),"board")}catch(e){}
  c={open:false,st:"",v:{}};save();try{if(S.board&&typeof rpPublish==="function")rpPublish(true)}catch(e){}
  const y=window.scrollY;render();window.scrollTo(0,y);toast("📍 Checked in: "+(SHORT[st]||st))}
document.addEventListener("click",e=>{const t=e.target;if(!t.closest||!t.closest("#myCk"))return;
  if(t.closest("#myCkOpen")){const m=me();c={open:true,st:"",v:{}};redraw();return}
  if(t.closest("#myCkX")){c={open:false,st:"",v:{}};redraw();return}
  if(t.closest("#myCkWho")){S.who=null;rawSave();redraw();return}
  const s=t.closest("[data-myst]");if(s){grab();c.st=s.dataset.myst;redraw();try{buzz()}catch(e2){}return}
  if(t.closest("#myCkSend")){send();return}},true);
document.addEventListener("change",e=>{if(e.target.id!=="myWho"||!e.target.value)return;const m=S.roster.find(x=>x.id===e.target.value);if(!m)return;
  S.who=Object.assign({},S.who||{},{id:m.id,n:m.rank+" "+lastOf(m),t:Date.now()});S.myName=S.myName||m.rank+" "+lastOf(m);rawSave();redraw()});
window.myCkShow=show;
})();

/* Needs attention: a quiet section isn't a problem to fix. Its tile already says when it last updated, so the
   "hasn't sent an update in 24 hr" line no longer sits on Home. */
{const _hi=healthIssues;healthIssues=function(){return _hi.apply(this,arguments).filter(x=>!/hasn't sent an update in/.test(String(x&&x.t||"")))}}
