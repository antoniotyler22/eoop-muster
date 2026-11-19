/* Accounted For 4.134.0: everyone on a team can see the team's join code (setup part 56).
   The owner's phone seals the code with the team's member key and stores that copy; every phone on the team (co-leader,
   section leader, member) reads and opens it with the member key it already holds, and shows it on My page → Settings
   with a Share button. The server never sees the code. Nothing here sends a push alert. */
(()=>{
const owner=()=>typeof isOwner==="function"&&isOwner()&&!(typeof memberMode==="function"&&memberMode());
const mfeed=()=>(S.feeds||[]).find(f=>f.mk&&f.ek)||(S.me&&S.me.d&&S.me.d.feed&&S.me.d.feed.mk&&S.me.d.feed.ek&&String(S.me.pk)!=="preview"?S.me.d.feed:null);
const T=()=>{S.tcode=S.tcode&&typeof S.tcode==="object"?S.tcode:{};return S.tcode};
if(typeof SYNC_SKIP!=="undefined"&&Array.isArray(SYNC_SKIP)&&!SYNC_SKIP.includes("tcode"))SYNC_SKIP.push("tcode");
const fmt=c=>c?c.slice(0,3)+" "+c.slice(3):"";
let busy=false,sentSig="";
/* owner phone: keep the sealed copy in step with the code (and on/off) */
async function publish(){const f=typeof mainFeed==="function"?mainFeed():null,J=S.jc;
  if(busy||!owner()||!f||!f.lk||!f.ek||!J||!J.code||typeof SB!=="object")return;const sig=J.code+"|"+(J.on?1:0)+"|"+(J.at||0);if(sig===sentSig)return;busy=true;
  try{await SB.rpc("join_code_view_set",{p_feed:f.id,p_leader_key:f.lk,p_ct:await fdEnc(f.ek,{code:J.code,on:!!J.on})});sentSig=sig}catch(e){}finally{busy=false}}
/* everyone else: read it */
async function fetchCode(){if(owner()){const J=S.jc;if(J&&J.code){const t=T();if(t.code!==J.code||t.on!==!!J.on){t.code=J.code;t.on=!!J.on;t.at=Date.now();rawSave()}}return}
  const f=mfeed();if(!f||typeof SB!=="object"||busy)return;busy=true;
  try{const ct=await SB.rpc("join_code_view_get",{p_feed:f.id,p_member_key:f.mk});
    if(ct){const o=await fdDec(f.ek,ct);if(o&&typeof o.code==="string"){const t=T();t.code=o.code;t.on=o.on!==false;t.at=Date.now();t.none=false;rawSave()}}
    else{const t=T();if(t.code){t.code="";t.at=Date.now();rawSave()}}}
  catch(e){}finally{busy=false;if(typeof window.tcRedraw==="function")window.tcRedraw()}}
every(60000,()=>{try{publish();fetchCode()}catch(e){}},"team-code");setTimeout(()=>{try{publish();fetchCode()}catch(e){}},2500);
window.tcRedraw=()=>{const p=document.getElementById("tcPanel");if(p&&typeof window.tcPanelHtml==="function")p.outerHTML=window.tcPanelHtml()};
function share(c){const txt="Join "+(typeof unitName==="function"?unitName():"our team")+" on Accounted For: open the app, tap Join a team, and type the code "+c+". Get the app: "+(typeof PUB==="function"?PUB():"");
  if(navigator.share)navigator.share({title:"Join our team",text:txt}).catch(()=>{});else{try{navigator.clipboard.writeText(txt).then(()=>toast("Code and how-to copied"),()=>toast(txt))}catch(x){toast(txt)}}}
/* the card on My page → Settings */
window.tcPanelHtml=function(){const t=T(),c=owner()&&S.jc&&S.jc.code?S.jc.code:t.code,on=owner()&&S.jc&&S.jc.code?!!S.jc.on:t.on!==false;
  if(!c)return `<div class="panel" id="tcPanel"><b>Team code</b><p class="note" style="margin:2px 0 0">${owner()?"Your team's code will show here in a moment. You can also open Tools → Join code.":"Your leader hasn't shared a team code yet. Ask your leader for it."}</p></div>`;
  return `<div class="panel" id="tcPanel"><b>Team code</b><div id="tcCode" aria-label="Team code ${esc([...c].join(" "))}" style="font:800 30px/1.2 ui-monospace,Menlo,monospace;letter-spacing:.12em;text-align:center;margin:8px 0;${on?"":"opacity:.4;text-decoration:line-through"}">${esc(fmt(c))}</div>
    <p class="note" style="text-align:center;margin:0 0 8px">${on?"Give this to someone you want on the team: they tap Join a team and type it.":"The leader turned this code off."}</p>
    <button class="btn alt" id="tcShare" style="width:100%"${on?"":" disabled"}>Share</button></div>`};
document.addEventListener("click",e=>{const b=e.target&&e.target.closest&&e.target.closest("#tcShare");if(!b)return;e.stopImmediatePropagation();const t=T(),c=owner()&&S.jc&&S.jc.code?S.jc.code:t.code;if(c)share(c)},true);
})();
