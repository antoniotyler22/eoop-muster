/* Accounted For 4.141.0: each version calls Word of Mouth by its own name.
   Military keeps "Word of Mouth". Police: Roll Call Board. Jobs: Toolbox Board. HR, Civilian (schools, teams, clubs) and Custom: Bulletin Board.
   Works everywhere the name shows (tab, headings, notes, toasts, buttons) by rewriting the words on screen, so no screen has to be edited one by one.
   S.womName (if someone sets one) wins over the version's name. Reports and exports built outside the screen keep their own wording. */
(()=>{
const NAMES={military:"Word of Mouth",police:"Roll Call Board",jobs:"Toolbox Board",hr:"Bulletin Board",civilian:"Bulletin Board",custom:"Bulletin Board"};
const esc2=t=>t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
let last="Word of Mouth"; /* the name currently on screen, so switching versions swaps it again */
const rx=()=>new RegExp("word of mouth"+(last!=="Word of Mouth"&&last!==womName()?"|"+esc2(last):""),"gi");
function womName(){const own=typeof S!=="undefined"&&S&&typeof S.womName==="string"?S.womName.replace(/[\u0000-\u001f<>]/g," ").trim().slice(0,24):"";
  if(own)return own;const m=typeof S!=="undefined"&&S&&NAMES[S.mode]?S.mode:"military";return NAMES[m]}
const swap=s=>{const n=womName();return s.replace(rx(),x=>x===x.toLowerCase()?n.toLowerCase():n)};
const has=s=>!!s&&rx().test(s)&&swap(s)!==s;
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
function sweep(){q=false;try{fix(document.body);if(has(document.title))document.title=swap(document.title);last=womName()}catch(e){}}
function later(){if(q)return;q=true;(window.requestAnimationFrame||setTimeout)(sweep)}
function start(){
  if(typeof MutationObserver==="undefined"||!document.body)return;
  new MutationObserver(ms=>{if(womName()==="Word of Mouth"&&last==="Word of Mouth")return;for(const m of ms){if(m.type==="characterData"){if(has(m.target.nodeValue)){later();return}}else if(m.addedNodes.length||m.type==="attributes"){later();return}}})
    .observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTR});
  later();
}
window.womName=womName;window.womNames=NAMES;
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
