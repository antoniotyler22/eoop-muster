/* Accounted For 4.20: screens drawn by feature files (Teams, Invite, Check-ins, Logins…) can be opened from the URL hash,
   which is how a platoon ↔ company switch keeps the screen you were on. app.js drew the board as a stand-in; redraw now that every feature is loaded. */
(()=>{const h=(location.hash||"").slice(1).toLowerCase();if(h&&h===view&&!["board","co"].includes(view)&&typeof STAY_VIEWS!=="undefined"&&STAY_VIEWS.includes(view)){try{render()}catch(e){view="board";render()}}})();
