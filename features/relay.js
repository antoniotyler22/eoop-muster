// 4.93: No-signal relay. A check-in becomes a small packet ("#EOOP-RLY|...") any phone can carry and pass on
// (AirDrop, Nearby Share, Messages, or a Bluetooth transport plugged into window.AFRelayTransport). Phones dedupe
// by id, count hops, and the first one with signal uploads live check-ins. The leader's phone can mark them too.
(()=>{
const MAXHOPS=8,MAXBOX=300;
const clean=s=>String(s||"").replace(/[|#\r\n]/g," ").replace(/\s+/g," ").trim().slice(0,40);
const box=()=>{S.relay=S.relay&&Array.isArray(S.relay.box)?S.relay:{box:[]};return S.relay.box};
const key=p=>p.rid+"|"+p.name.toUpperCase()+"|"+p.c+"|"+p.t;
function parse(text){const out=[];String(text||"").split(/\r?\n/).forEach(ln=>{
  let k=ln.indexOf("#EOOP-RLY|");
  if(k>=0){const a=ln.slice(k).split("|");const c=+a[2],t=+a[5],h=+a[6];
    if(/^[\w-]{3,40}$/.test(a[1]||"")&&c>=1&&c<=3&&clean(a[3])&&t>0)out.push({rid:a[1],c,name:clean(a[3]),eta:clean(a[4]),t,hops:Math.max(0,Math.min(h||0,99)),live:a[7]==="1"?1:0});return}
  k=ln.indexOf("#EOOP-CI|");
  if(k>=0){const a=ln.slice(k).split("|");const c=+a[2];if(/^[\w-]{3,40}$/.test(a[1]||"")&&c>=1&&c<=3&&clean(a[3]))out.push({rid:a[1],c,name:clean(a[3]),eta:clean(a[4]),t:Date.now(),hops:0,live:0})}});
  return out}
function add(list){const b=box();let n=0;list.forEach(p=>{if(p.hops>MAXHOPS)return;if(b.some(x=>key(x)===key(p)))return;b.push(Object.assign({up:0},p));n++});
  if(b.length>MAXBOX)b.splice(0,b.length-MAXBOX);if(n)save();return n}
const line=(p,hop)=>"#EOOP-RLY|"+[p.rid,p.c,p.name,p.eta,p.t,p.hops+(hop?1:0),p.live?1:0].join("|");
const mine=()=>box().filter(p=>p.rid===(S.rc&&S.rc.open?ciRid():"\0"));
function outText(){const b=box().filter(p=>p.hops<MAXHOPS);return "Check-in relay: "+b.length+" saved check-in"+(b.length===1?"":"s")+". Open Accounted For, Check-ins, and paste this.\n"+b.map(p=>line(p,1)).join("\n")}
async function upload(){if(typeof SB==="undefined"||navigator.onLine===false||!(crypto&&crypto.subtle))return 0;let n=0;
  for(const p of box()){if(p.up||!p.live)continue;try{const hs=await Promise.all(SB.words(p.name).map(w=>SB.h(p.rid,w)));await SB.rpc("checkin",{p_recall:p.rid,p_words:hs,p_code:p.c,p_note:p.eta});p.up=1;n++;try{SB.notify(p.rid)}catch(e){}}catch(e){break}}
  if(n){save();if(view==="recall")render()}return n}
function importQueue(){try{const q=JSON.parse(localStorage.getItem("afRelayQ")||"[]");if(q.length){const n=add(parse(q.join("\n")));localStorage.removeItem("afRelayQ");if(n)toast(n+" check-in"+(n===1?"":"s")+" saved to relay")}}catch(e){}}
const _a=applyCheckins;
applyCheckins=function(text){return _a.call(this,String(text).split(/\r?\n/).map(l=>{const p=parse(l)[0];return l.includes("#EOOP-RLY|")&&p?"#EOOP-CI|"+p.rid+"|"+p.c+"|"+p.name+"|"+p.eta:l}).join("\n"))};
function html(){const b=box();const m=mine();const up=b.filter(p=>p.up).length;
  return `<div class="panel" id="rlBox" data-noxl><b>No signal? Relay it</b>
    <p class="note" style="margin:2px 0 8px">Check-ins made with no service are saved as small packets. Pass them to a nearby phone by AirDrop, Nearby Share or text. The first phone with signal uploads them.</p>
    <p class="note" id="rlStat" role="status">${b.length?b.length+" carried"+(up?" · "+up+" uploaded":"")+(m.length?" · "+m.length+" for this recall":""):"Nothing carried yet."}</p>
    ${b.length?`<button class="btn" data-rlshare="1">Pass to a nearby phone</button>`:""}
    ${m.length?`<button class="btn alt" data-rlapply="1">Mark the ${m.length} for this recall</button>`:""}
    <label for="rlIn">Packets I received</label><textarea id="rlIn" style="min-height:60px" placeholder="#EOOP-RLY|..."></textarea>
    <button class="btn alt" data-rladd="1">Add packets</button></div>`}
{const _c=ciHTML;ciHTML=function(){return _c.apply(this,arguments)+html()}}
document.addEventListener("click",async e=>{const t=e.target.closest("[data-rlshare],[data-rlapply],[data-rladd]");if(!t)return;const say=s=>{const o=$("#rlStat");if(o)o.textContent=s};
  if(t.dataset.rladd){const n=add(parse(($("#rlIn")||{}).value));say(n?n+" added.":"Nothing new in that text.");if(n){upload();if(view==="recall")setTimeout(render,0)}return}
  if(t.dataset.rlapply){const lines=mine().map(p=>"#EOOP-CI|"+p.rid+"|"+p.c+"|"+p.name+"|"+p.eta).join("\n");applyCheckins(lines);save();render();return}
  if(t.dataset.rlshare){const txt=outText();const T=window.AFRelayTransport;
    try{if(T&&T.send){await T.send(box().map(p=>line(p,1)));say("Sent to nearby phones.");return}
      if(navigator.share){await navigator.share({text:txt});return}
      await navigator.clipboard.writeText(txt);say("Copied. Paste it into a message or AirDrop.")}catch(err){}}});
window.addEventListener("online",()=>{upload()});
{const T=window.AFRelayTransport;if(T&&T.onReceive)T.onReceive(l=>{if(add(parse(Array.isArray(l)?l.join("\n"):l)))upload()})}
window.AFRelay={parse,add,upload,outText,box};
setTimeout(()=>{importQueue();upload()},1200);
})();
