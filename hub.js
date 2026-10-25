/* Accounted For — Server hub. Loaded by index.html after v12.js.
   When the OIC turns it on, Supabase does this phone's hub job every minute (section updates, leader rosters,
   company page), so the phone can be off. While the app is open on an OIC phone, the phone tells the server
   "I'm here" and the server steps aside. Needs setup part 18 + the Edge Function named hub. */
(()=>{
const HUB_FN=()=>SB.url+"/functions/v1/hub";
let st=null,stAt=0,busy=false,lastPull=0;
const owner=()=>typeof isOwner==="function"&&isOwner()&&S.board&&S.role!=="view";
const redraw=()=>{if(view==="live"){const y=window.scrollY;renderLive();window.scrollTo(0,y)}};
async function call(body){const r=await fetch(HUB_FN(),{method:"POST",headers:{apikey:SB.key,"Content-Type":"application/json"},body:JSON.stringify(body)});
  let j={};try{j=await r.json()}catch(e){}
  if(r.status===404&&!j.error)throw new Error("The hub function isn't deployed yet (DATA → System check).");
  if((r.status===401||r.status===403)&&!j.error)throw new Error("Turn off Enforce JWT verification on the hub function.");
  if(!r.ok)throw new Error(j.error||("HTTP "+r.status));return j}
async function keys(){return codeKeys(S.sync.code)}
/* "I'm here": keeps the server from running while this phone runs the hub, and reads its status. */
async function seen(){if(!S.srvHub||!S.sync||!S.sync.on||document.hidden||!owner())return;
  try{const K=await keys();const rows=await SB.rpc("hub_seen",{p_id:K.id,p_key:K.wk});st=(rows&&rows[0])||{gone:1};stAt=Date.now()}
  catch(e){st={err2:String(e.message||e).slice(0,80)};stAt=Date.now()}redraw()}
setInterval(seen,60000);document.addEventListener("visibilitychange",()=>{if(!document.hidden)seen()});setTimeout(seen,2500);
/* Coming back to the app: pick up what the server did before this phone applies anything itself. */
const _poll=livePollBoard;
livePollBoard=async function(){if(S.srvHub&&S.sync&&S.sync.on&&Date.now()-lastPull>45000){lastPull=Date.now();try{await syncPull(true)}catch(e){}}return _poll.apply(this,arguments)};
async function turnOn(){if(!S.sync||!S.sync.on){S.sync={on:true,code:newCode(),ver:0,at:0,err:"",last:""};save()}
  await syncPush(true);if(S.sync.err)throw new Error("Backup: "+S.sync.err);
  await call({op:"on",code:S.sync.code});S.srvHub=true;save();await syncPush(true);await seen()}
async function turnOff(){const K=await keys();await SB.rpc("hub_off",{p_id:K.id,p_key:K.wk});S.srvHub=false;st=null;save();syncPush(true)}
function stLine(){if(!st)return "Checking…";if(st.err2)return `<span style="color:var(--warn)">${esc(/could not find|schema/i.test(st.err2)?"Server needs setup part 18 (DATA → System check).":st.err2)}</span>`;
  if(st.gone)return `<span style="color:var(--warn)">The server lost this board. Turn it off and on again.</span>`;
  const bits=[];bits.push(st.ran_at?"last ran "+ago(Date.parse(st.ran_at)):"waiting for its first run (about a minute)");if(st.saved_at)bits.push("last change "+ago(Date.parse(st.saved_at)));
  return "Server is standing by while this phone is open · "+bits.join(" · ")+(st.err?` · <span style="color:var(--warn)">${esc(st.err)}</span>`:"")}
function srvHTML(){if(!owner())return"";
  if(!S.srvHub)return `<div class="panel" style="margin:10px 0 0"><b>☁ Server hub</b><p class="note">Let Supabase run your hub every minute so your phone can be off: section updates land on your board, leaders get their rosters, and the company page stays current. Your board's unlock key is kept on your server for this, so it's no longer end-to-end encrypted.</p><button class="btn" id="srvOn"${busy?" disabled":""}>${busy?"Turning on…":"Turn on server hub"}</button></div>`;
  return `<div class="panel" style="margin:10px 0 0"><b style="color:var(--s-onhand)">☁ Server hub on</b><div class="note">${stLine()}</div><p class="note">Your phone can be off. Open the app any time and it catches up with what the server did.</p><button class="btn alt" id="srvOff" style="width:100%"${busy?" disabled":""}>${armed==="srvoff"?"Tap again: back to this phone as the hub":"Turn off server hub"}</button></div>`}
const _hub=hubHTML;hubHTML=function(){return _hub.apply(this,arguments)+srvHTML()};
document.addEventListener("click",e=>{const id=e.target.id;
  if(id==="srvOn"){if(!owner())return denyMsg();busy=true;redraw();turnOn().then(()=>toast("Server hub on. Your phone can be off.")).catch(err=>toast("Couldn't turn on: "+String(err.message||err).slice(0,90))).finally(()=>{busy=false;redraw()});return}
  if(id==="srvOff"){if(!owner())return denyMsg();if(armed!=="srvoff"){armed="srvoff";redraw();return}armed=null;busy=true;redraw();turnOff().then(()=>toast("Server hub off. This phone is the hub again.")).catch(err=>toast("Couldn't turn off: "+String(err.message||err).slice(0,90))).finally(()=>{busy=false;redraw()});return}
  if(id==="scHub"){fetch("supabase/functions/hub/index.ts",{cache:"no-cache"}).then(r=>r.text()).then(t=>navigator.clipboard.writeText(t)).then(()=>toast("hub code copied. Paste it in Edge Functions → new function named hub, then Deploy.")).catch(()=>toast("Copy blocked here."));return}});
/* System check: optional Server hub entry. */
let ping=null,pinging=false;
function pingState(){if(!ping)return {ok:0,msg:"Checking…"};if(ping.net)return {ok:0,msg:"Couldn't reach it. Check signal."};if(ping.s===404)return {ok:0,msg:"Optional. Not set up: turn on pg_cron and pg_net (Database → Extensions), create the Edge Function named hub, run part 18."};
  if(ping.s===401||ping.s===403)return {ok:0,msg:"JWT checking is on. Open hub → Details and turn off Enforce JWT verification."};if(ping.s>=500)return {ok:0,msg:"It crashed. Usually the code was cut off when pasted."};
  if(ping.ok&&!ping.db)return {ok:0,msg:"Deployed, but part 18 hasn't been run."};if(ping.ok)return {ok:1,msg:"Ready. Turn it on in Live sections → Your hub."+(S.srvHub?" · On for this board.":"")};return {ok:0,msg:"Unexpected answer ("+ping.s+")."}}
async function doPing(){if(pinging)return;pinging=true;try{const r=await fetch(HUB_FN(),{method:"POST",headers:{apikey:SB.key,"Content-Type":"application/json"},body:JSON.stringify({ping:1})});ping={s:r.status,at:Date.now()};try{Object.assign(ping,await r.json())}catch(e){}}catch(e){ping={net:1,at:Date.now()}}pinging=false;if(view==="sys")renderSys()}
const _sys=renderSys;renderSys=function(){_sys.apply(this,arguments);const m=$("#main");if(!m||!scRes||scBusy)return;if((!ping||Date.now()-ping.at>60000)&&!pinging)doPing();
  const a=pingState();m.insertAdjacentHTML("beforeend",`<h2>Server hub · optional</h2><div class="rrow" style="--sc:var(${a.ok?"--s-onhand":"--s-duty"})"><div class="who"><b>${a.ok?"✅":"○"} Run the hub on Supabase</b><div class="ph">${esc(a.msg)}</div></div>${a.ok?"":`<div class="evts"><button data-scf="18_server_hub">Copy part 18 (SQL)</button><button id="scHub">Copy hub code</button></div>`}</div>`)};
})();
