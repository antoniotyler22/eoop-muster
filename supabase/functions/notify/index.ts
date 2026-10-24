// Supabase Edge Function "notify": push alerts to the leader's phone.
//  {recall}: after a live recall check-in.  {board}: after a section leader's live update.  {feed, lk, urg}: after a FEED post.
//  {alert, feed, mk}: a member's request or problem report, to the OIC.
// Payloads carry no names. Turn OFF "Enforce JWT verification" (the function validates input itself).
// Secrets: VAPID_PUBLIC, VAPID_PRIVATE (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are built in).
// iPhone app (optional): APNS_KEY (the .p8 file contents), APNS_KEY_ID, APNS_TEAM_ID, APNS_TOPIC (bundle id; default com.antoniotyler.accountedfor).
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, content-type, authorization, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
webpush.setVapidDetails("mailto:antoniotyler22@gmail.com", Deno.env.get("VAPID_PUBLIC")!, Deno.env.get("VAPID_PRIVATE")!);
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const out = (t: string, status = 200) => new Response(t, { status, headers: cors });

// ---- Apple push (iPhone app). A subscription from the app looks like {apns: "<device token>"}. ----
let apnsJwt = "", apnsAt = 0;
const b64url = (b: ArrayBuffer | Uint8Array | string) => btoa(typeof b === "string" ? b : String.fromCharCode(...new Uint8Array(b as ArrayBuffer))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function apnsToken(): Promise<string> {
  if (apnsJwt && Date.now() - apnsAt < 50 * 60000) return apnsJwt;
  const pem = (Deno.env.get("APNS_KEY") ?? "").replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  if (!pem) throw new Error("no apns key");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const head = b64url(JSON.stringify({ alg: "ES256", kid: Deno.env.get("APNS_KEY_ID") ?? "" }));
  const body = b64url(JSON.stringify({ iss: Deno.env.get("APNS_TEAM_ID") ?? "", iat: Math.floor(Date.now() / 1000) }));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(head + "." + body));
  apnsJwt = head + "." + body + "." + b64url(sig); apnsAt = Date.now(); return apnsJwt;
}
// Returns "ok", "gone" (token no longer valid: remove it) or "fail".
async function apnsSend(token: string, p: Record<string, unknown>, urgent: boolean): Promise<string> {
  try {
    const host = Deno.env.get("APNS_SANDBOX") === "1" ? "api.sandbox.push.apple.com" : "api.push.apple.com";
    const r = await fetch(`https://${host}/3/device/${token}`, {
      method: "POST",
      headers: { authorization: "bearer " + await apnsToken(), "apns-topic": Deno.env.get("APNS_TOPIC") || "com.antoniotyler.accountedfor", "apns-push-type": "alert", "apns-priority": urgent ? "10" : "5", "content-type": "application/json" },
      body: JSON.stringify({ aps: { alert: { title: p.title, body: p.body }, sound: "default", "interruption-level": urgent ? "time-sensitive" : "active" }, open: p.open }),
    });
    if (r.ok) return "ok";
    return r.status === 410 || r.status === 400 ? "gone" : "fail";
  } catch { return "fail"; }
}
// deno-lint-ignore no-explicit-any
async function pushAny(sub: any, payload: Record<string, unknown>, urgent: boolean, ttl: number): Promise<string> {
  if (sub && typeof sub.apns === "string") return apnsSend(sub.apns, payload, urgent);
  try { await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: ttl, urgency: urgent ? "high" : "normal" }); return "ok"; }
  catch (e) { const c = (e as { statusCode?: number }).statusCode; return c === 404 || c === 410 ? "gone" : "fail"; }
}

// deno-lint-ignore no-explicit-any
async function send(table: string, id: string, sub: any, payload: Record<string, unknown>, urgent: boolean) {
  const r = await pushAny(sub, payload, urgent, 3600);
  if (r === "gone") await db.from(table).update({ push_sub: null }).eq("id", id);
  return out(r === "ok" ? "sent" : "push failed");
}

async function recall(id: string) {
  const { data: r } = await db.from("recalls").select("push_sub,last_push_id,expires_at").eq("id", id).maybeSingle();
  if (!r || !r.push_sub || new Date(r.expires_at) < new Date()) return out("no sub");
  const { data: rows } = await db.from("checkins").select("id,code").eq("recall_id", id)
    .gt("id", r.last_push_id ?? 0).order("id", { ascending: true }).limit(200);
  if (!rows || !rows.length) return out("nothing new");
  const { data: claimed } = await db.from("recalls").update({ last_push_id: rows[rows.length - 1].id })
    .eq("id", id).eq("last_push_id", r.last_push_id ?? 0).select("id");
  if (!claimed || !claimed.length) return out("already sent");
  const help = rows.filter((x) => x.code === 3).length, n = rows.length;
  const payload = help
    ? { title: "⚠ NEED HELP", body: help === 1 ? "Someone needs help. Open the recall." : help + " people need help. Open the recall.", help: true, open: "recall" }
    : { title: n === 1 ? "New check-in" : n + " new check-ins", body: "Open the recall to see who.", help: false, open: "recall" };
  return send("recalls", id, r.push_sub, payload, help > 0);
}

async function board(id: string) {
  const { data: b } = await db.from("boards").select("push_sub,last_push_id,last_push_at").eq("id", id).maybeSingle();
  if (!b || !b.push_sub) return out("no sub");
  // At most one alert a minute per board; later updates roll into the next alert.
  if (b.last_push_at && Date.now() - new Date(b.last_push_at).getTime() < 60000) return out("throttled");
  const { data: rows } = await db.from("board_updates").select("id,sec").eq("board_id", id)
    .gt("id", b.last_push_id ?? 0).order("id", { ascending: true }).limit(100);
  if (!rows || !rows.length) return out("nothing new");
  const { data: claimed } = await db.from("boards").update({ last_push_id: rows[rows.length - 1].id, last_push_at: new Date().toISOString() })
    .eq("id", id).eq("last_push_id", b.last_push_id ?? 0).select("id");
  if (!claimed || !claimed.length) return out("already sent");
  const secs = [...new Set(rows.map((x) => x.sec))];
  const payload = { title: secs.join(", ") + (secs.length === 1 ? " updated" : " updated"), body: "Open your board to see the numbers.", help: false, open: "live" };
  return send("boards", id, b.push_sub, payload, false);
}

async function feed(id: string, lk: string, urg: boolean) {
  const { data: f } = await db.from("feeds").select("*").eq("id", id).maybeSingle();
  if (!f) return out("no feed");
  const dig = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(lk)));
  const hex = Array.from(dig).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex !== f.leader_key_hash && !(f.poster_key_hash && hex === f.poster_key_hash)) return out("not allowed", 403);
  const { data: p } = await db.from("feed_posts").select("id").eq("feed_id", id).order("id", { ascending: false }).limit(1).maybeSingle();
  if (!p || p.id <= (f.last_push_id ?? 0)) return out("nothing new");
  const { data: claimed } = await db.from("feeds").update({ last_push_id: p.id })
    .eq("id", id).eq("last_push_id", f.last_push_id ?? 0).select("id");
  if (!claimed || !claimed.length) return out("already sent");
  const { data: subs } = await db.from("feed_subs").select("id,sub").eq("feed_id", id).limit(500);
  const payload = urg
    ? { title: "⚠ URGENT: new word", body: "Open FEED to read it and tap Got it.", help: true, open: "feed" }
    : { title: "New word in FEED", body: "Open FEED to read it and tap Got it.", help: false, open: "feed" };
  const dead: number[] = [];
  await Promise.allSettled((subs ?? []).map(async (s) => {
    if (await pushAny(s.sub, payload, urg, 86400) === "gone") dead.push(s.id);
  }));
  if (dead.length) await db.from("feed_subs").delete().in("id", dead);
  return out("sent " + ((subs?.length ?? 0) - dead.length));
}

// {alert: "req"|"prob", feed, mk}: a member sent a request or reported a problem; buzz the OIC (at most every 15 s).
async function alertOic(id: string, mk: string, kind: string) {
  const { data: f } = await db.from("feeds").select("*").eq("id", id).maybeSingle();
  if (!f || !f.leader_sub) return out("no sub");
  const dig = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(mk)));
  const hex = Array.from(dig).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex !== f.member_key_hash) return out("not allowed", 403);
  if (f.leader_push_at && Date.now() - new Date(f.leader_push_at).getTime() < 15000) return out("throttled");
  await db.from("feeds").update({ leader_push_at: new Date().toISOString() }).eq("id", id);
  const payload = kind === "prob"
    ? { title: "⚠ Problem reported", body: "Someone flagged a problem with a FEED post. Open FEED to see who.", help: true, open: "feed" }
    : { title: "📨 New request", body: "Someone sent a leave, liberty or appointment request. Open FEED to approve.", help: false, open: "feed" };
  const r = await pushAny(f.leader_sub, payload, kind === "prob", 86400);
  if (r === "gone") await db.from("feeds").update({ leader_sub: null }).eq("id", id);
  return out(r === "ok" ? "sent" : "push failed");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return out("ok");
  if (req.method !== "POST") return out("method", 405);
  let body: { recall?: unknown; board?: unknown; feed?: unknown; lk?: unknown; urg?: unknown; alert?: unknown; mk?: unknown } = {};
  try { body = await req.json(); } catch { return out("bad", 400); }
  if ((body.alert === "req" || body.alert === "prob") && typeof body.feed === "string" && /^[a-z0-9]{10,20}$/.test(body.feed) && typeof body.mk === "string" && /^[a-z0-9]{24,40}$/.test(body.mk))
    return alertOic(body.feed, body.mk, body.alert);
  if (typeof body.recall === "string" && /^[a-z0-9]{8,16}$/.test(body.recall)) return recall(body.recall);
  if (typeof body.board === "string" && /^[a-z0-9]{10,20}$/.test(body.board)) return board(body.board);
  if (typeof body.feed === "string" && /^[a-z0-9]{10,20}$/.test(body.feed) && typeof body.lk === "string" && /^[a-z0-9]{24,40}$/.test(body.lk))
    return feed(body.feed, body.lk, body.urg === true);
  return out("bad", 400);
});
