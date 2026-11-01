/* Accounted For 4.68.0 — Signals: the small live things a Feed shares (reactions, "seen by", live location, online
   and recording). One row per person per kind on the server (an upsert), encrypted on the phone with the Feed key,
   so the server sees only the kind, a hashed id and the time. Other features use window.AFS:
     AFS.put(f,kind,ident,obj)   save my row (kind: rx, seen, loc, live)
     AFS.all(f,kind)             every row of that kind -> [{o,t}]
     AFS.onChange(fn)            called (debounced) when other phones' rows change
   Needs supabase/setup/39_signals.sql (and 38). If the server part isn't there, everything quietly does nothing. */
(()=>{
const ST={};const subs=[];
const st=f=>ST[f.id]=ST[f.id]||{since:"1970-01-01T00:00:00Z",rows:new Map(),busy:false,watch:false,bad:0};
const me=f=>String(typeof fdBy==="function"?fdBy(f):(S.myName||"ME")).toUpperCase().slice(0,30);
const feed=()=>(typeof fdCur==="function"&&fdCur())||(S.feeds||[])[0]||null;
let tm=0;const fire=()=>{clearTimeout(tm);tm=setTimeout(()=>{for(const fn of subs){try{fn()}catch(e){}}},250)};
const A=window.AFS={me,
  onChange:fn=>{subs.push(fn)},
  all:(f,k)=>{const out=[];for(const [key,v] of st(f).rows)if(v.k===k)out.push(v);return out},
  async put(f,k,ident,o){if(!f||!f.mk||!f.ek)return false;const s=st(f);if(s.bad>=3)return false;
    try{const h=await SB.h(f.id,k+":"+ident);const ct=await fdEnc(f.ek,o);
      await SB.rpc("signal_put",{p_feed:f.id,p_key:f.mk,p_k:k,p_ident:h,p_ct:ct});
      s.rows.set(k+"|"+h,{k,o,t:Date.now(),h});s.bad=0;
      try{if(SB.topic&&SB.pingTopic)SB.topic("p_sig",f.id).then(t=>SB.pingTopic(t,"p_sig")).catch(()=>{})}catch(e){}
      return true}catch(e){if(/signal_put|not allowed|404|PGRST/i.test(String(e&&e.message||e)))s.bad++;return false}},
  async poll(f){f=f||feed();if(!f||!f.mk||!f.ek)return;const s=st(f);if(s.busy||s.bad>=3)return;s.busy=true;let changed=false;
    try{const rows=await SB.rpc("signal_get",{p_feed:f.id,p_key:f.mk,p_since:s.since});
      for(const r of (rows||[])){if(r.updated_at>s.since)s.since=r.updated_at;const o=await fdDec(f.ek,r.ct);if(!o)continue;
        const key=r.k+"|"+r.ident,t=Date.parse(r.updated_at)||Date.now(),cur=s.rows.get(key);
        if(cur&&cur.t>t&&cur.local)continue;s.rows.set(key,{k:r.k,o,t,h:r.ident});changed=true}
      s.bad=0}catch(e){if(/signal_get|404|PGRST/i.test(String(e&&e.message||e)))s.bad++}
    finally{s.busy=false}
    if(changed)fire()},
  watch(f){f=f||feed();if(!f)return;const s=st(f);if(s.watch||!window.LIVE||!LIVE.watchTopic||!SB.topic)return;s.watch=true;
    SB.topic("p_sig",f.id).then(t=>LIVE.watchTopic(t,"p_sig",()=>A.poll(f))).catch(()=>{s.watch=false})}};
setInterval(()=>{if(document.hidden)return;const f=feed();if(!f)return;A.watch(f);A.poll(f)},5000);
setTimeout(()=>{const f=feed();if(f){A.watch(f);A.poll(f)}},3000);
if(typeof SC==="object"&&Array.isArray(SC))SC.push({k:"sg",n:"4.68: reactions, seen-by, live location, online status",f:["39_signals"],t:[["signals_ok",{}]]});
})();
