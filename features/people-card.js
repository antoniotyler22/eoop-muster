/* Accounted For 4.152.0: People cards, design #5 ("roomy card + action bar").
   Every person row in a section list or the People screen becomes one calm card:
     top    : avatar (initials, green check when verified), rank + name, who set the status, the status chip
     bottom : an even action bar: Call, Message, then Nudge (leaders, when they're Off Hand) or Verify, then More
   More opens one sheet with everything that used to be stacked on the card: Duty, Dates and location, Verify or
   Revoke, 6W, Remove and Delete. The old buttons stay in the row (hidden) and the sheet taps them, so every
   existing rule (two-tap remove, leader-only verify, delete confirmation, 6W) still runs its own code.
   The Slide to nudge control is replaced by the bar's Nudge button, which opens the same Nudge sheet. */
(()=>{
if(window.__pc5)return;window.__pc5=1;
const svg=(p,w)=>`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w||1.9}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const IC={
  call:svg('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>'),
  msg:svg('<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.9-.9L3 21l1.9-5.1A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/>'),
  bell:svg('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>'),
  ok:svg('<path d="M20 6 9 17l-5-5"/>',2.4),
  more:'<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>'
};
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
const lead=()=>{try{return !(typeof memberMode==="function"&&memberMode())&&S.source!=="sample"&&Array.isArray(S.roster)&&S.roster.length>0&&!(typeof role==="function"&&role()==="view")}catch(e){return false}};
const find=id=>{try{return(S.roster||[]).find(x=>x.id===id)||null}catch(e){return null}};
const initials=raw=>{raw=String(raw||"").trim();if(!raw)return"?";if(raw.includes(",")){const[l,f]=raw.split(",");return((f||"").trim().charAt(0)+l.trim().charAt(0)).toUpperCase()||"?"}const w=raw.split(/\s+/);return(w[0].charAt(0)+(w.length>1?w[w.length-1].charAt(0):"")).toUpperCase()};
const nudged=m=>!!(m&&m.nudgeAt&&Date.now()-m.nudgeAt<36e5);

function bar(row,m){
  const tel=row.querySelector('.ct a[href^="tel:"]'),sms=row.querySelector('.ct a[href^="sms:"]');
  const L=lead();let stale=false;try{stale=L&&typeof ckStale==="function"&&!!ckStale(m)}catch(e){}
  const pv=row.querySelector("[data-pvset]");
  const b=(cls,ic,label,attrs)=>`<button type="button" class="pc5-b ${cls}" ${attrs||""}>${ic}<span>${label}</span></button>`;
  const a=(cls,ic,label,href,aria)=>href?`<a class="pc5-b ${cls}" href="${esc(href)}" aria-label="${esc(aria)}">${ic}<span>${label}</span></a>`:`<span class="pc5-b ${cls} off" aria-disabled="true" aria-label="${esc(aria)} (no phone number)">${ic}<span>${label}</span></span>`;
  let h=a("kc",IC.call,"Call",tel&&tel.getAttribute("href"),"Call")+a("km",IC.msg,"Message",sms&&sms.getAttribute("href"),"Message");
  if(stale)h+=nudged(m)?`<span class="pc5-b kn done" aria-label="Nudged">${IC.ok}<span>Nudged</span></span>`:b("kn",IC.bell,"Nudge",'data-pc5="nudge"');
  else if(pv)h+=b("kv",IC.ok,"Verify",'data-pc5="verify"');
  h+=b("kx",IC.more,"More",'data-pc5="more" aria-haspopup="dialog"');
  return`<div class="pc5-bar" role="group" aria-label="Actions">${h}</div>`}

function dress(){
  const main=document.getElementById("main");if(!main)return;
  main.querySelectorAll(".m").forEach(row=>{
    if(row.classList.contains("pc5"))return;
    const card=row.querySelector("[data-pcard]"),pick=row.querySelector(":scope > .pick"),who=row.querySelector(":scope > .who");
    if(!card||!pick||!who)return;
    const m=find(card.dataset.pcard);if(!m)return;
    row.classList.add("pc5");
    const st=pick.querySelector('[data-pick="s"]');if(st&&/^\s*off hand\s*$/i.test(st.textContent))row.dataset.st="off";
    const av=document.createElement("span");av.className="pc5-av"+(row.dataset.pv==="1"?" vf":"");av.setAttribute("aria-hidden","true");
    const nm=row.querySelector(".nm");av.textContent=initials(nm?nm.textContent:m.name);
    const h=document.createElement("div");h.className="pc5-h";h.append(av,who,pick);
    row.prepend(h);row.insertAdjacentHTML("beforeend",bar(row,m));
  })}

/* ---------- More sheet ---------- */
let ACT=[],rmArm="";
function openMore(row){
  const card=row.querySelector("[data-pcard]");if(!card)return;const id=card.dataset.pcard,m=find(id);if(!m)return;
  const q=s=>row.querySelector(s),L=lead();ACT=[];rmArm="";
  const add=(label,sub,fn,tone)=>{ACT.push(fn);return`<button type="button" class="pc5-it ${tone||""}" data-pc5i="${ACT.length-1}"><b>${esc(label)}</b>${sub?`<small>${esc(sub)}</small>`:""}</button>`};
  const dp=q('[data-pick="d"]'),det=q("[data-stdet]"),pvs=q("[data-pvset]"),pvr=q("[data-pvrev]"),w6=q("[data-w6]"),rm=q("[data-rm]"),del=q("[data-pddel]");
  let h="";
  if(dp)h+=add("Duty status",(dp.textContent||"").trim(),()=>dp.click());
  if(det)h+=add("Dates and location","Add from and to dates, or a place",()=>det.click());
  if(pvs)h+=add("Verify","Vouch that it's really them",()=>pvs.click());
  if(pvr)h+=add("Revoke verification","",()=>pvr.click(),"warn");
  if(w6)h+=add("6W incident report","",()=>w6.click());
  if(rm)h+=add("Remove from roster","Tap twice to confirm",()=>{const sel='.m [data-rm="'+id+'"]';const r=document.querySelector(sel);if(!r)return;r.click();setTimeout(()=>{const x=document.querySelector(sel);if(x&&x.classList.contains("arm"))x.click()},140)},"warn rm2");
  if(del)h+=add("Delete person","Removes them for good",()=>del.click(),"warn");
  if(!h)return;
  sheetCtx={kind:"pc5"};
  $("#sheetT").innerHTML=esc((m.rank||"")+" "+String(m.name||"").split(",")[0].trim().toLowerCase().replace(/(^|\s|-)\S/g,c=>c.toUpperCase()))+`<small>More for this person</small>`;
  $("#sheetOpts").innerHTML=`<div class="pc5-sheet" data-noxl>${h}<button type="button" class="btn alt" data-sclose="1">Close</button></div>`;
  const sh=$("#sheet");sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add("open")))}

document.addEventListener("click",e=>{
  const t=e.target;if(!t.closest)return;
  const it=t.closest("[data-pc5i]");
  if(it){e.preventDefault();e.stopPropagation();const fn=ACT[+it.dataset.pc5i];const two=it.classList.contains("rm2");
    if(two&&rmArm!==it.dataset.pc5i){rmArm=it.dataset.pc5i;it.classList.add("arm");const s=it.querySelector("small");if(s)s.textContent="Tap again to remove";return}
    try{closeSheet()}catch(x){}if(fn)setTimeout(fn,140);return}
  const b=t.closest("[data-pc5]");if(!b)return;
  e.preventDefault();e.stopPropagation();
  const row=b.closest(".m"),card=row&&row.querySelector("[data-pcard]");if(!card)return;
  const k=b.dataset.pc5;
  if(k==="more")return openMore(row);
  if(k==="nudge"){if(typeof window.nudgeSheet==="function")window.nudgeSheet([card.dataset.pcard]);return}
  if(k==="verify"){const v=row.querySelector("[data-pvset]");if(v)v.click()}
},true);

/* ---------- look ---------- */
const css=document.createElement("style");css.id="pc5css";css.textContent=`
.m.pc5{display:block;padding:0;overflow:hidden;border:1px solid var(--line);border-left:1px solid var(--line);border-radius:24px;margin-bottom:14px}
.pc5-h{display:flex;align-items:center;gap:13px;padding:16px 16px 14px}
.pc5-av{position:relative;flex:none;width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:var(--surface-2);color:var(--ink);font-weight:700;font-size:16px;letter-spacing:.02em}
.pc5-av.vf::after{content:"\\2713";position:absolute;right:-3px;bottom:-3px;width:20px;height:20px;border-radius:50%;background:#1d9e75;color:#fff;font-size:11px;font-weight:800;display:grid;place-items:center;border:2px solid var(--surface)}
.pc5 .who{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.pc5 .nmrow{justify-content:flex-start}
.pc5 .nmrow>div{font-size:16px;line-height:1.25}
.pc5 .nmrow .ct,.pc5 .rm,.pc5 .kdDel,.pc5 .w6,.pc5 .det .chip,.pc5 .ndg-line,.pc5 .st24t,.pc5 .pv-line .chip,.pc5 .pick .dp{display:none!important}
.pc5 .pv-line{margin:0!important;white-space:normal!important}
.pc5 .det{white-space:normal;font-size:12.5px}
.pc5 .pick{flex:none;display:block;align-self:flex-start}
.pc5 .pick .pill:not(.dp){min-width:0;min-height:38px;padding:6px 13px;gap:8px;border:0;font-size:12.5px;font-weight:700;background:color-mix(in srgb,var(--pc,var(--muted)) 17%,transparent)}
.pc5 .pick .pill:not(.dp)::after{display:none}
.pc5[data-st="off"] .pick .pill:not(.dp){--pc:var(--warn)}
.pc5-bar{display:flex;border-top:1px solid var(--line)}
.pc5-b{flex:1;min-width:0;min-height:60px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:0;background:transparent;color:var(--s-onhand);font:600 11.5px/1 var(--body,inherit);text-decoration:none;cursor:pointer}
.pc5-b+.pc5-b{border-left:1px solid var(--line)}
.pc5-b.kn{color:var(--brass)}.pc5-b.kv{color:#1d9e75}.pc5-b.kx{color:var(--muted)}
.pc5-b.off,.pc5-b.done{opacity:.4;cursor:default}
.pc5-b:active:not(.off):not(.done){background:var(--surface-2)}
.pc5-sheet{display:flex;flex-direction:column;gap:8px}
.pc5-it{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;min-height:52px;padding:10px 16px;border:1px solid var(--line);border-radius:14px;background:var(--surface-2);color:var(--ink);text-align:left;font:inherit}
.pc5-it b{font-weight:700}.pc5-it small{color:var(--muted);font-size:12.5px}
.pc5-it.warn b{color:var(--warn)}.pc5-it.arm{border-color:var(--warn)}
`;
document.head.appendChild(css);

{let busy=0,t=0;const go=()=>{if(busy)return;busy=1;try{dress()}catch(e){}busy=0};
 const mo=new MutationObserver(()=>{clearTimeout(t);t=setTimeout(go,30)});
 const hook=()=>{const m=document.getElementById("main");if(m){mo.observe(m,{childList:true,subtree:true});go();return true}return false};
 if(!hook())document.addEventListener("DOMContentLoaded",hook)}
})();
