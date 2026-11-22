/* Accounted For 4.142.0: the self-service "Get verified" screen is gone (Tools tile, screen and its server calls).
   Verification is now leader-controlled, person by person (features/person-verify.js, SQL part 50).
   What stays here: badges that leaders already earned keep working.
   A recall started by a leader who already has a level carries the badge, and the member's check-in page shows it.
   Server side still read: verify_status, recall_badge_set, recall_badge_get (SQL part 49).
   verify_contact and verify_org are retired by SQL part 61, so no new levels can be earned the old way. */
(()=>{
const NOW=()=>Date.now();
const V=()=>{S.vf=S.vf&&typeof S.vf==="object"?S.vf:{};return S.vf};
if(typeof SYNC_SKIP!=="undefined"&&Array.isArray(SYNC_SKIP)&&!SYNC_SKIP.includes("vf"))SYNC_SKIP.push("vf");
const tok=()=>window.afBiz&&afBiz.tok?afBiz.tok():"";
async function refresh(){try{const t=tok();if(!t)return false;const r=await SB.rpc("verify_status",{p_tok:t}),x=r&&r[0],v=V();
  v.level=x?+x.level||0:0;v.status=x?x.status:"none";v.org=x?x.org_name||"":"";v.contact=x?x.contact||"":"";v.at=NOW();save();return true}catch(e){return false}}
const level=()=>+V().level||0;
const word=()=>level()>=2?"Organization confirmed":level()>=1?"Contact confirmed":"Not verified yet";

/* a recall started by a leader who already holds a level carries the badge */
{const _rpc=SB.rpc.bind(SB);SB.rpc=async function(fn,args){const r=await _rpc(fn,args);
  try{if(fn==="create_recall"&&level()>=1&&args&&args.p_id&&args.p_read_key&&tok())_rpc("recall_badge_set",{p_recall:args.p_id,p_read_key:args.p_read_key,p_tok:tok()}).catch(()=>{})}catch(e){}return r}}
window.afVerified={level,word,refresh};
setTimeout(()=>{const v=V();if(!v.at||NOW()-v.at>6*36e5)refresh()},3500);
})();
