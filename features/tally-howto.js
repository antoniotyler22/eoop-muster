/* Accounted For 4.134.0: Tally answers "how do I do this in the app?" questions.
   A question that mentions the app's own screens, buttons or features goes to the app-help assistant (the same one as
   Help & support, which knows the app's guide) and the answer shows right under the Ask box. Other questions still go to
   official sources as before. A small "How do I use the app?" button sends any question to app help. No push alerts. */
(()=>{
const TERMS=/\b(the app|this app|accounted for|tally|button|tap|screen|tab|tools?|settings|my page|word of mouth|official channel|chat|inbox|roster|invite|login|log in|sign in|sign-in|sign up|password|username|join code|team code|code|google|apple|notification|alerts?|talk|muster app|import|drop a roster|profile|photo|pro\b|subscription|trial|qr|widget|offline|no signal|owner|co-?leader|section leader|member|link|account|add (a )?person|remove (a )?person|delete|change my|edit my)\b/i;
const HOW=/\b(how (do|can|would|should) (i|we|you)|how to|where (do|can|is|are)|where's|what does|what is the|can i|why (can't|cannot|won't|doesn't|isn't)|help me)\b/i;
let busy=false,res=null;
const fmt=t=>esc(t).replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>").replace(/\n/g,"<br>");
const box=()=>document.getElementById("akQ");
function show(){let p=document.getElementById("tlyHow");const host=document.getElementById("mpAsk")||(box()&&box().closest(".panel"));if(!host)return;
  if(!res&&!busy){if(p)p.remove();return}
  const h=`<div class="panel" id="tlyHow" style="margin-top:10px"><div class="note" style="margin:0;font-weight:800">${esc(res&&res.q||"")}</div>${busy?`<div class="note">Tally is looking it up…</div>`:`<div style="line-height:1.5;margin-top:4px">${fmt(res.a)}</div><div class="note" style="margin-top:6px">Tally can be wrong. Check anything important.</div>`}</div>`;
  if(p)p.outerHTML=h;else host.insertAdjacentHTML("afterend",h)}
async function ask(q){if(busy)return;busy=true;res={q,a:""};show();let a="";
  try{const r=await fetch(SB.url+"/functions/v1/"+(SB.afn||"ask"),{method:"POST",headers:{apikey:SB.key,"Content-Type":"application/json"},body:JSON.stringify({support:1,q,dev:(S.dev=S.dev||rndId(24)),mode:MODES[S.mode]?S.mode:"military",hist:[],leader:typeof leaderHere==="function"?leaderHere():false,member:!!S.me})});
    const o=await r.json().catch(()=>({}));if(r.ok&&o&&o.answer)a=String(o.answer).slice(0,4000);else if(o&&o.error)a=String(o.error)}catch(e){}
  res.a=a||"I couldn't reach help right now. Open Tools → Help, or email administration@accountedforteam.com.";busy=false;show()}
document.addEventListener("click",e=>{const t=e.target;if(!t||!t.closest)return;
  if(t.closest("#tlyApp")){e.stopImmediatePropagation();const q=(box()||{}).value||"";if(q.trim().length<3){toast("Type your question first");return}ask(q.trim().slice(0,600));return}
  if(t.closest("#akGo")){const q=((box()||{}).value||"").trim();if(q.length>=3&&HOW.test(q)&&TERMS.test(q)){e.stopImmediatePropagation();e.preventDefault();ask(q.slice(0,600))}}},true);
/* a second button under Ask on My page and on the Ask screen */
function addBtn(){const g=document.getElementById("akGo");if(g&&!document.getElementById("tlyApp"))g.insertAdjacentHTML("afterend",`<button class="btn alt" id="tlyApp" style="width:100%;margin-top:6px">How do I use the app?</button>`)}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{addBtn();if(res&&!document.getElementById("tlyHow"))show()}catch(e){}return r}}
})();
