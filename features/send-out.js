/* Accounted For 4.8.4: Send out. One place at the top of Invite to send links or logins to many people.
   1) Who: Everyone, whole sections, people one at a time (search), or someone not on the roster (name + phone or email).
   2) Connection: Linked to this roster (they join your team) or Building their own team (nothing connects back).
   3) Role: one role for everyone; change any person's role in the list.
   4) Send as: a login (own username + password each) or a link.
   Make N → a send list. Send next opens a text (or an email if no phone) already filled in. ✓ Sent as you go. */
(()=>{
const isEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||"").trim());
const digits=v=>String(v||"").replace(/\D/g,"");
const phoneOf=v=>{const d=String(v||"").replace(/[^\d+]/g,"");if(!d)return "";const n=d.replace(/\D/g,"");return d.startsWith("+")?"+"+n:n.length===10?"+1"+n:n.length===11&&n[0]==="1"?"+"+n:n};
const iOS=()=>/iPhone|iPad|Mac/.test(navigator.userAgent);
const own=()=>typeof isOwner==="function"&&isOwner();
const realRoster=()=>S.source!=="sample"?(S.roster||[]):[];
let so={all:false,secs:new Set(),ids:new Set(),extra:[],xid:0,conn:"team",role:"member",as:"login",over:{},list:null,busy:false,msg:"",sent:new Set(),open:false};
window.__so=()=>so;
if(typeof SYNC_SKIP==="object")SYNC_SKIP.push("soSend","soRecent");
if(S.soSend&&Array.isArray(S.soSend.list)&&Date.now()-(S.soSend.at||0)<7*864e5){so.list=S.soSend.list;so.sent=new Set(S.soSend.sent||[]);so.msg=S.soSend.msg||""}else delete S.soSend;
function keep(){if(so.list)S.soSend={list:so.list,sent:[...so.sent],msg:so.msg,at:Date.now()};else delete S.soSend;save()}

/* ---------- who ---------- */
function people(){const R=realRoster();const pick=so.all?R:R.filter(m=>so.ids.has(m.id)||so.secs.has(m.sec));
  return sorted(pick).map(m=>({k:"r:"+m.id,m,name:m.rank+" "+m.name,phone:m.phone||"",email:m.email||"",sec:m.sec}))
    .concat(so.extra.map(x=>({k:x.k,m:null,name:x.name,phone:x.phone,email:x.email,sec:""})))}
const contact=p=>p.phone&&digits(p.phone).length>=7?p.phone:p.email||"";

/* ---------- roles ---------- */
const roles=()=>own()?lgRoles():[];
function eff(p){let v=so.over[p.k]||so.role;if(v==="secl"&&p.m)v="secl:"+p.m.sec;return v}
const multi=R=>R.k==="cmd"&&R.ds.length>1;
function destFor(p){const v=eff(p),rk=v.split(":")[0],R=roles().find(r=>r.k===rk);
  if(!R)return {err:"Pick a role."};if(!R.ds.length)return {err:R.n+": "+R.hint};
  if(rk==="member"){if(!p.m)return {err:"Not on your roster, so no Member page. Give them another role."};const d=R.ds.find(x=>x.id==="me:"+p.m.id);return d?{d,label:d.l,mid:p.m.id}:{err:"No Member page for them yet."}}
  if(rk==="secl"){const sec=v.split(":")[1]||"";const d=R.ds.find(x=>x.id==="sec:"+sec);return d?{d,label:p.name+" · "+sec+(S.level==="co"?" platoon":" section leader"),mid:p.m?p.m.id:p.k}:{err:S.level==="co"?"Pick their platoon.":"Pick their section."}}
  if(multi(R)){const id=v.slice(rk.length+1);const d=R.ds.find(x=>x.id===id);if(!d)return {err:"Pick which "+R.n.toLowerCase()+" seat for them."};return {d,label:p.name+" · "+d.l,mid:p.m?p.m.id:p.k}}
  const d=R.ds[0];return {d,label:p.name+" · "+d.l,mid:p.m?p.m.id:p.k}}
function roleOpts(p){const v=eff(p);let o="";for(const R of roles()){if(!R.ds.length)continue;
    if(R.k==="member"){if(p.m)o+=`<option value="member"${v==="member"?" selected":""}>Member</option>`;continue}
    if(R.k==="secl"){for(const d of R.ds){const s=d.id.slice(4);o+=`<option value="secl:${esc(s)}"${v==="secl:"+s?" selected":""}>${S.level==="co"?"Platoon":"Section leader"} · ${esc(s)}</option>`}continue}
    if(multi(R)){for(const d of R.ds){const val=R.k+":"+d.id;o+=`<option value="${esc(val)}"${v===val?" selected":""}>${esc(R.n+" · "+d.l.replace(/ · company dashboard$/,""))}</option>`}continue}
    o+=`<option value="${R.k}"${v===R.k?" selected":""}>${esc(R.n)}</option>`}
  if(!/ selected/.test(o))o=`<option value="" selected>Pick a role…</option>`+o;return o}

/* ---------- the box ---------- */
const btn=(attr,on,label,dis)=>`<button type="button" ${attr} aria-pressed="${!!on}"${dis?" disabled":""}>${label}</button>`;
function stepHead(n,t){return `<div style="display:flex;gap:8px;align-items:center;margin:12px 0 4px"><span class="chip" style="font-weight:800">${n}</span><b>${t}</b></div>`}
function soHTML(){
  if(so.list)return listHTML();
  if(!own())so.conn="own";
  const R=realRoster(),ps=people(),team=so.conn==="team";
  const secs=SECTIONS.map(s=>s[0]).concat("ATT").filter(k=>R.some(m=>m.sec===k));
  let h=`<div class="panel" id="soBox" data-noxl style="border-color:var(--s-onhand)"><b>Send out</b><p class="note" style="margin:0">Send links or logins to everyone from one place.</p>`;
  /* 1 who */
  h+=stepHead(1,"Who");
  if(R.length){h+=`<div class="evts">${btn('data-soall="1"',so.all,"Everyone · "+R.length)}${secs.map(k=>btn(`data-sosec="${esc(k)}"`,so.all||so.secs.has(k),esc(k)+" · "+R.filter(m=>m.sec===k).length,so.all)).join("")}</div>
    <details id="soPickD"${so.open?" open":""}><summary class="note">Pick people one at a time (${so.ids.size} picked)</summary><input type="search" id="soQ" placeholder="Search names" style="width:100%;box-sizing:border-box;margin:6px 0">
      <div style="max-height:260px;overflow:auto">${sorted(R).map(m=>`<label data-sorow="${esc((m.rank+" "+m.name+" "+m.sec).toLowerCase())}" style="display:flex;align-items:center;gap:10px;padding:7px 4px;border-bottom:1px solid var(--line);cursor:pointer"><input type="checkbox" data-sop="${esc(m.id)}"${so.all||so.ids.has(m.id)||so.secs.has(m.sec)?" checked":""}${so.all||so.secs.has(m.sec)?" disabled":""} style="width:20px;height:20px;margin:0"><span>${esc(m.rank+" "+m.name)} <span class="note">· ${esc(m.sec)}</span></span></label>`).join("")}</div></details>`}
  else h+=`<p class="note" style="margin:0">Load your roster in DATA to pick from it. You can still add people below.</p>`;
  h+=`<details id="soAddD"${so.extra.length||!R.length?" open":""}><summary class="note">Add someone who isn't on the roster</summary>
    <label for="soXN">Name</label><input type="text" id="soXN" autocomplete="off" placeholder="Name">
    <label for="soXT">Phone or email</label><input type="text" id="soXT" inputmode="email" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="(808) 555-0123 or name@example.com">
    <button type="button" class="btn alt" id="soXAdd">Add</button>
    ${(S.soRecent||[]).filter(r=>!so.extra.some(x=>x.name===r.name)).length?`<div class="note" style="margin:8px 0 0">Added before</div><div class="evts">${(S.soRecent||[]).map((r,i)=>so.extra.some(x=>x.name===r.name)?"":`<button type="button" data-sorec="${i}">+ ${esc(r.name)}</button>`).join("")}</div>`:""}
    ${so.extra.map(x=>`<div class="rrow"><div class="who"><b>${esc(x.name)}</b><div class="ph">${esc(x.phone||x.email)}</div></div><button type="button" class="chip" data-soxdel="${esc(x.k)}" aria-label="Remove ${esc(x.name)}" style="cursor:pointer;width:auto;flex:0 0 auto;align-self:flex-start">✕</button></div>`).join("")}</details>
    <div class="note" style="margin:6px 0 0"><b id="soN">${ps.length}</b> ${ps.length===1?"person":"people"} picked</div>${fillBtn(ps)}`;
  /* 2 connection */
  h+=stepHead(2,"Connection")+`<div class="evts">${btn('data-soconn="team"',team,"Linked to this roster",!own())}${btn('data-soconn="own"',!team,"Building their own team")}</div>
    <p class="note" style="margin:4px 0 0">${team?"They join your team and land on the page for their role. Their updates come to you.":"They get the app and set up their own board. <b>Nothing connects back to you</b>, and you don't see their information."}</p>
    ${own()?"":`<p class="note" style="margin:0">Only the phone that runs the board can link people to it.</p>`}`;
  if(team){
    /* 3 role */
    const RL=roles();
    h+=stepHead(3,"Role")+`<select id="soRole" style="width:100%">${RL.map(r=>`<option value="${r.k}"${r.k===so.role?" selected":""}${r.ds.length?"":" disabled"}>${esc(r.n)}${r.ds.length?"":" (not set up)"}</option>`).join("")}</select>
      <p class="note" style="margin:4px 0 0">${esc((RL.find(r=>r.k===so.role)||{}).d||"")} One role covers everyone. Change anyone below.</p>`;
    if(ps.length)h+=`<div class="alist" style="max-height:300px;overflow:auto;margin-top:6px">${ps.map(p=>{const r=destFor(p);
      return `<div class="rrow" style="--sc:var(${r.err?"--warn":"--line"})"><div class="who"><b>${esc(p.name)}</b><div class="ph">${esc(contact(p)||"no phone or email")}${r.err?` · <b>${esc(r.err)}</b>`:""}</div></div>
        <select data-sorole="${esc(p.k)}" aria-label="Role for ${esc(p.name)}" style="max-width:52%">${roleOpts(p)}</select></div>`}).join("")}</div>`;
    /* 4 send as */
    h+=stepHead(4,"Send as")+`<div class="evts">${btn('data-soas="login"',so.as==="login","A login · own username + password")}${btn('data-soas="link"',so.as==="link","A link")}</div>`;
    if(so.as==="login"&&typeof proOK==="function"&&!proOK())h+=`<p class="note" style="margin:4px 0 0">Logins are part of Pro. Send a link instead, or get Pro.</p>`}
  const ok=team?ps.filter(p=>!destFor(p).err):ps;const bad=ps.length-ok.length;
  const noun=!team?"message":so.as==="login"?"login":"link";const pro=team&&so.as==="login"&&typeof proOK==="function"&&!proOK();
  h+=`<button type="button" class="btn" id="soMake" style="width:100%;margin-top:12px"${ok.length&&!so.busy&&!pro?"":" disabled"}>${so.busy?"Making…":(team?"Make ":"Get ")+ok.length+" "+noun+(ok.length===1?"":"s")+(team?"":" ready")}</button>
    ${bad?`<p class="note" style="margin:4px 0 0">${bad} flagged above (skipped until you give them another role).</p>`:""}<div class="note" role="status">${esc(so.msg)}</div></div>`;
  return h}
window.soHTML=soHTML;
/* open Send out with these roster people picked (used by "On the app" and reminders) */
window.soPreset=(ids,o)=>{o=o||{};so.list=null;so.sent=new Set();so.msg="";so.all=false;so.secs=new Set();so.extra=[];so.over={};so.ids=new Set(ids||[]);so.open=true;
  so.conn="team";so.role=o.role||"member";so.as=o.as||"login";keep();view="invite";render();const b=document.getElementById("soBox");if(b&&b.scrollIntoView)b.scrollIntoView({block:"start"})};
function redraw(){const el=document.getElementById("soBox");if(!el)return;const y=window.scrollY;el.outerHTML=soHTML();window.scrollTo(0,y)}
window.soRedraw=redraw;

/* ---------- make the send list ---------- */
const startText=()=>typeof window.invStartText==="function"?window.invStartText():"Try Accounted For: "+PUB()+"#start";
const linkText=(role,label,url)=>typeof window.invLinkText==="function"?window.invLinkText(role,label,url):unitName()+" · Accounted For\nRole: "+role+" · "+label+"\n\nOpen this link on your phone: "+url;
function loginText(L){const t=lgText(L);return L.self?t.replace(/Password: [^\n]*/,"Password: use the one you set yourself"):t}
function findLogin(dest,mid){return (S.logins||[]).find(L=>L.dest===dest&&(dest.startsWith("me:")||L.mid===mid))}
async function make(){const ps=people();const team=so.conn==="team";const todo=team?ps.filter(p=>!destFor(p).err):ps;if(!todo.length||so.busy)return;
  so.busy=true;so.msg="";redraw();const out=[],links={};let made=0,reused=0,bad=0;
  for(const p of todo){const it={k:p.k,name:p.name,phone:p.phone&&digits(p.phone).length>=7?p.phone:"",email:isEmail(p.email)?p.email.trim():"",role:"Own team",sub:"Try Accounted For"};
    try{if(!team){it.text=startText()}
      else{const r=destFor(p),dest=r.d.id;it.role=lgRoleOf(dest);it.sub=unitName()+" · Accounted For"+(so.as==="login"?" login":"");
        if(so.as==="link"){if(!links[dest]){const hh=await lgHash(dest,true);if(!hh)throw new Error("That page isn't available on this phone.");links[dest]=PUB()+"#"+hh}
          it.text=linkText(it.role,r.d.l,links[dest])}
        else{let L=findLogin(dest,r.mid);if(L)reused++;
          else{let tries=0;while(!L&&tries<3){tries++;try{L=await lgCreate(dest,lgUser(p.m?String(p.m.name||"").split(",")[0]:p.name),lgPw(),{label:r.label,mid:r.mid})}catch(e){if(!/taken/.test(String(e&&e.message)))throw e}}
            if(!L)throw new Error("Couldn't find a free username.");made++}
          it.uid=L.uid;it.self=!!L.self;it.text=loginText(L)}}}
    catch(e){it.err=typeof lgErr==="function"?lgErr(e):String(e&&e.message||e);bad++}
    out.push(it);so.msg=(team&&so.as==="login"?"Made ":"Ready ")+out.length+" of "+todo.length+"…";const s=document.querySelector("#soBox [role=status]");if(s)s.textContent=so.msg}
  so.busy=false;so.list=out;so.sent=new Set();
  so.msg=team&&so.as==="login"?[made?"Made "+made+" new login"+(made===1?"":"s"):"",reused?reused+" already had one (same login sent again)":"",bad?bad+" failed":""].filter(Boolean).join(" · "):bad?bad+" failed":"";
  if(team&&so.as==="login"&&made)actAdd("🔑","Made "+made+" logins with Send out.","live");keep();redraw();const b=document.getElementById("soBox");if(b&&b.scrollIntoView)b.scrollIntoView({block:"start"})}

/* ---------- the send list ---------- */
const sameText=()=>{const L=(so.list||[]).filter(x=>!x.err);return L.length>1&&L.every(x=>x.text===L[0].text)};
function listHTML(){const L=so.list,ok=L.filter(x=>!x.err),left=ok.filter(x=>!so.sent.has(x.k));const nx=left[0];
  const em=ok.filter(x=>x.email);
  let h=`<div class="panel" id="soBox" data-noxl style="border-color:var(--s-onhand)"><b>Send list · ${ok.length}</b>${so.msg?`<p class="note" style="margin:2px 0 0">${esc(so.msg)}</p>`:""}
    <p class="note" style="margin:2px 0 6px">Texts go one at a time: Send next opens Messages with their own message filled in. Tap send there, then come back.</p>
    <button type="button" class="btn" id="soNext" style="width:100%"${nx?"":" disabled"}>${nx?"Send next · "+esc(nx.name)+(nx.phone?" (text)":nx.email?" (email)":" (copy)")+" · "+left.length+" left":"✓ All sent"}</button>
    <div class="row2"><button type="button" class="btn alt" id="soCopyAll">Copy all</button>${sameText()&&em.length?`<button type="button" class="btn alt" id="soBcc">Email all at once (BCC)</button>`:""}</div>
    ${sameText()&&ok.filter(x=>x.phone).length>1?`<button type="button" class="btn alt" id="soGroup" style="width:100%">${armed==="sogroup"?"Tap again: everyone in the group sees each other's numbers":"Group text all "+ok.filter(x=>x.phone).length}</button>`:""}
    ${(()=>{const n=notIn().length;return n?`<button type="button" class="btn alt" id="soResend" style="width:100%">Resend to ${n} who haven't signed in</button>`:""})()}
    ${fillBtn(L.filter(x=>!x.err&&/^r:/.test(x.k)).map(x=>({k:x.k,m:S.roster.find(m=>"r:"+m.id===x.k),phone:x.phone,email:x.email})))}
    <div class="alist">${L.map(x=>{const s=so.sent.has(x.k);return `<div class="rrow" data-soitem="${esc(x.k)}" style="--sc:var(${x.err?"--warn":s?"--s-onhand":"--line"})"><div class="who"><b>${s?"✓ ":""}${esc(x.name)}</b> <span class="chip">${esc(x.role)}</span><div class="ph">${x.err?"<b>"+esc(x.err)+"</b>":esc(x.phone||x.email||"no phone or email · copy it")+(s?" · Sent":"")+(x.self?" · set their own password":"")+(usedAt(x)?" · <b>signed in "+esc(ago(usedAt(x)))+"</b>":"")}</div></div>
      ${x.err?"":`<div class="row2">${x.phone?`<button type="button" class="btn alt" data-sogo="sms" data-sok="${esc(x.k)}">Text</button>`:""}${x.email?`<button type="button" class="btn alt" data-sogo="mail" data-sok="${esc(x.k)}">Email</button>`:""}<button type="button" class="btn alt" data-sogo="copy" data-sok="${esc(x.k)}">Copy</button></div>`}</div>`}).join("")}</div>
    <button type="button" class="btn alt" id="soDone" style="width:100%">Done</button></div>`;
  setTimeout(states,0);return h}
/* who has signed in with their login (checked at most once a minute) */
const usedAt=x=>{if(!x.uid)return 0;const L=(S.logins||[]).find(l=>l.uid===x.uid);return L&&L.used||0};
const notIn=()=>(so.list||[]).filter(x=>!x.err&&x.uid&&so.sent.has(x.k)&&!usedAt(x));
let stAt=0;
async function states(){const U=(so.list||[]).filter(x=>x.uid).map(x=>x.uid);if(!U.length||!S.lgOwner||Date.now()-stAt<60000)return;stAt=Date.now();
  try{const rs=await SB.rpc("login_states",{p_uids:U,p_owner:S.lgOwner});let ch=false;
    for(const r of rs||[]){const L=(S.logins||[]).find(l=>l.uid===r.uid);if(!L)continue;const used=r.used_at?Date.parse(r.used_at):0,self=r.self_set?1:0;if((L.used||0)!==used||(L.self||0)!==self){L.used=used;L.self=self;ch=true}}
    if(ch){save();redraw()}}catch(e){}}
/* fill in missing phone numbers and emails from the phone's contacts */
function fillBtn(ps){const n=ps.filter(p=>p.m&&!(p.phone&&digits(p.phone).length>=7)&&!p.email).length;
  return n?`<button type="button" class="btn alt" id="soFill" style="width:100%;margin-top:6px">Find ${n} missing number${n===1?"":"s"} in Contacts</button><input type="file" id="soVcf" accept=".vcf,text/vcard,text/x-vcard" hidden>`:""}
const nm=s=>String(s||"").toLowerCase().replace(/[^a-z, ]/g,"").trim();
function split(n){n=nm(n);if(n.includes(","))return {l:n.split(",")[0].trim(),f:(n.split(",")[1]||"").trim().split(/\s+/)[0]||""};const w=n.split(/\s+/);return {l:w[w.length-1]||"",f:w.length>1?w[0]:""}}
function fill(L){const pool=(L||[]).filter(c=>c&&(c.ph||c.em)).map(c=>Object.assign({},c,split(c.n)));
  const want=so.list?so.list.filter(x=>!x.err&&/^r:/.test(x.k)&&!x.phone&&!x.email).map(x=>S.roster.find(m=>"r:"+m.id===x.k)).filter(Boolean)
    :people().filter(p=>p.m&&!contact(p)).map(p=>p.m);
  let got=0;
  for(const m of want){const me=split(m.name);const c=pool.filter(c=>c.l===me.l&&(!me.f||!c.f||c.f===me.f));if(c.length!==1)continue;
    if(c[0].ph&&!m.phone)m.phone=c[0].ph;if(c[0].em&&!m.email)m.email=String(c[0].em).slice(0,80);got++;
    if(so.list)for(const x of so.list)if(x.k==="r:"+m.id){x.phone=m.phone&&digits(m.phone).length>=7?m.phone:"";x.email=isEmail(m.email)?m.email:""}}
  keep();redraw();toast(got?"Found "+got+" of "+want.length+(want.length-got?". "+(want.length-got)+" still missing.":"."):"No matches in those contacts. Check the names match your roster.")}
async function fillStart(){try{const L=typeof window.ctFetch==="function"?await window.ctFetch():null;if(L)return fill(L);const f=$("#soVcf");if(f){f.value="";f.click()}}
  catch(e){if(e&&e.name==="AbortError")return;const f=$("#soVcf");if(f){f.value="";f.click()}}}
function copy(t,msg){try{navigator.clipboard.writeText(t).then(()=>toast(msg||"Copied"),()=>toast("Copy blocked here."))}catch(e){toast("Copy blocked here.")}}
function logSend(x,how){S.invLog=S.invLog||[];const rm=String(x.text).match(/Role: ([^·\n]+?) · ([^\n]+?)(?:\.|\n|$)/);
  S.invLog.unshift({t:Date.now(),to:(how==="copy"?x.name:x.phone||x.email||x.name).slice(0,60),kind:x.role==="Own team"?"start":x.uid?"login":"team",role:rm?rm[1].trim().slice(0,30):x.role==="Own team"?"Own team":"",label:rm?rm[2].trim().slice(0,50):x.name.slice(0,50),how});S.invLog=S.invLog.slice(0,200)}
function go(x,how){if(!x||x.err)return;
  if(how==="sms"&&x.phone){so.sent.add(x.k);logSend(x,"sms");keep();redraw();location.href="sms:"+phoneOf(x.phone)+(iOS()?"&":"?")+"body="+encodeURIComponent(x.text);return}
  if(how==="mail"&&x.email){so.sent.add(x.k);logSend(x,"mail");keep();redraw();location.href="mailto:"+encodeURIComponent(x.email)+"?subject="+encodeURIComponent(x.sub)+"&body="+encodeURIComponent(x.text);return}
  so.sent.add(x.k);logSend(x,"copy");keep();redraw();copy(x.text,"Copied "+x.name+"'s message. Paste it to them.")}

/* ---------- events ---------- */
const item=k=>(so.list||[]).find(x=>x.k===k);
document.addEventListener("click",e=>{const t=e.target;if(!t.closest||!t.closest("#soBox"))return;let b;
  if((b=t.closest("[data-soall]"))){so.all=!so.all;if(so.all){so.secs=new Set();}return redraw()}
  if((b=t.closest("[data-sosec]"))){const k=b.dataset.sosec;so.secs.has(k)?so.secs.delete(k):so.secs.add(k);return redraw()}
  if((b=t.closest("[data-soconn]"))){so.conn=b.dataset.soconn;return redraw()}
  if((b=t.closest("[data-soas]"))){so.as=b.dataset.soas;return redraw()}
  if((b=t.closest("[data-soxdel]"))){so.extra=so.extra.filter(x=>x.k!==b.dataset.soxdel);delete so.over[b.dataset.soxdel];return redraw()}
  if(t.closest("#soXAdd")){const n=(($("#soXN")||{}).value||"").trim().slice(0,60),to=(($("#soXT")||{}).value||"").trim().slice(0,80);
    if(!n){toast("Type their name.");return}if(!isEmail(to)&&digits(to).length<7){toast("Type a phone number with area code, or an email.");return}
    so.extra.push({k:"x:"+(++so.xid),name:n,phone:isEmail(to)?"":to,email:isEmail(to)?to:""});
    S.soRecent=[{name:n,phone:isEmail(to)?"":to,email:isEmail(to)?to:""}].concat((S.soRecent||[]).filter(r=>r.name!==n)).slice(0,12);save();
    return redraw()}
  if(t.closest("#soMake")){make();return}
  if(t.closest("#soDone")){so.list=null;so.sent=new Set();so.msg="";keep();return redraw()}
  if(t.closest("#soFill")){fillStart();return}
  if(t.closest("#soResend")){for(const x of notIn())so.sent.delete(x.k);keep();toast("Send next goes to them again.");return redraw()}
  if(t.closest("#soGroup")){if(armed!=="sogroup"){armed="sogroup";return redraw()}armed=null;const ok=(so.list||[]).filter(x=>!x.err&&x.phone);ok.forEach(x=>{so.sent.add(x.k);logSend(x,"sms")});keep();redraw();
    const to=ok.map(x=>phoneOf(x.phone)).join(",");location.href=iOS()?"sms:/open?addresses="+to+"&body="+encodeURIComponent(ok[0].text):"sms:"+to+"?body="+encodeURIComponent(ok[0].text);return}
  if((b=t.closest("[data-sorec]"))){const r=(S.soRecent||[])[+b.dataset.sorec];if(r&&!so.extra.some(x=>x.name===r.name))so.extra.push({k:"x:"+(++so.xid),name:r.name,phone:r.phone||"",email:r.email||""});return redraw()}
  if(t.closest("#soNext")){const nx=(so.list||[]).find(x=>!x.err&&!so.sent.has(x.k));if(nx)go(nx,nx.phone?"sms":nx.email?"mail":"copy");return}
  if(t.closest("#soCopyAll")){const ok=(so.list||[]).filter(x=>!x.err);copy(sameText()?ok[0].text:ok.map(x=>"— "+x.name+(x.phone||x.email?" ("+(x.phone||x.email)+")":"")+"\n"+x.text).join("\n\n"),"Copied all "+ok.length);return}
  if(t.closest("#soBcc")){const ok=(so.list||[]).filter(x=>!x.err&&x.email);if(!ok.length)return;ok.forEach(x=>{so.sent.add(x.k);logSend(x,"mail")});keep();redraw();
    location.href="mailto:?bcc="+encodeURIComponent(ok.map(x=>x.email).join(","))+"&subject="+encodeURIComponent(ok[0].sub)+"&body="+encodeURIComponent(ok[0].text);return}
  if((b=t.closest("[data-sogo]"))){go(item(b.dataset.sok),b.dataset.sogo);return}});
document.addEventListener("change",e=>{const t=e.target;if(!t.closest||!t.closest("#soBox"))return;
  if(t.dataset.sop!=null){t.checked?so.ids.add(t.dataset.sop):so.ids.delete(t.dataset.sop);so.open=true;return redraw()}
  if(t.id==="soRole"){so.role=t.value;so.over={};return redraw()}
  if(t.dataset.sorole!=null){if(t.value)so.over[t.dataset.sorole]=t.value;return redraw()}});
document.addEventListener("change",async e=>{if(e.target.id!=="soVcf")return;const f=e.target.files&&e.target.files[0];if(!f||typeof window.parseVCF!=="function")return;fill(window.parseVCF(await f.text()))});
document.addEventListener("toggle",e=>{if(e.target&&e.target.id==="soPickD")so.open=e.target.open},true);
document.addEventListener("input",e=>{if(e.target.id!=="soQ")return;const q=e.target.value.trim().toLowerCase();
  document.querySelectorAll("#soBox [data-sorow]").forEach(r=>r.style.display=!q||r.dataset.sorow.includes(q)?"flex":"none")});

/* Home: pick up an unfinished send list */
if(typeof renderBoard==="function"){const _rb=renderBoard;renderBoard=function(){const r=_rb.apply(this,arguments);try{if(so.list&&own()){const left=so.list.filter(x=>!x.err&&!so.sent.has(x.k)).length;
  if(left)$("#main").insertAdjacentHTML("afterbegin",`<div class="banner" id="soBan"><span><b>📤 Send list: ${left} left</b> to send.</span><button data-go="invite">Continue</button></div>`)}}catch(e){}return r}}
/* Logins screen: a button that opens Send out */
if(typeof renderLogins==="function"){const _rl=renderLogins;renderLogins=function(){_rl.apply(this,arguments);if(!own())return;const h=document.querySelector("#main h2");
  if(h&&!document.getElementById("soLg"))h.insertAdjacentHTML("afterend",`<button type="button" class="btn" id="soLg" data-go="invite" style="width:100%;margin:0 0 10px">Send out to many people…</button>`)}}

if(typeof HELP==="object"&&HELP.invite&&Array.isArray(HELP.invite[2]))HELP.invite[2].unshift("Send out (top of Invite): pick Everyone, sections or people, choose Linked to this roster or Building their own team, set a role (change anyone's), then a login or a link. Make them, then Send next texts or emails each person their own message.");
})();
