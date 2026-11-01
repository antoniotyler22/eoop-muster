/* Accounted For: Home "off deck" donut. Sits to the right of the ON HAND ring and breaks down everyone who is not on deck
   by why (Off base appt, SIQ, Operation, TAD, Leave, Other) in shades of navy, blue, sky and teal. Replaces the old
   "Present · Off deck · Light duty · LIMDU" text line. */
(()=>{
const SEG=[["off","Appt off base","--hd1","#0b2a6f"],["SIQ","SIQ","--hd2","#0857e8"],["Operation","Operation","--hd3","#5aa9ff"],["TAD","TAD","--hd4","#0fa3a3"],["Leave","Leave","--hd5","#a9d2ff"],["Other","Other","--hd6","#0a6f7a"]];
const R=58,C=2*Math.PI*R;
{const c=document.createElement("style");c.textContent=`:root{--hd1:#0b2a6f;--hd2:#0857e8;--hd3:#5aa9ff;--hd4:#0fa3a3;--hd5:#a9d2ff;--hd6:#0a6f7a}
:root[data-theme="dark"]{--hd1:#2f56c4;--hd2:#4d8dff;--hd3:#8cc4ff;--hd4:#3fd3d3;--hd5:#c9e3ff;--hd6:#1f9aa6}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--hd1:#2f56c4;--hd2:#4d8dff;--hd3:#8cc4ff;--hd4:#3fd3d3;--hd5:#c9e3ff;--hd6:#1f9aa6}}
.wring:has(.hdc){display:grid;grid-template-columns:1fr 1fr;justify-items:center;align-items:start;gap:6px 12px;--dsz:min(140px,38vw)}
.wring:has(.hdc) .rin,.hdc .hdn{width:var(--dsz);height:var(--dsz);position:relative}.wring:has(.hdc) svg,.hdc .hdn svg{width:var(--dsz);height:var(--dsz)}
.wring:has(.hdc) .rside,.hdc .hdcap{text-align:center;min-width:0}.wring:has(.hdc) .rside .pc,.hdc .hdcap .pc{font-size:24px;font-weight:800;line-height:1.1}
.hdc .hdcap .pc{color:var(--hd2)}.hdc .hdcap .note{margin:2px 0 0}
.wring:has(.hdc) .rtx b,.hdn .tx b{font-size:34px;font-weight:800;letter-spacing:-.02em}.wring:has(.hdc) .rtx small,.hdn .tx small{font-size:13px;font-weight:700;color:var(--muted);margin-top:4px}
.hdc{display:contents}.hdn circle{fill:none}.hdn .bg{stroke:var(--line,#e3e6ea)}.hdn svg{transform:rotate(-90deg);flex:none}
.hdn .tx{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1}
.wring:has(.hdc) .rside{grid-row:2;grid-column:1}.hdc .hdn{grid-row:1;grid-column:2}.hdc .hdcap{grid-row:2;grid-column:2}.wring:has(.hdc) .rin{grid-row:1;grid-column:1}
.hdl{display:flex;flex-wrap:wrap;gap:4px 12px;margin:0 0 10px;font-size:12px;font-weight:700;color:var(--muted)}.hdl span{display:inline-flex;align-items:center;gap:5px}.hdl i{width:9px;height:9px;border-radius:50%;flex:none}.hdl b{color:var(--ink)}`;document.head.appendChild(c)}
function data(){const T=counts().T;const out=[];for(const [k,l,v] of SEG){const n=k==="off"?(T.off||0):(T[k]||0);if(n>0)out.push({k,l,v,n})}return out}
function build(){const T=counts().T;const d=data();const tot=d.reduce((a,x)=>a+x.n,0);if(!tot)return null;
  let acc=0;const gap=d.length>1?2:0;
  const arcs=d.map(x=>{const len=x.n/tot*C,seg=Math.max(0,len-gap),off=-acc;acc+=len;return `<circle cx="66" cy="66" r="${R}" stroke-width="12" stroke="var(${x.v})" stroke-dasharray="${seg} ${C-seg}" stroke-dashoffset="${off}"/>`}).join("");
  const lab=d.map(x=>`${x.l} ${x.n}`).join(", ");
  return {donut:`<span class="hdc"><div class="hdn" role="img" aria-label="Not on deck ${tot}: ${esc(lab)}"><svg class="hdsv" viewBox="0 0 132 132" aria-hidden="true"><circle class="bg" cx="66" cy="66" r="${R}" stroke-width="12"/>${arcs}</svg><div class="tx"><b>${tot}</b><small>of ${T.total}</small></div></div><div class="hdcap"><div class="pc">${Math.round(100*tot/T.total)}%</div><div class="note">not on deck</div></div></span>`,
    legend:`<div class="hdl">${d.map(x=>`<span><i style="background:var(${x.v})"></i>${esc(x.l)} <b>${x.n}</b></span>`).join("")}</div>`}}
function addDonut(){const hero=document.querySelector("#main .card.hero");if(!hero||hero.querySelector(".hdn"))return;
  if(S.rc&&S.rc.open)return;const ring=hero.querySelector(".wring");if(!ring)return;const b=build();if(!b)return;
  ring.insertAdjacentHTML("beforeend",b.donut);ring.insertAdjacentHTML("afterend",b.legend)}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{if(view==="board")addDonut()}catch(e){}return r}}
})();
