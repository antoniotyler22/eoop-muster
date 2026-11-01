/* Accounted For 4.72 — Search everything.
   The magnifier at the top opens one search box that looks through people, Inbox messages and Feed posts on this phone
   (everything is read from what is already on the phone; nothing goes to the server). Tap a result to open it. */
(function(){
  let q="",flt="all";
  const norm=s=>String(s||"").toLowerCase();
  const words=()=>norm(q).trim().split(/\s+/).filter(Boolean);
  const dt=t=>{try{return new Date(t).toLocaleDateString([],{month:"short",day:"numeric"})}catch(e){return ""}};
  function hl(t,w){t=String(t);const L=t.toLowerCase(),R=[];
    w.forEach(x=>{let p=0;while((p=L.indexOf(x,p))>-1){R.push([p,p+x.length]);p+=x.length}});R.sort((a,b)=>a[0]-b[0]);
    let out="",cur=0;for(const [a,b] of R){if(a<cur)continue;out+=esc(t.slice(cur,a))+"<mark>"+esc(t.slice(a,b))+"</mark>";cur=b}return out+esc(t.slice(cur))}
  function snip(t,w){t=String(t||"").replace(/\s+/g," ");if(t.length<=100)return t;const i=Math.max(0,norm(t).indexOf(w[0]||""));const a=Math.max(0,i-30);return (a?"…":"")+t.slice(a,a+100)+(a+100<t.length?"…":"")}
  function find(){
    const w=words();if(!w.length)return {w,people:[],msgs:[],feed:[]};
    const has=t=>{t=norm(t);return w.every(x=>t.includes(x))};
    const people=typeof findPeople==="function"?findPeople(q).slice(0,8):[];
    const msgs=[];
    for(const tid of Object.keys(S.dmMsgs||{})){
      const m=(S.roster||[]).find(x=>x.dm&&x.dm.id===tid);
      for(const x of S.dmMsgs[tid]||[]){if(x&&x.txt&&has(x.txt))msgs.push({tid,m,x,t:x.t})}}
    msgs.sort((a,b)=>b.t-a.t);
    const feed=[];
    for(const f of S.feeds||[])for(const p of f.posts||[]){if(p&&p.txt&&has(p.txt))feed.push({f,p,t:p.t})}
    feed.sort((a,b)=>b.t-a.t);
    return {w,people,msgs:msgs.slice(0,15),feed:feed.slice(0,15)};
  }
  function rows(){
    const r=find();if(!r.w.length)return `<p class="note gs-empty">Type a name, a word from a message, or something from the Feed.</p>`;
    let h="",n=0;
    const sec=(t,c,body)=>{if(!c)return;n+=c;h+=`<div class="gs-h">${t} · ${c}</div>${body}`};
    if(flt==="all"||flt==="people")sec("PEOPLE",r.people.length,r.people.map(m=>`<button class="gs-r" data-gsp="${esc(m.id)}"><span class="gs-av">${esc(((m.rank||"")[0]||"")+(lastOf(m)[0]||""))}</span><span class="gs-t"><b>${hl(m.rank+" "+m.name,r.w)}</b><small>${esc(m.sec)} · ${esc(typeof SHORT==="object"&&SHORT[m.status]||m.status||"")}</small></span></button>`).join(""));
    if(flt==="all"||flt==="msgs")sec("MESSAGES",r.msgs.length,r.msgs.map(o=>`<button class="gs-r" data-gsm="${esc(o.tid)}" data-gsmm="${esc(o.m?o.m.id:"")}"><span class="gs-av">💬</span><span class="gs-t"><b>${o.m?esc(o.m.rank+" "+lastOf(o.m)):"Your leader"}</b><span>${hl(snip(o.x.txt,r.w),r.w)}</span><small>Inbox · ${esc(dt(o.t))}</small></span></button>`).join(""));
    if(flt==="all"||flt==="feed")sec("FEED",r.feed.length,r.feed.map(o=>`<button class="gs-r" data-gsf="${esc(o.p.id)}"><span class="gs-av">📰</span><span class="gs-t"><b>${esc(o.p.by||"Feed")}</b><span>${hl(snip(o.p.txt,r.w),r.w)}</span><small>Feed · ${esc(dt(o.t))}</small></span></button>`).join(""));
    return n?h:`<p class="note gs-empty">Nothing found for “${esc(q)}”.</p>`}
  function chips(){return [["all","All"],["people","People"],["msgs","Messages"],["feed","Feed"]].map(([k,l])=>`<button class="gs-c${flt===k?" on":""}" data-gsc="${k}">${l}</button>`).join("")}
  function paint(){const e=document.getElementById("gsRes");if(e)e.innerHTML=rows();const c=document.getElementById("gsChips");if(c)c.innerHTML=chips()}
  function openSearch(){close();q="";flt="all";
    const d=document.createElement("div");d.id="gsOv";d.innerHTML=`<div class="gs-top"><input id="gsQ" type="search" placeholder="Search people, messages, Feed" autocomplete="off" aria-label="Search"><button class="gs-x" id="gsX">Cancel</button></div><div class="gs-chips" id="gsChips">${chips()}</div><div id="gsRes" class="gs-res">${rows()}</div>`;
    document.body.appendChild(d);const i=document.getElementById("gsQ");setTimeout(()=>{try{i.focus()}catch(e){}},30)}
  function close(){const d=document.getElementById("gsOv");if(d)d.remove()}
  const tab=t=>{const b=document.querySelector(`[data-tab="${t}"]`);if(b)b.click()};
  document.addEventListener("click",e=>{
    const t=e.target.closest&&e.target.closest("#hSearch");
    if(t){e.preventDefault();e.stopPropagation();openSearch();return}
    if(!document.getElementById("gsOv"))return;
    if(e.target.closest("#gsX")){close();return}
    const c=e.target.closest("[data-gsc]");if(c){flt=c.dataset.gsc;paint();return}
    const p=e.target.closest("[data-gsp]");if(p){const id=p.dataset.gsp;close();if(typeof openCard==="function")openCard(id);return}
    const m=e.target.closest("[data-gsm]");if(m){const mid=m.dataset.gsmm;close();tab("inbox");if(mid)setTimeout(()=>{const r=document.querySelector(`[data-v12dm="${mid}"]`);if(r)r.click()},90);return}
    if(e.target.closest("[data-gsf]")){close();tab("feed");return}
  },true);
  document.addEventListener("input",e=>{if(e.target.id==="gsQ"){q=e.target.value;paint()}});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
  const st=document.createElement("style");st.textContent=`#gsOv{position:fixed;inset:0;z-index:300;background:var(--bg,#fff);overflow:auto;padding:calc(10px + env(safe-area-inset-top)) 14px 30px}
.gs-top{display:flex;gap:10px;align-items:center}.gs-top input{flex:1;margin:0;font-size:16px}.gs-x{background:none;border:0;color:var(--brass,#2563eb);font-weight:700;font-size:15px;padding:8px}
.gs-chips{display:flex;gap:8px;margin:12px 0}.gs-c{border:0;border-radius:99px;padding:7px 14px;font-size:13px;font-weight:700;background:var(--surface,#f1f3f8);color:inherit}.gs-c.on{background:#111;color:#fff}
.gs-h{font-size:11px;font-weight:800;letter-spacing:.08em;color:var(--muted,#8b94a7);margin:14px 2px 4px}
.gs-r{display:flex;gap:12px;align-items:center;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--line,#eceff4);padding:11px 2px;color:inherit}
.gs-av{width:38px;height:38px;border-radius:50%;background:var(--surface,#eef1f7);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex:none}
.gs-t{display:flex;flex-direction:column;gap:2px;min-width:0}.gs-t small{color:var(--muted,#8b94a7);font-size:12px}.gs-t mark{background:#fde68a;color:#111;border-radius:3px}.gs-empty{text-align:center;margin-top:24px}`;
  document.head.appendChild(st);
  window.gsOpen=openSearch;
})();
