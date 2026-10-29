/* Accounted For: who hasn't checked in today — for every leader phone, co-leaders included.
   Check-ins screen gets a "Today" panel: N of M checked in, then everyone who hasn't, by section, with a Call
   button and "Text them a reminder" (group texts, batched). People away (Leave, TAD, etc. with dates covering today)
   aren't expected and are listed apart. Home shows a one-line "N not checked in today" that opens it.
   Checked in today = their check-in was confirmed today (ckAt), or one is waiting to confirm from today.
   Works on any phone with the board: the OIC, co-leaders, editors and viewers (synced) and section leaders (their
   section only). Members never see it. */
(()=>{
const today=()=>dkey();
const dayOf=t=>t?dkey(new Date(t)):"";
const leader=()=>!(typeof memberMode==="function"&&memberMode())&&S.source!=="sample"&&Array.isArray(S.roster)&&S.roster.length>0;
function pool(){const L=S.link;let R=S.roster.filter(m=>m.sec!=="ATT");if(L&&L.mysec&&!L.whole&&!S.board)R=R.filter(m=>m.sec===L.mysec);return R}
function away(m){if(!AWAY.includes(m.status))return false;const s=isoOf(m.start)||"",e=isoOf(m.end)||"",d=today();return (!s||s<=d)&&(!e||e>=d)}
function state(){const d=today();const pend=new Set((S.cks||[]).filter(x=>x.mid&&dayOf(x.t)===d).map(x=>x.mid));
  const done=[],miss=[],out=[];for(const m of pool()){if(dayOf(m.ckAt)===d||pend.has(m.id)||pend.has(m.uid))done.push(m);else if(away(m))out.push(m);else miss.push(m)}
  return {done,miss:sorted(miss),out:sorted(out),of:done.length+miss.length}}
window.ckMissing=state;
function panel(){const {done,miss,out,of}=state();const all=of>0&&!miss.length;
  let h=`<div class="panel" id="ckMiss" style="border-color:var(${all?"--s-onhand":"--warn"})"><div style="display:flex;justify-content:space-between;align-items:baseline"><b>Today · ${done.length} of ${of} checked in</b><span class="note" style="margin:0">${esc(fmtD(today()))}</span></div>`;
  if(all)h+=`<p class="note" style="margin:4px 0 0;color:var(--s-onhand);font-weight:700">✓ Everyone expected today has checked in.</p>`;
  else{h+=`<div class="note" style="margin:6px 0 2px"><b style="color:var(--warn)">Haven't checked in (${miss.length})</b></div><div class="alist">`;
    const secs=[...new Set(miss.map(m=>m.sec))];
    for(const s of secs){h+=`<div class="cm-sec">${esc(s)}</div>`;
      for(const m of miss.filter(x=>x.sec===s))h+=`<div class="cm-row"><span class="cm-dot"></span><div class="cm-who" data-pcard="${esc(m.id)}"><b>${esc(m.rank)} ${esc(lastOf(m))}</b><span>${m.pk?"Has My page":"Not on the app yet"}${m.ckAt?" · last "+esc(ago(m.ckAt)):""}</span></div>${m.phone?`<a class="chip cm-call" href="${telHref(m.phone)}">📞 Call</a>`:""}</div>`}
    h+=`</div>`;const B=bcBatches(miss,unitName()+": you haven't checked in today. Open Accounted For → My page → 📍 Check in.");
    h+=B.length?B.map((x,i,a)=>`<a class="btn" href="${esc(x.href)}" style="margin-top:8px">📨 Text them a reminder${a.length>1?" · group "+(i+1):""} (${x.n})</a>`).join(""):"";
    const np=miss.filter(m=>!m.phone).length;if(np)h+=`<p class="note" style="margin:4px 0 0">${np} without a phone number.</p>`}
  if(out.length)h+=`<details style="margin-top:8px"><summary class="note">Away today, not expected (${out.length})</summary><div class="note">${out.map(m=>esc(m.rank+" "+lastOf(m)+" · "+(SHORT[m.status]||m.status))).join(" · ")}</div></details>`;
  if(done.length)h+=`<details style="margin-top:4px"><summary class="note">Checked in (${done.length})</summary><div class="note">${done.map(m=>esc(m.rank+" "+lastOf(m)+" · "+(SHORT[m.status]||m.status))).join(" · ")}</div></details>`;
  return h+`</div>`}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{
  if(!leader())return r;const m=$("#main");if(!m)return r;
  if(view==="checkins"&&!$("#ckMiss")){const hd=m.querySelector(".sechead");if(hd)hd.insertAdjacentHTML("afterend",panel());else m.insertAdjacentHTML("afterbegin",panel())}
  if(view==="board"&&!$("#ckMissHome")){const {miss,of}=state();if(of&&(S.feeds||[]).length){const ck=$("#myCk");
    const line=`<button class="chip" id="ckMissHome" data-go="checkins" style="cursor:pointer;margin:8px 0 0;${miss.length?"color:var(--warn)":""}">${miss.length?"📍 "+miss.length+" not checked in today":"✓ Everyone checked in today"}</button>`;
    if(ck)ck.insertAdjacentHTML("beforebegin",line);else{const g=m.querySelector(".greet,.hero");if(g)g.insertAdjacentHTML("afterend",line)}}}}catch(e){}return r}}
{const st=document.createElement("style");st.textContent=`#ckMiss .alist{display:block}.cm-sec{font-size:12px;font-weight:800;letter-spacing:.06em;color:var(--muted,#667);margin:10px 0 2px}
.cm-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--line)}.cm-sec+.cm-row{border-top:0}
.cm-dot{flex:none;width:8px;height:8px;border-radius:50%;background:var(--warn)}.cm-who{flex:1;min-width:0;cursor:pointer}.cm-who b{display:block}.cm-who span{display:block;font-size:12.5px;opacity:.75}
.cm-call{flex:none;text-decoration:none;color:var(--ink);cursor:pointer}`;document.head.appendChild(st)}
})();
