/* Accounted For: nobody shows up twice.
   The same person could land on the roster under two different ids: one phone typed them in, another phone
   pulled them from a link or a file, a self check-in added them before the leader's copy arrived, or a sync put
   back a copy the other phone had replaced. Every merge keyed on id, so two ids meant two rows.
   Now every save and every sync folds people with the same rank and name (or the same server uid) into one row:
   the richer copy stays (the one that is "me", has a My page, a phone, a status, dates), the other's missing
   details, calendar dates and notes move onto it, anything that pointed at the dropped id (6Ws, requests,
   history, who I am) points at the kept one, and the dropped id goes on the deleted list so the other phones
   drop it too instead of syncing it back. */
(()=>{
/* "BUCK, AARON" and "BUCK, AARON D." are the same Sergeant: the key is rank + last name + first name (suffixes like JR
   dropped). Two people whose middle initials both exist and differ (AARON D. vs AARON J.) are not folded. */
const parts=n=>{let s=String(n||"").toUpperCase().replace(/[^A-Z0-9,\s]/g," ").replace(/\s+/g," ").trim();let last,rest;
  if(s.includes(",")){const i=s.indexOf(",");last=s.slice(0,i).trim();rest=s.slice(i+1).trim()}else{const w=s.split(" ");last=w[w.length-1]||"";rest=w.slice(0,-1).join(" ")}
  last=last.replace(/\b(JR|SR|II|III|IV)\b/g,"").replace(/\s+/g,"");const rw=rest.split(" ").filter(Boolean);return {last,first:rw[0]||"",mid:rw.slice(1).join(" ")}};
const key=m=>{const p=parts(m.name);return String(m.rank||"").toUpperCase().replace(/[^A-Z0-9]/g,"")+"|"+p.last+"|"+p.first};
const samePerson=(a,b)=>{const pa=parts(a.name),pb=parts(b.name);return !(pa.mid&&pb.mid&&!pa.mid.startsWith(pb.mid)&&!pb.mid.startsWith(pa.mid))};
/* Two rows with different personal details are two people, even with the same rank and name (two SGT Garcia, Jose; two
   students named Maria Garcia on a class list): different server ids, My page links or phone numbers keep them apart. */
const digits=v=>String(v||"").replace(/\D/g,"").slice(-10);
const apart=(a,b)=>{if(a.uid&&b.uid&&String(a.uid)!==String(b.uid))return true;if(a.pk&&b.pk&&a.pk!==b.pk)return true;const x=digits(a.phone),y=digits(b.phone);return x.length>=7&&y.length>=7&&x!==y};
window.sameNameLoose=(a,b)=>key(a)===key(b)&&samePerson(a,b)&&!apart(a,b);
const score=m=>{let s=0;if(m.detail==="Added in app")s-=3;if(parts(m.name).mid)s+=1;if(S.who&&S.who.id&&(m.id===S.who.id||m.uid===S.who.id))s+=100;if(m.pk)s+=16;if(m.uid)s+=8;if(m.phone)s+=4;
  if(m.status&&m.status!=="On Hand")s+=2;if(m.duty&&m.duty!=="Full Duty")s+=1;s+=Math.min(3,(m.cal||[]).length)+Math.min(2,(m.notes||[]).length);
  for(const k of ["loc","detail","start","end","due","wpn","edd","sub"])if(m[k])s+=0.5;return s};
function fold(keep,dup){if(String(dup.name||"").length>String(keep.name||"").length&&parts(dup.name).mid&&!parts(keep.name).mid)keep.name=dup.name;for(const k of Object.keys(dup)){if(k==="id")continue;const v=dup[k];if(v==null||v==="")continue;
    if(Array.isArray(v)){if(!Array.isArray(keep[k]))keep[k]=[];const have=new Set(keep[k].map(x=>JSON.stringify(x)));for(const x of v)if(!have.has(JSON.stringify(x))){keep[k].push(x);have.add(JSON.stringify(x))}}
    else if(keep[k]==null||keep[k]===""||(k==="status"&&keep[k]==="On Hand"&&v!=="On Hand"))keep[k]=v}}
function remap(from,to){const mv=e=>{if(e&&e.mid===from)e.mid=to};(S.w6||[]).forEach(mv);(S.reqs||[]).forEach(mv);(S.chg||[]).forEach(mv);
  if(S.who&&S.who.id===from)S.who.id=to}
/* fold doubles into one person each; returns how many rows went */
function dedupe(){if(!Array.isArray(S.roster)||S.roster.length<2||S.source==="sample")return 0;
  const byK=new Map(),byU=new Map();let n=0;const out=[];
  for(const m of S.roster){if(!m||typeof m!=="object"){continue}const k=key(m);const named=!!k.split("|")[1];
    let hit=(m.uid&&byU.get(String(m.uid)))||(named&&byK.get(k))||null;
    if(hit&&!(m.uid&&hit.uid===m.uid)&&(!samePerson(hit,m)||apart(hit,m)))hit=null;
    if(!hit){out.push(m);if(named&&!byK.has(k))byK.set(k,m);if(m.uid)byU.set(String(m.uid),m);continue}
    let keep=hit,dup=m;const a=score(hit),b=score(m);if(b>a||(b===a&&String(m.id)<String(hit.id))){keep=m;dup=hit;out[out.indexOf(hit)]=m;if(named)byK.set(k,m);if(hit.uid)byU.set(String(hit.uid),m)}
    fold(keep,dup);if(keep.uid)byU.set(String(keep.uid),keep);remap(dup.id,keep.id);if(typeof kdDelete==="function")kdDelete(dup.id);n++}
  if(n){S.roster=out;try{if(typeof actAdd==="function")actAdd("✓",n+(n>1?" duplicate rows":" duplicate row")+" merged — same person was on the roster twice","people")}catch(e){}}
  return n}
window.rosterDedupe=dedupe;
/* every save and every sync */
{const _save=save;save=function(){try{dedupe()}catch(e){}return _save.apply(this,arguments)}}
{const _mr=mergeRemote;mergeRemote=function(){const r=_mr.apply(this,arguments);try{if(dedupe())S.rids=S.roster.map(m=>m.id)}catch(e){}return r}}
/* once on open, for rosters that already have doubles */
try{if(dedupe())rawSave()}catch(e){}
})();
