// Copies the web app into www/ for the native shell (everything the app loads, nothing else).
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, ".."), out = path.join(root, "www");
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out);
const files = ["index.html", "help.html", "privacy.html", "support.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];
for (const f of files) fs.copyFileSync(path.join(root, f), path.join(out, f));
for (const d of ["fonts", "lib", "supabase/setup", "supabase/functions"]) fs.cpSync(path.join(root, d), path.join(out, d), { recursive: true });
// The native app serves files itself; no service worker.
let html = fs.readFileSync(path.join(out, "index.html"), "utf8");
html = html.replace('<link rel="manifest"', '<link rel="x-manifest-off"');
fs.writeFileSync(path.join(out, "index.html"), html);
console.log("www/ ready");
