// Supabase Edge Function "billing": Pro on the web through Stripe. Records go in the same table as Apple's (SQL part 20),
// so a web subscriber gets the same team token and the same server features (Ask, server hub).
// Turn OFF "Enforce JWT verification". Secrets:
//   STRIPE_SECRET_KEY        sk_live_... (or sk_test_... while testing)
//   STRIPE_PRICE_MONTHLY     price_... for $4.99/month
//   STRIPE_PRICE_YEARLY      price_... for $39.99/year
//   STRIPE_WEBHOOK_SECRET    whsec_... from Stripe → Developers → Webhooks → add endpoint
//                            https://<project>.supabase.co/functions/v1/billing  with events
//                            customer.subscription.created, customer.subscription.updated, customer.subscription.deleted
//   PRO_SECRET               same value as the "pro" function (team tokens must match)
//   STRIPE_PORTAL_LOGIN_URL  Stripe → Settings → Billing → Customer portal → "Login link" (https://billing.stripe.com/p/login/...)
// Optional: STRIPE_TRIAL_DAYS (default 7), APP_URLS (comma list of pages allowed as return links;
//           default https://antoniotyler22.github.io/eoop-muster/).
// Then set webBilling:true in index.html.

const D = (globalThis as any).Deno;
const env = (k: string, d = "") => (D?.env.get(k) ?? d) || d;
const URL0 = env("SUPABASE_URL"), SRK = env("SUPABASE_SERVICE_ROLE_KEY");
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, content-type, authorization, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
const te = new TextEncoder();
const hex = (u: Uint8Array) => Array.from(u, (x) => x.toString(16).padStart(2, "0")).join("");
const sha256hex = async (s: string) => hex(new Uint8Array(await crypto.subtle.digest("SHA-256", te.encode(s))));
export async function teamToken(entId: string, secret: string) {
  const k = await crypto.subtle.importKey("raw", te.encode("accounted-for-pro:" + secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(new Uint8Array(await crypto.subtle.sign("HMAC", k, te.encode(entId))));
}

/** Stripe-Signature check (HMAC-SHA256 over "t.body", 5-minute window). */
export async function stripeSigOK(raw: string, header: string, secret: string, now = Date.now()) {
  const parts = Object.fromEntries(String(header || "").split(",").map((p) => p.split("=")).filter((p) => p.length === 2).map(([k, v]) => [k.trim(), v.trim()]));
  const sigs = String(header || "").split(",").filter((p) => p.trim().startsWith("v1=")).map((p) => p.trim().slice(3));
  const t = Number(parts.t);
  if (!t || !sigs.length || !secret || Math.abs(now / 1000 - t) > 300) return false;
  const k = await crypto.subtle.importKey("raw", te.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const want = hex(new Uint8Array(await crypto.subtle.sign("HMAC", k, te.encode(t + "." + raw))));
  const same = (a: string, b: string) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
  return sigs.some((s) => same(s, want));
}

/** Turns a Stripe subscription object into a pro_ents row. */
export function stripeRow(sub: any) {
  if (!sub || typeof sub.id !== "string" || !/^sub_[A-Za-z0-9]+$/.test(sub.id)) return null;
  const item = sub.items && sub.items.data && sub.items.data[0];
  const end = sub.current_period_end ?? (item && item.current_period_end) ?? sub.trial_end ?? null;
  const dead = ["canceled", "unpaid", "incomplete_expired", "incomplete"].includes(sub.status);
  const endedAt = sub.ended_at ? sub.ended_at * 1000 : 0;
  return {
    id: "stripe:" + sub.id, source: "stripe",
    product: String((item && item.price && item.price.id) || "stripe").slice(0, 120),
    expires_at: dead ? new Date(endedAt || Date.now()).toISOString() : end ? new Date(end * 1000).toISOString() : null,
    revoked: sub.status === "incomplete_expired" || sub.status === "unpaid",
    env: sub.livemode === false ? "test" : "live",
    cust: typeof sub.customer === "string" ? sub.customer.slice(0, 80) : sub.customer && sub.customer.id ? String(sub.customer.id).slice(0, 80) : null,
    signed_at: new Date().toISOString(), // always read fresh from Stripe, so the latest read wins
  };
}

async function stripe(path: string, form?: Record<string, string>) {
  const r = await fetch("https://api.stripe.com/v1/" + path, {
    method: form ? "POST" : "GET",
    headers: { Authorization: "Bearer " + env("STRIPE_SECRET_KEY"), ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
    body: form ? new URLSearchParams(form).toString() : undefined,
  });
  const j = await r.json();
  if (!r.ok) throw new Error((j && j.error && j.error.message) || "Stripe error " + r.status);
  return j;
}
function hdrs(extra: Record<string, string> = {}) {
  const h: Record<string, string> = { apikey: SRK, "Content-Type": "application/json", ...extra };
  if (SRK.startsWith("eyJ")) h.Authorization = "Bearer " + SRK;
  return h;
}
async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(URL0 + "/rest/v1/" + path, { ...init, headers: hdrs((init.headers as Record<string, string>) ?? {}) });
  const t = await r.text();
  if (!r.ok) throw new Error((() => { try { return JSON.parse(t).message; } catch { return t; } })() || "HTTP " + r.status);
  return t ? JSON.parse(t) : null;
}
const secret = () => env("PRO_SECRET") || SRK;
async function save(row: any) {
  const tok = await teamToken(row.id, secret());
  await rest("pro_ents?on_conflict=id", { method: "POST", body: JSON.stringify({ ...row, tok_hash: await sha256hex(tok), updated_at: new Date().toISOString() }), headers: { Prefer: "resolution=merge-duplicates,return=minimal" } });
  const live = row.env !== "test";
  const active = !row.revoked && (row.expires_at ? Date.parse(row.expires_at) > Date.now() - (live ? 864e5 : 0) : live);
  return { tok, active, exp: row.expires_at ? Date.parse(row.expires_at) : 0 };
}
export function backOK(u: unknown, allowed: string[]) {
  if (typeof u !== "string") return null;
  try { const x = new URL(u); const base = x.origin + x.pathname.replace(/index\.html$/, ""); return allowed.includes(base) ? base : null; } catch { return null; }
}
/** Only subscriptions to the Pro prices count (the Stripe account might sell other things). */
export function isProSub(sub: any, prices: string[]) {
  const items = (sub && sub.items && sub.items.data) || [];
  return items.some((it: any) => it && it.price && prices.includes(it.price.id));
}
const proPrices = () => [env("STRIPE_PRICE_MONTHLY"), env("STRIPE_PRICE_YEARLY")].filter(Boolean);

export async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const raw = await req.text();
  try {
    // Stripe webhook
    const sigH = req.headers.get("stripe-signature");
    if (sigH) {
      if (!(await stripeSigOK(raw, sigH, env("STRIPE_WEBHOOK_SECRET")))) return json({ error: "bad signature" }, 400);
      const ev = JSON.parse(raw);
      const id = ev && ev.data && ev.data.object && ev.data.object.id;
      if (/^customer\.subscription\./.test(ev.type) && typeof id === "string" && /^sub_[A-Za-z0-9]+$/.test(id)) {
        // Events can arrive out of order: read the subscription as it is now instead of trusting the event.
        const sub = await stripe("subscriptions/" + id);
        if (isProSub(sub, proPrices())) { const row = stripeRow(sub); if (row) await save(row); }
      }
      return json({ ok: 1 });
    }
    let b: any = {};
    try { b = raw ? JSON.parse(raw) : {}; } catch { return json({ error: "bad request" }, 400); }
    if (b.ping) return json({ ok: 1, billing: 1, key: !!env("STRIPE_SECRET_KEY"), prices: !!(env("STRIPE_PRICE_MONTHLY") && env("STRIPE_PRICE_YEARLY")), hook: !!env("STRIPE_WEBHOOK_SECRET") });
    if (!env("STRIPE_SECRET_KEY")) return json({ error: "Web billing isn't set up yet." }, 503);
    const allowed = env("APP_URLS", "https://antoniotyler22.github.io/eoop-muster/").split(",").map((s) => s.trim()).filter(Boolean);
    if (b.op === "checkout") {
      const price = b.plan === "monthly" ? env("STRIPE_PRICE_MONTHLY") : env("STRIPE_PRICE_YEARLY");
      const back = backOK(b.back, allowed) ?? allowed[0];
      if (!price) return json({ error: "Web billing isn't set up yet." }, 503);
      const form: Record<string, string> = {
        mode: "subscription", "line_items[0][price]": price, "line_items[0][quantity]": "1",
        success_url: back + "#pro_ok={CHECKOUT_SESSION_ID}", cancel_url: back + "#tools", allow_promotion_codes: "true",
      };
      const trial = Number(env("STRIPE_TRIAL_DAYS", "7"));
      if (trial > 0) form["subscription_data[trial_period_days]"] = String(Math.min(trial, 30));
      const s = await stripe("checkout/sessions", form);
      return json({ url: s.url });
    }
    if (b.op === "claim") {
      if (typeof b.session !== "string" || !/^cs_[A-Za-z0-9_]{10,200}$/.test(b.session)) return json({ error: "bad request" }, 400);
      const s = await stripe("checkout/sessions/" + b.session + "?expand[]=subscription");
      if (s.status !== "complete" || !s.subscription) return json({ error: "Payment isn't complete yet." }, 409);
      const sub = typeof s.subscription === "string" ? await stripe("subscriptions/" + s.subscription) : s.subscription;
      if (!isProSub(sub, proPrices())) return json({ error: "That isn't a Pro subscription." }, 400);
      const row = stripeRow(sub);
      if (!row) return json({ error: "No subscription found." }, 404);
      return json(await save(row));
    }
    if (b.op === "portal") {
      // Managing billing shows the payer's email and card, so it goes through Stripe's own sign-in (an emailed code),
      // not the Pro code (which leaders share with other devices).
      const login = env("STRIPE_PORTAL_LOGIN_URL");
      if (!login || !/^https:\/\/billing\.stripe\.com\//.test(login)) return json({ error: "Manage subscription isn't set up yet. Email Antoniotyler22@gmail.com." }, 503);
      return json({ url: login });
    }
    return json({ error: "bad request" }, 400);
  } catch (e) {
    const t = String((e as Error).message || e);
    if (/pro_ents|schema cache|does not exist/i.test(t)) return json({ error: "Pro isn't set up on the server yet. Run SQL part 20." }, 503);
    console.error("billing:", t);
    return json({ error: "Something went wrong on the server. Try again in a minute." }, 500);
  }
}

if (D?.serve) D.serve(handle);
