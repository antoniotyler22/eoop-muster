/* Accounted For 4.49: Utilities. (4.50: "Needs you" moved here from Home too, with its × hide-until-tomorrow.)
   Ask your roster and "Need a hand?" (Ask a question, How do I, tour, guide) used to sit on Home. They now live on one
   Utilities screen, opened from a Utilities tile in Tools. Home keeps the numbers and the day. */
(()=>{
const leader=()=>!(typeof memberMode==="function"&&memberMode());
const hand=()=>{const ask=typeof akHidden==="function"&&akHidden()?"":`<button class="btn alt" data-go="ask">💬 Ask a question</button>`;
  return `<div class="panel" id="hmAsk" style="margin-top:14px"><b>Need a hand?</b><p class="note" style="margin:2px 0 8px">Ask about your team, orders or anything, or learn how to do something in this app.</p>
    <div class="row2">${ask}<button class="btn alt" data-go="support">❓ How do I…</button></div>
    <div class="row2" style="margin-top:6px"><button class="btn alt" data-trfull="1">👆 Take the tour</button><a class="btn alt" href="help.html" target="_blank" rel="noopener">📖 Guide</a></div></div>`};
function needs(){if(typeof needsYou!=="function")return "";const ny=needsYou();
  return `<div class="sech"><h2>Needs you</h2>${ny.length?`<span class="note" style="margin:0">${ny.length}</span>`:""}</div>`+(ny.length?`<div class="card ny">${ny.map(x=>`<button data-go="${x.go}"><span class="n tone-${x.tone}">${x.n}</span><span style="flex:1;min-width:0"><span class="t" style="display:block">${esc(x.t)}</span><span class="s" style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.s)}</span></span>${svg("chev",18)}</button>`).join("")}</div>`
    :`<div class="card" style="align-items:center;text-align:center"><b style="color:var(--s-onhand)">✓ Nothing needs you right now</b></div>`)}
function renderUtilities(){const m=$("#main");if(!m)return;
  m.innerHTML=`<div class="sechead" style="margin-top:12px"><h2>Utilities</h2></div>${leader()?needs():""}${typeof window.askRosterCard==="function"?window.askRosterCard():""}${hand()}`}
{const _r=render;render=function(){if(view==="utilities"){renderTabs();renderUtilities();if(typeof animateView==="function")animateView();return}const r=_r.apply(this,arguments);
  /* Home no longer shows "Needs you" (it is in Utilities) */
  try{if(view==="board"){const m=$("#main"),h2=m&&[...m.querySelectorAll(".sech h2")].find(x=>/^Needs you$|^Pendiente$/.test(x.textContent.trim()));
    if(h2){const sech=h2.parentElement,nx=sech.nextElementSibling;if(nx&&nx.classList.contains("card"))nx.remove();sech.remove()}}}catch(e){}return r}}
{const _rt=renderTools;renderTools=function(){const r=_rt.apply(this,arguments);
  try{const m=$("#main"),g=m&&m.querySelector(".tgrid");if(g&&leader()&&!m.querySelector('[data-go="utilities"]'))
    g.insertAdjacentHTML("beforeend",`<button data-go="utilities"><span class="ic">${svg("help")}</span><span><b>Utilities</b><small>Needs you, ask your roster, help</small></span></button>`)}catch(e){}return r}}
})();
