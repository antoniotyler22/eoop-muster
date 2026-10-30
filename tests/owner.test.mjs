// 4.13: the app owner. Console, announcement banner, switches, and the owner's login on the normal Sign in screen.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const HOME = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.mode="military";S.role="oic";S.tos=typeof TERMS_VER!=="undefined"?TERMS_VER:1;save();view="board";render();`;
const until = async (f, n = 80) => { for (let i = 0; i < n && !f(); i++) await sleep(25); };
// a fresh phone shows the first-run welcome on a timer; let it come and go before using the Sign in sheet
const settle = async (a) => { await sleep(1700); a.w.eval(`if(typeof hideWelcome==="function")hideWelcome();closeSheet();`); await sleep(300); };
const TOK = (Date.now() + 3600000) + ".abc";

test("the owner's username and password work on the normal Sign in screen and open the console", async () => {
  const calls = [];
  const a = await openApp({ rpc: (fn) => (fn === "login_get" ? [] : null), fn: (name, body) => { calls.push([name, body]); if (name !== "owner") return { status: 404, body: "x" };
    if (body.op === "login") return body.user === "tonybeso" && body.pass === "pw" ? { status: 200, body: { tok: TOK, exp: Date.now() + 3600000 } } : { status: 401, body: { error: "Username or password is wrong." } };
    if (body.op === "stats") return { status: 200, body: { feeds: 12, boards: 3, recOpen: 1, recalls: 9, pro: 2, comps: 1, at: Date.now() } };
    if (body.op === "cfg") return { status: 200, body: { cfg: { announce: "", ask_off: false, news_off: false } } };
    return { status: 200, body: {} }; } });
  try {
    a.w.eval(HOME); await settle(a); a.w.eval(`lgSignSheet();`);
    a.$("#lgSU").value = "Tonybeso"; a.$("#lgSP").value = "nope";
    await a.w.eval("lgSignIn(document.querySelector('#lgGo'))");
    await until(() => /wrong/.test(a.$("#lgSOut").textContent));
    assert.match(a.$("#lgSOut").textContent, /wrong/);
    assert.equal(a.w.eval("ownerOn()"), false);
    a.$("#lgSP").value = "pw";
    await a.w.eval("lgSignIn(document.querySelector('#lgGo'))");
    await until(() => a.w.eval("view") === "owner");
    assert.equal(a.w.eval("view"), "owner");
    assert.equal(a.w.eval("ownerOn()"), true);
    assert.equal(a.$("#lgSP").value, "", "password cleared from the field");
    await until(() => /12/.test(a.$("#main").textContent));
    assert.match(a.$("#main").textContent, /TEAMS \(FEEDS\)[\s\S]*12/);
    assert.match(a.$("#main").textContent, /encrypted on phones/);
    assert.ok(calls.some(([n, b]) => n === "owner" && b.op === "stats" && b.tok === TOK), "calls carry the token");
    a.w.eval(`view="tools";render()`);
    if (!a.$("[data-go=owner]")) a.w.eval(`openToolGroup("settings")`);
    assert.match(a.$("[data-go=owner]").textContent, /Signed in/);
    a.w.eval("closeSheet()");
    a.w.eval(`view="owner";render()`);
    a.$("#owOut").click();
    assert.equal(a.w.eval("ownerOn()"), false);
    assert.equal(a.w.eval("view"), "tools");
  } finally { a.close(); }
});

test("announcement and switches: posted from the console, shown on every phone with OK, Ask and news turned off", async () => {
  let cfg = { announce: "", announce_url: "", announce_at: null, ask_off: false, news_off: false };
  const a = await openApp({ rpc: (fn) => (fn === "app_cfg_get" ? [cfg] : null), fn: (name, body) => {
    if (name === "news") return { status: 200, body: { cards: [{ k: "news", t: "A", s: "x", at: Date.now() }], at: Date.now() } };
    if (name !== "owner") return { status: 404, body: "x" };
    if (body.op === "setcfg") { if (typeof body.announce === "string") { cfg.announce = body.announce; cfg.announce_at = body.announce ? new Date().toISOString() : null; } if (typeof body.ask_off === "boolean") cfg.ask_off = body.ask_off; if (typeof body.news_off === "boolean") cfg.news_off = body.news_off; return { status: 200, body: { cfg } }; }
    if (body.op === "stats") return { status: 200, body: {} }; if (body.op === "cfg") return { status: 200, body: { cfg } }; return { status: 200, body: {} }; } });
  try {
    a.w.eval(`localStorage.setItem("af-owner",JSON.stringify({tok:"${TOK}",exp:${Date.now() + 3600000}}));` + HOME);
    await until(() => a.$("#nwCard"));
    assert.ok(a.$("#nwCard"), "news card on before the switch");
    a.w.eval(`view="owner";render()`);
    a.$("[data-owtab=ann]").click();
    a.$("#owAnn").value = "Maintenance tonight 2200-2300.";
    a.$("#owAnnPost").click();
    await until(() => cfg.announce);
    a.$("#owAsk").checked = true; a.$("#owAsk").dispatchEvent(new a.w.Event("change", { bubbles: true }));
    await until(() => cfg.ask_off);
    a.$("#owNews").checked = true; a.$("#owNews").dispatchEvent(new a.w.Event("change", { bubbles: true }));
    await until(() => cfg.news_off);
    // another phone pulls the settings
    await a.w.eval("appCfgPull(true)");
    a.w.eval(`view="board";render()`);
    assert.match(a.$("#annBan").textContent, /Maintenance tonight/);
    assert.ok(!a.$("#nwCard"), "news card hidden by the owner");
    assert.ok(!a.$('[data-go="ask"]'), "Ask button gone");
    a.w.eval(`view="ask";render()`);
    assert.match(a.$("#main").textContent, /turned off by the app owner/);
    a.w.eval(`view="board";render()`);
    a.$("#annOk").click();
    assert.ok(!a.$("#annBan"), "dismissed");
    a.w.eval("render()");
    assert.ok(!a.$("#annBan"), "stays dismissed");
    cfg.announce = "New word"; cfg.announce_at = new Date(Date.now() + 1000).toISOString();
    await a.w.eval("appCfgPull(true)");
    a.w.eval("render()");
    assert.match(a.$("#annBan").textContent, /New word/, "a new announcement shows again");
  } finally { a.close(); }
});

test("removing by id asks twice; a Pro comp shows the code once", async () => {
  const ops = [];
  const a = await openApp({ rpc: () => null, fn: (name, body) => { if (name !== "owner") return { status: 404, body: "x" }; ops.push(body);
    if (body.op === "remove") return { status: 200, body: { removed: 1 } };
    if (body.op === "comp") return { status: 200, body: { id: "stripe:comp_abcdefghijkl", code: "c".repeat(64), exp: new Date(Date.now() + 864e5).toISOString() } };
    if (body.op === "comps") return { status: 200, body: { rows: [{ id: "stripe:comp_abcdefghijkl", product: "pro.comp:1st plt", expires_at: new Date(Date.now() + 864e5).toISOString(), revoked: false, created_at: new Date().toISOString() }] } };
    return { status: 200, body: { cfg: {} } }; } });
  try {
    a.w.eval(`localStorage.setItem("af-owner",JSON.stringify({tok:"${TOK}",exp:${Date.now() + 3600000}}));` + HOME + `view="owner";render()`);
    a.$("[data-owtab=mod]").click();
    a.$("#owKind").value = "feed"; a.$("#owId").value = "feedabcdef12";
    a.$("#owRemove").click();
    assert.match(a.$("#owRemove").textContent, /Tap again/);
    assert.ok(!ops.some((o) => o.op === "remove"), "not yet");
    a.$("#owRemove").click();
    await until(() => ops.some((o) => o.op === "remove"));
    assert.deepEqual(ops.find((o) => o.op === "remove"), { tok: TOK, op: "remove", kind: "feed", id: "feedabcdef12" });
    a.$("[data-owtab=pro]").click();
    await until(() => a.$("#owComp"));
    a.$("#owNote").value = "1st plt";
    a.$("#owComp").click();
    await until(() => new RegExp("c".repeat(64)).test(a.$("#main").textContent));
    assert.match(a.$("#main").textContent, new RegExp("c".repeat(64)));
    assert.match(a.$("#main").textContent, /1st plt/);
    assert.ok(a.$("[data-owend]"), "can end it");
  } finally { a.close(); }
});

test("2-step: the Sign in screen asks for the code, then opens the console; Security tab changes the password and signs out everywhere", async () => {
  const ops = [];
  const a = await openApp({ rpc: (fn) => (fn === "login_get" ? [] : null), fn: (name, body) => { if (name !== "owner") return { status: 404, body: "x" }; ops.push(body);
    if (body.op === "login") { if (body.pass !== "pw") return { status: 401, body: { error: "wrong" } }; if (!body.code) return { status: 200, body: { need: "code" } }; return body.code === "246810" ? { status: 200, body: { tok: TOK, exp: Date.now() + 3600000 } } : { status: 401, body: { error: "That code isn't right." } }; }
    if (body.op === "ping") return { status: 200, body: { ok: 1, totp: true, p30: true } };
    if (body.op === "setpass") return body.cur === "pw" && body.next.length >= 12 ? { status: 200, body: { tok: "9".repeat(13) + ".new", exp: Date.now() + 3600000 } } : { status: 401, body: { error: "The current password is wrong." } };
    if (body.op === "alerts") return { status: 200, body: { state: "ok", owner: false, phones: 41 } };
    if (body.op === "health") return { status: 200, body: { h: { cron: [{ name: "accounted-for-hub", schedule: "* * * * *", active: true, last: new Date().toISOString(), status: "succeeded" }], calls: { n: 40, bad: 0, n1h: 3, bad1h: 0, last: new Date().toISOString() }, fails: [], queue: { n: 0, ready: 0, retried: 0, oldest: null }, hubs: { n: 1, err: 0, last: new Date().toISOString(), saved: null, errs: [] }, crash: { h1: 0, h24: 1, d7: 4, vers: { "4.13.0": 4 }, plats: { ios: 4 } }, db: { bytes: 42 * 1048576, tables: [{ t: "feed_posts", b: 20 * 1048576 }] }, ask: { today: 2, d7: 9 }, at: new Date().toISOString() } } };
    return { status: 200, body: { cfg: {}, rows: [] } }; } });
  try {
    a.w.eval(HOME); await settle(a); a.w.eval(`lgSignSheet();`);
    a.$("#lgSU").value = "tonybeso"; a.$("#lgSP").value = "pw";
    await a.w.eval("lgSignIn(document.querySelector('#lgGo'))");
    await until(() => a.$("#lgCode"));
    assert.ok(a.$("#lgCode"), "asks for the 2-step code");
    assert.equal(a.$("#lgSP").value, "", "password cleared while waiting for the code");
    a.$("#lgCode").value = "000000";
    await a.w.eval("lgSignIn(document.querySelector('#lgGo'))");
    await until(() => /isn't right/.test(a.$("#lgSOut").textContent));
    a.$("#lgCode").value = "246810";
    await a.w.eval("lgSignIn(document.querySelector('#lgGo'))");
    await until(() => a.w.eval("view") === "owner");
    assert.equal(a.w.eval("ownerOn()"), true);
    assert.deepEqual(ops.filter((o) => o.op === "login").map((o) => o.code || ""), ["", "000000", "246810"]);
    // Health
    a.$("[data-owtab=health]").click();
    await until(() => /Scheduled jobs/.test(a.$("#main").textContent));
    assert.match(a.$("#main").textContent, /✅ Scheduled jobs · 1[\s\S]*✅ Server calls[\s\S]*42 MB of 500 MB/);
    assert.match(a.$("#main").textContent, /Alerts going out[\s\S]*NOT set to be warned[\s\S]*41 phones have alerts on/);
    // Security: change password
    a.$("[data-owtab=sec]").click();
    await until(() => a.$("#owPass"));
    assert.match(a.$("#main").textContent, /2-step sign-in · on/);
    a.$("#owCur").value = "pw"; a.$("#owNew").value = "a-much-longer-password"; a.$("#owNew2").value = "different";
    a.$("#owPass").click();
    assert.ok(!ops.some((o) => o.op === "setpass"), "mismatched passwords never leave the phone");
    a.$("#owNew2").value = "a-much-longer-password";
    a.$("#owPass").click();
    await until(() => ops.some((o) => o.op === "setpass"));
    await sleep(50);
    assert.equal(JSON.parse(a.w.eval(`localStorage.getItem("af-owner")`)).tok, "9".repeat(13) + ".new", "this phone keeps a fresh token");
    // sign out everywhere
    a.$("#owAllOut").click();
    assert.match(a.$("#owAllOut").textContent, /Tap again/);
    a.$("#owAllOut").click();
    await until(() => ops.some((o) => o.op === "signoutall"));
    assert.equal(a.w.eval("ownerOn()"), false);
  } finally { a.close(); }
});
