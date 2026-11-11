/* ---------- Word of Mouth: no Confirm button, "Seen" happens by itself (4.83.0) ----------
   Leaders already see who has seen each post (Seen by N of M), so nobody has to tap Confirm any more.
   - Opening Word of Mouth (or your page, which shows the word) counts as seen: features/auto-seen.js sends the Got it for you.
   - The person who posted it sees "✓ I posted it". Members who have seen a post see "✓ Seen". Problem and Reply stay.
   - fsOwn / fsNeeds / fsOpen still say which posts are yours and which haven't been seen yet (they drive the badge and "land on Word of Mouth"). */
function fsOwn(f,p){if(f.lk)return !p.sl&&!p.mb;const mine=f.me&&String(p.by||"").toUpperCase().trim()===String(f.me).toUpperCase().trim();if(p.mb)return !!mine;return !!(p.sl&&f.pk&&mine)}
function fsNeeds(f,p){return !!f.lk&&!fsOwn(f,p)&&!(f.lseen||{})[p.id]}
function fsOpen(f){return f&&f.lk?fdVisible(f).filter(p=>fsNeeds(f,p)):[]}
const fsChip=(txt,t)=>`<div class="fsok"><span class="fcchip" style="color:var(--s-onhand)">${txt}${t?` · <span data-ago="${t}">${ago(t)}</span>`:""}</span></div>`;

{const _card=fdCard;fdCard=function(f,p){let h=_card.apply(this,arguments);
  const own=fsOwn(f,p),posted=own?fsChip("✓ I posted it"):"";
  if(f.lk)return posted?h.replace(/<\/article>$/,posted+"</article>"):h;
  /* members: the Got it button is gone (Problem stays); a post you've seen says Seen */
  h=h.replace(/<button class="go" data-fdack="\d+" data-c="1">✓ Got it<\/button>/,"");
  h=h.replace(/✓ Confirmed · /,"✓ Seen · ");
  h=h.replace(/<div class="note" style="margin:0">For ([^<]*) · no Got it needed from you<\/div>/,(m,l)=>`<div class="note" style="margin:0">For ${l}</div>`);
  return posted?h.replace(/<\/article>$/,posted+"</article>"):h}}

/* Today: the Plan of the Day / new word Got it buttons go too */
{const _rt=renderToday;renderToday=function(){_rt.apply(this,arguments);document.querySelectorAll("#main [data-tdack]").forEach(b=>{if(/Got it|Confirm/.test(b.textContent))b.remove()})}}

if(typeof HELP==="object"&&HELP.feed&&Array.isArray(HELP.feed[2]))HELP.feed[2].push("No Confirm button: when you open Word of Mouth, your leader sees that you saw it. Your own posts show ✓ I posted it. Tap Problem if something's wrong.");
