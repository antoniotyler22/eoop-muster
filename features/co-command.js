/* Accounted For 4.9.0: Company command.
   - Separate access for the Company Commander, XO and 1stSgt (link or login each). They land on the company dashboard.
   - Command can mark a question on a platoon or a person. Every command seat (CO, XO, 1stSgt) sees it and can resolve it.
   - Command can send an ask to one platoon or all of them, for the platoon's officers and/or SNCOs. The platoon answers on
     its own Company screen; command sees each platoon's answer.
   Server: setup part 25 (put_cmd lets command phones write their own notes row; get_cmd lets reporting phones read them).
   Everything stays encrypted with the company key; the server can't read it. */
(()=>{
const SEATS={co:"CO",xo:"XO","1sg":"1stSgt",staff:"Staff"};
const SEAT_L={co:"Company Commander",xo:"XO",["1sg"]:"1stSgt"};
const NOFN=/could not find the function|schema cache|PGRST202/i;
const isCmd=k=>/^cmd/.test(String(k||""));
const seatN=s=>SEATS[s]||"Command";
const redraw=fn=>{const y=window.scrollY;fn();window.scrollTo(0,y)};
let cq=null,ca=null,cmdBusy=false,ansDraft={};
if(typeof SYNC_SKIP==="object")SYNC_SKIP.push("cmdMe","coAsks");

/* ---------- this phone's command seat and notes (never synced to other phones) ---------- */
function me(){const C=S.coBoard;if(!C)return null;S.cmdMe=S.cmdMe&&S.cmdMe.co===C.id?S.cmdMe:{co:C.id,id:"cmd"+rndId(12),seat:"",qs:[],res:[],asks:[]};return S.cmdMe}
const canCmd=()=>!!(S.coBoard&&S.coBoard.rk);
function myBody(){const M=me();return {v:1,kind:"cmd",seat:M.seat,qs:M.qs.slice(-60),res:M.res.slice(-200),asks:M.asks.slice(-40),t:Date.now()}}
async function cmdPush(){const C=S.coBoard,M=me();if(!C||!M||!C.rk)return;
  try{await SB.rpc("put_cmd",{p_company:C.id,p_read_key:C.rk,p_unit:M.id,p_ct:await fdEnc(C.ek,myBody())});C.cmdErr="";rawSave()}
  catch(e){const t=String(e&&e.message||e);C.cmdErr=NOFN.test(t)?"Questions and asks need server setup part 25 (DATA → System check).":/link not valid/.test(t)?"This company link no longer works. Ask for a new one.":t.slice(0,80);rawSave()}
  if(view==="co")redraw(renderCo)}
function rows(){const C=S.coBoard,M=me();const out=[{unit:M.id,o:myBody(),mine:true}];
  for(const [k,v] of Object.entries(C.cmd||{}))if(k!==M.id&&v&&v.o)out.push({unit:k,o:v.o});return out}
function allQs(){const R=rows();const res=new Set(R.flatMap(r=>r.o.res||[]));
  return R.flatMap(r=>(r.o.qs||[]).map(q=>Object.assign({},q,{seat:r.o.seat,mine:!!r.mine,done:res.has(q.id)}))).sort((a,b)=>b.t-a.t)}
function allAsks(){return rows().flatMap(r=>(r.o.asks||[]).map(a=>Object.assign({},a,{seat:r.o.seat,mine:!!r.mine}))).sort((a,b)=>b.t-a.t)}
const units=()=>Object.entries((S.coBoard&&S.coBoard.units)||{}).map(([k,u])=>Object.assign({k},u)).sort((a,b)=>a.name.localeCompare(b.name));
const uName=k=>k==="all"?"All platoons":((S.coBoard.units||{})[k]||{}).name||"A platoon";
const forTxt=f=>(f||["off","snco"]).length===2?"officers & SNCOs":(f||[])[0]==="snco"?"SNCOs":"officers";

/* ---------- links and logins: one each for the CO, XO and 1stSgt ---------- */
{const _cl=coLink;coLink=function(kind){return SEAT_L[kind]?_cl("view")+"&w="+encodeURIComponent(kind):_cl(kind)}}
{const _d=lgDests;lgDests=function(){const D=_d.apply(this,arguments);if(!D.length&&!(S.coBoard&&S.coBoard.rk))return D;
  if(S.coBoard&&S.coBoard.rk&&typeof isOwner==="function"&&isOwner()){const i=D.findIndex(x=>x.id==="co:view");const add=Object.keys(SEAT_L).map(s=>({id:"co:"+s,g:"Company",l:SEAT_L[s]+" · company dashboard",base:s==="1sg"?"firstsgt":s}));
    if(i>=0){D[i].l="Company view (anyone, view only)";D.splice(i,0,...add)}else D.push(...add)}return D}}
{const _r=lgRoles;lgRoles=function(){const RL=_r.apply(this,arguments);const c=RL.find(r=>r.k==="cmd");if(c){c.ds=lgDests().filter(x=>/^co:(co|xo|1sg|view)$/.test(x.id));c.d="Company dashboard for the CO, XO or 1stSgt. They can mark questions and send asks to the platoons."}return RL}}
{const _ro=lgRoleOf;lgRoleOf=function(dest){return /^co:(co|xo|1sg)$/.test(String(dest||""))?"Company command":_ro.apply(this,arguments)}}
{const _h=lgHash;lgHash=async function(id,create){const m=/^co:(co|xo|1sg)$/.exec(String(id||""));if(!m)return _h.apply(this,arguments);
  if(!S.coBoard||!S.coBoard.rk)return null;const u=coLink(m[1]);const j=u.indexOf("#");return j<0?null:u.slice(j+1)}}
/* opening a command link remembers the seat */
{const _j=coJoinPrompt;coJoinPrompt=function(q,kind){const w=q&&q.get&&q.get("w");const r=_j.apply(this,arguments);
  if(kind==="cov"&&S.coBoard&&SEAT_L[w]){const M=me();if(M.seat!==w){M.seat=w;save();cmdPush()}if(view==="co")redraw(renderCo)}return r}}

/* ---------- reading: platoon rows keep their answers; command rows are kept apart ---------- */
coPoll=async function(){const C=S.coBoard;if(!C||coBusy)return;coBusy=true;
  try{const rs=await SB.rpc("get_units",{p_company:C.id,p_read_key:C.rk});const seen=new Set();C.cmd=C.cmd||{};
    for(const r of rs||[]){seen.add(r.unit);const t=Date.parse(r.updated_at)||0;
      if(isCmd(r.unit)){const cur=C.cmd[r.unit];if(cur&&cur.t===t)continue;const o=await fdDec(C.ek,r.ct);if(o&&o.kind==="cmd")C.cmd[r.unit]={t,o};continue}
      const cur=C.units[r.unit];if(cur&&cur.t===t)continue;const o=await fdDec(C.ek,r.ct);if(!o||!Array.isArray(o.ms))continue;
      C.units[r.unit]={t,name:String(o.name||"Unit").slice(0,30),ms:o.ms.slice(0,600),secs:Array.isArray(o.secs)?o.secs.slice(0,10):[],ans:o.ans&&typeof o.ans==="object"?o.ans:{},seen:o.seen&&typeof o.seen==="object"?o.seen:{}}}
    for(const k of Object.keys(C.units))if(!seen.has(k))delete C.units[k];for(const k of Object.keys(C.cmd))if(!seen.has(k))delete C.cmd[k];
    C.err="";C.at=Date.now();rawSave();
    if(view==="co"){const a=document.activeElement&&document.activeElement.tagName;if(a!=="INPUT"&&a!=="TEXTAREA"&&a!=="SELECT")redraw(renderCo)}}
  catch(e){const t=String(e.message||e);C.err=/link not valid/.test(t)?"This company link no longer works. Ask for a new one.":/could not find|schema/i.test(t)?"Server needs setup part 14a and 14b.":/fetch|network/i.test(t)?"No signal.":t.slice(0,80);rawSave();if(view==="co")renderCo()}
  finally{coBusy=false}};

/* ---------- the command dashboard ---------- */
function seatHTML(){return `<div class="panel" id="cmdSeat" style="border-color:var(--brass)"><b>Who's using this phone?</b><p class="note" style="margin:0">Your questions and asks show your seat.</p>
  <div class="evts">${Object.keys(SEATS).map(s=>`<button type="button" data-cmdseat="${s}">${esc(s==="staff"?"Other staff":SEAT_L[s])}</button>`).join("")}</div></div>`}
function qFormHTML(){const u=(S.coBoard.units||{})[cq.u];const ppl=u?u.ms.filter(m=>m.name).slice().sort((a,b)=>(a.status==="On Hand")-(b.status==="On Hand")):[];
  return `<div class="panel" id="cqForm" style="margin:6px 0;border-color:var(--warn)"><b>Question about ${esc(uName(cq.u))}</b>
    <label for="cqWho">About</label><select id="cqWho" style="width:100%"><option value="">The platoon as a whole</option>${ppl.map(m=>{const v=m.sec+" "+m.rank+" "+m.name+(m.status!=="On Hand"?" ("+(SHORT[m.status]||m.status)+")":"");return `<option value="${esc(v)}"${cq.who===v?" selected":""}>${esc(v)}</option>`}).join("")}</select>
    <label for="cqTxt">Your question</label><textarea id="cqTxt" rows="3" maxlength="300" style="width:100%;box-sizing:border-box" placeholder="Why is ... on leave past the 2nd?">${esc(cq.txt||"")}</textarea>
    <div class="row2"><button type="button" class="btn" id="cqSave">Mark question</button><button type="button" class="btn alt" id="cqCancel">Cancel</button></div>
    <p class="note" style="margin:0">The CO, XO and 1stSgt all see it.</p></div>`}
function aFormHTML(){const U=units();const f=ca.for||["off","snco"];
  return `<div class="panel" id="caForm" style="margin:6px 0;border-color:var(--brass)"><b>New ask</b>
    <label for="caTo">To</label><select id="caTo" style="width:100%"><option value="all"${ca.to==="all"?" selected":""}>All platoons</option>${U.map(u=>`<option value="${esc(u.k)}"${ca.to===u.k?" selected":""}>${esc(u.name)}</option>`).join("")}</select>
    <div class="note" style="margin:8px 0 0">For</div><div class="evts"><button type="button" data-cafor="off" aria-pressed="${f.includes("off")}">Officers</button><button type="button" data-cafor="snco" aria-pressed="${f.includes("snco")}">SNCOs</button></div>
    <label for="caTxt">Ask</label><textarea id="caTxt" rows="3" maxlength="400" style="width:100%;box-sizing:border-box" placeholder="Confirm everyone on leave has a return date by 1600.">${esc(ca.txt||"")}</textarea>
    <div class="row2"><button type="button" class="btn" id="caSend">Send ask</button><button type="button" class="btn alt" id="caCancel">Cancel</button></div>
    <p class="note" style="margin:0">It shows on the platoon's Accounted For board. Their answer comes back here.</p></div>`}
function dashHTML(){const C=S.coBoard,M=me();const Q=allQs(),open=Q.filter(q=>!q.done),A=allAsks();let h="";
  if(C.cmdErr)h+=`<div class="banner" style="border-color:var(--warn)"><span>${esc(C.cmdErr)}</span></div>`;
  if(!M.seat)h+=seatHTML();
  h+=`<div class="sechead"><h2>Questions · ${open.length} open</h2></div><div class="panel" id="cmdQs">`;
  if(cq)h+=qFormHTML();
  if(!open.length&&!cq)h+=`<p class="note" style="margin:0">No open questions. Tap <b>❓ Question</b> on a platoon below to mark one.</p>`;
  h+=open.map(q=>`<div class="rrow" data-cqid="${esc(q.id)}" style="--sc:var(--warn)"><div class="who"><b>❓ ${esc(uName(q.u))}${q.who?" · "+esc(q.who):""}</b><div>${esc(q.txt)}</div><div class="ph">${esc(seatN(q.seat))} · ${esc(ago(q.t))}</div></div>
    <div class="row2"><button type="button" class="btn alt" data-cqres="${esc(q.id)}">Resolved</button><button type="button" class="btn alt" data-cq2a="${esc(q.id)}">Ask the platoon</button></div></div>`).join("");
  const done=Q.filter(q=>q.done);if(done.length)h+=`<details><summary class="note">Resolved (${done.length})</summary>${done.slice(0,30).map(q=>`<div class="ph">✓ ${esc(uName(q.u))}${q.who?" · "+esc(q.who):""}: ${esc(q.txt)} · ${esc(seatN(q.seat))}</div>`).join("")}</details>`;
  h+=`</div><div class="sechead"><h2>Asks to platoons</h2></div><div class="panel" id="cmdAsks">`;
  if(ca)h+=aFormHTML();else h+=`<button type="button" class="btn" id="caNew" style="width:100%">New ask to the platoons</button>`;
  h+=A.slice(0,20).map(a=>{const tgt=a.to==="all"?units():units().filter(u=>u.k===a.to);const nAns=tgt.filter(u=>u.ans&&u.ans[a.id]).length;
    return `<div class="rrow" data-caid="${esc(a.id)}" style="--sc:var(${tgt.length&&nAns===tgt.length?"--s-onhand":"--line"})"><div class="who"><b>📋 ${esc(a.txt)}</b><div class="ph">To ${esc(uName(a.to))} · ${esc(forTxt(a.for))} · from ${esc(seatN(a.seat))} · ${esc(ago(a.t))} · ${nAns}/${tgt.length} answered</div>
      ${tgt.map(u=>{const r=u.ans&&u.ans[a.id];return `<div class="ph">${r?"✓":"·"} <b>${esc(u.name)}</b>: ${r?esc(r.txt)+" · "+esc(ago(r.t)):u.seen&&u.seen[a.id]?"seen, no answer yet":"not seen yet"}</div>`}).join("")}</div>
      ${a.mine?`<button type="button" class="chip" data-cadel="${esc(a.id)}" style="cursor:pointer;width:auto;align-self:flex-start">${armed==="cadel"+a.id?"Tap again to remove":"Remove"}</button>`:""}</div>`}).join("");
  return h+`</div>`}
{const _rc=renderCo;renderCo=function(){_rc.apply(this,arguments);const C=S.coBoard;if(!C||!C.rk)return;const main=$("#main");
  /* view-only phones: a plain dashboard, no platoon/company setup clutter */
  if(!C.own){const w=main.querySelector("[data-wsgo]");const p=w&&w.closest(".panel");if(p)p.remove()}
  const M=me();const head=main.querySelector(".sechead h2");if(head&&M.seat)head.textContent="Company · "+seatN(M.seat);
  const hero=main.querySelector(".card.hero");if(!hero)return;hero.insertAdjacentHTML("afterend",`<div id="cmdDash">${dashHTML()}</div>`);
  const open=allQs().filter(q=>!q.done);
  main.querySelectorAll("[data-coopen]").forEach(b=>{const k=b.dataset.coopen;const n=open.filter(q=>q.u===k).length;
    b.insertAdjacentHTML("afterend",`<div style="display:flex;gap:6px;margin-top:6px"><button type="button" class="chip" data-cqon="${esc(k)}" style="cursor:pointer;width:auto">❓ Question</button>${n?`<span class="chip" style="color:var(--warn)">${n} open</span>`:""}</div>`)});
  /* owner: links for each command seat */
  const cv=main.querySelector('[data-cocopy="view"]');const row=cv&&cv.closest(".rrow");
  if(row){row.querySelector("b").textContent="Company view link (anyone, view only)";
    row.insertAdjacentHTML("beforebegin",Object.keys(SEAT_L).map(s=>`<div class="rrow" style="--sc:var(--brass)"><div class="who"><b>${esc(SEAT_L[s])}</b><div class="ph">Their own company dashboard. They can mark questions and send asks to the platoons.</div></div>
      <div class="row2"><a class="btn alt" href="${esc("sms:?&body="+encodeURIComponent(C.name+" · "+SEAT_L[s]+": open this to see the company dashboard in Accounted For. Keep it private: "+coLink(s)))}">Text link</a><button type="button" class="btn alt" data-cocopy="${s}">Copy</button>${isOwner()?`<button type="button" class="btn alt" data-cmdlg="${s}">Make a login</button>`:""}</div></div>`).join(""))}}}

/* ---------- platoon side: asks from the company ---------- */
const myRole=()=>S.role==="sncoic"?"snco":"off";
async function askPoll(){const R=S.coRep;if(!R||S.source==="sample")return;
  try{const rs=await SB.rpc("get_cmd",{p_company:R.id,p_write_key:R.wk});const out=[];
    for(const r of rs||[]){const o=await fdDec(R.ek,r.ct);if(!o||o.kind!=="cmd")continue;for(const a of o.asks||[])if(a&&(a.to==="all"||a.to===R.uid))out.push(Object.assign({},a,{seat:o.seat}))}
    const before=JSON.stringify(S.coAsks||[]);S.coAsks=out.sort((a,b)=>b.t-a.t).slice(0,40);
    if(JSON.stringify(S.coAsks)!==before){rawSave();if(view==="co")redraw(renderCo);else if(view==="board")redraw(render)}}
  catch(e){}}
every(60000,askPoll,"co-asks");setTimeout(askPoll,2500);
const myAsks=()=>(S.coAsks||[]).filter(a=>!a.for||a.for.includes(myRole())||S.role!=="sncoic");
window.myAsksN=()=>myAsks().length;
const unanswered=()=>myAsks().filter(a=>!(S.coRep&&S.coRep.ans&&S.coRep.ans[a.id]));
function markSeen(){const R=S.coRep;if(!R)return;R.seen=R.seen||{};let ch=false;for(const a of myAsks())if(!R.seen[a.id]){R.seen[a.id]=Date.now();ch=true}if(ch){save();if(typeof coSchedule==="function")coSchedule()}}
function asksHTML(){const R=S.coRep,L=myAsks();if(!L.length)return "";
  return `<h2 id="coAsksH">Asks from ${esc(R.co)} · ${unanswered().length} open</h2><div class="panel" id="coAsks">${L.map(a=>{const r=R.ans&&R.ans[a.id];
    return `<div class="rrow" style="--sc:var(${r?"--s-onhand":"--warn"})"><div class="who"><b>📋 ${esc(a.txt)}</b><div class="ph">From ${esc(seatN(a.seat))} · for ${esc(forTxt(a.for))} · ${esc(ago(a.t))}</div>
      ${r?`<div class="ph">✓ Answered: ${esc(r.txt)} · ${esc(ago(r.t))}</div>`:""}</div>
      ${r?`<button type="button" class="chip" data-coreans="${esc(a.id)}" style="cursor:pointer;width:auto;align-self:flex-start">Change answer</button>`:`<textarea data-coans="${esc(a.id)}" rows="2" maxlength="300" style="width:100%;box-sizing:border-box" placeholder="Your answer">${esc(ansDraft[a.id]||"")}</textarea><button type="button" class="btn" data-cosend="${esc(a.id)}">Send answer</button>`}</div>`}).join("")}</div>`}
{const _rc=renderCo;renderCo=function(){_rc.apply(this,arguments);if(!S.coRep)return;const h=asksHTML();if(!h)return;const main=$("#main");
  const mine=[...main.querySelectorAll("h2")].find(x=>/My unit's report/.test(x.textContent));if(mine)mine.insertAdjacentHTML("beforebegin",h);else main.insertAdjacentHTML("beforeend",h);markSeen()}}
{const _cp=coPayload;coPayload=function(){const b=_cp.apply(this,arguments);const R=S.coRep;if(R&&R.ans&&Object.keys(R.ans).length)b.ans=R.ans;if(R&&R.seen&&Object.keys(R.seen).length)b.seen=R.seen;return b}}
if(typeof renderBoard==="function"){const _rb=renderBoard;renderBoard=function(){const r=_rb.apply(this,arguments);try{const n=S.coRep?unanswered().length:0;
  if(n){const m=$("#main");m.insertAdjacentHTML("afterbegin",`<div class="banner" id="coAskBan" style="border-color:var(--brass)"><span><b>📋 ${n} ask${n===1?"":"s"} from ${esc(S.coRep.co)}</b> for your platoon's officers and SNCOs.</span><button data-go="co">Answer</button></div>`)}}catch(e){}return r}}

/* ---------- taps ---------- */
const uid=()=>Date.now().toString(36)+rndId(4);
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;let b;
  if((b=t.closest("[data-cmdseat]"))){me().seat=b.dataset.cmdseat;save();cmdPush();return}
  if((b=t.closest("[data-cqon]"))){e.stopImmediatePropagation();if(!me().seat){toast("Pick who's using this phone first.");return}cq={u:b.dataset.cqon,who:"",txt:""};redraw(renderCo);const f=$("#cqForm");if(f&&f.scrollIntoView)f.scrollIntoView({block:"center"});return}
  if(t.closest("#cqCancel")){cq=null;return redraw(renderCo)}
  if(t.closest("#cqSave")){const txt=(($("#cqTxt")||{}).value||"").trim().slice(0,300);if(!txt){toast("Type the question.");return}
    me().qs.push({id:uid(),u:cq.u,who:(($("#cqWho")||{}).value||"").slice(0,80),txt,t:Date.now()});cq=null;save();toast("Question marked");cmdPush();return}
  if((b=t.closest("[data-cqres]"))){const M=me();if(!M.res.includes(b.dataset.cqres))M.res.push(b.dataset.cqres);save();cmdPush();return}
  if((b=t.closest("[data-cq2a]"))){const q=allQs().find(x=>x.id===b.dataset.cq2a);if(!q)return;ca={to:q.u,txt:(q.who?q.who+": ":"")+q.txt,for:["off","snco"]};redraw(renderCo);const f=$("#caForm");if(f&&f.scrollIntoView)f.scrollIntoView({block:"center"});return}
  if(t.closest("#caNew")){if(!me().seat){toast("Pick who's using this phone first.");return}ca={to:"all",txt:"",for:["off","snco"]};return redraw(renderCo)}
  if(t.closest("#caCancel")){ca=null;return redraw(renderCo)}
  if((b=t.closest("[data-cafor]"))){ca.txt=(($("#caTxt")||{}).value||"");ca.to=(($("#caTo")||{}).value||ca.to);const k=b.dataset.cafor;const f=new Set(ca.for);f.has(k)?f.delete(k):f.add(k);if(!f.size){toast("Pick officers, SNCOs or both.");return}ca.for=[...f];return redraw(renderCo)}
  if(t.closest("#caSend")){const txt=(($("#caTxt")||{}).value||"").trim().slice(0,400);if(!txt){toast("Type the ask.");return}
    me().asks.push({id:uid(),to:(($("#caTo")||{}).value||"all"),for:ca.for,txt,t:Date.now()});ca=null;save();toast("Ask sent");cmdPush();return}
  if((b=t.closest("[data-cadel]"))){const id=b.dataset.cadel;if(armed!=="cadel"+id){armed="cadel"+id;return redraw(renderCo)}armed=null;const M=me();M.asks=M.asks.filter(a=>a.id!==id);save();cmdPush();return}
  if((b=t.closest("[data-cmdlg]"))){const s=b.dataset.cmdlg;const d=lgDests().find(x=>x.id==="co:"+s);if(!d)return;lgForm={dest:d.id,user:lgUser(d.base),pw:lgPw(),ed:false};view="logins";render();window.scrollTo(0,0);return}
  if((b=t.closest("[data-cosend]"))){const id=b.dataset.cosend;const R=S.coRep;const box=document.querySelector(`[data-coans="${id}"]`);const txt=((box||{}).value||"").trim().slice(0,300);if(!txt){toast("Type your answer.");return}
    R.ans=R.ans||{};R.ans[id]={t:Date.now(),txt};delete ansDraft[id];save();coPush(true).then(()=>{if(view==="co")redraw(renderCo);toast(R.err?R.err:"Answer sent")});return}
  if((b=t.closest("[data-coreans]"))){const id=b.dataset.coreans;const R=S.coRep;if(R&&R.ans&&R.ans[id]){ansDraft[id]=R.ans[id].txt;delete R.ans[id];save()}return redraw(renderCo)}},true);
document.addEventListener("input",e=>{const t=e.target;if(t.dataset&&t.dataset.coans!=null)ansDraft[t.dataset.coans]=t.value;else if(t.id==="cqTxt"&&cq)cq.txt=t.value;else if(t.id==="caTxt"&&ca)ca.txt=t.value});
document.addEventListener("change",e=>{const t=e.target;if(t.id==="cqWho"&&cq)cq.who=t.value;else if(t.id==="caTo"&&ca)ca.to=t.value});

if(typeof SC==="object"&&Array.isArray(SC))SC.push({k:"cmd",n:"4.9: company questions and asks",f:["25_company_asks"],t:[["get_cmd",{p_company:"zzzzzzzzzz",p_write_key:"x"}]]});
if(typeof HELP==="object"){HELP.co=HELP.co||["Company","Every platoon's numbers in one place, plus questions and asks for command.",[]];if(Array.isArray(HELP.co[2]))HELP.co[2].push("The CO, XO and 1stSgt each get their own link or login to the company dashboard (Company → Links).","❓ Question on a platoon marks a question the CO, XO and 1stSgt all see. Resolved clears it for everyone.","New ask sends a task to one platoon or all of them, for officers, SNCOs or both. It shows on the platoon's board and their answer comes back here.")}
})();
