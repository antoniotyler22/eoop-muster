// 4.12: the slim news card on Home (B2): weather, safety alerts and world headlines from the news function.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const HOME = `S.source="mol";S.leaderMode=true;S.welcomed=1;S.onb=true;S.mode="military";S.role="oic";save();view="board";render();`;
const CARDS = [
  { k: "alert", t: "High Surf Advisory", s: "North shores until 6 PM", url: "https://api.weather.gov/alerts/x", at: Date.now() - 3600000, sev: "minor" },
  { k: "wx", t: "78° · Partly cloudy", s: "High 82° · Low 72° · Rain 30%", url: "https://forecast.weather.gov/MapClick.php?lat=21.42&lon=-157.75", at: Date.now() },
  { k: "news", t: "Talks resume in the capital", s: "Reuters", url: "https://example.com/a", at: Date.now() - 7200000 },
];
const until = async (f, n = 60) => { for (let i = 0; i < n && !f(); i++) await sleep(25); };

test("Home shows one slim card under Today; arrows and swipe move through it; the headline opens the story", async () => {
  const calls = [];
  const a = await openApp({ rpc: () => null, fn: (name, body) => { calls.push([name, body]); return { status: 200, body: { cards: CARDS, at: Date.now() } }; } });
  try {
    a.w.eval(HOME);
    await until(() => a.$("#nwCard .nw-t") && !/Loading|No news/.test(a.$("#nwCard .nw-t").textContent));
    assert.equal(calls[0][0], "news");
    assert.deepEqual(calls[0][1], {}, "no location until the person turns it on");
    const sech = [...a.$$(".sech")].find((x) => /^Today/.test(x.textContent.trim()));
    assert.equal(sech.nextElementSibling.nextElementSibling.id, "nwCard", "right under the Today strip");
    assert.match(a.$("#nwCard .nw-t").textContent, /High Surf Advisory/, "alerts come first");
    assert.equal(a.$("#nwCard .nw-n").textContent, "1/3");
    assert.equal(a.$$("#nwCard .nw-dots i").length, 3);
    a.$("[data-nw-next]").click();
    assert.match(a.$("#nwCard .nw-t").textContent, /78°/);
    assert.equal(a.$("#nwCard .nw-n").textContent, "2/3");
    a.$("[data-nw-prev]").click(); a.$("[data-nw-prev]").click();
    assert.equal(a.$("#nwCard .nw-n").textContent, "3/3", "wraps around");
    let opened = "";
    a.w.open = (u) => { opened = u; return null; };
    a.$("[data-nw-open]").click();
    assert.equal(opened, "https://example.com/a");
    const card = a.$("#nwCard");
    const T = (type, x) => card.dispatchEvent(new a.w.TouchEvent(type, { bubbles: true, touches: [{ clientX: x }], changedTouches: [{ clientX: x }] }));
    T("touchstart", 200); T("touchend", 100);
    assert.equal(a.$("#nwCard .nw-n").textContent, "1/3", "swipe left goes forward");
    assert.equal(calls.length, 1, "one fetch; the answer is kept for 10 minutes");
  } finally { a.close(); }
});

test("turning on location sends it rounded; hiding the card and bringing it back from Tools", async () => {
  const calls = [];
  const a = await openApp({ rpc: () => null, fn: (name, body) => { calls.push(body); return { status: 200, body: { cards: CARDS, at: Date.now() } }; } });
  try {
    a.w.eval(HOME);
    await until(() => calls.length >= 1);
    Object.defineProperty(a.w.navigator, "geolocation", { value: { getCurrentPosition: (ok) => setTimeout(() => ok({ coords: { latitude: 21.42134, longitude: -157.75128 } }), 5) }, configurable: true });
    a.$("[data-nw-menu]").click();
    a.$("#nwLoc").click();
    await until(() => calls.length >= 2);
    assert.deepEqual(calls[1], { lat: 21.42, lon: -157.75 }, "rounded to about 1 km");
    assert.deepEqual(a.w.eval("JSON.stringify(S.news.loc)") && JSON.parse(a.w.eval("JSON.stringify(S.news.loc)")), { lat: 21.42, lon: -157.75 });
    a.$("[data-nw-menu]").click();
    a.$("#nwOff").click();
    assert.ok(!a.$("#nwCard"), "hidden");
    a.w.eval(`view="tools";render()`);
    if (!a.$("#nwOn")) a.w.eval(`openToolGroup("settings")`);
    assert.ok(a.$("#nwOn"), "switch in Tools → Settings");
    a.$("#nwOn").click();
    await until(() => a.$("#nwCard"));
    assert.ok(a.$("#nwCard"), "back on Home");
  } finally { a.close(); }
});

test("without the news function the card says so instead of breaking Home", async () => {
  const a = await openApp({ rpc: () => null, fn: () => ({ status: 404, body: "not found" }) });
  try {
    a.w.eval(HOME);
    await until(() => a.$("#nwCard .nw-t") && /set up/.test(a.$("#nwCard .nw-t").textContent));
    if (!/set up/.test(a.$("#nwCard .nw-t").textContent)) { await a.w.eval("newsLoad(true)"); }
    assert.match(a.$("#nwCard .nw-t").textContent, /isn't set up/);
    assert.ok(a.$(".hero"), "the rest of Home is fine");
    assert.deepEqual(a.errors, []);
  } finally { a.close(); }
});
