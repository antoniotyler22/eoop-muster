/* Accounted For 1.7: Tools tiles for Visitors, Teams and Account. Loaded before simple.js so the 12 groups pick them up
   (Visitors under Muster, Account under People & access, Teams under Settings). The screens themselves are in
   visitors.js, account.js and teams.js. */
(()=>{
const nice=u=>u?(u.email||(u.phone?"+"+String(u.phone).replace(/^\+/,""):"")):"";
{const _rt=renderTools;renderTools=function(){_rt.apply(this,arguments);const g=document.querySelector("#main .tgrid");if(!g)return;
  const vn=typeof window.visitorsOnSite==="function"?window.visitorsOnSite():0;
  const tn=window.TEAMS?TEAMS.list().length:1;
  const A=window.AUTH;const signed=A&&A.on&&A.on();
  const add=(k,ic,t,s)=>{if(!g.querySelector(`[data-go="${k}"]`))g.insertAdjacentHTML("beforeend",`<button data-go="${k}"><span class="ic">${svg(ic)}</span><span><b>${esc(t)}</b><small>${esc(s)}</small></span></button>`)};
  add("visitors","checkin","Visitors",vn?vn+" on site":"Sign guests in and out");
  add("acct","me","Account",signed?nice(A.user()):"Optional: your teams on any phone");
  add("teams","people","Teams",tn>1?tn+" teams · switch or add":"Add another team")}}
})();
