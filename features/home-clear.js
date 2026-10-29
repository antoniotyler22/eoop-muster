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
  const H=hid();const keys=new Set(I.map(hk));let ch=false;for(const k of Object.keys(H))if(!keys.has(k)){delete H[k];ch=true}if(ch)rawSave();
  const hidden=I.filter(x=>H[hk(x)]).length;const show=showHidden?I:I.filter(x=>!H[hk(x)]);
  if(!show.length){if(!I.length)return _hc.apply(this,arguments);
    return `<div class="note" style="margin:10px 4px 0;display:flex;gap:8px;align-items:center"><span style="color:var(--s-onhand);font-weight:700">● ${hidden} hidden</span><button class="chip" id="hhShow" style="cursor:pointer">Show</button></div>`}
  return `<div class="sech"><h2>Needs attention</h2><span style="display:flex;gap:6px;align-items:center"><span class="note" style="margin:0">${show.length}</span>${show.length>1?`<button class="chip" id="hhAll" style="cursor:pointer">Hide all</button>`:""}${hidden&&!showHidden?`<button class="chip" id="hhShow" style="cursor:pointer">${hidden} hidden</button>`:""}</span></div>
    <div class="card ny">${show.map(x=>`<div class="hc-row"><button class="lrow" data-go="${esc(x.go||"")}" style="flex:1;text-align:left;background:none;border:0;cursor:pointer;color:inherit;border-top:0"><span class="n tone-r">!</span><span class="t" style="flex:1">${esc(x.t)}</span></button><button class="hc-x" data-hhide="${esc(hk(x))}" aria-label="Hide" title="Hide">×</button></div>`).join("")}</div>`}}
/* ---------- Activity on Home: clear ---------- */
let armedAct=false;
if(typeof actCard==="function"){actCard=function(){const A=S.act||[];if(!A.length)return"";const n=typeof actNew==="function"?actNew():0;
  return `<div class="sech"><h2>Activity</h2><span style="display:flex;gap:6px;align-items:center"><button class="chip" id="haClear" style="cursor:pointer">${armedAct?"Tap again to clear":"Clear"}</button><button class="chip" data-go="act" style="cursor:pointer">${n?`<b style="color:var(--brass)">${n} new</b> · `:""}See all ▸</button></span></div>
    <div class="card ny">${A.slice(0,4).map((a,i)=>`<div class="hc-row"><button class="lrow" data-go="${esc(a.go||"act")}" style="flex:1;text-align:left;background:none;border:0;cursor:pointer;color:inherit;border-top:0;min-width:0"><span class="n tone-${a.t>(S.actSeen||0)?"a":"b"}">${esc(a.ic)}</span><span style="flex:1;min-width:0"><span class="t" style="display:block">${esc(a.txt)}</span><span class="s" style="display:block">${ago(a.t)}</span></span></button><button class="hc-x" data-ahide="${i}" aria-label="Remove" title="Remove">×</button></div>`).join("")}</div>`}}
function home(){if(view==="board"||view==="dash"){const y=window.scrollY;render();window.scrollTo(0,y)}}
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;
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

/* ---------- Home: Live sections up top, On the app where Live sections was; Ask + help at the bottom ---------- */
function homeFix(){const main=$("#main");if(!main||view!=="board")return;
  const live=main.querySelector('.att[data-go="live"]'),oa=main.querySelector("#oaPanel"),qa=main.querySelector(".qa");
  const spot=live?live.nextElementSibling:null;
  if(live&&qa){let after=qa;const em=main.querySelector("#v11Em");if(em&&(qa.compareDocumentPosition(em)&Node.DOCUMENT_POSITION_FOLLOWING))after=em;after.insertAdjacentElement("afterend",live)}
  if(oa){const anchor=spot&&spot.isConnected?spot:main.querySelector("details.card");if(anchor&&anchor!==oa)anchor.insertAdjacentElement("beforebegin",oa)}
  if(main.querySelector("#hmAsk"))return;const ask=typeof akHidden==="function"&&akHidden()?"":`<button class="btn alt" data-go="ask">💬 Ask a question</button>`;
  main.insertAdjacentHTML("beforeend",`<div class="panel" id="hmAsk" style="margin-top:14px"><b>Need a hand?</b><p class="note" style="margin:2px 0 8px">Ask about your team, orders or anything, or learn how to do something in this app.</p>
    <div class="row2">${ask}<button class="btn alt" data-go="support">❓ How do I…</button></div>
    <div class="row2" style="margin-top:6px"><button class="btn alt" data-trfull="1">👆 Take the tour</button><a class="btn alt" href="help.html" target="_blank" rel="noopener">📖 Guide</a></div></div>`)}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{homeFix()}catch(e){}return r}}

{const st=document.createElement("style");st.textContent=`.hc-row{display:flex;align-items:stretch;border-top:1px solid var(--line)}.hc-row:first-child{border-top:0}.hc-row .lrow{min-width:0}
.hc-x{flex:0 0 44px;border:0;background:none;color:var(--muted,inherit);opacity:.7;font-size:22px;line-height:1;cursor:pointer}.hc-x:active{opacity:1}
.hc-search{margin:10px 0 4px}.hc-search .search{margin:0 0 8px}#tsRes{margin:0}`;document.head.appendChild(st)}
})();
