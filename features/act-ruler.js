/* Accounted For 4.62: Activity on Home is a time ruler.
   The last day of activity sits on a sideways timeline with hour marks and a red NOW line at the right. It opens
   scrolled to now; swipe right to go back in time. Each card ends at the time it happened, stacked in up to three
   rows when things happen close together. New ones (since you last looked) have a gold edge. Tap a card to open it,
   × to remove it. "List" switches back to the old list (remembered on this phone). Clear and See all work as before. */
(()=>{
if(typeof actCard!=="function")return;
const W=150,GAP=8,LANE=76,MAXL=3,DAY=864e5;
let mode="ruler";try{mode=localStorage.getItem("af-actmode")||"ruler"}catch(e){}
let keep=null,armed=false;
/* mirror the Clear button's two-tap arming from home-clear (it runs first and stops the click) */
window.addEventListener("click",e=>{if(e.target.closest&&e.target.closest("#haClear")&&mode==="ruler"){if(!armed){armed=true;setTimeout(()=>{if(armed){armed=false;try{redraw()}catch(_){}}},4000)}else armed=false}},true);
/* {left, atEnd} so the 2-minute refresh doesn't jump the ruler */
const redraw=()=>{const y=window.scrollY;render();window.scrollTo(0,y)};
const hm=t=>{const d=new Date(t);return String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0")};
const _list=actCard;
function pick(A){const now=Date.now();let L=A.filter(a=>a.t>now-DAY).slice(0,14);if(!L.length)L=A.slice(0,6);const ix=new Map(A.map((a,i)=>[a,i]));return L.slice().sort((a,b)=>a.t-b.t||ix.get(b)-ix.get(a))}
function ruler(){const A=S.act||[];if(!A.length)return"";const n=typeof actNew==="function"?actNew():0;const seen=S.actSeen||0;
  const L=pick(A);const now=Date.now();const t0=Math.min(L[0].t,now-3*36e5);
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
  const cards=placed.slice().reverse().map(({a,x,lane})=>`<div class="ar-c${a.t>seen?" new":""}${a.t<now-12*36e5?" old":""}" style="left:${x}px;top:${26+lane*LANE}px"><button class="ar-go" data-go="${esc(a.go||"act")}"><span class="ar-k">${esc(a.ic)} ${hm(a.t)}</span><span class="ar-t">${esc(a.txt)}</span></button><button class="ar-x" data-ahide="${idx.get(a)}" aria-label="Remove" title="Remove">×</button></div>`).join("")+L.map(a=>`<span class="ar-dot${a.t>seen?" new":""}" style="left:${X(a.t)}px"></span>`).join("");
  const more=A.length-L.length;
  return `<div class="sech"><h2>Activity</h2><span style="display:flex;gap:6px;align-items:center"><button class="chip" id="arMode" style="cursor:pointer">List</button><button class="chip" id="haClear" style="cursor:pointer">${armed?"Tap again to clear":"Clear"}</button><button class="chip" data-go="act" style="cursor:pointer">${n?`<b style="color:var(--brass)">${n} new</b> · `:""}See all ▸</button></span></div>
  <div class="ar" id="arTl" aria-label="Activity timeline, newest at the right"><div class="ar-track" style="width:${width}px;height:${H}px">${ticks}${cards}<span class="ar-now" style="left:${X(now)}px"></span></div></div>
  ${more>0?`<div class="note" style="margin:4px 4px 0;font-size:12.5px">← swipe back in time · ${more} older in See all</div>`:`<div class="note" style="margin:4px 4px 0;font-size:12.5px">← swipe back in time</div>`}`}
actCard=function(){if(mode==="list"){const h=_list.apply(this,arguments);return h.replace(/(<span style="display:flex;gap:6px;align-items:center">)/,`$1<button class="chip" id="arMode" style="cursor:pointer">Ruler</button>`)}return ruler()};
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;
  if(t.closest("#arMode")){e.stopImmediatePropagation();mode=mode==="list"?"ruler":"list";try{localStorage.setItem("af-actmode",mode)}catch(_){}keep=null;redraw();return}},true);
/* keep the place on refresh; open at now the first time */
document.addEventListener("scroll",e=>{const el=e.target;if(el&&el.id==="arTl")keep={left:el.scrollLeft,atEnd:el.scrollLeft+el.clientWidth>=el.scrollWidth-24}},true);
function place(){const el=document.getElementById("arTl");if(!el||el.dataset.placed)return;el.dataset.placed="1";
  el.scrollLeft=keep&&!keep.atEnd?keep.left:el.scrollWidth}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{place()}catch(e){}return r}}
window.actRuler={get mode(){return mode},set mode(v){mode=v==="list"?"list":"ruler";try{localStorage.setItem("af-actmode",mode)}catch(_){}},ruler};
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
.ar-k{display:block;font-size:11px;font-weight:800;color:var(--muted);white-space:nowrap}
.ar-c.new .ar-k{color:var(--brass)}
.ar-t{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:13px;font-weight:700;line-height:1.3;margin-top:3px}
.ar-x{position:absolute;top:4px;right:4px;width:22px;height:22px;border:0;border-radius:50%;background:none;color:var(--muted);font-size:15px;line-height:1;cursor:pointer}
.ar-x:active{background:var(--line)}
`;document.head.appendChild(st);
})();
