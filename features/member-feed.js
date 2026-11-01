/* Accounted For 4.70.0 — Members see the Feed right on their page.
   On a member's Today and My status pages the latest Feed posts show on the page itself (newest first, unconfirmed
   ones marked), instead of being behind the Feed tab only. Tap a post, or "Open the Feed", to reply or tap Got it. */
(()=>{
const N=4;
const mine=()=>(typeof memberMode==="function"&&memberMode())&&["today","me"].includes(view);
function html(){const fs=(S.feeds||[]).filter(f=>!f.lk&&f.mk);if(!fs.length)return "";
  const items=fs.flatMap(f=>(typeof fdVisible==="function"?fdVisible(f):f.posts||[]).filter(p=>p&&!p.pod&&p.txt).map(p=>({f,p}))).sort((a,b)=>b.p.t-a.p.t).slice(0,N);
  if(!items.length)return `<div class="mf" id="mfFeed"><div class="mf-h"><b>Feed</b></div><p class="mf-e">No posts yet. Word from your leaders shows up here.</p></div>`;
  return `<div class="mf" id="mfFeed"><div class="mf-h"><b>Feed</b><button type="button" class="mf-all" data-tab="feed">Open the Feed</button></div>`
    +items.map(({f,p})=>{const by=p.by||f.unit,m=(f.mine||{})[p.id],todo=!(m&&(m.c===1||m.c===2));const t=String(p.txt).replace(/\s+/g," ").trim();
      return `<button type="button" class="mf-p${p.urg?" urg":""}" data-tab="feed" data-mfpost="${p.id}"><span class="mf-av">${esc(String(by).split(/\s+/).filter(Boolean).map(x=>x[0]).slice(0,2).join("").toUpperCase()||"?")}</span><span class="mf-b"><span class="mf-n"><b>${esc(by)}</b> <small>· ${esc(typeof ago==="function"?ago(p.t):"")}</small>${p.urg?` <i class="mf-u">URGENT</i>`:""}${todo?` <i class="mf-g">Got it needed</i>`:""}</span><span class="mf-t">${esc(t.length>200?t.slice(0,200)+"…":t)}</span></span></button>`}).join("")+`</div>`}
function inject(){try{if(!mine())return;const m=$("#main");if(!m)return;const old=m.querySelector("#mfFeed");const h=html();if(!h){if(old)old.remove();return}
  if(old){old.outerHTML=h;return}
  const a=m.querySelector("#dmAs");if(a)a.insertAdjacentHTML("afterend",h);else m.insertAdjacentHTML("afterbegin",h)}catch(e){}}
{const _r=render;render=function(){const r=_r.apply(this,arguments);inject();return r}}
if(typeof renderMe==="function"){const _m=renderMe;renderMe=function(){const r=_m.apply(this,arguments);inject();return r}}
if(typeof renderToday==="function"){const _t=renderToday;renderToday=function(){const r=_t.apply(this,arguments);inject();return r}}
{const c=document.createElement("style");c.textContent=`.mf{margin:12px 0 0;display:flex;flex-direction:column;gap:8px}
.mf-h{display:flex;align-items:center;justify-content:space-between;padding:0 2px}.mf-h b{font-size:17px}
.mf-all{all:unset;cursor:pointer;font-size:13px;font-weight:700;color:var(--brass)}.mf-all:focus-visible,.mf-p:focus-visible{outline:2px solid var(--brass);outline-offset:2px}
.mf-p{all:unset;cursor:pointer;box-sizing:border-box;display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border:1px solid var(--glass-line,var(--line));border-radius:20px;background:var(--card,var(--surface));box-shadow:var(--shadow)}.mf-p.urg{border-color:var(--warn)}
.mf-av{flex:none;width:40px;height:40px;border-radius:50%;background:var(--brass);color:var(--on-brass,#fff);font-weight:800;font-size:13px;display:inline-flex;align-items:center;justify-content:center}
.mf-b{min-width:0;display:flex;flex-direction:column;gap:3px}.mf-n{font-size:14px}.mf-n small{color:var(--muted)}.mf-t{font-size:14px;line-height:1.4;color:var(--ink);word-break:break-word}
.mf-u,.mf-g{font-style:normal;font-size:11px;font-weight:800;border-radius:999px;padding:2px 8px;margin-left:4px}.mf-u{background:var(--warn);color:#fff}.mf-g{background:var(--line);color:var(--ink)}
.mf-e{margin:0;padding:12px 14px;border:1px solid var(--glass-line,var(--line));border-radius:20px;background:var(--card,var(--surface));font-size:14px;color:var(--muted)}`;document.head.appendChild(c)}
})();
