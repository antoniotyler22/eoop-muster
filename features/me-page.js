/* Accounted For 4.18 — My page, laid out by what matters first (layout A).
   Greeting with the day, date and 24-hour time; an open emergency muster on top in red; the daily Check in card;
   updates to confirm; the word from the Feed for everyone or their section, each with Got it; today's items;
   Needs you; the next 7 days (own items, section duty, events for everyone); countdowns; then duty, due-outs,
   requests and the full calendar. The leader's phone can still preview it (People → a person → My page). */
(()=>{
const DAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const plus=(n)=>{const d=new Date();d.setDate(d.getDate()+n);return iso(d)};
const hhmm=()=>{const d=new Date();return String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0")};
const dayLine=()=>{const d=new Date();return DAYS[d.getDay()].toUpperCase()+", "+MON[d.getMonth()].toUpperCase()+" "+d.getDate()+" · "+hhmm()};
const pd=s=>{const m=String(s||"").match(/^(\d{4})-(\d{2})-(\d{2})/);return m?new Date(+m[1],+m[2]-1,+m[3]):null};
const dn=s=>{const d=pd(s);return d?`<span class="n tone-b" style="flex-direction:column;line-height:1;gap:1px"><span style="font-size:15px">${d.getDate()}</span><span style="font-size:9.5px;letter-spacing:.06em">${MON[d.getMonth()].toUpperCase()}</span></span>`:`<span class="n tone-b">•</span>`};
const row=(lead,t,sub)=>`<div class="lrow">${lead}<span style="flex:1;min-width:0"><span class="t" style="display:block">${t}</span>${sub?`<span class="s" style="display:block">${sub}</span>`:""}</span></div>`;
const tyName=t=>({DUTY:"Duty",LEAVE:"Leave",APPT:"Appointment",TAD:"TAD",DUE:"Due",OTHER:"",EVENT:"Event"})[t]||(typeof ctype==="function"?(ctype(t)||[])[1]||t:t);
/* every dated thing the person has, as one list */
function items(D){const out=[];for(const e of D.cal||[])out.push({d:e.d,end:e.end||"",tm:e.tm||"",t:e.ti,s:tyName(e.ty),ty:e.ty});
  for(const x of D.duties||[])out.push({d:x.d,t:x.r,s:"Duty · you",ty:"DUTY"});
  for(const ev of D.events||[])out.push({d:ev.d,t:ev.n,s:ev.all?"Event · everyone":"Event · "+(D.sec||"your section"),ty:"EVENT"});
  return out.sort((a,b)=>(a.d+(a.tm||"99")).localeCompare(b.d+(b.tm||"99")))}
const inDay=(x,k)=>x.d<=k&&(x.end||x.d)>=k;
function todayHTML(D){const k=iso(new Date());const L=items(D).filter(x=>inDay(x,k));const pod=D.pod;
  if(!L.length&&!pod)return "";
  const cards=L.map(x=>`<button class="me-tc" data-go="mecal"><div class="k">${esc(x.tm?x.tm.replace(":",""):x.ty==="DUTY"?"DUTY":x.ty==="EVENT"?"EVENT":x.s.toUpperCase())}</div><div class="v">${esc(x.t)}</div><div class="w">${esc(x.s)}</div></button>`);
  if(pod)cards.unshift(`<button class="me-tc" data-go="feed"><div class="k">PLAN OF THE DAY</div><div class="v">${esc((typeof podParse==="function"?podParse(pod.txt).f:"")||"Posted")}</div><div class="w">tap to read</div></button>`);
  return `<div class="sech"><h2>Today for me</h2><button class="chip" data-go="mecal" style="cursor:pointer">Calendar ▸</button></div><div class="strip">${cards.join("")}</div>`}
function comingHTML(D){const k=iso(new Date()),k7=plus(7);const L=items(D).filter(x=>x.d>k&&x.d<=k7||(x.end&&x.d<=k&&x.end>k));
  return `<div class="sech"><h2>Coming up · 7 days</h2><button class="chip" id="meIcs2" style="cursor:pointer">Add to phone calendar</button></div>`+(L.length?`<div class="card ny">${L.slice(0,8).map(x=>{const d=pd(x.d);return row(dn(x.d),(x.tm?esc(x.tm.replace(":",""))+" · ":"")+esc(x.t),(d?DAYS[d.getDay()].slice(0,3)+" · ":"")+esc(x.s))}).join("")}</div>`:`<div class="card"><p class="note" style="margin:0">Nothing in the next 7 days.</p></div>`)}
/* the word: the latest posts for this person, each with Got it */
function wordHTML(){const f=typeof fdCur==="function"?fdCur():null;if(!f||!Array.isArray(f.posts))return "";
  const forMe=p=>typeof fdForMe!=="function"||fdForMe(f,p);const L=f.posts.filter(p=>!p.pod&&!(p.ci&&Date.now()-p.t<12*3600000)&&forMe(p)).slice(0,3);if(!L.length)return "";
  const open=L.filter(p=>!(f.mine||{})[p.id]).length;
  return `<div class="sech"><h2>The word</h2><span style="display:flex;gap:6px;align-items:center">${open?`<span class="chip" style="background:var(--brass);color:#fff;border:0">${open} to confirm</span>`:""}<button class="chip" data-go="feed" style="cursor:pointer">Feed ▸</button></span></div><div id="meWord">${L.map(p=>fdCard(f,p,false,false)).join("")}</div>`}
/* an open emergency muster: the newest post with a check-in link, less than 12 hours old */
function musterHTML(){const f=typeof fdCur==="function"?fdCur():null;if(!f||!Array.isArray(f.posts))return "";const p=f.posts.find(x=>x.ci&&Date.now()-x.t<12*3600000);if(!p)return "";
  const h=String(p.ci).split("#")[1]||"";const txt=String(p.txt||"").split("\n")[0].slice(0,120);
  return `<div class="card me-muster"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:12px;letter-spacing:.08em">🚨 EMERGENCY MUSTER</b><span style="font-size:12px;font-weight:800">${esc(ago(p.t))}</span></div>
    <div style="font-weight:700;line-height:1.35">${esc(txt)}</div>
    <button class="btn" data-meci="${esc(h)}" style="background:#fff;color:#b42318">Reply now · 1 I'm OK · 2 Delayed · 3 Need help</button></div>`}
function bottomHTML(){return `<div class="me-bottom"><button class="btn alt" data-go="feed">📣 Feed</button><button class="btn alt" data-go="mecal">📅 Calendar</button><button class="btn alt" data-go="log">📓 My log</button><button class="btn alt" data-go="support">❓ Help</button></div>`}
/* collect the page the app built, then put it back together in order */
function blocks(main){const out={};let cur=null;const kids=[...main.children];
  for(const el of kids){
    if(el.id==="ckCard"){out.ck=[el];cur=null;continue}
    if(el.id==="meUpd"){(out.upd=out.upd||[]).push(el);cur="upd";continue}
    if(el.classList.contains("hm-h")||el.querySelector&&el.querySelector(".hm-h")){out.head=[el];cur=null;continue}
    if(el.classList.contains("hero")){out.hero=[el];cur=null;continue}
    if(el.classList.contains("tgrid")&&el.querySelector(".cdt")){out.cd=[el];cur=null;continue}
    if(el.classList.contains("sech")){const t=(el.querySelector("h2")||el).textContent.trim().toLowerCase();cur=/needs you/.test(t)?"needs":/^duty/.test(t)?"duty":/due-out/.test(t)?"due":/request/.test(t)?"reqs":/calendar/.test(t)?"cal":/updates/.test(t)?"upd":"x"+Object.keys(out).length;(out[cur]=out[cur]||[]).push(el);continue}
    if(el.classList.contains("tone-a")&&el.classList.contains("card")){out.pod=[el];cur=null;continue}
    if(el.classList.contains("tgrid")&&el.querySelector('[data-go="log"]')){out.links=[el];cur=null;continue}
    if(el.classList.contains("panel")&&/own team/i.test(el.textContent)){out.start=[el];cur="start";continue}
    if(cur)(out[cur]=out[cur]||[]).push(el);else (out.rest=out.rest||[]).push(el)}
  return out}
function rebuild(){if(view!=="me"&&view!=="mepv")return;const M=S.me,D=M&&M.d;if(!D)return;const main=$("#main");if(!main||main.querySelector(".me-built"))return;
  const B=blocks(main);const frag=[];const add=x=>{if(!x)return;if(typeof x==="string"){if(x)frag.push(x)}else for(const el of x)frag.push(el)};
  add(`<div class="me-built" style="margin-top:14px"><div class="hm-k" id="meDay">${esc(dayLine())} · ${esc(D.sec||"")}${D.secName?" · "+esc(String(D.secName).toUpperCase()):""}</div><div class="hm-h">${esc(typeof greetLine==="function"?greetLine():"Welcome")}</div><div class="note" style="margin:2px 0 0">${esc(D.unit||"")}</div></div>`);
  if(view==="me")add(musterHTML());
  add(B.ck);add(B.hero);add(B.upd);
  if(view==="me")add(wordHTML());
  add(todayHTML(D));add(B.pod);add(B.needs);add(comingHTML(D));add(B.cd);add(B.duty);add(B.due);add(B.reqs);add(B.cal);
  add(bottomHTML());add(B.links);add(B.start);add(B.rest);for(const k of Object.keys(B))if(/^x\d/.test(k))add(B[k]);
  main.replaceChildren();for(const x of frag){if(typeof x==="string")main.insertAdjacentHTML("beforeend",x);else main.appendChild(x)}
  const ck=main.querySelector("#ckCard");if(ck)ck.classList.add("me-ck");
  if(typeof window.feedPicsFill==="function")window.feedPicsFill()}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{rebuild()}catch(e){}return r}}
{const _rm=renderMe;renderMe=function(){const r=_rm.apply(this,arguments);try{rebuild()}catch(e){}return r}}
every(30000,()=>{const d=$("#meDay");if(d&&(view==="me"||view==="mepv")){const D=S.me&&S.me.d;if(D)d.textContent=dayLine()+" · "+(D.sec||"")+(D.secName?" · "+String(D.secName).toUpperCase():"")}},"me-clock");
/* Got it on My page stays on My page; the muster button opens the check-in link; the calendar button adds everything */
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;
  const fa=t.closest("#meWord [data-fdack]");if(fa&&typeof fdAck==="function"&&typeof fdCur==="function"){e.stopImmediatePropagation();const f=fdCur();const pid=+fa.dataset.fdack;fa.disabled=true;
    fdAck(f,pid,+fa.dataset.c).then(()=>{const y=window.scrollY;render();window.scrollTo(0,y);toast(+fa.dataset.c===2?"Problem sent":"Got it sent")}).catch(err=>{fa.disabled=false;toast("Couldn't send. Check signal and try again.")});return}
  const ci=t.closest("[data-meci]");if(ci){e.stopImmediatePropagation();const h=ci.dataset.meci;if(h)location.hash=h;return}
  if(t.closest("#meIcs2")){e.stopImmediatePropagation();const b=$("#meIcs");if(b)b.click();else toast("Open the Calendar tab to add it to your phone.");return}},true);
{const st=document.createElement("style");st.textContent=`.me-muster{background:#d93a3a;color:#fff;border:0;gap:8px}.me-muster .btn{font-weight:800}
.me-ck{border:2px solid var(--s-onhand)!important}.me-ck .btn{min-height:56px;font-size:18px}
.me-tc{flex:0 0 156px;text-align:left;font:inherit;color:var(--ink);cursor:pointer}
.me-bottom{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}`;document.head.appendChild(st)}
})();
