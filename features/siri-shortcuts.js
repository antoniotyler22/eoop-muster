/* Accounted For 4.148.0: Siri and Shortcuts check-in.
   Settings → Siri & Shortcuts. One tap, or no tap at all, to check in as On Hand:
   - "Hey Siri, I'm safe in Accounted For": an App Shortcut (Siri needs the app name in the phrase) (native-ios/AccountedForControls/SafeIntent.swift) that opens accountedfor://safe.
     It needs the next iPhone build; this page says so until the app finds it is running inside the iPhone app.
   - Shortcuts automations (iPhone's Shortcuts app): plug in at a set time, alarm stops, arrive at a place. Each one is one
     "Open URL" action pointing at accountedfor://safe, so the Shortcuts app does the triggering and Accounted For never
     reads your location for it. "Ask me to confirm first" adds ?confirm=1 so an automation can't count you without a look.
   Uses the existing one-tap check-in (quick-safe.js / My check-in). Nothing new on the server. */
(()=>{
const C=()=>{S.sc=S.sc&&typeof S.sc==="object"?S.sc:{confirm:true};return S.sc};
try{if(typeof SYNC_SKIP!=="undefined"&&Array.isArray(SYNC_SKIP)&&!SYNC_SKIP.includes("sc"))SYNC_SKIP.push("sc")}catch(e){}
const link=()=>"accountedfor://safe"+(C().confirm!==false?"?confirm=1":"");
window.scLink=link;
const native=()=>!!(window.Capacitor&&(window.Capacitor.isNativePlatform?window.Capacitor.isNativePlatform():window.Capacitor.getPlatform&&window.Capacitor.getPlatform()!=="web"));
const RECIPES=[
  {k:"plug",t:"When I plug in at 0600",s:"Check in as On Hand",how:"Shortcuts → Automation → New → Time of Day, then add the action Open URLs and paste the link."},
  {k:"alarm",t:"When my alarm stops",s:"Ask me to confirm first",how:"Shortcuts → Automation → New → Alarm → Is Stopped, then add Open URLs and paste the link."},
  {k:"arrive",t:"When I arrive at work",s:"Uses Shortcuts' own place trigger, not Accounted For",how:"Shortcuts → Automation → New → Arrive, choose your place, then add Open URLs and paste the link."}];
function page(){const c=C();
  return `<div class="ios-grp"><div class="ios-pad" id="scPanel">
    <b>🎙 "Hey Siri, I'm safe in Accounted For"</b>
    <div class="note" style="margin:6px 0 10px">${native()?"Say it, and you're counted as On Hand. If Siri doesn't know it yet, open the Shortcuts app once and it appears under Accounted For.":"Available in the iPhone app (next build). It checks you in as On Hand with your voice."}</div>
    <label class="lrow" style="margin:6px 0;cursor:pointer"><input type="checkbox" id="scConfirm" ${c.confirm!==false?"checked":""}><span style="flex:1;min-width:0"><span class="t" style="display:block">Ask me to confirm first</span><span class="s" style="display:block">Automations show "Check in as On Hand?" before counting you.</span></span></label>
    <div style="font-size:13px;font-weight:700;margin:12px 0 4px">Automations (Shortcuts app)</div>
    ${RECIPES.map(r=>`<div class="card" style="margin:6px 0;padding:10px 12px"><b>${r.t}</b><div class="note" style="margin:2px 0 4px">${r.s}</div><div class="note" style="margin:0 0 6px">${r.how}</div><button class="chip" data-sc-copy="1" style="cursor:pointer;min-height:40px">Copy link</button></div>`).join("")}
    <div class="note" style="margin-top:8px">The link: <code>${link()}</code>. Tap the Copy link button, then paste it into the Open URLs action.</div>
    <a class="btn alt" href="shortcuts://" style="display:block;margin-top:10px;text-align:center">Open the Shortcuts app</a></div></div>`}
window.siriPage=()=>(typeof window.spTop==="function"?window.spTop("Siri & Shortcuts"):"")+page();
document.addEventListener("change",e=>{const t=e.target;if(t&&t.id==="scConfirm"){C().confirm=!!t.checked;save();if(view==="settings")render()}});
document.addEventListener("click",async e=>{const t=e.target;if(!t||!t.closest||!t.closest("[data-sc-copy]"))return;
  try{await navigator.clipboard.writeText(link());toast("Link copied")}catch(err){toast(link())}});
})();
