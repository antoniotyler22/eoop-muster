/* Accounted For 4.141.0 (4.143.0: the Logbook too): each version calls Word of Mouth, and the Logbook, by its own name.
   Military keeps "Word of Mouth". Police: Roll Call Board. Jobs: Toolbox Board. HR, Civilian (schools, teams, clubs) and Custom: Bulletin Board.
   Works everywhere the name shows (tab, headings, notes, toasts, buttons) by rewriting the words on screen, so no screen has to be edited one by one.
   Logbook: Military keeps "Logbook". Police: Duty Log. Jobs: Crew Log. HR, Civilian and Custom: Sign-Out Sheet. Same screen and functions everywhere.
   S.womName / S.lbName (if someone sets one) win over the version's name. Reports and exports built outside the screen keep their own wording. */
(()=>{
const NAMES={military:"Word of Mouth",police:"Roll Call Board",jobs:"Toolbox Board",hr:"Bulletin Board",civilian:"Bulletin Board",custom:"Bulletin Board"};
const LB_NAMES={military:"Logbook",police:"Duty Log",jobs:"Crew Log",hr:"Sign-Out Sheet",civilian:"Sign-Out Sheet",custom:"Sign-Out Sheet"};
const esc2=t=>t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
/* each term: the words in the code (base), the name per version, the setting that overrides it, and the name currently on screen (last), so switching versions swaps it again */
const T=[{base:"Word of Mouth",tbl:NAMES,own:"womName",last:"Word of Mouth"},{base:"Logbook",tbl:LB_NAMES,own:"lbName",last:"Logbook"}];
function nameOf(t){const own=typeof S!=="undefined"&&S&&typeof S[t.own]==="string"?S[t.own].replace(/[\u0000-\u001f<>]/g," ").trim().slice(0,24):"";
  if(own)return own;const m=typeof S!=="undefined"&&S&&t.tbl[S.mode]?S.mode:"military";return t.tbl[m]}
const rx=t=>new RegExp(esc2(t.base)+(t.last!==t.base&&t.last!==nameOf(t)?"|"+esc2(t.last):""),"gi");
const cased=(x,n)=>x===x.toLowerCase()?n.toLowerCase():(x.length>2&&x===x.toUpperCase()?n.toUpperCase():n);
const swap=s=>{for(const t of T){const n=nameOf(t);s=s.replace(rx(t),x=>cased(x,n))}return s};
const has=s=>!!s&&T.some(t=>rx(t).test(s))&&swap(s)!==s;
const ATTR=["aria-label","placeholder","title","alt"];
function fix(root){
  if(!root)return;
  if(root.nodeType===3){if(has(root.nodeValue))root.nodeValue=swap(root.nodeValue);return}
  if(root.nodeType!==1)return;
  const tag=root.tagName;if(tag==="SCRIPT"||tag==="STYLE"||tag==="TEXTAREA")return;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT,{acceptNode:n=>{const t=n.nodeName;return t==="SCRIPT"||t==="STYLE"||t==="TEXTAREA"?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}});
  let n=root;
  do{
    if(n.nodeType===3){if(has(n.nodeValue))n.nodeValue=swap(n.nodeValue)}
    else if(n.nodeType===1)for(const a of ATTR){const v=n.getAttribute&&n.getAttribute(a);if(has(v))n.setAttribute(a,swap(v))}
  }while((n=w.nextNode()));
}
let q=false;
const idle=()=>T.every(t=>nameOf(t)===t.base&&t.last===t.base);
function sweep(){q=false;try{fix(document.body);if(has(document.title))document.title=swap(document.title);for(const t of T)t.last=nameOf(t)}catch(e){}}
function later(){if(q)return;q=true;(window.requestAnimationFrame||setTimeout)(sweep)}
function start(){
  if(typeof MutationObserver==="undefined"||!document.body)return;
  new MutationObserver(ms=>{if(idle())return;for(const m of ms){if(m.type==="characterData"){if(has(m.target.nodeValue)){later();return}}else if(m.addedNodes.length||m.type==="attributes"){later();return}}})
    .observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTR});
  later();
}
window.womName=()=>nameOf(T[0]);window.womNames=NAMES;
window.lbName=()=>nameOf(T[1]);window.lbNames=LB_NAMES;
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
