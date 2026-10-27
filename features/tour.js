/* Accounted For 1.4: guided tour. Lights up one part of the screen at a time, says what it is,
   and asks the person to tap it. Runs after a leader picks their version, after someone signs in,
   and any time from Tools → Take the tour. Replaces the old 3-card intro. */
(()=>{
const T={on:false,steps:[],i:0,el:null,raf:0,kind:""};
const lbl=el=>{const t=(el&&(el.querySelector("b")||el).innerText||"").replace(/\s+/g," ").trim();return t.length>40?t.slice(0,40)+"…":t};
const tab=k=>`#tabbar [data-tab="${k}"]`;

/* ---------- steps ---------- */
function leaderLib(){return [
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
  {s:'#main [data-go="checkins"]',opt:1,t:"Check-ins",b:"Your people check in from their phone. You get an alert, tap <b>Confirm</b> and their line on the roster updates with dates and location. <b>Not right</b> sends a note back. Everything in <b>Activity</b> has Confirm too."},
  {s:'#main [data-go="access"]',opt:1,t:"People with access",b:"Everyone who can open your team, on your roster or not: My pages, logins, invites and open links. Cut anyone off from here."},
  {s:'#main [data-go="support"]',opt:1,t:"Help & support",b:"Ask any question about the app and get an answer right away, or email a person."},
  {pre:tourPv,go:"mepv",s:"#main .card.hero",opt:1,t:"What your people see: My page",b:"This is an example My page, built from your roster. Each person gets a private link or login to their own page: their status, countdowns, duty, due-outs and calendar."},
  {pre:tourPv,go:"mepv",s:"#ckCard",opt:1,t:"Their Check in button",b:"They tap <b>Check in</b>, pick a status or <b>Other</b> and write it in. Anything but On Hand asks <b>From</b>, <b>To</b> and <b>Location</b>. It comes to you to confirm."},
  {pre:tourPv,go:"mepv",s:"#meUpd",opt:1,t:"Their updates",b:"When you change their status or answer a check-in, they get an alert here and tap <b>Confirm</b>."},
  {pre:tourPv,go:"mepv",s:'#main a[href="#start"]',opt:1,t:"Their own team",b:"Anyone can start their own team from here. Nothing connects back to you."},
  {go:"tools",s:"#main #v11Em, #main .tgrid",opt:1,t:"Everything else",b:"Messages, Pages, reports, PDF, call tree and more live here in Tools. Scroll down any time to explore."},
  {s:"#hHelp",t:"Help on every screen",b:"Confused anywhere? Tap <b>?</b>. It explains the screen you're on and can <b>walk you through it</b> step by step, or replay this whole tour."},
  {s:"#hSet",t:"Settings",b:"PIN lock, text size, your data and backups."},
  {s:tab("home"),tap:1,t:"Back home",b:"Tap <b>Home</b> to finish."},
  {t:"You're all set",b:"That's the whole app. Replay this tour any time from <b>Tools → Take the tour</b>.",end:1}]}
function memberLib(){return [
  {t:"Welcome",b:"Here's a quick walk-through of your app. When a button lights up and says <b>Tap it</b>, tap it. When you finish, you're in."},
  {s:tab("today"),tap:1,opt:1,t:"Today",b:"Tap <b>Today</b>. It shows what's happening for you today."},
  {s:tab("me"),tap:1,opt:1,t:"My page",b:"Tap <b>My page</b>."},
  {s:"#main .card.hero",opt:1,t:"Your status",b:"Your status as your leader has it. It updates by itself. Something wrong? Tell your section leader."},
  {s:"#meUpd",opt:1,t:"Updates",b:"When your leader changes your status or answers your check-in, it shows here. Tap <b>Confirm</b> so they know you saw it."},
  {s:"#ckCard",opt:1,t:"Check in",b:"Tap <b>Check in</b> to tell your leader where you are. Pick your status, or <b>Other</b> and write it in. Anything but On Hand asks <b>From</b>, <b>To</b> and <b>Location</b>. Your leader confirms it and you'll see <b>✓ Confirmed</b> here."},
  {s:"#main .tgrid",opt:1,t:"Countdowns",b:"Days until your next duty, leave, due-outs and more."},
  {s:"#meIcs",opt:1,t:"Your calendar",b:"Puts your duty, appointments and events on your phone's calendar."},
  {s:"#v13Acct",opt:1,t:"Your account",b:"Change your password, choose whether the app asks for it each time it opens, or log out."},
  {s:'#main a[href="#start"]',opt:1,t:"Start your own team",b:"Run a squad, crew, club or job of your own? Start your own team here. Nothing connects back to this one."},
  {s:'#main [data-go="support"]',opt:1,t:"Help & support",b:"Ask any question about the app and get an answer right away, or email a person."},
  {s:tab("feed"),tap:1,opt:1,t:"Feed",b:"Tap <b>Feed</b>. Word from your leader shows up here. Tap <b>Got it</b> on each post so they know you saw it."},
  {s:tab("log"),tap:1,opt:1,t:"My log",b:"Tap <b>My log</b>. Write down what you did today. It stays on your phone."},
  {s:"#v13Hdr",opt:1,t:"Your account button",b:"This person button opens your account any time."},
  {s:"#helpBtn",opt:1,t:"Stuck? Tap ?",b:"Tap <b>?</b> on any screen to have it walk you through that screen, or replay this tour."},
  {t:"You're all set",b:"Replay this tour any time from <b>Tools → Take the tour</b>.",end:1}]}
function sectionLib(){return [
  {t:"Welcome",b:"Here's how you run your section. When a button lights up and says <b>Tap it</b>, tap it. When you finish, you're in."},
  {s:"#main .card.hero",opt:1,t:"Your numbers",b:"Your section's count. Your leader sees it the moment you change anything."},
  {s:tab("people"),tap:1,opt:1,t:"People",b:"Tap <b>People</b>."},
  {s:"#main .pcard",opt:1,t:"Your people",b:"Open your section and tap a person's status to change it. Anything but On Hand asks <b>From</b>, <b>To</b> and <b>Location</b>. It goes to your leader automatically, and the section shows when it was last updated."},
  {s:tab("plan"),tap:1,opt:1,t:"Plan",b:"Tap <b>Plan</b>. Add appointments, leave and duty for your people. They roll up to your leader's calendar."},
  {s:tab("feed"),tap:1,opt:1,t:"Feed",b:"Tap <b>Feed</b>. Post to your people and see who tapped Got it."},
  {s:tab("tools"),tap:1,opt:1,t:"Tools",b:"Tap <b>Tools</b>. Check-ins, reports and messages are here."},
  {s:"#v13Hdr",opt:1,t:"Your account",b:"Change your password or log out here."},
  {s:"#helpBtn",opt:1,t:"Stuck? Tap ?",b:"Tap <b>?</b> on any screen to have it walk you through that screen, or replay this tour."},
  {s:tab("home"),tap:1,opt:1,t:"Back home",b:"Tap <b>Home</b> to finish."},
  {t:"You're all set",b:"Replay this tour any time from <b>Tools → Take the tour</b>.",end:1}]}

/* the full tour is short: 5 stops for leaders, 3 for members, 4 for section leaders. The long lists above feed "Walk me through this screen". */
function leaderSteps(){return [
  {t:"Welcome",b:"Five quick stops. Tap <b>Next</b>, or <b>Exit</b> any time.",go:"board"},
  {s:"#sgAdd, #main .card.hero",t:"Your headcount",b:"Who's here out of everyone. Start by adding your people: type names, paste a list, upload a file or send an invite."},
  {s:"#main .qa",t:"Quick actions",b:"Check people in, reach everyone, share your headcount and invite people. Emergency check-in is right below."},
  {s:tab("feed"),t:"Feed",b:"Post once. Everyone taps <b>Confirm I saw it</b>, so you see who hasn't."},
  {s:"#hHelp",t:"Help on every screen",b:"Tap <b>?</b> to walk through the screen you're on. Everything else is in <b>Tools</b>, in 12 groups.",end:1}]}
function memberSteps(){return [
  {s:tab("me"),opt:1,t:"My status",b:"Your status, your updates and the <b>Check in</b> button. Tap Confirm on updates so your leader knows you saw them."},
  {s:tab("feed"),opt:1,t:"Feed",b:"Word from your leader. Tap <b>Confirm I saw it</b> on each post."},
  {s:tab("mecal"),opt:1,t:"Calendar",b:"Your duty, appointments and plan of the day. Tap <b>?</b> on any screen for help.",end:1}]}
function sectionSteps(){return [
  {s:"#main .card.hero",opt:1,t:"Your section",b:"Your section's count. Your leader sees it the moment you change anything."},
  {s:tab("people"),opt:1,t:"People",b:"Open your section and tap a person's status to change it."},
  {s:tab("feed"),opt:1,t:"Feed",b:"Post to your people and see who confirmed."},
  {s:"#hHelp",opt:1,t:"Stuck? Tap ?",b:"Tap <b>?</b> on any screen to walk through it.",end:1}]}
function tourPv(){if(!window.setPv)return;const m=S.roster.find(x=>x.id===window.getPv())||S.roster.find(x=>x.sec!=="ATT")||S.roster[0];if(m)window.setPv(m.id)}
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
async function show(i){const w=ui();if(i<0)i=0;if(i>=T.steps.length){finish();return}T.i=i;const st=T.steps[i];if(st.pre)try{st.pre()}catch(e){}
  if(st.go&&typeof view!=="undefined"&&view!==st.go&&!(typeof memberMode==="function"&&memberMode())){view=st.go;render();window.scrollTo(0,0)}
  let el=null;if(st.s){for(let k=0;k<(st.opt&&!st.tap?3:12)&&!el;k++){el=find(st.s);if(!el)await new Promise(r=>setTimeout(r,120))}
    if(!el&&st.opt){return show(i+(T.back?-1:1))}
    if(el){el.scrollIntoView({block:"center",behavior:"instant"});await new Promise(r=>setTimeout(r,60))}}
  T.back=false;T.el=el;const n=T.steps.length;
  w.querySelector(".tr-k").textContent=st.end?"Done":`Step ${i+1} of ${n}`;w.querySelector(".tr-t").textContent=st.t;
  w.querySelector(".tr-b").innerHTML=typeof st.b==="function"?st.b(el):st.b;
  const tapNow=!!(st.tap&&el);w.querySelector(".tr-tap").hidden=!tapNow;
  const nx=w.querySelector('[data-tr="next"]');nx.hidden=tapNow;nx.textContent=st.end?(T.screen?"Got it":"Start using the app"):i===0&&!T.screen?"Let's go":"Next";
  w.querySelector('[data-tr="back"]').hidden=!i||!!st.end;w.querySelector('[data-tr="exit"]').hidden=!!st.end;
  w.classList.toggle("tr-tapping",tapNow);w.hidden=false;document.body.classList.add("tour-open");place();loop();
  setTimeout(()=>{const b=tapNow?el:nx;if(b&&b.focus)b.focus({preventScroll:true})},60)}
function start(kind,custom){if(T.on)return;try{if(typeof closeSheet==="function")closeSheet()}catch(e){}const o=document.getElementById("onb");if(o&&!o.hidden){o.hidden=true;o.innerHTML="";document.body.classList.remove("onb-open")}
  T.kind=kind||kindNow();T.screen=!!custom;T.steps=custom||(T.kind==="member"?memberSteps():T.kind==="section"?sectionSteps():leaderSteps());T.on=true;T.back=false;show(0)}
function finish(){T.on=false;cancelAnimationFrame(T.raf);const w=ui();w.hidden=true;document.body.classList.remove("tour-open");if(T.screen){T.screen=false;toast("Tap ? any time to see this again.");return}S.onb=true;S.tour=Object.assign({},S.tour,{[T.kind]:Date.now()});save();
  if(typeof render==="function"){if(!(typeof memberMode==="function"&&memberMode())&&T.kind==="leader"){view="board"}render();window.scrollTo(0,0)}toast("You're in. The app is live.")}
window.startTour=start;

/* ---------- "Walk me through this screen": the steps for wherever you are ---------- */
function screenSteps(){const v=typeof view==="string"?view:"board";const k=kindNow();
  const from=(list,titles)=>titles.map(t=>list.find(x=>x.t===t)).filter(Boolean).map(x=>Object.assign({},x,{tap:0,go:0}));
  const Ld=leaderLib(),Mb=memberLib();let st=[];
  if(k==="member"){st=v==="me"?from(Mb,["Updates","Your status","Check in","Countdowns","Your calendar","Your account","Start your own team","Help & support"]):v==="feed"?[{t:"Feed",b:"Word from your leader shows up here. Tap <b>Got it</b> on each post so they know you saw it."}]:v==="log"?[{t:"My log",b:"Write down what you did today. It stays on your phone."}]:[]}
  else if(v==="board"||v==="today")st=from(Ld,["Your app name","Your numbers","Sections","Quick actions","Emergency check-in","Help on every screen","Settings"]);
  else if(v==="text")st=from(Ld,["Your report"]);
  else if(v==="people"||v==="live"||v==="pt")st=from(Ld,["Sections and people","Load your roster","Live sections"]);
  else if(typeof secViews==="function"&&secViews().includes(v))st=[{s:"#main .card, #main .panel",opt:1,t:"Your section",b:"Everyone in this section. Tap a person's status to change it; the numbers at the top update right away."}];
  else if(v==="feed"||v==="send")st=from(Ld,["Pass the word"]);
  else if(["cal","duty","ready","events"].includes(v))st=from(Ld,["Plan tabs"]);
  else if(v==="tools")st=[{s:'#sgGrid [data-sgrp="checkin"]',opt:1,t:"Check-ins",b:"Check people in, and confirm check-ins people send from their phones."},
    {s:'#sgGrid [data-sgrp="people"]',opt:1,t:"People with access",b:"Invite people, give logins, and see everyone who can open your team."},
    {s:'#sgGrid [data-sgrp="reports"]',opt:1,t:"Reports",b:"Share your headcount, a PDF, an incident report or trends."},
    {s:'#sgGrid [data-sgrp="help"]',opt:1,t:"Help & support",b:"Ask any question about the app, read the guide or take the short tour."},
    {s:'#sgGrid [data-sgrp="settings"]',opt:1,t:"Settings",b:"Your data, app version, connections and system check."}];
  else if(v==="mepv")st=from(Ld,["What your people see: My page","Their Check in button","Their updates","Their own team"]).map(x=>Object.assign(x,{pre:0}));
  else if(v==="checkins")st=[{s:"#ckAuto",opt:1,t:"Auto-confirm",b:"Off: you confirm each check-in before it changes the roster. On: check-ins from people on your roster go straight on. Other always waits for you."},{s:"#main .alist .rrow",opt:1,t:"A check-in",b:"Who, their status, From, To, Location and their note. Pick who it is if it didn't match your roster, change the status if you need to, then tap <b>Confirm</b> or <b>Not right</b>."},{s:'#main [data-go="mepv"], #main .panel',opt:1,t:"Where it comes from",b:"Your people tap <b>Check in</b> on their My page or in the Feed."}];
  else if(v==="access")st=[{s:"#main .tgrid",opt:1,t:"The count",b:"How many people on your roster have access, how many aren't on your roster, and how many shared links are open."},{s:"#main .alist",opt:1,t:"Everyone, one list",b:"On your roster: My page links, logins and Feed. Not on your roster: logins, invites you sent and check-ins that didn't match. Open links: tap Manage to cut them off."}];
  else if(v==="act")st=[{s:"[data-actok]",opt:1,t:"Confirm",b:"Everything that happens on your team lands here. Tap <b>✓ Confirm</b> once you've seen it, or <b>Confirm all</b>."}];
  else if(v==="support")st=[{s:"#supQ",opt:1,t:"Ask",b:"Type any question about the app. The answer comes right away; check anything important."},{s:'#main a[href^="mailto:"]',opt:1,t:"A person",b:"Billing, account or a bug? Email a person."}];
  else if(v==="invite")st=[{s:"#invRole",opt:1,t:"Pick a role",b:"Member, section leader, viewer, editor and more. Roles you haven't set up yet are greyed out."},{s:"#invLink",opt:1,t:"Make a link",b:"Makes a private link that opens their page for that role. Their updates come to you."},{s:'[data-go="mepv"]',opt:1,t:"See an example",b:"Tap <b>See an example My page</b> to see exactly what a member gets: status, Check in, updates and calendar."},{s:".invsend",opt:1,t:"Send it anywhere",b:"Type any phone number or email and tap Text it or Email it. They don't have to be on your roster, and nothing is saved."},{s:"#main .panel:last-child",opt:1,t:"Their own team",b:"For another leader. This link sets up a brand-new team on their phone. Nothing connects back to you."}];
  else if(v==="logins")st=[{s:"#v13Grp",opt:1,t:"Logins for a group",b:"Pick a role, then ranks, sections or people, and make everyone's login at once."},{s:"#lgRole",opt:1,t:"One login",b:"Pick a role and who it's for. They get a username and password instead of a link."},{s:"#main .alist",opt:1,t:"Given out",b:"Everyone you've given a login to. Reset a password or remove a login here."}];
  if(!st.length){const H=typeof helpFor==="function"?helpFor(v):null;st=[{t:H?H[0]:"This screen",b:H?esc(H[1])+(H[2]&&H[2].length?"<ul style=\"margin:6px 0 0;padding-left:18px\">"+H[2].map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>":""):"Tap around. Nothing changes until you save."}]}
  st.push({t:"That's this screen",b:"Still stuck? Take the full tour, or tap <b>?</b> on any screen to walk through it again.",end:1});return st}
window.startScreenTour=()=>start(kindNow(),screenSteps());

/* taps: inside the lit-up spot go through to the app; tap steps move on by themselves */
document.addEventListener("click",e=>{if(!T.on)return;const b=e.target.closest("[data-tr]");
  if(b){e.preventDefault();e.stopImmediatePropagation();const a=b.dataset.tr;if(a==="next")show(T.i+1);else if(a==="back"){T.back=true;let j=T.i-1;while(j>0&&T.steps[j].tap)j--;show(j)}else if(a==="exit"){finish()}return}
  const st=T.steps[T.i];if(!st)return;
  if(T.el&&T.el.contains(e.target)){if(st.tap)setTimeout(()=>show(T.i+1),450);else{e.preventDefault();e.stopImmediatePropagation()}return}
  if(!e.target.closest("#tour")){e.preventDefault();e.stopImmediatePropagation()}},true);
document.addEventListener("keydown",e=>{if(!T.on)return;if(e.key==="Escape"){e.preventDefault();e.stopImmediatePropagation()}},true);

/* when it runs */
if(typeof showOnb==="function"){const _so=showOnb;showOnb=function(i){if(!i&&!T.on){start(S.onb?kindNow():"leader");return}return _so.apply(this,arguments)}}
/* after someone signs in: once the "set your own password" sheet is closed */
function afterSignIn(n){n=n||0;const sh=document.getElementById("sheet");if(sh&&!sh.hidden&&n<300){setTimeout(()=>afterSignIn(n+1),700);return}
  const k=kindNow();if(S.tour&&S.tour[k])return;setTimeout(()=>start(k),400)}
if(typeof window.lgAfterSignIn==="function"){const _a=window.lgAfterSignIn;window.lgAfterSignIn=function(n){const r=_a.apply(this,arguments);if(!n)setTimeout(()=>afterSignIn(0),1500);return r}}
/* the ? help sheet on every screen: walk through this screen, or the full tour */
if(typeof openHelp==="function"){const _oh=openHelp;openHelp=function(){_oh.apply(this,arguments);const b=document.querySelector('#sheetOpts [data-onb="how"]');if(!b)return;
  b.insertAdjacentHTML("beforebegin",`<button class="btn" data-trscreen="1">👆 Walk me through this screen</button><button class="btn alt" data-trfull="1">Take the full tour</button>`);b.remove()}}
document.addEventListener("click",e=>{if(e.target.closest("[data-trscreen]")){e.stopImmediatePropagation();try{closeSheet()}catch(err){}setTimeout(()=>start(kindNow(),screenSteps()),350);return}
  if(e.target.closest("[data-trfull]")){e.stopImmediatePropagation();try{closeSheet()}catch(err){}setTimeout(()=>start(kindNow()),350)}},true);
/* Tools → Take the tour */
if(typeof renderTools==="function"){const _rt=renderTools;renderTools=function(){_rt.apply(this,arguments);const g=[...document.querySelectorAll("#main .tgrid")].pop();if(!g)return;
  g.insertAdjacentHTML("afterbegin",`<button id="trStart"><span class="ic">${svg("help")}</span><span><b>Take the tour</b><small>5 quick stops</small></span></button>`)}}
document.addEventListener("click",e=>{if(e.target.closest("#trStart")){e.stopImmediatePropagation();start(kindNow())}});
if(typeof HELP==="object"&&HELP.tools&&Array.isArray(HELP.tools[2]))HELP.tools[2].push("Take the tour walks you through every part of the app, one tap at a time.");
})();
