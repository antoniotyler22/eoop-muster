/* Accounted For native layer. Does nothing in a normal browser.
   Inside the iPhone app it maps the web features the app already uses onto native iOS:
   haptics, share sheet, file saving, local notifications, Face ID, outside links. */
(function () {
  "use strict";
  var C = window.Capacitor;
  var N = (window.MBN = { on: false });
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
  N.on = true;
  N.platform = C.getPlatform();
  document.documentElement.classList.add("native");
  var P = function (n) { return (C.Plugins && C.Plugins[n]) || C.registerPlugin(n); };
  var Haptics = P("Haptics"), Share = P("Share"), FS = P("Filesystem"), LN = P("LocalNotifications"),
      Browser = P("Browser"), Bio = P("Biometric");
  N.Bio = Bio; N.LN = LN; N.Haptics = Haptics;
  var KP = "eoop-muster-v1-native";
  var store = {
    get: function (k) { try { return localStorage.getItem(KP + "-" + k); } catch (e) { return null; } },
    set: function (k, v) { try { v == null ? localStorage.removeItem(KP + "-" + k) : localStorage.setItem(KP + "-" + k, v); } catch (e) {} }
  };

  /* ---- Accounted For Pro: subscription status from Apple, cached for offline starts ---- */
  var Pro = P("ProStore"); N.Pro = Pro;
  N.pro = { active: store.get("pro") === "1", exp: +store.get("proexp") || 0 };
  N.setPro = function (st) {
    if (!st) return;
    var was = N.pro.active;
    N.pro = { active: !!st.active, exp: st.expires || 0 };
    store.set("pro", st.active ? "1" : null);
    store.set("proexp", st.expires ? String(st.expires) : null);
    if (was !== N.pro.active && typeof window.__proChanged === "function") window.__proChanged();
  };
  try { Pro.status().then(N.setPro).catch(function () {}); Pro.addListener("change", N.setPro); } catch (e) {}
  document.addEventListener("visibilitychange", function () { if (!document.hidden) Pro.status().then(N.setPro).catch(function () {}); });

  /* ---- haptics: navigator.vibrate(ms | pattern) ---- */
  navigator.vibrate = function (p) {
    try {
      var a = Array.isArray(p) ? p : [p];
      var first = +a[0] || 0;
      if (a.length >= 3 && first >= 150) Haptics.notification({ type: "ERROR" });
      else if (a.length >= 3) Haptics.notification({ type: "WARNING" });
      else if (first <= 12) Haptics.selectionChanged();
      else Haptics.impact({ style: first >= 40 ? "MEDIUM" : "LIGHT" });
    } catch (e) {}
    return true;
  };

  /* ---- share sheet: text, links and files ---- */
  function b64(buf) {
    var u = new Uint8Array(buf), s = "", i, n = 0x8000;
    for (i = 0; i < u.length; i += n) s += String.fromCharCode.apply(null, u.subarray(i, i + n));
    return btoa(s);
  }
  async function writeTemp(blob, name) {
    var safe = String(name || "file").replace(/[^\w.\- ]+/g, "_").slice(0, 80) || "file";
    var r = await FS.writeFile({ path: safe, data: b64(await blob.arrayBuffer()), directory: "CACHE" });
    return r.uri;
  }
  navigator.canShare = function (d) { return !!d; };
  navigator.share = async function (d) {
    d = d || {};
    var opt = {};
    if (d.title) opt.title = String(d.title);
    if (d.text) opt.text = String(d.text);
    if (d.url) opt.url = String(d.url);
    if (d.files && d.files.length) {
      opt.files = [];
      for (var i = 0; i < d.files.length; i++) opt.files.push(await writeTemp(d.files[i], d.files[i].name));
    }
    try { await Share.share(opt); }
    catch (e) { if (!/cancel/i.test(String(e && e.message))) throw e; var err = new Error("Share canceled"); err.name = "AbortError"; throw err; }
  };
  /* <a download> with a blob link (exports) -> share sheet, so the file can go to Files, Mail, Teams... */
  var aClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    var href = this.href || "", name = this.getAttribute("download");
    if (name !== null && /^blob:/.test(href)) {
      fetch(href).then(function (r) { return r.blob(); }).then(function (b) {
        return navigator.share({ files: [new File([b], name || "export", { type: b.type })], title: name || "export" });
      }).catch(function () {});
      return;
    }
    return aClick.call(this);
  };

  /* ---- links: external sites open in Safari view; help pages open inside the app ---- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (/^(sms|tel|mailto):/i.test(href)) return;
    if (/^https?:\/\//i.test(href)) { e.preventDefault(); Browser.open({ url: href }); return; }
    if (a.target === "_blank" && /\.html(\?|#|$)/.test(href)) { e.preventDefault(); location.href = href; }
  }, true);
  window.open = function (u) { if (u && /^https?:/i.test(u)) Browser.open({ url: String(u) }); return null; };

  /* ---- local notifications: lets in-app alerts (unconfirmed word, reminders) show on the lock screen.
     Push alerts (APNs) and opened links are handled in index.html. */
  var nid = 1;
  var reg = {
    showNotification: function (title, o) {
      o = o || {};
      return LN.schedule({ notifications: [{ id: (nid++ % 100000) + 1000, title: String(title || "Accounted For"), body: String(o.body || ""), extra: o.data || {} }] }).catch(function () {});
    },
    getNotifications: async function () { return []; }
  };
  {
    try {
      Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: {
        ready: Promise.resolve(reg), controller: null,
        register: function () { return Promise.reject(new Error("not used in the app")); },
        getRegistration: async function () { return null; },
        addEventListener: function () {}, removeEventListener: function () {} } });
    } catch (e) {}
  }
  LN.addListener("localNotificationActionPerformed", function (a) {
    var x = (a && a.notification && a.notification.extra) || {};
    if (x.open && typeof window.__mbOpen === "function") window.__mbOpen(String(x.open));
  });

  /* ---- daily muster reminder (local notification, no server) ---- */
  N.reminder = {
    get: function () { try { return JSON.parse(store.get("rem") || "null"); } catch (e) { return null; } },
    set: async function (hhmm, text) {
      await LN.cancel({ notifications: [{ id: 77 }] }).catch(function () {});
      if (!hhmm) { store.set("rem", null); return true; }
      var p = await LN.requestPermissions().catch(function () { return {}; });
      if (p.display !== "granted") return false;
      var hm = hhmm.split(":");
      await LN.schedule({ notifications: [{ id: 77, title: "Muster", body: text || "Time to take the numbers.", schedule: { on: { hour: +hm[0], minute: +hm[1] }, repeats: true, allowWhileIdle: true }, extra: { open: "board" } }] });
      store.set("rem", JSON.stringify({ t: hhmm, x: text || "" }));
      return true;
    }
  };

})();
