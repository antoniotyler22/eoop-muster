/* Accounted For 1.3 — Pro checked on the server.
   iPhone: after a purchase/restore (and on each launch) the app sends Apple's signed transaction to the "pro" function,
   which checks Apple's signature and returns a team token. Ask and the server hub send that token; the server only
   serves them to active Pro teams. The leader's phone links each FEED it runs, so members can use Ask too.
   Web: a Stripe subscription gives the same kind of token (features stay unlocked until SB.webBilling is turned on).
   Android: stays unlocked until Google Play billing is added. Needs setup part 20 + the "pro" Edge Function. */
(()=>{
const KTOK="af-pro-tok";
const fn=n=>SB.url+"/functions/v1/"+n;
const getTok=()=>{try{return localStorage.getItem(KTOK)||""}catch(e){return ""}};
const setTok=v=>{try{v?localStorage.setItem(KTOK,v):localStorage.removeItem(KTOK)}catch(e){}};
const isIOS=()=>!!(window.MBN&&MBN.on&&MBN.platform==="ios");
const isWeb=()=>!(window.MBN&&MBN.on);
const webBilling=()=>!!(window.SB&&SB.webBilling);
async function call(name,b){const r=await fetch(fn(name),{method:"POST",headers:{apikey:SB.key,"Content-Type":"application/json"},body:JSON.stringify(b)});
  const t=await r.text();let j={};try{j=t?JSON.parse(t):{}}catch(e){}if(!r.ok)throw new Error(j.error||("HTTP "+r.status));return j}
window.proTok=getTok;
window.proCall=call;

/* ---- send the team token with Ask and server-hub requests ---- */
const _fetch=window.fetch;
window.fetch=function(u,init){
  try{const s=String(u&&u.url||u);
    if(init&&typeof init.body==="string"&&(s.endsWith("/functions/v1/"+SB.afn)||s.endsWith("/functions/v1/hub"))){
      const tok=getTok();if(tok){const b=JSON.parse(init.body);if(b&&typeof b==="object"&&!b.pro&&!b.ping){b.pro=tok;init=Object.assign({},init,{body:JSON.stringify(b)})}}}}catch(e){}
  return _fetch.call(window,u,init)};

/* ---- iPhone: Apple purchase -> server record ---- */
let lastJws="",syncing=false;
async function syncApple(force){const N=window.MBN;if(!isIOS()||!N.pro||!N.pro.active||!N.pro.jws||syncing)return;
  if(!force&&N.pro.jws===lastJws&&getTok())return;syncing=true;
  try{const r=await call("pro",{op:"apple",jws:N.pro.jws});if(r.tok){setTok(r.tok);lastJws=N.pro.jws;S.proSrv={on:!!r.active,exp:r.exp||0,at:Date.now(),src:"apple"};save();linkFeeds()}}
  catch(e){S.proSrv=Object.assign({},S.proSrv||{},{err:String(e.message||e).slice(0,140),at:Date.now()});save()}
  finally{syncing=false}}
/* Leader: let members of each FEED this phone runs use Ask under this Pro. */
async function linkFeeds(){const tok=getTok();if(!tok||!Array.isArray(S.feeds))return;S.proLinked=S.proLinked||{};let n=0;
  for(const f of S.feeds.filter(f=>f.lk&&f.id&&!S.proLinked[f.id])){try{await SB.rpc("pro_link_feed",{p_tok:tok,p_feed:f.id,p_lk:f.lk});S.proLinked[f.id]=Date.now();n++}catch(e){}}
  if(n)save()}
/* Any device holding a token (web, or a Pro code typed in): refresh its status now and then. */
async function refresh(){const tok=getTok();if(!tok)return;
  try{const r=await call("pro",{op:"status",tok});S.proSrv=Object.assign({},S.proSrv||{},{on:!!r.active,exp:r.exp||0,at:Date.now(),src:r.source||(S.proSrv&&S.proSrv.src)||"",err:""});save();if(r.active)linkFeeds()}catch(e){}}
window.__proSyncNow=()=>{syncApple(true);refresh()};

const _changed=window.__proChanged;
window.__proChanged=function(){try{syncApple(false)}catch(e){}return _changed&&_changed.apply(this,arguments)};
setTimeout(()=>{syncApple(false);if(!S.proSrv||Date.now()-(S.proSrv.at||0)>6*36e5)refresh();else linkFeeds()},3000);
setInterval(()=>refresh(),6*36e5);

/* ---- who counts as Pro on this device ---- */
const _ok=proOK;
proOK=function(){
  if(isIOS())return _ok.apply(this,arguments);
  if(S&&S.role==="view")return true;
  if(!isWeb()||!webBilling())return true; /* Android, and the web until web billing is on */
  const w=S.proSrv;return !!(getTok()&&w&&w.on&&(!w.exp||w.exp>Date.now()-864e5))};

/* ---- Pro page: server status line on iPhone; Stripe + Pro code on the web ---- */
const _page=proPageHTML;
const codeHTML=()=>{const tok=getTok();return tok?`<details class="note" style="margin-top:10px"><summary>Your Pro code</summary><p>Use it to turn on Pro in a web browser. Keep it private: anyone with it gets your team's Pro.</p><input type="text" readonly value="${esc(tok)}" onclick="this.select()" style="font-family:ui-monospace,monospace;font-size:12px"></details>`:""};
proPageHTML=function(){
  if(isIOS()){let h=_page.apply(this,arguments);const s=S.proSrv;
    if(window.MBN.pro&&MBN.pro.active){const line=s&&s.err?`<p class="note" style="color:var(--warn)">Server check: ${esc(s.err)} <button class="btn alt" data-pro-sync>Try again</button></p>`:s&&s.on?`<p class="note">✓ Server knows your team has Pro (Ask and the server hub work).</p>`:`<p class="note">Telling the server about your Pro… <button class="btn alt" data-pro-sync>Check now</button></p>`;
      h=h.replace(/<\/div>\s*$/,line+codeHTML()+"</div>")}
    return h}
  let h=`<div class="panel pro-wall"><span class="pro-badge">PRO</span><h2 style="margin:0">Accounted For Pro</h2>`;
  const s=S.proSrv;
  if(!isWeb())return h+`<p class="note">Everything is unlocked in the Android app for now.</p></div>`;
  if(s&&s.on&&getTok()){const e=s.exp?new Date(s.exp).toLocaleDateString():"";
    return h+`<p><b style="color:var(--s-onhand)">● Pro is on.</b>${e?` Renews or ends ${esc(e)}.`:""}</p>${proList()}${s.src==="stripe"?`<button class="btn alt" data-pro-portal>Manage subscription</button>`:`<p class="note">Billed through the App Store. Manage it on the iPhone that bought it.</p>`}${codeHTML()}</div>`}
  if(!webBilling())h+=`<p class="note">Everything is unlocked here for now.</p>`;
  else h+=`<p class="note">For the person running the team. Members and section leaders stay free.</p>${proList()}
    <button class="btn pro-plan" data-pro-web="yearly">Pro yearly</button><button class="btn alt pro-plan" data-pro-web="monthly">Pro monthly</button>
    <p class="note">Secure checkout by Stripe. Cancel any time.</p>`;
  h+=`<details class="note" style="margin-top:12px"><summary>Already have Pro (iPhone or another browser)?</summary>
    <label for="proCode">Pro code</label><input type="text" id="proCode" placeholder="Paste your Pro code" autocomplete="off" style="font-family:ui-monospace,monospace">
    <button class="btn alt" data-pro-code>Use this code</button></details>`;
  if(proWebMsg)h+=`<p class="note" style="color:var(--warn)">${esc(proWebMsg)}</p>`;
  return h+"</div>"};
let proWebMsg="";
const redraw=()=>{if($(".pro-wall"))$("#main").innerHTML=proPageHTML()};
document.addEventListener("click",async e=>{
  if(e.target.closest("[data-pro-sync]")){e.preventDefault();await syncApple(true);redraw();return}
  const w=e.target.closest("[data-pro-web]");
  if(w){e.preventDefault();w.disabled=true;proWebMsg="";
    try{const r=await call("billing",{op:"checkout",plan:w.dataset.proWeb,back:PUB()});if(r.url)location.href=r.url;else throw new Error("No checkout link")}
    catch(err){proWebMsg=String(err.message||err);redraw()}return}
  if(e.target.closest("[data-pro-portal]")){e.preventDefault();try{const r=await call("billing",{op:"portal",tok:getTok(),back:PUB()});if(r.url)location.href=r.url}catch(err){proWebMsg=String(err.message||err);redraw()}return}
  if(e.target.closest("[data-pro-code]")){e.preventDefault();const v=(($("#proCode")||{}).value||"").trim().toLowerCase();
    if(!/^[0-9a-f]{64}$/.test(v)){proWebMsg="That doesn't look like a Pro code.";redraw();return}
    try{const r=await call("pro",{op:"status",tok:v});if(!r.active){proWebMsg="That code isn't active Pro.";redraw();return}
      setTok(v);S.proSrv={on:true,exp:r.exp||0,at:Date.now(),src:r.source||""};save();proWebMsg="";toast("Pro is on");render()}
    catch(err){proWebMsg=String(err.message||err);redraw()}return}
});

/* ---- back from Stripe checkout: #pro_ok=<session> ---- */
{const m=(location.hash||"").match(/pro_ok=(cs_[A-Za-z0-9_]+)/);
  if(m){try{history.replaceState(null,"",location.pathname+"#tools")}catch(e){}
    call("billing",{op:"claim",session:m[1]}).then(r=>{if(r.tok){setTok(r.tok);S.proSrv={on:!!r.active,exp:r.exp||0,at:Date.now(),src:"stripe"};save();toast("Pro is on. Thank you!");render();linkFeeds()}})
      .catch(err=>toast("Couldn't confirm the payment yet: "+String(err.message||err).slice(0,80)))}}

if(typeof SC==="object"&&Array.isArray(SC))SC.push({k:"pro",n:"1.3: Pro on the server",f:["20_pro"],t:[["pro_check",{p_tok:"x"}]]});
})();
