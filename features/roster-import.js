/* Accounted For 1.8 — Faster roster import.
   - Paste rows copied from Excel, Google Sheets or Numbers (with a header row: Name or First/Last, plus optional
     Title, Team, Phone, Family / Parent phone, Status). Without a header row, each line is read as "name, team, phone".
   - A blank roster template to fill in.
   - Parent / Guardian phone columns go to the family number used by family "safe" texts.
   - People already on the roster are kept; missing phone numbers are filled in from the paste or file. */
(()=>{
/* tab-separated (what spreadsheets put on the clipboard) -> CSV */
function tsvToCSV(t){return String(t).replace(/\r/g,"").split("\n").map(l=>l.split("\t").map(c=>/[",\n]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c).join(",")).join("\n")}
function hasHeader(csv){try{flexParse(parseCSV(csv));return true}catch(e){return false}}
async function addPasted(text){const raw=String(text||"").trim();if(!raw)throw new Error("Paste some rows first.");
  const csv=raw.includes("\t")?tsvToCSV(raw):raw;
  if(hasHeader(csv)||/^rank\b/i.test(csv)){const f={name:"pasted.csv",type:"text/csv",text:async()=>csv};const n=await mergeFile(f);return {n,up:mergeFile.up||0}}
  /* no header: one person per line */
  let n=0,skip=0;for(const l of raw.split(/\n+/)){const o=addParse(l);if(!o)continue;if(addMarine(o,SECTIONS[0][0]))n++;else skip++}save();return {n,up:0,skip}}
window.rosterPaste=addPasted;
function template(){const fam=typeof famOn==="function"&&famOn();
  const h=["Name","Title","Team","Phone",fam?"Parent phone":"Alt phone","Status"];
  const ex=fam?[["Rivera, Ana","Student",SECTIONS[1]?SECTIONS[1][1]:SECTIONS[0][1],"","808-555-0101","Present"],["Lee, Max","Teacher",SECTIONS[1]?SECTIONS[1][1]:SECTIONS[0][1],"808-555-0102","",""]]
    :[["Rivera, Ana","",SECTIONS[0][1],"808-555-0101","",""],["Lee, Max","",SECTIONS[1]?SECTIONS[1][1]:SECTIONS[0][1],"808-555-0102","",""]];
  return [h].concat(ex).map(r=>r.map(c=>/[",]/.test(c)?'"'+c+'"':c).join(",")).join("\r\n")+"\r\n"}
window.rosterTemplate=template;
function panelHTML(){return `<div class="panel" id="riPanel" style="margin-top:10px"><b>Paste from a spreadsheet</b>
  <p class="note" style="margin:2px 0 6px">In Excel, Google Sheets or Numbers: select the rows (include the header row), copy, and paste here. Columns can be Name (or First and Last), Title, Team, Phone, Parent phone and Status, in any order.</p>
  <textarea id="riPaste" style="min-height:90px" placeholder="Name&#9;Team&#9;Phone&#10;Rivera, Ana&#9;Grade 3&#9;808-555-0101"></textarea>
  <div class="row2"><button class="btn" id="riGo">Add these people</button><button class="btn alt" id="riTpl">⬇ Blank template</button></div>
  <div class="note" id="riOut" role="status"></div>
  <p class="note">Everyone already here is kept, and missing phone numbers are filled in.</p></div>`}
const _rd=renderData;
renderData=function(){_rd.apply(this,arguments);const o=$("#fileAddOut");if(o&&!$("#riPanel"))o.insertAdjacentHTML("afterend",panelHTML())};
document.addEventListener("click",e=>{const t=e.target;if(!t.closest)return;
  if(t.closest("#riGo")){if(typeof canEdit==="function"&&!canEdit())return denyMsg();const out=$("#riOut");
    addPasted(($("#riPaste")||{}).value).then(r=>{const msg=`✓ Added ${r.n}`+(r.up?` · updated ${r.up} phone number${r.up>1?"s":""}`:"")+(r.skip?` · ${r.skip} already here`:"")+".";
      if(typeof S.board==="object"&&S.board&&typeof rpPublish==="function")rpPublish(true);render();const o2=$("#riOut");if(o2)o2.textContent=msg;toast(msg)})
      .catch(err=>{if(out)out.textContent=String(err.message||err)});return}
  if(t.closest("#riTpl")){shareFile(template(),(unitName()+" roster template").replace(/[^\w -]+/g,"")+".csv","text/csv");return}});
})();
