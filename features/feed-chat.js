/* Accounted For 4.45: the Feed as a conversation.
   - Posts read as chat bubbles: yours on the right, everyone else's on the left.
   - Anything still waiting for your Confirm sits on top as a one-at-a-time card: tap Confirm and the next one slides in.
     When it is empty you get "All caught up".
   - Uses the same Confirm / Reply buttons and handlers as before (data-fdack, data-fsok, data-fdrep), so nothing about
     how Got it is stored changes. */
(()=>{
const needs=f=>{const all=fdVisible(f);
  if(f.lk)return all.filter(p=>!(typeof fsOwn==="function"&&fsOwn(f,p))&&!(f.lseen||{})[p.id]);
  return all.filter(p=>fdForMe(f,p)&&!(f.mine||{})[p.id]&&!(typeof fsOwn==="function"&&fsOwn(f,p)))};
const order=l=>l.slice().sort((a,b)=>(b.urg?1:0)-(a.urg?1:0)||b.id-a.id);
const ownP=(f,p)=>typeof fsOwn==="function"&&fsOwn(f,p);

{const _card=fdCard;fdCard=function(f,p){let h=_card.apply(this,arguments);
  try{return h.replace(/^<article data-pid="\d+" /,"<article ").replace('<article ',`<article data-pid="${p.id}" `).replace('class="fc','class="fc '+(ownP(f,p)?"own ":"")+"bub")}catch(e){return h}}}

function stack(f){const need=order(needs(f));const n=need.length;
  if(!n){return fdVisible(f).length?`<div class="fstack ok" id="fStack"><span>✓ All caught up</span></div>`:""}
  const p=need[0],lead=!!f.lk,by=p.by||f.unit;
  const tags=`${p.pod?`<span class="fcchip" style="color:var(--brass)">📋 Plan of the Day</span>`:""}${p.urg?`<span class="fcchip" style="color:var(--warn)">URGENT</span>`:""}${(f.pins||[]).includes(p.id)?`<span class="fcchip">📌 Pinned</span>`:""}`;
  const txt=p.pod?String(p.txt||"").split("\n")[0]||"Plan of the Day":p.txt;
  return `<div class="fstack" id="fStack" data-spid="${p.id}"><div class="fsp"><b>${n} to confirm</b><span class="fsbar">${need.slice(0,8).map((_,i)=>`<i${i===0?' class="on"':""}></i>`).join("")}</span></div>
    <div class="fscard${p.urg?" urg":""}"><div class="fch">${fdAv(by)}<div class="hd"><div><span class="nm">${esc(by)}</span> <span class="tm">· <span data-ago="${p.t}">${ago(p.t)}</span></span></div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">${tags}</div></div></div>
      <div class="bd">${esc(txt)}</div>
      <div class="fsbtns">${!lead&&f.mk?`<button class="alt" data-fdrep="${p.id}">💬 Reply</button>`:""}${lead?`<button class="go" data-fsok="${p.id}">✓ Confirm</button>`:`<button class="go" data-fdack="${p.id}" data-c="1">✓ Confirm</button>`}</div></div></div>`}

{const _rf=renderFeed;renderFeed=function(){_rf.apply(this,arguments);
  try{const f=fdCur(),m=document.getElementById("main");if(!f||!m||fdNew||!m.querySelector("#fdQ,article.fc,.sechead"))return;
    m.classList.add("fchat");if(m.querySelector("#fStack"))return;
    const anchor=m.querySelector(".sechead");if(!anchor)return;
    const html=stack(f);if(!html)return;
    anchor.insertAdjacentHTML("afterend",html);
    /* a reply box opened from the card moves up into the card */
    const inp=m.querySelector('input[id^="fdRep"]');const st=m.querySelector("#fStack");
    if(inp&&st&&inp.id.slice(5)===st.dataset.spid){const box=inp.closest(".addph");const btns=st.querySelector(".fsbtns");if(box&&btns){btns.replaceWith(box)}}
  }catch(e){}}}
})();
