/* Accounted For 4.18.5 — Header: the check-mark icon and the PLT / CO tiles side by side, nothing else on the left.
   The icon is blue while live updates are connected and black when they aren't, so the color is the signal (no
   Live pill, no app name). Tap the icon to open the Dashboard for a quick look at the numbers. The app name and
   version switch still live under Tools → Settings → App version. */
(()=>{
const ICON=`<svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true"><defs><linearGradient id="hdG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5aa7ff"/><stop offset="1" stop-color="#1f5fe0"/></linearGradient></defs>
  <rect class="hd-bg" x="2" y="2" width="60" height="60" rx="15"/>
  <path d="M46.5 24.5A15 15 0 1 1 41 19.2" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
  <circle cx="45.5" cy="18" r="3" fill="#fff"/>
  <path d="M24 32.5l6 6L44 24.5" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
function build(){const b=document.querySelector("header.top .brand > div:first-child");if(!b||b.querySelector("#hdIcon"))return;
  const h1=b.querySelector("h1");if(!h1)return;b.classList.add("hd-brand");
  const btn=document.createElement("button");btn.id="hdIcon";btn.type="button";btn.setAttribute("data-go","dash");btn.setAttribute("aria-label","Dashboard: a quick look at the numbers");btn.title="Dashboard";btn.innerHTML=ICON;
  b.insertBefore(btn,b.firstChild);h1.classList.add("hd-name");paint()}
function paint(){const b=document.getElementById("hdIcon");if(!b)return;const on=!!document.getElementById("liveDot");b.classList.toggle("live",on);b.title=on?"Live · updates arrive the moment they happen. Tap for the Dashboard.":"Not live right now (updates every minute). Tap for the Dashboard."}
build();
new MutationObserver(()=>{try{build();paint()}catch(e){}}).observe(document.querySelector("header.top")||document.body,{childList:true,subtree:true});
{const st=document.createElement("style");st.textContent=`.hd-brand{display:flex!important;align-items:center;gap:12px}
#hdIcon{all:unset;cursor:pointer;width:44px;height:44px;flex:none;border-radius:12px;display:inline-flex;transition:filter .2s}#hdIcon:active{filter:brightness(.9)}#hdIcon:focus-visible{outline:2px solid var(--brass);outline-offset:2px}
#hdIcon svg{width:44px;height:44px;display:block}#hdIcon .hd-bg{fill:#0f1720;transition:fill .3s}#hdIcon.live .hd-bg{fill:url(#hdG)}
header.top .brand .hd-name{display:none}header.top .brand .dtg #dtg,header.top .brand #liveDot{display:none}
header.top .brand .dtg{margin:0}header.top .brand>div:first-child>div{display:flex;align-items:center}
#wsBar{gap:8px;margin:0}#wsBar:empty{display:none}
#wsBar button{margin:0;height:34px;padding:0 16px;border-radius:11px;border:1px solid rgba(37,99,235,.25);background:linear-gradient(180deg,#eaf1ff,#dbe7ff);color:#1e4fd0;font-size:13px;font-weight:800;letter-spacing:.06em;display:inline-flex;align-items:center;gap:6px;box-shadow:0 1px 2px rgba(15,23,32,.06);cursor:pointer}
#wsBar button[aria-pressed="true"]{background:linear-gradient(135deg,#4f8bff 0%,#2563eb 55%,#1d4ed8 100%);color:#fff;border-color:transparent;box-shadow:0 2px 8px rgba(37,99,235,.35)}
#wsBar button[disabled]{opacity:.9}#wsBar button[data-tmsw]{background:var(--surface-solid);color:var(--ink);border-color:var(--line);box-shadow:none}`;document.head.appendChild(st)}
})();
