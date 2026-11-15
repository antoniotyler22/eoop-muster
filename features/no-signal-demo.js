/* Accounted For 4.118/4.119: no signal? My Page shows a short demo next to the check-in slide saying you can still check in.
   Shows only while the phone is offline (or Field mode sees the network down). Check-ins made then are saved on the phone
   (field-mode.js) and send by themselves when a bar returns.
   4.119: "Pass to a nearby phone". A saved check-in becomes a small packet ("#EOOP-OB|1|...") shared by AirDrop, Nearby Share or text.
   A phone that gets one adds it (Field mode, "Got a packet?") and sends it with its own signal. The packet is the same encrypted request
   the phone would have sent itself; carrying it shows the carrier nothing. Packets older than 48 hours are ignored, and a phone never adds the same one twice. */
(()=>{
const off=()=>navigator.onLine===false||!!(window.fieldMode&&window.fieldMode.netDown);
const CK=new Set(["page_req","feed_req"]);
const mine=()=>{try{return(S.outbox||[]).filter(x=>x&&x.fm&&x.args)}catch(e){return[]}};
const cks=()=>mine().filter(x=>CK.has(x.fn)&&!x.carried);
const MAXAGE=48*3600*1000;
const enc=o=>btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const dec=s=>JSON.parse(decodeURIComponent(escape(atob(String(s).replace(/-/g,"+").replace(/_/g,"/")))));
const sig=x=>x.fn+"|"+x.t+"|"+JSON.stringify(x.args).length+"|"+String(x.args.p_ct||"").slice(0,24);
function outText(){const L=cks();return "Check-in packet"+(L.length===1?"":"s")+" from Accounted For. Open Accounted For, Field mode, and paste this.\n"+L.map(x=>"#EOOP-OB|1|"+enc({fn:x.fn,args:x.args,t:x.t})).join("\n")}
function addPackets(text){let n=0,old=0,dup=0;S.obSeen=Array.isArray(S.obSeen)?S.obSeen:[];
  String(text||"").split(/\r?\n/).forEach(ln=>{const k=ln.indexOf("#EOOP-OB|1|");if(k<0)return;
    let o;try{o=dec(ln.slice(k+11).trim().split(/\s/)[0])}catch(e){return}
    if(!o||!CK.has(o.fn)||!o.args||typeof o.args!=="object"||!(+o.t>0))return;
    if(Date.now()-o.t>MAXAGE){old++;return}
    const x={fn:o.fn,args:o.args,t:+o.t,fm:1,carried:1,lb:"📍 Check-in carried for a nearby phone"},s=sig(x);
    if(S.obSeen.includes(s)||(S.outbox||[]).some(y=>y&&sig(y)===s)){dup++;return}
    S.obSeen.push(s);S.obSeen=S.obSeen.slice(-300);S.outbox.push(x);n++});
  if(n){S.outbox=S.outbox.slice(-200);save();if(navigator.onLine!==false)setTimeout(()=>window.dispatchEvent(new Event("online")),50)}
  return{n,old,dup}}
function card(){const L=cks(),n=mine().length;
  const st=(i,ic,t,s)=>`<div class="ns-st" style="--i:${i}"><span class="ns-ic">${ic}</span><span><b>${t}</b><small>${s}</small></span></div>`;
  const done=L.length>0;
  return `<div class="panel" id="nsCard" role="status" data-noxl data-sig="${n}|${done?1:0}">
    <div class="ns-h"><span class="ns-tag">NO SIGNAL</span><b>${done?"Saved on this phone":"You can still check in"}</b></div>
    <p class="note" style="margin:4px 0 10px">${done?"Your check-in goes to your leader as soon as any phone has a bar.":"Slide like normal. Your check-in is saved on this phone and goes to your leader as soon as you have a bar."}</p>
    ${done?"":`<div class="ns-demo" aria-hidden="true">${st(0,"➜","Slide to check in","Works with no service")}${st(1,"💾","Saved on this phone","Nothing is lost")}${st(2,"✓","Sent when you have a bar","Leader sees it then")}</div>`}
    ${n?`<p class="note ns-wait" style="margin:10px 0 0">${n} waiting to send. It sends by itself.</p>`:""}
    ${done?`<button type="button" class="btn" data-nspass="1" style="width:100%;margin-top:10px">Pass to a nearby phone</button><p class="note" id="nsMsg" style="margin:6px 0 0">AirDrop, Nearby Share or text. Whoever gets signal first sends it.</p>`:""}</div>`}
function paint(){if(view!=="mypg"&&view!=="me")return;const old=document.getElementById("nsCard");
  if(!off()){if(old)old.remove();return}
  const ck=document.querySelector(".mp-ck");if(!ck)return;
  const want=mine().length+"|"+(cks().length?1:0);
  if(old){if(old.previousElementSibling===ck&&old.dataset.sig===want)return;old.remove()}
  ck.insertAdjacentHTML("afterend",card())}
function recv(){return `<div class="panel" id="nsRecv" data-noxl><b>Got a packet from a nearby phone?</b>
  <p class="note" style="margin:2px 0 8px">Paste it here. This phone sends it as soon as it has signal.</p>
  <textarea id="nsIn" style="min-height:60px" placeholder="#EOOP-OB|1|..." aria-label="Packet from a nearby phone"></textarea>
  <button type="button" class="btn alt" data-nsadd="1">Add packet</button><p class="note" id="nsRmsg" role="status" style="margin:6px 0 0"></p></div>`}
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{paint();if(view==="field"){const b=document.getElementById("fmBody");if(b&&!document.getElementById("nsRecv"))b.insertAdjacentHTML("beforeend",recv())}}catch(e){}return r}}
window.addEventListener("offline",()=>{try{paint()}catch(e){}});window.addEventListener("online",()=>{try{paint()}catch(e){}});
if(typeof every==="function")every(4000,()=>{try{paint()}catch(e){}},"no-signal-demo");
document.addEventListener("click",async e=>{const t=e.target.closest&&e.target.closest("[data-nspass],[data-nsadd]");if(!t)return;
  if(t.dataset.nspass){const say=s=>{const o=document.getElementById("nsMsg");if(o)o.textContent=s};const txt=outText();
    try{if(navigator.share){await navigator.share({text:txt});return}await navigator.clipboard.writeText(txt);say("Copied. Paste it into a message or AirDrop it.")}catch(err){}return}
  const r=addPackets((document.getElementById("nsIn")||{}).value),o=document.getElementById("nsRmsg");
  if(o)o.textContent=r.n?r.n+" added. It sends when this phone has signal.":r.old?"That packet is more than 48 hours old.":r.dup?"This phone already has that one.":"No check-in packet found in that text.";
  if(r.n){const i=document.getElementById("nsIn");if(i)i.value="";try{if(typeof fieldMode!=="undefined"&&fieldMode.paint)fieldMode.paint()}catch(e2){}}});
window.AFPass={outText,addPackets,enc,dec};
if(typeof SYNC_SKIP==="object"&&Array.isArray(SYNC_SKIP))SYNC_SKIP.push("obSeen");
const st=document.createElement("style");st.textContent=`#nsRecv{margin-bottom:84px}#nsCard{margin-top:12px;border:1px solid var(--brass)}
#nsCard .ns-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap}#nsCard .ns-tag{font-size:11px;font-weight:700;letter-spacing:.06em;color:var(--brass)}
#nsCard .ns-demo{display:grid;gap:8px}#nsCard .ns-st{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:12px;background:var(--glass2,rgba(127,127,127,.1));animation:nsPulse 6s infinite;animation-delay:calc(var(--i)*2s);opacity:.55}
#nsCard .ns-ic{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--brass);color:#fff;font-size:14px;flex:none}
#nsCard .ns-st b{display:block;font-size:14px}#nsCard .ns-st small{display:block;font-size:12px;color:var(--muted)}
@keyframes nsPulse{0%,33%{opacity:1}34%,100%{opacity:.55}}@media(prefers-reduced-motion:reduce){#nsCard .ns-st{animation:none;opacity:1}}`;
document.head.appendChild(st);
})();
