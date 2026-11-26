/* Accounted For 4.113.0: Plans & add-ons (Tools -> Plans & add-ons).
   Things a team can buy on top of Free / Pro / Org, or be handed with a code. Server side: SQL part 48 (addon_list,
   addon_redeem, addon_spend) and the "billing" function's add-on checkout.
   1. Text credits: packs of texts for "text everyone the check-in link". Counted only when SB.credits is true
      (off by default, so nobody who texts today is cut off); a send that would go over the balance is stopped first.
   2. Event Pass: 72 hours with up to 200 people for a one-off event (raises the team-size limit while it lasts;
      nobody is removed when it ends).
   3. Compliance pack: audit-ready drill log. Pick a kit for each drill, fill its required lines, sign it, export a
      spreadsheet or a printable signed log with the team's name and logo.
   4. Template kits: School safety, Workplace (emergency action plan), Youth and field trips, Events and races.
      Each kit is the lines a drill record needs for that setting. One kit, or all four.
   5. Branding: team name, logo and accent color on exports and screens; a Verified badge the owner grants after checking
      the team is who it says it is.
   6. Site license: a code that unlocks everything on every phone that redeems it (districts, councils, companies).
   7. Tip jar for people who just want to support the app.
   Buying: web and Android through Stripe checkout; on iPhone buttons stay off until SB.addonIAP (App Store products)
   exists. Codes work everywhere. Emergency muster stays free whatever happens here. */
(()=>{
const KT="af-addon-tok";
const NOW=()=>Date.now();
const esc2=s=>typeof esc==="function"?esc(s):String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const B=()=>{S.biz=S.biz&&typeof S.biz==="object"?S.biz:{};const b=S.biz;b.ents=b.ents&&typeof b.ents==="object"?b.ents:{};b.brand=b.brand&&typeof b.brand==="object"?b.brand:{};b.notes=b.notes&&typeof b.notes==="object"?b.notes:{};b.plan=b.plan&&typeof b.plan==="object"?b.plan:{};b.plan.goal=Math.min(60,Math.max(1,+b.plan.goal||4));b.plan.sched=Array.isArray(b.plan.sched)?b.plan.sched:[];return b};
if(typeof SYNC_SKIP!=="undefined"&&Array.isArray(SYNC_SKIP)&&!SYNC_SKIP.includes("biz"))SYNC_SKIP.push("biz");
const isIOS=()=>!!(window.MBN&&MBN.on&&MBN.platform==="ios");
const canBuy=()=>!isIOS()||!!(window.SB&&SB.addonIAP);

/* ---------- this team's add-on key (never leaves the phone except as a hash, or when the leader copies it) ---------- */
function tok(){let t="";try{t=localStorage.getItem(KT)||""}catch(e){}
  if(!/^[0-9a-f]{48}$/.test(t)){const a=new Uint8Array(24);crypto.getRandomValues(a);t=Array.from(a,x=>x.toString(16).padStart(2,"0")).join("");try{localStorage.setItem(KT,t)}catch(e){}}
  return t}
const call=(n,b)=>typeof proCall==="function"?proCall(n,b):Promise.reject(new Error("offline"));

/* ---------- what the team has ---------- */
const has=k=>{const e=B().ents[k];return !!(e&&e.q>0&&(!e.exp||e.exp>NOW()))};
const siteOn=()=>has("site")||!!(window.afCodeOrg&&window.afCodeOrg()); /* a site license, or an owner-portal code */
const bal=()=>Math.max(0,+((B().ents.credits||{}).q)||0);
const kitOn=k=>siteOn()||has("kits")||has("kit_"+k);
const compOn=()=>siteOn()||has("compliance");
const brandOn=()=>siteOn()||has("brand");
const passLeft=()=>{const e=B().ents.pass;return e&&e.q>0&&e.exp&&e.exp>NOW()?e.exp-NOW():0};
window.afPassCap=()=>passLeft()?200:0;
window.afSiteOn=siteOn;
async function refresh(){
  try{const rows=await SB.rpc("addon_list",{p_tok:tok()});const o={};
    for(const r of rows||[])o[r.sku]={q:+r.qty||0,exp:r.expires_at?Date.parse(r.expires_at):0};
    B().ents=o;B().at=NOW();save();applyBrand();return true}catch(e){return false}}
async function claim(session){try{await call("billing",{op:"addon_claim",session,tok:tok()});await refresh();toast("Purchase added");return true}catch(e){toast(String(e.message||e).slice(0,80));return false}}
async function buy(key){
  if(!canBuy()){toast("Add-ons come to iPhone with the next App Store update. Use the web app, or redeem a code.");return}
  try{const r=await call("billing",{op:"addon",key,tok:tok(),back:location.href.split("#")[0]});if(r.url)location.href=r.url}
  catch(e){toast(String(e.message||e).slice(0,90))}}
async function redeem(code){
  if(/^[0-9a-f]{64}$/i.test(String(code||"").trim())&&window.afUseProCode){ /* an owner-portal Pro code */
    const r=await window.afUseProCode(code);if(!r.ok){toast(String(r.msg).slice(0,90));return false}toast("Pro is on");try{await refresh()}catch(e){}return true}
  try{const sku=await SB.rpc("addon_redeem",{p_tok:tok(),p_code:String(code||"").trim()});await refresh();toast("Code accepted"+(sku?": "+sku:""));return true}
  catch(e){toast(String(e.message||e).replace(/^.*exception:?\s*/i,"").slice(0,90)||"That code didn't work");return false}}
/* returning from Stripe: #addon_ok=cs_... */
function checkReturn(){const m=/[#&]addon_ok=(cs_[A-Za-z0-9_]+)/.exec(location.hash||"");if(!m)return;
  try{history.replaceState(null,"",location.href.replace(/[#&]addon_ok=cs_[A-Za-z0-9_]+/,""))}catch(e){}claim(m[1])}

/* ---------- 1. text credits: stop a send the balance can't cover, count it after it goes out ---------- */
const recips=b=>["ppl","to","family"].reduce((n,k)=>Math.max(n,Array.isArray(b&&b[k])?b[k].length:0),0);
async function spend(n,ref){n=Math.min(400,Math.max(1,n|0));
  try{const left=await SB.rpc("addon_spend",{p_tok:tok(),p_n:n,p_ref:String(ref||"")});(B().ents.credits=B().ents.credits||{q:0,exp:0}).q=+left||0;save()}catch(e){await refresh()}}
const _fetch=window.fetch;
window.fetch=function(u,init){
  let n=0,ref="";
  try{const s=String(u&&u.url||u);
    if(window.SB&&SB.credits&&/\/functions\/v1\/sms$/.test(s)&&init&&typeof init.body==="string"){const b=JSON.parse(init.body);
      if(b&&!b.ping){n=recips(b);ref=String(b.recall||b.link||Date.now());
        if(n>bal()&&!siteOn()){toast("Not enough text credits ("+bal()+" left). Add a pack in Tools → Plans & add-ons.");
          const o={error:"Not enough text credits ("+bal()+" left). Add a pack in Tools → Plans & add-ons.",credits:true};
          return Promise.resolve(typeof Response==="function"?new Response(JSON.stringify(o),{status:402,headers:{"Content-Type":"application/json"}}):{ok:false,status:402,text:async()=>JSON.stringify(o),json:async()=>o,headers:new Map()})}
        if(siteOn())n=0}}}catch(e){n=0}
  const p=_fetch.apply(window,arguments);
  if(n>0)p.then(r=>{if(r&&r.ok)spend(n,ref)}).catch(()=>{});
  return p};

/* ---------- 3. compliance log + 4. kits ---------- */
const KITS={
  basic:{n:"Basic",d:"Any drill",f:["What was practiced","Notes"]},
  school:{n:"School safety",d:"Fire, lockdown, shelter-in-place, evacuation",f:["Drill type","Alarm or signal used","Route or zone","All-clear given by","Notes"],p:"$9.99"},
  work:{n:"Workplace (emergency action plan)",d:"Evacuation, severe weather, shelter",f:["Drill type","Assembly point","Floor warden","Alarm tested","Notes"],p:"$9.99"},
  youth:{n:"Youth & field trips",d:"Headcounts at each stop",f:["Location","Chaperone","Count at departure","Count at return","Notes"],p:"$9.99"},
  event:{n:"Events & races",d:"Staff, runners, volunteers",f:["Zone or course","Marshal","Cutoff time","Notes"],p:"$9.99"}};
const ui={sub:"",open:"",kit:"basic",f:{},by:"",code:"",busy:false};
const fmtD=(t,yr)=>{const d=new Date(t);return d.toLocaleDateString(undefined,Object.assign({weekday:"short",month:"short",day:"numeric"},yr?{year:"numeric"}:{}))+" "+String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0")};
const mm=ms=>ms==null?"":ms<60000?Math.max(1,Math.round(ms/1000))+" sec":(ms/60000).toFixed(ms<600000?1:0).replace(/\.0$/,"")+" min";
const drills=()=>Array.isArray(S.drills)?S.drills:[];
const noteOf=id=>B().notes[id]||null;
const ownedKits=()=>["basic",...["school","work","youth","event"].filter(kitOn)];
function setNote(id,kit,f,by){if(!ownedKits().includes(kit))return false;const clean={};for(const k of KITS[kit].f)clean[k]=String(f&&f[k]||"").slice(0,200);
  B().notes[id]={kit,f:clean,by:String(by||"").slice(0,60),at:NOW()};
  const ids=drills().map(d=>d.id);for(const k of Object.keys(B().notes))if(!ids.includes(k))delete B().notes[k];save();return true}
/* ---------- drill plan: yearly goal + scheduled drills (part of the Compliance pack) ---------- */
const yearDone=()=>{const y=new Date().getFullYear();return drills().filter(d=>d.kind!=="real"&&new Date(d.t).getFullYear()===y).length};
const schedDone=x=>drills().some(d=>d.kind!=="real"&&d.t>=x.t-432e5);
const schedList=()=>B().plan.sched.filter(x=>x&&x.t>0).sort((a,b)=>a.t-b.t);
const overdue=()=>schedList().filter(x=>x.t<NOW()&&!schedDone(x));
const nextUp=()=>schedList().find(x=>x.t>=NOW()&&!schedDone(x))||null;
function addSched(t,label){t=+t;if(!(t>0)){toast("Pick a date and time");return false}
  const l=B().plan.sched;if(l.length>=40){toast("Too many scheduled drills. Remove old ones.");return false}
  l.push({id:Math.random().toString(36).slice(2,9),t,label:String(label||"").trim().slice(0,40)||"Drill"});save();return true}
function icsOf(x){const z=t=>new Date(t).toISOString().replace(/[-:]/g,"").replace(/\.\d+/,"");const nm=((typeof unitName==="function"?unitName():"")||"Team")+": "+x.label;
  return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Accounted For//Drill//EN","BEGIN:VEVENT","UID:"+x.id+"@accountedfor","DTSTAMP:"+z(NOW()),"DTSTART:"+z(x.t),"DTEND:"+z(x.t+18e5),"SUMMARY:"+nm.replace(/[,;\\\n]/g," "),"BEGIN:VALARM","TRIGGER:-PT15M","ACTION:DISPLAY","DESCRIPTION:Drill in 15 minutes","END:VALARM","END:VEVENT","END:VCALENDAR"].join("\r\n")}
function planNote(){const o=overdue(),n=nextUp();return o.length?o.length+" drill"+(o.length>1?"s":"")+" overdue":n?"Next: "+fmtD(n.t):""}
function planHTML(){const g=B().plan.goal,n=yearDone(),pct=Math.min(100,Math.round(100*n/g)),o=overdue();
  const rows=schedList().slice(-12).map(x=>{const dn=schedDone(x),od=!dn&&x.t<NOW();return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-top:1px solid var(--line,rgba(128,128,128,.25))"><div><b>${esc2(x.label)}</b><div class="note">${esc2(fmtD(x.t))} · ${dn?'<b style="color:var(--s-onhand,#2a7)">Done</b>':od?'<b style="color:var(--warn,#c33)">Overdue</b>':"Upcoming"}</div></div><div style="display:flex;gap:6px"><button class="chip" data-aopen="ics:${esc2(x.id)}" style="cursor:pointer">Calendar</button><button class="chip" data-aopen="rm:${esc2(x.id)}" style="cursor:pointer" aria-label="Remove">✕</button></div></div>`}).join("");
  return `<div class="panel" style="margin:12px 0"><h3 style="margin:0 0 4px">Drill plan</h3>
  <p class="note"><b style="font-size:22px">${n} of ${g}</b> drills this year${n>=g?' · <b style="color:var(--s-onhand,#2a7)">goal met ✓</b>':""}</p>
  <div role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" style="height:10px;border-radius:6px;background:rgba(128,128,128,.25);overflow:hidden"><div style="height:100%;width:${pct}%;background:var(--s-onhand,#2a7)"></div></div>
  <div style="display:flex;align-items:center;gap:8px;margin-top:8px"><span class="note">Yearly goal</span><button class="chip" data-aopen="goal-" style="cursor:pointer" aria-label="Lower goal">−</button><b>${g}</b><button class="chip" data-aopen="goal+" style="cursor:pointer" aria-label="Raise goal">+</button></div>
  ${o.length?`<p class="note" style="color:var(--warn,#c33)"><b>${o.length} scheduled drill${o.length>1?"s":""} overdue.</b> Run one and it counts.</p>`:""}
  <div class="row2" style="margin-top:8px"><input type="text" id="apLabel" placeholder="Fire drill" maxlength="40" value="${esc2(ui.pl||"")}"><input type="datetime-local" id="apWhen" value="${esc2(ui.pw||"")}"></div>
  <button class="btn" data-aopen="sched" style="margin-top:8px">Schedule a drill</button>${rows}</div>`}

const csvc=v=>{v=String(v==null?"":v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
function logCSV(){const rows=[["Date","Time","Type","Unit","Expected","Accounted for","Time to everyone","Late","Need help","Visitors","Still missing","Kit","Details","Signed by"]];
  for(const d of drills()){const n=noteOf(d.id),dt=new Date(d.t);
    rows.push([dt.toISOString().slice(0,10),String(dt.getHours()).padStart(2,"0")+":"+String(dt.getMinutes()).padStart(2,"0"),d.kind==="real"?"Real event":"Drill",d.unit||"",d.n,d.ok,mm(d.all),d.late||0,d.help||0,d.vis||0,(d.miss||[]).join("; "),
      n?KITS[n.kit].n:"",n?Object.entries(n.f).filter(([,v])=>v).map(([k,v])=>k+": "+v).join(" | "):"",n?n.by:""])}
  return rows.map(r=>r.map(csvc).join(",")).join("\n")}
function logHTML(){const br=B().brand,name=(brandOn()&&br.name)||(typeof unitName==="function"?unitName():"")||"Accounted For",c=(brandOn()&&br.color)||"#1f5fbf";
  const logo=brandOn()&&br.logo?`<img src="${esc2(br.logo)}" style="height:46px;float:right" alt="">`:"";
  const rows=drills().map(d=>{const n=noteOf(d.id);return `<tr><td>${esc2(fmtD(d.t,1))}</td><td>${d.kind==="real"?"Real event":"Drill"}</td><td>${d.ok} of ${d.n}</td><td>${esc2(mm(d.all)||"not everyone")}</td><td>${esc2((d.miss||[]).join(", "))}</td><td>${n?"<b>"+esc2(KITS[n.kit].n)+"</b><br>"+Object.entries(n.f).filter(([,v])=>v).map(([k,v])=>esc2(k)+": "+esc2(v)).join("<br>"):""}</td><td>${n?esc2(n.by):""}<div class="sig"></div></td></tr>`}).join("");
  return `<!doctype html><meta charset="utf-8"><title>${esc2(name)} drill log</title><style>body{font:13px -apple-system,Helvetica,Arial,sans-serif;margin:28px;color:#111}h1{margin:0 0 4px;color:${esc2(c)}}table{border-collapse:collapse;width:100%;margin-top:14px}th,td{border:1px solid #bbb;padding:6px 8px;vertical-align:top;text-align:left}th{background:#f1f3f6}.sig{border-bottom:1px solid #555;height:22px;margin-top:10px}small{color:#555}</style>${logo}<h1>${esc2(name)}</h1><div>Emergency and safety drill log${brandOn()&&has("verified")?" · Verified organization ✓":""}</div><small>Printed ${esc2(new Date().toLocaleDateString())} from Accounted For. ${drills().length} records.</small><table><tr><th>When</th><th>Type</th><th>Accounted for</th><th>Time to everyone</th><th>Still missing</th><th>Details</th><th>Signed</th></tr>${rows||'<tr><td colspan="7">No drills recorded yet.</td></tr>'}</table>`}
window.afBiz={plan:{yearDone,overdue,nextUp,addSched,note:planNote,schedDone},state:B,tok,has,bal,siteOn,compOn,brandOn,kitOn,passLeft,refresh,redeem,buy,claim,setNote,logCSV,logHTML,KITS,ownedKits,recips};

/* ---------- 5. branding ---------- */
function applyBrand(){try{const r=document.documentElement.style,c=B().brand.color;
  if(brandOn()&&/^#[0-9a-f]{6}$/i.test(c||"")){r.setProperty("--brass",c);r.setProperty("--brass-soft",c+"26")}else{r.removeProperty("--brass");r.removeProperty("--brass-soft")}}catch(e){}}
function pickLogo(file){if(!file||!/^image\//.test(file.type))return;const rd=new FileReader();
  rd.onload=()=>{const im=new Image();im.onload=()=>{const k=Math.min(1,200/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
    c.getContext("2d").drawImage(im,0,0,c.width,c.height);let q=.85,u=c.toDataURL("image/png");if(u.length>60000)u=c.toDataURL("image/jpeg",q);
    if(u.length>60000){toast("That logo is too detailed. Try a simpler one.");return}B().brand.logo=u;save();render()};im.src=rd.result};rd.readAsDataURL(file)}

/* ---------- the screen ---------- */
const price=(k,t,sub)=>`<button class="btn${canBuy()?"":" alt"}" data-ab="${k}" ${canBuy()?"":'aria-disabled="true"'} style="margin:4px 6px 0 0;white-space:nowrap">${t}${sub?` <small style="opacity:.8">${sub}</small>`:""}</button>`;
const card=(h,inner)=>`<div class="panel" style="margin-bottom:12px"><h3 style="margin:0 0 4px">${h}</h3>${inner}</div>`;
const own=()=>typeof isOwner!=="function"||isOwner()||!!S.lite;
function leftTxt(ms){const h=Math.floor(ms/36e5),d=Math.floor(h/24);return d>=1?d+"d "+(h%24)+"h":h+"h "+Math.floor(ms%36e5/6e4)+"m"}
function creditsCard(){const live=!!(window.SB&&SB.credits);
  return card("Text credits",`<p class="note"><b style="font-size:22px">${siteOn()?"Unlimited":bal()}</b> ${siteOn()?"with your site license":"texts left"}${live?"":" · not counted yet"}</p>
  <p class="note">Each text to a person is one credit. Credits never expire.${live?"":" Texting is still included while credits are switched off."}</p>${siteOn()?"":price("credits_100","100 texts","$4.99")+price("credits_500","500 texts","$19.99")+price("credits_2000","2,000 texts","$59.99")}`)}
function passCard(){const L=passLeft();
  return card("Event Pass",L?`<p class="note"><b style="font-size:22px">${leftTxt(L)}</b> left · up to 200 people. Nobody is removed when it ends.</p>`
    :`<p class="note">A 5K, a field trip, a job site, a conference. 72 hours with up to 200 people, no subscription.</p>${price("pass","Start an Event Pass","$9.99")}`)}
function compCard(){const n=drills().length;
  return card("Compliance pack"+(compOn()?" ✓":""),`<p class="note">${compOn()?`${n} drill${n===1?"":"s"} on this phone. Sign each one, then export a spreadsheet or a printable log.`:"Audit-ready drill log: fill in the lines a school, employer or insurer asks for, sign it, and export it with your team's name and logo."}</p>
    ${compOn()&&planNote()?`<p class="note"><b>${esc2(planNote())}</b></p>`:""}${compOn()?`<button class="btn" data-aopen="comp">Open the drill log</button>`:price("compliance","Unlock for a year","$49")}`)}
function kitsCard(){const rows=["school","work","youth","event"].map(k=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 0;border-top:1px solid var(--line,rgba(128,128,128,.25))"><div><b>${KITS[k].n}</b><div class="note">${KITS[k].d}</div></div>${kitOn(k)?'<b style="color:var(--s-onhand,#2a7)">✓ Yours</b>':price("kit_"+(k==="work"?"work":k),"Add",KITS[k].p)}</div>`).join("");
  return card("Template kits",`<p class="note">Each kit is the set of lines a drill record needs for that setting. They show up in the drill log.</p>${rows}${["school","work","youth","event"].every(kitOn)?"":price("kits","All four kits","$24.99")}`)}
function brandCard(){const b=B().brand;
  return card("Your branding"+(brandOn()?" ✓":""),`<p class="note">Team name, logo and accent color on exports and screens${has("verified")?"":", plus a Verified badge once we've checked the team"}.</p>
    ${brandOn()?`<div class="row2" style="margin:6px 0"><input type="text" id="abName" placeholder="Team name on exports" maxlength="40" value="${esc2(b.name||"")}"><input type="color" id="abColor" value="${esc2(/^#[0-9a-f]{6}$/i.test(b.color||"")?b.color:"#1f5fbf")}" aria-label="Accent color" style="height:44px"></div>
    <div style="display:flex;align-items:center;gap:10px;margin:6px 0">${b.logo?`<img src="${esc2(b.logo)}" alt="" style="height:44px;border-radius:8px">`:'<span class="note">No logo yet.</span>'}<label class="btn alt" style="margin:0;cursor:pointer">Choose logo<input type="file" id="abLogo" accept="image/*" hidden></label>${b.logo?'<button class="btn alt" data-aopen="nologo">Remove</button>':""}</div>
    <p class="note">${has("verified")?'<b style="color:var(--s-onhand,#2a7)">Verified organization ✓</b>':`<a href="mailto:administration@accountedforteam.com?subject=${encodeURIComponent("Verify my team: "+(b.name||(typeof unitName==="function"?unitName():"")))}">Ask for the Verified badge</a>`}</p>`
    :price("brand","Unlock for a year","$59.99")}`)}
function siteCard(){return card("Site license",siteOn()?`<p class="note"><b style="color:var(--s-onhand,#2a7)">Active ✓</b> Everything is unlocked on this phone${B().ents.site&&B().ents.site.exp?" until "+new Date(B().ents.site.exp).toLocaleDateString():""}.</p>`
  :`<p class="note">For a school district, scout council, union or company: one license, every phone. Have a Pro or site license code?</p><div class="row2"><input type="text" id="abCode" placeholder="Enter code" autocapitalize="characters" autocomplete="off" value="${esc2(ui.code)}"><button class="btn" data-aopen="redeem">Redeem</button></div><p class="note"><a href="mailto:administration@accountedforteam.com?subject=Accounted%20For%20site%20license">Ask about a site license</a></p>`)}
function tipCard(){return card("Keep it going",`<p class="note">Accounted For is built by one person. If it earns its place on your phone, you can chip in. Nothing unlocks; it just helps.</p>${price("tip_2","$2")}${price("tip_5","$5")}${price("tip_10","$10")}`)}
function keyCard(){return card("Use on another phone",`<p class="note">Add-ons belong to this phone's key. To use them on another phone, copy the key here and paste it there.</p><div class="row2"><button class="btn alt" data-aopen="copykey">Copy my key</button><button class="btn alt" data-aopen="pastekey">Paste a key</button></div>`)}
function storeHTML(){
  const t=typeof afTier==="function"?afTier():"free";
  return `<button class="chip" data-go="tools" style="cursor:pointer;margin-top:12px">◂ Tools</button><h2>Plans & add-ons</h2>
  <p class="note">You're on <b>${t==="org"?"Org":t==="pro"?"Pro":"Free"}</b>. Add what you need. Emergency muster stays free.${canBuy()?"":" Buying on iPhone is coming; use the web app or a code for now."}</p>
  ${own()?creditsCard()+passCard()+compCard()+kitsCard()+brandCard()+siteCard()+tipCard()+keyCard():'<p class="note">Add-ons are managed by the person who runs the team.</p>'}`}
function compHTML(){const L=drills().slice(0,25),k=ui.open?drills().find(d=>d.id===ui.open):null;
  const rows=L.map(d=>{const n=noteOf(d.id);const op=d.id===ui.open;return `<div style="padding:10px 0;border-top:1px solid var(--line,rgba(128,128,128,.25))"><button class="chip" data-adr="${esc2(d.id)}" style="cursor:pointer;width:100%;text-align:left;display:block"><b>${esc2(fmtD(d.t))}</b> · ${d.kind==="real"?"Real event":"Drill"} · ${d.ok}/${d.n} accounted${d.all?" in "+esc2(mm(d.all)):""}<br><span class="note">${n?"✓ "+esc2(KITS[n.kit].n)+" · signed "+esc2(n.by||"—"):"Not signed yet"}</span></button>${op?editor(d):""}</div>`}).join("");
  return `<button class="chip" data-aopen="store" style="cursor:pointer;margin-top:12px">◂ Plans & add-ons</button><h2>Drill log</h2>
  ${planHTML()}
  <div class="row2" style="margin-bottom:8px"><button class="btn" data-aopen="csv">Export spreadsheet</button><button class="btn alt" data-aopen="html">Printable log</button></div>
  <div class="panel">${rows||'<p class="note">No drills yet. Run a recall or check-in drill and it lands here.</p>'}${drills().length>25?`<p class="note">Showing 25 of ${drills().length}. The export has all of them.</p>`:""}</div>`}
function editor(d){const n=noteOf(d.id);const kit=ui.kit&&KITS[ui.kit]?ui.kit:"basic";const f=Object.keys(ui.f).length?ui.f:(n&&n.kit===kit?n.f:{});
  return `<div style="margin-top:8px"><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${ownedKits().map(k=>`<button class="chip${kit===k?" on":""}" data-akit="${k}" style="cursor:pointer" aria-pressed="${kit===k}">${KITS[k].n}</button>`).join("")}</div>
  ${KITS[kit].f.map(x=>`<label class="note" style="display:block;margin-top:6px">${esc2(x)}<input type="text" data-af="${esc2(x)}" maxlength="200" value="${esc2(f[x]||"")}"></label>`).join("")}
  <label class="note" style="display:block;margin-top:6px">Signed by<input type="text" id="adBy" maxlength="60" placeholder="Name and title" value="${esc2(ui.by||(n&&n.by)||"")}"></label>
  <button class="btn" data-asave="${esc2(d.id)}" style="margin-top:10px">Sign and save</button></div>`}

function html(){return ui.sub==="comp"?compHTML():storeHTML()}
{const _r=render;render=function(){if(view==="store"){try{renderTabs()}catch(e){}$("#main").innerHTML=html();if(typeof animateView==="function")animateView();return}return _r.apply(this,arguments)}}
{const _rt=renderTools;renderTools=function(){const r=_rt.apply(this,arguments);
  try{const m=$("#main");if(m&&!m.querySelector('[data-go="store"]')){const g=[...m.querySelectorAll(".tgrid")].pop();
    if(g)g.insertAdjacentHTML("beforeend",`<button data-go="store"><span class="ic">${svg("text")}</span><span><b>Plans & add-ons</b><small>${passLeft()?"Event Pass on":compOn()?(planNote()||"Compliance pack on"):"Text credits, Event Pass, drill log"}</small></span></button>`)}}catch(e){}return r}}

/* ---------- clicks ---------- */
document.addEventListener("input",e=>{if(view!=="store")return;const t=e.target;
  if(t.matches&&t.matches("[data-af]")){ui.f[t.getAttribute("data-af")]=t.value}
  else if(t.id==="adBy")ui.by=t.value;else if(t.id==="apLabel")ui.pl=t.value;else if(t.id==="apWhen")ui.pw=t.value;else if(t.id==="abCode")ui.code=t.value;
  else if(t.id==="abName"){B().brand.name=t.value.slice(0,40);save()}
  else if(t.id==="abColor"){B().brand.color=t.value;save();applyBrand()}});
document.addEventListener("change",e=>{if(view==="store"&&e.target.id==="abLogo")pickLogo(e.target.files&&e.target.files[0])});
document.addEventListener("click",async e=>{if(view!=="store")return;const t=e.target.closest&&e.target.closest("[data-ab],[data-aopen],[data-adr],[data-akit],[data-asave]");if(!t)return;
  if(t.dataset.ab){return buy(t.dataset.ab)}
  if(t.dataset.adr){ui.open=ui.open===t.dataset.adr?"":t.dataset.adr;ui.f={};ui.by="";const n=noteOf(ui.open);ui.kit=n?n.kit:"basic";return render()}
  if(t.dataset.akit){ui.kit=t.dataset.akit;ui.f={};return render()}
  if(t.dataset.asave){const kit=ui.kit&&KITS[ui.kit]?ui.kit:"basic";const d=noteOf(t.dataset.asave);const f=Object.assign({},d&&d.kit===kit?d.f:{},ui.f);
    if(!(ui.by||(d&&d.by)||"").trim()){toast("Add who signed it");return}
    if(setNote(t.dataset.asave,kit,f,ui.by||(d&&d.by))){ui.open="";ui.f={};toast("Signed and saved");render()}return}
  const a=t.dataset.aopen;
  if(a==="goal+"||a==="goal-"){B().plan.goal=Math.min(60,Math.max(1,B().plan.goal+(a==="goal+"?1:-1)));save();return render()}
  if(a==="sched"){const w=Date.parse(($("#apWhen")||{}).value||ui.pw||"");if(addSched(w,($("#apLabel")||{}).value||ui.pl)){ui.pl="";ui.pw="";toast("Drill scheduled");render()}return}
  if(a&&a.startsWith("rm:")){B().plan.sched=B().plan.sched.filter(x=>x.id!==a.slice(3));save();return render()}
  if(a&&a.startsWith("ics:")){const x=B().plan.sched.find(q=>q.id===a.slice(4));if(x)shareFile(icsOf(x),"drill.ics","text/calendar");return}
  if(a==="comp"){ui.sub="comp";return render()}
  if(a==="store"){ui.sub="";return render()}
  if(a==="csv")return shareFile(logCSV(),((B().brand.name||"drill log")+" "+new Date().toISOString().slice(0,10)).replace(/[^\w -]+/g,"")+".csv","text/csv");
  if(a==="html")return shareFile(logHTML(),((B().brand.name||"drill log")+" "+new Date().toISOString().slice(0,10)).replace(/[^\w -]+/g,"")+".html","text/html");
  if(a==="nologo"){delete B().brand.logo;save();return render()}
  if(a==="redeem"){const c=($("#abCode")||{}).value||ui.code;if(!String(c).trim()){toast("Enter your code");return}if(await redeem(c)){ui.code="";render()}return}
  if(a==="copykey"){try{await navigator.clipboard.writeText(tok());toast("Key copied")}catch(e){toast("Couldn't copy")}return}
  if(a==="pastekey"){try{const v=(await navigator.clipboard.readText()).trim();if(!/^[0-9a-f]{48}$/.test(v)){toast("That isn't an add-on key");return}localStorage.setItem(KT,v);await refresh();toast("Key added");render()}catch(e){toast("Couldn't paste")}return}});
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest('[data-go="store"]');if(t){ui.sub="";refresh().then(()=>{if(view==="store")render()})}},true);

/* pass raises the team-size limit while it lasts; a site license also counts as Pro everywhere */
{const _ok=proOK;proOK=function(){return siteOn()||_ok.apply(this,arguments)}}
applyBrand();setTimeout(()=>{checkReturn();if(!B().at||NOW()-B().at>6*36e5)refresh()},2500);
})();
