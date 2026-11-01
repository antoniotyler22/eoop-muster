/* Accounted For 4.72.1 — Quiet hours.
   Settings → Quiet hours: pick a night window (default 2200–0600). While it is on, this phone's alerts are held back,
   except urgent ones (help, urgent Feed posts, SOS). The window rides on this phone's alert sign-up ("qh" minutes + "tz"),
   and the notify function skips non-urgent alerts for a phone whose local time is inside it. Nothing else changes. */
(function(){
  const mins=s=>{const m=/^(\d{1,2}):(\d{2})$/.exec(String(s||""));return m?Math.min(1439,(+m[1])*60+(+m[2])):0};
  const q=()=>S.quiet=S.quiet&&typeof S.quiet==="object"?S.quiet:{on:false,from:"22:00",to:"06:00"};
  const tzNow=()=>-new Date().getTimezoneOffset();
  const extra=()=>{const z=q();return z.on?{qh:[mins(z.from),mins(z.to)],tz:tzNow()}:{}};
  if(typeof pushSub==="function"){const _ps=pushSub;
    pushSub=async function(a){const s=await _ps.apply(this,arguments);
      try{if(s&&typeof s.toJSON==="function"&&!s.__qh){const o=s.toJSON.bind(s);s.toJSON=()=>Object.assign({},o(),extra());s.__qh=1}}catch(e){}return s}}
  function resign(){try{q().tz=tzNow();save()}catch(e){}
    try{if(typeof window.taAttach==="function")window.taAttach(true)}catch(e){}
    try{S.dmSubs={};if(typeof window.dmPushAttach==="function")window.dmPushAttach()}catch(e){}}
  function panel(){const z=q();
    return `<div class="panel" id="qhPanel"><b>🌙 Quiet hours</b>
      <label class="lrow" style="margin:8px 0;cursor:pointer"><input type="checkbox" id="qhOn" ${z.on?"checked":""}><span style="flex:1;min-width:0"><span class="t" style="display:block">Mute alerts at night</span><span class="s" style="display:block">Urgent alerts (help, urgent Feed posts, SOS) still come through.</span></span></label>
      <div class="row2" style="gap:10px"><label style="flex:1;font-size:13px;font-weight:700">From<input type="time" id="qhFrom" value="${esc(z.from)}" style="margin-top:4px"></label><label style="flex:1;font-size:13px;font-weight:700">To<input type="time" id="qhTo" value="${esc(z.to)}" style="margin-top:4px"></label></div>
      <div class="note" id="qhNote">${z.on?"On: "+esc(z.from)+" to "+esc(z.to)+" on this phone.":"Off."}</div></div>`}
  {const _r=render;render=function(){const r=_r.apply(this,arguments);
    try{if(view==="data"){const m=document.querySelector("#main");if(m&&!m.querySelector("#qhPanel")){const pp=m.querySelector("#ppPanel");if(pp)pp.insertAdjacentHTML("afterend",panel());else m.insertAdjacentHTML("afterbegin",panel())}}}catch(e){}return r}}
  document.addEventListener("change",e=>{const t=e.target;if(!t||!/^qh(On|From|To)$/.test(t.id||""))return;const z=q();
    if(t.id==="qhOn")z.on=!!t.checked;else if(t.id==="qhFrom"&&t.value)z.from=t.value;else if(t.id==="qhTo"&&t.value)z.to=t.value;
    save();resign();const n=document.getElementById("qhNote");if(n)n.textContent=z.on?"On: "+z.from+" to "+z.to+" on this phone.":"Off."});
  /* travelled to another time zone: tell the server the new offset */
  setTimeout(()=>{try{const z=q();if(z.on&&z.tz!==tzNow())resign()}catch(e){}},9000);
  window.qhExtra=extra;
})();
