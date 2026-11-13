// 4.97: Settings, organized like iPhone Settings. The gear opens grouped rows with icons, toggles and chevrons;
// each row drills into its own page with a back button. Teams has "Join a team with a link", so one phone can be in
// several teams. The old long page stays under "More settings and data".
(()=>{
const G={
  people:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M17 5.5a3.5 3.5 0 0 1 0 6"/><path d="M18.5 14.2A6.5 6.5 0 0 1 21.5 20"/>',
  link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  moon:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18"/>',
  signal:'<path d="M4 18v-2"/><path d="M9 18v-6"/><path d="M14 18V9"/><path d="M19 18V5"/>',
  spark:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8v.1"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>'};
const ico=(k,c)=>`<span class="ios-ic" style="background:${c}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${G[k]}</svg></span>`;
const chev='<svg class="ios-ch" width="9" height="15" viewBox="0 0 9 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 1.5l6 6-6 6"/></svg>';
const row=(o)=>o.sw!=null?`<label class="ios-row">${o.ic?ico(o.ic,o.c):""}<span class="ios-t">${o.t}</span><input type="checkbox" class="ios-sw" ${o.id?`id="${o.id}"`:""}${o.attr||""}${o.sw?" checked":""} role="switch"></label>`
  :`<button class="ios-row" ${o.go?`data-sp="${o.go}"`:""}${o.attr||""}>${o.ic?ico(o.ic,o.c):""}<span class="ios-t">${o.t}</span>${o.v?`<span class="ios-v">${o.v}</span>`:""}${chev}</button>`;
const grp=(rows,foot)=>`<div class="ios-grp">${rows.join("")}</div>${foot?`<p class="ios-foot">${foot}</p>`:""}`;
const SP={p:""};
const theme=()=>S.theme==="dark"||S.theme==="light"?S.theme:"";
const applyTheme=()=>{const r=document.documentElement;if(theme())r.setAttribute("data-theme",theme());else r.removeAttribute("data-theme")};
applyTheme();
const dark=()=>theme()?theme()==="dark":(()=>{try{return matchMedia("(prefers-color-scheme: dark)").matches}catch(e){return false}})();
const teamsList=()=>window.TEAMS?TEAMS.list():[];
const spanish=()=>S.lang==="es"||(!S.lang&&/^es\b/i.test(navigator.language||""));
const joined=()=>(S.feeds||[]).filter(f=>!f.lk);
const top=(title,back)=>`<div class="ios-top"><button class="ios-back" data-spback="1" aria-label="Back">${back?'<svg width="12" height="20" viewBox="0 0 12 20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2L2 10l8 8"/></svg>':""}</button><h1>${title}</h1><span></span></div>`;
function pageRoot(){const n=teamsList().length||1;
  return `<h1 class="ios-h1">Settings</h1>
  <div class="ios-grp"><button class="ios-prof" data-sp="teams"><span class="ios-av">${esc((unitName()||"A")[0])}</span><span class="ios-pt"><b>${esc(unitName())}</b><small>${S.roster&&S.source!=="sample"?S.roster.length+" people · ":""}${n} team${n===1?"":"s"}</small></span>${chev}</button></div>
  ${grp([row({ic:"people",c:"#1457d6",t:"Teams",v:String(n),go:"teams"}),row({ic:"link",c:"#34a1eb",t:"Join a team with a link",go:"join"})])}
  ${grp([row({ic:"bell",c:"#e5484d",t:"Alerts on this phone",sw:!!S.pushOn,id:"spPush"}),row({ic:"signal",c:"#2f9e5a",t:"Field mode",sw:!!S.field,id:"fmOn"}),row({ic:"globe",c:"#7a5af8",t:"Español",sw:spanish(),attr:' data-splang="1"'})],"Field mode keeps the app usable with weak or no signal.")}
  ${grp([row({ic:"moon",c:"#4a5568",t:"Appearance",v:theme()?(theme()==="dark"?"Dark":"Light"):"Automatic",go:"appear"}),row({ic:"spark",c:"#f59e0b",t:"Smart help",attr:' data-go="assist"'})])}
  ${grp([row({ic:"gear",c:"#8a94a3",t:"More settings and data",attr:' data-go="data"'}),row({ic:"shield",c:"#2f9e5a",t:"Privacy and terms",go:"legal"}),row({ic:"info",c:"#5b6673",t:"About",v:esc(String(window.AV||"")),go:"about"})])}`}
function pageTeams(){const cur=window.TEAMS?teamsList():[];
  const mine=cur.map(k=>{const on=(typeof S.wsCur==="undefined"?"plt":(S.wsCur==="co"?"plt":S.wsCur||"plt"))===k;return `<div class="ios-row"><span class="ios-t"><b>${esc(TEAMS.nameOf(k))}</b>${on?`<small class="ios-sub">Open now</small>`:""}</span>${on?`<span class="ios-ok">${ico("check","#34c759")}</span>`:`<button class="chip" data-spopen="${esc(k)}" style="cursor:pointer">Open</button>`}</div>`});
  const fd=joined().map(f=>`<div class="ios-row"><span class="ios-t"><b>${esc(f.unit)}</b><small class="ios-sub">Word of Mouth feed you joined</small></span></div>`);
  return top("Teams",1)+grp(mine.length?mine:[`<div class="ios-row"><span class="ios-t">${esc(unitName())}</span></div>`])+(fd.length?`<p class="ios-sec">Joined by link</p>`+grp(fd):"")
    +grp([row({ic:"link",c:"#34a1eb",t:"Join a team with a link",go:"join"}),row({ic:"plus",c:"#1457d6",t:"Start a new team",attr:' data-go="teams"'})],"Each team keeps its own people, Word of Mouth and settings. You can be in as many as you like.")}
function pageJoin(){return top("Join a team",1)+`<div class="ios-grp"><div class="ios-pad"><p class="ios-foot" style="margin:0 0 10px">Got an invite link by text or email? Paste the whole link. It opens as its own team. Your other teams stay as they are.</p>
  <input type="url" id="spLink" placeholder="https://…#…" autocapitalize="none" autocorrect="off" spellcheck="false" class="ios-in"><button class="btn" id="spJoin" style="width:100%;margin-top:10px">Join this team</button><p class="ios-foot" id="spMsg" role="status" style="margin:8px 0 0"></p></div></div>`}
function pageAppear(){const d=dark(),auto=!theme();
  const ph=(k,on)=>`<button class="ios-ph ${k}" data-sptheme="${k}"${auto?" disabled":""} aria-pressed="${on}"><span class="ios-scr"><i>09:41</i><b></b><b></b></span><span>${k==="light"?"Light":"Dark"}</span><span class="ios-rad${on?" on":""}">${on?'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>':""}</span></button>`;
  return top("Appearance",1)+`<div class="ios-grp"><div class="ios-phs">${ph("light",!d)}${ph("dark",d)}</div>${row({t:"Automatic",sw:auto,id:"spAuto"})}</div><p class="ios-foot">Automatic follows your phone's light and dark setting.</p>`}
function pageLegal(){return top("Privacy and terms",1)+grp([`<a class="ios-row" href="privacy.html" target="_blank" rel="noopener"><span class="ios-t">Privacy policy</span>${chev}</a>`,`<a class="ios-row" href="terms.html" target="_blank" rel="noopener"><span class="ios-t">Terms of use</span>${chev}</a>`])}
function pageAbout(){return top("About",1)+grp([`<div class="ios-row"><span class="ios-t">Version</span><span class="ios-v">${esc(String(window.AV||""))}</span></div>`,`<div class="ios-row"><span class="ios-t">App</span><span class="ios-v">Accounted For</span></div>`],"An independent app. Not an official system of, or endorsed by, any government or military service.")}
function html(){const p=SP.p;return `<div class="ios-wrap">${p==="teams"?pageTeams():p==="join"?pageJoin():p==="appear"?pageAppear():p==="legal"?pageLegal():p==="about"?pageAbout():pageRoot()}</div>`}
const _r=render;render=function(){if(view==="data"&&SP.from){const r=_r.apply(this,arguments);const m=$("#main");if(m&&!m.querySelector("#spBackData"))m.insertAdjacentHTML("afterbegin",`<button class="btn alt" id="spBackData" style="margin:8px 0">‹ Settings</button>`);return r}if(view==="settings"){if(typeof renderTabs==="function")try{renderTabs()}catch(e){}$("#main").innerHTML=html();return}return _r.apply(this,arguments)};
function open(){SP.p="";SP.from=0;view="settings";armed=null;render();window.scrollTo(0,0)}
document.addEventListener("click",e=>{if(e.target.closest&&e.target.closest("#spBackData")){open();return}if(view==="settings"&&e.target.closest&&e.target.closest("[data-go='data']"))SP.from=1;if(view!=="settings")return;const t=e.target;
  const g=t.closest("[data-sp]");if(g){SP.p=g.dataset.sp;render();window.scrollTo(0,0);return}
  if(t.closest("[data-spback]")){if(SP.p)SP.p="";else{view="tools";}render();window.scrollTo(0,0);return}
  const o=t.closest("[data-spopen]");if(o){TEAMS.switchTo(o.dataset.spopen);return}
  const th=t.closest("[data-sptheme]");if(th&&!th.disabled){S.theme=th.dataset.sptheme;save();applyTheme();render();return}
  if(t.id==="spJoin"){const v=(($("#spLink")||{}).value||"").trim();const i=v.indexOf("#");const m=$("#spMsg");
    if(i<0||v.length-i<6){if(m)m.textContent="That doesn't look like an invite link. Copy the whole link from the text.";return}
    const hash=v.slice(i);S.welcomed=1;if(!S.mode)S.mode="military";save();
    if(window.TEAMS&&S.source!=="sample"&&Array.isArray(S.roster)&&S.roster.length){if(m)m.textContent="Opening the new team…";TEAMS.openNew(hash);return}
    location.hash=hash;setTimeout(()=>location.reload(),60);return}});
document.addEventListener("change",e=>{if(view!=="settings")return;const t=e.target;
  if(t.id==="spAuto"){if(t.checked)S.theme="";else S.theme=dark()?"dark":"light";save();applyTheme();render();return}
  if(t.id==="spPush"){if(t.checked){pushSub(true).then(sub=>{if(!sub){toast("Alerts not allowed on this phone");t.checked=false;return}S.pushOn=true;save();try{pushAttach()}catch(err){}toast("Alerts on")}).catch(()=>{t.checked=false;toast("Couldn't turn alerts on")})}else{S.pushOn=false;save();toast("Alerts off in the app")}return}
  if(t.dataset.splang){const b=document.createElement("button");b.dataset.lang=spanish()?"en":"es";document.body.appendChild(b);b.click();b.remove()}});
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="spLink"){e.preventDefault();const b=$("#spJoin");if(b)b.click()}});
const st=document.createElement("style");st.textContent=`
.ios-wrap{max-width:640px;margin:0 auto;padding:6px 0 28px}
.ios-h1{font-size:34px;font-weight:800;letter-spacing:-.02em;margin:18px 4px 14px}
.ios-top{display:grid;grid-template-columns:48px 1fr 48px;align-items:center;margin:4px 0 14px}.ios-top h1{margin:0;font-size:17px;text-align:center}
.ios-back{all:unset;cursor:pointer;width:44px;height:44px;border-radius:50%;background:var(--surface-solid);border:1px solid var(--line);display:inline-flex;align-items:center;justify-content:center;color:var(--ink);box-shadow:0 2px 8px rgba(0,0,0,.08)}
.ios-grp{background:var(--surface-solid);border-radius:22px;margin:0 0 8px;overflow:hidden}
.ios-row{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:14px;width:100%;min-height:54px;padding:8px 18px 8px 16px;cursor:pointer;color:var(--ink);font-size:17px;position:relative}
.ios-row+.ios-row::before,.ios-row+.ios-prof::before{content:"";position:absolute;top:0;left:62px;right:0;border-top:1px solid var(--line)}
a.ios-row{text-decoration:none}.ios-row:active{background:var(--surface-2)}.ios-row:focus-visible{outline:2px solid var(--brass);outline-offset:-2px}
.ios-ic{width:30px;height:30px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;flex:none}
.ios-t{flex:1;min-width:0}.ios-t b{font-weight:700;display:block}.ios-sub{display:block;color:var(--muted);font-size:13px;margin-top:2px}
.ios-v{color:var(--muted);font-size:16px}.ios-ch{color:var(--muted);flex:none;opacity:.7}
.ios-foot{color:var(--muted);font-size:13.5px;line-height:1.4;margin:6px 18px 18px}.ios-sec{color:var(--muted);font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin:14px 18px 6px}
.ios-prof{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:14px;width:100%;padding:14px 18px 14px 16px;cursor:pointer;color:var(--ink)}
.ios-av{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#5aa7ff,#1f5fe0);color:#fff;font-size:24px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex:none}
.ios-pt{flex:1;min-width:0}.ios-pt b{display:block;font-size:20px}.ios-pt small{color:var(--muted);font-size:14px}
input.ios-sw{appearance:none!important;-webkit-appearance:none!important;width:51px!important;min-width:51px!important;height:31px!important;min-height:31px!important;border-radius:16px!important;background:#c9ced6!important;border:0!important;padding:0!important;position:relative;flex:none;margin:0!important;cursor:pointer;transition:background .2s;box-shadow:none!important}
input.ios-sw::after{content:"";position:absolute;top:2px;left:2px;width:27px;height:27px;border-radius:50%;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,.25);transition:transform .2s}
input.ios-sw:checked{background:#34c759!important}input.ios-sw:checked::after{transform:translateX(20px)}input.ios-sw:focus-visible{outline:2px solid var(--brass);outline-offset:2px}
.ios-pad{padding:16px}.ios-in{width:100%;box-sizing:border-box;height:50px;border-radius:12px;border:1px solid var(--line);background:var(--surface-2);color:var(--ink);padding:0 14px;font-size:16px}
.ios-phs{display:flex;justify-content:center;gap:48px;padding:22px 0 14px}.ios-ph{all:unset;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:10px;font-size:17px;color:var(--ink)}.ios-ph[disabled]{opacity:.45;cursor:default}
.ios-scr{width:92px;height:200px;border-radius:14px;display:flex;flex-direction:column;align-items:center;gap:8px;padding-top:30px;box-sizing:border-box;background:linear-gradient(160deg,#d8c9a8,#f4efe6 50%,#26364f);color:#fff}
.ios-ph.dark .ios-scr{background:linear-gradient(160deg,#1c1f3a,#0b0d1c 55%,#2d3a66)}.ios-scr i{font-style:normal;font-size:20px;font-weight:700;margin-bottom:26px}.ios-scr b{display:block;width:76px;height:20px;border-radius:7px;background:rgba(255,255,255,.35)}
.ios-rad{width:24px;height:24px;border-radius:50%;border:2px solid var(--muted);display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box}.ios-rad.on{background:#1457d6;border-color:#1457d6}
.ios-ok{display:inline-flex}`;document.head.appendChild(st);
window.AFSettings={open,applyTheme};
})();
