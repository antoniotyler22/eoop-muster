/* Accounted For: a status with an end date ends by itself.
   When someone's "thru" date has passed (Leave thru 5 Nov, and it's the 6th), they go back to On Hand on their own:
   dates, location and detail come off, the leave/TAD on their calendar closes out, Undo stays in Alerts (Back on deck log),
   and Activity notes it. Checked on open, on every render, and once an hour while the app is open.
   Undo (Alerts) sticks: those same dates won't end them again. Attached people (ATT) are not touched: their end date is the attachment ending, which Alerts handles. */
(()=>{
function expire(){if(!Array.isArray(S.roster)||S.source==="sample"||typeof backNow!=="function")return 0;const today=dkey();const who=[];
  for(const m of S.roster){if(!m||m.sec==="ATT"||m.status==="On Hand"||!AWAY.includes(m.status))continue;const e=isoOf(m.end)||"";if(!/^\d{4}-\d{2}-\d{2}$/.test(e)||e>=today)continue;
    if(m.noAuto&&m.noAuto===m.end)continue; // someone undid the auto-return for these dates: leave them be until the dates change
    const was=backNow(m);m.autoBack=Date.now();who.push(m.rank+" "+lastOf(m)+" ("+(SHORT[was]||was)+" thru "+short(parseD(e))+")")}
  if(who.length){S.secAt=S.secAt||{};for(const m of S.roster)if(m.autoBack&&Date.now()-m.autoBack<5000)S.secAt[m.sec]=Date.now();
    try{actAdd("↩",who.length===1?who[0]+" is back: the dates ended":who.length+" back, dates ended: "+who.slice(0,4).join(", ")+(who.length>4?"…":""),"board")}catch(e){}
    save();try{if(S.board&&typeof rpPublish==="function")rpPublish(true)}catch(e){}}
  return who.length}
window.statusExpire=expire;
try{expire()}catch(e){}
{const _r=render;render=function(){try{if(expire()&&typeof toast==="function")toast("Dates ended · back On Hand")}catch(e){}return _r.apply(this,arguments)}}
if(typeof every==="function")every(3600000,()=>{try{if(expire()){const y=window.scrollY;render();window.scrollTo(0,y)}}catch(e){}},"status-done");
})();
