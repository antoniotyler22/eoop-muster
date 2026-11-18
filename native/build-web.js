// Copies the web app into www/ for the native shell (everything the app loads, nothing else).
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, ".."), out = path.join(root, "www");
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out);
const files = ["app.html", "app.bundle.js", "terms.html", "app.css", "native.js", "help.html", "privacy.html", "support.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png", "welcome-peek.png"];
for (const f of files) fs.copyFileSync(path.join(root, f), path.join(out, f));
for (const d of ["fonts", "lib", "supabase/setup", "supabase/functions"]) fs.cpSync(path.join(root, d), path.join(out, d), { recursive: true });
// The native app serves files itself; no service worker.
// On the website the app is app.html (the landing page is the site root). Inside the native shell the app is index.html, and app.html is kept too so "Back to app" links work.
let html = fs.readFileSync(path.join(out, "app.html"), "utf8");
html = html.replace('<link rel="manifest"', '<link rel="x-manifest-off"');
fs.writeFileSync(path.join(out, "index.html"), html);
fs.writeFileSync(path.join(out, "app.html"), html);
console.log("www/ ready");
