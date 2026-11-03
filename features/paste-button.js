/* Accounted For 4.76.6 — a Paste button under Word of Mouth post boxes. On some iPhones the phone's own Paste menu does nothing in
   a web page; this reads the clipboard directly (the phone asks "Allow Paste" once) and drops it in at the cursor. */
(()=>{
const IDS=["fdTxt","fdSlTxt"];
function add(){for(const id of IDS){const t=document.getElementById(id);if(!t||document.getElementById(id+"Pb"))continue;
  t.insertAdjacentHTML("afterend",`<button type="button" class="chip" id="${id}Pb" data-pbfor="${id}" style="cursor:pointer;margin:6px 0 2px">📋 Paste</button>`)}}
{const _rf=renderFeed;renderFeed=function(){const r=_rf.apply(this,arguments);try{add()}catch(e){}return r}}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{if(view==="feed")add()}catch(e){}return r}}
function put(t,s){const a=t.selectionStart==null?t.value.length:t.selectionStart,b=t.selectionEnd==null?a:t.selectionEnd;
  let v=t.value.slice(0,a)+s+t.value.slice(b);if(t.maxLength>0&&v.length>t.maxLength){v=v.slice(0,t.maxLength);try{toast("Cut at "+t.maxLength+" characters.")}catch(e){}}
  t.value=v;const p=Math.min(v.length,a+s.length);try{t.setSelectionRange(p,p)}catch(e){}
  t.dispatchEvent(new Event("input",{bubbles:true}))}
document.addEventListener("click",async e=>{const b=e.target.closest&&e.target.closest("[data-pbfor]");if(!b)return;e.stopImmediatePropagation();
  const t=document.getElementById(b.dataset.pbfor);if(!t)return;
  try{const s=await navigator.clipboard.readText();if(!s){toast("Nothing copied yet.");return}put(t,s);t.focus()}
  catch(err){toast("Your phone blocked it. Tap Allow Paste, or press and hold in the box and tap Paste.")}},true);
add();
})();
