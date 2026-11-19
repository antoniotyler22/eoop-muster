/* Accounted For 4.127.0: every team has a name.
   The team's name shows on invites, join screens, check-in links and texts, so a blank name left people guessing which
   team they were joining. When the owner's phone opens (or comes back) on a team with no name, a "Name your team"
   screen covers the app until a name is saved. It has no close button and Escape doesn't dismiss it.
   Clearing the name later isn't allowed either: the old name is kept.
   Only owner phones are asked; linked and member phones show the name the owner set. */
(()=>{
const real=()=>S.source!=="sample"&&Array.isArray(S.roster)&&S.roster.length>0;
const owner=()=>typeof isOwner==="function"&&isOwner()&&!(typeof memberMode==="function"&&memberMode());
const named=()=>!!(typeof cleanName==="function"?cleanName(S.unit):String(S.unit||"").trim());
function need(){try{return owner()&&real()&&S.onb&&!named()}catch(e){return false}}
window.teamNeedsName=need;
function css(){if(document.getElementById("tnCss"))return;const st=document.createElement("style");st.id="tnCss";
  st.textContent=`#tnWrap{position:fixed;inset:0;z-index:70;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:calc(20px + env(safe-area-inset-top,0px)) 16px calc(20px + env(safe-area-inset-bottom,0px));overflow:auto}
#tnWrap .tn-card{width:100%;max-width:440px;display:flex;flex-direction:column;gap:12px}
#tnWrap h1{font-size:26px;font-weight:800;margin:0;letter-spacing:-.02em}#tnWrap input{width:100%;padding:12px;font-size:17px;border:1px solid var(--line);border-radius:12px;background:var(--surface,#fff);color:var(--ink)}
body.tn-open{overflow:hidden}`;document.head.appendChild(st)}
function show(){if(!need()){hide();return}css();let w=document.getElementById("tnWrap");if(w)return;
  w=document.createElement("div");w.id="tnWrap";w.setAttribute("role","dialog");w.setAttribute("aria-modal","true");w.setAttribute("aria-labelledby","tnH");
  w.innerHTML=`<div class="tn-card"><h1 id="tnH">Name your team</h1>
    <p class="note" style="margin:0">Everyone sees this name when they join, on invites and on check-in texts. You can change it later, but it can't be blank.</p>
    <label for="tnIn" class="note" style="margin:0;font-weight:700">Team name</label>
    <input id="tnIn" type="text" maxlength="40" autocomplete="organization" placeholder="Alpha Company, 2nd Shift, Lincoln Elem…">
    <button class="btn" id="tnSave" disabled>Save team name</button><p class="note" id="tnOut" role="status" style="margin:0"></p></div>`;
  document.body.appendChild(w);document.body.classList.add("tn-open");setTimeout(()=>{const i=document.getElementById("tnIn");if(i)i.focus()},50)}
function hide(){const w=document.getElementById("tnWrap");if(w)w.remove();document.body.classList.remove("tn-open")}
window.teamNamePrompt=show;
function saveName(){const i=document.getElementById("tnIn");const v=typeof cleanName==="function"?cleanName(i&&i.value):String(i&&i.value||"").trim();
  if(!v){const o=document.getElementById("tnOut");if(o)o.textContent="Type a name for your team.";return}
  S.unit=v.slice(0,40);last=S.unit;save();hide();try{if(typeof paintTitle==="function")paintTitle()}catch(e){}render();toast("Team name saved: "+S.unit)}
document.addEventListener("input",e=>{if(e.target&&e.target.id==="tnIn"){const b=document.getElementById("tnSave");if(b)b.disabled=!String(e.target.value||"").trim()}});
document.addEventListener("click",e=>{if(e.target&&e.target.closest&&e.target.closest("#tnSave")){e.stopImmediatePropagation();saveName()}},true);
document.addEventListener("keydown",e=>{const w=document.getElementById("tnWrap");if(!w)return;
  if(e.key==="Escape"){e.preventDefault();e.stopImmediatePropagation();return}
  if(e.key==="Enter"&&e.target&&e.target.id==="tnIn"){e.preventDefault();saveName();return}
  if(e.key==="Tab"){const f=[...w.querySelectorAll("input,button:not([disabled])")];if(!f.length)return;const i=f.indexOf(document.activeElement);
    if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus()}}},true);
/* a name, once set, can't be cleared */
let last=named()?S.unit:"";
{const _s=save;save=function(){try{if(named())last=S.unit;else if(last&&owner()&&real()){S.unit=last;setTimeout(()=>toast("Your team needs a name, so the old one was kept."),0)}}catch(e){}return _s.apply(this,arguments)}}
/* on open, and on coming back to the app */
setTimeout(show,900);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)setTimeout(show,300)});
})();
