/* Accounted For 1.3 — One-tap PDF headcount report.
   Builds a real PDF on the phone (no server, no library): totals, a table by section, everyone not present with
   their status, place and dates, and the live recall if one is running. Opens the share sheet (Files, Mail, Teams…).
   Buttons: "Send the numbers" screen and the board's Tools. */
(()=>{
/* ---- tiny PDF writer: Helvetica text, lines, pages ---- */
const W=612,Hh=792,M=44;
const WIN={"—":"-","–":"-","·":"·","‘":"'","’":"'","“":'"',"”":'"',"✓":"OK","⚠":"!","…":"..."};
function pdfStr(s){return "("+String(s).replace(/[—–‘’“”✓⚠…]/g,c=>WIN[c]).replace(/[^\x20-\x7e -ÿ]/g,"?").replace(/[\\()]/g,c=>"\\"+c)+")"}
const widthOf=(s,size,bold)=>String(s).length*size*(bold?0.56:0.52);
function fit(s,size,bold,max){s=String(s||"");if(widthOf(s,size,bold)<=max)return s;while(s.length>1&&widthOf(s+"...",size,bold)>max)s=s.slice(0,-1);return s+"..."}
function makePDF(title){
  const pages=[];let cur=null,y=0;
  const np=()=>{cur=[];pages.push(cur);y=Hh-M};
  np();
  const api={
    need(h){if(y-h<M+24)np()},
    text(x,s,o={}){const size=o.size||10;cur.push(`BT /${o.bold?"F2":"F1"} ${size} Tf ${o.gray?"0.4 0.4 0.4 rg ":"0 0 0 rg "}${x.toFixed(1)} ${y.toFixed(1)} Td ${pdfStr(o.max?fit(s,size,o.bold,o.max):s)} Tj ET`)},
    line(s,o={}){const size=o.size||10;api.need(size*1.5);y-=size*1.25;api.text(o.x||M,s,o);y-=size*0.25},
    row(cells,o={}){const size=o.size||9.5;api.need(size*1.6);y-=size*1.3;
      if(o.fill){cur.push(`0.93 0.94 0.96 rg ${M-4} ${(y-size*0.35).toFixed(1)} ${W-2*M+8} ${(size*1.35).toFixed(1)} re f`)}
      for(const c of cells)api.text(c.x,c.t,{size,bold:o.bold||c.bold,max:c.w,gray:c.gray});y-=size*0.3},
    rule(){api.need(8);y-=4;cur.push(`0.8 0.8 0.8 RG 0.6 w ${M} ${y.toFixed(1)} m ${W-M} ${y.toFixed(1)} l S`);y-=4},
    gap(h){y-=h},
    out(){const objs=[];const add=s=>{objs.push(s);return objs.length};
      add("<< /Type /Catalog /Pages 2 0 R >>");add("");
      add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
      add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
      const kids=[];const stamp=new Date().toLocaleString();
      pages.forEach((p,i)=>{const foot=`BT /F1 7.5 Tf 0.45 0.45 0.45 rg ${M} 24 Td ${pdfStr(`Accounted For · ${title} · ${stamp} · Page ${i+1} of ${pages.length} · Contains personal information: share only with people who need it.`)} Tj ET`;
        const body=p.concat(foot).join("\n");const c=add(`<< /Length ${body.length} >>\nstream\n${body}\nendstream`);
        kids.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${Hh}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${c} 0 R >>`))});
      objs[1]=`<< /Type /Pages /Kids [${kids.map(k=>k+" 0 R").join(" ")}] /Count ${kids.length} >>`;
      let s="%PDF-1.4\n%âãÏÓ\n";const off=[];
      objs.forEach((o,i)=>{off.push(s.length);s+=`${i+1} 0 obj\n${o}\nendobj\n`});
      const xref=s.length;s+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`+off.map(o=>String(o).padStart(10,"0")+" 00000 n \n").join("");
      s+=`trailer\n<< /Size ${objs.length+1} /Root 1 0 R /Info << /Title ${pdfStr(title)} /Producer (Accounted For) >> >>\nstartxref\n${xref}\n%%EOF`;
      const b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i)&255;return b}};
  return api}
window.makePDF=makePDF;

/* ---- the headcount report ---- */
function headcountPDF(){
  const {c,T,A}=counts();const P=present(T);const unit=unitName();const now=new Date();
  const doc=makePDF(unit+" headcount");
  doc.line(unit+" · Headcount report",{size:18,bold:true});
  doc.line(dtg(now)+"  ·  "+now.toLocaleString([], {weekday:"short",day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})+"  ·  "+MODE().name+" version",{size:9,gray:true});
  doc.gap(6);
  doc.line(`Present ${P} of ${T.total} (${pct(P,T.total)}%)`+(A.total?`  ·  plus ${present(A)}/${A.total} attached`:""),{size:13,bold:true});
  doc.line(STATUSES.filter(s=>T[s]).map(s=>(SHORT[s]||s)+" "+T[s]).join("   ·   "),{size:9.5});
  doc.gap(8);
  const X=[M,M+190,M+262,M+334,M+392];
  doc.row([{x:X[0],t:LV().Sec,w:180},{x:X[1],t:"Assigned"},{x:X[2],t:"Present"},{x:X[3],t:"%"},{x:X[4],t:"Not present",w:W-M-X[4]}],{bold:true,fill:true});
  for(const [k,n] of SECTIONS){const o=c[k];if(!o||!o.total)continue;const p=present(o);
    const off=STATUSES.filter(s=>!PRESENT.includes(s)&&o[s]).map(s=>(SHORT[s]||s)+" "+o[s]).join(", ");
    doc.row([{x:X[0],t:k+" · "+n,w:180},{x:X[1],t:String(o.total)},{x:X[2],t:String(p)},{x:X[3],t:pct(p,o.total)+"%"},{x:X[4],t:off||"-",w:W-M-X[4],gray:!off}])}
  if(A.total)doc.row([{x:X[0],t:"ATT · Attached",w:180},{x:X[1],t:String(A.total)},{x:X[2],t:String(present(A))},{x:X[3],t:pct(present(A),A.total)+"%"},{x:X[4],t:"",w:10}]);
  doc.rule();
  doc.row([{x:X[0],t:"Total",w:180,bold:true},{x:X[1],t:String(T.total),bold:true},{x:X[2],t:String(P),bold:true},{x:X[3],t:pct(P,T.total)+"%",bold:true}]);
  // Everyone not present, by status
  const out=sorted(S.roster.filter(m=>!PRESENT.includes(m.status)));
  if(out.length){doc.gap(10);doc.line("Not present ("+out.length+")",{size:13,bold:true});
    const Y=[M,M+150,M+205,M+380];
    for(const st of STATUSES.filter(s=>!PRESENT.includes(s))){const g=out.filter(m=>m.status===st);if(!g.length)continue;
      doc.gap(4);doc.row([{x:M,t:st+" ("+g.length+")",w:300}],{bold:true,fill:true});
      for(const m of g){const dates=[m.start,m.end].filter(Boolean).join(" to ");
        doc.row([{x:Y[0],t:((m.rank?m.rank+" ":"")+m.name),w:145},{x:Y[1],t:m.sec,w:50},{x:Y[2],t:[m.detail,m.loc].filter(Boolean).join(" · ")||"-",w:170,gray:!(m.detail||m.loc)},{x:Y[3],t:dates||(m.edd?"EDD "+m.edd:""),w:W-M-Y[3]}])}}}
  // Live recall, if one is running
  if(S.rc&&S.rc.open){const pool=recallPool();const ci=S.rc.ci||{},res=S.rc.res||{};
    const ok=pool.filter(m=>ci[m.id]||res[m.id]==="ok");const help=pool.filter(m=>ci[m.id]&&ci[m.id].c===3);const miss=sorted(pool.filter(m=>!ci[m.id]&&res[m.id]!=="ok"));
    doc.gap(10);doc.line(`Recall in progress · ${ok.length} of ${pool.length} accounted for · started ${new Date(S.rc.start).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}`,{size:13,bold:true});
    if(help.length)doc.line("NEED HELP: "+help.map(m=>(m.rank?m.rank+" ":"")+m.name).join(", "),{size:10,bold:true});
    if(miss.length){doc.line("Not yet accounted for ("+miss.length+"):",{size:10,bold:true});
      for(let i=0;i<miss.length;i+=3)doc.row(miss.slice(i,i+3).map((m,j)=>({x:M+j*175,t:(m.rank?m.rank+" ":"")+m.name+(m.phone?"  "+fmtPh(m.phone):""),w:170})))}}
  return doc.out()}
window.headcountPDF=headcountPDF;

async function sharePDF(){try{const bytes=headcountPDF();const name=(unitName()+" headcount "+new Date().toISOString().slice(0,10)).replace(/[^\w -]+/g,"")+".pdf";
  const blob=new Blob([bytes],{type:"application/pdf"});const file=typeof File==="function"?new File([blob],name,{type:"application/pdf"}):null;
  if(file&&navigator.canShare&&navigator.canShare({files:[file]})&&!(window.MBN&&MBN.on)){try{await navigator.share({files:[file],title:name});return}catch(e){if(e&&e.name==="AbortError")return}}
  const u=URL.createObjectURL(blob);const a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000)}
  catch(e){toast("Couldn't make the PDF: "+String(e.message||e).slice(0,60))}}
document.addEventListener("click",e=>{if(e.target.closest("[data-pdf-report]")){e.preventDefault();sharePDF()}});

const _rt=renderText;
renderText=function(){_rt.apply(this,arguments);const p=$("#main .panel");if(p&&!$("[data-pdf-report]"))p.insertAdjacentHTML("beforeend",`<button class="btn alt" data-pdf-report>⬇ PDF report (headcount, who's out, recall)</button>`)};
const _rtools=renderTools;
renderTools=function(){_rtools.apply(this,arguments);const g=$("#main .tgrid");if(g&&!$("[data-pdf-report]"))g.insertAdjacentHTML("beforeend",`<button data-pdf-report><span class="ic">${svg("text")}</span><span><b>PDF report</b><small>Headcount to share or print</small></span></button>`)};
})();
