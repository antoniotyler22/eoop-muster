/* Accounted For 4.59: duty swap board.
   1. A member opens My page (or the Feed request form), taps "Find someone to take it" on an upcoming duty, adds a
      note if they like, and sends it. It goes to the leader like any request (encrypted).
   2. The leader's phone (the OIC's) posts it to the Feed for everyone: "SGT Ruiz needs someone for Duty NCO, Sat 1 Nov."
   3. Anyone taps "✋ I'll take it". That also counts as their Confirm.
   4. The leader sees who offered and taps Approve on one. The duty roster changes, the request is marked approved,
      and a short "Swap done" post tells everyone (members' My pages update with the roster).
   Members never see each other's names here except the person asking and the one approved. */
(()=>{
const TAKE="🔁 take";
const dShort=d=>{const x=typeof parseD==="function"?parseD(d):null;return x?DOW[x.getDay()]+" "+short(x):d};
const memberFeed=()=>(S.feeds||[]).find(f=>!f.lk&&f.mk&&f.ek)||null;
async function ackNote(f,pid,note){const me=f.me||(f.lk?(S.who&&S.who.n)||S.postAs||S.myName||"":"");if(!me)throw new Error("Add your rank and last name first.");
  const hs=await Promise.all(SB.words(me).slice(0,f.mid?5:6).map(w=>SB.h(f.id,w)));if(f.mid)hs.push(await SB.h(f.id,"ID:"+f.mid));
  await SB.rpc("feed_ack",{p_feed:f.id,p_member_key:f.mk,p_post:pid,p_words:hs,p_code:1,p_note:note.slice(0,60)});
  f.mine=f.mine||{};f.mine[pid]={c:1,note,t:Date.now()};save()}
/* ---------- member: ask ---------- */
async function askSwap(d,ro,note){const f=memberFeed();if(!f)throw new Error("Your team Feed isn't on this phone yet.");if(!f.me)throw new Error("Set your name on the Feed first.");
  const o={k:"req",rid:"r"+Date.now().toString(36)+rndId(4),ty:"Duty swap",from:d,to:"",tm:"",note:(ro+(note?" · "+note:"")).slice(0,200),me:f.me};
  const ct=await fdEnc(f.ek,o);await SB.rpc("feed_req",{p_feed:f.id,p_member_key:f.mk,p_ct:ct});try{SB.notify(null,{alert:"req",feed:f.id,mk:f.mk})}catch(e){}
  f.myReqs=[{rid:o.rid,ty:o.ty,from:d,to:"",tm:"",t:Date.now()}].concat(f.myReqs||[]).slice(0,30);S.swapAsked=S.swapAsked||{};S.swapAsked[d+"|"+ro]=Date.now();save()}
let open="";
function meDuty(){if(view!=="me"||!S.me||!S.me.d||String(S.me.pk)==="preview")return;const D=S.me.d;const today=dkey();
  const list=(D.duties||[]).filter(x=>x.d>=today).slice(0,6);if(!list.length)return;const m=$("#main");if(!m||m.querySelector("#swBox"))return;
  const h2=[...m.querySelectorAll(".sech h2")].find(x=>/^Duty$/i.test(x.textContent.trim()));
  const html=`<div class="panel" id="swBox" style="margin-top:8px"><b>🔁 Need someone to take a duty?</b><p class="note" style="margin:2px 0 6px">Your leader posts it to the team; whoever takes it gets approved by your leader.</p>
    ${list.map(x=>{const k=x.d+"|"+x.r;const sent=(S.swapAsked||{})[k];return `<div class="rrow" style="--sc:var(--brass)"><div class="who"><b>${esc(x.r)}</b> · ${esc(dShort(x.d))}${sent?`<div class="ph">✓ Asked ${esc(ago(sent))}. Waiting for someone to take it.</div>`:""}</div>
      ${sent?"":open===k?`<div style="width:100%"><input type="text" id="swNote" maxlength="80" placeholder="Note (optional): why, or a trade you'd offer"><div class="row2" style="margin-top:6px"><button class="btn" data-swsend="${esc(k)}">Send to my leader</button><button class="btn alt" data-swx="1">Cancel</button></div></div>`:`<button class="chip" data-swopen="${esc(k)}" style="cursor:pointer">Find someone</button>`}</div>`}).join("")}</div>`;
  if(h2){const card=h2.parentElement.nextElementSibling;(card||h2.parentElement).insertAdjacentHTML("afterend",html)}else m.insertAdjacentHTML("beforeend",html)}
if(typeof renderMe==="function"){const _rm=renderMe;renderMe=function(){const r=_rm.apply(this,arguments);try{meDuty()}catch(e){}return r}}
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;
  const o=t.closest("[data-swopen]");if(o){open=o.dataset.swopen;renderMe();const n=$("#swNote");if(n)n.focus();return}
  if(t.closest("[data-swx]")){open="";renderMe();return}
  const s=t.closest("[data-swsend]");if(s){const [d,...rr]=s.dataset.swsend.split("|");const ro=rr.join("|");const note=(($("#swNote")||{}).value||"").trim();s.disabled=true;
    askSwap(d,ro,note).then(()=>{open="";renderMe();toast("🔁 Sent. Your leader posts it to the team.")}).catch(err=>{s.disabled=false;toast(err.message||"Couldn't send. Check signal.")});return}
  const tk=t.closest("[data-swtake]");if(tk){e.stopImmediatePropagation();const f=fdCur();tk.disabled=true;ackNote(f,+tk.dataset.swtake,TAKE).then(()=>{const y=window.scrollY;renderFeed();window.scrollTo(0,y);toast("✋ Offered. Your leader decides.")}).catch(err=>{tk.disabled=false;toast(err.message||"Couldn't send.")});return}
  const ok=t.closest("[data-swok]");if(ok){e.stopImmediatePropagation();const [pid,mid]=ok.dataset.swok.split("|");approve(fdCur(),+pid,mid,ok);return}},true);
/* ---------- the Feed card ---------- */
const doneFor=(f,rid)=>(f.posts||[]).find(p=>p.swap&&p.swap.done&&p.swap.rid===rid);
{const _card=fdCard;fdCard=function(f,p){let h=_card.apply(this,arguments);if(!p||!p.swap)return h;
  try{const sw=p.swap;if(sw.done)return h.replace(/<\/article>$/,`<div class="fci"><span class="ttl">✅ Duty swap done</span><div><b>${esc(sw.done)}</b> takes ${esc(sw.ro)} on ${esc(dShort(sw.d))}${sw.who?` (was ${esc(sw.who)})`:""}.</div></div></article>`);
    const dn=doneFor(f,sw.rid);let box=`<div class="fci swap"><span class="ttl">🔁 Duty swap</span><div style="font-size:15px"><b>${esc(sw.who)}</b> needs someone for <b>${esc(sw.ro)}</b> on <b>${esc(dShort(sw.d))}</b>.</div>`;
    if(dn)box+=`<div class="note" style="margin:6px 0 0;color:var(--s-onhand);font-weight:700">✅ Covered by ${esc(dn.swap.done)}</div>`;
    else if(f.lk){const st=fdStats(f,p);const pool=fdPool(p);const offers=sorted(pool.filter(m=>st.A[m.id]&&String(st.A[m.id].note||"")===TAKE));
      box+=offers.length?`<div class="note" style="margin:6px 0 2px">${offers.length} offered to take it:</div>${offers.map(m=>`<div class="rtop"><div class="who"><b>${esc(m.rank)}</b> ${esc(m.name)}<div class="ph">${esc(m.sec)}${m.duty&&m.duty!=="Full Duty"?" · "+esc(m.duty):""}</div></div><button class="btn" data-swok="${p.id}|${esc(m.id)}" style="width:auto;min-height:40px;padding:0 14px">Approve</button></div>`).join("")}`:`<div class="note" style="margin:6px 0 0">No one has offered yet.</div>`}
    else{const mine=(f.mine||{})[p.id];box+=mine&&String(mine.note||"")===TAKE?`<div class="note" style="margin:6px 0 0;font-weight:700">✋ You offered. Your leader decides.</div>`:`<button class="btn" data-swtake="${p.id}" style="margin-top:8px">✋ I'll take it</button>`}
    return h.replace(/<\/article>$/,box+"</div></article>")}catch(e){return h}}}
/* ---------- leader: post new swap requests, approve an offer ---------- */
const isOic=()=>!S.role||S.role==="oic"||S.role==="newoic";
async function postSwaps(f){if(!f||!f.lk||!isOic())return;
  for(const r of (S.reqs||[]).filter(x=>x.feed===f.id&&x.ty==="Duty swap"&&x.st==="pending"&&!x.posted).slice(0,3)){
    if((f.posts||[]).some(p=>p.swap&&p.swap.rid===r.rid)){r.posted=1;continue}
    const ro=String(r.note||"").split(" · ")[0]||"Duty";const m=S.roster.find(x=>x.id===r.mid);const who=m?m.rank+" "+lastOf(m):r.who;
    const txt=`🔁 Duty swap: ${who} needs someone for ${ro} on ${dShort(r.from)}. Tap "I'll take it" if you can.`;
    try{const ct=await fdEnc(f.ek,{t:txt,u:false,to:{k:"all"},sa:SECTIONS.map(x=>x[0]),by:fdBy(f),swap:{rid:r.rid,d:r.from,ro,who}});const id=await SB.rpc("feed_post",{p_feed:f.id,p_leader_key:f.lk,p_ct:ct});
      r.posted=+id||1;try{SB.notify(null,{feed:f.id,lk:f.lk,urg:false})}catch(e){}save()}catch(e){}}}
window.swapPostNow=postSwaps;
{const _fp=fdPoll;fdPoll=async function(f){const r=await _fp.apply(this,arguments);try{await postSwaps(f)}catch(e){}return r}}
async function approve(f,pid,mid,btn){if(!f||!f.lk)return;const p=(f.posts||[]).find(x=>x.id===pid);if(!p||!p.swap)return;const sw=p.swap;const m=S.roster.find(x=>x.id===mid);if(!m)return;
  const ro=S.duty.rosters.find(x=>x.name===sw.ro);btn.disabled=true;
  if(ro){ro.assign=ro.assign||{};ro.assign[sw.d]=m.id}
  const r=(S.reqs||[]).find(x=>x.rid===sw.rid);if(r){r.st="approved";r.dt=Date.now();r.dnote=("Covered by "+m.rank+" "+lastOf(m)).slice(0,80)}
  const taker=m.rank+" "+lastOf(m);
  try{const ct=await fdEnc(f.ek,{t:`✅ Duty swap done: ${taker} takes ${sw.ro} on ${dShort(sw.d)}${sw.who?" (was "+sw.who+")":""}.`,u:false,to:{k:"all"},sa:SECTIONS.map(x=>x[0]),by:fdBy(f),swap:{rid:sw.rid,d:sw.d,ro:sw.ro,who:sw.who,done:taker}});
    const id=await SB.rpc("feed_post",{p_feed:f.id,p_leader_key:f.lk,p_ct:ct});f.posts=[{id:+id,t:Date.now(),txt:"✅ Duty swap done",to:{k:"all"},by:fdBy(f),swap:{rid:sw.rid,d:sw.d,ro:sw.ro,who:sw.who,done:taker}}].concat(f.posts||[]);
    try{SB.notify(null,{feed:f.id,lk:f.lk,urg:false})}catch(e){}}catch(e){toast("Roster changed; couldn't post the update. Check signal.")}
  try{actAdd("🔁",taker+" takes "+sw.ro+" "+dShort(sw.d)+(sw.who?" from "+sw.who:""),"duty")}catch(e){}
  save();const y=window.scrollY;renderFeed();window.scrollTo(0,y);toast(ro?"✅ Approved. Duty roster updated.":"✅ Approved. (No roster named "+sw.ro+"; update it in Duty.)")}
if(typeof HELP==="object"){HELP.swap=["Duty swap","Members ask for someone to take a duty; the team sees it in the Feed; the leader approves one.",["My page → Duty → Find someone.","Your leader's phone posts it to the Feed. Anyone taps I'll take it.","The leader taps Approve on one person: the duty roster changes and everyone sees Swap done."]]}
})();
