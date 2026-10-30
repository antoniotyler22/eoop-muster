/* Accounted For 4.48: tapping an alert takes you to what it is about.
   - The service worker now tells the open app where to go (a message), so it works even when the address already
     ends in the same word, and "Check-ins", "Company" and "Owner" alerts no longer fall back to the recall screen.
   - The address #checkins / #owner / #invite also work while the app is already open. */
(()=>{
const OK=["recall","live","feed","board","checkins","co","owner","today","me","muster","alerts","send","cal","ask"];
function go(o){o=String(o||"").toLowerCase();if(!OK.includes(o))return;
  if(o==="owner"&&!(typeof ownerOn==="function"&&ownerOn()))o="board";
  armed=null;view=o;render();window.scrollTo(0,0);if(o==="feed"&&typeof fdPollAll==="function")fdPollAll(true)}
window.openFromAlert=go;
if("serviceWorker" in navigator)navigator.serviceWorker.addEventListener("message",ev=>{const d=ev.data;if(d&&d.type==="open")go(d.open)});
window.addEventListener("hashchange",()=>{const h=(location.hash||"").slice(1).toLowerCase();if((h==="checkins"||h==="owner")&&h!==view)go(h)});
})();
