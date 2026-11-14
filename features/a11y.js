/* 4.103.0 Accessibility pass: check-in, SOS, chat and the rest of the app.
   - Every search box / field gets a spoken name (from its placeholder).
   - Small buttons get a bigger tap area without moving anything on screen (44 px).
   - Sheets and the SOS alert: focus moves in, Tab stays inside, Esc closes, focus goes back.
   - Chat: each message says who sent it and when; the Chat/Feed/Inbox switch works with arrow keys.
   - Reduced-motion setting turns off animation everywhere. Keyboard focus ring is always visible.
   Runs last, only adds attributes and listeners; nothing here changes data. */
(function(){
"use strict";
const $=(s,r)=>(r||document).querySelector(s),$$=(s,r)=>Array.from((r||document).querySelectorAll(s));

/* ---------- styles ---------- */
const css=`
:where(button,a[href],input,select,textarea,[role=tab],[tabindex]):focus-visible{outline:2px solid var(--brass,#b8860b);outline-offset:2px}
.a11y-hit{position:relative}
.a11y-hit::after{content:"";position:absolute;left:-6px;right:-6px;top:50%;height:max(100%,44px);transform:translateY(-50%);min-width:44px}
#sosOv .sos-b,#sosOv .sos-x,.sos-k{min-height:44px}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}
.a11y-sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`;
const st=document.createElement("style");st.id="a11yCss";st.textContent=css;document.head.appendChild(st);

/* ---------- names for fields and buttons ---------- */
const HIT="#hHelp,#hSearch,#hSet,.chip,.ch-seg button,.sos-k,#fmPill,.sec-f button,[data-secf],.cal-nav button,a[href^='tel:'],a[href^='sms:']";
function label(){
  $$("input:not([type=hidden]):not([type=file]),textarea,select").forEach(i=>{
    if(i.getAttribute("aria-label")||i.getAttribute("aria-labelledby")||i.closest("label")||(i.id&&document.querySelector('label[for="'+i.id+'"]')))return;
    const t=i.getAttribute("title")||i.getAttribute("placeholder")||i.name||"";
    if(t)i.setAttribute("aria-label",t.replace(/https?:\/\/\S+/g,"link").trim().slice(0,80))});
  $$("button,[role=button]").forEach(b=>{
    if(b.getAttribute("aria-label")||b.textContent.trim()||b.querySelector("img[alt]:not([alt=''])"))return;
    if(b.id==="fdPill")b.setAttribute("aria-label","Show new posts");
    else if(b.title)b.setAttribute("aria-label",b.title)});
  /* a hint: icon-only text like "➤" or "×" with no name */
  $$("button").forEach(b=>{if(!b.getAttribute("aria-label")&&/^[\s➤×✕✖+\-↑↓←→‹›«»▸◂]+$/.test(b.textContent)){const m={"×":"Close","✕":"Close","✖":"Close","+":"Add","➤":"Send","▸":"Next","◂":"Back","‹":"Previous","›":"Next"}[b.textContent.trim()];if(m)b.setAttribute("aria-label",m)}});
  $$(HIT).forEach(e=>{if(!e.classList.contains("a11y-hit")&&!e.closest("[hidden]"))e.classList.add("a11y-hit")});
}

/* ---------- chat: who said it ---------- */
function chat(){
  const L=$("#chList");if(!L)return;
  let who="";
  $$(".ch-row",L).forEach(r=>{
    const n=$(".ch-n",r),me=r.classList.contains("me");
    if(me)who="You";else if(n)who=n.textContent.trim();
    const t=$("time",r);if(!who||r.dataset.a11y===who)return;
    r.dataset.a11y=who;r.setAttribute("role","group");r.setAttribute("aria-label",who+(t?" at "+t.textContent.trim():""))});
}

/* ---------- arrow keys on tab rows (Chat | Feed | Inbox | Official | Voice) ---------- */
document.addEventListener("keydown",e=>{
  const t=e.target;if(!t||!t.closest||t.getAttribute("role")!=="tab")return;
  const k=e.key;if(!["ArrowRight","ArrowLeft","Home","End"].includes(k))return;
  const row=$$('[role=tab]',t.closest("[role=tablist]")||document);const i=row.indexOf(t);if(i<0)return;
  const j=k==="Home"?0:k==="End"?row.length-1:(i+(k==="ArrowRight"?1:-1)+row.length)%row.length;
  e.preventDefault();row[j].focus();row[j].click()});
function tabs(){$$("[role=tab]").forEach(t=>t.setAttribute("tabindex",t.getAttribute("aria-selected")==="true"?"0":"-1"))}

/* ---------- dialogs: focus in, trap, Esc, focus back ---------- */
let back=null,openEl=null;
const FOC='a[href],button:not([disabled]),input:not([type=hidden]):not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
const vis=e=>!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length);
function dlg(){const s=$("#sheet");if(s&&!s.hidden)return $(".sheet-panel",s);return $("#sosOv")}
function sync(){
  const d=dlg();
  if(d&&d!==openEl){openEl=d;if(!back||!document.contains(back))back=document.activeElement&&document.activeElement!==document.body?document.activeElement:null;
    setTimeout(()=>{if(openEl!==d)return;const f=$$(FOC,d).filter(vis);const target=f.find(x=>x.matches("input,textarea,select,[data-apd-tab]"))||f[0];
      if(!d.hasAttribute("tabindex"))d.setAttribute("tabindex","-1");(target||d).focus({preventScroll:true})},60);
    const main=$("#main"),tb=$("#tabbar");[main,tb].forEach(x=>{if(x)x.setAttribute("aria-hidden","true")})}
  else if(!d&&openEl){openEl=null;[$("#main"),$("#tabbar")].forEach(x=>{if(x)x.removeAttribute("aria-hidden")});
    const b=back;back=null;if(b&&document.contains(b))try{b.focus({preventScroll:true})}catch(e){}}
}
document.addEventListener("keydown",e=>{
  const d=dlg();if(!d)return;
  if(e.key==="Escape"){const x=$("#sosClose");if(d.id==="sosOv"&&x){e.preventDefault();x.click()}return}
  if(e.key!=="Tab")return;
  const f=$$(FOC,d).filter(vis);if(!f.length){e.preventDefault();return}
  const a=document.activeElement,first=f[0],last=f[f.length-1];
  if(!d.contains(a)){e.preventDefault();first.focus()}
  else if(e.shiftKey&&a===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&a===last){e.preventDefault();first.focus()}});

/* ---------- run after the screen changes ---------- */
let q=0;
function run(){q=0;try{label();chat();tabs();sync()}catch(e){}}
function later(){if(!q)q=requestAnimationFrame(run)}
new MutationObserver(later).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden","aria-selected"]});
window.a11yRun=run;
later();
})();
