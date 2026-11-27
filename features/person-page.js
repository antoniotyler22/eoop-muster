/* Accounted For 4.111.0 — the person page (People → a name) in the My Page look: ring photo, stat numbers, status line,
   five action circles (Call, Text, Message, Status, Their page) and three tabs (Plan, Details, More). Same controls as
   before, regrouped; nothing was removed. */
(()=>{
let pgTab="plan",pgFor="";
const digestOf=m=>{try{const f=typeof mpDigest==="function"?mpDigest:(window.__v12&&window.__v12.mpDigest);return f?f(m):null}catch(e){return null}};
const ini=m=>{const raw=String(m.name||"").trim();if(raw.includes(",")){const [l,f]=raw.split(",");return ((f||"").trim().charAt(0)+l.trim().charAt(0)).toUpperCase()||"?"}return (raw.charAt(0)||"?").toUpperCase()};
const nm=m=>(m.rank?String(m.rank).toUpperCase()+" ":"")+String(m.name||"").split(",")[0].trim().toLowerCase().replace(/(^|\s|-)\S/g,c=>c.toUpperCase());
const GROUP={"Dates":"det","Due-outs":"plan","Duty":"plan","Calendar":"plan"};
function restyle(){const m=S.roster.find(x=>x.id===pid);const main=document.getElementById("main");if(!m||!main||main.querySelector(".pg-head"))return;
  if(pgFor!==pid){pgFor=pid;pgTab="plan"}
  const kids=[...main.children];const sh=kids.find(e=>e.classList&&e.classList.contains("sechead"));if(!sh)return;
  let cur="det",seen=false;const G={plan:[],det:[],more:[]};
  for(const e of kids){if(e===sh||e.tagName==="BUTTON"&&!seen&&e.classList.contains("chip"))continue;
    if(e.nextElementSibling===null&&false)continue;
    if(e.classList.contains("note")&&e.previousElementSibling===sh)continue;
    if(e.tagName==="H2"){seen=true;const t=e.textContent.trim();const k=Object.keys(GROUP).find(x=>t.startsWith(x));cur=k?GROUP[k]:"more"}
    G[cur].push(e)}
  const D=digestOf(m)||{};
  const over=(D.due||[]).filter(x=>x.st==="over").length,duty=(D.duties||[]).length,up=(D.cal||[]).length+(D.events||[]).length;
  const dot=`<i style="background:var(${(typeof SVAR==="object"&&SVAR[m.status])||"--line"})"></i>`;
  const stl=`<div class="mp-st">${dot}${esc(m.status||"")}${D.duty&&D.duty!=="Full Duty"?` · <b class="mp-warn">${esc(D.duty)}</b>`:" · Full duty"}</div>`;
  const c=(n,l)=>`<div><b>${n}</b><span>${l}</span></div>`;
  const h=(ic,l,k)=>`<button type="button" class="mp-hl" data-pgc="${k}"><span class="mp-hc">${svg(ic,24)}</span><span>${l}</span></button>`;
  const html=`<section class="mp-head pg-head" aria-label="Person"><div class="mp-top"><span class="mp-eye">${esc(String(m.sec||"")+(typeof SECNAME!=="undefined"&&SECNAME[m.sec]?" · "+SECNAME[m.sec]:""))}</span></div>
    <div class="mp-prof"><div class="mp-av"><div class="mp-ring">${(p=>p?`<img src="${esc(p)}" alt="" class="mp-face">`:`<span class="mp-face">${esc(ini(m))}</span>`)(window.afPhoto&&window.afPhoto((m.rank+" "+lastOf(m)).trim()))}</div></div><div class="mp-stats">${c(over,"Overdue")}${c(duty,"Duty")}${c(up,"Upcoming")}</div></div>
    <div class="mp-name">${esc(nm(m))}</div>${stl}
    <div class="mp-hls">${h("recall","Call","call")}${h("text","Text","text")}${h("feed","Message","msg")}${h("muster","Status","status")}${h("me","My page","page")}</div></section>
    <div class="mp-tabs" role="tablist">${[["plan","Plan","log"],["det","Details","people"],["more","More","tools"]].map(([k,l,ic])=>`<button type="button" role="tab" aria-selected="${pgTab===k}" data-pgtab="${k}">${svg(ic,20)}${l}</button>`).join("")}</div>`;
  const back=kids.find(e=>e.classList&&e.classList.contains("chip"));
  sh.style.display="none";const nt=sh.nextElementSibling;if(nt&&nt.classList.contains("note"))nt.style.display="none";
  (back||sh).insertAdjacentHTML(back?"afterend":"beforebegin",html);
  for(const k of Object.keys(G))for(const e of G[k]){e.setAttribute("data-pgt",k);if(k!==pgTab)e.style.display="none"}}
if(typeof renderPerson==="function"){const _rp=renderPerson;renderPerson=function(){const r=_rp.apply(this,arguments);try{restyle()}catch(e){}return r}}
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;
  const tb=t.closest("[data-pgtab]");if(tb&&view==="p"){pgTab=tb.dataset.pgtab;const y=window.scrollY;renderPerson();window.scrollTo(0,y);return}
  const c=t.closest("[data-pgc]");if(!c||view!=="p")return;const k=c.dataset.pgc;
  const go=sel=>{const el=document.querySelector(sel);if(el)el.click();return !!el};
  if(k==="msg"){go("#v12PMsg");return}if(k==="page"){go("#v12PView");return}
  if(k==="call"||k==="text"){const a=document.querySelector(`#main a[href^="${k==="call"?"tel:":"sms:"}"]`);if(a){a.click();return}pgTab="det";renderPerson();toast("Add a phone number first.");return}
  if(k==="status"){pgTab="det";renderPerson();const el=document.querySelector("#main [data-pgt='det']:nth-of-type(2)")||document.querySelector("#main [data-pgt='det']");if(el&&el.scrollIntoView)el.scrollIntoView({block:"start"});return}});
})();
