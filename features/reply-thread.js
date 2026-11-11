/* Accounted For 4.84.0: replies on a Word of Mouth post open as a thread, like iMessage.
   - In the feed a post shows one small button, "💬 3 replies" (or "💬 Reply" when there are none). The reply box under the post is gone.
   - Tap it: a full screen with the post at the top, everyone's replies as bubbles (yours on the right in blue, others on the left
     with their names), and the reply bar at the bottom. Back returns to the feed.
   - Everyone who can read the post sees the thread, leaders included, and leaders can answer. Replies ride on the shared signals
     (kind "rp", encrypted with the Word of Mouth key like reactions and Seen by), so they need supabase/setup/42_replies.sql.
   - Posts aimed at one person or a section keep the old private reply to the leader, so a reply never reaches people the post wasn't for.
   - You can take back your own reply (tap it, then Delete). */
(()=>{
const MAX=300;
const open=p=>!p.to||p.to.k==="all";
const rows=(f,pid)=>{let L=[];try{L=AFS.all(f,"rp")}catch(e){}return L.map(r=>r.o).filter(o=>o&&o.pid===pid&&!o.del&&o.txt).sort((a,b)=>a.t-b.t)};
const who=f=>f.lk?AFS.me(f):String(f.me||AFS.me(f)).toUpperCase().slice(0,30);
const count=(f,pid)=>rows(f,pid).length;
window.thrCount=count;
const seenMap=()=>{S.thrSeen=S.thrSeen&&typeof S.thrSeen==="object"?S.thrSeen:{};return S.thrSeen};
const hhmm=t=>{const d=new Date(t);return String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0")};
const dayLbl=t=>{const d=new Date(t),n=new Date();const same=d.toDateString()===n.toDateString();const y=new Date(n.getTime()-864e5).toDateString()===d.toDateString();
  return (same?"Today":y?"Yesterday":d.toLocaleDateString([],{weekday:"long",month:"short",day:"numeric"}))+" "+hhmm(t)};
const linky=t=>{const h=esc(t);return typeof window.womLinkHTML==="function"?window.womLinkHTML(h):h};
const initials=by=>{const w=String(by||"").replace(/[^A-Za-z0-9 ]/g," ").trim().split(/\s+/).filter(Boolean);return (w.length?(w[0][0]+(w.length>1?w[w.length-1][0]:"")):"?").toUpperCase()};

/* ---------- the feed: one chip instead of a reply box ---------- */
{const _card=fdCard;fdCard=function(f,p){let h=_card.apply(this,arguments);
  try{if(!f||!p||!f.mk||!open(p)||typeof h!=="string")return h;
    h=h.replace(new RegExp('<div class="fcbtns"><button data-fdrep="'+p.id+'">[^<]*</button></div>'),"")
       .replace(/<div class="note" style="margin:4px 0 0">💬 You replied: “[^”]*”<\/div>/,"")
       .replace(new RegExp('<div class="addph"><input type="text" id="fdRep'+p.id+'"[^>]*><button data-fdrepsend="'+p.id+'">Send</button></div>'),"");
    const n=count(f,p.id),seen=seenMap()[f.id+":"+p.id]||0,fresh=n>seen;
    const chip=`<div class="thrrow"><button type="button" class="thrchip${fresh?" new":""}" data-thr="${p.id}" aria-label="${n?n+" repl"+(n>1?"ies":"y")+", open":"Reply"}">💬 ${n?n+" repl"+(n>1?"ies":"y")+(fresh?" · new":""):"Reply"}</button></div>`;
    return h.replace(/<\/article>$/,chip+"</article>")}catch(e){return h}}}

/* ---------- the thread screen ---------- */
let cur=null;   /* {fid,pid} */
const find=()=>{if(!cur)return null;const f=(S.feeds||[]).find(x=>x.id===cur.fid);const p=f&&(f.posts||[]).find(x=>x.id===cur.pid);return f&&p?{f,p}:null};
function bubbles(f,p){const me=who(f),L=rows(f,p.id);
  if(!L.length)return `<div class="thr-empty">No replies yet. Be the first.</div>`;
  let h="",lastDay="",lastBy="";
  for(const o of L){const d=new Date(o.t).toDateString(),mine=o.by===me;
    if(d!==lastDay||o.t-(L[L.indexOf(o)-1]||{t:0}).t>3*3600e3){h+=`<div class="thr-day">${esc(dayLbl(o.t))}</div>`;lastBy=""}lastDay=d;
    if(!mine&&o.by!==lastBy)h+=`<div class="thr-who">${esc(o.by)}</div>`;lastBy=o.by;
    h+=`<div class="thr-b ${mine?"r":"l"}" data-thrmsg="${esc(o.id||"")}">${linky(o.txt)}</div>`}
  return h}
function paint(keepScroll){const x=find(),o=document.getElementById("thrView");if(!x||!o)return;const {f,p}=x;
  const box=o.querySelector(".thr-msgs");const near=box.scrollHeight-box.scrollTop-box.clientHeight<80;
  const n=count(f,p.id);o.querySelector(".thr-sub").textContent=n?n+(n>1?" replies":" reply"):"No replies yet";
  box.innerHTML=bubbles(f,p);
  if(!keepScroll||near)box.scrollTop=box.scrollHeight;
  seenMap()[f.id+":"+p.id]=n}
function show(f,pid){const p=(f.posts||[]).find(x=>x.id===pid);if(!p)return;close(true);cur={fid:f.id,pid};
  const by=p.by||f.unit,txt=p.pod?String(p.txt||"").split("\n")[0]||"Plan of the Day":String(p.txt||"");
  const o=document.createElement("div");o.id="thrView";o.setAttribute("role","dialog");o.setAttribute("aria-label","Replies");
  o.innerHTML=`<div class="thr-top"><button type="button" class="thr-back" data-thrclose="1">‹ Back</button><div class="thr-tt">${esc(by)}<small class="thr-sub"></small></div><span class="thr-sp"></span></div>
    <div class="thr-orig"><b>${esc(by)} · ${esc(ago(p.t))}</b><div>${linky(txt.length>500?txt.slice(0,500)+"…":txt)}</div></div>
    <div class="thr-msgs" aria-live="polite"></div>
    <form class="thr-in" id="thrForm"><input type="text" id="thrInp" maxlength="${MAX}" placeholder="Reply…" enterkeyhint="send" autocomplete="off" aria-label="Your reply"><button type="submit" class="thr-send" id="thrSend" aria-label="Send">↑</button></form>`;
  document.body.appendChild(o);document.body.classList.add("thr-open");fit();paint(false);
  const y=window.scrollY;o.dataset.y=y;try{renderFeed()}catch(e){}window.scrollTo(0,y)}
function close(quiet){const o=document.getElementById("thrView");if(o)o.remove();document.body.classList.remove("thr-open");
  if(cur&&!quiet){cur=null;const y=window.scrollY;if(view==="feed"){try{renderFeed()}catch(e){}window.scrollTo(0,y)}}else if(quiet)cur=null}
function fit(){const o=document.getElementById("thrView");if(!o)return;const vv=window.visualViewport;o.style.height=(vv?vv.height:window.innerHeight)+"px";o.style.top=(vv?vv.offsetTop:0)+"px"}
if(window.visualViewport){window.visualViewport.addEventListener("resize",fit);window.visualViewport.addEventListener("scroll",fit)}

async function send(){const x=find();if(!x)return;const {f,p}=x;const inp=document.getElementById("thrInp"),btn=document.getElementById("thrSend");if(!inp)return;
  const txt=inp.value.replace(/\s+/g," ").trim().slice(0,MAX);if(!txt)return;
  if(!f.lk&&!f.me){toast("Add your rank and last name first.");return}
  const me=who(f),t=Date.now(),id=p.id+":"+me+":"+t;btn.disabled=true;
  const ok=await AFS.put(f,"rp",id,{pid:p.id,by:me,txt,t,id,w:f.meH||[]});btn.disabled=false;
  if(!ok){toast("Couldn't send. Check signal and try again.");return}
  inp.value="";paint(false);inp.focus()}
async function takeBack(id){const x=find();if(!x)return;const {f,p}=x;const r=rows(f,p.id).find(o=>o.id===id);if(!r||r.by!==who(f))return;
  const ok=await AFS.put(f,"rp",id,Object.assign({},r,{del:1,txt:""}));if(!ok){toast("Couldn't delete. Try again.");return}paint(true);toast("Reply deleted")}

document.addEventListener("click",e=>{const t=e.target;if(!t||!t.closest)return;
  const c=t.closest("[data-thr]");if(c){e.stopImmediatePropagation();e.preventDefault();const f=typeof fdCur==="function"?fdCur():null;if(f)show(f,+c.dataset.thr);return}
  if(t.closest("[data-thrclose]")){e.preventDefault();close();return}
  const m=t.closest("[data-thrmsg]");const del=t.closest("[data-thrdel]");
  if(del){e.preventDefault();const id=del.dataset.thrdel;takeBack(id);return}
  if(m&&m.classList.contains("r")&&m.dataset.thrmsg){const was=m.nextElementSibling&&m.nextElementSibling.classList.contains("thr-act");
    document.querySelectorAll("#thrView .thr-act").forEach(n=>n.remove());
    if(!was)m.insertAdjacentHTML("afterend",`<button type="button" class="thr-act" data-thrdel="${esc(m.dataset.thrmsg)}">Delete</button>`)}},true);
document.addEventListener("submit",e=>{if(e.target&&e.target.id==="thrForm"){e.preventDefault();send()}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.getElementById("thrView"))close()});
AFS.onChange(()=>{if(document.getElementById("thrView"))paint(true)});
window.thrClose=close;
/* leaving Word of Mouth closes it */
{const _r=render;render=function(){if(view!=="feed"&&document.getElementById("thrView"))close();return _r.apply(this,arguments)}}

{const c=document.createElement("style");c.textContent=`.thrrow{margin-top:10px}.thrchip{all:unset;cursor:pointer;box-sizing:border-box;display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 14px;border-radius:999px;background:var(--surface-2,#eef1f6);color:var(--ink);font-weight:800;font-size:14px}
.thrchip.new{background:color-mix(in srgb,var(--pr-hi,#0857e8) 14%,transparent);color:var(--pr-hi,#0857e8)}.thrchip:focus-visible{outline:2px solid var(--pr-hi,#0857e8);outline-offset:2px}.thrchip:active{filter:brightness(.95)}
#thrView{position:fixed;left:0;right:0;top:0;height:100dvh;z-index:9500;display:flex;flex-direction:column;background:var(--bg,#f6f7f9);color:var(--ink)}
body.thr-open{overflow:hidden}
.thr-top{display:flex;align-items:center;gap:8px;padding:calc(10px + env(safe-area-inset-top,0px)) 12px 10px;background:var(--surface-solid,#fff);border-bottom:1px solid var(--line)}
.thr-back{all:unset;cursor:pointer;color:var(--pr-hi,#0857e8);font-size:17px;font-weight:600;min-width:64px;min-height:44px;display:inline-flex;align-items:center}
.thr-tt{flex:1;text-align:center;font-weight:800;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.thr-tt small{display:block;color:var(--muted);font-weight:600;font-size:12px}.thr-sp{min-width:64px}
.thr-orig{margin:12px 14px 4px;background:var(--surface-solid,#fff);border:1px solid var(--line);border-radius:18px;padding:12px;font-size:14px;line-height:1.4;max-height:28vh;overflow:auto}.thr-orig b{display:block;margin-bottom:4px}
.thr-msgs{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:6px 14px 10px;display:flex;flex-direction:column;gap:5px;overscroll-behavior:contain}
.thr-day{text-align:center;color:var(--muted);font-size:12px;font-weight:600;margin:10px 0 4px}.thr-who{font-size:11px;color:var(--muted);font-weight:700;margin:6px 0 -2px 12px}
.thr-b{max-width:78%;padding:9px 13px;border-radius:19px;font-size:15px;line-height:1.3;overflow-wrap:anywhere;white-space:pre-wrap}
.thr-b.l{align-self:flex-start;background:var(--surface-2,#e6e8ee);border-bottom-left-radius:6px}.thr-b.r{align-self:flex-end;background:var(--pr-hi,#0857e8);color:#fff;border-bottom-right-radius:6px;cursor:pointer}
.thr-b.r a{color:#fff}.thr-b .womlink{color:inherit}.thr-b.l .womlink{color:var(--pr-hi,#0857e8)}
.thr-act{all:unset;cursor:pointer;align-self:flex-end;font-size:12px;font-weight:800;color:var(--warn,#c0392b);padding:2px 8px;margin-right:4px}
.thr-empty{margin:auto;color:var(--muted);font-size:14px;text-align:center;padding:24px}
.thr-in{display:flex;gap:8px;align-items:center;padding:10px 12px calc(10px + env(safe-area-inset-bottom,0px));background:var(--surface-solid,#fff);border-top:1px solid var(--line)}
.thr-in input{flex:1;min-width:0;box-sizing:border-box;border:1px solid var(--line);border-radius:999px;padding:10px 14px;font:inherit;font-size:16px;background:var(--bg,#f6f7f9);color:var(--ink);min-height:44px}
.thr-send{all:unset;cursor:pointer;width:44px;height:44px;border-radius:50%;background:var(--pr-hi,#0857e8);color:#fff;display:grid;place-items:center;font-weight:800;font-size:20px}.thr-send:disabled{opacity:.5}`;document.head.appendChild(c)}
if(typeof SC==="object"&&Array.isArray(SC))SC.push({k:"rp",n:"4.84: replies as a thread",f:["42_replies"],t:[["replies_ok",{}]]});
if(typeof HELP==="object"&&HELP.feed&&Array.isArray(HELP.feed[2]))HELP.feed[2].push("Tap 💬 under a post to open its replies like a text thread. Everyone who can read the post sees the replies. Tap your own reply to take it back.");
})();
