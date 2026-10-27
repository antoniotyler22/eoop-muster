/* Accounted For 1.6: the moment.
   1. Headcount ring on Home (and on the check-in screen during a recall / emergency check-in). It counts up as people
      check in, with a light tap on the phone each time, and a celebration at 100%.
   2. 30-second demo drill: sample people check themselves in, so anyone (and App Review) sees it work without inviting
      anyone. Runs in its own screen and never touches real data.
   3. Share card: "All 24 accounted for ✓ 7:42 PM" as an image with a small Accounted For mark.
   4. Rating prompt (iPhone app only) right after a real 100% check-in, at most once every 120 days. */
(()=>{
const NATIVE_ON=()=>!!(window.MBN&&MBN.on);
function tap(kind){try{const H=window.MBN&&MBN.Haptics;if(H){if(kind==="win")H.notification({type:"SUCCESS"});else H.impact({style:"LIGHT"});return}
  if(navigator.vibrate)navigator.vibrate(kind==="win"?[40,60,40,60,120]:12)}catch(e){}}
const reduce=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}};

/* ---------- styles ---------- */
{const st=document.createElement("style");st.textContent=`
.wring{display:flex;align-items:center;gap:16px;margin:6px 0 10px}
.wring svg{width:132px;height:132px;flex:none;transform:rotate(-90deg)}
.wring .bg{stroke:var(--line,#e3e6ea);fill:none}
.wring .fg{stroke:var(--s-onhand,#17795f);fill:none;stroke-linecap:round;transition:stroke-dashoffset .7s cubic-bezier(.2,.8,.2,1)}
.wring .rin{position:relative;width:132px;height:132px;flex:none}
.wring .rtx{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1}
.wring .rtx b{font-size:40px;font-weight:800;letter-spacing:-.02em}
.wring .rtx small{font-size:13px;color:var(--muted);font-weight:700;margin-top:4px}
.wring .rside{flex:1;min-width:0}
.wring .rside .pc{font-size:30px;font-weight:800;color:var(--s-onhand)}
.wring .rside .lb{font-size:12px;font-weight:800;letter-spacing:.08em;color:var(--muted)}
.wring.done .fg{stroke:var(--s-onhand)}
.wring.pulse .rin{animation:wpulse .5s ease}
@keyframes wpulse{0%{transform:scale(1)}40%{transform:scale(1.06)}100%{transform:scale(1)}}
#wConf{position:fixed;inset:0;pointer-events:none;z-index:9998}
#wWin{position:fixed;left:16px;right:16px;bottom:calc(96px + env(safe-area-inset-bottom));z-index:9999;background:var(--card,#fff);border:2px solid var(--s-onhand);border-radius:20px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.25);text-align:center;animation:wup .35s ease}
#wWin b{display:block;font-size:22px}
@keyframes wup{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}
#wDrill{position:fixed;inset:0;z-index:9990;background:var(--bg,#f4f5f7);overflow:auto;padding:calc(16px + env(safe-area-inset-top)) 16px calc(24px + env(safe-area-inset-bottom))}
#wDrill .wring{justify-content:center;flex-direction:column;gap:8px}
#wDrill .wring svg,#wDrill .wring .rin{width:220px;height:220px}
#wDrill .wring .rtx b{font-size:64px}
#wDrill .feed{max-width:520px;margin:12px auto 0;display:grid;gap:6px}
#wDrill .feed div{background:var(--card,#fff);border-radius:12px;padding:9px 12px;font-weight:700;animation:wup .3s ease}
#wDrill .feed small{color:var(--muted);font-weight:600}
`;document.head.appendChild(st)}

/* ---------- the ring ---------- */
const R=58,C=2*Math.PI*R;
const LAST={};
function ringHTML(key,n,total,label){const p=total?n/total:0;const prev=LAST[key];const fromP=prev&&prev.total?prev.n/prev.total:p;
  return `<div class="wring${total&&n>=total?" done":""}" data-wring="${key}" data-n="${n}" data-t="${total}"><div class="rin"><svg viewBox="0 0 132 132" aria-hidden="true"><circle class="bg" cx="66" cy="66" r="${R}" stroke-width="12"/><circle class="fg" cx="66" cy="66" r="${R}" stroke-width="12" stroke-dasharray="${C}" stroke-dashoffset="${C*(1-fromP)}" data-to="${C*(1-p)}"/></svg>
    <div class="rtx"><b data-wnum="${prev?prev.n:n}">${prev?prev.n:n}</b><small>of ${total}</small></div></div>
    <div class="rside">${label?`<div class="lb">${esc(label)}</div>`:""}<div class="pc">${total?Math.round(100*p):0}%</div><div class="note" style="margin:2px 0 0">${total&&n>=total?"Everyone accounted for ✓":total?(total-n)+" to go":"Add people to start"}</div>
    ${total?`<button class="chip" data-wshare="${key==="drill"?"demo":key}" style="cursor:pointer;margin-top:6px">Share</button>`:""}</div></div>`}
function runRing(el,real){const key=el.dataset.wring,n=+el.dataset.n,total=+el.dataset.t;const prev=LAST[key];LAST[key]={n,total};
  const fg=el.querySelector(".fg");requestAnimationFrame(()=>requestAnimationFrame(()=>{fg.style.strokeDashoffset=fg.dataset.to}));
  const num=el.querySelector("[data-wnum]");const from=prev?prev.n:n;
  if(from!==n&&!reduce()){const t0=performance.now(),d=650;const step=t=>{const q=Math.min(1,(t-t0)/d),e=1-Math.pow(1-q,3);num.textContent=Math.round(from+(n-from)*e);if(q<1)requestAnimationFrame(step)};requestAnimationFrame(step)}else num.textContent=n;
  if(prev&&n>prev.n){tap();el.classList.add("pulse");setTimeout(()=>el.classList.remove("pulse"),520)}
  if(prev&&total&&n>=total&&prev.n<prev.total)celebrate(n,total,real)}

/* ---------- Home: ring in the hero card ---------- */
function rcCounts(){try{if(!(S.rc&&S.rc.open))return null;const pool=recallPool();const ok=pool.filter(m=>(S.rc.res||{})[m.id]==="ok"||(S.rc.ci||{})[m.id]).length;return {n:ok,t:pool.length}}catch(e){return null}}
function heroRing(){const hero=document.querySelector("#main .card.hero");if(!hero||hero.querySelector(".wring"))return;
  const big=hero.querySelector('[data-n="oh"]');if(!big)return;const row=big.parentElement;const bar=hero.querySelector(".hbar");
  const rc=rcCounts();let n,t,lab;
  const top=hero.querySelector(".lbl");if(rc){n=rc.n;t=rc.t;if(top)top.textContent=S.rc.em?"EMERGENCY CHECK-IN":"CHECKED IN"}else{const T=counts().T;n=T["On Hand"];t=T.total}lab="";
  big.removeAttribute("data-n");row.insertAdjacentHTML("beforebegin",ringHTML(rc?"rc":"oh",n,t,lab));row.remove();if(bar)bar.remove();
  runRing(hero.querySelector(".wring"),true)}
function recallRing(){if(view!=="recall"||document.querySelector("#main .wring"))return;const rc=rcCounts();if(!rc)return;
  $("#main").insertAdjacentHTML("afterbegin",`<div class="card" style="margin-top:12px">${ringHTML("rc",rc.n,rc.t,S.rc.em?"EMERGENCY CHECK-IN":"CHECKED IN")}</div>`);runRing(document.querySelector("#main .wring"),true)}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{if(view==="board")heroRing();recallRing()}catch(e){}return r}}

/* ---------- celebration ---------- */
function confetti(){if(reduce())return;let c=$("#wConf");if(c)c.remove();c=document.createElement("canvas");c.id="wConf";document.body.appendChild(c);
  const dpr=Math.min(2,devicePixelRatio||1);c.width=innerWidth*dpr;c.height=innerHeight*dpr;let x=null;try{x=c.getContext("2d")}catch(e){}if(!x){c.remove();return}x.scale(dpr,dpr);
  const cols=["#17795f","#2f6fde","#f2b705","#c23a5b","#7a4bd1","#0f8b9c"];const P=[];
  for(let i=0;i<140;i++)P.push({x:innerWidth/2+(Math.random()-.5)*80,y:innerHeight*0.38,vx:(Math.random()-.5)*11,vy:-Math.random()*13-4,r:Math.random()*6+3,c:cols[i%cols.length],a:Math.random()*6,s:(Math.random()-.5)*.3});
  const t0=performance.now();const f=t=>{const k=(t-t0)/1000;x.clearRect(0,0,innerWidth,innerHeight);
    for(const p of P){p.vy+=.38;p.vx*=.99;p.x+=p.vx;p.y+=p.vy;p.a+=p.s;x.save();x.translate(p.x,p.y);x.rotate(p.a);x.globalAlpha=Math.max(0,1-k/2.4);x.fillStyle=p.c;x.fillRect(-p.r/2,-p.r/4,p.r,p.r/2);x.restore()}
    if(k<2.4)requestAnimationFrame(f);else c.remove()};requestAnimationFrame(f)}
function celebrate(n,total,real){tap("win");try{confetti()}catch(e){}
  let w=$("#wWin");if(w)w.remove();w=document.createElement("div");w.id="wWin";w.setAttribute("role","status");
  w.innerHTML=`<b>All ${total} accounted for ✓</b><div class="note" style="margin:4px 0 10px">${new Date().toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}</div><div class="row2"><button class="btn" data-wshare="${real?"now":"demo"}">Share it</button><button class="btn alt" data-wclose="1">Done</button></div>`;
  document.body.appendChild(w);if(real)setTimeout(maybeRate,2500)}
document.addEventListener("click",e=>{if(e.target.closest&&e.target.closest("[data-wclose]")){const w=$("#wWin");if(w)w.remove()}});

/* ---------- share card ---------- */
let ICON=null;{const im=new Image();im.onload=()=>ICON=im;im.src="icon-192.png"}
async function cardBlob(n,total,team){const W=1080,H=1080;const c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");
  const all=total&&n>=total;const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,all?"#0f6b52":"#1f3a8a");g.addColorStop(1,all?"#17a37a":"#2f6fde");x.fillStyle=g;x.fillRect(0,0,W,H);
  x.globalAlpha=.08;x.fillStyle="#fff";x.beginPath();x.arc(W*.85,H*.12,260,0,7);x.fill();x.beginPath();x.arc(W*.1,H*.95,220,0,7);x.fill();x.globalAlpha=1;
  const cx=W/2,cy=390,r=190;x.lineWidth=34;x.strokeStyle="rgba(255,255,255,.25)";x.beginPath();x.arc(cx,cy,r,0,7);x.stroke();
  x.strokeStyle="#fff";x.lineCap="round";x.beginPath();x.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+2*Math.PI*(total?n/total:0));x.stroke();
  x.fillStyle="#fff";x.textAlign="center";x.textBaseline="middle";
  if(all){x.lineWidth=30;x.beginPath();x.moveTo(cx-80,cy+5);x.lineTo(cx-20,cy+65);x.lineTo(cx+95,cy-60);x.stroke()}
  else{x.font="800 120px system-ui,-apple-system,Segoe UI,Roboto,sans-serif";x.fillText(String(n),cx,cy-10);x.font="700 40px system-ui,-apple-system,sans-serif";x.fillText("of "+total,cx,cy+75)}
  x.font="800 76px system-ui,-apple-system,Segoe UI,Roboto,sans-serif";x.fillText(all?"All "+total+" accounted for":n+" of "+total+" accounted for",cx,705);
  x.font="600 44px system-ui,-apple-system,sans-serif";x.globalAlpha=.92;
  const d=new Date();x.fillText((team?team+" · ":"")+d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})+" · "+d.toLocaleDateString([],{month:"short",day:"numeric"}),cx,790);x.globalAlpha=1;
  const by=960;x.fillStyle="rgba(255,255,255,.16)";const pw=420;x.beginPath();if(x.roundRect)x.roundRect(cx-pw/2,by-44,pw,88,44);else x.rect(cx-pw/2,by-44,pw,88);x.fill();
  if(ICON)x.drawImage(ICON,cx-pw/2+18,by-30,60,60);x.fillStyle="#fff";x.font="700 36px system-ui,-apple-system,sans-serif";x.textAlign="left";x.fillText("Accounted For",cx-pw/2+94,by+2);
  return await new Promise(res=>c.toBlob(res,"image/png"))}
async function shareCard(n,total,team){const b=await cardBlob(n,total,team);const name="accounted-for.png";
  const text=(total&&n>=total?"All "+total+" accounted for ✓":n+" of "+total+" accounted for")+" · Accounted For";
  try{const f=new File([b],name,{type:"image/png"});if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],text});return}}catch(e){if(e&&e.name==="AbortError")return}
  const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);toast("Image saved. Post it anywhere.")}
window.shareHeadcountCard=shareCard;window.headcountCardBlob=cardBlob;
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-wshare]");if(!b)return;e.stopPropagation();const k=b.dataset.wshare;
  if(k==="demo"&&drill){shareCard(drill.n,drill.t,"Demo drill");return}
  const rc=rcCounts();const T=counts().T;const n=k==="rc"||(k==="now"&&rc)?rc.n:T["On Hand"],t=k==="rc"||(k==="now"&&rc)?rc.t:T.total;shareCard(n,t,unitName())});

/* ---------- rating prompt (iPhone app) ---------- */
function maybeRate(){try{if(!NATIVE_ON()||MBN.platform!=="ios")return;const last=+S.rateAt||0;if(Date.now()-last<120*864e5)return;
  const P=window.Capacitor&&(window.Capacitor.Plugins.Review||window.Capacitor.registerPlugin("Review"));if(!P||!P.request)return;S.rateAt=Date.now();save();P.request().catch(()=>{})}catch(e){}}
window.afMaybeRate=maybeRate;

/* ---------- 30-second demo drill ---------- */
const FIRST=["Ava","Liam","Mia","Noah","Zoe","Eli","Ivy","Leo","Ana","Kai","Lily","Owen","Nora","Luis","Emma","Jack","Sara","Ben","Maya","Sam","Rosa","Max","Lea","Gabe"];
const LAST4=["Reyes","Kim","Patel","Lopez","Brown","Nguyen","Smith","Diaz","Clark","Ortiz","Lee","Young"];
let drill=null;
function drillPeople(){const generic=!S.mode||S.source==="sample";const secs=generic?["Red Team","Blue Team","Green Team"]:SECTIONS.map(s=>s[1]||s[0]);return FIRST.map((f,i)=>({n:f+" "+LAST4[(i*5)%LAST4.length],g:secs[i%secs.length]}))}
function openDrill(){if(drill)return;const P=drillPeople();drill={n:0,t:P.length,P,timers:[]};LAST.drill={n:0,total:P.length};
  let d=$("#wDrill");if(!d){d=document.createElement("div");d.id="wDrill";d.setAttribute("role","dialog");d.setAttribute("aria-label","Demo drill");document.body.appendChild(d)}
  const word=String((MODE().v&&MODE().v.mus)||"check-in").toLowerCase();
  d.innerHTML=`<div style="max-width:520px;margin:0 auto;text-align:center"><div class="note" style="font-weight:800;letter-spacing:.08em">DEMO DRILL · SAMPLE PEOPLE</div><h2 style="margin:4px 0 0">Watch everyone check in</h2>
    <p class="note" style="margin:4px 0 10px">This is what you see during a real ${esc(word)}. Nothing here is sent to anyone.</p><div id="wDRing"></div>
    <div class="row2" style="margin-top:10px"><button class="btn alt" id="wDStop">Close</button><button class="btn" id="wDAgain" hidden>Run it again</button></div></div><div class="feed" id="wDFeed"></div>`;
  d.hidden=false;document.body.style.overflow="hidden";paintDrill();
  const order=P.map((p,i)=>i).sort(()=>Math.random()-.5);let at=900;
  order.forEach((idx,k)=>{at+=k<4?1300:k<18?700+Math.random()*700:1100+Math.random()*900;drill.timers.push(setTimeout(()=>{if(!drill)return;drill.n++;
    const p=P[idx];const f=$("#wDFeed");if(f)f.insertAdjacentHTML("afterbegin",`<div>✓ ${esc(p.n)} <small>· ${esc(p.g)} · just now</small></div>`);paintDrill()},at))});
  drill.timers.push(setTimeout(()=>{const a=$("#wDAgain");if(a)a.hidden=false},at+1500))}
function paintDrill(){const box=$("#wDRing");if(!box||!drill)return;box.innerHTML=ringHTML("drill",drill.n,drill.t,"CHECKED IN");
  const el=box.querySelector(".wring");const prev=LAST.drill;runRing(el,false);if(prev&&drill.n>=drill.t&&prev.n<drill.t){} }
function closeDrill(){if(!drill)return;drill.timers.forEach(clearTimeout);drill=null;const d=$("#wDrill");if(d){d.hidden=true;d.innerHTML=""}document.body.style.overflow="";const w=$("#wWin");if(w)w.remove();delete LAST.drill}
window.startDemoDrill=openDrill;
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;
  if(t.closest("[data-wdrill]")){e.stopPropagation();try{closeSheet()}catch(err){}openDrill();return}
  if(t.id==="wDStop"){closeDrill();return}
  if(t.id==="wDAgain"){closeDrill();setTimeout(openDrill,50)}});

/* where the demo lives: Home (empty or sample team), the welcome screen, and Tools → Help */
{const _rb=renderBoard;renderBoard=function(){_rb.apply(this,arguments);if(memberMode()||$("#wDemoBtn"))return;
  if(S.source==="sample"||!S.roster.length){const qa=document.querySelector("#main .qa");const html=`<button class="btn alt" id="wDemoBtn" data-wdrill="1" style="width:100%;margin-top:10px">▶ Watch a 30-second demo drill</button>`;
    if(qa)qa.insertAdjacentHTML("afterend",html);else $("#main").insertAdjacentHTML("beforeend",html)}}}
new MutationObserver(()=>{const w=$("#v11Welcome");if(!w||w.hidden||w.querySelector("[data-wdrill]"))return;const pick=w.querySelector(".sgw-pick");if(!pick)return;
  pick.insertAdjacentHTML("beforeend",`<button class="btn alt" data-wdrill="1" style="min-height:52px">▶ See a 30-second demo</button>`)}).observe(document.body,{childList:true,subtree:true});
{const _rt=renderTools;renderTools=function(){_rt.apply(this,arguments)}}
if(typeof window.openToolGroup==="function"){const og=window.openToolGroup;window.openToolGroup=function(k){og.apply(this,arguments);if(k!=="help"&&k!=="reports")return;const g=document.querySelector("#sheetOpts .tgrid");if(!g)return;
  if(k==="help")g.insertAdjacentHTML("afterbegin",`<button data-wdrill="1"><span class="ic">${svg("muster")}</span><span><b>Demo drill</b><small>Watch 24 people check in</small></span></button>`);
  if(k==="reports")g.insertAdjacentHTML("afterbegin",`<button data-wshare="oh"><span class="ic">${svg("send")}</span><span><b>Share card</b><small>Headcount as an image</small></span></button>`)}}

try{render()}catch(e){}
if(typeof HELP==="object"&&HELP.board)HELP.board[2]=(HELP.board[2]||[]).concat(["The ring counts up as people check in. At 100% you can share an image of it.","Watch a 30-second demo drill to see it work with sample people."]);
})();
