/* Accounted For 4.131.0: members change their own rank (military and police versions) or Mr / Ms / Mrs / Mx (all other versions).
   Where: My page → Settings → "My rank" (military) or "How the app addresses me" (civilian), for every role.
   - Military: pick the new rank. This phone uses it at once (greetings, "Welcome, Sergeant Tyler"). The OIC's phone writes it straight
     onto their own roster spot. Everyone else sends it, sealed, to the leader as a rank update; the leader taps "Match & save" in
     Requests and the roster rank changes. Only the leader or an editor changes the roster, so nobody can rank themselves up for others.
   - Civilian: pick Mr., Ms., Mrs. or Mx. (or "By role"). It is how the app addresses you on your own phone. */
(()=>{
const mil=()=>!S.mode||S.mode==="military"||S.mode==="police";
const ranks=()=>typeof RANKS!=="undefined"&&Array.isArray(RANKS)?RANKS:[];
const owner=()=>typeof isOwner==="function"&&isOwner()&&!(typeof memberMode==="function"&&memberMode());
const ownRow=()=>{const R=S.roster||[];const id=S.who&&S.who.id;return id?R.find(m=>m.id===id||m.uid===id)||null:null};
const feed=()=>{try{return(typeof mainFeed==="function"&&mainFeed())||(S.feeds||[])[0]||null}catch(e){return null}};
const cur=()=>{const o=ownRow();return (S.me&&S.me.d&&S.me.d.rank)||(o&&o.rank)||""};
let msg="";
function html(){
  if(!mil()){const T=["Mr","Ms","Mrs","Mx"];
    return `<div class="panel" id="rkPanel"><b>How the app addresses me</b><p class="note" style="margin:2px 0 8px">Pick how the app greets you, like "Good morning, Ms. Reyes".</p>
      <div class="evts" role="group" aria-label="How the app addresses me">${[["","By role"],...T.map(t=>[t,t+"."])].map(([v,l])=>`<button type="button" data-gtitle="${v}" aria-pressed="${(S.title||"")===v}">${l}</button>`).join("")}</div></div>`}
  const c=cur(),L=c&&!ranks().includes(c)?[c].concat(ranks()):ranks();if(!L.length)return "";
  return `<div class="panel" id="rkPanel"><b>My rank</b><p class="note" style="margin:2px 0 8px">Promoted or changed? Pick your new rank. ${owner()?"It saves to your roster spot.":"Your leader gets it and taps Match &amp; save."}</p>
    <label for="rkMine">Rank</label><select id="rkMine" class="wsel" aria-label="My rank">${c?"":`<option value="">Pick your rank</option>`}${L.map(r=>`<option${r===c?" selected":""}>${esc(r)}</option>`).join("")}</select>
    <p class="note" id="rkOut" role="status" style="margin:6px 0 0">${esc(msg)}</p></div>`}
window.rkPanelHtml=html;
const say=t=>{msg=t;const o=document.getElementById("rkOut");if(o)o.textContent=t};
document.addEventListener("change",async e=>{const s=e.target&&e.target.closest&&e.target.closest("#rkMine");if(!s)return;e.stopImmediatePropagation();
  const nu=s.value,old=cur();if(!nu||nu===old)return;
  if(S.me&&S.me.d)S.me.d.rank=nu;
  const o=ownRow();
  if(owner()&&o){o.rank=nu;save();try{if(S.board&&typeof rpPublish==="function")rpPublish(true)}catch(x){}say("Saved: "+nu+". Your roster spot is updated.");toast("Rank updated to "+nu);try{render()}catch(x){}return}
  save();
  const f=feed();
  if(!f||typeof window.afSendContact!=="function"){say("Saved on this phone: "+nu+". Tell your leader to update your roster rank.");try{render()}catch(x){}return}
  try{say("Sending to your leader…");const r=await window.afSendContact(f,{rank:nu,rankChange:1});say("Saved here. Sent to "+r.name+": they tap Match & save to update the roster.");toast("Rank sent to your leader")}
  catch(x){say("Saved on this phone: "+nu+". Couldn't reach your leader ("+String(x&&x.message||x).slice(0,60)+"). Tell them to update your roster rank.")}
  try{render()}catch(x){}},true);
})();
