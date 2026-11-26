/* Accounted For 4.148.0: Pause location.
   Settings → Privacy and terms → Pause location. While it is on, nothing in the app can read this phone's location:
   the arrival check-in (geofence), the rally point, news near you, the lone-worker timer and the SOS location all get
   "location unavailable" instead. One choke point: the browser's geolocation calls are wrapped here, so a feature added
   later is covered too.
   Emergencies: SOS and the lone-worker alert ask once for a 20-second pass (window.locAllow) so a person in trouble can
   still be found. A person who wants even that off turns "Allow in an emergency" off.
   Auto-resume after 1 hour, 8 hours or never (the pause just ends: nothing to remember to undo).
   "Delete my location history" clears the places and distances this phone keeps (the arrival-check-in zone result, rally distances, the news place).
   This setting stays on this phone (not synced). */
(()=>{
const L=()=>{S.locp=S.locp&&typeof S.locp==="object"?S.locp:{on:false,until:0,sos:true,hrs:8};return S.locp};
try{if(typeof SYNC_SKIP!=="undefined"&&Array.isArray(SYNC_SKIP)&&!SYNC_SKIP.includes("locp"))SYNC_SKIP.push("locp")}catch(e){}
const paused=()=>{const z=L();if(!z.on)return false;if(z.until&&Date.now()>=z.until){z.on=false;z.until=0;try{save()}catch(e){}return false}return true};
window.locPaused=paused;
let pass=0;
/* a feature that is about to send help (SOS, lone-worker alert) asks for a short pass; refused if the person turned emergency location off */
window.locAllow=()=>{if(L().sos!==false)pass=Date.now()+20000};
const open=()=>!paused()||Date.now()<pass;
const g=typeof navigator!=="undefined"&&navigator.geolocation;
if(g&&!g.__locp){
  const gc=g.getCurrentPosition&&g.getCurrentPosition.bind(g),gw=g.watchPosition&&g.watchPosition.bind(g);
  const deny=cb=>{try{cb&&cb({code:1,message:"Location is paused in Settings",PERMISSION_DENIED:1})}catch(e){}};
  try{
    if(gc)g.getCurrentPosition=function(ok,err,o){if(open())return gc(ok,err,o);deny(err)};
    if(gw)g.watchPosition=function(ok,err,o){if(open())return gw(ok,err,o);deny(err);return -1};
    g.__locp=1}catch(e){}}
function clearHistory(){let n=0;
  if(S.gz){delete S.gz;n++}
  if(S.news&&typeof S.news==="object"&&S.news.loc){delete S.news.loc;n++}
  if(S.rc&&S.rc.rp){/* the rally point is a place the leader chose, keep it; only distances people sent come back to this phone */}
  try{if(S.rc&&S.rc.ci)for(const id of Object.keys(S.rc.ci)){const x=S.rc.ci[id];if(x&&(x.d!=null||x.g!=null)){delete x.d;delete x.g;n++}}}catch(e){}
  try{window.__sosPos=null}catch(e){}
  save();return n}
const HR=[[1,"1 hr"],[8,"8 hrs"],[0,"Never"]];
function panel(){const z=L(),on=paused();
  const left=on&&z.until?Math.max(1,Math.round((z.until-Date.now())/60000)):0;
  return `<div class="panel" id="lpPanel"><b>📍 Pause location</b>
    <label class="lrow" style="margin:8px 0;cursor:pointer"><input type="checkbox" id="lpOn" ${on?"checked":""}><span style="flex:1;min-width:0"><span class="t" style="display:block">Pause location</span><span class="s" style="display:block">Leaders see only your last check-in. Nothing reads your location until you resume.</span></span></label>
    <div class="note" id="lpNote">${on?(z.until?"Paused. Resumes in "+(left>=60?Math.round(left/60)+" hr":left+" min")+".":"Paused until you turn it off."):"Off. Location is used only for the features you turn on (arrival check-in, rally point, SOS)."}</div>
    <div style="font-size:13px;font-weight:700;margin:10px 0 4px">Auto-resume</div>
    <div class="evts" role="group" aria-label="Auto-resume">${HR.map(([h,l])=>`<button data-lp-hrs="${h}" aria-pressed="${(z.hrs==null?8:z.hrs)===h}">${l}</button>`).join("")}</div>
    <label class="lrow" style="margin:10px 0 0;cursor:pointer"><input type="checkbox" id="lpSos" ${z.sos!==false?"checked":""}><span style="flex:1;min-width:0"><span class="t" style="display:block">Allow in an emergency</span><span class="s" style="display:block">SOS and the lone-worker alert can still share where you are.</span></span></label>
    <button class="btn alt" id="lpWipe" style="width:100%;margin-top:10px;min-height:48px">Delete my location history</button><div class="note" style="margin-top:6px">Removes your saved muster place, the nearby-news place and any distances kept on this phone.</div></div>`}
window.lpPanelHtml=panel;
document.addEventListener("change",e=>{const t=e.target;if(!t||!t.id)return;const z=L();
  if(t.id==="lpOn"){z.on=!!t.checked;const h=z.hrs==null?8:z.hrs;z.until=z.on&&h?Date.now()+h*3600000:0;save();if(view==="settings")render();toast(z.on?"Location paused":"Location resumed");return}
  if(t.id==="lpSos"){z.sos=!!t.checked;save()}});
document.addEventListener("click",e=>{const t=e.target;if(!t||!t.closest)return;let x;
  if(x=t.closest("[data-lp-hrs]")){const z=L();z.hrs=+x.dataset.lpHrs;if(z.on)z.until=z.hrs?Date.now()+z.hrs*3600000:0;save();if(view==="settings")render();return}
  if(t.closest("#lpWipe")){const n=clearHistory();toast(n?"Location history deleted":"No location history on this phone");if(view==="settings")render()}});
window.locpClear=clearHistory;
})();
