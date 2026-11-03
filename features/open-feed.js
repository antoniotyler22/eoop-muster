/* Accounted For 4.77.11: open on Word of Mouth when there is something new to confirm.
   Section leaders, co-leaders, editors, viewers and anyone else who has a Word of Mouth land on it when they open the app (or come back to it)
   and a post is waiting for their Confirm. The OIC's own phone keeps opening on Home.
   Only while they are still on Home and haven't tapped anything yet, so it never pulls anyone away from what they're doing.
   Word of Mouth arrives a moment after the app opens, so it checks a few times in the first seconds. */
(()=>{
const HOME=v=>v==="board"||v==="today";
let touched=false,done=false,timers=[];
const waiting=f=>{try{
  if(f.lk)return fsOpen(f).length;
  const mine=f.mine||{};return fdVisible(f).filter(p=>!fsOwn(f,p)&&!mine[p.id]).length}catch(e){return 0}};
function pick(){let best=null,n=0;for(const f of (S.feeds||[])){const k=waiting(f);if(k>n){best=f;n=k}}return best}
function go(){if(done||touched)return true;
  if(S.source==="sample"&&!(S.feeds||[]).length)return false;
  if(typeof role==="function"&&(role()==="oic"||role()==="newoic")&&!(S.link))return false;      /* the OIC's phone stays on Home */
  if(!HOME(view))return true;
  const sh=document.getElementById("sheet");if(sh&&!sh.hidden)return false;
  const f=pick();if(!f)return false;
  done=true;fdSel=f.id;view="feed";try{render();window.scrollTo(0,0)}catch(e){}return true}
function arm(){touched=false;done=false;timers.forEach(clearTimeout);timers=[];
  for(const ms of [1200,3000,6000,10000,15000])timers.push(setTimeout(()=>{try{go()}catch(e){}},ms))}
const stop=()=>{touched=true};
document.addEventListener("pointerdown",stop,true);document.addEventListener("keydown",stop,true);
let hidAt=0;
document.addEventListener("visibilitychange",()=>{if(document.hidden){hidAt=Date.now();return}if(hidAt&&Date.now()-hidAt>3*60000)arm()});
arm();
window.openFeedCheck=go;
})();
