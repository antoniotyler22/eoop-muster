// Loads the real app (index.html + every script it pulls in) into a fake browser (jsdom).
// The network is stubbed: Supabase calls get canned answers, so tests run offline and touch nothing live.
import { JSDOM, ResourceLoader, VirtualConsole } from "jsdom";
import fs from "node:fs";
import path from "node:path";
import { webcrypto } from "node:crypto";

export const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const BASE = "https://antoniotyler22.github.io/eoop-muster/";

class LocalFiles extends ResourceLoader {
  fetch(url, opts) {
    const u = new URL(url);
    if (u.href.startsWith(BASE)) {
      const rel = decodeURIComponent(u.pathname.slice(new URL(BASE).pathname.length)) || "index.html";
      const file = path.join(ROOT, rel);
      if (fs.existsSync(file)) return Promise.resolve(fs.readFileSync(file));
    }
    return Promise.reject(new Error("blocked in tests: " + url));
  }
}

/**
 * Open the app. Options:
 *  hash      URL hash (e.g. "board", "ci=abc&u=1ST")
 *  storage   object of localStorage keys to preload
 *  rpc       (fn, args) => result   canned Supabase RPC answers
 */
export async function openApp(opts = {}) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(String(e && (e.stack || e.message || e))));
  vc.on("error", (...a) => errors.push(a.map(String).join(" ")));
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const calls = [];
  const dom = new JSDOM(html, {
    url: BASE + (opts.hash ? "#" + opts.hash : ""),
    runScripts: "dangerously",
    resources: new LocalFiles(),
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(w) {
      Object.defineProperty(w, "crypto", { value: webcrypto, configurable: true });
      w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
      w.scrollTo = () => {}; w.print = () => {};
      w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
      w.HTMLCanvasElement.prototype.getContext = () => null;
      w.navigator.vibrate = () => true;
      if (opts.geo) Object.defineProperty(w.navigator, "geolocation", { value: { getCurrentPosition: (ok) => setTimeout(() => ok({ coords: opts.geo }), 5) }, configurable: true });
      for (const [k, v] of Object.entries(opts.storage || {})) w.localStorage.setItem(k, v);
      w.fetch = async (url, init = {}) => {
        const u = String(url);
        let body = null; try { body = init.body ? JSON.parse(init.body) : null; } catch { body = init.body; }
        calls.push({ url: u, body });
        const m = u.match(/\/rest\/v1\/rpc\/([a-z0-9_]+)/i);
        let out = null, status = 200;
        if (m && opts.rpc) { try { out = await opts.rpc(m[1], body); } catch (e) { status = 400; out = { message: String(e.message || e) }; } }
        else if (/\/functions\/v1\//.test(u) && opts.fn) { const r = await opts.fn(u.split("/functions/v1/")[1], body); out = r.body ?? r; status = r.status ?? 200; }
        const text = out == null ? "" : JSON.stringify(out);
        return { ok: status < 400, status, text: async () => text, json: async () => (text ? JSON.parse(text) : null), headers: new Map() };
      };
      w.addEventListener("error", (e) => errors.push(String(e.error && e.error.stack || e.message)));
      w.addEventListener("unhandledrejection", (e) => errors.push("unhandled: " + String(e.reason && (e.reason.stack || e.reason))));
    },
  });
  const w = dom.window;
  await waitFor(() => w.document.readyState === "complete", 10000);
  if (!opts.noWait) await waitFor(() => w.__appReady === true, 15000);
  await sleep(150);
  return { dom, w, doc: w.document, errors, calls, $: (s) => w.document.querySelector(s), $$: (s) => [...w.document.querySelectorAll(s)], close: async () => { await sleep(120); w.close(); } };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function waitFor(fn, ms = 5000) {
  const t0 = Date.now();
  for (;;) {
    let ok = false; try { ok = !!fn(); } catch {}
    if (ok) return true;
    if (Date.now() - t0 > ms) throw new Error("timed out waiting");
    await sleep(25);
  }
}
