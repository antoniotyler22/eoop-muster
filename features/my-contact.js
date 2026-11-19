/* Accounted For 4.129.0: My contact. Add your own email and phone so you get matched to your roster spot.
   Where: My page → Settings (the Settings circle) → "My contact", for every role. Also pre-fills Ask to join.
   - You type your email and phone. They're checked (name@example.com, 10-digit phone) and kept on this phone.
   - The OIC's phone writes them straight onto the OIC's own roster spot, so Apple/Google sign-in and text check-ins find them.
   - Everyone else taps "Match me": a verified email (you signed in with Google or Apple and it's the same address) joins
     your roster spot at once; otherwise the email and phone are sent, sealed, to your leader as a "Contact update" and the
     leader taps "Match & save". Nothing typed by hand is trusted on its own: only the leader or a verified sign-in can match.
   - A phone with no team yet is sent to Join a team, with the email and phone already filled in.
   Uses the Ask to join channel (setup parts 52 and 53); no new setup part. */
(()=>{
const ph10=v=>{const d=String(v||"").replace(/\D/g,"");return d.length===10?d:(d.length===11&&d[0]==="1"?d.slice(1):"")};
window.mcPhone=ph10;
const MC=()=>{S.mc=S.mc&&typeof S.mc==="object"?S.mc:{};return S.mc};
if(typeof SYNC_SKIP!=="undefined"&&Array.isArray(SYNC_SKIP)&&!SYNC_SKIP.includes("mc"))SYNC_SKIP.push("mc");
const owner=()=>typeof isOwner==="function"&&isOwner()&&!(typeof memberMode==="function"&&memberMode());
const real=()=>S.source!=="sample"&&Array.isArray(S.roster)&&S.roster.length>0;
const feed=()=>{try{return(typeof mainFeed==="function"&&mainFeed())||(S.feeds||[])[0]||null}catch(e){return null}};
const ownRow=()=>{const R=S.roster||[];const id=S.who&&S.who.id;return id?R.find(m=>m.id===id||m.uid===id)||null:null};
/* the signed-in account's email, and whether the provider confirmed it */
function authInfo(){try{const u=window.AUTH&&AUTH.s&&AUTH.s.user;if(!u||!u.email)return null;
  const prov=(u.app_metadata&&u.app_metadata.provider)||"";return {email:String(u.email).toLowerCase(),ok:!!(u.email_confirmed_at||u.confirmed_at||(prov&&prov!=="email"))}}catch(e){return null}}
let busy=false,msg="",draft=null;
const NOFN=/could not find|schema cache|PGRST202|404|not taking requests/i;
const why=e=>/not taking requests/i.test(String(e&&e.message||e))?"Your leader hasn't turned on Ask to join yet. Tell them your email and phone, or ask for the join code.":NOFN.test(String(e&&e.message||e))?"Your server needs setup part 53 (Settings → System check).":String(e&&e.message||e).slice(0,90);

function state(){const M=MC(),o=ownRow(),A=authInfo();
  const email=draft?draft.email:(M.email||(owner()&&o&&o.email)||""),phone=draft?draft.phone:(M.phone||(owner()&&o&&o.phone?String(o.phone):""));
  const em=typeof normEmail==="function"?normEmail(email):email;
  const verified=!!(A&&A.ok&&em&&A.email===em);
  const pend=typeof window.afContactPending==="function"?window.afContactPending():null;
  return {M,o,A,email,phone,em,verified,pend,matched:!!(M.matchedAt)}}

function chip(txt,good){return `<span class="chip" style="${good?"color:var(--s-onhand);font-weight:700":""}">${txt}</span>`}
function mcHtml(){const s=state(),f=feed();
  let status="";
  if(s.pend)status=`<div class="banner" id="mcPend" style="margin:8px 0"><span>⏳ <b>Waiting for ${esc(s.pend.name)}</b> to match your email and phone. You'll see the answer when you open the app.</span><button data-mccheck="1" type="button">Check now</button></div>`;
  else if(s.matched)status=`<p class="note" id="mcDone" style="color:var(--s-onhand);font-weight:700;margin:8px 0">✓ Matched to your roster spot${MC().matchedBy?" by "+esc(MC().matchedBy):""}.</p>`;
  const prov=typeof SB==="object"&&(SB.apple||SB.google);
  return `<div class="panel" id="mcPanel"><b>My contact</b>
    <p class="note" style="margin:2px 0 8px">Add your email and phone so you get matched to your spot on the team's roster. Your leader sees them; nobody else does.</p>
    <label for="mcEmail">Email</label><input id="mcEmail" type="text" inputmode="email" autocapitalize="none" autocomplete="email" spellcheck="false" placeholder="name@example.com" value="${esc(s.email)}">
    <div class="note" style="margin:2px 0 8px">${s.em?(s.verified?chip("✓ Verified by your sign-in",1):chip("Not verified yet")):""}</div>
    <label for="mcPhone">Phone</label><input id="mcPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="808-555-0100" value="${esc(s.phone?(typeof fmtPh==="function"?fmtPh(ph10(s.phone)||s.phone):s.phone):"")}">
    ${s.em&&!s.verified&&prov&&!owner()?`<p class="note" style="margin:8px 0 4px">Sign in with the same email to verify it and match instantly:</p><div class="row2">${SB.apple?`<button class="btn alt" id="mcApple" type="button">Sign in with Apple</button>`:""}${SB.google?`<button class="btn alt" id="mcGoogle" type="button">Sign in with Google</button>`:""}</div>`:""}
    <button class="btn" id="mcMatch" type="button" style="width:100%;margin-top:10px"${busy?" disabled":""}>${owner()?"Save to my roster spot":(f||!real()?"Match me":"Find my team")}</button>
    <button class="btn alt" id="mcSave" type="button" style="width:100%;margin-top:6px"${busy?" disabled":""}>Save only</button>
    ${status}<p class="note" id="mcOut" role="status">${esc(msg)}</p></div>`}
window.mcPanelHtml=mcHtml;
function redraw(){const p=document.getElementById("mcPanel");if(p)p.outerHTML=mcHtml()}
window.mcRedraw=()=>{draft=null;redraw()};
const say=t=>{msg=t;const o=document.getElementById("mcOut");if(o)o.textContent=t};
const val=id=>String((document.getElementById(id)||{}).value||"").trim();
/* read and check the two fields. Returns {email,phone} or null after saying what's wrong */
function read(){const e0=val("mcEmail"),p0=val("mcPhone");
  const email=e0?(typeof normEmail==="function"?normEmail(e0):e0):"";
  if(e0&&!email){say("That email isn't valid. Use name@example.com or leave it blank.");return null}
  const phone=p0?ph10(p0):"";if(p0&&!phone){say("That phone number isn't valid. Use 10 digits, like 808-555-0100.");return null}
  if(!email&&!phone){say("Add an email or a phone number first.");return null}
  draft={email,phone};return {email,phone}}
function keep(d){const M=MC();if(d.email)M.email=d.email;if(d.phone)M.phone=d.phone;M.at=Date.now();draft=null;save()}

async function match(){if(busy)return;const d=read();if(!d)return;keep(d);busy=true;redraw();
  try{
    /* the OIC's phone: straight onto their own roster spot */
    if(owner()){const o=ownRow();
      if(!o){say("Pick who you are on the roster first (Who are you?), then add your contact.");return}
      if(d.email)o.email=d.email;if(d.phone)o.phone=d.phone;MC().matchedAt=Date.now();MC().matchedBy="your roster spot";save();
      try{if(typeof window.afEmailsPub==="function")window.afEmailsPub(true)}catch(e){}
      say("Saved to your roster spot. Apple/Google sign-in and text check-ins can find you now.");return}
    /* a verified email: join the roster spot that carries it, no one to approve */
    const A=authInfo();
    if(d.email&&A&&A.ok&&A.email===d.email&&typeof window.afClaim==="function"){
      try{const r=await window.afClaim();if(r&&r.n){const M=MC();M.matchedAt=Date.now();M.matchedBy="your verified email";save();view="feed";render();toast("Found you on "+((r.f&&r.f.unit)||"your team")+"'s roster. You're in.");return}}catch(e){}}
    const f=feed();
    if(!f){view="askjoin";render();toast("Find your team and ask to join. Your email and phone are filled in.");return}
    const r=await window.afSendContact(f,d);
    say("Sent to "+r.name+". Your leader taps Match & save, and you'll see the answer here.")}
  catch(e){say(why(e))}
  finally{busy=false;redraw()}}

document.addEventListener("click",e=>{const t=e.target;if(!t||!t.closest)return;const c=s=>t.closest(s);
  if(c("#mcMatch")){e.stopImmediatePropagation();match();return}
  if(c("#mcSave")){e.stopImmediatePropagation();const d=read();if(!d)return;keep(d);
    if(owner()){const o=ownRow();if(o){if(d.email)o.email=d.email;if(d.phone)o.phone=d.phone;save();try{if(typeof window.afEmailsPub==="function")window.afEmailsPub(true)}catch(x){}}}
    say("Saved on this phone.");redraw();return}
  if(c("#mcApple")||c("#mcGoogle")){e.stopImmediatePropagation();const d=read();if(!d)return;keep(d);if(typeof window.afOauth==="function")window.afOauth(c("#mcApple")?"apple":"google");return}
  if(c("[data-mccheck]")){e.stopImmediatePropagation();Promise.resolve(typeof window.afCheckReqs==="function"?window.afCheckReqs():null).then(()=>{say(window.afContactPending&&window.afContactPending()?"Still waiting.":"");redraw()});return}},true);
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.target.id==="mcEmail"||e.target.id==="mcPhone")){e.preventDefault();match()}});
if(typeof SC==="object"&&Array.isArray(SC))SC.push({k:"mycontact",n:"4.129: My contact matches you to your roster spot",f:["53_join"],t:[["team_dir_get",{p_feed:"zz"}]]});
})();
