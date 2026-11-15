/* Accounted For 4.115.0: "Ask" is now Tally, the helper for anyone who is stuck in the app.
   One shared look (afTally) used by the Ask box on My Page and the full Ask screen: a small tally-gate mascot
   (four bars and a brass slash, the way people count) with a greeting bubble. Nothing about how Ask works changed. */
(()=>{
const BAR="var(--tb,#9db0d2)",EYE="#fff",PUP="#14213a";
const mascot=(w)=>`<svg width="${w}" height="${Math.round(w*.8)}" viewBox="0 0 100 80" role="img" aria-label="Tally, the helper" style="flex:none"><rect x="8" y="6" width="14" height="60" rx="6" fill="${BAR}"/><rect x="28" y="6" width="14" height="60" rx="6" fill="${BAR}"/><rect x="48" y="6" width="14" height="60" rx="6" fill="${BAR}"/><rect x="68" y="6" width="14" height="60" rx="6" fill="${BAR}"/><line x1="2" y1="56" x2="90" y2="22" stroke="var(--brass,#c9a24b)" stroke-width="7" stroke-linecap="round"/><circle cx="35" cy="28" r="5.5" fill="${EYE}"/><circle cx="55" cy="28" r="5.5" fill="${EYE}"/><circle cx="36" cy="29" r="2.7" fill="${PUP}"/><circle cx="56" cy="29" r="2.7" fill="${PUP}"/><path d="M38 42 Q45 49 52 42" fill="none" stroke="${EYE}" stroke-width="2.6" stroke-linecap="round"/></svg>`;
/* greeting row: big mascot, speech bubble, then the title */
function hero(tag){const t=tag||"div";
  return `<div class="tally-hero" style="text-align:center"><div style="display:flex;justify-content:center;align-items:flex-end;gap:8px"><span aria-hidden="true">${mascot(92)}</span><span style="position:relative;margin-bottom:44px;padding:6px 11px;border:1.5px solid var(--brass,#c9a24b);border-radius:12px;font-size:13px;line-height:1.3">Stuck? I've got you.</span></div>
  <${t} style="font-size:20px;font-weight:700;margin:6px 0 10px">Ask Tally</${t}></div>`}
window.afTally={mascot,hero,NOTE:"Answers can be wrong or out of date. Check with your leader or the official source before acting. Don't type names, SSNs or anything sensitive."};
/* member tab bar says Tally */
if(typeof tabsList==="function"){const _t=tabsList;tabsList=function(){return _t.apply(this,arguments).map(x=>x[0]==="ask"?[x[0],"Tally",x[2]]:x)}}
})();
