// 4.126.0: universal links on accountedforteam.com, privacy manifest, iPhone version from version.json, export errors,
// Dashboard = Home numbers, "Reconnect to your roster", one invite link, name and role on every action, alert choices.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { openApp, sleep, ROOT } from "./harness.mjs";
import { buildNumber, applyTo, iosVersion } from "../tools/ios-version.mjs";
import { buildText } from "../supabase/functions/sms/index.ts";

const read = (p) => fs.readFileSync(new URL("../" + p, import.meta.url), "utf8");
const TEAM = "ADNA5MPBGC", BUNDLE = "com.antoniotyler.accountedfor";

test("universal links: a real association file on accountedforteam.com, matching entitlement, app links use the domain", () => {
  const aasa = JSON.parse(read(".well-known/apple-app-site-association"));
  const d = aasa.applinks.details;
  assert.equal(d.length, 1);
  assert.deepEqual(d[0].appIDs, [TEAM + "." + BUNDLE], "Team ID + bundle ID");
  const paths = d[0].components.map((c) => c["/"]);
  assert.ok(paths.includes("/app.html"), "the web app path opens the app");
  assert.ok(!paths.some((p) => /privacy|terms|support|help/.test(p)), "policy pages stay in the browser");
  const root = d[0].components.find((c) => c["/"] === "/");
  assert.equal(root["#"], "?*", "the landing page only opens the app when the link carries a fragment");
  assert.ok(fs.existsSync(ROOT + "/.nojekyll"), "GitHub Pages serves the dot-folder (no Jekyll)");
  assert.equal(read("CNAME").trim(), "accountedforteam.com");
  const ent = read("ios/App/App/App.entitlements");
  assert.match(ent, /<string>applinks:accountedforteam\.com<\/string>/);
  assert.match(read("app.html"), /:"https:\/\/accountedforteam\.com\/app\.html";/, "links shared from the iPhone app use the domain");
  assert.match(read("android/app/src/main/AndroidManifest.xml"), /android:host="accountedforteam\.com" android:path="\/app\.html"/);
  for (const f of ["sms", "billing"]) assert.match(read(`supabase/functions/${f}/index.ts`), /env\("APP_URLS", "https:\/\/accountedforteam\.com\/app\.html,/);
  const apps = "https://accountedforteam.com/app.html,https://accountedforteam.com/,https://antoniotyler22.github.io/eoop-muster/".split(",");
  assert.ok(buildText("https://accountedforteam.com/app.html#ci=abc12345&u=1ST", "abc12345", apps), "the server texts check-in links on the new domain");
  assert.ok(buildText("https://antoniotyler22.github.io/eoop-muster/#ci=abc12345&u=1ST", "abc12345", apps), "and old ones");
});

test("privacy manifest is in the app bundle and matches the App Store answers", () => {
  const x = read("ios/App/App/PrivacyInfo.xcprivacy");
  assert.match(x, /<key>NSPrivacyTracking<\/key>\s*<false\/>/);
  for (const t of ["CrashData", "PurchaseHistory", "Name", "PhoneNumber", "EmailAddress", "UserID", "OtherUserContent"])
    assert.match(x, new RegExp("NSPrivacyCollectedDataType" + t + "<"), t);
  assert.match(x, /NSPrivacyAccessedAPICategoryFileTimestamp<\/string>\s*<key>NSPrivacyAccessedAPITypeReasons<\/key>\s*<array>\s*<string>C617\.1</);
  const pbx = read("ios/App/App.xcodeproj/project.pbxproj");
  const ref = (pbx.match(/(\w{24}) \/\* PrivacyInfo\.xcprivacy \*\/ = \{isa = PBXFileReference/) || [])[1];
  assert.ok(ref, "file reference");
  const bf = (pbx.match(new RegExp("(\\w{24}) /\\* PrivacyInfo\\.xcprivacy in Resources \\*/ = \\{isa = PBXBuildFile; fileRef = " + ref)) || [])[1];
  assert.ok(bf, "build file");
  const res = pbx.slice(pbx.indexOf("/* Begin PBXResourcesBuildPhase section */"), pbx.indexOf("/* End PBXResourcesBuildPhase section */"));
  assert.ok(res.includes(bf + " /* PrivacyInfo.xcprivacy in Resources */"), "copied into the app");
  assert.equal((pbx.match(/DEVELOPMENT_TEAM = ADNA5MPBGC;/g) || []).length, 2, "Team ID on Debug and Release");
});

test("iPhone version and build number follow version.json", () => {
  assert.equal(buildNumber("4.126.0"), "4126000");
  assert.equal(buildNumber("4.126.1"), "4126001");
  assert.ok(+buildNumber("5.0.0") > +buildNumber("4.999.999"), "always goes up");
  assert.throws(() => buildNumber("4.126"), /must look like/);
  const v = iosVersion();
  assert.equal(v.version, JSON.parse(read("version.json")).v);
  assert.equal(v.version, (read("app.html").match(/window\.AV="([^"]+)"/) || [])[1], "same as the web app");
  const pbx = read("ios/App/App.xcodeproj/project.pbxproj");
  assert.equal(applyTo(pbx, v), pbx, "the Xcode project already matches");
  assert.equal((pbx.match(new RegExp(`MARKETING_VERSION = ${v.version.replace(/\./g, "\\.")};`, "g")) || []).length, 2);
  assert.equal((pbx.match(new RegExp(`CURRENT_PROJECT_VERSION = ${v.build};`, "g")) || []).length, 2);
  assert.match(read("package.json"), /tools\/ios-version\.mjs --check/, "npm test checks it");
  const wf = read(".github/workflows/ios.yml");
  assert.match(wf, /MARKETING_VERSION="\$\{\{ steps\.ver\.outputs\.version \}\}" CURRENT_PROJECT_VERSION="\$\{\{ steps\.ver\.outputs\.build \}\}"/);
  assert.ok(!/github\.event\.inputs\.version/.test(wf), "no hand-typed version");
});

test("a failed export says so, with Try again and Copy instead; a cancel stays quiet", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.onb=true;S.welcomed=1;S.leaderMode=true;save();render();`);
    a.w.navigator.canShare = () => true;
    let tries = 0;
    a.w.navigator.share = () => { tries++; return Promise.reject(new Error("No space left on device")); };
    a.w.eval(`shareFile("Rank,Name\\nSGT,SMITH","roster.csv","text/csv")`);
    await sleep(40);
    assert.equal(a.$("#sheet").hidden, false, "error sheet opens");
    assert.match(a.$("#sheetT").textContent, /Couldn't export roster\.csv/);
    assert.match(a.$("#sheetT").textContent, /out of storage/);
    assert.ok(a.$("#expCopy"), "text exports can be copied instead");
    a.$("#expAgain").click(); await sleep(120);
    assert.equal(tries, 2, "Try again runs the export again");
    a.w.eval(`closeSheet()`); await sleep(320);
    assert.equal(a.$("#sheet").hidden, true);
    a.w.navigator.share = () => Promise.reject(new a.w.DOMException("canceled", "AbortError"));
    a.w.eval(`shareFile("x","y.csv","text/csv")`); await sleep(40);
    assert.equal(a.$("#sheet").hidden, true, "canceling the share sheet isn't an error");
    assert.match(read("native.js"), /window\.exportFailed\(name, e, again\)/, "the iPhone save/share layer reports failures too");
  } finally { await a.close(); }
});

test("Dashboard numbers are the Home numbers: On hand, Off Hand in the breakdown, recall counts check-ins", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.source="mol";S.onb=true;S.welcomed=1;S.leaderMode=true;S.mode="military";S.role="oic";
      S.roster=S.roster.slice(0,10);const secs=SECTIONS.map(x=>x[0]);S.roster.forEach((m,i)=>{m.sec=secs[i%secs.length];m.status="On Hand";m.ut=Date.now();delete m.start;delete m.end});
      S.roster[1].status="Leave";S.roster[2].status="SIQ";S.roster[3].ut=Date.now()-3*86400000;S.roster[9].sec="ATT";save();view="board";render();`);
    const home = a.w.eval(`(()=>{const r=document.querySelector("#main .wring");return {n:+r.dataset.n,t:+r.dataset.t}})()`);
    a.w.eval(`view="dash";render();`);
    const big = a.$('[data-dash="oh"] .b').textContent;
    assert.equal(big, home.n + "/" + home.t, "same On hand / total as the Home ring");
    const T = a.w.eval(`JSON.parse(JSON.stringify(counts().T))`);
    assert.equal(T["Off Hand"], 1, "one person is past 24 hours");
    const line = a.$('[data-dash="st"]').textContent;
    assert.match(line, /Off Hand 1/, "Off Hand is in the breakdown");
    const sum = [...line.matchAll(/(\d+)/g)].reduce((s, m) => s + +m[1], 0);
    assert.equal(sum, T.total, "the breakdown adds up to the total");
    // a recall: one person tapped OK for themselves, one checked in from their phone
    a.w.eval(`const p=recallPool();S.rc=Object.assign(S.rc||{},{open:true,res:{[p[0].id]:"ok"},ci:{[p[1].id]:{t:Date.now()}}});save();view="board";render();`);
    const ring = a.w.eval(`(()=>{const r=document.querySelector("#main .wring");return {n:+r.dataset.n,t:+r.dataset.t}})()`);
    a.w.eval(`view="dash";render();`);
    const tiles = a.$$(".v11t");
    const rcTile = tiles.find((t) => /Recall|Emergency/.test(t.querySelector(".l").textContent));
    assert.equal(rcTile.querySelector(".b").textContent, ring.n + "/" + ring.t, "recall tile matches the Home ring (check-ins count)");
    assert.equal(ring.n, 2);
    assert.match(rcTile.querySelector(".s").textContent, new RegExp("^" + (ring.t - 2) + " not checked in"), "checked in + not checked in = everyone");
  } finally { await a.close(); }
});

const ACCESS = (r) => `S.source="sync";S.onb=true;S.welcomed=1;S.leaderMode=true;S.mode="military";S.role="${r}";
  S.roster=S.roster.slice(0,5);S.unit="ALPHA CO";S.sync={on:true,code:newCode(),ver:3,at:Date.now(),err:"",last:""};save();view="board";render();`;

test("cut off: the phone shows Reconnect to your roster with what to do; a bad paste is explained", async () => {
  const a = await openApp({ rpc: (fn) => (fn === "backup_ver" ? null : []) });
  try {
    a.w.eval(ACCESS("view"));
    assert.ok(!a.$("#rcnBan"), "nothing while connected");
    await a.w.eval(`syncPull(true)`);
    a.w.eval(`render()`);
    assert.ok(a.$("#rcnBan"), "notice on the screen");
    assert.match(a.$("#rcnBan").textContent, /Reconnect to your roster/);
    a.$("#rcnGo").click(); await sleep(20);
    assert.match(a.$("#sheetT").textContent, /Reconnect to your roster/);
    assert.match(a.$("#sheetT").textContent, /Your view only access link to ALPHA CO/);
    assert.ok(a.$("#rcnLink") && a.$("#rcnCheck"), "paste the new link, or check again");
    assert.match(a.$("#rcnAsk").getAttribute("href"), /^sms:\?&body=.*new%20invite%20link/, "text the leader for a new link");
    a.$("#rcnLink").value = "https://example.com/nothing";
    a.$("#rcnJoin").click(); await sleep(10);
    assert.match(a.$("#rcnOut").textContent, /doesn't look like an invite link/);
    a.$("#rcnCheck").click(); await sleep(150);
    assert.match(a.$("#rcnOut").textContent, /Still cut off/);
    a.w.eval(`S.sync.err="";render()`);
    assert.ok(!a.$("#rcnBan"), "gone once connected again");
    // a section leader whose link was replaced
    a.w.eval(`S.sync=null;S.role="oic";S.link={board:"b".repeat(14),wk:"w".repeat(32),ek:"",sec:"HE",unit:"1ST PLT",mysec:"HE",me:"",sig:"",sent:0,err:"",rk2:"r".repeat(43),pulled:true,pt:Date.now(),perr:"This link was replaced by your OIC. Ask them for the new one."};save();render();`);
    assert.match(a.$("#rcnBan").textContent, /1ST PLT/);
  } finally { await a.close(); }
});

test("invite link: one link that carries the connection, role picker, QR, New after Cut off everyone; opening it names the team", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.source="mol";S.onb=true;S.welcomed=1;S.leaderMode=true;S.mode="military";S.role="oic";S.unit="ALPHA CO";
      S.sync={on:true,code:newCode(),ver:1,at:Date.now(),err:"",last:""};save();document.querySelector("#main").innerHTML=accessHTML();`);
    assert.ok(a.$("#invCard"), "one invite card instead of three links");
    assert.ok(a.$("#accReset"), "Cut off everyone stays");
    const code = a.w.eval(`normCode(S.sync.code)`);
    let u = new URL(a.$("#invUrl").textContent);
    assert.equal(u.origin + u.pathname, "https://antoniotyler22.github.io/eoop-muster/", "the address this copy of the app runs at");
    let q = new URLSearchParams(u.hash.slice(1));
    assert.equal(q.get("sync"), code);
    assert.equal(q.get("r"), "sncoic", "Can edit by default");
    assert.equal(q.get("u"), a.w.eval("unitName()"));
    assert.equal(q.get("c"), null, "no date for a connection made before this version (its old links still work)");
    assert.ok(!/New|don't work/.test(a.$("#invCard").textContent), "not marked new");
    a.$('[data-invrole="view"]').click(); await sleep(10);
    q = new URLSearchParams(new URL(a.$("#invUrl").textContent).hash.slice(1));
    assert.equal(q.get("r"), "view");
    assert.equal(a.$('[data-invrole="view"]').getAttribute("aria-pressed"), "true");
    // a new connection (Cut off everyone makes a new code): the card shows the new link
    a.w.eval(`S.sync.code=newCode();document.querySelector("#main").innerHTML=accessHTML();`);
    q = new URLSearchParams(new URL(a.$("#invUrl").textContent).hash.slice(1));
    assert.equal(q.get("sync"), a.w.eval(`normCode(S.sync.code)`));
    assert.notEqual(q.get("sync"), code);
    assert.match(q.get("c"), /^\d{8}$/, "carries when the new connection was made");
    assert.match(a.$("#invCard").textContent, /New/);
    assert.match(a.$("#invCard").textContent, /links from before then don't work/);
    // the person who opens it sees whose roster it is
    a.w.eval(`history.replaceState(null,"",location.pathname+"#sync=${code}&r=view&u=ALPHA%20CO&c=20261118");syncJoinPrompt("${code}","view")`);
    assert.match(a.$("#sheetT").textContent, /ALPHA CO · invite made 11\/18/);
    assert.match(a.$("#sheetT").textContent, /View only/);
  } finally { await a.close(); }
});

test("after picking who you are, every action carries your name and role, and the name stays on this phone", async () => {
  const EK = "A".repeat(43);
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(ACCESS("sncoic") + `S.postAs="EOP OIC";S.feeds=[{id:"feedabc12345",mk:"m".repeat(30),ek:"${EK}",unit:"ALPHA CO",me:"OLD NAME",posts:[],seen:0,mine:{},hub:1}];save();`);
    a.w.eval(`whoSheet()`); await sleep(20);
    const b = a.$$("[data-whoid]")[2];
    b.click(); await sleep(30);
    const n = a.w.eval("S.who.n");
    assert.ok(n);
    assert.equal(a.w.eval("S.postAs"), n, "Posting as (Inbox, posts) is the picked name");
    assert.equal(a.w.eval("S.myName"), n);
    assert.equal(a.w.eval("S.feeds[0].me"), n, "Word of Mouth replies, polls and Talk use it");
    assert.ok(a.w.eval(`SYNC_SKIP.includes("postAs")&&SYNC_SKIP.includes("myName")`), "this person's name never syncs onto the OIC's phone");
    assert.equal(a.w.eval("actorTag()"), n + " · Can edit");
    a.w.eval(`S.roster[4].status="Leave";save();`);
    assert.equal(a.w.eval("S.roster[4].by.n"), n);
    assert.equal(a.w.eval("S.roster[4].by.r"), "Can edit");
    assert.match(a.w.eval("byLabel(S.roster[4])"), new RegExp("^Set by " + n + " · Can edit · \\d{4}$"));
    const o = await a.w.eval(`fdEnc("${EK}",{t:"hello",u:false,to:{k:"all"},sa:["HE"],by:fdBy(S.feeds[0])}).then(ct=>fdDec("${EK}",ct))`);
    assert.equal(o.by, n);
    assert.equal(o.br, "Can edit", "posts carry the role");
    // a later Change isn't undone by the next save
    a.w.eval(`S.postAs="SGT SMITH (WATCH)";save();`);
    assert.equal(a.w.eval("S.postAs"), "SGT SMITH (WATCH)");
    // section leader role
    a.w.eval(`S.link={sec:"HE",unit:"1ST PLT"};`);
    assert.equal(a.w.eval("actorRole()"), "HE section leader");
  } finally { await a.close(); }
});

test("alerts: one switch per kind, quieter defaults, the choice rides on the sign-up and the server honors it", async () => {
  const a = await openApp({ rpc: () => [] });
  try {
    a.w.eval(`S.onb=true;S.welcomed=1;S.leaderMode=true;view="data";render();`); await sleep(30);
    assert.ok(a.$("#ntfPanel"), "in Settings");
    assert.deepEqual(JSON.parse(a.w.eval(`JSON.stringify(ntfMuted())`)), ["sections", "team"], "quieter defaults: section updates and team changes off");
    const w = a.$('[data-ntf="word"]'); w.checked = false; w.dispatchEvent(new a.w.Event("change", { bubbles: true })); await sleep(20);
    assert.deepEqual(JSON.parse(a.w.eval(`JSON.stringify(ntfMuted())`)), ["word", "sections", "team"]);
    assert.match(a.$("#ntfNote").textContent, /Off: Word of Mouth posts, Section updates, Team changes/);
    assert.ok(a.w.eval(`SYNC_SKIP.includes("ntf")`), "per phone");
    a.w.eval(`view="settings";render();`); await sleep(20);
    assert.match(a.$('[data-sp="ntf"]').textContent, /Choose alerts\s*3 off/, "Settings shows how many kinds are off");
    a.$('[data-sp="ntf"]').click(); await sleep(20);
    assert.ok(a.$("#ntfPanel") && a.$("#qhPanel"), "Settings → Alerts: alert kinds and quiet hours together");
    // the sign-up carries the choice (and quiet hours still ride along)
    a.w.eval(`S.quiet={on:true,from:"22:00",to:"06:00"};`);
    a.w.PushManager = function () {}; if (!("Notification" in a.w)) a.w.Notification = { permission: "granted", requestPermission: async () => "granted" };
    Object.defineProperty(a.w.navigator, "serviceWorker", { configurable: true, value: { ready: Promise.resolve({ pushManager: { getSubscription: async () => ({ toJSON: () => ({ endpoint: "https://push.example/1", keys: {} }) }) } }) } });
    const j = JSON.parse(await a.w.eval(`pushSub(false).then(s=>JSON.stringify(s.toJSON()))`));
    assert.equal(j.endpoint, "https://push.example/1");
    assert.deepEqual(j.mute, ["word", "sections", "team"]);
    assert.deepEqual(j.qh, [1320, 360]);
  } finally { await a.close(); }
  const src = read("supabase/functions/notify/index.ts");
  const grab = (name) => src.match(new RegExp(`function ${name}\\(p: any(, sub: any)?\\): \\w+ \\{[\\s\\S]*?\\n\\}\\n`)) || src.match(new RegExp(`function ${name}\\([^)]*\\): \\w+ \\{[\\s\\S]*?\\n\\}\\n`));
  const code = (grab("kindOf")[0] + grab("mutedFor")[0]).replace(/: any|: boolean|: string/g, "");
  const { kindOf, mutedFor } = new Function(code + "; return {kindOf, mutedFor};")();
  assert.equal(kindOf({ open: "feed", title: "New word in Feed" }), "word");
  assert.equal(kindOf({ open: "feed", title: "📨 New request" }), "checkins");
  assert.equal(kindOf({ open: "checkins" }), "checkins");
  assert.equal(kindOf({ open: "dm" }), "messages");
  assert.equal(kindOf({ open: "talk" }), "chat");
  assert.equal(kindOf({ open: "live" }), "sections");
  assert.equal(kindOf({ open: "board", title: "📋 Team update" }), "team");
  assert.equal(kindOf({ open: "board", title: "🔔 Test alert" }), "", "test alerts always arrive");
  const sub = { mute: ["word", "team"] };
  assert.equal(mutedFor(sub, { open: "feed", title: "New word in Feed", help: false }), true);
  assert.equal(mutedFor(sub, { open: "feed", title: "⚠ URGENT: new word", help: true }), false, "urgent always comes through");
  assert.equal(mutedFor(sub, { open: "dm" }), false);
  assert.equal(mutedFor({}, { open: "feed" }), false, "older apps get everything");
  assert.match(src, /if \(mutedFor\(sub, payload\)\) return "ok";/);
  const block = src.slice(src.indexOf("// <aps>"), src.indexOf("// </aps>")).replace(/: any|: boolean/g, "");
  const apsFor = new Function(block + "; return apsFor;")();
  const quiet = apsFor({ title: "1ST updated", body: "x", open: "live", help: false }, false, false);
  assert.equal(quiet["interruption-level"], "passive", "routine updates arrive silently");
  assert.equal(quiet.sound, undefined);
  assert.equal(apsFor({ title: "New word", body: "x", open: "feed" }, false, false).sound, "default", "posts still make a sound");
  assert.equal(apsFor({ title: "🔔 Test alert", body: "x", open: "board" }, false, false).sound, "default");
});
