// Submits the newest uploaded build to App Review through the App Store Connect API.
// Env: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8, VERSION, BUILD, WHATS_NEW. Bundle id: com.antoniotyler.accountedfor
import crypto from "node:crypto";
const { ASC_KEY_ID: KID, ASC_ISSUER_ID: ISS, ASC_KEY_P8: P8, VERSION, BUILD } = process.env;
const WHATS_NEW = process.env.WHATS_NEW || "Join your team with a code: new first choice on the welcome screen and a code switch for Google and Apple sign-in. Your photo now shows where initials did. A roomier People card.";
for (const [k, v] of Object.entries({ KID, ISS, P8, VERSION, BUILD })) if (!v) { console.error("Missing " + k); process.exit(1) }
const b64 = o => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
const token = () => { const h = b64({ alg: "ES256", kid: KID, typ: "JWT" }), n = Math.floor(Date.now() / 1000), p = b64({ iss: ISS, iat: n, exp: n + 1100, aud: "appstoreconnect-v1" });
  const s = crypto.sign("SHA256", Buffer.from(h + "." + p), { key: P8, dsaEncoding: "ieee-p1363" }).toString("base64url"); return h + "." + p + "." + s };
const api = async (m, path, body) => { const r = await fetch("https://api.appstoreconnect.apple.com" + path, { method: m, headers: { Authorization: "Bearer " + token(), "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j = {}; try { j = t ? JSON.parse(t) : {} } catch (e) {}
  if (!r.ok) throw new Error(m + " " + path + " -> " + r.status + " " + (j.errors ? j.errors.map(e => e.detail || e.title).join("; ") : t.slice(0, 300)));
  return j };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const app = (await api("GET", "/v1/apps?filter[bundleId]=com.antoniotyler.accountedfor")).data[0]; if (!app) throw new Error("App not found");
console.log("App", app.id);
// 1. wait for the build to finish processing
let build = null;
for (let i = 0; i < 60 && !build; i++) {
  const r = await api("GET", `/v1/builds?filter[app]=${app.id}&filter[version]=${BUILD}&filter[preReleaseVersion.version]=${VERSION}&limit=5`);
  const b = r.data.find(x => x.attributes.processingState === "VALID");
  if (b) build = b; else { console.log("Waiting for build " + BUILD + " to process…", r.data.map(x => x.attributes.processingState).join(",") || "not listed yet"); await sleep(60000) }
}
if (!build) throw new Error("Build " + BUILD + " did not finish processing in 60 minutes");
if (build.attributes.usesNonExemptEncryption === null || build.attributes.usesNonExemptEncryption === undefined) {
  try { await api("PATCH", "/v1/builds/" + build.id, { data: { type: "builds", id: build.id, attributes: { usesNonExemptEncryption: false } } }) } catch (e) { console.log("encryption flag:", e.message) } }
// 2. find or make the App Store version
const vs = (await api("GET", `/v1/apps/${app.id}/appStoreVersions?filter[platform]=IOS&limit=20`)).data;
let ver = vs.find(v => v.attributes.versionString === VERSION);
const editable = ["PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED", "INVALID_BINARY"];
if (!ver) { const open = vs.find(v => editable.includes(v.attributes.appStoreState));
  if (open) { ver = (await api("PATCH", "/v1/appStoreVersions/" + open.id, { data: { type: "appStoreVersions", id: open.id, attributes: { versionString: VERSION } } })).data; console.log("Renamed open version to", VERSION) }
  else { ver = (await api("POST", "/v1/appStoreVersions", { data: { type: "appStoreVersions", attributes: { platform: "IOS", versionString: VERSION, releaseType: "AFTER_APPROVAL" }, relationships: { app: { data: { type: "apps", id: app.id } } } } })).data; console.log("Created version", VERSION) } }
console.log("Version", ver.id, ver.attributes.appStoreState);
// 3. what's new on every language
const locs = (await api("GET", `/v1/appStoreVersions/${ver.id}/appStoreVersionLocalizations`)).data;
for (const l of locs) await api("PATCH", "/v1/appStoreVersionLocalizations/" + l.id, { data: { type: "appStoreVersionLocalizations", id: l.id, attributes: { whatsNew: WHATS_NEW } } });
console.log("What's new set on", locs.length, "language(s)");
// 4. attach the build
await api("PATCH", `/v1/appStoreVersions/${ver.id}/relationships/build`, { data: { type: "builds", id: build.id } });
console.log("Build attached");
// 5. submit for review
const subs = (await api("GET", `/v1/reviewSubmissions?filter[app]=${app.id}&filter[platform]=IOS&filter[state]=READY_FOR_REVIEW,WAITING_FOR_REVIEW,IN_REVIEW,UNRESOLVED_ISSUES&limit=10`)).data;
let sub = subs.find(s => s.attributes.state === "READY_FOR_REVIEW");
if (subs.some(s => ["WAITING_FOR_REVIEW", "IN_REVIEW"].includes(s.attributes.state))) { console.log("Another submission is already with Apple:", subs.map(s => s.attributes.state).join(",")); process.exit(2) }
if (!sub) sub = (await api("POST", "/v1/reviewSubmissions", { data: { type: "reviewSubmissions", attributes: { platform: "IOS" }, relationships: { app: { data: { type: "apps", id: app.id } } } } })).data;
const items = (await api("GET", `/v1/reviewSubmissions/${sub.id}/items`)).data;
if (!items.length) await api("POST", "/v1/reviewSubmissionItems", { data: { type: "reviewSubmissionItems", relationships: { reviewSubmission: { data: { type: "reviewSubmissions", id: sub.id } }, appStoreVersion: { data: { type: "appStoreVersions", id: ver.id } } } } });
await api("PATCH", "/v1/reviewSubmissions/" + sub.id, { data: { type: "reviewSubmissions", id: sub.id, attributes: { submitted: true } } });
console.log("SUBMITTED to App Review: version " + VERSION + " build " + BUILD);
