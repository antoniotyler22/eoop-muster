/* Accounted For 4.40: section tiles on Home show how the morning is going.
   ✓ All in (green glow): everyone expected in that section has checked in today (people away don't count against it).
   ⏰ N late (amber, pulsing): the check-in cutoff has passed and N in that section haven't checked in.
   The cutoff is the live recall's deadline when one is running, otherwise 08:00 (S.ckCut "HH:MM" changes it).
   Leader phones only; members never see these tiles. Tap a tile as before to open the section. */
(()=>{
const leader=()=>!(typeof memberMode==="function"&&memberMode())&&S.source!=="sample"&&Array.isArray(S.roster)&&S.roster.length>0;
function cutoff(){try{const E=S.rc&&S.rc.esc;if(E&&E.due&&S.rc.open)return +E.due}catch(e){}
  const m=String(S.ckCut||"08:00").match(/^(\d{1,2}):(\d{2})$/);const d=new Date();d.setHours(m?+m[1]:8,m?+m[2]:0,0,0);return d.getTime()}
window.secStatus=function(k){if(typeof ckMissing!=="function")return null;const s=ckMissing();const miss=s.miss.filter(m=>m.sec===k),done=s.done.filter(m=>m.sec===k);
  if(!miss.length&&done.length)return {st:"in",n:done.length};
  if(miss.length&&Date.now()>=cutoff()&&done.length+miss.length>0)return {st:"late",n:miss.length};
  return {st:"",n:miss.length}};
{const _rb=renderBoard;renderBoard=function(){const r=_rb.apply(this,arguments);try{
  if(!leader())return r;
  for(const [k] of SECTIONS){const g=[...document.querySelectorAll("#main .sgrid button")].find(x=>x.dataset.go===k.toLowerCase());if(!g)continue;
    const z=secStatus(k);if(!z||!z.st)continue;g.classList.add("sg-"+z.st);
    g.insertAdjacentHTML("beforeend",`<small class="sgst">${z.st==="in"?"✓ All in":"⏰ "+z.n+" late"}</small>`);
    g.setAttribute("aria-label",(g.getAttribute("aria-label")||k)+(z.st==="in"?", everyone accounted for":", "+z.n+" late"))}
  }catch(e){}return r}}
{const st=document.createElement("style");st.textContent=`.sgrid button.sg-in{background:rgba(46,229,157,.16);box-shadow:0 0 0 1.5px var(--s-onhand,#2ee59d) inset,0 0 14px rgba(46,229,157,.35)}
.sgrid button.sg-late{background:rgba(255,176,32,.16);box-shadow:0 0 0 1.5px var(--warn,#ffb020) inset;animation:sgLate 1.8s ease-in-out infinite}
.sgst{display:block;font-size:10px;font-weight:800;margin-top:1px}.sg-in .sgst{color:var(--s-onhand,#13875a)}.sg-late .sgst{color:var(--warn,#b26b00)}
@keyframes sgLate{50%{box-shadow:0 0 0 1.5px var(--warn,#ffb020) inset,0 0 16px rgba(255,176,32,.55)}}@media(prefers-reduced-motion:reduce){.sgrid button.sg-late{animation:none}}`;document.head.appendChild(st)}
})();
