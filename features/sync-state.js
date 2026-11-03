/* Accounted For 4.77.14: Home no longer looks live while it is still showing saved numbers.
   The app paints the last saved board first, then pulls fresh section updates a moment later. Until that pull finishes
   the numbers are dimmed, the "● Live sections" badge reads "Updating…" (with the time of the saved data), and "All systems
   working" waits. When it finishes the badge goes back to live with "synced HHMM". If the server can't be reached the badge
   says so and shows how old the saved numbers are. Only boards with Live sections on are affected. */
(()=>{
const SLOW_MS=10000;
let state=null,okAt=0,hiddenAt=0;/* state: syncing | slow | fresh | failed */
const hhmm=t=>{const d=new Date(t);return String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0")};
function savedAt(){try{const v=Object.values(S.secAt||{}).map(Number).filter(Boolean);return v.length?Math.max(...v):0}catch(e){return 0}}
function start(){state="syncing";setTimeout(()=>{if(state==="syncing"){state="slow";apply()}},SLOW_MS)}
function css(){if(document.getElementById("afSyncCss"))return;const st=document.createElement("style");st.id="afSyncCss";
  st.textContent=`.card.hero.af-sync .wring .rin,.card.hero.af-sync .sgrid{opacity:.5;transition:opacity .25s ease}
.card.hero.af-sync .wring .rin,.card.hero.af-sync .sgrid{animation:afsp 1.2s ease-in-out infinite}
@keyframes afsp{50%{opacity:.3}}
.sysic.ok.af-sync{background:#8a94a6;box-shadow:0 0 0 4px rgba(138,148,166,.2);animation:afsp 1.2s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.card.hero.af-sync .wring .rin,.card.hero.af-sync .sgrid,.sysic.ok.af-sync{animation:none}}`;document.head.appendChild(st)}
function apply(){
  const h=document.querySelector("#main .card.hero");if(!h)return;
  const b=h.querySelector(":scope > div:first-child > span:last-child");if(!b||!b.style)return;
  if(!S.board){h.classList.remove("af-sync");return}
  if(state===null)start();
  css();
  const sv=savedAt(),busy=state==="syncing"||state==="slow";
  h.classList.toggle("af-sync",busy);
  b.dataset.afsync=state;
  if(state==="syncing")b.textContent="Updating…"+(sv?" · saved "+hhmm(sv):"");
  else if(state==="slow")b.textContent="Still updating…"+(sv?" · saved "+hhmm(sv):"");
  else if(state==="failed")b.textContent="Can't reach server"+(sv?" · saved "+hhmm(sv):"");
  else b.textContent="● Live sections"+(okAt?" · synced "+hhmm(okAt):"");
  const ic=document.querySelector("#main #sysIc.ok");if(ic){ic.classList.toggle("af-sync",busy);const t=busy?"Updating… showing saved numbers":"All systems working"+(SB.okAt?" · server reached "+ago(SB.okAt):"");ic.setAttribute("aria-label",t+". Open the Dashboard");ic.title=t}
  document.querySelectorAll("#main .note").forEach(n=>{if(n.dataset.afline||/^● All systems working/.test(n.textContent)){if(!n.dataset.afline)n.dataset.afline=n.textContent;n.textContent=busy?"◌ Updating… showing saved numbers":n.dataset.afline}});
  b.style.color=state==="failed"?"var(--warn)":busy?"var(--muted)":"var(--s-onhand)"}
{const _p=livePollBoard;
  livePollBoard=async function(){const B=S.board,was=lvBusy;const r=await _p.apply(this,arguments);
    if(!B||was||!S.board)return r;
    const wasBusy=state==="syncing"||state==="slow"||state===null;
    if(S.board.err)state="failed";else{state="fresh";okAt=Date.now()}
    try{
      if(wasBusy&&view==="board"){const a=document.activeElement&&document.activeElement.tagName;
        if(a!=="INPUT"&&a!=="TEXTAREA"){const y=window.scrollY;render();window.scrollTo(0,y)}else apply()}
      else apply()}catch(e){}return r}}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{apply()}catch(e){}return r}}
window.afSyncState=v=>{state=v;if(v=="fresh")okAt=Date.now();apply()};/* lets tests (and other features) set the state */
document.addEventListener("visibilitychange",()=>{if(document.hidden){hiddenAt=Date.now();return}
  if(S.board&&hiddenAt&&Date.now()-hiddenAt>60000){hiddenAt=0;start();try{apply()}catch(e){}}});
})();
