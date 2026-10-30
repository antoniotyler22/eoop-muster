/* Accounted For 4.39: Ask your roster.
   A box on Home and Check-ins for leaders: type a plain question, get the answer from the roster on this phone.
   "who's out Friday and who's missing a phone number?" "how many in HQ?" "where is Smith?" "who hasn't checked in?"
   Everything is worked out on the phone with plain rules. Nothing is sent anywhere, so names are safe to type.
   One question can have several parts ("... and ..."): each part gets its own answer. People are tappable. */
(()=>{
let used=0;
const leader=()=>!(typeof memberMode==="function"&&memberMode())&&S.source!=="sample"&&Array.isArray(S.roster)&&S.roster.length>0;
const DAYS=["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
const STAT=[[/\b(on leave|leave)\b/,"Leave"],[/\btad\b/,"TAD"],[/\b(at pt|pt)\b/,"At PT"],[/\b(siq|sick)\b/,"SIQ"],[/\b(appointments?|appts?)\b/,"Appointment"],
  [/\b(company duties|co duties|duty)\b/,"Company Duties"],[/\b(operation|deployed|deployment)\b/,"Operation"],[/\bduty rec(overy)?\b/,"Duty Recovery"]];
const pad=n=>String(n).padStart(2,"0");
const key=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
function dayFrom(q){const now=new Date();let d=null,label="today";
  if(/\btomorrow\b/.test(q)){d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);label="tomorrow"}
  else if(/\byesterday\b/.test(q)){d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1);label="yesterday"}
  else{for(let i=0;i<7;i++)if(new RegExp("\\b"+DAYS[i]+"\\b").test(q)){const add=(i-now.getDay()+7)%7;d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+add);label=add?DAYS[i][0].toUpperCase()+DAYS[i].slice(1):"today";break}
    if(!d){const m=q.match(/\b(\d{1,2})\/(\d{1,2})\b/);if(m){d=new Date(now.getFullYear(),+m[1]-1,+m[2]);label=m[1]+"/"+m[2]}}}
  return {iso:key(d||now),label}}
/* a person's status on a given day: dated entries count only inside their dates; an undated status is today's */
function statusOn(m,iso){const s=(typeof isoOf==="function"?isoOf(m.start):"")||"",e=(typeof isoOf==="function"?isoOf(m.end):"")||"";
  if(!s&&!e)return iso===key(new Date())?m.status:"On Hand";return (!s||s<=iso)&&(!e||e>=iso)?m.status:"On Hand"}
const pool=()=>S.roster.filter(m=>m.sec!=="ATT");
const who=m=>(m.rank?m.rank+" ":"")+lastOf(m).toLowerCase().replace(/(^|[\s-])\w/g,c=>c.toUpperCase());
function people(list,extra){if(!list.length)return `<div class="note" style="margin:2px 0">Nobody.</div>`;
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">${sorted(list).slice(0,60).map(m=>`<span class="chip" data-pcard="${esc(m.id)}" style="cursor:pointer">${esc(who(m))}${extra?" · "+esc(extra(m)):""}</span>`).join("")}${list.length>60?`<span class="chip">+${list.length-60} more</span>`:""}</div>`}
function secFrom(q){const secs=[...new Set(S.roster.map(m=>m.sec).filter(Boolean))];
  for(const s of secs){if(new RegExp("\\b"+String(s).toLowerCase().replace(/[^a-z0-9]/g,"")+"\\b").test(q.replace(/[^a-z0-9 ]/g,"")))return s}
  for(const [k,n] of (typeof SECTIONS!=="undefined"?SECTIONS:[]))if(q.includes(String(n).toLowerCase())&&secs.includes(k))return k;return ""}
function nameHits(q){const words=new Set(q.replace(/[^a-z\- ]/g," ").split(/\s+/).filter(w=>w.length>=3));
  return pool().filter(m=>words.has(lastOf(m).toLowerCase()))}
function part(q){q=q.toLowerCase().trim().replace(/[?.!]+$/,"");if(!q)return "";
  const d=dayFrom(q),sec=secFrom(q),count=/\bhow many\b/.test(q);let R=pool();if(sec)R=R.filter(m=>m.sec===sec);
  const where=sec?" in "+esc(sec):"";
  const head=(n,t)=>`<div><b>${count?n:n}</b> ${t}</div>`;
  if(/(haven'?t|hasn'?t|not|n'?t|yet to|didn'?t).{0,12}check(ed)?.?in|unaccounted|not accounted|missing check/.test(q)){
    const s=typeof ckMissing==="function"?ckMissing():null;if(!s)return "";const miss=sec?s.miss.filter(m=>m.sec===sec):s.miss;
    return head(miss.length,`haven't checked in today${where}`)+people(miss)}
  if(/\bchecked.?in\b/.test(q)&&!/\bnot\b/.test(q)){const s=typeof ckMissing==="function"?ckMissing():null;if(!s)return "";const done=sec?s.done.filter(m=>m.sec===sec):s.done;return head(done.length,`checked in today${where}`)+people(done)}
  if(/(no|without|missing|lack\w*|need\w*)\s+(a\s+)?(phone|number|cell)/.test(q)){const l=R.filter(m=>!m.phone);return head(l.length,`without a phone number${where}`)+people(l)}
  if(/(no|without|missing|not on|isn'?t on|aren'?t on)\s+(a\s+|the\s+)?(my page|page|app)/.test(q)){const l=R.filter(m=>!m.pk);return head(l.length,`not on the app yet${where}`)+people(l)}
  const hits=nameHits(q);if(hits.length&&!count&&!/\b(in|from)\s+\w+$/.test(q)||(hits.length&&/\b(where|status|who is|whos|find)\b/.test(q))){
    return hits.slice(0,5).map(m=>{const st=statusOn(m,d.iso);const dates=(m.start||m.end)?` (${esc(m.start||"")}${m.end?" – "+esc(m.end):""})`:"";
      return `<div class="rrow" data-pcard="${esc(m.id)}" style="cursor:pointer;margin-top:4px"><div class="who"><b>${esc(who(m))}</b> · ${esc(m.sec||"")}<div class="ph">${esc(SHORT[st]||st)}${m.loc?" · "+esc(m.loc):""}${dates}${m.phone?" · "+esc(m.phone):" · no phone number"}</div></div></div>`}).join("")}
  for(const [re,st] of STAT)if(re.test(q)){const l=R.filter(m=>statusOn(m,d.iso)===st);return head(l.length,`${esc(SHORT[st]||st)} ${esc(d.label)}${where}`)+people(l)}
  if(/\b(out|away|gone|unavailable|not here|off)\b/.test(q)){const l=R.filter(m=>AWAY.includes(statusOn(m,d.iso)));return head(l.length,`out ${esc(d.label)}${where}`)+people(l,m=>SHORT[statusOn(m,d.iso)]||statusOn(m,d.iso))}
  if(/\b(on hand|here|present|available)\b/.test(q)){const l=R.filter(m=>statusOn(m,d.iso)==="On Hand");return head(l.length,`on hand ${esc(d.label)}${where}`)+people(l)}
  if(sec){return head(R.length,`in ${esc(sec)}`)+(count?"":people(R))}
  if(count){return head(R.length,"people on the roster")}
  return ""}
const EX=["Who's out Friday?","Who hasn't checked in?","Who is missing a phone number?","How many in HQ?","Where is Smith?"];
window.askRoster=function(text){const parts=String(text||"").split(/\s+(?:and|also|plus)\s+|[;,]\s*|\?\s+/i).map(s=>s.trim()).filter(Boolean);
  const out=parts.map(part).filter(Boolean);
  if(!out.length)return `<div class="note">I didn't catch that. Try: ${EX.map(x=>`<a href="#" data-arex="${esc(x)}">${esc(x)}</a>`).join(" · ")}</div>`;
  return out.map(x=>`<div style="padding:8px 0;border-top:1px solid var(--line)">${x}</div>`).join("")};
function card(){return `<div class="panel" id="arCard"><b>🔎 Ask your roster</b><p class="note" style="margin:2px 0 6px">Plain questions, answered on this phone. Nothing is sent anywhere.</p>
  <div style="display:flex;gap:8px"><input id="arQ" type="search" enterkeyhint="search" autocomplete="off" placeholder="${esc(EX[0])}" style="flex:1;min-width:0"><button class="btn" id="arGo" style="width:auto;padding:0 16px">Ask</button></div>
  <div id="arOut"></div>${used?"":`<div class="note" style="margin-top:6px">${EX.slice(1).map(x=>`<a href="#" data-arex="${esc(x)}">${esc(x)}</a>`).join(" · ")}</div>`}</div>`}
window.askRosterCard=()=>leader()?card():"";
function run(t){const o=$("#arOut");if(!o)return;o.innerHTML=askRoster(t);used=1}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{
  if(!leader())return r;const m=$("#main");if(!m||$("#arCard"))return r;
  if(view==="checkins"){const hd=m.querySelector(".sechead");if(hd)hd.insertAdjacentHTML("afterend",card())}
  }catch(e){}return r}}
document.addEventListener("click",e=>{const t=e.target;
  const ex=t.closest&&t.closest("[data-arex]");if(ex){e.preventDefault();const q=$("#arQ");if(q)q.value=ex.dataset.arex;run(ex.dataset.arex);return}
  if(t.closest&&t.closest("#arGo")){const q=$("#arQ");if(q)run(q.value)}});
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target&&e.target.id==="arQ"){e.preventDefault();run(e.target.value)}});
})();
