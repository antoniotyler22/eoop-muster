/* Accounted For 4.83.0: two small Word of Mouth upgrades.
   1) Links, phone numbers and emails inside a post are tappable (web address opens, number calls, email writes).
   2) Writing a post: one-tap starters (Formation, Schedule change, Safety, Weather, Reminder) fill the box with the words to
      change already marked, and what you've typed is kept as a draft if you leave or close the app, until you post it. */
(()=>{
/* ---------- 1) tappable links ---------- */
const URL_RX=/\bhttps?:\/\/[^\s<]+|\bwww\.[^\s<]+/gi;
const MAIL_RX=/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const TEL_RX=/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?!\d)/g;   /* no look-behind: older iPhones choke on it */
function linkText(t){
  const hold=[];const keep=h=>{hold.push(h);return "\u0000"+(hold.length-1)+"\u0000"};
  t=t.replace(URL_RX,m=>{let u=m,tail="";const mm=u.match(/[.,;:!?)\]]+$/);if(mm){tail=mm[0];u=u.slice(0,-tail.length)}
    const href=/^www\./i.test(u)?"https://"+u:u;
    return keep(`<a class="womlink" href="${href}" target="_blank" rel="noopener noreferrer">${u}</a>`)+tail});
  t=t.replace(MAIL_RX,m=>keep(`<a class="womlink" href="mailto:${m}">${m}</a>`));
  t=t.replace(TEL_RX,(m,off,str)=>{if(off>0&&/[\d@]/.test(str[off-1]))return m;const d=m.replace(/\D/g,"");const n=d.length===11&&d[0]==="1"?d.slice(1):d;if(n.length!==10)return m;
    return keep(`<a class="womlink" href="tel:+1${n}">${m}</a>`)});
  return t.replace(/\u0000(\d+)\u0000/g,(_,i)=>hold[+i])}
function linkHTML(html){let inBtn=0,inA=0;
  return html.split(/(<[^>]*>)/).map(seg=>{
    if(seg[0]==="<"){if(/^<button\b/i.test(seg))inBtn++;else if(/^<\/button/i.test(seg))inBtn=Math.max(0,inBtn-1);else if(/^<a\b/i.test(seg))inA++;else if(/^<\/a/i.test(seg))inA=Math.max(0,inA-1);return seg}
    return inBtn||inA?seg:linkText(seg)}).join("")}
window.womLinkHTML=linkHTML;
{const _card=fdCard;fdCard=function(f,p){let h=_card.apply(this,arguments);
  try{if(p.pod)return h;return h.replace(/(<div class="bd"[^>]*>)([\s\S]*?)(<\/div>)/,(m,a,b,c)=>a+linkHTML(b)+c)}catch(e){return h}}}

/* ---------- 2) starters and a kept draft ---------- */
const TPL=[["📍","Formation","Formation [time] at [place]. Uniform: [uniform]. Be there 10 minutes early."],
  ["📅","Schedule change","Schedule change: [what] moves to [new day and time]. Everything else stays the same."],
  ["⚠️","Safety","Safety: [topic]. Look out for each other and tell me right away if anything is wrong."],
  ["🌧","Weather","Weather update: [conditions]. Plan for [gear or change]. I'll post here if it changes."],
  ["✅","Reminder","Reminder: [what] is due [when]. Tap Problem or reply if you can't make it."]];
let saveT=null,restored=false;
function drafts(){S.womDraft=S.womDraft&&typeof S.womDraft==="object"?S.womDraft:{};return S.womDraft}
function keepDraft(f,txt){clearTimeout(saveT);saveT=setTimeout(()=>{try{const d=drafts();if(txt.trim())d[f.id]=txt;else delete d[f.id];save()}catch(e){}},800)}
function put(f){
  if(view!=="feed"||!f||!f.lk)return;const ta=document.getElementById("fdTxt");if(!ta||document.getElementById("womTpl"))return;
  if(!restored&&!ta.value&&!fdDraft.txt){const d=drafts()[f.id];if(d){ta.value=d;fdDraft.txt=d;restored=true}}
  restored=true;
  const lab=document.querySelector('label[for="fdTxt"]');if(!lab)return;
  lab.insertAdjacentHTML("afterend",`<div class="womtpl" id="womTpl" role="group" aria-label="Quick starters">${TPL.map((t,i)=>`<button type="button" data-womtpl="${i}"><span aria-hidden="true">${t[0]}</span> ${t[1]}</button>`).join("")}</div>`);
  if(drafts()[f.id]&&ta.value===drafts()[f.id])lab.insertAdjacentHTML("beforebegin",`<div class="note womdraft" style="margin:0 0 4px">Draft kept from last time.</div>`)}
{const _rf=renderFeed;renderFeed=function(){const r=_rf.apply(this,arguments);try{put(typeof fdCur==="function"?fdCur():null)}catch(e){}return r}}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-womtpl]");if(!b)return;e.preventDefault();
  const ta=document.getElementById("fdTxt");if(!ta)return;const t=TPL[+b.dataset.womtpl][2];
  const base=ta.value.trim();ta.value=base?base+"\n"+t:t;fdDraft.txt=ta.value;
  const i=ta.value.lastIndexOf("[");const j=i<0?-1:ta.value.indexOf("]",i);ta.focus();if(i>=0&&j>i){try{ta.setSelectionRange(i,j+1)}catch(_){}}
  const f=typeof fdCur==="function"?fdCur():null;if(f)keepDraft(f,ta.value)});
document.addEventListener("input",e=>{if(!e.target||e.target.id!=="fdTxt")return;const f=typeof fdCur==="function"?fdCur():null;if(f)keepDraft(f,e.target.value)});
document.addEventListener("click",e=>{if(!e.target.closest||!e.target.closest("#fdPost"))return;const f=typeof fdCur==="function"?fdCur():null;if(!f)return;
  setTimeout(()=>{const ta=document.getElementById("fdTxt");if(!ta||!ta.value.trim()){try{delete drafts()[f.id];save()}catch(_){}}},1500)});

{const c=document.createElement("style");c.textContent=`.womlink{color:var(--brass);font-weight:600;text-decoration:underline;text-underline-offset:2px;word-break:break-word}
.womtpl{display:flex;gap:6px;overflow-x:auto;margin:2px -2px 8px;padding:2px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.womtpl::-webkit-scrollbar{display:none}
.womtpl button{flex:none;border:1px solid var(--line);background:var(--surface-2,var(--surface));color:var(--ink);border-radius:999px;padding:7px 12px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;min-height:36px}
.womtpl button:active{background:var(--line)}`;document.head.appendChild(c)}
if(typeof HELP==="object"&&HELP.feed&&Array.isArray(HELP.feed[2]))HELP.feed[2].push("Links, phone numbers and emails in a post are tappable. When you write a post, tap a starter (Formation, Safety…) to fill the box, then type over the [brackets]. Your draft is kept until you post it.");
})();
