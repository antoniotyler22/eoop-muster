/* Accounted For 4.11: "Who are you?" on every link, and a log of who changed what.
   Anyone working on someone else's team picks their own name from that team's roster, or adds themselves with the
   same fields as everyone else (rank, name, section, phone). Their role doesn't change: a section leader stays a
   section leader, a view-only phone stays view-only.
   - Section-leader links: pick from the section's roster. A self-add goes to the OIC with the next update and the
     OIC's phone puts them on the roster.
   - Access links (view, can edit, same as me, incoming OIC): pick from the board. A self-add lands on the shared
     board (from a view-only phone it goes to the OIC through the Feed, like a request).
   - Feed links: the OIC's phone shares names only (rank, name, section; setup part 28), encrypted with the Feed key.
     Picking a name or adding yourself goes to the OIC as an encrypted request.
   - My page links already know who the person is, so they're never asked.
   Phones that joined before this (old links keep working) see a banner until they pick.
   Every change made on a phone is logged with that person's name (S.chg) and reaches the OIC: section leaders send
   theirs with their updates, access phones through the shared board. The OIC sees it on the person's card and in
   People with access, and the person shows as "On the app". */
(()=>{
const up=s=>String(s||"").toUpperCase().replace(/[|#<>]/g," ").replace(/\s+/g," ").trim();
const nm=m=>(String(m.rank||"").toUpperCase()+" "+lastOf(m)).trim();
const okRank=r=>RANKS.includes(r)?r:(MODE().rankDef||"LCPL");
const secOk=c=>/^[A-Z0-9]{1,6}$/.test(c||"");
const real=()=>S.source!=="sample";

/* ---------- which team on this phone still needs a name ---------- */
const memberFeed=()=>(S.feeds||[]).find(f=>!f.lk&&f.mk&&!f.hub2&&!f.hub&&!f.mid)||null;
function need(){
  if(S.link&&S.link.rk2&&S.link.pulled&&!S.who)return {k:"link"};
  if(S.sync&&S.sync.on&&S.role&&S.role!=="oic"&&!S.who&&real())return {k:"sync"};
  if(!S.link&&!(S.sync&&S.sync.on)&&!S.board&&!S.me){const f=memberFeed();if(f)return {k:"feed",id:f.id}}
  return null}
window.whoNeed=need;
function teamName(c){if(c.k==="link")return S.link.unit||"your OIC";if(c.k==="feed"){const f=S.feeds.find(x=>x.id===c.id);return (f&&f.unit)||"your leader"}return unitName()}
function whoBanner(){const c=need();if(!c)return"";
  return `<div class="banner" id="whoBan" style="border-color:var(--brass)"><span>👤 <b>Who are you?</b> Pick your name on ${esc(teamName(c))}'s roster. Your changes will show your name and your leader sees you're on the app. Your role stays the same.</span><button id="whoGo">Pick my name</button></div>`}

/* ---------- the list to pick from ---------- */
function pool(c){
  if(c.k==="feed"){const f=S.feeds.find(x=>x.id===c.id);return ((f&&f.names)||[]).map(x=>({id:x.i,rank:x.r,name:x.n,sec:x.s}))}
  if(!real())return[];
  const ms=c.k==="link"&&!S.link.whole?S.roster.filter(m=>m.sec===S.link.mysec):S.roster;
  return ms.map(m=>({id:(c.k==="link"&&m.uid)||m.id,rank:m.rank,name:m.name,sec:m.sec}))}
function secChoices(c){
  if(c.k==="feed"){const f=S.feeds.find(x=>x.id===c.id)||{};const L=(f.secsAll&&f.secsAll.length?f.secsAll:f.secsLink||[]).filter(secOk);const N=[...new Set(((f.names)||[]).map(x=>x.s).filter(secOk))];return [...new Set(L.concat(N))].map(k=>[k,k])}
  if(c.k==="link"&&!S.link.whole)return [[S.link.mysec,S.link.mysec]];
  return SECTIONS.map(x=>[x[0],x[0]+" · "+x[1]])}
function defSec(c){if(c.k==="link")return S.link.whole?SECTIONS[0][0]:S.link.mysec;if(c.k==="feed"){const f=S.feeds.find(x=>x.id===c.id)||{};return f.sec||""}return SECTIONS[0][0]}
let wq="";
function listHTML(c){const q=up(wq);const L=pool(c).filter(m=>!q||up(m.rank+" "+m.name+" "+m.sec).includes(q)).sort((a,b)=>String(a.sec).localeCompare(String(b.sec))||rankIdx(a.rank)-rankIdx(b.rank)||String(a.name).localeCompare(String(b.name)));
  if(!L.length)return `<p class="note">${pool(c).length?"No match. Check the spelling, or add yourself below.":c.k==="feed"?"Your leader's phone hasn't shared the names yet. You can add yourself, or try again later.":"No names yet."}</p>`;
  return L.slice(0,400).map(m=>`<button class="btn alt" data-whoid="${esc(m.id)}" style="width:100%;text-align:left;margin:3px 0"><b>${esc(m.rank)}</b> ${esc(m.name)} <span class="chip">${esc(m.sec)}</span></button>`).join("")}
function whoSheet(c){c=c||need();if(!c)return;wq="";sheetCtx={kind:"who",c};
  $("#sheetT").innerHTML=`Who are you?<small>Pick your name on ${esc(teamName(c))}'s roster. Your changes will show your name, and your leader sees you're on the app. Your role doesn't change.</small>`;
  $("#sheetOpts").innerHTML=`<div class="panel" style="margin:0" data-noxl><input type="search" id="whoQ" placeholder="Search your name" autocomplete="off"><div id="whoList" style="max-height:46vh;overflow:auto;margin:6px 0">${listHTML(c)}</div>
    <button class="btn" id="whoNew">I'm not on the list: add me</button><button class="btn alt" data-sclose="1">Later</button></div>`;
  const sh=$("#sheet");sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add("open")))}
window.whoSheet=whoSheet;
function addForm(c){const secs=secChoices(c);const d=defSec(c);
  $("#sheetT").innerHTML=`Add yourself<small>Same details as everyone on the roster. ${c.k==="link"?"Your OIC's board adds you with your next update.":c.k==="feed"?"Goes to your leader encrypted; their phone adds you.":"You'll be on the shared board."}</small>`;
  $("#sheetOpts").innerHTML=`<div class="panel" style="margin:0" data-noxl>
    <label for="whoRank">Rank</label><select id="whoRank" class="wsel">${RANKS.map(r=>`<option${r===(MODE().rankDef||"LCPL")?" selected":""}>${r}</option>`).join("")}</select>
    <div class="row2"><input type="text" id="whoLast" placeholder="LAST NAME" autocapitalize="characters" style="text-transform:uppercase" autocomplete="family-name"><input type="text" id="whoFirst" placeholder="FIRST NAME" autocapitalize="characters" style="text-transform:uppercase" autocomplete="given-name"></div>
    <label for="whoSec">${S.level==="co"&&c.k!=="feed"?"Platoon":"Section / team"}</label>${secs.length?`<select id="whoSec" class="wsel">${secs.map(([k,l])=>`<option value="${esc(k)}"${k===d?" selected":""}>${esc(l)}</option>`).join("")}${c.k==="link"&&!S.link.whole?"":`<option value="ATT">ATT · Attached</option>`}</select>`:`<input type="text" id="whoSec" maxlength="6" placeholder="1ST" autocapitalize="characters" style="text-transform:uppercase">`}
    <input type="tel" id="whoPh" placeholder="Phone (optional)" inputmode="tel" autocomplete="tel">
    <button class="btn" id="whoAdd">Add me</button><button class="btn alt" id="whoBack">Back to the list</button><div class="note" id="whoOut"></div></div>`}

/* ---------- picking ---------- */
function syncSeen(id,n,how){S.seen=S.seen||{};S.seen[id]={t:Date.now(),who:n,how}}
function roleHow(){return S.link?(S.link.sec+" section leader link"):(S.sync&&S.sync.on?((ROLE_N[role()]||role())+" access link"):"link")}
async function viaFeed(o){const f=mainFeed()||(S.feeds||[]).find(x=>x.mk&&x.ek);if(!f)return false;try{await SB.rpc("feed_req",{p_feed:f.id,p_member_key:f.mk,p_ct:await fdEnc(f.ek,o)});return true}catch(e){return false}}
function hubMe(id,n){for(const f of S.feeds||[])if(!f.lk&&f.hub){f.me=n;f.mid=String(id);fdMeHash(f)}}
async function pick(c,id){
  const m=pool(c).find(x=>String(x.id)===String(id));if(!m)return;const n=nm(m);
  if(c.k==="feed"){const f=S.feeds.find(x=>x.id===c.id);if(!f)return;f.me=n;f.mid=String(m.id);if(secOk(m.sec))f.sec=m.sec;f.whoAt=Date.now();if(!S.myName)S.myName=n;fdMeHash(f);save();
    viaFeed0(f,{k:"who",mid:String(m.id),me:n,t:Date.now()})}
  else{S.who={id:String(m.id),n,t:Date.now()};S.myName=n;hubMe(m.id,n);
    if(c.k==="link"){S.link.me=n;save();linkPush(true)}
    else{if(canEdit()){syncSeen(String(m.id),n,roleHow());save()}else{save();viaFeed({k:"who",mid:String(m.id),me:n,how:roleHow(),t:Date.now()})}}}
  closeSheet();render();toast("Thanks, "+n+". Your changes now show your name.")}
async function viaFeed0(f,o){try{await SB.rpc("feed_req",{p_feed:f.id,p_member_key:f.mk,p_ct:await fdEnc(f.ek,o)})}catch(e){}}
async function addMe(c){const out=$("#whoOut");const say=t=>{if(out)out.textContent=t};
  const last=up($("#whoLast").value).replace(/[^A-Z' .-]/g,"").trim(),first=up($("#whoFirst").value).replace(/[^A-Z' .-]/g,"").trim();
  if(!last||!first){say("Enter your last and first name.");return}
  const rank=okRank(($("#whoRank")||{}).value);let sec=up(($("#whoSec")||{}).value).replace(/[^A-Z0-9]/g,"").slice(0,6);if(!sec)sec=defSec(c)||"";
  const phone=String(($("#whoPh")||{}).value||"").replace(/\D/g,"").slice(-10);const name=(last+", "+first).slice(0,60);const o={rank,name,sec,phone:phone.length===10?phone:""};
  const n=(rank+" "+last).trim();
  const dup=pool(c).find(m=>fullK(m)===fullK(o));if(dup){pick(c,dup.id);return}
  if(c.k==="feed"){const f=S.feeds.find(x=>x.id===c.id);if(!f)return;f.me=n;f.sec=secOk(sec)?sec:f.sec;f.pend=fullK(o);f.whoAt=Date.now();if(!S.myName)S.myName=n;fdMeHash(f);save();
    await viaFeed0(f,Object.assign({k:"join",rid:"j"+Date.now().toString(36)+rndId(4),me:n,t:Date.now()},o))}
  else if(c.k==="link"){const L=S.link;const rec={id:"s"+Date.now().toString(36)+rndId(3),rank,name,sec:L.whole?sec:L.mysec,status:"On Hand",duty:"Full Duty",detail:"Added themselves",loc:"",start:"",end:"",self:1};if(o.phone)rec.phone=o.phone;
    S.roster.push(rec);L.adds=(L.adds||[]).filter(x=>fullK(x)!==fullK(rec)).concat([JSON.parse(JSON.stringify(rec))]).slice(-5);S.who={id:rec.id,n,t:Date.now(),pend:fullK(rec)};S.myName=n;L.me=n;hubMe(rec.id,n);logAdd(rec,n,true);save();linkPush(true)}
  else{if(canEdit()){const rec=addMarine(o,sec);if(!rec){say("You're already on the roster. Pick your name.");return}rec.detail="Added themselves";S.who={id:rec.id,n,t:Date.now()};S.myName=n;hubMe(rec.id,n);syncSeen(rec.id,n,roleHow());logAdd(rec,n,true);save()}
    else{S.who={id:"",n,t:Date.now(),pend:fullK(o)};S.myName=n;save();if(!await viaFeed(Object.assign({k:"join",rid:"j"+Date.now().toString(36)+rndId(4),me:n,how:roleHow(),t:Date.now()},o))){say("Couldn't reach your leader. Try again with signal.");S.who=null;save();return}}}
  closeSheet();render();toast(c.k==="sync"&&canEdit()?"You're on the roster, "+n+".":"Sent. You'll be on the roster when "+teamName(c)+"'s phone picks it up.")}

/* ---------- clicks ---------- */
document.addEventListener("click",e=>{const t=e.target;
  if(t.closest("#whoGo")){e.stopImmediatePropagation();whoSheet();const c=need();if(c&&c.k==="feed")namesGet(S.feeds.find(f=>f.id===c.id),true).then(()=>{const l=$("#whoList");if(l&&sheetCtx&&sheetCtx.kind==="who")l.innerHTML=listHTML(sheetCtx.c)});return}
  if(!sheetCtx||sheetCtx.kind!=="who")return;const c=sheetCtx.c;
  const b=t.closest("[data-whoid]");if(b){e.stopImmediatePropagation();pick(c,b.dataset.whoid);return}
  if(t.closest("#whoNew")){e.stopImmediatePropagation();addForm(c);return}
  if(t.closest("#whoBack")){e.stopImmediatePropagation();whoSheet(c);return}
  if(t.closest("#whoAdd")){e.stopImmediatePropagation();addMe(c);return}},true);
document.addEventListener("input",e=>{if(e.target.id!=="whoQ"||!sheetCtx||sheetCtx.kind!=="who")return;wq=e.target.value;const l=$("#whoList");if(l)l.innerHTML=listHTML(sheetCtx.c)});

/* ---------- banners and the one-time prompt ---------- */
{const _b=banner;banner=function(){return whoBanner()+_b.apply(this,arguments)}}
function place(){const m=$("#main");if(!m||$("#whoBan"))return;const h=whoBanner();if(h)m.insertAdjacentHTML("afterbegin",h)}
{const _rf=renderFeed;renderFeed=function(){const r=_rf.apply(this,arguments);place();return r}}
{const _rt=renderToday;renderToday=function(){const r=_rt.apply(this,arguments);place();return r}}
const ASK="af-who-asked";
function autoAsk(){const c=need();if(!c)return;const sh=$("#sheet");if(sh&&!sh.hidden)return;let k="";try{k=sessionStorage.getItem(ASK)||""}catch(e){}const key=c.k+":"+(c.id||"");if(k===key)return;
  if(c.k==="feed"){const f=S.feeds.find(x=>x.id===c.id);if(!f||!(f.names&&f.names.length))return}
  try{sessionStorage.setItem(ASK,key)}catch(e){}whoSheet(c)}
every(4000,()=>{try{autoAsk()}catch(e){}},"who-ask");

/* ---------- names for Feed links (setup part 28) ---------- */
let nBusy=false;
async function namesPub(force){if(nBusy||!real()||typeof isOwner!=="function"||!isOwner())return;nBusy=true;
  try{const list=S.roster.map(m=>({i:m.id,r:m.rank,n:m.name,s:m.sec}));const sg=sigF(list);
    for(const f of S.feeds||[]){if(!f.lk||!f.ek)continue;if(!force&&f.nsig===sg&&Date.now()-(f.nat||0)<12*3600000)continue;
      try{await SB.rpc("feed_names_put",{p_feed:f.id,p_leader_key:f.lk,p_ct:await fdEnc(f.ek,{v:1,ms:list})});f.nsig=sg;f.nat=Date.now();f.nerr="";rawSave()}
      catch(e){const t=String(e.message||e);f.nerr=/could not find|schema cache|PGRST202|404/i.test(t)?"part 28":t.slice(0,60);rawSave()}}}
  finally{nBusy=false}}
window.whoNamesPub=namesPub;
let pubT=null;
async function namesGet(f,force){if(!f||!f.mk||!f.ek)return;if(!force&&f.nAt&&Date.now()-f.nAt<5*60000)return;
  try{const rows=await SB.rpc("feed_names_get",{p_feed:f.id,p_member_key:f.mk});const r=rows&&rows[0];f.nAt=Date.now();if(!r){rawSave();return}
    const o=await fdDec(f.ek,r.ct);if(!o||!Array.isArray(o.ms))return;
    f.names=o.ms.slice(0,800).map(x=>({i:String(x.i||"").slice(0,40),r:String(x.r||"").toUpperCase().slice(0,8),n:String(x.n||"").toUpperCase().slice(0,60),s:String(x.s||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6)})).filter(x=>x.i&&x.n);
    if(f.pend){const hit=f.names.find(x=>fullK({name:x.n})===f.pend);if(hit){f.mid=hit.i;delete f.pend;fdMeHash(f)}}rawSave()}catch(e){f.nAt=Date.now()}}
every(60000,()=>{namesPub(false);const f=memberFeed()||(S.feeds||[]).find(x=>!x.lk&&x.pend);if(f)namesGet(f,false)},"who-names");

/* ---------- the OIC's phone: people who picked or added themselves ---------- */
const addFrom=(x,sec,by,how)=>whoAddFrom(x,sec,by,how);
/* a section leader's update (applied inside livePollCal by whoCalApply, which the server hub runs too) */
window.whoCalIn=whoCalApply;
/* a Feed link (or a view-only phone): picked their name, or added themselves */
const doneRid=new Set();
window.whoIn=function(f,o,r){const how=String(o.how||"Feed link").slice(0,40);const me=up(o.me).slice(0,40);S.seen=S.seen||{};
  if(o.k==="who"){const m=S.roster.find(x=>x.id===String(o.mid||""));const k=m?m.id:"n:"+me;const was=S.seen[k];S.seen[k]={t:Date.parse(r&&r.created_at)||Date.now(),who:m?nm(m):me,how};
    if(!was||was.how!==how)actAdd("👤",(m?nm(m):me)+" is on the app ("+how+")","people");save();return}
  if(o.k==="join"){const rid=String(o.rid||"");if(rid&&(doneRid.has(rid)||(S.whoRids||[]).includes(rid)))return;doneRid.add(rid);S.whoRids=(S.whoRids||[]).concat(rid).slice(-200);
    const res=addFrom(o,up(o.sec).replace(/[^A-Z0-9]/g,"").slice(0,6),me,how);if(res){S.seen[res.m.id]={t:Date.now(),who:nm(res.m),how}}save();namesPub(true);if(typeof rpPublish==="function")rpPublish(true)}};

/* a section leader's phone: what goes up with each update */
window.whoCalExtra=function(){const L=S.link;if(!L)return {};const x={};
  if(S.who&&S.who.n)x.by={id:S.who.id||"",n:S.who.n,pend:S.who.pend||""};
  if(Array.isArray(L.adds)&&L.adds.length)x.a=L.adds.map(r=>({rank:r.rank,name:r.name,sec:r.sec,phone:r.phone||"",sub:r.sub||""}));
  const since=Date.now()-14*86400000;const c=(S.chg||[]).filter(e=>e.t>since).slice(0,200);if(c.length)x.c=c;return x};
/* after the section's roster arrives: keep a self-add until the OIC has it, then use the OIC's id */
{const _rp=rosterPull;rosterPull=async function(){const r=await _rp.apply(this,arguments);try{const L=S.link;if(!L||!L.pulled)return r;let ch=false;
  for(const a of (L.adds||[]).slice()){const hit=S.roster.find(m=>!m.self&&fullK(m)===fullK(a));
    if(hit){L.adds=L.adds.filter(x=>fullK(x)!==fullK(a));S.roster=S.roster.filter(m=>!(m.self&&fullK(m)===fullK(a)));if(S.who&&S.who.pend===fullK(a)){S.who.id=hit.uid||hit.id;delete S.who.pend;hubMe(S.who.id,S.who.n)}ch=true}
    else if(!S.roster.some(m=>fullK(m)===fullK(a))){S.roster.push(JSON.parse(JSON.stringify(a)));ch=true}}
  if(!L.adds||!L.adds.length)delete L.adds;if(ch){rawSave();if(typeof tabRedraw==="function")try{tabRedraw()}catch(e){}}}catch(e){}return r}}
/* a view-only phone that added itself: take the id once the board has it */
every(20000,()=>{const W=S.who;if(!W||!W.pend||S.link)return;const hit=S.roster.find(m=>fullK(m)===W.pend);if(hit){W.id=hit.id;delete W.pend;hubMe(hit.id,W.n);rawSave()}},"who-pend");

/* ---------- change log: what a person did on this phone, with their name ---------- */
function whoName(){if(S.who&&S.who.n)return S.who.n;if(S.link)return S.myName||((S.link.sec||"")+" leader");const r=typeof role==="function"?role():"oic";return S.myName||(r==="oic"?"OIC":(ROLE_N[r]||r))}
function srcName(){if(S.link)return S.link.sec+" section leader link";if(role()!=="oic")return (ROLE_N[role()]||role())+" access link";return "Owner's phone"}
function logEntry(e){S.chg=S.chg||[];S.chg.unshift(Object.assign({id:rndId(10),t:Date.now(),by:whoName(),bid:(S.who&&S.who.id)||"",src:srcName()},e));trim()}
const trim=chgTrim;
function logAdd(rec,n,self){logEntry({mid:rec.uid||rec.id,who:rec.rank+" "+rec.name,f:"added",b:self?"added themselves":"added"})}
const mergeChg=chgMerge;
window.whoMergeChg=mergeChg;
const F=["rank","name","sec","status","duty","start","end","loc","detail","phone","phone2"];
const LBL={rank:"rank",name:"name",sec:"section",status:"status",duty:"duty",start:"start",end:"end",loc:"location",detail:"detail",phone:"phone",phone2:"alt phone"};
let touchT=0;["click","change","input","submit","keydown"].forEach(t=>document.addEventListener(t,()=>{touchT=Date.now()},true));
let remote=0;
const snap=()=>{const o={};for(const m of S.roster||[]){const v={};for(const k of F)v[k]=k==="duty"?dutyOf(m):String(m[k]==null?"":m[k]);v.cal={};for(const e of m.cal||[])v.cal[e.id||e.d+"|"+e.ti]=e.d+" "+(e.tm?e.tm+" ":"")+e.ti;v.who=m.rank+" "+m.name;v.mid=m.uid||m.id;o[m.id]=v}return o};
let base=null;
function watch(){if(!Array.isArray(S.roster))return;const now=snap();
  if(base&&!remote&&real()&&Date.now()-touchT<2500&&!(typeof canEdit==="function"&&!canEdit()&&!S.link)){const out=[];
    for(const id of Object.keys(base))if(!now[id])out.push({mid:base[id].mid,who:base[id].who,f:"removed"});
    for(const id of Object.keys(now)){const a=base[id],b=now[id];if(!a){if(!(S.chg||[]).some(e=>e.mid===b.mid&&e.f==="added"&&Date.now()-e.t<5000))out.push({mid:b.mid,who:b.who,f:"added"});continue}
      for(const k of F)if(a[k]!==b[k])out.push({mid:b.mid,who:b.who,f:LBL[k],a:a[k],b:b[k]});
      for(const [ck,v] of Object.entries(b.cal))if(!(ck in a.cal))out.push({mid:b.mid,who:b.who,f:"calendar",b:"+ "+v});
      for(const [ck,v] of Object.entries(a.cal))if(!(ck in b.cal))out.push({mid:b.mid,who:b.who,f:"calendar",a:v,b:"removed"})}
    if(out.length>30)logEntry({mid:"",who:"",f:"many",b:out.length+" changes at once"});else out.reverse().forEach(logEntry)}
  base=now}
{const _save=save;save=function(){const r=_save.apply(this,arguments);try{watch()}catch(e){}return r}}
{const _raw=rawSave;rawSave=function(){const r=_raw.apply(this,arguments);try{if(base)base=snap()}catch(e){}return r}}
setTimeout(()=>{try{base=snap()}catch(e){}},0);
/* data arriving from other phones is never logged as a change made here */
for(const fn of ["livePollBoard","livePollCal","rosterPull","syncPull","fdPollAll","mpFetch"]){const f0=window[fn];if(typeof f0!=="function")continue;
  window[fn]=async function(){remote++;try{return await f0.apply(this,arguments)}finally{remote--;try{base=snap()}catch(e){}}}}
/* access phones: both sides' logs and "on the app" survive a sync */
{const _mr=mergeRemote;mergeRemote=function(R){const lc=(S.chg||[]).slice(),ls=Object.assign({},S.seen||{});const r=_mr.apply(this,arguments);
  try{const keep=S.chg;S.chg=[];mergeChg(lc);mergeChg((R&&R.chg)||[]);if(Array.isArray(keep))mergeChg(keep);const rs=(R&&R.seen)||{};S.seen=Object.assign({},S.seen||{});for(const src of [ls,rs])for(const [k,v] of Object.entries(src))if(v&&(!S.seen[k]||(+v.t||0)>(+S.seen[k].t||0)))S.seen[k]=v}catch(e){}return r}}

/* ---------- showing it ---------- */
const fmt=e=>{const w=e.f==="added"?(e.b||"added"):e.f==="removed"?"removed":e.f==="many"?e.b:e.f==="calendar"?(e.b==="removed"?"calendar: removed "+e.a:"calendar: "+e.b.replace(/^\+ /,"added ")):e.f+": "+(e.a||"—")+" → "+(e.b||"—");return w};
function rowHTML(e,showWho){const d=new Date(e.t);return `<div class="rrow" style="--sc:var(--line)"><div class="who"><b>${esc(e.by||"Someone")}</b>${showWho&&e.who?" · "+esc(e.who):""}<div class="ph">${esc(fmt(e))}</div><div class="ph">${esc(e.src||"")} · ${esc(short(d))} ${String(d.getHours()).padStart(2,"0")}${String(d.getMinutes()).padStart(2,"0")}</div></div></div>`}
window.whoChgFor=m=>(S.chg||[]).filter(e=>e.mid&&(e.mid===m.id||e.mid===m.uid));
{const _rp=renderPerson;renderPerson=function(){const r=_rp.apply(this,arguments);try{const m=S.roster.find(x=>x.id===pid);const main=$("#main");if(!m||!main||$("#whoHist"))return r;
  const L=whoChgFor(m).slice(0,25);const sn=(S.seen||{})[m.id];
  main.insertAdjacentHTML("beforeend",`<div class="sech" id="whoHist"><h2>Changes and who made them</h2></div>${sn&&sn.how&&sn.how!=="check-in"?`<p class="note" style="color:var(--s-onhand);font-weight:700">● On the app · ${esc(sn.how)} · ${esc(ago(sn.t))}</p>`:""}${L.length?`<div class="alist">${L.map(e=>rowHTML(e,false)).join("")}</div>`:`<div class="panel"><p class="note">No changes logged yet. From now on every change shows who made it.</p></div>`}`)}catch(e){}return r}}
{const _rd=render;render=function(){const r=_rd.apply(this,arguments);try{const main=$("#main");if(view!=="access"||!main||$("#whoAll")||!isOwner())return r;const L=(S.chg||[]).slice(0,60);
  main.insertAdjacentHTML("beforeend",`<div class="sech" id="whoAll"><h2>Who changed what · ${L.length}</h2></div>${L.length?`<div class="alist">${L.map(e=>rowHTML(e,true)).join("")}</div>`:`<div class="panel"><p class="note">Every change made on your phone, section leaders' phones and access phones shows here with the person's name.</p></div>`}`)}catch(e){}return r}}

/* My page members are known by their link; nobody else on this phone is asked twice */
if(typeof SC==="object"&&Array.isArray(SC))SC.push({k:"who",n:"4.11: Feed links pick their name",f:["28_feed_names"],t:[["feed_names_get",{p_feed:"zz",p_member_key:"x"}]]});
})();
