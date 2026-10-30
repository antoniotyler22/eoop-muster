/* Accounted For 4.42: reply to a Feed post.
   Under a post a member can tap "💬 Reply", type a short answer (60 characters) and send it. It counts as their Got it
   and carries the words with it. Their leader sees it in the post's "Who" list next to their rank and name
   ("Replies"). It rides on the same Got it the server already stores (a Got it with a note), so nothing new is needed
   on the server. The reply is encrypted the same way as the rest of the Feed: the server keeps only the text of the
   note, never the name (names are hashed). Members see their own reply under the post; replies are for leaders. */
(()=>{
let open=null;
const rep=(f,p)=>{const m=(f.mine||{})[p.id];return m&&m.c===1&&m.note?m:null};
async function send(f,pid,text){
  if(!f.me){toast("Add your rank and last name first.");return false}
  const note=String(text||"").replace(/[|#]/g," ").trim().slice(0,60);if(!note){toast("Type your reply first.");return false}
  const hs=await Promise.all(SB.words(f.me).slice(0,f.mid?5:6).map(w=>SB.h(f.id,w)));if(f.mid)hs.push(await SB.h(f.id,"ID:"+f.mid));
  await SB.rpc("feed_ack",{p_feed:f.id,p_member_key:f.mk,p_post:pid,p_words:hs,p_code:1,p_note:note});
  f.mine=f.mine||{};f.mine[pid]={c:1,note,t:Date.now()};save();return true}
{const _card=fdCard;fdCard=function(f,p){let h=_card.apply(this,arguments);
  try{
    if(f.lk){
      if(fdOpen===p.id&&!/data-fdrepl/.test(h)){const st=fdStats(f,p),pool=fdPool(p);
        const rs=sorted(pool.filter(m=>st.A[m.id]&&st.A[m.id].c===1&&st.A[m.id].note));
        if(rs.length)h=h.replace(/<button class="btn warn" data-fddel=/,`<div data-fdrepl="1"><b>💬 Replies (${rs.length})</b>${rs.map(m=>`<div class="rtop"><div class="who"><b>${esc(m.rank)}</b> ${esc(m.name)}<div class="ph">${esc(st.A[m.id].note)}</div></div>${m.phone?`<a class="call" href="${telHref(m.phone)}">Call</a>`:""}</div>`).join("")}</div><button class="btn warn" data-fddel=`)}
      return h}
    if(fsOwn(f,p)||!fdForMe(f,p))return h;
    const mine=(f.mine||{})[p.id];
    if(mine&&mine.c===2)return h;
    let add="";
    if(rep(f,p))add=`<div class="note" style="margin:4px 0 0">💬 You replied: “${esc(mine.note)}”</div>`;
    else if(open===p.id)add=`<div class="addph"><input type="text" id="fdRep${p.id}" maxlength="60" placeholder="Your reply (your leader sees your name)" enterkeyhint="send"><button data-fdrepsend="${p.id}">Send</button></div>`;
    else add=`<div class="fcbtns"><button data-fdrep="${p.id}">💬 Reply</button></div>`;
    return h.replace(/<\/article>$/,add+"</article>")
  }catch(e){return h}}}
document.addEventListener("click",e=>{const t=e.target;if(!t||!t.closest)return;
  const o=t.closest("[data-fdrep]");if(o){e.stopImmediatePropagation();open=+o.dataset.fdrep;const y=window.scrollY;renderFeed();window.scrollTo(0,y);const i=$("#fdRep"+open);if(i)i.focus();return}
  const s=t.closest("[data-fdrepsend]");if(s){e.stopImmediatePropagation();const f=fdCur(),pid=+s.dataset.fdrepsend;const v=(($("#fdRep"+pid)||{}).value||"");s.disabled=true;
    send(f,pid,v).then(ok=>{s.disabled=false;if(ok){open=null;const y=window.scrollY;renderFeed();window.scrollTo(0,y);toast("Reply sent")}}).catch(()=>{s.disabled=false;toast("Couldn't send. Try again.")})}},true);
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target&&/^fdRep\d+$/.test(e.target.id||"")){e.preventDefault();const b=document.querySelector(`[data-fdrepsend="${e.target.id.slice(5)}"]`);if(b)b.click()}});
})();
