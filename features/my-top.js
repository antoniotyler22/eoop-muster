/* Accounted For: the person button at the top opens "My page".
   Members: their page, now with Profile photo and Quiet hours (the SOS and place check-in were already there).
   Leaders: a My page with SOS, Profile photo, Quiet hours, Muster place and the account. */
(function(){
const H=n=>{try{return typeof window[n]==="function"?window[n]():""}catch(e){return""}};
function self(){try{const R=S.roster||[];
  if(S.who&&S.who.id){const w=R.find(m=>m.id===S.who.id||m.uid===S.who.id);if(w)return w}
  const parts=String(S.myName||"").toUpperCase().trim().split(/\s+/),n=parts.pop();if(!n||n.length<2)return null;const rk=parts[0]||"";
  /* match the LAST name only (the part before the comma), never a first name, so "TYLER" can't land on "BRIMHALL, TYLER" */
  const L=R.filter(m=>String(m.name||"").split(",")[0].trim().toUpperCase()===n);
  return L.find(m=>rk&&String(m.rank||"").toUpperCase()===rk)||L[0]||null}catch(e){return null}}
function mine(){return `<div class="sech" style="margin-top:14px"><h2>My page</h2></div>${H("sosCardHtml")}${H("ppPanelHtml")}${H("qhPanelHtml")}${(S.role!=="view")?H("gfLeadHtml"):""}${H("acctHtml")}`}
{const _r=render;render=function(){
  if(view==="mypg"){renderTabs();const m=$("#main");if(m){const own=self();
    let ok=false;
    if(own){const saved=S.me;try{S.me={pk:"preview",d:Object.assign(window.__v12.mpDigest(own),{at:Date.now()}),t:Date.now()};renderMe()}catch(e){m.innerHTML=""}finally{S.me=saved}
      if(m.innerHTML){
      ["#meOff","#tdLeader","#meRe"].forEach(q=>{const x=m.querySelector(q);if(x){const p=x.closest("p")||x;p.remove()}});
      const top=m.querySelector(".hero")||m.firstElementChild;const blk=H("sosCardHtml")+H("ppPanelHtml")+H("qhPanelHtml")+((S.role!=="view")?H("gfLeadHtml"):"")+H("acctHtml");
      top?top.insertAdjacentHTML("afterend",blk):m.insertAdjacentHTML("afterbegin",blk);ok=true}}
    if(!ok)m.innerHTML=mine();
    if(typeof animateView==="function")animateView()}return}
  const r=_r.apply(this,arguments);return r}}
/* a small version line so you can tell which version this phone is running */
{const _r2=render;render=function(){const r=_r2.apply(this,arguments);try{if(view==="mypg"||view==="data"||view==="me"){const m=$("#main");if(m&&!m.querySelector("#afVer"))m.insertAdjacentHTML("beforeend",`<p class="note" id="afVer" style="text-align:center;margin:18px 0 6px">Version ${esc(window.AV||"")}</p>`)}}catch(e){}return r}}
/* member page: add photo + quiet hours under the SOS / place card */
{const _rm=renderMe;renderMe=function(){_rm.apply(this,arguments);try{
  if(view!=="me"||!S.me||String(S.me.pk)==="preview")return;const m=$("#main");if(!m)return;
  const a=m.querySelector("#gfMe")||m.querySelector("#sosHome")||m.querySelector(".v12tabs");
  let h="";if(!m.querySelector("#ppPanel"))h+=H("ppPanelHtml");if(!m.querySelector("#qhPanel"))h+=H("qhPanelHtml");
  if(h)a?a.insertAdjacentHTML("afterend",h):m.insertAdjacentHTML("afterbegin",h)}catch(e){}}}
document.addEventListener("click",e=>{const t=e.target;if(!t||!t.closest||!t.closest("#v13Hdr"))return;
  if(typeof memberMode==="function"&&memberMode())return; /* members: the existing handler opens their page */
  e.preventDefault();e.stopImmediatePropagation();view="mypg";armed=null;render();window.scrollTo(0,0)},true);
})();
