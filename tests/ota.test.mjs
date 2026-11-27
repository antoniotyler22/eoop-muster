// 4.151.0: store apps download newer code over the air, run it next open, and roll back if it doesn't start.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp } from "./harness.mjs";

const BIG = "/*x*/" + "a".repeat(250000) + "\nwindow.__appReady=true;\n";
const CSS = "body{color:#000}" + "/*c*/".repeat(400);
const mem = () => { let rec = null; return { get: async () => rec, set: async (r) => { rec = r; }, del: async () => { rec = null; }, peek: () => rec }; };
const stubFetch = (w, ver, extra = {}) => (w.fetch = async (u) => {
  const url = String(u);
  if (url.includes("version.json")) return { ok: true, json: async () => ({ v: ver, ...extra }) };
  if (url.includes("app.bundle.js")) return { ok: true, text: async () => extra.js ?? BIG };
  if (url.includes("app.css")) return { ok: true, text: async () => CSS };
  return { ok: false };
});
async function native(bin = "4.151.0") {
  const a = await openApp({ rpc: () => [] });
  const O = a.w.AFOTA; O.native = true; O.bin = bin; O.run = bin; O.store = mem(); O.last = 0;
  return { a, O };
}

test("version compare orders numerically", async () => {
  const { a, O } = await native();
  try { assert.equal(O.cmp("4.151.0", "4.150.9"), 1); assert.equal(O.cmp("4.9.0", "4.10.0"), -1); assert.equal(O.cmp("4.151.0", "4.151.0"), 0); } finally { await a.close(); }
});

test("the website version never uses the downloader", async () => {
  const a = await openApp({ rpc: () => [] });
  try { assert.equal(a.w.AFOTA.native, false); assert.equal(await a.w.AFOTA.check(), "skip"); assert.equal(await a.w.AFOTA.boot(), null); } finally { await a.close(); }
});

test("a newer version is downloaded and kept; the same version is left alone", async () => {
  const { a, O } = await native("4.151.0");
  try {
    stubFetch(a.w, "4.151.0"); assert.equal(await O.check(), "current");
    O.last = 0; stubFetch(a.w, "4.152.0", { nb: "4.151.0" });
    assert.equal(await O.check(), "ready");
    const r = O.store.peek(); assert.equal(r.v, "4.152.0"); assert.ok(r.js.length > 200000);
    assert.equal(O.pending, "4.152.0");
  } finally { await a.close(); }
});

test("opening uses the kept copy only when it is newer, whole, and allowed", async () => {
  const { a, O } = await native("4.151.0");
  try {
    await O.store.set({ v: "4.152.0", nb: "4.151.0", js: BIG, css: CSS });
    assert.equal((await O.boot()).v, "4.152.0");
    await O.store.set({ v: "4.150.0", js: BIG, css: CSS }); assert.equal(await O.boot(), null); assert.equal(O.store.peek(), null, "older copy cleared");
    await O.store.set({ v: "4.152.0", js: "short", css: CSS }); assert.equal(await O.boot(), null, "cut-off download refused");
    await O.store.set({ v: "4.152.0", nb: "4.160.0", js: BIG, css: CSS }); assert.equal(await O.boot(), null, "needs a newer app build");
  } finally { await a.close(); }
});

test("a build too old for the new code waits for a store update; a rejected version isn't retried", async () => {
  const { a, O } = await native("4.151.0");
  try {
    stubFetch(a.w, "4.160.0", { nb: "4.158.0" }); assert.equal(await O.check(), "needs-store-update"); assert.equal(O.store.peek(), null);
    O.last = 0; a.w.localStorage.setItem("eop-ota-bad", "4.160.0"); stubFetch(a.w, "4.160.0"); assert.equal(await O.check(), "bad");
    O.last = 0; stubFetch(a.w, "4.161.0", { js: "tiny" }); assert.equal(await O.check(), "incomplete"); assert.equal(O.store.peek(), null);
  } finally { await a.close(); }
});

test("downloaded code that doesn't start is dropped and marked bad", async () => {
  const { a, O } = await native("4.151.0");
  try {
    let cb; a.w.setTimeout = (f) => { cb = f; return 1; };
    a.w.__appReady = false; await O.store.set({ v: "4.152.0", js: BIG, css: CSS });
    O.apply({ v: "4.152.0", js: "window.__x=1", css: CSS }); assert.equal(a.w.AV, "4.152.0");
    let reloaded = 0; O.reload = () => { reloaded++; }; cb(); await new Promise((r) => setTimeout(r, 20));
    assert.equal(a.w.localStorage.getItem("eop-ota-bad"), "4.152.0"); assert.equal(O.store.peek(), null); assert.equal(reloaded, 1);
  } finally { await a.close(); }
});
