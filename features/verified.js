/* Accounted For 4.117.0: Get verified (Tools -> Get verified). Free levels, no ID collected.
   Level 1 Contact confirmed: the leader signs in with an emailed/texted code and links it to the team key.
   Level 2 Organization confirmed: the leader sends an organization name, website and role; the app owner approves.
   A recall started by a verified leader carries the badge, and the member's check-in page shows it before they check in.
   Server side: SQL part 49 (verify_contact, verify_org, verify_status, recall_badge_set, recall_badge_get). */
(()=>{
const NOW=()=>Date.now();
const V=()=>{S.vf=S.vf&&typeof S.vf==="object"?S.vf:{};return S.vf};
if(typeof SYNC_SKIP!=="undefined"&&Array.isArray(SYNC_SKIP)&&!SYNC_SKIP.includes("vf"))SYNC_SKIP.push("vf");
const esc2=s=>typeof esc==="function"?esc(s):String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const tok=()=>window.afBiz&&afBiz.tok?afBiz.tok():"";
const signedIn=()=>!!(window.AUTH&&AUTH.on&&AUTH.on());
const ui={name:"",site:"",role:"",busy:false};
const NOFN=/could not find the function|schema cache|PGRST202/i;
const errMsg=e=>{const m=String(e&&e.message||e);return NOFN.test(m)?"Verification isn't set up on the server yet.":m.slice(0,110)};
async function refresh(){try{const t=tok();if(!t)return false;const r=await SB.rpc("verify_status",{p_tok:t}),x=r&&r[0],v=V();
  v.level=x?+x.level||0:0;v.status=x?x.status:"none";v.org=x?x.org_name||"":"";v.contact=x?x.contact||"":"";v.at=NOW();save();return true}catch(e){return false}}
const level=()=>+V().level||0;
const word=()=>level()>=2?"Organization confirmed":level()>=1?"Contact confirmed":"Not verified yet";

const ok=(on,icon)=>`<span style="width:26px;height:26px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-size:14px;${on?"background:#1d9e75;color:#fff":"border:1.5px solid rgba(128,128,128,.5)"}">${on?"✓":icon}</span>`;
const row=(on,icon,t,sub,extra)=>`<div style="display:flex;gap:10px;align-items:flex-start;padding:12px 0;border-top:1px solid var(--line,rgba(128,128,128,.25))">${ok(on,icon)}<div style="flex:1;min-width:0"><b>${t}</b><div class="note" style="margin:2px 0 0">${sub}</div>${extra||""}</div></div>`;
const pill=t=>`<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#e1f5ee;color:#085041;font-size:13px;font-weight:600;margin:0 6px 6px 0">${t}</span>`;
function html(){const v=V(),L=level(),pend=v.status==="pending",rej=v.status==="rejected";
  let c1,c2;
  if(L>=1)c1=row(true,"","Contact confirmed",esc2(v.contact||"Your email or phone was confirmed"));
  else c1=row(false,"1","Confirm your contact","Sign in with an emailed or texted code, then confirm it for this team.",
    signedIn()?`<button class="btn" data-vf="contact"${ui.busy?" disabled":""} style="margin-top:8px">Confirm my contact</button>`:`<button class="btn" data-vf="signin" style="margin-top:8px">Sign in</button>`);
  if(L>=2)c2=row(true,"","Organization confirmed",esc2(v.org||""));
  else if(L>=1&&pend)c2=row(false,"2","Waiting for review",esc2(v.org||"")+" · we check the name, website and role. Usually within a few days.");
  else if(L>=1)c2=row(false,"2","Organization",(rej?"That one wasn't approved. Check the details and try again, or email Antoniotyler22@gmail.com. ":"Name, website and your role. We review it.")
    ,`<input type="text" id="vfName" maxlength="60" placeholder="Organization name" value="${esc2(ui.name)}" style="margin-top:8px"><input type="text" inputmode="url" id="vfSite" maxlength="120" placeholder="https://yourschool.org" autocapitalize="none" value="${esc2(ui.site)}"><input type="text" id="vfRole" maxlength="60" placeholder="Your role (Principal, Coach, Manager…)" value="${esc2(ui.role)}"><button class="btn" data-vf="org"${ui.busy?" disabled":""} style="margin-top:8px">Send for review</button>`);
  else c2=row(false,"2","Organization","Confirm your contact first.");
  return `<button class="chip" data-go="tools" style="cursor:pointer;margin-top:12px">◂ Tools</button><h2>Get verified</h2>
  <p class="note">So people know who they're giving their number to. It's free, and we never ask for an ID.</p>
  <div class="panel" style="margin-bottom:12px"><div class="note" style="margin:0 0 4px">Your level: <b>${word()}</b></div>${c1}${c2}</div>
  <div class="panel"><b>What people see</b><p class="note" style="margin:2px 0 8px">On the check-in page, before they check in:</p>
    ${L>=1?pill("✓ Contact confirmed")+(L>=2?pill("✓ Organization confirmed"+(v.org?": "+esc2(v.org):"")):""):'<p class="note">Nothing yet. Confirm your contact to show a badge.</p>'}
    <p class="note" style="margin:6px 0 0">Only shows on live check-ins you start after you're verified.</p></div>`}

{const _r=render;render=function(){if(view==="verify"){try{renderTabs()}catch(e){}$("#main").innerHTML=html();if(typeof animateView==="function")animateView();return}return _r.apply(this,arguments)}}
{const _rt=renderTools;renderTools=function(){const r=_rt.apply(this,arguments);
  try{const m=$("#main");if(m&&!m.querySelector('[data-go="verify"]')){const g=[...m.querySelectorAll(".tgrid")].pop();
    if(g)g.insertAdjacentHTML("beforeend",`<button data-go="verify"><span class="ic">${svg("ready")}</span><span><b>Get verified</b><small>${esc2(word())}</small></span></button>`)}}catch(e){}return r}}
document.addEventListener("input",e=>{if(view!=="verify")return;const t=e.target;if(t.id==="vfName")ui.name=t.value;else if(t.id==="vfSite")ui.site=t.value;else if(t.id==="vfRole")ui.role=t.value});
document.addEventListener("click",async e=>{if(view!=="verify")return;const t=e.target.closest&&e.target.closest("[data-vf]");if(!t)return;const a=t.dataset.vf;
  if(a==="signin"){view="acct";render();return}
  if(a==="contact"){ui.busy=true;render();try{await AUTH.rpc("verify_contact",{p_tok:tok()});await refresh();toast("Contact confirmed")}catch(er){toast(errMsg(er))}ui.busy=false;render();return}
  if(a==="org"){const n=($("#vfName")||{}).value||ui.name,s=($("#vfSite")||{}).value||ui.site,r=($("#vfRole")||{}).value||ui.role;ui.name=n;ui.site=s;ui.role=r;
    ui.busy=true;render();try{const st=await AUTH.rpc("verify_org",{p_tok:tok(),p_name:n,p_site:s,p_role:r});await refresh();toast(st==="approved"?"Already confirmed":"Sent for review")}catch(er){toast(errMsg(er))}ui.busy=false;render()}});
document.addEventListener("click",e=>{if(e.target.closest&&e.target.closest('[data-go="verify"]'))refresh().then(()=>{if(view==="verify")render()})},true);

/* a recall started by a verified leader carries the badge */
{const _rpc=SB.rpc.bind(SB);SB.rpc=async function(fn,args){const r=await _rpc(fn,args);
  try{if(fn==="create_recall"&&level()>=1&&args&&args.p_id&&args.p_read_key&&tok())_rpc("recall_badge_set",{p_recall:args.p_id,p_read_key:args.p_read_key,p_tok:tok()}).catch(()=>{})}catch(e){}return r}}
window.afVerified={level,word,refresh};
setTimeout(()=>{const v=V();if(!v.at||NOW()-v.at>6*36e5)refresh()},3500);
})();
