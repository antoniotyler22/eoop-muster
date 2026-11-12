// 4.95: Live translation for Word of Mouth. Every post gets a Translate button. The text is translated on the phone
// with the browser's built-in Translator API when it has one (nothing is sent anywhere, so posts stay private).
// Without it, a Google Translate link is offered. That link sends the post text to Google, and says so, and only on a tap.
(()=>{
const LANGS={en:"English",es:"Español",tl:"Tagalog",fr:"Français",de:"Deutsch",pt:"Português",ko:"한국어",ja:"日本語",zh:"中文",vi:"Tiếng Việt",ru:"Русский",ar:"العربية",hi:"हिन्दी"};
const pref=()=>{const l=S.trLang||S.lang||(navigator.language||"en").slice(0,2).toLowerCase();return LANGS[l]?l:"en"};
const cache={};
async function detect(t){try{if(window.LanguageDetector){const d=await LanguageDetector.create();const r=await d.detect(t);if(r&&r[0]&&r[0].confidence>.5)return r[0].detectedLanguage.slice(0,2)}}catch(e){}return "en"}
async function translate(t,tgt){const k=tgt+"|"+t;if(cache[k])return cache[k];const src=await detect(t);
  if(src===tgt)return {same:true};
  if(!window.Translator)return {noapi:true,src};
  let av="unavailable";try{av=await Translator.availability({sourceLanguage:src,targetLanguage:tgt})}catch(e){}
  if(av==="unavailable")return {noapi:true,src};
  const tr=await Translator.create({sourceLanguage:src,targetLanguage:tgt});const out=await tr.translate(t);return cache[k]={out,src}}
const gt=(t,tgt)=>"https://translate.google.com/?sl=auto&tl="+tgt+"&op=translate&text="+encodeURIComponent(t.slice(0,2000));
function box(art){let b=art.querySelector(".trout");if(!b){b=document.createElement("div");b.className="trout fci";b.setAttribute("role","status");art.appendChild(b)}return b}
async function run(key,btn){const i=key.lastIndexOf(":");const f=S.feeds.find(x=>x.id===key.slice(0,i));const p=f&&(f.posts||[]).find(x=>String(x.id)===key.slice(i+1));
  const art=btn.closest("article");if(!p||!art)return;const b=box(art);const tgt=pref();b.textContent="Translating…";
  const sel=`<label class="note" style="display:block;margin-top:6px">Translate to <select class="wsel" data-trsel="${esc(key)}" style="width:auto;display:inline-block">${Object.entries(LANGS).map(([k,v])=>`<option value="${k}"${k===tgt?" selected":""}>${esc(v)}</option>`).join("")}</select></label>`;
  try{const r=await translate(p.txt,tgt);
    if(r.same)b.innerHTML=`<div class="note">This post is already in ${esc(LANGS[tgt])}.</div>`+sel;
    else if(r.noapi)b.innerHTML=`<div class="note">This phone can't translate on its own. <a href="${esc(gt(p.txt,tgt))}" target="_blank" rel="noopener">Open in Google Translate</a>. That sends this post's text to Google.</div>`+sel;
    else b.innerHTML=`<div style="white-space:pre-wrap">${esc(r.out)}</div><div class="note">Translated from ${esc(LANGS[r.src]||r.src)} on this phone. Machine translation can be wrong: confirm anything important.</div>`+sel}
  catch(e){b.innerHTML=`<div class="note" style="color:var(--warn)">Couldn't translate that.</div>`+sel}}
{const _c=fdCard;fdCard=function(f,p){const h=_c.apply(this,arguments);if(!p||!p.txt||p.pod||!/<\/article>\s*$/.test(h))return h;
  return h.replace(/<\/article>\s*$/,`<div class="evts" data-noxl><button class="chip" data-trp="${esc(f.id+":"+p.id)}" style="cursor:pointer">🌐 Translate</button></div></article>`)}}
document.addEventListener("click",e=>{const b=e.target.closest("[data-trp]");if(b){e.stopPropagation();run(b.dataset.trp,b)}});
document.addEventListener("change",e=>{const s=e.target.closest("[data-trsel]");if(!s)return;S.trLang=s.value;save();const art=s.closest("article");const b=art&&art.querySelector("[data-trp]");if(b)run(s.dataset.trsel,b)});
window.AFTranslate={run,translate,pref};
})();
