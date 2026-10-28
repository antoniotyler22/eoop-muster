/* Accounted For 1.3 — Import people from any spreadsheet.
   The original importer needs a Marine Corps MOL list (header row starting with "Rank"). This adds a fallback that
   reads ordinary rosters from Excel/CSV/Google Sheets exports: it finds the header row and the columns for name
   (or first + last), rank/title/role, section/team/department/shift, phone and alt phone, and status.
   Unknown teams become new sections when there's room. Used by "Load roster" and "Add more from a file". */
(()=>{
const H={
  name:/^(full ?name|name|member|employee|person|marine|officer|volunteer|student|participant|athlete|worker)$/i,
  first:/^(first|first ?name|given ?name|fname)$/i,
  last:/^(last|last ?name|surname|family ?name|lname)$/i,
  rank:/^(rank|grade|title|job ?title|position|role|rate)$/i,
  sec:/^(section|team|dept|department|shift|squad|platoon|group|unit|crew|division|class|site|location ?group)$/i,
  phone:/^(phone|cell|mobile|cell ?phone|mobile ?phone|phone ?number|telephone|tel|primary ?phone|contact ?number)$/i,
  phone2:/^(alt(ernate)? ?phone|phone ?2|second(ary)? ?phone|home ?phone|work ?phone|other ?phone)$/i,
  status:/^(status|duty ?status)$/i,
  fam:/^(parent|guardian|family|mom|dad|mother|father)( ?\/ ?(guardian|parent))?( ?[12])?( ?(phone|cell|mobile|number|contact( ?number)?))?$/i,
};
const norm=s=>String(s||"").replace(/[_*#:]+/g," ").replace(/\s+/g," ").trim();
const BAD=/edipi|dod ?id|ssn|social|dob|birth|sex|gender|race|religion|blood|nok|next of kin|emerg|spouse|salary|pay|address|zip/i;

/** Finds a roster in rows of cells. Returns {roster, newSecs} or throws with a plain-English reason. */
function flexParse(rows){
  let hi=-1,col={};
  for(let i=0;i<Math.min(rows.length,15);i++){const c={};rows[i].forEach((x,j)=>{const h=norm(x);if(!h||BAD.test(h))return;for(const k of Object.keys(H))if(c[k]===undefined&&H[k].test(h)){c[k]=j;break}});
    if(c.name!==undefined||(c.first!==undefined&&c.last!==undefined)||(c.last!==undefined)){hi=i;col=c;break}}
  if(hi<0)throw new Error("Couldn't find a header row with a Name column (or First and Last). Add one and try again.");
  const ranks=(MODE().ranks||[]).map(r=>r.toUpperCase());const rdef=(MODE().rankDef||ranks[ranks.length-1]||"").toUpperCase();
  const toRank=v=>{const U=norm(v).toUpperCase();if(!U)return rdef;if(ranks.includes(U))return U;const hit=ranks.find(r=>U.startsWith(r)||r.startsWith(U));return hit||(U.length<=7?U.replace(/[^A-Z0-9 -]/g,""):rdef)};
  const secOf=new Map(),newSecs=[];
  const findSec=v=>{const raw=norm(v);if(!raw)return SECTIONS[0][0];const U=raw.toUpperCase();if(secOf.has(U))return secOf.get(U);
    let hit=SECTIONS.find(([k,n])=>k.toUpperCase()===U||String(n).toUpperCase()===U);
    if(!hit){let k=U.replace(/[^A-Z0-9]/g,"").slice(0,4)||"SEC";let i=2;const taken=c=>SECTIONS.some(s=>s[0]===c)||newSecs.some(s=>s[0]===c)||(typeof RESERVED!=="undefined"&&RESERVED.includes(c));
      while(taken(k))k=k.slice(0,3)+(i++);hit=[k,raw.slice(0,30)];newSecs.push(hit)}
    secOf.set(U,hit[0]);return hit[0]};
  const out=[];let n=0;
  for(const r of rows.slice(hi+1)){const g=k=>col[k]!==undefined?norm(r[col[k]]):"";
    let name=g("name");if(!name){const f=g("first"),l=g("last");name=l&&f?l+", "+f:(l||f)}
    if(!name||/^(total|count|sum)\b/i.test(name))continue;
    const st=g("status");
    out.push({id:"f"+(++n),rank:toRank(g("rank")),name:name.toUpperCase().slice(0,48),sec:findSec(g("sec")),
      status:st&&typeof mapStatus==="function"?mapStatus(st):"On Hand",detail:st&&!STATUSES.includes(st)?st.slice(0,40):"",loc:"",start:"",end:"",
      phone:normPh(g("phone"))||undefined,phone2:normPh(g("phone2"))||normPh(g("fam"))||undefined})}
  if(!out.length)throw new Error("Found the header row but no people under it.");
  return {roster:out,own:false,newSecs,cols:Object.keys(col)};
}
window.flexParse=flexParse;

/* importCSV is used by every roster file path. Keep the MOL importer first; fall back to the flexible one. */
const _imp=importCSV;
importCSV=function(text){
  try{return _imp.apply(this,arguments)}
  catch(err){if(!/Rank/.test(String(err.message)))throw err;
    const P=flexParse(parseCSV(String(text)));
    // New teams become sections while there's room (10 max); anyone else goes to the first section.
    const room=Math.max(0,10-SECTIONS.length);const add=P.newSecs.slice(0,room);const addK=new Set(add.map(s=>s[0]));
    if(add.length){SECTIONS.push(...add.map(s=>s.slice()));S.secs=SECTIONS.map(x=>x.slice());if(typeof secFix==="function")secFix()}
    for(const m of P.roster)if(!SECTIONS.some(s=>s[0]===m.sec)&&!addK.has(m.sec))m.sec=SECTIONS[0][0];
    if(P.newSecs.length>add.length)setTimeout(()=>toast((P.newSecs.length-add.length)+" teams didn't fit (10 max); those people went to "+SECTIONS[0][1]),400);
    return {roster:P.roster,own:false}}};

/* Accept Excel files in the main "Load roster" picker too (it used to take CSV only). */
document.addEventListener("change",e=>{const t=e.target;if(t.id!=="file"||!t.files||!t.files[0]||!/\.xlsx?$/i.test(t.files[0].name))return;
  e.stopImmediatePropagation();const f=t.files[0];t.value="";
  fileToCSV(f).then(csv=>{const dt=new DataTransfer();dt.items.add(new File([csv],f.name.replace(/\.xlsx?$/i,".csv"),{type:"text/csv"}));t.files=dt.files;t.dispatchEvent(new Event("change",{bubbles:true}))})
    .catch(err=>toast(String(err.message||err)))},true);
const _rd=renderData;
renderData=function(){_rd.apply(this,arguments);const i=$("#file");if(i){i.setAttribute("accept",".csv,.xlsx,.xls,text/csv");const n=i.nextElementSibling;
  if(n&&n.classList.contains("note"))n.insertAdjacentHTML("beforeend"," Any roster works: a header row with Name (or First and Last), plus optional Rank or Title, Team or Section, Phone and Status.")}};
})();
