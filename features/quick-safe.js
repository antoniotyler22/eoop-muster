/* Accounted For: one-tap "I'm safe" from outside the app (4.74.11).
   - iPhone: the Lock Screen / Control Center / Action button control opens  accountedfor://safe  (see native-ios/).
   - Anywhere: a link ending in  #safe  (a Shortcuts automation, an NFC tag, a home-screen bookmark) does the same.
   It checks in as On Hand through My check-in. If this phone hasn't been told which person you are, it asks first
   instead of guessing. Link opens are matched exactly: only "safe" does anything. */
(()=>{
const SCHEME=/^accountedfor:\/\/safe\/?(\?.*)?$/i;
let busy=false,last=0;
async function run(){if(busy||Date.now()-last<4000)return;busy=true;last=Date.now();
  try{if(typeof window.quickSafe!=="function")return;const r=await window.quickSafe();if(r==="no")toast("Nothing to check in to on this phone. Open My page or your check-in link.")}
  catch(e){toast("Couldn't check in. Open the app and try again.")}finally{busy=false}}
function fromUrl(u){return typeof u==="string"&&SCHEME.test(u.trim())}
function fromHash(){if(String(location.hash||"")==="#safe"){try{history.replaceState(null,"",location.pathname+location.search)}catch(e){}return true}return false}
window.__quickSafeUrl=fromUrl;
/* ready: wait for the roster to load before acting */
function whenReady(f){let n=0;const t=setInterval(()=>{if(window.__appReady&&typeof S==="object"&&S&&Array.isArray(S.roster)||++n>40){clearInterval(t);f()}},250)}
if(fromHash())whenReady(run);
window.addEventListener("hashchange",()=>{if(fromHash())run()});
try{const A=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.App;
  if(A&&A.addListener){A.addListener("appUrlOpen",e=>{if(e&&fromUrl(e.url))whenReady(run)});
    if(A.getLaunchUrl)A.getLaunchUrl().then(r=>{if(r&&fromUrl(r.url))whenReady(run)}).catch(()=>{})}}catch(e){}
})();
