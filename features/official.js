/* Accounted For 4.100.0 — the official "Accounted For" channel.
   One-way updates from the Accounted For team to every phone, like WhatsApp's official channel: what's new, tips,
   what's going on in the app. It lives in the Chat tab (Chat | Official | Voice). Nobody can reply; only the app
   owner can post (from the Owner console, or right here once signed in as the owner, with an option to alert every
   phone). Phones only read, through official_get(). Needs supabase/setup/45_official_channel.sql. */
(()=>{
const MAXP=50,POLL_OPEN=30000,POLL_BG=300000;
const O=()=>{if(!S.official||typeof S.official!=="object")S.official={posts:[],seen:0,at:0};if(!Array.isArray(S.official.posts))S.official.posts=[];return S.official};
if(typeof SYNC_SKIP!=="undefined"&&Array.isArray(SYNC_SKIP)&&!SYNC_SKIP.includes("official"))SYNC_SKIP.push("official");
const esc2=s=>typeof esc==="function"?esc(s):String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ui={base:undefined,busy:false,err:"",draft:"",url:"",push:false,md:""};
const MD=()=>window.afMedia||null;
const last=()=>O().posts.reduce((m,p)=>Math.max(m,p.id),0);
const unread=()=>{const X=O();return X.posts.filter(p=>p.id>(X.seen||0)).length};
window.officialUnread=unread;
async function pull(force){const X=O();if(ui.busy||typeof SB==="undefined"||!SB.rpc)return;if(!force&&X.at&&Date.now()-X.at<(view==="official"?POLL_OPEN:POLL_BG))return;ui.busy=true;
  try{const rows=await SB.rpc("official_get",{p_after:last()});X.at=Date.now();ui.err="";let fresh=0;
    for(const r of (rows||[])){const id=+r.id;if(!id||X.posts.some(p=>p.id===id))continue;X.posts.push({id,body:String(r.body||"").slice(0,1000),url:/^https?:\/\//.test(r.url||"")?String(r.url).slice(0,300):"",t:Date.parse(r.created_at)||Date.now(),hm:!!r.has_media});fresh++}
    if(fresh){X.posts.sort((a,b)=>a.id-b.id);if(X.posts.length>MAXP)X.posts.splice(0,X.posts.length-MAXP);if(view==="official")paint();else{try{renderTabs();if(view==="chat"||view==="talk")refreshSeg()}catch(e){}}rawSave()}
  }catch(e){X.at=Date.now();ui.err="x";if(view==="official")paintErr()}finally{ui.busy=false}}
async function drop(id){const X=O();X.posts=X.posts.filter(p=>p.id!==id);rawSave()}

const hm=t=>{const d=new Date(t);return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")};
const dk=t=>{const d=new Date(t);return d.getFullYear()+"-"+d.getMonth()+"-"+d.getDate()};
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const dayLabel=t=>{const n=Date.now();if(dk(t)===dk(n))return "Today";if(dk(t)===dk(n-864e5))return "Yesterday";const d=new Date(t);return MON[d.getMonth()]+" "+d.getDate()+(d.getFullYear()!==new Date().getFullYear()?", "+d.getFullYear():"")};
const BADGE=`<svg class="of-chk" width="16" height="16" viewBox="0 0 24 24" aria-label="Official" role="img"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const AV=`<span class="of-av" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.2 4.2L19 7"/></svg></span>`;
const owner=()=>typeof ownerOn==="function"&&ownerOn()&&typeof window.ownerCall==="function";
function posts(){const L=O().posts;if(!L.length)return `<div class="of-empty"><b>${ui.err?"Couldn't load updates":"No updates yet"}</b><span>${ui.err?"Check your connection. Updates from the Accounted For team will show up here.":"Updates from the Accounted For team will show up here."}</span></div>`;
  let out="",day="";for(const p of L){const k=dk(p.t);if(k!==day){day=k;out+=`<div class="of-day"><span>${dayLabel(p.t)}</span></div>`}
    if(ui.base!==undefined&&p.id>ui.base&&!out.includes('id="ofNew"'))out+=`<div class="of-new" id="ofNew"><span>New updates</span></div>`;
    out+=`<div class="of-row">${AV}<div class="of-b"><small class="of-n">Accounted For ${BADGE}</small><div class="of-t">${p.hm?((MD()&&MD().peek("o"+p.id))?MD().tag(MD().peek("o"+p.id),"of-md"):`<span class="afm-ph of-md" data-afm="o${p.id}">⏳</span>`):""}${esc2(p.body).replace(/\n/g,"<br>")}${p.url?`<a class="of-more" href="${esc2(p.url)}" target="_blank" rel="noopener">Read more</a>`:""}<time datetime="${new Date(p.t).toISOString()}">${hm(p.t)}</time>${owner()?`<button type="button" class="of-del" data-ofdel="${p.id}" aria-label="Delete this update">Delete</button>`:""}</div></div></div>`}
  return out}
function draftHTML(){return ui.md&&MD()?`<div class="afm-draft">${MD().tag(ui.md,"")}<span>${MD().isVideo(ui.md)?"Video":"Photo"} ready. Tap Post update.</span><button type="button" class="btn alt" id="ofAttX">Remove</button></div>`:""}
function paintDraft(){const d=document.getElementById("ofDraft");if(d)d.innerHTML=draftHTML()}
function comp(){if(!owner())return `<p class="of-foot">Only the Accounted For team can post in this chat.</p>`;
  return `<form class="of-comp" id="ofForm"><div id="ofDraft">${draftHTML()}</div><button type="button" class="btn alt" id="ofAtt">📎 Add a photo, meme or video</button>
   <textarea id="ofIn" rows="2" maxlength="1000" placeholder="Post an update to every user" aria-label="Post an update to every user">${esc2(ui.draft)}</textarea>
   <input id="ofUrl" type="url" placeholder="Link (optional)" value="${esc2(ui.url)}" aria-label="Link, optional">
   <label class="of-chk2"><input type="checkbox" id="ofPush"${ui.push?" checked":""}> Also alert every phone</label>
   <button type="submit" class="btn" id="ofPost">Post update</button><p class="of-err" id="ofErr" role="status"></p></form>`}
function html(){return `<div class="ch of">
  <div class="ch-top"><div class="ch-ti"><b class="of-h">Accounted For ${BADGE}</b><small id="ofSub">Official updates from our team</small></div>${typeof segHTML==="function"?segHTML("official"):""}</div>
  <div class="ch-list of-list" id="ofList" role="log" aria-live="polite">${posts()}</div>
  <p class="ch-err" id="ofNet" role="status">${ui.err?"Couldn't refresh. Showing the last updates.":""}</p>${comp()}</div>`}
const segHTML=a=>window.chatSeg?window.chatSeg(a):"";
function paintErr(){const e=document.getElementById("ofNet");if(e)e.textContent=ui.err?"Couldn't refresh. Showing the last updates.":""}
function paint(){if(view!=="official")return;const l=document.getElementById("ofList");if(!l){render();return}
  const atBottom=l.scrollHeight-l.scrollTop-l.clientHeight<80;l.innerHTML=posts();if(atBottom)l.scrollTop=l.scrollHeight;mark();renderTabs()}
function mark(){const X=O(),m=last();if(m>(X.seen||0)){X.seen=m;rawSave()}}
function enter(){ui.base=O().seen||undefined;if(!O().seen)ui.base=undefined}
function refreshSeg(){const b=document.querySelectorAll(".ch-seg [data-seg='official'] .of-dot");/* dot is drawn by chatSeg; redraw segs */const n=unread();document.querySelectorAll(".ch-seg [data-seg='official']").forEach(el=>{el.innerHTML="Official"+(n?`<i class="of-dot" aria-label="${n} new"></i>`:"")})}
window.officialEnter=enter;window.officialPull=pull;
if(window.afMedia)window.afMedia.remote=async id=>{if(!/^o\d+$/.test(id))return "";try{const r=await SB.rpc("official_media",{p_id:+id.slice(1)});const d=Array.isArray(r)?r[0]:r;const v=typeof d==="string"?d:d&&d.official_media;if(window.afMedia.valid(v)){window.afMedia.put(id,v);return v}}catch(e){}return ""};

{const _tb=tabBadge;tabBadge=function(k){const n=_tb.apply(this,arguments);return k==="talk"?n+(view==="official"?0:unread()):n}}
{const _to=tabOf;tabOf=function(v){return v==="official"?"talk":_to.apply(this,arguments)}}
{const _r=render;render=function(){if(view==="official"){renderTabs();const m=document.getElementById("main");if(m){m.className=m.className.replace(/\bfchat\b/g,"").trim();m.innerHTML=html();const l=document.getElementById("ofList"),nw=document.getElementById("ofNew");if(l)l.scrollTop=nw?Math.max(0,nw.offsetTop-l.offsetTop-8):l.scrollHeight;mark();renderTabs()}return}return _r.apply(this,arguments)}}

document.addEventListener("click",async e=>{const t=e.target;if(!t.closest||view!=="official")return;
  if(t.closest("#ofAtt")){if(MD())MD().pick(d=>{ui.md=d;paintDraft()});return}
  if(t.closest("#ofAttX")){ui.md="";paintDraft();return}
  const d=t.closest("[data-ofdel]");if(d){const id=+d.dataset.ofdel;if(d.dataset.arm!=="1"){d.dataset.arm="1";d.textContent="Tap again to delete";return}
    try{await window.ownerCall({op:"odel",id});await drop(id);paint();toast("Update deleted")}catch(x){toast(String(x&&x.message||"Couldn't delete."))}return}},true);
document.addEventListener("input",e=>{const t=e.target;if(!t||!t.id)return;if(t.id==="ofIn")ui.draft=t.value;if(t.id==="ofUrl")ui.url=t.value;if(t.id==="ofPush")ui.push=t.checked},true);
document.addEventListener("submit",async e=>{if(!e.target.closest||!e.target.closest("#ofForm"))return;e.preventDefault();
  const body=(document.getElementById("ofIn").value||"").trim(),url=(document.getElementById("ofUrl").value||"").trim(),er=document.getElementById("ofErr"),btn=document.getElementById("ofPost");
  const media=ui.md||"";if(!body&&!media){if(er)er.textContent="Type the update or add a photo or video first.";return}if(btn){btn.disabled=true}
  try{await window.ownerCall(media?{op:"opost",body,url,media}:{op:"opost",body,url});
    if(ui.push){try{await window.ownerCall({op:"broadcast",title:"✓ Accounted For",body:(body||(MD()&&MD().isVideo(media)?"🎬 New video":"📷 New photo")).slice(0,120)})}catch(x){toast("Posted, but the alert didn't send.")}}
    ui.draft="";ui.url="";ui.push=false;ui.md="";O().at=0;await pull(true);ui.base=undefined;render();toast("Update posted")}
  catch(x){if(er)er.textContent=String(x&&x.message||"Couldn't post. Try again.");if(btn)btn.disabled=false}},true);

setInterval(()=>{if(document.hidden)return;pull(false)},POLL_OPEN);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)pull(false)});
setTimeout(()=>pull(true),3500);

if(typeof SC==="object"&&Array.isArray(SC))SC.push({k:"cm",n:"4.106: photos and video in chat",f:["46_chat_media"],t:[["chat_media_ok",{}]]});
if(typeof SC==="object"&&Array.isArray(SC))SC.push({k:"of",n:"4.100: Official Accounted For channel",f:["45_official_channel"],t:[["official_ok",{}]]});
if(typeof HELP==="object"&&HELP.feed&&Array.isArray(HELP.feed[2]))HELP.feed[2].push("Official: the Official tab in Chat is the Accounted For channel. Updates, new features and tips from our team show up there. Only we can post.");

{const c=document.createElement("style");c.textContent=`.of-h{display:flex;align-items:center;gap:6px}.of-chk{color:var(--brass);flex:none;vertical-align:-3px}
.of-list{gap:6px}.of-day{display:flex;justify-content:center;margin:10px 0 6px}.of-day span{font-size:12px;font-weight:700;color:var(--muted);background:var(--line);padding:3px 12px;border-radius:999px}
.of-new{display:flex;align-items:center;gap:10px;margin:12px 0 4px;color:var(--brass);font-size:12px;font-weight:800}.of-new:before,.of-new:after{content:"";flex:1;height:1px;background:var(--brass);opacity:.5}
.of-row{display:flex;align-items:flex-end;gap:8px;max-width:92%}.of-av{flex:none;width:32px;height:32px;border-radius:50%;background:var(--brass);display:inline-flex;align-items:center;justify-content:center}
.of-b{min-width:0;display:flex;flex-direction:column}.of-n{font-size:12px;font-weight:800;color:var(--brass);margin:0 0 2px 4px;display:flex;align-items:center;gap:4px}
.of-t{position:relative;padding:10px 12px 20px;border-radius:18px;background:var(--card,var(--surface));border:1px solid var(--glass-line);font-size:15px;line-height:1.4;overflow-wrap:anywhere}
.of-t time{position:absolute;right:10px;bottom:4px;font-size:10.5px;opacity:.65}.of-more{display:block;margin-top:8px;font-weight:800;color:var(--brass);text-decoration:none}
.of-del{all:unset;cursor:pointer;display:block;margin:8px 0 0;font-size:12px;font-weight:800;color:var(--warn)}
.of-empty{margin:auto;text-align:center;display:flex;flex-direction:column;gap:6px;padding:24px 16px;color:var(--muted)}.of-empty b{color:var(--ink);font-size:16px}
.of-foot{margin:0;text-align:center;font-size:12.5px;color:var(--muted);padding:8px 0 2px}
.of-comp{display:flex;flex-direction:column;gap:8px}.of-comp textarea{height:76px;min-height:0;resize:none}.of-comp textarea,.of-comp input[type=url]{box-sizing:border-box;width:100%;padding:10px 12px;border-radius:14px;border:1px solid var(--line);background:var(--surface-2,var(--card,#fff));color:var(--ink);font:inherit;font-size:16px}
.of-chk2{display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600}.of-err{margin:0;min-height:16px;font-size:12.5px;color:var(--warn)}
.of{height:calc(100dvh - 190px)}.of-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--warn);margin-left:6px;vertical-align:1px}`;document.head.appendChild(c)}
})();
