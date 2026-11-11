/* Accounted For 4.83.0: "seen" happens by itself, so Word of Mouth has no Confirm button.
   When Word of Mouth (or a member's page, which shows the word) is on screen, the posts you can see are marked seen:
   - Members: the app sends the normal Got it (feed_ack code 1) for each post they can see, so the leader's ring, "Seen by N of M",
     "Not seen" and reminders all keep working exactly as before. A post you already answered (Got it, reply, vote, Problem) is left alone.
   - Leaders: the posts they can see are marked seen on this phone (f.lseen), which clears the badge and "land on Word of Mouth".
   A failed send waits a minute and tries again; nothing is shown to the person. */
(()=>{
const VIEWS=["feed","me","today"];
let busy=false;const fail={};
function onScreen(){
  if(view==="feed"){const f=typeof fdCur==="function"?fdCur():null;return f?[f]:[]}
  return (S.feeds||[]).filter(f=>!f.lk&&f.mk)}
function redraw(){const a=document.activeElement;if(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName))return;const y=window.scrollY;try{render()}catch(e){}window.scrollTo(0,y)}
async function run(){
  if(busy||document.hidden||!VIEWS.includes(view))return;
  busy=true;let changed=false;
  try{
    for(const f of onScreen()){
      const vis=typeof fdVisible==="function"?fdVisible(f):[];
      if(f.lk){
        if(view!=="feed")continue;
        f.lseen=f.lseen||{};const now=Date.now();
        for(const p of vis)if(!f.lseen[p.id]&&!fsOwn(f,p)){f.lseen[p.id]=now;changed=true}
        continue}
      if(!f.me||!f.mk)continue;                 /* not signed in to this feed yet: nothing to send */
      f.mine=f.mine||{};let n=0;
      for(const p of vis){
        if(n>=6)break;
        if(f.mine[p.id]||!fdForMe(f,p))continue;
        const k=f.id+":"+p.id;if(fail[k]&&Date.now()-fail[k]<60000)continue;
        n++;
        try{await fdAck(f,p.id,1);changed=true}catch(e){fail[k]=Date.now()}}}
    if(changed)save();
  }catch(e){}finally{busy=false}
  if(changed&&VIEWS.includes(view))redraw()}
window.autoSeenRun=run;
{const _rf=renderFeed;renderFeed=function(){const r=_rf.apply(this,arguments);setTimeout(run,700);return r}}
if(typeof renderMe==="function"){const _rm=renderMe;renderMe=function(){const r=_rm.apply(this,arguments);setTimeout(run,700);return r}}
if(typeof renderToday==="function"){const _rt=renderToday;renderToday=function(){const r=_rt.apply(this,arguments);setTimeout(run,700);return r}}
document.addEventListener("visibilitychange",()=>{if(!document.hidden)setTimeout(run,500)});
})();
