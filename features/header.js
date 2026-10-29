/* Accounted For 4.18.1 — Header like the welcome screen: the app icon, the name big and bold, and the green
   ● Live pill right beside the name while live updates are connected. The "As of …" line goes away (the Live pill
   says it); the platoon/company switch stays. */
(()=>{
function build(){const b=document.querySelector("header.top .brand > div:first-child");if(!b||b.querySelector("#hdIcon"))return;
  const h1=b.querySelector("h1");if(!h1)return;
  b.classList.add("hd-brand");
  const row=document.createElement("div");row.className="hd-row";h1.parentNode.insertBefore(row,h1);row.appendChild(h1);
  const slot=document.createElement("span");slot.id="hdLive";row.appendChild(slot);
  const ic=document.createElement("img");ic.id="hdIcon";ic.src="icon-192.png";ic.alt="";ic.width=40;ic.height=40;b.insertBefore(ic,b.firstChild);
  const txt=document.createElement("div");txt.className="hd-txt";while(b.children.length>1){const c=b.children[1];txt.appendChild(c)}b.appendChild(txt);
  move()}
function move(){const d=document.getElementById("liveDot"),s=document.getElementById("hdLive");if(d&&s&&d.parentNode!==s)s.appendChild(d)}
build();
new MutationObserver(()=>{try{build();move()}catch(e){}}).observe(document.querySelector("header.top")||document.body,{childList:true,subtree:true});
{const st=document.createElement("style");st.textContent=`.hd-brand{display:flex!important;align-items:center;gap:12px}
#hdIcon{width:40px;height:40px;border-radius:11px;flex:none;box-shadow:0 2px 8px rgba(15,23,32,.15)}
.hd-txt{min-width:0}.hd-row{display:flex;align-items:center;gap:10px;min-width:0}
header.top .brand .hd-row h1{font-size:24px;letter-spacing:-.02em;line-height:1.05}
#hdLive:empty{display:none}#hdLive #liveDot{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;background:color-mix(in srgb,var(--s-onhand) 14%,transparent);color:var(--s-onhand);font-size:12px;font-weight:800;letter-spacing:.02em;white-space:nowrap}
#hdLive #liveDot i{width:8px;height:8px;border-radius:4px;background:var(--s-onhand);display:inline-block}
header.top .brand .dtg #dtg{display:none}header.top .brand .dtg:not(:has(#wsBar :not(:empty))){display:none}
header.top .brand .dtg{margin-top:6px}#wsBar{gap:8px;margin-top:0}
#wsBar button{margin:0;height:32px;padding:0 14px;border-radius:10px;border:1px solid rgba(37,99,235,.25);background:linear-gradient(180deg,#eaf1ff,#dbe7ff);color:#1e4fd0;font-size:12px;font-weight:800;letter-spacing:.06em;display:inline-flex;align-items:center;gap:6px;box-shadow:0 1px 2px rgba(15,23,32,.06);cursor:pointer}
#wsBar button[aria-pressed="true"]{background:linear-gradient(135deg,#4f8bff 0%,#2563eb 55%,#1d4ed8 100%);color:#fff;border-color:transparent;box-shadow:0 2px 8px rgba(37,99,235,.35)}
#wsBar button[disabled]{opacity:.9}#wsBar button[data-tmsw]{background:var(--surface-solid);color:var(--ink);border-color:var(--line);box-shadow:none}
@media (max-width:360px){header.top .brand .hd-row h1{font-size:20px}}`;document.head.appendChild(st)}
})();
