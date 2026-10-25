/* Accounted For 1.3 — Crash reports.
   When a script error happens, send the error text and the code location to the server (setup part 21) so it
   can be fixed. Never sent: roster, names, numbers, messages or anything typed. Text inside quotes is blanked out
   here, and the server blanks anything that looks like a phone number or email. Turn off in Data and settings. */
(()=>{
const sent=new Set();let n=0;
const plat=()=>window.MBN&&MBN.on?String(MBN.platform||"app"):"web";
const dev=()=>{try{let d=localStorage.getItem("af-dev");if(!d){d=rndId(24);localStorage.setItem("af-dev",d)}return d}catch(e){return "nostore"}};
function clean(t,max){return String(t||"").replace(/"[^"\n]{0,400}"|'[^'\n]{0,400}'|`[^`]{0,400}`/g,'"…"').replace(/https?:\/\/[^\s)]+\/([^/\s)?#]+)(\?[^\s):]*)?/g,"$1").slice(0,max)}
function report(kind,msg,stack){
  try{if(S&&S.crashOff)return}catch(e){}
  if(!window.SB||!SB.rpc||n>=5)return;
  const m=clean(msg,200);if(!m||/^Script error\.?$/i.test(m)||/ResizeObserver loop/i.test(m))return;
  const key=m+"|"+(String(stack||"").slice(0,80));if(sent.has(key))return;sent.add(key);n++;
  SB.rpc("err_report",{p_kind:kind,p_msg:m,p_stack:clean(stack,900),p_ver:String(window.AV||""),p_plat:plat(),p_dev:dev()}).catch(()=>{})}
window.addEventListener("error",e=>{if(e&&e.error)report("error",e.message||String(e.error),e.error&&e.error.stack)});
window.addEventListener("unhandledrejection",e=>{const r=e&&e.reason;if(!r||!(r instanceof Error))return;
  if(/abort|network|fetch|load failed|timed? ?out/i.test(r.name+" "+r.message))return; /* no signal isn't a bug */
  report("promise",r.message,r.stack)});
window.__crashReport=report;

/* Data and settings: on/off switch */
const _rd=renderData;
renderData=function(){_rd.apply(this,arguments);const main=$("#main");if(!main||$("#crashTog"))return;
  main.insertAdjacentHTML("beforeend",`<h2>Crash reports</h2><div class="panel"><label class="tog"><input type="checkbox" id="crashTog"${S.crashOff?"":" checked"}> Send crash reports</label><p class="note">If the app hits an error it sends only the error text and where in the code it happened. Never your roster, names, numbers or messages.</p></div>`)};
document.addEventListener("change",e=>{if(e.target&&e.target.id==="crashTog"){S.crashOff=!e.target.checked;save();toast(S.crashOff?"Crash reports off":"Crash reports on")}});

if(typeof SC==="object"&&Array.isArray(SC))SC.push({k:"crash",n:"1.3: crash reports",f:["21_crash_reports"],t:[["err_report",{p_kind:"test",p_msg:"",p_stack:"",p_ver:"",p_plat:"",p_dev:"x"}]]});
})();
