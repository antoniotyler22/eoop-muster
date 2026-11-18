/* Accounted For 4.123.0: verify a person. A leader vouches that someone really is who the roster says.
   Four levels, shown as a badge on the person's card and a mark in the section list:
     Unverified  nothing yet
     Claimed     they hold their own My page link or login
     Confirmed   they've checked in themselves and it was confirmed
     Verified    a leader vouched for them ("Verified by SGT Ruiz · Mon 16 Nov"); the leader can revoke it
   Leaders (anyone who can edit) get a Verify button on every person; section lists get an All / Verified / Not yet filter.
   The vouch lives on the person (m.vf = {by, at}) so it syncs with the roster, and is mirrored to the server (SQL part 50:
   vouch_set, vouch_clear, vouch_list) so it survives a lost phone. The server calls are best-effort; the app works without them. */
(()=>{
const NAMES=["Unverified","Claimed","Confirmed","Verified"];
const COL=["#8a8f98","#b9822b","#0857E8","#1d9e75"];
const esc2=s=>typeof esc==="function"?esc(s):String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const tok=()=>{try{return window.afBiz&&afBiz.tok?afBiz.tok():""}catch(e){return ""}};
const leader=()=>{try{return canEdit()&&!memberMode()}catch(e){return false}};
const find=id=>S.roster.find(x=>x.id===id);
const claimed=m=>!!(m.pk||(S.logins||[]).some(L=>L&&L.mid===m.id));
const confirmed=m=>!!(+m.ckAt);
const vouched=m=>!!(m&&m.vf&&m.vf.by);
function level(m){return vouched(m)?3:confirmed(m)?2:claimed(m)?1:0}
const nameOf=()=>String((S.myName||S.postAs||"")||((typeof unitName==="function"?unitName():"Unit")+" leader")).slice(0,30);
const dayOf=t=>{try{const d=new Date(+t);return d.toLocaleDateString("en-US",{weekday:"short"})+" "+d.getDate()+" "+d.toLocaleDateString("en-US",{month:"short"})}catch(e){return ""}};
let filt="all",arm="",infoOpen=false;
const LV=[["Unverified","Nothing yet. They're on the roster, but nobody has vouched for them."],["Claimed","They hold their own My page link or login, so someone has the page."],["Confirmed","They've checked in themselves and a leader confirmed it."],["Verified","A leader vouched that this is really them. Shows who vouched and when."]];
function infoHtml(){return `<div class="pv-info" id="pvInfo" style="margin:10px 0;padding:12px;border:1px solid var(--line,rgba(128,128,128,.25));border-radius:14px"><b>How verification works</b>
  ${LV.map((x,i)=>`<div style="display:flex;gap:10px;margin-top:10px"><span style="flex:none;width:10px;height:10px;border-radius:50%;margin-top:6px;background:${COL[i]}"></span><div><b>${x[0]}</b><div class="note" style="margin:2px 0 0">${x[1]}</div></div></div>`).join("")}
  <div style="margin-top:12px"><b>Who can verify</b><div class="note" style="margin:2px 0 0">Leaders who can edit. View-only phones see the badge but can't change it.</div></div>
  <div style="margin-top:10px"><b>What it means</b><div class="note" style="margin:2px 0 0">A leader is saying "I know this is them." No ID is collected or checked.</div></div>
  <div style="margin-top:10px"><b>Taking it back</b><div class="note" style="margin:2px 0 0">Any leader can revoke it: open the person's card and tap Revoke twice. The person drops back to their earlier level.</div></div>
  <div style="margin-top:10px"><b>What's kept</b><div class="note" style="margin:2px 0 0">The leader's name and the date, saved with your roster and as a server copy tied to your team key, so it survives a lost phone.</div></div></div>`}
const infoChip=()=>`<button type="button" class="chip" data-pvinfo="1" aria-expanded="${infoOpen}" style="cursor:pointer">ⓘ How it works</button>`;

/* server mirror: best-effort, queued if it fails */
const Q=()=>{S.pvq=Array.isArray(S.pvq)?S.pvq:[];return S.pvq};
if(typeof SYNC_SKIP!=="undefined"&&Array.isArray(SYNC_SKIP)&&!SYNC_SKIP.includes("pvq"))SYNC_SKIP.push("pvq");
async function push(o){const t=tok();if(!t||!window.SB||!SB.rpc)return true;
  try{if(o.op==="set")await SB.rpc("vouch_set",{p_tok:t,p_mid:o.mid,p_by:o.by,p_at:o.at});else await SB.rpc("vouch_clear",{p_tok:t,p_mid:o.mid});return true}catch(e){return false}}
async function flush(){const q=Q().slice();if(!q.length)return;const left=[];for(const o of q)if(!(await push(o)))left.push(o);S.pvq=left;try{save()}catch(e){}}
function queue(o){Q().push(o);try{save()}catch(e){}flush()}
async function restore(){const t=tok();if(!t||!window.SB||!SB.rpc)return;
  try{const rows=await SB.rpc("vouch_list",{p_tok:t});if(!Array.isArray(rows))return;let n=0;
    for(const r of rows){const m=find(r.mid);if(!m||m.vf||Q().some(o=>o.mid===r.mid))continue;m.vf={by:String(r.by_name||"").slice(0,30),at:+r.at||Date.now()};n++}
    if(n){save();if(view==="people"||view==="p"||/^[a-z]{2,6}$/.test(view))render()}}catch(e){}}

function vouch(m){if(!leader())return toast("Only a leader can verify someone.");
  m.vf={by:nameOf(),at:Date.now()};arm="";try{save()}catch(e){}queue({op:"set",mid:m.id,by:m.vf.by,at:m.vf.at});
  try{if(S.board)rpPublish(true)}catch(e){}
  toast("Verified")}
function revoke(m){if(!leader())return toast("Only a leader can revoke.");
  delete m.vf;arm="";try{save()}catch(e){}queue({op:"clear",mid:m.id});toast("Verification revoked")}

/* the ladder: four steps, filled up to the person's level */
function ladder(L){return `<span class="pv-lad" aria-hidden="true" style="display:inline-flex;gap:3px;vertical-align:middle">${[0,1,2,3].map(i=>`<i style="width:18px;height:5px;border-radius:3px;background:${i<=L&&L>0?COL[L]:"rgba(128,128,128,.28)"}"></i>`).join("")}</span>`}
function pill(L){return `<span class="pv-pill" style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:13px;font-weight:600;color:#fff;background:${COL[L]}">${L===3?"✓ ":""}${NAMES[L]}</span>`}

function cardHtml(m){const L=level(m),v=m.vf;let h=`<div class="pv-card" id="pvCard" style="margin:10px 0 2px;padding:12px;border:1px solid var(--line,rgba(128,128,128,.25));border-radius:14px">`;
  h+=`<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">${pill(L)}${ladder(L)}</div>`;
  if(L===3)h+=`<div class="note" style="margin:8px 0 0"><b>Verified by ${esc2(v.by)}</b> · ${esc2(dayOf(v.at))}</div>`;
  else h+=`<div class="note" style="margin:8px 0 0">${L===2?"They've checked in themselves.":L===1?"They hold their own page or login.":"Nobody has vouched for this person yet."} ${leader()?"Tap Verify if you know it's really them.":""}</div>`;
  if(leader())h+=L===3
    ?`<button class="chip" data-pvrev="${esc2(m.id)}" style="cursor:pointer;margin-top:8px;color:var(--warn)">${arm==="rev"+m.id?"Tap again: revoke":"Revoke verification"}</button>`
    :`<button class="btn" data-pvset="${esc2(m.id)}" style="margin-top:8px;width:100%">Verify ${esc2(String(m.name||"").split(",")[0].trim().toLowerCase().replace(/(^|\s|-)\S/g,c=>c.toUpperCase()))}</button>`;
  return h+`</div>`}

/* person page: badge under the status line */
{const _rp=renderPerson;renderPerson=function(){const r=_rp.apply(this,arguments);try{const m=find(pid),main=document.getElementById("main");
  if(!m||!main||main.querySelector("#pvCard"))return r;const st=main.querySelector(".pg-head .mp-st");const h=(window.stByLine?stByLine(m):"")+cardHtml(m)+`<div style="margin:6px 0 0">${infoChip()}</div>`+(infoOpen?infoHtml():"");
  if(st)st.insertAdjacentHTML("afterend",h);
  else{const sh=main.querySelector(".sechead");if(sh)sh.insertAdjacentHTML("afterend",h)}}catch(e){}return r}}

/* section list: mark on each person, Verify button for leaders, All / Verified / Not yet filter */
{const _rs=renderSection;renderSection=function(code){const r=_rs.apply(this,arguments);try{const main=document.getElementById("main"),list=main&&main.querySelector(".list");if(!list)return r;
  const rows=[...list.querySelectorAll(".m")];let nv=0;
  for(const row of rows){const d=row.querySelector("[data-pcard]");if(!d)continue;const m=find(d.dataset.pcard);if(!m)continue;const ok=vouched(m);if(ok)nv++;row.dataset.pv=ok?"1":"0";
    const nm=row.querySelector(".nmrow");if(!nm||row.querySelector(".pv-line"))continue;
    nm.insertAdjacentHTML("afterend",`<div class="pv-line" style="margin:4px 0 2px;white-space:nowrap;font-size:13px">${ok?`<span class="pv-tag" style="color:${COL[3]};font-weight:600">✓ Verified by ${esc2(m.vf.by)}</span>`
      :leader()?`<button type="button" class="chip pv-tag" data-pvset="${esc2(m.id)}" style="cursor:pointer;padding:3px 10px;font-size:12px">Verify</button>`:`<span class="note" style="margin:0">Not verified</span>`}</div>`)}
  if(rows.length){const c=(k,l,n)=>`<button type="button" class="chip" data-pvf="${k}" aria-pressed="${filt===k}" style="cursor:pointer;${filt===k?"background:#0857E8;color:#fff;border-color:#0857E8":""}">${l} ${n}</button>`;
    list.insertAdjacentHTML("beforebegin",`<div class="chips pv-f" id="pvF" style="margin:10px 0 4px">${c("all","All",rows.length)}${c("ver","Verified",nv)}${c("not","Not yet",rows.length-nv)}${infoChip()}</div>${infoOpen?infoHtml():""}`);
    applyFilter(list)}}catch(e){}return r}}
function applyFilter(list){list=list||document.querySelector("#main .list");if(!list)return;
  for(const row of list.querySelectorAll(".m")){const v=row.dataset.pv==="1";row.style.display=filt==="ver"&&!v||filt==="not"&&v?"none":""}}

document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-pvset],[data-pvrev],[data-pvf],[data-pvinfo]");if(!t)return;e.stopImmediatePropagation();e.preventDefault();
  if(t.dataset.pvinfo){infoOpen=!infoOpen;const y=window.scrollY;render();window.scrollTo(0,y);return}
  if(t.dataset.pvf){filt=t.dataset.pvf;const y=window.scrollY;render();window.scrollTo(0,y);return}
  const id=t.dataset.pvset||t.dataset.pvrev,m=find(id);if(!m)return;const y=window.scrollY;
  if(t.dataset.pvset){vouch(m);render();window.scrollTo(0,y);return}
  if(arm!=="rev"+id){arm="rev"+id;render();window.scrollTo(0,y);return}
  revoke(m);render();window.scrollTo(0,y)},true);

if(typeof HELP==="object"&&HELP.people&&Array.isArray(HELP.people[2]))HELP.people[2].push("Verify someone: open their card and tap Verify to vouch it's really them. Tap Revoke (twice) to take it back. Section lists have an All / Verified / Not yet filter.");
window.afPersonVerify={level,vouch,revoke,NAMES};
setTimeout(()=>{flush();restore()},4000);
})();
