/* Accounted For 4.78.0: everyone can write on the Word of Mouth (the old Feed).
   Anyone who joined with a link (members, visitors, any role without leader rights) gets a box at the top of the screen:
   type, tap Post, and it goes to everyone. Posts are encrypted on the phone like leaders' posts and are tagged as a member
   post (mb), so the OIC sees who wrote it, can Confirm it, report or remove it like any other post.
   Needs supabase/setup/41_member_posts.sql (a member key may post, 30 per 5 minutes). Without it the box tells the person
   posting isn't switched on yet. Leaders keep their full post form (urgent, send to sections, polls, Plan of the Day). */
(()=>{
const memberFeed=f=>!!(f&&!f.lk&&!f.pk&&f.mk&&f.ek);
const nameFor=f=>String((f&&f.me)||(S.who&&S.who.n)||S.postAs||S.myName||"").toUpperCase().trim().slice(0,30);
let draft="";
function box(f){return `<div class="panel" id="fdMBox"><div class="fch">${typeof fdAv==="function"?fdAv(nameFor(f)||"?"):""}<div class="hd"><div class="nm">${esc(nameFor(f)||"Add your rank and name")}</div></div></div>
  <label for="fdMTxt">Write something</label><textarea id="fdMTxt" maxlength="1500" style="min-height:70px" placeholder="Write to everyone…">${esc(draft)}</textarea>
  <button class="btn" id="fdMPost">Post</button></div>`}
{const _rf=renderFeed;renderFeed=function(){const r=_rf.apply(this,arguments);
  try{const f=fdCur();const main=$("#main");if(!main||!memberFeed(f)||S.role==="view"||main.querySelector("#fdMBox"))return r;
    const head=main.querySelector(".sechead");const h=box(f);
    if(head)head.insertAdjacentHTML("afterend",h);else main.insertAdjacentHTML("afterbegin",h);
    if(window.afTos&&!afTos.ok()){const b=$("#fdMPost");if(b)b.insertAdjacentHTML("beforebegin",afTos.line())}
  }catch(e){}return r}}
document.addEventListener("input",e=>{if(e.target&&e.target.id==="fdMTxt")draft=e.target.value},true);
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("#fdMPost");if(!b)return;e.stopImmediatePropagation();e.preventDefault();
  const f=fdCur();if(!memberFeed(f))return;const txt=(($("#fdMTxt")||{}).value||"").trim();
  if(!txt){toast("Type something first.");return}
  const by=nameFor(f);if(!by){toast("Add your rank and last name first.");return}
  b.disabled=true;b.textContent="Posting…";
  fdEnc(f.ek,{t:txt,u:false,to:{k:"all"},sa:[],by,mb:1}).then(ct=>SB.rpc("feed_post_member",{p_feed:f.id,p_member_key:f.mk,p_ct:ct})).then(id=>{
    f.posts=[{id:+id,t:Date.now(),txt,urg:false,to:{k:"all"},by,mb:1}].concat(f.posts||[]);draft="";save();renderFeed();window.scrollTo(0,0);toast("Posted")})
  .catch(err=>{b.disabled=false;b.textContent="Post";const m=String(err&&err.message||err);toast(/could not find|schema|404/i.test(m)?"Posting isn't switched on yet. Your OIC needs to run setup part 41.":"Couldn't post: "+m.slice(0,80))})},true);
})();
