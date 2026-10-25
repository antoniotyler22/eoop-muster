/* Accounted For 1.3 — green "new" dots.
   Anything new in this version gets a small green dot beside it. The dot goes away for good once the person taps
   that item (remembered on this phone), and all dots retire on their own 45 days after this phone first shows them.
   To mark something new in a later version, add a line to NEW: [key, where the dot goes, what counts as "opened it"]. */
(()=>{
const NEW=[
  ["integ",  ".tgrid [data-go='integ'] b",          "[data-go='integ']"],
  ["pdf",    ".tgrid [data-pdf-report] b",          "[data-pdf-report]"],
  ["pdf",    "button.btn[data-pdf-report]",         "[data-pdf-report]"],
  ["logins", ".tgrid [data-go='logins'] b",         "[data-go='logins']"],
  ["dms",    ".tgrid [data-go='dms'] b",            "[data-go='dms']"],
  ["pages",  ".tgrid [data-go='pages'] b",          "[data-go='pages']"],
  ["dash",   ".tgrid [data-go='dash'] b",           "[data-go='dash']"],
  ["esc",    ".esc-panel > b",                      ".esc-panel"],
  ["rp",     ".rp-panel > summary > b",             ".rp-panel"],
  ["sms",    "button[data-sms-all]",                "[data-sms-all]"],
  ["crash",  "label:has(#crashTog)",                "#crashTog"],
  ["acct",   "#v13Hdr",                             "#v13Hdr"],
  ["dueclr", "#dueAckAll, .alist .rrow:first-child .dueacts [data-dueack]", "[data-dueack],[data-duedel],#dueAckAll"],
  ["alclr",  ".alist .arow:first-child .dueacts > :first-child", "[data-alback],[data-algone],[data-alhide]"],
  ["calclr", ".alist .rrow:first-child .dueacts > :first-child:not([data-dueack])", "[data-cxdone],[data-cxdue],[data-cxback],[data-cxhide]"],
];
const LIFE=45*864e5;
const seen=()=>{S.newSeen=S.newSeen||{};return S.newSeen};
function retired(){if(!S.newFrom){S.newFrom=Date.now();save()}return Date.now()-S.newFrom>LIFE}
function paint(){if(typeof S!=="object"||!S||retired())return;const s=seen();
  for(const [k,where] of NEW){if(s[k])continue;
    let els=[];try{els=document.querySelectorAll(where)}catch(e){continue}
    els.forEach(el=>{if(el.querySelector(":scope > .newdot"))return;
      el.insertAdjacentHTML("beforeend",`<span class="newdot" data-newdot="${k}" role="img" aria-label="New" title="New"></span>`)})}}
function clear(k){seen()[k]=1;save();document.querySelectorAll(`.newdot[data-newdot="${k}"]`).forEach(d=>d.remove())}
document.addEventListener("click",e=>{const t=e.target;if(!t||!t.closest||typeof S!=="object")return;const s=seen();
  for(const [k,,zone] of NEW){if(!s[k]&&t.closest(zone))clear(k)}},true);
let q=0;new MutationObserver(()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;try{paint()}catch(e){}})}).observe(document.body,{childList:true,subtree:true});
setTimeout(()=>{try{paint()}catch(e){}},500);
window.__newDots={NEW,paint,clear};
})();
