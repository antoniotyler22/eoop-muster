/* Accounted For 4.44: one Feed per unit, one tab.
   A phone could end up with several of its own Feeds under the same name (a second phone started its own before sync
   arrived, "Start a feed" tapped twice...), and the Feed screen showed the same title once per copy. Now:
   - tabs with the same title collapse into one; the copy with the most posts is the one you see (and becomes the main
     Feed, the one new pages and links use);
   - an empty extra copy that nobody but leaders' phones is listening to is deleted from the server and this phone
     (it is remembered in S.feedGone so synced phones don't bring it back). A copy with posts, or with member phones
     on it, is only hidden, never deleted. */
(()=>{
const label=f=>String(f.unit||"").trim().toUpperCase()+(f.lk?"|mine":"|joined");
function groups(){const g={};for(const f of S.feeds||[])(g[label(f)]=g[label(f)]||[]).push(f);return g}
function primary(list){return list.slice().sort((a,b)=>(b.posts||[]).length-(a.posts||[]).length||(b.main?1:0)-(a.main?1:0))[0]}
window.oneFeedHidden=()=>{try{return plan().hide}catch(e){return new Set()}};
function plan(){const hide=new Set(),pri={};for(const [k,list] of Object.entries(groups())){const p=primary(list);pri[k]=p;for(const f of list)if(f!==p)hide.add(f.id)}return {hide,pri}}
let cleaning=false,tried={};
async function tidy(){if(cleaning)return;cleaning=true;try{
  const {pri}=plan();
  for(const [k,p] of Object.entries(pri)){if(!/\|mine$/.test(k))continue;
    if(!p.main){for(const f of S.feeds)if(f.lk&&label(f)===k)delete f.main;p.main=true;save()}
    for(const f of S.feeds.slice()){if(f===p||!f.lk||label(f)!==k||(f.posts||[]).length||tried[f.id])continue;tried[f.id]=1;
      let st=null;try{const r=await SB.rpc("feed_sub_stats",{p_feed:f.id,p_leader_key:f.lk});st=Array.isArray(r)?r[0]:r}catch(e){}
      if(!st||+st.total!==+st.leads)continue;
      let srv=null;try{srv=await SB.rpc("feed_get",{p_feed:f.id,p_member_key:f.mk,p_after:0})}catch(e){}
      if(!Array.isArray(srv)||srv.length)continue; /* posts on the server we haven't loaded yet: never delete */
      try{await SB.rpc("delete_feed",{p_feed:f.id,p_leader_key:f.lk})}catch(e){continue}
      S.feedGone=S.feedGone||{};S.feedGone[f.id]=Date.now();S.feeds=S.feeds.filter(x=>x!==f);save()}}
  }catch(e){}finally{cleaning=false}}
let redo=false;
{const _rf=renderFeed;renderFeed=function(){const r=_rf.apply(this,arguments);try{
  const {hide}=plan();if(hide.size){
    if(hide.has(fdSel)){const f=S.feeds.find(x=>!hide.has(x.id)&&String(x.unit||"").toUpperCase()===String((S.feeds.find(y=>y.id===fdSel)||{}).unit||"").toUpperCase()&&!!x.lk===!!(S.feeds.find(y=>y.id===fdSel)||{}).lk);
      if(f&&!redo){fdSel=f.id;redo=true;try{return renderFeed()}finally{redo=false}}}
    document.querySelectorAll("#main .evts button[data-fdsel]").forEach(b=>{if(hide.has(b.dataset.fdsel))b.remove()});
    const bar=document.querySelector("#main .evts");if(bar&&!bar.querySelector("[data-fdsel]"))bar.remove();
    else if(bar&&bar.querySelectorAll("[data-fdsel]").length<2)bar.remove()}
  setTimeout(tidy,1500)}catch(e){}return r}}
})();
