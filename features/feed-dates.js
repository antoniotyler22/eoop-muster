/* Accounted For 4.21: dates in the Feed are tappable.
   Any date written in a post — "15 NOV", "NOV 15", "11/15", "2026-11-15", "Friday", "tomorrow" — and every line of a Plan of the Day
   schedule becomes a button. Tapping it opens the calendar with everything filled in: date, time, what (the line it was in),
   type (appointment, leave, training, event) and a note saying which post it came from. The leader checks it and taps Add.
   Members get the same entry as a phone-calendar file instead. */
(()=>{
const MONS="jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec";
const DAYS="sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat";
const monN=s=>{const i=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(s.slice(0,3).toLowerCase());return i<0?null:i};
const dowN=s=>["sun","mon","tue","wed","thu","fri","sat"].indexOf(s.slice(0,3).toLowerCase());
const pad=n=>String(n).padStart(2,"0");
const iso=(y,m,d)=>{const dt=new Date(y,m,d);if(dt.getMonth()!==m||dt.getDate()!==d)return null;return dkey(dt)};
const yearFor=(m,d,at)=>{const base=new Date(at||Date.now());let y=base.getFullYear();const dt=new Date(y,m,d);if(dt<new Date(base.getTime()-45*86400000))y++;return y};
const fullYear=v=>{if(!v)return null;const n=+v;return n<100?2000+n:n};
/* one combined pattern; each alternative sets different groups */
const RX=new RegExp(
  "\\b(20\\d{2})-(\\d{2})-(\\d{2})\\b"+                                                          // 1-3 ISO
  "|\\b(\\d{1,2})/(\\d{1,2})(?:/(20\\d{2}|\\d{2})(?!\\d))?\\b"+                                 // 4-6 M/D(/Y)
  "|\\b(\\d{1,2})\\s*(?:st|nd|rd|th)?\\s+("+MONS+")[a-z]*\\.?(?:\\s+(20\\d{2}|\\d{2})(?!\\d))?\\b"+ // 7-9 D MON (Y)
  "|\\b("+MONS+")[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(20\\d{2}|\\d{2})(?!\\d))?\\b"+   // 10-12 MON D (Y)
  "|\\b("+DAYS+")(?:[a-z]*day|[a-z]*)\\b"+                                                     // 13 weekday
  "|\\b(today|tonight|tomorrow)\\b","gi");                                                     // 14 relative
const TM=/\b(?:([01]\d|2[0-3])([0-5]\d)(?![\d:])|(\d{1,2}):([0-5]\d)\s*(am|pm)?|(\d{1,2})\s*(am|pm))\b/i;
function timeIn(line){const m=line.match(TM);if(!m)return "";let h,mi=0;
  if(m[1]){h=+m[1];mi=+m[2]}else if(m[3]){h=+m[3];mi=+m[4];if(m[5]){const p=m[5].toLowerCase();if(p==="pm"&&h<12)h+=12;if(p==="am"&&h===12)h=0}}else{h=+m[6];const p=m[7].toLowerCase();if(p==="pm"&&h<12)h+=12;if(p==="am"&&h===12)h=0}
  if(h>23)return "";return pad(h)+":"+pad(mi)}
/* returns [{s,e,d}] — start, end and the ISO date for every date found in txt; at = when the post was written */
function find(txt,at){const out=[];txt=String(txt||"");RX.lastIndex=0;let m;const base=new Date(at||Date.now());
  while((m=RX.exec(txt))){let d=null;
    if(m[1])d=iso(+m[1],+m[2]-1,+m[3]);
    else if(m[4]){const mo=+m[4]-1,da=+m[5];if(mo>=0&&mo<12)d=iso(fullYear(m[6])||yearFor(mo,da,at),mo,da)}
    else if(m[7]){const mo=monN(m[8]),da=+m[7];if(mo!=null)d=iso(fullYear(m[9])||yearFor(mo,da,at),mo,da)}
    else if(m[10]){const mo=monN(m[10]),da=+m[11];if(mo!=null)d=iso(fullYear(m[12])||yearFor(mo,da,at),mo,da)}
    else if(m[13]){const want=dowN(m[13]);const dt=new Date(base.getFullYear(),base.getMonth(),base.getDate());let k=(want-dt.getDay()+7)%7;dt.setDate(dt.getDate()+k);d=dkey(dt)}
    else if(m[14]){const dt=new Date(base.getFullYear(),base.getMonth(),base.getDate());if(/tomorrow/i.test(m[14]))dt.setDate(dt.getDate()+1);d=dkey(dt)}
    if(d)out.push({s:m.index,e:m.index+m[0].length,d})}
  return out}
window.fdDatesIn=find;
const lineAt=(txt,i)=>{const a=txt.lastIndexOf("\n",i-1)+1;let b=txt.indexOf("\n",i);if(b<0)b=txt.length;return txt.slice(a,b)};
function guessType(line){const l=line.toLowerCase();if(/\bleave\b|liberty|\bpto\b/.test(l))return "LEAVE";if(/\btad\b|travel|flight|\btdy\b/.test(l))return "TAD";if(/range|training|\btrng\b|class|course|school|\bpt\b|drill/.test(l))return "TRNG";if(/duty\b/.test(l))return "DUTY";if(/appt|appointment|dental|medical|\bbas\b|clinic|doctor|interview/.test(l))return "APPT";return "EVENT"}
function what(line,hit){let t=line.slice(0,hit.s)+line.slice(hit.e);t=t.replace(TM,"").replace(/\s{2,}/g," ").replace(/\b(at|on|@)\s+(?=(at|on|for|by|from|with|in)\b)/gi,"").replace(/^[\s\-–:·,.@]+|[\s\-–:·,.@]+$/g,"").replace(/\s+(on|at|for|by|from|until|till|thru|through)$/i,"").trim();return t.slice(0,60)}
const btn=(d,tm,ti,ty,label)=>`<button type="button" class="fdt" data-fdt="${esc(d)}" data-fdtm="${esc(tm)}" data-fdti="${esc(ti)}" data-fdty="${esc(ty)}" title="Put this on the calendar">📅 ${label}</button>`;

/* ---------- draw: wrap the dates in each post ---------- */
function markBody(p){const txt=String(p.txt||"");const hits=find(txt,p.t);if(!hits.length)return null;let h="",i=0;
  for(const x of hits){const line=lineAt(txt,x.s);const off=txt.lastIndexOf("\n",x.s-1)+1;const lh={s:x.s-off,e:x.e-off};const tm=timeIn(line);
    h+=esc(txt.slice(i,x.s))+btn(x.d,tm,what(line,lh),guessType(line),esc(txt.slice(x.s,x.e)));i=x.e}
  return h+esc(txt.slice(i))}
if(typeof fdCard==="function"){const _fc=fdCard;fdCard=function(f,p){let h=_fc.apply(this,arguments);try{
    if(!p.pod){const b=markBody(p);if(b!=null)h=h.replace(/<div class="bd">[\s\S]*?<\/div>/,()=>`<div class="bd" data-fdpost="${esc(p.id)}">${b}</div>`)}
    else{const d=p.pod&&p.pod.d?dkey(parseD(p.pod.d)||new Date()):"";if(d){let n=0;
      h=h.replace(/<div class="fcsch">([\s\S]*?)<\/div>/,(all,inner)=>`<div class="fcsch">`+inner.replace(/<b>([^<]*)<\/b><span>([^<]*)<\/span>/g,(m0,t,x)=>{n++;const tm=timeIn(t)||"";return btn(d,tm,String(x).replace(/&[a-z]+;/g," ").slice(0,60),guessType(x),esc(t)||"·")+`<span>${x}</span>`})+`</div>`);
      h=h.replace(/<span class="ttl">([^<]*)<\/span>/,(m0,t)=>`<span class="ttl">${t} ${btn(d,"",String(t).replace(/&[a-z]+;/g," ")+" plan","EVENT","add")}</span>`)}}
  }catch(e){}return h}}
document.head.insertAdjacentHTML("beforeend",`<style>.fdt{display:inline;padding:0 4px;margin:0;border:0;border-radius:6px;background:color-mix(in srgb,var(--brass) 18%,transparent);color:inherit;font:inherit;font-weight:700;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:2px;cursor:pointer;white-space:nowrap}.fdt:active{background:color-mix(in srgb,var(--brass) 35%,transparent)}.fcsch .fdt{justify-self:start}</style>`);

/* ---------- tap: open the calendar with it filled in ---------- */
function leader(){const f=typeof fdCur==="function"?fdCur():null;return !!(f&&f.lk)||(typeof isOwner==="function"&&isOwner()&&S.role!=="view")}
function who(p){if(!p||!p.to||p.to.k==="all")return "EVERYONE";if(p.to.k==="one"&&p.to.mid)return String(p.to.mid);if(p.to.k==="secs"&&Array.isArray(p.to.secs)&&p.to.secs.length===1)return "SEC:"+p.to.secs[0];return "EVERYONE"}
function post(el){const b=el.closest("[data-fdpost]");const f=typeof fdCur==="function"?fdCur():null;if(!b||!f)return null;return (f.posts||[]).find(p=>String(p.id)===b.dataset.fdpost)||null}
function fill(d,tm,ti,ty,note,whoV){const set=(id,v)=>{const el=document.getElementById(id);if(el&&v!=null)el.value=v};
  set("caD",d);set("caT",tm);set("caTi",ti);set("caNo",note);const ty0=document.getElementById("caTy");if(ty0&&[...ty0.options].some(o=>o.value===ty))ty0.value=ty;
  const w=document.getElementById("caWho");if(w&&whoV&&[...w.options].some(o=>o.value===whoV))w.value=whoV;
  const pnl=document.getElementById("caSave");if(pnl)try{pnl.closest(".panel").scrollIntoView({behavior:"smooth",block:"center"})}catch(e){}const ti0=document.getElementById("caTi");if(ti0&&!ti0.value)ti0.focus()}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-fdt]");if(!t)return;e.preventDefault();e.stopImmediatePropagation();
  const d=t.dataset.fdt,tm=t.dataset.fdtm||"",ti=t.dataset.fdti||"From the Feed",ty=t.dataset.fdty||"EVENT";const p=post(t);const f=typeof fdCur==="function"?fdCur():null;
  const note=("Feed · "+(p&&p.by?p.by:(f&&f.unit)||"")+(p?" · posted "+short(new Date(p.t)):"")).slice(0,80);
  if(leader()&&typeof renderCal==="function"){calDay=d;calAdd=true;calFor=null;view="cal";render();window.scrollTo(0,0);
    setTimeout(()=>{fill(d,tm,ti,ty,note,who(p));toast("Filled in from the Feed · check it, then tap Add")},60);return}
  if(typeof icsFor==="function"&&typeof shareFile==="function"){shareFile(icsFor([{d,tm,ti:ti||"From the Feed",no:note}],true),(ti||"event").replace(/[^\w]+/g,"-").slice(0,30)+".ics","text/calendar");toast("Sent to your phone's calendar")}
},true);
if(typeof HELP==="object"&&HELP.feed&&Array.isArray(HELP.feed[2]))HELP.feed[2].push("Dates in a post and every line of a Plan of the Day are tappable: tap one and the calendar opens with the date, time, what and who already filled in. Check it and tap Add.");
})();
