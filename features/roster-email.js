/* Accounted For 4.127.0: Email on the roster.
   - Import: a column named Email (or E-mail, Email address, Work email...) fills each person's email. Every address is
     checked; a bad one is left off that person and the import says how many were skipped.
   - Edit: Add people → a person → Email. A bad address is refused with a message ("name@example.com").
   - Export: the CSV and Excel roster exports have an Email column; the sample roster file has one too.
   - The person card shows the email (tap to write to them).
   Emails stay on the phones in the roster. Setup part 52 keeps only salted hashes on the server, for Sign in with
   Apple or Google to find a person's roster spot. */
(()=>{
/* one address: trims, drops "mailto:" and <>, lower case. "" when blank, null when it isn't an email. */
const RE=/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;
function normEmail(v){const s=String(v==null?"":v).trim().replace(/^mailto:/i,"").replace(/^<\s*|\s*>$/g,"").trim().toLowerCase();
  if(!s)return "";if(s.length>254||s.split("@")[0].length>64||!RE.test(s))return null;return s}
window.normEmail=normEmail;

/* person card: the email, under the phone numbers */
if(typeof renderPerson==="function"){const _rp=renderPerson;renderPerson=function(){const r=_rp.apply(this,arguments);
  try{const m=S.roster.find(x=>x.id===pid);const main=$("#main");if(!m||!m.email||!main||main.querySelector("#pxEmail"))return r;
    const host=(main.querySelector(".pick")||{}).parentElement||main.querySelector(".panel");if(!host)return r;
    host.insertAdjacentHTML("beforeend",`<div class="note" id="pxEmail" style="margin:6px 0 0">Email <a href="${esc("mailto:"+m.email)}">${esc(m.email)}</a></div>`)}catch(e){}return r}}
})();
