/* Accounted For 4.12: the news card on Home (design B2, one slim card).
   One row-height card under Today: a glyph, the headline, "1/5" and dots. Swipe or tap the arrows to move through
   local weather, safety alerts for your area and world headlines. Tap the headline to open it.
   The "news" Edge Function pulls everything from free public sources (no API keys) and caches it for 10 minutes.
   Location: only if you turn it on, and only rounded to about 1 km. It's sent to the news function to get weather and
   alerts, and never stored on the server. The card can be turned off from its ⋯ menu. */
(()=>{
const N=()=>(S.news=S.news&&typeof S.news==="object"?S.news:{});
let i=0,busy=false;
const GL={wx:"🌤",alert:"⚠",news:"🌐"};
const ago=t=>{const m=Math.round((Date.now()-t)/60000);return m<1?"now":m<60?m+"m":m<1440?Math.round(m/60)+"h":Math.round(m/1440)+"d"};
function cards(){return Array.isArray(N().cards)?N().cards:[]}
async function load(force){const X=N();if(X.off||busy)return;if(!force&&X.at&&Date.now()-X.at<10*60000)return;busy=true;
  try{const body={};if(X.loc){body.lat=X.loc.lat;body.lon=X.loc.lon}
    const r=await fetch(SB.url+"/functions/v1/news",{method:"POST",headers:{apikey:SB.key,"Content-Type":"application/json"},body:JSON.stringify(body)});
    if(r.status===404){X.err="setup";X.cards=[];rawSave();paint();return}
    const o=await r.json();if(!Array.isArray(o.cards))throw new Error("bad answer");
    X.cards=o.cards.slice(0,8).map(c=>({k:["wx","alert","news"].includes(c.k)?c.k:"news",t:String(c.t||"").slice(0,120),s:String(c.s||"").slice(0,140),url:/^https?:\/\//.test(c.url||"")?String(c.url).slice(0,500):"",at:+c.at||Date.now(),sev:String(c.sev||"").slice(0,12)}));
    X.at=Date.now();X.err="";if(i>=X.cards.length)i=0;rawSave();paint()}
  catch(e){X.err=String(e.message||e).slice(0,60);rawSave();paint()}
  finally{busy=false}}
window.newsLoad=load;
function html(){const X=N();if(X.off||!(isLeaderPhone()||view==="me")||(typeof appNewsOff==="function"&&appNewsOff()))return"";const L=cards();const c=L[i]||null;
  const body=c?`<button class="nw-main" data-nw-open${c.url?` data-nw-url="${esc(c.url)}"`:""} aria-label="Open"><span class="nw-g${c.k==="alert"?" nw-al":""}">${GL[c.k]}</span><span class="nw-tx"><span class="nw-t">${esc(c.t)}</span><span class="nw-s">${esc(c.s)}${c.at?" · "+ago(c.at):""}</span></span></button>`
    :`<div class="nw-main"><span class="nw-g">${GL.news}</span><span class="nw-tx"><span class="nw-t">${X.err==="setup"?"News isn't set up on your server":X.err?"Couldn't load the news":busy?"Loading…":"No news yet"}</span><span class="nw-s">${X.err==="setup"?"Leader: DATA → System check":X.err?"Check signal and pull to refresh":X.loc?"Weather, alerts and world news":"Turn on location for weather and alerts (⋯)"}</span></span></div>`;
  return `<div class="card nw" id="nwCard"><div class="nw-row">${body}<div class="nw-ctl"><button data-nw-prev aria-label="Previous">‹</button><span class="nw-n">${L.length?(i+1)+"/"+L.length:"–"}</span><button data-nw-next aria-label="Next">›</button><button data-nw-menu aria-label="News options">⋯</button></div></div>
    ${view==="me"&&!X.loc?`<div><button class="chip" data-nw-menu style="cursor:pointer">🌤 Add local weather</button></div>`:""}<div class="nw-dots">${L.map((x,j)=>`<i${j===i?' class="on"':""}${x.k==="alert"?' style="background:var(--warn)"':""}></i>`).join("")}</div></div>`}
function paint(){const old=$("#nwCard");if(!old)return;const h=html();if(!h){old.remove();return}old.outerHTML=h}
function step(d){const L=cards();if(!L.length)return;i=(i+d+L.length)%L.length;paint()}
function place(){const m=$("#main");if(!m||$("#nwCard"))return;const h=html();if(!h)return;
  const strip=[...m.querySelectorAll(".sech")].find(x=>/^Today/.test(x.textContent.trim()));let after=strip?strip.nextElementSibling:null;
  if(after)after.insertAdjacentHTML("afterend",h);else m.insertAdjacentHTML("beforeend",h);
  if(!cards().length||Date.now()-(N().at||0)>10*60000)load(false)}
{const _rb=renderBoard;renderBoard=function(){const r=_rb.apply(this,arguments);try{if(view==="board")place()}catch(e){}return r}}
/* My page (members): the same card, under "Today for me". The page is rebuilt after it renders, so place it a tick later. */
function placeMe(){if(view!=="me")return;const m=$("#main");if(!m||$("#nwCard"))return;const h=html();if(!h)return;
  const hd=[...m.querySelectorAll(".sech")].find(x=>/^Today for me/i.test(x.textContent.trim()));const strip=hd?hd.nextElementSibling:null;
  if(strip)strip.insertAdjacentHTML("afterend",h);else{const ck=$("#ckCard");if(ck)ck.insertAdjacentHTML("afterend",h);else m.insertAdjacentHTML("beforeend",h)}
  if(!cards().length||Date.now()-(N().at||0)>10*60000)load(false)}
{const _r=render;render=function(){const r=_r.apply(this,arguments);if(view==="me")setTimeout(()=>{try{placeMe()}catch(e){}},0);return r}}

/* swipe inside the card moves the card, not the tab (the tab swipe is a later listener; stop it here) */
let x0=null;
document.addEventListener("touchstart",e=>{const c=e.target.closest&&e.target.closest("#nwCard");x0=c?e.touches[0].clientX:null;if(c)e.stopImmediatePropagation()},{passive:true,capture:true});
document.addEventListener("touchend",e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;e.stopImmediatePropagation();if(Math.abs(dx)>40)step(dx<0?1:-1)},{passive:true,capture:true});

/* taps */
function menu(){const X=N();sheetCtx={kind:"news"};$("#sheetT").innerHTML=`News and weather<small>Local weather, safety alerts and world headlines, from free public sources.</small>`;
  $("#sheetOpts").innerHTML=`<div class="panel" style="margin:0" data-noxl>
    <p class="note">${X.loc?`Location on (rounded to about 1 km${X.loc.n?" · "+esc(X.loc.n):""}). It's only used to fetch weather and alerts, never stored.`:"Location is off, so the card shows world news only."}</p>
    <button class="btn" id="nwLoc">${X.loc?"Update my location":"Use my location for weather and alerts"}</button>
    ${X.loc?`<button class="btn alt" id="nwLocOff">Stop using my location</button>`:""}
    <button class="btn alt" id="nwRefresh">Refresh now</button>
    <button class="btn alt" id="nwOff">Hide the news card</button></div>`;
  const sh=$("#sheet");sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add("open")))}
async function useLoc(){if(!navigator.geolocation){toast("Location isn't available on this device.");return}
  const t=$("#nwLoc");if(t){t.disabled=true;t.textContent="Finding you…"}
  navigator.geolocation.getCurrentPosition(p=>{N().loc={lat:Math.round(p.coords.latitude*100)/100,lon:Math.round(p.coords.longitude*100)/100};N().at=0;rawSave();closeSheet();load(true);toast("Location on. Loading weather…")},
    e=>{if(t){t.disabled=false;t.textContent="Use my location for weather and alerts"}toast(e.code===1?"Location is turned off for this app. Allow it in Settings.":"Couldn't get your location.")},{maximumAge:600000,timeout:15000});}
document.addEventListener("click",e=>{const t=e.target;
  if(t.closest("[data-nw-prev]")){e.stopImmediatePropagation();step(-1);return}
  if(t.closest("[data-nw-next]")){e.stopImmediatePropagation();step(1);return}
  if(t.closest("[data-nw-menu]")){e.stopImmediatePropagation();menu();return}
  const o=t.closest("[data-nw-open]");if(o){e.stopImmediatePropagation();const u=o.dataset.nwUrl;if(u)window.open(u,"_blank","noopener");return}
  if(!sheetCtx||sheetCtx.kind!=="news")return;
  if(t.closest("#nwLoc")){e.stopImmediatePropagation();useLoc();return}
  if(t.closest("#nwLocOff")){e.stopImmediatePropagation();delete N().loc;N().at=0;rawSave();closeSheet();load(true);toast("Location off");return}
  if(t.closest("#nwRefresh")){e.stopImmediatePropagation();N().at=0;closeSheet();load(true);return}
  if(t.closest("#nwOff")){e.stopImmediatePropagation();N().off=true;rawSave();closeSheet();paint();toast("News card hidden. Turn it back on in Tools → Settings.");return}},true);
/* the way back on: a switch in Settings */
{const _rt=renderTools;renderTools=function(){const r=_rt.apply(this,arguments);try{if(!N().off)return r;let g=[...document.querySelectorAll("#main .tgrid")].find(x=>x.id!=="sgGrid");if(!g){g=document.createElement("div");g.className="tgrid";$("#main").appendChild(g)}g.insertAdjacentHTML("beforeend",`<button id="nwOn"><span class="ic">🌐</span><span><b>News on Home</b><small>Hidden · tap to show</small></span></button>`);if(typeof sgRegroup==="function")sgRegroup()}catch(e){}return r}}
document.addEventListener("click",e=>{if(!e.target.closest("#nwOn"))return;N().off=false;N().at=0;rawSave();view="board";render();toast("News card is back on Home")},true);

every(10*60000,()=>{if((view==="board"||view==="me")&&!N().off)load(false)},"news");
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&(view==="board"||view==="me")&&!N().off)load(false)});
{const _ra=refreshAll;refreshAll=function(){const r=_ra.apply(this,arguments);try{N().at=0;load(true)}catch(e){}return r}}

const css=document.createElement("style");css.textContent=`
.nw{padding:10px 12px;gap:6px}.nw-row{display:flex;align-items:center;gap:8px}
.nw-main{flex:1;min-width:0;display:flex;align-items:center;gap:10px;border:0;background:transparent;font:inherit;color:var(--ink);text-align:left;padding:0}
.nw-g{width:40px;height:40px;border-radius:12px;background:var(--bg);border:1px solid var(--line);display:grid;place-items:center;font-size:20px;flex:0 0 40px}.nw-al{background:var(--warn);color:#fff;border-color:transparent}
.nw-tx{min-width:0;display:flex;flex-direction:column}.nw-t{font-size:14px;font-weight:800;line-height:1.25;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.nw-s{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nw-ctl{display:flex;align-items:center;gap:2px;flex:0 0 auto}.nw-ctl button{border:0;background:transparent;font:inherit;font-size:20px;font-weight:800;color:var(--muted);width:28px;height:32px;padding:0;cursor:pointer}.nw-n{font-size:11.5px;font-weight:800;color:var(--muted);font-variant-numeric:tabular-nums;min-width:28px;text-align:center}
.nw-dots{display:flex;justify-content:center;gap:5px}.nw-dots i{width:5px;height:5px;border-radius:50%;background:var(--line);display:block}.nw-dots i.on{background:var(--ink);width:14px;border-radius:3px}`;
document.head.appendChild(css);

if(typeof HELP==="object")HELP.news=["News on Home","One slim card under Today: weather, safety alerts and world headlines.",["Swipe or use ‹ › to move between cards. Tap a headline to open it.","⋯ turns location on (for weather and alerts, rounded to about 1 km, never stored) or hides the card."]];
})();
