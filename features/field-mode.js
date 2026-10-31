/* Accounted For 4.64: Field mode. Works with no signal and catches up later.
   - Check-ins, Got its, requests, problems and now leader posts made with no signal are saved on the phone and
     sent in order the moment there's a bar. A post shows in your Feed right away (marked "waiting") and is swapped
     for the real one once it goes out.
   - A bar at the bottom says what's going on: "No signal · 3 waiting", "Sending 3…", "All sent". Tap it for the
     Field mode screen: signal, last sync, what's waiting (send now or delete one), and what works without signal.
   - Field mode switch (for the range or the training area): keeps the bar on screen, checks for updates every
     10 minutes instead of every 2 to save battery and data, and holds things for signal without trying first.
   - "Get ready for the field" pulls everything fresh before you lose signal and says when it was saved.
   Builds on the outbox from 1.1 (v11.js): same S.outbox list, same send loop. */
(()=>{
const NETERR=/abort|Failed to fetch|NetworkError|Load failed|network|ERR_|timed? ?out/i;
const Q=new Set(["feed_post","page_req","feed_ack","feed_req"]);
const FIELD_REFRESH=10*60*1000;
let netDown=false,armedDel=null,lastPoll=0,readyAt=0;
S.outbox=S.outbox||[];
const off=()=>navigator.onLine===false||netDown;
const ctl=(fn,args)=>fn==="feed_post"&&String(args&&args.p_ct||"").startsWith("c:");
function okNet(){if(netDown){netDown=false;setTimeout(()=>window.dispatchEvent(new Event("online")),50)}S.fmSync=Date.now()}
async function label(fn,args){const f=(S.feeds||[]).find(x=>x.id===(args&&args.p_feed));let o=null;
  try{if(f&&f.ek&&args.p_ct)o=await fdDec(f.ek,args.p_ct)}catch(e){}
  if(fn==="feed_post")return{lb:"📣 Post: "+String(o&&o.t||"to the Feed").slice(0,70),urg:!!(o&&o.u)};
  if(fn==="feed_ack")return{lb:args&&args.p_note?"💬 Reply: "+String(args.p_note).slice(0,60):"✓ Got it on a post"};
  if(fn==="feed_req"){if(o&&o.k==="ck")return{lb:"📍 Check-in: "+(o.me?o.me+" → ":"")+(o.st||"")};return{lb:"🙋 "+(o&&o.ty?o.ty:"Request")+(o&&o.note?": "+String(o.note).slice(0,50):"")}}
  if(fn==="page_req")return{lb:"📍 Check-in"};return{lb:fn}}
async function queue(fn,args,meta){const L=await label(fn,args);const it={fn,args,t:Date.now(),fm:1,lb:L.lb,n:(meta&&meta.alert)||null};
  if(fn==="feed_post"){it.tmp=-Date.now();it.n={feed:args.p_feed,lk:args.p_leader_key,urg:!!L.urg}}
  S.outbox.push(it);S.outbox=S.outbox.slice(-200);save();paint();
  toast("📶 No signal. Saved on this phone; it sends by itself when you have a bar.");
  return fn==="feed_post"?it.tmp:null}
{const _rpc=SB.rpc.bind(SB);SB.rpc=async function(fn,args,meta){
  if(Q.has(fn)&&!ctl(fn,args)){
    if(navigator.onLine===false||(S.field&&netDown))return queue(fn,args,meta);
    try{const r=await _rpc(fn,args,meta);
      /* 1.1's outbox already saved it (Got its and requests): it answers null; label it and show the bar */
      const last=S.outbox[S.outbox.length-1];if(r===null&&last&&last.args===args){netDown=true;if(!last.lb){const L=await label(fn,args);last.lb=L.lb;last.fm=1;save()}paint();return r}
      okNet();return r}catch(e){if(NETERR.test(String(e&&e.message||e))){netDown=true;paint();return queue(fn,args,meta)}throw e}}
  try{const r=await _rpc(fn,args,meta);okNet();return r}catch(e){if(NETERR.test(String(e&&e.message||e))){netDown=true;paint()}throw e}}}
/* once the waiting posts are out, drop the stand-ins; the next pull brings the real ones */
function tidy(){if(S.outbox.some(x=>x.fn==="feed_post"))return;let gone=0;
  for(const f of S.feeds||[])if((f.posts||[]).some(p=>p.id<0)){f.posts=f.posts.filter(p=>p.id>=0);gone++}
  if(gone){save();if(typeof fdPollAll==="function"&&Date.now()-lastPoll>3000){lastPoll=Date.now();Promise.resolve(fdPollAll(true)).then(()=>{if(view==="feed"||view==="board")redraw()}).catch(()=>{})}}}
const redraw=()=>{const y=window.scrollY;render();window.scrollTo(0,y)};
/* Field mode saves battery and data: the 2-minute background pull runs every 10 minutes instead, and never with no signal */
if(typeof refreshAll==="function"){const _ra=refreshAll;refreshAll=function(quiet,force){if(quiet&&navigator.onLine===false)return Promise.resolve();
  if(quiet&&!force&&S.field&&Date.now()-(S.fmPull||0)<FIELD_REFRESH)return Promise.resolve();if(quiet)S.fmPull=Date.now();return _ra.apply(this,arguments)}}
/* the bar */
function paint(){const n=S.outbox.length;let el=document.getElementById("fmPill");
  const state=off()?"off":n?"send":S.field?"ok":"";
  if(view==="field"){const m=document.getElementById("fmBody");if(m&&m.dataset.n!==String(n)+state)draw()}
  if(!state||view==="field"){if(el)el.remove();return}
  if(!el){el=document.createElement("button");el.id="fmPill";el.type="button";el.setAttribute("aria-live","polite");document.body.appendChild(el)}
  el.className="fm-pill fm-"+state;
  const tx=state==="off"?`📶 No signal · the app still works${n?" · "+n+" waiting":""}`:state==="send"?`↑ Sending ${n} saved item${n>1?"s":""}…`:"📶 Field mode · all sent";
  if(el.textContent!==tx)el.textContent=tx;}
window.addEventListener("online",()=>{netDown=false;paint()});window.addEventListener("offline",paint);
setInterval(()=>{paint();tidy()},2500);
/* the screen */
const ago2=t=>t?(typeof ago==="function"?ago(t):new Date(t).toLocaleTimeString()):"never";
function html(){const n=S.outbox.length,o=off();
  return `<div id="fmBody" data-n="${n}${o?"off":n?"send":S.field?"ok":""}"><div class="sechead" style="margin-top:12px"><h2>Field mode</h2><button class="chip" data-go="tools" style="cursor:pointer">Tools ▸</button></div>
  <div class="card fm-hero ${o?"bad":"good"}"><div class="fm-sig">${o?"📵":"📶"}</div><div><b>${o?"No signal":"Online"}</b><div class="note" style="margin:2px 0 0">${o?"Everything still works. It sends when you get a bar.":n?"Sending what's waiting…":"Everything is sent."} Last sync ${esc(ago2(S.fmSync))}.</div></div></div>
  <div class="card"><label class="fm-sw"><span><b>Field mode</b><span class="note" style="display:block;margin:2px 0 0">For the range or the training area. Keeps the bar on screen, checks for updates every 10 minutes instead of 2 to save battery and data, and holds things for signal without trying first.</span></span><input type="checkbox" id="fmOn"${S.field?" checked":""} role="switch" aria-label="Field mode"><i></i></label></div>
  <div class="sech"><h2>Waiting to send</h2>${n?`<span class="note" style="margin:0">${n}</span>`:""}</div>
  ${n?`<div class="card fm-q">${S.outbox.map((x,i)=>`<div class="fm-row"><span style="flex:1;min-width:0"><span class="fm-t">${esc(x.lb||x.fn)}</span><span class="fm-s">Saved ${esc(ago2(x.t))}</span></span><button class="chip fm-del" data-fmdel="${i}" style="cursor:pointer">${armedDel===i?"Tap again":"Delete"}</button></div>`).join("")}</div>
    <button class="btn" id="fmSend" style="width:100%;margin-top:10px">↑ Send now</button>`:`<div class="card" style="align-items:center;text-align:center"><b style="color:var(--s-onhand)">✓ Nothing waiting</b></div>`}
  <div class="sech"><h2>Before you lose signal</h2></div>
  <div class="card"><p class="note" style="margin:0 0 8px">Pull the latest roster, Feed and calendar onto this phone so it's all there in the field.</p><button class="btn alt" id="fmReady" style="width:100%">${readyAt&&Date.now()-readyAt<3e4?"Getting the latest…":"⬇ Get ready for the field"}</button>${S.fmReady?`<p class="note" style="margin:8px 0 0">✓ Saved on this phone ${esc(ago2(S.fmReady))}</p>`:""}</div>
  <div class="sech"><h2>Works with no signal</h2></div>
  <div class="card fm-list"><div>✓ Roster, statuses and headcounts</div><div>✓ Check-ins and Got its (they wait, then send)</div><div>✓ Feed posts and replies (they wait, then send)</div><div>✓ Muster, duty, calendar and your notes</div>
  <div class="fm-need">Needs signal: phone alerts going out, recall texts and calls, invites, Scan and Ask.</div></div></div>`}
function draw(){const m=$("#main");if(m&&view==="field")m.innerHTML=html()}
{const _r=render;render=function(){if(view==="field"){renderTabs();draw();if(typeof animateView==="function")animateView();return}return _r.apply(this,arguments)}}
/* stand-in post so a leader sees it right away */
{const ob=()=>S.outbox.filter(x=>x.fn==="feed_post"&&x.tmp);
  if(typeof renderFeed==="function"){const _rf=renderFeed;renderFeed=function(){const r=_rf.apply(this,arguments);try{const m=$("#main");if(!m)return r;
    for(const x of ob())m.querySelectorAll(`[data-pid="${x.tmp}"],article[data-id="${x.tmp}"]`).forEach(a=>{if(!a.querySelector(".fm-wait"))a.insertAdjacentHTML("afterbegin",`<div class="fm-wait">📶 Waiting for signal · sends by itself</div>`)})}catch(e){}return r}}}
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;
  if(t.closest("#fmPill")){e.preventDefault();view="field";render();window.scrollTo(0,0);return}
  if(t.closest("#fmSend")){e.stopImmediatePropagation();netDown=false;window.dispatchEvent(new Event("online"));toast(navigator.onLine===false?"Still no signal. It sends when you get a bar.":"Sending…");setTimeout(draw,1200);return}
  const d=t.closest("[data-fmdel]");if(d){e.stopImmediatePropagation();const i=+d.dataset.fmdel;if(armedDel!==i){armedDel=i;draw();setTimeout(()=>{if(armedDel===i){armedDel=null;draw()}},4000);return}
    armedDel=null;const x=S.outbox.splice(i,1)[0];if(x&&x.tmp)for(const f of S.feeds||[])f.posts=(f.posts||[]).filter(p=>p.id!==x.tmp);save();paint();draw();toast("Deleted. It won't be sent.");return}
  if(t.closest("#fmReady")){e.stopImmediatePropagation();if(off()){toast("No signal right now. Try again when you have a bar.");return}readyAt=Date.now();draw();
    const done=()=>{S.fmReady=Date.now();readyAt=0;save();draw();toast("✓ Ready for the field. The latest is saved on this phone.")};
    try{Promise.resolve(typeof refreshAll==="function"?refreshAll(true,1):null).then(done,done)}catch(_){done()}return}},true);
document.addEventListener("change",e=>{if(e.target.id!=="fmOn")return;S.field=e.target.checked;if(S.field)S.fmPull=0;save();paint();draw();toast(S.field?"📶 Field mode on. Updates every 10 minutes; nothing gets lost.":"Field mode off")});
/* Tools tile */
if(typeof renderTools==="function"){const _rt=renderTools;renderTools=function(){const r=_rt.apply(this,arguments);try{const g=$("#main .tgrid");if(g&&!g.querySelector('[data-go="field"]'))g.insertAdjacentHTML("beforeend",`<button data-go="field"><span class="ic">${svg("muster")}</span><span><b>Field mode</b><small>Works with no signal, sends later</small></span></button>`)}catch(e){}return r}}
window.fieldMode={paint,queue,get netDown(){return netDown},set netDown(v){netDown=!!v;paint()},tidy};
setTimeout(paint,1600);
const st=document.createElement("style");st.textContent=`
#v11Off{display:none!important}
.fm-pill{position:fixed;left:50%;transform:translateX(-50%);top:calc(70px + env(safe-area-inset-top,0px));z-index:45;border:0;border-radius:999px;padding:8px 15px;font:inherit;font-size:13px;font-weight:800;box-shadow:0 8px 22px rgba(0,0,0,.25);max-width:92vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}
.fm-off{background:#2b1416;color:#ffb4b6}.fm-send{background:var(--ink);color:var(--bg)}.fm-ok{background:#123524;color:#9ff0c6}
.fm-hero{flex-direction:row!important;align-items:center;gap:12px}.fm-hero .fm-sig{font-size:30px}.fm-hero.bad{border-color:#e5484d}.fm-hero.good{border-color:var(--s-onhand)}
.fm-sw{display:flex;align-items:center;gap:12px;cursor:pointer}.fm-sw input{position:absolute;opacity:0;width:1px;height:1px}
.fm-sw i{flex:0 0 50px;height:30px;border-radius:15px;background:var(--line);position:relative;transition:background .2s}.fm-sw i:after{content:"";position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform .2s}
.fm-sw input:checked+i{background:var(--s-onhand)}.fm-sw input:checked+i:after{transform:translateX(20px)}.fm-sw input:focus-visible+i{outline:3px solid var(--s-aob);outline-offset:2px}
.fm-q{display:block!important;padding:4px 14px!important}
.fm-t{display:block;font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fm-s{display:block;font-size:12px;color:var(--muted);margin-top:2px}
.fm-row{display:flex;align-items:center;gap:10px;padding:10px 2px;border-top:1px solid var(--line)}.fm-row:first-child{border-top:0}
.fm-list div{font-size:14px;padding:4px 0}.fm-list .fm-need{color:var(--muted);font-size:13px;border-top:1px solid var(--line);margin-top:6px;padding-top:8px}
.fm-wait{font-size:12px;font-weight:800;color:#9a6200;background:#fff2d6;border-radius:10px;padding:5px 9px;margin-bottom:6px}
`;document.head.appendChild(st);
})();
