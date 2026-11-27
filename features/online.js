/* Accounted For 4.150.0: who's online.
   Every phone that has this team open and knows who it belongs to (S.who, or a My page link) says "I'm here" on one
   Supabase Realtime presence channel for the team. Phones that close the app, lock the screen for a while, or lose signal
   drop off by themselves, so nobody has to sign out.
   Where it shows:
   - A section screen: "N of M online" under the title, and each online person gets a blue ring, dot and an Online tag.
   - A person's page: blue ring and dot on the photo, an "Online now" pill; if they just left it says "Seen 4 min ago".
   Presence carries only the person's id and a timestamp. If the connection fails nothing breaks and nobody shows online. */
(()=>{
const O=window.ONLINE={ids:new Set(),left:{},ws:null,ref:0,topic:"",key:"",hb:null,retry:null,wait:2000,on:false};
const myId=()=>{const w=S.who&&S.who.id;if(w){const m=(S.roster||[]).find(x=>x.id===w||x.uid===w);return m?m.id:String(w)}
  if(S.me&&S.me.pk){const m=(S.roster||[]).find(x=>x.pk&&x.pk===S.me.pk);if(m)return m.id}return ""};
const teamId=()=>(S.board&&S.board.id)||(S.link&&S.link.board)||((S.feeds||[]).find(f=>f&&f.id)||{}).id||"";
const isOn=m=>!!m&&(O.ids.has(m.id)||(m.uid&&O.ids.has(m.uid)));
O.is=isOn;

/* ---------- the presence socket (Phoenix protocol, same as live.js) ---------- */
const wsURL=()=>SB.url.replace(/^http/,"ws")+"/realtime/v1/websocket?apikey="+encodeURIComponent(SB.key)+"&vsn=1.0.0";
function send(o){const w=O.ws;if(!w||w.readyState!==1)return false;o.ref=String(++O.ref);try{w.send(JSON.stringify(o));return true}catch(e){return false}}
function setIds(next){const was=O.ids;for(const id of was)if(!next.has(id))O.left[id]=Date.now();O.ids=next;const me=myId();if(me&&O.on){O.ids.add(me)}schedule()}
function onMsg(ev){let m;try{m=JSON.parse(ev.data)}catch(e){return}
  if(m.topic!=="realtime:"+O.topic)return;
  if(m.event==="phx_reply"&&m.payload&&m.payload.status==="ok"){O.on=true;track();schedule();return}
  if(m.event==="presence_state"){setIds(new Set(Object.keys(m.payload||{})));return}
  if(m.event==="presence_diff"){const p=m.payload||{},next=new Set(O.ids);
    Object.keys(p.leaves||{}).forEach(k=>next.delete(k));Object.keys(p.joins||{}).forEach(k=>{next.add(k);delete O.left[k]});setIds(next)}}
function track(){const me=myId();if(!me)return;send({topic:"realtime:"+O.topic,event:"presence",payload:{type:"presence",event:"track",payload:{id:me,at:Date.now()}}})}
async function connect(){if(document.hidden||(O.ws&&O.ws.readyState<=1))return;
  if(!window.SB||!SB.url||!SB.topic||!("WebSocket" in window)||S.source==="sample")return;
  const tid=teamId();if(!tid)return;
  try{O.topic=await SB.topic("p_online",tid)}catch(e){return later()}
  const me=myId();O.key=me;
  let w;try{w=new WebSocket(wsURL())}catch(e){return later()}O.ws=w;
  w.onopen=()=>{O.wait=2000;send({topic:"realtime:"+O.topic,event:"phx_join",payload:{config:{broadcast:{self:false,ack:false},presence:{key:me||"viewer-"+Math.random().toString(36).slice(2,8)},private:false}}});
    clearInterval(O.hb);O.hb=setInterval(()=>send({topic:"phoenix",event:"heartbeat",payload:{}}),25000)};
  w.onmessage=onMsg;
  w.onclose=()=>{clearInterval(O.hb);O.on=false;O.ids=new Set();schedule();later()};
  w.onerror=()=>{try{w.close()}catch(e){}}}
function later(){clearTimeout(O.retry);if(document.hidden)return;O.retry=setTimeout(connect,O.wait);O.wait=Math.min(O.wait*2,60000)}
function drop(){clearTimeout(O.retry);clearInterval(O.hb);const w=O.ws;O.ws=null;O.on=false;if(w){w.onclose=null;try{w.close()}catch(e){}}O.ids=new Set();schedule()}
/* a phone with the app in the background isn't "online": leave after a minute hidden, rejoin when it comes back */
let hideT=0;
document.addEventListener("visibilitychange",()=>{clearTimeout(hideT);if(document.hidden)hideT=setTimeout(drop,60000);else{O.wait=2000;connect()}});
window.addEventListener("online",()=>{O.wait=2000;connect()});

/* ---------- drawing ---------- */
const ago=t=>{const s=Math.max(0,Math.round((Date.now()-t)/1000));if(s<90)return "just now";const m=Math.round(s/60);if(m<60)return m+" min ago";const h=Math.round(m/60);return h<24?h+" hr ago":"yesterday"};
let busy=false,pend=0;
function schedule(){if(pend)return;pend=requestAnimationFrame(()=>{pend=0;paint()})}
function paint(){const main=document.getElementById("main");if(!main)return;busy=true;try{
  main.querySelectorAll(".ol-dot,.ol-tag,.ol-sum,.ol-seen").forEach(e=>e.remove());
  main.querySelectorAll(".ol").forEach(e=>e.classList.remove("ol"));
  /* section screen */
  const head=main.querySelector(".sechead h2"),rows=[...main.querySelectorAll(".list .m [data-pcard]")];
  if(head&&rows.length){let n=0;
    rows.forEach(el=>{const m=(S.roster||[]).find(x=>x.id===el.dataset.pcard);if(!isOn(m))return;n++;
      const row=el.closest(".m");row.classList.add("ol");el.insertAdjacentHTML("beforeend",`<i class="ol-dot" aria-hidden="true"></i><span class="ol-tag">Online</span>`)});
    const bar=Math.round(100*n/rows.length);
    const anchor=main.querySelector(".sechead");
    anchor.insertAdjacentHTML("afterend",`<div class="ol-sum" role="status"><span><i aria-hidden="true"></i>${n} of ${rows.length} online</span><div class="ol-bar"><b style="width:${bar}%"></b></div></div>`)}
  /* person's page */
  const ring=main.querySelector(".pg-head .mp-ring");
  if(ring&&typeof pid!=="undefined"){const m=(S.roster||[]).find(x=>x.id===pid);const st=main.querySelector(".pg-head .mp-st");
    if(isOn(m)){ring.classList.add("ol");ring.insertAdjacentHTML("beforeend",`<i class="ol-dot big" aria-hidden="true"></i>`);
      if(st)st.insertAdjacentHTML("afterend",`<div class="ol-seen"><span class="ol-tag"><i aria-hidden="true"></i>Online now</span></div>`)}
    else if(m&&O.left[m.id]&&st)st.insertAdjacentHTML("afterend",`<div class="ol-seen"><span class="ol-off">Seen ${ago(O.left[m.id])}</span></div>`)}
}finally{setTimeout(()=>{busy=false},0)}}
const mo=new MutationObserver(()=>{if(!busy)schedule()});
const hook=()=>{const main=document.getElementById("main");if(main)mo.observe(main,{childList:true,subtree:true});else setTimeout(hook,300)};
hook();

const css=document.createElement("style");css.textContent=`:root{--ol:#2f6bff;--ol-bg:#e4edff;--ol-fg:#0b3a9e}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--ol:#5b8dff;--ol-bg:#17294f;--ol-fg:#b9d0ff}}
:root[data-theme="dark"]{--ol:#5b8dff;--ol-bg:#17294f;--ol-fg:#b9d0ff}
.m.ol{box-shadow:inset 3px 0 0 var(--ol)}
.m.ol .who .nm{color:var(--ol)!important;text-decoration-color:var(--ol)!important}
.ol-dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--ol);margin-left:7px;vertical-align:1px;box-shadow:0 0 0 2px var(--surface,#fff)}
.ol-dot.big{position:absolute;right:3px;bottom:3px;width:16px;height:16px;margin:0;box-shadow:0 0 0 3px var(--surface,#fff)}
.ol-tag{display:inline-flex;align-items:center;gap:5px;margin-left:8px;font-size:11px;font-weight:800;letter-spacing:.03em;padding:2px 8px;border-radius:999px;background:var(--ol-bg);color:var(--ol-fg);vertical-align:1px}
.ol-seen .ol-tag{margin:0}.ol-tag i{width:7px;height:7px;border-radius:50%;background:var(--ol)}
.ol-seen{margin:6px 0 2px}.ol-off{font-size:12px;color:var(--muted)}
.mp-ring.ol{box-shadow:0 0 0 3px var(--ol);position:relative}
.ol-sum{margin:6px 0 10px;font-size:13px;font-weight:700;color:var(--ol-fg)}
.ol-sum span{display:inline-flex;align-items:center;gap:7px}.ol-sum span i{width:9px;height:9px;border-radius:50%;background:var(--ol)}
.ol-bar{height:6px;border-radius:3px;background:var(--ol-bg);margin-top:6px;overflow:hidden}.ol-bar b{display:block;height:100%;background:var(--ol);border-radius:3px}`;
document.head.appendChild(css);

/* tests and screenshots can set who's online without a connection */
O.set=ids=>setIds(new Set(ids));
setTimeout(connect,1500);
})();
