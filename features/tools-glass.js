/* Accounted For 4.135.0: Tools looks like a Glass settings list. One frosted, rounded card of rows: a colored icon tile,
   the name and a one-line hint, and a chevron, the way a phone's Settings reads. Styling only: the same tiles, the same
   taps, the same search box. Dark mode keeps the app's own card colors. */
(()=>{
const c=document.createElement("style");
c.textContent=`
#main .tgrid{display:block!important;padding:0!important;overflow:hidden;border-radius:20px;border:1px solid var(--glass-line,rgba(255,255,255,.85));background:var(--card,rgba(255,255,255,.62));-webkit-backdrop-filter:blur(18px) saturate(1.3);backdrop-filter:blur(18px) saturate(1.3);box-shadow:0 6px 24px rgba(40,70,140,.10)}
#main .tgrid>button,#main .tgrid>a{display:flex!important;align-items:center;gap:12px;width:100%;min-height:58px;margin:0!important;padding:10px 38px 10px 14px!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;text-align:left;position:relative;color:inherit}
#main .tgrid>button+button::before,#main .tgrid>a+a::before,#main .tgrid>button+a::before,#main .tgrid>a+button::before{content:"";position:absolute;left:58px;right:0;top:0;border-top:1px solid var(--line,rgba(15,27,45,.09))}
#main .tgrid>button::after,#main .tgrid>a::after{content:"›";position:absolute;right:16px;top:50%;transform:translateY(-52%);font-size:24px;line-height:1;color:var(--muted,#9aa8c0)}
#main .tgrid .ic{flex:none;width:32px;height:32px;border-radius:9px;display:grid!important;place-items:center;color:#fff!important;background:#6b7a94}
#main .tgrid .ic svg{width:18px;height:18px}
#main .tgrid>:nth-child(8n+1) .ic{background:#0b5bea}#main .tgrid>:nth-child(8n+2) .ic{background:#7a4de8}#main .tgrid>:nth-child(8n+3) .ic{background:#17a673}#main .tgrid>:nth-child(8n+4) .ic{background:#e8742c}
#main .tgrid>:nth-child(8n+5) .ic{background:#d6457a}#main .tgrid>:nth-child(8n+6) .ic{background:#3b86f7}#main .tgrid>:nth-child(8n+7) .ic{background:#14b8c4}#main .tgrid>:nth-child(8n) .ic{background:#6b7a94}
#main .tgrid>button>span:last-child,#main .tgrid>a>span:last-child{min-width:0;flex:1}
#main .tgrid b{font-weight:600;font-size:16px!important}
#main .tgrid small{display:block;font-size:12.5px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#main .tgrid>.hot .ic{background:#d93025}
`;
document.head.appendChild(c);
})();
