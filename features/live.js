/* Accounted For 1.7: Live updates (Supabase Realtime).
   Every channel the app reads (a check-in, a board, a feed, a company roll-up, a page or a backup) gets a hashed
   Realtime topic. After anyone changes that channel, SB.rpc sends a "ping" on the topic (index.html). Phones
   watching the topic fetch the change right away instead of waiting for the next one-minute refresh.
   Pings carry no data: only the kind of channel and a random sender id. If Realtime can't connect,
   the normal refresh keeps working, so nothing depends on it. */
(()=>{
const READ={get_checkins:"p_recall",get_board_updates:"p_board",get_cal:"p_board",get_roster:"p_board",
  feed_get:"p_feed",feed_acks_get:"p_feed",feed_reqs_get:"p_feed",get_units:"p_company",
  page_get:"p_id",get_page:"p_id",dm_get:"p_id",backup_get:"p_id",backup_ver:"p_id"};
const MAX_TOPICS=40;
const L=window.LIVE={on:false,ws:null,ref:0,topics:new Map(),wait:2000,hb:null,retry:null,last:0,pings:0,handlers:new Map(),fail:0};

/* ---------- the socket (Phoenix protocol, the same one supabase-js speaks) ---------- */
function wsURL(){return SB.url.replace(/^http/,"ws")+"/realtime/v1/websocket?apikey="+encodeURIComponent(SB.key)+"&vsn=1.0.0"}
function send(o){const w=L.ws;if(!w||w.readyState!==1)return false;o.ref=String(++L.ref);try{w.send(JSON.stringify(o));return true}catch(e){return false}}
function join(t){const x=L.topics.get(t);if(!x)return;x.joined=false;x.ref=String(L.ref+1);
  send({topic:"realtime:"+t,event:"phx_join",payload:{config:{broadcast:{self:false,ack:false},presence:{key:""},private:false}},join_ref:x.ref})}
function connect(){if(L.ws&&L.ws.readyState<=1)return;if(!("WebSocket" in window)||!L.topics.size)return;clearTimeout(L.retry);
  let w;try{w=new WebSocket(wsURL())}catch(e){return later()}L.ws=w;
  w.onopen=()=>{L.wait=2000;L.fail=0;for(const t of L.topics.keys())join(t);clearInterval(L.hb);L.hb=setInterval(()=>send({topic:"phoenix",event:"heartbeat",payload:{}}),25000);paint()};
  w.onmessage=ev=>{let m;try{m=JSON.parse(ev.data)}catch(e){return}const t=String(m.topic||"").replace(/^realtime:/,"");
    if(m.event==="phx_reply"){const x=L.topics.get(t);if(x&&m.payload&&m.payload.status==="ok"){x.joined=true;paint()}return}
    if(m.event==="phx_error"||m.event==="phx_close"){const x=L.topics.get(t);if(x)x.joined=false;return}
    if(m.event==="broadcast"&&m.payload&&m.payload.event==="ping")onPing(t,m.payload.payload||{})};
  w.onclose=()=>{clearInterval(L.hb);for(const x of L.topics.values())x.joined=false;L.on=false;paint();L.fail++;later()};
  w.onerror=()=>{try{w.close()}catch(e){}}}
function later(){clearTimeout(L.retry);if(document.hidden)return;L.retry=setTimeout(connect,L.wait);L.wait=Math.min(L.wait*2,60000)}
document.addEventListener("visibilitychange",()=>{if(!document.hidden){L.wait=2000;connect()}});
window.addEventListener("online",()=>{L.wait=2000;connect()});

/* ---------- topics ---------- */
async function watch(kind,id){if(!id)return;const t=await SB.topic(kind,id);if(L.topics.has(t)){L.topics.get(t).at=Date.now();return}
  L.topics.set(t,{kind,at:Date.now(),joined:false});
  if(L.topics.size>MAX_TOPICS){const old=[...L.topics.entries()].sort((a,b)=>a[1].at-b[1].at)[0];if(old){send({topic:"realtime:"+old[0],event:"phx_leave",payload:{}});L.topics.delete(old[0])}}
  if(L.ws&&L.ws.readyState===1)join(t);else connect()}
L.watch=watch;
/* watch a custom topic (accounts use this for "a team was sent to you") */
L.watchTopic=(t,kind,fn)=>{if(!t)return;if(fn)L.handlers.set(t,fn);if(!L.topics.has(t)){L.topics.set(t,{kind,at:Date.now()+864e5,joined:false});if(L.ws&&L.ws.readyState===1)join(t);else connect()}};
{const _rpc=SB.rpc.bind(SB);SB.rpc=async function(fn,args){const r=await _rpc(fn,args);const p=READ[fn];if(p&&args&&args[p])watch(p,args[p]).catch(()=>{});return r}}

/* ---------- a ping arrived: fetch that kind of thing now ---------- */
const due={};
function onPing(t,p){if(p.s&&p.s===SB.sid)return;const x=L.topics.get(t);const kind=(x&&x.kind)||p.k||"";L.last=Date.now();L.pings++;
  const h=L.handlers.get(t);if(h){try{h(p)}catch(e){}return}
  clearTimeout(due[kind]);due[kind]=setTimeout(()=>run(kind),350);flash()}
function run(kind){try{
  if(kind==="p_recall"){if(typeof livePoll==="function")livePoll();if(typeof bcPoll==="function")bcPoll();if(view==="muster"&&typeof qrDraw==="function")qrDraw();return}
  if(kind==="p_board"){if(typeof livePollBoard==="function")livePollBoard();if(S.link&&typeof rosterPull==="function"&&S.link.rk2)rosterPull(true);return}
  if(kind==="p_feed"){if(typeof fdPollAll==="function")fdPollAll(true);return}
  if(kind==="p_company"){if(typeof coPoll==="function")coPoll();return}
  if(kind==="p_id"){if(S.me&&typeof mpFetch==="function")mpFetch();if(typeof dmPollLeader==="function")dmPollLeader();if(typeof dmPollMember==="function")dmPollMember();
    if(S.sync&&S.sync.on&&typeof syncPull==="function")syncPull(true);return}
  if(typeof refreshAll==="function")refreshAll(true)}catch(e){}}

/* ---------- "Live" in the header ---------- */
function joinedN(){let n=0;for(const x of L.topics.values())if(x.joined)n++;return n}
function paint(){L.on=!!(L.ws&&L.ws.readyState===1&&joinedN());const d=$("#dtg");if(!d)return;let el=$("#liveDot");
  if(!L.on){if(el)el.remove();return}
  if(!el){el=document.createElement("span");el.id="liveDot";el.setAttribute("role","status");d.after(el)}
  el.innerHTML=`<i aria-hidden="true"></i>Live`;el.title="Updates arrive the moment they happen"}
function flash(){const el=$("#liveDot");if(!el)return;el.classList.remove("ping");void el.offsetWidth;el.classList.add("ping")}
{const css=document.createElement("style");css.textContent=`#liveDot{display:inline-flex;align-items:center;gap:5px;margin-left:8px;font-size:11px;font-weight:800;letter-spacing:.04em;color:var(--s-onhand,#1a9b6c);vertical-align:middle}
#liveDot i{width:7px;height:7px;border-radius:50%;background:currentColor;box-shadow:0 0 0 0 currentColor}
#liveDot.ping i{animation:livePing .9s ease-out}
@keyframes livePing{0%{box-shadow:0 0 0 0 color-mix(in srgb,currentColor 70%,transparent)}100%{box-shadow:0 0 0 9px transparent}}
@media (prefers-reduced-motion:reduce){#liveDot.ping i{animation:none}}`;document.head.appendChild(css)}
{const _rT=renderTabs;renderTabs=function(){_rT.apply(this,arguments);try{paint()}catch(e){}}}

/* System check: show whether live updates connect */
window.liveStatus=()=>({connected:!!(L.ws&&L.ws.readyState===1),topics:L.topics.size,joined:joinedN(),pings:L.pings,last:L.last});
setTimeout(()=>{if(L.topics.size)connect()},1200);
})();
