/* Accounted For 1.3 — Integrations.
   1. Slack / Microsoft Teams / Discord: paste an incoming-webhook link once; post the numbers there with one tap
      (or automatically each time you send them). Goes through the "relay" Edge Function (chat services block
      direct posts from browsers).
   2. Calendar: export the next 6 months (leave, TAD, appointments, duty, events, due-outs) as an .ics file that
      Google Calendar, Outlook and Apple Calendar import.
   3. Text everyone the check-in link from the server (Pro, "sms" Edge Function + Twilio) instead of one by one. */
(()=>{
const HOOK=/^https:\/\/(hooks\.slack\.com\/services\/|[a-z0-9-]+\.webhook\.office\.com\/|[a-z0-9-]+\.logic\.azure\.com(:443)?\/workflows\/|prod-[0-9]+\.[a-z0-9-]+\.logic\.azure\.com(:443)?\/|discord(app)?\.com\/api\/webhooks\/)/i;
const kind=u=>/slack/i.test(u)?"Slack":/discord/i.test(u)?"Discord":"Teams";
const fn=n=>SB.url+"/functions/v1/"+n;
async function post(name,b){const r=await fetch(fn(name),{method:"POST",headers:{apikey:SB.key,"Content-Type":"application/json"},body:JSON.stringify(b)});
  const t=await r.text();let j={};try{j=t?JSON.parse(t):{}}catch(e){}if(!r.ok)throw new Error(j.error||("HTTP "+r.status));return j}

/* ---------- chat webhooks ---------- */
async function postNumbers(quiet){const I=S.integ||{};if(!I.hook)return;
  try{await post("relay",{url:I.hook,text:reportText()});I.last=Date.now();I.err="";save();if(!quiet)toast("Posted to "+kind(I.hook))}
  catch(e){I.err=String(e.message||e).slice(0,80);save();if(!quiet)toast("Couldn't post: "+I.err)}}
window.postNumbers=postNumbers;
/* auto-post when the numbers are sent from the "Send the numbers" screen */
document.addEventListener("click",e=>{if(!e.target.closest("#sms,#copy,#share,#markSent"))return;const I=S.integ||{};if(I.hook&&I.auto)setTimeout(()=>postNumbers(true),300)},true);

/* ---------- calendar (.ics) ---------- */
function ics(){const from=dkey(),to=dkey(new Date(Date.now()+183*864e5));const ents=calEntries(from,to,"ALL");
  const esc_=t=>String(t||"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n");
  const d8=d=>d.replace(/-/g,"");const nextDay=d=>{const x=new Date(d+"T12:00:00");x.setDate(x.getDate()+1);return dkey(x)};
  const stamp=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d+/,"");
  const fold=l=>{let o="";while(l.length>74){o+=l.slice(0,74)+"\r\n ";l=l.slice(74)}return o+l};
  const L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Accounted For//Calendar//EN","CALSCALE:GREGORIAN","X-WR-CALNAME:"+esc_(unitName()+" calendar")];
  let n=0;
  for(const e of ents){const who=e.m?((e.m.rank?e.m.rank+" ":"")+e.m.name):"";const sum=(who?who+": ":"")+e.ti;
    const uid=(e.id||[e.d,e.ty,e.ti,who].join("|")).replace(/[^\w|.-]/g,"")+"-"+(n++)+"@accountedfor";
    L.push("BEGIN:VEVENT","UID:"+uid,"DTSTAMP:"+stamp);
    const tm=String(e.tm||"").replace(":","");
    if(/^\d{4}$/.test(tm)&&(!e.end||e.end===e.d)){const st=d8(e.d)+"T"+tm+"00";const h=(+tm.slice(0,2)+1)%24;L.push("DTSTART:"+st,"DTEND:"+d8(e.d)+"T"+String(h).padStart(2,"0")+tm.slice(2)+"00")}
    else L.push("DTSTART;VALUE=DATE:"+d8(e.d),"DTEND;VALUE=DATE:"+d8(nextDay(e.end||e.d)));
    L.push("SUMMARY:"+esc_(sum.slice(0,200)));if(e.no)L.push("DESCRIPTION:"+esc_(String(e.no).slice(0,500)));if(e.grp)L.push("CATEGORIES:"+esc_(e.grp));
    L.push("END:VEVENT")}
  L.push("END:VCALENDAR");return {text:L.map(fold).join("\r\n")+"\r\n",n}}
window.icsExport=ics;
function saveICS(){const {text,n}=ics();if(!n){toast("Nothing on the calendar in the next 6 months.");return}
  const name=(unitName()+" calendar").replace(/[^\w -]+/g,"")+".ics";const u=URL.createObjectURL(new Blob([text],{type:"text/calendar"}));
  const a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);toast(n+" calendar items exported")}

/* ---------- Integrations screen ---------- */
function integHTML(){const I=S.integ||{};
  return `<h2>Integrations</h2>
  <div class="panel"><b>Slack, Teams or Discord</b>
    <p class="note">Post the numbers to a channel. In Slack: Apps → Incoming Webhooks. In Teams: the channel's ⋯ → Workflows → "Post to a channel when a webhook request is received". Paste the link it gives you.</p>
    <input type="url" id="intHook" placeholder="https://hooks.slack.com/services/…" value="${esc(I.hook||"")}" autocomplete="off">
    <label class="tog"><input type="checkbox" id="intAuto"${I.auto?" checked":""}> Also post automatically whenever I send the numbers</label>
    <div class="row2"><button class="btn alt" id="intSave">Save link</button><button class="btn" id="intPost"${I.hook?"":" disabled"}>Post the numbers now</button></div>
    ${I.err?`<p class="note" style="color:var(--warn)">Last try: ${esc(I.err)}</p>`:I.last?`<p class="note">Last posted ${esc(ago(I.last))}.</p>`:""}
    <p class="note">The report goes to that channel exactly as it reads on the Send screen${S.names?", including names":""}. Only use channels your organization approves.</p></div>
  <div class="panel"><b>Google, Outlook or Apple Calendar</b>
    <p class="note">Exports the next 6 months (leave, TAD, appointments, duty, events, due-outs) as one file your calendar app imports.</p>
    <button class="btn alt" id="intIcs">⬇ Export calendar (.ics)</button></div>`}
const _rtools=renderTools;
renderTools=function(){_rtools.apply(this,arguments);const g=$$all("#main .tgrid");const last=g[g.length-1];
  if(last&&!$("[data-go='integ']"))last.insertAdjacentHTML("beforeend",`<button data-go="integ"><span class="ic">${svg("send")}</span><span><b>Integrations</b><small>${S.integ&&S.integ.hook?kind(S.integ.hook)+" connected":"Slack, Teams, calendar"}</small></span></button>`)};
function $$all(s){return [...document.querySelectorAll(s)]}
const _render=render;
render=function(){if(view==="integ"){if(typeof renderTabs==="function")try{renderTabs()}catch(e){}$("#main").innerHTML=`<button class="btn alt" data-go="tools" style="margin:8px 0">‹ Tools</button>`+integHTML();return}return _render.apply(this,arguments)};
document.addEventListener("click",e=>{const t=e.target;
  if(t.id==="intSave"){const v=(($("#intHook")||{}).value||"").trim();if(v&&!HOOK.test(v)){toast("That isn't a Slack, Teams or Discord webhook link.");return}
    S.integ=Object.assign({},S.integ||{},{hook:v,err:""});save();render();toast(v?kind(v)+" link saved":"Link removed");return}
  if(t.id==="intPost"){postNumbers(false).then(()=>{if(view==="integ")render()});return}
  if(t.id==="intIcs"){saveICS();return}});
document.addEventListener("change",e=>{if(e.target.id==="intAuto"){S.integ=Object.assign({},S.integ||{},{auto:e.target.checked});save()}});

/* ---------- text everyone from the server (Pro) ---------- */
async function smsAll(){const pool=recallPool().filter(m=>m.phone&&!(S.rc.ci||{})[m.id]);if(!pool.length){toast("No one left to text.");return}
  const tok=typeof proTok==="function"?proTok():"";if(!tok){toast("Texting from the server is part of Pro.");return}
  const L=S.rc.live||{};if(!L.ok||!L.key){toast("Turn on live check-ins first.");return}
  try{const r=await post("sms",{pro:tok,to:pool.map(m=>m.phone),recall:ciRid(),key:L.key,link:ciLink()});S.rc.smsAt=Date.now();S.rc.sent=S.rc.sent||{};pool.forEach(m=>S.rc.sent[m.id]=1);save();toast(`Texted ${r.sent} of ${pool.length}`+(r.failed?` · ${r.failed} failed`:""));render()}
  catch(e){toast(String(e.message||e).slice(0,90))}}
const _rr=renderRecall;
renderRecall=function(){_rr.apply(this,arguments);if(!S.rc.open||!S.rc.live||!S.smsSrv)return;const at=$("#main .rp-panel")||$("#main .mbar");
  if(at)at.insertAdjacentHTML("afterend",`<div class="panel"><button class="btn" data-sms-all>📨 Text the check-in link to everyone not checked in</button><p class="note">Sent from the server (Pro). Numbers are passed to the text service for delivery and not kept.${S.rc.smsAt?" Last sent "+esc(ago(S.rc.smsAt))+".":""}</p></div>`)};
document.addEventListener("click",e=>{if(e.target.closest("[data-sms-all]")){e.preventDefault();const b=e.target.closest("[data-sms-all]");b.disabled=true;smsAll().finally(()=>{b.disabled=false})}});
/* Show the server-texting button only once the sms function answers (it needs Twilio set up). */
setTimeout(()=>{if(!(typeof proTok==="function"&&proTok()))return;fetch(fn("sms"),{method:"POST",headers:{apikey:SB.key,"Content-Type":"application/json"},body:'{"ping":1}'}).then(r=>r.ok?r.json():null).then(j=>{const on=!!(j&&j.ready);if(on!==!!S.smsSrv){S.smsSrv=on;save()}}).catch(()=>{})},4000);
})();
