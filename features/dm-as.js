/* Accounted For 4.70.0 — "Messaging as": a strip at the top of every My page (My status, Calendar, Today, My log and a
   leader's preview of a member page) that shows the name your messages and posts go out under, with a Change button.
   A member's name is their rank and last name (the same one the Feed uses). A leader's is the "Posting as" name
   (like GYSGT TYLER or EOP OIC). Changing it here changes it everywhere. */
(()=>{
const VIEWS=["me","mecal","mepv","today","log"];
const isLeader=()=>typeof leader==="function"?leader():!(typeof memberMode==="function"&&memberMode());
const asName=()=>String(isLeader()?(S.postAs||S.myName||(typeof unitName==="function"?unitName():"")||"Me"):(typeof myName==="function"?myName():(S.myName||"Me"))).slice(0,30);
const clean=v=>String(v||"").toUpperCase().replace(/[|#]/g," ").replace(/\s+/g," ").trim().slice(0,30);
function strip(){return `<div class="dmas" id="dmAs"><span class="dmas-ic" aria-hidden="true">💬</span><div class="dmas-t"><small>Messaging as</small><b>${esc(asName())}</b></div><button type="button" class="dmas-b" id="dmAsEd">Change</button></div>`}
function inject(){try{if(!VIEWS.includes(view))return;const m=$("#main");if(!m||m.querySelector("#dmAs"))return;m.insertAdjacentHTML("afterbegin",strip())}catch(e){}}
if(typeof renderMe==="function"){const _a=renderMe;renderMe=function(){const r=_a.apply(this,arguments);inject();return r}}
if(typeof renderMePv==="function"){const _c=renderMePv;renderMePv=function(){const r=_c.apply(this,arguments);inject();return r}}
if(typeof renderToday==="function"){const _d=renderToday;renderToday=function(){const r=_d.apply(this,arguments);inject();return r}}
if(typeof renderLog==="function"){const _e=renderLog;renderLog=function(){const r=_e.apply(this,arguments);inject();return r}}
{const _r=render;render=function(){const r=_r.apply(this,arguments);inject();return r}}

document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;
  if(t.closest("#dmAsEd")){const lead=isLeader();sheetCtx={kind:"dmas"};
    $("#sheetT").innerHTML=lead?`Messaging as<small>Shown on your messages and posts, like GYSGT TYLER or EOP OIC.</small>`:`Your rank and last name<small>Shown on the messages you send your leader.</small>`;
    $("#sheetOpts").innerHTML=`<div class="panel" style="margin:0" data-noxl><input type="text" id="dmAsIn" maxlength="30" value="${esc(asName())}" placeholder="${lead?"GYSGT TYLER":"SGT SMITH"}" autocapitalize="characters" style="text-transform:uppercase"><button class="btn" id="dmAsSave">Save</button><button class="btn alt" data-sclose="1">Cancel</button></div>`;
    const sh=$("#sheet");sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add("open")));return}
  if(t.closest("#dmAsSave")){e.stopImmediatePropagation();const v=clean(($("#dmAsIn")||{}).value);if(!v){toast("Enter a name first.");return}
    if(isLeader()){S.postAs=v}else{S.myName=v;if(S.link)S.link.me=v;for(const f of (S.feeds||[]))if(!f.lk&&(f.hub||f.me)){f.me=v;if(typeof fdMeHash==="function")fdMeHash(f)}}
    save();closeSheet();const y=window.scrollY;render();window.scrollTo(0,y);toast("Saved")}},true);

{const c=document.createElement("style");c.textContent=`.dmas{display:flex;align-items:center;gap:12px;margin:12px 0 0;padding:10px 14px;border:1px solid var(--glass-line,var(--line));border-radius:20px;background:var(--card,var(--surface));box-shadow:var(--shadow)}
.dmas-ic{font-size:18px}.dmas-t{flex:1;min-width:0;display:flex;flex-direction:column}.dmas-t small{font-size:12px;color:var(--muted)}.dmas-t b{font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dmas-b{all:unset;cursor:pointer;min-height:36px;padding:0 14px;border-radius:999px;background:var(--line);color:var(--ink);font-size:13px;font-weight:700;display:inline-flex;align-items:center}.dmas-b:focus-visible{outline:2px solid var(--brass);outline-offset:2px}`;document.head.appendChild(c)}
})();
