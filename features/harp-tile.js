/* Accounted For 4.46: the HARP form lives in Tools → Reports, not on Home.
   Adds a HARP tile to the Tools grid before simple.js folds the tiles into groups (it is listed under Reports there). */
{const _rt=renderTools;renderTools=function(){const r=_rt.apply(this,arguments);
  try{const m=$("#main"),g=m&&m.querySelector(".tgrid");if(g&&!m.querySelector('[data-go="harp"]')&&S.mode!=="civilian")
    g.insertAdjacentHTML("beforeend",`<button data-go="harp"><span class="ic">${svg("text")}</span><span><b>HARP form</b><small>Holiday safety brief, signed on the phone</small></span></button>`)}catch(e){}return r}}
