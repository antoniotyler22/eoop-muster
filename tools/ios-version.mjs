// Keeps the iPhone app's version and build number in step with version.json (the web app's version).
//   App Store version (MARKETING_VERSION)       = version.json "v", e.g. 4.126.0
//   Build number     (CURRENT_PROJECT_VERSION) = major*1000000 + minor*1000 + patch, e.g. 4126000
// The build number only ever goes up when the version goes up, so every release gets a new, larger build.
// To upload a second build of the same version, bump the patch number (npm run bundle after changing window.AV).
//
//   node tools/ios-version.mjs          write both into ios/App/App.xcodeproj/project.pbxproj
//   node tools/ios-version.mjs --check  fail if the project doesn't match version.json (npm test runs this)
//   node tools/ios-version.mjs --print  print "VERSION BUILD" (the iPhone build workflow uses this)
// npm run bundle runs the write step for you.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const PBX = path.join(root, "ios/App/App.xcodeproj/project.pbxproj");

export function buildNumber(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(v || ""));
  if (!m) throw new Error(`version.json "v" must look like 4.126.0 (got ${JSON.stringify(v)})`);
  const [maj, min, pat] = m.slice(1).map(Number);
  if (min > 999 || pat > 999) throw new Error("minor and patch must be 999 or less for the build number to stay in order");
  return String(maj * 1000000 + min * 1000 + pat);
}

export function iosVersion(vjsonText) {
  const v = JSON.parse(vjsonText ?? fs.readFileSync(path.join(root, "version.json"), "utf8")).v;
  return { version: v, build: buildNumber(v) };
}

export function applyTo(pbx, { version, build }) {
  let n = 0, b = 0;
  const out = pbx
    .replace(/MARKETING_VERSION = [^;]+;/g, () => (n++, `MARKETING_VERSION = ${version};`))
    .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, () => (b++, `CURRENT_PROJECT_VERSION = ${build};`));
  if (n !== 2 || b !== 2) throw new Error(`expected 2 MARKETING_VERSION and 2 CURRENT_PROJECT_VERSION lines in the Xcode project, found ${n} and ${b}`);
  return out;
}

export function syncIos({ check = false, vjsonText } = {}) {
  const want = iosVersion(vjsonText);
  const cur = fs.readFileSync(PBX, "utf8");
  const next = applyTo(cur, want);
  if (check) {
    if (cur !== next) return { ok: false, ...want };
    return { ok: true, ...want };
  }
  if (cur !== next) fs.writeFileSync(PBX, next);
  return { ok: true, ...want };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  if (process.argv.includes("--print")) { const v = iosVersion(); console.log(v.version + " " + v.build); process.exit(0); }
  const check = process.argv.includes("--check");
  const r = syncIos({ check });
  if (!r.ok) { console.error(`iPhone version is out of date (want ${r.version} build ${r.build}). Run: npm run bundle`); process.exit(1); }
  console.log(`iPhone version ${r.version} build ${r.build}` + (check ? " is up to date" : " written"));
}
