/* Accounted For 1.9 — Clear and hide on Home, and a search box on Tools.
   Home: every Needs-attention line and every Activity line gets an × to hide it, plus "Hide all" / "Clear".
   A hidden attention line stays hidden until that problem goes away and comes back. Clearing activity removes
   those lines from the Activity list (the full list has its own Clear too).
   Tools: a search box at the top finds any screen or feature by name or description and opens it in one tap. */
(()=>{
/* ---------- Needs attention: hide ---------- */
const hid=()=>{S.hideHealth=S.hideHealth&&typeof S.hideHealth==="object"?S.hideHealth:{};return S.hideHealth};
const hk=x=>String(x.t||"").slice(0,120);
let showHidden=false;
if(typeof healthCard==="function"){const _hc=healthCard;healthCard=function(){let I;try{I=healthIssues()}catch(e){return _hc.apply(this,arguments)}
  const H=hid();const keys=new Set(I.map(hk));let ch=false;for(const k of Object.keys(H))if(!keys.has(k)&&H[k]!=="never"){delete H[k];ch=true}if(ch)rawSave();
  const hidden=I.filter(x=>H[hk(x)]&&H[hk(x)]!=="never").length;const show=(showHidden?I:I.filter(x=>!H[hk(x)])).filter(x=>H[hk(x)]!=="never");
  if(!show.length){if(!I.length||!hidden)return `<div class="note" style="margin:10px 4px 0;color:var(--s-onhand);font-weight:700">● All systems working${SB.okAt?" · server reached "+ago(SB.okAt):""}</div>`;
    return `<div class="note" style="margin:10px 4px 0;display:flex;gap:8px;align-items:center"><span style="color:var(--s-onhand);font-weight:700">● ${hidden} hidden</span><button class="chip" id="hhShow" style="cursor:pointer">Show</button></div>`}
  return `<div class="sech"><h2>Needs attention</h2><span style="display:flex;gap:6px;align-items:center"><span class="note" style="margin:0">${show.length}</span>${show.length>1?`<button class="chip" id="hhAll" style="cursor:pointer">Hide all</button>`:""}${hidden&&!showHidden?`<button class="chip" id="hhShow" style="cursor:pointer">${hidden} hidden</button>`:""}</span></div>
    <div class="card ny">${show.map(x=>`<div class="hc-row"><button class="lrow" data-go="${esc(x.go||"")}" style="flex:1;text-align:left;background:none;border:0;cursor:pointer;color:inherit;border-top:0"><span class="n tone-r">!</span><span class="t" style="flex:1">${esc(x.t)}</span></button><button class="hc-x" data-hgone="${esc(hk(x))}" aria-label="Delete" title="Delete for good">🗑</button><button class="hc-x" data-hhide="${esc(hk(x))}" aria-label="Hide" title="Hide until it comes back">×</button></div>`).join("")}</div>`}}
/* ---------- Activity on Home: clear ---------- */
let armedAct=false;
if(typeof actCard==="function"){actCard=function(){const A=S.act||[];if(!A.length)return"";const n=typeof actNew==="function"?actNew():0;
  return `<div class="sech"><h2>Activity</h2><span style="display:flex;gap:6px;align-items:center"><button class="chip" id="haClear" style="cursor:pointer">${armedAct?"Tap again to clear":"Clear"}</button><button class="chip" data-go="act" style="cursor:pointer">${n?`<b style="color:var(--brass)">${n} new</b> · `:""}See all ▸</button></span></div>
    <div class="card ny">${A.slice(0,4).map((a,i)=>`<div class="hc-row"><button class="lrow" data-go="${esc(a.go||"act")}" style="flex:1;text-align:left;background:none;border:0;cursor:pointer;color:inherit;border-top:0;min-width:0"><span class="n tone-${a.t>(S.actSeen||0)?"a":"b"}">${esc(a.ic)}</span><span style="flex:1;min-width:0"><span class="t" style="display:block">${esc(a.txt)}</span><span class="s" style="display:block">${ago(a.t)}</span></span></button><button class="hc-x" data-ahide="${i}" aria-label="Remove" title="Remove">×</button></div>`).join("")}</div>`}}
function home(){if(view==="board"||view==="dash"){const y=window.scrollY;render();window.scrollTo(0,y)}}
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;
  const d=t.closest("[data-hgone]");if(d){e.stopImmediatePropagation();hid()[d.dataset.hgone]="never";rawSave();home();toast("Deleted. It won't show again.");return}
  const h=t.closest("[data-hhide]");if(h){e.stopImmediatePropagation();hid()[h.dataset.hhide]=Date.now();rawSave();home();toast("Hidden until it comes back");return}
  if(t.closest("#hhAll")){e.stopImmediatePropagation();try{for(const x of healthIssues())hid()[hk(x)]=Date.now()}catch(e2){}rawSave();showHidden=false;home();return}
  if(t.closest("#hhShow")){e.stopImmediatePropagation();showHidden=!showHidden;home();return}
  const a=t.closest("[data-ahide]");if(a){e.stopImmediatePropagation();S.act=(S.act||[]).filter((x,i)=>i!==+a.dataset.ahide);rawSave();home();return}
  if(t.closest("#haClear")){e.stopImmediatePropagation();if(!armedAct){armedAct=true;home();setTimeout(()=>{if(armedAct){armedAct=false;home()}},4000);return}armedAct=false;S.act=[];S.actSeen=Date.now();rawSave();home();toast("Activity cleared");return}});

/* ---------- Tools: search every screen ---------- */
let q="";let index=[];
/* features that live inside another screen, so the search can find them by name */
const EXTRA=[["Room sweep","Mark each room clear during a check-in","recall"],["Drill history","Every closed-out check-in, with times","recall"],["Elapsed-time alarms","Buzz every 2, 5 or 10 min during a check-in","recall"],
  ["Visitors","Sign guests, contractors and deliveries in and out","visitors"],["Kiosk mode","Front-desk sign-in screen","visitors"],["Roster import","Paste names from a spreadsheet","people"],["Family safe texts","Tell families everyone is safe (School)","recall"],
  ["Activity","Everything that happened, from every link","act"],["Home","Headcount, attention, next event","board"]];
if(typeof renderTools==="function"){const _rt=renderTools;renderTools=function(){const main=$("#main");let mo=null;const removed=[];
  if(main&&"MutationObserver" in window){mo=new MutationObserver(()=>{});mo.observe(main,{childList:true,subtree:true})}
  const r=_rt.apply(this,arguments);
  try{if(mo){for(const rec of mo.takeRecords())for(const n of rec.removedNodes)if(n.nodeType===1){if(n.classList&&n.classList.contains("tgrid"))removed.push(...n.children);else if(n.querySelectorAll)removed.push(...n.querySelectorAll(".tgrid > *"))}mo.disconnect()}
    const live=main?[...main.querySelectorAll(".tgrid > *")].filter(b=>!b.hasAttribute("data-sgrp")):[];
    const seen=new Set();index=[];
    for(const b of removed.concat(live)){const k=b.id||b.dataset&&b.dataset.go||"";const t=(b.querySelector("b")||{}).textContent||b.textContent||"";const key=(k||t).trim();if(!key||seen.has(key)||b.hasAttribute("data-sgrp"))continue;seen.add(key);index.push({html:b.outerHTML,text:(b.textContent||"").toLowerCase()})}
    for(const [t,s,go] of EXTRA){if(seen.has(t))continue;seen.add(t);index.push({html:`<button data-go="${go}"><span class="ic">${svg("help")}</span><span><b>${esc(t)}</b><small>${esc(s)}</small></span></button>`,text:(t+" "+s).toLowerCase()})}
    const sg=main&&$("#sgGrid");if(main){const box=`<div class="hc-search"><input class="search" id="tsQ" type="search" placeholder="Search tools and features" value="${esc(q)}" autocomplete="off" aria-label="Search tools"><div class="tgrid" id="tsRes" ${q?"":"hidden"}></div></div>`;
      const first=main.querySelector(".sech,.tgrid,#sgGrid");if(first)first.insertAdjacentHTML("beforebegin",box);else main.insertAdjacentHTML("afterbegin",box);results()}}catch(e){}
  return r}}
function results(){const res=$("#tsRes"),sg=$("#sgGrid");if(!res)return;const w=q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if(!w.length){res.hidden=true;res.innerHTML="";if(sg)sg.hidden=false;document.querySelectorAll("#main [data-tshide]").forEach(x=>{x.hidden=false;x.removeAttribute("data-tshide")});return}
  const hits=index.filter(x=>w.every(t=>x.text.includes(t)));res.hidden=false;
  res.innerHTML=hits.length?hits.slice(0,24).map(x=>x.html).join(""):`<p class="note" style="grid-column:1/-1;margin:0">Nothing matches "${esc(q)}". Try another word, like check-in, feed, calendar or report.</p>`;
  if(sg)sg.hidden=true;const main=$("#main");if(main)[...main.children].forEach(x=>{if(x.classList.contains("hc-search")||x.classList.contains("banner"))return;if(!x.hidden){x.hidden=true;x.setAttribute("data-tshide","1")}})}
document.addEventListener("input",e=>{if(e.target.id!=="tsQ")return;q=e.target.value;results()});
document.addEventListener("click",e=>{const t=e.target;if(t.closest&&t.closest("#tsRes [data-go],#tsRes [id]"))q=""},true);
window.toolsSearch=v=>{q=String(v||"");results()};

/* ---------- Home: "Needs you" hide; Today cards by time of day, with clear ---------- */
const today=()=>new Date().toISOString().slice(0,10);
const dayStore=k=>{let o=S[k];if(!o||typeof o!=="object"||o.d!==today())o=S[k]={d:today(),h:{}};return o};
const hhmm=()=>{const d=new Date();return d.getHours()*60+d.getMinutes()};
const dutyAt=()=>{const v=String(S.dutyAt||"08:00");const m=v.match(/^(\d{1,2}):(\d{2})$/);return m?(+m[1])*60+ +m[2]:480};
/* when a Today card shows: timed items from 2 h before to 1 h after; duty around the duty start time; the rest all day */
function cardWindow(card){const k=(card.querySelector(".k")||{}).textContent||"";const m=k.match(/^(\d{1,2}):(\d{2})/);const now=hhmm();
  if(m){const t=(+m[1])*60+ +m[2];return now>=t-120&&now<=t+60}
  if(/^DUTY$/i.test(k.trim())){const t=dutyAt();return now>=t-60&&now<=t+60}
  return true}
const cardKey=c=>(c.textContent||"").replace(/\s+/g," ").trim().slice(0,100);
let showToday=false,armedToday=false,showNy=false;
function todayFix(main){const strip=main.querySelector(".strip");if(!strip)return;const head=strip.previousElementSibling;if(!head||!head.classList.contains("sech"))return;
  const H=dayStore("todayHide").h;const cards=[...strip.children];let hidden=0,later=0;
  for(const c of cards){const key=cardKey(c);c.setAttribute("data-tdk",key);
    if(H[key]&&!showToday){c.hidden=true;hidden++;continue}
    if(!showToday&&!cardWindow(c)){c.hidden=true;later++;continue}
    if(!c.querySelector(".hc-tx"))c.insertAdjacentHTML("beforeend",`<span class="hc-tx" data-tdhide="${esc(key)}" role="button" aria-label="Hide" title="Hide until tomorrow">×</span>`)}
  const vis=cards.length-hidden-later;
  const chips=`<span style="display:flex;gap:6px;align-items:center">${vis>0?`<button class="chip" id="tdClear" style="cursor:pointer">${armedToday?"Tap again to clear":"Clear"}</button>`:""}${(hidden||later)&&!showToday?`<button class="chip" id="tdShow" style="cursor:pointer">${hidden+later} more</button>`:showToday?`<button class="chip" id="tdShow" style="cursor:pointer">Just now</button>`:""}<button class="chip" data-go="cal" style="cursor:pointer">Calendar ▸</button></span>`;
  const old=head.querySelector(".chip");if(old)old.outerHTML=chips;
  if(!vis){strip.insertAdjacentHTML("afterend",`<p class="note" id="tdNone">${hidden?"Cleared for today. ":""}${later?"More shows up closer to its time. ":""}It's all on the calendar.</p>`)}
  strip.insertAdjacentHTML("afterend",`<div class="note" id="tdSet" style="display:flex;gap:6px;align-items:center;margin-top:4px">Duty shows around <select id="tdDuty" class="wsel" style="width:auto;padding:2px 6px">${Array.from({length:24},(_,i)=>`<option value="${String(i).padStart(2,"0")}:00"${dutyAt()===i*60?" selected":""}>${i===0?"12 AM":i<12?i+" AM":i===12?"12 PM":(i-12)+" PM"}</option>`).join("")}</select></div>`)}
function nyFix(main){const h2=[...main.querySelectorAll(".sech h2")].find(x=>/^Needs you$|^Pendiente$/.test(x.textContent.trim()));if(!h2)return;const sech=h2.parentElement;const card=sech.nextElementSibling;if(!card||!card.classList.contains("ny"))return;
  const H=dayStore("nyHide").h;const rows=[...card.children].filter(x=>x.tagName==="BUTTON");let hidden=0;
  for(const b of rows){const key=cardKey(b);if(H[key]&&!showNy){b.hidden=true;hidden++;continue}
    const w=document.createElement("div");w.className="hc-row";b.replaceWith(w);w.appendChild(b);b.style.borderTop="0";b.style.flex="1";b.style.minWidth="0";w.insertAdjacentHTML("beforeend",`<button class="hc-x" data-nyhide="${esc(key)}" aria-label="Hide" title="Hide until tomorrow">×</button>`)}
  const vis=rows.length-hidden;
  const n=sech.querySelector(".note");const chips=`<span style="display:flex;gap:6px;align-items:center">${vis?`<span class="note" style="margin:0">${vis}</span>`:""}${vis>1?`<button class="chip" id="nyAll" style="cursor:pointer">Hide all</button>`:""}${hidden&&!showNy?`<button class="chip" id="nyShow" style="cursor:pointer">${hidden} hidden</button>`:showNy&&hidden?`<button class="chip" id="nyShow" style="cursor:pointer">Hide again</button>`:""}</span>`;
  if(n)n.outerHTML=chips;else sech.insertAdjacentHTML("beforeend",chips);
  if(!vis)card.outerHTML=`<div class="card" style="align-items:center;text-align:center"><b style="color:var(--s-onhand)">✓ Hidden for today</b></div>`}
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;
  const td=t.closest("[data-tdhide]");if(td){e.preventDefault();e.stopImmediatePropagation();dayStore("todayHide").h[td.dataset.tdhide]=1;rawSave();home();return}
  if(t.closest("#tdClear")){e.stopImmediatePropagation();if(!armedToday){armedToday=true;home();setTimeout(()=>{if(armedToday){armedToday=false;home()}},4000);return}armedToday=false;const H=dayStore("todayHide").h;document.querySelectorAll("#main .strip [data-tdk]").forEach(c=>{H[c.dataset.tdk]=1});rawSave();showToday=false;home();toast("Cleared for today. It's all on the calendar.");return}
  if(t.closest("#tdShow")){e.stopImmediatePropagation();showToday=!showToday;home();return}
  const ny=t.closest("[data-nyhide]");if(ny){e.stopImmediatePropagation();dayStore("nyHide").h[ny.dataset.nyhide]=1;rawSave();home();return}
  if(t.closest("#nyAll")){e.stopImmediatePropagation();const H=dayStore("nyHide").h;document.querySelectorAll("#main [data-nyhide]").forEach(x=>{H[x.dataset.nyhide]=1});rawSave();showNy=false;home();return}
  if(t.closest("#nyShow")){e.stopImmediatePropagation();showNy=!showNy;home();return}},true);
document.addEventListener("change",e=>{if(e.target.id!=="tdDuty")return;S.dutyAt=e.target.value;rawSave();home();toast("Duty cards show around "+e.target.options[e.target.selectedIndex].text)});

/* ---------- Home: On the app where Live sections was; Ask + help at the bottom, then Live sections last ---------- */
function homeFix(){const main=$("#main");if(!main||view!=="board")return;
  const live=main.querySelector('.att[data-go="live"]'),oa=main.querySelector("#oaPanel"),qa=main.querySelector(".qa");
  const spot=live?live.nextElementSibling:null;
  if(oa){const anchor=spot&&spot.isConnected&&spot!==oa?spot:main.querySelector("details.card");if(anchor&&anchor!==oa)anchor.insertAdjacentElement("beforebegin",oa)}
  if(main.querySelector("#hmAsk")){if(live)main.querySelector("#hmAsk").insertAdjacentElement("afterend",live);return}const ask=typeof akHidden==="function"&&akHidden()?"":`<button class="btn alt" data-go="ask">💬 Ask a question</button>`;
  main.insertAdjacentHTML("beforeend",`<div class="panel" id="hmAsk" style="margin-top:14px"><b>Need a hand?</b><p class="note" style="margin:2px 0 8px">Ask about your team, orders or anything, or learn how to do something in this app.</p>
    <div class="row2">${ask}<button class="btn alt" data-go="support">❓ How do I…</button></div>
    <div class="row2" style="margin-top:6px"><button class="btn alt" data-trfull="1">👆 Take the tour</button><a class="btn alt" href="help.html" target="_blank" rel="noopener">📖 Guide</a></div></div>`);
  if(live)main.insertAdjacentElement("beforeend",live)}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{homeFix();if(view==="board"){const m=$("#main");if(m){todayFix(m);nyFix(m)}}}catch(e){}return r}}

{const st=document.createElement("style");st.textContent=`.hc-row{display:flex;align-items:stretch;border-top:1px solid var(--line)}.hc-row:first-child{border-top:0}.hc-row .lrow{min-width:0}
.hc-x{flex:0 0 44px;border:0;background:none;color:var(--muted,inherit);opacity:.7;font-size:22px;line-height:1;cursor:pointer}.hc-x:active{opacity:1}
.strip>*{position:relative}.hc-tx{position:absolute;top:4px;right:8px;font-size:18px;line-height:1;color:var(--muted);opacity:.7;cursor:pointer;padding:2px 4px}
.hc-search{margin:10px 0 4px}.hc-search .search{margin:0 0 8px}#tsRes{margin:0}`;document.head.appendChild(st)}
})();
