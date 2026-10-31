/* Accounted For 4.57: the red number on the Feed tab counts new posts on every phone, leaders' phones included
   (it used to count only on members' phones). Opening the Feed clears it. Copies of the same Feed that are hidden
   (one Feed per unit) don't count twice. A leader phone starts at zero the first time, not at "9+". */
(()=>{
function hidden(){try{return typeof window.oneFeedHidden==="function"?window.oneFeedHidden():new Set()}catch(e){return new Set()}}
const maxId=f=>Math.max(0,...fdVisible(f).map(p=>p.id));
fdUnread=function(){const H=hidden();let n=0,ch=false;
  for(const f of S.feeds||[]){if(H.has(f.id))continue;if(f.lk&&f.seen==null){f.seen=maxId(f);ch=true;continue}
    n+=fdVisible(f).filter(p=>p.id>(f.seen||0)).length}
  if(ch)try{rawSave()}catch(e){}return n};
{const _rf=renderFeed;renderFeed=function(){const r=_rf.apply(this,arguments);
  try{if(view==="feed"){const f=fdCur();if(f&&f.lk){const m=maxId(f);if(m>(f.seen||0)){f.seen=m;rawSave();setTimeout(()=>{try{renderTabs()}catch(e){}},0)}}}}catch(e){}return r}}
})();
