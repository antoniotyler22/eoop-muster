/* Accounted For 1.4: guided tour. Lights up one part of the screen at a time, says what it is,
   and asks the person to tap it. Runs after a leader picks their version, after someone signs in,
   and any time from Tools → Take the tour. Replaces the old 3-card intro. */
(()=>{
const T={on:false,steps:[],i:0,el:null,raf:0,kind:""};
const lbl=el=>{const t=(el&&(el.querySelector("b")||el).innerText||"").replace(/\s+/g," ").trim();return t.length>40?t.slice(0,40)+"…":t};
const tab=k=>`#tabbar [data-tab="${k}"]`;

/* ---------- steps ---------- */
function leaderSteps(){return [
  {t:"Welcome to your walk-through",b:"This shows you every part of the app, one spot at a time. When a button lights up and says <b>Tap it</b>, tap it. Takes about 2 minutes. When you finish, the app is yours to use.",go:"board"},
  {s:"#bMode",t:"Your app name",b:"Tap the name any time to switch versions (Military, Police, Jobs, HR, Civilian or Custom) or rename your team."},
  {s:"#main .card.hero",t:"Your numbers",b:"Who's here now out of everyone you're responsible for. The bar fills as people show up. Below it is the count by status."},
  {s:"#main .card.hero [data-go]",t:"Sections",b:"Each chip is a section: here / total. Tap one later to see its people."},
  {s:"#main .qa",t:"Quick actions",b:"Check people in at a formation, reach everyone by text, build the report to send up, and get alerts or answers."},
  {s:"#v11Em",t:"Emergency check-in",b:"One tap (then tap again to confirm) sends everyone a check-in link. They answer Good, Delayed or Need help, and you watch the count fill in. Use it for drills, storms and real emergencies."},
  {s:'#main .qa [data-go="text"]',tap:1,t:"Send the numbers",b:el=>`Tap <b>${lbl(el)}</b>.`},
  {t:"Your report",b:"This report builds itself from your board. Text it, copy it or share it to whoever needs your numbers. No typing."},
  {s:tab("people"),tap:1,t:"People",b:"Tap <b>People</b>."},
  {s:"#main .pcard",t:"Sections and people",b:"Open a section to see everyone in it. Tap a person's status to change it. The numbers update right away."},
  {s:'#main [data-go="data"]',opt:1,t:"Load your roster",b:"Bring in your people from Excel or CSV. Until then you're looking at sample people."},
  {s:'#main [data-go="live"]',opt:1,t:"Live sections",b:"Lets each section leader update their own section from their phone. It all rolls up to you."},
  {s:tab("feed"),tap:1,t:"Feed",b:"Tap <b>Feed</b>."},
  {t:"Pass the word",b:"Post once and everyone gets it. Each person taps <b>Got it</b>, so you see who saw it and who hasn't.",s:"#main .panel, #main .card, #fdCreate",opt:1},
  {s:tab("plan"),tap:1,t:"Plan",b:"Tap <b>Plan</b>."},
  {s:"#subnav",opt:1,t:"Plan tabs",b:"Calendar, duty roster, readiness (who's due for what) and events. Everything on the calendar can go to your phone's calendar."},
  {s:tab("tools"),tap:1,t:"Tools",b:"Tap <b>Tools</b>."},
  {s:'#main [data-go="dash"]',opt:1,t:"Dashboard",b:"Everything on one screen: present, requests, reports, overdue items and who's logged in."},
  {s:'#main [data-go="invite"]',opt:1,t:"Invite",b:"Send a link that connects someone to your team with a role, or a link so they can start their own team. Send it to any phone number or email. They don't have to be on your roster."},
  {s:'#main [data-go="logins"]',opt:1,t:"Logins",b:"Give someone a username and password instead of a link, and pick their role: member, section leader, viewer, editor and more."},
  {s:"#main #v11Em, #main .tgrid",opt:1,t:"Everything else",b:"Messages, Pages, reports, PDF, call tree and more live here in Tools. Scroll down any time to explore."},
  {s:"#hHelp",t:"Help on every screen",b:"The <b>?</b> explains whatever screen you're on."},
  {s:"#hSet",t:"Settings",b:"PIN lock, text size, your data and backups."},
  {s:tab("home"),tap:1,t:"Back home",b:"Tap <b>Home</b> to finish."},
  {t:"You're all set",b:"That's the whole app. Replay this tour any time from <b>Tools → Take the tour</b>.",end:1}]}
function memberSteps(){return [
  {t:"Welcome",b:"Here's a quick walk-through of your app. When a button lights up and says <b>Tap it</b>, tap it. When you finish, you're in."},
  {s:tab("today"),tap:1,opt:1,t:"Today",b:"Tap <b>Today</b>. It shows what's happening for you today."},
  {s:tab("me"),tap:1,opt:1,t:"My page",b:"Tap <b>My page</b>."},
  {s:"#main .card.hero",opt:1,t:"Your status",b:"Your status as your leader has it. It updates by itself. Something wrong? Tell your section leader."},
  {s:"#main .tgrid",opt:1,t:"Countdowns",b:"Days until your next duty, leave, due-outs and more."},
  {s:"#meIcs",opt:1,t:"Your calendar",b:"Puts your duty, appointments and events on your phone's calendar."},
  {s:"#v13Acct",opt:1,t:"Your account",b:"Change your password, choose whether the app asks for it each time it opens, or log out."},
  {s:tab("feed"),tap:1,opt:1,t:"Feed",b:"Tap <b>Feed</b>. Word from your leader shows up here. Tap <b>Got it</b> on each post so they know you saw it."},
  {s:tab("log"),tap:1,opt:1,t:"My log",b:"Tap <b>My log</b>. Write down what you did today. It stays on your phone."},
  {s:"#v13Hdr",opt:1,t:"Your account button",b:"This person button opens your account any time."},
  {t:"You're all set",b:"Replay this tour any time from <b>Tools → Take the tour</b>.",end:1}]}
function sectionSteps(){return [
  {t:"Welcome",b:"Here's how you run your section. When a button lights up and says <b>Tap it</b>, tap it. When you finish, you're in."},
  {s:"#main .card.hero",opt:1,t:"Your numbers",b:"Your section's count. Your leader sees it the moment you change anything."},
  {s:tab("people"),tap:1,opt:1,t:"People",b:"Tap <b>People</b>."},
  {s:"#main .pcard",opt:1,t:"Your people",b:"Open your section and tap a person's status to change it. It goes to your leader automatically."},
  {s:tab("plan"),tap:1,opt:1,t:"Plan",b:"Tap <b>Plan</b>. Add appointments, leave and duty for your people. They roll up to your leader's calendar."},
  {s:tab("feed"),tap:1,opt:1,t:"Feed",b:"Tap <b>Feed</b>. Post to your people and see who tapped Got it."},
  {s:tab("tools"),tap:1,opt:1,t:"Tools",b:"Tap <b>Tools</b>. Check-ins, reports and messages are here."},
  {s:"#v13Hdr",opt:1,t:"Your account",b:"Change your password or log out here."},
  {s:tab("home"),tap:1,opt:1,t:"Back home",b:"Tap <b>Home</b> to finish."},
  {t:"You're all set",b:"Replay this tour any time from <b>Tools → Take the tour</b>.",end:1}]}
function kindNow(){if(typeof memberMode==="function"&&memberMode())return "member";if(S.link&&!S.board&&S.source==="sample")return "section";return "leader"}

/* ---------- engine ---------- */
function ui(){let w=document.getElementById("tour");if(w)return w;w=document.createElement("div");w.id="tour";w.hidden=true;
  w.innerHTML=`<div class="tr-sh" data-p="t"></div><div class="tr-sh" data-p="b"></div><div class="tr-sh" data-p="l"></div><div class="tr-sh" data-p="r"></div><div class="tr-ring"></div>
    <div class="tr-card" role="dialog" aria-modal="true" aria-live="polite"><div class="tr-k"></div><h2 class="tr-t"></h2><div class="tr-b"></div>
    <div class="tr-act"><button class="btn alt" data-tr="back">Back</button><button class="btn" data-tr="next">Next</button></div><div class="tr-tap" hidden>👆 Tap the lit-up button</div>
    <button class="tr-x" data-tr="exit">Exit tour</button></div>`;document.body.appendChild(w);return w}
function find(sel){if(!sel)return null;for(const s of sel.split(/,\s*/)){const el=[...document.querySelectorAll(s)].find(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0});if(el)return el}return null}
function place(){if(!T.on)return;const w=ui(),el=T.el;const vw=innerWidth,vh=innerHeight,pad=6;let r=null;
  if(el&&el.isConnected){const b=el.getBoundingClientRect();r={x:Math.max(4,b.left-pad),y:Math.max(4,b.top-pad),w:Math.min(vw-8,b.width+pad*2),h:b.height+pad*2}}
  const sh=w.querySelectorAll(".tr-sh"),ring=w.querySelector(".tr-ring"),card=w.querySelector(".tr-card");
  if(!r){sh[0].style.cssText="left:0;top:0;width:100%;height:100%";[1,2,3].forEach(i=>sh[i].style.cssText="display:none");ring.style.display="none";
    card.style.top=Math.max(16,(vh-card.offsetHeight)/2)+"px";return}
  sh[0].style.cssText=`left:0;top:0;width:100%;height:${r.y}px`;sh[1].style.cssText=`left:0;top:${r.y+r.h}px;width:100%;bottom:0`;
  sh[2].style.cssText=`left:0;top:${r.y}px;width:${r.x}px;height:${r.h}px`;sh[3].style.cssText=`left:${r.x+r.w}px;top:${r.y}px;right:0;height:${r.h}px`;
  ring.style.cssText=`display:block;left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px`;
  const ch=card.offsetHeight,below=r.y+r.h+12,above=r.y-12-ch;card.style.top=(below+ch<vh-8?below:above>8?above:Math.max(8,vh-ch-8))+"px"}
function loop(){cancelAnimationFrame(T.raf);const f=()=>{place();if(T.on)T.raf=requestAnimationFrame(f)};T.raf=requestAnimationFrame(f)}
async function show(i){const w=ui();if(i<0)i=0;if(i>=T.steps.length){finish();return}T.i=i;const st=T.steps[i];
  if(st.go&&typeof view!=="undefined"&&view!==st.go&&!(typeof memberMode==="function"&&memberMode())){view=st.go;render();window.scrollTo(0,0)}
  let el=null;if(st.s){for(let k=0;k<12&&!el;k++){el=find(st.s);if(!el)await new Promise(r=>setTimeout(r,120))}
    if(!el&&st.opt){return show(i+(T.back?-1:1))}
    if(el){el.scrollIntoView({block:"center",behavior:"instant"});await new Promise(r=>setTimeout(r,60))}}
  T.back=false;T.el=el;const n=T.steps.length;
  w.querySelector(".tr-k").textContent=st.end?"Done":`Step ${i+1} of ${n}`;w.querySelector(".tr-t").textContent=st.t;
  w.querySelector(".tr-b").innerHTML=typeof st.b==="function"?st.b(el):st.b;
  const tapNow=!!(st.tap&&el);w.querySelector(".tr-tap").hidden=!tapNow;
  const nx=w.querySelector('[data-tr="next"]');nx.hidden=tapNow;nx.textContent=st.end?"Start using the app":i===0?"Let's go":"Next";
  w.querySelector('[data-tr="back"]').hidden=!i||!!st.end;w.querySelector('[data-tr="exit"]').hidden=!!st.end;
  w.classList.toggle("tr-tapping",tapNow);w.hidden=false;document.body.classList.add("tour-open");place();loop();
  setTimeout(()=>{const b=tapNow?el:nx;if(b&&b.focus)b.focus({preventScroll:true})},60)}
function start(kind){if(T.on)return;try{if(typeof closeSheet==="function")closeSheet()}catch(e){}const o=document.getElementById("onb");if(o&&!o.hidden){o.hidden=true;o.innerHTML="";document.body.classList.remove("onb-open")}
  T.kind=kind||kindNow();T.steps=T.kind==="member"?memberSteps():T.kind==="section"?sectionSteps():leaderSteps();T.on=true;T.back=false;show(0)}
function finish(){T.on=false;cancelAnimationFrame(T.raf);const w=ui();w.hidden=true;document.body.classList.remove("tour-open");S.onb=true;S.tour=Object.assign({},S.tour,{[T.kind]:Date.now()});save();
  if(typeof render==="function"){if(!(typeof memberMode==="function"&&memberMode())&&T.kind==="leader"){view="board"}render();window.scrollTo(0,0)}toast("You're in. The app is live.")}
window.startTour=start;

/* taps: inside the lit-up spot go through to the app; tap steps move on by themselves */
document.addEventListener("click",e=>{if(!T.on)return;const b=e.target.closest("[data-tr]");
  if(b){e.preventDefault();e.stopImmediatePropagation();const a=b.dataset.tr;if(a==="next")show(T.i+1);else if(a==="back"){T.back=true;let j=T.i-1;while(j>0&&T.steps[j].tap)j--;show(j)}else if(a==="exit"){if(T.armed){T.armed=0;finish()}else{T.armed=1;b.textContent="Tap again to leave the tour";setTimeout(()=>{T.armed=0;if(b.isConnected)b.textContent="Exit tour"},4000)}}return}
  const st=T.steps[T.i];if(!st)return;
  if(T.el&&T.el.contains(e.target)){if(st.tap)setTimeout(()=>show(T.i+1),450);else{e.preventDefault();e.stopImmediatePropagation()}return}
  if(!e.target.closest("#tour")){e.preventDefault();e.stopImmediatePropagation()}},true);
document.addEventListener("keydown",e=>{if(!T.on)return;if(e.key==="Escape"){e.preventDefault();e.stopImmediatePropagation()}},true);

/* when it runs */
if(typeof showOnb==="function"){const _so=showOnb;showOnb=function(i){if(!i&&!T.on){start("leader");return}return _so.apply(this,arguments)}}
/* after someone signs in: once the "set your own password" sheet is closed */
function afterSignIn(n){n=n||0;const sh=document.getElementById("sheet");if(sh&&!sh.hidden&&n<300){setTimeout(()=>afterSignIn(n+1),700);return}
  const k=kindNow();if(S.tour&&S.tour[k])return;setTimeout(()=>start(k),400)}
if(typeof window.lgAfterSignIn==="function"){const _a=window.lgAfterSignIn;window.lgAfterSignIn=function(n){const r=_a.apply(this,arguments);if(!n)setTimeout(()=>afterSignIn(0),1500);return r}}
/* Tools → Take the tour */
if(typeof renderTools==="function"){const _rt=renderTools;renderTools=function(){_rt.apply(this,arguments);const g=[...document.querySelectorAll("#main .tgrid")].pop();if(!g)return;
  g.insertAdjacentHTML("afterbegin",`<button id="trStart"><span class="ic">${svg("help")}</span><span><b>Take the tour</b><small>Walk through every part</small></span></button>`)}}
document.addEventListener("click",e=>{if(e.target.closest("#trStart")){e.stopImmediatePropagation();start(kindNow())}});
if(typeof HELP==="object"&&HELP.tools&&Array.isArray(HELP.tools[2]))HELP.tools[2].push("Take the tour walks you through every part of the app, one tap at a time.");
})();
