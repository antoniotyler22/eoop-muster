/* Accounted For: one-tap "I'm safe" from outside the app (4.74.11).
   - iPhone: the Lock Screen / Control Center / Action button control opens  accountedfor://safe  (see native-ios/).
   - Anywhere: a link ending in  #safe  (a Shortcuts automation, an NFC tag, a home-screen bookmark) does the same.
   It checks in as On Hand through My check-in. If this phone hasn't been told which person you are, it asks first
   instead of guessing. Link opens are matched exactly: only "safe" does anything. */
(()=>{
const SCHEME=/^accountedfor:\/\/safe\/?(\?.*)?$/i;
let busy=false,last=0;
/* 4.148.0: accountedfor://safe?confirm=1 asks "Check in as On Hand?" first (an automation that fires on its own shouldn't count you
   without a look); ?pt=Main%20gate (an NFC tag at that spot) names the place in the confirmation. Both are optional. */
const qOf=u=>{try{return new URLSearchParams(String(u||"").split("?")[1]||"")}catch(e){return new URLSearchParams("")}};
async function run(q){if(busy||Date.now()-last<4000)return;
  const pt=q&&q.get&&String(q.get("pt")||"").replace(/[^\w .,'#&-]/g,"").slice(0,30);
  if(q&&q.get&&q.get("confirm")==="1"&&!confirm("Check in as On Hand"+(pt?" at "+pt:"")+"?"))return;
  busy=true;last=Date.now();
  try{if(typeof window.quickSafe!=="function")return;const r=await window.quickSafe();if(pt&&r!=="no")toast("Accounted for at "+pt);if(r==="no")toast("Nothing to check in to on this phone. Open My page or your check-in link.")}
  catch(e){toast("Couldn't check in. Open the app and try again.")}finally{busy=false}}
function fromUrl(u){return typeof u==="string"&&SCHEME.test(u.trim())}
function fromHash(){if(String(location.hash||"")==="#safe"){try{history.replaceState(null,"",location.pathname+location.search)}catch(e){}return true}return false}
window.__quickSafeUrl=fromUrl;
/* ready: wait for the roster to load before acting */
function whenReady(f){let n=0;const t=setInterval(()=>{if(window.__appReady&&typeof S==="object"&&S&&Array.isArray(S.roster)||++n>40){clearInterval(t);f()}},250)}
if(fromHash())whenReady(run);
window.addEventListener("hashchange",()=>{if(fromHash())run()});
try{const A=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.App;
  if(A&&A.addListener){A.addListener("appUrlOpen",e=>{if(e&&fromUrl(e.url))whenReady(()=>run(qOf(e.url)))});
    if(A.getLaunchUrl)A.getLaunchUrl().then(r=>{if(r&&fromUrl(r.url))whenReady(()=>run(qOf(r.url)))}).catch(()=>{})}}catch(e){}
})();
