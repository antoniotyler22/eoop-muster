/* Accounted For 1.3 — Rally point check-in.
   On a recall, the leader can set a rally point (their current spot) and a radius. The check-in link then carries
   the rally point; each person can add "AT RP" or their distance to it with one tap. Their location never leaves
   their phone: only the distance (as a short note) is sent. Needs nothing on the server. */
(()=>{
const R=[100,250,500,1000,5000];
const lbl=r=>r>=1000?(r/1000)+" km":r+" m";
function rpHTML(){const rc=S.rc;if(!rc.open)return "";const rp=rc.rp;
  return `<details class="panel rp-panel"${rp?" open":""}><summary><b>📍 Rally point</b> ${rp?`<span class="note">set · ${lbl(rp.r)}</span>`:`<span class="note">optional</span>`}</summary>
    ${rp?`<p class="note">Check-in links now ask people to confirm they're at the rally point. Only their distance comes back, never where they are.</p>
      <div class="evts">${R.map(r=>`<button data-rp-r="${r}" aria-pressed="${rp.r===r}">${lbl(r)}</button>`).join("")}</div>
      <div class="row2"><button class="btn alt" data-rp-set>Move it to where I am</button><button class="btn alt" data-rp-clear>Remove</button></div>
      <p class="note">Resend the link if people already have the old one.</p>`
    :`<p class="note">Stand at the rally point and tap below. People checking in can confirm they're there.</p><button class="btn alt" data-rp-set>Use where I am now</button>`}</details>`}
function here(){return new Promise((res,rej)=>{if(!navigator.geolocation)return rej(new Error("Location isn't available on this device."));
  navigator.geolocation.getCurrentPosition(p=>res(p.coords),e=>rej(new Error(e.code===1?"Location is turned off for this app. Allow it in Settings.":"Couldn't get your location. Try again outside.")),{enableHighAccuracy:true,timeout:15000,maximumAge:30000})})}
const _rr=renderRecall;
renderRecall=function(){_rr.apply(this,arguments);if(!S.rc.open)return;const at=$("#main .esc-panel")||$("#main .mbar");if(at)at.insertAdjacentHTML("afterend",rpHTML())};
const _cl=ciLink;
ciLink=function(){let u=_cl.apply(this,arguments);const rp=S.rc&&S.rc.rp;if(rp)u+="&g="+[rp.lat.toFixed(4),rp.lon.toFixed(4),rp.r].join(",");return u};
const redraw=()=>{const y=window.scrollY;render();window.scrollTo(0,y)};
document.addEventListener("click",async e=>{
  if(e.target.closest("[data-rp-set]")){e.preventDefault();toast("Getting your location…");try{const c=await here();S.rc.rp={lat:+c.latitude.toFixed(4),lon:+c.longitude.toFixed(4),r:(S.rc.rp&&S.rc.rp.r)||250};save();redraw();toast("Rally point set")}catch(err){toast(err.message)}return}
  const r=e.target.closest("[data-rp-r]");if(r&&S.rc.rp){S.rc.rp.r=+r.dataset.rpR;save();redraw();return}
  if(e.target.closest("[data-rp-clear]")){S.rc.rp=null;save();redraw();return}
});
})();
