/* Accounted For 4.49: Utilities.
   Ask your roster and "Need a hand?" (Ask a question, How do I, tour, guide) used to sit on Home. They now live on one
   Utilities screen, opened from a Utilities tile in Tools. Home keeps the numbers and the day. */
(()=>{
const leader=()=>!(typeof memberMode==="function"&&memberMode());
const hand=()=>{const ask=typeof akHidden==="function"&&akHidden()?"":`<button class="btn alt" data-go="ask">💬 Ask a question</button>`;
  return `<div class="panel" id="hmAsk" style="margin-top:14px"><b>Need a hand?</b><p class="note" style="margin:2px 0 8px">Ask about your team, orders or anything, or learn how to do something in this app.</p>
    <div class="row2">${ask}<button class="btn alt" data-go="support">❓ How do I…</button></div>
    <div class="row2" style="margin-top:6px"><button class="btn alt" data-trfull="1">👆 Take the tour</button><a class="btn alt" href="help.html" target="_blank" rel="noopener">📖 Guide</a></div></div>`};
function renderUtilities(){const m=$("#main");if(!m)return;
  m.innerHTML=`<div class="sechead" style="margin-top:12px"><h2>Utilities</h2></div>${typeof window.askRosterCard==="function"?window.askRosterCard():""}${hand()}`}
{const _r=render;render=function(){if(view==="utilities"){renderTabs();renderUtilities();if(typeof animateView==="function")animateView();return}return _r.apply(this,arguments)}}
{const _rt=renderTools;renderTools=function(){const r=_rt.apply(this,arguments);
  try{const m=$("#main"),g=m&&m.querySelector(".tgrid");if(g&&leader()&&!m.querySelector('[data-go="utilities"]'))
    g.insertAdjacentHTML("beforeend",`<button data-go="utilities"><span class="ic">${svg("help")}</span><span><b>Utilities</b><small>Ask your roster, need a hand, tour</small></span></button>`)}catch(e){}return r}}
})();
