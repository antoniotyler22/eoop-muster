/* Accounted For 1.6: Español.
   Turns on by itself when the phone's language is Spanish, or from Settings / the welcome screen (Idioma).
   Translates the screens people use most: welcome and setup, Home, Feed, check-in, My status, Calendar, Tools, the demo
   drill and the share card. Anything not in the list stays in English. */
(()=>{
const ES={
/* template words */
"Roll call":"Pase de lista","Emergency Roll call":"Pase de lista de emergencia","🚨 Emergency Roll call":"🚨 Pase de lista de emergencia","Head count":"Conteo","🚨 Emergency Head count":"🚨 Conteo de emergencia",
"Fire drill":"Simulacro","🚨 Emergency Fire drill":"🚨 Simulacro de emergencia","🚨 Emergency Check-in":"🚨 Reporte de emergencia",
"Picked up":"Recogido","Warming up":"Calentando","In the game":"En el juego","Away game":"Partido fuera","Starters":"Titulares","Bench":"Banca","New players":"Jugadores nuevos",
"With group":"Con el grupo","WITH GROUP":"CON EL GRUPO","Restroom":"Baño","With chaperone":"Con acompañante","Nurse":"Enfermería","On the bus":"En el autobús","Left early":"Se fue temprano",
"Finished":"Terminó","FINISHED":"TERMINARON","On course":"En el recorrido","Medical tent":"Carpa médica","Water stop":"Puesto de agua","Start corral":"Salida","Dropped out":"Abandonó","No-show":"No llegó",
"On post":"En su puesto","ON POST":"EN SU PUESTO","On break":"En descanso","Off site":"Fuera del sitio","Runner":"Mensajero","Setup":"Montaje","Training":"Capacitación","Off today":"Libre hoy",
"At assembly point":"En el punto de reunión","AT ASSEMBLY POINT":"EN EL PUNTO DE REUNIÓN","Still inside":"Aún adentro","Remote today":"Remoto hoy","Floor warden":"Brigadista","Traveling":"De viaje","PTO":"Vacaciones",
"Players":"Jugadores","Students":"Estudiantes","Runners":"Corredores","Staff":"Personal","Employees":"Empleados","Coaches":"Entrenadores","Chaperones":"Acompañantes","Volunteers":"Voluntarios","Visitors":"Visitantes",
/* tabs and header */
"Home":"Inicio","Feed":"Avisos","People":"Personas","Plan":"Plan","Tools":"Herramientas","My status":"Mi estado","Calendar":"Calendario","Today":"Hoy","My page":"Mi página","My log":"Mi registro","Ask":"Preguntar",
/* welcome and setup */
"Welcome to Accounted For":"Bienvenido a Accounted For","Know who's here, who's not, and who got the word.":"Sepa quién está, quién no y quién recibió el aviso.",
"I'm joining a team":"Me uno a un equipo","I got a link, username or invite":"Recibí un enlace, usuario o invitación","I'm starting a team":"Voy a crear un equipo","I'm the leader, coach or organizer":"Soy el líder, entrenador u organizador",
"▶ See a 30-second demo":"▶ Ver una demostración de 30 segundos","Start from a template":"Empezar con una plantilla","One tap sets up your groups and status words.":"Un toque configura sus grupos y estados.",
"Or pick a type":"O elija un tipo","Sets the words the app uses. You can change it later.":"Define las palabras que usa la app. Puede cambiarlo después.",
"Field trip":"Excursión escolar","Buses, groups, chaperones":"Autobuses, grupos, acompañantes","5K / race":"Carrera / 5K","Runners, corrals, finish line":"Corredores, corrales, meta",
"Job site":"Obra","Crews, trades, head count":"Cuadrillas, oficios, conteo","Event staff":"Personal de evento","Gates, security, concessions":"Entradas, seguridad, comida",
"Youth team":"Equipo juvenil","Players, coaches, pickups":"Jugadores, entrenadores, recogidas","Office fire drill":"Simulacro de incendio","Floors, wardens, assembly point":"Pisos, brigadistas, punto de reunión",
"Name your team":"Nombre de su equipo","Team name":"Nombre del equipo","Go":"Listo","Back":"Atrás","Close":"Cerrar","Next":"Siguiente","Done":"Listo","Cancel":"Cancelar","Save":"Guardar","Share":"Compartir","Share it":"Compartirlo",
"Sign in":"Iniciar sesión","Username":"Usuario","Password":"Contraseña","Got a username and password from your leader?":"¿Su líder le dio un usuario y contraseña?",
"Got an invite link?":"¿Tiene un enlace de invitación?","Tap the link in your text, or paste it here.":"Toque el enlace en su mensaje o péguelo aquí.","Open link":"Abrir enlace",
"Get the app":"Obtener la app","iPhone app":"App para iPhone","Web app":"App web","Send the app to someone":"Enviar la app a alguien",
/* Home */
"Good morning":"Buenos días","Good afternoon":"Buenas tardes","Good evening":"Buenas noches","Add your people":"Agregue a su gente","Your team is empty. Pick the easiest way:":"Su equipo está vacío. Elija la forma más fácil:",
"Type names":"Escribir nombres","Paste a list":"Pegar una lista","Upload a file":"Subir un archivo","Send an invite":"Enviar invitación",
"ON HAND":"PRESENTES","HERE":"PRESENTES","CHECKED IN":"REPORTADOS","EMERGENCY CHECK-IN":"REPORTE DE EMERGENCIA","Everyone accounted for ✓":"Todos presentes ✓","Add people to start":"Agregue personas para empezar",
"Check-in":"Reporte","Phone list":"Lista de teléfonos","Share headcount":"Compartir conteo","Invite":"Invitar","Muster":"Formación","Recall":"Llamado","Send numbers":"Enviar números","Alerts":"Alertas",
"🚨 Emergency check-in":"🚨 Reporte de emergencia","🚨 Emergency muster":"🚨 Formación de emergencia","Needs you":"Pendiente","✓ Nothing needs you right now":"✓ Nada pendiente por ahora",
"▶ Watch a 30-second demo drill":"▶ Ver un simulacro de 30 segundos","Numbers by status and section":"Números por estado y sección",
/* statuses (Civilian and Military) */
"Here":"Presente","On Hand":"Presente","Away":"Fuera","Time Off":"Día libre","Leave":"Permiso","Event":"Evento","Assigned Task":"Tarea asignada","Appt On Site":"Cita en sitio","Appt Off Site":"Cita fuera",
"Full Go":"Listo","Limited":"Limitado","Present":"Presente","Absent":"Ausente","Guests":"Invitados",
/* Tools groups */
"People & access":"Personas y acceso","Invite, logins, who has access":"Invitar, usuarios, quién tiene acceso","Reports":"Informes","Headcount, PDF, incident report, trends":"Conteo, PDF, incidentes, tendencias",
"Post, text, messages, pages":"Publicar, textos, mensajes, páginas","Check people in, confirm check-ins":"Registrar asistencia, confirmar reportes","Calendar, events, duty, meetings":"Calendario, eventos, turnos, reuniones",
"Readiness":"Preparación","Who's due for what":"Quién debe qué","Call or text everyone":"Llamar o escribir a todos","Gear":"Equipo","Sign gear in and out":"Prestar y devolver equipo",
"Combine teams":"Unir equipos","Add up the teams under you":"Sumar los equipos a su cargo","My day":"Mi día","Dashboard, today, my log":"Panel, hoy, mi registro",
"Help":"Ayuda","Ask a question, guide, short tour":"Preguntar, guía, recorrido corto","Settings":"Ajustes","Data, version, connections, system check":"Datos, versión, conexiones, revisión",
"Demo drill":"Simulacro","Watch 24 people check in":"Vea a 24 personas reportarse","Share card":"Tarjeta para compartir","Headcount as an image":"El conteo como imagen",
"Language / Idioma":"Idioma / Language","Due-outs tracker":"Seguimiento de pendientes","Independent app. Not an official system of, or endorsed by, the DoD, any military service, police agency or government.":"App independiente. No es un sistema oficial ni está respaldada por el DoD, ninguna rama militar, policía o gobierno.","Privacy":"Privacidad","Terms":"Términos","English or Español":"Español o English",
/* Feed */
"✓ Confirm I saw it":"✓ Confirmo que lo vi","✓ I posted it":"✓ Yo lo publiqué","✓ Confirmed":"✓ Confirmado","✓ You confirmed":"✓ Usted confirmó","Post":"Publicar","Posting…":"Publicando…",
"Nothing posted yet. New posts show up here.":"Aún no hay publicaciones. Las nuevas aparecen aquí.","Nothing posted yet.":"Aún no hay publicaciones.","Problem":"Problema","Who ▸":"Quién ▸","📌 Pin":"📌 Fijar","Unpin":"Quitar",
"Leave feed":"Salir de avisos","👤 My page":"👤 Mi página","Start another feed":"Iniciar otro canal","Delete feed":"Borrar canal","URGENT":"URGENTE",
/* My status / check in */
"MY STATUS":"MI ESTADO","CHECK IN":"REPORTARSE","📍 Check in":"📍 Reportarse","Tell your leader where you are. They confirm it.":"Dígale a su líder dónde está. Él lo confirma.",
"🔔 Updates":"🔔 Novedades","Confirm all":"Confirmar todo","Confirm":"Confirmar","Duty":"Turno","No duty scheduled.":"Sin turnos programados.","Due-outs":"Pendientes","Nothing tracked yet.":"Nada registrado aún.",
"My calendar":"Mi calendario","Add to phone calendar":"Agregar al calendario del teléfono","Nothing coming up.":"Nada próximo.","Nothing in the next 60 days.":"Nada en los próximos 60 días.","PLAN OF THE DAY":"PLAN DEL DÍA",
"From":"Desde","To":"Hasta","Location":"Lugar","Other":"Otro","Send":"Enviar",
/* demo drill and celebration */
"DEMO DRILL · SAMPLE PEOPLE":"SIMULACRO · PERSONAS DE EJEMPLO","Watch everyone check in":"Vea a todos reportarse","Run it again":"Repetir",
/* tour */
"Welcome":"Bienvenido","Exit tour":"Salir del recorrido","Let's go":"Empezar","Start using the app":"Empezar a usar la app","Your headcount":"Su conteo","Quick actions":"Acciones rápidas","Help on every screen":"Ayuda en cada pantalla",
};
const PAT=[
  [/^All (\d+) accounted for ✓$/,"Los $1 presentes ✓"],[/^(\d+) to go$/,"Faltan $1"],[/^of (\d+)$/,"de $1"],[/^(\d+) of (\d+) accounted for$/,"$1 de $2 presentes"],
  [/^This is what you see during a real (.+)\. Nothing here is sent to anyone\.$/,"Esto es lo que verá en un reporte real. Aquí no se envía nada a nadie."],
  [/^(\d+) posts? to confirm$/,"$1 por confirmar"],[/^✓ Confirm all \((\d+)\)$/,"✓ Confirmar todo ($1)"],[/^Step (\d+) of (\d+)$/,"Paso $1 de $2"],
  [/^Start a feed for (.+)$/,"Iniciar avisos para $1"],[/^As of (.+)$/,"Actualizado: $1"],[/^Present (\d+) · Away (\d+)$/,"Presentes $1 · Fuera $2"],[/^(\d+) items$/,"$1 artículos"],[/^(\d+) numbers loaded$/,"$1 números cargados"],[/^(\d+) today$/,"$1 hoy"],[/^(\d+) events$/,"$1 eventos"]];
const on=()=>S.lang==="es"||(!S.lang&&/^es\b/i.test(navigator.language||""));
window.afLangES=on;
const SKIP=new Set(["SCRIPT","STYLE","TEXTAREA","INPUT"]);
function tr(s){const t=s.trim();if(!t)return s;if(ES[t]!==undefined)return s.replace(t,ES[t]);for(const [re,to] of PAT)if(re.test(t))return s.replace(t,t.replace(re,to));return s}
function fixNode(n){const p=n.parentNode;if(!p||SKIP.has(p.nodeName))return;const v=n.nodeValue;
  /* translate the team's own wording first (Civilian, Jobs, templates...), then into Spanish */
  let b=v;try{if(typeof xs==="function"&&!(p.closest&&p.closest("[data-noxl]")))b=xs(v)}catch(e){}
  const o=tr(b);if(o!==b)n.nodeValue=o}
function walk(root){if(!root)return;if(root.nodeType===3){fixNode(root);return}if(root.nodeType!==1||SKIP.has(root.nodeName))return;
  if(root.querySelectorAll)root.querySelectorAll("[placeholder]").forEach(e=>{const ph=e.getAttribute("placeholder");const o=tr(ph);if(o!==ph)e.setAttribute("placeholder",o)});
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const L=[];while(w.nextNode())L.push(w.currentNode);L.forEach(fixNode)}
let OBS=null;
function start(){if(!on()||OBS)return;document.documentElement.lang="es";walk(document.body);
  OBS=new MutationObserver(rs=>{for(const r of rs){if(r.type==="characterData")fixNode(r.target);else r.addedNodes.forEach(walk)}});OBS.observe(document.body,{subtree:true,childList:true,characterData:true})}
function setLang(l){S.lang=l;save();location.reload()}
window.afSetLang=setLang;window.afStartES=start;
/* Spanish toast text for the common ones */
{const _t=toast;toast=function(m){if(on()){const s=String(m);const T={"Saved":"Guardado","Copied":"Copiado","Posted":"Publicado","✓ Confirmed":"✓ Confirmado","✓ Confirmed all":"✓ Todo confirmado","Team ready. Add your people.":"Equipo listo. Agregue a su gente.","Type your team name.":"Escriba el nombre de su equipo.","Image saved. Post it anywhere.":"Imagen guardada. Publíquela donde quiera.","You're in. The app is live.":"Listo. La app está activa."};
  if(T[s])m=T[s];else if(/^Posted\. 0 of (\d+) have confirmed/.test(s))m="Publicado. 0 de "+s.match(/of (\d+)/)[1]+" han confirmado. Vea el conteo en la publicación.";else if(/^📍 Checked in/.test(s))m="📍 Reportado. Su líder lo confirma."}
  return _t.apply(this,[m].concat([].slice.call(arguments,1)))}}
/* picker: welcome screen link and a Settings tile */
new MutationObserver(()=>{const w=$("#v11Welcome");if(!w||w.hidden||w.querySelector("#esPick"))return;const inner=w.querySelector(".v11w-in");if(!inner)return;
  inner.insertAdjacentHTML("beforeend",`<p id="esPick" style="text-align:center;margin:6px 0 0"><button class="chip" data-lang="${on()?"en":"es"}" style="cursor:pointer">${on()?"English":"Español"}</button></p>`)}).observe(document.body,{childList:true,subtree:true});
if(typeof window.openToolGroup==="function"){const og=window.openToolGroup;window.openToolGroup=function(k){og.apply(this,arguments);if(k!=="settings")return;const g=document.querySelector("#sheetOpts .tgrid");if(!g)return;
  g.insertAdjacentHTML("afterbegin",`<button data-lang="${on()?"en":"es"}"><span class="ic">${svg("help")}</span><span><b>Language / Idioma</b><small>${on()?"English":"Español"}</small></span></button>`)}}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-lang]");if(b){e.stopPropagation();setLang(b.dataset.lang)}});
if(typeof WS_GLOBAL==="object"&&Array.isArray(WS_GLOBAL))WS_GLOBAL.push("lang");
start();
try{if(on()&&typeof render==="function")render()}catch(e){}
})();
