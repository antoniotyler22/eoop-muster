/* Accounted For: Home "off deck" donut. Sits to the right of the ON HAND ring and breaks down everyone who is not on deck
   by why (Off base appt, SIQ, Operation, TAD, Leave, Other) in shades of navy, blue, sky and teal. Replaces the old
   "Present · Off deck · Light duty · LIMDU" text line. */
(()=>{
const SEG=[["off","Appt off base","--hd1","#0b2a6f"],["SIQ","SIQ","--hd2","#0857e8"],["Operation","Operation","--hd3","#5aa9ff"],["TAD","TAD","--hd4","#0fa3a3"],["Leave","Leave","--hd5","#a9d2ff"],["Other","Other","--hd6","#0a6f7a"]];
const R=40,C=2*Math.PI*R;
{const c=document.createElement("style");c.textContent=`:root{--hd1:#0b2a6f;--hd2:#0857e8;--hd3:#5aa9ff;--hd4:#0fa3a3;--hd5:#a9d2ff;--hd6:#0a6f7a}
:root[data-theme="dark"]{--hd1:#2f56c4;--hd2:#4d8dff;--hd3:#8cc4ff;--hd4:#3fd3d3;--hd5:#c9e3ff;--hd6:#1f9aa6}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--hd1:#2f56c4;--hd2:#4d8dff;--hd3:#8cc4ff;--hd4:#3fd3d3;--hd5:#c9e3ff;--hd6:#1f9aa6}}
.hdn{flex:none;position:relative;width:92px;height:92px}.hdn svg{width:92px;height:92px;transform:rotate(-90deg)}.hdn circle{fill:none}.hdn .bg{stroke:var(--line,#e3e6ea)}
.hdn .tx{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1}.hdn .tx b{font-size:26px;font-weight:800;letter-spacing:-.02em}.hdn .tx small{font-size:10.5px;font-weight:700;color:var(--muted);margin-top:3px}
.hdl{display:flex;flex-wrap:wrap;gap:4px 12px;margin:0 0 10px;font-size:12px;font-weight:700;color:var(--muted)}.hdl span{display:inline-flex;align-items:center;gap:5px}.hdl i{width:9px;height:9px;border-radius:50%;flex:none}.hdl b{color:var(--ink)}
.wring:has(.hdn) svg:not(.hdsv){width:112px;height:112px}.wring:has(.hdn) .rin{width:112px;height:112px}.wring:has(.hdn){gap:12px}.wring:has(.hdn) .rside .pc{font-size:26px}.wring:has(.hdn) .rtx b{font-size:34px}
@media (min-width:520px){.wring:has(.hdn) svg:not(.hdsv),.wring:has(.hdn) .rin{width:132px;height:132px}}`;document.head.appendChild(c)}
function data(){const T=counts().T;const out=[];for(const [k,l,v] of SEG){const n=k==="off"?(T.off||0):(T[k]||0);if(n>0)out.push({k,l,v,n})}return out}
function build(){const d=data();const tot=d.reduce((a,x)=>a+x.n,0);if(!tot)return null;
  let acc=0;const gap=d.length>1?2:0;
  const arcs=d.map(x=>{const len=x.n/tot*C,seg=Math.max(0,len-gap),off=-acc;acc+=len;return `<circle cx="50" cy="50" r="${R}" stroke-width="13" stroke="var(${x.v})" stroke-dasharray="${seg} ${C-seg}" stroke-dashoffset="${off}"/>`}).join("");
  const lab=d.map(x=>`${x.l} ${x.n}`).join(", ");
  return {donut:`<div class="hdn" role="img" aria-label="Not on deck ${tot}: ${esc(lab)}"><svg class="hdsv" viewBox="0 0 100 100" aria-hidden="true"><circle class="bg" cx="50" cy="50" r="${R}" stroke-width="13"/>${arcs}</svg><div class="tx"><b>${tot}</b><small>not on deck</small></div></div>`,
    legend:`<div class="hdl">${d.map(x=>`<span><i style="background:var(${x.v})"></i>${esc(x.l)} <b>${x.n}</b></span>`).join("")}</div>`}}
function addDonut(){const hero=document.querySelector("#main .card.hero");if(!hero||hero.querySelector(".hdn"))return;
  if(S.rc&&S.rc.open)return;const ring=hero.querySelector(".wring");if(!ring)return;const b=build();if(!b)return;
  ring.insertAdjacentHTML("beforeend",b.donut);ring.insertAdjacentHTML("afterend",b.legend)}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{if(view==="board")addDonut()}catch(e){}return r}}
})();
