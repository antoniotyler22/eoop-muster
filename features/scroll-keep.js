/* Accounted For: lists keep their place. When you scroll inside a list (the Invite people list, the Talk "pick people" list)
   and tap someone, the screen redraws; this puts every inner scroll box back exactly where you had it instead of snapping
   to the top. Resets when you change screens. */
(()=>{
const pos=new Map();let seenView=null;
const main=()=>document.getElementById("main");
function keyOf(el,m){if(el.id)return "#"+el.id;const same=[...m.querySelectorAll(el.tagName+(el.className&&typeof el.className==="string"?"."+el.className.trim().split(/\s+/).join("."):""))];return el.tagName+"."+el.className+"@"+same.indexOf(el)}
document.addEventListener("scroll",e=>{const t=e.target,m=main();if(!m||!t||t===document||t===window||!t.nodeType||t.nodeType!==1||!m.contains(t)||t===m)return;
  try{pos.set(keyOf(t,m),t.scrollTop)}catch(x){}},true);
function restore(){const m=main();if(!m)return;if(typeof view!=="undefined"&&view!==seenView){seenView=view;pos.clear();return}
  if(!pos.size)return;
  for(const el of m.querySelectorAll("*")){if(el.scrollHeight<=el.clientHeight+2)continue;const cs=getComputedStyle(el);if(!/auto|scroll/.test(cs.overflowY))continue;
    const k=keyOf(el,m),y=pos.get(k);if(y!=null&&Math.abs(el.scrollTop-y)>1)el.scrollTop=y}}
const start=()=>{const m=main();if(!m)return setTimeout(start,300);seenView=typeof view!=="undefined"?view:null;new MutationObserver(restore).observe(m,{childList:true,subtree:true})};
start();
})();
