/* Accounted For 4.54: Feed posts for leaders, "Ring Receipt" style.
   On a leader's phone each post is a clean white card: the words first, a small ring in the corner that fills as
   people confirm (red while it's low, amber, then green), one thin bar per section under the words, and one toolbar:
   Who · Remind · Replies · Pin · Delete. The big dark stat box and the stack of chips are gone.
   - Who opens the same list as before (problems, not confirmed, text them the word, replies).
   - Remind texts everyone who hasn't confirmed (one tap when they fit in one text; otherwise it opens Who, which has
     the text groups).
   - Delete still needs a second tap.
   - "I posted it" and "You confirmed" become one small line; if you haven't confirmed yet, Confirm stays. Reply stays.
   Members' cards don't change. */
(()=>{
const SV=`viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
const IC={who:`<svg ${SV}><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5M16 11a3 3 0 1 0 0-6M21 20c0-2.5-2-4.3-4.5-4.8"/></svg>`,
  bell:`<svg ${SV}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0"/></svg>`,
  chat:`<svg ${SV}><path d="M4 5h16v11H8l-4 4z"/></svg>`,pin:`<svg ${SV}><path d="M12 17v5M5 9l7-6 7 6-2 6H7z"/></svg>`,
  del:`<svg ${SV}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>`};
const col=pc=>pc>=85?"var(--rr-g)":pc>=50?"var(--rr-a)":"var(--rr-r)";
function ring(got,pool){const pc=pool?Math.round(100*got/pool):0,C=138.2;
  return `<div class="rr-ring" role="img" aria-label="${got} of ${pool} confirmed"><svg width="52" height="52"><circle cx="26" cy="26" r="22" stroke="var(--rr-track)" stroke-width="6" fill="none"/><circle cx="26" cy="26" r="22" stroke="${col(pc)}" stroke-width="6" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${(C*(1-pc/100)).toFixed(1)}"/></svg><span>${pc}%</span></div>`}
function segs(f,p,st){const pool=fdPool(p);const ord=(typeof SECTIONS!=="undefined"?SECTIONS.map(x=>x[0]):[]).concat("ATT");const keys=[...new Set(ord.concat(pool.map(m=>m.sec).filter(Boolean)))];
  const L=keys.map(k=>{const ms=pool.filter(m=>m.sec===k);return {k,n:ms.length,g:ms.filter(m=>st.A[m.id]).length}}).filter(x=>x.n);
  if(L.length<2)return "";
  return `<div class="rr-seg">${L.map(x=>{const pc=Math.round(100*x.g/x.n);return `<div title="${esc(x.k)} ${x.g} of ${x.n}"><i><b style="width:${pc}%;background:${col(pc)}"></b></i><small>${esc(x.k)}</small></div>`}).join("")}</div>`}
function toolbar(f,p,st,pinned){const pool=fdPool(p);const miss=sorted(pool.filter(m=>!st.A[m.id]));
  const reps=pool.filter(m=>st.A[m.id]&&st.A[m.id].c===1&&st.A[m.id].note).length;const open=fdOpen===p.id;
  let remind;
  if(!miss.length)remind=`<button type="button" disabled>${IC.bell}All in</button>`;
  else{const b=bcBatches(miss,f.unit+": new word in the Feed you haven't confirmed. Open Accounted For → Feed.");
    remind=b.length===1?`<a class="rr-b" href="${esc(b[0].href)}">${IC.bell}Remind ${miss.length}</a>`:`<button type="button" data-fdopen="${p.id}">${IC.bell}Remind ${miss.length}</button>`}
  const armedDel=armed==="fddel"+p.id;
  return `<div class="rr-tool"><button type="button" data-fdopen="${p.id}" class="${open?"on":""}" aria-expanded="${open}">${IC.who}Who</button>${remind}<button type="button" data-fdopen="${p.id}">${IC.chat}${reps}</button><button type="button" data-fdpin="${p.id}" class="${pinned?"on":""}">${IC.pin}${pinned?"Unpin":"Pin"}</button><button type="button" data-fddel="${p.id}" class="d${armedDel?" arm":""}">${IC.del}${armedDel?"Tap again":"Delete"}</button></div>`}
function fix(){const f=fdCur();if(!f||!f.lk||view!=="feed")return;const posts=fdVisible(f);const pins=f.pins||[];
  document.querySelectorAll("#main article.fc[data-pid]:not([data-rr])").forEach(a=>{const p=posts.find(x=>String(x.id)===a.dataset.pid);if(!p)return;a.dataset.rr="1";a.classList.add("rr");a.classList.remove("own","bub");
    const st=fdStats(f,p);
    /* stat box out */
    [...a.querySelectorAll(".fci")].forEach(b=>{const t=b.querySelector(".ttl");if(t&&/^Confirmed$/i.test(t.textContent.trim()))b.remove()});
    /* ring in the header */
    const hd=a.querySelector(".fch");if(hd)hd.insertAdjacentHTML("beforeend",ring(st.got,st.pool));
    if(st.prob){const t=a.querySelector(".fch .hd > div:last-child")||a.querySelector(".fch .hd");if(t)t.insertAdjacentHTML("beforeend",`<span class="fcchip" style="color:var(--warn)">⚠ ${st.prob} problem${st.prob>1?"s":""}</span>`)}
    /* section bars after the words */
    const body=a.querySelector(".bd")||[...a.querySelectorAll(".fci")].pop();if(body)body.insertAdjacentHTML("afterend",segs(f,p,st));
    /* toolbar replaces the Who / Pin chip row */
    const row=a.querySelector("[data-fdopen]")&&a.querySelector("[data-fdopen]").parentElement;
    const notes=row?[...row.querySelectorAll(".note,.fcchip")].map(n=>n.outerHTML).join(" "):"";
    const tb=toolbar(f,p,st,pins.includes(p.id))+(notes?`<div class="rr-notes">${notes}</div>`:"");
    if(row)row.outerHTML=tb;else{const s=a.querySelector(".rr-seg")||body;if(s)s.insertAdjacentHTML("afterend",tb)}
    /* the old Delete button inside Who: the toolbar has it now */
    a.querySelectorAll(".btn.warn[data-fddel]").forEach(x=>x.remove());
    /* Reply stays for everyone (you asked for Confirm and Reply on every post): it shares one row with Confirm */
    {const rep=a.querySelector(".fcbtns [data-fdrep]"),cf=a.querySelector(".fcbtns [data-fsok],.fcbtns [data-fdack]");
      if(rep&&cf&&rep.closest(".fcbtns")!==cf.closest(".fcbtns")){const old=rep.closest(".fcbtns");cf.closest(".fcbtns").appendChild(rep);old.remove()}
      a.querySelectorAll(".fcbtns").forEach(r=>r.classList.add("rr-btns"))}
    /* "I posted it" + "You confirmed" -> one quiet line */
    const ok=[...a.querySelectorAll(".fsok")];const posted=ok.some(x=>/I posted it/.test(x.textContent));const conf=ok.find(x=>/You confirmed/.test(x.textContent));
    if(ok.length){ok.forEach(x=>x.remove());a.insertAdjacentHTML("beforeend",`<div class="rr-me">✓ ${posted&&conf?"I posted it · You confirmed":posted?"I posted it":"You confirmed"}</div>`)}
  })}
{const _rf=renderFeed;renderFeed=function(){const r=_rf.apply(this,arguments);try{fix()}catch(e){}return r}}
const st=document.createElement("style");st.textContent=`
:root{--rr-g:#1f9d63;--rr-a:#e8a019;--rr-r:#e5484d;--rr-track:rgba(120,130,150,.18)}
#main article.fc.rr{background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:22px;max-width:none;margin:12px 0 0;padding:14px 14px 10px;box-shadow:0 10px 26px -20px rgba(17,24,39,.35)}
#main article.fc.rr .tm,#main article.fc.rr .note{color:var(--muted)}
#main article.fc.rr .fch{align-items:flex-start}
.rr-ring{margin-left:auto;position:relative;width:52px;height:52px;flex:0 0 52px}
.rr-ring svg{transform:rotate(-90deg)}.rr-ring span{position:absolute;inset:0;display:grid;place-items:center;font-size:12px;font-weight:800;color:var(--ink)}
.rr-seg{display:flex;gap:4px;margin-top:2px}.rr-seg div{flex:1;min-width:0}
.rr-seg i{display:block;height:6px;border-radius:4px;background:var(--rr-track);position:relative;overflow:hidden}.rr-seg i b{position:absolute;inset:0 auto 0 0;border-radius:4px}
.rr-seg small{display:block;font-size:10.5px;font-weight:700;color:var(--muted);margin-top:5px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rr-tool{display:flex;justify-content:space-between;border-top:1px solid var(--line);padding-top:8px;margin-top:2px}
.rr-tool button,.rr-tool .rr-b{border:0;background:none;display:flex;flex-direction:column;align-items:center;gap:3px;font-weight:700;font-size:11.5px;font-family:inherit;color:var(--muted);padding:6px 8px;border-radius:12px;min-width:48px;text-decoration:none;cursor:pointer}
.rr-tool svg{width:20px;height:20px}
.rr-tool button:active,.rr-tool .rr-b:active{background:var(--surface-2)}
.rr-tool button.on{color:var(--blue,#2f6fde)}.rr-tool button.d{color:var(--rr-r)}.rr-tool button.d.arm{background:var(--rr-r);color:#fff}
.rr-tool button:disabled{opacity:.55}
.rr-notes{font-size:12px}.rr-notes .note{margin:0}
.rr-btns{display:flex;gap:8px}.rr-btns>*{min-height:44px!important;font-size:15px!important}.rr-btns [data-fsok],.rr-btns [data-fdack]{flex:2}.rr-btns [data-fdrep]{flex:1}
.rr-me{font-size:12px;font-weight:700;color:var(--rr-g);margin-top:2px}`;document.head.appendChild(st);
})();
