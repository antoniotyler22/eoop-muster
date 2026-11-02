/* Accounted For 4.48: tapping an alert takes you to what it is about.
   - The service worker now tells the open app where to go (a message), so it works even when the address already
     ends in the same word, and "Check-ins", "Company" and "Owner" alerts no longer fall back to the recall screen.
   - The address #checkins / #owner / #invite also work while the app is already open. */
(()=>{
const OK=["recall","live","feed","board","checkins","co","owner","today","me","muster","alerts","send","cal","ask"];
function go(o,x){o=String(o||"").toLowerCase();
  /* 4.77.0: remember this tap so the screen can show what changed (features/change-focus.js) */
  try{if(typeof window.chgReveal==="function")window.chgReveal(o)}catch(e){}
  /* 4.72.2: Inbox, Talk and SOS alerts used to fall back to the recall screen */
  if(o==="dm"||o==="talk"){const b=document.querySelector(`[data-tab="${o==="dm"?"inbox":"talk"}"]`);if(b){b.click();window.scrollTo(0,0)}return}
  if(o==="sos"){if(x&&typeof window.sosRecv==="function")window.sosRecv(x);if(typeof fdPollAll==="function")fdPollAll(true);setTimeout(()=>{if(typeof window.sosShow==="function")window.sosShow(true)},1800);return}
  if(!OK.includes(o))return;
  if(o==="owner"&&!(typeof ownerOn==="function"&&ownerOn()))o="board";
  armed=null;view=o;render();window.scrollTo(0,0);if(o==="feed"&&typeof fdPollAll==="function")fdPollAll(true)}
window.openFromAlert=go;
{const h=(location.hash||"").slice(1).toLowerCase();if(h==="dm"||h==="talk"||h==="sos"||h.startsWith("sos:"))setTimeout(()=>go(h.startsWith("sos")?"sos":h),1800)}
if("serviceWorker" in navigator)navigator.serviceWorker.addEventListener("message",ev=>{const d=ev.data;if(d&&d.type==="open")go(d.open,d.sos)});
window.addEventListener("hashchange",()=>{const h=(location.hash||"").slice(1).toLowerCase();if((h==="checkins"||h==="owner")&&h!==view)go(h)});
})();
