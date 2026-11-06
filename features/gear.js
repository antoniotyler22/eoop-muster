/* Accounted For 4.81.0: Gear.
   The tool room NCO (Manager) drops in a gear roster (paste, CSV or Excel), signs gear out to people and takes it back, and runs an
   inventory count that ends in a "100% accounted for" report. Operations and maintenance sections (Status) see what is up and down
   and can flip an item to Down with a reason. Members see their own gear on My page. Turned on in Tools → Tool access.
   Armory still handles weapons by rack; Gear is for tools, radios, keys, vehicles, optics. */
(()=>{
const A=window.afTool;
const MS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],DW=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const dl=iso=>{if(!iso)return "";const d=new Date(iso+"T12:00:00");return isNaN(d)?iso:DW[d.getDay()]+" "+d.getDate()+" "+MS[d.getMonth()]};
const hm=t=>{const d=new Date(t);return String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0")};
const G=()=>{S.gear=S.gear&&typeof S.gear==="object"?S.gear:{};const g=S.gear;if(!Array.isArray(g.items))g.items=[];if(!g.inv||typeof g.inv!=="object")g.inv={open:false,start:0,seen:{}};if(!Array.isArray(g.hist))g.hist=[];return g};
const find=id=>(S.roster||[]).find(m=>m.id===id);
const holder=x=>x.h?(find(x.h)?A.nm(find(x.h)):"(removed)"):(x.hn||"");
const isOut=x=>!!(x.h||x.hn);
const overdue=x=>isOut(x)&&!!x.due&&x.due<dkey();
const dueIso=k=>{const d=new Date();if(k==="tomorrow")d.setDate(d.getDate()+1);else if(k==="week")d.setDate(d.getDate()+7);else if(k!=="today")return "";return dkey(d)};
const REASONS=["Parts","Maintenance","Damaged","Other"];
let F="all",Q="",SIGN=null,PQ="",DUE="today",DOWN=null,OPEN=null,ADD=false,DROP=false,MSG="",ARM=null,REPORT="";
const again=()=>{const y=window.scrollY;render();window.scrollTo(0,y)};
function log(x,act,who){const g=G();g.hist.unshift({t:Date.now(),id:x.id,n:x.n,act,who:who||""});if(g.hist.length>200)g.hist.length=200;
  try{if(typeof actAdd==="function")actAdd("🧰",({out:"Signed out",in:"Returned",down:"Down",up:"Back up"}[act]||act)+": "+x.n+(x.sn?" ("+x.sn+")":"")+(who?" · "+who:""),"gear")}catch(e){}}

/* ---------- roster of gear: paste / CSV / Excel ---------- */
function parseItems(text){
  const rows=(typeof parseCSV==="function"?parseCSV(A.csv(text)):String(text).split(/\n/).map(l=>l.split(/\t|,/))).filter(r=>r.some(c=>String(c).trim()));
  if(!rows.length)return [];
  const h=rows[0].map(c=>String(c).toLowerCase());const has=re=>h.findIndex(c=>re.test(c));
  let ci={n:has(/item|name|descr|nomen|equip|tool/),sn:has(/serial|tag|\bid\b|\bsn\b|number|asset/),cat:has(/categ|type|group|class|section/),hold:has(/holder|issued|assigned|signed|who/)};
  let body;if(ci.n>=0||ci.sn>=0){body=rows.slice(1);if(ci.n<0)ci.n=ci.sn===0?1:0}else{ci={n:0,sn:1,cat:2,hold:-1};body=rows}
  const out=[];for(const r of body){const n=String(r[ci.n]||"").trim();if(!n)continue;
    out.push({n:n.slice(0,60),sn:String(ci.sn>=0&&ci.sn<r.length?r[ci.sn]:"").trim().slice(0,40),cat:String(ci.cat>=0&&ci.cat<r.length?r[ci.cat]:"").trim().slice(0,30)||"General",hold:String(ci.hold>=0&&ci.hold<r.length?r[ci.hold]:"").trim()})}
  return out}
function addItems(list){const g=G();const have=new Set(g.items.filter(x=>x.sn).map(x=>(x.n+"|"+x.sn).toLowerCase()));let n=0,skip=0,held=0;
  for(const o of list){const k=(o.n+"|"+o.sn).toLowerCase();if(o.sn&&have.has(k)){skip++;continue}if(o.sn)have.add(k);
    const x={id:rndId(8),n:o.n,sn:o.sn,cat:o.cat||"General"};
    if(o.hold){const m=A.match(o.hold);if(m)x.h=m.id;else x.hn=o.hold.slice(0,40);x.t=Date.now();held++}
    g.items.push(x);n++}
  save();return {n,skip,held}}
async function readFile(f){return typeof fileToCSV==="function"?await fileToCSV(f):await f.text()}
function template(){return "Item,Serial,Category\r\nRadio PRC-117,12,Comms\r\n7-ton keys,4,Vehicles\r\nTorque wrench,8,Tools\r\n"}

/* ---------- actions ---------- */
function signOut(id,person,other){const x=G().items.find(i=>i.id===id);if(!x||isOut(x))return false;
  if(person){x.h=person}else{const o=String(other||"").trim();if(!o)return false;const m=A.match(o);if(m)x.h=m.id;else x.hn=o.slice(0,40)}
  x.t=Date.now();x.due=dueIso(DUE);log(x,"out",holder(x));save();return true}
function ret(id){const x=G().items.find(i=>i.id===id);if(!x||!isOut(x))return;const w=holder(x);delete x.h;delete x.hn;x.t=0;x.due="";log(x,"in",w);save()}
function setDown(id,why){const x=G().items.find(i=>i.id===id);if(!x)return;x.dn=Date.now();x.why=String(why||"").slice(0,40);log(x,"down",x.why);save()}
function setUp(id){const x=G().items.find(i=>i.id===id);if(!x)return;delete x.dn;x.why="";log(x,"up");save()}
function startInv(){const g=G();g.inv={open:true,start:Date.now(),seen:{}};REPORT="";save()}
function finishInv(){const g=G(),I=g.inv;const miss=g.items.filter(x=>!I.seen[x.id]);const found=g.items.length-miss.length;
  g.lastInv={t:Date.now(),total:g.items.length,found,missing:miss.map(x=>x.n+(x.sn?" "+x.sn:"")+(isOut(x)?" (out: "+holder(x)+")":""))};
  g.inv={open:false,start:0,seen:{}};try{if(typeof actAdd==="function")actAdd("🧰","Gear inventory: "+found+" of "+g.items.length+" accounted for","gear")}catch(e){}save()}
function invText(L){return "Gear inventory "+dl(dkey(new Date(L.t)))+" "+hm(L.t)+"\n"+L.found+" of "+L.total+" accounted for ("+(L.total?Math.round(L.found/L.total*100):100)+"%)"+(L.missing.length?"\nNot counted:\n- "+L.missing.join("\n- "):"")}
function statusText(){const it=G().items;const dn=it.filter(x=>x.dn);const out=it.filter(isOut);
  return "Equipment status "+dl(dkey())+" "+hm(Date.now())+"\nUp: "+(it.length-dn.length)+" of "+it.length+"\nDown: "+dn.length+dn.map(x=>"\n- "+x.n+(x.sn?" "+x.sn:"")+(x.why?" ("+x.why+")":"")).join("")+"\nOut: "+out.length+out.map(x=>"\n- "+x.n+(x.sn?" "+x.sn:"")+": "+holder(x)).join("")}
function copy(t){try{navigator.clipboard.writeText(t).then(()=>toast("Copied"),()=>toast("Copy blocked here."))}catch(e){toast("Copy blocked here.")}}

/* ---------- screens ---------- */
function rowHTML(x,mgr){const g=G(),out=isOut(x),od=overdue(x),inv=g.inv.open&&mgr;
  const bits=[];if(x.sn)bits.push(esc(x.sn));
  if(out)bits.push("Out: <b>"+esc(holder(x))+"</b> "+hm(x.t)+(x.due?" · due "+esc(dl(x.due)):"")+(od?" · <b>OVERDUE</b>":""));else bits.push("In");
  if(x.dn)bits.push("<b>DOWN</b>"+(x.why?": "+esc(x.why):"")+" since "+esc(dl(dkey(new Date(x.dn)))));
  const sc=x.dn||od?"--warn":out?"--brass":"--s-onhand";
  let btn="";
  if(inv)btn=`<button class="chip afc${g.inv.seen[x.id]?" on":""}" data-gcnt="${x.id}">${g.inv.seen[x.id]?"✓ Counted":"Count"}</button>`;
  else{if(mgr)btn+=out?`<button class="chip afc" data-gret="${x.id}">Return</button>`:`<button class="chip afc" data-gso="${x.id}">Sign out</button>`;
    btn+=x.dn?`<button class="chip afc" data-gup="${x.id}">Mark up</button>`:`<button class="chip afc" data-gdown="${x.id}">Mark down</button>`}
  let h=`<div class="rrow" style="--sc:var(${sc})"><div class="who" ${mgr?`data-gopen="${x.id}" style="cursor:pointer"`:""}><b>${esc(x.n)}</b><div class="ph">${bits.join(" · ")}</div></div><div class="afb">${btn}</div></div>`;
  if(DOWN===x.id)h+=`<div class="afs"><div class="note">Why is it down?</div><div class="afl">${REASONS.map(r=>`<button class="chip afc" data-gwhy="${x.id}|${r}">${r}</button>`).join("")}</div></div>`;
  if(SIGN===x.id&&mgr)h+=signPanel(x);
  if(OPEN===x.id&&mgr&&!inv)h+=`<div class="afs"><button class="chip afc" data-grm="${x.id}">${ARM==="rm"+x.id?"Tap again: remove from gear list":"Remove from gear list"}</button></div>`;
  return h}
function pickList(){const t=PQ.trim().toUpperCase();const P=sorted((S.roster||[]).filter(m=>m&&m.name&&m.sec!=="ATT"));
  const L=(t?P.filter(m=>(m.rank+" "+m.name).toUpperCase().includes(t)):P).slice(0,8);
  return L.length?L.map(m=>`<button class="chip afc" data-gpick="${esc(m.id)}">${esc(m.rank)} ${esc(m.name)}</button>`).join(""):`<span class="note">No one matches. Type a name below instead.</span>`}
function signPanel(x){return `<div class="afs"><div class="note">Who is taking <b>${esc(x.n)}</b>?</div><input type="text" id="gPq" placeholder="Search your roster" autocomplete="off" value="${esc(PQ)}">
  <div class="afl" id="gPick" style="margin-top:6px">${pickList()}</div>
  <div class="note" style="margin-top:8px">Due back</div><div class="afl">${[["today","Today"],["tomorrow","Tomorrow"],["week","1 week"],["none","No date"]].map(d=>`<button class="chip afc${DUE===d[0]?" on":""}" data-gdue="${d[0]}">${d[1]}</button>`).join("")}</div>
  <div class="afl" style="margin-top:8px"><input type="text" id="gOther" placeholder="Not on the roster? Type a name" style="flex:1;min-width:0"><button class="btn alt" data-gother="${x.id}" style="width:auto">Sign out</button></div>
  <button class="chip afc" data-gx="1" style="margin-top:8px">Cancel</button></div>`}
function listHTML(mgr){const g=G();const t=Q.trim().toLowerCase();let L=g.items.filter(x=>(!t||(x.n+" "+x.sn+" "+x.cat+" "+holder(x)).toLowerCase().includes(t)));
  if(F==="out")L=L.filter(isOut);else if(F==="down")L=L.filter(x=>x.dn);else if(F==="in")L=L.filter(x=>!isOut(x));else if(F==="over")L=L.filter(overdue);
  if(!L.length)return `<p class="note">Nothing here.</p>`;
  const cats=[...new Set(L.map(x=>x.cat||"General"))].sort();
  return cats.map(c=>`<div class="mgrp"><h3><span>${esc(c)}</span><span class="note">${L.filter(x=>(x.cat||"General")===c).length}</span></h3>${L.filter(x=>(x.cat||"General")===c).map(x=>rowHTML(x,mgr)).join("")}</div>`).join("")}
function dropPanel(){return `<div class="panel" id="gDrop"><b>Drop in your gear roster</b><p class="note" style="margin:2px 0 6px">Paste rows from Excel or Sheets, or pick a file (CSV or Excel). Columns: Item, Serial, Category. A Holder column marks gear that is already out.</p>
  <textarea id="gPaste" style="min-height:90px" placeholder="Item&#9;Serial&#9;Category&#10;Radio PRC-117&#9;12&#9;Comms"></textarea>
  <div class="row2"><button class="btn" data-gaddp="1">Add these</button><button class="btn alt" data-gtpl="1">⬇ Blank template</button></div>
  <label class="btn alt" style="display:block;text-align:center;margin-top:6px;cursor:pointer">Choose a file<input type="file" id="gFile" accept=".csv,.txt,.xlsx,.xls,.tsv" style="display:none"></label></div>`}
function addPanel(){const cats=[...new Set(G().items.map(x=>x.cat))];return `<div class="panel" id="gAdd"><b>Add one item</b><input type="text" id="gaN" placeholder="Item (Radio PRC-117)" maxlength="60"><input type="text" id="gaS" placeholder="Serial or tag (optional)" maxlength="40"><input type="text" id="gaC" list="gaCl" placeholder="Category (Comms, Tools, Vehicles)" maxlength="30"><datalist id="gaCl">${cats.map(c=>`<option value="${esc(c)}">`).join("")}</datalist><div class="row2"><button class="btn" data-gaddone="1">Add</button><button class="btn alt" data-gx="1">Cancel</button></div></div>`}
function html(){const lv=A.level("gear");const back=`<button class="chip" data-go="tools" style="cursor:pointer;margin-top:12px">◂ Tools</button>`;
  if(!lv)return back+`<h2>Gear</h2><div class="panel"><p class="note">Gear isn't turned on for you. Ask your OIC to turn it on in Tool access.</p></div>`;
  const g=G(),mgr=lv==="mgr",it=g.items;
  let h=back+`<h2>${mgr?"Gear":"Equipment status"}</h2><p class="note">${mgr?"You control sign-out, returns and the inventory count.":"What's up and down. Tap Mark down or Mark up to update it."}</p>`;
  if(MSG){h+=`<div class="note" role="status" style="font-weight:700">${esc(MSG)}</div>`}
  if(!it.length){h+=mgr?dropPanel():`<div class="panel"><p class="note">No gear loaded yet. The tool room NCO drops in the roster first.</p></div>`;return h}
  const out=it.filter(isOut).length,dn=it.filter(x=>x.dn).length,od=it.filter(overdue).length,up=it.length-dn;
  h+=`<div class="afm">${mgr?`<div><b>${it.length-out}</b>In</div><div><b>${out}</b>Out</div><div><b>${dn}</b>Down</div>${od?`<div class="bad"><b>${od}</b>Overdue</div>`:""}`:`<div><b>${up}</b>Up</div><div><b>${dn}</b>Down</div><div><b>${out}</b>Out</div>`}</div>`;
  if(!mgr)h+=`<div class="afbar"><i style="width:${Math.round(up/it.length*100)}%"></i></div><div class="note">${Math.round(up/it.length*100)}% ready</div><button class="btn alt" data-gcopy="1" style="margin:6px 0">Copy status to send</button>`;
  if(mgr){h+=`<div class="row2"><button class="btn alt" data-gaddt="1">Add item</button><button class="btn alt" data-gdropt="1">Drop in roster</button></div>`;
    if(ADD)h+=addPanel();if(DROP)h+=dropPanel();
    const I=g.inv;
    if(I.open){const n=it.filter(x=>I.seen[x.id]).length;h+=`<div class="panel" id="gInv"><b>Inventory in progress</b><div class="note">${n} of ${it.length} counted. Tap Count on each item you can see on the shelf.</div><div class="afbar"><i style="width:${Math.round(n/it.length*100)}%"></i></div><div class="row2"><button class="btn" data-ginvend="1">Finish count</button><button class="btn alt" data-ginvx="1">Cancel</button></div></div>`}
    else h+=`<button class="btn alt" data-ginvstart="1" style="width:100%;margin-top:6px">Start inventory count</button>`;
    if(!I.open&&g.lastInv){const L=g.lastInv;const all=L.found===L.total;h+=`<div class="panel" id="gLast" style="margin-top:8px"><b>Last inventory</b> · ${esc(dl(dkey(new Date(L.t))))} ${hm(L.t)}<div style="color:var(${all?"--s-onhand":"--warn"});font-weight:700">${L.found} of ${L.total} accounted for${all?" · 100%":""}</div>${L.missing.length?`<div class="note">Not counted: ${esc(L.missing.join(", "))}</div>`:""}<button class="chip afc" data-ginvcopy="1" style="margin-top:6px">Copy report</button></div>`}}
  h+=`<div class="afl" style="margin-top:10px">${[["all","All"],["out","Out"],["in","In"],["down","Down"]].concat(mgr&&od?[["over","Overdue"]]:[]).map(f=>`<button class="chip afc${F===f[0]?" on":""}" data-gf="${f[0]}">${f[1]}</button>`).join("")}</div><input type="text" id="gQ" placeholder="Search gear, serial or person" autocomplete="off" value="${esc(Q)}" style="margin-top:6px"><div id="gList">${listHTML(mgr)}</div>`;
  return h}
function css(){if(document.getElementById("afGearCss"))return;const s=document.createElement("style");s.id="afGearCss";
  s.textContent=`.afb{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.afs{padding:8px 4px 12px;border-bottom:1px solid var(--line,#ddd)}.afs input{margin-top:6px}
.afm{display:flex;gap:8px;margin:8px 0}.afm>div{flex:1;text-align:center;padding:8px 4px;border-radius:12px;background:rgba(127,127,127,.12);font-size:12px}.afm b{display:block;font-size:22px;font-weight:700}.afm .bad{color:var(--warn,#c0392b)}
.afbar{height:8px;border-radius:4px;background:rgba(127,127,127,.2);overflow:hidden;margin:6px 0}.afbar i{display:block;height:100%;background:var(--s-onhand,#3a8f5c)}`;document.head.appendChild(s)}
css();
{const _r=render;render=function(){if(view==="gear"){renderTabs();$("#main").innerHTML=html();if(typeof animateView==="function")animateView();return}return _r.apply(this,arguments)}}
const mgrNow=()=>A.level("gear")==="mgr";
const redrawList=()=>{const L=$("#gList");if(L)L.innerHTML=listHTML(mgrNow())};
document.addEventListener("click",e=>{const t=e.target;if(!t||!t.closest||view!=="gear")return;
  const a=sel=>t.closest(sel);let b;
  if(b=a("[data-gf]")){F=b.dataset.gf;again();return}
  if(b=a("[data-gso]")){SIGN=SIGN===b.dataset.gso?null:b.dataset.gso;DOWN=null;PQ="";DUE="today";again();return}
  if(b=a("[data-gx]")){SIGN=null;ADD=false;again();return}
  if(b=a("[data-gdue]")){DUE=b.dataset.gdue;again();return}
  if(b=a("[data-gpick]")){if(!mgrNow())return denyMsg();const id=SIGN;if(signOut(id,b.dataset.gpick)){SIGN=null;MSG="";again();toast("Signed out")}return}
  if(b=a("[data-gother]")){if(!mgrNow())return denyMsg();const v=(($("#gOther")||{}).value||"").trim();if(!v){toast("Type a name first.");return}if(signOut(b.dataset.gother,"",v)){SIGN=null;again();toast("Signed out")}return}
  if(b=a("[data-gret]")){if(!mgrNow())return denyMsg();ret(b.dataset.gret);again();toast("Returned");return}
  if(b=a("[data-gdown]")){DOWN=DOWN===b.dataset.gdown?null:b.dataset.gdown;SIGN=null;again();return}
  if(b=a("[data-gwhy]")){const [id,r]=b.dataset.gwhy.split("|");setDown(id,r);DOWN=null;again();toast("Marked down");return}
  if(b=a("[data-gup]")){setUp(b.dataset.gup);again();toast("Marked up");return}
  if(b=a("[data-gopen]")){if(G().inv.open)return;OPEN=OPEN===b.dataset.gopen?null:b.dataset.gopen;ARM=null;again();return}
  if(b=a("[data-grm]")){if(!mgrNow())return denyMsg();const id=b.dataset.grm;if(ARM!=="rm"+id){ARM="rm"+id;again();return}const g=G();g.items=g.items.filter(x=>x.id!==id);OPEN=null;ARM=null;save();again();toast("Removed");return}
  if(b=a("[data-gaddt]")){ADD=!ADD;if(ADD)DROP=false;again();return}
  if(b=a("[data-gdropt]")){DROP=!DROP;if(DROP)ADD=false;again();return}
  if(b=a("[data-gaddone]")){if(!mgrNow())return denyMsg();const n=(($("#gaN")||{}).value||"").trim();if(!n){toast("Type the item first.");return}
    const r=addItems([{n,sn:(($("#gaS")||{}).value||"").trim(),cat:(($("#gaC")||{}).value||"").trim()||"General",hold:""}]);ADD=false;MSG=r.n?"Added "+n+".":"Already on the list.";again();return}
  if(b=a("[data-gaddp]")){if(!mgrNow())return denyMsg();const txt=(($("#gPaste")||{}).value||"").trim();if(!txt){toast("Paste some rows first.");return}
    const list=parseItems(txt);if(!list.length){toast("No gear found in that. Check the columns.");return}const r=addItems(list);DROP=false;MSG="Added "+r.n+" item"+(r.n===1?"":"s")+(r.held?" · "+r.held+" already out":"")+(r.skip?" · "+r.skip+" already on the list":"")+".";again();return}
  if(b=a("[data-gtpl]")){shareFile(template(),"Gear roster template.csv","text/csv");return}
  if(b=a("[data-ginvstart]")){if(!mgrNow())return denyMsg();startInv();ARM=null;OPEN=null;again();return}
  if(b=a("[data-gcnt]")){const I=G().inv;const id=b.dataset.gcnt;if(I.seen[id])delete I.seen[id];else I.seen[id]=1;save();again();return}
  if(b=a("[data-ginvend]")){finishInv();again();toast("Inventory saved");return}
  if(b=a("[data-ginvx]")){const g=G();g.inv={open:false,start:0,seen:{}};save();again();return}
  if(b=a("[data-ginvcopy]")){copy(invText(G().lastInv));return}
  if(b=a("[data-gcopy]")){copy(statusText());return}});
document.addEventListener("input",e=>{const el=e.target;if(!el||view!=="gear")return;
  if(el.id==="gQ"){Q=el.value;redrawList()}
  else if(el.id==="gPq"){PQ=el.value;const P=$("#gPick");if(P)P.innerHTML=pickList()}});
document.addEventListener("change",async e=>{const el=e.target;if(!el||el.id!=="gFile"||view!=="gear")return;const f=el.files&&el.files[0];if(!f)return;if(!mgrNow())return denyMsg();
  try{const list=parseItems(await readFile(f));if(!list.length){toast("No gear found in that file.");return}const r=addItems(list);DROP=false;MSG="Added "+r.n+" item"+(r.n===1?"":"s")+(r.skip?" · "+r.skip+" already on the list":"")+".";again()}catch(err){toast(String(err.message||"Couldn't read that file."))}});
/* testing hooks */
window.afGear={parse:parseItems,add:addItems,signOut:(id,p,o)=>signOut(id,p,o),ret,setDown,setUp,startInv,finishInv,state:G};

/* ---------- members see their own gear on My page ---------- */
{const _md=mpDigest;mpDigest=function(m){const d=_md.apply(this,arguments);try{if(mods().gear)d.gear=G().items.filter(x=>x.h===m.id).slice(0,20).map(x=>({n:x.n,sn:x.sn||"",t:x.t?hm(x.t):"",due:x.due||""}))}catch(e){}return d}}
function mods(){return A.mods()}
function meGear(){if(view!=="me"&&view!=="mepv")return;const D=S.me&&S.me.d;const m=$("#main");if(!D||!m||m.querySelector("#afMyGear"))return;const L=D.gear||[];if(!L.length)return;
  m.insertAdjacentHTML("beforeend",`<div class="panel" id="afMyGear" style="margin-top:12px"><b>My gear</b>${L.map(x=>`<div class="rrow" style="--sc:var(--brass)"><div class="who"><b>${esc(x.n)}</b><div class="ph">${esc(x.sn?x.sn+" · ":"")}${x.t?"Out since "+esc(x.t):""}${x.due?" · due "+esc(dl(x.due)):""}</div></div></div>`).join("")}<p class="note">Return it to the tool room when you're done.</p></div>`)}
if(typeof renderMe==="function"){const _rm=renderMe;renderMe=function(){const r=_rm.apply(this,arguments);try{meGear()}catch(e){}return r}}
if(typeof HELP==="object"){HELP.gear=["Gear","Sign tools, radios and keys out and in, run an inventory count, and see what's up or down.",["Tools → Tool access: turn Gear on and choose a Manager (tool room) and Status people (operations).","Gear → Drop in roster, then Sign out and Return as gear moves.","Start inventory count, tap Count on each item, Finish count for the report."]]}
})();
