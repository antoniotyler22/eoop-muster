/* Accounted For app. Loaded by index.html after the PIN lock (if on) opens the vault. */
const STATUSES=["On Hand","Appointment on Base","Appointment off Base","Company Duties","Operation","TAD","Leave"];
const SHORT={"On Hand":"On Hand","Appointment on Base":"Appt On Base","Appointment off Base":"Appt Off Base","Company Duties":"Co Duties","Operation":"Operation","TAD":"TAD","Leave":"Leave"};
const SVAR={"On Hand":"--s-onhand","Appointment on Base":"--s-aob","Appointment off Base":"--s-aoff","Company Duties":"--s-duty","Operation":"--s-op","TAD":"--s-tad","Leave":"--s-leave"};
const PRESENT=["On Hand","Appointment on Base","Company Duties"];
const SECTIONS=[["HQ","Headquarters"],["HE","Heavy Equipment"],["CE","Combat Engineer"],["ORD","Ordnance"],["UT","Utilities"]];
const DEF_SECS=[["HQ","Headquarters"],["HE","Heavy Equipment"],["CE","Combat Engineer"],["ORD","Ordnance"],["UT","Utilities"]];
const RESERVED=["BOARD","ATT","PT","W6","TEXT","DATA","MUSTER","ALERTS","RECALL","EVENTS","ARMORY","ROLLUP","LIVE","SEND","FEED","TRENDS","READY","DUTY","P","CAL","LOG","ME","SYS","TODAY","ASK","PEOPLE","TOOLS"];
const MIL_SECS=DEF_SECS.map(s=>s.slice());
let secDraft=null;
/* ---------- versions: one app, five vocabularies ---------- */
const MODES={
 military:{name:"Military",desc:"Marines, sections, muster, armory",title:"Accounted For"},
 police:{name:"Police",desc:"Officers, shifts, roll call, armory",title:"Shift Numbers",
  secs:[["PAT","Patrol"],["INV","Investigations"],["TRF","Traffic"],["SOD","Special Ops"],["ADM","Admin"]],
  ranks:["CHIEF","DEP CHIEF","CAPT","LT","SGT","CPL","DET","OFC","RECRUIT"],rankDef:"OFC",
  events:["Shift PT","Range qual","Defensive tactics","Run","Fitness test","Training day"],
  evTypes:["Range","In-service","Briefing","Detail","Community event","Inspection","Other"],
  wTypes:["Use of force","Injury","Vehicle collision","Missed shift","Medical","Family emergency","Other"],
  items:["Duty pistol","Patrol rifle","Shotgun","Taser","Radio","Body cam","Vehicle keys","Other"],
  v:{p:"Officer",ps:"Officers",here:"On Duty",aob:"In Station",aobS:"In Station",aoff:"Court",aoffS:"Court",cod:"Special Detail",codS:"Detail",op:"Call-Out",tad:"Training",
   lim:"Restricted",attPl:"Mutual Aid",attP:"mutual aid officers",att1:"mutual aid officer",attC:"Mutual Aid Officers",code:"AID",org:"agency",mus:"roll call",
   coEx:"PATROL DIVISION",lead:"Supervisor",asst:"Asst Supervisor",sr:"Senior Sergeant",xo:"Lieutenant",plt:"shift",pltA:"SHIFT",co:"division",coA:"DIV",cmdAll:"commander, lieutenant and senior sergeant",notify:"supervisor, watch commander, dispatch",deck:"Present for duty",eo:"SHIFT",billet:"assignment",fap:"loaned in, detailed to us, mutual aid",mol:"roster file",w6:"IR",edd:"end date"}},
 jobs:{name:"Jobs",desc:"Crews, job sites, head count, tool crib",title:"Crew Numbers",
  secs:[["SUP","Supervision"],["CARP","Carpentry"],["ELEC","Electrical"],["PLMB","Plumbing"],["EQP","Equipment"]],
  ranks:["PM","SUPT","FOREMAN","LEAD","JOURNEY","APPRENT","LABORER"],rankDef:"LABORER",
  events:["Toolbox talk","Safety brief","Stretch & flex","Site walk","Training"],
  evTypes:["Safety class","Certification","Site walk","Cleanup","Inspection","Other"],
  wTypes:["Injury","Near miss","Equipment damage","Vehicle accident","No-show","Family emergency","Other"],
  items:["Drill","Impact driver","Saw","Grinder","Laser level","Ladder","Radio","Truck keys","Other"],
  v:{p:"Worker",ps:"Workers",here:"On Site",aob:"In the Yard",aobS:"Yard",aoff:"Appointment",aoffS:"Appt",cod:"Shop Work",codS:"Shop",op:"Other Job Site",opS:"Other Site",tad:"Off-Site Training",tadS:"Training",lv:"Off / PTO",
   fd:"Cleared",ld:"Light Work",lim:"Restricted",attPl:"Subcontractors",attP:"subcontractors",att1:"subcontractor",attC:"Subcontractors",code:"SUB",org:"company",mus:"head count",
   rec:"call tree",ptB:"BRIEF",ptT:"Safety brief roster",arm:"tool crib",armB:"TOOL CRIB",wpn:"tool",bin:"bin",coEx:"NORTH SITE",lead:"Foreman",asst:"Lead Hand",sr:"Safety Lead",xo:"Asst Superintendent",plt:"crew",pltA:"CREW",co:"site",coA:"SITE",cmdAll:"superintendent and site leads",notify:"foreman, superintendent, safety lead",deck:"On the job",eo:"CREW",billet:"trade",rank:"Title",
   fap:"loaned in, from other crews, subs",mol:"roster file",strength:"headcount",w6:"IR",edd:"end date"}},
 hr:{name:"HR",desc:"Employees, departments, check-in, assets",title:"Staff Numbers",
  secs:[["ADM","Admin"],["OPS","Operations"],["FIN","Finance"],["TECH","IT"],["SLS","Sales"]],
  ranks:["EXEC","DIR","MGR","SUPV","LEAD","SR","STAFF","INTERN"],rankDef:"STAFF",
  events:["All-hands","Training","Team meeting","Wellness","Safety drill"],
  evTypes:["Required training","Compliance","Town hall","Volunteer","Review","Other"],
  wTypes:["Workplace injury","Conduct concern","Property damage","No call / no show","Medical","Family emergency","Other"],
  items:["Laptop","Phone","Badge","Keys","Monitor","Vehicle","Other"],
  v:{p:"Employee",ps:"Employees",here:"In Office",aob:"Remote",aobS:"Remote",aoff:"Appointment",aoffS:"Appt",cod:"Training",codS:"Training",op:"Off-Site Work",opS:"Off-Site",tad:"Business Travel",tadS:"Travel",lv:"PTO",
   fd:"Full Schedule",ld:"Modified Duty",lim:"Accommodation",attPl:"Contractors",attP:"contractors",att1:"contractor",attC:"Contractors",code:"CTR",org:"department",mus:"check-in",
   rec:"call tree",ptB:"MTG",ptT:"Meeting roster",arm:"asset",armB:"ASSETS",wpn:"asset",bin:"tag",coEx:"OPERATIONS",lead:"Manager",asst:"Asst Manager",sr:"HR Lead",xo:"Deputy Director",plt:"team",pltA:"TEAM",co:"department",coA:"DEPT",cmdAll:"director, deputy and HR lead",notify:"manager, HR, security",deck:"Working today",eo:"STAFF",billet:"job title",rank:"Title",
   fap:"loaned in, temps, contractors",mol:"HR roster file",strength:"headcount",w6:"IR",edd:"end date"}},
 civilian:{name:"Civilian",desc:"Members, groups, check-in, gear",title:"Team Numbers",
  secs:[["LEAD","Leaders"],["RED","Red Team"],["BLUE","Blue Team"],["GRN","Green Team"],["VOL","Volunteers"]],
  ranks:["LEAD","CO-LEAD","CAPTAIN","MEMBER","VOLUNTEER","GUEST"],rankDef:"MEMBER",
  events:["Meeting","Practice","Workout","Volunteer shift","Outing"],
  evTypes:["Meeting","Class","Volunteer","Cleanup","Trip","Other"],
  wTypes:["Injury","Lost person","Property damage","Missed pickup","Medical","Family emergency","Other"],
  items:["Radio","Keys","Vest","First aid kit","Laptop","Camera","Other"],
  v:{p:"Member",ps:"Members",here:"Here",aob:"Appt On Site",aobS:"Appt On Site",aoff:"Appt Off Site",aoffS:"Appt Off Site",cod:"Assigned Task",codS:"Task",op:"Event",tad:"Away",lv:"Time Off",
   fd:"Full Go",ld:"Limited",lim:"Restricted",attPl:"Guests",attP:"guests",att1:"guest",attC:"Guests",code:"GST",org:"group",mus:"check-in",
   rec:"call tree",ptB:"MEET",ptT:"Meeting roster",arm:"gear",armB:"GEAR",wpn:"item",bin:"bin",coEx:"YOUTH LEAGUE",lead:"Leader",asst:"Co-leader",sr:"Coordinator",xo:"Vice President",plt:"group",pltA:"GROUP",co:"organization",coA:"ORG",cmdAll:"president, vice president and coordinator",notify:"leader, co-leader, coordinator",deck:"Present",eo:"TEAM",billet:"role",rank:"Role",
   fap:"loaned in, visitors, guests",mol:"roster file",strength:"headcount",w6:"IR",edd:"end date"}}
};
/* One scheduler for all background checks: pauses while the app is in the background,
   then catches up in a staggered burst when you come back (instead of ~15 separate timers). */
const JOBS=[];function every(ms,fn,name){JOBS.push({ms,fn,name,next:Date.now()+Math.min(ms,1500+JOBS.length*250)})}
function runDue(stagger){const t=Date.now();let k=0;for(const j of JOBS){if(t<j.next)continue;j.next=t+j.ms;const go=()=>{try{j.fn()}catch(e){}};if(stagger)setTimeout(go,(k++)*300);else go()}}
setInterval(()=>{if(!document.hidden)runDue(false)},2000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)runDue(true)});
const APP_VER=window.AV||"3.5.0";const APP_BUILD="2026-10-25";const SUPPORT_EMAIL="Antoniotyler22@gmail.com";
const DISCLAIMER="Independent app. Not an official system of, or endorsed by, the DoD, any military service, police agency or government.";
/* Custom: a version people name themselves (5K, field trip, class, shift…). Starts from Civilian; labels come from S.customV. */
MODES.custom=Object.assign(JSON.parse(JSON.stringify(MODES.civilian)),{name:"Custom",desc:"Name it yourself: 5K, field trip, class, shift, anything",title:"Accounted For"});
Object.defineProperty(MODES.custom,"v",{configurable:true,enumerable:true,get(){const b=JSON.parse(JSON.stringify(MODES.civilian.v));let c={};try{c=(typeof S==="object"&&S&&S.customV)||{}}catch(e){}
  for(const k of ["p","ps","here","aob","aoff","cod","op","tad","lv","mus","rec","attPl","eo"])if(c[k])b[k]=c[k];
  if(c.aob)b.aobS=c.aob;if(c.aoff)b.aoffS=c.aoff;if(c.cod)b.codS=c.cod;if(c.op)b.opS=c.op;if(c.tad)b.tadS=c.tad;if(c.attPl){b.attC=c.attPl;b.attP=c.attPl.toLowerCase();b.att1=c.attPl.toLowerCase().replace(/s$/,"")}return b}});
const MODE_ORDER=["military","police","jobs","hr","civilian","custom"];
const MODE=()=>MODES[S&&MODES[S.mode]?S.mode:"military"];
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
/* Build the label map for the current version. Military = no map (app text as written). */
function modeDict(md){const v=md.v;if(!v)return null;const t=[];const add=(a,b)=>{if(b!=null&&b!==a)t.push([a,b])};
  add("EOP Numbers",md.title);add("EOOP",v.eo);
  add("Present on deck",v.deck);add("on deck","present");add("off deck","away");
  add("On Hand",v.here);add("Appointment on Base",v.aob);add("Appt On Base",v.aobS);add("Appointment off Base",v.aoff);add("Appt Off Base",v.aoffS);
  add("Company Duties",v.cod);add("Co Duties",v.codS);add("Operation",v.opS||v.op);add("TAD",v.tadS||v.tad);add("Leave",v.lv);
  add("Full Duty",v.fd);add("Light Duty",v.ld);add("LIMDU",v.lim);
  add("FAP in, TAD to us, attachments",v.fap);add("TAD/FAP",v.tadS||v.tad||"TAD");add("FAP in","loaned in");add("FAP","loan");
  add("Attached Marines",v.attC);add("attached Marines",v.attP);add("an attached Marine",(/^[aeiou]/i.test(v.att1)?"an ":"a ")+v.att1);add("attached Marine",v.att1);add("Attached",v.attPl);
  add("Marines",v.ps);add("Marine",v.p);
  add("MOL detail list",v.mol);add("MOL list",v.mol);add("MOL","Roster");
  add("Parent unit","Home "+v.org);add("parent unit","home "+v.org);add("unit",v.org);add("Unit",cap(v.org));
  if(v.mus){add("Formation muster",cap(v.mus));add("formation muster",v.mus);add("Formation",cap(v.mus));add("formation",v.mus);add("Muster",cap(v.mus));add("muster",v.mus)}
  if(v.rec){add("Recall",cap(v.rec));add("recall",v.rec)}
  if(v.ptB){add("Physical activity roster",v.ptT);add("PT roster",v.ptT);add("PT",v.ptB)}
  if(v.arm){add("Armory",cap(v.arm));add("armory",v.arm);add("ARMORY",v.armB);add("Weapons",cap(v.wpn)+"s");add("weapons",v.wpn+"s");add("Weapon",cap(v.wpn));add("weapon",v.wpn);
    add("In rack","In "+v.bin);add("rack",v.bin);add("Rack",cap(v.bin))}
  if(v.strength){add("Total Strength","Total "+cap(v.strength));add("strength",v.strength);add("Strength",cap(v.strength))}
  if(v.lead){add("CO, XO, 1stSgt",v.cmdAll);add("CO, 1stSgt and XO",v.cmdAll);add("SNCOIC, OIC, CO, OOD, PMO",v.notify);
    add("EDIPI","ID number");
    add("SNCOIC",v.asst);add("OIC",v.lead);add("1stSgt",v.sr);add("XO",v.xo);add("PLT / CO",v.pltA+" / "+v.coA);add("HQ PLT","HQ "+v.pltA);add("PLT",v.pltA);add("CO",v.coA);
    add("Platoons",cap(v.plt)+"s");add("platoons",v.plt+"s");add("Platoon",cap(v.plt));add("platoon",v.plt);add("Companies",cap(v.co)+(v.co.endsWith("y")?"":"s"));add("company",v.co);add("Company",cap(v.co))}
  add("billet",v.billet);add("EDDs",v.edd+"s");add("EDD",v.edd);add("6W",v.w6);
  const map={};const isAc=s=>/^[A-Z0-9\/&-]+$/.test(s);
  const low=s=>s.split(" ").map(w=>isAc(w)&&w.length>1?w:w.toLowerCase()).join(" ");
  for(const [a,b] of t)if(!(a in map))map[a]=b;
  for(const [a,b] of t){const U=a.toUpperCase();if(!(U in map))map[U]=b.toUpperCase();
    if(!isAc(a.split(" ")[0])){const l=low(a);if(!(l in map))map[l]=low(b);const c=cap(l);if(!(c in map))map[c]=cap(low(b))}}
  const keys=Object.keys(map).sort((x,y)=>y.length-x.length).map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));
  const ex={ATT:v.code};if(v.rank)ex.Rank=v.rank;
  const mapU=Object.assign({},map);for(const k in map)if(isAc(k))mapU[k]=map[k].toUpperCase();
  return {map,mapU,re:new RegExp("(?<![A-Za-z0-9])(?:"+keys.join("|")+")(?![A-Za-z0-9])","g"),ex}}
let XL=null;
function xs(s,U){if(!XL||!s)return s;const M=U?XL.mapU:XL.map;return String(s).replace(XL.re,m=>M[m]??m)}
function RT(txt){if(!XL)return txt;return String(txt).split("\n").map(l=>l.startsWith("#EOOP")?l:xs(l,l===l.toUpperCase())).join("\n")}
const XSKIP=new Set(["SCRIPT","STYLE","TEXTAREA","INPUT"]);
const XREC=new WeakMap();
function xlText(n){const p=n.parentNode;if(!p||XSKIP.has(p.nodeName)||p.closest&&p.closest("[data-noxl]"))return;const cur=n.nodeValue;if(!cur||!cur.trim())return;
  const r=XREC.get(n);const o=r&&r.out===cur?r.orig:cur;const tr=o.trim();
  const v=!XL?o:XL.ex[tr]!==undefined?o.replace(tr,XL.ex[tr]):xs(o);
  if(v!==cur){if(p.nodeName==="OPTION"&&!p.hasAttribute("value"))p.setAttribute("value",o);n.nodeValue=v}
  if(v!==o)XREC.set(n,{orig:o,out:v});else XREC.delete(n)}
function xlTree(root){if(!root)return;if(root.nodeType===3){xlText(root);return}if(root.nodeType!==1||XSKIP.has(root.nodeName)&&root.nodeName!=="INPUT")return;
  if(root.nodeName==="INPUT"||root.querySelectorAll){const ph=root.nodeName==="INPUT"?[root]:root.querySelectorAll("[placeholder]");ph.forEach(e=>{if(!e.hasAttribute("data-ph0"))e.setAttribute("data-ph0",e.getAttribute("placeholder"));const a=e.getAttribute("data-ph0");const b=xs(a);if(e.getAttribute("placeholder")!==b)e.setAttribute("placeholder",b)})}
  if(root.nodeName==="INPUT")return;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const L=[];while(w.nextNode())L.push(w.currentNode);L.forEach(xlText)}
let XOBS=null;
function startXL(){if(XOBS){XOBS.disconnect();XOBS=null}XL=modeDict(MODE());document.title=(typeof appName==="function"?appName():"Accounted For");{const an=typeof appName==="function"?appName():"Accounted For";if(window.VAULT&&VAULT.cfg&&VAULT.cfg.title!==an)VAULT.set({title:an})}
  xlTree(document.body);if(!XL)return;
  XOBS=new MutationObserver(rs=>{for(const r of rs){if(r.type==="characterData")xlText(r.target);else r.addedNodes.forEach(xlTree)}});
  XOBS.observe(document.body,{subtree:true,childList:true,characterData:true})}
let ORIG=null;
function applyLists(){if(!ORIG)ORIG={events:EVENTS.slice(),evTypes:EV_TYPES.slice(),wTypes:W_TYPES.slice(),items:WEAPONS.slice()};const md=MODE();
  for(const [arr,k] of [[EVENTS,"events"],[EV_TYPES,"evTypes"],[W_TYPES,"wTypes"],[WEAPONS,"items"]])arr.splice(0,arr.length,...(md[k]||ORIG[k]));
  RANKS.splice(0,RANKS.length,...(md.ranks||MIL_RANKS))}
function setMode(k){if(!MODES[k])return false;const was=MODES[S.mode]?S.mode:"military";if(k===was)return false;
  S.secsBy=S.secsBy||{};S.secsBy[was]=SECTIONS.map(s=>s.slice());
  const oldEv=EVENTS.slice();const old=SECTIONS.map(s=>s.slice());
  S.mode=k;DEF_SECS.splice(0,DEF_SECS.length,...(MODES[k].secs||MIL_SECS).map(s=>s.slice()));applyLists();
  const sv=S.secsBy[k];let nw=(Array.isArray(sv)&&sv.length&&sv.every(x=>Array.isArray(x)&&x[0]))?sv.map(s=>s.slice()):DEF_SECS.map(s=>s.slice());
  for(let i=nw.length;i<old.length&&nw.length<10;i++)if(!nw.some(s=>s[0]===old[i][0]))nw.push(old[i].slice());
  const map={};old.forEach((o,i)=>map[o[0]]=nw[Math.min(i,nw.length-1)][0]);
  SECTIONS.splice(0,SECTIONS.length,...nw);S.secs=JSON.stringify(nw)===JSON.stringify(DEF_SECS)?null:nw;
  if(S.source==="sample")S.roster=sampleRoster();else for(const m of S.roster){if(m.sec!=="ATT")m.sec=map[m.sec]||nw[0][0]}
  for(const ev of S.events||[]){if(Array.isArray(ev.secs))ev.secs=[...new Set(ev.secs.map(x=>map[x]).filter(Boolean))]}
  if(!S.pt.event||oldEv.includes(S.pt.event))S.pt.event=EVENTS[0];
  secFix();secDraft=null;S.snap=null;save();startXL();return true}
function modeLink(k){return PUB()+(k==="all"?"":"?m="+k)}
function openModeSheet(first){sheetCtx={kind:"mode",first:!!first};const cur=MODES[S.mode]?S.mode:"military";
  $("#sheetT").innerHTML=first?`Pick your version<small>Sets the tabs, statuses and report titles for your group. Change it any time by tapping the title.</small>`:`App version<small>Changes every tab, status and report title. Same people, same data.</small>`;
  $("#sheetOpts").innerHTML=MODE_ORDER.map(k=>`<button data-mopt="${k}" aria-pressed="${k===cur}" data-noxl><span><b>${MODES[k].name}</b><br><span class="mdesc">${MODES[k].desc}</span></span></button>`).join("")+(first?"":
   `<div class="mshare" data-noxl><button class="btn" data-mshare="all" style="width:100%;margin:6px 0 10px">Send app link (they pick their version)</button><div class="note">Or send one version, already set:</div><div class="evts">${MODE_ORDER.map(k=>`<button data-mshare="${k}">${MODES[k].name}</button>`).join("")}</div></div>`)+`<p class="note" data-noxl style="margin:10px 2px 0">${DISCLAIMER} <a href="privacy.html">Privacy</a></p>`;
  const sh=$("#sheet");sheetFocus();sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add("open")));buzz()}
function shareMode(k){const url=modeLink(k);const t=k==="all"?"Accountability app: Military, Police, Jobs, HR or Civilian. Pick yours when it opens.":MODES[k].title+" ("+MODES[k].name+" version)";
  if(navigator.share){navigator.share({title:t,text:t,url}).catch(()=>{});return}
  try{navigator.clipboard.writeText(url).then(()=>toast((k==="all"?"App":MODES[k].name)+" link copied"),()=>toast(url))}catch(e){toast(url)}}

/* ---------- WORKSPACES: platoon and company kept separate on one phone, switch with PLT / CO ---------- */
const WS_GLOBAL=["ws","wsCur","pushOn","dev","hubMode","onb","me","askSt","ask","askAdmin","ts","mode","myName"];
function wsStash(){const cur=S.wsCur||"plt";S.ws=S.ws||{};const bag={};for(const k of Object.keys(S)){if(WS_GLOBAL.includes(k))continue;bag[k]=S[k];delete S[k]}S.ws[cur]=bag}
function wsSwitch(k,extra){const cur=S.wsCur||"plt";if(k===cur&&!extra)return;if(k!==cur){wsStash();const nx=(S.ws&&S.ws[k])||null;if(nx){Object.assign(S,nx);delete S.ws[k]}else{S.roster=[];S.source="sample";if(k==="co"){S.level="co";S.secs=CO_SECS.map(x=>x.slice());S.newCo=true;S.leaderMode=true}}S.wsCur=k}
  if(!S.mode)S.mode="military";S.onb=true;if(extra)Object.assign(S,extra);rawSave();try{history.replaceState(null,"",location.pathname+"#"+(k==="co"?"co":"board"))}catch(e){}location.reload()}
document.addEventListener("click",e=>{const w=e.target.closest("[data-wsgo]");if(!w)return;const k=w.dataset.wsgo;if(k===(S.wsCur||"plt"))return;toast(k==="co"?"Opening company view…":"Opening platoon view…");setTimeout(()=>wsSwitch(k),150)});
const LV=()=>S.level==="co"?{sec:"platoon",Sec:"Platoon",secs:"platoons",head:"platoon OIC",Head:"Platoon OIC",heads:"Platoon OICs"}:{sec:"section",Sec:"Section",secs:"sections",head:"section leader",Head:"Section leader",heads:"Section leaders"};
const CO_SECS=[["HQ","Company HQ"],["1PLT","1st Platoon"],["2PLT","2nd Platoon"],["3PLT","3rd Platoon"]];
function setLevel(k){if(k===(S.level||"plt"))return;const subs=MIL_SECS.map(x=>x[0]);
  if(k==="co"){S.secsPlt=SECTIONS.map(x=>x.slice());const nw=(Array.isArray(S.secsCo)&&S.secsCo.length?S.secsCo:CO_SECS).map(x=>x.slice());SECTIONS.splice(0,SECTIONS.length,...nw);S.secs=nw;S.level="co";
    if(S.source==="sample"){S.roster=sampleRoster();let i=0;for(const m of S.roster)if(m.sec!=="ATT")m.sub=subs[i++%subs.length]}
    else for(const m of S.roster){if(m.sec==="ATT")continue;m.sub=m.sub||m.sec;m.sec=nw[0][0]}}
  else{S.secsCo=SECTIONS.map(x=>x.slice());const nw=(Array.isArray(S.secsPlt)&&S.secsPlt.length?S.secsPlt:DEF_SECS).map(x=>x.slice());SECTIONS.splice(0,SECTIONS.length,...nw);S.secs=JSON.stringify(nw)===JSON.stringify(DEF_SECS)?null:nw;S.level="plt";
    if(S.source==="sample")S.roster=sampleRoster();else for(const m of S.roster){if(m.sec==="ATT")continue;m.sec=nw.some(x=>x[0]===m.sub)?m.sub:nw[0][0];delete m.sub}}
  secFix();secDraft=null;S.snap=null;save()}
function mapCo(u){const U=(u||"").toUpperCase();const n=(U.match(/(\d)\s*(?:ST|ND|RD|TH)?\s*(?:PLT|PLATOON)/)||U.match(/(?:PLT|PLATOON)\s*(\d)/)||[])[1];let sec=null;
  if(n)sec=(SECTIONS.find(s=>s[0]===n+"PLT"||(s[0].startsWith(n)&&/PLT/.test(s[0]))||new RegExp("^"+n+"(ST|ND|RD|TH)?\\s*P").test(s[1].toUpperCase()))||[])[0]||null;
  if(!sec)sec=(SECTIONS.find(s=>U.split(/[-\s/]+/).includes(s[0])||U.includes(s[1].toUpperCase()))||SECTIONS[0])[0];
  const t=U.split(/[-\s/]+/).filter(Boolean).pop()||"";const sub={HQ:"HQ",EE:"HE",HE:"HE",CE:"CE",ORD:"ORD",UT:"UT"}[t]||(/^[A-Z]{2,6}$/.test(t)&&!/PLT|PLATOON|CO/.test(t)?t:"");return {sec,sub}}
function restoreSources(){const out=[];
  if(S.preLink&&Array.isArray(S.preLink.roster)&&S.preLink.roster.length)out.push({k:"pre",t:"Your platoon before you linked it",s:S.preLink.roster.length+" Marines · saved "+dtg(new Date(S.preLink.t)).slice(0,7)});
  if(S.snap&&S.snap.st&&Object.keys(S.snap.st).length)out.push({k:"snap",t:"Your last sent report",s:Object.keys(S.snap.st).length+" Marines · "+dtg(new Date(S.snap.t)).slice(0,7)});
  const co=S.ws&&S.ws.co&&Array.isArray(S.ws.co.roster)&&S.ws.co.source!=="sample"?S.ws.co:null;if(co){const pl=[...new Set(co.roster.map(m=>m.sec).filter(x=>x!=="ATT"))];if(pl.length)out.push({k:"co",t:"From the company roster",s:"Pick your platoon",pl})}
  return out}
function restoreHTML(){if((S.wsCur||"plt")==="co"||!isOwner())return"";const R=restoreSources();const off=S.level==="co"||(S.link&&S.link.whole&&!S.link.own);
  if(!R.length&&!off)return"";
  return `<h2>Restore my platoon</h2><div class="panel"${off?' style="border-color:var(--warn)"':""}><p class="note">${off?"<b>This platoon view is showing company data.</b> Put your platoon back:":"If your platoon numbers or people look wrong, put them back from:"}</p>
    ${R.map(x=>`<div class="rrow" style="--sc:var(--line)"><div class="who"><b>${esc(x.t)}</b><div class="ph">${esc(x.s)}</div></div>${x.pl?`<select class="wsel" id="rsPl">${x.pl.map(c=>`<option${c===(unitName()||"").toUpperCase()?" selected":""}>${esc(c)}</option>`).join("")}</select>`:""}<button class="btn alt" data-restore="${x.k}">${armed==="rs"+x.k?"Tap again to restore":"Restore from this"}</button></div>`).join("")}
    ${off||S.source!=="sample"?`<button class="btn warn" id="rmCo" style="width:100%;margin-top:8px">${armed==="rmco"?"Tap again: delete this roster from the platoon view":"🗑 Delete the company roster from the platoon view"}</button><p class="note">Removes everyone in this view and puts the platoon tabs back (HQ/HE/CE/ORD/UT or your own). The company view is not touched. Then load your platoon MOL or add Marines.</p>`:""}
    <p class="note">Or load your platoon's MOL file under Roster data. Restoring keeps phone numbers, My pages and notes for anyone whose name matches, and stays connected to the company: your platoon is the master and its changes still go up.</p></div>`}
function restoreFrom(k){const keepBy={};S.roster.forEach(m=>keepBy[fullK(m)]=m);let list=[];
  if(k==="pre"){list=JSON.parse(JSON.stringify(S.preLink.roster));if(S.preLink.secs)S.secs=S.preLink.secs}
  else if(k==="snap"){let i=0;list=Object.entries(S.snap.st).map(([name,v])=>({id:"r"+(++i),rank:v.r||"",name,sec:v.sec||"HQ",status:STATUSES.includes(v.s)?v.s:"On Hand",duty:v.d||"Full Duty",detail:"",loc:"",start:"",end:""}))}
  else if(k==="co"){const pl=($("#rsPl")||{}).value;let i=0;list=S.ws.co.roster.filter(m=>m.sec===pl).map(m=>Object.assign({},m,{id:"r"+(++i),sec:/^[A-Z0-9]{1,6}$/.test(m.sub||"")?m.sub:"HQ",sub:undefined}))}
  if(!list.length)return toast("Nothing to restore from that.");
  for(const m of list){const o=keepBy[fullK(m)];if(!o)continue;for(const f of ["phone","phone2","pk","pkSig","pkAt","notes","cal","due","wpn","edd","eas","uid"])if(o[f]!=null&&m[f]==null)m[f]=o[f];if(k!=="pre"&&o.id)m.id=o.id}
  S.roster=list;S.source="mol";S.level="plt";delete S.newCo;
  const nw=Array.isArray(S.secs)&&S.secs.length&&k==="pre"?S.secs:(Array.isArray(S.secsPlt)&&S.secsPlt.length?S.secsPlt:null);
  if(nw){S.secs=nw}else{const codes=[...new Set(list.map(m=>m.sec).filter(c=>c!=="ATT"))];const nm={};MIL_SECS.forEach(x=>nm[x[0]]=x[1]);S.secs=codes.slice(0,10).map(c=>[c,nm[c]||c])}
  if(S.link&&S.link.whole){S.link.own=true;S.link.prev={};S.link.pulled=false;S.link.lsig=""}
  if(S.board){S.board.rsig={}}rawSave();toast("Platoon restored");setTimeout(()=>location.reload(),600)}
document.addEventListener("click",e=>{if(e.target.id!=="rmCo")return;if(!isOwner())return denyMsg();if(armed!=="rmco"){armed="rmco";tabRedraw();return}armed=null;
  const nw=Array.isArray(S.secsPlt)&&S.secsPlt.length?S.secsPlt.map(x=>x.slice()):DEF_SECS.map(x=>x.slice());S.secs=JSON.stringify(nw)===JSON.stringify(DEF_SECS)?null:nw;SECTIONS.splice(0,SECTIONS.length,...nw);
  S.level="plt";delete S.newCo;if(S.link&&S.link.whole)S.link=null;S.roster=sampleRoster();S.source="sample";S.loadedAt="";if(S.board)S.board.rsig={};rawSave();toast("Company roster deleted from the platoon view");setTimeout(()=>{try{history.replaceState(null,"",location.pathname+"#data")}catch(e){}location.reload()},600)});
document.addEventListener("click",e=>{const b=e.target.closest("[data-restore]");if(!b)return;if(!isOwner())return denyMsg();const k=b.dataset.restore;if(armed!=="rs"+k){armed="rs"+k;tabRedraw();return}armed=null;restoreFrom(k)});
function levelHTML(){const cw=(S.wsCur||"plt")==="co";return restoreHTML()+`<h2>Views</h2><div class="panel"><p class="note">This phone keeps a <b>platoon view</b> and a <b>company view</b> separately. Switch with <b>PLT / CO</b> at the top. Each has its own roster, links, Feed and backup.</p><div class="evts"><button data-wsgo="plt" aria-pressed="${!cw}">Platoon view</button><button data-wsgo="co" aria-pressed="${cw}">Company view</button></div></div>`;const co=S.level==="co";return `<h2>Unit level</h2><div class="panel"><p class="note">${co?"<b>Company:</b> tabs are platoons. Each platoon OIC gets a link, loads their platoon from your board with their own sections, and sends their numbers up to you.":"<b>Platoon:</b> tabs are sections and section leaders send you their numbers. Switch to Company to run the whole company with platoons as tabs."}</p>
  <div class="evts"><button data-lvl="plt" aria-pressed="${!co}">Platoon</button><button data-lvl="co" aria-pressed="${co}">Company</button></div><button class="btn alt" data-go="co" style="width:100%;margin-top:8px">📂 Load a company roster (Excel or CSV)</button>${co?`<p class="note">Rename or add platoons in Tabs below. Load the company MOL: Marines go to their platoon, and their section inside it comes along for the platoon OIC.</p>`:""}</div>`}
function secFix(){for(const m of S.roster){if(m.sec!=="ATT"&&!SECTIONS.some(s=>s[0]===m.sec))m.sec=SECTIONS[0][0]}}
function tabsHTML(){if(!secDraft)secDraft=SECTIONS.map(([k,n])=>({o:k,k,n}));const D=secDraft;
  const cnt=k=>S.roster.filter(m=>m.sec===k).length;const gone=SECTIONS.filter(([k])=>!D.some(d=>d.o===k)&&cnt(k));
  return `<h2>Tabs</h2><div class="panel" id="tabEd"><p class="note">Rename, add, remove or reorder your tabs (up to 10). Short name shows on the tab bar and in text reports; full name shows on the tab's page. ATT always stays.</p>
    ${D.map((d,i)=>`<div class="tabrow"><div class="tabmv"><button type="button" data-tup="${i}" aria-label="Move up"${i?"":" disabled"}>▲</button><button type="button" data-tdn="${i}" aria-label="Move down"${i<D.length-1?"":" disabled"}>▼</button></div>
      <input type="text" data-tk="${i}" value="${esc(d.k)}" maxlength="6" placeholder="Short" aria-label="Short name" autocapitalize="characters" style="text-transform:uppercase">
      <input type="text" data-tn="${i}" value="${esc(d.n)}" maxlength="30" placeholder="Full name" aria-label="Full name">
      <button type="button" data-tdel="${i}" aria-label="Remove tab"${D.length>1?"":" disabled"}>✕</button>
      ${d.o&&cnt(d.o)?`<div class="note tabcnt">${cnt(d.o)} people</div>`:""}</div>`).join("")}
    ${gone.length?`<label for="tabMove">People in removed tabs (${gone.map(g=>g[0]+": "+cnt(g[0])).join(", ")}) move to</label><select id="tabMove" class="wsel">${D.map((d,i)=>`<option value="${i}">${esc(d.k||"(new tab)")}</option>`).join("")}<option value="ATT">ATT</option></select>`:""}
    <div class="row2" style="margin-top:8px"><button class="btn alt" id="tabAdd"${D.length>=10?" disabled":""}>+ Add tab</button><button class="btn alt" id="tabUndo">Undo changes</button></div>
    <button class="btn" id="tabSave" style="width:100%;margin-top:6px">Save tabs</button>
    <button class="btn alt" id="tabDef" style="width:100%;margin-top:6px">Reset to ${DEF_SECS.map(s=>s[0]).join(" / ")}</button></div>`}
function tabRedraw(){const y=window.scrollY;renderData();window.scrollTo(0,y)}
function tabSave(){const D=secDraft;const keys=D.map(d=>d.k.trim().toUpperCase());
  for(let i=0;i<D.length;i++){const k=keys[i];if(!/^[A-Z0-9]{1,6}$/.test(k))return toast("Short names: 1–6 letters or numbers, no spaces."),false;
    if(RESERVED.includes(k))return toast(k+" is used by the app. Pick another short name."),false;if(keys.indexOf(k)!==i)return toast(k+" is used twice."),false}
  const mv=$("#tabMove");const dest=mv?(mv.value==="ATT"?"ATT":keys[+mv.value]):keys[0];
  const map={};D.forEach((d,i)=>{if(d.o)map[d.o]=keys[i]});
  for(const m of S.roster){if(m.sec==="ATT")continue;m.sec=map[m.sec]||dest}
  for(const ev of S.events||[]){if(Array.isArray(ev.secs))ev.secs=[...new Set(ev.secs.map(k=>map[k]).filter(Boolean))]}
  const nw=D.map((d,i)=>[keys[i],d.n.trim()||keys[i]]);SECTIONS.splice(0,SECTIONS.length,...nw);
  S.secs=JSON.stringify(nw)===JSON.stringify(DEF_SECS)?null:nw;secDraft=null;save();return true}

const ATT=["ATT","Attached"];
const DUTIES=["Full Duty","Light Duty","LIMDU"];
const EVENTS=["Unit PT","Hike","Run","PFT","CFT","Field event"];
const RANKS=["CWO5","CWO4","CWO3","CWO2","WO","MAJ","CAPT","1STLT","2NDLT","SGTMAJ","MGYSGT","1STSGT","MSGT","GYSGT","SSGT","SGT","CPL","LCPL","PFC","PVT"];
const MIL_RANKS=RANKS.slice();
const KEY="eoop-muster-v1";setTimeout(()=>{try{const n=localStorage.getItem("eop-nfn");if(n)SB.nfn=n}catch(e){}SB.findNotify();SB.findAsk()},1500);const H0=location.hash||"",T0=Date.now();

function sampleRoster(){
  const spec=[["HQ",["MSGT","SGT","CPL","LCPL"],["On Hand","On Hand","TAD","Leave"]],
    ["HE",["GYSGT","SGT","CPL","CPL","LCPL","LCPL","PFC"],["On Hand","On Hand","TAD","On Hand","Leave","On Hand","Company Duties"]],
    ["CE",["SGT","CPL","LCPL","LCPL"],["On Hand","TAD","On Hand","Appointment off Base"]],
    ["ORD",["SSGT","CPL","LCPL","PFC"],["Leave","On Hand","On Hand","On Hand"]],
    ["UT",["GYSGT","SGT","CPL","LCPL","LCPL","PFC"],["On Hand","Operation","Operation","Appointment on Base","On Hand","TAD"]]];
  const out=[];let n=1;
  const rk=r=>{const j=MIL_RANKS.indexOf(r);return RANKS.join()===MIL_RANKS.join()||j<0?r:RANKS[Math.min(RANKS.length-1,Math.floor(j*RANKS.length/MIL_RANKS.length))]};
  for(const [si,[s0,ranks,sts]] of spec.entries()){const sec=(SECTIONS[si]||SECTIONS[SECTIONS.length-1])[0];ranks.forEach((r,i)=>out.push({id:"s"+n,rank:rk(r),name:"SAMPLE, MARINE "+String(n++).padStart(2,"0"),sec,status:sts[i],detail:"Sample row",loc:"",start:"",end:""}));}
  out.push({id:"s"+n++,rank:rk("CPL"),name:"SAMPLE, ATTACHED 01",sec:"ATT",parent:"CLB-3 (FAP in)",status:"On Hand",detail:"Working with "+(SECTIONS[1]||SECTIONS[0])[0],loc:"",start:"",end:"30 NOV 26"});
  out.push({id:"s"+n++,rank:rk("LCPL"),name:"SAMPLE, ATTACHED 02",sec:"ATT",parent:"7th ESB (TAD to us)",status:"Appointment on Base",detail:"Working with "+(SECTIONS[4]||SECTIONS[SECTIONS.length-1])[0],loc:"",start:"",end:"15 NOV 26"});
  if(out[5])out[5].duty="Light Duty";if(out[13])out[13].duty="LIMDU";
  return out;
}

let S={roster:sampleRoster(),source:"sample",loadedAt:"",recipients:"",names:false,pt:{event:"Unit PT",when:"",inc:["On Hand"],att:true}};
let storageOK=true;
try{const raw=window.__RAW!==undefined?window.__RAW:localStorage.getItem(KEY);window.__RAW=undefined; if(raw){const v=JSON.parse(raw); if(v&&Array.isArray(v.roster)) S=Object.assign(S,v);} }catch(e){storageOK=false}
if(MODES[S.mode]&&MODES[S.mode].secs){DEF_SECS.splice(0,DEF_SECS.length,...MODES[S.mode].secs.map(s=>s.slice()));SECTIONS.splice(0,SECTIONS.length,...DEF_SECS.map(s=>s.slice()))}
if(Array.isArray(S.secs)&&S.secs.length&&S.secs.every(x=>Array.isArray(x)&&x[0])){SECTIONS.splice(0,SECTIONS.length,...S.secs.slice(0,10))}secFix();
S.w6=Array.isArray(S.w6)?S.w6:[];
S.hist=Array.isArray(S.hist)?S.hist:[];
S.events=Array.isArray(S.events)?S.events:[];
S.arm=Object.assign({open:false,start:0,st:{},only:false,last:""},S.arm||{});
S.rcMiss=Array.isArray(S.rcMiss)?S.rcMiss:[];if(S.rcRev&&!Array.isArray(S.rcRev.rows))S.rcRev=null;
S.rc=Object.assign({open:false,start:0,end:0,res:{},att:true,only:false,ci:{}},S.rc||{});if(!S.rc.ci||typeof S.rc.ci!=="object")S.rc.ci={};
S.bc=Array.isArray(S.bc)?S.bc:[];
S.feeds=Array.isArray(S.feeds)?S.feeds:[];
S.days=S.days&&typeof S.days==="object"?S.days:{};S.log=Array.isArray(S.log)?S.log:[];S.reqs=Array.isArray(S.reqs)?S.reqs:[];S.ask=Array.isArray(S.ask)?S.ask:[];if(S.me&&typeof S.me!=="object")S.me=null;S.secCal=S.secCal&&typeof S.secCal==="object"?S.secCal:{};if(S.sync&&typeof S.sync!=="object")S.sync=null;
S.ready=S.ready&&typeof S.ready==="object"?S.ready:{};S.duty=Object.assign({rosters:[]},S.duty||{});if(!Array.isArray(S.duty.rosters))S.duty.rosters=[];S.tl=S.tl&&typeof S.tl==="object"?S.tl:{};
S.roll=Object.assign({units:{},own:true,name:""},S.roll||{});
if(S.newCo&&S.source==="sample"){S.roster=sampleRoster();let si=0;const sb=MIL_SECS.map(x=>x[0]);for(const m of S.roster)if(m.sec!=="ATT")m.sub=sb[si++%sb.length];delete S.newCo}else if(!S.roster.length&&S.source==="sample")S.roster=sampleRoster();if(!S.roll.units||typeof S.roll.units!=="object")S.roll.units={};
S.mus=Object.assign({open:false,seen:{},inc:["On Hand"],att:true,only:false,last:null},S.mus||{});
S.pt=Object.assign({event:"Unit PT",when:"",inc:["On Hand"],att:true},S.pt||{});
const dutyOf=m=>DUTIES.includes(m.duty)?m.duty:"Full Duty";
function save(){try{const t=JSON.stringify(S);if(window.VAULT&&VAULT.on())VAULT.write(t);else localStorage.setItem(KEY,t);storageOK=true}catch(e){storageOK=false}if(S.link&&typeof linkSchedule==="function")linkSchedule();if(typeof histTick==="function")histTick();if(typeof syncSchedule==="function")syncSchedule();if(typeof mpSchedule==="function")mpSchedule();if(S.board&&typeof rpSchedule==="function")rpSchedule();if(S.coRep&&typeof coSchedule==="function")coSchedule()}

let view="board", armed=null, query="";
const h0=(location.hash||"").slice(1).toLowerCase();
if(["board","hq","he","ce","ord","ut","att","pt","w6","text","data","muster","alerts","recall","events","armory","rollup","live","send","feed","trends","ready","duty","cal","log","me","sys","today","ask","people","tools","co","act"].includes(h0)||(Array.isArray(S.secs)&&S.secs.some(x=>String(x[0]).toLowerCase()===h0))) view=h0;

const $=s=>document.querySelector(s);

/* ---------- Accounted For Pro (iPhone app: Apple subscription; members always free) ---------- */
const PRO_IDS=["com.antoniotyler.accountedfor.pro.yearly","com.antoniotyler.accountedfor.pro.monthly"];
const PRO_GATE_WEB=false; /* web + Android stay unlocked until web billing exists */
const PRO_FEAT={co:"Company roll-up",rollup:"Roll up units",recall:"Recall drills",muster:"QR formation muster",trends:"Trends",w6:"6W incident reports",logins:"Member logins",xl:"Excel export"};
let proProducts=null,proBusy=false,proMsg="";
function proOK(){const N=window.MBN;if(!N||!N.on)return !PRO_GATE_WEB;if(S&&S.role==="view")return true;const p=N.pro||{};return !!p.active&&(!p.exp||p.exp>Date.now()-3*864e5)}
function proList(){return `<ul class="pro-list"><li>Company roll-up: platoons and sections feed one company page</li><li>Member logins: username and password instead of links</li><li>Recall drills with live Good / Delayed / Need help</li><li>QR formation muster</li><li>Excel export, trends and 6W incident reports</li></ul>`}
function proWallHTML(k){return `<div class="panel pro-wall"><span class="pro-badge">PRO</span><h2 style="margin:0">${PRO_FEAT[k]||"Accounted For Pro"}</h2><p class="note">Part of <b>Accounted For Pro</b>, for the person running the team. Members and section leaders always use the app free.</p>${proList()}<button class="btn" data-pro-open="${k}">See Pro</button></div>`}
function proPer(p){const n=p.periodCount||1;return n>1?`${n} ${p.period}s`:p.period}
function proPageHTML(){const N=window.MBN||{};let h=`<div class="panel pro-wall"><span class="pro-badge">PRO</span><h2 style="margin:0">Accounted For Pro</h2>`;
  if(!N.on){return h+`<p class="note">Pro is available in the iPhone app. Everything is unlocked here for now.</p></div>`}
  if(proOK()&&N.pro&&N.pro.active){const e=N.pro.exp?new Date(N.pro.exp).toLocaleDateString():"";return h+`<p><b style="color:var(--s-onhand)">● Pro is on.</b>${e?` Renews or ends ${esc(e)}.`:""}</p>${proList()}<button class="btn alt" data-pro-manage="1">Manage subscription</button></div>`}
  h+=`<p class="note">For the person running the team. Members and section leaders stay free.</p>${proList()}`;
  if(!proProducts)h+=`<p class="note">Loading prices from the App Store…</p>`;
  else if(!proProducts.length)h+=`<p class="note">Pro isn't available yet. Try again later.</p>`;
  else{const ps=PRO_IDS.map(id=>proProducts.find(p=>p.id===id)).filter(Boolean);
    for(const p of ps){const yr=p.period==="year";const mo=ps.find(x=>x.period==="month");const save=yr&&mo&&p.amount&&mo.amount?Math.round((1-p.amount/(mo.amount*12))*100):0;
      h+=`<button class="btn${yr?"":" alt"} pro-plan" data-pro-buy="${esc(p.id)}"${proBusy?" disabled":""}><span>${p.trial&&p.introDays?`${p.introDays} days free, then `:""}${esc(p.price)} / ${esc(proPer(p))}</span>${save>0?`<small> · save ${save}%</small>`:""}</button>`}}
  if(proMsg)h+=`<p class="note" style="color:var(--warn)">${esc(proMsg)}</p>`;
  h+=`<button class="btn alt" data-pro-restore="1"${proBusy?" disabled":""}>Restore purchases</button>`;
  h+=`<p class="note pro-legal">Payment is charged to your Apple ID. The subscription renews automatically unless canceled at least 24 hours before the end of the current period; your account is charged for renewal within 24 hours before the period ends. Manage or cancel any time in Settings → your name → Subscriptions. <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank">Terms of Use</a> · <a href="privacy.html" target="_blank">Privacy Policy</a></p></div>`;
  return h}
function openPro(k){proMsg="";$("#main").innerHTML=proPageHTML();window.scrollTo(0,0);const N=window.MBN;
  if(N&&N.on&&N.Pro&&!proProducts)N.Pro.products({ids:PRO_IDS}).then(r=>{proProducts=(r&&r.products)||[];if($(".pro-wall"))$("#main").innerHTML=proPageHTML()}).catch(e=>{proProducts=[];proMsg=String(e&&e.message||e);if($(".pro-wall"))$("#main").innerHTML=proPageHTML()})}
window.__proChanged=()=>{try{render()}catch(e){}};
document.addEventListener("click",async e=>{const t=e.target.closest("[data-pro-open],[data-pro-buy],[data-pro-restore],[data-pro-manage]");if(!t)return;e.preventDefault();const N=window.MBN||{};
  if(t.dataset.proOpen){openPro(t.dataset.proOpen);return}
  if(t.dataset.proManage){N.Pro&&N.Pro.manage();return}
  if(!N.Pro||proBusy)return;proBusy=true;proMsg="";$("#main").innerHTML=proPageHTML();
  try{const r=t.dataset.proBuy?await N.Pro.buy({id:t.dataset.proBuy}):await N.Pro.restore();N.setPro&&N.setPro(r);
    if(r&&r.result==="pending")proMsg="Waiting for approval (Ask to Buy). Pro turns on when it's approved.";
    else if(t.dataset.proRestore&&!(r&&r.active))proMsg="No active Pro subscription found on this Apple ID.";
    else if(r&&r.active){try{navigator.vibrate&&navigator.vibrate(20)}catch(_){}}}
  catch(err){proMsg=String(err&&err.message||err)}
  proBusy=false;if(N.pro&&N.pro.active&&!proMsg){render()}else $("#main").innerHTML=proPageHTML()});
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function toast(t){const el=$("#toast");el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,2200)}

function counts(){
  const c={};for(const [k] of SECTIONS){c[k]={total:0};STATUSES.forEach(s=>c[k][s]=0)}
  for(const m of S.roster){if(!c[m.sec])continue;c[m.sec].total++;if(c[m.sec][m.status]!==undefined)c[m.sec][m.status]++}
  const T={total:0};STATUSES.forEach(s=>T[s]=0);
  for(const [k] of SECTIONS){T.total+=c[k].total;STATUSES.forEach(s=>T[s]+=c[k][s])}
  const A={total:0};STATUSES.forEach(x=>A[x]=0);
  for(const m of S.roster){if(m.sec!=="ATT")continue;A.total++;if(A[m.status]!==undefined)A[m.status]++}
  c.ATT=A;
  return {c,T,A};
}
const present=o=>PRESENT.reduce((a,s)=>a+o[s],0);
const pct=(a,b)=>b?Math.round(100*a/b):0;

function zoneLetter(){const off=-new Date().getTimezoneOffset()/60;if(!Number.isInteger(off))return"";if(off===0)return"Z";
  if(off>0&&off<=12)return"ABCDEFGHIKLM"[off-1];if(off<0&&off>=-12)return"NOPQRSTUVWXY"[-off-1];return""}
function dtg(d=new Date()){const M=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const p=n=>String(n).padStart(2,"0");return p(d.getDate())+p(d.getHours())+p(d.getMinutes())+zoneLetter()+" "+M[d.getMonth()]+" "+String(d.getFullYear()).slice(2)}

function rankIdx(r){const i=RANKS.indexOf(r);if(i>=0)return i;const j=MIL_RANKS.indexOf(r);return j<0?99:50+j}
function sorted(list){return list.slice().sort((a,b)=>rankIdx(a.rank)-rankIdx(b.rank)||a.name.localeCompare(b.name))}

/* ---------- render ---------- */
function renderTabs(){renderShell();
  const {c,T}=counts();
  const items=[["board","BOARD",T["On Hand"]+"/"+T.total]].concat(SECTIONS.map(([k])=>[k.toLowerCase(),k,c[k]["On Hand"]+"/"+c[k].total])).concat([["att","ATT","+"+c.ATT.total]]);
  $("#tabs").innerHTML=items.map(([id,lbl,sub])=>`<button role="tab" data-v="${id}" aria-selected="${view===id}">${lbl}<small>${sub}</small></button>`).join("");
  {const mm=memberMode();document.body.classList.toggle("member-mode",mm);const bt=$("#bToday");if(bt){bt.hidden=!(mm||S.me||S.feeds.some(f=>!f.lk));bt.setAttribute("aria-pressed",view==="today")}}$("#b6W").setAttribute("aria-pressed",view==="w6");$("#bFeed").setAttribute("aria-pressed",view==="feed");{const n=fdUnread();const fb=$("#fdBadge");if(fb){fb.hidden=!n;fb.textContent=n>9?"9+":n}}$("#bPT").setAttribute("aria-pressed",view==="pt");$("#bText").setAttribute("aria-pressed",view==="text");$("#bData").setAttribute("aria-pressed",view==="data");
  $("#dtg").textContent="As of "+new Date().toLocaleString([],{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});{const wb=$("#wsBar");if(wb){const cur=S.wsCur||"plt";wb.innerHTML=(S.ws&&Object.keys(S.ws).length)||(cur==="co"&&!S.role)?[["plt","PLT"],["co","CO"]].map(([k,l])=>`<button data-wsgo="${k}" aria-pressed="${k===cur}" aria-label="${k==="co"?"Company":"Platoon"} view">${l}</button>`).join(""):cur==="co"?`<button aria-pressed="true" disabled>COMPANY</button>`:""}}
  {const tp=document.querySelector(".top");if(tp)document.documentElement.style.setProperty("--hdr",tp.offsetHeight+"px")}
}
function banner(){if(S.role==="view")return `<div class="banner"><span><b>View-only phone.</b> You see the shared board; changes here aren't saved.</span></div>`+banner0();return banner0()}
function banner0(){
  if((S.wsCur||"plt")!=="co"&&S.level==="co"&&isOwner()&&typeof restoreHTML==="function")return `<div class="banner" style="border-color:var(--warn)"><span><b>Your platoon view is showing company data.</b> Put your platoon back.</span><button data-go="data">Restore</button></div>`;
  {const sb=staleBanner();if(sb)return sb}
  const LK=S.link;if(LK&&LK.rk2){if(!LK.pulled)return `<div class="banner"><span>${LK.perr?esc(LK.perr):`Loading <b>${esc(LK.sec)}</b> from ${esc(LK.unit)}'s board…`}</span>${LK.perr?`<button id="lkRetry">Retry</button>`:""}</div>`;
    if(!LK.me)return `<div class="banner"><span><b>${esc(LK.sec)}</b> roster from ${esc(LK.unit)}. Add your name so they see who sent updates.</span><button id="lkName">Add name</button></div>`}
  if(S.source==="sample"&&!memberMode()) return `<div class="banner"><span>Showing <b>sample Marines</b>. Load your MOL detail list to start.</span><button data-go="data">Load roster</button></div>`;
  if(!storageOK) return `<div class="banner"><span>This browser isn't saving changes. Export a backup from DATA before closing.</span></div>`;
  return "";
}
function dutyCounts(list){const d={"Full Duty":0,"Light Duty":0,"LIMDU":0};list.forEach(m=>d[dutyOf(m)]++);return d}
function dutyChips(list){const d=dutyCounts(list);return `<span class="chip">Full Duty ${d["Full Duty"]}</span><span class="chip" style="color:var(--s-duty)">Light Duty ${d["Light Duty"]}</span><span class="chip" style="color:var(--warn)">LIMDU ${d["LIMDU"]}</span>`}
function renderSection(code){
  const isAtt=code==="ATT";const name=isAtt?ATT[1]:SECTIONS.find(s=>s[0]===code)[1];const {c}=counts();const o=c[code];
  const list=sorted(S.roster.filter(m=>m.sec===code)).filter(m=>!query||(m.rank+" "+m.name).toLowerCase().includes(query));
  let h=banner();
  h+=`<div class="sechead"><h2>${code} · ${esc(name)}</h2><div class="ratio">${o["On Hand"]}/${o.total}<small>${isAtt?"on hand / attached":"on hand / strength"}</small></div></div>`;
  if(isAtt) h+=`<p class="note">Marines physically with us but carried on another unit's numbers (FAP in, TAD to us, attachments). They are tracked here and in the text report, but not added to Total Strength.</p>`;
  h+=`<div class="chips">${STATUSES.filter(s=>o[s]).map(s=>`<span class="chip"><span class="dot" style="background:var(${SVAR[s]})"></span>${SHORT[s]} ${o[s]}</span>`).join("")||'<span class="note">No Marines in this section yet.</span>'}</div>`;
  if(o.total>8) h+=`<input class="search" id="q" type="search" placeholder="Find a Marine" value="${esc(query)}">`;
  h+=`<div class="list">${list.map(m=>{
    const det=[m.parent?("From "+m.parent):"",m.detail,m.end?("thru "+m.end):""].filter(Boolean).join(" · ");
    return `<div class="m" style="--sc:var(${SVAR[m.status]})"><div class="who"><div class="nmrow"><div data-pcard="${m.id}" style="cursor:pointer;min-width:0"><b>${esc(m.rank)}</b><span class="nm" style="text-decoration:underline;text-decoration-color:var(--line);text-underline-offset:3px">${esc(m.name)}</span>${dutyOf(m)==="Light Duty"?'<span class="tag ld">LD</span>':dutyOf(m)==="LIMDU"?'<span class="tag lim">LIMDU</span>':""}${m.upd&&Date.now()-m.upd.t<86400000?`<span class="tag" style="color:var(--s-onhand)" title="Updated live by section leader">↻ ${dtg(new Date(m.upd.t)).slice(2,6)}</span>`:""}</div>${ctBtns(m)}</div>
      ${det?`<div class="det">${esc(det)}</div>`:""}<button class="rm${armed===m.id?" arm":""}" data-rm="${m.id}">${armed===m.id?"Tap again to remove":"Remove"}</button><button class="w6" data-w6="${m.id}">6W</button></div><div class="pick">${statusSelect(m.id,m.status)}${dutySelect(m.id,dutyOf(m))}</div></div>`}).join("")}</div>`;
  h+=`<form class="addbox" id="addf"><h3>${isAtt?"Add an attached Marine":"Add a Marine to "+code}</h3>
    <select id="aRank" aria-label="Rank">${RANKS.map(r=>`<option${r===(MODE().rankDef||"LCPL")?" selected":""}>${r}</option>`).join("")}</select>
    <input id="aName" placeholder="LAST, FIRST M." autocomplete="off" aria-label="Name" required>
    ${isAtt?`<input id="aParent" class="full" placeholder="Parent unit (e.g. CLB-3, 7th ESB)" autocomplete="off" aria-label="Parent unit" required>
    <select id="aWith" aria-label="Working with"><option value="">With…</option>${SECTIONS.map(([k])=>`<option>${k}</option>`).join("")}</select>
    <input id="aEnd" type="date" aria-label="Attached through" title="Attached through">`:""}
    <select id="aDuty" class="full" aria-label="Duty status">${DUTIES.map(d=>`<option>${d}</option>`).join("")}</select>
    <select id="aStatus" class="full" aria-label="Status">${STATUSES.map(s=>`<option>${s}</option>`).join("")}</select>
    <button class="btn full" type="submit">Add Marine</button></form>`;
  if(!isAtt&&S.link&&S.link.mysec===code)h+=`<div class="sync"><h3>● Live to ${esc(S.link.unit)}</h3><div class="note">Changes here go to their board by themselves. ${linkStatus()}</div></div>`;
  if(!isAtt&&o.total){const ut=sectionUpdateText(code);h+=`<div class="sync"><h3>Section leader: send ${code} update to OIC</h3><div class="note">Sends this section's statuses with a code line the OIC's app reads. Everyone not listed is On Hand, Full Duty.</div>
    <div class="row2"><a class="btn" href="${esc(smsHref(ut))}">Text ${code} update</a><button class="btn alt" data-scopy="${code}">Copy</button></div></div>`}
  $("#main").innerHTML=h;
}
function reportText(){
  const {c,T,A}=counts();const L=[];
  L.push(unitName().toUpperCase()+" ACCOUNTABILITY "+dtg());
  L.push("TOTAL STRENGTH: "+T.total);
  L.push("ON HAND: "+T["On Hand"]+" ("+pct(T["On Hand"],T.total)+"%)");
  L.push("PRESENT ON DECK: "+present(T));
  {const d=dutyCounts(S.roster.filter(m=>m.sec!=="ATT"));L.push("FULL DUTY "+d["Full Duty"]+" / LIGHT DUTY "+d["Light Duty"]+" / LIMDU "+d["LIMDU"]);}
  L.push("");
  for(const [k] of SECTIONS) L.push(k+" "+c[k]["On Hand"]+"/"+c[k].total);
  L.push("");
  for(const s of STATUSES.slice(1)) L.push(SHORT[s].toUpperCase()+": "+T[s]);
  {const al=alerts();if(al.over.length||al.ret.length){L.push("");if(al.over.length)L.push("OVERDUE: "+al.over.length+(S.names?" ("+al.over.map(a=>a.m.rank+" "+a.m.name.split(",")[0]).join(", ")+")":""));if(al.ret.length)L.push("RETURNING 7 DAYS: "+al.ret.length)}}
  {const R=readySum();if(R.items&&(R.over||R.soon)){L.push("");L.push("READINESS: "+R.over+" OVERDUE / "+R.soon+" DUE 30 DAYS")}}
  if(S.chg!==false&&S.snap){L.push("");changeLines().forEach(x=>L.push(x))}
  if(A.total){L.push("");L.push("ATTACHED (NOT ON STRENGTH): "+A.total+" (ON HAND "+A["On Hand"]+")");L.push("TOTAL ACCOUNTED FOR: "+(T.total+A.total));
    if(S.names) sorted(S.roster.filter(m=>m.sec==="ATT")).forEach(m=>L.push("- "+m.rank+" "+m.name.split(",")[0]+(m.parent?" ("+m.parent+")":"")+" "+SHORT[m.status].toUpperCase()))}
  if(S.names){
    for(const s of STATUSES.slice(1)){const ms=sorted(S.roster.filter(m=>m.status===s&&m.sec!=="ATT"));if(!ms.length)continue;
      L.push("");L.push(SHORT[s].toUpperCase()+":");ms.forEach(m=>L.push("- "+m.sec+" "+m.rank+" "+m.name.split(",")[0]))}
  }
  if(S.rollCode!==false){L.push("");L.push(rollCode(ownNums()))}
  return L.join("\n");
}
function smsHref(txt){const to=S.recipients.split(/[,;\s]+/).map(x=>x.replace(/[^\d+]/g,"")).filter(Boolean).join(",");
  return "sms:"+to+"?&body="+encodeURIComponent(txt)}
function renderText(){
  const t=reportText();
  let h=banner();
  h+=`<h2>Text the numbers</h2><div class="panel">
    <label for="rcp">Send to (phone numbers, comma separated)</label>
    <input type="tel" id="rcp" value="${esc(S.recipients)}" placeholder="808 555 0100, 808 555 0101">
    <label for="unitNm">Your unit's name on reports</label>
    <input type="text" id="unitNm" value="${esc(S.unit||"")}" maxlength="24" placeholder="${esc(unitName())}" autocapitalize="characters" style="text-transform:uppercase">
    <label class="tog"><input type="checkbox" id="nm"${S.names?" checked":""}> Include last names of Marines off deck</label>
    <label class="tog"><input type="checkbox" id="rollc"${S.rollCode!==false?" checked":""}> Add rollup code line (lets the next level up add your numbers in ROLLUP)</label>
    <label class="tog"><input type="checkbox" id="chg"${S.chg!==false?" checked":""}> Include changes since last report${S.snap?"":" (starts after your first send)"}</label>
    <textarea id="msg" readonly aria-label="Report text">${esc(t)}</textarea>
    <div class="row2"><a class="btn" id="sms" href="${esc(smsHref(t))}">Text it</a><button class="btn alt" id="copy">Copy text</button></div>
    ${navigator.share?'<button class="btn alt" id="share">Share to Signal, Teams, email…</button>':''}
    <button class="btn alt" id="markSent">Mark as sent (start a new change window)</button>
    <p class="note">"Text it" opens your Messages app with the numbers and recipients filled in. Review and hit send there. Text it, Copy and Share also mark the report as sent, so the next report shows what changed since this one.${S.names?" Names are in the text: send only over approved channels.":""}</p>
  </div>`;
  $("#main").innerHTML=h;
}
function renderData(){
  const {T}=counts();
  let h=`<h2>App version</h2><div class="panel vpanel" data-noxl><div><b>${MODE().name}</b> · <span class="mdesc">${MODE().desc}</span></div><button class="btn alt" data-mode-open>Change / send</button></div>
  <h2>Roster data</h2><div class="panel">
    <div><b>${T.total}</b> Marines loaded · ${S.source==="sample"?"sample data":S.source==="mol"?"from MOL detail list":S.source==="link"?"from your OIC's board":"from backup"}${S.loadedAt?" · "+esc(S.loadedAt):""}</div>
    ${S.level==="co"?coRosterHTML():""}<label for="file">${S.level==="co"?"Or load a MOL detail list (.csv) or backup":"Load MOL detail list (.csv) or a backup from this app"}</label>
    <input type="file" id="file" accept=".csv,text/csv">
    <p class="note">Loading replaces the current roster. EDIPI and sex columns are skipped and never stored.</p>
    <button class="btn alt" data-addm="" style="width:100%">+ Add Marines</button>
    <label for="fileAdd">Add more Marines from a file (keeps everyone already here)</label><input type="file" id="fileAdd" accept=".csv,.xlsx,.xls,.numbers,text/csv"><div class="note" id="fileAddOut"></div>
    <button class="btn" data-xl="all">⬇ Export everything to Excel</button>
    <p class="note">Roster, readiness, trends, duty, attendance and feed confirmations, one sheet each. It includes names and phone numbers: handle it like any personnel file.</p>
    <button class="btn alt" id="exp" hidden>Export backup (.csv)</button>
    <button class="btn warn" id="reset">${armed==="reset"?"Tap again to clear the roster":"Clear roster and show sample"}</button>
  </div>
  ${levelHTML()}
  ${syncHTML()}
  ${tabsHTML()}
  ${displayHTML()}
  ${secHTML()}
  ${aboutHTML()}
  <h2>Recall roster (phone numbers)</h2><div class="panel">
    <label for="rcFile">Load recall roster (Excel, CSV, PDF, Word, .vcf)</label><input type="file" id="rcFile" accept=".csv,.txt,.xlsx,.xls,.vcf,.pdf,.docx,text/csv,text/plain,text/vcard,application/pdf">
    <label for="rcPaste">Or paste lines like: CPL SMITH, JOHN A. 808-555-0100</label>
    <textarea id="rcPaste" style="min-height:90px" placeholder="LCPL DOE, JANE 808 555 0101"></textarea>
    <button class="btn" id="rcPasteGo">Read numbers</button><div class="note" id="rcOut"></div>
    <p class="note">Numbers attach to Marines already in the app, matched by name. They stay on this phone only and carry over when you load a new MOL list.</p></div>
  <h2>Apply section updates</h2><div class="panel">
    <label for="syncIn">Paste one or more section leader texts</label>
    <textarea id="syncIn" style="min-height:110px" placeholder="HE SECTION UPDATE ...&#10;#EOOP1|HE|34|..."></textarea>
    <button class="btn" id="syncGo">Apply to board</button><div class="note" id="syncOut"></div></div>
  <h2>Live section updates</h2><div class="panel"><p class="note">${S.board?"<b style='color:var(--s-onhand)'>● On</b> for your board.":"Off."}${S.link?" This phone sends "+esc(S.link.mysec)+" to "+esc(S.link.unit)+".":""}</p><button class="btn alt" data-go="live">${S.board||S.link?"Manage":"Set up"} live section updates</button></div>
  <h2>System check</h2><div class="panel"><p class="note">Something not working (live sections, Feed, backup, alerts)? This tests your server setup and shows exactly what to paste to fix it.</p><button class="btn alt" data-go="sys">Open system check</button></div>
  <h2>My pages</h2><div class="panel"><p class="note">${S.roster.filter(m=>m.pk).length} of ${S.roster.length} people have a private My page.${S.mpErr?` <span style="color:var(--warn)">Last error: ${esc(S.mpErr)}</span>`:""} Turn it on from each person's card, or for everyone with a number below. Each link is private, so it's sent one text at a time.</p>
    <button class="btn alt" id="mpAll">Turn on for everyone with a phone number</button><div class="alist">${sorted(S.roster.filter(m=>m.pk&&m.phone&&!m.pkSent)).slice(0,60).map(m=>`<div class="rtop"><div class="who">${esc(m.rank+" "+m.name)}</div><a class="btn alt" data-mpsent="${m.id}" href="${esc("sms:+1"+m.phone+"?&body="+encodeURIComponent(unitName()+": your private My page (status, duty, due-outs, calendar) and the unit Feed. Keep this link to yourself: "+mpLink(m)+" · iPhone: open in Safari, then Share → Add to Home Screen so alerts work."))}">Text link</a></div>`).join("")}</div></div>
  <h2>Live check-in</h2><div class="panel"><label class="tog"><input type="checkbox" id="liveTog"${S.live!==false?" checked":""}> Recall check-ins appear on my board by themselves</label>
    <p class="note">Uses a small relay server. It never gets names or phone numbers: only scrambled codes of what each person types, Good/Delayed/Help and their short note. Each recall deletes itself when you close it out, or after 72 hours. Turn off to use text replies only.</p></div>
  <h2>Offline</h2><div class="panel"><div id="offStat" class="note">Checking…</div></div>
  <h2>How this app keeps data</h2><div class="panel"><ul class="plain">
    <li>The roster lives only in this phone's browser. Nothing is uploaded or shared.</li>
    <li>Each phone keeps its own copy. Export a backup and load it on another phone to hand off.</li>
    <li>Clearing website data or using a private tab wipes it. Export a backup after big changes.</li>
    <li>Muster history, saved 6Ws and the last-report snapshot stay on this phone; they are not in the backup file.</li>
    <li>Light Duty / LIMDU settings carry over when you load a new MOL list (matched by name).</li>
    <li>Attached Marines (ATT tab) stay in the app when you load a new MOL list.</li>
    <li>MOL status mapping: Present for Duty → On Hand, Leave → Leave, TAD/FAP → TAD, Field Duty → Operation, Medical/SIQ → Appt On Base. EE section → HE; no section → HQ.</li>
  </ul></div>
  <h2>Put it on your home screen</h2><div class="panel"><ul class="plain">
    <li><b>iPhone:</b> open this page's web address in Safari → Share → Add to Home Screen.</li>
    <li><b>Android:</b> open in Chrome → ⋮ menu → Add to Home screen.</li>
  </ul></div>`;
  $("#main").innerHTML=h;
  {const o=$("#offStat");if(o){const sw="serviceWorker" in navigator&&document.querySelector("link[rel=manifest]");o.textContent=window.MBN&&MBN.on?"Ready: the app is installed on this phone and works with no signal. Text reports once you have service.":!sw?"Offline mode works from the home-screen app at the GitHub link, not inside Claude.":navigator.serviceWorker.controller?"Ready: this app opens and works with no signal. Text reports once you have service.":"Setting up offline mode. Open the app once more with signal to finish."}}
  dl.then(d=>{const b=$("#exp");if(b&&d)b.hidden=false});
}
function ptGroups(){
  const pool=S.roster.filter(m=>m.sec!=="ATT"||S.pt.att);
  const here=pool.filter(m=>S.pt.inc.includes(m.status));
  const go=here.filter(m=>dutyOf(m)==="Full Duty");
  const ld=here.filter(m=>dutyOf(m)==="Light Duty"), lim=here.filter(m=>dutyOf(m)==="LIMDU");
  const out=pool.filter(m=>!S.pt.inc.includes(m.status));
  return {go,ld,lim,out};
}
const secOf=m=>m.sec==="ATT"?"ATT":m.sec;
function bySec(list){const g={};for(const m of sorted(list)){(g[secOf(m)]=g[secOf(m)]||[]).push(m)}return SECTIONS.map(s=>s[0]).concat("ATT").filter(k=>g[k]).map(k=>[k,g[k]])}
function ptText(){const {go,ld,lim}=ptGroups();const L=[];
  L.push((S.pt.event||"PT").toUpperCase()+" ROSTER "+(S.pt.when||dtg()));
  L.push("AVAILABLE (FULL DUTY): "+go.length);
  if(ld.length||lim.length) L.push("ON HAND, NOT PARTICIPATING: LIGHT DUTY "+ld.length+" / LIMDU "+lim.length);
  for(const [k,ms] of bySec(go)){L.push("");L.push(k+" ("+ms.length+")");ms.forEach(m=>L.push("- "+m.rank+" "+m.name))}
  if(ld.length||lim.length){L.push("");L.push("NOT PARTICIPATING");sorted(ld.concat(lim)).forEach(m=>L.push("- "+secOf(m)+" "+m.rank+" "+m.name.split(",")[0]+" ("+(dutyOf(m)==="LIMDU"?"LIMDU":"LD")+")"))}
  return L.join("\n")}
function renderPT(){
  const {go,ld,lim,out}=ptGroups();
  let h=banner();
  h+=`<h2>Physical activity roster</h2><div class="panel"><div class="evts">${EVENTS.map(e=>`<button data-evt="${e}" aria-pressed="${S.pt.event===e}">${e}</button>`).join("")}</div>
    <div class="row2"><div><label for="ptEvt">Event</label><input type="text" id="ptEvt" value="${esc(S.pt.event)}"></div><div><label for="ptWhen">When</label><input type="text" id="ptWhen" value="${esc(S.pt.when)}" placeholder="${dtg()}"></div></div>
    <div class="note">Count Marines whose status is:</div><div class="evts">${STATUSES.filter(x=>["On Hand","Company Duties","Appointment on Base"].includes(x)).map(x=>`<label class="tog"><input type="checkbox" data-inc="${x}"${S.pt.inc.includes(x)?" checked":""}> ${SHORT[x]}</label>`).join("")}<label class="tog"><input type="checkbox" id="ptAtt"${S.pt.att?" checked":""}> Attached</label></div></div>`;
  h+=`<div class="pt-sum" style="margin-top:12px"><div class="go"><b>${go.length}</b><span>Available</span></div><div><b>${ld.length+lim.length}</b><span>LD / LIMDU</span></div><div><b>${out.length}</b><span>Not here</span></div></div>`;
  h+=`<div class="row2" style="margin-top:12px"><button class="btn" id="ptCopy">Copy list</button><a class="btn alt" id="ptSms" href="${esc(smsHref(ptText()))}">Text list</a></div>`;
  for(const [k,ms] of bySec(go)) h+=`<div class="grp"><h3><span>${k}</span><span>${ms.length}</span></h3><div class="names">${ms.map(m=>`<div><b>${esc(m.rank)}</b> ${esc(m.name)}${m.sec==="ATT"&&m.parent?` <span class="note">(${esc(m.parent)})</span>`:""}</div>`).join("")}</div></div>`;
  if(!go.length) h+=`<p class="note" style="margin-top:12px">No one is available with these settings.</p>`;
  if(ld.length||lim.length) h+=`<div class="grp"><h3><span>On hand · not participating</span><span>${ld.length+lim.length}</span></h3><div class="names">${sorted(ld.concat(lim)).map(m=>`<div><b>${esc(m.rank)}</b> ${esc(m.name)} <span class="tag ${dutyOf(m)==="LIMDU"?"lim":"ld"}">${dutyOf(m)==="LIMDU"?"LIMDU":"LD"}</span> <span class="note">${secOf(m)}</span></div>`).join("")}</div></div>`;
  h+=`<p class="note" style="margin-top:10px">Available = selected statuses + Full Duty. Set Light Duty or LIMDU on each Marine in the section tabs.</p>`;
  $("#main").innerHTML=h;
}

const W_TYPES=["Liberty incident","Injury","Vehicle accident","UA / missed movement","Medical","Family emergency","Other"];
const W_FIELDS=[["what","WHAT","What happened. Facts only, in order."],["where","WHERE","Location: building, base, city, grid"],["why","WHY","Cause or circumstances, if known"],["how","HOW","How it happened / how it was discovered"],["act","ACTIONS TAKEN","Actions taken, who was notified (SNCOIC, OIC, CO, OOD, PMO), current status"]];
let W=null;
function newW(id){const now=new Date();const p=n=>String(n).padStart(2,"0");
  return {id:"w"+Date.now(),mid:id||"",other:"",type:"",kind:"INITIAL",when:now.getFullYear()+"-"+p(now.getMonth()+1)+"-"+p(now.getDate())+"T"+p(now.getHours())+":"+p(now.getMinutes()),what:"",where:"",why:"",how:"",act:"",created:""}}
function wWho(w){const m=S.roster.find(x=>x.id===w.mid);let s=m?(m.rank+" "+m.name+" / "+(m.sec==="ATT"?"ATTACHED"+(m.parent?" ("+m.parent+")":""):m.sec)+", "+unitName().toUpperCase()):"";
  if(w.other.trim()) s+=(s?"; ":"")+w.other.trim().toUpperCase();return s||"(select a Marine)"}
function wText(w){const d=w.when?dtg(new Date(w.when)):"";const L=[];
  L.push("6W REPORT ("+w.kind+")"+(w.type?" - "+w.type.toUpperCase():""));
  L.push("DTG: "+dtg());
  L.push("WHO: "+wWho(w));
  L.push("WHAT: "+(w.what.trim()||"-"));
  L.push("WHEN: "+(d||"-"));
  L.push("WHERE: "+(w.where.trim()||"-"));
  L.push("WHY: "+(w.why.trim()||"UNK"));
  L.push("HOW: "+(w.how.trim()||"UNK"));
  L.push("ACTIONS TAKEN: "+(w.act.trim()||"-"));
  if(S.reporter) L.push("REPORTED BY: "+S.reporter.toUpperCase());
  return L.join("\n")}
function renderW(){
  if(!W) W=newW("");
  const opts=SECTIONS.map(s=>s[0]).concat("ATT").map(k=>{const ms=sorted(S.roster.filter(m=>m.sec===k));if(!ms.length)return"";
    return `<optgroup label="${k}">${ms.map(m=>`<option value="${m.id}"${m.id===W.mid?" selected":""}>${esc(m.rank+" "+m.name)}</option>`).join("")}</optgroup>`}).join("");
  const m=S.roster.find(x=>x.id===W.mid);
  let h=banner();
  h+=`<h2>6W report</h2><div class="panel">
    <div class="evts">${["INITIAL","UPDATE","FINAL"].map(k=>`<button data-wkind="${k}" aria-pressed="${W.kind===k}">${k[0]+k.slice(1).toLowerCase()}</button>`).join("")}</div>
    <label for="wMar">WHO · Marine</label>
    <select id="wMar" class="wsel"><option value="">Select a Marine…</option>${opts}</select>
    ${m?`<div class="note">${esc(m.rank+" "+m.name)} · ${m.sec==="ATT"?"Attached":m.sec} · ${esc(m.status)} · ${esc(dutyOf(m))}</div>`:""}
    <input type="text" id="wOther" value="${esc(W.other)}" placeholder="Others involved (optional)">
    <label>Type</label>
    <div class="evts">${W_TYPES.map(t=>`<button data-wtype="${t}" aria-pressed="${W.type===t}">${t}</button>`).join("")}</div>
    <label for="wWhen">WHEN</label><input type="datetime-local" id="wWhen" value="${esc(W.when)}" class="wsel">
    ${W_FIELDS.map(([k,l,ph])=>`<label for="w_${k}">${l}</label><textarea class="wta" id="w_${k}" data-wf="${k}" placeholder="${ph}">${esc(W[k])}</textarea>`).join("")}
    <label for="wRep">Reported by</label><input type="text" id="wRep" value="${esc(S.reporter||"")}" placeholder="Rank Name, billet">
  </div>
  <h2>Preview</h2><div class="panel"><textarea id="wMsg" readonly aria-label="Incident report preview">${esc(wText(W))}</textarea>
    <div class="row2"><a class="btn" id="wSms" href="${esc(smsHref(wText(W)))}">Text it</a><button class="btn alt" id="wCopy">Copy</button></div>
    <div class="row2"><button class="btn alt" id="wSave">Save to log</button><button class="btn alt" id="wNew">New report</button></div>
    <p class="note">Texts go to the numbers saved on the TEXT screen. Check Messages before assuming it sent. Send incident details only over channels your command approves.</p></div>`;
  const log=(S.w6||[]).slice().reverse();
  h+=`<h2>Saved 6Ws</h2>`+(log.length?`<div class="list">${log.map(r=>{const mm=S.roster.find(x=>x.id===r.mid);return `<div class="m" style="--sc:var(--brass)"><div class="who"><div><b>${r.kind}</b><span class="nm">${esc(mm?mm.rank+" "+mm.name:(r.other||"Unknown"))}</span></div><div class="det">${esc((r.type||"6W")+" · "+(r.when?dtg(new Date(r.when)):""))}</div><button class="rm${armed===r.id?" arm":""}" data-wdel="${r.id}">${armed===r.id?"Tap again to delete":"Delete"}</button></div><button class="btn alt" data-wopen="${r.id}">Open</button></div>`}).join("")}</div>`:`<p class="note">No saved reports on this phone yet.</p>`);
  $("#main").innerHTML=h;
}
function refreshW(){const t=wText(W);const a=$("#wMsg");if(a)a.value=t;const s=$("#wSms");if(s)s.href=smsHref(t)}

/* ---------- dates ---------- */
const MON=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
function parseD(s){if(!s)return null;s=String(s).trim().toUpperCase();let m=s.match(/^(\d{1,2}) ([A-Z]{3}) (\d{2,4})$/);
  if(m){const y=+m[3]<100?2000+ +m[3]:+m[3];const mo=MON.indexOf(m[2]);if(mo<0)return null;return new Date(y,mo,+m[1])}
  m=s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);if(m)return new Date(+m[1],+m[2]-1,+m[3]);return null}
function today0(){const d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate())}
const dayDiff=d=>Math.round((d-today0())/86400000);
const short=d=>String(d.getDate()).padStart(2,"0")+" "+MON[d.getMonth()];

/* ---------- alerts: overdue, returning, departing ---------- */
const AWAY=["Leave","TAD","Operation","Appointment off Base"];
function alerts(){const over=[],ret=[],dep=[];
  for(const m of S.roster){const e=parseD(m.end);
    if(e){const dd=dayDiff(e);
      if(m.sec==="ATT"){if(dd<0)over.push({m,dd,why:"Attachment ended "+short(e)})}
      else if(AWAY.includes(m.status)){if(dd<0)over.push({m,dd,why:m.status+" ended "+short(e)});else if(dd<=7)ret.push({m,dd,why:m.status+" ends "+short(e)})}}
    const x=parseD(m.edd);if(x&&m.sec!=="ATT"){const dd=dayDiff(x);if(dd<=90)dep.push({m,dd,why:"EDD "+short(x)+" "+String(x.getFullYear()).slice(2)})}}
  over.sort((a,b)=>a.dd-b.dd);ret.sort((a,b)=>a.dd-b.dd);dep.sort((a,b)=>a.dd-b.dd);return {over,ret,dep}}
function arow(a,label,col){const m=a.m;return `<div class="arow" style="--sc:var(${col})"><div style="min-width:0"><b>${esc(m.rank)}</b> ${esc(m.name)}<div class="note">${m.sec==="ATT"?"ATT":m.sec} · ${esc(a.why)}</div></div><div class="when">${label}</div></div>`}
function alertsText(){const {over,ret,dep}=alerts();const L=[unitName().toUpperCase()+" ALERTS "+dtg()];
  const line=(a,t)=>"- "+(a.m.sec==="ATT"?"ATT":a.m.sec)+" "+a.m.rank+" "+a.m.name.split(",")[0]+": "+a.why+(t?" ("+t+")":"");
  {const cf=upcomingConflicts(14);if(cf.length){L.push("");L.push("CONFLICTS NEXT 14 DAYS ("+cf.length+")");cf.forEach(c=>{const d=parseD(c.d);L.push("- "+DOW[d.getDay()]+" "+short(d)+" "+c.what.toUpperCase()+": "+c.m.sec+" "+c.m.rank+" "+lastOf(c.m)+" ("+c.cf.map(x=>x.s.toUpperCase()).join(", ")+")")})}}
  L.push("");L.push("OVERDUE ("+over.length+")");over.forEach(a=>L.push(line(a,(-a.dd)+"D")));
  L.push("");L.push("RETURNING 7 DAYS ("+ret.length+")");ret.forEach(a=>L.push(line(a,a.dd?"IN "+a.dd+"D":"TODAY")));
  L.push("");L.push("DEPARTING 90 DAYS ("+dep.length+")");dep.forEach(a=>L.push(line(a,a.dd<0?"PAST":a.dd+"D")));
  return L.join("\n")}
function renderAlerts(){const {over,ret,dep}=alerts();let h=banner();
  {const cf=upcomingConflicts(14);h+=`<div class="ahead"><h2>Conflicts · next 14 days</h2><span>${cf.length}</span></div>`;h+=cf.length?`<div class="alist">${cf.map(cfRow).join("")}</div>`:`<p class="note">No one is double-booked on duty or events.</p>`}
  h+=`<div class="ahead"><h2>Overdue</h2><span>${over.length}</span></div>`;
  h+=over.length?`<div class="alist">${over.map(a=>arow(a,(-a.dd)+"d late","--warn")).join("")}</div>`:`<p class="note">No one is past their leave, TAD or attachment end date.</p>`;
  h+=`<div class="ahead"><h2>Returning ≤ 7 days</h2><span>${ret.length}</span></div>`;
  h+=ret.length?`<div class="alist">${ret.map(a=>arow(a,a.dd?"in "+a.dd+"d":"today","--s-aob")).join("")}</div>`:`<p class="note">No returns due this week.</p>`;
  const b=[[ -9999,-1,"Past EDD"],[0,30,"Next 30 days"],[31,60,"31–60 days"],[61,90,"61–90 days"]];
  h+=`<div class="ahead"><h2>Departing (EDD)</h2><span>${dep.length}</span></div>`;
  if(!dep.length) h+=`<p class="note">No EDDs in the next 90 days. EDDs come from the MOL detail list.</p>`;
  for(const [lo,hi,lab] of b){const g=dep.filter(a=>a.dd>=lo&&a.dd<=hi);if(!g.length)continue;
    h+=`<div class="note" style="margin:8px 0 4px;font-weight:700">${lab} · ${g.length}</div><div class="alist">${g.map(a=>arow(a,a.dd<0?"past":a.dd+"d",a.dd<0?"--warn":"--s-duty")).join("")}</div>`}
  h+=`<div class="row2" style="margin-top:14px"><a class="btn" id="alSms" href="${esc(smsHref(alertsText()))}">Text alerts</a><button class="btn alt" id="alCopy">Copy</button></div>
    <p class="note">Overdue = status still Leave, TAD, Operation or Appt off base after the end date. Change their status in the section tab once they check in.</p>`;
  $("#main").innerHTML=h}

/* ---------- formation muster ---------- */
function musPool(){const M=S.mus;return S.roster.filter(m=>(m.sec!=="ATT"||M.att)&&M.inc.includes(m.status))}
function musText(rec){const L=[unitName().toUpperCase()+" MUSTER "+dtg(new Date(rec.t))];
  L.push("PRESENT: "+rec.present+"/"+rec.expected+(rec.expected?" ("+pct(rec.present,rec.expected)+"%)":""));
  L.push("UNACCOUNTED: "+rec.un.length);rec.un.forEach(x=>L.push("- "+x));
  L.push("");L.push("TOTAL STRENGTH "+rec.strength+" · ON HAND "+rec.onhand);return L.join("\n")}
function renderMuster(){const M=S.mus;let h=banner();if(M.open&&M.qr&&!qrTimer)setTimeout(qrTick,50);
  if(!M.open){
    const last=(S.hist||[]).filter(x=>x.type==="muster").slice(-5).reverse();
    h+=`<h2>Formation muster</h2><div class="panel">
      <div class="note">Who is expected at formation:</div>
      <div class="evts">${["On Hand","Company Duties","Appointment on Base"].map(x=>`<label class="tog"><input type="checkbox" data-minc="${x}"${M.inc.includes(x)?" checked":""}> ${SHORT[x]}</label>`).join("")}<label class="tog"><input type="checkbox" id="mAtt"${M.att?" checked":""}> Attached</label></div>
      <div><b>${musPool().length}</b> Marines expected</div>
      <button class="btn" id="mStart">Start muster</button></div>`;
    if(M.last){h+=`<h2>Last muster</h2><div class="panel"><textarea id="mMsg" readonly>${esc(musText(M.last))}</textarea>
      <div class="row2"><a class="btn" id="mSms" href="${esc(smsHref(musText(M.last)))}">Text it</a><button class="btn alt" id="mCopy">Copy</button></div></div>`}
    if(last.length) h+=`<h2>Muster history</h2><div class="panel hist">${last.map(x=>`<div><b>${dtg(new Date(x.t))}</b> · ${x.present}/${x.expected} present · ${x.un.length} unaccounted</div>`).join("")}</div>`;
    $("#main").innerHTML=h;return}
  const pool=musPool();const seen=pool.filter(m=>M.seen[m.id]).length;const un=pool.length-seen;
  h+=`<div class="mbar"><div class="ct">${seen}/${pool.length}<small>present</small> <span class="un">${un}</span><small>unaccounted</small></div><button class="btn" id="mClose">Close out</button></div>`+qrHTML()+`
    <label class="tog" style="margin:4px 0 6px"><input type="checkbox" id="mOnly"${M.only?" checked":""}> Show unaccounted only</label>`;
  const groups=SECTIONS.map(s=>s[0]).concat("ATT").map(k=>[k,sorted(pool.filter(m=>m.sec===k))]).filter(g=>g[1].length);
  for(const [k,ms] of groups){const left=ms.filter(m=>!M.seen[m.id]);const show=M.only?left:ms;if(!show.length)continue;
    h+=`<div class="mgrp"><h3><span>${k} · ${ms.length-left.length}/${ms.length}</span>${left.length?`<button data-mall="${k}">All ${k} here</button>`:""}</h3>
      ${show.map(m=>`<button class="mrow${M.seen[m.id]?" on":""}" data-mtog="${m.id}"><span class="box">${M.seen[m.id]?"✓":""}</span><span class="nm2"><b>${esc(m.rank)}</b> ${esc(m.name)}</span></button>`).join("")}</div>`}
  if(M.only&&!un) h+=`<p class="note" style="margin-top:12px">Everyone expected is accounted for. Tap Close out.</p>`;
  h+=`<button class="btn warn" id="mCancel" style="margin-top:16px;width:100%">${armed==="mcancel"?"Tap again to discard this muster":"Discard muster"}</button>`;
  $("#main").innerHTML=h;if(M.qr)qrDraw()}
/* QR muster */
let qrTimer=null,qrBusy=false;const QR_STEP=30000;
async function hmacHex(secret,msg){const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return hexOf(new Uint8Array(await crypto.subtle.sign("HMAC",k,new TextEncoder().encode(msg)))).slice(0,12)}
async function qrStart(){const M=S.mus;M.qr={rid:Date.now().toString(36)+rndId(4),key:rndId(32),sec:rndId(32),ok:false,after:0,old:[],un:0,show:true};save();
  try{await SB.rpc("create_recall",{p_id:M.qr.rid,p_read_key:M.qr.key});M.qr.ok=true}catch(e){M.qr.err=String(e.message||e).slice(0,80)}save();renderMuster();qrTick()}
function qrStop(){const M=S.mus;clearInterval(qrTimer);qrTimer=null;if(M.qr&&M.qr.ok)SB.rpc("close_recall",{p_recall:M.qr.rid,p_read_key:M.qr.key}).catch(()=>{});M.qr=null}
async function qrDraw(){const M=S.mus;const Q=M.qr;const box=$("#qrBox");if(!Q||!box)return;const step=Math.floor(Date.now()/QR_STEP);
  const mac=await hmacHex(Q.sec,Q.rid+":"+step);const q=new URLSearchParams();q.set("qr",Q.rid);q.set("s",step);q.set("m",mac);q.set("u",unitName());
  const url=PUB()+"#"+q.toString();
  try{await loadLib("lib/qrcode.js","qrcode");const qr=qrcode(0,"M");qr.addData(url);qr.make();box.innerHTML=qr.createSvgTag({cellSize:6,margin:2,scalable:true});const sv=box.querySelector("svg");if(sv){sv.style.width="100%";sv.style.height="auto";sv.style.background="#fff";sv.style.borderRadius="12px"}}
  catch(e){box.innerHTML=`<p class="note">Couldn't draw the QR code here. Connect once so the app can load it.</p>`}
  const c=$("#qrCount");if(c){const left=Math.ceil((QR_STEP-(Date.now()%QR_STEP))/1000);c.textContent="New code in "+left+"s"}}
async function qrPoll(){const M=S.mus;const Q=M.qr;if(!Q||!Q.ok||qrBusy||!M.open)return;qrBusy=true;
  try{const rows=await SB.rpc("get_checkins",{p_recall:Q.rid,p_read_key:Q.key,p_after:Q.after||0});
    if(rows&&rows.length){const idx=await bcIndexFor(Q.rid);let n=0;
      for(const r of rows){Q.after=Math.max(Q.after||0,+r.id);const set=new Set(r.words||[]);
        const sc=idx.map.filter(x=>x.last.length&&x.last.every(h=>set.has(h))).map(x=>({m:x.m,s:(set.has(x.rank)?2:0)+(x.first&&set.has(x.first)?1:0)}));const best=sc.length?Math.max(...sc.map(x=>x.s)):-1;const top=sc.filter(x=>x.s===best);
        const [,st,mac]=String(r.note||"").split(":");const cs=Math.floor((Date.parse(r.created_at)||Date.now())/QR_STEP);let valid=false;
        if(/^\d+$/.test(st||"")&&Math.abs(cs-(+st))<=2)valid=(await hmacHex(Q.sec,Q.rid+":"+st))===mac;
        if(top.length!==1){Q.un=(Q.un||0)+1;continue}const m=top[0].m;
        if(valid){if(!M.seen[m.id]){M.seen[m.id]=1;n++}}else if(!Q.old.includes(m.id))Q.old.push(m.id)}
      save();if(view==="muster"){const y=window.scrollY;renderMuster();window.scrollTo(0,y)}if(n){toast(n+" checked in by QR");try{navigator.vibrate&&navigator.vibrate(20)}catch(e){}}}
  }catch(e){}finally{qrBusy=false}}
function qrTick(){clearInterval(qrTimer);let k=0;qrDraw();qrTimer=setInterval(()=>{if(view!=="muster"||!S.mus.qr||!S.mus.open){clearInterval(qrTimer);qrTimer=null;return}
  const c=$("#qrCount");const left=Math.ceil((QR_STEP-(Date.now()%QR_STEP))/1000);if(c)c.textContent="New code in "+left+"s";if(left===30||!$("#qrBox svg"))qrDraw();if(++k%4===0)qrPoll()},1000)}
function qrHTML(){const Q=S.mus.qr;if(!Q)return `<button class="btn alt" id="qrOn" style="width:100%;margin:6px 0">▦ Show QR so people check themselves in</button>`;
  const old=(Q.old||[]).map(id=>S.roster.find(m=>m.id===id)).filter(m=>m&&!S.mus.seen[m.id]);
  return `<div class="panel" style="align-items:center;text-align:center"><div id="qrBox" style="width:min(320px,86vw)"></div>
    <div class="note"><b id="qrCount"></b> · ${Q.ok?`<span style="color:var(--s-onhand);font-weight:700">● Live</span>`:`<span style="color:var(--warn)">Connecting…${Q.err?" "+esc(Q.err):""}</span>`} · people scan with their camera and tap <b>I'm here</b></div>
    ${old.length?`<div class="note" style="color:var(--warn)">Scanned an old code (maybe a screenshot): ${old.map(m=>esc(m.rank+" "+lastOf(m))).join(", ")}. Tap them below if they're really here.</div>`:""}
    ${Q.un?`<div class="note" style="color:var(--warn)">${Q.un} scan${Q.un>1?"s":""} didn't match a name on your roster.</div>`:""}
    <button class="btn alt" id="qrOff">Hide QR</button></div>`}
function closeMuster(){const M=S.mus;if(M.qr)qrStop();const pool=musPool();const {T}=counts();
  const un=sorted(pool.filter(m=>!M.seen[m.id])).map(m=>(m.sec==="ATT"?"ATT":m.sec)+" "+m.rank+" "+m.name);
  const rec={type:"muster",t:Date.now(),expected:pool.length,present:pool.length-un.length,un,strength:T.total,onhand:T["On Hand"]};
  S.hist=(S.hist||[]).concat(rec).slice(-60);M.last=rec;M.open=false;M.seen={};save();renderMuster();window.scrollTo(0,0)}

/* ---------- what changed since last report ---------- */
const nkey=m=>m.name.toUpperCase().replace(/\s+/g," ").trim();
function snapNow(){const st={};S.roster.forEach(m=>{st[nkey(m)]={s:m.status,d:dutyOf(m),sec:m.sec,r:m.rank}});return {t:Date.now(),st}}
function changeLines(){const sn=S.snap;if(!sn)return [];const cur={};S.roster.forEach(m=>cur[nkey(m)]=m);
  const tr={};const add=(k,who)=>{(tr[k]=tr[k]||[]).push(who)};
  for(const [k,m] of Object.entries(cur)){const o=sn.st[k];const who=(m.sec==="ATT"?"ATT":m.sec)+" "+m.rank+" "+m.name.split(",")[0];
    if(!o){add("NEW: "+(m.sec==="ATT"?"ATTACHED":SHORT[m.status].toUpperCase()),who);continue}
    if(o.s!==m.status) add(SHORT[o.s].toUpperCase()+" → "+SHORT[m.status].toUpperCase(),who);
    if(o.d!==dutyOf(m)) add(o.d.toUpperCase()+" → "+dutyOf(m).toUpperCase(),who)}
  for(const [k,o] of Object.entries(sn.st)) if(!cur[k]) add("REMOVED",(o.sec==="ATT"?"ATT":o.sec)+" "+o.r+" "+k.split(",")[0]);
  const L=Object.entries(tr).map(([k,w])=>k+": "+w.length+(S.names?" ("+w.join(", ")+")":""));
  return L.length?["CHANGES SINCE "+dtg(new Date(sn.t))+":"].concat(L):["NO CHANGES SINCE "+dtg(new Date(sn.t))]}
function markSent(kind){S.snap=snapNow();S.hist=(S.hist||[]).concat({type:kind,t:S.snap.t}).slice(-60);save()}

/* ---------- section leader rollup ---------- */
const SCODE={"Appointment on Base":"AOB","Appointment off Base":"AOFF","Company Duties":"DUTY","Operation":"OP","TAD":"TAD","Leave":"LV"};
const SDEC=Object.fromEntries(Object.entries(SCODE).map(([a,b])=>[b,a]));
function tok(m){const [last,rest]=m.name.split(",");const first=((rest||"").trim().split(/\s+/)[0]||"").replace(/[^A-Z]/gi,"").slice(0,3);
  return (m.rank+"."+(last||"").trim()+"."+first).toUpperCase().replace(/[;|=]/g,"")}
function sectionUpdateText(code){const ms=sorted(S.roster.filter(m=>m.sec===code));const oh=ms.filter(m=>m.status==="On Hand").length;
  const L=[unitName().toUpperCase()+" "+code+" SECTION UPDATE "+dtg(),"STRENGTH "+ms.length+" · ON HAND "+oh];
  const parts=[];
  for(const [st,cd] of Object.entries(SCODE)){const g=ms.filter(m=>m.status===st);if(!g.length)continue;L.push(SHORT[st].toUpperCase()+": "+g.map(m=>m.rank+" "+m.name.split(",")[0]).join(", "));parts.push(cd+"="+g.map(tok).join(";"))}
  const ld=ms.filter(m=>dutyOf(m)==="Light Duty"),lim=ms.filter(m=>dutyOf(m)==="LIMDU");
  if(ld.length){L.push("LIGHT DUTY: "+ld.map(m=>m.rank+" "+m.name.split(",")[0]).join(", "));parts.push("LD="+ld.map(tok).join(";"))}
  if(lim.length){L.push("LIMDU: "+lim.map(m=>m.rank+" "+m.name.split(",")[0]).join(", "));parts.push("LIM="+lim.map(tok).join(";"))}
  L.push("");L.push("#EOOP1|"+code+"|"+ms.length+"|"+Date.now().toString(36)+(parts.length?"|"+parts.join("|"):""));
  return L.join("\n")}
function applySectionUpdates(text){const lines=String(text).split(/\r?\n/).map(x=>x.trim()).filter(x=>x.startsWith("#EOOP1|"));
  if(!lines.length) throw new Error("No section update code found. Paste the whole text, including the line that starts with #EOOP1.");
  const res=[];
  for(const ln of lines){const p=ln.split("|");const code=p[1];if(!SECTIONS.some(s=>s[0]===code)){res.push(code+": unknown section");continue}
    const ms=S.roster.filter(m=>m.sec===code);const byTok={},byLF={};
    ms.forEach(m=>{const t=tok(m);byTok[t]=m;const lf=t.split(".").slice(1).join(".");(byLF[lf]=byLF[lf]||[]).push(m)});
    const find=t=>byTok[t]||((byLF[t.split(".").slice(1).join(".")]||[]).length===1?byLF[t.split(".").slice(1).join(".")][0]:null);
    const stSet={},dSet={};const miss=[];
    for(const part of p.slice(4)){const [cd,list]=part.split("=");if(!list)continue;
      for(const t of list.split(";")){const m=find(t);if(!m){miss.push(t.replace(/\./g," "));continue}
        if(cd==="LD")dSet[m.id]="Light Duty";else if(cd==="LIM")dSet[m.id]="LIMDU";else if(SDEC[cd])stSet[m.id]=SDEC[cd]}}
    let ch=0;ms.forEach(m=>{const ns=stSet[m.id]||"On Hand";const nd=dSet[m.id]||"Full Duty";if(m.status!==ns||dutyOf(m)!==nd)ch++;m.status=ns;m.duty=nd});
    const sent=+p[2];res.push(code+": "+ch+" changed"+(miss.length?", "+miss.length+" not found ("+miss.join(", ")+")":"")+(sent!==ms.length?" · their strength "+sent+", yours "+ms.length:""))}
  save();return res}

/* ---------- unit rollup: platoon → company → battalion, by text ----------
   Code line: #EOOP2|NAME|time36|STR|OnHand|AOB|AOFF|DUTY|OP|TAD|LV|LD|LIM|ATT|ATTOH
   Counts only, no names. A rollup sends its own #EOOP2 line, so it chains up any number of levels. */
const RSTAT=["On Hand","Appointment on Base","Appointment off Base","Company Duties","Operation","TAD","Leave"];
const STALE_H=12;
const cleanName=s=>String(s||"").toUpperCase().replace(/[|#\r\n]/g," ").replace(/\s+/g," ").trim().slice(0,24);
function unitName(){return cleanName(S.unit)||(MODE().v?MODE().v.eo:"UNIT")}
function ownNums(){const {T,A}=counts();const d=dutyCounts(S.roster.filter(m=>m.sec!=="ATT"));const st={};RSTAT.forEach(s=>st[s]=T[s]||0);
  return {name:unitName(),t:Date.now(),str:T.total,st,ld:d["Light Duty"],lim:d["LIMDU"],att:A.total,attoh:A["On Hand"],own:true}}
function rollCode(u){return "#EOOP2|"+cleanName(u.name)+"|"+Math.floor(u.t).toString(36)+"|"+[u.str].concat(RSTAT.map(s=>u.st[s]||0),[u.ld,u.lim,u.att,u.attoh]).map(n=>Math.max(0,+n||0)).join("|")}
function parseRoll(text){const out=[];
  for(const raw of String(text).split(/\r?\n/)){const ln=raw.trim();const i=ln.indexOf("#EOOP2|");if(i<0)continue;const p=ln.slice(i).split("|");if(p.length<15)continue;
    const n=p.slice(3,15).map(x=>parseInt(x,10));if(n.some(x=>!Number.isFinite(x)||x<0))continue;const t=parseInt(p[2],36);if(!Number.isFinite(t))continue;
    const st={};RSTAT.forEach((s,j)=>st[s]=n[1+j]);out.push({name:cleanName(p[1])||"UNIT",t,str:n[0],st,ld:n[8],lim:n[9],att:n[10],attoh:n[11]})}
  return out}
function addRoll(text){const got=parseRoll(text);if(!got.length)throw new Error("No rollup code found. Paste the whole report, including the line that starts with #EOOP2.");
  const res=[];for(const u of got){const k=u.name;const old=S.roll.units[k];
    if(S.roll.own&&k===unitName()){res.push(k+": same name as your board, skipped (rename one)");continue}
    if(old&&old.t>u.t){res.push(k+": older than the one you have, skipped");continue}
    S.roll.units[k]=u;res.push(k+(old?" updated":" added")+" · "+u.st["On Hand"]+"/"+u.str)}
  save();return res}
function rollUnits(){const L=Object.values(S.roll.units).sort((a,b)=>a.name.localeCompare(b.name));return S.roll.own?[ownNums()].concat(L):L}
function rollSum(L){const R={str:0,oh:0,st:{},ld:0,lim:0,att:0,attoh:0};RSTAT.forEach(s=>R.st[s]=0);
  for(const u of L){R.str+=u.str;RSTAT.forEach(s=>R.st[s]+=u.st[s]||0);R.ld+=u.ld;R.lim+=u.lim;R.att+=u.att;R.attoh+=u.attoh}R.oh=R.st["On Hand"];return R}
const presentOf=st=>PRESENT.reduce((a,s)=>a+(st[s]||0),0);
function rollStale(){return Object.values(S.roll.units).filter(u=>Date.now()-u.t>STALE_H*3600000)}
function rollName(){return cleanName(S.roll.name)||"ROLLUP"}
function rollText(){const L0=rollUnits();const R=rollSum(L0);const L=[rollName()+" ROLLUP "+dtg()];
  L.push("UNITS REPORTING: "+L0.length);
  L.push("TOTAL STRENGTH: "+R.str);L.push("ON HAND: "+R.oh+" ("+pct(R.oh,R.str)+"%)");L.push("PRESENT ON DECK: "+presentOf(R.st));
  L.push("FULL DUTY "+Math.max(0,R.str-R.ld-R.lim)+" / LIGHT DUTY "+R.ld+" / LIMDU "+R.lim);
  L.push("");for(const u of L0){const old=!u.own&&Date.now()-u.t>STALE_H*3600000;L.push(u.name+" "+u.st["On Hand"]+"/"+u.str+(u.own?"":" (AS OF "+dtg(new Date(u.t)).slice(0,7)+(old?" OLD":"")+")"))}
  L.push("");for(const s of RSTAT.slice(1))L.push(SHORT[s].toUpperCase()+": "+R.st[s]);
  if(R.att){L.push("");L.push("ATTACHED (NOT ON STRENGTH): "+R.att+" (ON HAND "+R.attoh+")");L.push("TOTAL ACCOUNTED FOR: "+(R.str+R.att))}
  L.push("");L.push(rollCode({name:rollName(),t:Date.now(),str:R.str,st:R.st,ld:R.ld,lim:R.lim,att:R.att,attoh:R.attoh}));
  return L.join("\n")}
function renderRollup(){const L0=rollUnits();const R=rollSum(L0);const others=Object.keys(S.roll.units).length;
  let h=`<h2>Rollup</h2><div class="panel">
    <p class="note">Add up the units under you. Each unit sends you its report from <b>TEXT</b> (the rollup code is on by default). Paste one or many here. Your rollup carries its own code, so the next level up can add yours the same way. Counts only: no names travel in the code.</p>
    <label for="rollNm">Rollup name (what the next level up sees)</label>
    <input type="text" id="rollNm" value="${esc(S.roll.name||"")}" maxlength="24" placeholder="e.g. ${esc(MODE().v&&MODE().v.coEx||"ALPHA CO")}" autocapitalize="characters" style="text-transform:uppercase">
    <label class="tog"><input type="checkbox" id="rollOwn"${S.roll.own?" checked":""}> Include my own board as <b>${esc(unitName())}</b></label>
    <label for="rollIn">Paste unit reports</label>
    <textarea id="rollIn" style="min-height:90px" placeholder="1ST PLT ACCOUNTABILITY ...&#10;#EOOP2|1ST PLT|..."></textarea>
    <div class="row2"><button class="btn" id="rollGo">Add reports</button><button class="btn alt" id="rollClip">Paste from clipboard</button></div>
    <div class="note" id="rollOut"></div></div>`;
  if(L0.length){h+=`<h2>${esc(rollName())} · ${R.oh}/${R.str}</h2><div class="gridwrap"><table><thead><tr><th>Unit</th><th>On hand</th><th>Present</th>${RSTAT.slice(1).map(s=>`<th>${SHORT[s]}</th>`).join("")}<th>As of</th><th></th></tr></thead><tbody>
      ${L0.map(u=>{const old=!u.own&&Date.now()-u.t>STALE_H*3600000;return `<tr><td><b>${esc(u.name)}</b></td><td>${u.st["On Hand"]}/${u.str}</td><td>${presentOf(u.st)}</td>${RSTAT.slice(1).map(s=>`<td class="${u.st[s]?"":"z"}">${u.st[s]}</td>`).join("")}<td${old?' style="color:var(--warn);font-weight:700"':""}>${u.own?"Live":dtg(new Date(u.t)).slice(0,7)+(old?" OLD":"")}</td><td>${u.own?"":`<button data-rdel="${esc(u.name)}" aria-label="Remove ${esc(u.name)}" style="border:0;background:none;color:var(--muted);font-weight:700;min-width:32px;min-height:32px">${armed==="rd"+u.name?"Remove?":"✕"}</button>`}</td></tr>`}).join("")}
      <tr class="sum"><td>Total</td><td>${R.oh}/${R.str}</td><td>${presentOf(R.st)}</td>${RSTAT.slice(1).map(s=>`<td>${R.st[s]}</td>`).join("")}<td></td><td></td></tr></tbody></table></div>
      <p class="note">${pct(R.oh,R.str)}% on hand · Light Duty ${R.ld} · LIMDU ${R.lim}${R.att?" · Attached "+R.att+" (not on strength)":""}. Reports older than ${STALE_H} hours are marked OLD. A newer report from the same unit replaces the old one.</p>
      <h2>Rollup report</h2><div class="panel"><textarea id="rollMsg" readonly aria-label="Rollup report text">${esc(rollText())}</textarea>
      <div class="row2"><a class="btn" id="rollSms" href="${esc(smsHref(rollText()))}">Text it</a><button class="btn alt" id="rollCopy">Copy</button></div>
      ${navigator.share?'<button class="btn alt" id="rollShare">Share to Signal, Teams, email…</button>':""}
      <p class="note">Goes to the numbers set in TEXT.</p></div>`}
  if(others) h+=`<button class="btn warn" id="rollClear" style="margin-top:16px;width:100%">${armed==="rollclr"?"Tap again to clear all unit reports":"Clear all unit reports"}</button>`;
  $("#main").innerHTML=h}

/* ---------- live section updates ----------
   OIC phone owns a "board" with a private read key. Section leaders get a link with the write key.
   Their phone sends only salted hashes of each Marine not On Hand / Full Duty plus a status code.
   OIC phone matches the hashes to its own roster. Everyone not listed in that section = On Hand, Full Duty. */
const LCODES=["AOB","AOFF","DUTY","OP","TAD","LV","LD","LIM"];
let lvBusy=false,lkBusy=false,lkTimer=null,lvIdx={};
const lf=m=>tok(m).split(".").slice(1).join(".");
const fullK=m=>String(m.name).toUpperCase().replace(/[^A-Z0-9]+/g," ").trim();
async function itemsFor(bid,ms){const out=[];const useId=!!(S.link&&S.link.rk2&&S.link.board===bid);
  for(const m of ms){const codes=[];if(m.status!=="On Hand"&&SCODE[m.status])codes.push(SCODE[m.status]);const d=dutyOf(m);if(d==="Light Duty")codes.push("LD");if(d==="LIMDU")codes.push("LIM");
    if(!codes.length)continue;const a=useId&&(m.uid||!(S.link&&S.link.own))?await SB.h(bid,"I:"+(m.uid||m.id)):await SB.h(bid,"N:"+fullK(m)),b=await SB.h(bid,"L:"+lf(m));codes.forEach(c=>out.push(a+":"+b+":"+c))}
  return out.sort()}
/* section leader side */
function linkSchedule(){if(!S.link||lkBusy)return;clearTimeout(lkTimer);lkTimer=setTimeout(linkPush,3000)}
async function linkPush(force){const L=S.link;if(!L||lkBusy)return;if(L.rk2&&!L.pulled){rosterPull();return}const ms=L.whole?S.roster.slice():S.roster.filter(m=>m.sec===L.mysec);
  lkBusy=true;try{const items=await itemsFor(L.board,ms);const st=ms.length+"|"+items.join(",");
    if(force||st!==L.sig){const me=await Promise.all(SB.words(L.me).map(w=>SB.h(L.board,w)));
      await SB.rpc("push_update",{p_board:L.board,p_write_key:L.wk,p_sec:L.sec,p_sender:me,p_strength:ms.length,p_items:items});
      L.sig=st;L.sent=Date.now();L.lsig=lsigOf(ms);L.err="";save();SB.notify(null,{board:L.board})}
    if(L.ek){const cal=ms.flatMap(m=>(m.cal||[]).filter(e=>(e.end||e.d)>=dkey(new Date(Date.now()-30*86400000))).map(e=>({nk:fullK(m),d:e.d,tm:e.tm||"",end:e.end||"",ty:e.ty,ti:e.ti,no:e.no||""})));const dt=ms.map(m=>({nk:fullK(m),id:m.uid||m.id,sb:L.whole&&m.sec!=="ATT"?m.sec:undefined,st:m.status,s:m.start||"",e:m.end||"",l:m.loc||"",x:m.detail||"",du:m.due||{}}));const cs=sigF([cal,dt]);
      if(force||cs!==L.calSig){const ct=await fdEnc(L.ek,{e:cal,d:dt});await SB.rpc("push_cal",{p_board:L.board,p_write_key:L.wk,p_sec:L.sec,p_ct:ct});L.calSig=cs;L.err="";rawSave()}}}
  catch(e){const t=String(e.message||e);L.err=/link not valid/i.test(t)?"This link was replaced by your OIC. Ask them for the new one.":t.slice(0,80);save();clearTimeout(lkTimer);if(!/replaced/.test(L.err))lkTimer=setTimeout(linkPush,60000)}
  finally{lkBusy=false;if(view==="live"||view===(L.mysec||"").toLowerCase()){const a=document.activeElement&&document.activeElement.tagName;if(a!=="INPUT"&&a!=="TEXTAREA"){const y=window.scrollY;render();window.scrollTo(0,y)}}}}
function linkStatus(){const L=S.link;if(!L)return"";if(L.err)return `<span style="color:var(--warn)">Not sent yet (${esc(L.err)}). Retrying.</span>`;
  return L.sent?`Last sent ${dtg(new Date(L.sent)).slice(0,7)}.`:"Sending…"}
window.addEventListener("online",()=>{if(S.link)linkPush();if(S.board)livePollBoard()});
/* OIC side */
function boardLink(sec){if(!S.board.ek){S.board.ek=b64url(crypto.getRandomValues(new Uint8Array(32)));save()}const q=new URLSearchParams();q.set("join",S.board.id);q.set("k",(S.board.wks&&S.board.wks[sec])||S.board.wk);q.set("s",sec);q.set("u",unitName());q.set("e",S.board.ek);q.set("r",secKey(sec));return PUB()+"#"+q.toString()}
async function boardPush(){const B=S.board;if(!B||!S.pushOn)return;try{const sub=await pushSub(false);if(!sub)return;await SB.rpc("set_board_push",{p_board:B.id,p_read_key:B.rk,p_sub:sub.toJSON()});B.push=true;save()}catch(e){}}
function boardPushHTML(){if(!pushOK())return isIOS()&&!standalone()?`<p class="note">For alerts with your phone locked: Share → <b>Add to Home Screen</b>, then open the app from there.</p>`:"";
  if(Notification.permission==="denied")return `<p class="note">Alerts are blocked for this app in your phone settings.</p>`;
  if(S.pushOn&&Notification.permission==="granted"&&S.board.push)return `<p class="note" style="color:var(--s-onhand);font-weight:700">🔔 Alerts on: this phone buzzes when a section updates</p>`;
  return `<button class="btn alt" id="bpushOn">🔔 Alert me when a section updates, even when locked</button>`}
async function boardCreate(){const id=rndId(14),rk=rndId(32),wk=rndId(32);await SB.rpc("create_board",{p_id:id,p_read_key:rk,p_write_key:wk});S.board={id,rk,wk,ek:b64url(crypto.getRandomValues(new Uint8Array(32))),after:0,last:{}};save()}
async function livePollCal(){const B=S.board;if(!B||!B.ek)return;try{const rows=await SB.rpc("get_cal",{p_board:B.id,p_read_key:B.rk});let ch=false;
  for(const r of rows||[]){const t=Date.parse(r.updated_at)||0;if(S.secCal[r.sec]&&S.secCal[r.sec].t>=t)continue;const o=await fdDec(B.ek,r.ct);if(!o||!Array.isArray(o.e))continue;const calCh=!S.secCal[r.sec]||sigF(S.secCal[r.sec].e)!==sigF(o.e.slice(0,2000));if(S.secCal[r.sec]&&calCh)actAdd("🗓",r.sec+" section calendar updated","cal");S.secCal[r.sec]={t,e:o.e.slice(0,2000)};ch=true;
    if(Array.isArray(o.d)){const ms=S.roster.filter(m=>m.sec===r.sec);const by={};ms.forEach(m=>(by[fullK(m)]=by[fullK(m)]||[]).push(m));const who=[];
      const dueWho=[];for(const x of o.d.slice(0,600)){const byId=x.id?ms.find(m=>m.id===String(x.id)):null;const hit=byId?[byId]:by[String(x.nk)];if(!hit||hit.length!==1)continue;const m=hit[0];let c=false;if(x.sb&&/^[A-Z0-9]{1,6}$/.test(x.sb)&&m.sub!==x.sb){m.sub=x.sb;c=true}
        if(x.du&&typeof x.du==="object"){const nd=sanDue(x.du);if(JSON.stringify(nd)!==JSON.stringify(sanDue(m.due||{}))){const chg=Object.keys(nd).filter(k=>JSON.stringify(nd[k])!==JSON.stringify((m.due||{})[k]));m.due=nd;dueWho.push(m.rank+" "+lastOf(m)+(chg.length?" ("+chg.slice(0,2).join(", ")+")":""))}}
        for(const [k,v] of [["start",x.s],["end",x.e],["loc",x.l],["detail",x.x]]){const nv=String(v||"").slice(0,120);if((m[k]||"")!==nv){if(nv)m[k]=nv;else delete m[k];c=true}}if(c)who.push(m.rank+" "+lastOf(m)+(x.e?" thru "+String(x.e).slice(0,10):""))}
      if(dueWho.length)actAdd("✅",r.sec+" leader updated due-outs: "+dueWho.slice(0,6).join(", ")+(dueWho.length>6?" +"+(dueWho.length-6)+" more":""),"ready");
      if(who.length)actAdd("📝",r.sec+" leader updated dates/details: "+who.slice(0,6).join(", ")+(who.length>6?" +"+(who.length-6)+" more":""),r.sec.toLowerCase())}}
  if(ch){save();if(view==="cal"||view==="board"||view==="p"){const a=document.activeElement&&document.activeElement.tagName;if(a!=="INPUT"&&a!=="TEXTAREA"&&a!=="SELECT"){const y=window.scrollY;render();window.scrollTo(0,y)}}}}catch(e){}}
async function livePollBoard(){const B=S.board;if(!B||lvBusy)return;livePollCal();lvBusy=true;
  try{const rows=await SB.rpc("get_board_updates",{p_board:B.id,p_read_key:B.rk,p_after:B.after||0});B.err="";
    if(rows&&rows.length){const latest={};for(const r of rows){B.after=Math.max(B.after||0,+r.id);latest[r.sec]=r}
      const msgs=[];
      for(const r of Object.values(latest)){const sec=r.sec;const ms=S.roster.filter(m=>m.sec===sec);const res={t:Date.parse(r.created_at)||Date.now(),ch:0,miss:0,str:+r.strength,mine:ms.length,by:""};
        if(SECTIONS.some(x=>x[0]===sec)){const byT={},byL={},byI={};
          for(const m of ms){const a=await SB.h(B.id,"N:"+fullK(m)),b=await SB.h(B.id,"L:"+lf(m)),ih=await SB.h(B.id,"I:"+m.id);(byT[a]=byT[a]||[]).push(m);(byL[b]=byL[b]||[]).push(m);byI[ih]=[m]}
          const st={},du={};
          for(const it of r.items||[]){const [a,b,c]=it.split(":");const m=byI[a]?byI[a][0]:(byT[a]||[]).length===1?byT[a][0]:(!byT[a]&&(byL[b]||[]).length===1)?byL[b][0]:null;if(!m){res.miss++;continue}
            if(c==="LD")du[m.id]="Light Duty";else if(c==="LIM")du[m.id]="LIMDU";else if(SDEC[c])st[m.id]=SDEC[c]}
          const chg=[];for(const m of ms){const ns=st[m.id]||"On Hand",nd=du[m.id]||"Full Duty";if(m.status!==ns||dutyOf(m)!==nd){chg.push(m.rank+" "+lastOf(m)+" → "+(m.status!==ns?(SHORT[ns]||ns):nd));m.status=ns;m.duty=nd;m.upd={t:res.t,sec};res.ch++}}res.chg=chg;
          const set=new Set(r.sender||[]);if(set.size){const hit=[];for(const m of S.roster){const lw=SB.words(lastOf(m));if(!lw.length)continue;const hs=await Promise.all(lw.map(w=>SB.h(B.id,w)));if(hs.every(h=>set.has(h)))hit.push(m)}
            if(hit.length){const rk=await Promise.all(hit.map(m=>SB.h(B.id,String(m.rank).toUpperCase().replace(/[^A-Z0-9]/g,""))));const both=hit.filter((m,i)=>set.has(rk[i]));const pick=both.length===1?both[0]:hit.length===1?hit[0]:null;if(pick)res.by=pick.rank+" "+lastOf(pick)}}}
        else res.unknown=true;
        if(res.chg&&res.chg.length)actAdd("📋",sec+" · "+(res.by||"section leader")+": "+res.chg.slice(0,8).join(", ")+(res.chg.length>8?" +"+(res.chg.length-8)+" more":""),sec.toLowerCase());
        B.last[sec]=res;msgs.push(sec+(res.ch?" "+res.ch+" change"+(res.ch>1?"s":""):" no changes"))}
      save();renderTabs();if(["board","live"].includes(view)||Object.keys(latest).includes(view.toUpperCase())){const a=document.activeElement&&document.activeElement.tagName;if(a!=="INPUT"&&a!=="TEXTAREA"){const y=window.scrollY;render();window.scrollTo(0,y)}}
      toast("Live: "+msgs.join(" · "));try{navigator.vibrate&&navigator.vibrate(30)}catch(e){}}
  }catch(e){B.err=String(e.message||e).slice(0,80)}finally{lvBusy=false}}
every(15000,()=>{if(S.board)livePollBoard()},"board");
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&S.board)livePollBoard()});
const ago=t=>{const m=Math.round((Date.now()-t)/60000);return m<1?"just now":m<60?m+" min ago":m<1440?Math.round(m/60)+" hr ago":Math.round(m/1440)+" d ago"};
function liveStrip(){const B=S.board;if(!B)return `<button class="att" data-go="live" style="text-align:left;width:100%;cursor:pointer"><div><div class="lbl">Live sections · off</div><div class="note" style="margin-top:4px">Let section leaders update your board from their phones. Tap to set up.</div></div></button>`;
  return `<button class="att" data-go="live" style="text-align:left;width:100%;cursor:pointer"><div><div class="lbl">● Live sections</div><div class="note" style="display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:4px">${SECTIONS.map(([k])=>{const r=B.last[k];const old=r&&Date.now()-r.t>4*3600000;
    return `<span><b>${k}</b> <span style="color:var(${!r?"--muted":old?"--warn":"--s-onhand"})">${r?ago(r.t):"waiting"}</span></span>`}).join("")}</div></div></button>`}
function renderLive(){let h=banner();const B=S.board,L=S.link;
  h+=`<h2>Live ${LV().sec} updates</h2>`;if(!B)h+=accessHTML();
  if(!B){h+=`<div class="panel"><p class="note">Section leaders change their people's statuses on their own phones, and your board updates by itself. You see which section updated, who sent it and when. Names never go to the server: only scrambled codes your phone matches to your roster.</p>
      <button class="btn" id="lvOn">Turn on live updates for my board</button><div class="note" id="lvOut"></div></div>`}
  else{h+=`<div class="panel"><div><b style="color:var(--s-onhand)">● Live</b> · checks every 15 seconds while the app is open${B.err?` · <span style="color:var(--warn)">${esc(B.err)}</span>`:""}</div>
      ${boardPushHTML()}
      <p class="note">Send each ${LV().head} their link. Their ${LV().sec} roster loads from your board, so they don't load anything.${S.level==="co"?" Each platoon OIC gets their platoon with its own sections and can run their own section leaders.":""} Every change they make shows up here, and they land in your Feed where you see every post.</p>${hubHTML()}${accessHTML()}</div>
    <div class="alist" style="margin-top:10px">${SECTIONS.map(([k,n])=>{const r=B.last[k];const old=r&&Date.now()-r.t>4*3600000;
      return `<div class="rrow" style="--sc:var(${!r?"--line":old?"--warn":"--s-onhand"})"><div class="rtop"><div class="who"><b>${k}</b> ${esc(n)}
        <div class="ph">${B.rsig&&B.rsig[k]?`<b style="color:var(--s-onhand)">✓ Roster shared</b> · `:S.source==="sample"?"":`Roster sharing… · `}${r?`Updated ${ago(r.t)} (${dtg(new Date(r.t)).slice(0,7)})${r.by?" by "+esc(r.by):""} · ${r.ch} change${r.ch===1?"":"s"}`:"No update yet"}</div>
        ${r&&(r.miss||r.str!==r.mine)?`<div class="ph" style="color:var(--warn)">${r.miss?r.miss+" name"+(r.miss>1?"s":"")+" not on your roster. ":""}${r.str!==r.mine?"Their strength "+r.str+", yours "+r.mine+".":""}</div>`:""}</div></div>
        <div class="row2">${(()=>{const hd=S.roster.find(m=>m.id===(B.heads||{})[k]);return `<select class="wsel" data-lvhead="${k}" aria-label="${k} section head"><option value="">${LV().Head}: pick from ${k}…</option>${sorted(S.roster.filter(m=>m.sec===k)).map(m=>`<option value="${m.id}"${hd&&hd.id===m.id?" selected":""}>${esc(m.rank+" "+m.name)}${m.phone?"":" (no number)"}</option>`).join("")}</select><a class="btn alt" href="${esc((hd&&hd.phone?"sms:+1"+String(hd.phone).replace(/\D/g,"").slice(-10):"sms:")+"?&body="+encodeURIComponent(unitName()+": you're the "+k+" "+LV().head+". Open this link in Accounted For. Your "+LV().sec+" roster loads from my board, your updates come straight to me, and you can post to the unit Feed: "+boardLink(k)+" · iPhone: open in Safari, then Share → Add to Home Screen so alerts work."))}">Text ${k} link${hd?" to "+esc(hd.rank+" "+lastOf(hd)):""}</a>`})()}<button class="btn alt" data-lvcopy="${k}">Copy link</button></div>${(S.wsCur||"plt")==="co"?`<button class="chip" data-lvmine="${k}" style="cursor:pointer;margin:6px 6px 0 0">${S.ws&&S.ws.plt&&S.ws.plt.link&&S.ws.plt.link.board===B.id&&S.ws.plt.link.sec===k?"✓ My platoon view runs "+k:"I run "+k+": link my platoon view"}</button>`:""}<button class="chip" data-lvreset="${k}" style="cursor:pointer;margin-top:6px">${armed==="lvreset"+k?"Tap again: old "+k+" link stops working":"↺ Replace "+k+" link (cut off the old one)"}</button></div>`}).join("")}</div>
    <button class="btn warn" id="lvOff" style="margin-top:16px;width:100%">${armed==="lvoff"?"Tap again: turn off and disconnect all sections":"Turn off live updates"}</button>`}
  if(L)h+=`<h2>My link</h2><div class="panel"><div>This phone sends <b>${esc(L.mysec)}</b> to <b>${esc(L.unit)}</b> as <b>${esc(L.sec)}</b>${L.me?" · sender "+esc(L.me):""}.</div><div class="note">${linkStatus()}</div>${L.rk2?`<div class="note">${L.perr?`<span style="color:var(--warn)">Roster: ${esc(L.perr)}</span>`:L.pulled?`Roster from ${esc(L.unit)} · ${(L.whole?S.roster:S.roster.filter(m=>m.sec===L.mysec)).length} people · updated ${ago(L.pt)}`:"Loading your section roster…"}</div>`:""}
    <div class="row2"><button class="btn" id="lkNow">Send now</button><button class="btn alt" id="lkOff">${armed==="lkoff"?"Tap again to unlink":"Unlink"}</button></div></div>`;
  $("#main").innerHTML=h}
function joinPrompt(q){const bid=(q.get("join")||"").replace(/[^a-z0-9]/g,"").slice(0,20),wk=(q.get("k")||"").replace(/[^a-z0-9]/g,"").slice(0,40),sec=(q.get("s")||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6),unit=(q.get("u")||"").replace(/[|#<>]/g,"").slice(0,24);
  const ek=(q.get("e")||"").replace(/[^A-Za-z0-9_-]/g,"").slice(0,60);if(bid.length<10||wk.length<24||!sec)return;const rk2=(q.get("r")||"").replace(/[^A-Za-z0-9_-]/g,"").slice(0,60);if(rk2.length>=40){if((S.wsCur||"plt")==="co"&&!(S.board&&S.board.id===bid)){wsSwitch("plt",{pendLink:{bid,wk,sec,unit,ek,rk2}});return}if(S.board&&S.board.id===bid){try{history.replaceState(null,"",location.pathname)}catch(e){}view="live";render();toast("That's your own "+sec+" leader link. Open it on the leader's phone, not yours.");return}autoLink({bid,wk,sec,unit,ek,rk2});return}sheetCtx={kind:"join",bid,wk,sec,unit,ek,rk2:""};const def=SECTIONS.some(x=>x[0]===sec)?sec:SECTIONS[0][0];
  $("#sheetT").innerHTML=`Send live updates?<small>${esc(unit||"Your OIC")} wants this phone to send the <b>${esc(sec)}</b> section's statuses to their board automatically.</small>`;
  $("#sheetOpts").innerHTML=`<div class="panel" style="margin:0" data-noxl><label for="jSec">My section in this app</label><select id="jSec" class="wsel">${SECTIONS.map(([k,n])=>`<option value="${k}"${k===def?" selected":""}>${esc(k+" · "+n)}</option>`).join("")}</select>
    <label for="jMe">Your rank and last name (so they see who sent it)</label><input type="text" id="jMe" maxlength="30" placeholder="SGT SMITH" autocapitalize="characters" style="text-transform:uppercase" value="${esc(S.myName||"")}">
    ${ek&&q.get("r")?`<p class="note"><b>Your section roster loads from ${esc(unit||"your OIC")}'s board.</b> Nothing to load. You also join the unit Feed and can post to your section.</p>`:`<p class="note">Only scrambled codes leave this phone; names don't. ${S.source==="sample"?"<b style='color:var(--warn)'>Load your roster first, or the names won't match theirs.</b>":""}</p>`}
    <button class="btn" id="jYes">Link and send now</button><button class="btn alt" data-sclose="1">Not now</button></div>`;
  const sh=$("#sheet");sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add("open")));try{history.replaceState(null,"",location.pathname)}catch(e){}}

/* ---------- HUB: one main database behind every link ----------
   OIC phone publishes each section's roster, encrypted with that section's own key (only in that leader's link),
   plus the unit Feed keys. Section leaders pull it; Marines get the Feed through their My page. All posts land in one Feed the OIC sees. */
/* ---------- ACTIVITY: every change that comes in from a link, in one list for the OIC ---------- */
function actAdd(ic,txt,go){S.act=S.act||[];S.act.unshift({t:Date.now(),ic,txt:String(txt).slice(0,220),go:go||""});if(S.act.length>300)S.act.length=300}
const actNew=()=>(S.act||[]).filter(a=>a.t>(S.actSeen||0)).length;
function actCard(){const A=S.act||[];if(!A.length)return"";const n=actNew();
  return `<div class="sech"><h2>Activity</h2><button class="chip" data-go="act" style="cursor:pointer">${n?`<b style="color:var(--brass)">${n} new</b> · `:""}See all ▸</button></div><div class="card ny">${A.slice(0,4).map(a=>`<button class="lrow" data-go="${esc(a.go||"act")}" style="width:100%;text-align:left;background:none;border:0;cursor:pointer;color:inherit"><span class="n tone-${a.t>(S.actSeen||0)?"a":"b"}">${esc(a.ic)}</span><span style="flex:1;min-width:0"><span class="t" style="display:block">${esc(a.txt)}</span><span class="s" style="display:block">${ago(a.t)}</span></span></button>`).join("")}</div>`}
function renderAct(){const A=S.act||[];const seen=S.actSeen||0;let h=banner()+`<div class="sechead" style="margin-top:12px"><h2>Activity</h2><span class="note" style="margin:0">From every link you sent</span></div>`;
  if(!A.length)h+=`<div class="panel"><p class="note">Nothing yet. Section updates, leader posts, Got its, problems, requests and section calendar changes show up here as they come in.</p></div>`;
  let day="";for(const a of A){const d=new Date(a.t);const k=DOW[d.getDay()]+" "+short(d);if(k!==day){day=k;h+=`<div class="note" style="margin:14px 4px 4px;font-weight:800">${esc(k)}</div>`}
    h+=`<button class="lrow card" data-go="${esc(a.go||"act")}" style="width:100%;text-align:left;cursor:pointer;color:inherit;margin:4px 0"><span class="n tone-${a.t>seen?"a":"b"}">${esc(a.ic)}</span><span style="flex:1;min-width:0"><span class="t" style="display:block">${esc(a.txt)}</span><span class="s" style="display:block">${String(d.getHours()).padStart(2,"0")}${String(d.getMinutes()).padStart(2,"0")} · ${ago(a.t)}</span></span></button>`}
  if(A.length)h+=`<button class="btn alt" id="actClear" style="width:100%;margin-top:14px">${armed==="actclr"?"Tap again to clear the list":"Clear the list"}</button>`;
  $("#main").innerHTML=h;if(actNew()){S.actSeen=Date.now();rawSave();setTimeout(renderTabs,0)}}
document.addEventListener("click",e=>{if(e.target.id==="actClear"){if(armed==="actclr"){S.act=[];armed=null;save();renderAct()}else{armed="actclr";renderAct()}return}
  if(e.target.id==="hubPush"){const f=mainFeed();if(!f)return;e.target.disabled=true;pushSub(true).then(sub=>{if(!sub)throw new Error("Alerts not allowed on this phone");return SB.rpc("feed_sub",{p_feed:f.id,p_member_key:f.mk,p_sub:sub.toJSON()}).then(()=>SB.rpc("set_feed_leader_sub",{p_feed:f.id,p_leader_key:f.lk,p_sub:sub.toJSON()}).then(()=>"all",er=>/could not find|schema/i.test(String(er.message||er))?"posts":Promise.reject(er)))}).then(w=>{f.oicPush=true;f.oicAlert=w==="all";S.pushOn=true;save();renderLive();toast(w==="all"?"Alerts on: leader posts, requests, problems":"Alerts on for posts. Run setup part 13 for requests and problems.")}).catch(err=>{e.target.disabled=false;toast(String(err.message||err).slice(0,80))});return}});
/* ---------- REFRESH: pull every update now ---------- */
let refBusy=false;
async function refreshAll(quiet){if(refBusy)return;refBusy=true;const b=$("#hRef");if(b)b.classList.add("spin");if(!quiet)toast("Getting updates…");
  const jobs=[];const add=f=>{try{const r=f();if(r&&r.then)jobs.push(r)}catch(e){}};
  if(S.board){add(()=>livePollBoard());add(()=>ensureHub())}
  if(S.feeds.length)add(()=>fdPollAll(true));
  if(S.link){if(S.link.rk2)add(()=>rosterPull(true));add(()=>linkPush(true))}
  if(S.me)add(()=>mpFetch());
  if(S.coBoard)add(()=>coPoll());if(S.coRep)add(()=>coPush(true));
  if(S.sync&&S.sync.on)add(()=>syncPull(true));
  if(S.rc&&S.rc.open&&S.rc.live)add(()=>livePoll());
  if(typeof bcPoll==="function")add(()=>bcPoll());
  if(S.mus&&S.mus.qr)add(()=>qrPoll());
  await Promise.race([Promise.allSettled(jobs),new Promise(r=>setTimeout(r,15000))]);
  if(S.board){add(()=>rpPublish());}if(S.roster.some(m=>m.pk))add(()=>mpPublish());
  let newer=false;try{const t=await (await fetch("sw.js",{cache:"no-store"})).text();const v=(t.match(/eop-numbers-v\d+/)||[])[0];const ks=await caches.keys();newer=!!v&&ks.some(k=>/^eop-numbers-v/.test(k))&&!ks.includes(v);if(newer){const r=await navigator.serviceWorker.getRegistration();if(r)await r.update()}}catch(e){}
  refBusy=false;if(b)b.classList.remove("spin");
  if(newer){toast("New version of the app. Reloading…");setTimeout(()=>location.reload(),1200);return}
  const y=window.scrollY;const a=document.activeElement&&document.activeElement.tagName;if(a!=="INPUT"&&a!=="TEXTAREA"){render();window.scrollTo(0,y)}
  const errs=[S.board&&S.board.err,S.link&&(S.link.perr||S.link.err),S.me&&S.me.err,S.sync&&S.sync.err,...S.feeds.map(f=>f.err)].filter(Boolean);
  if(!quiet)toast(errs.length?"Updated, with a problem: "+String(errs[0]).slice(0,70):"Up to date · "+String(new Date().getHours()).padStart(2,"0")+String(new Date().getMinutes()).padStart(2,"0"))}
/* ---------- ADD MARINES: one at a time, a pasted list, or more from a file ---------- */
function addParse(line){const raw=String(line||"").trim();if(!raw)return null;const parts=raw.split(/[,\t;]+/).map(x=>x.trim()).filter(Boolean);let rank="",sec="",sub="",phone="";const name=[];
  const words0=parts[0].split(/\s+/);if(RANKS.includes(words0[0].toUpperCase())){rank=words0[0].toUpperCase();parts[0]=words0.slice(1).join(" ")}
  const codes=SECTIONS.map(x=>x[0]);
  for(const p0 of parts){const p=p0.toUpperCase();const d=p.replace(/\D/g,"");if(d.length===10||(d.length===11&&d[0]==="1")){phone=d.slice(-10);continue}
    if(!sec&&(codes.includes(p)||p==="ATT")){sec=p;continue}if(!sec&&S.level==="co"&&codes.includes(plCode(p))){sec=plCode(p);continue}
    if(S.level==="co"&&sec&&!sub&&/^[A-Z]{2,4}$/.test(p)&&name.length){sub=subCode(p);continue}if(p)name.push(p)}
  const nm=name.join(", ").replace(/\s+/g," ").trim();if(!nm)return null;return {rank,name:nm,sec,sub,phone}}
function addMarine(o,defSec){const sec=o.sec||defSec||SECTIONS[0][0];const rec={id:"a"+Date.now().toString(36)+rndId(3),rank:o.rank||(MODE().rankDef||"LCPL"),name:o.name.toUpperCase().slice(0,60),sec,status:o.status||"On Hand",duty:"Full Duty",detail:"Added in app",loc:"",start:"",end:""};
  if(o.sub)rec.sub=o.sub;if(o.phone)rec.phone=o.phone;if(S.source==="sample"){S.roster=[];S.source="mol";S.loadedAt=new Date().toLocaleString([], {day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}
  if(S.roster.some(m=>fullK(m)===fullK(rec)))return null;S.roster.push(rec);return rec}
function addSheet(sec){sheetCtx={kind:"addm"};const co=S.level==="co";const subs=[...new Set(S.roster.map(m=>m.sub).filter(Boolean))];const def=sec||(SECTIONS.some(x=>x[0]===String(view).toUpperCase())?String(view).toUpperCase():SECTIONS[0][0]);
  $("#sheetT").innerHTML=`Add Marines<small>Add one at a time, or paste a list.</small>`;
  $("#sheetOpts").innerHTML=`<div class="panel" style="margin:0" data-noxl>
    <label for="amSec">${co?"Platoon":"Section"}</label><select id="amSec" class="wsel">${SECTIONS.map(([k,n])=>`<option value="${k}"${k===def?" selected":""}>${esc(k+" · "+n)}</option>`).join("")}<option value="ATT">ATT · Attached</option></select>
    ${co?`<label for="amSub">Section in the platoon</label><input type="text" id="amSub" list="amSubs" maxlength="6" placeholder="HE" autocapitalize="characters" style="text-transform:uppercase"><datalist id="amSubs">${subs.map(x=>`<option value="${esc(x)}">`).join("")}</datalist>`:""}
    <div class="row2"><select id="amRank" class="wsel" aria-label="Rank">${RANKS.map(r=>`<option${r===(MODE().rankDef||"LCPL")?" selected":""}>${r}</option>`).join("")}</select><input type="tel" id="amPh" placeholder="Phone (optional)" inputmode="tel"></div>
    <input type="text" id="amName" placeholder="LAST, FIRST M." autocapitalize="characters" style="text-transform:uppercase" autocomplete="off">
    <button class="btn" id="amAdd">Add</button><div class="note" id="amOut"></div>
    <details style="margin-top:10px"><summary><b>Paste a list</b></summary><p class="note">One Marine per line: rank, name${co?", platoon, section":", section"}, phone. Only the name is required.<br>e.g. <i>SGT SMITH, JOHN A., ${esc(SECTIONS[co?1:0]?SECTIONS[co?1:0][0]:"HQ")}${co?", HE":""}, 808-555-0100</i></p>
      <textarea id="amList" style="min-height:120px" placeholder="LCPL DOE, JANE\nCPL ROE, RICHARD, ${esc((SECTIONS[1]||SECTIONS[0])[0])}"></textarea><button class="btn alt" id="amListAdd">Add list</button></details>
    <button class="btn alt" id="amDone">Done</button></div>`;
  const sh=$("#sheet");sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add("open")));setTimeout(()=>{const i=$("#amName");if(i)i.focus()},300)}
async function mergeFile(f){const text=await fileToCSV(f);let list;
  if(S.level==="co"){const P=companyParse(text);list=P.roster;for(const [k,n] of P.secs)if(!SECTIONS.some(x=>x[0]===k)&&SECTIONS.length<10)SECTIONS.push([k,n]);S.secs=SECTIONS.map(x=>x.slice())}
  else list=importCSV(text).roster;
  const have=new Set(S.roster.map(fullK));let n=0;if(S.source==="sample"){S.roster=[];S.source="mol"}
  for(const m of list){if(have.has(fullK(m)))continue;m.id="a"+Date.now().toString(36)+rndId(3);S.roster.push(m);have.add(fullK(m));n++}save();return n}
document.addEventListener("click",e=>{const t=e.target;
  if(t.closest("[data-addm]")){if(!canEdit())return denyMsg();addSheet(t.closest("[data-addm]").dataset.addm||"");return}
  if(t.id==="amAdd"){const name=($("#amName").value||"").trim();if(!name){toast("Enter a name.");return}const ph=normPh($("#amPh").value||"");
    const r=addMarine({rank:$("#amRank").value,name,sec:$("#amSec").value,sub:$("#amSub")?subCode($("#amSub").value):"",phone:ph});save();
    $("#amName").value="";$("#amPh").value="";$("#amName").focus();const o=$("#amOut");if(o)o.innerHTML=r?`✓ Added <b>${esc(r.rank+" "+r.name)}</b> to ${esc(r.sec)}. Add another or tap Done.`:(()=>{const x=S.roster.find(m=>fullK(m)===fullK({name}));return x?`Already on the roster: <b>${esc(x.rank+" "+x.name)}</b> in ${esc(x.sec)}. Not added twice.`:"Already on the roster."})();return}
  if(t.id==="amDone"){closeSheet();render();return}
  if(t.id==="amListAdd"){const lines=($("#amList").value||"").split(/\n+/);let n=0,skip=0;const def=$("#amSec").value;for(const l of lines){const o=addParse(l);if(!o)continue;const r=addMarine(o,def);if(r)n++;else skip++}save();$("#amList").value="";
    const o=$("#amOut");if(o)o.innerHTML=`✓ Added <b>${n}</b>${skip?` · ${skip} already on the roster`:""}.`;toast(n+" added");return}});
document.addEventListener("change",e=>{if(e.target.id!=="coFileAdd"&&e.target.id!=="fileAdd")return;const f=e.target.files[0];if(!f)return;const o=$("#"+(e.target.id==="coFileAdd"?"coFOut":"fileAddOut"));
  mergeFile(f).then(n=>{toast(n+" new Marines added");if(o)o.textContent=n+" new Marines added. Everyone already here was kept.";if(S.board)rpPublish(true);render()}).catch(err=>{if(o)o.textContent=String(err.message||err)});e.target.value=""});

/* ---------- COMPANY ROSTER: drop one file, build the whole company board ---------- */
function coLabel(){return (S.coName||"").trim()||"Company"}
function coFeedName(){const n=coLabel();return /company$/i.test(n)?n:n+" Company"}
function plCode(v){const U=String(v||"").toUpperCase().trim();if(!U)return"";if(/^(HQ|HQS|HEADQUARTERS|CO HQ|COMPANY HQ|HQ PLT|HQ PLATOON)$/.test(U))return"HQ";
  const n=(U.match(/^(\d)\s*(?:ST|ND|RD|TH)?\s*(?:PLT|PLATOON)?$/)||U.match(/(\d)\s*(?:ST|ND|RD|TH)?\s*(?:PLT|PLATOON)/)||U.match(/(?:PLT|PLATOON)\s*(\d)/)||[])[1];if(n)return n+"PLT";
  return U.replace(/[^A-Z0-9]/g,"").slice(0,6)||""}
function plName(c,raw){if(c==="HQ")return"Company HQ";const n=(c.match(/^(\d)PLT$/)||[])[1];if(n)return n+(["","st","nd","rd"][+n]||"th")+" Platoon";return String(raw||c).slice(0,30)}
function subCode(v){const U=String(v||"").toUpperCase().trim().replace(/^EE$/,"HE");const m={HEADQUARTERS:"HQ",HQ:"HQ","HEAVY EQUIPMENT":"HE",HE:"HE",EE:"HE","COMBAT ENGINEER":"CE",CE:"CE",ORDNANCE:"ORD",ORD:"ORD",UTILITIES:"UT",UT:"UT"};return m[U]||U.replace(/[^A-Z0-9]/g,"").slice(0,6)}
async function fileToCSV(f){if(/\.numbers$/i.test(f.name))throw new Error("Numbers files can't be opened here. In Numbers: File → Export To → Excel (or CSV), then load that file.");if(/\.xlsx?$/i.test(f.name)){const X=await loadXLSX();const wb=X.read(await f.arrayBuffer(),{type:"array"});return X.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]])}return await f.text()}
function companyParse(text){const rows=parseCSV(text).filter(r=>r.some(x=>x));const hi=rows.findIndex(r=>r.some(x=>/^(name|last name|full name|rank)$/i.test(x.trim())));
  if(hi<0)throw new Error("Couldn't find a header row with Name or Rank.");const H=rows[hi].map(x=>x.toLowerCase().trim());const col=(...ns)=>{for(const n of ns){const i=H.indexOf(n);if(i>=0)return i}return -1};
  const cR=col("rank","grade","rank/grade"),cN=col("name","full name","marine","member"),cL=col("last name","last"),cF=col("first name","first"),cP=col("platoon","plt","plt."),cS=col("section","sec","shop","work section"),cU=col("unit","ruc/unit","organization","org"),
    cSt=col("status","duty status"),cPh=col("phone","cell","cell phone","phone number"),cE=col("end date","end"),cB=col("start date","start"),cLo=col("location","loc");
  if(cN<0&&cL<0)throw new Error("The file needs a Name column (or Last name / First name).");
  const out=[];const plRaw={};let n=0;
  for(const r of rows.slice(hi+1)){const name=cN>=0?r[cN]:((r[cL]||"")+(r[cF]?", "+r[cF]:""));if(!name||!name.trim())continue;
    let pc="",sub="";const segs=cU>=0?String(r[cU]||"").toUpperCase().split("-").map(x=>x.trim()).filter(Boolean):[];
    if(cP<0&&segs.length>=3&&/^\d{4,5}$/.test(segs[0])){pc=segs[2].replace(/[^A-Z0-9]/g,"").slice(0,6);plRaw[pc]=plRaw[pc]||pc;sub=segs[3]?subCode(segs[3]):""}
    else if(cP>=0){pc=plCode(r[cP]);plRaw[pc]=plRaw[pc]||r[cP]}else if(cU>=0){const m=mapCo(r[cU]);const mm=String(r[cU]||"").toUpperCase().match(/(\d)\s*(?:ST|ND|RD|TH)?\s*(?:PLT|PLATOON)|(?:PLT|PLATOON)\s*(\d)/);pc=mm?(mm[1]||mm[2])+"PLT":/HQ/.test(String(r[cU]).toUpperCase())?"HQ":"";sub=m.sub}
    if(cS>=0)sub=subCode(r[cS]);if(!pc)pc="HQ";
    const st=cSt>=0?mapStatus(r[cSt]):"On Hand";
    out.push({id:"m"+(++n),rank:(cR>=0?r[cR]:"").toUpperCase().slice(0,10)||"",name:name.toUpperCase().trim().slice(0,60),sec:pc,sub:sub||undefined,status:st,detail:cSt>=0?(r[cSt]||""):"",loc:cLo>=0?(r[cLo]||""):"",start:cB>=0?fmtD(r[cB]):"",end:cE>=0?fmtD(r[cE]):"",phone:cPh>=0?normPh(r[cPh]||""):""})}
  if(!out.length)throw new Error("The file had a header but no people under it.");
  const title=(rows.slice(0,hi).map(r=>r.find(x=>x&&x.trim()))||[]).filter(Boolean)[0]||"";
  const codes=[...new Set(out.map(m=>m.sec))].sort((a,b)=>(a==="HQ"?-1:b==="HQ"?1:a.localeCompare(b,undefined,{numeric:true}))).slice(0,10);
  for(const m of out)if(!codes.includes(m.sec))m.sec=codes[codes.length-1];
  return {title:String(title).replace(/\(.*?\)/g,"").trim().slice(0,30),roster:out,secs:codes.map(c=>[c,plName(c,plRaw[c])]),byPlt:codes.map(c=>[c,out.filter(m=>m.sec===c).length]),subs:[...new Set(out.map(m=>m.sub).filter(Boolean))]}}
async function companyLoad(f){const P=companyParse(await fileToCSV(f));
  if(S.level!=="co"){S.secsPlt=SECTIONS.map(x=>x.slice());S.level="co"}
  SECTIONS.splice(0,SECTIONS.length,...P.secs);S.secs=P.secs;S.secsCo=P.secs.map(x=>x.slice());
  const pm={};S.roster.forEach(m=>{if(m.phone)pm[m.name.toUpperCase()]=m.phone});P.roster.forEach(m=>{if(!m.phone&&pm[m.name])m.phone=pm[m.name]});
  if(!S.coName&&P.title)S.coName=P.title;
  S.roster=P.roster;S.source="mol";S.loadedAt=new Date().toLocaleString([], {day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});S.leaderMode=true;secDraft=null;S.snap=null;save();coLoaded=P;return P}
let coLoaded=null;
function coRosterHTML(){const co=S.level==="co"&&S.source!=="sample";
  return `<div class="panel" style="border-color:var(--brass)"><b>${co?"Company roster loaded":"Build the company board from a roster"}</b>
    ${co?`<label for="coNmSet">Company name (shows on the company Feed and reports)</label><input type="text" id="coNmSet" maxlength="30" value="${esc(S.coName||"")}" placeholder="CLC 33"><div class="note">${S.roster.length} people · ${SECTIONS.map(([k])=>`<b>${esc(k)}</b> ${S.roster.filter(m=>m.sec===k).length}`).join(" · ")}</div>
      <div class="row2"><button class="btn" data-go="live">Send platoon OIC links</button><button class="btn alt" data-go="board">See the company</button></div>
      <button class="btn alt" data-addm="" style="width:100%">+ Add Marines</button>
      <label for="coFileAdd">Add more Marines from a file (keeps everyone already here)</label><input type="file" id="coFileAdd" accept=".csv,.xlsx,.xls,.numbers,text/csv">
      <p class="note">Or load an updated full roster below to replace it.</p>`:`<p class="note">Drop in the company roster (Excel or CSV). Each platoon becomes a tab, each platoon OIC gets a link, and the whole company shows here live.</p>
      <p class="note">Columns it reads: <b>Name</b> (or Last / First), <b>Rank</b>, <b>Platoon</b>, <b>Section</b>, Phone, Status. No Platoon column? It reads the Unit column (e.g. "1ST PLT-HE").</p>`}
    <label for="coFile">${co?"Load an updated company roster":"Company roster file"}</label><input type="file" id="coFile" accept=".csv,.xlsx,.xls,.numbers,text/csv"><div class="note" id="coFOut"></div></div>`}
document.addEventListener("change",e=>{if(e.target.id==="coNmSet"){S.coName=cleanName(e.target.value)||"";const f=mainFeed();if(f&&S.level==="co"){f.unit=coFeedName();if(S.board)rpPublish(true);mpSchedule()}save();toast("Company name saved");return}if(e.target.id!=="coFile")return;const f=e.target.files[0];if(!f)return;const o=$("#coFOut");if(o)o.textContent="Reading "+f.name+"…";
  companyLoad(f).then(P=>{toast(P.roster.length+" people loaded into "+P.secs.length+" platoons");if(S.board){rpPublish(true)}renderCo();window.scrollTo(0,0)}).catch(err=>{if(o)o.textContent=String(err.message||err)});e.target.value=""});

/* ---------- COMPANY: several platoon boards rolled up live into one company view ----------
   Platoon OIC phones encrypt their roster with the company key (only in the links) and report it; viewers decrypt. */
let coBusy=false,coPT=null,coPushBusy=false,coOpen=null,coNew=false;
const coName=()=>(S.coBoard&&S.coBoard.name)||"Company";
async function coCreate(name){const id=rndId(14),rk=rndId(32),wk=rndId(32),ek=b64url(crypto.getRandomValues(new Uint8Array(32)));
  await SB.rpc("create_company",{p_id:id,p_read_key:rk,p_write_key:wk});S.coBoard={id,rk,wk,ek,name:String(name||"Company").slice(0,30),own:true,units:{},err:""};save()}
function coLink(kind){const C=S.coBoard;const q=new URLSearchParams();if(kind==="rep"){q.set("coj",C.id);q.set("k",C.wk)}else{q.set("cov",C.id);q.set("r",C.rk)}q.set("e",C.ek);q.set("u",C.name);return PUB()+"#"+q.toString()}
function coPayload(){const R=S.coRep;const ms=S.roster.map(m=>{const o={rank:m.rank,sec:m.sec,status:m.status,duty:dutyOf(m)};if(R.names!==false){o.name=m.name;if(m.start)o.start=m.start;if(m.end)o.end=m.end;if(m.loc)o.loc=m.loc;if(m.detail)o.detail=String(m.detail).slice(0,60)}return o});
  return {v:1,name:R.name||unitName(),secs:SECTIONS.map(x=>x.slice()),ms}}
function coSchedule(){if(!S.coRep||S.role==="view")return;clearTimeout(coPT);coPT=setTimeout(coPush,6000)}
async function coPush(force){const R=S.coRep;if(!R||coPushBusy||S.role==="view"||S.source==="sample")return;coPushBusy=true;
  try{const body=coPayload();const sg=sigF(body);if(!force&&sg===R.sig&&Date.now()-(R.at||0)<20*60000)return;
    await SB.rpc("put_unit",{p_company:R.id,p_write_key:R.wk,p_unit:R.uid,p_ct:await fdEnc(R.ek,Object.assign({t:Date.now()},body))});R.sig=sg;R.at=Date.now();R.err="";rawSave()}
  catch(e){const t=String(e.message||e);R.err=/link not valid/.test(t)?"The company link was replaced or removed. Ask for a new one.":/could not find|schema/i.test(t)?"Server needs setup part 14a and 14b.":t.slice(0,80);rawSave()}
  finally{coPushBusy=false}}
async function coPoll(){const C=S.coBoard;if(!C||coBusy)return;coBusy=true;
  try{const rows=await SB.rpc("get_units",{p_company:C.id,p_read_key:C.rk});const seen=new Set();
    for(const r of rows||[]){seen.add(r.unit);const t=Date.parse(r.updated_at)||0;const cur=C.units[r.unit];if(cur&&cur.t===t)continue;const o=await fdDec(C.ek,r.ct);if(!o||!Array.isArray(o.ms))continue;
      C.units[r.unit]={t,name:String(o.name||"Unit").slice(0,30),ms:o.ms.slice(0,600),secs:Array.isArray(o.secs)?o.secs.slice(0,10):[]}}
    for(const k of Object.keys(C.units))if(!seen.has(k))delete C.units[k];C.err="";C.at=Date.now();rawSave();
    if(view==="co"){const a=document.activeElement&&document.activeElement.tagName;if(a!=="INPUT"&&a!=="TEXTAREA"&&a!=="SELECT"){const y=window.scrollY;renderCo();window.scrollTo(0,y)}}}
  catch(e){const t=String(e.message||e);C.err=/link not valid/.test(t)?"This company link no longer works. Ask for a new one.":/could not find|schema/i.test(t)?"Server needs setup part 14a and 14b.":/fetch|network/i.test(t)?"No signal.":t.slice(0,80);rawSave();if(view==="co")renderCo()}
  finally{coBusy=false}}
every(30000,()=>{if(S.coBoard&&(view==="co"||hubOn))coPoll();if(S.coRep)coPush()},"company");
function coTally(ms){const c={};STATUSES.forEach(x=>c[x]=0);let tot=0;for(const m of ms){if(m.sec==="ATT")continue;tot++;c[STATUSES.includes(m.status)?m.status:"On Hand"]++}return {c,tot,oh:c["On Hand"]}}
function coText(){const C=S.coBoard;const U=Object.values(C.units);const all=U.flatMap(u=>u.ms);const T=coTally(all);const L=[C.name.toUpperCase()+" ACCOUNTABILITY "+dtg(new Date()),"TOTAL: "+T.oh+"/"+T.tot+" ON HAND ("+pct(T.oh,T.tot)+"%)"];
  for(const u of U.sort((a,b)=>a.name.localeCompare(b.name))){const x=coTally(u.ms);L.push(u.name+": "+x.oh+"/"+x.tot+(Date.now()-u.t>4*3600000?" (as of "+dtg(new Date(u.t)).slice(0,7)+")":""))}
  const off=STATUSES.slice(1).filter(st=>T.c[st]);if(off.length)L.push(off.map(st=>SHORT[st]+" "+T.c[st]).join(", "));return L.join("\n")}
function renderCo(){const C=S.coBoard,R=S.coRep;let h=`<div class="sechead" style="margin-top:12px"><h2>Company</h2>${C?`<span class="ratio" style="font-size:13px">${C.err?`<span style="color:var(--warn)">${esc(C.err)}</span>`:`<span style="color:var(--s-onhand)">● live</span>`}</span>`:""}</div>`;
  if((S.wsCur||"plt")==="co"){if(isOwner())h+=coRosterHTML()}else h+=`<div class="panel" style="border-color:var(--brass)"><b>Company view</b><p class="note">Run the whole company separately from your platoon. Your platoon stays exactly as it is; switch any time with <b>PLT / CO</b> at the top.</p><button class="btn" data-wsgo="co">${S.ws&&S.ws.co?"Open company view":"Set up company view"}</button></div>`;
  if((!C&&!R||coNew)&&(S.wsCur||"plt")!=="co"){h+=`<h2 style="margin-top:18px">Or: platoons keep their own rosters</h2><div class="panel"><p class="note">Put several platoons on one live company board. You get two links: one for each platoon OIC to report their numbers in, and a view-only link for anyone who needs the whole company (CO, XO, 1stSgt). Everything is encrypted on the phones; the server can't read it.</p>
    <label for="coNm">Company name</label><input type="text" id="coNm" maxlength="30" placeholder="${esc(MODE().v&&MODE().v.coEx||"CLC-33")}" value="${esc((S.unit&&cleanName(S.unit))||"")}"><button class="btn" id="coMake">Set up the company board</button>${coNew?`<button class="btn alt" id="coCancel">Cancel</button>`:""}<div class="note" id="coOut"></div>
    <p class="note">Got a company link? Open it on this phone.</p></div>`;$("#main").innerHTML=h;return}
  if(!C&&!R){$("#main").innerHTML=h;return}
  if(C){const U=Object.entries(C.units).map(([k,u])=>Object.assign({k},u)).sort((a,b)=>a.name.localeCompare(b.name));const all=U.flatMap(u=>u.ms);const T=coTally(all);const P=pct(T.oh,T.tot);
    h+=`<div class="card hero"><div style="display:flex;justify-content:space-between;align-items:baseline"><span class="lbl">${esc(C.name.toUpperCase())} · ON HAND</span><span style="font-size:12px;font-weight:700;color:var(--muted)">${U.length} unit${U.length===1?"":"s"}</span></div>
      <div style="display:flex;align-items:baseline;gap:8px"><span class="big">${T.oh}</span><span style="font-size:20px;font-weight:700;color:var(--muted)">/ ${T.tot}</span><span style="margin-left:auto;font-size:15px;font-weight:800;color:var(--s-onhand)">${P}%</span></div><div class="hbar"><i style="width:${P}%"></i></div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${STATUSES.slice(1).filter(st=>T.c[st]).map(st=>`<span class="chip" style="color:var(${SVAR[st]})">${esc(SHORT[st])} ${T.c[st]}</span>`).join("")||`<span class="note" style="margin:0">Everyone on hand.</span>`}</div></div>`;
    if(!U.length)h+=`<div class="panel"><p class="note">No units have reported yet. Text the platoon link to each platoon OIC (below). Their numbers show up here as soon as they open it.</p></div>`;
    for(const u of U){const x=coTally(u.ms);const old=Date.now()-u.t>4*3600000;const open=coOpen===u.k;
      h+=`<div class="rrow" style="--sc:var(${old?"--warn":"--s-onhand"})"><button data-coopen="${u.k}" style="all:unset;display:block;width:100%;cursor:pointer"><div class="rtop"><div class="who"><b>${esc(u.name)}</b> · ${x.oh}/${x.tot} on hand (${pct(x.oh,x.tot)}%)<div class="ph" style="${old?"color:var(--warn)":""}">Updated ${ago(u.t)}${old?" · numbers may be old":""}</div></div><span class="note" style="margin:0">${open?"▾":"▸"}</span></div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${STATUSES.slice(1).filter(st=>x.c[st]).map(st=>`<span class="chip" style="color:var(${SVAR[st]})">${esc(SHORT[st])} ${x.c[st]}</span>`).join("")}</div></button>`;
      if(open){const off=u.ms.filter(m=>m.status!=="On Hand");const secs=[...new Set(u.ms.map(m=>m.sec))].filter(x=>x!=="ATT");
        h+=`<div class="note" style="margin:8px 0 0">${secs.map(sc=>{const y=coTally(u.ms.filter(m=>m.sec===sc));return `<b>${esc(sc)}</b> ${y.oh}/${y.tot}`}).join(" · ")}</div>`;
        if(off.length&&off[0].name)h+=STATUSES.slice(1).map(st=>{const g=off.filter(m=>m.status===st);return g.length?`<div style="margin-top:8px"><b style="color:var(${SVAR[st]})">${esc(SHORT[st])} (${g.length})</b>${g.map(m=>`<div class="ph">${esc(m.sec+" "+m.rank+" "+m.name)}${m.end?" · thru "+esc(m.end):""}${m.loc?" · "+esc(m.loc):""}</div>`).join("")}</div>`:""}).join("");
        else if(off.length)h+=`<p class="note">This unit reports counts only, no names.</p>`;
        if(C.own)h+=`<button class="chip" data-codrop="${u.k}" style="cursor:pointer;margin-top:8px">${armed==="codrop"+u.k?"Tap again to remove "+esc(u.name):"Remove this unit"}</button>`}
      h+=`</div>`}
    h+=`<div class="row2" style="margin-top:10px"><a class="btn" href="${esc("sms:?&body="+encodeURIComponent(coText()))}">Text company numbers</a><button class="btn alt" id="coRef">↻ Refresh</button></div>`;
    if(C.own||C.wk)h+=`<h2>Links</h2><div class="panel"><div class="rrow" style="--sc:var(--line)"><div class="who"><b>Platoon OIC link</b><div class="ph">Each platoon OIC opens it in their app. Their whole platoon reports here and stays live.</div></div><div class="row2"><a class="btn alt" href="${esc("sms:?&body="+encodeURIComponent(C.name+": open this in Accounted For to report your platoon to the company board. Keep it private: "+coLink("rep")+" · iPhone: open in Safari, then Share → Add to Home Screen."))}">Text link</a><button class="btn alt" data-cocopy="rep">Copy</button></div></div>
      <div class="rrow" style="--sc:var(--line)"><div class="who"><b>Company view link</b><div class="ph">View only: the whole company, every unit, who's off and why. For the CO, XO, 1stSgt.</div></div><div class="row2"><a class="btn alt" href="${esc("sms:?&body="+encodeURIComponent(C.name+": open this to see the whole company's accountability live in Accounted For. Keep it private: "+coLink("view")+" · iPhone: open in Safari, then Share → Add to Home Screen."))}">Text link</a><button class="btn alt" data-cocopy="view">Copy</button></div></div>
      ${!R&&S.source!=="sample"?`<button class="btn" id="coSelf" style="width:100%">Report my own unit (${esc(unitName())}) here too</button>`:""}</div>`}
  if(R)h+=`<h2>My unit's report</h2><div class="panel"><div>This phone reports <b>${esc(R.name||unitName())}</b> to <b>${esc(R.co)}</b>.</div><div class="note">${R.err?`<span style="color:var(--warn)">${esc(R.err)}</span>`:S.source==="sample"?`<span style="color:var(--warn)">Load your roster first; sample Marines aren't sent.</span>`:R.at?"Last sent "+ago(R.at)+". Sends by itself when anything changes.":"Sending…"}</div>
    <label class="tog"><input type="checkbox" id="coNames"${R.names!==false?" checked":""}> Include names, dates and locations (off = counts only)</label>
    <div class="row2"><button class="btn" id="coSend">Send now</button><button class="btn alt" id="coStop">${armed==="costop"?"Tap again to stop reporting":"Stop reporting"}</button></div></div>`;
  if(C)h+=`<button class="btn warn" id="coLeave" style="width:100%;margin-top:14px">${armed==="coleave"?(C.own?"Tap again: remove the company board from this phone":"Tap again to remove"):(C.own?"Remove company board from this phone":"Remove company view from this phone")}</button>`;
  else h+=`<button class="btn alt" id="coNewB" style="width:100%;margin-top:14px">Set up a company board here</button>`;
  $("#main").innerHTML=h}
function coJoinPrompt(q,kind){const id=(q.get(kind)||"").replace(/[^a-z0-9]/g,"").slice(0,20),key=(q.get(kind==="coj"?"k":"r")||"").replace(/[^a-z0-9]/g,"").slice(0,40),ek=(q.get("e")||"").replace(/[^A-Za-z0-9_-]/g,"").slice(0,60),co=(q.get("u")||"Company").replace(/[|#<>]/g,"").slice(0,30);
  try{history.replaceState(null,"",location.pathname)}catch(e){}if(id.length<10||key.length<24||ek.length<40)return toast("That company link is incomplete.");
  if(kind==="cov"){if(S.coBoard&&S.coBoard.id===id){view="co";render();coPoll();return}S.coBoard={id,rk:key,ek,name:co,own:false,units:{},err:""};S.onb=true;if(!S.mode)S.mode="military";if(S.source==="sample")S.coOnly=true;save();view="co";render();window.scrollTo(0,0);coPoll();toast("You're viewing "+co);return}
  sheetCtx={kind:"coj",id,wk:key,ek,co};$("#sheetT").innerHTML=`Report to ${esc(co)}?<small>Your whole unit's numbers go to the company board and stay live as you make changes.</small>`;
  $("#sheetOpts").innerHTML=`<div class="panel" style="margin:0" data-noxl><label for="cjNm">Your unit's name on the company board</label><input type="text" id="cjNm" maxlength="30" value="${esc(unitName())}">
    <label class="tog"><input type="checkbox" id="cjNames" checked> Include names, dates and locations (off = counts only)</label>${S.source==="sample"?`<p class="note" style="color:var(--warn)">Load your roster first, or nothing will be sent.</p>`:""}
    <button class="btn" id="cjYes">Report to ${esc(co)}</button><button class="btn alt" data-sclose="1">Not now</button></div>`;
  const sh=$("#sheet");sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add("open")))}
document.addEventListener("click",e=>{const t=e.target;
  const lvb=t.closest("[data-lvl]");if(lvb){if(!isOwner())return denyMsg();setLevel(lvb.dataset.lvl);tabRedraw();toast(S.level==="co"?"Company level: tabs are platoons.":"Platoon level: tabs are sections.");return}
  if(t.id==="coMake"){const nm=($("#coNm").value||"").trim()||"Company";t.disabled=true;t.textContent="Setting up…";coCreate(nm).then(()=>{coNew=false;renderCo();toast("Company board ready. Text the links.")}).catch(err=>{t.disabled=false;t.textContent="Set up the company board";const o=$("#coOut");const m=String(err.message||err);if(o)o.textContent=/could not find|schema/i.test(m)?"Server needs setup part 14a and 14b (DATA → System check).":"Couldn't set up: "+m.slice(0,80)});return}
  if(t.id==="coNewB"){coNew=true;renderCo();return}if(t.id==="coCancel"){coNew=false;renderCo();return}
  if(t.id==="coRef"){coPoll();toast("Refreshing…");return}
  const op=t.closest("[data-coopen]");if(op){coOpen=coOpen===op.dataset.coopen?null:op.dataset.coopen;renderCo();return}
  const cp=t.closest("[data-cocopy]");if(cp){const u=coLink(cp.dataset.cocopy);try{navigator.clipboard.writeText(u).then(()=>toast("Link copied"),()=>toast(u))}catch(err){toast(u)}return}
  const dr=t.closest("[data-codrop]");if(dr){const k=dr.dataset.codrop;if(armed!=="codrop"+k){armed="codrop"+k;renderCo();return}armed=null;SB.rpc("drop_unit",{p_company:S.coBoard.id,p_read_key:S.coBoard.rk,p_unit:k}).catch(()=>{});delete S.coBoard.units[k];save();renderCo();return}
  if(t.id==="coSelf"){const C=S.coBoard;S.coRep={id:C.id,wk:C.wk,ek:C.ek,co:C.name,name:unitName(),uid:rndId(12),names:true,sig:"",at:0,err:""};save();coPush(true).then(()=>{coPoll();renderCo()});renderCo();return}
  if(t.id==="coSend"){coPush(true).then(()=>{renderCo();toast(S.coRep&&S.coRep.err?S.coRep.err:"Sent")});return}
  if(t.id==="coNames"){S.coRep.names=t.checked;S.coRep.sig="";save();coPush(true);return}
  if(t.id==="coStop"){if(armed!=="costop"){armed="costop";renderCo();return}armed=null;S.coRep=null;save();renderCo();toast("Stopped reporting");return}
  if(t.id==="coLeave"){if(armed!=="coleave"){armed="coleave";renderCo();return}armed=null;S.coBoard=null;S.coOnly=false;save();renderCo();return}
  if(t.id==="cjYes"&&sheetCtx&&sheetCtx.kind==="coj"){const c=sheetCtx;S.coRep={id:c.id,wk:c.wk,ek:c.ek,co:c.co,name:(($("#cjNm").value||"").trim()||unitName()).slice(0,30),uid:(S.coRep&&S.coRep.id===c.id&&S.coRep.uid)||rndId(12),names:$("#cjNames").checked,sig:"",at:0,err:""};S.leaderMode=true;save();closeSheet();view="co";render();coPush(true).then(()=>{renderCo();toast(S.coRep.err?S.coRep.err:"Reporting to "+c.co)});return}});

/* ---------- HEALTH: what's stale or broken, in plain words ---------- */
const hrs=t=>Math.round((Date.now()-t)/3600000);
function healthIssues(){const out=[];const B=S.board;
  if(SB.failAt&&(!SB.okAt||SB.failAt>SB.okAt)&&Date.now()-SB.failAt<30*60000)out.push({t:/paused|inactive|restor/i.test(SB.failMsg||"")?"Your server looks paused. Open supabase.com → your project → Restore.":"Can't reach your server right now. Check signal; if it keeps happening, open DATA → System check.",go:"sys"});
  if(isOwner()&&S.source!=="sample"&&(!S.sync||!S.sync.on))out.push({t:"Backup is off. Losing this phone loses the board.",go:"data"});
  if(S.sync&&S.sync.err)out.push({t:"Backup: "+S.sync.err,go:"data"});
  if(B){if(B.err)out.push({t:"Live sections: "+B.err,go:"live"});if(B.rerr)out.push({t:"Sharing rosters: "+B.rerr,go:"live"});if(S.hubErr)out.push({t:"Feed setup: "+S.hubErr,go:"live"});
    const keyed=Object.keys(B.sk||{});const never=keyed.filter(k=>!B.last[k]);const quiet=keyed.filter(k=>B.last[k]&&Date.now()-B.last[k].t>24*3600000);
    if(never.length)out.push({t:LV().heads+" not connected yet: "+never.join(", ")+". Text them their links.",go:"live"});
    if(quiet.length)out.push({t:quiet.join(", ")+(quiet.length>1?" haven't":" hasn't")+" sent an update in over 24 hr.",go:"live"})}
  if(S.mpErr)out.push({t:"My pages: "+S.mpErr,go:"data"});
  if(S.coRep&&S.coRep.err)out.push({t:"Company report: "+S.coRep.err,go:"co"});
  for(const f of S.feeds)if(f.err)out.push({t:"Feed "+f.unit+": "+f.err,go:"feed"});
  return out}
function healthCard(){const I=healthIssues();if(!I.length)return `<div class="note" style="margin:10px 4px 0;color:var(--s-onhand);font-weight:700">● All systems working${SB.okAt?" · server reached "+ago(SB.okAt):""}${hubOn?" · hub mode on":""}</div>`;
  return `<div class="sech"><h2>Needs attention</h2><span class="note" style="margin:0">${I.length}</span></div><div class="card ny">${I.map(x=>`<button class="lrow" data-go="${x.go}" style="width:100%;text-align:left;background:none;border:0;cursor:pointer;color:inherit"><span class="n tone-r">!</span><span class="t" style="flex:1">${esc(x.t)}</span></button>`).join("")}</div>`}
function staleBanner(){const L=S.link;if(L&&L.rk2&&L.pulled&&L.hb&&Date.now()-L.hb>24*3600000)return `<div class="banner"><span>${esc(L.unit)}'s app hasn't synced in ${hrs(L.hb)} hr. Your changes are saved and reach them when they open it.</span></div>`;
  const D=S.me&&S.me.d;if(D&&D.at&&Date.now()-D.at>36*3600000&&(view==="me"||view==="today"))return `<div class="banner"><span>Your page was last updated ${hrs(D.at)} hr ago. Check with your section leader for anything newer.</span></div>`;return""}
/* ---------- REPLACE ONE SECTION LINK ---------- */
async function resetSecLink(sec){const B=S.board;const nk=rndId(32);await SB.rpc("set_sec_key",{p_board:B.id,p_read_key:B.rk,p_sec:sec,p_key:nk});
  B.wks=B.wks||{};B.wks[sec]=nk;B.sk=B.sk||{};B.sk[sec]=b64url(crypto.getRandomValues(new Uint8Array(32)));B.rsig=B.rsig||{};delete B.rsig[sec];
  const f=mainFeed();if(f&&f.lk){const pk=rndId(32);await SB.rpc("set_feed_poster",{p_feed:f.id,p_leader_key:f.lk,p_poster_key:pk});f.pk=pk;B.rsig={}}
  save();await rpPublish(true);actAdd("↺","Replaced the "+sec+" leader link. The old one no longer works.","live")}
/* ---------- HUB MODE: keep a spare phone, tablet or computer running as the always-on hub ---------- */
let hubOn=false,hubWL=null,hubT=null;
async function hubWake(){try{if("wakeLock" in navigator&&!document.hidden){hubWL=await navigator.wakeLock.request("screen");hubWL.addEventListener("release",()=>{hubWL=null})}}catch(e){}}
function hubStart(){hubOn=true;hubWake();clearInterval(hubT);hubT=setInterval(()=>{if(!refBusy)refreshAll(true)},120000);refreshAll(true)}
function hubStop(){hubOn=false;clearInterval(hubT);try{hubWL&&hubWL.release()}catch(e){}hubWL=null}
document.addEventListener("visibilitychange",()=>{if(hubOn&&!document.hidden&&!hubWL)hubWake()});
if(S.hubMode)setTimeout(hubStart,3000);
document.addEventListener("change",e=>{const hs=e.target.closest&&e.target.closest("[data-lvhead]");if(hs&&S.board){S.board.heads=S.board.heads||{};if(hs.value)S.board.heads[hs.dataset.lvhead]=hs.value;else delete S.board.heads[hs.dataset.lvhead];save();const y=window.scrollY;renderLive();window.scrollTo(0,y)}});
document.addEventListener("click",e=>{const mn=e.target.closest("[data-lvmine]");if(mn){const k=mn.dataset.lvmine;const u=new URL(boardLink(k));const q=new URLSearchParams(u.hash.slice(1));
    S.ws=S.ws||{};S.ws.plt=S.ws.plt||{roster:[],source:"sample"};S.ws.plt.pendLink={bid:q.get("join"),wk:q.get("k"),sec:k,unit:q.get("u")||unitName(),ek:q.get("e"),rk2:q.get("r")};S.ws.plt.link=null;rawSave();toast("Switching to your platoon view to link "+k+"…");setTimeout(()=>wsSwitch("plt"),400);return}});
document.addEventListener("click",e=>{const rs=e.target.closest("[data-lvreset]");if(rs){if(!isOwner())return denyMsg();const k=rs.dataset.lvreset;if(armed!=="lvreset"+k){armed="lvreset"+k;renderLive();return}armed=null;rs.disabled=true;rs.textContent="Replacing…";
    resetSecLink(k).then(()=>{renderLive();toast("New "+k+" link ready. Text it to the right leader.")}).catch(err=>{const t=String(err.message||err);toast(/could not find|schema/i.test(t)?"Server needs setup part 12a and 12b first (DATA → System check).":"Couldn't replace: "+t.slice(0,60));renderLive()});return}
  if(e.target.id==="hubMode"){S.hubMode=!S.hubMode;rawSave();S.hubMode?hubStart():hubStop();renderLive();toast(S.hubMode?"Hub mode on. Keep this screen open and plugged in.":"Hub mode off");return}});
function secAcks(sec){const f=mainFeed();if(!f)return[];const ids=new Set(S.roster.filter(m=>m.sec===sec).map(m=>m.id));
  return (f.posts||[]).filter(p=>Date.now()-p.t<14*86400000).slice(0,25).map(p=>{const A=(f.acks||{})[String(p.id)]||{};const g=[],pr=[];for(const [id,a] of Object.entries(A)){if(!ids.has(id))continue;if(a.c===2)pr.push([id,String(a.note||"").slice(0,40)]);else g.push(id)}return {id:p.id,g,pr}})}
function slStats(f,p){const L=S.link;if(!L||!L.rk2||!f.pk||!f.hub)return"";const e=(L.acks||[]).find(x=>+x.id===+p.id);const to=p.to||{k:"all"};
  let pool=L.whole?S.roster.slice():S.roster.filter(m=>m.sec===L.mysec);if(to.k==="secs"&&!(to.s||[]).includes(L.sec))return"";if(to.k==="one")pool=pool.filter(m=>(m.uid||m.id)===to.mid);if(!pool.length)return"";
  if(!e)return `<div class="note" style="margin:0">${esc(L.sec)}: Got its show here after ${esc(L.unit)}'s app syncs.</div>`;
  const g=new Set(e.g),pr=new Map(e.pr);const U=m=>m.uid||m.id;const miss=sorted(pool.filter(m=>!g.has(U(m))&&!pr.has(U(m))));const n=pool.length-miss.length;
  return `<div class="fci"><div style="display:flex;justify-content:space-between"><span class="ttl">${esc(L.sec)} confirmed</span>${pr.size?`<span class="fcchip" style="color:var(--warn)">⚠ ${pr.size}</span>`:""}</div><div class="big">${n}<span style="font-size:15px;color:var(--muted);font-weight:700"> / ${pool.length}</span></div>
    ${[...pr].map(([id,no])=>{const m=pool.find(x=>U(x)===id);return m?`<div class="note" style="margin:0;color:var(--warn)">⚠ ${esc(m.rank+" "+lastOf(m))}: ${esc(no)}</div>`:""}).join("")}
    ${miss.length?`<div class="note" style="margin:0">Not yet: ${miss.map(m=>esc(m.rank+" "+lastOf(m))).join(" · ")}</div>${bcBatches(miss,L.unit+": new word in Feed you haven't confirmed. Open Accounted For → Feed.").map((x,i,a)=>`<a class="btn alt" href="${esc(x.href)}">Remind them${a.length>1?" ("+(i+1)+")":""}</a>`).join("")}`:`<div class="note" style="margin:0;color:var(--s-onhand);font-weight:700">Everyone in ${esc(L.sec)} confirmed.</div>`}</div>`}
let rpT=null,rpBusy=false,hubBusy=false,rpullBusy=false;
function autoLink(c){try{history.replaceState(null,"",location.pathname)}catch(e){}if(typeof closeSheet==="function")try{closeSheet()}catch(e){}
  const L0=S.link;const same=L0&&L0.board===c.bid&&L0.sec===c.sec&&L0.rk2===c.rk2;
  if(!same){S.link={board:c.bid,wk:c.wk,ek:c.ek||"",sec:c.sec,unit:c.unit||"OIC",mysec:c.sec,me:S.myName||"",sig:"",sent:0,err:"",rk2:c.rk2,pulled:false,pt:0}}
  if(S.source==="sample"){S.roster=[];S.source="link";S.loadedAt=dtg(new Date())}
  S.leaderMode=true;if(!S.mode)S.mode="military";S.onb=true;save();view="board";render();window.scrollTo(0,0);rosterPull(true)}
function lkNameSheet(){sheetCtx={kind:"lkname"};$("#sheetT").innerHTML=`Your rank and last name<small>So ${esc((S.link&&S.link.unit)||"your OIC")} sees who sent updates and posts.</small>`;
  $("#sheetOpts").innerHTML=`<div class="panel" style="margin:0" data-noxl><input type="text" id="lkMe" maxlength="30" placeholder="SGT SMITH" autocapitalize="characters" style="text-transform:uppercase" value="${esc(S.myName||"")}"><button class="btn" id="lkMeSave">Save</button><button class="btn alt" data-sclose="1">Later</button></div>`;
  const sh=$("#sheet");sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add("open")))}
document.addEventListener("click",e=>{if(e.target.id==="lkName"){lkNameSheet();return}if(e.target.id==="lkRetry"){rosterPull(true);toast("Loading…");return}
  if(e.target.id==="lkMeSave"){const me=($("#lkMe").value||"").toUpperCase().replace(/[|#]/g," ").replace(/\s+/g," ").trim().slice(0,30);if(!me){toast("Enter your rank and last name.");return}
    S.myName=me;if(S.link)S.link.me=me;const f=S.feeds.find(x=>x.hub&&!x.lk);if(f){f.me=me;fdMeHash(f)}save();closeSheet();render();linkPush(true);toast("Saved")}});
every(8000,()=>{if(S.link&&S.link.rk2&&!S.link.pulled)rosterPull()},"roster-first");
const mainFeed=()=>S.feeds.find(f=>f.lk&&f.main)||S.feeds.find(f=>f.lk)||null;
function secKey(sec){const B=S.board;B.sk=B.sk||{};if(!B.sk[sec]){B.sk[sec]=b64url(crypto.getRandomValues(new Uint8Array(32)));B.rsig={};setTimeout(save,0)}return B.sk[sec]}
const lsigOf=ms=>sigF(ms.map(m=>[m.id,m.status,dutyOf(m),m.start||"",m.end||"",m.loc||"",m.detail||"",m.due||{}]));
const RPF=["id","rank","name","sec","status","duty","phone","detail","loc","start","end","parent","due","sub"];
function sanDue(o){const r={};if(!o||typeof o!=="object")return r;for(const [k,v] of Object.entries(o).slice(0,40)){if(!v||typeof v!=="object")continue;r[String(k).slice(0,40)]={due:String(v.due||"").slice(0,10),done:String(v.done||"").slice(0,10)};if(v.ack)r[String(k).slice(0,40)].ack=String(v.ack).slice(0,10)}return r}
function coFeedDown(){const L=S.link;if(!L||!L.whole)return null;const f=S.feeds.find(x=>x.hub&&!x.lk);return f?{id:f.id,mk:f.mk,ek:f.ek,unit:f.unit,sec:L.sec}:null}
function joinCoFeed(C,me,mid){if(!C||!C.id||S.feeds.some(f=>f.id===C.id))return false;const nf={id:String(C.id).slice(0,20),mk:String(C.mk).slice(0,40),ek:String(C.ek).slice(0,60),unit:String(C.unit||"Company").slice(0,30),me:String(me||"").slice(0,30),sec:String(C.sec||"").slice(0,6),secsLink:[String(C.sec||"")],posts:[],seen:0,mine:{},hub2:1};if(mid)nf.mid=String(mid).slice(0,40);
  S.feeds=S.feeds.filter(f=>!f.hub2||f.lk);S.feeds.push(nf);fdMeHash(nf).then(()=>{fdPollAll(true);if(typeof fdPushAttach==="function")fdPushAttach(nf)});return true}
function rpSchedule(){if(!S.board||!S.board.sk||S.role==="view")return;clearTimeout(rpT);rpT=setTimeout(rpPublish,4000)}
async function rpPublish(force){const B=S.board;if(!B||!B.sk||rpBusy||S.role==="view")return;rpBusy=true;
  try{const f=mainFeed();const feed=f&&f.pk?{id:f.id,mk:f.mk,ek:f.ek,pk:f.pk,unit:f.unit}:null;B.rsig=B.rsig||{};let n=0;
    for(const [sec,k] of Object.entries(B.sk)){const ms=S.roster.filter(m=>m.sec===sec).map(m=>{const o={};for(const x of RPF)if(m[x]!=null&&m[x]!=="")o[x]=x==="duty"?dutyOf(m):m[x];o.duty=dutyOf(m);return o});
      const body0={v:1,lvl:S.level==="co"?"co":"plt",unit:unitName(),sec,secName:((SECTIONS.find(x=>x[0]===sec)||[])[1]||sec),secs:SECTIONS.map(x=>x[0]),sl:SECTIONS.map(x=>x.slice()),mode:S.mode||"military",ri:readyItems().map(it=>({n:it.n,mo:it.mo||0})),acks:secAcks(sec),cofeed:coFeedDown(),ms,feed};const sg=sigF(body0);B.rat=B.rat||{};
      if(!force&&B.rsig[sec]===sg&&Date.now()-(B.rat[sec]||0)<6*3600000)continue;const body=Object.assign({hb:Date.now()},body0);
      if(S.source==="sample")continue;
      await SB.rpc("put_roster",{p_board:B.id,p_read_key:B.rk,p_sec:sec,p_ct:await fdEnc(k,body)});B.rsig[sec]=sg;B.rat[sec]=Date.now();n++}
    if(n||B.rerr){B.rerr="";rawSave()}}
  catch(e){const t=String(e.message||e);B.rerr=/could not find|schema cache|404/i.test(t)?"Server needs setup part 11a.":t.slice(0,80);rawSave()}
  finally{rpBusy=false}}
async function ensureHub(){if(hubBusy||S.role==="view"||!S.board)return;hubBusy=true;let ch=false;
  try{let f=mainFeed();if(f&&S.level==="co"&&f.unit!==coFeedName()){f.unit=coFeedName();ch=true}if(!f){await fdCreate();f=mainFeed();f.main=true;ch=true;toast("Started your unit Feed. Leaders and Marines land in it from their links.")}
    if(!f.pk){const pk=rndId(32);await SB.rpc("set_feed_poster",{p_feed:f.id,p_leader_key:f.lk,p_poster_key:pk});f.pk=pk;f.main=true;ch=true}
    S.hubErr="";if(ch){save();rpPublish(true);mpSchedule()}}
  catch(e){const t=String(e.message||e);S.hubErr=/could not find|schema cache|404/i.test(t)?"Server needs setup part 11b.":t.slice(0,80);rawSave()}
  finally{hubBusy=false}}
function accLink(r){return PUB()+"#sync="+normCode(S.sync.code)+"&r="+r+((S.wsCur||"plt")==="co"?"&w=co":"")}
function accessHTML(){if(!isOwner())return"";const R=[["view","View only","Sees everything, changes nothing"],["sncoic","Can edit","Updates statuses, posts, runs musters"],["co","Same as me","Full OIC rights on their phone"]];
  if(!S.sync||!S.sync.on)return `<div class="panel" style="margin:10px 0 0"><b>Give someone access</b><p class="note">Send a link that puts your whole board on their phone: roster, Feed, Activity, live sections. Pick view only, can edit, or same rights as you.</p><button class="btn" id="accOn">Set up access links</button></div>`;
  return `<div class="panel" style="margin:10px 0 0"><b>Give someone access</b><p class="note">They open the link and get your board, kept in sync with your phone. Keep these links private.</p>${R.map(([r,l,d])=>`<div class="rrow" style="--sc:var(--line)"><div class="who"><b>${l}</b><div class="ph">${d}</div></div><div class="row2"><a class="btn alt" href="${esc("sms:?&body="+encodeURIComponent(unitName()+" · Accounted For: open this to get my board on your phone ("+ROLE_N[r]+"). Keep it private: "+accLink(r)+" · iPhone: open in Safari, then Share → Add to Home Screen so alerts work."))}">Text link</a><button class="btn alt" data-acccopy="${r}">Copy</button></div></div>`).join("")}
    <button class="btn warn" id="accReset" style="width:100%">${armed==="accreset"?"Tap again: cut off every phone I shared with":"Cut off everyone I shared with"}</button><p class="note">Makes new links. Old links and linked phones stop syncing; resend new links to the people you keep.</p></div>`}
document.addEventListener("click",e=>{if(e.target.id==="accOn"){if(!isOwner())return denyMsg();const code=newCode();S.sync={on:true,code,ver:0,at:0,err:"",last:""};save();e.target.disabled=true;e.target.textContent="Setting up…";syncPush(true).then(()=>{if(S.sync&&S.sync.err)toast("Couldn't set up: "+S.sync.err);else toast("Access links ready");render()});return}
  if(e.target.id==="accReset"){if(!isOwner())return denyMsg();if(armed!=="accreset"){armed="accreset";render();return}armed=null;e.target.disabled=true;e.target.textContent="Making new links…";
    (async()=>{const old=S.sync.code;const code=newCode();const K=await codeKeys(code);const v=await SB.rpc("backup_put",{p_id:K.id,p_key:K.wk,p_ct:await sealObj(K,syncObj()),p_base:null});
      const OK=await codeKeys(old);await SB.rpc("backup_delete",{p_id:OK.id,p_key:OK.wk}).catch(()=>{});S.sync={on:true,code,ver:+v,at:Date.now(),err:"",last:sig(syncObj())};setBase(syncObj());save();render();toast("Everyone cut off. New links ready.")})().catch(err=>{toast("Couldn't reset: "+String(err.message||err).slice(0,60));render()});return}
  const ac=e.target.closest("[data-acccopy]");if(ac){const u=accLink(ac.dataset.acccopy);try{navigator.clipboard.writeText(u).then(()=>toast(ROLE_N[ac.dataset.acccopy]+" link copied"),()=>toast(u))}catch(err){toast(u)}return}});
function hubHTML(){const f=mainFeed();const B=S.board;const err=S.source==="sample"?"Leaders can't get your roster: this phone is on sample Marines. Load your roster in DATA first.":(S.hubErr||(B&&B.rerr)||"");
  const lp=f?(f.posts||[]).filter(p=>p.sl&&Date.now()-p.t<7*86400000).length:0;const mp=S.roster.filter(m=>m.pk).length;
  return `<div class="panel" style="margin:10px 0 0"><b>Your hub</b><div class="note">${err?`<span style="color:var(--warn)">${esc(err)} DATA → System check.</span>`:f&&f.pk?`● One Feed for the unit: <b>${esc(f.unit)}</b>. Section leaders post to it from their link; Marines with My page land in it. You see every post${lp?` · ${lp} from section leaders this week`:""}.${mp?` · ${mp} My page${mp>1?"s":""} on`:""}`:"Setting up your unit Feed…"}</div><div class="row2">${f?`<button class="btn alt" data-go="feed">Open Feed</button>`:""}<button class="btn alt" data-go="act">Activity${actNew()?" · "+actNew()+" new":""}</button></div><button class="btn alt" id="hubMode" style="width:100%">${S.hubMode?"■ Turn off hub mode on this device":"⚡ Make this device the always-on hub"}</button>${S.hubMode?`<p class="note">Hub mode: screen stays on and everything refreshes every 2 min. Leave it plugged in with the app open.</p>`:""}${f&&f.pk&&pushOK()&&!f.oicPush?`<button class="btn alt" id="hubPush" style="width:100%">🔔 Buzz my phone for leader posts, requests and problems</button>`:f&&f.oicPush?`<p class="note" style="color:var(--s-onhand);font-weight:700">🔔 Alerts on: Feed posts${f.oicAlert?", requests and problems":""}</p>${f.oicAlert?"":`<button class="btn alt" id="hubPush" style="width:100%">Add alerts for requests and problems</button>`}`:""}</div>`}
async function rosterPull(force){const L=S.link;if(!L||!L.rk2||rpullBusy)return;rpullBusy=true;
  try{const rows=await SB.rpc("get_roster",{p_board:L.board,p_write_key:L.wk,p_sec:L.sec});const r=rows&&rows[0];
    if(!r){L.perr="Your OIC's board hasn't shared "+L.sec+" yet. It loads when they open the app.";rawSave();return}
    const t=Date.parse(r.updated_at)||0;if(!force&&L.pulled&&t<=(L.pt||0)){if(L.perr){L.perr="";rawSave()}return}
    const o=await fdDec(L.rk2,r.ct);if(!o||!Array.isArray(o.ms)){L.perr="Couldn't open the roster. Ask your OIC for a new link.";rawSave();return}
    const whole=o.lvl==="co";L.whole=whole;
    const cur=whole?S.roster.slice():S.roster.filter(m=>m.sec===L.mysec);const dirty=L.pulled&&lsigOf(cur)!==(L.lsig||"");const takeSt=!dirty&&t>(L.sent||0);
    const byId={},byN={};cur.forEach(m=>{byId[m.uid||m.id]=m;const k=fullK(m);byN[k]=byN[k]?"dup":m});
    const own=whole&&(L.own||(L.own===undefined&&S.source!=="sample"&&S.source!=="link"&&S.roster.length>0));
    let next;if(own){L.own=true;if(!S.preLink)S.preLink={t:Date.now(),roster:JSON.parse(JSON.stringify(S.roster)),secs:S.secs?JSON.parse(JSON.stringify(S.secs)):null,source:S.source};
      L.prev=L.prev||{};const first=!L.pulled;const chg=[];
      for(const x of o.ms.slice(0,600)){const k=fullK({name:String(x.name||"")});const m=byId[x.id]||(byN[k]&&byN[k]!=="dup"?byN[k]:null);if(!m)continue;m.uid=String(x.id);
        const now=(x.status||"On Hand")+"|"+(x.duty||"Full Duty");const pv=L.prev[x.id];
        if(!first&&pv&&pv!==now&&!dirty&&STATUSES.includes(x.status)&&(m.status!==x.status||dutyOf(m)!==(x.duty||"Full Duty"))){m.status=x.status;if(x.duty)m.duty=x.duty;chg.push(m.rank+" "+lastOf(m))}
        L.prev[x.id]=now}
      if(chg.length)actAdd("↓",(L.unit||"Company")+" changed: "+chg.slice(0,6).join(", "),"board");next=S.roster}
    else next=o.ms.slice(0,600).map(x=>{const m={};for(const k of RPF)if(k!=="due"&&x[k]!=null)m[k]=String(x[k]).slice(0,120);if(x.due)m.due=sanDue(x.due);const ouid=m.id;m.uid=ouid;m.sec=whole?(/^[A-Z0-9]{1,6}$/.test(m.sub||"")?m.sub:"HQ"):L.mysec;if(whole)delete m.sub;if(!STATUSES.includes(m.status))m.status="On Hand";
      const old=byId[ouid]||(whole&&byN[fullK(m)]&&byN[fullK(m)]!=="dup"?byN[fullK(m)]:null);if(old){m.id=old.id;if(whole&&!takeSt&&old.sec)m.sec=old.sec;for(const k of Object.keys(old))if(!(k in m)&&!RPF.includes(k))m[k]=old[k];if(!takeSt){m.status=old.status;m.duty=dutyOf(old);for(const k of ["start","end","loc","detail","due"]){if(old[k])m[k]=old[k];else delete m[k]}}}return m});
    if(!own&&(S.source==="sample"||(whole&&S.source!=="link"))){S.roster=[];S.source="link";S.loadedAt=dtg(new Date())}
    if(whole&&!own){const codes=[...new Set(next.map(m=>m.sec).filter(c=>c!=="ATT"))];const nm={};MIL_SECS.concat(SECTIONS).forEach(x=>{nm[x[0]]=nm[x[0]]||x[1]});
      const ord=MIL_SECS.map(x=>x[0]);codes.sort((a,b)=>(ord.indexOf(a)<0?99:ord.indexOf(a))-(ord.indexOf(b)<0?99:ord.indexOf(b)));const nw=(codes.length?codes:["HQ"]).slice(0,10).map(c=>[c,nm[c]||c]);
      if(JSON.stringify(nw)!==JSON.stringify(SECTIONS)){SECTIONS.splice(0,SECTIONS.length,...nw);S.secs=nw}}
    if(S.source==="link"&&Array.isArray(o.ri)&&o.ri.length){const k=MODES[S.mode]?S.mode:"military";S.ready[k]=o.ri.slice(0,40).map(x=>({n:String(x.n).slice(0,40),mo:+x.mo||0}))}
    L.acks=Array.isArray(o.acks)?o.acks.slice(0,30):[];
    if(o.cofeed&&joinCoFeed(o.cofeed,L.me||S.myName,""))toast("You're in the "+o.cofeed.unit+" Feed too");
    if(!whole&&S.source==="link"&&Array.isArray(o.sl)&&o.sl.length&&o.sl.every(x=>Array.isArray(x)&&x[0])){const nw=o.sl.slice(0,10).map(x=>[String(x[0]).replace(/[^A-Z0-9]/g,"").slice(0,6),String(x[1]||x[0]).slice(0,30)]);if(JSON.stringify(nw)!==JSON.stringify(SECTIONS)){SECTIONS.splice(0,SECTIONS.length,...nw);S.secs=nw}}
    if(!own)S.roster=whole?next:S.roster.filter(m=>m.sec!==L.mysec).concat(next);
    L.unit=String(o.unit||L.unit).slice(0,24);L.pt=t;if(o.hb)L.hb=+o.hb||0;L.pulled=true;L.perr="";L.lsig=lsigOf(next);
    if(takeSt&&!own){try{const items=await itemsFor(L.board,next);L.sig=next.length+"|"+items.join(",")}catch(e){}}
    if(own)setTimeout(()=>linkPush(),1500);
    if(o.feed&&o.feed.id){const F=o.feed;const own=S.feeds.find(f=>f.id===F.id);
      if(!own){S.feeds=S.feeds.filter(f=>!f.hub||f.lk);const nf={id:String(F.id).slice(0,20),mk:String(F.mk).slice(0,40),ek:String(F.ek).slice(0,60),pk:String(F.pk||"").slice(0,40),unit:String(F.unit||L.unit).slice(0,24),me:L.me,sec:L.sec,secsLink:(o.secs||[]).slice(0,12),posts:[],seen:0,mine:{},hub:1};S.feeds.push(nf);fdMeHash(nf).then(()=>fdPollAll(true));toast("You're in the "+nf.unit+" Feed")}
      else if(!own.lk){own.pk=String(F.pk||"").slice(0,40);own.hub=1;if(!own.sec)own.sec=L.sec}}
    save();if(["live","board","feed"].includes(view)||view===(L.mysec||"").toLowerCase()){const a=document.activeElement&&document.activeElement.tagName;if(a!=="INPUT"&&a!=="TEXTAREA"&&a!=="SELECT"){const y=window.scrollY;render();window.scrollTo(0,y)}}
    if(dirty)linkSchedule()}
  catch(e){const t=String(e.message||e);L.perr=/link not valid/i.test(t)?"This link was replaced by your OIC. Ask them for the new one.":/could not find|schema cache|404/i.test(t)?"Your OIC's server needs setup part 11a.":/fetch|network/i.test(t)?"No signal. Retrying.":t.slice(0,80);rawSave()}
  finally{rpullBusy=false}}
every(30000,()=>{if(S.link&&S.link.rk2&&S.link.pulled)rosterPull();if(S.board)ensureHub()},"roster");
setTimeout(()=>{if(S.board){ensureHub();rpSchedule()}if(S.link&&S.link.rk2)rosterPull()},2500);
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&S.link&&S.link.rk2)rosterPull()});

/* ---------- ASK: OIC controls + status ---------- */
let akCtl=null,akCtlBusy=false,akCtlErr="",akShowKey=false;
const akHidden=()=>!!(S.askSt&&S.askSt.on===false);
async function akStatus(force){if(!force&&S.askSt&&Date.now()-S.askSt.t<6*3600000)return;try{const r=await fetch(SB.url+"/functions/v1/"+SB.afn,{method:"POST",headers:{apikey:SB.key,"Content-Type":"application/json"},body:JSON.stringify({ping:1})});
  if(r.status===404){S.askSt={on:false,setup:false,t:Date.now()}}else{const o=await r.json();S.askSt={on:o.on!==false&&!!o.key,who:o.who||"all",admin:!!o.admin,setup:!!o.key,t:Date.now()}}rawSave();if(["board","today","ask"].includes(view)){const y=window.scrollY;render();window.scrollTo(0,y)}}catch(e){}}
async function akManage(set){akCtlBusy=true;akCtlErr="";renderAsk();
  try{const r=await fetch(SB.url+"/functions/v1/"+SB.afn,{method:"POST",headers:{apikey:SB.key,"Content-Type":"application/json"},body:JSON.stringify({manage:1,admin:S.askAdmin,set})});const o=await r.json().catch(()=>({}));
    if(r.status===404)throw new Error("The ask function isn't deployed yet.");if(!r.ok)throw new Error(o.error||"Couldn't reach Ask controls.");akCtl=o;S.askSt={on:o.cfg.on,who:o.cfg.who,admin:true,setup:true,t:Date.now()};save();if(set)toast("Ask settings saved")}
  catch(e){akCtlErr=String(e.message||e)}finally{akCtlBusy=false;if(view==="ask")renderAsk()}}
function akCtlHTML(){if(!canEdit()||memberMode())return"";
  if(!S.askAdmin)return `<details class="panel"><summary><b>⚙ OIC controls</b> · turn Ask on/off, who can use it, limits</summary>
    <p class="note">One-time setup so your phone (and your SNCOIC's) can control Ask for the whole unit.</p><button class="btn alt" id="akKeyNew">Set up OIC controls</button></details>`;
  const keyBox=`<div class="note">1. Supabase → Edge Functions → <b>Secrets</b> → add <b>AI_ADMIN_KEY</b> with this value:</div><div style="font-family:ui-monospace,Menlo,monospace;font-weight:800;word-break:break-all;padding:8px;border:2px dashed var(--brass);border-radius:10px" data-noxl>${esc(S.askAdmin)}</div>
    <div class="row2"><button class="btn alt" id="akKeyCopy">Copy key</button><button class="btn alt" data-scf="10b_ask_controls">Copy SQL part 10b</button></div><div class="note">2. Run SQL part 10b in SQL Editor. 3. Tap Connect.</div>`;
  if(!akCtl)return `<div class="panel"><b>⚙ OIC controls</b>${keyBox}<button class="btn" id="akConnect"${akCtlBusy?" disabled":""}>${akCtlBusy?"Connecting…":"Connect"}</button>${akCtlErr?`<div class="note" style="color:var(--warn);font-weight:700">${esc(akCtlErr)}</div>`:""}</div>`;
  const c=akCtl.cfg,d=akCtl.defaults;const U=akCtl.usage||[];const tdy=(U.find(x=>x.day===dkey())||{}).n||0;const wk=U.reduce((a,x)=>a+x.n,0);const mx=Math.max(1,...U.map(x=>x.n));
  return `<div class="panel" style="border-color:var(${c.on?"--s-onhand":"--warn"})"><div style="display:flex;justify-content:space-between;align-items:center"><b>⚙ OIC controls</b><b style="color:var(${c.on?"--s-onhand":"--warn"})">${c.on?"● ON":"○ OFF"}</b></div>
    <label class="tog"><input type="checkbox" id="akOn"${c.on?" checked":""}> Ask is on for my unit</label>
    <div class="note">Who can use it:</div><div class="evts">${[["all","Anyone with the app"],["feed","Only people in my Feed"],["leaders","Leaders only (OIC/SNCOIC phones)"]].map(([k,l])=>`<button data-akwho="${k}" aria-pressed="${c.who===k}">${l}</button>`).join("")}</div>
    ${c.who==="feed"&&!S.feeds.some(f=>f.lk)?`<p class="note" style="color:var(--warn)">You don't have a Feed yet, so no one but leaders could ask. Start one in Feed.</p>`:""}
    <div class="row2"><div><label for="akCap">Unit limit / day</label><input type="number" id="akCap" min="1" max="5000" value="${c.cap??d.cap}" style="width:100%;padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)"></div><div><label for="akPer">Per phone / day</label><input type="number" id="akPer" min="1" max="500" value="${c.per??d.per}" style="width:100%;padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)"></div></div>
    <button class="btn" id="akSave"${akCtlBusy?" disabled":""}>${akCtlBusy?"Saving…":"Save settings"}</button>${akCtlErr?`<div class="note" style="color:var(--warn);font-weight:700">${esc(akCtlErr)}</div>`:""}
    <div class="note"><b>Usage:</b> today ${tdy} / ${c.cap??d.cap} · last 7 days ${wk} questions · about $${(wk*0.05).toFixed(2)} (rough estimate; exact spend is in the Anthropic Console)</div>
    ${U.length?`<div style="display:flex;gap:4px;align-items:flex-end;height:46px">${U.map(x=>`<div title="${esc(x.day)}: ${x.n}" style="flex:1;background:var(--s-aob);height:${Math.max(3,Math.round(44*x.n/mx))}px;border-radius:3px"></div>`).join("")}</div>`:""}
    <details><summary class="note">OIC key</summary>${keyBox}<button class="btn warn" id="akKeyReset">${armed==="akreset"?"Tap again: make a new key (update the secret too)":"Make a new key"}</button></details></div>`}

/* ---------- ASK: questions about orders, admin and anything military ---------- */
let akBusy=false,akDraft="",akErr="";
const AK_EX={military:["How many days of leave can I carry over at the end of the fiscal year?","What are the PFT pull-up and run standards for a male Marine age 22?","What's the process for requesting special liberty?","What does the leave order say about leave en route on PCS?","How do I start a Tuition Assistance request?"],
 police:["What are OSHA rules for bloodborne pathogen exposure on duty?","What does FLSA say about overtime for officers?"],
 jobs:["When is fall protection required on a job site?","How often do forklift operators need re-evaluation?"],
 hr:["What does FMLA cover and who qualifies?","How long must I keep I-9 forms?"],
 civilian:["What should be in a group emergency kit?","How do I plan a safe outdoor event in heat?"]};AK_EX.custom=AK_EX.civilian;
function akPII(q){if(/\b\d{3}-\d{2}-\d{4}\b/.test(q))return "That looks like a Social Security number.";if(/\b\d{9,10}\b/.test(q))return "That looks like an ID number (SSN or EDIPI).";
  if((q.match(PH_RE)||[]).length)return "That looks like a phone number.";if(/@[a-z0-9.-]+\.[a-z]{2,}/i.test(q))return "That looks like an email address.";
  if(S.source!=="sample"){const U=" "+q.toUpperCase().replace(/[^A-Z]/g," ")+" ";for(const m of S.roster){const l=lastOf(m);if(l.length>=4&&U.includes(" "+l+" ")&&!["SMITH","JONES","BROWN"].includes(l)&&!/^(LEAVE|DUTY|ORDER|RANGE|MARINE)$/.test(l))return "It includes a name from your roster ("+l+")."}}return ""}
function akFmt(t){return esc(t).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/^\s*[-•*]\s+/gm,"• ").replace(/\n/g,"<br>")}
async function akSend(q){akBusy=true;akErr="";renderAsk();
  const hist=S.ask.slice(0,2).reverse().map(x=>({q:x.q,a:x.a}));const ac=new AbortController();const tm=setTimeout(()=>ac.abort(),75000);
  try{const r=await fetch(SB.url+"/functions/v1/"+SB.afn,{method:"POST",headers:{apikey:SB.key,"Content-Type":"application/json"},body:JSON.stringify(Object.assign({q,dev:(S.dev=S.dev||rndId(24)),mode:MODES[S.mode]?S.mode:"military",hist},(()=>{const f=S.feeds.find(f=>!f.lk);return f?{feed:f.id,mk:f.mk}:{}})(),S.askAdmin&&canEdit()?{admin:S.askAdmin}:{})),signal:ac.signal});
    let o={};try{o=await r.json()}catch(e){}
    if(r.status===404)throw new Error("Ask isn't set up on your server yet. Leader: DATA → System check.");
    if((r.status===401||r.status===403)&&!o.error)throw new Error("Ask is set up but JWT checking is on. Leader: turn off Enforce JWT verification for the ask function.");
    if(o.off){S.askSt=Object.assign({},S.askSt,{t:0});setTimeout(()=>akStatus(true),100)}
    if(!r.ok||o.error)throw new Error(o.error||"Something went wrong. Try again.");
    S.ask.unshift({q,a:String(o.answer||""),src:Array.isArray(o.sources)?o.sources.slice(0,6):[],t:Date.now()});S.ask=S.ask.slice(0,30);akDraft="";save()}
  catch(e){akErr=e.name==="AbortError"?"That took too long. Try again or shorten the question.":String(e.message||e)}
  finally{clearTimeout(tm);akBusy=false;if(view==="ask"){renderAsk();window.scrollTo(0,0)}}}
function renderAsk(){const ex=AK_EX[MODES[S.mode]?S.mode:"military"]||AK_EX.military;akStatus();
  if(akHidden()&&!(canEdit()&&!memberMode())){$("#main").innerHTML=`<h2>💬 Ask</h2><div class="panel"><p class="note">${S.askSt&&S.askSt.setup===false?"Ask isn't set up for your unit.":"Ask is turned off by your leader."}</p></div>`;return}
  let h=akCtlHTML()+`<h2>💬 Ask</h2><div class="panel"><label for="akQ">Ask about orders, admin, leave, pay, fitness, anything ${S.mode&&S.mode!=="military"?"for your team":"military"}</label>
    <textarea id="akQ" maxlength="600" style="min-height:80px" placeholder="${esc(ex[0])}"${akBusy?" disabled":""}>${esc(akDraft)}</textarea>
    <button class="btn" id="akGo"${akBusy?" disabled":""}>${akBusy?"Searching official sources…":"Ask"}</button>
    ${akErr?`<div class="note" style="color:var(--warn);font-weight:700">${esc(akErr)}</div>`:""}
    <p class="note">Searches official sources (.mil and .gov) and shows them. <b>Answers can be wrong or out of date: check the order or your admin shop before acting.</b> Don't type names, SSNs, phone numbers or anything sensitive or classified. Not official guidance.</p></div>`;
  if(!S.ask.length)h+=`<h2>Try</h2><div class="alist">${ex.map(x=>`<button class="rrow" data-akex="${esc(x)}" style="text-align:left;cursor:pointer">${esc(x)}</button>`).join("")}</div>`;
  h+=S.ask.map((x,i)=>`<div class="panel"><div class="note"><b>You</b> · ${ago(x.t)}</div><div style="font-weight:700">${esc(x.q)}</div>
    <div style="line-height:1.5">${akFmt(x.a)}</div>
    ${x.src.length?`<div class="note"><b>Sources</b>${x.src.map(s2=>`<div>• <a href="${esc(s2.url)}" target="_blank" rel="noopener">${esc(s2.title||s2.url)}</a></div>`).join("")}</div>`:`<div class="note" style="color:var(--s-duty)">No official source was cited for this answer. Verify it.</div>`}
    <div class="row2"><button class="btn alt" data-akcopy="${i}">Copy</button>${navigator.share?`<button class="btn alt" data-akshare="${i}">Share</button>`:`<button class="btn alt" data-akdel="${i}">Remove</button>`}</div></div>`).join("");
  if(S.ask.length)h+=`<button class="btn alt" id="akClear" style="width:100%;margin-top:8px">${armed==="akclr"?"Tap again to clear your questions":"Clear my questions"}</button><p class="note">Your questions stay on this phone only.</p>`;
  $("#main").innerHTML=h}
function akText(x){return "Q: "+x.q+"\n\n"+x.a+(x.src.length?"\n\nSources:\n"+x.src.map(s2=>"- "+(s2.title||"")+" "+s2.url).join("\n"):"")+"\n\n(Answer from Accounted For Ask. Verify with the current order.)"}

/* ---------- Design A: shell (tab bar, sub-nav), Home, People, Tools ---------- */
const IC={home:'<path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',feed:'<path d="M4 4h16v12H8l-4 4z"/><path d="M8 9h8M8 12h5"/>',people:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 20a6.5 6.5 0 0 0-3-5.5"/>',plan:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',tools:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
 muster:'<path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>',recall:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',send:'<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>',ask:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5"/>',
 alert:'<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',text:'<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.9-.9L3 21l1.9-5.1A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/>',rollup:'<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',live:'<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19.1 4.9a10 10 0 0 1 0 14.2M4.9 19.1a10 10 0 0 1 0-14.2"/>',armory:'<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/>',events:'<path d="M8 2v4M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M9 15l2 2 4-4"/>',pt:'<circle cx="13" cy="4" r="2"/><path d="M4 22l5-6 3 2 2-5 4 3M9 9l3-2 3 3 3 1"/>',w6:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/>',
 cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',duty:'<path d="M4 22V4a1 1 0 0 1 1-1h12l-2 4 2 4H5"/>',ready:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',trends:'<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',log:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',me:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',today:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
 data:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',sys:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',help:'<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',ver:'<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',chev:'<path d="M9 6l6 6-6 6"/>'};
const svg=(k,sz)=>`<svg width="${sz||22}" height="${sz||22}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k]||""}</svg>`;
const PLAN_V=["cal","duty","ready","events"],FEED_V=["feed","send"];let lastPlan="cal",lastFeed="feed";
function secViews(){return SECTIONS.map(x=>x[0].toLowerCase()).concat("att")}
function tabOf(v){if(memberMode()){if(["today"].includes(v))return "today";if(v==="feed")return "feed";if(v==="me")return "me";if(v==="log")return "log";if(v==="ask")return "ask";return "today"}
  if(v==="board"||v==="today")return "home";if(FEED_V.includes(v))return "feed";if(PLAN_V.includes(v))return "plan";if(v==="people"||v==="p"||v==="live"||v==="pt"||secViews().includes(v))return "people";return "tools"}
function tabsList(){if(memberMode()){const t=[["today","Today","today"],["feed","Feed","feed"]];if(S.me)t.push(["me","My page","me"]);t.push(["log","My log","log"]);if(!akHidden())t.push(["ask","Ask","ask"]);return t}
  return [["home","Home","home"],["feed","Feed","feed"],["people","People","people"],["plan","Plan","plan"],["tools","Tools","tools"]]}
function tabBadge(k){if(k==="feed"){const n=fdUnread()+reqPending().length;return n}if(k==="plan"){return upcomingConflicts(14).length}return 0}
function renderShell(){const tb=$("#tabbar .in");if(!tb)return;const cur=tabOf(view);const L=tabsList();tb.style.setProperty("--n",L.length);
  tb.innerHTML=L.map(([k,l,ic])=>{const b=tabBadge(k);return `<button data-tab="${k}"${cur===k?' aria-current="page"':""}>${svg(ic,24)}${esc(l)}${b?`<span class="bd">${b>9?"9+":b}</span>`:""}</button>`}).join("");
  const sn=$("#subnav");if(!sn)return;let items=[];const t=tabOf(view);
  if(!memberMode()){if(t==="plan")items=[["cal","Calendar"],["duty","Duty"],["ready","Readiness"],["events","Events"]];
    else if(t==="feed")items=[["feed","Feed"],["send","Send"]];
    else if(t==="people")items=[["people","All"]].concat(SECTIONS.map(([k])=>[k.toLowerCase(),k]),[["att","ATT"],["live","Live"],["pt","PT"]])}
  sn.innerHTML=items.map(([v,l])=>`<button data-go="${v}"${view===v?' aria-current="page"':""}>${esc(l)}</button>`).join("");
  if(PLAN_V.includes(view))lastPlan=view;if(FEED_V.includes(view))lastFeed=view;
  {const tp=document.querySelector(".top");if(tp)document.documentElement.style.setProperty("--hdr",tp.offsetHeight+"px")}}
document.addEventListener("click",e=>{const t=e.target.closest("[data-tab]");if(t){const k=t.dataset.tab;const map={home:"board",feed:lastFeed,people:"people",plan:lastPlan,tools:"tools",today:"today",me:"me",log:"log",ask:"ask"};
    const nv=map[k]||"board";if(tabOf(view)===k&&view!==nv&&["home","people","tools","plan","feed"].includes(k)){view=k==="plan"?"cal":k==="feed"?"feed":nv}else view=nv;armed=null;query="";if(view==="feed")fdLimit=20;render();window.scrollTo(0,0);if(view==="feed")fdPollAll(true);return}
  if(e.target.closest("#hSearch")){view=memberMode()?"today":"people";armed=null;render();window.scrollTo(0,0);setTimeout(()=>{const q=$("#gq");if(q)q.focus()},60);return}
  if(e.target.closest("#hRef")){refreshAll();return}
  if(e.target.closest("#hHelp")){const hb=$("#helpBtn");if(hb)hb.click();return}
  if(e.target.closest("#hSet")){secDraft=null;view="data";armed=null;render();window.scrollTo(0,0);return}},true);
function needsYou(){const out=[];const al=alerts();
  const rq=reqPending();if(rq.length)out.push({n:rq.length,tone:"a",t:"Request"+(rq.length>1?"s":"")+" waiting",s:rq.slice(0,2).map(r=>r.ty+" · "+r.who).join(", "),go:"feed"});
  const cf=upcomingConflicts(14);if(cf.length)out.push({n:cf.length,tone:"r",t:"Conflict"+(cf.length>1?"s":"")+" next 14 days",s:cf[0].m.rank+" "+lastOf(cf[0].m)+": "+cf[0].cf[0].s+" vs "+cf[0].what,go:"alerts"});
  for(const f of S.feeds.filter(f=>f.lk)){const p=(f.posts||[]).filter(p=>Date.now()-p.t<3*86400000).sort((a,b)=>b.t-a.t)[0];if(!p)continue;const st=fdStats(f,p);const miss=st.pool-st.got;if(miss>0)out.push({n:miss,tone:"b",t:"Haven't confirmed the word",s:p.txt.split("\n")[p.pod?1:0].slice(0,60),go:"feed"})}
  if(al.over.length)out.push({n:al.over.length,tone:"r",t:"Overdue to return",s:al.over.slice(0,2).map(a=>a.m.rank+" "+lastOf(a.m)).join(", "),go:"alerts"});
  const R=readySum();if(R.items&&R.over)out.push({n:R.over,tone:"r",t:"Readiness overdue",s:R.soon+" more due in 30 days",go:"ready"});
  if(S.mus.open){const pool=musPool();out.push({n:pool.filter(m=>!S.mus.seen[m.id]).length,tone:"g",t:"Muster in progress",s:"Unaccounted · tap to finish",go:"muster"})}
  if(S.rc.open){const pool=recallPool();out.push({n:pool.filter(m=>(S.rc.res||{})[m.id]!=="ok").length,tone:"g",t:"Recall in progress",s:"Not yet contacted",go:"recall"})}
  const b=bcActive();if(b){const st=bcStats(b);if(st.pool-st.got>0)out.push({n:st.pool-st.got,tone:"b",t:"Message not confirmed",s:b.msg.slice(0,60),go:"send"})}
  if(S.board){const old=SECTIONS.filter(([k])=>{const r=S.board.last[k];return !r||Date.now()-r.t>4*3600000});if(old.length)out.push({n:old.length,tone:"a",t:"Section numbers old or missing",s:old.map(x=>x[0]).join(", "),go:"live"})}
  if(S.mpErr&&S.roster.some(m=>m.pk))out.push({n:"!",tone:"r",t:"My pages aren't updating",s:"Run setup part 07 in System check",go:"sys"});
  const rs=rollStale();if(rs.length)out.push({n:rs.length,tone:"a",t:"Rollup reports over 12 h old",s:rs.map(u=>u.name).join(", "),go:"rollup"});
  if(al.ret.length)out.push({n:al.ret.length,tone:"g",t:"Returning this week",s:al.ret.slice(0,2).map(a=>a.m.rank+" "+lastOf(a.m)+" "+a.why.split(" ").pop()).join(", "),go:"alerts"});
  return out}
function renderBoard(){const {c,T,A}=counts();const P=pct(T["On Hand"],T.total);const hr=new Date().getHours();const d0=today0();
  let h=banner()+fdDueHTML();const actH=((S.board||S.feeds.some(f=>f.lk))&&S.source!=="sample"?healthCard():"")+((S.board||S.feeds.some(f=>f.lk))?actCard():"");
  const who=(S.postAs||S.myName||"").trim();
  h+=`<div style="margin-top:14px"><div class="hm-k">${DOW[d0.getDay()]} ${short(d0)} · ${esc(unitName())}</div><div class="hm-h">Good ${hr<12?"morning":hr<17?"afternoon":"evening"}${who?", "+esc(who.split(" ").slice(-1)[0].charAt(0)+who.split(" ").slice(-1)[0].slice(1).toLowerCase()):""}</div></div>`;
  h+=`<div class="card hero"><div style="display:flex;justify-content:space-between;align-items:baseline"><span class="lbl">ON HAND</span><span style="font-size:12px;font-weight:700;color:var(--s-onhand)">${S.board?"● Live sections":S.loadedAt?"Roster "+esc(S.loadedAt):""}</span></div>
    <div style="display:flex;align-items:baseline;gap:8px"><span class="big" data-n="oh">${T["On Hand"]}</span><span style="font-size:20px;font-weight:700;color:var(--muted)">/ ${T.total}</span><span style="margin-left:auto;font-size:15px;font-weight:800;color:var(--s-onhand)">${P}%</span></div>
    <div class="hbar"><i style="width:${P}%"></i></div>
    <div class="note" style="margin:0">Present ${present(T)} · Off deck ${T.total-present(T)}${(()=>{const d=dutyCounts(S.roster.filter(m=>m.sec!=="ATT"));return (d["Light Duty"]?" · Light duty "+d["Light Duty"]:"")+(d.LIMDU?" · LIMDU "+d.LIMDU:"")})()}${A.total?` · +${A.total} attached`:""}</div>
    <div class="sgrid">${SECTIONS.map(([k])=>`<button data-go="${k.toLowerCase()}" aria-label="${esc(k)} ${c[k]["On Hand"]} of ${c[k].total} on hand"><b>${esc(k)}</b><span>${c[k]["On Hand"]}/${c[k].total}</span></button>`).join("")}${A.total?`<button data-go="att"><b>ATT</b><span>+${A.total}</span></button>`:""}</div></div>`;
  const ah=akHidden();
  h+=`<div class="qa"><button data-go="muster"><span class="ic">${svg("muster",24)}${S.mus.open?'<span class="live"></span>':""}</span>Muster</button><button data-go="recall"><span class="ic">${svg("recall",24)}${S.rc.open?'<span class="live"></span>':""}</span>Recall</button><button data-go="text"><span class="ic">${svg("text",24)}</span>Send numbers</button>${ah?`<button data-go="alerts"><span class="ic">${svg("alert",24)}</span>Alerts</button>`:`<button data-go="ask"><span class="ic">${svg("ask",24)}</span>Ask</button>`}</div>`;
  h+=actH;
  const ny=needsYou();
  h+=`<div class="sech"><h2>Needs you</h2>${ny.length?`<span class="note" style="margin:0">${ny.length}</span>`:""}</div>`;
  h+=ny.length?`<div class="card ny">${ny.map(x=>`<button data-go="${x.go}"><span class="n tone-${x.tone}">${x.n}</span><span style="flex:1;min-width:0"><span class="t" style="display:block">${esc(x.t)}</span><span class="s" style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.s)}</span></span>${svg("chev",18)}</button>`).join("")}</div>`
    :`<div class="card" style="align-items:center;text-align:center"><b style="color:var(--s-onhand)">✓ Nothing needs you right now</b></div>`;
  const k=dkey();const cards=[];
  for(const r of S.duty.rosters){const id=(r.assign||{})[k];const m=id&&S.roster.find(x=>x.id===id);cards.push(`<button data-go="duty"><div class="k">DUTY</div><div class="v">${m?esc(m.rank+" "+lastOf(m)):"Open"}</div><div class="w">${esc(r.name)}</div></button>`)}
  calEntries(k,k,"ALL").filter(e=>e.ty!=="DUTY"&&e.ty!=="DUE"&&e.m).sort((a,b)=>(a.tm||"99").localeCompare(b.tm||"99")).slice(0,6).forEach(e=>cards.push(`<button data-pcard="${e.m.id}"><div class="k">${esc(e.tm||ctype(e.ty)[1].toUpperCase())}</div><div class="v">${esc(e.ti)}</div><div class="w">${esc(e.m.rank+" "+lastOf(e.m))}</div></button>`));
  for(const ev of (S.events||[]).filter(ev=>(isoOf(ev.date)||ev.date)===k))cards.push(`<button data-go="events"><div class="k">EVENT</div><div class="v">${esc(ev.name)}</div><div class="w">${evReq(ev).filter(m=>!evDone(ev,m)).length} still owe</div></button>`);
  {const R=readySum();if(R.items&&R.soon)cards.push(`<button data-go="ready"><div class="k">DUE SOON</div><div class="v">${R.soon} due-outs</div><div class="w">next 30 days</div></button>`)}
  const pod=latestPod();if(pod&&pod.d===k)cards.unshift(`<button data-go="feed"><div class="k">PLAN OF THE DAY</div><div class="v">${esc((podParse(pod.txt).f||"Posted"))}</div><div class="w">${esc(podParse(pod.txt).u||"Tap to view")}</div></button>`);
  h+=`<div class="sech"><h2>Today</h2><button class="chip" data-go="cal" style="cursor:pointer">Calendar ▸</button></div>`;
  h+=cards.length?`<div class="strip">${cards.join("")}</div>`:`<p class="note">Nothing scheduled today. <button class="chip" data-go="cal" style="cursor:pointer">+ Add to calendar</button></p>`;
  if(S.board)h+=liveStrip();
  h+=`<details class="card" style="gap:8px"><summary style="font-weight:800;cursor:pointer">Numbers by status and section</summary><div class="gridwrap"><table><thead><tr><th>Status</th>${SECTIONS.map(([k])=>`<th><button data-go="${k.toLowerCase()}">${k}</button></th>`).join("")}<th class="tot">Total</th></tr></thead><tbody>`;
  for(const st of STATUSES){h+=`<tr><td><span class="dot" style="background:var(${SVAR[st]})"></span>${SHORT[st]}</td>${SECTIONS.map(([k])=>`<td class="${c[k][st]?"":"z"}">${c[k][st]}</td>`).join("")}<td class="tot">${T[st]}</td></tr>`}
  h+=`<tr class="sum"><td>Present on deck</td>${SECTIONS.map(([k])=>`<td>${present(c[k])}</td>`).join("")}<td>${present(T)}</td></tr><tr class="sum"><td>% On hand</td>${SECTIONS.map(([k])=>`<td>${pct(c[k]["On Hand"],c[k].total)}%</td>`).join("")}<td>${P}%</td></tr></tbody></table></div>
    <div class="note">Present on deck = On Hand + Appt On Base + Co Duties.${A.total?` Attached (not on strength): ${A.total}, ${A["On Hand"]} on hand. Total accounted for ${T.total+A.total}.`:""}</div><div class="row2"><button class="btn alt" data-go="text">Send the numbers</button><button class="btn alt" data-go="trends">Trends</button></div></details>`;
  $("#main").innerHTML=h}
function renderPeople(){const {c,A}=counts();let h=banner()+(canEdit()&&isLeaderPhone()?`<button class="btn alt" data-addm="" style="width:100%;margin-top:10px">+ Add Marines</button>`:"");
  h+=`<div style="margin-top:12px"><input class="search" id="gq" type="search" placeholder="Find anyone: name, rank or section" autocomplete="off" style="margin:0"><div id="gqr" class="alist" style="margin-top:6px"></div></div>`;
  h+=`<div class="sech"><h2>Sections</h2><span class="note" style="margin:0">${S.roster.filter(m=>m.sec!=="ATT").length} people</span></div><div class="tgrid">`;
  h+=SECTIONS.map(([k,n])=>{const o=c[k];const p=pct(o["On Hand"],o.total);const away=o.total-present(o);const r=S.board&&S.board.last[k];
    return `<button class="pcard" data-go="${k.toLowerCase()}"><span style="display:flex;justify-content:space-between;width:100%"><b style="font-size:15px">${esc(k)}</b><b style="font-variant-numeric:tabular-nums">${o["On Hand"]}/${o.total}</b></span><span class="note" style="margin:0">${esc(n)}</span><span class="hbar" style="width:100%"><i style="width:${p}%"></i></span><span class="note" style="margin:0">${away} away${r?" · updated "+ago(r.t):""}</span></button>`}).join("");
  h+=`<button class="pcard" data-go="att"><span style="display:flex;justify-content:space-between;width:100%"><b style="font-size:15px">ATT</b><b>+${A.total}</b></span><span class="note" style="margin:0">Attached, not on strength</span><span class="note" style="margin:0">${A["On Hand"]} on hand</span></button></div>`;
  h+=`<div class="sech"><h2>More</h2></div><div class="tgrid">
    <button data-go="live"><span class="ic">${svg("live")}</span><span><b>Live sections</b><small>${S.board?"On · section leaders update you":"Let section leaders update you"}</small></span></button>
    <button data-go="pt"><span class="ic">${svg("pt")}</span><span><b>PT roster</b><small>Who's going, text roster</small></span></button>
    <button data-go="recall"><span class="ic">${svg("recall")}</span><span><b>Phone numbers</b><small>${S.roster.filter(m=>m.phone).length} of ${S.roster.length} loaded</small></span></button>
    <button data-go="data"><span class="ic">${svg("data")}</span><span><b>Load roster</b><small>${S.source==="sample"?"Using sample data":S.source==="link"?"From your OIC's board":"MOL list or backup"}</small></span></button></div>`;
  h+=`<div class="dutyline" style="margin-top:12px">${dutyChips(S.roster.filter(m=>m.sec!=="ATT"))}</div>`;
  $("#main").innerHTML=h}
function renderTools(){const al=alerts();const cf=upcomingConflicts(14).length;const R=readySum();const b=bcActive();
  const T=(go,ic,t,sub,cls)=>`<button data-go="${go}" class="${cls||""}"><span class="ic">${svg(ic)}</span><span><b>${esc(t)}</b><small>${sub}</small></span></button>`;
  let h=banner();
  h+=`<div class="sech"><h2>Accountability</h2></div><div class="tgrid">
    ${T("muster","muster","Muster",S.mus.open?"In progress":S.mus.last?"Last "+S.mus.last.present+"/"+S.mus.last.expected:"Formation, QR check-in",S.mus.open?"on":"")}
    ${T("recall","recall","Recall",S.rc.open?"In progress":S.roster.filter(m=>m.phone).length+" numbers loaded",S.rc.open?"on":"")}
    ${T("alerts","alert","Alerts",(cf?cf+" conflicts · ":"")+(al.over.length?al.over.length+" overdue · ":"")+al.ret.length+" returning",cf||al.over.length?"hot":"")}
    ${T("text","text","Send the numbers","Accountability report")}
    ${T("co","rollup","Company",S.level==="co"&&S.source!=="sample"?SECTIONS.length+" platoons · "+S.roster.length+" people":S.coBoard?Object.keys(S.coBoard.units||{}).length+" units live":S.coRep?"Reporting to "+esc(S.coRep.co):"Load a company roster",S.coBoard||S.coRep||S.level==="co"?"on":"")}
    ${T("rollup","rollup","Rollup",Object.keys(S.roll.units).length?Object.keys(S.roll.units).length+" units":"Add up units under you",rollStale().length?"hot":"")}
    ${T("live","live","Live sections",S.board?"On":"Off",S.board?"on":"")}
    ${T("armory","armory","Armory",S.arm.open?"Muster in progress":S.roster.filter(hasW).length+" weapons",S.arm.open?"on":"")}
    ${T("pt","pt","PT roster","Who's going")}
    ${T("w6","w6","6W report","Incident report")}</div>`;
  h+=`<div class="sech"><h2>Communicate</h2></div><div class="tgrid">
    ${T("feed","feed","Feed",reqPending().length?reqPending().length+" requests waiting":"Pass the word",reqPending().length?"hot":"")}
    ${T("send","send","Send",b?bcStats(b).got+"/"+bcStats(b).pool+" got it":"Text with read receipts",b?"on":"")}
    ${T("ask","ask","Ask",akHidden()?"Off · tap to manage":"Orders, admin, anything")}</div>`;
  h+=`<div class="sech"><h2>Plan</h2></div><div class="tgrid">
    ${T("cal","cal","Calendar",calOn(dkey()).length+" today")}
    ${T("duty","duty","Duty roster",S.duty.rosters.length?S.duty.rosters.length+" roster"+(S.duty.rosters.length>1?"s":""):"Fair rotations")}
    ${T("ready","ready","Readiness",R.items?(R.over?R.over+" overdue · ":"")+R.soon+" due 30d":"Due-outs tracker",R.over?"hot":"")}
    ${T("events","events","Events",S.events.length+" events")}
    ${T("trends","trends","Trends","Numbers over time")}</div>`;
  h+=`<div class="sech"><h2>You</h2></div><div class="tgrid">
    ${T("log","log","My log",S.log.filter(x=>x.d===dkey()).length?"Logged today":"Log today",S.log.some(x=>x.d===dkey())?"on":"")}
    ${S.me?T("me","me","My page",S.me.d?esc(S.me.d.statusShort):"Your info"):""}
    ${T("today","today","Today","Your daily screen")}</div>`;
  h+=`<div class="sech"><h2>Setup</h2></div><div class="tgrid">
    ${T("data","data","Data and settings","Roster, backup, security")}
    ${T("sys","sys","System check","Server setup status")}
    <button data-mode-open><span class="ic">${svg("ver")}</span><span><b>App version</b><small>${esc(MODE().name)}</small></span></button>
    <a href="help.html" target="_blank" rel="noopener"><span class="ic">${svg("help")}</span><span><b>Help guide</b><small>Quick-start</small></span></a></div>
    <p class="note" style="text-align:center;margin-top:14px">v${APP_VER}</p>`;
  $("#main").innerHTML=h}

/* ---------- TODAY: the member's daily home screen ---------- */
let tdLast=0;
function isLeaderPhone(){return !!(S.leaderMode||S.source!=="sample"||S.board||S.link||S.feeds.some(f=>f.lk)||S.roster.some(m=>m.pk)||(S.sync&&S.sync.on)||S.role)}
function memberMode(){return !S.leaderMode&&S.source==="sample"&&!S.board&&!S.link&&!S.feeds.some(f=>f.lk)&&(!!S.me||S.feeds.some(f=>!f.lk))}
function tdCover(e,k){return e.d<=k&&(e.end||e.d)>=k}
function renderToday(){const D=S.me&&S.me.d;const mf=S.feeds.filter(f=>!f.lk);
  if(!D&&!mf.length){$("#main").innerHTML=`<h2>Today</h2><div class="panel"><p class="note">Your daily screen fills in once your leader sends you a Feed link or your private My page link. Open the link on this phone.</p></div>`;return}
  if(Date.now()-tdLast>120000){tdLast=Date.now();if(mf.length)setTimeout(()=>fdPollAll(false),50);if(S.me)setTimeout(()=>mpFetch(),80)}
  const now=new Date(),hr=now.getHours(),k=dkey(),t2=dkey(new Date(Date.now()+86400000));const dd=parseD(k),dt=parseD(t2);
  const who=D?D.rank+" "+(D.name.split(",")[0]||""):(mf[0].me||"");
  let h=`<div style="margin-top:16px"><div class="note" style="font-weight:700;letter-spacing:.04em">${DOW[dd.getDay()]} ${short(dd)} ${dd.getFullYear()}</div><h2 style="margin:2px 0 0;font-size:26px">Good ${hr<12?"morning":hr<17?"afternoon":"evening"}${who?", "+esc(who):""}</h2></div>`;
  if(D)h+=`<div class="panel" style="border-left:5px solid var(${SVAR[D.status]||"--line"});padding:10px 14px"><div><b style="font-size:17px">${esc(D.statusShort)}</b>${D.duty!=="Full Duty"?` · <span style="color:var(--warn);font-weight:700">${esc(D.duty)}</span>`:""}${D.status!=="On Hand"&&D.end?` · back ${short(parseD(D.end))}`:""}</div></div>`;
  // the word
  const word=mf.flatMap(f=>fdVisible(f).filter(p=>!(f.mine||{})[p.id]&&Date.now()-p.t<7*86400000).map(p=>({f,p}))).sort((a,b)=>b.p.t-a.p.t);
  const pods=mf.flatMap(f=>fdVisible(f).filter(p=>p.pod).map(p=>({f,p})));const podT=pods.find(x=>x.p.pod.d===k)||(D&&D.pod&&D.pod.d===k?{p:{txt:D.pod.txt}}:null);const podN=pods.find(x=>x.p.pod.d===t2)||(D&&D.pod&&D.pod.d===t2?{p:{txt:D.pod.txt}}:null);
  const over=D?D.due.filter(x=>x.st==="over"):[];const soon=D?D.due.filter(x=>x.st==="soon"):[];
  const others=word.filter(x=>!x.p.pod);
  const att=[];if(others.length)att.push(`<b>${others.length}</b> new word to confirm`);if(over.length)att.push(`<b style="color:var(--warn)">${over.length}</b> overdue`);
  const duty=D?D.duties.filter(x=>x.d>=k):[];const dutyT=duty.find(x=>x.d===k);
  const calT=D?D.cal.filter(e=>tdCover(e,k)&&e.ty!=="DUTY"&&e.ty!=="DUE"):[];const calN=D?D.cal.filter(e=>tdCover(e,t2)&&e.d===t2&&e.ty!=="DUTY"&&e.ty!=="DUE"):[];
  if(!att.length&&!dutyT&&!calT.length)h+=`<div class="panel" style="text-align:center;border-color:var(--s-onhand)"><b style="color:var(--s-onhand);font-size:17px">✓ You're caught up</b><div class="note">Nothing new needs you right now.</div></div>`;
  else if(att.length)h+=`<div class="panel" style="border-color:var(--brass)"><div><b>Needs you:</b> ${att.join(" · ")}</div></div>`;
  const podBox=(x,lab)=>{const lines=x.p.txt.split("\n");const unconf=x.f&&!(x.f.mine||{})[x.p.id];return `<div class="panel" style="border-color:var(--brass)"><b style="color:var(--brass)">📋 ${lab}</b><div style="white-space:pre-wrap;font-weight:600;line-height:1.45">${esc(lines.slice(1).join("\n").trim())}</div>${unconf?`<div class="fdacts"><button class="go" data-tdack="${x.f.id}|${x.p.id}">✓ Got it</button><button data-go="feed">Open Feed</button></div>`:x.f?`<div class="note" style="color:var(--s-onhand);font-weight:700">✓ Confirmed</div>`:""}</div>`};
  if(podT)h+=podBox(podT,"Plan of the Day");
  // today's schedule
  const sched=[];if(dutyT)sched.push(`<div class="rrow" style="--sc:var(--s-duty)"><div class="who"><b>⚑ You have duty today</b><div class="ph">${esc(dutyT.r)}</div></div></div>`);
  calT.sort((a,b)=>(a.tm||"99").localeCompare(b.tm||"99")).forEach(e=>{const t=ctype(e.ty);sched.push(`<div class="rrow" style="--sc:var(${t[2]})"><div class="who"><b>${e.tm?esc(e.tm)+" · ":""}${esc(e.ti)}</b><div class="ph">${t[1]}${e.end&&e.end!==e.d?" · thru "+short(parseD(e.end)):""}${e.no?" · "+esc(e.no):""}</div></div></div>`)});
  if(sched.length)h+=`<h2>Today</h2><div class="alist">${sched.join("")}</div>`;
  // the word
  if(others.length)h+=`<h2>New word</h2><div class="alist">${others.slice(0,4).map(x=>`<div class="fdpost" style="--sc:var(${x.p.urg?"--warn":"--line"})"><div class="mt"><span>${x.p.urg?`<b style="color:var(--warn)">URGENT</b> · `:""}${ago(x.p.t)}</span></div><div class="tx">${esc(x.p.txt.length>220?x.p.txt.slice(0,220)+"…":x.p.txt)}</div><div class="fdacts"><button class="go" data-tdack="${x.f.id}|${x.p.id}">✓ Got it</button><button data-go="feed">Open</button></div></div>`).join("")}${others.length>4?`<button class="btn alt" data-go="feed">${others.length-4} more in Feed</button>`:""}</div>`;
  // due
  if(over.length||soon.length)h+=`<h2>Due soon</h2><div class="alist">${over.concat(soon).slice(0,5).map(x=>`<div class="rrow" style="--sc:var(${x.st==="over"?"--warn":"--s-duty"})"><div class="who"><b>${esc(x.n)}</b><div class="ph">${esc(x.txt)}</div></div></div>`).join("")}</div>`;
  // tomorrow
  const tm=[];if(duty.find(x=>x.d===t2))tm.push("⚑ Duty: "+esc(duty.find(x=>x.d===t2).r));calN.forEach(e=>tm.push((e.tm?esc(e.tm)+" · ":"")+esc(e.ti)));
  if(podN&&podN!==podT)h+=podBox(podN,"Tomorrow · "+DOW[dt.getDay()]+" "+short(dt));
  else if(tm.length)h+=`<h2>Tomorrow · ${DOW[dt.getDay()]} ${short(dt)}</h2><div class="panel">${tm.map(x=>`<div>${x}</div>`).join("")}</div>`;
  if(!dutyT&&duty[0]&&duty[0].d!==t2){const n=daysTo(duty[0].d);h+=`<p class="note" style="margin-top:10px">Next duty: <b>${esc(duty[0].r)}</b> ${DOW[parseD(duty[0].d).getDay()]} ${short(parseD(duty[0].d))} (${n} day${n===1?"":"s"})</p>`}
  // requests
  const rq=D?(D.reqs||[]).slice(0,3):[];if(rq.length)h+=`<h2>My requests</h2><div class="alist">${rq.map(r=>`<div class="rrow" style="--sc:var(${r.st==="approved"?"--s-onhand":r.st==="denied"?"--warn":"--brass"})"><div class="who"><b>${esc(r.ty)}</b> · ${esc(reqDates(r))}<div class="ph">${r.st==="approved"?"✅ Approved":r.st==="denied"?"❌ Denied":"⏳ Waiting"}${r.dnote?" · "+esc(r.dnote):""}</div></div></div>`).join("")}</div>`;
  // log
  const lt=S.log.filter(x=>x.d===k);const st=logStreak();
  h+=`<h2>📝 My log ${st>1?`<span class="note" style="font-weight:700">🔥 ${st}-day streak</span>`:""}</h2><div class="panel">${lt.length?lt.map(x=>`<div>• ${esc(x.txt)}</div>`).join(""):`<div class="note">What did you get done today?</div>`}
    <div class="addph"><input type="text" id="tdLog" maxlength="500" placeholder="${lt.length?"Add another…":"Led PMCS on 3 dozers…"}"><button id="tdLogAdd">Add</button></div></div>`;
  h+=`${akHidden()?"":`<button class="btn alt" data-go="ask" style="width:100%;margin-top:12px">💬 Ask a question (orders, leave, pay, PFT…)</button>`}<div class="row2" style="margin-top:8px">${mf.length?`<button class="btn alt" data-go="feed">Feed</button>`:"<span></span>"}${S.me?`<button class="btn alt" data-go="me">My page</button>`:`<button class="btn alt" data-go="log">My log</button>`}</div>
    ${memberMode()?`<p class="note" style="text-align:center;margin-top:14px"><button class="chip" id="tdLeader" style="cursor:pointer">I'm a leader: show the main page</button></p>`:""}`;
  $("#main").innerHTML=h}

/* ---------- REQUESTS + PLAN OF THE DAY ---------- */
const REQ_TYPES=["Leave","Special liberty","Appointment","Schedule change","Other"];
function reqPending(){return S.reqs.filter(r=>r.st==="pending"&&S.feeds.some(f=>f.lk&&f.id===r.feed))}
function reqDates(r){const a=parseD(r.from),b=parseD(r.to);return (a?DOW[a.getDay()]+" "+short(a):"")+(b&&r.to!==r.from?" – "+DOW[b.getDay()]+" "+short(b):"")+(r.tm?" · "+r.tm:"")}
function reqApprove(r){const m=S.roster.find(x=>x.id===r.mid);r.st="approved";r.dt=Date.now();if(!m)return;
  const ty=r.ty==="Leave"?"LEAVE":r.ty==="Appointment"?"APPT":"OTHER";
  if(["Leave","Special liberty","Appointment"].includes(r.ty)&&r.from){m.cal=(m.cal||[]).concat({id:"c"+Date.now().toString(36)+rndId(3),d:r.from,end:r.to&&r.to>r.from?r.to:"",tm:r.tm||"",ty,ti:r.ty+(r.note?" · "+r.note.slice(0,40):""),no:"Approved request"})}
  if(r.ty==="Leave"&&r.from&&r.from<=dkey()){m.status="Leave";m.start=fmtD(r.from);if(r.to)m.end=fmtD(r.to)}
  const freed=[];if(["Leave","Special liberty"].includes(r.ty)&&r.from)for(const k of daysIn(r.from,r.to,60))for(const ro of S.duty.rosters)if((ro.assign||{})[k]===m.id){delete ro.assign[k];freed.push(ro.name+" "+short(parseD(k)))}
  return freed}
function reqHTML(f){if(!f.lk)return"";const mine=S.reqs.filter(r=>r.feed===f.id);if(!mine.length)return"";const pend=mine.filter(r=>r.st==="pending");const done=mine.filter(r=>r.st!=="pending").slice(0,15);
  const row=r=>{const m=S.roster.find(x=>x.id===r.mid);return `<div class="rrow" style="--sc:var(${r.st==="pending"?"--brass":r.st==="approved"?"--s-onhand":"--warn"})"><div class="who"><b>${esc(r.ty)}</b> · ${esc(reqDates(r))}<div class="ph">${m?`<span data-pcard="${m.id}" style="cursor:pointer;text-decoration:underline">${esc(m.rank+" "+m.name)}</span> · ${esc(m.sec)}`:`<span style="color:var(--warn)">${esc(r.who)} (not matched to roster)</span>`} · sent ${ago(r.t)}</div>${r.note?`<div class="ph">“${esc(r.note)}”</div>`:""}${r.st==="pending"&&m&&r.from?(()=>{const hits=[];for(const k of daysIn(r.from,r.to,31)){const cf=busyOn(m,k,{});cf.forEach(x=>hits.push(DOW[parseD(k).getDay()]+" "+short(parseD(k))+": "+x.why))}return hits.length?`<div class="ph" style="color:var(--warn);font-weight:700">⚠ ${esc(hits.slice(0,4).join(" · "))}${hits.length>4?" +"+(hits.length-4)+" more":""}</div>`:`<div class="ph" style="color:var(--s-onhand)">✓ No conflicts</div>`})():""}${r.st!=="pending"?`<div class="ph"><b style="color:var(${r.st==="approved"?"--s-onhand":"--warn"})">${r.st==="approved"?"Approved":"Denied"}</b>${r.dnote?" · "+esc(r.dnote):""}</div>`:""}</div>
    ${r.st==="pending"?`${m?"":`<select class="wsel" data-rqwho="${r.rid}"><option value="">Who is this?</option>${sorted(S.roster).map(x=>`<option value="${x.id}">${esc(x.rank+" "+x.name)}</option>`).join("")}</select>`}<input type="text" id="rqn${r.rid}" maxlength="80" placeholder="Note back (optional)" style="width:100%;padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)">
      <div class="row2"><button class="btn" data-rqok="${r.rid}">Approve</button><button class="btn warn" data-rqno="${r.rid}">Deny</button></div>`:m&&m.phone?`<a class="btn alt" href="${esc("sms:+1"+m.phone+"?&body="+encodeURIComponent(unitName()+": your "+r.ty.toLowerCase()+" request ("+reqDates(r)+") was "+r.st.toUpperCase()+"."+(r.dnote?" "+r.dnote:"")))}">Text them the answer</a>`:""}</div>`};
  return `<div class="panel" style="border-color:var(${pend.length?"--brass":"--line"})"><b>📨 Requests${pend.length?` · <span style="color:var(--brass)">${pend.length} waiting</span>`:""}</b>${pend.length?`<div class="alist">${pend.map(row).join("")}</div>`:`<p class="note">No requests waiting.</p>`}
    ${done.length?`<details${fdReqOpen?" open":""}><summary class="note">Decided (${done.length})</summary><div class="alist">${done.map(row).join("")}</div></details>`:""}<p class="note">Approved leave, liberty and appointments go on their calendar automatically. With My page on, they see the answer there.</p></div>`}
function myReqHTML(f){if(f.lk)return"";const st={};((S.me&&S.me.d&&S.me.d.reqs)||[]).forEach(x=>st[x.rid]=x);const list=(f.myReqs||[]).slice(0,10);
  return `<button class="btn alt" id="rqNew" style="width:100%;margin:4px 0">📨 ${fdReqForm?"Close request form":"New request (leave, liberty, appointment)"}</button>
    ${fdReqForm?`<div class="panel"><label for="rqTy">Request</label><select id="rqTy" class="wsel">${REQ_TYPES.map(t=>`<option>${t}</option>`).join("")}</select>
      <div class="row2"><div><label for="rqF">From</label><input type="date" id="rqF" value="${dkey()}" style="width:100%;padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)"></div><div><label for="rqT">To (optional)</label><input type="date" id="rqT" style="width:100%;padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)"></div></div>
      <label for="rqTm">Time (optional)</label><input type="time" id="rqTm" style="width:100%;padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)">
      <label for="rqNo">Reason / details</label><input type="text" id="rqNo" maxlength="200" placeholder="Where, why, who approved the leave form…">
      <button class="btn" id="rqSend">Send request</button><p class="note">Goes to your leader encrypted. ${S.me?"You'll see the answer on My page.":"Your leader will let you know the answer."}</p></div>`:""}
    ${list.length?`<div class="alist">${list.map(r=>{const s2=st[r.rid];const s3=s2?s2.st:"sent";return `<div class="rrow" style="--sc:var(${s3==="approved"?"--s-onhand":s3==="denied"?"--warn":"--brass"})"><div class="who"><b>${esc(r.ty)}</b> · ${esc(reqDates(r))}<div class="ph">${s3==="approved"?"✅ Approved":s3==="denied"?"❌ Denied":s3==="pending"?"⏳ Waiting for your leader":"Sent "+ago(r.t)}${s2&&s2.dnote?" · "+esc(s2.dnote):""}</div></div></div>`}).join("")}</div>`:""}`}
function podForm(){const d=new Date();d.setDate(d.getDate()+1);const k=dkey(d);const du=S.duty.rosters.map(r=>{const id=(r.assign||{})[k];const m=id&&S.roster.find(x=>x.id===id);return m?r.name+": "+m.rank+" "+lastOf(m):""}).filter(Boolean).join("; ");
  return `<div class="panel" style="border-color:var(--brass)"><b>📋 Plan of the Day</b>
    <label for="pdD">For</label><input type="date" id="pdD" value="${k}" style="width:100%;padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)">
    <label for="pdF">Formation (time and place)</label><input type="text" id="pdF" maxlength="60" placeholder="0700, Bldg 1000 lot" value="${esc(S.podLast&&S.podLast.f||"")}">
    <label for="pdU">Uniform</label><input type="text" id="pdU" maxlength="60" placeholder="PT gear / Utilities" value="${esc(S.podLast&&S.podLast.u||"")}">
    <label for="pdS">Schedule</label><textarea id="pdS" maxlength="600" style="min-height:90px" placeholder="0700 Formation&#10;0730 PT&#10;0900 Section training&#10;1130 Chow&#10;1300 Maintenance"></textarea>
    <label for="pdDu">Duty</label><input type="text" id="pdDu" maxlength="120" value="${esc(du)}">
    <label for="pdN">Notes</label><input type="text" id="pdN" maxlength="200" placeholder="Safety brief Friday 1500…">
    <div class="row2"><button class="btn" id="pdPost">Post and pin</button><button class="btn alt" id="pdCancel">Cancel</button></div></div>`}
function podText(o){const d=parseD(o.d);const L=["PLAN OF THE DAY · "+DOW[d.getDay()]+" "+short(d)+" "+String(d.getFullYear()).slice(2)];
  if(o.f)L.push("Formation: "+o.f);if(o.u)L.push("Uniform: "+o.u);if(o.s){L.push("");L.push("Schedule:");o.s.split("\n").map(x=>x.trim()).filter(Boolean).forEach(x=>L.push(x))}if(o.du){L.push("");L.push("Duty: "+o.du)}if(o.n){L.push("");L.push("Notes: "+o.n)}return L.join("\n")}
function latestPod(){for(const f of S.feeds.filter(f=>f.lk))for(const p of f.posts||[])if(p.pod&&p.pod.d>=dkey(new Date(Date.now()-86400000)))return {d:p.pod.d,txt:p.txt};return null}

/* ---------- HELP: a short how-to for every screen ---------- */
const HELP={
 board:["Your board","Total strength, on hand and present, plus a button for every tool.",["Tap a section tab or anyone's name to update them.","Find anyone: the search box at the top.","Live sections: let section leaders update you from their phones.","TEXT sends the numbers; DATA holds setup, backup and system check."]],
 sec:["Section","Everyone in this section with status and duty.",["Tap the status or duty pill to change it.","Tap a name to open their card.","6W starts an incident report; Call dials them.","Section leaders: the box at the bottom texts this section's update to the OIC."]],
 p:["Person card","Everything about one person in one place.",["Change status/duty at the top; set return, EDD and EAS dates.","Due-outs: tap Done today or set a date.","Calendar: add an appointment or send their dates to a phone calendar.","My page: give them a private page with their own info.","Notes stay on your phone and never go to their page."]],
 text:["Text the numbers","Builds the accountability report.",["Add the numbers you send to; Text it opens Messages ready to send.","Unit name shows on the report and in rollups.","The rollup code line lets your higher add your numbers in ROLLUP."]],
 muster:["Muster","Formation roll call.",["Pick who's expected, Start, then tap people as present.","Show QR: people scan with their camera and tap I'm here; they tick off on your list. The code changes every 30 seconds.","Close out saves it and builds the report."]],
 recall:["Recall","Contact everyone fast.",["Load phone numbers, then Start recall drill.","Check-in by text: everyone gets a link; Good / Delayed / Need help comes back live.","Need help pins to the top with a Call button."]],
 alerts:["Alerts","Who's overdue, returning in 7 days or leaving in 90.",["Based on status end dates and EDD on each person.","Text it to send the list."]],
 events:["Events","Attendance for classes, ranges and other required events.",["Create an event, pick sections, tap people as they attend.","The board shows how many still owe."]],
 armory:["Armory","Weapon or gear muster.",["Assign gear on each person, then Start muster and mark In rack / Out / Missing."]],
 pt:["PT roster","Who's going to PT and the text roster."],
 w6:["6W","Incident report: who, what, when, where, why, how.",["Fill it in, Save, then Text or Copy it to the chain."]],
 rollup:["Rollup","Add up the units under you.",["Each unit sends its TEXT report; paste them here.","Your rollup has its own code so the next level up can add it."]],
 live:["Live sections","Section leaders update your board from their phones.",["Turn it on, then Text each section leader their link.","They open it once; every change they make reaches you in about 15 seconds.","Alerts: tap the bell to be buzzed when a section updates."]],
 send:["SEND","A message with read receipts.",["Write it, pick sections, Text it (20 people per text).","Each person taps Got it; you see who has and hasn't, live.","Remind sends only to those who haven't."]],
 feed:["Feed","Pass the word inside the app, old and new.",["Leaders: post the word, pick Everyone / Sections / One person, pin what matters.","Remind me after: get a banner if people haven't confirmed.","Members: tap Got it, or add a note and tap Problem.","Requests and the Plan of the Day live here too."]],
 trends:["Trends","Your numbers over time.",["Chart of % on hand and present, section averages and who's been away most.","Fills in day by day as you use the app."]],
 ready:["Readiness","Due-outs: counselings, PFT/CFT, quals, PHA, licenses…",["Load dates from Excel or set them on each card.","Red = overdue, yellow = due in 30 days.","Done today sets the next due date for you.","Add or remove items at the bottom."]],
 duty:["Duty roster","Fair rotations that skip people who are away.",["Pick sections; it fills 30 days and skips leave/TAD/ops until they return.","Change any day; text 14 days to your numbers."]],
 cal:["Calendar","Everyone's dates in one place.",["Leave, TAD, duty, due-outs, events, EDD and EAS show up by themselves.","+ Add puts an appointment on a person or a whole section.","Section leaders see their section; what they add reaches the OIC.","Add these to my phone calendar sends them to your phone's calendar."]],
 log:["My log","Write down what you got done each day.",["Add as many entries a day as you want; tag them.","Look back by week, month or all time; search.","Copy as bullets for fitreps, evals and awards, or export to Excel."]],
 me:["My page","Your own status, duty, due-outs and calendar from your leader.",["It updates by itself when your leader changes something.","Add to phone calendar puts your dates in your phone's calendar.","Only you can read it."]],
 ask:["Ask","Questions about orders, admin, leave, pay, fitness and more.",["Type a question; it searches official .mil and .gov sources and lists them.","Check the source before acting: answers can be wrong or out of date.","Never type names, SSNs, phone numbers or anything sensitive.","Your questions stay on this phone."]],
 people:["People","Sections, search and live updates.",["Find anyone with the search box.","Tap a section to update its people.","Live sections lets section leaders update you from their phones."]],
 tools:["Tools","Every tool in one place.",["Accountability, Communicate, Plan, You and Setup.","Most-used ones are also on Home."]],
 sys:["System check","Tests your server setup.",["Run it; anything with ❌ shows which part to copy and paste in Supabase SQL Editor.","Safe to re-run any part."]],
 data:["Data and setup","Roster files, tabs, security, backup, live features and help.",["Load your MOL list or Excel; export everything to Excel.","Turn on backup and save your recovery code.","PIN lock encrypts the data on this phone."]]};
function helpFor(v){if(HELP[v])return HELP[v];if(v==="att"||SECTIONS.some(x=>x[0].toLowerCase()===v))return HELP.sec;return HELP.board}
function openHelp(){const [t,sub,steps]=helpFor(view);sheetCtx={kind:"help"};
  $("#sheetT").innerHTML=`${esc(t)}<small>${esc(sub)}</small>`;
  $("#sheetOpts").innerHTML=`<div class="panel" style="margin:0" data-noxl>${steps&&steps.length?`<ul class="plain" style="margin:0;padding-left:18px">${steps.map(x=>`<li style="margin-bottom:6px">${esc(x)}</li>`).join("")}</ul>`:""}
    <a class="btn alt" href="help.html" target="_blank" rel="noopener">Full quick-start guide</a><button class="btn alt" data-onb="how">Replay the intro</button><button class="btn" data-sclose="1">Got it</button></div>`;
  const sh=$("#sheet");sheetFocus();sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add("open")))}
document.addEventListener("click",e=>{if(e.target.closest("#helpBtn")){openHelp();return}if(e.target.closest("[data-onb='how']")&&sheetCtx&&sheetCtx.kind==="help")closeSheet()});

/* ---------- SYSTEM CHECK: is every backend piece in place? ---------- */
const SC=[
 {k:"ck",n:"Recall check-in, SEND, QR muster",f:["01a_checkin_tables","01b_checkin_send","01c_checkin_read"],t:[["create_recall",{p_id:"zz",p_read_key:"x"}],["checkin",{p_recall:"zzzzzzzz",p_words:["0"],p_code:1,p_note:""}],["get_checkins",{p_recall:"zz",p_read_key:"x",p_after:0}],["close_recall",{p_recall:"zz",p_read_key:"x"}],["set_push",{p_recall:"zz",p_read_key:"x",p_sub:{}}]]},
 {k:"lv",n:"Live sections",f:["02a_live_tables","02b_live_send","02c_live_read"],t:[["create_board",{p_id:"zz",p_read_key:"x",p_write_key:"x"}],["push_update",{p_board:"zz",p_write_key:"x",p_sec:"HQ",p_sender:[],p_strength:0,p_items:[]}],["get_board_updates",{p_board:"zz",p_read_key:"x",p_after:0}],["delete_board",{p_board:"zz",p_read_key:"x"}],["set_board_push",{p_board:"zz",p_read_key:"x",p_sub:{}}]]},
 {k:"sc",n:"Section calendars",f:["03_section_calendar"],t:[["push_cal",{p_board:"zz",p_write_key:"x",p_sec:"HQ",p_ct:"QQ=="}],["get_cal",{p_board:"zz",p_read_key:"x"}]]},
 {k:"fd",n:"Feed",f:["04a_feed_tables","04b_feed_post","04c_feed_read","04d_feed_manage"],t:[["create_feed",{p_id:"zz",p_member_key:"x",p_leader_key:"x"}],["feed_post",{p_feed:"zz",p_leader_key:"x",p_ct:"QQ=="}],["feed_get",{p_feed:"zz",p_member_key:"x",p_after:0}],["feed_ack",{p_feed:"zz",p_member_key:"x",p_post:0,p_words:["0"],p_code:1,p_note:""}],["feed_acks_get",{p_feed:"zz",p_leader_key:"x",p_after:0}],["feed_delete_post",{p_feed:"zz",p_leader_key:"x",p_post:0}],["delete_feed",{p_feed:"zz",p_leader_key:"x"}]]},
 {k:"fa",n:"Feed alerts",f:["05_feed_alerts"],t:[["feed_sub",{p_feed:"zz",p_member_key:"x",p_sub:{}}],["feed_unsub",{p_feed:"zz",p_member_key:"x",p_endpoint:"x"}]]},
 {k:"rq",n:"Requests",f:["08_requests"],t:[["feed_req",{p_feed:"zz",p_member_key:"x",p_ct:"QQ=="}],["feed_reqs_get",{p_feed:"zz",p_leader_key:"x",p_after:0}]]},
 {k:"bk",n:"Backup and sync",f:["06a_backup_put","06b_backup_read"],t:[["backup_put",{p_id:"zz",p_key:"x",p_ct:"QQ==",p_base:null}],["backup_get",{p_id:"zz",p_key:"x"}],["backup_ver",{p_id:"zz",p_key:"x"}],["backup_delete",{p_id:"zz",p_key:"x"}]]},
 {k:"mp",n:"My page",f:["07_my_page"],t:[["put_page",{p_id:"zz",p_wk:"x",p_ct:"QQ=="}],["get_page",{p_id:"zz"}],["delete_page",{p_id:"zz",p_wk:"x"}]]},
 {k:"cy",n:"Company board",f:["14a_company_tables","14b_company_report"],t:[["create_company",{p_id:"zz",p_read_key:"x",p_write_key:"x"}],["put_unit",{p_company:"zz",p_write_key:"x",p_unit:"zzzzzz",p_ct:"QQ=="}],["get_units",{p_company:"zz",p_read_key:"x"}]]},
 {k:"oa",n:"OIC alerts for requests and problems",f:["13_oic_alerts"],t:[["set_feed_leader_sub",{p_feed:"zz",p_leader_key:"x",p_sub:{}}]]},
 {k:"sk",n:"Replace one section link",f:["12a_section_keys","12b_section_checks"],t:[["set_sec_key",{p_board:"zz",p_read_key:"x",p_sec:"HQ",p_key:"x"}]]},
 {k:"hub",n:"Unit hub (leader links pull your roster, one Feed)",f:["11a_hub_roster","11b_hub_feed"],t:[["put_roster",{p_board:"zz",p_read_key:"x",p_sec:"HQ",p_ct:"QQ=="}],["get_roster",{p_board:"zz",p_write_key:"x",p_sec:"HQ"}],["set_feed_poster",{p_feed:"zz",p_leader_key:"x",p_poster_key:"x"}],["feed_post_sl",{p_feed:"zz",p_poster_key:"x",p_ct:"QQ=="}]]}];
let scRes=null,scBusy=false;
async function scRun(){scBusy=true;scRes={at:Date.now(),g:{},nt:null};renderSys();
  const one=async([fn,args])=>{try{await SB.rpc(fn,args);return {ok:1}}catch(e){const m=String(e.message||e);if(/could not find the function|schema cache|PGRST202/i.test(m))return {miss:1,fn};if(/permission denied/i.test(m))return {perm:1,fn};if(/abort|Failed to fetch|NetworkError|Load failed/i.test(m))return {net:1,fn};return {ok:1}}};
  await Promise.all(SC.map(async g=>{const r=await Promise.all(g.t.map(one));scRes.g[g.k]={ok:r.every(x=>x.ok),miss:r.filter(x=>x.miss).map(x=>x.fn),perm:r.filter(x=>x.perm).map(x=>x.fn),net:r.some(x=>x.net)}}));
  const nt={};try{await SB.findNotify();const r=await fetch(SB.url+"/functions/v1/"+SB.nfn,{method:"POST",headers:{apikey:SB.key,"Content-Type":"application/json"},body:"{}"});nt.s=r.status;nt.t=(await r.text()).slice(0,120);
    if(r.status===400&&/bad/.test(nt.t)){const r2=await fetch(SB.url+"/functions/v1/"+SB.nfn,{method:"POST",headers:{apikey:SB.key,"Content-Type":"application/json"},body:JSON.stringify({feed:"aaaaaaaaaa",lk:"a".repeat(24)})});nt.s2=r2.status;nt.t2=(await r2.text()).slice(0,60)}}catch(e){nt.err=String(e.message||e)}
  scRes.nt=nt;{const ak={};try{await SB.findAsk();const r=await fetch(SB.url+"/functions/v1/"+SB.afn,{method:"POST",headers:{apikey:SB.key,"Content-Type":"application/json"},body:JSON.stringify({ping:1})});ak.s=r.status;try{Object.assign(ak,await r.json())}catch(e){}}catch(e){ak.err=1}scRes.ak=ak}
  scBusy=false;renderSys()}
function akState(a){if(!a)return null;if(a.err)return {ok:0,msg:"Couldn't reach it. Check signal."};if(a.s===404)return {ok:0,msg:"Optional. Not set up: create the Edge Function named ask, add ANTHROPIC_API_KEY, run part 10."};
  if(a.s===401||a.s===403)return {ok:0,msg:"JWT checking is on. Open ask → Details and turn off Enforce JWT verification."};if(a.s>=500)return {ok:0,msg:"It crashed. Usually the code was cut off when pasted."};
  if(a.ok&&!a.key)return {ok:0,msg:"Deployed, but the ANTHROPIC_API_KEY secret is missing."};if(a.ok&&!a.db)return {ok:0,msg:"Deployed, but the usage table is missing. Run part 10."};if(a.ok&&!a.ctl)return {ok:0,msg:"Ready, but OIC controls aren't set up. Run part 10b."};if(a.ok)return {ok:1,msg:"Ready"+(a.admin?" · OIC controls on":" · add AI_ADMIN_KEY to use OIC controls")+" · "+(a.on===false?"turned OFF":a.who==="feed"?"Feed members only":a.who==="leaders"?"leaders only":"open to everyone")+"."};return {ok:0,msg:"Unexpected answer ("+a.s+")."}}
function ntState(nt){if(!nt)return null;if(nt.err)return {ok:0,msg:"Couldn't reach it. Check signal."};if(nt.s===404)return {ok:0,msg:"Not deployed. Create the Edge Function named notify."};
  if(nt.s===401||nt.s===403)return {ok:0,msg:"JWT checking is on. Open notify → Details and turn off Enforce JWT verification."};
  if(nt.s>=500)return {ok:0,msg:"It crashed. Usually the VAPID_PUBLIC / VAPID_PRIVATE secrets are missing, or the code was cut off when pasted."};
  if(nt.s===400&&/bad/.test(nt.t)){if(nt.s2===200)return {ok:1,msg:"Deployed and current."};return {ok:0,msg:"Deployed but an older version (no Feed alerts). Paste the latest code."}}
  return {ok:0,msg:"Unexpected answer ("+nt.s+")."}}
async function scCopy(file){try{const r=await fetch("supabase/setup/"+file+".sql",{cache:"no-cache"});if(!r.ok)throw 0;const t=await r.text();await navigator.clipboard.writeText(t);toast("Copied "+file+". Paste it in SQL Editor and Run.")}catch(e){toast("Copy blocked. Open the file in GitHub: supabase/setup/"+file+".sql")}}
async function scCopyNotify(){try{const r=await fetch("supabase/functions/notify/index.ts",{cache:"no-cache"});const t=await r.text();await navigator.clipboard.writeText(t);toast("notify code copied. Paste it in Edge Functions → notify → Code, then Deploy.")}catch(e){toast("Copy blocked here.")}}
function renderSys(){let h=`<h2>System check</h2><div class="panel"><p class="note">Tests every piece of your Supabase server setup in a few seconds. It doesn't change or read any of your data.</p><button class="btn" id="scGo"${scBusy?" disabled":""}>${scBusy?"Checking…":"Run system check"}</button></div>`;
  if(scRes&&!scBusy){const bad=SC.filter(g=>!scRes.g[g.k].ok);const nt=ntState(scRes.nt);
    h+=`<div class="panel" style="border-color:var(${bad.length||!nt.ok?"--warn":"--s-onhand"})"><b style="font-size:18px;color:var(${bad.length||!nt.ok?"--warn":"--s-onhand"})">${bad.length||!nt.ok?"⚠ "+(bad.length+(nt.ok?0:1))+" thing"+(bad.length+(nt.ok?0:1)>1?"s":"")+" to fix":"✅ Everything is set up"}</b><div class="note">Checked ${ago(scRes.at)}</div></div>`;
    h+=`<div class="alist">${SC.map(g=>{const r=scRes.g[g.k];return `<div class="rrow" style="--sc:var(${r.ok?"--s-onhand":"--warn"})"><div class="rtop"><div class="who"><b>${r.ok?"✅":"❌"} ${esc(g.n)}</b>${r.ok?"":`<div class="ph">${r.net?"Couldn't reach the server. Check signal and run again.":r.perm.length?"Permissions missing ("+r.perm.join(", ")+"). Run the last part again.":"Missing: "+r.miss.join(", ")}</div>`}</div></div>
      ${r.ok||r.net?"":`<div class="note">Run these in Supabase → SQL Editor, one at a time (New query → paste → Run). Safe to re-run.</div><div class="evts">${g.f.map((f,i)=>`<button data-scf="${f}">Copy part ${i+1} of ${g.f.length}</button>`).join("")}</div>`}</div>`}).join("")}
      <div class="rrow" style="--sc:var(${nt.ok?"--s-onhand":"--warn"})"><div class="who"><b>${nt.ok?"✅":"❌"} Push alerts (notify function)</b><div class="ph">${esc(nt.msg)}</div></div>${nt.ok?"":`<button class="btn alt" id="scNt">Copy notify code</button><p class="note">Also check Edge Functions → Secrets has VAPID_PUBLIC and VAPID_PRIVATE.</p>`}</div></div>
    ${(()=>{const a=akState(scRes.ak);return a?`<h2>Ask (AI) · optional</h2><div class="rrow" style="--sc:var(${a.ok?"--s-onhand":"--s-duty"})"><div class="who"><b>${a.ok?"✅":"○"} Ask questions</b><div class="ph">${esc(a.msg)}</div></div>${a.ok?"":`<div class="evts"><button data-scf="10_ask">Copy part 10 (SQL)</button><button data-scf="10b_ask_controls">Copy part 10b</button><button id="scAsk">Copy ask code</button></div>`}</div>`:""})()}
    <h2>Server protection</h2><div class="panel"><p class="note">Limits that stop anyone from flooding your free server, and a nightly cleanup of expired data. The app can't test these from here; run each once.</p><div class="evts">${["09a_limits","09b_limits_apply","09c_cleanup"].map((f,i)=>`<button data-scf="${f}">Copy part ${i+1} of 3</button>`).join("")}</div><p class="note">If part 3 errors, turn on <b>pg_cron</b> in Database → Extensions, then run it again.</p></div>`}
  $("#main").innerHTML=h}

/* ---------- MY PAGE: each member's own info, encrypted per person ---------- */
let mpT=null,mpBusy=false;
async function mpKeys(pk){return {id:hexOf(await sha("mpid:"+pk)).slice(0,24),wk:hexOf(await sha("mpwk:"+pk)),ek:await crypto.subtle.importKey("raw",await sha("mpek:"+pk),"AES-GCM",false,["encrypt","decrypt"])}}
function mpLink(m){const q=new URLSearchParams();q.set("me",m.pk);q.set("u",unitName());return PUB()+"#"+q.toString()}
function mpDigest(m){const t=dkey();const to=dkey(new Date(Date.now()+60*86400000));const sn=sinceOf(m);
  const cal=calEntries(t,to,"ALL").filter(e=>e.m&&e.m.id===m.id).map(e=>({d:e.d,end:e.end&&e.end!==e.d?e.end:"",tm:e.tm||"",ty:e.ty,ti:e.ti,no:e.no||""}));
  const duties=[];for(const r of S.duty.rosters)for(const k of Object.keys(r.assign||{}).filter(k=>k>=t&&r.assign[k]===m.id).sort().slice(0,3))duties.push({r:r.name,d:k});
  const due=readyItems().map(it=>{const st=dueState(m,it);return {n:it.n,st:st.st,txt:st.txt,d:st.iso||""}}).filter(x=>x.st!=="none");
  const owe=(S.events||[]).filter(e=>evReq(e).some(x=>x.id===m.id)&&!evDone(e,m)).map(e=>({n:e.name,d:e.date||""}));
  const reqs=S.reqs.filter(r=>r.mid===m.id).slice(0,10).map(r=>({rid:r.rid,ty:r.ty,from:r.from,to:r.to,st:r.st,dnote:r.dnote||""}));const pod=latestPod();
  const hf=mainFeed();const feed=hf?{id:hf.id,mk:hf.mk,ek:hf.ek,unit:hf.unit,secs:SECTIONS.map(x=>x[0])}:null;const cf=coFeedDown();const cofeed=cf?Object.assign({},cf,{mid:m.uid||""}):null;
  return {v:1,mid:m.id,feed,cofeed,reqs,pod,unit:unitName(),rank:m.rank,name:m.name,sec:m.sec,secName:((SECTIONS.find(x=>x[0]===m.sec)||[])[1]||m.sec),status:m.status,statusShort:SHORT[m.status]||m.status,duty:dutyOf(m),since:sn||0,start:isoOf(m.start),end:isoOf(m.end),edd:isoOf(m.edd),eas:isoOf(m.eas),duties:duties.sort((a,b)=>a.d.localeCompare(b.d)),due,cal,owe}}
function mpSchedule(){if(!S.roster.some(m=>m.pk))return;clearTimeout(mpT);mpT=setTimeout(mpPublish,5000)}
async function mpPutOne(m){const d=mpDigest(m);const sg=sigF(d);d.at=Date.now();const K=await mpKeys(m.pk);const ct=await sealObj(K,d);await SB.rpc("put_page",{p_id:K.id,p_wk:K.wk,p_ct:ct});m.pkSig=sg;m.pkAt=Date.now()}
async function mpPublish(force){if(mpBusy){clearTimeout(mpT);mpT=setTimeout(()=>mpPublish(force),4000);return 0}mpBusy=true;let n=0,err="";
  try{for(const m of S.roster.filter(m=>m.pk)){try{const d=mpDigest(m);const sg=sigF(d);if(!force&&sg===m.pkSig&&Date.now()-(m.pkAt||0)<12*3600000)continue;await mpPutOne(m);n++}catch(e){err=String(e.message||e).slice(0,80)}}
    if(n||S.mpErr||err){S.mpErr=err;rawSave()}}
  finally{mpBusy=false}return n}
/* the link only goes out once their page is really on the server, so it never opens to "not published yet" */
async function mpTurnOn(m){if(!m.pk){m.pk=rndId(28);m.pkSig="";save()}
  for(let i=0;i<3;i++){try{await mpPutOne(m);S.mpErr="";rawSave();return mpLink(m)}catch(e){S.mpErr=String(e.message||e).slice(0,80);rawSave();if(i<2)await new Promise(r=>setTimeout(r,800*(i+1)))}}
  throw new Error("Couldn't publish their page: "+S.mpErr)}
async function mpFetch(){const M=S.me;if(!M)return;try{const K=await mpKeys(M.pk);const rows=await SB.rpc("get_page",{p_id:K.id});const r=rows&&rows[0];
  if(!r){M.err="Your leader hasn't published your page yet.";rawSave();return}const t=Date.parse(r.updated_at)||0;if(M.t===t&&M.d){M.err="";return}
  M.d=await openBlob(K,r.ct);M.t=t;M.err="";rawSave();mpJoinFeed(M.d);if(view==="me"||view==="today"){const a=document.activeElement&&document.activeElement.tagName;if(a!=="INPUT"&&a!=="TEXTAREA"){const y=window.scrollY;view==="me"?renderMe():renderToday();window.scrollTo(0,y)}}}catch(e){const t=String(e.message||e);M.err=/could not find|schema cache|404/i.test(t)?"Your unit's server isn't set up for My page yet. Tell your leader: setup part 07.":/fetch|network/i.test(t)?"No signal. Pull down or tap Refresh to try again.":t.slice(0,80);rawSave();if(view==="me")renderMe()}}
function mpJoinFeed(D){if(D&&D.cofeed){const last0=(String(D.name).split(",")[0]||D.name).trim(),first0=(String(D.name).split(",")[1]||"").trim().split(/\s+/)[0]||"";joinCoFeed(D.cofeed,(D.rank+" "+last0+(first0?" "+first0:"")).toUpperCase(),D.cofeed.mid)}const F=D&&D.feed;if(!F||!F.id)return;{const ex=S.feeds.find(f=>f.id===F.id);if(ex){if(D.mid&&!ex.lk&&ex.mid!==D.mid){ex.mid=String(D.mid).slice(0,40);rawSave()}return}}
  const last=(String(D.name).split(",")[0]||D.name).trim();const first=(String(D.name).split(",")[1]||"").trim().split(/\s+/)[0]||"";const nf={id:String(F.id).slice(0,20),mk:String(F.mk).slice(0,40),ek:String(F.ek).slice(0,60),unit:String(F.unit||D.unit).slice(0,24),me:(D.rank+" "+last+(first?" "+first:"")).toUpperCase().replace(/[|#]/g," ").replace(/\s+/g," ").trim().slice(0,30),sec:D.sec==="ATT"?"ATT":D.sec,secsLink:(F.secs||[]).slice(0,12),posts:[],seen:0,mine:{},hub:1,mid:String(D.mid||"").slice(0,40)};
  S.feeds=S.feeds.filter(f=>!f.hub||f.lk);S.feeds.push(nf);if(!S.myName)S.myName=nf.me;save();fdMeHash(nf).then(()=>{fdPollAll(true);fdPushAttach(nf)});toast("You're in the "+nf.unit+" Feed")}
every(60000,()=>{if(S.me)mpFetch()},"mypage");
every(30*60000,()=>{if(S.roster.some(m=>m.pk)&&isLeaderPhone()&&canEdit())mpPublish()},"mypage-pub");
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&S.me)mpFetch()});
const daysTo=iso=>{const d=parseD(iso);return d?Math.round((d-today0())/86400000):null};
function renderMe(){const M=S.me;let h="";
  if(!M){h=`<div class="hm-h" style="margin-top:14px">My page</div><div class="card"><p class="note" style="margin:0">Your leader sends you a private link to your page. Open it on this phone and your status, duty, due-outs and calendar show up here.</p></div>`;$("#main").innerHTML=h;return}
  const D=M.d;if(!D){h=`<div class="hm-h" style="margin-top:14px">My page</div><div class="card"><p class="note" style="margin:0">${M.err?esc(M.err):"Loading your page…"}</p><button class="btn alt" id="meRe">Try again</button></div>`;$("#main").innerHTML=h;return}
  const cd=[];const add=(lab,iso,col)=>{const n=daysTo(iso);if(n!=null&&n>=0)cd.push({lab,n,col})};
  if(D.duties[0])add("Next duty",D.duties[0].d,"--s-duty");
  if(D.status!=="On Hand"&&D.end)add("Back from "+D.statusShort,D.end,"--s-onhand");
  const lv=D.cal.find(e=>e.ty==="LEAVE"&&e.d>dkey());if(lv)add("Leave starts",lv.d,"--s-leave");
  const nd=D.due.filter(x=>x.d&&x.st!=="over").sort((a,b)=>a.d.localeCompare(b.d))[0];if(nd)add(nd.n+" due",nd.d,"--s-aob");
  if(D.eas)add("EAS",D.eas,"--brass");else if(D.edd)add("EDD",D.edd,"--brass");
  const over=D.due.filter(x=>x.st==="over");const pend=(D.reqs||[]).filter(r=>r.st!=="approved"&&r.st!=="denied");
  const cap=w=>w.charAt(0)+w.slice(1).toLowerCase();const last=(D.name.split(",")[0]||D.name).trim();
  const dt=(iso,tone)=>{const d=parseD(iso);return d?`<span class="n tone-${tone||"b"}" style="flex-direction:column;line-height:1;gap:1px"><span style="font-size:15px">${d.getDate()}</span><span style="font-size:9.5px;letter-spacing:.06em">${short(d).split(" ")[1]||""}</span></span>`:`<span class="n tone-${tone||"b"}">•</span>`};
  const row=(lead,t,sub,extra)=>`<div class="lrow">${lead}<span style="flex:1;min-width:0"><span class="t" style="display:block">${t}</span>${sub?`<span class="s" style="display:block">${sub}</span>`:""}</span>${extra||""}</div>`;
  const tone=st=>st==="over"?"r":st==="soon"?"a":"g";
  h+=`<div style="margin-top:14px"><div class="hm-k">${esc(D.sec)} · ${esc(D.secName).toUpperCase()} · ${esc(D.unit)}</div><div class="hm-h">${esc(cap(D.rank))} ${esc(last.split(" ").map(cap).join(" "))}</div></div>`;
  h+=`<div class="card hero"><div style="display:flex;justify-content:space-between;align-items:baseline"><span class="lbl">MY STATUS</span><button class="chip" id="meRe" style="cursor:pointer">↻ Updated ${ago(M.t)}</button></div>
    <div style="display:flex;align-items:center;gap:10px"><span style="width:14px;height:14px;border-radius:50%;background:var(${SVAR[D.status]||"--line"})"></span><span style="font-size:32px;font-weight:800;letter-spacing:-.01em">${esc(D.statusShort)}</span></div>
    <div class="note" style="margin:0">${D.since?"Since "+short(new Date(D.since)):""}${D.end&&D.status!=="On Hand"?" · through "+short(parseD(D.end)):""}${D.duty!=="Full Duty"?` · <b style="color:var(--warn)">${esc(D.duty)}</b>`:" · Full duty"}</div></div>`;
  if(cd.length)h+=`<div class="tgrid">${cd.sort((a,b)=>a.n-b.n).slice(0,4).map(c=>`<div class="cdt"><div class="k">${esc(c.lab).toUpperCase()}</div><div class="v" style="color:var(${c.col})">${c.n}<small> ${c.n===1?"day":"days"}</small></div></div>`).join("")}</div>`;
  const ny=[];over.forEach(x=>ny.push(row(`<span class="n tone-r">!</span>`,esc(x.n),esc(x.txt))));
  D.owe.forEach(x=>ny.push(row(`<span class="n tone-a">✓</span>`,esc(x.n),"You still owe"+(x.d?" · "+esc(x.d):""))));
  pend.forEach(r=>ny.push(row(`<span class="n tone-b">⏳</span>`,esc(r.ty)+" request",esc(reqDates(r))+" · waiting")));
  if(ny.length)h+=`<div class="sech"><h2>Needs you</h2><span class="note" style="margin:0">${ny.length}</span></div><div class="card ny">${ny.join("")}</div><p class="note" style="margin:6px 4px 0">See your section leader to knock these out.</p>`;
  if(D.pod){const L=D.pod.txt.split("\n");h+=`<div class="card tone-a" style="border:0"><div style="font-size:12px;font-weight:800;letter-spacing:.08em">PLAN OF THE DAY</div><div style="white-space:pre-wrap;font-weight:600;line-height:1.5;color:var(--ink)">${esc(L.slice(1).join("\n"))}</div><div class="note" style="margin:0">${esc(L[0])}</div></div>`}
  h+=`<div class="sech"><h2>Duty</h2></div>`+(D.duties.length?`<div class="card ny">${D.duties.map(x=>{const d=parseD(x.d);return row(dt(x.d,"a"),DOW[d.getDay()]+" "+short(d),esc(x.r))}).join("")}</div>`:`<div class="card"><p class="note" style="margin:0">No duty scheduled.</p></div>`);
  h+=`<div class="sech"><h2>Due-outs</h2></div>`+(D.due.length?`<div class="card ny">${D.due.map(x=>row(`<span class="n tone-${tone(x.st)}">${x.st==="over"?"!":x.st==="soon"?"●":"✓"}</span>`,esc(x.n),esc(x.txt))).join("")}</div>`:`<div class="card"><p class="note" style="margin:0">Nothing tracked yet.</p></div>`);
  if((D.reqs||[]).length)h+=`<div class="sech"><h2>My requests</h2></div><div class="card ny">${D.reqs.map(r=>row(`<span class="n tone-${r.st==="approved"?"g":r.st==="denied"?"r":"b"}">${r.st==="approved"?"✓":r.st==="denied"?"✕":"⏳"}</span>`,esc(r.ty)+" · "+esc(reqDates(r)),(r.st==="approved"?"Approved":r.st==="denied"?"Denied":"Waiting")+(r.dnote?" · "+esc(r.dnote):""))).join("")}</div>`;
  h+=`<div class="sech"><h2>My calendar</h2><button class="chip" id="meIcs" style="cursor:pointer">Add to phone calendar</button></div>`+(D.cal.length?`<div class="card ny">${D.cal.map(e=>{const d=parseD(e.d);const t=ctype(e.ty);return row(dt(e.d,e.ty==="LEAVE"?"g":"b"),(e.tm?esc(e.tm)+" · ":"")+esc(e.ti),DOW[d.getDay()]+" · "+t[1]+(e.end?" · thru "+short(parseD(e.end)):"")+(e.no?" · "+esc(e.no):""))}).join("")}</div>`:`<div class="card"><p class="note" style="margin:0">Nothing in the next 60 days.</p></div>`);
  h+=`<div class="tgrid" style="margin-top:16px">${S.feeds.length?`<button data-go="feed"><span class="ic">${svg("feed")}</span><span><b>Feed</b><small>The word</small></span></button>`:""}<button data-go="log"><span class="ic">${svg("log")}</span><span><b>My log</b><small>Today's work</small></span></button></div>
    <p class="note" style="text-align:center;margin-top:14px">Only you can read this page. It's locked with a key in your private link. Something wrong? Tell your section leader.</p>
    ${memberMode()?`<p class="note" style="text-align:center;margin-top:10px"><button class="chip" id="tdLeader" style="cursor:pointer">I'm a leader: show the main page</button></p>`:""}<button class="btn warn" id="meOff" style="width:100%;margin-top:8px">${armed==="meoff"?"Tap again to remove My page from this phone":"Remove My page from this phone"}</button>`;
  $("#main").innerHTML=h}
function mePrompt(q){const pk=(q.get("me")||"").replace(/[^a-z0-9]/g,"").slice(0,40);const unit=(q.get("u")||"").replace(/[|#<>]/g,"").slice(0,24);try{history.replaceState(null,"",location.pathname)}catch(e){}
  if(pk.length<20)return toast("That My page link is incomplete.");
  const own=S.roster.find(m=>m.pk===pk);
  if(!own&&mpEmptyLeader()){S.leaderMode=false;S.source="sample";S.roster=sampleRoster();delete S.role}
  if(!own&&isLeaderPhone()&&!(S.link&&!S.board)&&mpAskOpen(unit)){S.me={pk,unit,d:null,t:0};S.onb=true;S.welcomed=1;save();mpHideWelcome();view="me";render();window.scrollTo(0,0);mpFetch();return}
  if(own||(isLeaderPhone()&&!(S.link&&!S.board))){S.leaderMode=true;save();if(own){openCard(own.id);toast("That's "+own.rank+" "+lastOf(own)+"'s My page link. You're on your leader phone, so here's their card.")}else{view="board";render();window.scrollTo(0,0);toast("You're on your leader phone, so you stay on the main page.")}return}
  S.me={pk,unit,d:null,t:0};S.onb=true;S.welcomed=1;if(!S.mode)S.mode="military";save();mpHideWelcome();view="me";render();window.scrollTo(0,0);mpFetch()}
/* a phone that tapped "start a team" but never added anyone, made a board, feed or access link */
function mpEmptyLeader(){return !S.roster.length&&!S.board&&!S.link&&!(S.feeds||[]).some(f=>f.lk)&&!(S.sync&&S.sync.on)&&!S.coBoard&&!S.role}
function mpAskOpen(unit){try{return window.confirm("This phone runs its own team. Open your My page"+(unit?" from "+unit:"")+" here anyway?\n\nYour team stays on this phone.")}catch(e){return false}}
function mpHideWelcome(){const w=document.getElementById("v11Welcome");if(w){w.hidden=true;document.body.classList.remove("v11w-open")}}

/* ---------- CALENDAR: per person, whole board, sections ---------- */
const CAL_TYPES=[["APPT","Appointment","--s-aob"],["LEAVE","Leave","--s-leave"],["TAD","TAD / travel","--s-tad"],["TRNG","Training","--s-op"],["DUTY","Duty","--s-duty"],["DUE","Due-out","--warn"],["EVENT","Event","--brass"],["OTHER","Other","--muted"]];
const ctype=k=>CAL_TYPES.find(x=>x[0]===k)||CAL_TYPES[7];
let calM=null,calDay=null,calSec=null,calAdd=false,calFor=null,calEdit=null;const sigF=v=>fnv(JSON.stringify(v||[]));
function calSecDefault(){return S.link&&S.link.mysec&&!S.board?S.link.mysec:"ALL"}
function calEntries(from,to,secF){const out=[];const inR=d=>d>=from&&d<=to;const pool=S.roster.filter(m=>!secF||secF==="ALL"||m.sec===secF);const byNk={};S.roster.forEach(m=>byNk[fullK(m)]=m);
  for(const m of pool){for(const e of m.cal||[]){const end=e.end&&e.end>e.d?e.end:e.d;if(end<from||e.d>to)continue;out.push({d:e.d,end,tm:e.tm||"",ty:e.ty,ti:e.ti,no:e.no||"",m,id:e.id,own:1})}
    const sd=isoOf(m.start),ed=isoOf(m.end);if(["Leave","TAD","Operation","Appointment off Base"].includes(m.status)&&(sd||ed)){const a=sd||dkey(),b=ed||a;if(!(b<from||a>to))out.push({d:a,end:b,ty:m.status==="Leave"?"LEAVE":m.status==="TAD"?"TAD":"APPT",ti:SHORT[m.status]+(m.detail?" · "+m.detail:""),m,auto:1})}
    if(ed&&inR(ed)&&m.status!=="On Hand")out.push({d:ed,ty:"OTHER",ti:"Returns ("+(SHORT[m.status]||m.status)+" ends)",m,auto:1});
    for(const [k,lab] of [["edd","EDD"],["eas","EAS"]]){const x=isoOf(m[k]);if(x&&inR(x))out.push({d:x,ty:"OTHER",ti:lab,m,auto:1})}
    for(const it of readyItems()){const r=((m.due||{})[it.n])||{};if(r.due&&inR(r.due))out.push({d:r.due,ty:"DUE",ti:it.n+" due",m,auto:1})}}
  const ids=new Set(pool.map(m=>m.id));
  for(const r of S.duty.rosters)for(const [k,id] of Object.entries(r.assign||{}))if(inR(k)&&ids.has(id))out.push({d:k,ty:"DUTY",ti:r.name,m:S.roster.find(x=>x.id===id),auto:1});
  for(const ev of S.events||[]){const x=isoOf(ev.date)||(/^\d{4}-\d{2}-\d{2}$/.test(ev.date||"")?ev.date:"");if(x&&inR(x)&&(!secF||secF==="ALL"||ev.secs.includes(secF)))out.push({d:x,ty:"EVENT",ti:ev.name+(ev.type?" ("+ev.type+")":""),grp:(ev.secs||[]).join(", "),auto:1})}
  if(!S.link)for(const [sec,c] of Object.entries(S.secCal||{})){if(secF&&secF!=="ALL"&&secF!==sec)continue;for(const e of c.e||[]){const m=byNk[e.nk];if(!m)continue;if(m.cal&&m.cal.some(x=>x.d===e.d&&x.ti===e.ti))continue;const end=e.end&&e.end>e.d?e.end:e.d;if(end<from||e.d>to)continue;out.push({d:e.d,end,tm:e.tm,ty:e.ty,ti:e.ti,no:e.no,m,from:sec})}}
  return out.sort((a,b)=>a.d.localeCompare(b.d)||(a.tm||"99").localeCompare(b.tm||"99"))}
function calOn(day,secF){return calEntries(day,day,secF||calSecDefault()).concat(calEntries("0000-00-00",day,secF||calSecDefault()).filter(e=>e.end&&e.d<day&&e.end>=day))}
function calRow(e,showDate){const t=ctype(e.ty);const who=e.m?`<span data-pcard="${e.m.id}" style="cursor:pointer;text-decoration:underline;text-decoration-color:var(--line)">${esc(e.m.rank+" "+lastOf(e.m))}</span> · ${esc(e.m.sec)}`:esc(e.grp||"Unit");
  const dd=parseD(e.d);return `<div class="rrow" style="--sc:var(${t[2]})"><div class="rtop"><div class="who"><b>${showDate?DOW[dd.getDay()]+" "+short(dd)+" · ":""}${e.tm?esc(e.tm)+" · ":""}${esc(e.ti)}</b><div class="ph">${who} · ${t[1]}${e.end&&e.end!==e.d?" · thru "+short(parseD(e.end)):""}${e.from?" · from "+esc(e.from)+" leader":""}${e.auto?" · auto":""}</div>${e.no?`<div class="ph">${esc(e.no)}</div>`:""}</div>
    ${e.own?`<button class="chip" data-cdel="${e.m.id}:${e.id}" style="cursor:pointer">${armed==="cd"+e.id?"Delete?":"✕"}</button>`:""}</div></div>`}
function calForm(pre){const D=new Date();const iso=calDay||dkey(D);const sec=calSec&&calSec!=="ALL"?calSec:null;const people=sorted(S.roster.filter(m=>!sec||m.sec===sec));
  return `<div class="panel"><b>Add to calendar</b>
    ${pre?`<div>For <b>${esc(pre.rank+" "+pre.name)}</b></div>`:`<label for="caWho">Who</label><select id="caWho" class="wsel"><option value="">Pick a person…</option>${(sec?[sec]:SECTIONS.map(s=>s[0])).map(k=>`<option value="SEC:${k}">Everyone in ${k}</option>`).join("")}${SECTIONS.map(s=>s[0]).concat("ATT").filter(k=>!sec||k===sec).map(k=>{const ms=people.filter(m=>m.sec===k);return ms.length?`<optgroup label="${k}">${ms.map(m=>`<option value="${m.id}"${calFor===m.id?" selected":""}>${esc(m.rank+" "+m.name)}</option>`).join("")}</optgroup>`:""}).join("")}</select>`}
    <div class="row2"><div><label for="caD">Date</label><input type="date" id="caD" value="${esc(iso)}" style="width:100%;padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)"></div><div><label for="caT">Time (optional)</label><input type="time" id="caT" style="width:100%;padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)"></div></div>
    <div class="row2"><div><label for="caTy">Type</label><select id="caTy" class="wsel">${CAL_TYPES.filter(x=>!["DUTY","DUE"].includes(x[0])).map(x=>`<option value="${x[0]}">${x[1]}</option>`).join("")}</select></div><div><label for="caE">Ends (optional)</label><input type="date" id="caE" style="width:100%;padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)"></div></div>
    <label for="caTi">What</label><input type="text" id="caTi" maxlength="60" placeholder="Dental, BAS appt, range, leave…">
    <label for="caNo">Note (optional)</label><input type="text" id="caNo" maxlength="80" placeholder="Where, who to see">
    <div id="caWarn"></div><button class="btn" id="caSave"${pre?` data-cafor="${pre.id}"`:""}>Add</button>${pre?"":`<button class="btn alt" id="caCancel">Cancel</button>`}</div>`}
function icsFor(list,name){const z=d=>d.replace(/-/g,"");const L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Accounted For//EN","CALSCALE:GREGORIAN"];const now=new Date().toISOString().replace(/[-:]/g,"").slice(0,15)+"Z";
  const esc2=s=>String(s||"").replace(/[\;,]/g,m=>"\\"+m).replace(/\n/g,"\\n");
  list.forEach((e,i)=>{L.push("BEGIN:VEVENT","UID:eop-"+z(e.d)+"-"+i+"-"+Math.random().toString(36).slice(2,8)+"@eopnumbers","DTSTAMP:"+now);
    if(e.tm){const [h,mi]=e.tm.split(":");L.push("DTSTART:"+z(e.d)+"T"+h+mi+"00","DURATION:PT1H")}else{const end=parseD(e.end&&e.end>e.d?e.end:e.d);end.setDate(end.getDate()+1);L.push("DTSTART;VALUE=DATE:"+z(e.d),"DTEND;VALUE=DATE:"+z(dkey(end)))}
    L.push("SUMMARY:"+esc2(e.ti+(e.m&&!name?" - "+e.m.rank+" "+lastOf(e.m):"")));if(e.no)L.push("DESCRIPTION:"+esc2(e.no));L.push("END:VEVENT")});
  L.push("END:VCALENDAR");return L.join("\r\n")}
function shareFile(text,name,type){const b=new Blob([text],{type});const f=new File([b],name,{type});if(navigator.canShare&&navigator.canShare({files:[f]})){navigator.share({files:[f],title:name}).catch(()=>{});return}
  const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();a.remove();toast("Saved "+name)}
function renderCal(){let h=banner();if(calSec==null)calSec=calSecDefault();const now=new Date();if(!calM)calM=[now.getFullYear(),now.getMonth()];const [Y,Mo]=calM;
  const first=new Date(Y,Mo,1),last=new Date(Y,Mo+1,0);const from=dkey(first),to=dkey(last);const all=calEntries(from,to,calSec);const multi=calEntries(dkey(new Date(Y,Mo-2,1)),to,calSec).filter(e=>e.end&&e.end>e.d);
  const onDay=k=>all.filter(e=>e.d===k).concat(multi.filter(e=>e.d<k&&e.end>=k));const today=dkey();if(!calDay)calDay=today;
  h+=`<h2 style="display:flex;justify-content:space-between;align-items:center">Calendar ${xlBtn("cal")}</h2>
    <div class="evts">${["ALL"].concat(SECTIONS.map(s=>s[0]),["ATT"]).map(k=>`<button data-csec="${k}" aria-pressed="${calSec===k}">${k==="ALL"?"Everyone":k}</button>`).join("")}</div>
    ${S.link&&calSec===S.link.mysec?`<p class="note">Your section. What you add here goes to ${esc(S.link.unit)}'s board calendar${S.link.ek?"":" once they send you a new link"}.</p>`:""}
    <div class="panel" style="padding:10px"><div style="display:flex;justify-content:space-between;align-items:center"><button class="chip" data-cmo="-1" style="cursor:pointer">◂</button><b>${["January","February","March","April","May","June","July","August","September","October","November","December"][Mo]} ${Y}</b><button class="chip" data-cmo="1" style="cursor:pointer">▸</button></div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-top:6px;text-align:center">${["S","M","T","W","T","F","S"].map(d=>`<div class="note" style="font-weight:700">${d}</div>`).join("")}${"<div></div>".repeat(first.getDay())}
    ${Array.from({length:last.getDate()},(_,i)=>{const k=dkey(new Date(Y,Mo,i+1));const es=onDay(k);const types=[...new Set(es.map(e=>e.ty))].slice(0,4);
      return `<button data-cday="${k}" style="border:1px solid ${k===calDay?"var(--brass)":"var(--line)"};background:${k===today?"var(--surface-2)":"transparent"};border-radius:8px;padding:5px 0 4px;min-height:46px;display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer"><span style="font-weight:${k===today?800:600}">${i+1}</span><span style="display:flex;gap:2px">${types.map(t=>`<i style="width:6px;height:6px;border-radius:50%;background:var(${ctype(t)[2]});display:block"></i>`).join("")}</span>${es.length>4?`<span style="font-size:9px;color:var(--muted)">${es.length}</span>`:""}</button>`}).join("")}</div>
    <div class="note" style="margin-top:6px">${CAL_TYPES.map(t=>`<span style="white-space:nowrap"><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(${t[2]})"></i> ${t[1]}</span>`).join(" &nbsp;")}</div></div>`;
  const dd=parseD(calDay);const es=onDay(calDay).length?onDay(calDay):calOn(calDay,calSec);
  h+=`<h2 style="display:flex;justify-content:space-between;align-items:center">${calDay===today?"Today · ":""}${DOW[dd.getDay()]} ${short(dd)} <button class="chip" id="caAddBtn" style="cursor:pointer">+ Add</button></h2>`;
  if(calAdd)h+=calForm(null);
  h+=es.length?`<div class="alist">${es.map(e=>calRow(e,false)).join("")}</div>`:`<p class="note">Nothing on this day.</p>`;
  const nx=calEntries(today,dkey(new Date(Date.now()+14*86400000)),calSec).filter(e=>e.d>today);
  if(nx.length)h+=`<h2>Next 14 days</h2><div class="alist">${nx.slice(0,60).map(e=>calRow(e,true)).join("")}</div>`;
  h+=`<div class="row2" style="margin-top:12px"><button class="btn alt" id="caIcs">Add these to my phone calendar</button><span></span></div><p class="note">Leave, TAD, duty, due-outs, events, EDD and EAS show up by themselves (marked auto). Add appointments here or on each person's card.</p>`;
  $("#main").innerHTML=h}

/* ---------- MY LOG: daily accomplishments ---------- */
const LOG_TAGS=["Mission","Training","Maintenance","Admin","Leadership","Self-improvement","Other"];let logR="week",logQ="",logTag="Mission",logEdit=null;
function logStreak(){const days=new Set(S.log.map(x=>x.d));let n=0;const d=new Date();if(!days.has(dkey(d)))d.setDate(d.getDate()-1);while(days.has(dkey(d))){n++;d.setDate(d.getDate()-1)}return n}
function logRange(){const t=today0();const from=new Date(t);if(logR==="week")from.setDate(from.getDate()-6);else if(logR==="month")from.setDate(from.getDate()-29);else if(logR==="90")from.setDate(from.getDate()-89);else return "0000";return dkey(from)}
function logList(){const f=logRange();const q=logQ.trim().toLowerCase();return S.log.filter(x=>x.d>=f&&(!q||(x.txt+" "+x.tag).toLowerCase().includes(q))).sort((a,b)=>b.d.localeCompare(a.d)||b.t-a.t)}
function logText(list){const by={};list.forEach(x=>(by[x.d]=by[x.d]||[]).push(x));return Object.keys(by).sort().map(d=>{const dd=parseD(d);return DOW[dd.getDay()]+" "+short(dd)+" "+String(dd.getFullYear()).slice(2)+"\n"+by[d].map(x=>"• "+x.txt+(x.tag?" ["+x.tag+"]":"")).join("\n")}).join("\n\n")}
function renderLog(){let h=S.source==="sample"?"":banner();const today=dkey();const tday=S.log.filter(x=>x.d===today);const st=logStreak();const mo=new Set(S.log.filter(x=>x.d>=dkey(new Date(Date.now()-29*86400000))).map(x=>x.d)).size;
  h+=`<h2 style="display:flex;justify-content:space-between;align-items:center">My log ${xlBtn("log")}</h2>
    <div class="tiles"><div class="tile on"><div class="lbl">Streak</div><div class="num" style="font-size:40px">${st}${st?"🔥":""}</div></div><div class="tile"><div class="lbl">Days logged · 30 days</div><div class="num" style="font-size:40px">${mo}</div></div></div>
    <div class="panel"><label for="lgTxt">What did you get done today?</label><textarea id="lgTxt" maxlength="500" style="min-height:80px" placeholder="Led PMCS on 3 dozers, found and fixed a hydraulic leak. Taught 4 Marines the 7-ton pre-op checklist."></textarea>
    <div class="evts">${LOG_TAGS.map(t=>`<button data-lgtag="${t}" aria-pressed="${logTag===t}">${t}</button>`).join("")}</div>
    <button class="btn" id="lgAdd">Add to today</button>
    <p class="note">Write the result and the numbers (how many, how fast, what it saved). Those make the best bullets for fitreps, evals and awards. Your log stays on this phone${S.sync&&S.sync.on?" and in your encrypted backup":""}.</p></div>`;
  if(tday.length)h+=`<h2>Today</h2><div class="alist">${tday.map(x=>logRow(x)).join("")}</div>`;
  h+=`<h2>Look back</h2><div class="evts">${[["week","7 days"],["month","30 days"],["90","90 days"],["all","All"]].map(([k,l])=>`<button data-lgr="${k}" aria-pressed="${logR===k}">${l}</button>`).join("")}</div>
    <input class="search" id="lgQ" type="search" placeholder="Search your log" value="${esc(logQ)}" style="margin-top:8px">`;
  const L=logList().filter(x=>x.d!==today||logQ);const by={};L.forEach(x=>(by[x.d]=by[x.d]||[]).push(x));
  h+=Object.keys(by).length?Object.keys(by).sort().reverse().map(d=>{const dd=parseD(d);return `<div class="mgrp"><h3><span>${DOW[dd.getDay()]} ${short(dd)} ${String(dd.getFullYear()).slice(2)}</span></h3>${by[d].map(x=>logRow(x)).join("")}</div>`}).join(""):`<p class="note">${S.log.length?"Nothing in this range.":"Your entries show up here."}</p>`;
  const all=logList();if(all.length)h+=`<div class="row2" style="margin-top:12px"><button class="btn alt" id="lgCopy">Copy as bullets</button><button class="btn alt" id="lgShare">Share / send</button></div>`;
  $("#main").innerHTML=h}
function logRow(x){return logEdit===x.id?`<div class="rrow"><textarea id="lgEd" maxlength="500" style="min-height:60px">${esc(x.txt)}</textarea><div class="row2"><button class="btn" data-lgsave="${x.id}">Save</button><button class="btn warn" data-lgdel="${x.id}">${armed==="lg"+x.id?"Tap again to delete":"Delete"}</button></div></div>`
  :`<div class="rrow" style="--sc:var(--s-onhand)"><div class="rtop"><div class="who" style="white-space:pre-wrap">${esc(x.txt)}<div class="ph">${esc(x.tag||"")}</div></div><button class="chip" data-lged="${x.id}" style="cursor:pointer">Edit</button></div></div>`}

/* ---------- Excel export ---------- */
const xd=s=>{const d=parseD(s);return d?dkey(d):(s||"")};
function xlSheets(kind){const sh={};const isoNow=dkey();
  if(kind==="all"||kind==="roster")sh.Roster=[["Rank","Name","Section","Status","Duty status","Status since","Detail","Location","Start","End / return","EDD","EAS","Phone","Alt phone","Parent unit","Weapon","Rack","Notes"]].concat(sorted(S.roster).map(m=>{const sn=sinceOf(m);
    return [m.rank,m.name,m.sec,m.status,dutyOf(m),sn?dkey(new Date(sn)):"",m.detail||"",m.loc||"",xd(m.start),xd(m.end),xd(m.edd),xd(m.eas),m.phone?fmtPh(m.phone):"",m.phone2?fmtPh(m.phone2):"",m.parent||"",m.wpn?m.wpn.t:"",m.wpn?m.wpn.rack:"",(m.notes||[]).map(n=>dkey(new Date(n.t))+": "+n.txt).join(" | ")]}));
  if(kind==="all"||kind==="ready"){const its=readyItems();sh.Readiness=[["Rank","Name","Section"].concat(its.map(i=>i.n+" due"),["Overdue","Due in 30 days"])].concat(sorted(S.roster.filter(m=>m.sec!=="ATT")).map(m=>{const r=its.map(it=>dueState(m,it));
    return [m.rank,m.name,m.sec].concat(its.map((it,i)=>{const x=((m.due||{})[it.n])||{};return x.due||(x.done?"done "+x.done:"")}),[its.filter((it,i)=>r[i].st==="over").map(i=>i.n).join(", "),its.filter((it,i)=>r[i].st==="soon").map(i=>i.n).join(", ")])}))}
  if(kind==="all"||kind==="trends"){const ks=Object.keys(S.days).sort();sh.Trends=[["Date","Strength","On hand","Present","% on hand","% present"].concat(SECTIONS.flatMap(([k])=>[k+" on hand",k+" strength"]))].concat(ks.map(k=>{const d=S.days[k];return [k,d.str,d.oh,d.pr,d.str?Math.round(100*d.oh/d.str):0,d.str?Math.round(100*d.pr/d.str):0].concat(SECTIONS.flatMap(([s])=>{const x=(d.sec||{})[s];return x?[x[0],x[1]]:["",""]}))}))}
  if(kind==="all"||kind==="duty"){const rows=[["Roster","Date","Day","Rank","Name","Section","Phone"]];for(const r of S.duty.rosters)for(const k of Object.keys(r.assign||{}).filter(k=>k>=isoNow).sort()){const m=S.roster.find(x=>x.id===r.assign[k]);const d=parseD(k);rows.push([r.name,k,DOW[d.getDay()],m?m.rank:"",m?m.name:"(removed)",m?m.sec:"",m&&m.phone?fmtPh(m.phone):""])}sh.Duty=rows}
  if(kind==="all"||kind==="events"){const rows=[["Event","Date","Type","Rank","Name","Section","Attended"]];for(const ev of S.events||[])for(const m of sorted(evReq(ev)))rows.push([ev.name,ev.date||"",ev.type||"",m.rank,m.name,m.sec,evDone(ev,m)?"Yes":"No"]);sh.Attendance=rows}
  if(kind==="all"||kind==="cal"){const from=dkey(new Date(Date.now()-30*86400000)),to=dkey(new Date(Date.now()+180*86400000));sh.Calendar=[["Date","Ends","Time","Type","What","Rank","Name","Section","Note","Source"]].concat(calEntries(from,to,kind==="cal"?calSec:"ALL").map(e=>[e.d,e.end&&e.end!==e.d?e.end:"",e.tm||"",ctype(e.ty)[1],e.ti,e.m?e.m.rank:"",e.m?e.m.name:(e.grp||""),e.m?e.m.sec:"",e.no||"",e.auto?"auto":e.from?e.from+" leader":"entered"]))}
  if(kind==="log")sh["My log"]=[["Date","Day","Tag","Accomplishment"]].concat(logList().slice().reverse().map(x=>{const d=parseD(x.d);return [x.d,DOW[d.getDay()],x.tag||"",x.txt]}));
  if(kind==="all"||kind==="feed")for(const f of S.feeds.filter(f=>f.lk)){const ps=(f.posts||[]).slice().reverse();if(!ps.length)continue;
    const rows=[["Rank","Name","Section"].concat(ps.map(p=>dkey(new Date(p.t))+" "+p.txt.slice(0,40)))];for(const m of sorted(S.roster)){const row=[m.rank,m.name,m.sec];for(const p of ps){if(!fdPool(p).some(x=>x.id===m.id)){row.push("n/a");continue}const a=((f.acks||{})[String(p.id)]||{})[m.id];row.push(a?(a.c===2?"Problem: "+a.note:"Got it"):"Not confirmed")}rows.push(row)}
    sh[("Feed "+f.unit).slice(0,31)]=rows}
  return sh}
async function exportXL(kind){try{const X=await loadXLSX();const wb=X.utils.book_new();const sh=xlSheets(kind);
    for(const [n,rows] of Object.entries(sh)){const ws=X.utils.aoa_to_sheet(rows);ws["!cols"]=(rows[0]||[]).map((h,i)=>({wch:Math.min(40,Math.max(8,...rows.slice(0,200).map(r=>String(r[i]??"").length)))}));X.utils.book_append_sheet(wb,ws,n.replace(/[\\/?*\[\]:]/g," ").slice(0,31))}
    if(!wb.SheetNames.length){toast("Nothing to export yet.");return}
    const buf=X.write(wb,{type:"array",bookType:"xlsx"});const name="EOP_Numbers_"+(kind==="all"?"All":cap(kind))+"_"+dkey()+".xlsx";const type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";const b=new Blob([buf],{type});
    const file=new File([b],name,{type});if(navigator.canShare&&navigator.canShare({files:[file]})){navigator.share({files:[file],title:name}).catch(()=>{});return}
    const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();a.remove();toast("Excel file saved")}
  catch(e){toast(e.message||"Couldn't build the Excel file here.")}}
const xlBtn=k=>`<button class="chip" data-xl="${k}" style="cursor:pointer;font-size:13px">⬇ Excel</button>`;

/* ---------- backup + sync: encrypted with a recovery code; server stores an unreadable blob ---------- */
const SYNC_SKIP=["sync","pushOn","link","ts","onb","role","me","ask","askSt","dev","hubMode","ws","wsCur","pendLink"];const CODE_AB="23456789ABCDEFGHJKMNPQRSTUVWXYZ";
let syncT=null,syncBusy=false,syncShow=false;
const fnv=str=>{let h=0x811c9dc5;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,0x01000193)}return (h>>>0).toString(36)+str.length.toString(36)};
const sig=v=>fnv(JSON.stringify(v===undefined?null:v));
function newCode(){const a=crypto.getRandomValues(new Uint8Array(24));return [...a].map(x=>CODE_AB[x%31]).join("").match(/.{4}/g).join("-")}
const normCode=c=>String(c||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
async function sha(str){return new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(str)))}
const hexOf=u=>[...u].map(b=>b.toString(16).padStart(2,"0")).join("");
async function codeKeys(code){const c=normCode(code);if(c.length!==24)throw new Error("The code has 24 letters and numbers.");
  return {id:hexOf(await sha("id:"+c)).slice(0,20),wk:hexOf(await sha("wk:"+c)),ek:await crypto.subtle.importKey("raw",await sha("ek:"+c),"AES-GCM",false,["encrypt","decrypt"])}}
async function gz(bytes,dir){const cs=dir?new CompressionStream("gzip"):new DecompressionStream("gzip");const st=new Blob([bytes]).stream().pipeThrough(cs);return new Uint8Array(await new Response(st).arrayBuffer())}
function syncObj(){const o={};for(const k of Object.keys(S))if(!SYNC_SKIP.includes(k))o[k]=S[k];return o}
async function sealObj(K,o){let b=new TextEncoder().encode(JSON.stringify(o));let flag=0;if(window.CompressionStream){try{b=await gz(b,true);flag=1}catch(e){}}
  const pl=new Uint8Array(b.length+1);pl[0]=flag;pl.set(b,1);const iv=crypto.getRandomValues(new Uint8Array(12));const ct=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},K.ek,pl));const a=new Uint8Array(12+ct.length);a.set(iv);a.set(ct,12);return b64e(a)}
async function openBlob(K,s){const a=b64d(s);let pl;try{pl=new Uint8Array(await crypto.subtle.decrypt({name:"AES-GCM",iv:a.slice(0,12)},K.ek,a.slice(12)))}catch(e){throw new Error("Couldn't unlock that backup. Check the code.")}
  let b=pl.slice(1);if(pl[0]===1){if(!window.DecompressionStream)throw new Error("This browser can't open compressed backups. Update it and try again.");b=await gz(b,false)}return JSON.parse(new TextDecoder().decode(b))}
function setBase(o){const Y=S.sync;Y.baseSig={};for(const k of Object.keys(o))if(k!=="roster")Y.baseSig[k]=sig(o[k]);Y.baseMem={};for(const m of o.roster||[])Y.baseMem[m.id]=sig(m)}
function mergeRemote(R){const Y=S.sync;const bs=Y.baseSig||{},bm=Y.baseMem||{};
  const keys=new Set(Object.keys(S).concat(Object.keys(R)));
  for(const k of keys){if(SYNC_SKIP.includes(k)||k==="roster")continue;const localChanged=(k in bs)?sig(S[k])!==bs[k]:(k in S);if(!localChanged){if(k in R)S[k]=R[k];else delete S[k]}}
  const L={},RR={};S.roster.forEach(m=>L[m.id]=m);(R.roster||[]).forEach(m=>RR[m.id]=m);const out=[];const seen=new Set();
  const pick=id=>{if(seen.has(id))return;seen.add(id);const l=L[id],r=RR[id],b=bm[id];
    if(l&&r){out.push(sig(l)!==b?l:r);return}
    if(l&&!r){if(!b||sig(l)!==b)out.push(l);return}
    if(!l&&r){if(!b||sig(r)!==b)out.push(r)}};
  (R.roster||[]).forEach(m=>pick(m.id));S.roster.forEach(m=>pick(m.id));S.roster=out;setBase(R)}
const ROLE_N={oic:"OIC (owner)",co:"Same rights as the OIC",sncoic:"SNCOIC (can edit)",view:"View only",newoic:"Incoming OIC"};
const role=()=>S.role||"oic";const canEdit=()=>role()!=="view";const isOwner=()=>role()==="oic"||role()==="newoic"||role()==="co";
function denyMsg(){toast(role()==="view"?"This phone is view-only.":"Only the OIC's phone can do that.")}
function syncSchedule(){if(!S.sync||!S.sync.on||!canEdit())return;clearTimeout(syncT);syncT=setTimeout(()=>syncPush(),8000)}
async function syncPush(force){const Y=S.sync;if(!Y||!Y.on||syncBusy||!canEdit())return;if(S.source==="sample"&&!force)return;syncBusy=true;
  try{const o=syncObj();const h=sig(o);if(!force&&h===Y.last)return;const K=await codeKeys(Y.code);if((Y.ver||0)>0){const cv=await SB.rpc("backup_ver",{p_id:K.id,p_key:K.wk});if(cv==null){Y.err="This board was turned over or its cloud copy deleted. If you handed it off, erase this phone in Security.";rawSave();return}}const ct=await sealObj(K,o);
    try{const v=await SB.rpc("backup_put",{p_id:K.id,p_key:K.wk,p_ct:ct,p_base:Y.ver||null});Y.ver=+v;Y.last=h;Y.at=Date.now();Y.err="";setBase(o)}
    catch(e){if(/conflict/.test(e.message)){syncBusy=false;await syncPull(true);syncBusy=true;const o2=syncObj();const ct2=await sealObj(K,o2);const v=await SB.rpc("backup_put",{p_id:K.id,p_key:K.wk,p_ct:ct2,p_base:Y.ver});Y.ver=+v;Y.last=sig(o2);Y.at=Date.now();Y.err="";setBase(o2)}else throw e}
    rawSave()}
  catch(e){Y.err=String(e.message||e).slice(0,90);rawSave();clearTimeout(syncT);syncT=setTimeout(()=>syncPush(),60000)}finally{syncBusy=false;if(view==="data")tabRedraw()}}
async function syncPull(quiet){const Y=S.sync;if(!Y||!Y.on||syncBusy)return false;syncBusy=true;let changed=false;
  try{const K=await codeKeys(Y.code);const v=await SB.rpc("backup_ver",{p_id:K.id,p_key:K.wk});if(v==null){Y.err=["view","sncoic","co"].includes(role())?"Your access to this board ended. Ask the OIC for a new link.":role()==="oic"&&Y.ver>0?"This board was turned over or its cloud copy deleted. If you handed it off, erase this phone in Security.":"Backup not found in the cloud. Tap Back up now.";return false}
    if(+v>(Y.ver||0)){const rows=await SB.rpc("backup_get",{p_id:K.id,p_key:K.wk});const r=rows&&rows[0];if(r){const R=await openBlob(K,r.ct);mergeRemote(R);Y.ver=+r.ver;Y.pulled=Date.now();changed=true;
      const {secs}=S;if(Array.isArray(secs)&&secs.length)SECTIONS.splice(0,SECTIONS.length,...secs);secFix()}}
    Y.err="";rawSave();
    if(changed){if(!quiet){const y=window.scrollY;const a=document.activeElement&&document.activeElement.tagName;if(a!=="INPUT"&&a!=="TEXTAREA"){render();window.scrollTo(0,y)}toast("Synced from your other phone")}if(sig(syncObj())!==Y.last)syncSchedule()}}
  catch(e){Y.err=String(e.message||e).slice(0,90);rawSave()}finally{syncBusy=false}return changed}
function rawSave(){try{const t=JSON.stringify(S);if(window.VAULT&&VAULT.on())VAULT.write(t);else localStorage.setItem(KEY,t)}catch(e){}}
every(60000,()=>{if(S.sync&&S.sync.on)syncPull()},"sync");
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&S.sync&&S.sync.on)syncPull()});
async function syncRestore(code){const K=await codeKeys(code);const rows=await SB.rpc("backup_get",{p_id:K.id,p_key:K.wk});const r=rows&&rows[0];if(!r)throw new Error("No backup found for that code.");
  const R=await openBlob(K,r.ct);return {R,ver:+r.ver,at:Date.parse(r.updated_at)||Date.now()}}
function applyRestore(code,x,r,w){const tgt=w==="co"?"co":"plt";if((S.wsCur||"plt")!==tgt){if(S.source!=="sample"||S.board||S.feeds.length)wsStash();S.wsCur=tgt;if(S.ws)delete S.ws[tgt]}const keep={};for(const k of SYNC_SKIP)if(k in S)keep[k]=S[k];
  for(const k of Object.keys(S))if(!SYNC_SKIP.includes(k))delete S[k];Object.assign(S,x.R);
  S.sync={on:true,code:normCode(code).match(/.{4}/g).join("-"),ver:x.ver,at:x.at,err:"",last:""};S.role=["sncoic","view","newoic","co"].includes(r)?r:"sncoic";S.onb=true;for(const k of ["pushOn","ts","link"])if(k in keep)S[k]=keep[k];
  setBase(x.R);S.sync.last=sig(syncObj());rawSave();try{history.replaceState(null,"",location.pathname+(tgt==="co"?"#co":""))}catch(e){}location.reload()}
function syncHTML(){const Y=S.sync;
  if(!Y||!Y.on)return `<h2>Backup and sync</h2><div class="panel"><p class="note">Back up everything (roster, numbers, feeds, readiness, duty, history) to your server, <b>encrypted on this phone</b> with a recovery code. Restore on a new phone, or keep a second phone (your SNCOIC's) in sync. The server can't read it.</p>
    <button class="btn" id="syOn">Turn on backup</button>
    <label for="syCode">Have a code? Restore here or link this phone</label><input type="text" id="syCode" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" autocapitalize="characters" autocomplete="off" style="text-transform:uppercase"><button class="btn alt" id="syRestore">Restore from code</button><div class="note" id="syOut"></div></div>`;
  return `<h2>Backup and sync</h2><div class="panel"><div><b style="color:var(${Y.err?"--warn":"--s-onhand"})">${Y.err?"⚠ "+esc(Y.err):"● Backed up"}</b>${Y.at?" · last "+ago(Y.at):""}${Y.ver?" · version "+Y.ver:""}</div>
    <p class="note">Changes back up about 8 seconds after you make them. Other phones using this code pick them up within a minute.</p>
    <div class="row2"><button class="btn" id="syNow">Back up now</button><button class="btn alt" id="syShow">${syncShow?"Hide code":"Show recovery code"}</button></div>
    ${syncShow?`<div style="font-family:ui-monospace,Menlo,monospace;font-size:18px;font-weight:800;letter-spacing:.06em;text-align:center;padding:10px;border:2px dashed var(--brass);border-radius:10px" data-noxl>${esc(Y.code)}</div>
      <p class="note"><b>Write this down or save it in your password manager.</b> Without it, a lost phone means lost data; there is no reset. Anyone with it can read and change your board.</p>
      <div class="row2"><button class="btn alt" id="syCopy">Copy code</button><span></span></div>
      ${isOwner()?`<div class="note"><b>Add another phone:</b></div><div class="row2">${[["co","Same as me"],["sncoic","SNCOIC (can edit)"],["view","View only"]].map(([r,l])=>`<a class="btn alt" href="${esc("sms:?&body="+encodeURIComponent("Accounted For: open this on your phone to link to my board as "+ROLE_N[r]+" (keep it private): "+PUB()+"#sync="+normCode(Y.code)+"&r="+r))}">${l}</a>`).join("")}</div>`:""}`:""}
    <div class="note">This phone: <b>${esc(ROLE_N[role()]||role())}</b>. Roles are enforced by the app; anyone holding the recovery code can read the board, so share it only with people you trust.</div>
    <div class="row2"><button class="btn alt" id="syOff">${armed==="syoff"?"Tap again to stop":"Stop on this phone"}</button>${isOwner()?`<button class="btn warn" id="syDel">${armed==="sydel"?"Tap again: delete cloud copy":"Delete cloud copy"}</button>`:"<span></span>"}</div></div>${turnoverHTML()}`}
function turnoverHTML(){const Y=S.sync;if(!Y||!Y.on)return"";
  if(role()==="newoic")return `<h2>Complete turnover</h2><div class="panel" style="border-color:var(--brass)"><p class="note">You were handed this board. Taking over gives it a <b>new recovery code</b> and deletes the old cloud copy, so the outgoing leader's phone stops syncing.</p>
    <label class="tog"><input type="checkbox" id="toLinks"> Also issue new section-leader links (old ones stop working; resend from Live sections)</label>
    <label class="tog"><input type="checkbox" id="toFeed"> Also start a fresh Feed (members rejoin with a new link)</label>
    <button class="btn" id="toGo">${armed==="togo"?"Tap again to take over now":"Take over this board"}</button><div class="note" id="toOut"></div></div>`;
  if(role()!=="oic")return"";
  return `<h2>Turnover</h2><div class="panel"><p class="note">PCSing or handing off? Send the incoming OIC a link. On their phone they tap <b>Take over</b>; the board gets a new code and your phone stops syncing. Then you can erase this phone.</p>
    <a class="btn alt" href="${esc("sms:?&body="+encodeURIComponent("Accounted For turnover: open this on your phone to take over the "+unitName()+" board (keep it private): "+PUB()+"#sync="+normCode(Y.code)+"&r=newoic"))}">Text turnover link to incoming OIC</a></div>`}
async function turnoverGo(){const o=$("#toOut");const say=t=>{if(o)o.textContent=t};const old=S.sync.code;
  try{say("Making a new code…");const code=newCode();const K=await codeKeys(code);const ct=await sealObj(K,syncObj());const v=await SB.rpc("backup_put",{p_id:K.id,p_key:K.wk,p_ct:ct,p_base:null});
    S.sync={on:true,code,ver:+v,at:Date.now(),err:"",last:""};setBase(syncObj());S.sync.last=sig(syncObj());S.role="oic";rawSave();
    say("Retiring the old copy…");try{const OK=await codeKeys(old);await SB.rpc("backup_delete",{p_id:OK.id,p_key:OK.wk})}catch(e){}
    if(($("#toLinks")||{}).checked&&S.board){say("New section links…");const B=S.board;try{await SB.rpc("delete_board",{p_board:B.id,p_read_key:B.rk})}catch(e){}await boardCreate()}
    if(($("#toFeed")||{}).checked){say("Fresh feed…");for(const f of S.feeds.filter(f=>f.lk)){try{await SB.rpc("delete_feed",{p_feed:f.id,p_leader_key:f.lk})}catch(e){}}S.feeds=S.feeds.filter(f=>!f.lk);await fdCreate()}
    save();syncShow=true;tabRedraw();toast("You're the OIC. Save your new recovery code.")}
  catch(e){say("Couldn't finish: "+(e.message||e)+". Nothing was lost; try again with signal.")}}
function syncJoinPrompt(code,r,w){try{history.replaceState(null,"",location.pathname)}catch(e){}sheetCtx={kind:"sync",code,r,w:w==="co"?"co":"plt"};
  $("#sheetT").innerHTML=`Link this phone?<small>Loads the backed-up board from the other phone and keeps both in sync. This phone will be: <b>${esc(ROLE_N[["sncoic","view","newoic","co"].includes(r)?r:"sncoic"])}</b>.</small>`;
  $("#sheetOpts").innerHTML=`<div class="panel" style="margin:0" data-noxl><p class="note"><b>This replaces what's on this phone</b> with the backup. Your PIN lock and text size stay.</p><button class="btn" id="syJoin">Load and link</button><button class="btn alt" data-sclose="1">Not now</button><div class="note" id="syJOut"></div></div>`;
  const sh=$("#sheet");sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add("open")))}

/* ---------- READY: readiness and due-outs ---------- */
const READY_DEF={
 military:[["Initial counseling",0],["Quarterly counseling",3],["PFT",12],["CFT",12],["Rifle qual",12],["Annual training",12],["PHA",12],["Dental",12],["Driver's license",48],["Fitness report",6]],
 police:[["Evaluation",12],["Firearms qual",6],["Use of force training",12],["CPR / First aid",24],["Physical",12],["Driver's license",48],["Annual training",12]],
 jobs:[["Safety orientation",0],["OSHA 10/30",60],["First aid / CPR",24],["Forklift cert",36],["Driver's license",48],["Drug test",12],["Performance review",12]],
 hr:[["Performance review",12],["Compliance training",12],["Harassment training",12],["Certification",24],["Benefits enrollment",12],["Onboarding paperwork",0]],
 civilian:[["Waiver",12],["Background check",24],["CPR / First aid",24],["Training",12],["Dues",12]]};READY_DEF.custom=READY_DEF.civilian;
function readyItems(){const k=MODES[S.mode]?S.mode:"military";if(!Array.isArray(S.ready[k]))S.ready[k]=READY_DEF[k].map(([n,mo])=>({n,mo}));return S.ready[k]}
const isoToday=()=>dkey();
function addMonths(iso,mo){const [y,m,d]=iso.split("-").map(Number);const t=new Date(y,m-1+mo,d);return dkey(t)}
function dueState(m,it){const r=((m.due||{})[it.n])||{};const t=today0();
  if(r.due){const d=parseD(r.due);const dd=d?Math.round((d-t)/86400000):0;if(dd<0)return {st:"over",col:"--warn",dd,iso:r.due,txt:"Overdue "+(-dd)+" d · was due "+short(d)};if(dd<=30)return {st:"soon",col:"--s-duty",dd,iso:r.due,txt:"Due in "+dd+" d · "+short(d)};return {st:"ok",col:"--s-onhand",dd,iso:r.due,txt:"Due "+short(d)+" "+String(d.getFullYear()).slice(2)}}
  if(r.done){const d=parseD(r.done);return {st:"ok",col:"--s-onhand",dd:9999,iso:"",txt:"Done "+(d?short(d)+" "+String(d.getFullYear()).slice(2):"")}}
  return {st:"none",col:"--muted",dd:99999,iso:"",txt:"Not set"}}
function dueRows(m){return readyItems().map(it=>Object.assign({item:it.n},dueState(m,it)))}
function readySum(){const its=readyItems();let over=0,soon=0,none=0;const pool=S.source==="sample"?[]:S.roster.filter(m=>m.sec!=="ATT");
  for(const m of pool)for(const it of its){const st=dueState(m,it).st;if(st==="over")over++;else if(st==="soon")soon++;else if(st==="none")none++}
  return {items:pool.some(m=>m.due&&Object.keys(m.due).length)?its.length:0,over,soon,none}}
function markDone(m,name){const it=readyItems().find(x=>x.n===name);if(!it)return;m.due=m.due||{};const today=isoToday();m.due[name]=it.mo?{due:addMonths(today,it.mo),done:today}:{due:"",done:today}}
function parseAnyDate(v){if(v==null)return"";let s=String(v).trim();if(!s)return"";
  if(/^\d{5}(\.\d+)?$/.test(s)){const n=+s;if(n>20000&&n<80000){const d=new Date(Date.UTC(1899,11,30)+Math.round(n)*86400000);return d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0")+"-"+String(d.getUTCDate()).padStart(2,"0")}}
  let m=s.match(/^(\d{4})(\d{2})(\d{2})$/);if(m)return m[1]+"-"+m[2]+"-"+m[3];
  m=s.match(/^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})/);if(m)return m[1]+"-"+m[2].padStart(2,"0")+"-"+m[3].padStart(2,"0");
  m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);if(m){const y=m[3].length===2?"20"+m[3]:m[3];return y+"-"+m[1].padStart(2,"0")+"-"+m[2].padStart(2,"0")}
  m=s.toUpperCase().match(/^(\d{1,2})\s*([A-Z]{3})[A-Z]*\s*(\d{2,4})$/);if(m){const mo=MON.indexOf(m[2]);if(mo>=0){const y=m[3].length===2?"20"+m[3]:m[3];return y+"-"+String(mo+1).padStart(2,"0")+"-"+m[1].padStart(2,"0")}}
  return ""}
function importReady(text){const rows=parseCSV(text).filter(r=>r.some(x=>x));const its=readyItems();let hi=-1,cols={},nameC=[];
  for(let i=0;i<Math.min(rows.length,15);i++){const h=rows[i].map(x=>x.toLowerCase());const nc=h.map((x,j)=>/name|last|first|marine|member|employee|rank/.test(x)?j:-1).filter(j=>j>=0);
    const ic={};its.forEach(it=>{const k=it.n.toLowerCase().replace(/[^a-z0-9]/g,"");const j=h.findIndex(x=>{const y=x.replace(/[^a-z0-9]/g,"");return y&&(y===k||y.includes(k)||k.includes(y)&&y.length>=3)});if(j>=0&&!nc.includes(j))ic[it.n]=j});
    if(nc.length&&Object.keys(ic).length){hi=i;cols=ic;nameC=nc;break}}
  if(hi<0)throw new Error("Couldn't find a header row with a name column and at least one item column ("+its.map(x=>x.n).slice(0,4).join(", ")+"…). Item columns must use the same names as in READY.");
  let ok=0,set=0;const miss=[];
  for(const r of rows.slice(hi+1)){const who=nameC.map(j=>r[j]||"").join(" ").replace(/[^A-Za-z ,.'-]/g," ");if(!who.trim())continue;const m=matchMarine(who);if(!m){miss.push(who.trim().slice(0,30));continue}ok++;
    for(const [n,j] of Object.entries(cols)){const d=parseAnyDate(r[j]);if(!d)continue;m.due=m.due||{};m.due[n]={due:d,done:(m.due[n]||{}).done||""};set++}}
  save();return {ok,set,miss,items:Object.keys(cols)}}
let rdItem="",rdEdit=false;
function readyText(){const its=readyItems();const pool=S.roster.filter(m=>m.sec!=="ATT");const L=[unitName()+" READINESS "+dtg()];const R=readySum();L.push("OVERDUE: "+R.over+" · DUE 30 DAYS: "+R.soon);
  for(const it of its){const o=sorted(pool.filter(m=>dueState(m,it).st==="over"));const sn=sorted(pool.filter(m=>dueState(m,it).st==="soon"));if(!o.length&&!sn.length)continue;
    L.push("");L.push(it.n.toUpperCase()+": "+o.length+" OVERDUE"+(sn.length?", "+sn.length+" DUE SOON":""));o.forEach(m=>L.push("- "+m.sec+" "+m.rank+" "+lastOf(m)+" (OVERDUE)"));sn.forEach(m=>L.push("- "+m.sec+" "+m.rank+" "+lastOf(m)+" ("+short(parseD(m.due[it.n].due))+")"))}
  return RT(L.join("\n"))}
function renderReady(){let h=banner();const its=readyItems();const pool=S.roster.filter(m=>m.sec!=="ATT");const R=readySum();
  h+=`<h2 style="display:flex;justify-content:space-between;align-items:center">Readiness ${xlBtn("ready")}</h2><div class="tiles"><div class="tile${R.over?"":" on"}"><div class="lbl">Overdue</div><div class="num" style="color:var(${R.over?"--warn":"--s-onhand"})">${R.over}</div></div><div class="tile"><div class="lbl">Due in 30 days</div><div class="num" style="color:var(--s-duty)">${R.soon}</div></div></div>`;
  h+=`<div class="gridwrap" style="margin-top:12px"><table><thead><tr><th>Item</th>${SECTIONS.map(([k])=>`<th>${k}</th>`).join("")}<th class="tot">Total</th></tr></thead><tbody>${its.map(it=>{const cell=ms=>{const o=ms.filter(m=>dueState(m,it).st==="over").length,sn=ms.filter(m=>dueState(m,it).st==="soon").length,no=ms.filter(m=>dueState(m,it).st==="none").length;
      return o?`<b style="color:var(--warn)">${o}</b>${sn?` <span style="color:var(--s-duty)">+${sn}</span>`:""}`:sn?`<span style="color:var(--s-duty)">${sn}</span>`:no===ms.length&&ms.length?`<span class="z">—</span>`:`<span style="color:var(--s-onhand)">✓</span>`};
    return `<tr><td><button class="chip" data-rditem="${esc(it.n)}" aria-pressed="${rdItem===it.n}" style="cursor:pointer">${esc(it.n)}</button></td>${SECTIONS.map(([k])=>`<td>${cell(pool.filter(m=>m.sec===k))}</td>`).join("")}<td class="tot">${cell(pool)}</td></tr>`}).join("")}</tbody></table></div>
    <p class="note"><b style="color:var(--warn)">Red</b> = overdue · <span style="color:var(--s-duty)">yellow</span> = due in 30 days · ✓ all set · — not entered yet. Tap an item to list people.</p>`;
  const list=[];for(const m of pool)for(const it of its){if(rdItem&&it.n!==rdItem)continue;const d=dueState(m,it);if(d.st==="over"||d.st==="soon"||(rdItem&&d.st==="none"))list.push({m,it,d})}
  list.sort((a,b)=>a.d.dd-b.d.dd);
  h+=`<h2>${rdItem?esc(rdItem)+" · needs action":"Overdue and due in 30 days"} (${list.length})</h2>${rdItem?`<button class="chip" data-rditem="" style="cursor:pointer">Show all items</button>`:""}`;
  h+=list.length?`<div class="alist" style="margin-top:6px">${list.slice(0,150).map(x=>`<div class="rrow" style="--sc:var(${x.d.col})"><div class="rtop"><div class="who" data-pcard="${x.m.id}" style="cursor:pointer"><b>${esc(x.m.rank)}</b> ${esc(x.m.name)}<div class="ph">${x.m.sec} · ${esc(x.it.n)} · ${x.d.txt}</div></div><button class="chip" data-rddone="${x.m.id}" data-rdn="${esc(x.it.n)}" style="cursor:pointer">Done today</button></div></div>`).join("")}</div>`:`<p class="note">Nothing needs action${R.items?"":" yet. Load dates below or set them on each person's card"}.</p>`;
  if(list.length)h+=`<div class="panel"><textarea readonly>${esc(readyText())}</textarea><div class="row2"><a class="btn" href="${esc(smsHref(readyText()))}">Text it</a><button class="btn alt" id="rdCopy">Copy</button></div></div>`;
  h+=`<h2>Load dates</h2><div class="panel"><label for="rdFile">Excel or CSV with a name column and one column per item (next due date)</label><input type="file" id="rdFile" accept=".csv,.txt,.xlsx,.xls,text/csv">
    <label for="rdPaste">Or paste rows</label><textarea id="rdPaste" style="min-height:70px" placeholder="Name,PFT,CFT,Rifle qual&#10;SMITH JOHN,2027-06-30,2027-09-30,15 MAR 27"></textarea><button class="btn" id="rdGo">Read dates</button><div class="note" id="rdOut"></div>
    <p class="note">Dates like 2027-06-30, 06/30/2027, 30 JUN 27 or Excel dates all work. Names match your roster. You can also set or update any date on the person's card. Store due dates only, not medical details.</p></div>`;
  h+=`<details class="panel"${rdEdit?" open":""}><summary><b>Items tracked</b> · ${its.length}</summary>${its.map((it,i)=>`<div class="rtop"><div class="who">${esc(it.n)}<div class="ph">${it.mo?"Repeats every "+it.mo+" months":"One time"}</div></div><button class="chip" data-rdrm="${i}" style="cursor:pointer">${armed==="rdrm"+i?"Remove?":"✕"}</button></div>`).join("")}
    <div class="row2"><input type="text" id="rdNew" maxlength="30" placeholder="New item (e.g. Swim qual)"><select id="rdMo" class="wsel">${[[0,"One time"],[1,"Monthly"],[3,"Every 3 months"],[6,"Every 6 months"],[12,"Yearly"],[24,"Every 2 years"],[36,"Every 3 years"]].map(([v,l])=>`<option value="${v}"${v===12?" selected":""}>${l}</option>`).join("")}</select></div><button class="btn alt" id="rdAdd">Add item</button></details>`;
  $("#main").innerHTML=h}

/* ---------- CONFLICT CHECKER ---------- */
const CF_HARD=new Set(["LEAVE","TAD"]);
function cfCovers(e,day){return e.d<=day&&(e.end&&e.end>e.d?e.end:e.d)>=day}
function busyOn(m,day,ctx){ctx=ctx||{};const out=[];const add=(ty,hard,why,sh)=>out.push({ty,hard,why,s:sh||why});
  if(AWAY.includes(m.status)){const s0=isoOf(m.start),e0=isoOf(m.end);if((!s0||day>=s0)&&(!e0||day<=e0)&&(e0||day>=dkey()))add("STATUS",true,(SHORT[m.status]||m.status)+(e0?" thru "+short(parseD(e0)):" (no return date)"),SHORT[m.status]||m.status)}
  const seen=new Set();const calE=(e,src)=>{if(ctx.cal&&e.id===ctx.cal)return;if(!cfCovers(e,day))return;const key=e.d+"|"+e.ti+"|"+(e.tm||"");if(seen.has(key))return;seen.add(key);
    const hard=CF_HARD.has(e.ty)||(e.ty==="TRNG"&&!e.tm);add(e.ty,hard,ctype(e.ty)[1]+": "+e.ti+(e.tm?" "+e.tm:"")+(src?" (from "+src+")":""),(e.tm?e.tm+" ":"")+e.ti)};
  (m.cal||[]).forEach(e=>calE(e,""));
  const nk=fullK(m);for(const [sec,c] of Object.entries(S.secCal||{}))for(const e of c.e||[])if(e.nk===nk)calE(e,sec+" leader");
  for(const r of S.duty.rosters)if(r.id!==ctx.roster&&(r.assign||{})[day]===m.id)add("DUTY",true,"Duty: "+r.name,r.name);
  for(const ev of S.events||[]){if(ev.id===ctx.event)continue;const d=isoOf(ev.date)||ev.date;if(d===day&&evReq(ev).some(x=>x.id===m.id))add("EVENT",false,"Event: "+ev.name,ev.name)}
  if(ctx.lim&&dutyOf(m)==="LIMDU")add("LIMDU",false,"LIMDU","LIMDU");
  return out}
const cfCol=list=>list.some(x=>x.hard)?"--warn":"--s-duty";
function cfLine(list){return list.map(x=>`<span style="color:var(${x.hard?"--warn":"--s-duty"});font-weight:700">⚠ ${esc(x.why)}</span>`).join(" · ")}
function daysIn(a,b,cap){const out=[];const d=parseD(a);const e=parseD(b&&b>a?b:a);if(!d||!e)return out;for(let i=0;i<(cap||31)&&d<=e;i++){out.push(dkey(d));d.setDate(d.getDate()+1)}return out}
function upcomingConflicts(n){n=n||14;const out=[];const t=today0();
  for(let i=0;i<n;i++){const d=new Date(t);d.setDate(d.getDate()+i);const k=dkey(d);
    for(const r of S.duty.rosters){const id=(r.assign||{})[k];const m=id&&S.roster.find(x=>x.id===id);if(!m)continue;const cf=busyOn(m,k,{roster:r.id,lim:r.skipLim});if(cf.length)out.push({d:k,m,what:r.name,kind:"duty",cf})}
    for(const ev of S.events||[]){const ed=isoOf(ev.date)||ev.date;if(ed!==k)continue;for(const m of evReq(ev)){const cf=busyOn(m,k,{event:ev.id}).filter(x=>x.hard);if(cf.length)out.push({d:k,m,what:ev.name,kind:"event",cf})}}}
  return out}
function cfRow(c){const dd=parseD(c.d);return `<div class="rrow" style="--sc:var(${cfCol(c.cf)})"><div class="who"><b>${DOW[dd.getDay()]} ${short(dd)} · ${esc(c.what)}</b><div class="ph"><span data-pcard="${c.m.id}" style="cursor:pointer;text-decoration:underline">${esc(c.m.rank+" "+c.m.name)}</span> · ${esc(c.m.sec)}</div><div class="ph">${cfLine(c.cf)}</div></div>${c.kind==="duty"?`<button class="chip" data-go="duty" style="cursor:pointer">Fix in DUTY</button>`:""}</div>`}

/* ---------- DUTY roster ---------- */
const DUTY_SKIP=["Leave","TAD","Operation","Appointment off Base"];let dSel=null,dSetup=false,dSwap=null;
function dCur(){return S.duty.rosters.find(r=>r.id===dSel)||S.duty.rosters[0]||null}
function dPool(r){const ex=r.excl||{};return sorted(S.roster.filter(m=>(m.sec==="ATT"?r.att:r.secs.includes(m.sec))&&!ex[m.id]))}
function dOrder(r){const pool=dPool(r);const ids=new Set(pool.map(m=>m.id));r.order=(r.order||[]).filter(id=>ids.has(id));for(const m of pool)if(!r.order.includes(m.id))r.order.push(m.id);return r.order}
function dElig(r,m,day){if(r.skipLim&&dutyOf(m)==="LIMDU")return false;if((r.skip||[]).includes(m.status)){const e=parseD(m.end);if(!e)return dkey(today0())!==day&&false;if(day<=dkey(e))return false}if(busyOn(m,day,{roster:r.id}).some(x=>x.hard&&x.ty!=="STATUS"))return false;return true}
function dGen(r,n,fromToday){const order=dOrder(r);if(!order.length)return 0;r.assign=r.assign||{};const t=today0();let made=0;
  if(fromToday)for(const k of Object.keys(r.assign))if(k>=dkey(t))delete r.assign[k];
  let last=null;for(let i=0;i<n;i++){const d=new Date(t);d.setDate(d.getDate()+i);const k=dkey(d);if(r.assign[k]){last=r.assign[k];continue}
    for(let tries=0;tries<order.length;tries++){const id=order[(r.ptr||0)%order.length];r.ptr=((r.ptr||0)+1)%order.length;const m=S.roster.find(x=>x.id===id);if(m&&id!==last&&dElig(r,m,k)){r.assign[k]=id;last=id;made++;break}}}
  for(const k of Object.keys(r.assign)){const d=parseD(k);if(d&&(t-d)/86400000>60)delete r.assign[k]}save();return made}
function nextDuties(m){const out=[];const t=dkey(today0());for(const r of S.duty.rosters){const k=Object.keys(r.assign||{}).filter(k=>k>=t&&r.assign[k]===m.id).sort()[0];if(k){const d=parseD(k);out.push({roster:r.name,day:(k===t?"TODAY ":"")+["SUN","MON","TUE","WED","THU","FRI","SAT"][d.getDay()]+" "+short(d)})}}return out}
const DOW=["SUN","MON","TUE","WED","THU","FRI","SAT"];
function dutyText(r,n){const t=today0();const L=[(r.name||"DUTY").toUpperCase()+" ROSTER "+dtg()];for(let i=0;i<n;i++){const d=new Date(t);d.setDate(d.getDate()+i);const id=(r.assign||{})[dkey(d)];const m=id&&S.roster.find(x=>x.id===id);L.push(DOW[d.getDay()]+" "+short(d)+": "+(m?m.sec+" "+m.rank+" "+lastOf(m):"OPEN"))}return RT(L.join("\n"))}
function renderDuty(){let h=banner();const r=dCur();
  if(S.duty.rosters.length>1)h+=`<div class="evts" style="margin-top:10px">${S.duty.rosters.map(x=>`<button data-dsel="${x.id}" aria-pressed="${x===r}">${esc(x.name)}</button>`).join("")}</div>`;
  if(!r||dSetup==="new"){h+=`<h2>Duty roster</h2><div class="panel"><p class="note">Build a rotation that skips people on leave, TAD or ops (until their return date) and LIMDU if you want. Swap any day with one tap. Each person's card shows their next duty.</p>
      <label for="dNm">Roster name</label><input type="text" id="dNm" maxlength="24" placeholder="Duty NCO" value="${r?"":"Duty NCO"}"><button class="btn" id="dMake">Create roster</button>${r?`<button class="btn alt" id="dCancel">Cancel</button>`:""}</div>`;$("#main").innerHTML=h;return}
  const pool=dPool(r);const t=today0();
  h+=`<div class="sechead" style="margin-top:12px"><h2>${esc(r.name)}</h2><div class="ratio" style="font-size:13px">${pool.length} in rotation ${xlBtn("duty")}</div></div>`;
  if(!pool.length)h+=`<p class="note" style="color:var(--warn)">No one in this rotation. Open Setup and pick sections.</p>`;
  h+=`<div class="row2"><button class="btn" id="dGen">Fill next 30 days</button><button class="btn alt" id="dRedo">${armed==="dredo"?"Tap again: redo from today":"Redo from today"}</button></div><div class="alist" style="margin-top:8px">`;
  for(let i=0;i<30;i++){const d=new Date(t);d.setDate(d.getDate()+i);const k=dkey(d);const id=(r.assign||{})[k];const m=id&&S.roster.find(x=>x.id===id);const cf=m?busyOn(m,k,{roster:r.id,lim:r.skipLim}):[];const bad=m&&(!dElig(r,m,k)||cf.length);
    h+=`<div class="rrow" style="--sc:var(${!m?"--line":bad?cfCol(cf.length?cf:[{hard:true}]):i===0?"--s-onhand":"--line"})"><div class="rtop"><div class="who"><b>${i===0?"TODAY · ":""}${DOW[d.getDay()]} ${short(d)}</b><div class="ph"${m?` data-pcard="${m.id}" style="cursor:pointer"`:""}>${m?esc(m.sec+" · "+m.rank+" "+m.name):"Open"}</div>${cf.length?`<div class="ph">${cfLine(cf)}</div>`:""}</div>${m&&m.phone?`<a class="call" href="${telHref(m.phone)}">Call</a>`:""}<button class="chip" data-dswap="${k}" style="cursor:pointer">${dSwap===k?"Pick below":"Change"}</button></div>
      ${dSwap===k?`<select class="wsel" data-dpick="${k}"><option value="">Pick who…</option>${pool.map(p=>`<option value="${p.id}"${!dElig(r,p,k)?" disabled":""}>${esc(p.sec+" "+p.rank+" "+p.name)}${(()=>{const c=busyOn(p,k,{roster:r.id,lim:r.skipLim});return c.length?" ⚠ "+esc(c.map(x=>x.s).join(", ")):""})()}</option>`).join("")}<option value="-">— Leave open —</option></select>`:""}</div>`}
  h+=`</div><div class="panel"><textarea readonly>${esc(dutyText(r,14))}</textarea><div class="row2"><a class="btn" href="${esc(smsHref(dutyText(r,14)))}">Text 14 days</a><button class="btn alt" id="dCopy">Copy</button></div><p class="note">Goes to the numbers set in TEXT.</p></div>`;
  h+=`<details class="panel"${dSetup?" open":""}><summary><b>Setup</b> · who's in, who's skipped</summary>
    <label for="dName">Name</label><input type="text" id="dName" maxlength="24" value="${esc(r.name)}">
    <div class="note">Sections in rotation:</div><div class="evts">${SECTIONS.map(([k])=>`<label class="tog"><input type="checkbox" data-dsec="${k}"${r.secs.includes(k)?" checked":""}> ${k}</label>`).join("")}<label class="tog"><input type="checkbox" id="dAtt"${r.att?" checked":""}> ATT</label></div>
    <div class="note">Skip people who are:</div><div class="evts">${STATUSES.filter(x=>x!=="On Hand").map(x=>`<label class="tog"><input type="checkbox" data-dskip="${esc(x)}"${(r.skip||[]).includes(x)?" checked":""}> ${esc(SHORT[x])}</label>`).join("")}<label class="tog"><input type="checkbox" id="dLim"${r.skipLim?" checked":""}> LIMDU</label></div>
    <p class="note">People on a skipped status come back into the rotation the day after their end date (set it on their card).</p>
    <div class="note">Leave out of this rotation:</div><div class="alist">${sorted(S.roster.filter(m=>m.sec==="ATT"?r.att:r.secs.includes(m.sec))).map(m=>`<label class="tog" style="margin:0"><input type="checkbox" data-dexcl="${m.id}"${(r.excl||{})[m.id]?" checked":""}> ${esc(m.rank+" "+m.name)}</label>`).join("")}</div>
    <div class="row2" style="margin-top:8px"><button class="btn alt" id="dNew">New roster</button><button class="btn warn" id="dDel">${armed==="ddel"?"Tap again to delete":"Delete roster"}</button></div></details>`;
  $("#main").innerHTML=h}

/* ---------- person card + search ---------- */
let pid=null,pBack="board",pEdit=null;
function findPeople(q){q=q.trim().toUpperCase();if(!q)return[];const w=q.split(/\s+/);
  return sorted(S.roster.filter(m=>{const t=(m.rank+" "+m.name+" "+m.sec+" "+(m.parent||"")).toUpperCase();return w.every(x=>t.includes(x))})).slice(0,10)}
function gqHTML(q){const r=findPeople(q);if(!q.trim())return"";if(!r.length)return `<p class="note">No one matches.</p>`;
  return r.map(m=>`<div class="rrow" style="--sc:var(${SVAR[m.status]||"--line"});text-align:left;flex-direction:row;align-items:center"><div class="who" data-pcard="${m.id}" role="button" tabindex="0" style="cursor:pointer;flex:1;min-width:0"><b>${esc(m.rank)}</b> ${esc(m.name)}<div class="ph">${m.sec} · ${esc(SHORT[m.status]||m.status)}${dutyOf(m)!=="Full Duty"?" · "+esc(dutyOf(m)):""}</div></div>${ctBtns(m)}</div>`).join("")}
function ctBtns(m){if(!m.phone)return "";const nm=esc(m.rank+" "+lastOf(m));return `<span class="ct"><a href="${telHref(m.phone)}" aria-label="Call ${nm}" title="Call ${esc(fmtPh(m.phone))}"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC.recall}</svg></a><a href="${smsTo(m.phone)}" aria-label="Text ${nm}" title="Text"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC.text}</svg></a></span>`}
function openCard(id){if(view!=="p")pBack=view;pid=id;pEdit=null;view="p";armed=null;render();window.scrollTo(0,0)}
const isoOf=s=>{const d=parseD(s);return d?dkey(d):""};
function pSec(t,body){return body?`<h2>${t}</h2><div class="panel">${body}</div>`:""}
function renderPerson(){const m=S.roster.find(x=>x.id===pid);if(!m){view=pBack||"board";return render()}
  let h=`<button class="chip" data-pback="1" style="cursor:pointer;margin-top:12px">◂ Back</button>`;
  const since=sinceOf(m);const secName=m.sec==="ATT"?"Attached"+(m.parent?" · from "+m.parent:""):((SECTIONS.find(x=>x[0]===m.sec)||[])[1]||m.sec);
  h+=`<div class="sechead" style="margin-top:8px"><h2 style="margin:0">${esc(m.rank)} ${esc(m.name)}</h2></div><div class="note">${esc(m.sec)} · ${esc(secName)}</div>
    <div class="panel"><div class="pick">${statusSelect(m.id,m.status)}${dutySelect(m.id,dutyOf(m))}</div>
    <div class="note">${since?`${esc(SHORT[m.status]||m.status)} since ${dtg(new Date(since)).slice(0,7)} ${dtg(new Date(since)).slice(8)} (${ago(since).replace(" ago","")})`:"No history yet for this person."}${m.detail?" · "+esc(m.detail):""}${m.loc?" · "+esc(m.loc):""}</div>
    <div class="row2">${m.phone?`<a class="btn" href="${telHref(m.phone)}">Call ${fmtPh(m.phone)}</a><a class="btn alt" href="${smsTo(m.phone)}">Text</a>`:`<button class="btn alt" data-pedit="ph">Add phone</button><span></span>`}</div>
    ${m.phone2?`<a class="btn alt" href="${telHref(m.phone2)}">Call alt ${fmtPh(m.phone2)}</a>`:""}
    ${pEdit==="ph"?`<div class="addph"><input type="tel" id="pPh" placeholder="808 555 0100" value="${esc(fmtPh(m.phone||""))}"><button data-psave="ph">Save</button></div>`:""}</div>`;
  // dates
  const dRow=(k,l)=>`<div><label for="pd_${k}">${l}</label><input type="date" id="pd_${k}" data-pdate="${k}" value="${esc(isoOf(m[k]))}" style="width:100%;padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)"></div>`;
  h+=pSec("Dates",`<div class="row2">${dRow("start","Status start")}${dRow("end","Status end / return")}</div><div class="row2">${dRow("edd","EDD / leaving unit")}${dRow("eas","EAS / contract end")}</div>`);
  // due-outs
  if(typeof dueRows==="function"){const rows=dueRows(m);h+=pSec(`Due-outs${rows.some(r=>r.st==="over")?` <span style="color:var(--warn)">· ${rows.filter(r=>r.st==="over").length} overdue</span>`:""}`,rows.length?rows.map(r=>`<div class="rtop" style="gap:8px"><div class="who"><b style="color:var(${r.col})">●</b> ${esc(r.item)}<div class="ph">${r.txt}</div></div><button class="chip" data-pdone="${esc(r.item)}" style="cursor:pointer">Done today</button><input type="date" data-pdue="${esc(r.item)}" value="${esc(r.iso)}" aria-label="${esc(r.item)} due date" style="width:132px;padding:6px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)"></div>`).join(""):`<p class="note">No readiness items set up. See READY on the board.</p>`)}
  {const cf=upcomingConflicts(30).filter(c=>c.m.id===m.id);if(cf.length)h+=`<h2 style="color:var(--warn)">⚠ Conflicts</h2><div class="alist">${cf.map(cfRow).join("")}</div>`}
  // duty
  if(typeof nextDuties==="function"){const nd=nextDuties(m);h+=pSec("Duty",nd.length?nd.map(x=>`<div>${esc(x.roster)}: <b>${esc(x.day)}</b></div>`).join(""):`<p class="note">No upcoming duty.</p>`)}
  // calendar
  {const up=calEntries(dkey(),dkey(new Date(Date.now()+90*86400000)),"ALL").filter(e=>e.m&&e.m.id===m.id);h+=`<h2 style="display:flex;justify-content:space-between;align-items:center">Calendar <button class="chip" id="pcIcs" style="cursor:pointer">Add to phone calendar</button></h2>`+(up.length?`<div class="alist">${up.slice(0,12).map(e=>calRow(e,true)).join("")}</div>`:`<p class="note">Nothing in the next 90 days.</p>`)+calForm(m)}
  // my page
  h+=pSec("My page",m.pk?`<div class="note">${m.pkAt&&!S.mpErr?"<b style='color:var(--s-onhand)'>● Sent to their page "+ago(m.pkAt)+"</b>":S.mpErr?"<b style='color:var(--warn)'>✕ Not reaching their page: "+esc(S.mpErr)+"</b> Open Tools → System check and run part 07 (My page).":"Publishing…"} · ${esc(m.rank+" "+lastOf(m))} sees their status, duty, due-outs and calendar.</div>
    <div class="row2">${m.phone?`<a class="btn" href="${esc("sms:"+smsNum(m.phone)+"?&body="+encodeURIComponent(unitName()+": your private My page (status, duty, due-outs, calendar) and the unit Feed. Keep this link to yourself: "+mpLink(m)+" · iPhone: open in Safari, then Share → Add to Home Screen so alerts work."))}">Text their link</a>`:`<button class="btn alt" data-pedit="ph">Add phone first</button>`}<button class="btn alt" data-mpcopy="${m.id}">Copy link</button></div>
    <button class="btn warn" data-mpoff="${m.id}">${armed==="mpoff"+m.id?"Tap again: turn off and delete their page":"Turn off My page"}</button>`
    :`<p class="note">Give ${esc(m.rank+" "+lastOf(m))} a private page on their phone with their status, next duty, due-outs and calendar. It updates by itself as you change things here.</p><button class="btn" data-mpon="${m.id}">Turn on My page</button>`);
  // gear
  if(m.wpn&&m.wpn.t)h+=pSec("Gear",`<div><b>${esc(m.wpn.t)}</b>${m.wpn.rack?" · rack "+esc(m.wpn.rack):""}${m.wpn.s4?" · serial …"+esc(m.wpn.s4):""}</div>`);
  // accountability
  const acc=[];const ci=(S.rc.ci||{})[m.id];if(S.rc.start&&(S.rc.res||{})[m.id])acc.push(`Recall ${dtg(new Date(S.rc.start)).slice(0,7)}: ${ci?(ci.c===3?"⚠ NEED HELP":ci.c===2?"Delayed":"Checked in good"):({ok:"Reached",vm:"Voicemail",na:"No answer"})[S.rc.res[m.id]]||""}${ci&&ci.eta?" ("+esc(ci.eta)+")":""}`);
  if(S.mus.last&&S.mus.last.un)acc.push("Last muster "+dtg(new Date(S.mus.last.t)).slice(0,7)+": "+(S.mus.last.un.some(x=>x.includes(" "+m.rank+" "+m.name))?"<b style='color:var(--warn)'>unaccounted</b>":"accounted for"));
  for(const f of S.feeds.filter(f=>f.lk)){const ps=(f.posts||[]).filter(p=>fdPool(p).some(x=>x.id===m.id));if(!ps.length)continue;const ok=ps.filter(p=>((f.acks||{})[String(p.id)]||{})[m.id]).length;acc.push(esc(f.unit)+" feed: confirmed "+ok+"/"+ps.length+" posts"+(ps.length-ok?` · <b style="color:var(--warn)">${ps.length-ok} not confirmed</b>`:""))}
  const ev=(S.events||[]).filter(e=>evReq(e).some(x=>x.id===m.id)&&!evDone(e,m));if(ev.length)acc.push("Owes: "+ev.map(e=>esc(e.name)).join(", "));
  h+=pSec("Accountability",acc.length?acc.map(x=>`<div>${x}</div>`).join(""):`<p class="note">Nothing recorded yet.</p>`);
  // 6W
  const w6=(S.w6||[]).filter(r=>r.mid===m.id);h+=pSec("6Ws",(w6.length?w6.slice().reverse().map(r=>`<button class="chip" data-wopen="${r.id}" style="cursor:pointer;text-align:left">${esc((r.when||"").replace("T"," "))} · ${esc(r.type||r.kind)}</button>`).join(""):`<p class="note">None.</p>`)+`<button class="btn alt" data-w6="${m.id}">New 6W</button>`);
  // notes
  const notes=m.notes||[];h+=pSec("Notes",`<textarea id="pNote" maxlength="500" style="min-height:60px" placeholder="Counseling given, good work, follow-up…"></textarea><button class="btn alt" id="pNoteAdd">Add note</button>${notes.slice().reverse().map((n,i)=>`<div class="rtop"><div class="who" style="white-space:pre-wrap">${esc(n.txt)}<div class="ph">${dtg(new Date(n.t)).slice(0,7)} ${dtg(new Date(n.t)).slice(8)}</div></div><button class="chip" data-pndel="${notes.length-1-i}" style="cursor:pointer">${armed==="pn"+(notes.length-1-i)?"Delete?":"✕"}</button></div>`).join("")}`);
  // timeline
  const tl=(S.tl[m.id]||[]).slice(-12).reverse();if(tl.length)h+=pSec("Status history",tl.map(x=>`<div class="note"><b>${dtg(new Date(x[0])).slice(0,7)} ${dtg(new Date(x[0])).slice(8)}</b> · ${esc(SHORT[x[1]]||x[1])}${x[2]!=="Full Duty"?" · "+esc(x[2]):""}</div>`).join(""));
  $("#main").innerHTML=h}

/* ---------- history: daily numbers + each person's status timeline ---------- */
const dkey=(d=new Date())=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
let histT=null;
function histTick(){if(S.source==="sample")return;clearTimeout(histT);histT=setTimeout(histNow,1500)}
function histNow(){const {c,T}=counts();const sec={};SECTIONS.forEach(([k])=>sec[k]=[c[k]["On Hand"],c[k].total,present(c[k])]);
  const st={};STATUSES.forEach(x=>st[x]=T[x]);S.days[dkey()]={str:T.total,oh:T["On Hand"],pr:present(T),st,sec};
  const ks=Object.keys(S.days).sort();if(ks.length>400)ks.slice(0,ks.length-400).forEach(k=>delete S.days[k]);
  const now=Date.now();for(const m of S.roster){const L=S.tl[m.id]=S.tl[m.id]||[];const last=L[L.length-1];const d=dutyOf(m);
    if(!last||last[1]!==m.status||last[2]!==d){L.push([now,m.status,d]);if(L.length>60)L.splice(0,L.length-60)}}
  for(const id of Object.keys(S.tl))if(!S.roster.some(m=>m.id===id))delete S.tl[id];
  try{const t=JSON.stringify(S);if(window.VAULT&&VAULT.on())VAULT.write(t);else localStorage.setItem(KEY,t)}catch(e){}}
function sinceOf(m){const L=S.tl[m.id];if(!L||!L.length)return null;let i=L.length-1;while(i>0&&L[i-1][1]===m.status)i--;return L[i][0]}
function awayDays(m,from){const L=(S.tl[m.id]||[]).filter(x=>x);let days=0;const now=Date.now();
  for(let i=0;i<L.length;i++){const a=Math.max(L[i][0],from),b=i+1<L.length?L[i+1][0]:now;if(b<=a)continue;if(AWAY.includes(L[i][1]))days+=(b-a)/86400000}return days}
let trRange=30;
function lineChart(series,h){const W=340,H=h||150,P=28;const n=series[0].pts.length;if(n<2)return `<p class="note">Not enough days yet. The chart fills in as you use the app each day.</p>`;
  const x=i=>P+(W-P-8)*i/(n-1),y=v=>8+(H-8-22)*(1-v/100);
  const grid=[0,50,100].map(v=>`<line x1="${P}" x2="${W-8}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="2" y="${y(v)+4}" font-size="10" fill="var(--muted)">${v}%</text>`).join("");
  const lines=series.map(s=>`<polyline fill="none" stroke="var(${s.col})" stroke-width="2.2" stroke-linejoin="round" points="${s.pts.map((v,i)=>v==null?"":x(i).toFixed(1)+","+y(v).toFixed(1)).filter(Boolean).join(" ")}"/>`).join("");
  const lab=series[0].lab||[];const lx=[0,Math.floor((n-1)/2),n-1].map((i,j)=>`<text x="${x(i)}" y="${H-4}" font-size="10" fill="var(--muted)" text-anchor="${["start","middle","end"][j]}">${esc(lab[i]||"")}</text>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Chart">${grid}${lines}${lx}</svg><div class="note">${series.map(s=>`<span style="color:var(${s.col});font-weight:700">■</span> ${esc(s.name)}`).join(" &nbsp; ")}</div>`}
function renderTrends(){let h=banner();const keys=[];for(let i=trRange-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);keys.push(dkey(d))}
  const D=keys.map(k=>S.days[k]||null);const have=D.filter(Boolean);
  h+=`<h2 style="display:flex;justify-content:space-between;align-items:center">Trends ${xlBtn("trends")}</h2><div class="evts">${[[30,"30 days"],[90,"90 days"],[365,"1 year"]].map(([v,l])=>`<button data-trr="${v}" aria-pressed="${trRange===v}">${l}</button>`).join("")}</div>`;
  if(!have.length){h+=`<div class="panel"><p class="note">${S.source==="sample"?"Load your roster to start keeping history.":"History starts today. The app saves your numbers each day you use it."}</p></div>`;$("#main").innerHTML=h;return}
  const lab=keys.map(k=>{const [y,mo,dd]=k.split("-");return dd+" "+MON[+mo-1]});
  h+=`<div class="panel"><b>% on hand and present, by day</b>${lineChart([{name:"On hand",col:"--s-onhand",pts:D.map(d=>d&&d.str?Math.round(100*d.oh/d.str):null),lab},{name:"Present",col:"--s-aob",pts:D.map(d=>d&&d.str?Math.round(100*d.pr/d.str):null),lab}])}</div>`;
  const avg=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):0;
  h+=`<h2>By section · average over ${have.length} day${have.length>1?"s":""}</h2><div class="gridwrap"><table><thead><tr><th>Section</th><th>% on hand</th><th>% present</th><th>Today</th></tr></thead><tbody>${SECTIONS.map(([k])=>{const r=have.map(d=>d.sec&&d.sec[k]).filter(x=>x&&x[1]);
    const t=(S.days[dkey()]||{}).sec;const tt=t&&t[k];return `<tr><td><b>${k}</b></td><td>${avg(r.map(x=>100*x[0]/x[1]))}%</td><td>${avg(r.map(x=>100*(x[2]??x[0])/x[1]))}%</td><td>${tt?tt[0]+"/"+tt[1]:"—"}</td></tr>`}).join("")}
    <tr class="sum"><td>Total</td><td>${avg(have.map(d=>100*d.oh/(d.str||1)))}%</td><td>${avg(have.map(d=>100*d.pr/(d.str||1)))}%</td><td>${(S.days[dkey()]||{}).oh??"—"}/${(S.days[dkey()]||{}).str??"—"}</td></tr></tbody></table></div>`;
  const from=Date.now()-trRange*86400000;const top=S.roster.filter(m=>m.sec!=="ATT").map(m=>({m,d:awayDays(m,from)})).filter(x=>x.d>=0.5).sort((a,b)=>b.d-a.d).slice(0,12);
  h+=`<h2>Most days away · last ${trRange} days</h2><p class="note">Leave, TAD, operations and appointments off base, from the app's own history.</p>`;
  h+=top.length?`<div class="alist">${top.map(x=>`<button class="rrow" data-pcard="${x.m.id}" style="text-align:left;cursor:pointer"><div class="rtop"><div class="who"><b>${esc(x.m.rank)}</b> ${esc(x.m.name)}<div class="ph">${x.m.sec} · now ${esc(SHORT[x.m.status]||x.m.status)}</div></div><b>${Math.round(x.d)} d</b></div></button>`).join("")}</div>`:`<p class="note">No one away yet in this window.</p>`;
  $("#main").innerHTML=h}

/* ---------- SEND: broadcast with read receipts ----------
   Uses the recall tables: one "recall" per message; each "Got it" is a check-in (1 = got it, 2 = got it with a problem).
   The message text only travels in the text and the link, never to the server. */
const BC_TTL=72*3600000;let bcBusy=false,bcDraft={msg:"",secs:null,att:true},bcOpenId=null;const bcIdx={};
function bcActive(){return S.bc.find(b=>!b.closed&&Date.now()-b.t<BC_TTL)||null}
function bcPoolOf(b){return S.roster.filter(m=>m.sec==="ATT"?b.att:b.secs.includes(m.sec))}
function bcStats(b){const pool=bcPoolOf(b);const A=b.ack||{};return {pool:pool.length,got:pool.filter(m=>A[m.id]).length,prob:pool.filter(m=>A[m.id]&&A[m.id].c===2).length}}
function bcLink(b){const q=new URLSearchParams();q.set("bc",b.rid);q.set("u",unitName());if(S.myPh)q.set("to",S.myPh);q.set("m",b.msg);return PUB()+"#"+q.toString()}
function bcBody(b){return unitName()+" MESSAGE:\n"+b.msg+"\n\nTap to confirm you got it: "+bcLink(b)}
async function bcIndexFor(rid){const c=bcIdx[rid];if(c&&c.n===S.roster.length)return c;const map=[];
  for(const m of S.roster){const last=SB.words(lastOf(m)),first=SB.words((m.name.split(",")[1]||"").trim().split(/\s+/)[0]||"");
    map.push({m,last:await Promise.all(last.map(w=>SB.h(rid,w))),rank:await SB.h(rid,String(m.rank).toUpperCase().replace(/[^A-Z0-9]/g,"")),first:first[0]?await SB.h(rid,first[0]):"",idh:await SB.h(rid,"ID:"+m.id)})}
  return bcIdx[rid]={n:S.roster.length,map}}
async function bcPoll(){const b=bcActive();if(!b||bcBusy)return;bcBusy=true;
  try{if(!b.ok){await SB.rpc("create_recall",{p_id:b.rid,p_read_key:b.key});b.ok=true;b.err="";save();if(view==="send")rerenderSend()}
    const rows=await SB.rpc("get_checkins",{p_recall:b.rid,p_read_key:b.key,p_after:b.after||0});b.err="";
    if(rows&&rows.length){const idx=await bcIndexFor(b.rid);b.ack=b.ack||{};let n=0,pr=0;
      for(const r of rows){b.after=Math.max(b.after||0,+r.id);const set=new Set(r.words||[]);
        const sc=idx.map.filter(x=>x.last.length&&x.last.every(h=>set.has(h))).map(x=>({m:x.m,s:(set.has(x.rank)?2:0)+(x.first&&set.has(x.first)?1:0)}));
        const best=sc.length?Math.max(...sc.map(x=>x.s)):-1;const top=sc.filter(x=>x.s===best);
        if(top.length===1){b.ack[top[0].m.id]={c:+r.code===2?2:1,note:String(r.note||"").slice(0,40),t:Date.parse(r.created_at)||Date.now()};n++;if(+r.code===2)pr++}
        else b.un=(b.un||0)+1}
      save();renderTabs();if(view==="send")rerenderSend();else if(view==="board"){const y=window.scrollY;render();window.scrollTo(0,y)}
      if(pr)toast(pr+" problem"+(pr>1?"s":"")+" reported");else if(n)toast(n+" got it")}
  }catch(e){b.err=String(e.message||e).slice(0,80);save()}finally{bcBusy=false}}
every(8000,()=>{if(bcActive())bcPoll()},"send");
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&bcActive())bcPoll()});
function rerenderSend(){const a=document.activeElement&&document.activeElement.id;if(a==="bcMsg"||a==="bcMe")return;const y=window.scrollY;renderSend();window.scrollTo(0,y)}
function bcMissText(b){const A=b.ack||{};const miss=sorted(bcPoolOf(b).filter(m=>!A[m.id]));const pr=sorted(bcPoolOf(b).filter(m=>A[m.id]&&A[m.id].c===2));const st=bcStats(b);
  const L=[unitName()+" MESSAGE "+dtg(new Date(b.t)),"GOT IT: "+st.got+"/"+st.pool+" ("+pct(st.got,st.pool)+"%)"];
  if(pr.length){L.push("");L.push("PROBLEMS ("+pr.length+")");pr.forEach(m=>L.push("- "+(m.sec==="ATT"?"ATT":m.sec)+" "+m.rank+" "+m.name.split(",")[0]+(A[m.id].note?" ("+A[m.id].note.toUpperCase()+")":"")))}
  if(miss.length){L.push("");L.push("NOT CONFIRMED ("+miss.length+")");miss.forEach(m=>L.push("- "+(m.sec==="ATT"?"ATT":m.sec)+" "+m.rank+" "+m.name.split(",")[0]))}
  return RT(L.join("\n"))}
function bcBatches(list,body){const ph=list.filter(m=>m.phone);const out=[];for(let i=0;i<ph.length;i+=CI_BATCH){const g=ph.slice(i,i+CI_BATCH);out.push({n:g.length,href:"sms:"+g.map(m=>"+1"+m.phone).join(",")+"?&body="+encodeURIComponent(body)})}return out}
function renderSend(){let h=banner();const a=bcActive();
  if(a){const st=bcStats(a);const A=a.ack||{};const pool=bcPoolOf(a);const miss=pool.filter(m=>!A[m.id]);const pr=sorted(pool.filter(m=>A[m.id]&&A[m.id].c===2));
    h+=`<div class="mbar"><div class="ct">${st.got}/${st.pool}<small>got it · sent ${ago(a.t)}</small></div><button class="btn" id="bcClose">Close out</button></div>
      <div class="panel" style="margin-top:8px"><div style="white-space:pre-wrap;font-weight:600">${esc(a.msg)}</div>
      <div class="note">${a.ok?`<span style="color:var(--s-onhand);font-weight:700">● Live</span> · confirmations appear here by themselves`:`Connecting…${a.err?" ("+esc(a.err)+")":""}`}${a.un?` · <span style="color:var(--warn)">${a.un} reply didn't match a roster name</span>`:""}</div>
      ${bcBatches(pool,bcBody(a)).map((x,i,arr)=>`<a class="btn${(a.sent||{})[i]?" alt":""}" data-bcsent="${i}" href="${esc(x.href)}">${(a.sent||{})[i]?"✓ Sent · ":""}Text it${arr.length>1?" · group "+(i+1)+" of "+arr.length:""} (${x.n})</a>`).join("")||`<p class="note" style="color:var(--warn)">No phone numbers loaded. Load them in RECALL.</p>`}
      ${pool.filter(m=>!m.phone).length?`<p class="note">${pool.filter(m=>!m.phone).length} people have no number and won't get the text.</p>`:""}</div>`;
    if(pr.length)h+=`<div class="panel" style="border-color:var(--warn)"><b style="color:var(--warn)">⚠ PROBLEMS (${pr.length})</b>${pr.map(m=>`<div class="rtop"><div class="who"><b>${esc(m.rank)}</b> ${esc(m.name)}${A[m.id].note?`<div class="ph">${esc(A[m.id].note)}</div>`:""}</div>${m.phone?`<a class="call" href="${telHref(m.phone)}">Call</a>`:""}</div>`).join("")}</div>`;
    if(miss.length){const rb=bcBatches(miss,"REMINDER: "+bcBody(a));
      h+=`<h2>Not confirmed (${miss.length})</h2>${rb.map((x,i,arr)=>`<a class="btn alt" href="${esc(x.href)}" style="width:100%;margin-top:6px">Remind the ${x.n} not confirmed${arr.length>1?" · group "+(i+1):""}</a>`).join("")}`;
      const groups=SECTIONS.map(s=>s[0]).concat("ATT").map(k=>[k,sorted(miss.filter(m=>m.sec===k))]).filter(g=>g[1].length);
      for(const [k,ms] of groups)h+=`<div class="mgrp"><h3><span>${k} · ${ms.length}</span></h3>${ms.map(m=>`<div class="rrow"><div class="rtop"><div class="who"><b>${esc(m.rank)}</b> ${esc(m.name)}<div class="ph">${esc(SHORT[m.status]||m.status)}${m.phone?"":" · no number"}</div></div>${m.phone?`<a class="call" href="${telHref(m.phone)}">Call</a><a class="txt" href="${smsTo(m.phone)}">Text</a>`:""}</div></div>`).join("")}</div>`}
    else h+=`<p class="note" style="margin-top:12px;color:var(--s-onhand);font-weight:700">Everyone confirmed.</p>`;
    h+=`<h2>Status report</h2><div class="panel"><textarea readonly id="bcRpt">${esc(bcMissText(a))}</textarea><div class="row2"><a class="btn" href="${esc(smsHref(bcMissText(a)))}">Text it</a><button class="btn alt" id="bcCopy">Copy</button></div></div>`}
  else{const D=bcDraft;if(!D.secs)D.secs=SECTIONS.map(s=>s[0]);const tmp={secs:D.secs,att:D.att};const pool=bcPoolOf(tmp);
    h+=`<h2>Send a message</h2><div class="panel"><p class="note">Text everyone at once. Each person taps <b>Got it</b> and you watch confirmations come in live, with who hasn't seen it yet.</p>
      <label for="bcMsg">Message</label><textarea id="bcMsg" maxlength="300" style="min-height:100px" placeholder="Formation moved to 0700 tomorrow, PT gear.">${esc(D.msg)}</textarea><div class="note" id="bcLen">${D.msg.length}/300</div>
      <div class="note">Send to:</div><div class="evts">${SECTIONS.map(([k])=>`<label class="tog"><input type="checkbox" data-bcsec="${k}"${D.secs.includes(k)?" checked":""}> ${k}</label>`).join("")}<label class="tog"><input type="checkbox" id="bcAtt"${D.att?" checked":""}> ATT</label></div>
      <div><b>${pool.length}</b> people · ${pool.filter(m=>m.phone).length} with a number</div>
      <label for="bcMe">My cell (only used if their phone has no data)</label><input type="tel" id="bcMe" value="${esc(fmtPh(S.myPh||""))}" placeholder="808 555 0100">
      <button class="btn" id="bcGo">Create message</button><p class="note">Next you'll get Text it buttons (20 people per text). The message itself never goes to the server.</p></div>`;
    const past=S.bc.filter(b=>b!==a).slice(-5).reverse();
    if(past.length)h+=`<h2>Past messages</h2><div class="panel hist">${past.map(b=>{const st=bcStats(b);return `<div><b>${dtg(new Date(b.t)).slice(0,7)}</b> · ${st.got}/${st.pool} got it · ${esc(b.msg.slice(0,60))}${b.msg.length>60?"…":""}</div>`}).join("")}</div>`}
  $("#main").innerHTML=h}

/* ---------- Feed: the word, old and new, with Got it in the app ----------
   Post text is encrypted on the leader's phone (AES-256-GCM). The key rides only in the join link (#e=...), so the server
   stores text it can't read. Got it = scrambled name codes + 1 (got it) or 2 (problem) + optional note. */
const b64e=u=>{let s="";for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode(...u.subarray(i,i+8192));return btoa(s)};
const b64d=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const b64url=u=>b64e(u).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const unurl=s=>b64d(s.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-s.length%4)%4));
const fdKeys={};let fdLimit=20,fdPend=0,fdShown=new Set(),fdIO=null,fdReqForm=false,fdPod=false,fdReqOpen=false,fdBusy=false,fdSel=null,fdOpen=null,fdNew=false,fdQ="",fdDraft={txt:"",urg:false,to:"all",secs:[],att:true,mid:"",ra:30};
async function fdKey(ek){return fdKeys[ek]=fdKeys[ek]||await crypto.subtle.importKey("raw",unurl(ek),"AES-GCM",false,["encrypt","decrypt"])}
async function fdEnc(ek,o){const iv=crypto.getRandomValues(new Uint8Array(12));const ct=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},await fdKey(ek),new TextEncoder().encode(JSON.stringify(o))));const a=new Uint8Array(12+ct.length);a.set(iv);a.set(ct,12);return b64e(a)}
async function fdDec(ek,s){try{const a=b64d(s);return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:a.slice(0,12)},await fdKey(ek),a.slice(12))))}catch(e){return null}}
const fdCur=()=>S.feeds.find(f=>f.id===fdSel)||S.feeds[0]||null;
function fdUnread(){return S.feeds.reduce((a,f)=>a+(f.lk?0:fdVisible(f).filter(p=>p.id>(f.seen||0)).length),0)}
function fdForMe(f,p){const to=p.to;if(!to||to.k==="all")return true;
  if(to.k==="secs")return !f.sec||f.sec==="ATT"?(f.sec==="ATT"?!!to.att:true):to.s.includes(f.sec);
  if(to.k==="one"){const mine=new Set(f.meH||[]);return (to.w||[]).length>0&&to.w.every(h=>mine.has(h))}return true}
function fdVisible(f){return (f.posts||[]).filter(p=>f.lk||!p.to||p.to.k!=="one"||fdForMe(f,p))}
async function fdMeHash(f){f.meH=f.me?await Promise.all(SB.words(f.me).map(w=>SB.h(f.id,w))):[];save()}
function fdSeenIds(f){const s=new Set();for(const A of Object.values(f.acks||{}))for(const id of Object.keys(A))s.add(id);return s}
function fdDue(){const out=[];const now=Date.now();for(const f of S.feeds.filter(f=>f.lk)){for(const p of f.posts||[]){const ra=(f.ra||{})[p.id];if(!ra||(f.rdis||{})[p.id])continue;if(now-p.t<ra*60000)continue;
  const st=fdStats(f,p);const miss=st.pool-st.got;if(miss>0&&now-p.t<7*86400000)out.push({f,p,miss,ra})}}return out}
function fdWordBody(f,p){return f.unit+(p.urg?" URGENT":"")+": "+p.txt+(p.ci?"\n"+p.ci:"")+"\n\nConfirm in Accounted For → Feed (Got it)."}
function fdDueHTML(){const d=fdDue();if(!d.length)return"";return d.slice(0,3).map(x=>{const miss=sorted(fdPool(x.p).filter(m=>!((x.f.acks||{})[String(x.p.id)]||{})[m.id]));
  return `<div class="banner" style="border-color:var(--warn);flex-direction:column;align-items:stretch;gap:6px"><span>⏰ <b>${x.miss}</b> haven't confirmed “${esc(x.p.txt.slice(0,50))}${x.p.txt.length>50?"…":""}” after ${x.ra>=60?x.ra/60+" hr":x.ra+" min"}.</span>
    <div class="row2">${bcBatches(miss,fdWordBody(x.f,x.p)).map((b,i,arr)=>`<a class="btn" href="${esc(b.href)}">Text them the word${arr.length>1?" ("+(i+1)+")":""}</a>`).join("")||`<button class="btn" data-go="feed">Open Feed</button>`}<button class="btn alt" data-fddis="${x.f.id}:${x.p.id}">Dismiss</button></div></div>`}).join("")}
setInterval(()=>{const d=fdDue();for(const x of d){x.f.rn=x.f.rn||{};if(x.f.rn[x.p.id])continue;x.f.rn[x.p.id]=1;save();toast("⏰ "+x.miss+" haven't confirmed the word");try{navigator.vibrate&&navigator.vibrate([150,80,150])}catch(e){}
  try{if("Notification" in window&&Notification.permission==="granted")navigator.serviceWorker.ready.then(r=>r.showNotification(x.miss+" haven't confirmed",{body:"“"+x.p.txt.slice(0,80)+"” Open Feed to remind them.",tag:"fdrem"+x.p.id,data:{open:"feed"},icon:"./icon-192.png"})).catch(()=>{})}catch(e){}
  if(view==="board"){const y=window.scrollY;render();window.scrollTo(0,y)}}},60000);
function fdToLabel(to){if(!to||to.k==="all")return"Everyone";if(to.k==="secs")return to.s.concat(to.att?["ATT"]:[]).join(", ")||"No one";if(to.k==="one")return to.n||"One person";return"Everyone"}
function fdLink(f){const q=new URLSearchParams();q.set("feed",f.id);q.set("k",f.mk);q.set("e",f.ek);q.set("u",f.unit);q.set("s",SECTIONS.map(x=>x[0]).join(","));return PUB()+"#"+q.toString()}
async function fdCreate(){const f={id:rndId(14),mk:rndId(32),lk:rndId(32),ek:b64url(crypto.getRandomValues(new Uint8Array(32))),unit:S.level==="co"?coFeedName():unitName(),posts:[],seen:0,acks:{},ackAfter:0,mine:{},un:{}};
  await SB.rpc("create_feed",{p_id:f.id,p_member_key:f.mk,p_leader_key:f.lk});S.feeds.unshift(f);fdSel=f.id;save()}
async function fdPoll(f,full){const ackN={};const after=full?0:Math.max(0,f.ctl||0,...(f.posts||[]).map(p=>p.id));
  const rows=await SB.rpc("feed_get",{p_feed:f.id,p_member_key:f.mk,p_after:after});let fresh=0;const keep=full?[]:(f.posts||[]);const have=new Set(keep.map(p=>p.id));
  let ctlTop=full?0:(f.ctl||0);for(const r of [...(rows||[])].sort((a,b)=>a.id-b.id)){if(have.has(+r.id))continue;const o=await fdDec(f.ek,r.ct);if(!o)continue;if(o.c==="pin"){if(+r.id>=ctlTop){ctlTop=+r.id;f.pins=Array.isArray(o.ids)?o.ids.map(Number).slice(0,5):[]}continue}const to=o.to&&["all","secs","one"].includes(o.to.k)?o.to:{k:"all"};if(to.k==="secs"&&!Array.isArray(to.s))to.s=[];if(o.sa&&!f.lk)f.secsAll=o.sa;const post={id:+r.id,t:Date.parse(r.created_at)||Date.now(),txt:String(o.t||"").slice(0,1500),urg:!!o.u,to};if(o.pod&&o.pod.d)post.pod={d:String(o.pod.d).slice(0,10)};if(o.by)post.by=String(o.by).slice(0,30);if(typeof o.ci==="string"&&/^https:\/\/[^\s]+#ci=/.test(o.ci))post.ci=o.ci.slice(0,500);if(o.sl)post.sl=String(o.sl).replace(/[^A-Z0-9]/g,"").slice(0,6);keep.push(post);if(f.lk&&post.sl&&+r.id>(f.actTop||0)){f.actTop=+r.id;if(!full||f.actInit)actAdd("✎",post.sl+" leader "+(post.by||"")+" posted"+(post.to&&post.to.k==="secs"?" to "+fdToLabel(post.to):" to everyone")+": “"+post.txt.slice(0,80)+(post.txt.length>80?"…":"")+"”","feed")}if(+r.id>(f.seen||0)&&(f.lk||post.to.k!=="one"||fdForMe(f,post)))fresh++}
  f.actInit=1;f.posts=keep.sort((a,b)=>b.id-a.id).slice(0,200);f.ctl=ctlTop;if(full&&!ctlTop)f.pins=[];f.err="";
  if(f.lk){try{const rq=await SB.rpc("feed_reqs_get",{p_feed:f.id,p_leader_key:f.lk,p_after:f.reqAfter||0});let nr=0;
      for(const r of rq||[]){f.reqAfter=Math.max(f.reqAfter||0,+r.id);const o=await fdDec(f.ek,r.ct);if(o&&o.k==="rep"&&typeof repIn==="function"){repIn(f,o,r);continue}if(o&&o.k==="ck"&&typeof ckIn==="function"){ckIn(f,o,r);continue}if(!o||o.k!=="req"||S.reqs.some(x=>x.rid===o.rid))continue;const m=matchMarine(String(o.me||""));
        actAdd("📨",String(o.me||"Someone").slice(0,30)+" requested "+String(o.ty||"Other").slice(0,24)+(o.from?" "+String(o.from).slice(0,10)+(o.to&&o.to!==o.from?" to "+String(o.to).slice(0,10):""):""),"feed");S.reqs.unshift({rid:String(o.rid).slice(0,20),feed:f.id,mid:m?m.id:"",who:String(o.me||"").slice(0,30),ty:String(o.ty||"Other").slice(0,24),from:String(o.from||"").slice(0,10),to:String(o.to||"").slice(0,10),tm:String(o.tm||"").slice(0,5),note:String(o.note||"").slice(0,200),t:Date.parse(r.created_at)||Date.now(),st:"pending"});nr++}
      if(nr){S.reqs=S.reqs.slice(0,400);toast("📨 "+nr+" new request"+(nr>1?"s":""));try{navigator.vibrate&&navigator.vibrate([80,60,80])}catch(e){}}}catch(e){}
    const acks=await SB.rpc("feed_acks_get",{p_feed:f.id,p_leader_key:f.lk,p_after:f.ackAfter||0});
    if(acks&&acks.length){const idx=await bcIndexFor(f.id);f.acks=f.acks||{};f.un=f.un||{};
      for(const r of acks){f.ackAfter=Math.max(f.ackAfter||0,+r.id);const set=new Set(r.words||[]);
        const sc=idx.map.filter(x=>x.last.length&&x.last.every(h=>set.has(h))).map(x=>({m:x.m,s:(set.has(x.rank)?2:0)+(x.first&&set.has(x.first)?1:0)}));
        const best=sc.length?Math.max(...sc.map(x=>x.s)):-1;const exm=idx.map.find(x=>set.has(x.idh));const top=exm?[{m:exm.m}]:sc.filter(x=>x.s===best);const pid=String(r.post_id);
        if(top.length===1){const am=top[0].m;const was=(f.acks[pid]||{})[am.id];if(!was){const pp=(f.posts||[]).find(x=>String(x.id)===pid);const pt=pp?"“"+pp.txt.slice(0,50)+(pp.txt.length>50?"…":"")+"”":"a post";if(+r.code===2)actAdd("⚠",am.rank+" "+lastOf(am)+" reported a problem with "+pt+": "+String(r.note||"").slice(0,40),"feed");else(ackN[pid]=ackN[pid]||{n:0,pt,who:[]}),ackN[pid].n++,ackN[pid].who.push(am.rank+" "+lastOf(am))}(f.acks[pid]=f.acks[pid]||{})[am.id]={c:+r.code,note:String(r.note||"").slice(0,40),t:Date.parse(r.created_at)||Date.now()}}else f.un[pid]=(f.un[pid]||0)+1}}}
  for(const a of Object.values(ackN))actAdd("✓",a.n+" confirmed "+a.pt+(a.n<=3?" ("+a.who.join(", ")+")":""),"feed");
  return fresh}
async function fdPollAll(full){if(fdBusy||!S.feeds.length)return;fdBusy=true;let fresh=0;
  try{for(const f of S.feeds){try{fresh+=await fdPoll(f,full)}catch(e){f.err=String(e.message||e).slice(0,80)}}save();renderTabs();
    if(view==="feed"&&fresh&&window.scrollY>250){fdPend+=fresh;fdPillShow()}
    else if(view==="feed"||view==="today"){const a=document.activeElement&&document.activeElement.tagName;if(a!=="INPUT"&&a!=="TEXTAREA"){const y=window.scrollY;view==="feed"?renderFeed():renderToday();window.scrollTo(0,y)}}
    if(fresh&&view!=="feed"&&view!=="today"){toast(fresh===1?"New in Feed":fresh+" new in Feed");try{navigator.vibrate&&navigator.vibrate([60,40,60])}catch(e){}}}
  finally{fdBusy=false}}
every(30000,()=>{if(S.feeds.length&&view!=="feed")fdPollAll(false)},"feed");
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&S.feeds.length)fdPollAll(false)});
function fdPool(p){const to=p&&p.to;if(!to||to.k==="all")return S.roster;if(to.k==="secs")return S.roster.filter(m=>m.sec==="ATT"?to.att:to.s.includes(m.sec));if(to.k==="one")return S.roster.filter(m=>m.id===to.mid);return S.roster}
async function fdPushAttach(f){if(!S.pushOn||f.lk)return;try{const sub=await pushSub(false);if(!sub)return;await SB.rpc("feed_sub",{p_feed:f.id,p_member_key:f.mk,p_sub:sub.toJSON()});f.push=true;save()}catch(e){}}
function fdPushHTML(f){if(f.lk)return"";if(!pushOK())return isIOS()&&!standalone()?`<p class="note">To get alerts when new word is posted: Share → <b>Add to Home Screen</b>, then open the app from there.</p>`:"";
  if(Notification.permission==="denied")return `<p class="note">Alerts are blocked for this app in your phone settings.</p>`;
  if(S.pushOn&&Notification.permission==="granted"&&f.push)return `<p class="note" style="color:var(--s-onhand);font-weight:700">🔔 Alerts on for new word</p>`;
  return `<button class="btn alt" id="fdPushOn" style="width:100%">🔔 Alert me when there's new word</button>`}
function fdStats(f,p){const A=(f.acks||{})[String(p.id)]||{};const pool=fdPool(p);return {pool:pool.length,got:pool.filter(m=>A[m.id]).length,prob:pool.filter(m=>A[m.id]&&A[m.id].c===2).length,A}}
function fdSecOpts(list,cur){return `<option value="">Not sure / none</option>${list.concat(["ATT"]).map(k=>`<option value="${esc(k)}"${k===cur?" selected":""}>${esc(k==="ATT"?"ATT (attached)":k)}</option>`).join("")}`}
function fdJoinPrompt(q){const secsL=(q.get("s")||"").toUpperCase().split(",").map(x=>x.replace(/[^A-Z0-9]/g,"").slice(0,6)).filter(Boolean).slice(0,10);const id=(q.get("feed")||"").replace(/[^a-z0-9]/g,"").slice(0,20),mk=(q.get("k")||"").replace(/[^a-z0-9]/g,"").slice(0,40),ek=(q.get("e")||"").replace(/[^A-Za-z0-9_-]/g,"").slice(0,60),unit=(q.get("u")||"").replace(/[|#<>]/g,"").slice(0,24)||"Your unit";
  try{history.replaceState(null,"",location.pathname)}catch(e){}
  if(id.length<10||mk.length<24||ek.length<40)return toast("That feed link is incomplete.");
  if(S.feeds.some(f=>f.id===id)){fdSel=id;view="feed";render();fdPollAll(true);return}
  sheetCtx={kind:"fjoin",id,mk,ek,unit,secsL};
  $("#sheetT").innerHTML=`Join ${esc(unit)}'s feed?<small>You'll see the word they pass, old and new, and tap Got it here in the app.</small>`;
  $("#sheetOpts").innerHTML=`<div class="panel" style="margin:0" data-noxl><label for="fjMe">Your rank and last name</label><input type="text" id="fjMe" maxlength="30" placeholder="CPL SMITH" autocapitalize="characters" style="text-transform:uppercase" value="${esc(S.myName||"")}">
    ${secsL.length?`<label for="fjSec">Your section</label><select id="fjSec" class="wsel">${fdSecOpts(secsL,"")}</select>`:""}
    <p class="note">Your leader sees your Got it next to your name. Your name is scrambled before it leaves this phone; the server never stores it. Posts are encrypted.</p>
    <button class="btn" id="fjYes">Join feed</button><button class="btn alt" data-sclose="1">Not now</button></div>`;
  const sh=$("#sheet");sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add("open")))}
async function fdAck(f,pid,c){if(!f.me){toast("Add your rank and last name first.");return}const note=c===2?(($("#fdNote"+pid)||{}).value||"").replace(/[|#]/g," ").trim().slice(0,40):"";
  if(c===2&&!note){toast("Add a short note about the problem.");const i=$("#fdNote"+pid);if(i)i.focus();return}
  const hs=await Promise.all(SB.words(f.me).slice(0,f.mid?5:6).map(w=>SB.h(f.id,w)));if(f.mid)hs.push(await SB.h(f.id,"ID:"+f.mid));await SB.rpc("feed_ack",{p_feed:f.id,p_member_key:f.mk,p_post:pid,p_words:hs,p_code:c,p_note:note});if(c===2)SB.notify(null,{alert:"prob",feed:f.id,mk:f.mk});
  f.mine=f.mine||{};f.mine[pid]={c,note,t:Date.now()};save()}
function renderFeed(){let h=S.source==="sample"?"":banner();const f=fdCur();
  if(S.feeds.length>1)h+=`<div class="evts" style="margin-top:10px">${S.feeds.map(x=>`<button data-fdsel="${x.id}" aria-pressed="${x===f}">${esc(x.unit)}${x.lk?" (mine)":""}${!x.lk&&(x.posts||[]).some(p=>p.id>(x.seen||0))?" •":""}</button>`).join("")}</div>`;
  if(!f||fdNew){h+=`<h2>Feed</h2><div class="panel"><p class="note">Pass the word in one place. Your people join once with a link, see every post old and new, and tap <b>Got it</b> in the app. You see who confirmed and who hasn't, per post. Posts are encrypted on your phone; the server can't read them or see names.</p>
      <button class="btn" id="fdCreate">Start a feed for ${esc(unitName())}</button>${fdNew?`<button class="btn alt" id="fdCancelNew">Cancel</button>`:""}<div class="note" id="fdOut"></div>
      <p class="note">Joining someone else's feed? Open the link they sent on this phone.</p></div>`;$("#main").innerHTML=h;return}
  const maxId=Math.max(0,...fdVisible(f).map(p=>p.id));const prevSeen=f.seen||0;
  h+=`<div class="sechead" style="margin-top:12px"><h2>Feed</h2><div class="ratio" style="font-size:13px">${f.lk?xlBtn("feed")+" ":""}${f.err?`<span style="color:var(--warn)">offline</span>`:`<span style="color:var(--s-onhand)">● live</span>`}</div></div>`;
  if(f.lk){h+=reqHTML(f)+(fdPod?podForm():`<button class="btn alt" id="pdOpen" style="width:100%;margin-top:8px">📋 Post the Plan of the Day</button>`);h+=`<div class="panel"><div class="fch">${fdAv(fdBy(f))}<div class="hd"><div class="nm">${esc(fdBy(f))}</div><button class="chip" id="fdByEd" style="cursor:pointer;margin-top:2px">Posting as · change</button></div></div><label for="fdTxt">Pass the word</label><textarea id="fdTxt" maxlength="1000" style="min-height:90px" placeholder="Formation 0700 tomorrow, PT gear. Duty section report to the S-3 at 0800.">${esc(fdDraft.txt)}</textarea>
      <div class="note">Send to:</div><div class="evts">${[["all","Everyone"],["secs",LV().Sec+"s"],["one","One person"]].map(([k,l])=>`<button data-fdto="${k}" aria-pressed="${fdDraft.to===k}">${l}</button>`).join("")}</div>
      ${fdDraft.to==="secs"?`<div class="evts">${SECTIONS.map(([k])=>`<label class="tog"><input type="checkbox" data-fdsec="${k}"${fdDraft.secs.includes(k)?" checked":""}> ${k}</label>`).join("")}<label class="tog"><input type="checkbox" id="fdAtt"${fdDraft.att?" checked":""}> ATT</label></div>`:""}
      ${fdDraft.to==="one"?`<select id="fdWho" class="wsel"><option value="">Pick the person…</option>${SECTIONS.map(s=>s[0]).concat("ATT").map(k=>{const ms=sorted(S.roster.filter(m=>m.sec===k));return ms.length?`<optgroup label="${k}">${ms.map(m=>`<option value="${m.id}"${m.id===fdDraft.mid?" selected":""}>${esc(m.rank+" "+m.name)}</option>`).join("")}</optgroup>`:""}).join("")}</select>
        <p class="note">Only that person sees it in their feed. It matches the rank and last name they joined with. For anything sensitive, call or text them directly.</p>`:""}
      <label class="tog"><input type="checkbox" id="fdUrg"${fdDraft.urg?" checked":""}> Urgent (shows in red)</label>
      <label for="fdRa">If not everyone confirms, remind me after</label><select id="fdRa" class="wsel">${[[0,"Don't remind me"],[15,"15 minutes"],[30,"30 minutes"],[60,"1 hour"],[120,"2 hours"],[240,"4 hours"]].map(([v,l])=>`<option value="${v}"${v===fdDraft.ra?" selected":""}>${l}</option>`).join("")}</select>
      <button class="btn" id="fdPost">Post</button></div>
      ${(()=>{const seen=fdSeenIds(f);const ns=sorted(S.roster.filter(m=>!seen.has(m.id)));if(!(f.posts||[]).length||!ns.length)return"";
        return `<details class="panel"><summary><b>Not seen in the feed yet</b> · ${ns.length} have never confirmed a post</summary><p class="note">They may not have joined. Text them the join link, or text the word itself so it reaches them without the app.</p><div class="note">${ns.map(m=>esc(m.sec+" "+m.rank+" "+lastOf(m))).join(" · ")}</div>
          ${bcBatches(ns,f.unit+" Feed: tap to join and see the word in Accounted For: "+fdLink(f)+"\nNo app yet? iPhone: "+STORE_URL.ios).map((x,i,arr)=>`<a class="btn alt" href="${esc(x.href)}">Text join link to them${arr.length>1?" ("+(i+1)+")":""} (${x.n})</a>`).join("")}</details>`})()}
      <details class="panel"><summary><b>Invite people</b> · send the join link once</summary>${bcBatches(S.roster,f.unit+" Feed: tap to join and see the word in Accounted For: "+fdLink(f)+"\nNo app yet? iPhone: "+STORE_URL.ios).map((x,i,arr)=>`<a class="btn" href="${esc(x.href)}">Text join link${arr.length>1?" · group "+(i+1)+" of "+arr.length:""} (${x.n})</a>`).join("")||`<p class="note">No phone numbers loaded (RECALL → Load numbers). You can copy the link instead.</p>`}
      <button class="btn alt" id="fdCopyLink">Copy join link</button><p class="note">Anyone with this link can read the feed, so send it only to your people.</p></details>`}
  else{if(f.pk)h+=`<div class="panel"><div class="fch">${fdAv(f.me||"?")}<div class="hd"><div class="nm">${esc(f.me||"Set your name")}</div><span class="note" style="margin:0">Section leader · ${esc(f.sec||"")}</span></div></div><label for="fdSlTxt">Pass the word</label><textarea id="fdSlTxt" maxlength="1000" style="min-height:80px" placeholder="${esc((f.sec||"Section")+" formation 0645 at the motor pool.")}">${esc(fdSlDraft.txt)}</textarea>
    <div class="note">Send to:</div><div class="evts">${[["all","Everyone"],["sec","Only my section"+(f.sec?" ("+f.sec+")":"")]].map(([k,l])=>`<button data-fdslto="${k}" aria-pressed="${fdSlDraft.to===k}">${esc(l)}</button>`).join("")}</div>
    <label class="tog"><input type="checkbox" id="fdSlUrg"${fdSlDraft.urg?" checked":""}> Urgent (shows in red)</label><button class="btn" id="fdSlPost">Post</button><p class="note">Your OIC sees every post and who confirmed.</p></div>`;h+=``}
  if(!f.lk)h+=`${S.me?`<button class="btn alt" data-go="me" style="width:100%;margin:4px 0">👤 My page</button>`:""}<button class="btn alt" data-go="log" style="width:100%;margin:4px 0">📝 My log${S.log.some(x=>x.d===dkey())?" · logged today":" · log today's accomplishments"}</button><p class="note">You: <b>${esc(f.me||"(name not set)")}</b>${f.sec?" · "+esc(f.sec):""} · <button class="chip" id="fdName" style="cursor:pointer">Change</button></p>${!f.sec&&(f.secsAll||f.secsLink||[]).length?`<p class="note" style="color:var(--warn)">Pick your section (Change) so you only see posts meant for you.</p>`:""}${fdPushHTML(f)}${myReqHTML(f)}`;
  const all=fdVisible(f);const pins=(f.pins||[]).filter(id=>all.some(p=>p.id===id));
  if(all.length>3)h+=`<input class="search" id="fdQ" type="search" placeholder="Search the feed" value="${esc(fdQ)}" style="margin-top:10px">`;
  const qq=fdQ.trim().toLowerCase();const posts=(qq?all.filter(p=>p.txt.toLowerCase().includes(qq)):all).slice().sort((a,b)=>(pins.includes(b.id)?1:0)-(pins.includes(a.id)?1:0)||b.id-a.id);
  if(qq&&!posts.length)h+=`<p class="note">No posts match “${esc(fdQ)}”.</p>`;
  if(!all.length)h+=`<p class="note" style="margin-top:14px">${f.lk?"Nothing posted yet.":"Nothing posted yet. New posts show up here."}</p>`;
  for(const p of posts.slice(0,fdLimit))h+=fdCard(f,p,pins.includes(p.id),!f.lk&&p.id>prevSeen);
  if(posts.length>fdLimit)h+=`<div id="fdMore" class="note" style="text-align:center;padding:16px">Loading more…</div>`;
  else if(posts.length>3)h+=`<p class="note" style="text-align:center;padding:12px">You're all caught up · ${posts.length} post${posts.length>1?"s":""}</p>`;
  h+=`<div class="row2" style="margin-top:16px">${f.lk?`<button class="btn alt" id="fdNewFeed">Start another feed</button><button class="btn warn" id="fdKill">${armed==="fdkill"?"Tap again: delete feed for everyone":"Delete feed"}</button>`:`<button class="btn warn" id="fdLeave">${armed==="fdleave"?"Tap again to leave":"Leave feed"}</button>`}</div>`;
  $("#main").innerHTML=h;fdPend=0;fdPillShow();posts.slice(0,fdLimit).forEach(p=>fdShown.add(f.id+":"+p.id));
  if(fdIO)fdIO.disconnect();const mo=$("#fdMore");if(mo&&"IntersectionObserver" in window){fdIO=new IntersectionObserver(es=>{if(es.some(x=>x.isIntersecting)){fdIO.disconnect();fdLimit+=20;const y=window.scrollY;renderFeed();window.scrollTo(0,y)}},{rootMargin:"400px"});fdIO.observe(mo)}
  if(!f.lk&&maxId>prevSeen){f.seen=maxId;save();setTimeout(renderTabs,0)}}

/* ---------- Feed cards (social style) ---------- */
const AV_COL=["#2f6fde","#17795f","#b4532a","#7a4bd1","#c23a5b","#0f8b9c","#6b7a1f"];
function fdBy(f){return (S.postAs||S.myName||(f&&f.unit)||unitName()).toUpperCase().slice(0,30)}
function fdAv(name){const w=String(name||"?").toUpperCase().split(/\s+/).filter(Boolean);const ini=(w.length>1?w[0][0]+w[w.length-1][0]:(w[0]||"?").slice(0,2));let hsh=0;for(const c of String(name))hsh=(hsh*31+c.charCodeAt(0))>>>0;
  return `<div class="av" style="background:${AV_COL[hsh%AV_COL.length]}" aria-hidden="true">${esc(ini)}</div>`}
function podParse(txt){const L=txt.split("\n");const o={title:L[0]||"",f:"",u:"",sch:[],du:"",n:""};let inS=false;
  for(const l of L.slice(1)){const t=l.trim();if(!t){continue}if(/^Formation:/i.test(t)){o.f=t.replace(/^Formation:\s*/i,"");inS=false}else if(/^Uniform:/i.test(t)){o.u=t.replace(/^Uniform:\s*/i,"");inS=false}
    else if(/^Schedule:/i.test(t))inS=true;else if(/^Duty:/i.test(t)){o.du=t.replace(/^Duty:\s*/i,"");inS=false}else if(/^Notes:/i.test(t)){o.n=t.replace(/^Notes:\s*/i,"");inS=false}
    else if(inS){const m=t.match(/^(\d{3,4}|\d{1,2}:\d{2})\s*[-–:]?\s*(.*)$/);o.sch.push(m?[m[1],m[2]]:["",t])}}return o}
function fdStatCard(f,p){const st=fdStats(f,p);const pool=fdPool(p);const secs=SECTIONS.map(x=>x[0]).concat("ATT").map(k=>{const ms=pool.filter(m=>m.sec===k);return {k,n:ms.length,g:ms.filter(m=>st.A[m.id]).length}}).filter(x=>x.n);
  const pc=st.pool?Math.round(100*st.got/st.pool):0;
  return `<div class="fci"><div style="display:flex;justify-content:space-between;align-items:baseline"><span class="ttl">Confirmed</span>${st.prob?`<span class="fcchip" style="color:var(--warn)">⚠ ${st.prob} problem${st.prob>1?"s":""}</span>`:""}</div>
    <div class="big">${st.got}<span style="font-size:15px;color:var(--muted);font-weight:700"> / ${st.pool} · ${pc}%</span></div>
    <div class="segbar">${secs.map(x=>`<i style="flex:${x.n}"><b style="width:${x.n?Math.round(100*x.g/x.n):0}%"></b></i>`).join("")}</div>
    ${secs.slice().sort((a,b)=>(a.g/a.n)-(b.g/b.n)).slice(0,4).map(x=>`<div class="fcl"><span>${esc(x.k)}</span><span>${x.g}/${x.n} · ${Math.round(100*x.g/x.n)}%</span></div>`).join("")}</div>`}
function fdCard(f,p,pinned,isNew){const mine=(f.mine||{})[p.id];const by=p.by||f.unit;const key=f.id+":"+p.id;const pop=fdShown.size&&!fdShown.has(key);
  let h=`<article class="fc${pop?" pop":""}" style="${p.urg?"border-color:var(--warn);":""}${p.pod?"border-color:var(--brass);":""}">
    <div class="fch">${fdAv(by)}<div class="hd"><div><span class="nm">${esc(by)}</span> <span class="tm">· <span data-ago="${p.t}">${ago(p.t)}</span></span>${isNew?` <b style="color:var(--brass);font-size:12px">● NEW</b>`:""}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">${p.pod?`<span class="fcchip" style="color:var(--brass)">📋 Plan of the Day</span>`:""}${p.urg?`<span class="fcchip" style="color:var(--warn)">URGENT</span>`:""}${pinned?`<span class="fcchip">📌 Pinned</span>`:""}${p.sl?`<span class="fcchip">✎ ${esc(p.sl)} leader</span>`:""}${p.to&&p.to.k!=="all"?`<span class="fcchip">To: ${esc(f.lk?fdToLabel(p.to):p.to.k==="one"?"you":fdToLabel(p.to))}</span>`:""}</div></div></div>`;
  if(p.pod){const o=podParse(p.txt);const d=parseD(p.pod.d);
    h+=`<div class="fci"><span class="ttl">${d?DOW[d.getDay()]+" "+short(d):"Plan of the Day"}</span>${o.f||o.u?`<div style="display:flex;gap:6px;flex-wrap:wrap">${o.f?`<span class="fcchip">⏱ ${esc(o.f)}</span>`:""}${o.u?`<span class="fcchip">👕 ${esc(o.u)}</span>`:""}</div>`:""}
      ${o.sch.length?`<div class="fcsch">${o.sch.map(([t,x])=>`<b>${esc(t)}</b><span>${esc(x)}</span>`).join("")}</div>`:""}${o.du?`<div class="note">⚑ ${esc(o.du)}</div>`:""}${o.n?`<div class="note">${esc(o.n)}</div>`:""}</div>`}
  else h+=`<div class="bd">${esc(p.txt)}</div>`;
  if(f.lk){const open=fdOpen===p.id;h+=fdStatCard(f,p);
    h+=`<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><button class="chip" data-fdopen="${p.id}" style="cursor:pointer">${open?"Hide":"Who"} ▸</button><button class="chip" data-fdpin="${p.id}" style="cursor:pointer">${pinned?"Unpin":"📌 Pin"}</button>${(f.ra||{})[p.id]?`<span class="note">⏰ remind after ${f.ra[p.id]>=60?f.ra[p.id]/60+" hr":f.ra[p.id]+" min"}</span>`:""}${(f.un||{})[p.id]?`<span class="note">${f.un[p.id]} unmatched</span>`:""}</div>`;
    if(open){const st=fdStats(f,p);const pool=fdPool(p);const pr=sorted(pool.filter(m=>st.A[m.id]&&st.A[m.id].c===2));const miss=sorted(pool.filter(m=>!st.A[m.id]));
      if(pr.length)h+=`<div><b style="color:var(--warn)">Problems</b>${pr.map(m=>`<div class="rtop"><div class="who"><b>${esc(m.rank)}</b> ${esc(m.name)}<div class="ph">${esc(st.A[m.id].note)}</div></div>${m.phone?`<a class="call" href="${telHref(m.phone)}">Call</a>`:""}</div>`).join("")}</div>`;
      if(miss.length){const rb=bcBatches(miss,f.unit+": new word in the Feed you haven't confirmed. Open Accounted For → Feed.");const wb=bcBatches(miss,fdWordBody(f,p));
        h+=`<div><b>Not confirmed (${miss.length})</b><div class="note">${miss.map(m=>esc((m.sec==="ATT"?"ATT":m.sec)+" "+m.rank+" "+lastOf(m))).join(" · ")}</div></div>${wb.map((x,i,arr)=>`<a class="btn" href="${esc(x.href)}">Text them the word${arr.length>1?" · group "+(i+1):""} (${x.n})</a>`).join("")}${rb.map((x,i,arr)=>`<a class="btn alt" href="${esc(x.href)}">Just remind them to check Feed${arr.length>1?" · group "+(i+1):""}</a>`).join("")}`}
      else h+=`<div class="note" style="color:var(--s-onhand);font-weight:700">Everyone confirmed.</div>`;
      h+=`<button class="btn warn" data-fddel="${p.id}">${armed==="fddel"+p.id?"Tap again to delete this post":"Delete post"}</button>`}}
  if(!f.lk)h+=slStats(f,p);
  if(f.lk){}else if(!fdForMe(f,p))h+=`<div class="note" style="margin:0">For ${esc(fdToLabel(p.to))} · no Got it needed from you</div>`;
  else if(mine)h+=`<div><span class="fcchip" style="color:var(${mine.c===2?"--warn":"--s-onhand"})">${mine.c===2?"⚠ Problem sent: "+esc(mine.note):"✓ Confirmed · <span data-ago=\""+mine.t+"\">"+ago(mine.t)+"</span>"}</span></div>`;
  else h+=`<div class="fcbtns"><button class="go" data-fdack="${p.id}" data-c="1">✓ Got it</button><button data-fdprob="${p.id}">Problem</button></div>${fdProbOpen===p.id?`<div class="addph"><input type="text" id="fdNote${p.id}" maxlength="40" placeholder="Short note about the problem"><button data-fdack="${p.id}" data-c="2">Send</button></div>`:""}`;
  return h+`</article>`}
let fdProbOpen=null,fdSlDraft={txt:"",to:"all",urg:false};
function fdPillShow(){const b=$("#fdPill");if(!b)return;b.hidden=!(fdPend>0&&view==="feed");if(!b.hidden)b.textContent="↑ "+fdPend+" new post"+(fdPend>1?"s":"")}
every(30000,()=>{document.querySelectorAll("[data-ago]").forEach(el=>{const t=+el.dataset.ago;if(t)el.textContent=ago(t)})},"ago");
every(10000,()=>{if(view==="feed"&&S.feeds.length)fdPollAll(false)},"feed-open");
window.addEventListener("scroll",()=>{if(view==="feed"&&fdPend&&window.scrollY<120){fdPend=0;const y=window.scrollY;renderFeed();window.scrollTo(0,y)}},{passive:true});

/* ---------- recall roster ---------- */
function digits(p){return String(p||"").replace(/\D/g,"")}
function smsNum(p){const d=digits(p);return d.length===10?"+1"+d:d.length===11&&d[0]==="1"?"+"+d:d}
function normPh(p){let d=digits(p);if(d.length===11&&d[0]==="1")d=d.slice(1);return d.length===10?d:""}
function fmtPh(d){return d&&d.length===10?"("+d.slice(0,3)+") "+d.slice(3,6)+"-"+d.slice(6):d||""}
const telHref=d=>"tel:+1"+d;
const smsTo=d=>"sms:+1"+d;
const PH_RE=/(?<!\d)(?:\+?1[\s.-]?)?\(?[2-9]\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/g;
function lastOf(m){return (m.name.split(",")[0]||"").trim().toUpperCase()}
function first3(m){return (((m.name.split(",")[1]||"").trim().split(/\s+/)[0])||"").toUpperCase().replace(/[^A-Z]/g,"").slice(0,3)}
function wordIn(t,w){if(!w)return false;return new RegExp("(^|[^A-Z])"+w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"([^A-Z]|$)").test(t)}
function matchMarine(t){t=" "+t.toUpperCase()+" ";let c=S.roster.filter(m=>wordIn(t,lastOf(m)));
  if(c.length>1){const f=c.filter(m=>first3(m)&&new RegExp("(^|[^A-Z])"+first3(m)).test(t));if(f.length)c=f}
  if(c.length>1){const r=c.filter(m=>wordIn(t,m.rank));if(r.length)c=r}
  return c.length===1?c[0]:null}
function vcfToCSV(t){const out=["Name,Phone,Alt Phone"];const q=v=>'"'+String(v||"").replace(/"/g,'""')+'"';
  for(const card of String(t).split(/BEGIN:VCARD/i).slice(1)){const L=card.replace(/\r?\n[ \t]/g,"").split(/\r?\n/);
    let fn="",n="";const tel=[];for(const l of L){const k=l.split(":")[0].toUpperCase();const v=l.slice(l.indexOf(":")+1);
      if(k.startsWith("FN"))fn=v;else if(k==="N"||k.startsWith("N;")){const p=v.split(";");n=(p[0]||"")+", "+(p[1]||"")}
      else if(k.startsWith("TEL")){if(/CELL|MOBILE|IPHONE/.test(k))tel.unshift(v);else tel.push(v)}}
    if(tel.length)out.push([n.trim()!==","?n:fn,tel[0],tel[1]].map(q).join(","))}
  return out.join("\n")}
let xlsxP=null;
function loadXLSX(){if(window.XLSX)return Promise.resolve(window.XLSX);if(xlsxP)return xlsxP;
  xlsxP=new Promise((res,rej)=>{const s=document.createElement("script");s.src="lib/xlsx.full.min.js";s.onload=()=>res(window.XLSX);s.onerror=()=>{xlsxP=null;rej(new Error("Couldn't load the Excel reader. Connect to signal once, or save the file as CSV."))};document.head.appendChild(s)});return xlsxP}
function parseRecall(text,opt){opt=opt||{};const rows=parseCSV(text);let hi=-1,cols=[];
  const bad=/edipi|dod|ssn|\bid\b|emerg|nok|next of kin|spouse|parent|zip|unit|uic|room|plate/i;
  const score=x=>/cell|mobile/.test(x)?4:/personal/.test(x)?3:/phone|tel/.test(x)?2:/number|contact/.test(x)?1:0;
  if(!opt.free)for(let i=0;i<Math.min(rows.length,15);i++){const h=rows[i].map(x=>x.toLowerCase());
    const ph=h.map((x,j)=>[j,bad.test(x)?0:score(x)]).filter(a=>a[1]>0).sort((a,b)=>b[1]-a[1]).map(a=>a[0]);
    if(ph.length&&h.some(x=>/name|last|first|marine|member/.test(x))){hi=i;cols=ph.slice(0,2);break}}
  const out=[];const skip=hi>=0?rows[hi].map((x,j)=>bad.test(x)?j:-1).filter(j=>j>=0):[];
  const body=hi>=0?rows.slice(hi+1):rows;
  for(const r of body){let ph=[],rest;
    if(hi>=0){ph=cols.map(j=>normPh(r[j]||"")).filter(Boolean);rest=r.filter((_,j)=>!cols.includes(j)&&!skip.includes(j)).join(" , ")}
    else{const line=r.join(" , ");ph=(line.match(PH_RE)||[]).map(normPh).filter(Boolean);rest=line.replace(PH_RE," ")}
    if(!ph.length)continue;
    const clean=rest.replace(/[^A-Za-z ,.'-]/g," ");const m=matchMarine(clean);
    const nm=clean.replace(/\s+/g," ").replace(/\s+,/g,",").replace(/,+/g,",").replace(/^[ ,.]+|[ ,.]+$/g,"").slice(0,48);
    out.push({t:nm||"(no name)",id:m?m.id:"",p1:ph[0],p2:ph[1]&&ph[1]!==ph[0]?ph[1]:"",on:true})}
  return out}
function importRecall(text,src,opt){const rows=parseRecall(text,opt);S.rcRev={src:src||"Pasted text",rows};S.rcMiss=[];save();
  return {n:rows.length,ok:rows.filter(r=>r.id).length}}
function rcResult(r){return r.n?`Read <b>${r.n}</b> numbers · <b>${r.ok}</b> matched to names. Check them below, fix anything, then tap <b>Attach</b>.`:`No phone numbers found in that file. You can type them in below.`}
function loadLib(url,glob){return new Promise((res,rej)=>{if(window[glob])return res(window[glob]);const s=document.createElement("script");s.src=url;s.onload=()=>res(window[glob]);s.onerror=()=>rej(new Error("Couldn't load the reader for this file. Connect to signal once and try again, or save it as Excel/CSV."));document.head.appendChild(s)})}
function pdfText(buf){const B="lib/";
  return loadLib(B+"pdf.min.js","pdfjsLib").then(P=>{P.GlobalWorkerOptions.workerSrc=B+"pdf.worker.min.js";return P.getDocument({data:buf}).promise}).then(async doc=>{const lines=[];
    for(let p=1;p<=doc.numPages;p++){const tc=await(await doc.getPage(p)).getTextContent();const rows={};
      for(const it of tc.items){if(!it.str||!it.str.trim())continue;const y=Math.round(it.transform[5]/3);(rows[y]=rows[y]||[]).push([it.transform[4],it.str])}
      Object.keys(rows).map(Number).sort((a,b)=>b-a).forEach(y=>lines.push(rows[y].sort((a,b)=>a[0]-b[0]).map(a=>a[1].replace(/,/g," ")).join(" , ")))}
    return lines.join("\n")})}
function docxText(buf){return loadLib("lib/mammoth.browser.min.js","mammoth").then(M=>M.convertToHtml({arrayBuffer:buf})).then(r=>{
  const d=new DOMParser().parseFromString(r.value,"text/html");const q=v=>'"'+String(v).replace(/\s+/g," ").trim().replace(/"/g,'""')+'"';const out=[];
  d.body.querySelectorAll("tr").forEach(tr=>out.push([...tr.children].map(c=>q(c.textContent)).join(",")));
  d.body.querySelectorAll("p,li").forEach(p=>{if(!p.closest("table"))out.push(q(p.textContent))});return out.join("\n")})}
function readRecallFile(f){const name=(f.name||"").toLowerCase();
  if(/\.(xlsx|xls)$/.test(name))return loadXLSX().then(X=>f.arrayBuffer().then(b=>{const wb=X.read(b,{type:"array"});return {t:wb.SheetNames.map(n=>X.utils.sheet_to_csv(wb.Sheets[n])).join("\n")}}));
  if(/\.pdf$/.test(name)||f.type==="application/pdf")return f.arrayBuffer().then(pdfText).then(t=>({t,free:true}));
  if(/\.docx$/.test(name))return f.arrayBuffer().then(docxText).then(t=>({t}));
  if(/\.(doc|pages|jpe?g|png|heic|gif)$/.test(name)||/^image\//.test(f.type))return Promise.reject(new Error("That file type can't be read here. Save it as Excel, CSV, PDF or Word (.docx), or type the numbers in below."));
  return f.text().then(t=>/\.vcf$/.test(name)||/BEGIN:VCARD/i.test(t.slice(0,200))?{t:vcfToCSV(t)}:{t})}
function rcLoadFile(f,outId){const o=$(outId);if(o)o.textContent="Reading "+f.name+"…";
  return readRecallFile(f).then(x=>{const r=importRecall(x.t,f.name,{free:x.free});if(view!=="recall"){view="recall";armed=null;render()}else renderRecall();
    const o2=$("#rcOutR");if(o2)o2.innerHTML=rcResult(r);const b=$("#rvBox");if(b)b.scrollIntoView({behavior:"smooth",block:"start"});toast(r.n?"Review "+r.n+" numbers":"No numbers found")})
  .catch(err=>{const o2=$(outId);if(o2)o2.textContent=err.message||"Couldn't read that file."})}
function rvOpts(sel){return `<option value="">— Not on roster / skip —</option>`+SECTIONS.map(s=>s[0]).concat("ATT").map(k=>{const ms=sorted(S.roster.filter(m=>m.sec===k));return ms.length?`<optgroup label="${k}">${ms.map(m=>`<option value="${m.id}"${m.id===sel?" selected":""}>${esc(m.rank+" "+m.name)}${m.phone?" ✓":""}</option>`).join("")}</optgroup>`:""}).join("")}
function rvHTML(){const R=S.rcRev;if(!R)return"";const rows=R.rows;const ok=rows.filter(r=>r.id).length;const cnt={};rows.forEach(r=>{if(r.id&&r.on)cnt[r.id]=(cnt[r.id]||0)+1});
  return `<div id="rvBox"><h2>Review numbers</h2><div class="panel"><div><b>${esc(R.src)}</b> · ${rows.length} rows · ${ok} matched${rows.length-ok?` · <span style="color:var(--warn)">${rows.length-ok} need a name</span>`:""}</div>
    <p class="note">Check each row. Change the name, fix or type the number, untick anything you don't want. Nothing is saved until you tap Attach.</p>
    <div class="alist">${rows.map((r,i)=>`<div class="rrow rv" style="--sc:${r.id?"var(--s-onhand)":"var(--warn)"}">
      <label class="tog" style="margin:0"><input type="checkbox" data-rvon="${i}"${r.on?" checked":""}> <b>${esc(r.t)}</b></label>
      ${r.id&&r.on&&cnt[r.id]>1?`<div class="note" style="color:var(--warn)">Same name is picked on another row. The last one checked wins.</div>`:""}<select class="wsel" id="rvm${i}" data-rvf="id" data-rvi="${i}" aria-label="Marine for row ${i+1}">${rvOpts(r.id)}</select>
      <div class="addph"><input type="tel" inputmode="tel" id="rvp${i}" data-rvf="p1" data-rvi="${i}" placeholder="Phone" value="${esc(dashPh(r.p1))}" aria-label="Phone"><input type="tel" inputmode="tel" id="rva${i}" data-rvf="p2" data-rvi="${i}" placeholder="Alt #" value="${esc(dashPh(r.p2))}" aria-label="Alt phone"><button type="button" data-rvdel="${i}" style="background:transparent;color:var(--muted);border:1px solid var(--line)" aria-label="Remove row">✕</button></div></div>`).join("")}</div>
    <div class="row2" style="margin-top:8px"><button class="btn alt" id="rvAdd">+ Add a row</button><button class="btn alt" id="rvCancel">Cancel</button></div>
    <button class="btn" id="rvSave" style="width:100%;margin-top:6px">Attach checked numbers</button></div></div>`}
function dashPh(d){return d&&d.length===10?d.slice(0,3)+"-"+d.slice(3,6)+"-"+d.slice(6):d||""}
function rvSync(){const R=S.rcRev;if(!R)return;R.rows.forEach((r,i)=>{const m=$("#rvm"+i),p=$("#rvp"+i),a=$("#rva"+i),c=document.querySelector(`[data-rvon="${i}"]`);
  if(m)r.id=m.value;if(p)r.p1=digits(p.value).length?(normPh(p.value)||p.value.trim()):"";if(a)r.p2=digits(a.value).length?(normPh(a.value)||a.value.trim()):"";if(c)r.on=c.checked});save()}
function rvRedraw(){const y=window.scrollY;renderRecall();window.scrollTo(0,y)}
function missHTML(){const miss=S.rcMiss||[];if(!miss.length)return"";
  const opts=SECTIONS.map(s=>s[0]).concat("ATT").map(k=>{const ms=sorted(S.roster.filter(m=>m.sec===k));return ms.length?`<optgroup label="${k}">${ms.map(m=>`<option value="${m.id}">${esc(m.rank+" "+m.name)}${m.phone?" ✓":""}</option>`).join("")}</optgroup>`:""}).join("");
  return `<h2>Match these numbers</h2><div class="alist">${miss.map((x,i)=>`<div class="rrow"><div class="rtop"><div class="who"><b>${esc(x.t||"(no name)")}</b><div class="ph">${x.ph.map(fmtPh).join(" · ")}</div></div><button class="btn alt" data-mxskip="${i}" style="padding:8px 10px">Skip</button></div>
    <div class="addph"><select id="mx${i}" class="wsel"><option value="">Pick the ${TERM1()}…</option>${opts}</select><button data-mxsave="${i}">Attach</button></div></div>`).join("")}</div>`}
const TERM1=()=>"Marine";
function recallPool(){return S.roster.filter(m=>m.sec!=="ATT"||S.rc.att)}
function recallText(){const pool=recallPool();const res=S.rc.res||{};const got=pool.filter(m=>res[m.id]==="ok");
  const el=S.rc.start?Math.round(((S.rc.end||Date.now())-S.rc.start)/60000):0;
  const L=[unitName().toUpperCase()+" RECALL "+dtg(new Date(S.rc.start||Date.now())),"CONTACTED: "+got.length+"/"+pool.length+" ("+pct(got.length,pool.length)+"%) IN "+el+" MIN"];
  const vm=pool.filter(m=>res[m.id]==="vm"),na=pool.filter(m=>res[m.id]==="na"),nt=pool.filter(m=>!res[m.id]);
  const nm=m=>"- "+(m.sec==="ATT"?"ATT":m.sec)+" "+m.rank+" "+m.name.split(",")[0];
  const ci=S.rc.ci||{};const note=m=>ci[m.id]&&ci[m.id].eta?" ("+ci[m.id].eta.toUpperCase()+")":"";
  const hp=pool.filter(m=>ci[m.id]&&ci[m.id].c===3),dl=pool.filter(m=>ci[m.id]&&ci[m.id].c===2);
  if(hp.length){L.push("");L.push("NEED HELP ("+hp.length+")");sorted(hp).forEach(m=>L.push(nm(m)+note(m)))}
  if(dl.length){L.push("");L.push("DELAYED ("+dl.length+")");sorted(dl).forEach(m=>L.push(nm(m)+note(m)))}
  if(vm.length){L.push("");L.push("LEFT VOICEMAIL ("+vm.length+")");sorted(vm).forEach(m=>L.push(nm(m)))}
  if(na.length){L.push("");L.push("NO ANSWER ("+na.length+")");sorted(na).forEach(m=>L.push(nm(m)))}
  if(nt.length){L.push("");L.push("NOT YET CALLED ("+nt.length+")");sorted(nt).forEach(m=>L.push(nm(m)))}
  return L.join("\n")}
/* ---------- one-tap check-in (recall) ----------
   Leader texts a link; each person taps Good / Delayed / Need help, which opens a text back to the leader
   with a code line. Leader pastes replies here. No server: link details ride in the # part of the URL,
   which browsers never send to the website. */
const CI_BATCH=20;
function ciRid(){return S.rc.rid||(S.rc.start||0).toString(36)}
function rndId(n){const a=crypto.getRandomValues(new Uint8Array(n));return [...a].map(x=>"abcdefghijklmnopqrstuvwxyz0123456789"[x%36]).join("")}
/* live relay */
let liveBusy=false,liveIdx=null;
async function liveCreate(){const L=S.rc.live;if(!L||L.ok||!S.rc.open)return;try{await SB.rpc("create_recall",{p_id:S.rc.rid,p_read_key:L.key});L.ok=true;L.err="";save();pushAttach()}catch(e){L.err=String(e.message||e).slice(0,80);save()}}
/* push alerts to this phone when someone checks in (works with the phone locked) */
const pushOK=()=>NATIVE?!!NP("PushNotifications"):("serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window);
const isIOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent);
const standalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
function b64u(s){const p="=".repeat((4-s.length%4)%4);const b=atob((s+p).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(b,c=>c.charCodeAt(0))}
async function pushSub(ask){if(NATIVE)return nativeSub(ask);if(!pushOK())return null;const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();
  if(!sub&&ask){if(await Notification.requestPermission()!=="granted")return null;sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(SB.vapid)})}return sub}
async function pushAttach(){const L=S.rc.live;if(!L||!L.ok||!S.pushOn)return;try{const sub=await pushSub(false);if(!sub)return;await SB.rpc("set_push",{p_recall:S.rc.rid,p_read_key:L.key,p_sub:sub.toJSON()});L.push=true;save()}catch(e){}}
function pushHTML(){if(!S.rc.live)return"";
  if(!pushOK())return isIOS()&&!standalone()?`<p class="note">For alerts with your phone locked: Share → <b>Add to Home Screen</b>, then run recalls from the home-screen app.</p>`:"";
  if(Notification.permission==="denied")return `<p class="note">Alerts are blocked for this app in your phone settings.</p>`;
  if(S.pushOn&&Notification.permission==="granted")return `<p class="note" style="color:var(--s-onhand);font-weight:700">🔔 Alerts on: this phone buzzes for each check-in${S.rc.live.push?"":" (connecting…)"}</p>`;
  return `<button class="btn alt" id="pushOn">🔔 Alert me on this phone, even when locked</button>`}
async function liveIndex(){if(liveIdx&&liveIdx.rid===S.rc.rid&&liveIdx.n===S.roster.length)return liveIdx;const rid=S.rc.rid;const map=[];
  for(const m of S.roster){const last=SB.words(lastOf(m)),first=SB.words((m.name.split(",")[1]||"").trim().split(/\s+/)[0]||"");
    map.push({m,last:await Promise.all(last.map(w=>SB.h(rid,w))),rank:await SB.h(rid,String(m.rank).toUpperCase().replace(/[^A-Z0-9]/g,"")),first:first[0]?await SB.h(rid,first[0]):"",idh:await SB.h(rid,"ID:"+m.id)})}
  liveIdx={rid,n:S.roster.length,map};return liveIdx}
async function livePoll(){const L=S.rc.live;if(!S.rc.open||!L||liveBusy)return;liveBusy=true;
  try{if(!L.ok){await liveCreate();if(view==="recall"){const y=window.scrollY;const ae=document.activeElement&&document.activeElement.id;if(!(ae&&/^(ciIn|ciMe|rq|phIn)$/.test(ae))){renderRecall();window.scrollTo(0,y)}}}if(!L.ok)return;
    const rows=await SB.rpc("get_checkins",{p_recall:S.rc.rid,p_read_key:L.key,p_after:L.after||0});L.err="";
    if(rows&&rows.length){const idx=await liveIndex();const ci=S.rc.ci=S.rc.ci||{};let n=0,help=0,un=0;
      for(const r of rows){L.after=Math.max(L.after||0,+r.id);const set=new Set(r.words||[]);
        const sc=idx.map.filter(x=>x.last.length&&x.last.every(h=>set.has(h))).map(x=>({m:x.m,s:(set.has(x.rank)?2:0)+(x.first&&set.has(x.first)?1:0)}));
        const best=sc.length?Math.max(...sc.map(x=>x.s)):-1;const top=sc.filter(x=>x.s===best);
        if(top.length===1){const m=top[0].m;ci[m.id]={c:+r.code,eta:String(r.note||"").slice(0,40),t:Date.parse(r.created_at)||Date.now(),live:1};S.rc.res[m.id]="ok";n++;if(+r.code===3)help++}
        else{un++;L.un=(L.un||[]).concat({c:+r.code,note:String(r.note||"").slice(0,40),amb:top.length>1}).slice(-20)}}
      save();if(view==="recall"){const y=window.scrollY;const a=document.activeElement&&document.activeElement.id;if(!(a&&/^(ciIn|ciMe|rq|phIn)$/.test(a))){renderRecall();window.scrollTo(0,y)}}renderTabs();
      if(help){toast("⚠ "+help+" NEED HELP");try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}}else if(n)toast(n+" checked in");if(un)toast(un+" check-in"+(un>1?"s":"")+" didn't match a name")}
  }catch(e){L.err=String(e.message||e).slice(0,80)}finally{liveBusy=false}}
every(6000,()=>{if(S.rc.open&&S.rc.live)livePoll()},"recall");
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&S.rc.open&&S.rc.live)livePoll()});
function liveClose(){const L=S.rc.live;if(L&&L.ok&&S.rc.rid)SB.rpc("close_recall",{p_recall:S.rc.rid,p_read_key:L.key}).catch(()=>{})}
function ciLink(){const q=new URLSearchParams();q.set("ci",ciRid());q.set("u",unitName());if(S.myPh)q.set("to",S.myPh);if(S.rc.live)q.set("l","1");return PUB()+"#"+q.toString()}
function ciBody(){return unitName()+" RECALL "+dtg(new Date(S.rc.start))+"\nCheck in with one tap: "+ciLink()+"\nNo data? Text back your last name and 1 = good, 2 = delayed + ETA, 3 = need help."}
function ciHTML(){const pool=recallPool().filter(m=>m.phone);const ci=S.rc.ci||{};const sent=S.rc.sent||{};
  const hp=sorted(recallPool().filter(m=>ci[m.id]&&ci[m.id].c===3));
  const batches=[];for(let i=0;i<pool.length;i+=CI_BATCH)batches.push(pool.slice(i,i+CI_BATCH));
  const href=b=>"sms:"+b.map(m=>"+1"+m.phone).join(",")+"?&body="+encodeURIComponent(RT(ciBody()));
  let h="";
  if(hp.length)h+=`<div class="panel" style="border-color:var(--warn)"><b style="color:var(--warn)">⚠ NEED HELP (${hp.length})</b>${hp.map(m=>`<div class="rtop"><div class="who"><b>${esc(m.rank)}</b> ${esc(m.name)}${ci[m.id].eta?`<div class="ph">${esc(ci[m.id].eta)}</div>`:""}</div>${m.phone?`<a class="call" href="${telHref(m.phone)}">Call</a>`:""}</div>`).join("")}</div>`;
  h+=`<details class="panel"${Object.keys(ci).length||!Object.keys(sent).length?" open":""}><summary><b>Check-in</b> · ${Object.keys(ci).length} replied</summary>
    ${(()=>{const L=S.rc.live;if(!L)return `<p class="note">Live check-in is off (DATA → Live check-in). Replies come by text.</p>`;
      if(L.ok)return `<p class="note" style="color:var(--s-onhand);font-weight:700">● Live: check-ins appear here by themselves${L.err?` <span style="color:var(--warn)">· reconnecting</span>`:""}</p>${(L.un||[]).length?`<p class="note" style="color:var(--warn)">${L.un.length} check-in${L.un.length>1?"s":""} didn't match one name on your roster${L.un.some(x=>x.c===3)?" (one says NEED HELP)":""}. Ask them to use rank and last name as on the roster.</p>`:""}`;
      return `<p class="note" style="color:var(--warn)">Connecting to live check-in…${L.err?" ("+esc(L.err)+"). Text replies still work.":""}</p>`})()}
    ${pushHTML()}
    <label for="ciMe">My cell (check-in replies come here)</label>
    <input type="tel" id="ciMe" inputmode="tel" value="${esc(fmtPh(S.myPh||""))}" placeholder="808 555 0100">
    ${pool.length?batches.map((b,i)=>`<a class="btn${sent[i]?" alt":""}" data-ciblast="${i}" href="${esc(href(b))}">${sent[i]?"✓ Sent · ":""}Text check-in${batches.length>1?" group "+(i+1)+" of "+batches.length:""} (${b.length})</a>`).join(""):`<p class="note">No phone numbers loaded yet. Load them below.</p>`}
    ${S.myPh?"":`<p class="note" style="color:var(--warn)">Add your cell first so the one-tap link texts you back.</p>`}
    <label for="ciIn">Paste replies</label>
    <textarea id="ciIn" style="min-height:70px" placeholder="CHECK-IN: GOOD - CPL SMITH&#10;#EOOP-CI|...&#10;or: Doe 2 eta 1400"></textarea>
    <div class="row2"><button class="btn" id="ciGo">Mark replies</button><button class="btn alt" id="ciClip">Paste from clipboard</button></div>
    <div class="note" id="ciOut"></div>
    <p class="note">Each person gets a link. They tap <b>Good</b>, <b>Delayed</b> or <b>Need help</b> and hit Send; the text comes to you. Copy a reply, tap <b>Paste from clipboard</b>, and the app marks them. Plain replies work too if the name or their number is in the text. Sent ${CI_BATCH} at a time because carriers limit group texts.</p></details>`;
  return h}
function ciTag(m){const x=(S.rc.ci||{})[m.id];if(!x)return"";const t=x.c===3?"⚠ NEED HELP":x.c===2?"Delayed":"✓ Checked in: good";
  return `<div class="ph" style="font-weight:700;color:var(${x.c===3?"--warn":x.c===2?"--s-duty":"--s-onhand"})">${t}${x.eta?" · "+esc(x.eta):""}</div>`}
function ciCode(t){const s=String(t).toLowerCase();
  if(/\b(help|sos|emergenc\w*|hurt|injur\w*|hospital)\b/.test(s))return 3;
  if(/\b(delay\w*|late|eta|en ?route|omw|on my way|running behind)\b/.test(s))return 2;
  if(/\b(good|ok|okay|up|here|safe|accounted|present|copy|roger)\b|👍|✅/.test(s))return 1;
  const d=s.match(/(?:^|[^\w:])([123])(?![\w:])(?!\s*(?:min|mins|minutes|hr|hrs|hour|hours|mi|miles|pm|am)\b)/);return d?+d[1]:0}
function applyCheckins(text){const rid=ciRid();const ci=S.rc.ci=S.rc.ci||{};let n=0,help=0,old=0;const miss=[];
  const lines=String(text).split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const mark=(m,c,eta)=>{ci[m.id]={c,eta:String(eta||"").replace(/\s+/g," ").trim().slice(0,40),t:Date.now()};S.rc.res[m.id]="ok";n++;if(c===3)help++};
  for(let i=0;i<lines.length;i++){const ln=lines[i];
    const k=ln.indexOf("#EOOP-CI|");
    if(k>=0){const p=ln.slice(k).split("|");if(p[1]!==rid){old++;continue}const c=+p[2];const m=matchMarine(p[3]||"");
      if(m&&c>=1&&c<=3)mark(m,c,p[4]);else miss.push(p[3]||"(no name)");continue}
    if(/^CHECK-IN:/i.test(ln)&&lines[i+1]&&lines[i+1].includes("#EOOP-CI|"))continue;
    let m=null;const ph=(ln.match(PH_RE)||[]).map(normPh).filter(Boolean);
    if(ph.length)m=S.roster.find(x=>ph.includes(x.phone)||ph.includes(x.phone2))||null;
    const rest=ln.replace(PH_RE," ");if(!m)m=matchMarine(rest.replace(/[^A-Za-z ,.'-]/g," "));
    const c=ciCode(rest);
    if(m&&c){const e=(rest.match(/\beta\b[:\s]*([^,;]{1,30})/i)||[])[1]||"";mark(m,c,e?"ETA "+e:c>1?rest.replace(/\s+/g," ").trim():"")}
    else if(c||m)miss.push(ln.slice(0,40))}
  save();
  return n?`${n} marked${help?` · ${help} need help`:""}${miss.length?` · not matched: ${miss.slice(0,5).join("; ")}`:""}${old?` · ${old} from an older recall skipped`:""}`
    :miss.length?`Couldn't match: ${miss.slice(0,5).join("; ")}. Make sure the name or phone number is in the text.`:old?"Those replies are from an older recall.":"No check-in replies found in that text."}
function renderRecall(){const pool=recallPool();const withPh=pool.filter(m=>m.phone).length;const rc=S.rc;const res=rc.res||{};
  let h=banner();
  const got=pool.filter(m=>res[m.id]==="ok").length;
  if(rc.open){const el=Math.round((Date.now()-rc.start)/60000);
    h+=`<div class="mbar"><div class="ct">${got}/${pool.length}<small>contacted · ${el} min</small></div><button class="btn" id="rcClose">Close out</button></div>
      <label class="tog" style="margin:4px 0 6px"><input type="checkbox" id="rcOnly"${rc.only?" checked":""}> Show not yet contacted only</label>`+ciHTML()}
  else{h+=`<h2>Recall roster</h2><div class="panel"><div><b>${withPh}</b> of ${pool.length} Marines have a phone number.</div>
      <label class="tog"><input type="checkbox" id="rcAtt"${rc.att?" checked":""}> Include attached Marines</label>
      <div class="row2"><button class="btn" id="rcStart">Start recall drill</button><button class="btn alt" type="button" onclick="document.getElementById('rcFileR').scrollIntoView({behavior:'smooth',block:'center'})">Load numbers</button></div>
      <p class="note">Tap <b>Call</b> to dial. In a drill, mark each Marine Reached, Voicemail or No answer; the app times it and builds the report. Once the drill starts you can also text everyone a one-tap check-in link.</p></div>
      <h2>Load phone numbers</h2><div class="panel">
        <div id="rcDrop" class="drop"><label for="rcFileR">Drop or pick the recall roster: Excel, CSV, PDF, Word (.docx) or contacts (.vcf)</label><input type="file" id="rcFileR" accept=".csv,.txt,.xlsx,.xls,.vcf,.pdf,.docx,text/csv,text/plain,text/vcard,application/pdf"></div>
        <label for="rcPasteR">Or paste names and numbers</label><textarea id="rcPasteR" style="min-height:80px" placeholder="CPL SMITH, JOHN A. 808-555-0100&#10;Doe Jane (808) 555-0101"></textarea>
        <div class="row2"><button class="btn" id="rcPasteRGo">Read numbers</button><button class="btn alt" id="rvType">Type them in</button></div><div class="note" id="rcOutR"></div>
        <p class="note">The app reads the file and matches each number to a name. You review and edit everything before it is saved. Columns for EDIPI, emergency contact or next of kin are ignored.</p></div>`+rvHTML()+missHTML();
    if(rc.end) h+=`<h2>Last recall</h2><div class="panel"><textarea id="rcMsg" readonly>${esc(recallText())}</textarea><div class="row2"><a class="btn" id="rcSms" href="${esc(smsHref(recallText()))}">Text it</a><button class="btn alt" id="rcCopy">Copy</button></div></div>`}
  h+=`<input class="search" id="rq" type="search" placeholder="Find a Marine" value="${esc(rq)}" style="margin-top:10px">`;
  const groups=SECTIONS.map(s=>s[0]).concat("ATT").map(k=>[k,sorted(pool.filter(m=>m.sec===k))]).filter(g=>g[1].length);
  for(const [k,ms] of groups){let show=ms.filter(m=>!rq||(m.rank+" "+m.name).toLowerCase().includes(rq));if(rc.open&&rc.only)show=show.filter(m=>res[m.id]!=="ok");if(!show.length)continue;
    h+=`<div class="mgrp"><h3><span>${k}</span><span class="note">${ms.filter(m=>m.phone).length}/${ms.length} numbers</span></h3>${show.map(m=>{const r=res[m.id];const col=r==="ok"?"--s-onhand":r==="vm"?"--s-duty":r==="na"?"--warn":"--line";
      return `<div class="rrow" style="--sc:var(${col})"><div class="rtop"><div class="who"><b>${esc(m.rank)}</b> ${esc(m.name)}<div class="ph">${m.phone?fmtPh(m.phone)+(m.phone2?" · alt "+fmtPh(m.phone2):""):"No number"} · ${esc(SHORT[m.status]||m.status)}</div>${ciTag(m)}</div>
        ${m.phone?`<a class="call" href="${telHref(m.phone)}" data-called="${m.id}">Call</a><a class="txt" href="${smsTo(m.phone)}">Text</a>`:`<button class="btn alt" data-addph="${m.id}" style="padding:8px 10px">Add #</button>`}</div>
        ${editPh===m.id?`<div class="addph"><input type="tel" id="phIn" placeholder="808 555 0100" value="${esc(fmtPh(m.phone||""))}"><button data-saveph="${m.id}">Save</button></div>`:""}
        ${m.phone2?`<div><a class="txt" style="min-width:0;padding:0 10px;height:32px" href="${telHref(m.phone2)}">Call alt ${fmtPh(m.phone2)}</a></div>`:""}
        ${rc.open?`<div class="rres">${[["ok","Reached"],["vm","Voicemail"],["na","No answer"]].map(([c,l])=>`<button data-r="${c}" data-rid="${m.id}" aria-pressed="${r===c}">${l}</button>`).join("")}</div>`:""}</div>`}).join("")}</div>`}
  if(rc.open) h+=`<button class="btn warn" id="rcCancel" style="margin-top:16px;width:100%">${armed==="rccancel"?"Tap again to discard this recall":"Discard recall"}</button>`;
  $("#main").innerHTML=h}
let rq="",editPh=null;

/* ---------- events & attendance ---------- */
const EV_TYPES=["Range","MCMAP","Class","Working party","Volunteer","Inspection","Other"];
let evOpen=null,evNew=false,evOnly=false;
function evReq(ev){return S.roster.filter(m=>(m.sec==="ATT"?ev.att:ev.secs.includes(m.sec)))}
function evDone(ev,m){return !!(ev.done||{})[nkey(m)]}
function evText(ev){const req=evReq(ev);const got=req.filter(m=>evDone(ev,m));const owe=sorted(req.filter(m=>!evDone(ev,m)));
  const d=parseD(ev.date);const L=[(ev.name||"EVENT").toUpperCase()+(d?" "+short(d)+" "+String(d.getFullYear()).slice(2):"")+(ev.type?" ("+ev.type.toUpperCase()+")":"")];
  L.push("ATTENDED: "+got.length+"/"+req.length+" ("+pct(got.length,req.length)+"%)");
  L.push("");L.push("STILL OWE ("+owe.length+")");owe.forEach(m=>L.push("- "+(m.sec==="ATT"?"ATT":m.sec)+" "+m.rank+" "+m.name.split(",")[0]+" ("+SHORT[m.status]+")"));
  return L.join("\n")}
function renderEvents(){let h=banner();
  const ev=evOpen&&S.events.find(e=>e.id===evOpen);
  if(ev){const req=evReq(ev);const got=req.filter(m=>evDone(ev,m)).length;
    h+=`<div class="mbar"><div class="ct">${got}/${req.length}<small>attended</small></div><button class="btn alt" id="evBack">All events</button></div>
      <h2 style="margin-top:6px">${esc(ev.name)}</h2><div class="note">${esc(ev.type||"")}${ev.date?" · "+esc(ev.date):""} · required: ${ev.secs.join(", ")}${ev.att?", attached":""}</div>
      ${(()=>{const d=isoOf(ev.date)||ev.date;if(!/^\d{4}-\d{2}-\d{2}$/.test(d||"")||d<dkey())return"";const c=sorted(req).map(m=>({m,cf:busyOn(m,d,{event:ev.id,lim:true})})).filter(x=>x.cf.length);
        return c.length?`<div class="panel" style="border-color:var(${c.some(x=>x.cf.some(y=>y.hard))?"--warn":"--s-duty"})"><b>⚠ Conflicts on ${short(parseD(d))} (${c.length})</b>${c.map(x=>`<div class="rtop"><div class="who"><span data-pcard="${x.m.id}" style="cursor:pointer;text-decoration:underline"><b>${esc(x.m.rank)}</b> ${esc(x.m.name)}</span><div class="ph">${cfLine(x.cf)}</div></div></div>`).join("")}</div>`:`<p class="note" style="color:var(--s-onhand)">✓ No conflicts on the event date.</p>`})()}
      <label class="tog" style="margin:8px 0"><input type="checkbox" id="evOnly"${evOnly?" checked":""}> Show who still owes only</label>
      <div class="row2"><a class="btn" href="${esc(smsHref(evText(ev)))}">Text owe list</a><button class="btn alt" id="evCopy">Copy</button></div>`;
    const groups=SECTIONS.map(s=>s[0]).concat("ATT").map(k=>[k,sorted(req.filter(m=>m.sec===k))]).filter(g=>g[1].length);
    for(const [k,ms] of groups){const left=ms.filter(m=>!evDone(ev,m));const show=evOnly?left:ms;if(!show.length)continue;
      h+=`<div class="mgrp"><h3><span>${k} · ${ms.length-left.length}/${ms.length}</span>${left.length?`<button data-evall="${k}">All ${k} attended</button>`:""}</h3>
        ${show.map(m=>`<button class="mrow${evDone(ev,m)?" on":""}" data-evtog="${esc(nkey(m))}"><span class="box">${evDone(ev,m)?"✓":""}</span><span class="nm2"><b>${esc(m.rank)}</b> ${esc(m.name)} <span class="note">${esc(SHORT[m.status])}</span></span></button>`).join("")}</div>`}
    if(evOnly&&got===req.length) h+=`<p class="note" style="margin-top:12px">Everyone required has attended.</p>`;
    h+=`<button class="btn warn" id="evDel" style="margin-top:16px;width:100%">${armed==="evdel"?"Tap again to delete this event":"Delete event"}</button>`;
    $("#main").innerHTML=h;return}
  h+=`<div class="ahead"><h2>Events & attendance</h2><span>${S.events.length}</span></div>`;
  if(evNew){const _n=new Date();const today=_n.getFullYear()+"-"+String(_n.getMonth()+1).padStart(2,"0")+"-"+String(_n.getDate()).padStart(2,"0");
    h+=`<form class="panel" id="evForm"><label for="evName">Event name</label><input type="text" id="evName" placeholder="e.g. Annual rifle qual, MCMAP tan belt" required>
      <label for="evDate">Date</label><input type="date" id="evDate" value="${today}" class="wsel">
      <label>Type</label><div class="evts">${EV_TYPES.map((t,i)=>`<label class="tog"><input type="radio" name="evType" value="${t}"${i===0?" checked":""}> ${t}</label>`).join("")}</div>
      <label>Required for</label><div class="evts">${SECTIONS.map(([k])=>`<label class="tog"><input type="checkbox" name="evSec" value="${k}" checked> ${k}</label>`).join("")}<label class="tog"><input type="checkbox" id="evAtt"> Attached</label></div>
      <div class="row2"><button class="btn" type="submit">Create event</button><button class="btn alt" type="button" id="evCancel">Cancel</button></div></form>`}
  else h+=`<button class="btn" id="evNewBtn" style="width:100%">New event</button>`;
  const list=S.events.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  h+=list.length?`<div class="alist" style="margin-top:12px">${list.map(e=>{const req=evReq(e);const got=req.filter(m=>evDone(e,m)).length;
    return `<button class="evrow" data-evopen="${e.id}"><div style="min-width:0"><b>${esc(e.name)}</b><div class="note">${esc(e.type||"")}${e.date?" · "+esc(e.date):""} · ${req.length-got} still owe</div></div><div class="p">${got}/${req.length}<small>${pct(got,req.length)}%</small></div></button>`}).join("")}</div>`
    :`<p class="note" style="margin-top:12px">No events yet. Create one for a range day, MCMAP, a required class or a working party, then tap Marines as they attend.</p>`;
  $("#main").innerHTML=h}

/* ---------- armory: weapon assignments + armory muster ---------- */
const WEAPONS=["M4","M4A1","M27 IAR","M16A4","M18","M17","M9","M249","M240B","M2","MK19","M320","M38 SDMR","Other"];
let wEdit=null;
const hasW=m=>m.wpn&&m.wpn.t;
const rackNum=m=>{const n=parseInt((m.wpn&&m.wpn.rack)||"",10);return isNaN(n)?99999:n};
function armText(){const A=S.arm;const ms=S.roster.filter(hasW).sort((a,b)=>rackNum(a)-rackNum(b));const st=A.st||{};
  const inn=ms.filter(m=>st[nkey(m)]==="in"),out=ms.filter(m=>st[nkey(m)]==="out"),ns=ms.filter(m=>!st[nkey(m)]);
  const w=m=>"RACK "+(m.wpn.rack||"?")+" "+m.wpn.t+(m.wpn.s4?" ..."+m.wpn.s4:"")+" ("+m.rank+" "+m.name.split(",")[0]+")";
  const L=["ARMORY MUSTER "+dtg(new Date(A.start||Date.now())),"ACCOUNTED: "+(inn.length+out.length)+"/"+ms.length+" (IN RACK "+inn.length+" · SIGNED OUT "+out.length+")"];
  if(out.length){L.push("");L.push("SIGNED OUT ("+out.length+")");out.forEach(m=>L.push("- "+w(m)))}
  L.push("");L.push("NOT SEEN ("+ns.length+")");ns.forEach(m=>L.push("- "+w(m)));
  return L.join("\n")}
function importWeapons(text){const rows=parseCSV(text);const hi=rows.findIndex(r=>r.some(x=>/weapon/i.test(x))&&r.some(x=>/name/i.test(x)));
  if(hi<0)throw new Error("Use the weapons template: columns Name, Weapon, Rack, Serial (last 4).");
  const H=rows[hi].map(x=>x.toLowerCase());const ci=k=>H.findIndex(x=>x.includes(k));const wi=ci("weapon"),ri=ci("rack"),si=ci("serial");
  let ok=0;const miss=[];
  for(const r of rows.slice(hi+1)){const t=(r[wi]||"").trim();if(!t)continue;const rest=r.filter((_,j)=>j!==wi&&j!==ri&&j!==si).join(" , ");
    const m=matchMarine(rest.replace(/[^A-Za-z ,.'-]/g," "));if(!m){miss.push(rest.replace(/\s+/g," ").trim().slice(0,28));continue}
    const tt=WEAPONS.find(x=>x.replace(/\s/g,"").toUpperCase()===t.replace(/\s/g,"").toUpperCase())||t.toUpperCase();
    m.wpn={t:tt,rack:(r[ri]||"").trim(),s4:digits(r[si]||"").slice(-4)};ok++}
  save();return {ok,miss}}
function renderArmory(){const A=S.arm;const ms=S.roster.filter(hasW).sort((a,b)=>rackNum(a)-rackNum(b));const st=A.st||{};let h=banner();
  if(A.open){const inn=ms.filter(m=>st[nkey(m)]==="in").length,out=ms.filter(m=>st[nkey(m)]==="out").length;
    h+=`<div class="mbar"><div class="ct">${inn+out}/${ms.length}<small>accounted · ${out} out</small></div><button class="btn" id="arClose">Close out</button></div>
      <label class="tog" style="margin:4px 0 8px"><input type="checkbox" id="arOnly"${A.only?" checked":""}> Show not seen only</label><div class="alist">`;
    for(const m of ms){const s=st[nkey(m)];if(A.only&&s)continue;
      h+=`<div class="wrow" style="--sc:var(${s==="in"?"--s-onhand":s==="out"?"--s-aob":"--line"})"><div class="rk">${esc(m.wpn.rack||"–")}</div><div class="wi"><b>${esc(m.wpn.t)}</b>${m.wpn.s4?` <span class="s">…${esc(m.wpn.s4)}</span>`:""}<div class="s">${esc(m.rank+" "+m.name)} · ${m.sec}</div></div>
        <div class="wst"><button data-ws="in" data-wk="${esc(nkey(m))}" aria-pressed="${s==="in"}">In rack</button><button data-ws="out" data-wk="${esc(nkey(m))}" aria-pressed="${s==="out"}">Signed out</button></div></div>`}
    h+=`</div><button class="btn warn" id="arCancel" style="margin-top:16px;width:100%">${armed==="arcancel"?"Tap again to discard":"Discard armory muster"}</button>`;
    $("#main").innerHTML=h;return}
  const byT={};ms.forEach(m=>byT[m.wpn.t]=(byT[m.wpn.t]||0)+1);
  h+=`<h2>Armory</h2><div class="panel"><div><b>${ms.length}</b> weapons assigned${ms.length?":":""}</div>
    ${ms.length?`<div class="chiprow">${Object.entries(byT).map(([t,n])=>`<span class="chip">${esc(t)} ${n}</span>`).join("")}</div>`:""}
    <button class="btn" id="arStart"${ms.length?"":" disabled"}>Start armory muster</button>
    <p class="note">Mark each weapon In rack or Signed out. Close out builds the report with anything not seen. Serials are last 4 only and stay on this phone.</p></div>`;
  if(A.last) h+=`<h2>Last armory muster</h2><div class="panel"><textarea readonly>${esc(A.last)}</textarea><div class="row2"><a class="btn" href="${esc(smsHref(A.last))}">Text it</a><button class="btn alt" id="arCopy">Copy</button></div></div>`;
  h+=`<h2>Load weapon assignments</h2><div class="panel"><label for="wFile">Weapons file (.csv: Name, Weapon, Rack, Serial)</label><input type="file" id="wFile" accept=".csv,text/csv,text/plain"><div class="note" id="wOut"></div></div>`;
  h+=`<h2>Assign by Marine</h2><input class="search" id="wq" type="search" placeholder="Find a Marine" value="${esc(rq)}">`;
  const groups=SECTIONS.map(s=>s[0]).concat("ATT").map(k=>[k,sorted(S.roster.filter(m=>m.sec===k))]).filter(g=>g[1].length);
  for(const [k,list] of groups){const show=list.filter(m=>!rq||(m.rank+" "+m.name).toLowerCase().includes(rq));if(!show.length)continue;
    h+=`<div class="mgrp"><h3><span>${k}</span><span class="note">${list.filter(hasW).length}/${list.length} assigned</span></h3>${show.map(m=>`<div class="wrow" style="--sc:var(${hasW(m)?"--olive":"--line"})"><div class="wi"><b>${esc(m.rank)}</b> ${esc(m.name)}<div class="s">${hasW(m)?esc(m.wpn.t)+" · rack "+esc(m.wpn.rack||"–")+(m.wpn.s4?" · …"+esc(m.wpn.s4):""):"No weapon assigned"}</div>
      ${wEdit===m.id?`<div class="wedit"><select id="wT">${WEAPONS.map(w=>`<option${hasW(m)&&m.wpn.t===w?" selected":""}>${w}</option>`).join("")}</select><input id="wR" placeholder="Rack" value="${esc(hasW(m)?m.wpn.rack:"")}"><input id="wS" inputmode="numeric" maxlength="4" placeholder="Last 4" value="${esc(hasW(m)?m.wpn.s4:"")}">
        <div class="full"><button class="btn" data-wsave="${m.id}">Save</button><button class="btn alt" data-wclear="${m.id}">${hasW(m)?"Remove weapon":"Cancel"}</button></div></div>`:""}</div>
      ${wEdit===m.id?"":`<button class="btn alt" data-wedit="${m.id}" style="padding:8px 10px">${hasW(m)?"Edit":"Assign"}</button>`}</div>`).join("")}</div>`}
  $("#main").innerHTML=h}

/* ---------- glass: pills, bottom sheet, motion, swipe ---------- */
const buzz=()=>{try{navigator.vibrate&&navigator.vibrate(8)}catch(e){}};
const RM=()=>window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function statusSelect(id,cur){return `<button class="pill" data-pick="s" data-pid="${id}" style="--pc:var(${SVAR[cur]})"><span class="dot"></span><span>${esc(SHORT[cur]||cur)}</span></button>`}
function dutySelect(id,cur){const k=cur==="Light Duty"?" ld":cur==="LIMDU"?" lim":"";return `<button class="pill dp${k}" data-pick="d" data-pid="${id}"><span>${esc(cur)}</span></button>`}
/* Fast path: after a status/duty change on a section page, swap in only the changed row and the counts
   (no full-screen rebuild, so scroll position, focus and animations stay put). */
function patchRow(m){try{const code=view.toUpperCase();if(m.sec!==code||!(code==="ATT"||SECTIONS.some(x=>x[0]===code)))return false;
  const main=$("#main");const sel=`.m [data-pick="s"][data-pid="${CSS.escape(m.id)}"]`;const old=main.querySelector(sel);if(!old)return false;
  const tmp=document.createElement("div");const realMain=main;
  realMain.id="main-live";tmp.id="main";document.body.appendChild(tmp);tmp.hidden=true;
  try{renderSection(code)}finally{tmp.remove();realMain.id="main"}
  const nRow=tmp.querySelector(sel);if(!nRow)return false;
  old.closest(".m").replaceWith(nRow.closest(".m"));
  for(const c of [".sechead",".chips"]){const a=realMain.querySelector(c),b=tmp.querySelector(c);if(a&&b)a.replaceWith(b)}
  const sync=[...realMain.querySelectorAll(".sync")],nsync=[...tmp.querySelectorAll(".sync")];if(sync.length===nsync.length)sync.forEach((x,i)=>x.replaceWith(nsync[i]));
  renderTabs();return true}catch(e){return false}}
let sheetCtx=null;
function openSheet(kind,id){const m=S.roster.find(x=>x.id===id);if(!m)return;sheetCtx={kind,id};
  $("#sheetT").innerHTML=`${kind==="s"?"Status":"Duty status"}<small>${esc(m.rank+" "+m.name)}</small>`;
  const opts=kind==="s"?STATUSES:DUTIES;const cur=kind==="s"?m.status:dutyOf(m);
  $("#sheetOpts").innerHTML=opts.map(o=>`<button data-sopt="${esc(o)}" aria-pressed="${o===cur}">${kind==="s"?`<span class="dot" style="background:var(${SVAR[o]})"></span>`:""}${esc(o)}</button>`).join("");
  const sh=$("#sheet");sheetFocus();sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add("open")));buzz()}
let sheetRet=null;
function sheetFocus(){sheetRet=document.activeElement;setTimeout(()=>{const f=document.querySelector('#sheetOpts [aria-pressed="true"]')||document.querySelector("#sheetOpts button");if(f)f.focus({preventScroll:true})},60)}
function closeSheet(){const sh=$("#sheet");sh.classList.remove("open");setTimeout(()=>{if(sh.classList.contains("open"))return;sh.hidden=true;if(sheetRet&&sheetRet.isConnected&&sheetRet.focus)sheetRet.focus({preventScroll:true});sheetRet=null},RM()?0:260);sheetCtx=null}
let lastView=null,slideDir="";
function animateView(){const el=$("#main");if(!el)return;if(lastView!==view){el.classList.remove("vin","vl","vr");void el.offsetWidth;el.classList.add(slideDir||"vin");slideDir=""}lastView=view}
const NUMS={};
function animateNums(){document.querySelectorAll("[data-n]").forEach(el=>{const k=el.dataset.n,to=+el.textContent;const from=NUMS[k];NUMS[k]=to;
  if(from===undefined||from===to||RM())return;const t0=performance.now(),d=420;
  const step=t=>{const p=Math.min(1,(t-t0)/d),e=1-Math.pow(1-p,3);el.textContent=Math.round(from+(to-from)*e);if(p<1)requestAnimationFrame(step)};el.textContent=from;requestAnimationFrame(step)})}
(()=>{let x0=null,y0=null,ok=false;const order=()=>["board"].concat(SECTIONS.map(s=>s[0].toLowerCase()),["att"]);
  document.addEventListener("touchstart",e=>{const t=e.target;ok=!t.closest("input,select,textarea,.gridwrap,.sheet,.tabs");const p=e.touches[0];x0=p.clientX;y0=p.clientY},{passive:true});
  document.addEventListener("touchend",e=>{if(!ok||x0===null)return;const p=e.changedTouches[0];const dx=p.clientX-x0,dy=p.clientY-y0;x0=null;
    if(Math.abs(dx)<70||Math.abs(dy)>45)return;const o=order();const i=o.indexOf(view);if(i<0)return;const j=i+(dx<0?1:-1);if(j<0||j>=o.length)return;
    slideDir=dx<0?"vl":"vr";view=o[j];armed=null;query="";render();window.scrollTo(0,0);buzz();
    const tb=document.querySelector('.tabs [aria-selected="true"]');if(tb&&tb.scrollIntoView)tb.scrollIntoView({inline:"center",block:"nearest",behavior:RM()?"auto":"smooth"})},{passive:true})})();
document.addEventListener("click",e=>{
  if(S.role==="view"&&e.target.closest("[data-pick],[data-rm],#addf button,[data-mtog],[data-mall],[data-r],[data-evtog],[data-evall],[data-ws],[data-rddone],[data-pdone],#caSave,[data-cdel],#fdPost,[data-fdpin],[data-fddel],#bcGo,#reset,#tabSave,#mStart,#rcStart,#dGen,#dRedo,[data-dpick],#pNoteAdd,[data-mpon],#lvOn,#fdCreate")){e.stopImmediatePropagation();e.preventDefault();denyMsg();return}
  if(e.target.closest("#bMode,[data-mode-open]")){e.stopImmediatePropagation();openModeSheet();return}
  const mo=e.target.closest("[data-mopt]");if(mo){e.stopImmediatePropagation();const k=mo.dataset.mopt;const wasFirst=sheetCtx&&sheetCtx.first;closeSheet();if(!S.mode){S.mode=k==="military"?"military":S.mode;save()}
    if(setMode(k)){if(!["board","att","pt","w6","text","data","muster","alerts","recall","events","armory","rollup","live","send","feed","trends","ready","duty","p","cal","log","me","sys","today","ask","people","tools"].includes(view))view="board";render();window.scrollTo(0,0);if(!wasFirst)toast(MODES[k].name+" version on. Same people, new labels.")}if(wasFirst&&!S.onb)setTimeout(()=>showOnb(0),300);return}
  const msh=e.target.closest("[data-mshare]");if(msh){e.stopImmediatePropagation();shareMode(msh.dataset.mshare);return}
  const pk=e.target.closest("[data-pick]");if(pk){e.stopImmediatePropagation();openSheet(pk.dataset.pick,pk.dataset.pid);return}
  if(e.target.closest("[data-sclose]")){e.stopImmediatePropagation();closeSheet();return}
  const so=e.target.closest("[data-sopt]");if(so&&sheetCtx){e.stopImmediatePropagation();const m=S.roster.find(x=>x.id===sheetCtx.id);
    if(m){if(sheetCtx.kind==="s")m.status=so.dataset.sopt;else m.duty=so.dataset.sopt;save();buzz();const y=window.scrollY;closeSheet();if(!patchRow(m)){render();window.scrollTo(0,y)}}return}
  if(e.target.closest(".mrow,[data-r],[data-ws],[data-evtog]"))buzz();
},true);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&sheetCtx)closeSheet()});
["dragenter","dragover"].forEach(t=>document.addEventListener(t,e=>{if(view!=="recall"&&view!=="data")return;if(![...(e.dataTransfer&&e.dataTransfer.types||[])].includes("Files"))return;e.preventDefault();const d=$("#rcDrop");if(d)d.classList.add("over")}));
document.addEventListener("dragleave",e=>{const d=$("#rcDrop");if(d&&!e.relatedTarget)d.classList.remove("over")});
document.addEventListener("drop",e=>{if(view!=="recall"&&view!=="data")return;const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(!f)return;e.preventDefault();const d=$("#rcDrop");if(d)d.classList.remove("over");rcLoadFile(f,view==="recall"?"#rcOutR":"#rcOut")});
function render(){renderTabs();if(view!=="feed"){fdPend=0;fdPillShow()}
  if(PRO_FEAT[view]&&!proOK()){$("#main").innerHTML=banner()+proWallHTML(view);animateView();return}
  if(view==="board")renderBoard();else if(view==="pt")renderPT();else if(view==="w6")renderW();else if(view==="muster")renderMuster();else if(view==="alerts")renderAlerts();else if(view==="recall")renderRecall();else if(view==="events")renderEvents();else if(view==="armory")renderArmory();else if(view==="rollup")renderRollup();else if(view==="live")renderLive();else if(view==="act")renderAct();else if(view==="co")renderCo();else if(view==="send")renderSend();else if(view==="feed")renderFeed();else if(view==="trends")renderTrends();else if(view==="ready")renderReady();else if(view==="duty")renderDuty();else if(view==="p")renderPerson();else if(view==="cal")renderCal();else if(view==="log")renderLog();else if(view==="me")renderMe();else if(view==="sys")renderSys();else if(view==="today")renderToday();else if(view==="ask")renderAsk();else if(view==="people")renderPeople();else if(view==="tools"){renderTools();if(window.MBN&&MBN.on)$("#main").insertAdjacentHTML("beforeend",`<div class="panel"><b>Accounted For Pro</b><p class="note">${proOK()?"Pro is on.":"Company roll-up, logins, recall, QR muster, Excel."}</p><button class="btn alt" data-pro-open="tools">${proOK()?"Pro and subscription":"See Pro"}</button></div>`)}else if(view==="text")renderText();else if(view==="data")renderData();else renderSection(view.toUpperCase());animateView();animateNums()}

/* ---------- CSV import ---------- */
function parseCSV(text){const rows=[];let row=[],f="",q=false;
  for(let i=0;i<text.length;i++){const ch=text[i];
    if(q){if(ch==='"'){if(text[i+1]==='"'){f+='"';i++}else q=false}else f+=ch}
    else if(ch==='"')q=true;else if(ch===","){row.push(f);f=""}
    else if(ch==="\n"||ch==="\r"){if(ch==="\r"&&text[i+1]==="\n")i++;row.push(f);rows.push(row);row=[];f=""}
    else f+=ch}
  if(f||row.length){row.push(f);rows.push(row)}
  return rows.map(r=>r.map(x=>x.replace(/\t/g,"").trim()));
}
function mapStatus(d){d=d||"";if(STATUSES.includes(d))return d;const l=d.toLowerCase();
  if(l.startsWith("leave"))return"Leave";if(l.startsWith("tad")||l.startsWith("fap"))return"TAD";
  if(l.startsWith("field"))return"Operation";if(l.startsWith("medical")||l.includes("siq"))return"Appointment on Base";return"On Hand"}
function mapSec(u){const t=(u||"").toUpperCase().split("-").pop();const v={HQ:"HQ",EE:"HE",HE:"HE",CE:"CE",ORD:"ORD",UT:"UT"}[t]||t;return SECTIONS.some(s=>s[0]===v)?v:(SECTIONS.find(s=>s[1].toUpperCase()===(u||"").toUpperCase())||SECTIONS[0])[0]}
function fmtD(s){if(!s)return"";const m=s.match(/(\d{4})[\/-](\d{2})[\/-](\d{2})/);if(!m)return s;
  const M=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];return m[3]+" "+M[+m[2]-1]+" "+m[1].slice(2)}
function importCSV(text){
  const rows=parseCSV(text);const hi=rows.findIndex(r=>(r[0]||"").toLowerCase()==="rank");
  if(hi<0)throw new Error("No header row starting with 'Rank' was found.");
  const H=rows[hi].map(x=>x.toLowerCase());const col=n=>H.indexOf(n);
  const own=col("section")>=0&&col("status")>=0;
  const out=[];let n=0;
  for(const r of rows.slice(hi+1)){const rank=(r[col("rank")]||"").toUpperCase();const name=r[col("name")]||"";if(!rank||!name)continue;
    if(own) out.push({id:"m"+(++n),rank,name,sec:(SECTIONS.some(s=>s[0]===r[col("section")])||r[col("section")]==="ATT")?r[col("section")]:SECTIONS[0][0],sub:(r[col("sub section")]||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6)||undefined,parent:col("parent unit")>=0?(r[col("parent unit")]||""):"",duty:col("duty")>=0&&DUTIES.includes(r[col("duty")])?r[col("duty")]:"Full Duty",status:mapStatus(r[col("status")]),detail:r[col("detail")]||"",loc:r[col("location")]||"",edd:r[col("edd")]||"",phone:normPh(r[col("phone")]||""),phone2:normPh(r[col("alt phone")]||""),wpn:(r[col("weapon")]||"")?{t:r[col("weapon")],rack:r[col("rack")]||"",s4:digits(r[col("serial4")]||"").slice(-4)}:undefined,start:r[col("start")]||"",end:r[col("end")]||""});
    else{const det=r[col("duty status")]||"";const cm=S.level==="co"?mapCo(r[col("unit")]):null;out.push({id:"m"+(++n),rank,name,sec:cm?cm.sec:mapSec(r[col("unit")]),sub:cm&&cm.sub?cm.sub:undefined,status:mapStatus(det),detail:det,loc:r[col("location")]||"",start:fmtD(r[col("start date")]),end:fmtD(r[col("end date")]),edd:fmtD(r[col("edd")]||"")})}}
  if(!out.length)throw new Error("The file had a header but no Marines under it.");
  return {roster:out,own};
}
function exportCSV(){const q=v=>'"'+String(v??"").replace(/"/g,'""')+'"';
  return ["Rank,Name,Section,Status,Detail,Location,Start,End,Parent Unit,Duty,EDD,Phone,Alt Phone,Weapon,Rack,Serial4,Sub Section"].concat(sorted(S.roster).map(m=>[m.rank,m.name,m.sec,m.status,m.detail,m.loc,m.start,m.end,m.parent||"",dutyOf(m),m.edd||"",m.phone||"",m.phone2||"",m.wpn?m.wpn.t:"",m.wpn?m.wpn.rack:"",m.wpn?m.wpn.s4:"",m.sub||""].map(q).join(","))).join("\n")}

/* ---------- events ---------- */
document.addEventListener("click",e=>{
  const pc=e.target.closest("[data-pcard]");if(pc&&!e.target.closest("button[data-rm],button[data-w6],a,select,[data-pick]")){openCard(pc.dataset.pcard);return}
  if(e.target.closest("[data-pback]")){view=pBack||"board";armed=null;render();window.scrollTo(0,0);return}
  const pe=e.target.closest("[data-pedit]");if(pe){pEdit=pe.dataset.pedit;renderPerson();const i=$("#pPh");if(i)i.focus();return}
  const ps=e.target.closest("[data-psave]");if(ps){const m=S.roster.find(x=>x.id===pid);const d=normPh(($("#pPh")||{}).value||"");if(!d){toast("Enter a 10-digit number.");return}if(m){m.phone=d;save()}pEdit=null;renderPerson();toast("Phone saved");return}
  if(e.target.id==="pNoteAdd"){const m=S.roster.find(x=>x.id===pid);const t=($("#pNote").value||"").trim();if(!t){toast("Type the note first.");return}if(m){m.notes=(m.notes||[]).concat({t:Date.now(),txt:t.slice(0,500)}).slice(-50);save()}renderPerson();toast("Note added");return}
  const pnd=e.target.closest("[data-pndel]");if(pnd){const m=S.roster.find(x=>x.id===pid);const i=+pnd.dataset.pndel;if(armed==="pn"+i){if(m&&m.notes){m.notes.splice(i,1);save()}armed=null}else armed="pn"+i;const y=window.scrollY;renderPerson();window.scrollTo(0,y);return}
  const go=e.target.closest("[data-v],[data-go]");
  if(go){view=go.dataset.v||go.dataset.go;armed=null;query="";render();window.scrollTo(0,0);return}
  if(e.target.closest("#b6W")){view=view==="w6"?"board":"w6";armed=null;render();window.scrollTo(0,0);return}
  const w6b=e.target.closest("[data-w6]");if(w6b){W=newW(w6b.dataset.w6);view="w6";armed=null;render();window.scrollTo(0,0);return}
  const wk=e.target.closest("[data-wkind]");if(wk){W.kind=wk.dataset.wkind;renderW();return}
  const wt=e.target.closest("[data-wtype]");if(wt){W.type=W.type===wt.dataset.wtype?"":wt.dataset.wtype;document.querySelectorAll("[data-wtype]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.wtype===W.type));refreshW();return}
  if(e.target.id==="wCopy"){const t=wText(W);try{navigator.clipboard.writeText(t).then(()=>toast("6W copied"),()=>toast("Copy blocked here. Use Text it."))}catch(err){toast("Copy blocked here. Use Text it.")}return}
  if(e.target.id==="wSave"){if(!W.mid&&!W.other.trim()){toast("Select a Marine first.");return}const i=S.w6.findIndex(r=>r.id===W.id);const rec=Object.assign({},W,{created:W.created||new Date().toISOString()});if(i>=0)S.w6[i]=rec;else S.w6.push(rec);save();renderW();toast("6W saved");return}
  if(e.target.id==="wNew"){W=newW("");renderW();window.scrollTo(0,0);return}
  const wo=e.target.closest("[data-wopen]");if(wo){const r=S.w6.find(x=>x.id===wo.dataset.wopen);if(r){W=Object.assign({},r);view="w6";armed=null;renderTabs();renderW();window.scrollTo(0,0)}return}
  const wd=e.target.closest("[data-wdel]");if(wd){const id=wd.dataset.wdel;if(armed===id){S.w6=S.w6.filter(r=>r.id!==id);armed=null;save();toast("6W deleted")}else armed=id;renderW();return}
  if(e.target.id==="evNewBtn"){evNew=true;renderEvents();const n=$("#evName");if(n)n.focus();return}
  if(e.target.id==="evCancel"){evNew=false;renderEvents();return}
  const eo=e.target.closest("[data-evopen]");if(eo){evOpen=eo.dataset.evopen;evOnly=false;armed=null;renderEvents();window.scrollTo(0,0);return}
  if(e.target.id==="evBack"){evOpen=null;armed=null;renderEvents();window.scrollTo(0,0);return}
  const et=e.target.closest("[data-evtog]");if(et){const ev=S.events.find(x=>x.id===evOpen);if(ev){ev.done=ev.done||{};const k=et.dataset.evtog;if(ev.done[k])delete ev.done[k];else ev.done[k]=1;save();const y=window.scrollY;renderEvents();window.scrollTo(0,y)}return}
  const ea=e.target.closest("[data-evall]");if(ea){const ev=S.events.find(x=>x.id===evOpen);if(ev){ev.done=ev.done||{};evReq(ev).filter(m=>m.sec===ea.dataset.evall).forEach(m=>ev.done[nkey(m)]=1);save();const y=window.scrollY;renderEvents();window.scrollTo(0,y)}return}
  if(e.target.id==="evCopy"){const ev=S.events.find(x=>x.id===evOpen);if(ev){try{navigator.clipboard.writeText(evText(ev)).then(()=>toast("Owe list copied"),()=>toast("Copy blocked here. Use Text."))}catch(err){toast("Copy blocked here.")}}return}
  if(e.target.id==="evDel"){if(armed==="evdel"){S.events=S.events.filter(x=>x.id!==evOpen);evOpen=null;armed=null;save();toast("Event deleted")}else armed="evdel";renderEvents();return}
  if(e.target.id==="arStart"){S.arm.open=true;S.arm.start=Date.now();S.arm.st={};S.arm.only=false;armed=null;save();renderArmory();window.scrollTo(0,0);return}
  const ws=e.target.closest("[data-ws]");if(ws){const k=ws.dataset.wk,v=ws.dataset.ws;if(S.arm.st[k]===v)delete S.arm.st[k];else S.arm.st[k]=v;save();const y=window.scrollY;renderArmory();window.scrollTo(0,y);return}
  if(e.target.id==="arClose"){S.arm.last=armText();S.arm.open=false;S.hist=(S.hist||[]).concat({type:"armory",t:S.arm.start}).slice(-60);save();renderArmory();window.scrollTo(0,0);toast("Armory muster closed");return}
  if(e.target.id==="arCancel"){if(armed==="arcancel"){S.arm.open=false;S.arm.st={};armed=null;save();toast("Armory muster discarded")}else armed="arcancel";renderArmory();return}
  if(e.target.id==="arCopy"){try{navigator.clipboard.writeText(S.arm.last).then(()=>toast("Copied"),()=>toast("Copy blocked here. Use Text it."))}catch(err){toast("Copy blocked here.")}return}
  const we=e.target.closest("[data-wedit]");if(we){wEdit=we.dataset.wedit;const y=window.scrollY;renderArmory();window.scrollTo(0,y);return}
  const wsv=e.target.closest("[data-wsave]");if(wsv){const m=S.roster.find(x=>x.id===wsv.dataset.wsave);if(m){m.wpn={t:$("#wT").value,rack:$("#wR").value.trim(),s4:digits($("#wS").value).slice(-4)};save()}wEdit=null;const y=window.scrollY;renderArmory();window.scrollTo(0,y);toast("Weapon saved");return}
  const wc=e.target.closest("[data-wclear]");if(wc){const m=S.roster.find(x=>x.id===wc.dataset.wclear);if(m&&hasW(m)&&wEdit===m.id&&armed==="wclr"+m.id){delete m.wpn;save();armed=null;wEdit=null;toast("Weapon removed")}else if(m&&hasW(m)){armed="wclr"+m.id;toast("Tap Remove weapon again to confirm");return}else{wEdit=null}const y=window.scrollY;renderArmory();window.scrollTo(0,y);return}
  if(e.target.id==="rcStart"){S.rc.open=true;S.rc.start=Date.now();S.rc.rid=S.rc.start.toString(36)+rndId(4);S.rc.live=S.live===false?null:{key:rndId(32),ok:false,after:0,un:[]};liveIdx=null;setTimeout(livePoll,50);S.rc.end=0;S.rc.res={};S.rc.ci={};S.rc.sent={};S.rc.only=false;armed=null;save();renderRecall();window.scrollTo(0,0);return}
  const rr=e.target.closest("[data-rid]");if(rr){const id=rr.dataset.rid,c=rr.dataset.r;if(S.rc.res[id]===c)delete S.rc.res[id];else S.rc.res[id]=c;save();const y=window.scrollY;renderRecall();window.scrollTo(0,y);return}
  if(e.target.id==="rcClose"){liveClose();S.rc.open=false;S.rc.end=Date.now();S.hist=(S.hist||[]).concat({type:"recall",t:S.rc.start}).slice(-60);save();renderRecall();window.scrollTo(0,0);toast("Recall closed");return}
  if(e.target.id==="rcCancel"){if(armed==="rccancel"){liveClose();S.rc.open=false;S.rc.res={};S.rc.ci={};S.rc.start=0;armed=null;save();toast("Recall discarded")}else armed="rccancel";renderRecall();return}
  if(e.target.id==="pushOn"){e.target.disabled=true;e.target.textContent="Asking…";pushSub(true).then(sub=>{if(sub){S.pushOn=true;save();pushAttach().then(()=>{const y=window.scrollY;renderRecall();window.scrollTo(0,y)});toast("Alerts on")}else{toast("Alerts not allowed");const y=window.scrollY;renderRecall();window.scrollTo(0,y)}}).catch(()=>{toast("Couldn't turn on alerts here.");const y=window.scrollY;renderRecall();window.scrollTo(0,y)});return}
  if(e.target.id==="bpushOn"){e.target.disabled=true;e.target.textContent="Asking…";pushSub(true).then(sub=>{if(!sub){toast("Alerts not allowed");renderLive();return}S.pushOn=true;save();boardPush().then(()=>{renderLive();toast(S.board&&S.board.push?"Alerts on":"Couldn't connect alerts. Try again.")})}).catch(()=>{toast("Couldn't turn on alerts here.");renderLive()});return}
  const trr=e.target.closest("[data-trr]");if(trr){trRange=+trr.dataset.trr;renderTrends();return}
  const rdi=e.target.closest("[data-rditem]");if(rdi){rdItem=rdItem===rdi.dataset.rditem?"":rdi.dataset.rditem;renderReady();return}
  const rdd=e.target.closest("[data-rddone]");if(rdd){const m=S.roster.find(x=>x.id===rdd.dataset.rddone);if(m){markDone(m,rdd.dataset.rdn);save();toast(rdd.dataset.rdn+" done for "+m.rank+" "+lastOf(m))}const y=window.scrollY;renderReady();window.scrollTo(0,y);return}
  const pdn=e.target.closest("[data-pdone]");if(pdn){const m=S.roster.find(x=>x.id===pid);if(m){markDone(m,pdn.dataset.pdone);save();toast("Marked done")}const y=window.scrollY;renderPerson();window.scrollTo(0,y);return}
  if(e.target.id==="rdGo"){try{const r=importReady($("#rdPaste").value);renderReady();$("#rdOut").textContent=r.ok+" people matched · "+r.set+" dates set ("+r.items.join(", ")+")"+(r.miss.length?" · not matched: "+r.miss.slice(0,6).join("; "):"")}catch(err){$("#rdOut").textContent=err.message}return}
  if(e.target.id==="rdCopy"){try{navigator.clipboard.writeText(readyText()).then(()=>toast("Copied"),()=>toast("Copy blocked here."))}catch(err){toast("Copy blocked here.")}return}
  if(e.target.id==="rdAdd"){const n=($("#rdNew").value||"").trim().slice(0,30);if(!n){toast("Name the item.");return}const its=readyItems();if(its.some(x=>x.n.toLowerCase()===n.toLowerCase())){toast("Already tracked.");return}its.push({n,mo:+$("#rdMo").value});rdEdit=true;save();renderReady();toast(n+" added");return}
  const rdr=e.target.closest("[data-rdrm]");if(rdr){const i=+rdr.dataset.rdrm;if(armed==="rdrm"+i){readyItems().splice(i,1);armed=null;save()}else armed="rdrm"+i;rdEdit=true;const y=window.scrollY;renderReady();window.scrollTo(0,y);return}
  const dsl=e.target.closest("[data-dsel]");if(dsl){dSel=dsl.dataset.dsel;dSwap=null;renderDuty();return}
  if(e.target.id==="dMake"){const n=($("#dNm").value||"").trim().slice(0,24)||"Duty";const r={id:"d"+Date.now(),name:n,secs:SECTIONS.map(x=>x[0]),att:false,skip:DUTY_SKIP.slice(),skipLim:true,order:[],ptr:0,assign:{},excl:{}};S.duty.rosters.push(r);dSel=r.id;dSetup=true;dGen(r,30,false);renderDuty();toast("Roster created and filled for 30 days");return}
  if(e.target.id==="dCancel"){dSetup=false;renderDuty();return}
  if(e.target.id==="dNew"){dSetup="new";renderDuty();return}
  if(e.target.id==="dGen"){const r=dCur();const n=dGen(r,30,false);renderDuty();toast(n?n+" days filled":"Already filled");return}
  if(e.target.id==="dRedo"){if(armed==="dredo"){const r=dCur();armed=null;dGen(r,30,true);renderDuty();toast("Redone from today")}else{armed="dredo";renderDuty()}return}
  const dsw=e.target.closest("[data-dswap]");if(dsw){dSwap=dSwap===dsw.dataset.dswap?null:dsw.dataset.dswap;const y=window.scrollY;renderDuty();window.scrollTo(0,y);return}
  if(e.target.id==="dCopy"){try{navigator.clipboard.writeText(dutyText(dCur(),14)).then(()=>toast("Copied"),()=>toast("Copy blocked here."))}catch(err){toast("Copy blocked here.")}return}
  if(e.target.id==="dDel"){if(armed==="ddel"){S.duty.rosters=S.duty.rosters.filter(x=>x!==dCur());dSel=null;armed=null;dSetup=false;save();renderDuty();toast("Roster deleted")}else{armed="ddel";dSetup=true;renderDuty()}return}
  if(e.target.id==="toGo"){if(armed==="togo"){armed=null;e.target.disabled=true;turnoverGo()}else{armed="togo";tabRedraw()}return}
  if(e.target.id==="syOn"){const code=newCode();S.sync={on:true,code,ver:0,at:0,err:"",last:""};syncShow=true;save();tabRedraw();syncPush(true).then(()=>toast(S.sync&&!S.sync.err?"Backed up. Save your code.":"Backup failed: "+(S.sync&&S.sync.err)));return}
  if(e.target.id==="syNow"){syncPush(true).then(()=>{toast(S.sync.err?"Backup failed":"Backed up");tabRedraw()});return}
  if(e.target.id==="syShow"){syncShow=!syncShow;tabRedraw();return}
  if(e.target.id==="syCopy"){try{navigator.clipboard.writeText(S.sync.code).then(()=>toast("Code copied"),()=>toast(S.sync.code))}catch(err){toast(S.sync.code)}return}
  if(e.target.id==="syOff"){if(armed==="syoff"){S.sync.on=false;armed=null;save();tabRedraw();toast("Backup stopped on this phone")}else{armed="syoff";tabRedraw()}return}
  if(e.target.id==="syDel"){if(!isOwner())return denyMsg();if(armed==="sydel"){armed=null;codeKeys(S.sync.code).then(K=>SB.rpc("backup_delete",{p_id:K.id,p_key:K.wk})).then(()=>{S.sync=null;save();tabRedraw();toast("Cloud copy deleted")}).catch(err=>toast("Couldn't delete: "+err.message))}else{armed="sydel";tabRedraw()}return}
  if(e.target.id==="syRestore"){const code=$("#syCode").value;const o=$("#syOut");o.textContent="Unlocking…";syncRestore(code).then(x=>{const n=(x.R.roster||[]).length;
      o.innerHTML=`Found a backup from ${ago(x.at)} with <b>${n}</b> people. <button class="btn warn" id="syApply" style="width:100%;margin-top:6px">Replace this phone's data with it</button>`;window.__syx={code,x}}).catch(err=>{o.textContent=err.message});return}
  if(e.target.id==="syApply"&&window.__syx){applyRestore(window.__syx.code,window.__syx.x,"oic");return}
  if(e.target.id==="syJoin"&&sheetCtx&&sheetCtx.kind==="sync"){const code=sheetCtx.code,rr=sheetCtx.r,ww=sheetCtx.w;const o=$("#syJOut");o.textContent="Unlocking…";syncRestore(code).then(x=>applyRestore(code,x,rr,ww)).catch(err=>{o.textContent=err.message});return}
  const xl=e.target.closest("[data-xl]");if(xl){if(!proOK()){openPro("xl");return}exportXL(xl.dataset.xl);return}
  const csec=e.target.closest("[data-csec]");if(csec){calSec=csec.dataset.csec;renderCal();return}
  const cmo=e.target.closest("[data-cmo]");if(cmo){const [Y,M]=calM;const d=new Date(Y,M+(+cmo.dataset.cmo),1);calM=[d.getFullYear(),d.getMonth()];renderCal();return}
  const cday=e.target.closest("[data-cday]");if(cday){calDay=cday.dataset.cday;calAdd=false;const y=window.scrollY;renderCal();window.scrollTo(0,y);return}
  if(e.target.id==="caAddBtn"){calAdd=!calAdd;const y=window.scrollY;renderCal();window.scrollTo(0,y);return}
  if(e.target.id==="caCancel"){calAdd=false;renderCal();return}
  if(e.target.id==="caSave"){const who=e.target.dataset.cafor||($("#caWho")||{}).value||"";const d=$("#caD").value,ti=($("#caTi").value||"").trim().slice(0,60);if(!who){toast("Pick who.");return}if(!d){toast("Pick a date.");return}if(!ti){toast("Say what it is.");return}
    const end=$("#caE").value;const e2={d,tm:$("#caT").value||"",end:end&&end>d?end:"",ty:$("#caTy").value,ti,no:($("#caNo").value||"").trim().slice(0,80)};
    const ms=who.startsWith("SEC:")?S.roster.filter(m=>m.sec===who.slice(4)):S.roster.filter(m=>m.id===who);
    if(armed!=="caforce"){const hits=[];for(const m of ms)for(const k of daysIn(d,e2.end,31)){const cf=busyOn(m,k,{});if(cf.length)hits.push({m,k,cf})}
      if(hits.length){armed="caforce";const w=$("#caWarn");if(w)w.innerHTML=`<div class="panel" style="margin:6px 0;border-color:var(${hits.some(x=>x.cf.some(y=>y.hard))?"--warn":"--s-duty"})"><b>⚠ ${hits.length} conflict${hits.length>1?"s":""}</b>${hits.slice(0,8).map(x=>`<div class="ph">${ms.length>1?esc(x.m.rank+" "+lastOf(x.m))+" · ":""}${DOW[parseD(x.k).getDay()]} ${short(parseD(x.k))}: ${cfLine(x.cf)}</div>`).join("")}${hits.length>8?`<div class="ph">+${hits.length-8} more</div>`:""}</div>`;e.target.textContent="Add anyway";return}}
    armed=null;ms.forEach(m=>{m.cal=(m.cal||[]).concat(Object.assign({id:"c"+Date.now().toString(36)+rndId(3)},e2)).filter(x=>(x.end||x.d)>=dkey(new Date(Date.now()-120*86400000)))});
    save();calAdd=false;calDay=d;toast("Added for "+(ms.length>1?ms.length+" people":ms[0].rank+" "+lastOf(ms[0])));const y=window.scrollY;render();window.scrollTo(0,y);return}
  const cdl=e.target.closest("[data-cdel]");if(cdl){const [mid,cid]=cdl.dataset.cdel.split(":");if(armed==="cd"+cid){const m=S.roster.find(x=>x.id===mid);if(m)m.cal=(m.cal||[]).filter(x=>x.id!==cid);armed=null;save()}else armed="cd"+cid;const y=window.scrollY;render();window.scrollTo(0,y);return}
  if(e.target.id==="caIcs"){const from=dkey(),to=dkey(new Date(Date.now()+180*86400000));const list=calEntries(from,to,calSec);if(!list.length){toast("Nothing coming up.");return}shareFile(icsFor(list,""),"EOP_Calendar_"+(calSec==="ALL"?"All":calSec)+".ics","text/calendar");return}
  if(e.target.id==="pcIcs"){const m=S.roster.find(x=>x.id===pid);const list=calEntries(dkey(),dkey(new Date(Date.now()+365*86400000)),"ALL").filter(e=>e.m&&e.m.id===m.id);if(!list.length){toast("Nothing coming up.");return}shareFile(icsFor(list,m.name),"Calendar_"+lastOf(m)+".ics","text/calendar");return}
  const lgt=e.target.closest("[data-lgtag]");if(lgt){logTag=lgt.dataset.lgtag;document.querySelectorAll("[data-lgtag]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.lgtag===logTag));return}
  if(e.target.id==="lgAdd"){const t=($("#lgTxt").value||"").trim();if(!t){toast("Write what you got done.");return}S.log.push({id:"l"+Date.now().toString(36),d:dkey(),t:Date.now(),txt:t.slice(0,500),tag:logTag});save();renderLog();toast(logStreak()>1?"Logged · 🔥 "+logStreak()+"-day streak":"Logged");return}
  const lgr=e.target.closest("[data-lgr]");if(lgr){logR=lgr.dataset.lgr;renderLog();return}
  const lge=e.target.closest("[data-lged]");if(lge){logEdit=lge.dataset.lged;const y=window.scrollY;renderLog();window.scrollTo(0,y);return}
  const lgs=e.target.closest("[data-lgsave]");if(lgs){const x=S.log.find(z=>z.id===lgs.dataset.lgsave);const t=($("#lgEd").value||"").trim();if(x&&t){x.txt=t.slice(0,500);save()}logEdit=null;const y=window.scrollY;renderLog();window.scrollTo(0,y);return}
  const lgd=e.target.closest("[data-lgdel]");if(lgd){const id=lgd.dataset.lgdel;if(armed==="lg"+id){S.log=S.log.filter(z=>z.id!==id);armed=null;logEdit=null;save()}else armed="lg"+id;const y=window.scrollY;renderLog();window.scrollTo(0,y);return}
  if(e.target.id==="lgCopy"){const t=logText(logList());try{navigator.clipboard.writeText(t).then(()=>toast("Copied as bullets"),()=>toast("Copy blocked here."))}catch(err){toast("Copy blocked here.")}return}
  if(e.target.id==="lgShare"){const t=logText(logList());if(navigator.share)navigator.share({title:"My log",text:t}).catch(()=>{});else shareFile(t,"My_log.txt","text/plain");return}
  const mpo=e.target.closest("[data-mpon]");if(mpo){const m=S.roster.find(x=>x.id===mpo.dataset.mpon);mpo.disabled=true;mpo.textContent="Publishing…";mpTurnOn(m).then(()=>toast("My page is on. Text them the link."),e=>toast(String(e&&e.message||e).slice(0,90)+" Check signal and tap again.")).finally(()=>{const y=window.scrollY;renderPerson();window.scrollTo(0,y)});return}
  const mpc=e.target.closest("[data-mpcopy]");if(mpc){const m=S.roster.find(x=>x.id===mpc.dataset.mpcopy);const u=mpLink(m);try{navigator.clipboard.writeText(u).then(()=>toast("Link copied"),()=>toast(u))}catch(err){toast(u)}return}
  const mpf=e.target.closest("[data-mpoff]");if(mpf){const m=S.roster.find(x=>x.id===mpf.dataset.mpoff);if(armed==="mpoff"+m.id){armed=null;const pk=m.pk;delete m.pk;delete m.pkSig;delete m.pkAt;delete m.pkSent;save();mpKeys(pk).then(K=>SB.rpc("delete_page",{p_id:K.id,p_wk:K.wk})).catch(()=>{});toast("My page turned off")}else armed="mpoff"+m.id;const y=window.scrollY;renderPerson();window.scrollTo(0,y);return}
  const mps=e.target.closest("[data-mpsent]");if(mps){const m=S.roster.find(x=>x.id===mps.dataset.mpsent);if(m){m.pkSent=Date.now();save()}setTimeout(()=>{if(view==="data")tabRedraw()},500);return}
  if(e.target.id==="mpAll"){let n=0;for(const m of S.roster)if(m.phone&&!m.pk){m.pk=rndId(28);n++}save();e.target.disabled=true;e.target.textContent="Publishing "+n+" pages…";mpPublish().then(()=>{tabRedraw();toast(n+" pages on. Text each link below.")});return}
  if(e.target.id==="meRe"){e.target.textContent="Checking…";mpFetch().then(()=>{renderMe();toast(S.me&&S.me.err?S.me.err:"Up to date.")});return}
  if(e.target.id==="meIcs"){const D=S.me&&S.me.d;if(!D||!D.cal.length){toast("Nothing coming up.");return}shareFile(icsFor(D.cal,D.name),"My_calendar.ics","text/calendar");return}
  if(e.target.id==="meOff"){if(armed==="meoff"){S.me=null;armed=null;save();view="board";render();toast("Removed")}else{armed="meoff";renderMe()}return}
  if(e.target.id==="scGo"){scRun();return}
  if(e.target.id==="akKeyNew"){if(!isOwner())return denyMsg();S.askAdmin=rndId(32);save();renderAsk();return}
  if(e.target.id==="akKeyCopy"){try{navigator.clipboard.writeText(S.askAdmin).then(()=>toast("Key copied. Paste it as AI_ADMIN_KEY."),()=>toast(S.askAdmin))}catch(err){toast(S.askAdmin)}return}
  if(e.target.id==="akConnect"){akManage(null);return}
  if(e.target.id==="akKeyReset"){if(!isOwner())return denyMsg();if(armed==="akreset"){S.askAdmin=rndId(32);akCtl=null;armed=null;save()}else armed="akreset";renderAsk();return}
  const akw=e.target.closest("[data-akwho]");if(akw&&akCtl){akCtl.cfg.who=akw.dataset.akwho;renderAsk();return}
  if(e.target.id==="akSave"){if(!akCtl)return;const c=akCtl.cfg;akManage({on:$("#akOn").checked,who:c.who,cap:+$("#akCap").value||undefined,per:+$("#akPer").value||undefined,feeds:S.feeds.filter(f=>f.lk).map(f=>f.id)});return}
  if(e.target.id==="akGo"){const q=($("#akQ").value||"").trim();akDraft=q;if(q.length<3){toast("Type a question.");return}const bad=akPII(q);if(bad){akErr=bad+" Remove it and ask again.";renderAsk();return}akSend(q);return}
  const akx=e.target.closest("[data-akex]");if(akx){akDraft=akx.dataset.akex;renderAsk();const t=$("#akQ");if(t)t.focus();return}
  const akc=e.target.closest("[data-akcopy]");if(akc){const x=S.ask[+akc.dataset.akcopy];try{navigator.clipboard.writeText(akText(x)).then(()=>toast("Copied"),()=>toast("Copy blocked here."))}catch(err){toast("Copy blocked here.")}return}
  const aks=e.target.closest("[data-akshare]");if(aks){navigator.share({text:akText(S.ask[+aks.dataset.akshare])}).catch(()=>{});return}
  const akd=e.target.closest("[data-akdel]");if(akd){S.ask.splice(+akd.dataset.akdel,1);save();renderAsk();return}
  if(e.target.id==="akClear"){if(armed==="akclr"){S.ask=[];armed=null;save()}else armed="akclr";renderAsk();return}
  if(e.target.id==="scAsk"){(async()=>{try{const r=await fetch("supabase/functions/ask/index.ts",{cache:"no-cache"});await navigator.clipboard.writeText(await r.text());toast("ask code copied. Edge Functions → new function named ask → paste → Deploy.")}catch(err){toast("Copy blocked here.")}})();return}
  if(e.target.closest("#bToday")){view="today";armed=null;tdLast=0;render();window.scrollTo(0,0);return}
  const tda=e.target.closest("[data-tdack]");if(tda){const [fid,pid2]=tda.dataset.tdack.split("|");const f=S.feeds.find(x=>x.id===fid);if(!f)return;tda.disabled=true;fdAck(f,+pid2,1).then(()=>{const y=window.scrollY;renderToday();window.scrollTo(0,y);toast("Got it sent")}).catch(err=>{tda.disabled=false;toast(/gone/.test(String(err&&err.message))?"That post was deleted.":"Couldn't send. Check signal and try again.")});return}
  if(e.target.id==="tdLogAdd"){const t=($("#tdLog").value||"").trim();if(!t){toast("Write what you got done.");return}S.log.push({id:"l"+Date.now().toString(36),d:dkey(),t:Date.now(),txt:t.slice(0,500),tag:logTag||"Other"});save();const y=window.scrollY;renderToday();window.scrollTo(0,y);toast(logStreak()>1?"Logged · 🔥 "+logStreak()+"-day streak":"Logged");return}
  if(e.target.id==="tdLeader"){S.leaderMode=true;save();view="board";render();window.scrollTo(0,0);toast("Leader tools on. Load your roster in DATA.");return}
  if(e.target.id==="rqNew"){fdReqForm=!fdReqForm;const y=window.scrollY;renderFeed();window.scrollTo(0,y);return}
  if(e.target.id==="rqSend"){const f=fdCur();if(!f.me){toast("Set your name first (Change).");return}const o={k:"req",rid:"r"+Date.now().toString(36)+rndId(4),ty:$("#rqTy").value,from:$("#rqF").value,to:$("#rqT").value||"",tm:$("#rqTm").value||"",note:($("#rqNo").value||"").trim().slice(0,200),me:f.me};
    if(!o.from){toast("Pick a date.");return}e.target.disabled=true;e.target.textContent="Sending…";
    fdEnc(f.ek,o).then(ct=>SB.rpc("feed_req",{p_feed:f.id,p_member_key:f.mk,p_ct:ct})).then(()=>{SB.notify(null,{alert:"req",feed:f.id,mk:f.mk});f.myReqs=[{rid:o.rid,ty:o.ty,from:o.from,to:o.to,tm:o.tm,t:Date.now()}].concat(f.myReqs||[]).slice(0,30);fdReqForm=false;save();renderFeed();toast("Request sent")})
      .catch(err=>{e.target.disabled=false;e.target.textContent="Send request";toast(/find the function/i.test(err.message)?"Requests aren't set up on the server yet. Tell your leader to run System check.":"Couldn't send. Check signal and try again.")});return}
  const rqo=e.target.closest("[data-rqok],[data-rqno]");if(rqo){if(!canEdit())return denyMsg();const id=rqo.dataset.rqok||rqo.dataset.rqno;const r=S.reqs.find(x=>x.rid===id);if(!r)return;if(!r.mid){toast("Pick who sent it first.");return}
    r.dnote=(($("#rqn"+id)||{}).value||"").trim().slice(0,80);let freed=[];if(rqo.dataset.rqok)freed=reqApprove(r)||[];else{r.st="denied";r.dt=Date.now()}if(freed.length)setTimeout(()=>toast("Duty now open: "+freed.join(", ")+". Fill it in DUTY."),2300);r.by=(S.unit||unitName());fdReqOpen=true;save();const y=window.scrollY;renderFeed();window.scrollTo(0,y);toast(r.st==="approved"?"Approved"+(["Leave","Special liberty","Appointment"].includes(r.ty)?" · added to their calendar":""):"Denied");return}
  if(e.target.id==="pdOpen"){fdPod=true;const y=window.scrollY;renderFeed();window.scrollTo(0,y);return}
  if(e.target.id==="pdCancel"){fdPod=false;renderFeed();return}
  if(e.target.id==="pdPost"){const f=fdCur();const o={d:$("#pdD").value,f:($("#pdF").value||"").trim(),u:($("#pdU").value||"").trim(),s:($("#pdS").value||"").trim(),du:($("#pdDu").value||"").trim(),n:($("#pdN").value||"").trim()};if(!o.d){toast("Pick the date.");return}
    S.podLast={f:o.f,u:o.u};const txt=podText(o);e.target.disabled=true;e.target.textContent="Posting…";
    fdEnc(f.ek,{t:txt,u:false,to:{k:"all"},pod:{d:o.d},sa:SECTIONS.map(x=>x[0]),by:fdBy(f)}).then(ct=>SB.rpc("feed_post",{p_feed:f.id,p_leader_key:f.lk,p_ct:ct})).then(async id=>{id=+id;SB.notify(null,{feed:f.id,lk:f.lk,urg:false});f.posts=[{id,t:Date.now(),txt,urg:false,to:{k:"all"},pod:{d:o.d},by:fdBy(f)}].concat(f.posts||[]);
      const podIds=new Set(f.posts.filter(p=>p.pod).map(p=>p.id));const ids=[id].concat((f.pins||[]).filter(x=>!podIds.has(x))).slice(0,5);const ct2=await fdEnc(f.ek,{c:"pin",ids});const cid=await SB.rpc("feed_post",{p_feed:f.id,p_leader_key:f.lk,p_ct:ct2});f.pins=ids;f.ctl=Math.max(f.ctl||0,+cid);
      fdPod=false;save();renderFeed();window.scrollTo(0,0);toast("Plan of the Day posted and pinned")}).catch(err=>{e.target.disabled=false;e.target.textContent="Post and pin";toast("Couldn't post: "+(err.message||err))});return}
  const scf=e.target.closest("[data-scf]");if(scf){scCopy(scf.dataset.scf);return}
  if(e.target.id==="scNt"){scCopyNotify();return}
  if(e.target.id==="fdCreate"){e.target.disabled=true;e.target.textContent="Creating…";fdCreate().then(()=>{fdNew=false;renderFeed();toast("Feed created. Invite your people.")}).catch(err=>{e.target.disabled=false;e.target.textContent="Start a feed";const o=$("#fdOut");if(o)o.textContent="Couldn't create: "+(err.message||err)});return}
  if(e.target.id==="fdPushOn"){const f=fdCur();e.target.disabled=true;e.target.textContent="Asking…";pushSub(true).then(sub=>{if(!sub){toast("Alerts not allowed");renderFeed();return}S.pushOn=true;save();fdPushAttach(f).then(()=>{renderFeed();toast(f.push?"Alerts on":"Couldn't connect alerts. Try again.")})}).catch(()=>{toast("Couldn't turn on alerts here.");renderFeed()});return}
  const fto=e.target.closest("[data-fdto]");if(fto){fdDraft.txt=($("#fdTxt")||{}).value||fdDraft.txt;fdDraft.to=fto.dataset.fdto;if(fdDraft.to==="secs"&&!fdDraft.secs.length)fdDraft.secs=SECTIONS.map(x=>x[0]);const y=window.scrollY;renderFeed();window.scrollTo(0,y);return}
  const fpin=e.target.closest("[data-fdpin]");if(fpin){const f=fdCur();const id=+fpin.dataset.fdpin;let ids=(f.pins||[]).slice();ids=ids.includes(id)?ids.filter(x=>x!==id):[id].concat(ids).slice(0,5);fpin.disabled=true;
    fdEnc(f.ek,{c:"pin",ids}).then(ct=>SB.rpc("feed_post",{p_feed:f.id,p_leader_key:f.lk,p_ct:ct})).then(cid=>{f.pins=ids;f.ctl=Math.max(f.ctl||0,+cid);save();const y=window.scrollY;renderFeed();window.scrollTo(0,y);toast(ids.includes(id)?"Pinned for everyone":"Unpinned")}).catch(err=>{fpin.disabled=false;toast("Couldn't pin: "+(err.message||err))});return}
  const fdis=e.target.closest("[data-fddis]");if(fdis){const [fid,pid2]=fdis.dataset.fddis.split(":");const f=S.feeds.find(x=>x.id===fid);if(f){f.rdis=f.rdis||{};f.rdis[pid2]=1;save()}const y=window.scrollY;render();window.scrollTo(0,y);return}
  if(e.target.closest("#fdPill")){fdPend=0;renderFeed();window.scrollTo({top:0,behavior:RM()?"auto":"smooth"});return}
  const fpb=e.target.closest("[data-fdprob]");if(fpb){fdProbOpen=fdProbOpen===+fpb.dataset.fdprob?null:+fpb.dataset.fdprob;const y=window.scrollY;renderFeed();window.scrollTo(0,y);const i=$("#fdNote"+fpb.dataset.fdprob);if(i)i.focus();return}
  if(e.target.id==="fdByEd"){const f=fdCur();sheetCtx={kind:"postas"};$("#sheetT").innerHTML="Posting as<small>Shown on your posts, like GYSGT TYLER or EOP OIC.</small>";
    $("#sheetOpts").innerHTML=`<div class="panel" style="margin:0" data-noxl><input type="text" id="paIn" maxlength="30" value="${esc(fdBy(f))}" autocapitalize="characters" style="text-transform:uppercase"><button class="btn" id="paSave">Save</button></div>`;const sh=$("#sheet");sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add("open")));return}
  if(e.target.id==="paSave"){S.postAs=($("#paIn").value||"").toUpperCase().replace(/[|#]/g," ").trim().slice(0,30);save();closeSheet();renderFeed();toast("Saved");return}
  if(e.target.id==="fdNewFeed"){fdNew=true;renderFeed();return}
  if(e.target.id==="fdCancelNew"){fdNew=false;renderFeed();return}
  const fsel=e.target.closest("[data-fdsel]");if(fsel){fdSel=fsel.dataset.fdsel;fdOpen=null;renderFeed();window.scrollTo(0,0);return}
  if(e.target.id==="fdPost"){const f=fdCur();const txt=($("#fdTxt").value||"").trim();if(!txt){toast("Type the word first.");return}const urg=$("#fdUrg").checked;const D=fdDraft;let to={k:"all"};
    if(D.to==="secs"){if(!D.secs.length&&!D.att){toast("Pick at least one section.");return}to={k:"secs",s:D.secs.slice(),att:D.att}}
    let wP=Promise.resolve(null);if(D.to==="one"){const m=S.roster.find(x=>x.id===D.mid);if(!m){toast("Pick the person.");return}to={k:"one",mid:m.id,n:m.rank+" "+lastOf(m),w:[]};wP=Promise.all(SB.words(m.rank+" "+lastOf(m)).map(w=>SB.h(f.id,w)))}
    e.target.disabled=true;e.target.textContent="Posting…";
    wP.then(w=>{if(w)to.w=w;return fdEnc(f.ek,{t:txt,u:urg,to,sa:SECTIONS.map(x=>x[0]),by:fdBy(f)})}).then(ct=>SB.rpc("feed_post",{p_feed:f.id,p_leader_key:f.lk,p_ct:ct})).then(id=>{SB.notify(null,{feed:f.id,lk:f.lk,urg});f.posts=[{id:+id,t:Date.now(),txt,urg,to,by:fdBy(f)}].concat(f.posts||[]);if(D.ra){f.ra=f.ra||{};f.ra[+id]=D.ra}fdDraft={txt:"",urg:false,to:D.to,secs:D.secs,att:D.att,mid:"",ra:D.ra};save();renderFeed();window.scrollTo(0,0);toast("Posted")})
      .catch(err=>{e.target.disabled=false;e.target.textContent="Post";toast("Couldn't post: "+(err.message||err))});return}
  const slt=e.target.closest("[data-fdslto]");if(slt){fdSlDraft.txt=($("#fdSlTxt")||{}).value||fdSlDraft.txt;fdSlDraft.urg=!!($("#fdSlUrg")||{}).checked;fdSlDraft.to=slt.dataset.fdslto;const y=window.scrollY;renderFeed();window.scrollTo(0,y);return}
  if(e.target.id==="fdSlPost"){const f=fdCur();if(!f||!f.pk)return;const txt=($("#fdSlTxt").value||"").trim();if(!txt){toast("Type the word first.");return}if(!f.me){toast("Set your name first (Change).");return}
    const urg=$("#fdSlUrg").checked;const sec=f.sec||(S.link&&S.link.sec)||"";const to=fdSlDraft.to==="all"||!sec?{k:"all"}:{k:"secs",s:[sec],att:false};const by=f.me;
    e.target.disabled=true;e.target.textContent="Posting…";
    fdEnc(f.ek,{t:txt,u:urg,to,sa:f.secsAll||f.secsLink||[],by,sl:sec}).then(ct=>SB.rpc("feed_post_sl",{p_feed:f.id,p_poster_key:f.pk,p_ct:ct})).then(id=>{SB.notify(null,{feed:f.id,lk:f.pk,urg});f.posts=[{id:+id,t:Date.now(),txt,urg,to,by,sl:sec}].concat(f.posts||[]);f.seen=Math.max(f.seen||0,+id);fdSlDraft={txt:"",to:fdSlDraft.to,urg:false};save();renderFeed();window.scrollTo(0,0);toast("Posted")})
      .catch(err=>{e.target.disabled=false;e.target.textContent="Post";const t=String(err.message||err);toast(/not allowed/.test(t)?"Your OIC's link changed. Ask for a new one.":/could not find|schema/.test(t)?"Your OIC's server needs setup part 11b.":"Couldn't post: "+t.slice(0,60))});return}
  if(e.target.id==="fdCopyLink"){const u=fdLink(fdCur());try{navigator.clipboard.writeText(u).then(()=>toast("Join link copied"),()=>toast(u))}catch(err){toast(u)}return}
  const fo=e.target.closest("[data-fdopen]");if(fo){const id=+fo.dataset.fdopen;fdOpen=fdOpen===id?null:id;const y=window.scrollY;renderFeed();window.scrollTo(0,y);return}
  const fa=e.target.closest("[data-fdack]");if(fa){const f=fdCur();const pid=+fa.dataset.fdack;fa.disabled=true;fdAck(f,pid,+fa.dataset.c).then(()=>{const y=window.scrollY;renderFeed();window.scrollTo(0,y);toast(+fa.dataset.c===2?"Problem sent":"Got it sent")}).catch(err=>{fa.disabled=false;toast(/gone/.test(err.message)?"That post was deleted.":"Couldn't send. Check signal and try again.")});return}
  const fdl=e.target.closest("[data-fddel]");if(fdl){const f=fdCur();const pid=+fdl.dataset.fddel;if(armed==="fddel"+pid){armed=null;SB.rpc("feed_delete_post",{p_feed:f.id,p_leader_key:f.lk,p_post:pid}).then(()=>{f.posts=f.posts.filter(p=>p.id!==pid);fdOpen=null;save();renderFeed();toast("Post deleted")}).catch(()=>toast("Couldn't delete. Try again."))}else{armed="fddel"+pid;const y=window.scrollY;renderFeed();window.scrollTo(0,y)}return}
  if(e.target.id==="fdKill"){if(!isOwner())return denyMsg();const f=fdCur();if(armed==="fdkill"){armed=null;SB.rpc("delete_feed",{p_feed:f.id,p_leader_key:f.lk}).catch(()=>{});S.feeds=S.feeds.filter(x=>x!==f);fdSel=null;save();renderFeed();toast("Feed deleted")}else{armed="fdkill";renderFeed()}return}
  if(e.target.id==="fdLeave"){const f=fdCur();if(armed==="fdleave"){armed=null;S.feeds=S.feeds.filter(x=>x!==f);fdSel=null;save();renderFeed();renderTabs();toast("Left the feed")}else{armed="fdleave";renderFeed()}return}
  if(e.target.id==="fdName"){const f=fdCur();sheetCtx={kind:"fname",id:f.id};$("#sheetT").innerHTML="Your name on this feed<small>Rank and last name, as on your unit's roster.</small>";
    const sl=f.secsAll||f.secsLink||[];
    $("#sheetOpts").innerHTML=`<div class="panel" style="margin:0" data-noxl><input type="text" id="fjMe" maxlength="30" value="${esc(f.me||"")}" placeholder="CPL SMITH" autocapitalize="characters" style="text-transform:uppercase">${sl.length?`<label for="fjSec">Your section</label><select id="fjSec" class="wsel">${fdSecOpts(sl,f.sec||"")}</select>`:""}<button class="btn" id="fnSave">Save</button></div>`;
    const sh=$("#sheet");sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add("open")));return}
  if((e.target.id==="fjYes"||e.target.id==="fnSave")&&sheetCtx){const me=($("#fjMe").value||"").toUpperCase().replace(/[|#]/g," ").replace(/\s+/g," ").trim();if(!me){toast("Enter your rank and last name.");return}S.myName=me;
    const secSel=($("#fjSec")||{}).value||"";let tf=null;
    if(sheetCtx.kind==="fjoin"){const c=sheetCtx;tf={id:c.id,mk:c.mk,ek:c.ek,unit:c.unit,me,sec:secSel,secsLink:c.secsL,posts:[],seen:0,mine:{}};S.feeds.push(tf);fdSel=c.id;if(!S.mode)S.mode="military";S.onb=true}
    else{tf=S.feeds.find(x=>x.id===sheetCtx.id);if(tf){tf.me=me;if($("#fjSec"))tf.sec=secSel}}
    if(tf){closeSheet();fdMeHash(tf).then(()=>{view="feed";render();window.scrollTo(0,0);fdPollAll(true)});save();return}
    save();closeSheet();view="feed";render();window.scrollTo(0,0);fdPollAll(true);return}
  if(e.target.id==="bcGo"){const D=bcDraft;const msg=($("#bcMsg").value||"").trim();if(!msg){toast("Type the message first.");return}if(!D.secs.length&&!D.att){toast("Pick who gets it.");return}
    const b={rid:Date.now().toString(36)+rndId(4),key:rndId(32),msg:msg.slice(0,300),t:Date.now(),secs:D.secs.slice(),att:D.att,ack:{},after:0,ok:false,sent:{},un:0};
    S.bc=S.bc.filter(x=>x.closed||Date.now()-x.t>BC_TTL).concat(b).slice(-10);bcDraft={msg:"",secs:null,att:true};save();renderSend();window.scrollTo(0,0);bcPoll();return}
  const bs=e.target.closest("[data-bcsent]");if(bs){const a=bcActive();if(a){a.sent=Object.assign({},a.sent,{[bs.dataset.bcsent]:1});save();setTimeout(()=>{if(view==="send")rerenderSend()},400)}return}
  if(e.target.id==="bcClose"){const a=bcActive();if(!a)return;if(armed==="bcclose"){a.closed=Date.now();if(a.ok)SB.rpc("close_recall",{p_recall:a.rid,p_read_key:a.key}).catch(()=>{});armed=null;save();renderSend();toast("Message closed out")}else{armed="bcclose";e.target.textContent="Tap again to close";setTimeout(()=>{if(armed==="bcclose"){armed=null;if(view==="send")rerenderSend()}},3000)}return}
  if(e.target.id==="bcCopy"){const a=bcActive();if(a){try{navigator.clipboard.writeText(bcMissText(a)).then(()=>toast("Copied"),()=>toast("Copy blocked here."))}catch(err){toast("Copy blocked here.")}}return}
  if(e.target.id==="lvOn"){e.target.disabled=true;e.target.textContent="Connecting…";boardCreate().then(()=>{renderLive();toast("Live updates on. Send each section its link.");ensureHub().then(()=>{if(view==="live")renderLive()})}).catch(err=>{e.target.disabled=false;e.target.textContent="Turn on live updates for my board";const o=$("#lvOut");if(o)o.textContent="Couldn't connect: "+(err.message||err)});return}
  if(e.target.id==="lvOff"){if(!isOwner())return denyMsg();if(armed==="lvoff"){const B=S.board;SB.rpc("delete_board",{p_board:B.id,p_read_key:B.rk}).catch(()=>{});S.board=null;armed=null;save();toast("Live updates off");renderLive()}else{armed="lvoff";renderLive()}return}
  const lc=e.target.closest("[data-lvcopy]");if(lc){const u=boardLink(lc.dataset.lvcopy);try{navigator.clipboard.writeText(u).then(()=>toast(lc.dataset.lvcopy+" link copied"),()=>toast(u))}catch(err){toast(u)}return}
  if(e.target.id==="jYes"&&sheetCtx&&sheetCtx.kind==="join"){const c=sheetCtx;const me=($("#jMe").value||"").toUpperCase().replace(/[|#]/g," ").replace(/\s+/g," ").trim();if(!me){toast("Enter your rank and last name.");return}
    S.myName=me;S.link={board:c.bid,wk:c.wk,ek:c.ek||"",sec:c.sec,unit:c.unit||"OIC",mysec:$("#jSec").value,me,sig:"",sent:0,err:"",rk2:c.rk2||"",pulled:false,pt:0};if(c.rk2){S.leaderMode=true;if(!S.mode)S.mode="military";S.onb=true}save();closeSheet();view="live";render();if(c.rk2){rosterPull(true);toast("Linked. Loading "+c.sec+" from "+(c.unit||"your OIC")+"…")}else{linkPush(true);toast("Linked. Sending "+S.link.mysec+" now.")}return}
  if(e.target.id==="lkNow"){if(S.link&&S.link.rk2)rosterPull(true);linkPush(true);toast("Sending…");return}
  if(e.target.id==="lkOff"){if(armed==="lkoff"){S.link=null;armed=null;save();toast("Unlinked");renderLive()}else{armed="lkoff";renderLive()}return}
  if(e.target.id==="ciGo"){const r=applyCheckins($("#ciIn").value);const y=window.scrollY;renderRecall();window.scrollTo(0,y);const o=$("#ciOut");if(o)o.textContent=r;return}
  if(e.target.id==="ciClip"){const fail=()=>{const o=$("#ciOut");if(o)o.textContent="This phone blocked clipboard reading. Long-press the box, tap Paste, then Mark replies.";};
    try{navigator.clipboard.readText().then(t=>{const r=applyCheckins(t);const y=window.scrollY;renderRecall();window.scrollTo(0,y);const o=$("#ciOut");if(o)o.textContent=r},fail)}catch(err){fail()}return}
  const cb=e.target.closest("[data-ciblast]");if(cb){S.rc.sent=Object.assign({},S.rc.sent,{[cb.dataset.ciblast]:1});save();setTimeout(()=>{if(view==="recall"){const y=window.scrollY;renderRecall();window.scrollTo(0,y)}},400);return}
  if(e.target.id==="rcCopy"){try{navigator.clipboard.writeText(recallText()).then(()=>toast("Recall copied"),()=>toast("Copy blocked here. Use Text it."))}catch(err){toast("Copy blocked here.")}return}
  const ap=e.target.closest("[data-addph]");if(ap){editPh=ap.dataset.addph;const y=window.scrollY;renderRecall();window.scrollTo(0,y);const i=$("#phIn");if(i)i.focus();return}
  const sp=e.target.closest("[data-saveph]");if(sp){const d=normPh($("#phIn").value);if(!d){toast("Enter a 10-digit number.");return}const m=S.roster.find(x=>x.id===sp.dataset.saveph);if(m){m.phone=d;save()}editPh=null;const y=window.scrollY;renderRecall();window.scrollTo(0,y);toast("Number saved");return}
  if(e.target.id==="rcPasteRGo"){const r=importRecall($("#rcPasteR").value,"Pasted text");renderRecall();const o=$("#rcOutR");if(o)o.innerHTML=rcResult(r);const bx=$("#rvBox");if(bx)bx.scrollIntoView({behavior:"smooth",block:"start"});return}
  if(e.target.id==="tabAdd"){if(secDraft.length<10)secDraft.push({o:"",k:"",n:""});tabRedraw();const i=$(`[data-tk="${secDraft.length-1}"]`);if(i)i.focus();return}
  if(e.target.id==="tabUndo"){secDraft=null;tabRedraw();return}
  if(e.target.id==="tabDef"){secDraft=DEF_SECS.map(([k,n])=>({o:SECTIONS.some(s=>s[0]===k)?k:"",k,n}));tabRedraw();toast("Defaults loaded. Tap Save tabs to keep.");return}
  if(e.target.id==="tabSave"){if(tabSave()){render();toast("Tabs saved")}return}
  const tu=e.target.closest("[data-tup]");if(tu){const i=+tu.dataset.tup;if(i>0){[secDraft[i-1],secDraft[i]]=[secDraft[i],secDraft[i-1]];tabRedraw()}return}
  const td=e.target.closest("[data-tdn]");if(td){const i=+td.dataset.tdn;if(i<secDraft.length-1){[secDraft[i+1],secDraft[i]]=[secDraft[i],secDraft[i+1]];tabRedraw()}return}
  const tx=e.target.closest("[data-tdel]");if(tx){if(secDraft.length>1){secDraft.splice(+tx.dataset.tdel,1);tabRedraw()}return}
  if(e.target.id==="rvAdd"){rvSync();S.rcRev.rows.push({t:"Typed in",id:"",p1:"",p2:"",on:true});save();rvRedraw();const i=S.rcRev.rows.length-1;const s=$("#rvm"+i);if(s){s.scrollIntoView({block:"center"});s.focus()}return}
  if(e.target.id==="rvType"){const R0=S.rcRev;if(R0)rvSync();const have=new Set(R0?R0.rows.map(r=>r.id):[]);const add=sorted(recallPool().filter(m=>!m.phone&&!have.has(m.id))).map(m=>({t:m.rank+" "+m.name,id:m.id,p1:"",p2:"",on:true}));
    S.rcRev=R0||{src:"Typed in",rows:[]};S.rcRev.rows.push(...add);if(!S.rcRev.rows.length)S.rcRev.rows.push({t:"Typed in",id:"",p1:"",p2:"",on:true});save();rvRedraw();const b=$("#rvBox");if(b)b.scrollIntoView({behavior:"smooth",block:"start"});toast(add.length?add.length+" Marines without a number":"Everyone has a number");return}
  if(e.target.id==="rvCancel"){S.rcRev=null;save();rvRedraw();return}
  const rvd=e.target.closest("[data-rvdel]");if(rvd){rvSync();S.rcRev.rows.splice(+rvd.dataset.rvdel,1);save();rvRedraw();return}
  if(e.target.id==="rvSave"){rvSync();let n=0,bad=0,noName=0;const done=new Set();
    for(const r of S.rcRev.rows){if(!r.on)continue;const p1=normPh(r.p1),p2=normPh(r.p2);if(!r.id){if(p1)noName++;continue}if(!p1){bad++;continue}
      const m=S.roster.find(x=>x.id===r.id);if(!m)continue;m.phone=p1;if(p2&&p2!==p1)m.phone2=p2;if(!done.has(m.id)){done.add(m.id);n++}}
    if(bad){toast(bad+" checked row"+(bad>1?"s have":" has")+" no valid 10-digit number. Fix or untick "+(bad>1?"them":"it")+".");return}
    S.rcRev=null;save();rvRedraw();renderTabs();const o=$("#rcOutR");if(o)o.innerHTML=`<b>${n}</b> numbers attached`+(noName?` · ${noName} skipped (no name picked)`:"");toast(n+" numbers attached");return}
  const mxs=e.target.closest("[data-mxsave]");if(mxs){const i=+mxs.dataset.mxsave;const id=$("#mx"+i).value;if(!id){toast("Pick a name first.");return}const m=S.roster.find(x=>x.id===id);const it=(S.rcMiss||[])[i];if(m&&it){m.phone=it.ph[0];if(it.ph[1])m.phone2=it.ph[1];S.rcMiss.splice(i,1);save();const y=window.scrollY;renderRecall();window.scrollTo(0,y);toast("Attached to "+m.rank+" "+m.name.split(",")[0])}return}
  const mxk=e.target.closest("[data-mxskip]");if(mxk){(S.rcMiss||[]).splice(+mxk.dataset.mxskip,1);save();const y=window.scrollY;renderRecall();window.scrollTo(0,y);return}
  if(e.target.id==="rcPasteGo"){const r=importRecall($("#rcPaste").value,"Pasted text");view="recall";armed=null;render();const o=$("#rcOutR");if(o)o.innerHTML=rcResult(r);const bx=$("#rvBox");if(bx)bx.scrollIntoView({behavior:"smooth",block:"start"});return}
  if(e.target.id==="mStart"){S.mus.open=true;S.mus.seen={};S.mus.only=false;armed=null;save();renderMuster();return}
  const mt=e.target.closest("[data-mtog]");if(mt){const id=mt.dataset.mtog;if(S.mus.seen[id])delete S.mus.seen[id];else S.mus.seen[id]=1;save();const y=window.scrollY;renderMuster();window.scrollTo(0,y);return}
  const ma=e.target.closest("[data-mall]");if(ma){musPool().filter(m=>m.sec===ma.dataset.mall).forEach(m=>S.mus.seen[m.id]=1);save();const y=window.scrollY;renderMuster();window.scrollTo(0,y);return}
  if(e.target.id==="mClose"){closeMuster();toast("Muster closed");return}
  if(e.target.id==="qrOn"){qrStart();return}
  if(e.target.id==="qrOff"){qrStop();save();renderMuster();return}
  if(e.target.id==="mCancel"){if(armed==="mcancel"){if(S.mus.qr)qrStop();S.mus.open=false;S.mus.seen={};armed=null;save();toast("Muster discarded")}else armed="mcancel";renderMuster();return}
  if(e.target.id==="mCopy"&&S.mus.last){try{navigator.clipboard.writeText(musText(S.mus.last)).then(()=>toast("Muster copied"),()=>toast("Copy blocked here. Use Text it."))}catch(err){toast("Copy blocked here.")}return}
  if(e.target.id==="alCopy"){try{navigator.clipboard.writeText(alertsText()).then(()=>toast("Alerts copied"),()=>toast("Copy blocked here. Use Text alerts."))}catch(err){toast("Copy blocked here.")}return}
  const sc=e.target.closest("[data-scopy]");if(sc){const t=sectionUpdateText(sc.dataset.scopy);try{navigator.clipboard.writeText(t).then(()=>toast("Section update copied"),()=>toast("Copy blocked here. Use Text update."))}catch(err){toast("Copy blocked here.")}return}
  if(e.target.id==="syncGo"){try{const r=applySectionUpdates($("#syncIn").value);$("#syncOut").textContent=r.join(" · ");renderTabs();toast("Section updates applied")}catch(err){$("#syncOut").textContent=err.message}return}
  if(e.target.id==="rollGo"){try{const r=addRoll($("#rollIn").value);renderRollup();$("#rollOut").textContent=r.join(" · ");toast("Rollup updated")}catch(err){$("#rollOut").textContent=err.message}return}
  if(e.target.id==="rollClip"){const fail=()=>{const o=$("#rollOut");if(o)o.textContent="This phone blocked clipboard reading. Long-press the box and tap Paste, then Add reports.";};
    try{navigator.clipboard.readText().then(t=>{const i=$("#rollIn");if(i)i.value=t;try{const r=addRoll(t);renderRollup();$("#rollOut").textContent=r.join(" · ");toast("Rollup updated")}catch(err){$("#rollOut").textContent=err.message}},fail)}catch(err){fail()}return}
  const rd=e.target.closest("[data-rdel]");if(rd){const k=rd.dataset.rdel;if(armed==="rd"+k){delete S.roll.units[k];armed=null;save();toast(k+" removed")}else armed="rd"+k;const y=window.scrollY;renderRollup();window.scrollTo(0,y);return}
  if(e.target.id==="rollClear"){if(armed==="rollclr"){S.roll.units={};armed=null;save();toast("Unit reports cleared")}else armed="rollclr";renderRollup();return}
  if(e.target.id==="rollCopy"){try{navigator.clipboard.writeText(rollText()).then(()=>toast("Rollup copied"),()=>toast("Copy blocked here. Use Text it."))}catch(err){toast("Copy blocked here.")}return}
  if(e.target.id==="rollShare"){navigator.share({text:rollText()}).catch(()=>{});return}
  if(e.target.id==="markSent"){markSent("report");renderText();toast("Marked as sent");return}
  if(e.target.closest("#sms")){setTimeout(()=>{markSent("report")},300)}
  if(e.target.closest("#bFeed")){fdLimit=20;view=view==="feed"?"board":"feed";armed=null;render();window.scrollTo(0,0);if(view==="feed")fdPollAll(true);return}
  if(e.target.closest("#bPT")){view=view==="pt"?"board":"pt";armed=null;render();window.scrollTo(0,0);return}
  const ev=e.target.closest("[data-evt]");if(ev){S.pt.event=ev.dataset.evt;save();renderPT();return}
  if(e.target.id==="ptCopy"){const t=ptText();try{navigator.clipboard.writeText(t).then(()=>toast("Roster copied"),()=>toast("Copy blocked here. Use Text list."))}catch(err){toast("Copy blocked here. Use Text list.")}return}
  if(e.target.closest("#bText")){view=view==="text"?"board":"text";armed=null;render();window.scrollTo(0,0);return}
  if(e.target.closest("#bData")){secDraft=null;view=view==="data"?"board":"data";armed=null;render();window.scrollTo(0,0);return}
  const rm=e.target.closest("[data-rm]");
  if(rm){const id=rm.dataset.rm;if(armed===id){S.roster=S.roster.filter(m=>m.id!==id);armed=null;save();toast("Marine removed")}else armed=id;render();return}
  if(e.target.id==="reset"){if(armed==="reset"){S.roster=sampleRoster();S.source="sample";S.loadedAt="";armed=null;save();toast("Roster cleared")}else armed="reset";render();return}
  if(e.target.id==="copy"){const t=$("#msg").value;setTimeout(()=>markSent("report"),300);
    const fallback=()=>{const ta=$("#msg");ta.removeAttribute("readonly");ta.select();ta.setSelectionRange(0,t.length);ta.setAttribute("readonly","");toast("Text selected. Tap Copy in the menu.")};
    try{navigator.clipboard.writeText(t).then(()=>toast("Copied. Paste into your text."),fallback)}catch(err){fallback()}return}
  if(e.target.id==="share"){navigator.share({text:$("#msg").value}).then(()=>markSent("report")).catch(()=>{});return}
  if(e.target.id==="exp"){dl.then(d=>{if(!d)return;const day=new Date().toISOString().slice(0,10);
    d.save({filename:"EOP_Numbers_Backup_"+day+".csv",data:exportCSV()}).then(()=>toast("Backup saved")).catch(err=>{if(err&&err.code!=="declined")toast("Couldn't save the backup here.")})});return}
});
document.addEventListener("change",e=>{
  const sel=e.target.closest("select[data-id]");
  if(sel){const m=S.roster.find(x=>x.id===sel.dataset.id);if(m){m.status=sel.value;save();renderTabs();
    const card=sel.closest(".m");card.style.setProperty("--sc","var("+SVAR[m.status]+")");
    const {c}=counts();const o=c[m.sec];const r=document.querySelector(".ratio");if(r)r.innerHTML=o["On Hand"]+"/"+o.total+"<small>"+(m.sec==="ATT"?"on hand / attached":"on hand / strength")+"</small>";
    const ch=document.querySelector(".chips");if(ch)ch.innerHTML=STATUSES.filter(s=>o[s]).map(s=>`<span class="chip"><span class="dot" style="background:var(${SVAR[s]})"></span>${SHORT[s]} ${o[s]}</span>`).join("")}
    return}
  if(e.target.id==="evOnly"){evOnly=e.target.checked;renderEvents();return}
  if(e.target.id==="arOnly"){S.arm.only=e.target.checked;save();renderArmory();return}
  if(e.target.id==="wFile"){const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{try{const r=importWeapons(String(rd.result));renderArmory();const o=$("#wOut");if(o)o.textContent=r.ok+" weapons assigned"+(r.miss.length?" · not matched: "+r.miss.slice(0,8).join("; "):"");toast(r.ok+" weapons assigned")}catch(err){const o=$("#wOut");if(o)o.textContent=err.message}};rd.readAsText(f);return}
  if(e.target.matches&&e.target.matches("input[data-bcsec]")){const k=e.target.dataset.bcsec;bcDraft.msg=($("#bcMsg")||{}).value||bcDraft.msg;bcDraft.secs=e.target.checked?[...new Set(bcDraft.secs.concat(k))]:bcDraft.secs.filter(x=>x!==k);renderSend();return}
  if(e.target.id==="bcAtt"){bcDraft.msg=($("#bcMsg")||{}).value||bcDraft.msg;bcDraft.att=e.target.checked;renderSend();return}
  if(e.target.id==="bcMe"){const d=normPh(e.target.value);if(e.target.value.trim()&&!d){toast("Enter a 10-digit number.");return}S.myPh=d;save();return}
  if(e.target.id==="rdFile"){const f=e.target.files[0];if(!f)return;const o=$("#rdOut");if(o)o.textContent="Reading "+f.name+"…";readRecallFile(f).then(x=>{const r=importReady(x.t);renderReady();$("#rdOut").textContent=r.ok+" people matched · "+r.set+" dates set ("+r.items.join(", ")+")"+(r.miss.length?" · not matched: "+r.miss.slice(0,6).join("; "):"")}).catch(err=>{const o2=$("#rdOut");if(o2)o2.textContent=err.message});e.target.value="";return}
  if(e.target.matches&&e.target.matches("input[data-pdue]")){const m=S.roster.find(x=>x.id===pid);if(m){m.due=m.due||{};const n=e.target.dataset.pdue;m.due[n]={due:e.target.value||"",done:(m.due[n]||{}).done||""};save();const y=window.scrollY;renderPerson();window.scrollTo(0,y);toast("Saved")}return}
  if(e.target.matches&&e.target.matches("select[data-dpick]")){const r=dCur();const k=e.target.dataset.dpick;if(e.target.value==="-")delete r.assign[k];else if(e.target.value)r.assign[k]=e.target.value;dSwap=null;save();const y=window.scrollY;renderDuty();window.scrollTo(0,y);toast("Changed");return}
  if(e.target.matches&&e.target.matches("input[data-dsec]")){const r=dCur();const k=e.target.dataset.dsec;r.secs=e.target.checked?[...new Set(r.secs.concat(k))]:r.secs.filter(x=>x!==k);dSetup=true;save();renderDuty();return}
  if(e.target.id==="dAtt"){const r=dCur();r.att=e.target.checked;dSetup=true;save();renderDuty();return}
  if(e.target.matches&&e.target.matches("input[data-dskip]")){const r=dCur();const k=e.target.dataset.dskip;r.skip=e.target.checked?[...new Set((r.skip||[]).concat(k))]:(r.skip||[]).filter(x=>x!==k);dSetup=true;save();renderDuty();return}
  if(e.target.id==="dLim"){const r=dCur();r.skipLim=e.target.checked;dSetup=true;save();renderDuty();return}
  if(e.target.matches&&e.target.matches("input[data-dexcl]")){const r=dCur();r.excl=r.excl||{};if(e.target.checked)r.excl[e.target.dataset.dexcl]=1;else delete r.excl[e.target.dataset.dexcl];dSetup=true;save();return}
  if(e.target.id==="dName"){const r=dCur();r.name=(e.target.value||"").trim().slice(0,24)||r.name;save();renderDuty();return}
  if(e.target.id==="fdUrg"){fdDraft.urg=e.target.checked;return}
  if(e.target.matches&&e.target.matches("select[data-rqwho]")){const r=S.reqs.find(x=>x.rid===e.target.dataset.rqwho);if(r&&e.target.value){r.mid=e.target.value;save();const y=window.scrollY;renderFeed();window.scrollTo(0,y)}return}
  if(e.target.id==="fdRa"){fdDraft.ra=+e.target.value;return}
  if(e.target.id==="akOn"&&akCtl){akCtl.cfg.on=e.target.checked;return}
  if(e.target.matches&&e.target.matches("input[data-pdate]")){const m=S.roster.find(x=>x.id===pid);if(m){m[e.target.dataset.pdate]=e.target.value?fmtD(e.target.value):"";save();toast("Saved")}return}
  if(e.target.matches&&e.target.matches("input[data-fdsec]")){const k=e.target.dataset.fdsec;fdDraft.secs=e.target.checked?[...new Set(fdDraft.secs.concat(k))]:fdDraft.secs.filter(x=>x!==k);return}
  if(e.target.id==="fdAtt"){fdDraft.att=e.target.checked;return}
  if(e.target.id==="fdWho"){fdDraft.mid=e.target.value;return}
  if(e.target.id==="liveTog"){S.live=e.target.checked;save();toast(S.live?"Live check-in on. Starts with your next recall.":"Live check-in off. Text replies only.");return}
  if(e.target.id==="rcAtt"){S.rc.att=e.target.checked;save();renderRecall();return}
  if(e.target.id==="ciMe"){const d=normPh(e.target.value);if(e.target.value.trim()&&!d){toast("Enter a 10-digit number.");return}S.myPh=d;save();const y=window.scrollY;renderRecall();window.scrollTo(0,y);toast(d?"Replies will come to "+fmtPh(d):"Number cleared");return}
  if(e.target.id==="rcOnly"){S.rc.only=e.target.checked;save();renderRecall();return}
  if(e.target.id==="rcFileR"||e.target.id==="rcFile"){const f=e.target.files[0];if(!f)return;rcLoadFile(f,e.target.id==="rcFileR"?"#rcOutR":"#rcOut");e.target.value="";return}
  if(e.target.closest&&e.target.closest("#rvBox")&&e.target.matches("select,input[type=checkbox]")){rvSync();if(e.target.tagName==="SELECT")rvRedraw();return}
  if(e.target.id==="rcFile_old"){const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{const r=importRecall(String(rd.result));const o=$("#rcOut");if(o)o.textContent=r.ok+" numbers added"+(r.miss.length?" · not matched: "+r.miss.slice(0,8).join("; ")+(r.miss.length>8?" …":""):"");toast(r.ok+" numbers added")};rd.readAsText(f);return}
  if(e.target.matches("input[data-minc]")){const v=e.target.dataset.minc;S.mus.inc=e.target.checked?Array.from(new Set(S.mus.inc.concat(v))):S.mus.inc.filter(x=>x!==v);save();renderMuster();return}
  if(e.target.id==="mAtt"){S.mus.att=e.target.checked;save();renderMuster();return}
  if(e.target.id==="mOnly"){S.mus.only=e.target.checked;save();renderMuster();return}
  if(e.target.id==="chg"){S.chg=e.target.checked;save();renderText();return}
  if(e.target.id==="rollc"){S.rollCode=e.target.checked;save();renderText();return}
  if(e.target.id==="rollOwn"){S.roll.own=e.target.checked;save();renderRollup();return}
  if(e.target.id==="wMar"){W.mid=e.target.value;renderW();return}
  if(e.target.id==="wWhen"){W.when=e.target.value;refreshW();return}
  const ds=e.target.closest("select[data-duty]");
  if(ds){const m=S.roster.find(x=>x.id===ds.dataset.duty);if(m){m.duty=ds.value;save();render()}return}
  if(e.target.id==="ptAtt"){S.pt.att=e.target.checked;save();renderPT();return}
  if(e.target.matches("input[data-inc]")){const v=e.target.dataset.inc;S.pt.inc=e.target.checked?Array.from(new Set(S.pt.inc.concat(v))):S.pt.inc.filter(x=>x!==v);save();renderPT();return}
  if(e.target.id==="nm"){S.names=e.target.checked;save();renderText();return}
  if(e.target.id==="file"){const f=e.target.files[0];if(!f)return;const rd=new FileReader();
    rd.onload=()=>{try{const {roster,own}=importCSV(String(rd.result));const keep=own?[]:S.roster.filter(m=>m.sec==="ATT"&&S.source!=="sample");
      if(!own&&S.source!=="sample"){const dm={};S.roster.forEach(m=>{if(m.duty&&m.duty!=="Full Duty")dm[m.name.toUpperCase()]=m.duty});roster.forEach(m=>{if(dm[m.name.toUpperCase()])m.duty=dm[m.name.toUpperCase()]})}
      if(!own){const wm={};S.roster.forEach(m=>{if(m.wpn)wm[m.name.toUpperCase()]=m.wpn});roster.forEach(m=>{const w=wm[m.name.toUpperCase()];if(w)m.wpn=w})}
      if(!own){const pm={};S.roster.forEach(m=>{if(m.phone)pm[m.name.toUpperCase()]=[m.phone,m.phone2]});roster.forEach(m=>{const p=pm[m.name.toUpperCase()];if(p){m.phone=p[0];if(p[1])m.phone2=p[1]}})}
      S.roster=roster.concat(keep);S.source=own?"backup":"mol";
      S.loadedAt=new Date().toLocaleString([], {day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});save();view="board";render();toast(roster.length+" Marines loaded")}
      catch(err){toast(err.message)}};
    rd.onerror=()=>toast("Couldn't read that file.");rd.readAsText(f);return}
});
document.addEventListener("input",e=>{
  if(secDraft&&e.target.dataset&&(e.target.dataset.tk!==undefined||e.target.dataset.tn!==undefined)){const i=+(e.target.dataset.tk??e.target.dataset.tn);if(secDraft[i]){if(e.target.dataset.tk!==undefined)secDraft[i].k=e.target.value.toUpperCase();else secDraft[i].n=e.target.value}return}
  if(e.target.id==="wq"){rq=e.target.value.toLowerCase();const pos=e.target.selectionStart;renderArmory();const q=$("#wq");q.focus();q.setSelectionRange(pos,pos);return}
  if(e.target.id==="rq"){rq=e.target.value.toLowerCase();const pos=e.target.selectionStart;renderRecall();const q=$("#rq");q.focus();q.setSelectionRange(pos,pos);return}
  if(e.target.matches("[data-wf]")){W[e.target.dataset.wf]=e.target.value;refreshW();return}
  if(e.target.id==="wOther"){W.other=e.target.value;refreshW();return}
  if(e.target.id==="wRep"){S.reporter=e.target.value;save();refreshW();return}
  if(e.target.id==="wWhen"){W.when=e.target.value;refreshW();return}
  if(e.target.id==="ptEvt"||e.target.id==="ptWhen"){S.pt[e.target.id==="ptEvt"?"event":"when"]=e.target.value;save();const a=$("#ptSms");if(a)a.href=smsHref(ptText());document.querySelectorAll("[data-evt]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.evt===S.pt.event));return}
  if(e.target.id==="fdTxt"){fdDraft.txt=e.target.value;return}
  if(e.target.id==="akQ"){akDraft=e.target.value;return}
  if(e.target.id==="lgQ"){logQ=e.target.value;const pos=e.target.selectionStart;renderLog();const q=$("#lgQ");if(q){q.focus();q.setSelectionRange(pos,pos)}return}
  if(e.target.id==="fdQ"){fdQ=e.target.value;const pos=e.target.selectionStart;renderFeed();const q=$("#fdQ");if(q){q.focus();q.setSelectionRange(pos,pos)}return}
  if(e.target.id==="bcMsg"){bcDraft.msg=e.target.value;const l=$("#bcLen");if(l)l.textContent=e.target.value.length+"/300";return}
  if(e.target.id==="unitNm"){S.unit=cleanName(e.target.value);save();const t=reportText();const m=$("#msg");if(m)m.value=t;const a=$("#sms");if(a)a.href=smsHref(t);return}
  if(e.target.id==="rollNm"){S.roll.name=cleanName(e.target.value);save();const t=rollText();const m=$("#rollMsg");if(m)m.value=t;const a=$("#rollSms");if(a)a.href=smsHref(t);return}
  if(e.target.id==="rcp"){S.recipients=e.target.value;save();const a=$("#sms");if(a)a.href=smsHref($("#msg").value);return}
  if(e.target.id==="gq"){const r=$("#gqr");if(r)r.innerHTML=gqHTML(e.target.value);return}
  if(e.target.id==="q"){query=e.target.value.toLowerCase();const pos=e.target.selectionStart;renderSection(view.toUpperCase());const q=$("#q");q.focus();q.setSelectionRange(pos,pos);return}
});
document.addEventListener("submit",e=>{
  if(e.target.id==="evForm"){e.preventDefault();const name=$("#evName").value.trim();if(!name){toast("Name the event.");return}
    const secs=[...document.querySelectorAll("input[name=evSec]:checked")].map(x=>x.value);const att=$("#evAtt").checked;if(!secs.length&&!att){toast("Pick at least one section.");return}
    const ev={id:"e"+Date.now(),name,date:$("#evDate").value,type:(document.querySelector("input[name=evType]:checked")||{}).value||"",secs,att,done:{}};
    S.events.push(ev);save();evNew=false;evOpen=ev.id;renderEvents();window.scrollTo(0,0);toast("Event created");return}
  if(e.target.id!=="addf")return;e.preventDefault();
  const name=$("#aName").value.trim().toUpperCase();if(!name){toast("Enter a name first.");return}
  const sec=view.toUpperCase();const rec={id:"a"+Date.now(),rank:$("#aRank").value,name,sec,status:$("#aStatus").value,duty:$("#aDuty").value,detail:"Added in app",loc:"",start:"",end:""};
  if(sec==="ATT"){const p=$("#aParent").value.trim();if(!p){toast("Enter the parent unit.");return}rec.parent=p.toUpperCase();const w=$("#aWith").value;rec.detail=w?"Working with "+w:"Attached";const d=$("#aEnd").value;rec.end=d?fmtD(d):""}
  S.roster.push(rec);
  save();render();toast(name+" added");
});

const dl=Promise.resolve({save:({filename,data})=>new Promise((res,rej)=>{try{const b=new Blob([data],{type:"text/csv"});
  if(navigator.canShare&&navigator.canShare({files:[new File([b],filename,{type:"text/csv"})]})){navigator.share({files:[new File([b],filename,{type:"text/csv"})],title:filename}).then(()=>res({status:"saved"}),()=>rej({code:"declined"}));return}
  const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=filename;document.body.appendChild(a);a.click();a.remove();res({status:"saved"})}catch(e){rej({code:"unavailable"})}})});
/* ---------- onboarding ---------- */
const ONB=[
 {ic:"📋",t:"Your board",b:["<b>On Hand</b> is who's here now. <b>Total Strength</b> is everyone you're responsible for.","Each tab across the top is a section. Tap a tab to see its Marines.","Tap anyone's status to change it. The numbers update right away."]},
 {ic:"👥",t:"Get your people in",b:["Until you load your own, you're looking at <b>sample Marines</b>.","Go to <b>DATA</b> and load your MOL detail list (CSV or Excel), or add people one at a time in each tab.","Rename, add or reorder tabs in <b>DATA → Tabs</b>."]},
 {ic:"📨",t:"Send the numbers",b:["<b>TEXT</b> builds the accountability report. Tap Text it, Copy or Share.","<b>Muster</b>, <b>Recall</b>, <b>Alerts</b> and <b>Events</b> are on the Board.","Lock the app with a PIN in <b>DATA → Security</b>. Your data never leaves this phone unless you send it."]}];
let onbI=0,onbRet=null;
function showOnb(i){onbI=i;const o=$("#onb");const st=ONB[i];const last=i===ONB.length-1;if(o.hidden)onbRet=document.activeElement;
  o.innerHTML=`<div class="onb-in" role="dialog" aria-modal="true" aria-labelledby="onbT"><div class="onb-step">${i+1} of ${ONB.length}</div>
    <div class="onb-ic" aria-hidden="true">${st.ic}</div><h2 id="onbT">${st.t}</h2><ul>${st.b.map(x=>`<li>${x}</li>`).join("")}</ul>
    <div class="onb-dots" aria-hidden="true">${ONB.map((_,j)=>`<i class="${j===i?"on":""}"></i>`).join("")}</div>
    ${last?`<button class="btn" data-onb="roster">Load my roster</button><button class="btn alt" data-onb="done">Look around with sample data</button>`
      :`<button class="btn" data-onb="next">Next</button><button class="btn alt" data-onb="done">Skip</button>`}
    ${i?`<button class="onb-back" data-onb="back">Back</button>`:""}</div>`;
  o.hidden=false;document.body.classList.add("onb-open");setTimeout(()=>{const b=o.querySelector('[data-onb="next"],[data-onb="roster"]');if(b)b.focus({preventScroll:true})},40)}
function closeOnb(){const o=$("#onb");o.hidden=true;o.innerHTML="";document.body.classList.remove("onb-open");S.onb=true;save();if(onbRet&&onbRet.isConnected&&onbRet.focus)onbRet.focus({preventScroll:true})}
document.addEventListener("click",e=>{const b=e.target.closest("[data-onb]");if(!b)return;const a=b.dataset.onb;
  if(a==="next")showOnb(onbI+1);else if(a==="back")showOnb(onbI-1);else if(a==="done")closeOnb();
  else if(a==="roster"){closeOnb();secDraft=null;view="data";armed=null;render();window.scrollTo(0,0);setTimeout(()=>{const f=$("#file");if(f)f.focus()},100)}
  else if(a==="how"){showOnb(0)}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#onb").hidden)closeOnb()});
/* ---------- feedback / rating ---------- */
const STORE_URL={ios:"https://apps.apple.com/app/id6826541947",android:""};
function storeLink(){const ua=navigator.userAgent;return /iPhone|iPad|iPod/.test(ua)?STORE_URL.ios:/Android/.test(ua)?STORE_URL.android:(STORE_URL.ios||STORE_URL.android)}
function feedbackHref(){const ua=navigator.userAgent;const dev=/iPhone/.test(ua)?"iPhone":/iPad/.test(ua)?"iPad":/Android/.test(ua)?"Android":"Computer";
  const body="What happened or what would you like?\n\n\n---\nPlease don't include names or phone numbers from your roster.\nApp: Accounted For v"+APP_VER+" ("+APP_BUILD+")\nVersion: "+MODE().name+"\nDevice: "+dev+"\nInstalled: "+(matchMedia("(display-mode: standalone)").matches||navigator.standalone?"home screen":"browser")+"\nPIN lock: "+(window.VAULT&&VAULT.on()?"on":"off");
  return "mailto:"+SUPPORT_EMAIL+"?subject="+encodeURIComponent("Accounted For feedback (v"+APP_VER+")")+"&body="+encodeURIComponent(body)}
/* ---------- about ---------- */
const TSIZES=[["1","Normal"],["1.15","Large"],["1.3","Extra large"]];
function applyTS(){const z=+(S.ts||1);document.documentElement.style.zoom=z===1?"":String(z);document.documentElement.classList.toggle("ts-big",z>1)}
function displayHTML(){return `<h2>Display</h2><div class="panel"><label for="tsSel">Text size</label><select id="tsSel">${TSIZES.map(([v,t])=>`<option value="${v}"${String(S.ts||1)===v?" selected":""}>${t}</option>`).join("")}</select>
  <p class="note">Makes everything in the app bigger, including buttons. Use Large or Extra large if the default is hard to read.</p></div>`}
document.addEventListener("change",e=>{if(e.target.id==="tsSel"){S.ts=+e.target.value;save();applyTS();toast("Text size saved")}});
function aboutHTML(){return `<h2>About</h2><div class="panel" data-noxl><div><b>Accounted For</b> · ${esc(MODE().name)} version · v${APP_VER} (${APP_BUILD})</div>
  <p class="note">Your data stays on this phone. No accounts, no analytics, no ads. ${DISCLAIMER}</p>
  <div class="row2"><a class="btn alt" href="privacy.html">Privacy policy</a><a class="btn alt" href="support.html">Support</a></div>
  <div class="row2"><a class="btn" href="${esc(feedbackHref())}">Send feedback</a>${storeLink()?`<a class="btn alt" href="${esc(storeLink())}" target="_blank" rel="noopener">Rate this app ★</a>`:`<button class="btn alt" data-onb="how">How it works</button>`}</div>
  ${storeLink()?`<button class="btn alt" data-onb="how">How it works</button>`:""}</div>`}
/* ---------- security panel ---------- */
const pinIn=(id,lbl,ac)=>`<div><label for="${id}">${lbl}</label><input id="${id}" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="${ac}" maxlength="8"></div>`;
function secHTML(){return secHTML0()+nativeHTML()}
function secHTML0(){const V=window.VAULT;
  const erase=`<button class="btn warn" id="secErase">${armed==="erase"?"Tap again: erase ALL app data on this phone":"Erase all app data on this phone"}</button>`;
  if(!V||!V.ok)return `<h2>Security</h2><div class="panel"><p class="note">This browser can't encrypt data. Open the app in Safari or Chrome.</p>${erase}</div>`;
  if(!V.on())return `<h2>Security</h2><div class="panel"><p class="note"><b>Lock is off.</b> Set a PIN to lock the app and encrypt the roster stored on this phone. There is no PIN recovery: if you forget it, the only fix is erasing the data.</p>
    <div class="row2">${pinIn("pinA","New PIN (4–8 digits)","new-password")}${pinIn("pinB","Repeat PIN","new-password")}</div>
    <button class="btn" id="secSet">Turn on PIN lock</button>${erase}</div>`;
  const c=V.cfg||{};const opt=(v,t)=>`<option value="${v}"${+c.auto===v?" selected":""}>${t}</option>`;
  return `<h2>Security</h2><div class="panel"><div><b>🔒 PIN lock is on.</b> <span class="note">Roster data on this phone is encrypted (AES-256).</span></div>
    <label for="secAuto">Lock again after leaving the app</label><select id="secAuto">${opt(0,"Right away")}${opt(1,"1 minute")}${opt(5,"5 minutes")}${opt(15,"15 minutes")}${opt(60,"1 hour")}${opt(-1,"Only when I tap Lock now")}</select>
    ${window.MBN&&MBN.on&&MBN.platform!=="android"?`<label class="tog"><input type="checkbox" id="secFace"${c.face?" checked":""}> Unlock with Face ID</label>`:""}
    <label class="tog"><input type="checkbox" id="secWipe"${c.wipe?" checked":""}> Erase all data after 10 wrong PINs</label>
    <button class="btn alt" id="secLock">Lock now</button>
    <details><summary>Change PIN or turn off lock</summary>
      <div class="row2">${pinIn("pinC","Current PIN","current-password")}<div></div>${pinIn("pinA","New PIN","new-password")}${pinIn("pinB","Repeat new PIN","new-password")}</div>
      <div class="row2" style="margin-top:8px"><button class="btn alt" id="secChange">Change PIN</button><button class="btn warn" id="secOff">Turn off lock</button></div></details>
    <p class="note">Backup files you export are not encrypted. Store and send them only over approved channels.</p>${erase}</div>`}
function pinsOK(){const a=($("#pinA")||{}).value||"",b=($("#pinB")||{}).value||"";
  if(!/^\d{4,8}$/.test(a)){toast("PIN must be 4 to 8 digits.");return null}if(a!==b){toast("PINs don't match.");return null}
  if(/^(\d)\1+$/.test(a)||"0123456789".includes(a)||"9876543210".includes(a)){toast("Too easy to guess. Pick another PIN.");return null}return a}
document.addEventListener("click",async e=>{const id=e.target.id;const V=window.VAULT;
  if(id==="secErase"){if(armed==="erase"){V?V.eraseAll():(localStorage.clear(),location.reload())}else{armed="erase";tabRedraw()}return}
  if(!V)return;
  if(id==="secSet"){const p=pinsOK();if(!p)return;e.target.disabled=true;e.target.textContent="Encrypting…";
    try{await V.setPin(p,JSON.stringify(S),{title:(typeof appName==="function"?appName():"Accounted For")});toast("PIN lock on. Data encrypted.")}catch(err){toast("Couldn't turn on the lock here.")}tabRedraw();return}
  if(id==="secLock"){V.lockNow();return}
  if(id==="secChange"||id==="secOff"){const cur=($("#pinC")||{}).value||"";if(!cur){toast("Enter your current PIN.");return}
    e.target.disabled=true;const ok=await V.check(cur);e.target.disabled=false;if(!ok){toast("Current PIN is wrong.");return}
    if(id==="secOff"){V.off(JSON.stringify(S));toast("Lock off. Data is no longer encrypted.");tabRedraw();return}
    const p=pinsOK();if(!p)return;await V.setPin(p,JSON.stringify(S),{auto:V.cfg.auto,wipe:V.cfg.wipe,title:(typeof appName==="function"?appName():"Accounted For")});toast("PIN changed.");tabRedraw();return}
});
document.addEventListener("change",e=>{const V=window.VAULT;if(!V||!V.on())return;
  if(e.target.id==="secAuto"){V.set({auto:+e.target.value});toast("Saved")}
  if(e.target.id==="secWipe"){V.set({wipe:e.target.checked});toast(e.target.checked?"Data erases after 10 wrong PINs.":"Auto-erase off.")}});

/* iPhone app extras: Face ID unlock and a daily muster reminder */
window.__mbOpen=o=>{if(typeof render!=="function")return;view=o;render();window.scrollTo(0,0)};
function nativeHTML(){if(!(window.MBN&&MBN.on))return"";const r=MBN.reminder.get()||{};
  return `<h2>Phone</h2><div class="panel"><label for="natRem">Daily muster reminder</label>
    <div class="row2"><input type="time" id="natRem" value="${esc(r.t||"")}"><button class="btn alt" id="natRemSet">${r.t?"Update":"Set reminder"}</button></div>
    ${r.t?`<p class="note">🔔 Every day at ${esc(r.t)}. <button class="btn alt" id="natRemOff" style="display:inline-block;width:auto;min-height:0;padding:4px 10px">Turn off</button></p>`:`<p class="note">This phone reminds you to take the numbers at the same time every day. Works with no signal.</p>`}</div>`}
document.addEventListener("click",async e=>{if(!(window.MBN&&MBN.on))return;const id=e.target.id;
  if(id==="natRemSet"){const t=($("#natRem")||{}).value;if(!/^\d\d:\d\d$/.test(t||""))return toast("Pick a time first.");
    const ok=await MBN.reminder.set(t,"Time to take the "+unitName()+" numbers.");toast(ok?"Reminder set for "+t+" daily.":"Allow notifications for Accounted For in Settings.");tabRedraw();return}
  if(id==="natRemOff"){await MBN.reminder.set(null);toast("Reminder off.");tabRedraw();return}});
document.addEventListener("change",async e=>{if(e.target.id!=="secFace"||!(window.MBN&&MBN.on))return;const V=window.VAULT,box=e.target;
  if(!box.checked){try{await MBN.Bio.remove()}catch(x){}V.set({face:false});toast("Face ID unlock off.");return}
  try{const a=await MBN.Bio.available();if(!a.available){box.checked=false;return toast("Set up Face ID in your phone's Settings first.")}
    if(!V._p){box.checked=false;return toast("Lock the app and unlock it with your PIN once, then turn this on.")}
    await MBN.Bio.save({pin:V._p});V.set({face:true});toast((a.type==="touchID"?"Touch ID":"Face ID")+" unlock on.")}
  catch(x){box.checked=false;toast("Couldn't turn on Face ID: "+String(x&&x.message||x).slice(0,60))}});

applyLists();applyTS();
for(const f of ["reportText","ptText","wText","alertsText","musText","sectionUpdateText","recallText","evText","armText","rollText"]){const o=window[f];if(typeof o==="function")window[f]=(...a)=>RT(o(...a))}
reportText=window.reportText;ptText=window.ptText;wText=window.wText;alertsText=window.alertsText;musText=window.musText;sectionUpdateText=window.sectionUpdateText;recallText=window.recallText;evText=window.evText;armText=window.armText;rollText=window.rollText;
let firstPick=false;{const qm=new URLSearchParams(location.search).get("m");if(!qm&&!S.mode)firstPick=true;if(qm&&MODES[qm]){if(!S.mode&&qm==="military"){S.mode="military";save()}setMode(qm);try{history.replaceState(null,"",location.pathname+location.hash)}catch(e){}}}
startXL();
render();
{const q=new URLSearchParams((location.hash||"").slice(1));if(q.get("join")){if(q.get("r"))firstPick=false;setTimeout(()=>joinPrompt(q),firstPick?900:300)}if(q.get("feed")){firstPick=false;setTimeout(()=>fdJoinPrompt(q),300)}}
{const q=new URLSearchParams((location.hash||"").slice(1));if(q.get("me")){firstPick=false;setTimeout(()=>mePrompt(q),200)}if(q.get("coj")||q.get("cov")){firstPick=false;setTimeout(()=>coJoinPrompt(q,q.get("coj")?"coj":"cov"),300)}}
if(S.me&&S.roster.some(m=>m.pk&&m.pk===S.me.pk)){S.me=null;S.leaderMode=true;save();if(view==="me"||view==="today"){view="board"}render()}
if(memberMode()&&!location.hash&&view==="board"){view="today";render()}
if(S.coOnly&&S.coBoard&&!location.hash&&view==="board"){view="co";render();setTimeout(coPoll,800)}
if(S.pendLink){const pl=S.pendLink;delete S.pendLink;rawSave();setTimeout(()=>{autoLink(pl);toast("Platoon view linked to "+(pl.unit||"the company")+" · "+pl.sec)},600)}
if(S.me){setTimeout(()=>mpFetch(),600)}
if(S.roster.some(m=>m.pk))setTimeout(()=>mpPublish(),2500);
setTimeout(()=>akStatus(),3000);
{const q=new URLSearchParams((location.hash||"").slice(1));if(q.get("sync")){firstPick=false;setTimeout(()=>syncJoinPrompt(q.get("sync"),q.get("r"),q.get("w")),300)}}
if(S.sync&&S.sync.on)setTimeout(()=>syncPull(),700);
if(S.feeds.length){S.feeds.filter(f=>!f.lk&&f.me&&!f.meH).forEach(fdMeHash);setTimeout(()=>fdPollAll(true),900);if(S.pushOn)setTimeout(()=>S.feeds.filter(f=>!f.lk&&!f.push).forEach(fdPushAttach),1600)}
if(bcActive())setTimeout(bcPoll,1000);
if(S.board){setTimeout(livePollBoard,800);if(S.pushOn&&!S.board.push)setTimeout(boardPush,1500)}if(S.link)setTimeout(()=>linkPush(),1200);
if(firstPick)setTimeout(()=>openModeSheet(true),350);
if("serviceWorker" in navigator)navigator.serviceWorker.addEventListener("message",ev=>{if(ev.data&&ev.data.type==="updated"){if(/(^|[#&])(join|me|feed|ci|sync|coj|cov)=/.test(H0)&&Date.now()-T0<30000){location.replace(location.pathname+H0);return}const el=$("#toast");el.innerHTML='New version ready. <button id="updNow" style="margin-left:8px;border:0;border-radius:99px;padding:6px 12px;font-weight:800;background:var(--brass);color:#111">Reload</button>';el.hidden=false;clearTimeout(toast.t)}});
document.addEventListener("click",e=>{if(e.target.id==="updNow")location.reload()});
if("serviceWorker" in navigator&&document.querySelector("link[rel=manifest]")&&(location.protocol==="https:"||location.hostname==="localhost")){navigator.serviceWorker.register("sw.js").then(()=>navigator.serviceWorker.ready).then(()=>{const o=document.getElementById("offStat");if(o&&navigator.serviceWorker.controller)o.textContent="Ready: this app opens and works with no signal. Text reports once you have service."}).catch(()=>{})}
every(20000,()=>{if(view==="recall"&&S.rc.open){const c=document.querySelector(".mbar .ct small");if(c)c.textContent="contacted · "+Math.round((Date.now()-S.rc.start)/60000)+" min"}},"recall-clock");
window.addEventListener("hashchange",()=>{{const q=new URLSearchParams((location.hash||"").slice(1));if(q.get("join")){joinPrompt(q);return}if(q.get("feed")){fdJoinPrompt(q);return}if(q.get("sync")){syncJoinPrompt(q.get("sync"),q.get("r"),q.get("w"));return}if(q.get("me")){mePrompt(q);return}if(q.get("coj")||q.get("cov")){coJoinPrompt(q,q.get("coj")?"coj":"cov");return}}const h=(location.hash||"").slice(1).toLowerCase();if((["recall","rollup","board","muster","alerts","live","send","feed","today","me","log","cal","ask","people","tools","duty","ready","events","act","co","data","sys","text","trends","armory","pt","w6","att"].includes(h)||SECTIONS.some(x=>x[0].toLowerCase()===h))&&h!==view){view=h;armed=null;render();window.scrollTo(0,0);if(h==="feed")fdPollAll(true)}});
every(30000,()=>{const d=$("#dtg");if(d)d.textContent="As of "+new Date().toLocaleString([],{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})},"clock");

/* ---------- LOGINS: a username + password that opens the right page instead of a long link ---------- */
// The OIC's phone seals the person's link with a key made from their password (PBKDF2 → AES-GCM).
// The server keeps only the sealed copy plus a check value, so it can't read the link. Server: setup part 15.
const LG_TE=new TextEncoder(),LG_TD=new TextDecoder();
const LG_WORDS="acorn amber anchor apple arrow aspen atlas badge bamboo banjo basil beacon birch bison blaze bloom bolt brave breeze brook cabin cactus canyon cedar chalk cliff clover cobalt comet coral crane creek crest crown dawn delta dune eagle ember falcon fern field flame flint forest fox frost garnet gecko glade granite grove harbor hawk hazel heron honey iris ivory jade jasper juniper kayak kettle lake lantern laurel lemon lilac lime lotus maple marble meadow mesa mint moon moss nectar north oak oasis ocean olive onyx orbit otter palm pearl pebble pepper pine plum polar prairie quail quartz raven reef ridge river robin rocket ruby sage sierra silver slate snow solar spruce star stone storm summit tiger timber topaz trail tulip valley violet willow wolf".split(" ");
const lgHex=u=>[...new Uint8Array(u)].map(x=>x.toString(16).padStart(2,"0")).join("");
const lgRnd=n=>{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%n};
const lgNormU=u=>String(u||"").trim().toLowerCase();
const lgNormP=p=>String(p||"").trim().toLowerCase().replace(/\s+/g,"-");
const lgUserOK=u=>/^[a-z0-9._-]{4,32}$/.test(lgNormU(u));
function lgPw(){return LG_WORDS[lgRnd(LG_WORDS.length)]+"-"+LG_WORDS[lgRnd(LG_WORDS.length)]+"-"+(1000+lgRnd(9000))}
function lgUser(base){const b=String(base||"user").toLowerCase().replace(/[^a-z0-9]+/g,"").slice(0,14)||"user";return (b.length<2?b+"user":b)+(100+lgRnd(900))}
async function lgKeys(user,pw){const uid=lgHex(await crypto.subtle.digest("SHA-256",LG_TE.encode("af-login-v1:"+lgNormU(user))));
  const base=await crypto.subtle.importKey("raw",LG_TE.encode(lgNormP(pw)),"PBKDF2",false,["deriveBits"]);
  const bits=new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:LG_TE.encode("af-login-v1:"+uid),iterations:210000},base,512));
  const ek=await crypto.subtle.importKey("raw",bits.slice(0,32),"AES-GCM",false,["encrypt","decrypt"]);
  return {uid,ek,vf:lgHex(bits.slice(32))}}
async function lgSeal(K,obj){const iv=crypto.getRandomValues(new Uint8Array(12));const c=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},K.ek,LG_TE.encode(JSON.stringify(obj))));const o=new Uint8Array(12+c.length);o.set(iv);o.set(c,12);return b64e(o)}
async function lgOpen(K,ct){const b=b64d(ct);return JSON.parse(LG_TD.decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:b.slice(0,12)},K.ek,b.slice(12))))}

/* what a login can open: every link this phone can already send */
function lgDests(){const D=[];if(!isOwner())return D;
  if(S.source!=="sample")for(const m of S.roster)D.push({id:"me:"+m.id,g:"My page (their status, duty, calendar, unit Feed)",l:m.rank+" "+m.name,base:String(m.name||"").split(",")[0],ph:m.phone||""});
  if(S.board)for(const x of SECTIONS)D.push({id:"sec:"+x[0],g:"Section leader (updates their section)",l:x[0]+" section leader",base:x[0]+"lead"});
  if(S.coBoard){if(S.coBoard.wk)D.push({id:"co:rep",g:"Company",l:"Platoon reporting to "+(S.coBoard.name||"the company"),base:"plt"});if(S.coBoard.rk)D.push({id:"co:view",g:"Company",l:"Company view (CO, 1stSgt, XO)",base:"co"})}
  for(const f of S.feeds||[])if(f.lk)D.push({id:"feed:"+f.id,g:"Feed only",l:"Feed · "+(f.unit||unitName()),base:"feed"});
  if(S.sync&&S.sync.on)for(const r of ["view","sncoic","co"])D.push({id:"acc:"+r,g:"Your full board on their phone",l:ROLE_N[r],base:r==="view"?"viewer":r==="co"?"oic":"editor"});
  return D}
/* roles: what kind of access a login gives. Each role maps to one or more of the pages above. */
function lgRoles(){const D=lgDests();const by=p=>D.filter(x=>p.endsWith(":")?x.id.startsWith(p):x.id===p);
  const acc="Set up access links in DATA first.",co="Set up the Company board first (Tools).";
  return [{k:"member",n:"Member",d:"Their own page: status, duty, calendar and the Feed.",ds:by("me:"),hint:"Load your real roster first (DATA)."},
    {k:"secl",n:"Section leader",d:"Updates their section's numbers and calendar.",ds:by("sec:"),hint:"Turn on Live sections first (Tools)."},
    {k:"view",n:"Viewer",d:"Sees your whole board. Can't change anything.",ds:by("acc:view"),hint:acc},
    {k:"edit",n:"Editor",d:"Sees and updates your whole board.",ds:by("acc:sncoic"),hint:acc},
    {k:"co",n:"Co-leader",d:"Same rights as you, on their phone.",ds:by("acc:co"),hint:acc},
    {k:"cmd",n:"Company command",d:"Company view for the CO, 1stSgt or XO.",ds:by("co:view"),hint:co},
    {k:"plt",n:"Platoon reporting",d:"Sends a platoon's numbers up to the company.",ds:by("co:rep"),hint:co},
    {k:"feed",n:"Feed only",d:"Reads the Feed and taps Got it.",ds:by("feed:"),hint:"Start a Feed first."}]}
function lgRoleOf(dest){const k=String(dest||"").split(":")[0],v=String(dest||"").split(":")[1]||"";
  return k==="me"?"Member":k==="sec"?"Section leader":k==="feed"?"Feed only":k==="co"?(v==="view"?"Company command":"Platoon reporting"):k==="acc"?(v==="view"?"Viewer":v==="sncoic"?"Editor":"Co-leader"):""}
async function lgHash(id,create){const i=id.indexOf(":"),k=id.slice(0,i),v=id.slice(i+1);let u="";
  if(k==="me"){const m=S.roster.find(x=>x.id===v);if(!m||S.source==="sample")return null;if(m.pk)u=mpLink(m);else if(create)u=await mpTurnOn(m);else return null}
  else if(k==="sec"){if(!S.board||!SECTIONS.some(x=>x[0]===v))return null;u=boardLink(v)}
  else if(k==="co"){if(!S.coBoard)return null;if(v==="rep"&&!S.coBoard.wk||v==="view"&&!S.coBoard.rk)return null;u=coLink(v==="rep"?"rep":"view")}
  else if(k==="feed"){const f=(S.feeds||[]).find(x=>x.id===v&&x.lk);if(!f)return null;u=fdLink(f)}
  else if(k==="acc"){if(!S.sync||!S.sync.on)return null;u=accLink(v)}
  const j=u.indexOf("#");return j<0?null:u.slice(j+1)}
function lgErr(e){const t=String(e&&e.message||e);return /taken/.test(t)?"That username is taken. Try another.":/could not find the function|schema cache|PGRST202/i.test(t)?"Logins aren't set up on the server yet. DATA → System check → Logins.":/abort|Failed to fetch|NetworkError|Load failed/i.test(t)?"No connection. Get signal and try again.":t.slice(0,80)}
async function lgPut(L,h){const K=await lgKeys(L.user,L.pw);await SB.rpc("login_put",{p_uid:K.uid,p_owner:S.lgOwner,p_vf:K.vf,p_ct:await lgSeal(K,{v:1,h,m:S.mode||"",u:unitName(),l:L.label})});return K.uid}
async function lgCreate(dest,user,pw,opt){opt=opt||{};if(!isOwner())throw new Error("Only the OIC's phone makes logins.");
  if(!lgUserOK(user))throw new Error("Username: 4–32 letters or numbers (. _ - ok).");if(lgNormP(pw).length<8)throw new Error("Password: at least 8 characters.");
  const d=lgDests().find(x=>x.id===dest);if(!d)throw new Error("Pick what it opens.");
  if(!S.lgOwner)S.lgOwner=rndId(32);const h=await lgHash(dest,true);if(!h)throw new Error("That page isn't available on this phone.");
  const L={user:lgNormU(user),pw:lgNormP(pw),dest,label:opt.label||d.l,role:lgRoleOf(dest),h,at:Date.now()};if(opt.mid)L.mid=opt.mid;L.uid=await lgPut(L,h);
  S.logins=(S.logins||[]).filter(x=>x.uid!==L.uid);S.logins.unshift(L);save();return L}
let lgBusy=false;
async function lgRefresh(){if(lgBusy||!isOwner()||!S.lgOwner||!(S.logins||[]).length)return;lgBusy=true;let ch=false;
  try{for(const L of S.logins){const h=await lgHash(L.dest,false);if(!h){if(!L.gone){L.gone=1;ch=true}continue}if(L.gone){delete L.gone;ch=true}
    if(h!==L.h){try{await lgPut(L,h);L.h=h;delete L.err;ch=true}catch(e){L.err=lgErr(e);ch=true}}}}
  finally{lgBusy=false;if(ch){save();if(view==="logins")renderLogins()}}}
function lgText(L){return unitName()+" · Accounted For login\nUsername: "+L.user+"\nPassword: "+L.pw+"\n\niPhone app: "+STORE_URL.ios+" (open it and tap Sign in)\nOr on the web: "+PUB()+"#login\n\nRole: "+(L.role||lgRoleOf(L.dest))+" · "+L.label+". Keep these private."}

/* OIC screen: make, send and remove logins */
let lgForm=null,lgArm=null,lgLast=null,lgMsg="";
function renderLogins(){let h=`<h2>Logins</h2>`;
  if(!isOwner()){$("#main").innerHTML=h+`<div class="panel"><p class="note">Got a username and password? Sign in to open your page.</p><button class="btn" id="lgSignOpen">Sign in</button></div>`;return}
  if(!proOK()){$("#main").innerHTML=h+proWallHTML("logins");return}
  const D=lgDests();
  if(!lgForm||!D.some(x=>x.id===lgForm.dest)){const d=D[0];lgForm={dest:d?d.id:"",user:d?lgUser(d.base):"",pw:lgPw(),ed:false}}
  const last=lgLast&&(S.logins||[]).find(x=>x.uid===lgLast);
  if(last)h+=`<div class="panel" style="border-color:var(--s-onhand)"><b>Login ready · ${esc(last.label)}</b> <span class="chip">${esc(last.role||lgRoleOf(last.dest))}</span><div style="font-family:ui-monospace,Menlo,monospace;font-weight:800;font-size:17px;margin:8px 0;line-height:1.6" data-noxl>Username: ${esc(last.user)}<br>Password: ${esc(last.pw)}</div><div class="row2">${lgSmsBtn(last)}<button class="btn alt" data-lgcopy="${last.uid}">Copy</button></div><button class="btn alt" id="lgDone" style="width:100%">Done</button></div>`;
  h+=`<div class="panel"><p class="note">Give someone a username and password instead of a link. They open the app, tap <b>Sign in</b>, and land on the page you picked. The server can't read what's behind it.</p>`;
  if(D.length){const groups=[...new Set(D.map(x=>x.g))];
    const RL=lgRoles(),cur=RL.find(r=>r.ds.some(x=>x.id===lgForm.dest))||RL.find(r=>r.ds.length);
    h+=`<label for="lgRole">Role</label><select id="lgRole" style="width:100%">${RL.map(r=>`<option value="${r.k}"${r===cur?" selected":""}${r.ds.length?"":" disabled"}>${esc(r.n)}${r.ds.length?"":" (not set up)"}</option>`).join("")}</select>
      <p class="note" style="margin:4px 0 0">${esc(cur.d)}</p>${RL.some(r=>!r.ds.length)?`<details><summary class="note">More roles</summary><p class="note" style="margin:2px 0 0">${RL.filter(r=>!r.ds.length).map(r=>`<b>${esc(r.n)}</b>: ${esc(r.hint)}`).join("<br>")}</p></details>`:""}
      ${cur.ds.length>1?`<label for="lgDest">${cur.k==="member"?"Person":cur.k==="secl"?"Section":"Which one"}</label><select id="lgDest" style="width:100%">${cur.ds.map(x=>`<option value="${esc(x.id)}"${x.id===lgForm.dest?" selected":""}>${esc(x.l)}</option>`).join("")}</select>`:""}
      <label for="lgU">Username</label><input type="text" id="lgU" value="${esc(lgForm.user)}" autocomplete="off" autocapitalize="none" spellcheck="false">
      <label for="lgP">Password</label><input type="text" id="lgP" value="${esc(lgForm.pw)}" autocomplete="off" autocapitalize="none" spellcheck="false">
      <div class="row2"><button class="btn" id="lgMake">Create login</button><button class="btn alt" id="lgNewPw">New password</button></div><div class="note" id="lgOut" role="status">${esc(lgMsg)}</div>`}
  else h+=`<p class="note">Nothing to give out yet. Load your roster in DATA for My page logins.</p>`;
  const tips=[];if(!S.board)tips.push(`Turn on <b>Live sections</b> to make section leader logins.`);if(!(S.sync&&S.sync.on))tips.push(`Set up <b>access links</b> in DATA to give your full board (view, edit or same as you).`);if(!S.coBoard)tips.push(`Set up the <b>Company</b> board for CO, 1stSgt and XO logins.`);
  if(tips.length)h+=`<p class="note">${tips.join("<br>")}</p>`;h+=`</div>`;
  const Ls=S.logins||[];
  if(Ls.length)h+=`<div class="sech"><h2>Given out · ${Ls.length}</h2></div><div class="alist">${Ls.map(L=>{const sec=L.dest.startsWith("sec:")?L.dest.slice(4):"";
    return `<div class="rrow" style="--sc:var(${L.gone||L.err?"--warn":"--line"})"><div class="who"><b>${esc(L.label)}</b> <span class="chip">${esc(L.role||lgRoleOf(L.dest))}</span><div class="ph">${esc(L.user)} · made ${esc(ago(L.at))}${L.gone?" · that page is gone, so this login won't open anything":""}${L.err?" · couldn't update: "+esc(L.err):""}</div></div>
      ${lgArm===L.uid?`<div class="note">Removes the login. A phone that already signed in keeps its page${sec?" until you replace the "+esc(sec)+" link":""}.</div><div class="row2"><button class="btn warn" data-lgdel="${L.uid}">Remove login</button>${sec?`<button class="btn warn" data-lgcut="${L.uid}">Remove + cut off ${esc(sec)} phones</button>`:""}<button class="btn alt" id="lgKeep">Keep</button></div>`
        :`<div class="row2">${lgSmsBtn(L)}<button class="btn alt" data-lgcopy="${L.uid}">Copy</button><button class="btn alt" data-lgarm="${L.uid}">Remove</button></div>`}</div>`}).join("")}</div>`;
  $("#main").innerHTML=h}
function lgSmsBtn(L){const m=L.dest.startsWith("me:")&&S.roster.find(x=>x.id===L.dest.slice(3));const to=m&&m.phone?"+1"+String(m.phone).replace(/\D/g,"").slice(-10):"";
  return `<a class="btn alt" href="${esc("sms:"+to+"?&body="+encodeURIComponent(lgText(L)))}">Text it</a>`}

/* sign-in sheet: anyone can use it */
function lgSignSheet(){sheetCtx={kind:"login"};
  $("#sheetT").innerHTML=`Sign in<small>Enter the username and password you were given. It opens your page on this phone.</small>`;
  $("#sheetOpts").innerHTML=`<div class="panel" style="margin:0" data-noxl><label for="lgSU">Username</label><input type="text" id="lgSU" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false">
    <label for="lgSP">Password</label><input type="password" id="lgSP" autocomplete="current-password" autocapitalize="none" autocorrect="off" spellcheck="false">
    <button class="btn" id="lgGo">Sign in</button><button class="btn alt" data-sclose="1">Cancel</button><div class="note" id="lgSOut" role="status"></div></div>`;
  const sh=$("#sheet");sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add("open")));setTimeout(()=>{const i=$("#lgSU");if(i)i.focus({preventScroll:true})},320)}
/* the sign-in form can be on the welcome screen and in the sheet at once: always use the one the person is looking at */
function lgScope(el){const box=el&&el.closest&&el.closest("#v11Welcome,#sheet");if(box)return box;const w=document.getElementById("v11Welcome");if(w&&!w.hidden&&w.querySelector("#lgSU"))return w;const sh=document.getElementById("sheet");return sh&&!sh.hidden&&sh.querySelector("#lgSU")?sh:document}
async function lgSignIn(from){const R=lgScope(from),q=s=>R.querySelector(s);const U=q("#lgSU"),P=q("#lgSP"),o=q("#lgSOut"),b=q("#lgGo");if(!U||!P||!o||!b)return;
  if(!U.value.trim()||!P.value.trim()){o.textContent="Enter your username and password.";return}
  b.disabled=true;o.textContent="Checking…";
  try{const K=await lgKeys(U.value,P.value);const r=await SB.rpc("login_get",{p_uid:K.uid,p_vf:K.vf});const row=Array.isArray(r)?r[0]:r;
    if(!row||!row.ct){o.textContent=row&&row.wait>0?"Too many tries. Wait "+Math.ceil(row.wait/60)+" min, then try again.":"Username or password is wrong. Check with whoever gave it to you.";return}
    const X=await lgOpen(K,row.ct);if(!X||typeof X.h!=="string"||!/^[a-z]+=/.test(X.h))throw new Error("This login is damaged. Ask for a new one.");
    if(/^me=/.test(X.h)&&typeof isLeaderPhone==="function"&&isLeaderPhone()&&!S.lgSelf&&S.source!=="sample"){o.textContent="That login is for "+(X.l||"a member")+". This phone runs your board, so sign in on their phone instead. Nothing changed here.";return}
    S.lgSelf={uid:K.uid,vf:K.vf,l:String(X.l||"").slice(0,60),user:lgNormU(U.value),h:X.h,at:Date.now()};S.lgUnlocked=Date.now();save();if(typeof window.lgAfterSignIn==="function")setTimeout(window.lgAfterSignIn,900);if(!S.mode&&X.m&&MODES[X.m]){setMode(X.m);if(!S.mode){S.mode=X.m;save()}}
    o.textContent="Opening "+(X.l||"your page")+"…";closeSheet();
    setTimeout(()=>{try{history.replaceState(null,"",location.pathname)}catch(e){}location.hash=X.h},320)}
  catch(e){o.textContent=/OperationError/.test(String(e&&e.name))?"This login is damaged. Ask for a new one.":lgErr(e)}
  finally{if(b.isConnected)b.disabled=false}}

/* hook into the app */
IC.key='<circle cx="7.5" cy="15.5" r="4"/><path d="M10.5 12.5L20 3"/><path d="M16 7l3 3"/><path d="M13.5 9.5l2 2"/>';
SYNC_SKIP.push("logins","lgOwner");
SC.push({k:"lg",n:"Logins (username + password instead of a link)",f:["15_logins"],t:[["login_get",{p_uid:"zz",p_vf:"x"}],["login_put",{p_uid:"zz",p_owner:"x",p_vf:"x",p_ct:"QQ=="}],["login_delete",{p_uid:"zz",p_owner:"x"}]]});
HELP.logins=["Logins","A username and password that opens the right page.",["Pick what it opens, then Create login. Text or copy it to them.","They open the app, tap Sign in, and land on that page. After that the app opens straight to it.","If a link changes (you replace a section link or reset access links), their login updates by itself.","Remove stops the login working. For section leaders, Remove + cut off also replaces that section's link so a phone already in loses access."]];
{const _render=render;render=function(){if(view==="logins"){renderTabs();renderLogins();if(typeof animateView==="function")animateView();return}return _render.apply(this,arguments)}}
{const _rt=renderTools;renderTools=function(){_rt.apply(this,arguments);const vb=document.querySelector("#main [data-mode-open]");if(!vb)return;
  vb.insertAdjacentHTML("beforebegin",isOwner()?`<button data-go="logins"><span class="ic">${svg("key")}</span><span><b>Logins</b><small>${(S.logins||[]).length?(S.logins||[]).length+" given out":"Username + password, no link"}</small></span></button>`:`<button id="lgSignOpen"><span class="ic">${svg("key")}</span><span><b>Sign in</b><small>Have a username and password?</small></span></button>`)}}
{const _ms=openModeSheet;openModeSheet=function(first){_ms.apply(this,arguments);if(first)$("#sheetOpts").insertAdjacentHTML("afterbegin",`<button class="btn alt" id="lgSignOpen" data-noxl style="width:100%;margin:0 0 10px">I was given a username and password</button>`)}}
{const _rs=resetSecLink;resetSecLink=async function(){const r=await _rs.apply(this,arguments);lgRefresh();return r}}
document.addEventListener("click",e=>{const t=e.target;
  if(t.closest("#lgSignOpen")){e.stopImmediatePropagation();lgSignSheet();return}
  if(t.closest("#lgGo")){lgSignIn(t.closest("#lgGo"));return}
  if(t.id==="lgNewPw"){lgForm.pw=lgPw();const p=$("#lgP");if(p)p.value=lgForm.pw;return}
  if(t.id==="lgDone"){lgLast=null;renderLogins();return}
  if(t.id==="lgKeep"){lgArm=null;renderLogins();return}
  if(t.id==="lgMake"){lgMsg="";const o=$("#lgOut");t.disabled=true;o.textContent="Making it…";
    lgCreate(lgForm.dest,lgForm.user,lgForm.pw).then(L=>{lgLast=L.uid;const d=lgDests().find(x=>x.id===lgForm.dest);lgForm={dest:lgForm.dest,user:d?lgUser(d.base):"",pw:lgPw(),ed:false};actAdd("🔑","Made a login for "+L.label+".","live");renderLogins();window.scrollTo(0,0)})
      .catch(err=>{lgMsg=lgErr(err);if(/taken/.test(String(err.message))){lgForm.user=lgUser(lgForm.user.replace(/\d+$/,""));lgMsg+=" Suggested a new one."}renderLogins()});return}
  const cp=t.closest("[data-lgcopy]");if(cp){const L=(S.logins||[]).find(x=>x.uid===cp.dataset.lgcopy);if(!L)return;const s=lgText(L);try{navigator.clipboard.writeText(s).then(()=>toast("Login copied"),()=>toast(s))}catch(err){toast(s)}return}
  const ar=t.closest("[data-lgarm]");if(ar){lgArm=ar.dataset.lgarm;renderLogins();return}
  const dl=t.closest("[data-lgdel],[data-lgcut]");if(dl){const uid=dl.dataset.lgdel||dl.dataset.lgcut,cut=!!dl.dataset.lgcut;const L=(S.logins||[]).find(x=>x.uid===uid);if(!L)return;dl.disabled=true;dl.textContent="Removing…";
    (async()=>{await SB.rpc("login_delete",{p_uid:uid,p_owner:S.lgOwner});S.logins=S.logins.filter(x=>x.uid!==uid);lgArm=null;if(lgLast===uid)lgLast=null;save();
      if(cut&&L.dest.startsWith("sec:")&&S.board){await resetSecLink(L.dest.slice(4));toast("Login removed. New "+L.dest.slice(4)+" link made; other "+L.dest.slice(4)+" logins updated.")}else toast("Login removed");renderLogins()})()
      .catch(err=>{toast("Couldn't remove: "+lgErr(err));renderLogins()});return}});
document.addEventListener("input",e=>{if(!lgForm)return;if(e.target.id==="lgU"){lgForm.user=e.target.value;lgForm.ed=true}else if(e.target.id==="lgP")lgForm.pw=e.target.value});
document.addEventListener("change",e=>{if(e.target.id!=="lgRole"||!lgForm)return;const r=lgRoles().find(x=>x.k===e.target.value);if(!r||!r.ds.length)return;lgForm.dest=r.ds[0].id;if(!lgForm.ed)lgForm.user=lgUser(r.ds[0].base);lgMsg="";const y=window.scrollY;renderLogins();window.scrollTo(0,y)});
document.addEventListener("change",e=>{if(e.target.id!=="lgDest"||!lgForm)return;lgForm.dest=e.target.value;if(!lgForm.ed){const d=lgDests().find(x=>x.id===lgForm.dest);lgForm.user=d?lgUser(d.base):"";const u=$("#lgU");if(u)u.value=lgForm.user}});
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.target.id==="lgSP"||e.target.id==="lgSU")){e.preventDefault();if(e.target.id==="lgSU"){const p=lgScope(e.target).querySelector("#lgSP");if(p)p.focus()}else lgSignIn(e.target)}});
window.addEventListener("hashchange",()=>{if((location.hash||"").toLowerCase()==="#login"){try{history.replaceState(null,"",location.pathname)}catch(e){}lgSignSheet()}});
if(/^#login$/i.test(H0)){try{history.replaceState(null,"",location.pathname)}catch(e){}setTimeout(lgSignSheet,firstPick?600:250)}
setTimeout(lgRefresh,5000);every(10*60000,lgRefresh,"logins");
