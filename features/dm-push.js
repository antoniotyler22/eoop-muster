/* Accounted For 4.70.7 — phone alerts for Inbox messages. Every phone that can read a private thread signs up for it
   (leader = "L", the person on their My page = "M"). When a message is sent, v12.js dmSend asks the notify function to
   buzz the other side. Needs supabase/setup/40_dm_push.sql and the new notify function; without them this quietly
   does nothing and the in-app check (every 20 s while the app is open) still works. No names or text in the alert. */
(()=>{
const dev=()=>{let d="";try{d=localStorage.getItem("af-dev")||""}catch(e){}if(!/^[a-z0-9]{8,40}$/.test(d)){d=rndId(20);try{localStorage.setItem("af-dev",d)}catch(e){}}return d};
window.dmDev=dev;
const map=()=>(S.dmSubs=S.dmSubs||{});
let busy=false,bad=0;
async function attach(){if(busy||bad>=3||!S.pushOn||typeof pushSub!=="function")return;busy=true;
  try{const sub=await pushSub(false);if(!sub)return;const j=Object.assign({},sub.toJSON(),{dev:dev()});const M=map();
    const ths=[];
    if(!(typeof memberMode==="function"&&memberMode())&&S.role!=="view")for(const m of S.roster||[])if(m.dm&&m.dm.ok)ths.push([m.dm,"L"]);
    const mine=typeof myDm==="function"?myDm():null;if(mine)ths.push([mine,"M"]);
    let n=0;for(const [t,role] of ths){if(M[t.id]===j.endpoint)continue;
      try{await SB.rpc("dm_sub",{p_id:t.id,p_key:t.k,p_role:role,p_sub:j});M[t.id]=j.endpoint;n++}catch(e){if(/function|schema|404/i.test(String(e&&e.message||e))){bad=3;break}}
      if(n>=25)break}
    if(n)save()}catch(e){}finally{busy=false}}
window.dmPushAttach=attach;
if(typeof every==="function")every(60000,()=>{if(!document.hidden)attach()},"dm-push");
setTimeout(attach,6000);
})();
