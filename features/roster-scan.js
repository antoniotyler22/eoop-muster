/* Accounted For 4.59: snap the paper roster.
   Tools → People → Scan a paper roster. Take a photo of a muster sheet or whiteboard. The photo goes to the AI once
   (through the Ask function; not stored), it sends back each name and status it can read, and you check every row
   before anything changes: who it is (matched to your roster), the status, and a tick. Apply changes only the ticked
   rows. Unclear names start unticked. */
(()=>{
let st={phase:"pick",rows:[],err:"",img:""};
const can=()=>typeof canEdit==="function"?canEdit():!(typeof memberMode==="function"&&memberMode());
function mapStatus(s){s=String(s||"").trim().toLowerCase();if(!s)return "";
  for(const x of STATUSES)if(x.toLowerCase()===s||String(SHORT[x]||"").toLowerCase()===s)return x;
  if(/^(p|oh|present|here|on hand|✓|x)$/.test(s))return "On Hand";if(/leave|^lv$|^l$/.test(s))return "Leave";if(/tad|travel/.test(s))return "TAD";if(/siq|sick/.test(s))return "SIQ";if(/appt|appoint|medical|dental/.test(s))return "Appointment";if(/duty rec/.test(s))return "Duty Recovery";if(/duty|co dut/.test(s))return "Company Duties";if(/pt/.test(s))return "At PT";if(/op/.test(s))return "Operation";
  return STATUSES.includes("Other")?"Other":""}
function shrink(file){return new Promise((res,rej)=>{const url=URL.createObjectURL(file);const im=new Image();im.onload=()=>{const k=Math.min(1,1800/Math.max(im.width,im.height));const c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
  c.getContext("2d").drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(url);res(c.toDataURL("image/jpeg",.82))};im.onerror=()=>{URL.revokeObjectURL(url);rej(new Error("That photo couldn't be opened."))};im.src=url})}
async function read(file){st={phase:"reading",rows:[],err:"",img:""};draw();
  try{if(!SB.afn)throw new Error("Roster scan needs the Ask function on the server (Tools → Settings → System check).");
    const img=await shrink(file);st.img=img;
    const r=await fetch(SB.url+"/functions/v1/"+SB.afn,{method:"POST",headers:{apikey:SB.key,"Content-Type":"application/json"},body:JSON.stringify({scan:1,img,statuses:STATUSES,dev:(S.dev=S.dev||rndId(24))})});
    const o=await r.json().catch(()=>({}));if(!r.ok||o.error)throw new Error(o.error||"Couldn't read the photo. Try again.");
    review(o.rows||[],img)}
  catch(e){st={phase:"pick",rows:[],err:e.message||String(e),img:""};draw()}}
function review(list,img){
    const rows=(list||[]).map(x=>{const m=typeof matchMarine==="function"?matchMarine((x.rank?x.rank+" ":"")+x.name):null;const s=mapStatus(x.status);
      return {t:((x.rank?x.rank+" ":"")+x.name).trim(),raw:x.status||"",note:x.note||"",id:m?m.id:"",st:s,on:!!(m&&s&&s!==m.status)}});
    if(!rows.length){st={phase:"pick",rows:[],err:"No names could be read. Get closer, keep it flat and in good light, and try again.",img:""};draw();return}
    st={phase:"review",rows,err:"",img:img||""};draw()}
window.rosterScanReview=review;
function stOpts(sel){return `<option value="">— No change —</option>`+STATUSES.map(s=>`<option value="${esc(s)}"${s===sel?" selected":""}>${esc(SHORT[s]||s)}</option>`).join("")}
function html(){let h=`<div class="sechead" style="margin-top:12px"><h2>📷 Scan a paper roster</h2></div>`;
  if(!can())return h+`<p class="note">Only leaders who can change the roster can use this.</p>`;
  if(st.phase==="reading")return h+`<div class="panel" style="text-align:center;padding:28px 16px"><div class="rs-spin"></div><p style="font-weight:700;margin:12px 0 0">Reading the names…</p><p class="note">This takes a few seconds.</p></div>`;
  if(st.phase==="review"){const n=st.rows.filter(r=>r.on&&r.id&&r.st).length;
    return h+`<div class="panel"><b>${st.rows.length} names read</b><p class="note" style="margin:2px 0 8px">Check each row. Only ticked rows change. Names it couldn't match start unticked: pick the person to tick them.</p>
      <div class="alist">${st.rows.map((r,i)=>{const m=S.roster.find(x=>x.id===r.id);return `<div class="rrow rs-row" style="--sc:${r.id?"var(--s-onhand)":"var(--warn)"}">
        <label class="tog" style="margin:0"><input type="checkbox" data-rson="${i}"${r.on?" checked":""}> <b>${esc(r.t)}</b>${r.raw?` <span class="note" style="margin:0">wrote “${esc(r.raw)}”</span>`:""}</label>
        <select class="wsel" data-rsid="${i}" aria-label="Who is row ${i+1}">${typeof rvOpts==="function"?rvOpts(r.id):""}</select>
        <div style="display:flex;gap:8px;align-items:center"><select class="wsel" data-rsst="${i}" aria-label="Status for row ${i+1}" style="flex:1">${stOpts(r.st)}</select>${m?`<span class="note" style="margin:0;white-space:nowrap">now ${esc(SHORT[m.status]||m.status)}</span>`:""}</div>
        ${r.note?`<div class="note" style="margin:0">${esc(r.note)}</div>`:""}</div>`}).join("")}</div>
      <button class="btn" id="rsApply" style="width:100%;margin-top:10px"${n?"":" disabled"}>Apply ${n} change${n===1?"":"s"}</button><button class="btn alt" id="rsAgain" style="width:100%;margin-top:6px">Scan another photo</button></div>`}
  return h+`<div class="panel"><p style="margin:0 0 8px">Take a photo of a paper muster sheet or a whiteboard. The app reads the names and statuses, then you check every row before anything changes.</p>
    <label class="btn" style="display:block;text-align:center;cursor:pointer">📷 Take or choose a photo<input type="file" id="rsFile" accept="image/*" capture="environment" hidden></label>
    ${st.err?`<p class="note" style="color:var(--warn);font-weight:700">${esc(st.err)}</p>`:""}
    <p class="note">Tips: lay it flat, fill the frame, good light. The photo is sent to the AI once to read it and isn't kept.</p></div>`}
function draw(){const m=$("#main");if(m&&view==="scan"){m.innerHTML=html()}}
{const _r=render;render=function(){if(view==="scan"){renderTabs();draw();if(typeof animateView==="function")animateView();return}return _r.apply(this,arguments)}}
{const _rt=renderTools;renderTools=function(){const r=_rt.apply(this,arguments);try{const m=$("#main"),g=m&&m.querySelector(".tgrid");if(g&&can()&&!m.querySelector('[data-go="scan"]'))
  g.insertAdjacentHTML("beforeend",`<button data-go="scan"><span class="ic">${svg("people")}</span><span><b>Scan a paper roster</b><small>Photo of a muster sheet fills in statuses</small></span></button>`)}catch(e){}return r}}
document.addEventListener("change",e=>{const t=e.target;if(t.id==="rsFile"&&t.files&&t.files[0]){read(t.files[0]);return}
  if(t.dataset.rson!=null){st.rows[+t.dataset.rson].on=t.checked;draw();return}
  if(t.dataset.rsid!=null){const r=st.rows[+t.dataset.rsid];r.id=t.value;const m=S.roster.find(x=>x.id===r.id);r.on=!!(m&&r.st&&r.st!==m.status);draw();return}
  if(t.dataset.rsst!=null){const r=st.rows[+t.dataset.rsst];r.st=t.value;const m=S.roster.find(x=>x.id===r.id);r.on=!!(m&&r.st&&r.st!==m.status);draw();return}});
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;
  if(t.closest("#rsAgain")){st={phase:"pick",rows:[],err:"",img:""};draw();return}
  if(t.closest("#rsApply")){let n=0;for(const r of st.rows){if(!r.on||!r.id||!r.st)continue;const m=S.roster.find(x=>x.id===r.id);if(!m)continue;
      if(m.status!==r.st){delete m.start;delete m.end;delete m.loc;delete m.detail}m.status=r.st;delete m.noAuto;if(r.st!=="On Hand"&&r.note)m.detail=r.note.slice(0,80);S.secAt=S.secAt||{};S.secAt[m.sec]=Date.now();n++}
    try{actAdd("📷","Paper roster scan: "+n+" status"+(n===1?"":"es")+" updated","board")}catch(e){}
    save();st={phase:"pick",rows:[],err:"",img:""};view="board";render();window.scrollTo(0,0);toast("📷 "+n+" status"+(n===1?"":"es")+" updated");return}});
const css=document.createElement("style");css.textContent=`.rs-row{display:flex;flex-direction:column;gap:6px;align-items:stretch}.rs-spin{width:36px;height:36px;border-radius:50%;border:4px solid var(--line);border-top-color:var(--s-onhand);margin:0 auto;animation:rsSp .8s linear infinite}@keyframes rsSp{to{transform:rotate(360deg)}}`;document.head.appendChild(css);
window.rosterScanMap=mapStatus;
})();
