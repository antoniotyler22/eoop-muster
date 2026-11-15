/* Accounted For 4.115.0 (4.116.0 adds Tally on every page): "Ask" is now Tally, the helper for anyone who is stuck in the app.
   One shared look (afTally) used by the Ask box on My Page and the full Ask screen: a small tally-gate mascot
   (four bars and a brass slash, the way people count) with a greeting bubble. Nothing about how Ask works changed. */
(()=>{
const BAR="var(--tb,#9db0d2)",EYE="#fff",PUP="#14213a";
const mascot=(w)=>`<svg width="${w}" height="${Math.round(w*.8)}" viewBox="0 0 100 80" role="img" aria-label="Tally, the helper" style="flex:none"><rect x="8" y="6" width="14" height="60" rx="6" fill="${BAR}"/><rect x="28" y="6" width="14" height="60" rx="6" fill="${BAR}"/><rect x="48" y="6" width="14" height="60" rx="6" fill="${BAR}"/><rect x="68" y="6" width="14" height="60" rx="6" fill="${BAR}"/><line x1="2" y1="56" x2="90" y2="22" stroke="var(--brass,#c9a24b)" stroke-width="7" stroke-linecap="round"/><circle cx="35" cy="28" r="5.5" fill="${EYE}"/><circle cx="55" cy="28" r="5.5" fill="${EYE}"/><circle cx="36" cy="29" r="2.7" fill="${PUP}"/><circle cx="56" cy="29" r="2.7" fill="${PUP}"/><path d="M38 42 Q45 49 52 42" fill="none" stroke="${EYE}" stroke-width="2.6" stroke-linecap="round"/></svg>`;
/* greeting row: big mascot, speech bubble, then the title */
function hero(tag){const t=tag||"div";
  return `<div class="tally-hero" style="text-align:center"><div style="display:flex;justify-content:center;align-items:flex-end;gap:8px"><span aria-hidden="true">${mascot(92)}</span><span style="position:relative;margin-bottom:44px;padding:6px 11px;border:1.5px solid var(--brass,#c9a24b);border-radius:12px;font-size:13px;line-height:1.3">Stuck? I've got you.</span></div>
  <${t} style="font-size:20px;font-weight:700;margin:6px 0 10px">Ask Tally</${t}></div>`}

/* 4.116.0: Tally on every page. A small floating button above the tab bar opens the Ask screen from anywhere.
   Hidden on the Ask screen itself, while typing (the keyboard needs the room), when Ask is turned off,
   and whenever the tab bar isn't showing (welcome, lock, setup). */
const fabCss=document.createElement("style");
fabCss.textContent="#tallyFab{position:fixed;right:12px;bottom:calc(88px + env(safe-area-inset-bottom,0px));z-index:29;width:58px;height:58px;border-radius:50%;border:1px solid var(--line,rgba(128,128,128,.35));background:var(--surface-solid,var(--bg,#fff));box-shadow:0 2px 10px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent}#tallyFab:active{transform:scale(.94)}#tallyFab[hidden]{display:none}";
document.head.appendChild(fabCss);
let typing=false;
function fabOn(){try{
  if(typeof view==="undefined"||view==="ask"||typing)return false;
  if(S.appCfg&&S.appCfg.ask_off)return false;
  if(typeof akHidden==="function"&&akHidden()&&!(typeof canEdit==="function"&&canEdit()&&!(typeof memberMode==="function"&&memberMode())))return false;
  const tb=document.getElementById("tabbar");if(!tb||tb.hidden||getComputedStyle(tb).display==="none")return false;
  return true}catch(e){return false}}
function fab(){let b=document.getElementById("tallyFab");
  if(!fabOn()){if(b)b.remove();return}
  if(!b){b=document.createElement("button");b.id="tallyFab";b.type="button";b.setAttribute("data-go","ask");b.setAttribute("aria-label","Ask Tally for help");b.innerHTML=mascot(38);document.body.appendChild(b)}}
document.addEventListener("focusin",e=>{if(e.target&&/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)){typing=true;fab()}});
document.addEventListener("focusout",()=>{setTimeout(()=>{const a=document.activeElement;typing=!!(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName));fab()},150)});
if(typeof render==="function"){const _r=render;render=function(){const r=_r.apply(this,arguments);fab();return r}}
setTimeout(fab,600);setInterval(fab,4000);
window.afTally={fab,mascot,hero,NOTE:"Answers can be wrong or out of date. Check with your leader or the official source before acting. Don't type names, SSNs or anything sensitive."};
/* member tab bar says Tally */
if(typeof tabsList==="function"){const _t=tabsList;tabsList=function(){return _t.apply(this,arguments).map(x=>x[0]==="ask"?[x[0],"Tally",x[2]]:x)}}
})();
