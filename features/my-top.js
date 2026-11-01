/* Accounted For: the person button at the top opens "My page".
   Members: their page, now with Profile photo and Quiet hours (the SOS and place check-in were already there).
   Leaders: a My page with SOS, Profile photo, Quiet hours, Muster place and the account. */
(function(){
const H=n=>{try{return typeof window[n]==="function"?window[n]():""}catch(e){return""}};
function mine(){return `<div class="sech" style="margin-top:14px"><h2>My page</h2></div>${H("sosCardHtml")}${H("ppPanelHtml")}${H("qhPanelHtml")}${(S.role!=="view")?H("gfLeadHtml"):""}${H("acctHtml")}`}
{const _r=render;render=function(){
  if(view==="mypg"){renderTabs();const m=$("#main");if(m){m.innerHTML=mine();if(typeof animateView==="function")animateView()}return}
  const r=_r.apply(this,arguments);return r}}
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
