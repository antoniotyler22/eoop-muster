/* Accounted For: co-leaders and editors can post to the Feed.
   Their phones are linked to the leader's board by sync. Sync used to skip the feed list whenever this phone's
   copy had changed at all (new posts or read counts change it constantly), so a feed the leader started, or a new
   posting key, never reached them and they had no Post box. Now feeds merge one by one: every feed the leader
   has, with its posting key, lands on every co-leader and editor phone. Phones already stuck repair themselves
   on open by reading the board's cloud copy once. View-only phones still can't post. */
(()=>{
const KEYS=["lk","mk","ek","unit","by","secsLink"];
const canPostRole=()=>S.sync&&S.sync.on&&["co","sncoic","oic","newoic"].includes(S.role||"oic");
function mergeFeeds(remote){if(!Array.isArray(remote)||!canPostRole())return 0;S.feeds=Array.isArray(S.feeds)?S.feeds:[];let n=0;
  for(const rf of remote){if(!rf||!rf.id||!rf.lk)continue;
    const mine=S.feeds.filter(f=>f.id===rf.id);let keep=mine.find(f=>f.lk)||mine[0];
    if(!keep){S.feeds.push(Object.assign({},rf,{seen:0}));n++;continue}
    for(const k of KEYS)if(rf[k]!=null&&keep[k]!==rf[k]&&(k!=="by"||!keep.by)){keep[k]=rf[k];if(k==="lk")n++}
    delete keep.hub;
    if(Array.isArray(rf.posts)){const have=new Set((keep.posts||[]).map(p=>p.id));const add=rf.posts.filter(p=>!have.has(p.id));if(add.length)keep.posts=(keep.posts||[]).concat(add).sort((a,b)=>b.id-a.id)}
    if(rf.acks&&typeof rf.acks==="object"){keep.acks=keep.acks||{};for(const p of Object.keys(rf.acks))keep.acks[p]=Object.assign({},rf.acks[p],keep.acks[p]||{})}
    S.feeds=S.feeds.filter(f=>f.id!==rf.id||f===keep)}
  /* feeds you can post to come first, so the Feed tab opens on one with a Post box */
  S.feeds.sort((a,b)=>(b.lk?1:0)-(a.lk?1:0));return n}
window.fcMergeFeeds=mergeFeeds;

{const _mr=mergeRemote;mergeRemote=function(R){const remote=R&&Array.isArray(R.feeds)?JSON.parse(JSON.stringify(R.feeds)):null;
  const out=_mr.apply(this,arguments);try{if(remote)mergeFeeds(remote)}catch(e){}return out}}

/* one-time repair on open for co-leader / editor phones that are missing a posting key */
let fixed=false;
async function repair(){if(fixed||!canPostRole()||S.role==="oic")return;fixed=true;
  try{const Y=S.sync;const K=await codeKeys(Y.code);const rows=await SB.rpc("backup_get",{p_id:K.id,p_key:K.wk});const r=rows&&rows[0];if(!r)return;
    const R=await openBlob(K,r.ct);const before=(S.feeds||[]).filter(f=>f.lk).length;const n=mergeFeeds(R.feeds);
    if(n||(S.feeds||[]).filter(f=>f.lk).length!==before){rawSave();if(view==="feed"){const y=window.scrollY;render();window.scrollTo(0,y)}toast("Feed posting is on for this phone")}}
  catch(e){fixed=false}}
window.fcRepair=repair;
setTimeout(repair,2500);
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&!(S.feeds||[]).some(f=>f.lk))repair()});

/* if this phone can post but the Feed tab shows a read-only copy, point it at the one with the Post box */
{const _rf=renderFeed;renderFeed=function(){if(canPostRole()&&S.role!=="view"&&typeof fdSel!=="undefined"){const cur=fdCur();if(cur&&!cur.lk){const alt=S.feeds.find(f=>f.lk&&f.id===cur.id)||(!fdSel?S.feeds.find(f=>f.lk):null);if(alt)fdSel=alt.id}}return _rf.apply(this,arguments)}}
})();
