/* Accounted For 4.127.0: Settings → Tools. Every tool with an on/off switch.
   - Each switch is for this phone. A tool that's off disappears from the tab bar, Home and every screen's buttons;
     opening it any other way lands on Home. Nothing is deleted: its data stays saved and comes back when it's on.
   - Only the owner can turn off Dashboard and Notifications (they carry the headcount and urgent alerts).
   - Tapping a tool's name opens its own page: what it does, its settings, and chips to the related features.
   - Reset to default turns every tool back on.
   The choice is kept on this phone and never syncs to other phones. */
(()=>{
const TOOLS=[
  {k:"dash",n:"Dashboard",d:"Everything on one screen: headcount, recall, requests, reports and activity.",views:["dash"],lock:1,chips:[["dash","Open Dashboard"],["board","Home"],["checkins","Check-ins"]]},
  {k:"invite",n:"Invite",d:"Invite people to your team and send them their links.",views:["invite"],chips:[["invite","Open Invite"],["live","Invite link"],["logins","Logins"]]},
  {k:"joincode",n:"Join code",d:"A 6-character code people type in the app to join your team.",views:["joincode"],chips:[["joincode","Join code"],["invite","Invite"],["joinreqs","Requests to join"]]},
  {k:"ask",n:"Ask to join",d:"People find your team by name or code and ask to join. You approve or decline.",views:["joinreqs","askjoin"],chips:[["joinreqs","Requests to join"],["joincode","Join code"]]},
  {k:"signin",n:"Sign in",d:"An optional account: sign in with Apple, Google, email or a text code.",views:["acct"],sel:["[data-acwelcome]","#v11SignInTool"],chips:[["acct","Account"]]},
  {k:"ntf",n:"Notifications",d:"Which alerts buzz this phone. Urgent alerts always come through.",views:[],lock:1,sel:["#hubPush","[data-sp=\"ntf\"]"],chips:[["checkins","Check-ins"],["feed","Feed"]],page:"ntf"},
  {k:"cal",n:"Calendar",d:"Team and section events, your own calendar, and conflicts.",views:["cal","mecal","events"],chips:[["cal","Calendar"],["events","Events"],["mecal","My calendar"]]},
  {k:"feed",n:"Feed",d:"Word of Mouth: posts, confirmations and replies.",views:["feed","send"],sel:["[data-seg=\"feed\"]"],tab:"feed",chips:[["feed","Open Feed"],["send","Post"]]},
  {k:"reports",n:"Reports",d:"Text reports, rollups, trends and the headcount PDF.",views:["text","rollup","trends"],sel:["[data-pdf-report]"],chips:[["text","Text report"],["rollup","Rollup"],["trends","Trends"]]}];
window.TOOL_LIST=TOOLS.map(t=>t.k);
if(typeof SYNC_SKIP!=="undefined"&&Array.isArray(SYNC_SKIP)&&!SYNC_SKIP.includes("toolsOff"))SYNC_SKIP.push("toolsOff");
const owner=()=>typeof isOwner==="function"&&isOwner();
const offMap=()=>S.toolsOff&&typeof S.toolsOff==="object"?S.toolsOff:{};
/* a locked tool is always on for a non-owner, whatever is saved */
function on(k){const t=TOOLS.find(x=>x.k===k);if(!t)return true;if(t.lock&&!owner())return true;return !offMap()[k]}
window.toolOn=on;
window.toolsOffCount=()=>TOOLS.filter(t=>!on(t.k)).length;
const offViews=()=>TOOLS.filter(t=>!on(t.k)).flatMap(t=>t.views);
function setOn(k,v){const t=TOOLS.find(x=>x.k===k);if(!t)return false;if(t.lock&&!owner()&&!v)return false;
  const o=Object.assign({},offMap());if(v)delete o[k];else o[k]=1;S.toolsOff=o;if(!Object.keys(o).length)delete S.toolsOff;save();apply();
  if(k==="ntf")try{if(typeof window.ntfResign==="function")window.ntfResign()}catch(e){}return true}
window.toolSet=setOn;
function reset(){delete S.toolsOff;save();apply();try{if(typeof window.ntfResign==="function")window.ntfResign()}catch(e){}}
window.toolsReset=reset;

/* hide every way into an off tool */
function apply(){let st=document.getElementById("tlCss");if(!st){st=document.createElement("style");st.id="tlCss";document.head.appendChild(st)}
  const sel=[];for(const t of TOOLS){if(on(t.k))continue;for(const v of t.views)sel.push(`[data-go="${v}"]`,`[data-tab="${v}"]`);for(const s of t.sel||[])sel.push(s)}
  st.textContent=sel.length?sel.join(",")+"{display:none!important}":""}
window.toolsApply=apply;
{const _tl=tabsList;tabsList=function(){const L=_tl.apply(this,arguments);try{const off=new Set(TOOLS.filter(t=>t.tab&&!on(t.k)).map(t=>t.tab));return off.size?L.filter(x=>!off.has(x[0])):L}catch(e){return L}}}
{const _r=render;render=function(){try{if(typeof view!=="undefined"&&offViews().includes(view)){const t=TOOLS.find(x=>x.views.includes(view));
  view=typeof memberMode==="function"&&memberMode()?"today":"board";setTimeout(()=>toast((t?t.n:"That tool")+" is off on this phone. Turn it on in Settings → Tools."),0)}}catch(e){}
  const r=_r.apply(this,arguments);return r}}
/* Notifications off: this phone's alert sign-up mutes every kind (urgent ones still come through) */
if(typeof window.ntfMuted==="function"){const _m=window.ntfMuted;window.ntfMuted=function(){return on("ntf")?_m.apply(this,arguments):(window.NTF_TYPES||[]).slice()}}

/* ---------- Settings → Tools ---------- */
const K=()=>window.spKit;
function listPage(){const k=K();const rows=TOOLS.map(t=>{const lockd=t.lock&&!owner();
  return `<div class="ios-row tl-row" data-tlrow="${t.k}"><button type="button" class="tl-name" data-sp="tl:${t.k}" aria-label="${esc(t.n)} settings"><span class="ios-t"><b>${esc(t.n)}</b><small class="ios-sub" style="display:block">${esc(lockd?"Always on: only the owner can turn this off.":t.d)}</small></span></button>
    <input type="checkbox" class="ios-sw" data-tool="${t.k}" role="switch" aria-label="${esc(t.n)} on"${on(t.k)?" checked":""}${lockd?" disabled":""}></div>`});
  return k.top("Tools",1)+k.grp(rows,"Off hides the tool on this phone. Its data stays saved. Tap a name for that tool's settings.")
    +`<div class="ios-grp"><div class="ios-pad"><button class="btn alt" id="tlReset" style="width:100%"${window.toolsOffCount()?"":" disabled"}>Reset to default</button></div></div>`}
function toolPage(t){const k=K();const lockd=t.lock&&!owner();
  const extra=t.page==="ntf"?`${typeof window.ntfPanelHtml==="function"?window.ntfPanelHtml():""}${typeof window.qhPanelHtml==="function"?window.qhPanelHtml():""}`
    :typeof window.toolExtra==="function"?(window.toolExtra(t.k)||""):"";
  return k.top(esc(t.n),1)+k.grp([`<label class="ios-row"><span class="ios-t">${esc(t.n)} on this phone</span><input type="checkbox" class="ios-sw" data-tool="${t.k}" role="switch"${on(t.k)?" checked":""}${lockd?" disabled":""}></label>`],
      esc(t.d)+(lockd?" Only the owner can turn this off.":""))
    +(extra?`<div class="ios-grp"><div class="ios-pad" id="tlExtra">${extra}</div></div>`:"")
    +(t.chips&&t.chips.length?`<p class="ios-sec">Related</p><div class="ios-grp"><div class="ios-pad"><div class="evts" id="tlChips">${t.chips.filter(([v])=>!offViews().includes(v)).map(([v,l])=>`<button class="chip" data-go="${v}" style="cursor:pointer">${esc(l)}</button>`).join("")}</div></div></div>`:"")}
window.spToolPage=p=>{if(p==="tl")return listPage();const t=TOOLS.find(x=>"tl:"+x.k===p);return t?toolPage(t):listPage()};
document.addEventListener("change",e=>{const t=e.target;if(!t||!t.dataset||!t.dataset.tool)return;const k=t.dataset.tool;
  if(!setOn(k,!!t.checked)){t.checked=true;toast("Only the owner can turn this off.");return}
  const T=TOOLS.find(x=>x.k===k);toast((T?T.n:"Tool")+(t.checked?" on":" off on this phone. Its data stays saved."));try{render()}catch(err){}});
document.addEventListener("click",e=>{const t=e.target;if(!t||!t.closest)return;if(t.closest("#tlReset")){e.stopImmediatePropagation();reset();render();toast("Every tool is back on.")}},true);
{const st=document.createElement("style");st.textContent=`.tl-row{display:flex;align-items:center;gap:10px}.tl-row .tl-name{flex:1;min-width:0;background:none;border:0;padding:0;text-align:left;color:inherit;font:inherit;cursor:pointer}.tl-row .tl-name small{font-weight:500}`;document.head.appendChild(st)}
apply();
})();
