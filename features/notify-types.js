/* Accounted For 4.126.0: choose which alerts this phone gets, with quieter defaults.
   Settings → Alerts shows one switch per kind of alert. The choice rides on this phone's alert sign-up ("mute"), the same
   way Quiet hours does, and the notify function skips muted kinds for this phone. Urgent alerts always come through and
   can't be switched off: SOS, "need help" in a recall, urgent Word of Mouth posts, missed check-in deadlines, reported
   posts and problems, and alerts about alerts failing.
   Quieter defaults (until the person changes them): every-time section updates and bundled team changes are off, and the
   server delivers those two kinds silently (no sound, no screen wake) for phones that still get them.
   The choice belongs to this phone and never syncs to other phones. */
(()=>{
const TYPES=[
  ["word","Word of Mouth posts","New posts from your leaders.",true],
  ["checkins","Check-ins and requests","Someone checked in, or sent a leave, liberty or appointment request.",true],
  ["messages","Inbox messages","Messages sent to you, one to one or in a group.",true],
  ["chat","Talk and Team chat","Voice messages and team chat.",true],
  ["sections","Section updates","Each time a section leader sends new numbers.",false],
  ["team","Team changes","Roster, status, calendar and duty changes, bundled.",false]];
window.NTF_TYPES=TYPES.map(t=>t[0]);
if(typeof SYNC_SKIP!=="undefined"&&Array.isArray(SYNC_SKIP)&&!SYNC_SKIP.includes("ntf"))SYNC_SKIP.push("ntf");
const cur=()=>{const o=S.ntf&&typeof S.ntf==="object"?S.ntf:{};const r={};for(const [k,,,d] of TYPES)r[k]=typeof o[k]==="boolean"?o[k]:d;return r};
const muted=()=>{const c=cur();return TYPES.map(t=>t[0]).filter(k=>!c[k])};
window.ntfMuted=muted;window.ntfChoices=cur;
/* the sign-up carries the muted kinds (an empty list still says "this phone has chosen") */
if(typeof pushSub==="function"){const _ps=pushSub;
  pushSub=async function(){const s=await _ps.apply(this,arguments);
    try{if(s&&typeof s.toJSON==="function"&&!s.__nt){const o=s.toJSON.bind(s);s.toJSON=()=>Object.assign({},o(),{mute:muted()});s.__nt=1}}catch(e){}return s}}
function resign(){try{if(typeof window.taAttach==="function")window.taAttach(true)}catch(e){}
  try{S.dmSubs={};if(typeof window.dmPushAttach==="function")window.dmPushAttach()}catch(e){}}
window.ntfResign=resign;
function panel(){const c=cur();
  return `<div class="panel" id="ntfPanel"><b>🔔 Alerts on this phone</b><p class="note" style="margin:4px 0 6px">Pick what buzzes this phone. Urgent alerts always come through: SOS, someone needs help, urgent posts and missed check-in deadlines.</p>
    ${TYPES.map(([k,l,d])=>`<label class="lrow" style="margin:6px 0;cursor:pointer"><input type="checkbox" data-ntf="${k}" ${c[k]?"checked":""}><span style="flex:1;min-width:0"><span class="t" style="display:block">${esc(l)}</span><span class="s" style="display:block">${esc(d)}</span></span></label>`).join("")}
    <div class="note" id="ntfNote" role="status">${esc(summary())}</div></div>`}
function summary(){const m=muted();return m.length?"Off: "+m.map(k=>(TYPES.find(t=>t[0]===k)||[])[1]).join(", ")+".":"Every kind of alert is on."}
window.ntfPanelHtml=panel;
{const _r=render;render=function(){const r=_r.apply(this,arguments);
  try{if(view==="data"){const m=$("#main");if(m&&!m.querySelector("#ntfPanel")){const q=m.querySelector("#qhPanel");if(q)q.insertAdjacentHTML("beforebegin",panel());else m.insertAdjacentHTML("afterbegin",panel())}}}catch(e){}return r}}
document.addEventListener("change",e=>{const t=e.target;if(!t||!t.dataset||!t.dataset.ntf)return;const k=t.dataset.ntf;if(!TYPES.some(x=>x[0]===k))return;
  S.ntf=Object.assign({},cur(),{[k]:!!t.checked});save();resign();const n=$("#ntfNote");if(n)n.textContent=summary()});
/* phones signed up before this version: send the defaults once so the quieter settings take effect */
setTimeout(()=>{try{if(S.pushOn&&!S.ntfSent){S.ntfSent=1;rawSave();resign()}}catch(e){}},12000);
if(typeof SYNC_SKIP!=="undefined"&&Array.isArray(SYNC_SKIP)&&!SYNC_SKIP.includes("ntfSent"))SYNC_SKIP.push("ntfSent");
})();
