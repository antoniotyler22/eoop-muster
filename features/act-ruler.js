/* Accounted For 4.62: Activity on Home is a time ruler.
   The last day of activity sits on a sideways timeline with hour marks and a red NOW line at the right. It opens
   scrolled to now; swipe right to go back in time. Each card ends at the time it happened, stacked in up to three
   rows when things happen close together. New ones (since you last looked) have a gold edge. Tap a card to open it,
   × to remove it. 4.63: things that happen together are one card ("9 checked in" with faces); tap it for the
   names under the ruler, × removes the whole group. "List" switches back to the old list (remembered on this phone). Clear and See all work as before. */
(()=>{
if(typeof actCard!=="function")return;
const W=150,GAP=8,LANE=82,MAXL=3,DAY=864e5;
let mode="ruler";try{mode=localStorage.getItem("af-actmode")||"ruler"}catch(e){}
let keep=null,armed=false,openG=null;
/* mirror the Clear button's two-tap arming from home-clear (it runs first and stops the click) */
window.addEventListener("click",e=>{if(e.target.closest&&e.target.closest("#haClear")&&mode==="ruler"){if(!armed){armed=true;setTimeout(()=>{if(armed){armed=false;try{redraw()}catch(_){}}},4000)}else armed=false}},true);
/* {left, atEnd} so the 2-minute refresh doesn't jump the ruler */
const redraw=()=>{const y=window.scrollY;render();window.scrollTo(0,y)};
const hm=t=>{const d=new Date(t);return String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0")};
const _list=actCard;
/* "LCPL CHAVEZ checked in: On Hand" -> who "LCPL CHAVEZ", what "checked in", detail "On Hand" */
function parts(a){const tx=String(a.txt||"");
  let m=tx.match(/^(.+?) (checked in|check-in confirmed|check-in marked not right)(?::\s*(.*))?$/);
  if(m)return{who:m[1].trim(),what:m[2],det:String(m[3]||"").split(" · ")[0].replace(/ thru .*/,"").trim()};
  m=tx.match(/^([A-Z][A-Z0-9.'\- ]*[A-Z])\s+([a-z].*)$/);if(!m)return{who:"",what:tx,det:""};
  const r=m[2].match(/^([^:]+):\s*(.+)$/);return{who:m[1],what:r?r[1]:m[2],det:r?r[2].split(" · ")[0]:""}}
const GW=10*6e4;
function groups(A){const now=Date.now();let L=A.filter(a=>a.t>now-DAY).slice(0,150);if(!L.length)L=A.slice(0,6);
  const ix=new Map(A.map((a,i)=>[a,i]));L=L.slice().sort((a,b)=>a.t-b.t||ix.get(b)-ix.get(a));
  const G=[];for(const a of L){const p=parts(a);const key=p.who?a.ic+"|"+p.what:"";const g=G[G.length-1];
    if(key&&g&&g.key===key&&a.t-g.t0<=GW){g.items.push(a);g.t=a.t;g.ps.push(p)}else G.push({key,items:[a],ps:[p],t0:a.t,t:a.t})}
  const out=G.slice(-14);out.forEach(g=>{g.ix=g.items.map(a=>ix.get(a));g.go=g.items[g.items.length-1].go||"act";g.ic=g.items[0].ic});return out}
function pick(A){return groups(A).map(g=>({t:g.t,g}))}
const hue=s0=>{let h=0;for(const c of s0)h=(h*31+c.charCodeAt(0))%360;return`hsl(${h} 45% 42%)`};
const ini=n=>{const w=String(n).trim().split(/\s+/);return(w.length>1?w[1]:w[0]||"?").slice(0,2)};/* RANK LAST [FIRST]: use the last name */
function ruler(){const A=S.act||[];if(!A.length)return"";const n=typeof actNew==="function"?actNew():0;const seen=S.actSeen||0;
  const L=pick(A);const now=Date.now();const GR=L.map(x=>x.g);const t0=Math.min(L[0].t,now-3*36e5);
  const start=Math.floor((t0-18e5)/36e5)*36e5;const end=now+15*6e4;const hours=(end-start)/36e5;
  const PX=Math.max(46,Math.min(110,Math.round(1100/hours)));const X0=t=>Math.round((t-start)/36e5*PX);
  /* every card hangs to the LEFT of its moment (its right edge at the dot), so nothing crosses NOW. Newest first:
     each goes in the first row with room; if none, it slides further back in time in the row with the most room */
  const starts=[];const raw=L.slice().reverse().map(a=>{let x=X0(a.t)+14-W;let lane=starts.findIndex(s0=>x+W+GAP<=s0);
    if(lane<0){if(starts.length<MAXL){lane=starts.length}else{const mx=Math.max(...starts);lane=starts.indexOf(mx);x=Math.min(x,mx-W-GAP)}}starts[lane]=x;return{a,x,lane}});
  const shift=Math.max(12,8-Math.min(...raw.map(p=>p.x)));const X=t=>X0(t)+shift;
  const placed=raw.map(p=>({...p,x:p.x+shift})).reverse();const ends=starts;
  const width=X(end)+40;
  const lanes=Math.max(1,ends.length);const H=26+lanes*LANE+6;
  let ticks="";for(let t=start;t<=end;t+=36e5){const d=new Date(t);const mid=d.getHours()===0;
    ticks+=`<span class="ar-ln${mid?" mid":""}" style="left:${X(t)}px"></span><span class="ar-hr${mid?" mid":""}" style="left:${X(t)}px">${mid?DOW[d.getDay()]:hm(t)}</span>`}
  const idx=new Map(A.map((a,i)=>[a,i]));
  const card=({a,x,lane})=>{const g=a.g,many=g.items.length>1,isNew=g.t>seen,old=g.t<now-12*36e5,gi=GR.indexOf(g);
    let top=`<span class="ar-k">${esc(g.ic)} ${hm(g.t)}</span>`;
    if(!many){const it=g.items[0];return `<div class="ar-c${isNew?" new":""}${old?" old":""}" style="left:${x}px;top:${26+lane*LANE}px"><button class="ar-go" data-go="${esc(it.go||"act")}">${top}<span class="ar-t">${esc(it.txt)}</span></button><button class="ar-x" data-ahide="${g.ix[0]}" aria-label="Remove" title="Remove">×</button></div>`}
    const dets={};g.ps.forEach(p=>{if(p.det)dets[p.det]=(dets[p.det]||0)+1});const dl=Object.entries(dets).sort((p,q)=>q[1]-p[1]);
    const sub=dl.length===1?dl[0][0]:dl.slice(0,2).map(([d,c])=>c+" "+d).join(", ");if(sub)top=`<span class="ar-k">${esc(g.ic)} ${hm(g.t)} · ${esc(sub)}</span>`;
    const faces=g.ps.slice(0,4).map(p=>`<span style="background:${hue(p.who)}">${esc(ini(p.who))}</span>`).join("");
    return `<div class="ar-c grp${isNew?" new":""}${old?" old":""}${openG===g.key+g.t0?" on":""}" style="left:${x}px;top:${26+lane*LANE}px"><button class="ar-go" data-argrp="${gi}" aria-expanded="${openG===g.key+g.t0}">${top}<span class="ar-t one">${g.items.length} ${esc(g.ps[0].what)}</span><span class="ar-av">${faces}${g.items.length>4?`<em>+${g.items.length-4}</em>`:""}</span></button><button class="ar-x" data-arhide="${g.ix.join(",")}" aria-label="Remove all ${g.items.length}" title="Remove all ${g.items.length}">×</button></div>`};
  const cards=placed.slice().reverse().map(card).join("")+GR.map(g=>`<span class="ar-dot${g.t>seen?" new":""}" style="left:${X(g.t)}px"></span>`).join("");
  const og=GR.find(g=>openG===g.key+g.t0&&g.items.length>1);
  const exp=og?`<div class="ar-exp" id="arExp"><div class="ar-eh"><b>${og.items.length} ${esc(og.ps[0].what)}</b><span>${hm(og.t0)}${hm(og.t0)!==hm(og.t)?"–"+hm(og.t):""}</span></div>${og.items.slice().reverse().map((it,j)=>{const p=parts(it);return `<button class="ar-er" data-go="${esc(it.go||"act")}"><span class="ar-ef" style="background:${hue(p.who)}">${esc(ini(p.who))}</span><b>${esc(p.who)}</b><span>${esc(p.det)}${p.det?" · ":""}${hm(it.t)}</span></button>`}).join("")}</div>`:"";
  const more=A.length-GR.reduce((n0,g)=>n0+g.items.length,0);
  return `<div class="sech"><h2>Activity</h2><span style="display:flex;gap:6px;align-items:center"><button class="chip" id="arMode" style="cursor:pointer">List</button><button class="chip" id="haClear" style="cursor:pointer">${armed?"Tap again to clear":"Clear"}</button><button class="chip" data-go="act" style="cursor:pointer">${n?`<b style="color:var(--brass)">${n} new</b> · `:""}See all ▸</button></span></div>
  <div class="ar" id="arTl" aria-label="Activity timeline, newest at the right"><div class="ar-track" style="width:${width}px;height:${H}px">${ticks}${cards}<span class="ar-now" style="left:${X(now)}px"></span></div></div>${exp}
  ${more>0?`<div class="note" style="margin:4px 4px 0;font-size:12.5px">← swipe back in time · ${more} older in See all</div>`:`<div class="note" style="margin:4px 4px 0;font-size:12.5px">← swipe back in time</div>`}`}
actCard=function(){if(mode==="list"){const h=_list.apply(this,arguments);return h.replace(/(<span style="display:flex;gap:6px;align-items:center">)/,`$1<button class="chip" id="arMode" style="cursor:pointer">Ruler</button>`)}return ruler()};
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;
  const gb=t.closest("[data-argrp]");if(gb){e.preventDefault();e.stopImmediatePropagation();const g=groups(S.act||[])[+gb.dataset.argrp];if(!g)return;const k=g.key+g.t0;openG=openG===k?null:k;redraw();return}
  const gx=t.closest("[data-arhide]");if(gx){e.preventDefault();e.stopImmediatePropagation();const rm=new Set(gx.dataset.arhide.split(",").map(Number));S.act=(S.act||[]).filter((x,i)=>!rm.has(i));openG=null;rawSave();redraw();return}
  if(t.closest("#arMode")){e.stopImmediatePropagation();mode=mode==="list"?"ruler":"list";try{localStorage.setItem("af-actmode",mode)}catch(_){}keep=null;redraw();return}},true);
/* keep the place on refresh; open at now the first time */
document.addEventListener("scroll",e=>{const el=e.target;if(el&&el.id==="arTl")keep={left:el.scrollLeft,atEnd:el.scrollLeft+el.clientWidth>=el.scrollWidth-24}},true);
function place(){const el=document.getElementById("arTl");if(!el||el.dataset.placed)return;el.dataset.placed="1";
  el.scrollLeft=keep&&!keep.atEnd?keep.left:el.scrollWidth}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{place()}catch(e){}return r}}
window.actRuler={groups,parts,get mode(){return mode},set mode(v){mode=v==="list"?"list":"ruler";try{localStorage.setItem("af-actmode",mode)}catch(_){}},ruler};
const st=document.createElement("style");st.textContent=`
.ar{margin:10px -16px 0;padding:0 16px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}.ar::-webkit-scrollbar{display:none}
.ar-track{position:relative}
.ar-hr{position:absolute;top:0;transform:translateX(-50%);font-size:11px;font-weight:800;color:var(--muted);white-space:nowrap}
.ar-hr.mid{color:var(--ink)}
.ar-ln{position:absolute;top:18px;bottom:0;width:1px;background:var(--line)}.ar-ln.mid{background:var(--muted);opacity:.5}
.ar-now{position:absolute;top:14px;bottom:0;width:2px;background:#e5484d;border-radius:2px;z-index:1}
.ar-dot{position:absolute;top:15px;width:7px;height:7px;margin-left:-3px;border-radius:50%;background:var(--muted);z-index:3}.ar-dot.new{background:var(--brass)}
.ar-now:before{content:"NOW";position:absolute;top:-2px;left:5px;font-size:10px;font-weight:800;color:#e5484d;letter-spacing:.04em}
.ar-c{position:absolute;width:${W}px;height:${LANE-8}px;background:var(--surface-solid,var(--surface));border:1px solid var(--line);border-radius:16px;z-index:2;overflow:hidden}
.ar-c.new{border-color:var(--brass);box-shadow:inset 3px 0 0 var(--brass)}
.ar-c.old{opacity:.6}
.ar-go{display:block;width:100%;height:100%;text-align:left;background:none;border:0;padding:8px 22px 8px 11px;font:inherit;color:var(--ink);cursor:pointer}
.ar-k{display:block;font-size:11px;font-weight:800;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ar-c.new .ar-k{color:var(--brass)}
.ar-t{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:13px;font-weight:700;line-height:1.3;margin-top:3px}
.ar-x{position:absolute;top:4px;right:4px;width:22px;height:22px;border:0;border-radius:50%;background:none;color:var(--muted);font-size:15px;line-height:1;cursor:pointer}
.ar-x:active{background:var(--line)}
.ar-c.on{border-color:var(--ink)}
.ar-t.one{-webkit-line-clamp:1}
.ar-av{display:flex;align-items:center;margin-top:5px;min-width:0}
.ar-av span{flex:0 0 22px;width:22px;height:22px;border-radius:50%;border:2px solid var(--surface-solid,#fff);margin-left:-6px;color:#fff;font-size:8.5px;font-weight:800;display:grid;place-items:center;text-transform:uppercase}.ar-av span:first-child{margin-left:0}
.ar-av em{font-style:normal;font-size:10.5px;font-weight:800;color:var(--muted);margin-left:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ar-exp{margin-top:8px;background:var(--surface-solid,var(--surface));border:1px solid var(--line);border-radius:16px;padding:4px 12px;animation:arIn .25s ease}
@keyframes arIn{from{opacity:0;transform:translateY(-6px)}}
.ar-eh{display:flex;justify-content:space-between;align-items:baseline;padding:8px 0 4px;font-size:14px}.ar-eh span{font-size:12px;font-weight:800;color:var(--muted)}
.ar-er{display:flex;align-items:center;gap:9px;width:100%;padding:8px 0;border:0;border-top:1px solid var(--line);background:none;font:inherit;color:var(--ink);text-align:left;cursor:pointer}
.ar-er b{font-size:13.5px;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ar-er>span:last-child{font-size:12px;font-weight:700;color:var(--muted);white-space:nowrap}
.ar-ef{flex:0 0 26px;width:26px;height:26px;border-radius:50%;color:#fff;font-size:9.5px;font-weight:800;display:grid;place-items:center;text-transform:uppercase}
`;document.head.appendChild(st);
})();
