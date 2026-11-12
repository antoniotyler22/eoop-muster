/* 4.91: a no-app link for the check-in. Anyone can open it on any phone (nothing to install), type their name, tap
   Good / Delayed / Need help, and a text to the leader's cell opens ready to send. It is the check-in link without the
   live flag, so it never needs signal to the server and the reply comes back as a normal text the leader can paste. */
const nlLink=()=>ciLink().replace(/&l=1(?=&|$)/,"");
const nlText=()=>unitName()+" check-in. No app needed: tap the link, type your name, tap Good, then hit Send in Messages.\n"+nlLink();
function nlHTML(){const ok=!!S.myPh;
  return `<div class="panel" id="nlBox" data-noxl><b>No app? Send this link</b>
    <p class="note" style="margin:2px 0 8px">For people who don't have Accounted For. They tap the link, type their name, tap <b>Good</b>, and a text to your cell opens. Nothing to install, no sign-up.</p>
    ${ok?`<button class="btn" data-nlcopy="1">Copy the link</button>
    <a class="btn alt" data-nlsms="1" href="${esc("sms:?&body="+encodeURIComponent(nlText()))}">Text it to someone</a>
    ${navigator.share?`<button class="btn alt" data-nlshare="1">Share…</button>`:""}
    <p class="note" id="nlOut" role="status"></p>`
    :`<p class="note" style="color:var(--warn)">Add your cell above first. Their text comes to that number.</p>`}</div>`}
{const _c=ciHTML;ciHTML=function(){return _c.apply(this,arguments)+nlHTML()}}
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;
  if(t.closest("[data-nlcopy]")){const o=$("#nlOut"),txt=nlText();
    const done=()=>{if(o)o.textContent="Link copied. Paste it in any text, email or chat."};
    try{navigator.clipboard.writeText(txt).then(done,()=>{if(o)o.textContent=txt})}catch(err){if(o)o.textContent=txt}return}
  if(t.closest("[data-nlshare]")){navigator.share({title:unitName()+" check-in",text:nlText()}).catch(()=>{})}});
