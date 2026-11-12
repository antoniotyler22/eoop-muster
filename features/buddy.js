// 4.92: Buddy check. On a live recall, anyone silent gets "Ask buddies": a group text to checked-in teammates
// in the same section ("Eyes on Sam?"). One tap marks them "Seen by buddy". Names stay on this phone.
(()=>{
const dig=p=>{p=String(p||"").replace(/[^\d+]/g,"");return p.length===10?"+1"+p:p};
const silent=()=>{const ci=S.rc.ci||{},res=S.rc.res||{};return recallPool().filter(m=>!ci[m.id]&&res[m.id]!=="ok")};
const buddies=m=>{const ci=S.rc.ci||{};return recallPool().filter(b=>b.id!==m.id&&b.sec===m.sec&&ci[b.id]&&dig(b.phone).length>=10).slice(0,3)};
const nm=m=>(m.rank?m.rank+" ":"")+m.name;
function href(m,bs){const body="Eyes on "+m.name+"? "+unitName()+" can't reach them. If you've seen them, reply to me now.";
  return "sms:"+bs.map(b=>dig(b.phone)).join(",")+"?&body="+encodeURIComponent(body)}
function html(){const rc=S.rc;if(!rc.open||(typeof memberMode==="function"&&memberMode()))return "";
  const rows=silent().map(m=>({m,bs:buddies(m)})).filter(r=>r.bs.length).slice(0,8);if(!rows.length)return "";
  return `<div class="panel" id="bdBox" data-noxl><b>Buddy check</b>
    <p class="note" style="margin:2px 0 8px">Nobody has heard from these people. Ask teammates who already checked in to eyeball them.</p>
    ${rows.map(({m,bs})=>`<div style="display:flex;align-items:center;gap:8px;margin:8px 0"><span style="flex:1;min-width:0"><b>${esc(nm(m))}</b><span class="note" style="display:block">${bs.map(b=>esc(b.name)).join(", ")}</span></span>
      <a class="btn alt" style="width:auto;flex:none;min-height:44px;padding:0 14px" href="${esc(href(m,bs))}">Ask ${bs.length}</a><button class="btn" style="width:auto;flex:none;min-height:44px;padding:0 14px" data-bdseen="${esc(m.id)}">Seen ✓</button></div>`).join("")}</div>`}
const _r=renderRecall;
renderRecall=function(){_r.apply(this,arguments);if(!S.rc.open)return;const old=$("#bdBox");if(old)old.remove();const h=html();if(!h)return;
  const a=$("#main .esc-panel")||$("#main .mbar");if(a)a.insertAdjacentHTML("afterend",h)};
document.addEventListener("click",e=>{const b=e.target.closest("[data-bdseen]");if(!b)return;
  const m=S.roster.find(x=>x.id===b.dataset.bdseen);if(!m)return;
  S.rc.ci[m.id]={c:1,eta:"Seen by buddy",t:Date.now(),buddy:1};S.rc.res[m.id]="ok";save();render();toast(m.name+" marked: seen by buddy")});
})();
