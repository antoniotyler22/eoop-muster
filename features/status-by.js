/* Accounted For 4.123.2: every status shows who set it, the person themself or someone else.
   m.by = {w:"self"|"other", n:name, t:when, c:how}. "self" = the person checked in (My page, My check-in, a confirmed check-in
   from them); "other" = a leader changed it for them. Set by the check-in paths directly (team.js ckApply, below for the
   leader's own card); anything else that changes a status on this phone is stamped by the leader who made the change.
   A change that arrives over a sync keeps the stamp the other phone made (it rides with the person). The row and the
   person card read "✓ Self check-in · 0745" or "Set by SSgt Smith · 0745" so nobody wonders who changed it. */
(()=>{
const real=()=>S.source!=="sample"&&Array.isArray(S.roster);
const key=m=>[m.status,m.start||"",m.end||"",m.loc||"",m.detail||""].join("|");
let snap=new Map(),mute=0;
const take=()=>{snap=new Map();if(Array.isArray(S.roster))for(const m of S.roster)if(m&&m.id!=null)snap.set(m.id,key(m))};
const actor=()=>{const w=S.who&&S.who.id;const me=w&&S.roster.find(x=>x.id===w||x.uid===w);
  const n=(S.who&&S.who.n)||S.myName||(me?me.rank+" "+lastOf(me):"")||(typeof noName==="function"?noName("Leader"):"Leader");
  const r=typeof window.actorRole==="function"?String(window.actorRole()||"").slice(0,24):""; /* 4.126.0: and in what role */
  return {id:me?me.id:"",n:String(n).slice(0,30),r}};
function stamp(){if(!real()||mute)return;const a=actor(),now=Date.now();
  for(const m of S.roster){if(!m||m.id==null)continue;const k=key(m),p=snap.get(m.id);
    if(p!==undefined&&p!==k&&!(m.by&&now-(+m.by.t||0)<4000)){m.by=a.id&&a.id===m.id?{w:"self",n:a.n,t:now}:{w:"other",n:a.n,t:now};if(a.r)m.by.r=a.r}
    snap.set(m.id,k)}}
{const _save=save;save=function(){try{stamp()}catch(e){}return _save.apply(this,arguments)}}
/* A sync never undoes a newer status with an older one: another phone that still has the old copy (and only changed
   something else, like a phone number) used to send a fresh check-in back to Off Hand. Whoever set the status last wins. */
const FIELDS=["status","start","end","loc","detail","ckAt","by"];
{const _mr=mergeRemote;mergeRemote=function(){mute++;const before=new Map();
  try{for(const m of S.roster||[])if(m&&m.by&&m.id!=null)before.set(m.id,JSON.parse(JSON.stringify(Object.fromEntries(FIELDS.map(f=>[f,m[f]])))))}catch(e){}
  try{return _mr.apply(this,arguments)}
  finally{try{for(const m of S.roster||[]){const b=before.get(m.id);if(!b||!b.by)continue;if(!m.by||(+b.by.t||0)>(+m.by.t||0)){for(const f of FIELDS){if(b[f]===undefined)delete m[f];else m[f]=b[f]}}}}catch(e){}
    mute--;try{take()}catch(e){}}}}
take();
/* run something that saves without stamping the changes as made here (changes that arrive from the server) */
window.byQuiet=fn=>{mute++;try{return fn()}finally{mute--;try{take()}catch(e){}}};
const hhmm=t=>{const d=new Date(t);return String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0")};
window.byLabel=m=>{const b=m&&m.by;if(!b||!b.t)return "";
  return b.w==="self"?"✓ Self check-in · "+hhmm(b.t)+(b.c&&b.c!=="auto"?" · confirmed by "+b.c:""):"Set by "+(b.n||"a leader")+(b.r?" · "+String(b.r).slice(0,24):"")+" · "+hhmm(b.t)};
function paint(){if(!real())return;
  for(const m of S.roster){const l=window.byLabel(m);if(!l)continue;const who=document.querySelector('.m [data-pcard="'+(window.CSS&&CSS.escape?CSS.escape(m.id):m.id)+'"]');if(!who)continue;
    const row=who.closest(".m");if(!row||row.querySelector(".by-t"))continue;
    who.insertAdjacentHTML("afterend",`<div class="note by-t" style="margin:1px 0 0;font-size:11px;${m.by.w==="self"?"color:var(--s-onhand)":""}">${esc(l)}</div>`)}}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{paint();paintCard()}catch(e){}return r}}
function paintCard(){if(view!=="p"||typeof pid==="undefined")return;const m=S.roster.find(x=>x.id===pid);const l=window.byLabel(m);const main=$("#main");if(!l||!main||main.querySelector(".by-c"))return;
  const pick=main.querySelector(".pick");const host=pick&&pick.parentElement;if(host)host.insertAdjacentHTML("afterbegin",`<div class="note by-c" style="margin:0 0 6px">${esc(l)}</div>`)}
})();
