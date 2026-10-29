/* Accounted For: a poll on the Feed.
   Leader: "+ Poll" opens a Question box and one box per choice (starts with 2, "+ Add a choice" up to 6, ✕ to drop
   one). Post sends it; the question is the post's text (anything typed in Pass the word goes under it).
   Everyone: tap a choice to vote. As soon as you vote, the choices turn into a bar graph: each choice's share and
   count, yours marked ✓. Tap another bar to change your vote. A vote also counts as your Confirm.
   How members see the count: votes go to the leader (members can't read each other's), and the leader's phone posts
   an encrypted running tally to the Feed whenever the count changes (at most every 20 s, hidden from view). Until
   it arrives, your own vote shows in the bars right away. The leader also sees who picked what under "Who". */
(()=>{
const PV="🗳 ",MAXO=6;
let draft={on:false,q:"",o:["",""]};
const clean=a=>[...new Set(a.map(x=>String(x||"").trim().slice(0,40)).filter(Boolean))].slice(0,MAXO);
function grab(){if(!draft.on)return;const q=document.getElementById("fdPollQ");if(q)draft.q=q.value;
  draft.o=draft.o.map((v,i)=>{const el=document.getElementById("fdPollO"+i);return el?el.value:v})}
window.fdPollOpts=()=>{if(!draft.on)return null;grab();const opts=clean(draft.o);if(opts.length<2)return null;const q=String(draft.q||"").trim().slice(0,140);draft={on:false,q:"",o:["",""]};return {q,opts}};
const votesOf=(f,p)=>{const A=(f.acks||{})[String(p.id)]||{};const by={};for(const [mid,a] of Object.entries(A)){if(a&&a.c===1&&String(a.note||"").startsWith(PV)){const v=a.note.slice(PV.length);if(p.poll.includes(v))by[mid]=v}}return by};
const myVote=(f,p)=>{const m=(f.mine||{})[p.id];return m&&String(m.note||"").startsWith(PV)?{v:m.note.slice(PV.length),t:m.t,prev:m.prev||"",pt:m.pt||0}:null};
/* the bar graph: a row per choice, the bar filled to its share; tappable when the reader can vote */
function bars(p,cnt,tot,mine,tap){const max=Math.max(1,...p.poll.map(o=>cnt[o]||0));
  return `<div class="pollg">${p.poll.map(o=>{const n=cnt[o]||0,pc=tot?Math.round(n/tot*100):0,on=o===mine;
    return `<${tap?`button type="button" data-fdvote="${p.id}" data-opt="${esc(o)}"`:"div"} class="pollr${on?" on":""}" aria-pressed="${on}"><span class="pollf" style="width:${tot?Math.max(4,Math.round(n/max*100)):0}%"></span><span class="pollt">${on?"✓ ":""}${esc(o)}</span><span class="polln">${pc}% · ${n}</span></${tap?"button":"div"}>`}).join("")}</div>`}
const title=p=>p.pq?`<div style="font-weight:800;font-size:16px;margin:2px 0 4px">${esc(p.pq)}</div>`:"";
function leaderHTML(f,p){const by=votesOf(f,p);const pool=fdPool(p);const ids=new Set(pool.map(m=>m.id));const tot=Object.keys(by).filter(id=>ids.has(id)).length;
  const cnt={};for(const [id,v] of Object.entries(by))if(ids.has(id))cnt[v]=(cnt[v]||0)+1;
  let h=`<div class="fci"><span class="ttl">🗳 Poll · ${tot} of ${pool.length} voted</span>${bars(p,cnt,tot,"",false)}`;
  if(fdOpen===p.id){for(const o of p.poll){const ms=sorted(pool.filter(m=>by[m.id]===o));if(ms.length)h+=`<div class="note" style="margin-top:4px"><b>${esc(o)}:</b> ${ms.map(m=>esc(m.rank+" "+lastOf(m))).join(", ")}</div>`}
    const no=sorted(pool.filter(m=>!by[m.id]));if(no.length)h+=`<div class="note" style="margin-top:4px"><b>Haven't voted (${no.length}):</b> ${no.map(m=>esc(m.rank+" "+lastOf(m))).join(", ")}</div>`}
  else h+=`<div class="note" style="margin:4px 0 0">Tap <b>Who</b> to see who picked what.</div>`;
  return h+`</div>`}
function memberHTML(f,p){const mv=myVote(f,p);const can=fdForMe(f,p);
  if(!mv)return `<div class="fci"><span class="ttl">🗳 Poll · tap your answer</span><div class="pollg">${p.poll.map(o=>`<button type="button" class="pollr pick" data-fdvote="${p.id}" data-opt="${esc(o)}"${can?"":" disabled"}><span class="pollt">${esc(o)}</span></button>`).join("")}</div></div>`;
  const T=(f.tally||{})[p.id];const cnt=Object.assign({},T&&T.cnt||{});let tot=T?+T.n||0:0;
  // the leader's tally may not have my latest vote yet: add it (and take back the old one if the tally had it)
  if(!T||mv.t>T.t){cnt[mv.v]=(cnt[mv.v]||0)+1;tot++;if(T&&mv.prev&&mv.pt&&mv.pt<=T.t&&(cnt[mv.prev]||0)>0){cnt[mv.prev]--;tot--}}
  return `<div class="fci"><span class="ttl">🗳 Results · ${tot} vote${tot===1?"":"s"}${T&&T.of?" of "+T.of:""}</span>${bars(p,cnt,tot,mv.v,can)}<div class="note" style="margin:4px 0 0">You picked <b>${esc(mv.v)}</b>. Tap another to change it.</div></div>`}
{const _card=fdCard;fdCard=function(f,p){let h=_card.apply(this,arguments);if(!p||!Array.isArray(p.poll)||p.poll.length<2)return h;
  if(p.pq)h=h.replace(/<div class="bd">([\s\S]*?)<\/div>/,(all,body)=>{const b=body.replace(/^\s+|\s+$/g,"");const rest=b.startsWith(esc(p.pq))?b.slice(esc(p.pq).length).replace(/^\s+/,""):b;return title(p)+(rest?`<div class="bd">${rest}</div>`:"")});
  if(f.lk)return h.replace(/<\/article>$/,leaderHTML(f,p)+"</article>");
  // members: the choices replace Got it / Confirm; a vote counts as both
  h=h.replace(/<div class="fcbtns">[\s\S]*?<\/div>/g,"").replace(/<div><span class="fcchip" style="color:var\(--s-onhand\)">✓ Confirmed · [\s\S]*?<\/span><\/span><\/div>/,"").replace(/<div class="fsok">[\s\S]*?<\/div><\/div>/,"");
  return h.replace(/<\/article>$/,memberHTML(f,p)+"</article>")}}
async function vote(f,pid,opt){if(!f.me){toast("Add your rank and last name first.");return false}
  const was=myVote(f,{id:pid});if(was&&was.v===opt)return false;
  const hs=await Promise.all(SB.words(f.me).slice(0,f.mid?5:6).map(w=>SB.h(f.id,w)));if(f.mid)hs.push(await SB.h(f.id,"ID:"+f.mid));
  await SB.rpc("feed_ack",{p_feed:f.id,p_member_key:f.mk,p_post:pid,p_words:hs,p_code:1,p_note:(PV+opt).slice(0,60)});
  f.mine=f.mine||{};f.mine[pid]=Object.assign({c:1,note:PV+opt,t:Date.now()},was?{prev:was.v,pt:was.t}:{});save();return true}
document.addEventListener("click",e=>{const b=e.target.closest("[data-fdvote]");if(!b)return;e.stopImmediatePropagation();const f=fdCur();if(!f||f.lk)return;const pid=+b.dataset.fdvote,opt=b.dataset.opt;
  b.disabled=true;vote(f,pid,opt).then(ok=>{const y=window.scrollY;renderFeed();window.scrollTo(0,y);if(ok){toast("🗳 Voted: "+opt);try{buzz()}catch(e2){}}}).catch(err=>{b.disabled=false;toast("Couldn't vote: "+(err&&err.message||err))})},true);

/* leader's phone: post the running tally when it changes, so members' bars fill in */
const sentAt={};
async function publish(f){if(!f||!f.lk||!f.ek)return;f.tsent=f.tsent||{};const now=Date.now();
  for(const p of (f.posts||[]).filter(x=>Array.isArray(x.poll)&&x.poll.length>=2&&now-x.t<30*864e5).slice(0,10)){
    const by=votesOf(f,p);const pool=fdPool(p);const ids=new Set(pool.map(m=>m.id));const cnt={};let n=0;
    for(const [id,v] of Object.entries(by))if(ids.has(id)){cnt[v]=(cnt[v]||0)+1;n++}
    const sg=JSON.stringify([cnt,n,pool.length]);if(f.tsent[p.id]===sg)continue;if(!n&&!f.tsent[p.id])continue;
    if(now-(sentAt[f.id+":"+p.id]||0)<20000)continue;sentAt[f.id+":"+p.id]=now;
    try{const ct=await fdEnc(f.ek,{c:"tally",pid:p.id,cnt,n,of:pool.length});await SB.rpc("feed_post",{p_feed:f.id,p_leader_key:f.lk,p_ct:ct});f.tsent[p.id]=sg;f.tally=f.tally||{};f.tally[p.id]={cnt,n,of:pool.length,t:now};rawSave()}catch(e){}}}
window.fdPollPublish=publish;
{const _fp=fdPoll;fdPoll=async function(f){const r=await _fp.apply(this,arguments);try{if(f&&f.lk)await publish(f)}catch(e){}return r}}

/* compose: Question + one box per choice */
function boxHTML(){if(!draft.on)return `<button type="button" class="chip" id="fdPollOn" style="cursor:pointer;margin-bottom:8px">🗳 + Poll</button>`;
  return `<div class="panel" style="margin:0 0 8px;border-color:var(--brass)" data-noxl><b>🗳 Poll</b>
    <label for="fdPollQ">Question</label><input type="text" id="fdPollQ" maxlength="140" value="${esc(draft.q)}" placeholder="What time works for the team run?">
    <div class="note" style="margin:8px 0 2px">Choices</div>
    ${draft.o.map((v,i)=>`<div style="display:flex;gap:6px;align-items:center;margin:4px 0"><input type="text" id="fdPollO${i}" maxlength="40" value="${esc(v)}" placeholder="Choice ${i+1}" style="flex:1">${draft.o.length>2?`<button type="button" class="chip" data-pollrm="${i}" aria-label="Remove choice ${i+1}" style="cursor:pointer">✕</button>`:""}</div>`).join("")}
    <div class="row2">${draft.o.length<MAXO?`<button type="button" class="btn alt" id="fdPollAdd">+ Add a choice</button>`:""}<button type="button" class="btn alt" id="fdPollOff">Remove poll</button></div></div>`}
function paint(focus){const b=document.getElementById("fdPollBox");if(b){b.innerHTML=boxHTML();if(focus){const el=document.getElementById(focus);if(el)el.focus()}}}
{const _rf=renderFeed;renderFeed=function(){_rf.apply(this,arguments);const f=fdCur();if(!f||!f.lk)return;const post=document.getElementById("fdPost");if(!post||document.getElementById("fdPollBox"))return;
  post.insertAdjacentHTML("beforebegin",`<div id="fdPollBox">${boxHTML()}</div>`)}}
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;
  if(t.closest("#fdPollOn")){draft={on:true,q:"",o:["",""]};paint("fdPollQ");return}
  if(t.closest("#fdPollOff")){draft={on:false,q:"",o:["",""]};paint();return}
  if(t.closest("#fdPollAdd")){grab();if(draft.o.length<MAXO)draft.o.push("");paint("fdPollO"+(draft.o.length-1));return}
  const rm=t.closest("[data-pollrm]");if(rm){grab();draft.o.splice(+rm.dataset.pollrm,1);paint();return}});
document.addEventListener("keydown",e=>{const id=e.target&&e.target.id||"";if(e.key!=="Enter"||!/^fdPoll(Q|O\d)$/.test(id))return;e.preventDefault();grab();
  if(id==="fdPollQ"){const el=document.getElementById("fdPollO0");if(el)el.focus();return}const i=+id.slice(7);
  if(i===draft.o.length-1&&draft.o.length<MAXO&&String(draft.o[i]).trim()){draft.o.push("");paint("fdPollO"+(i+1))}else{const el=document.getElementById("fdPollO"+(i+1));if(el)el.focus()}});
/* Post: needs a question (or text) and 2 choices; the question becomes the post's text */
document.addEventListener("click",e=>{if(e.target.id!=="fdPost"||!draft.on)return;grab();const q=String(draft.q||"").trim();
  if(!q){e.stopImmediatePropagation();toast("Type the poll question.");const el=$("#fdPollQ");if(el)el.focus();return}
  if(clean(draft.o).length<2){e.stopImmediatePropagation();toast("Fill in at least 2 choices.");const el=$("#fdPollO"+(draft.o[0].trim()?1:0));if(el)el.focus();return}
  const tx=$("#fdTxt");if(tx){const body=tx.value.trim();if(!body.startsWith(q))tx.value=q+(body?"\n\n"+body:"")}},true);

{const st=document.createElement("style");st.textContent=`.pollg{display:flex;flex-direction:column;gap:6px;margin-top:6px}
.pollr{position:relative;display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:44px;padding:0 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2);overflow:hidden;font:inherit;color:var(--ink);text-align:left;width:100%}
button.pollr{cursor:pointer}.pollr.pick{justify-content:center;font-weight:800}.pollr.on{border-color:var(--s-onhand)}
.pollf{position:absolute;left:0;top:0;bottom:0;background:color-mix(in srgb,var(--s-onhand) 28%,transparent);transition:width .45s ease}.pollr.on .pollf{background:color-mix(in srgb,var(--s-onhand) 45%,transparent)}
.pollt,.polln{position:relative;font-weight:700}.polln{font-variant-numeric:tabular-nums;font-size:13px;opacity:.85;white-space:nowrap}
@media (prefers-reduced-motion:reduce){.pollf{transition:none}}`;document.head.appendChild(st)}
})();
