/* Accounted For 1.4: Invite.
   1) Connect them to your team: pick a role, get a link (or a login) that opens your board's page for that role.
   2) Let them start their own team: a link that sets up a brand-new team on their phone. Nothing connects back.
   Either one can go to any phone number or email. Nothing is added to the roster. */
(()=>{
let inv={dest:"",out:null,busy:false,msg:""};
const isEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||"").trim());
const phoneOf=v=>{const d=String(v||"").replace(/[^\d+]/g,"");if(!d)return "";const n=d.replace(/\D/g,"");return d.startsWith("+")?"+"+n:n.length===10?"+1"+n:n.length===11&&n[0]==="1"?"+"+n:n};
const appLinks=()=>({ios:(typeof STORE_URL==="object"&&STORE_URL.ios)||"https://apps.apple.com/app/id6826541947",web:PUB()});
const startURL=()=>PUB()+"#start";
function startText(){const L=appLinks();return "Try Accounted For to run your own team: headcount, check-ins and getting the word out.\n\niPhone app: "+L.ios+"\nOr on the web: "+startURL()+"\n\nIt sets up your own team. Nothing is shared with me."}
function linkText(role,label,url){return unitName()+" · Accounted For\nRole: "+role+" · "+label+"\n\nOpen this link on your phone: "+url+"\n\nNo app yet? iPhone: "+appLinks().ios+" (install it, then tap the link again).\nKeep this link private: it opens "+label+"."}

/* a send box: any phone number or email, nothing saved */
function sendBox(id,text,subject){return `<div class="invsend" data-invtext="${esc(text)}" data-invsub="${esc(subject||"Accounted For")}" data-noxl>
  <label for="invTo${id}">Send to a phone number or email</label><input id="invTo${id}" class="invto" type="text" inputmode="email" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="(808) 555-0123 or name@example.com">
  <div class="row2"><button class="btn" data-invgo="sms">Text it</button><button class="btn" data-invgo="mail">Email it</button></div>
  <div class="row2"><button class="btn alt" data-invgo="share">Share…</button><button class="btn alt" data-invgo="copy">Copy</button></div>
  <p class="note" style="margin:0">Not added to your roster. Nothing is saved.</p></div>`}
window.invSendBox=sendBox;
document.addEventListener("click",e=>{const b=e.target.closest("[data-invgo]");if(!b)return;const box=b.closest(".invsend");if(!box)return;e.stopImmediatePropagation();
  const how=b.dataset.invgo,text=box.dataset.invtext||"",sub=box.dataset.invsub||"Accounted For",to=(box.querySelector(".invto")||{}).value||"";
  if(how==="copy"){try{navigator.clipboard.writeText(text).then(()=>toast("Copied"),()=>toast("Copy blocked here. Use Share."))}catch(err){toast("Copy blocked here. Use Share.")}return}
  if(how==="share"){if(navigator.share)navigator.share({title:sub,text}).catch(()=>{});else{try{navigator.clipboard.writeText(text).then(()=>toast("Copied. Paste it anywhere."))}catch(err){}}return}
  if(how==="mail"){if(to.trim()&&!isEmail(to)){toast("That doesn't look like an email. Check it, or leave it blank and pick in your mail app.");return}
    location.href="mailto:"+encodeURIComponent(to.trim())+"?subject="+encodeURIComponent(sub)+"&body="+encodeURIComponent(text);return}
  if(how==="sms"){if(isEmail(to)){toast("That's an email. Tap Email it.");return}const p=phoneOf(to);if(to.trim()&&p.replace(/\D/g,"").length<7){toast("Check the phone number.");return}
    location.href="sms:"+p+(/iPhone|iPad|Mac/.test(navigator.userAgent)?"&":"?")+"body="+encodeURIComponent(text)}},true);

/* ---------- the Invite screen ---------- */
function renderInvite(){let h=`<h2>Invite</h2>`;
  const own=typeof isOwner==="function"&&isOwner();
  h+=`<div class="panel"><b>Connect them to your team</b><p class="note" style="margin:0">They open the link and land on the page for their role. Their updates come to you.</p>`;
  if(!own){h+=`<p class="note">Only the phone that runs the board can invite people to it. You can still send the app so they can start their own team (below).</p></div>`}
  else{const RL=lgRoles();const cur=RL.find(r=>r.ds.some(x=>x.id===inv.dest))||RL.find(r=>r.ds.length);
    if(!cur){h+=`<p class="note">Nothing to share yet. Load your roster in DATA, or turn on Live sections, first.</p></div>`}
    else{if(!cur.ds.some(x=>x.id===inv.dest))inv.dest=cur.ds[0].id;
      h+=`<label for="invRole">Role</label><select id="invRole" style="width:100%">${RL.map(r=>`<option value="${r.k}"${r===cur?" selected":""}${r.ds.length?"":" disabled"}>${esc(r.n)}${r.ds.length?"":" (not set up)"}</option>`).join("")}</select>
        <p class="note" style="margin:4px 0 0">${esc(cur.d)}</p>${cur.k==="member"&&typeof window.invPvBtn==="function"?window.invPvBtn():""}
        ${cur.ds.length>1?`<label for="invDest">${cur.k==="member"?"Person":cur.k==="secl"?"Section":"Which one"}</label><select id="invDest" style="width:100%">${cur.ds.map(x=>`<option value="${esc(x.id)}"${x.id===inv.dest?" selected":""}>${esc(x.l)}</option>`).join("")}</select>`:""}
        <div class="row2"><button class="btn" id="invLink"${inv.busy?" disabled":""}>${inv.busy?"Making…":"Make a link"}</button><button class="btn alt" data-go="logins">Make a login instead</button></div>
        <div class="note" role="status">${esc(inv.msg)}</div>`;
      if(inv.out&&inv.out.dest===inv.dest)h+=`<div class="panel" style="margin:6px 0 0;border-color:var(--s-onhand)"><b>Link ready · ${esc(inv.out.label)}</b> <span class="chip">${esc(inv.out.role)}</span>
        <div class="note" style="word-break:break-all;user-select:all;margin:6px 0">${esc(inv.out.url)}</div>${sendBox("C",inv.out.text,unitName()+" · Accounted For")}</div>`;
      h+=`</div>`}}
  h+=`<div class="panel"><b>Let them start their own team</b><p class="note" style="margin:0">For another leader, coach or manager. They get the app and set up their own board with their own people. <b>Nothing connects back to you</b>, and you don't see their information.</p>
    <div class="note" style="word-break:break-all;user-select:all;margin:6px 0">${esc(startURL())}</div>${sendBox("S",startText(),"Try Accounted For")}</div>`;
  $("#main").innerHTML=h}
async function makeLink(){const RL=lgRoles();const d=lgDests().find(x=>x.id===inv.dest);if(!d){inv.msg="Pick a role first.";return renderInvite()}
  inv.busy=true;inv.msg="";renderInvite();
  try{const hh=await lgHash(inv.dest,true);if(!hh)throw new Error("That page isn't available on this phone.");const url=PUB()+"#"+hh;const role=lgRoleOf(inv.dest);
    inv.out={dest:inv.dest,url,role,label:d.l,text:linkText(role,d.l,url)};actAdd("🔗","Made a "+role.toLowerCase()+" link for "+d.l+".","live")}
  catch(e){inv.msg=typeof lgErr==="function"?lgErr(e):String(e&&e.message||e)}
  finally{inv.busy=false;renderInvite()}}
document.addEventListener("click",e=>{if(e.target.closest("#invLink")){e.stopImmediatePropagation();makeLink()}});
document.addEventListener("change",e=>{if(e.target.id==="invRole"){const r=lgRoles().find(x=>x.k===e.target.value);if(r&&r.ds.length){inv.dest=r.ds[0].id;inv.out=null;inv.msg="";renderInvite()}}
  else if(e.target.id==="invDest"){inv.dest=e.target.value;inv.out=null;inv.msg="";renderInvite()}});

/* hook into the app */
{const _render=render;render=function(){if(view==="invite"){renderTabs();renderInvite();if(typeof animateView==="function")animateView();return}return _render.apply(this,arguments)}}
{const _rt=renderTools;renderTools=function(){_rt.apply(this,arguments);const g=document.querySelector("#main .tgrid");if(!g)return;
  g.insertAdjacentHTML("afterbegin",`<button data-go="invite"><span class="ic">${svg("send")}</span><span><b>Invite</b><small>Link with a role, or their own team</small></span></button>`)}}
if(typeof HELP==="object")HELP.invite=["Invite","Bring people onto your team, or send the app to someone who wants their own.",["Connect them to your team: pick a role and Make a link. Text or email it to any number or address. They don't have to be on your roster.","Make a login instead gives a username and password with the same role.","Let them start their own team: they get the app and their own board. Nothing connects back to you."]];
/* the login-ready card: send to any number or email too */
if(typeof renderLogins==="function"){const _rl=renderLogins;renderLogins=function(){_rl.apply(this,arguments);if(typeof lgLast==="undefined"||!lgLast)return;const L=(S.logins||[]).find(x=>x.uid===lgLast);if(!L)return;
  const done=document.getElementById("lgDone");if(done)done.insertAdjacentHTML("beforebegin",sendBox("L",lgText(L),unitName()+" · Accounted For login"))}}

/* #start: a link that sets up a brand-new team on this phone */
function startOwn(){try{history.replaceState(null,"",location.pathname)}catch(e){}
  if(typeof isLeaderPhone==="function"&&isLeaderPhone()&&S.source!=="sample"){toast("This phone already runs a team. Open the link on the new leader's phone.");return}
  S.welcomed=1;save();if(typeof window.hideWelcome==="function")window.hideWelcome();const w=document.getElementById("v11Welcome");if(w){w.hidden=true;document.body.classList.remove("v11w-open")}
  setTimeout(()=>openModeSheet(true),200)}
window.addEventListener("hashchange",()=>{if((location.hash||"").toLowerCase()==="#start")startOwn()});
if(/^#start$/i.test(location.hash||""))setTimeout(startOwn,700);
})();
