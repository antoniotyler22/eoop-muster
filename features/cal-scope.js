/* Accounted For 4.128.0: who sees which calendar events. Setup part 55.
   - An event for "Everyone" shows for every section. An event for a section shows only to that section.
   - The owner and full-board phones see everything. A member sees Everyone plus their own section(s); a member in two
     sections sees both; a member the owner gave full calendar access sees everything (person card → Calendar access).
   - Enforced by keys, not by hiding: each scope (Everyone, each section) has its own keys. The owner's phone publishes
     each event sealed with its scope's key; a phone only gets the keys for what it may see (section leaders inside their
     section's roster, members inside their own My page), and the server returns a scope's events only to a phone that
     presents that scope's read key, so asking for another section's events directly gets nothing.
   - Everywhere events show follows the same rule: the calendar, Home, alerts (the "calendar changed" alert only goes
     out for Everyone events, never for a section's), exports, and Feed's "coming up" line.
   - A section leader's new event starts as "their section". */
(()=>{
const own=()=>typeof isOwner==="function"&&isOwner();
const full=()=>own()||(S.sync&&S.sync.on&&["view","sncoic","co","newoic"].includes(S.role));/* full-board phones */
const rk=()=>b64url(crypto.getRandomValues(new Uint8Array(24)));
const rid=()=>[...crypto.getRandomValues(new Uint8Array(20))].map(x=>"abcdefghijklmnopqrstuvwxyz0123456789"[x%36]).join("");
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
const sha=async s=>hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)));
const feedOf=()=>typeof mainFeed==="function"?mainFeed():null;
if(typeof SYNC_SKIP!=="undefined"&&Array.isArray(SYNC_SKIP))for(const k of ["calTeam","calPubSig"])if(!SYNC_SKIP.includes(k))SYNC_SKIP.push(k);
const NAMES=()=>["all"].concat(SECTIONS.map(s=>s[0]));
/* owner: the scopes and their keys (they travel with the board to full-board phones) */
function scopes(){const f=feedOf();if(!f)return null;let K=S.calKeys;if(!K||K.feed!==f.id)K=S.calKeys={feed:f.id,s:{},reg:{}};
  for(const n of NAMES())if(!K.s[n])K.s[n]={id:rid(),ek:b64url(crypto.getRandomValues(new Uint8Array(32))),rk:rk(),wk:rk()};return K}
const pub=(n,x)=>({n,id:x.id,ek:x.ek,rk:x.rk});
/* what a section leader gets: Everyone + their section (and the right to write their section) */
window.calCk=function(sec){const K=S.calKeys;if(!K||!K.s||!K.s.all||!K.s[sec])return undefined;return {feed:K.feed,s:[pub("all",K.s.all),pub(sec,K.s[sec])],w:{n:sec,id:K.s[sec].id,wk:K.s[sec].wk}}};
const secsOf=m=>[m.sec].concat(Array.isArray(m.xsec)?m.xsec:[]).filter((k,i,a)=>k&&a.indexOf(k)===i);
/* what a member gets on their My page: Everyone + their sections, or everything with full calendar access */
function ckFor(m){const K=S.calKeys;if(!K||!K.s||!K.s.all)return undefined;const ns=m.calAll?NAMES():["all"].concat(secsOf(m));return {feed:K.feed,s:ns.filter(n=>K.s[n]).map(n=>pub(n,K.s[n]))}}
window.calCkFor=ckFor;
if(typeof mpDigest==="function"){const _md=mpDigest;mpDigest=function(m){const d=_md.apply(this,arguments);try{const c=ckFor(m);if(c)d.ck=c;
  /* their own calendar on My page also follows the rule: no other section's events (the digest drops the tag, so match by day and title) */
  if(Array.isArray(d.cal)&&!m.calAll){const mine=new Set(secsOf(m));const bad=new Set((m.cal||[]).filter(x=>x.sc&&!mine.has(x.sc)).map(x=>x.d+"|"+x.ti));if(bad.size)d.cal=d.cal.filter(e=>!bad.has(e.d+"|"+e.ti))}}catch(e){}return d}}
/* the team's events, from the owner's data */
function teamEvents(){const out=new Map();const cut=dkey(new Date(Date.now()-60*86400000));
  for(const e of Array.isArray(S.calAll)?S.calAll:[]){if((e.end||e.d)<cut)continue;out.set("a:"+e.g,{n:"all",e:String(e.g||e.id).replace(/[^A-Za-z0-9_-]/g,"").slice(0,40),v:{d:e.d,end:e.end||"",tm:e.tm||"",ty:e.ty||"",ti:e.ti,no:e.no||"",sc:""}})}
  for(const m of S.roster||[])for(const e of m.cal||[]){if(!e.sc||(e.end||e.d)<cut)continue;const k=e.sc+":"+(e.g||e.d+"|"+e.ti);if(out.has(k))continue;
    out.set(k,{n:e.sc,e:String(e.g||("x"+e.d.replace(/-/g,"")+e.ti.length)).replace(/[^A-Za-z0-9_-]/g,"").slice(0,40),v:{d:e.d,end:e.end||"",tm:e.tm||"",ty:e.ty||"",ti:e.ti,no:e.no||"",sc:e.sc}})}
  return [...out.values()]}
let pubBusy=false;
async function publish(force){const f=feedOf();if(pubBusy||!own()||!f||!f.lk||S.source==="sample")return;const K=scopes();if(!K)return;
  const evs=teamEvents();const sg=sigF([K.feed,Object.keys(K.s).sort(),evs]);if(!force&&S.calPubSig===sg)return;pubBusy=true;
  try{for(const [n,x] of Object.entries(K.s))if(!K.reg[x.id]){await SB.rpc("cal_scope_put",{p_feed:f.id,p_leader_key:f.lk,p_scope:x.id,p_rk_hash:await sha(x.rk),p_wk_hash:await sha(x.wk)});K.reg[x.id]=1}
    for(const [n,x] of Object.entries(K.s)){const rows=[];for(const ev of evs.filter(v=>v.n===n))rows.push({e:ev.e,ct:await fdEnc(x.ek,ev.v)});
      await SB.rpc("cal_put",{p_feed:f.id,p_scope:x.id,p_wk:x.wk,p_rows:rows})}
    S.calPubSig=sg;S.calErr="";save()}
  catch(e){S.calErr=/could not find|schema cache|PGRST202|404/i.test(String(e.message||e))?"part 55":String(e.message||e).slice(0,60);rawSave()}finally{pubBusy=false}}
window.calScopePublish=publish;
every(60000,()=>{try{publish(false)}catch(e){}},"cal-scopes");setTimeout(()=>{try{publish(false)}catch(e){}},5000);

/* a reader (section leader or member): the keys it holds, and the events they open */
function held(){if(S.link&&S.link.ck)return S.link.ck;if(S.me&&S.me.d&&S.me.d.ck)return S.me.d.ck;return null}
let readBusy=false;
async function pull(){const ck=held();if(readBusy||!ck||!Array.isArray(ck.s)||!ck.s.length)return false;readBusy=true;
  try{const rows=await SB.rpc("cal_get",{p_feed:ck.feed,p_keys:ck.s.map(x=>({s:x.id,k:x.rk}))})||[];const by=new Map(ck.s.map(x=>[x.id,x]));const out=[];
    for(const r of rows){const x=by.get(r.scope);if(!x)continue;const v=await fdDec(x.ek,r.ct);if(!v||!v.d)continue;out.push(Object.assign({},v,{sc:x.n==="all"?"":x.n,eid:r.eid}))}
    out.sort((a,b)=>(a.d+(a.tm||"")).localeCompare(b.d+(b.tm||"")));const ch=sigF(out)!==sigF(S.calTeam||[]);S.calTeam=out;if(ch)rawSave();return ch}
  catch(e){return false}finally{readBusy=false}}
window.calScopePull=pull;
every(120000,()=>{if(!document.hidden&&held())pull().then(c=>{if(c&&["cal","mecal","today","board","feed"].includes(view))try{render()}catch(e){}})},"cal-team");setTimeout(()=>{if(held())pull()},3500);

/* what this phone may see, for every screen that shows events */
function visible(){if(full()&&!S.link){const cut=dkey(new Date(Date.now()-60*86400000));return teamEvents().map(x=>Object.assign({},x.v)).filter(v=>(v.end||v.d)>=cut)}return (S.calTeam||[]).slice()}
window.calVisible=visible;
const label=e=>e.sc?e.sc:"Everyone";
const when=e=>{const d=parseD(e.d);return (d?DOW[d.getDay()]+" "+short(d):e.d)+(e.end&&e.end!==e.d?" – "+short(parseD(e.end)):"")+(e.tm?" "+e.tm.replace(":",""):"")};
function upcoming(n){const t=dkey();return visible().filter(e=>(e.end||e.d)>=t).slice(0,n||6)}
function panel(title,id,n){const L=upcoming(n);if(!L.length)return "";
  return `<div class="panel" id="${id}"><b>${esc(title)}</b>${L.map(e=>`<div class="rrow" style="--sc:var(--line)"><div class="who"><b>${esc(e.ti)}</b><div class="ph">${esc(when(e))} · ${esc(label(e))}${e.no?" · "+esc(e.no):""}</div></div></div>`).join("")}
    ${held()?`<button class="btn alt" id="ctIcs" style="width:100%">Export these (.ics)</button>`:""}</div>`}
window.calTeamPanel=panel;
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{const m=$("#main");if(!m)return r;
  if(held()&&(view==="cal"||view==="mecal")&&!document.getElementById("ctPanel"))m.insertAdjacentHTML("beforeend",panel("Team events you can see","ctPanel",30));
  if(held()&&["today","board","mypg","me"].includes(view)&&!document.getElementById("ctHome"))m.insertAdjacentHTML("beforeend",panel("Coming up","ctHome",4));
  if(view==="feed"&&!document.getElementById("ctFeed")){const L=upcoming(3);if(L.length)m.insertAdjacentHTML("afterbegin",`<div class="note" id="ctFeed" style="margin:8px 4px">📅 Coming up: ${L.map(e=>esc(e.ti)+" ("+esc(when(e))+(e.sc?" · "+esc(e.sc):"")+")").join(" · ")}</div>`)}}catch(e){}return r}}
document.addEventListener("click",e=>{if(!e.target.closest||!e.target.closest("#ctIcs"))return;e.stopImmediatePropagation();const L=visible();if(!L.length){toast("Nothing to export.");return}
  const z=s=>String(s||"").replace(/[\\,;]/g,m=>"\\"+m).replace(/\n/g,"\\n");const dd=s=>String(s).replace(/-/g,"");
  const ics=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Accounted For//Team events//EN"].concat(L.flatMap((x,i)=>["BEGIN:VEVENT","UID:af-"+(x.eid||i)+"@accountedforteam.com","DTSTAMP:"+new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d+/,""),
    "DTSTART;VALUE=DATE:"+dd(x.d),"DTEND;VALUE=DATE:"+dd(x.end&&x.end>x.d?x.end:x.d),"SUMMARY:"+z(x.ti+(x.sc?" ("+x.sc+")":"")),x.no?"DESCRIPTION:"+z(x.no):"","END:VEVENT"].filter(Boolean))).concat("END:VCALENDAR").join("\r\n");
  shareFile(ics,(unitName()+" team events").replace(/[^\w -]+/g,"")+".ics","text/calendar")},true);

/* owner: a person's calendar access (their sections, or everything) */
{const _rp=renderPerson;renderPerson=function(){const r=_rp.apply(this,arguments);try{if(!own())return r;const m=S.roster.find(x=>x.id===pid);const main=$("#main");if(!m||!main||main.querySelector("#calAcc"))return r;
  const xs=Array.isArray(m.xsec)?m.xsec:[];
  main.insertAdjacentHTML("beforeend",`<div class="panel" id="calAcc"><b>Calendar access</b><p class="note" style="margin:2px 0 6px">Which team events ${esc(m.rank+" "+lastOf(m))} sees on their My page.</p>
    <div class="evts" role="group" aria-label="Calendar access"><button data-calacc="own" aria-pressed="${!m.calAll}">Everyone + ${esc(m.sec)}${xs.length?" + "+esc(xs.join(", ")):""}</button><button data-calacc="all" aria-pressed="${!!m.calAll}">Everything</button></div>
    <p class="note" style="margin:6px 0 2px">Also in sections</p><div class="evts" role="group" aria-label="Also in sections">${SECTIONS.map(s=>s[0]).filter(k=>k!==m.sec).map(k=>`<button data-calxs="${esc(k)}" aria-pressed="${xs.includes(k)}">${esc(k)}</button>`).join("")}</div></div>`)}catch(e){}return r}}
document.addEventListener("click",e=>{const t=e.target;if(!t.closest||!own())return;const a=t.closest("[data-calacc]"),x=t.closest("[data-calxs]");if(!a&&!x)return;const m=S.roster.find(y=>y.id===pid);if(!m)return;e.stopImmediatePropagation();
  if(a){if(a.dataset.calacc==="all")m.calAll=1;else delete m.calAll}
  if(x){const k=x.dataset.calxs;const xs=new Set(Array.isArray(m.xsec)?m.xsec:[]);xs.has(k)?xs.delete(k):xs.add(k);m.xsec=[...xs];if(!m.xsec.length)delete m.xsec}
  save();try{if(typeof mpSchedule==="function")mpSchedule()}catch(err){}const y=window.scrollY;render();window.scrollTo(0,y)},true);

/* a section leader's new event starts as their own section */
if(typeof calForm==="function"){const _cf=calForm;calForm=function(pre){let h=_cf.apply(this,arguments);try{if(!pre&&S.link&&S.link.mysec){const v="SEC:"+S.link.mysec;
  if(h.includes(`value="${v}"`))h=h.replace(/ selected(?=[^<]*<\/option>)/g,"").replace(`value="${v}"`,`value="${v}" selected`)}}catch(e){}return h}}
if(typeof SC==="object"&&Array.isArray(SC))SC.push({k:"calsc",n:"4.128: calendar visibility by section",f:["55_cal_scopes"],t:[["cal_get",{p_feed:"zz",p_keys:[]}]]});
})();
