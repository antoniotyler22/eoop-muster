/* Accounted For 4.60: Scan anything.
   Tools → Scan. Pick what the photo should become, then take the photo:
   - Roster update: names and statuses from a muster sheet or whiteboard; you check every row, only ticked rows change.
   - HARP form: a new HARP form filled in from a paper one; you check it and sign in the app.
   - Document (PDF): one or more pages, cleaned up to look scanned, made into a PDF on this phone to share, save to
     Files or email. Nothing leaves the phone for this one.
   - Text: the words in the photo, typed out, to edit, copy, share/email or save as a PDF.
   Roster, HARP and Text send the photo to the AI once to read it (the same service as Ask); it isn't kept. */
(()=>{
let st={phase:"choose",kind:"",rows:[],err:"",pages:[],text:"",title:"",clean:true,pdf:null};
const leader=()=>typeof canEdit==="function"?canEdit():!(typeof memberMode==="function"&&memberMode());
const KINDS=[["roster","👥","Roster update","Names and statuses from a muster sheet or whiteboard",true],["harp","📝","HARP form","A paper HARP form becomes a HARP form in the app",false],
  ["doc","📄","Document (PDF)","Any paper, one or more pages, as a PDF to save or email",false],["text","🔤","Text","The words typed out, to copy, email or save",false]];
function mapStatus(s){s=String(s||"").trim().toLowerCase();if(!s)return "";
  for(const x of STATUSES)if(x.toLowerCase()===s||String(SHORT[x]||"").toLowerCase()===s)return x;
  if(/^(p|oh|present|here|on hand|✓|x)$/.test(s))return "On Hand";if(/leave|^lv$|^l$/.test(s))return "Leave";if(/tad|travel/.test(s))return "TAD";if(/siq|sick/.test(s))return "SIQ";if(/appt|appoint|medical|dental/.test(s))return "Appointment";if(/duty rec/.test(s))return "Duty Recovery";if(/duty|co dut/.test(s))return "Company Duties";if(/pt/.test(s))return "At PT";if(/op/.test(s))return "Operation";
  return STATUSES.includes("Other")?"Other":""}
/* ---------- images ---------- */
function loadImg(file){return new Promise((res,rej)=>{const url=URL.createObjectURL(file);const im=new Image();im.onload=()=>{res({im,url})};im.onerror=()=>{URL.revokeObjectURL(url);rej(new Error("That photo couldn't be opened."))};im.src=url})}
/* downscale; "scan look" = grayscale + stronger contrast so paper goes white and ink goes dark */
async function prep(file,max,look){const {im,url}=await loadImg(file);const k=Math.min(1,max/Math.max(im.width,im.height));const c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
  const g=c.getContext("2d");g.drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(url);
  if(look){const d=g.getImageData(0,0,c.width,c.height),p=d.data;for(let i=0;i<p.length;i+=4){let y=.299*p[i]+.587*p[i+1]+.114*p[i+2];y=(y-128)*1.45+150;y=y>235?255:y<0?0:y;p[i]=p[i+1]=p[i+2]=y}g.putImageData(d,0,0)}
  return {url:c.toDataURL("image/jpeg",look?.78:.82),w:c.width,h:c.height}}
/* ---------- PDF from JPEG pages (letter size, image fit with a margin) ---------- */
function b64bytes(u){const s=atob(u.split(",")[1]);const a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a}
function makePdf(pages,title){const enc=new TextEncoder();const parts=[];let len=0;const off=[];const push=x=>{const b=typeof x==="string"?enc.encode(x):x;parts.push(b);len+=b.length};
  const n=pages.length;const obj=i=>{off[i]=len};
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  obj(1);push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  obj(2);push(`2 0 obj\n<< /Type /Pages /Count ${n} /Kids [${pages.map((_,i)=>(3+i*3)+" 0 R").join(" ")}] >>\nendobj\n`);
  pages.forEach((pg,i)=>{const P=3+i*3,C=P+1,I=P+2;const W=612,H=792,M=24;const s=Math.min((W-2*M)/pg.w,(H-2*M)/pg.h);const dw=pg.w*s,dh=pg.h*s,x=(W-dw)/2,y=(H-dh)/2;
    obj(P);push(`${P} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im${i} ${I} 0 R >> >> /Contents ${C} 0 R >>\nendobj\n`);
    const cs=`q ${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im${i} Do Q`;obj(C);push(`${C} 0 obj\n<< /Length ${cs.length} >>\nstream\n${cs}\nendstream\nendobj\n`);
    const jb=b64bytes(pg.url);obj(I);push(`${I} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pg.w} /Height ${pg.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jb.length} >>\nstream\n`);push(jb);push("\nendstream\nendobj\n")});
  const total=3+n*3;const info=total;obj(info);push(`${info} 0 obj\n<< /Title (${String(title||"Scan").replace(/[()\\]/g,"").slice(0,80)}) /Producer (Accounted For) >>\nendobj\n`);
  const xref=len;let x=`xref\n0 ${total+1}\n0000000000 65535 f \n`;for(let i=1;i<=total;i++)x+=String(off[i]||0).padStart(10,"0")+" 00000 n \n";
  push(x+`trailer\n<< /Size ${total+1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF`);
  const out=new Uint8Array(len);let o=0;for(const p of parts){out.set(p,o);o+=p.length}return out}
/* text → letter pages drawn on a canvas, then the same PDF writer */
function textPages(title,text){const W=1224,H=1584,M=110,lh=38;const pages=[];let c,g,y;
  const page=()=>{c=document.createElement("canvas");c.width=W;c.height=H;g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,W,H);g.fillStyle="#111";y=M;pages.push(c)};page();
  g.font="bold 40px Helvetica, Arial, sans-serif";g.fillText(title||"Scan",M,y+30);y+=80;g.font="28px Helvetica, Arial, sans-serif";
  for(const para of String(text||"").split("\n")){const words=para.split(/(\s+)/);let line="";
    const flush=()=>{if(y>H-M){page();g.font="28px Helvetica, Arial, sans-serif"}g.fillText(line,M,y+28);y+=lh;line=""};
    for(const w of words){const t=line+w;if(g.measureText(t).width>W-2*M&&line){flush();line=w.trimStart()}else line=t}flush()}
  return pages.map(cv=>({url:cv.toDataURL("image/jpeg",.85),w:W,h:H}))}
async function sharePdf(bytes,name){const file=new File([bytes],name.replace(/[^\w .-]/g,"").slice(0,60)+".pdf",{type:"application/pdf"});
  if(navigator.canShare&&navigator.canShare({files:[file]})&&navigator.share){try{await navigator.share({files:[file],title:name});return "shared"}catch(e){if(e&&e.name==="AbortError")return "cancel"}}
  const a=document.createElement("a");a.href=URL.createObjectURL(file);a.download=file.name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000);return "saved"}
/* ---------- the AI read ---------- */
async function readAI(file,kind){if(!SB.afn)throw new Error("Scanning needs the Ask function on the server (Tools → Settings → System check).");
  const p=await prep(file,1800,false);const r=await fetch(SB.url+"/functions/v1/"+SB.afn,{method:"POST",headers:{apikey:SB.key,"Content-Type":"application/json"},body:JSON.stringify({scan:1,kind,img:p.url,statuses:STATUSES,dev:(S.dev=S.dev||rndId(24))})});
  const o=await r.json().catch(()=>({}));if(!r.ok||o.error)throw new Error(o.error||"Couldn't read the photo. Try again.");return o}
async function onPhoto(files){const kind=st.kind;const list=[...files];if(!list.length)return;
  if(kind==="doc"){st.err="";for(const f of list){try{st.pages.push(await prep(f,1700,st.clean))}catch(e){st.err=e.message}}st.pdf=null;draw();return}
  st.phase="reading";draw();
  try{const o=await readAI(list[0],kind);
    if(kind==="roster")return review(o.rows||[]);
    if(kind==="harp"){if(typeof window.harpFromScan!=="function")throw new Error("The HARP form isn't available.");st={phase:"choose",kind:"",rows:[],err:"",pages:[],text:"",title:"",clean:true,pdf:null};window.harpFromScan(o);toast("📝 HARP form filled from the photo. Check every field, then sign.");return}
    if(kind==="text"){st.phase="text";st.text=String(o.text||"");st.title=String(o.title||"Scanned text");if(!st.text.trim()){st.phase="capture";st.err="No words could be read. Get closer and try again."}draw();return}}
  catch(e){st.phase="capture";st.err=e.message||String(e);draw()}}
function review(list){const rows=(list||[]).map(x=>{const m=typeof matchMarine==="function"?matchMarine((x.rank?x.rank+" ":"")+x.name):null;const s=mapStatus(x.status);
    return {t:((x.rank?x.rank+" ":"")+x.name).trim(),raw:x.status||"",note:x.note||"",id:m?m.id:"",st:s,on:!!(m&&s&&s!==m.status)}});
  if(!rows.length){st.phase="capture";st.kind="roster";st.err="No names could be read. Get closer, keep it flat and in good light, and try again.";draw();return}
  st.phase="review";st.kind="roster";st.rows=rows;st.err="";draw()}
window.rosterScanReview=review;window.rosterScanMap=mapStatus;window.scanMakePdf=makePdf;
/* ---------- screens ---------- */
const stOpts=sel=>`<option value="">— No change —</option>`+STATUSES.map(s=>`<option value="${esc(s)}"${s===sel?" selected":""}>${esc(SHORT[s]||s)}</option>`).join("");
const back=`<button class="chip" id="scBack" style="cursor:pointer">‹ Back</button>`;
const stamp=()=>{const d=new Date();return "Scan "+d.getDate()+" "+["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]+" "+String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0")};
function html(){const head=t=>`<div class="sechead" style="margin-top:12px"><h2>📷 ${t}</h2>${st.phase!=="choose"?back:""}</div>`;
  if(st.phase==="choose")return head("Scan")+`<p class="note" style="margin:2px 0 10px">What should the photo become?</p><div class="sc-kinds">${KINDS.filter(k=>!k[4]||leader()).map(([k,ic,t,s])=>`<button type="button" class="sc-k" data-sck="${k}"><span class="sc-ic">${ic}</span><span><b>${esc(t)}</b><small>${esc(s)}</small></span></button>`).join("")}</div>
    <p class="note" style="margin-top:10px">Document (PDF) stays on this phone. Roster, HARP and Text send the photo once to the AI to read it; it isn't kept.</p>`;
  const K=KINDS.find(k=>k[0]===st.kind)||KINDS[0];
  if(st.phase==="reading")return head(K[2])+`<div class="panel" style="text-align:center;padding:28px 16px"><div class="rs-spin"></div><p style="font-weight:700;margin:12px 0 0">Reading the photo…</p><p class="note">This takes a few seconds.</p></div>`;
  if(st.phase==="review"){const n=st.rows.filter(r=>r.on&&r.id&&r.st).length;
    return head("Roster update")+`<div class="panel"><b>${st.rows.length} names read</b><p class="note" style="margin:2px 0 8px">Check each row. Only ticked rows change. Names it couldn't match start unticked: pick the person to tick them.</p>
      <div class="alist">${st.rows.map((r,i)=>{const m=S.roster.find(x=>x.id===r.id);return `<div class="rrow rs-row" style="--sc:${r.id?"var(--s-onhand)":"var(--warn)"}">
        <label class="tog" style="margin:0"><input type="checkbox" data-rson="${i}"${r.on?" checked":""}> <b>${esc(r.t)}</b>${r.raw?` <span class="note" style="margin:0">wrote “${esc(r.raw)}”</span>`:""}</label>
        <select class="wsel" data-rsid="${i}" aria-label="Who is row ${i+1}">${typeof rvOpts==="function"?rvOpts(r.id):""}</select>
        <div style="display:flex;gap:8px;align-items:center"><select class="wsel" data-rsst="${i}" aria-label="Status for row ${i+1}" style="flex:1">${stOpts(r.st)}</select>${m?`<span class="note" style="margin:0;white-space:nowrap">now ${esc(SHORT[m.status]||m.status)}</span>`:""}</div>
        ${r.note?`<div class="note" style="margin:0">${esc(r.note)}</div>`:""}</div>`}).join("")}</div>
      <button class="btn" id="rsApply" style="width:100%;margin-top:10px"${n?"":" disabled"}>Apply ${n} change${n===1?"":"s"}</button></div>`}
  if(st.phase==="text")return head("Text")+`<div class="panel"><label for="scTitle">Title</label><input type="text" id="scTitle" maxlength="80" value="${esc(st.title)}">
    <label for="scText">Text (edit anything it got wrong)</label><textarea id="scText" style="min-height:240px">${esc(st.text)}</textarea>
    <div class="row2" style="margin-top:8px"><button class="btn" id="scCopy">Copy</button><button class="btn alt" id="scShareT">Share / email</button></div>
    <button class="btn alt" id="scTextPdf" style="width:100%;margin-top:6px">📄 Save as PDF</button></div>`;
  /* capture (roster / harp / text: one photo; doc: pages) */
  let h=head(K[2]);
  if(st.kind==="doc"){h+=`<div class="panel"><div class="sc-pages">${st.pages.map((p,i)=>`<div class="sc-pg"><img src="${p.url}" alt="Page ${i+1}"><button type="button" class="chip" data-scdel="${i}" aria-label="Remove page ${i+1}">✕</button><span>${i+1}</span></div>`).join("")}
      <label class="sc-add">＋<small>${st.pages.length?"Add page":"Take or choose photos"}</small><input type="file" id="scFile" accept="image/*" capture="environment" multiple hidden></label></div>
      <label class="tog" style="margin-top:8px"><input type="checkbox" id="scClean"${st.clean?" checked":""}> Make it look scanned (black and white, clean paper)</label>
      ${st.pages.length?`<label for="scName">File name</label><input type="text" id="scName" maxlength="60" value="${esc(st.title||stamp())}">
      <button class="btn" id="scPdf" style="width:100%;margin-top:8px">📄 Make PDF · share, save or email</button>`:""}
      ${st.err?`<p class="note" style="color:var(--warn);font-weight:700">${esc(st.err)}</p>`:""}
      <p class="note">Share opens your phone's menu: Save to Files, Mail, Messages, AirDrop. The PDF is made on this phone; nothing is uploaded.</p></div>`;return h}
  return h+`<div class="panel"><p style="margin:0 0 8px">${st.kind==="roster"?"Take a photo of a muster sheet or whiteboard. You check every row before anything changes.":st.kind==="harp"?"Take a photo of a filled-in paper HARP form. It opens as a HARP form in the app for you to check and sign.":"Take a photo of any page, note or whiteboard. You get the words to edit, copy, email or save."}</p>
    <label class="btn" style="display:block;text-align:center;cursor:pointer">📷 Take or choose a photo<input type="file" id="scFile" accept="image/*" capture="environment" hidden></label>
    ${st.err?`<p class="note" style="color:var(--warn);font-weight:700">${esc(st.err)}</p>`:""}<p class="note">Tips: lay it flat, fill the frame, good light. The photo is sent to the AI once to read it and isn't kept.</p></div>`}
function draw(){const m=$("#main");if(m&&view==="scan")m.innerHTML=html()}
window.scanOpen=kind=>{st={phase:kind?"capture":"choose",kind:kind||"",rows:[],err:"",pages:[],text:"",title:"",clean:true,pdf:null};view="scan";render();window.scrollTo(0,0)};
{const _r=render;render=function(){if(view==="scan"){renderTabs();draw();if(typeof animateView==="function")animateView();return}return _r.apply(this,arguments)}}
{const _rt=renderTools;renderTools=function(){const r=_rt.apply(this,arguments);try{const m=$("#main"),g=m&&m.querySelector(".tgrid");if(g&&!m.querySelector('[data-go="scan"]'))
  g.insertAdjacentHTML("beforeend",`<button data-go="scan"><span class="ic">${svg("text")}</span><span><b>Scan</b><small>Roster, HARP form, PDF or text from a photo</small></span></button>`)}catch(e){}return r}}
document.addEventListener("change",e=>{const t=e.target;if(view!=="scan")return;
  if(t.id==="scFile"&&t.files&&t.files.length){onPhoto(t.files);return}
  if(t.id==="scClean"){st.clean=t.checked;return}
  if(t.dataset.rson!=null){st.rows[+t.dataset.rson].on=t.checked;draw();return}
  if(t.dataset.rsid!=null){const r=st.rows[+t.dataset.rsid];r.id=t.value;const m=S.roster.find(x=>x.id===r.id);r.on=!!(m&&r.st&&r.st!==m.status);draw();return}
  if(t.dataset.rsst!=null){const r=st.rows[+t.dataset.rsst];r.st=t.value;const m=S.roster.find(x=>x.id===r.id);r.on=!!(m&&r.st&&r.st!==m.status);draw();return}});
document.addEventListener("input",e=>{if(e.target.id==="scText")st.text=e.target.value;if(e.target.id==="scTitle")st.title=e.target.value;if(e.target.id==="scName")st.title=e.target.value});
document.addEventListener("click",e=>{const t=e.target;if(!t.closest||view!=="scan")return;
  const k=t.closest("[data-sck]");if(k){st={phase:"capture",kind:k.dataset.sck,rows:[],err:"",pages:[],text:"",title:"",clean:true,pdf:null};draw();return}
  if(t.closest("#scBack")){st={phase:"choose",kind:"",rows:[],err:"",pages:[],text:"",title:"",clean:true,pdf:null};draw();return}
  const d=t.closest("[data-scdel]");if(d){st.pages.splice(+d.dataset.scdel,1);draw();return}
  if(t.closest("#scPdf")){const name=(($("#scName")||{}).value||stamp()).trim()||stamp();const b=makePdf(st.pages,name);sharePdf(b,name).then(r=>{if(r!=="cancel")toast(r==="shared"?"📄 PDF ready":"📄 PDF saved to Downloads")});return}
  if(t.closest("#scCopy")){const v=($("#scText")||{}).value||"";(navigator.clipboard?navigator.clipboard.writeText(v):Promise.reject()).then(()=>toast("Copied")).catch(()=>{const ta=$("#scText");if(ta){ta.select();try{document.execCommand("copy");toast("Copied")}catch(_){}}});return}
  if(t.closest("#scShareT")){const v=($("#scText")||{}).value||"",ti=($("#scTitle")||{}).value||"Scanned text";
    if(navigator.share)navigator.share({title:ti,text:v}).catch(()=>{});else location.href="mailto:?subject="+encodeURIComponent(ti)+"&body="+encodeURIComponent(v.slice(0,1800));return}
  if(t.closest("#scTextPdf")){const v=($("#scText")||{}).value||"",ti=($("#scTitle")||{}).value||"Scanned text";sharePdf(makePdf(textPages(ti,v),ti),ti).then(r=>{if(r!=="cancel")toast(r==="shared"?"📄 PDF ready":"📄 PDF saved to Downloads")});return}
  if(t.closest("#rsApply")){let n=0;for(const r of st.rows){if(!r.on||!r.id||!r.st)continue;const m=S.roster.find(x=>x.id===r.id);if(!m)continue;
      if(m.status!==r.st){delete m.start;delete m.end;delete m.loc;delete m.detail}m.status=r.st;delete m.noAuto;if(r.st!=="On Hand"&&r.note)m.detail=r.note.slice(0,80);S.secAt=S.secAt||{};S.secAt[m.sec]=Date.now();n++}
    try{actAdd("📷","Paper roster scan: "+n+" status"+(n===1?"":"es")+" updated","board")}catch(e){}
    save();st={phase:"choose",kind:"",rows:[],err:"",pages:[],text:"",title:"",clean:true,pdf:null};view="board";render();window.scrollTo(0,0);toast("📷 "+n+" status"+(n===1?"":"es")+" updated");return}});
const css=document.createElement("style");css.textContent=`.rs-row{display:flex;flex-direction:column;gap:6px;align-items:stretch}.rs-spin{width:36px;height:36px;border-radius:50%;border:4px solid var(--line);border-top-color:var(--s-onhand);margin:0 auto;animation:rsSp .8s linear infinite}@keyframes rsSp{to{transform:rotate(360deg)}}
.sc-kinds{display:grid;gap:8px}.sc-k{display:flex;gap:12px;align-items:center;text-align:left;border:1px solid var(--line);background:var(--surface);border-radius:18px;padding:14px;font:inherit;color:var(--ink);cursor:pointer}
.sc-k b{display:block;font-size:16px}.sc-k small{display:block;color:var(--muted);font-size:13px;margin-top:2px}.sc-ic{width:46px;height:46px;border-radius:14px;background:var(--surface-2);display:grid;place-items:center;font-size:24px;flex:0 0 46px}
.sc-pages{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.sc-pg{position:relative;aspect-ratio:3/4;border-radius:10px;overflow:hidden;border:1px solid var(--line);background:#fff}.sc-pg img{width:100%;height:100%;object-fit:cover}
.sc-pg .chip{position:absolute;top:4px;right:4px;padding:2px 7px}.sc-pg span{position:absolute;left:6px;bottom:4px;font-size:12px;font-weight:800;background:rgba(0,0,0,.55);color:#fff;border-radius:6px;padding:1px 6px}
.sc-add{aspect-ratio:3/4;border:2px dashed var(--line);border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:28px;color:var(--muted);cursor:pointer;text-align:center}.sc-add small{font-size:12px;font-weight:700;margin-top:4px;padding:0 6px}
@media (prefers-reduced-motion:reduce){.rs-spin{animation:none}}`;document.head.appendChild(css);
})();
