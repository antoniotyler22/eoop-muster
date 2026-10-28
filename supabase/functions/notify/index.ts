// Supabase Edge Function "notify": push alerts to the leader's phone.
//  {recall}: after a live recall check-in.  {board}: after a section leader's live update.  {feed, lk, urg}: after a Feed post.
//  {team, k, what, skip}: something on the team changed (roster, statuses, calendar, duty). Every phone on the team's
//    alert list gets "Team update" (at most one every 90 s per team). k is the team Feed's member or leader key.
//  {alert, feed, mk}: a member's request or problem report, to the OIC.  {escalate:1}: missed check-in deadlines (pg_cron, part 22).
//  {recall|board, hook:1}: sent by the database itself after a check-in or board update (part 27), so alerts go out
//    even when the sender's phone loses signal right after saving.
//  {drain:1}: pg_cron (part 27) while the "push" queue has work. Handles Feed posts queued by the database
//    ({kind:"feed"}) and retries of alerts that failed ({kind:"retry"}: 30 s, 1, 2, 4, 8 min, then dropped).
//  4.10.1
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

// ---- Retry queue (part 27). A failed push (phone service down, rate limit, network) is put back on the "push"
// queue with only the row it belongs to and the alert text, never the phone's address: the retry reads the
// current subscription again, so a phone that re-subscribed in the meantime still gets it.
type Target = "recalls" | "boards" | "leader" | "sub";
const MAX_TRIES = 5;
const backoff = (n: number) => Math.min(3600, 30 * 2 ** n);
async function queueRetry(t: Target, id: string | number, p: Record<string, unknown>, u: boolean, ttl: number, n = 0, at = Date.now()) {
  if (n >= MAX_TRIES || Date.now() - at > ttl * 1000) return false;
  const { error } = await db.rpc("push_q_send", { p_msg: { kind: "retry", t, id, p, u, ttl, n, at }, p_delay: backoff(n) });
  return !error;
}

// deno-lint-ignore no-explicit-any
async function send(table: "recalls" | "boards", id: string, sub: any, payload: Record<string, unknown>, urgent: boolean) {
  const r = await pushAny(sub, payload, urgent, 3600);
  if (r === "gone") await db.from(table).update({ push_sub: null }).eq("id", id);
  if (r === "fail" && await queueRetry(table, id, payload, urgent, 3600)) return out("push failed, will retry");
  return out(r === "ok" ? "sent" : "push failed");
}

// Sends one alert to every phone on a team list; failed ones go to the retry queue, dead ones are removed.
// deno-lint-ignore no-explicit-any
async function sendSubs(list: { id: number; sub: any }[], payload: Record<string, unknown>, urgent: boolean, ttl: number) {
  const dead: number[] = [], failed: number[] = [];
  await Promise.allSettled(list.map(async (s) => {
    const r = await pushAny(s.sub, payload, urgent, ttl);
    if (r === "gone") dead.push(s.id); else if (r === "fail") failed.push(s.id);
  }));
  if (dead.length) await db.from("feed_subs").delete().in("id", dead);
  await Promise.allSettled(failed.map((id) => queueRetry("sub", id, payload, urgent, ttl)));
  return list.length - dead.length - failed.length;
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

const hexOf = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, "0")).join("");
// the sender's own phone doesn't need an alert for what it just did
// deno-lint-ignore no-explicit-any
const isSkip = (s: any, skip: string) => !!skip && (s?.endpoint === skip || (typeof s?.apns === "string" && "apns:" + s.apns === skip));

async function feed(id: string, lk: string, urg: boolean, skip = "") {
  const { data: f } = await db.from("feeds").select("*").eq("id", id).maybeSingle();
  if (!f) return out("no feed");
  const dig = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(lk)));
  const hex = Array.from(dig).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex !== f.leader_key_hash && !(f.poster_key_hash && hex === f.poster_key_hash)) return out("not allowed", 403);
  return out(await feedSend(f, urg, skip));
}

// Shared by the app's call (above) and the database queue (drain). Whichever comes first claims the newest post;
// the other finds "already sent". The queue waits 20 s, so the app's call (which knows Urgent and skips the
// poster's own phone) normally wins and the queue only fills in when the poster's phone lost signal.
// deno-lint-ignore no-explicit-any
async function feedSend(f: any, urg: boolean, skip: string): Promise<string> {
  const { data: p } = await db.from("feed_posts").select("id").eq("feed_id", f.id).order("id", { ascending: false }).limit(1).maybeSingle();
  if (!p || p.id <= (f.last_push_id ?? 0)) return "nothing new";
  const { data: claimed } = await db.from("feeds").update({ last_push_id: p.id })
    .eq("id", f.id).eq("last_push_id", f.last_push_id ?? 0).select("id");
  if (!claimed || !claimed.length) return "already sent";
  const { data: subs } = await db.from("feed_subs").select("id,sub").eq("feed_id", f.id).limit(500);
  const payload = urg
    ? { title: "⚠ URGENT: new word", body: "Open Feed to read it and tap Got it.", help: true, open: "feed" }
    : { title: "New word in Feed", body: "Open Feed to read it and tap Got it.", help: false, open: "feed" };
  return "sent " + await sendSubs((subs ?? []).filter((s) => !isSkip(s.sub, skip)), payload, urg, 86400);
}

const WHAT: Record<string, string> = { roster: "People were added or removed", status: "Statuses changed", cal: "The calendar changed", duty: "The duty roster changed", ready: "Due-outs changed", events: "Events changed", sec: "A section sent an update", ask: "The company sent your platoon an ask" };
async function team(id: string, k: string, what: string[], skip: string) {
  const { data: f } = await db.from("feeds").select("*").eq("id", id).maybeSingle();
  if (!f) return out("no feed");
  const hex = await hexOf(k);
  if (hex !== f.member_key_hash && hex !== f.leader_key_hash && !(f.poster_key_hash && hex === f.poster_key_hash)) return out("not allowed", 403);
  // one alert every 90 s per team; works before setup part 24 too (then without the limit)
  if (f.team_push_at && Date.now() - new Date(f.team_push_at).getTime() < 90000) return out("throttled");
  if ("team_push_at" in f) await db.from("feeds").update({ team_push_at: new Date().toISOString() }).eq("id", id);
  const lines = [...new Set(what.map((w) => WHAT[w]).filter(Boolean))].slice(0, 3);
  const payload = what.includes("ask")
    ? { title: "📋 Company ask", body: "The company sent your platoon an ask. Open Company to answer.", help: false, open: "co" }
    : { title: "📋 Team update", body: (lines.length ? lines.join(". ") : "Something changed") + ". Open the app to see.", help: false, open: "board" };
  const { data: subs } = await db.from("feed_subs").select("id,sub").eq("feed_id", id).limit(500);
  return out("sent " + await sendSubs((subs ?? []).filter((s) => !isSkip(s.sub, skip)), payload, false, 21600));
}

// {alert: "req"|"prob"|"rep"|"ck", feed, mk}: a member sent a request, a check-in or reported a problem; buzz the OIC (at most every 15 s).
async function alertOic(id: string, mk: string, kind: string) {
  const { data: f } = await db.from("feeds").select("*").eq("id", id).maybeSingle();
  if (!f || !f.leader_sub) return out("no sub");
  const dig = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(mk)));
  const hex = Array.from(dig).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex !== f.member_key_hash) return out("not allowed", 403);
  if (f.leader_push_at && Date.now() - new Date(f.leader_push_at).getTime() < 15000) return out("throttled");
  await db.from("feeds").update({ leader_push_at: new Date().toISOString() }).eq("id", id);
  const payload = kind === "ck"
    ? { title: "📍 New check-in", body: "Someone checked in from their phone. Open Check-ins to confirm.", help: false, open: "checkins" }
    : kind === "rep"
    ? { title: "⚑ Post reported", body: "A member reported a Feed post. Review it within 24 hours: open Feed.", help: true, open: "feed" }
    : kind === "prob"
    ? { title: "⚠ Problem reported", body: "Someone flagged a problem with a Feed post. Open Feed to see who.", help: true, open: "feed" }
    : { title: "📨 New request", body: "Someone sent a leave, liberty or appointment request. Open Feed to approve.", help: false, open: "feed" };
  const urgent = kind !== "req" && kind !== "ck";
  const r = await pushAny(f.leader_sub, payload, urgent, 86400);
  if (r === "gone") await db.from("feeds").update({ leader_sub: null }).eq("id", id);
  if (r === "fail" && await queueRetry("leader", id, payload, urgent, 86400)) return out("push failed, will retry");
  return out(r === "ok" ? "sent" : "push failed");
}

// {escalate:1}: every minute from pg_cron (setup part 22). Recalls whose deadline just passed with people still
// missing get one alert to the leader's phone. Counts only; the server never has names.
async function escalate() {
  const { data, error } = await db.rpc("esc_due");
  if (error) return out("no escalations table");
  let sent = 0;
  // deno-lint-ignore no-explicit-any
  for (const r of (data ?? []) as any[]) {
    if (!r.push_sub) continue;
    const answered = (r.good ?? 0) + (r.delayed ?? 0) + (r.help ?? 0);
    const missing = Math.max(0, (r.expected ?? 0) - answered);
    if (!missing && !r.help) continue;
    const payload = {
      title: missing ? `⏰ ${missing} not checked in` : "⚠ Deadline passed: someone needs help",
      body: `${answered} of ${r.expected} answered by the deadline` + (r.help ? ` · ${r.help} need help` : "") + (r.delayed ? ` · ${r.delayed} delayed` : "") + ". Open the recall.",
      help: true, open: "recall",
    };
    const res = await pushAny(r.push_sub, payload, true, 3600);
    if (res === "gone") await db.from("recalls").update({ push_sub: null }).eq("id", r.recall_id);
    if (res === "fail") await queueRetry("recalls", r.recall_id, payload, true, 3600);
    if (res === "ok") sent++;
  }
  return out("escalated " + sent);
}

// One queued retry. Reads the phone's current subscription; "ok" and "gone" are finished, "fail" goes back
// on the queue with a longer wait until MAX_TRIES or the alert's time-to-live runs out.
// deno-lint-ignore no-explicit-any
async function retryOne(m: any): Promise<string> {
  const t = m.t as Target, p = m.p, u = m.u === true, ttl = Number(m.ttl) || 3600, n = (Number(m.n) || 0) + 1, at = Number(m.at) || Date.now();
  if (!p || typeof p !== "object" || Date.now() - at > ttl * 1000) return "expired";
  // deno-lint-ignore no-explicit-any
  let sub: any = null;
  if (t === "recalls" || t === "boards") {
    const { data } = await db.from(t).select("push_sub").eq("id", m.id).maybeSingle(); sub = data?.push_sub;
  } else if (t === "leader") {
    const { data } = await db.from("feeds").select("leader_sub").eq("id", m.id).maybeSingle(); sub = data?.leader_sub;
  } else if (t === "sub") {
    const { data } = await db.from("feed_subs").select("sub").eq("id", m.id).maybeSingle(); sub = data?.sub;
  } else return "bad";
  if (!sub) return "no sub";
  const r = await pushAny(sub, p, u, Math.max(60, Math.round(ttl - (Date.now() - at) / 1000)));
  if (r === "gone") {
    if (t === "recalls" || t === "boards") await db.from(t).update({ push_sub: null }).eq("id", m.id);
    else if (t === "leader") await db.from("feeds").update({ leader_sub: null }).eq("id", m.id);
    else await db.from("feed_subs").delete().eq("id", m.id);
  }
  if (r === "fail") return await queueRetry(t, m.id, p, u, ttl, n, at) ? "requeued" : "gave up";
  return r;
}

// {drain:1}: pg_cron every 20 s while the "push" queue has messages ready (part 27). Each message read is hidden
// for 60 s; it's deleted once handled. A message that keeps crashing is dropped after 5 reads.
async function drain() {
  const { data, error } = await db.rpc("push_q_read", { p_n: 50 });
  if (error) return out("no queue (run setup part 27)");
  // deno-lint-ignore no-explicit-any
  const msgs = (data ?? []) as { msg_id: number; read_ct: number; message: any }[];
  const done: number[] = [];
  const tally: Record<string, number> = {};
  await Promise.allSettled(msgs.map(async (q) => {
    const m = q.message ?? {};
    let r = "bad";
    if (q.read_ct > 5) r = "dropped";
    else if (m.kind === "feed" && typeof m.feed === "string") {
      const { data: f } = await db.from("feeds").select("*").eq("id", m.feed).maybeSingle();
      r = f ? (await feedSend(f, false, "")).replace(/ \d+$/, "") : "no feed";
    } else if (m.kind === "retry") r = await retryOne(m);
    done.push(q.msg_id);
    tally[r] = (tally[r] ?? 0) + 1;
  }));
  if (done.length) await db.rpc("push_q_del", { p_ids: done });
  return out(JSON.stringify({ read: msgs.length, done: done.length, ...tally }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return out("ok");
  if (req.method !== "POST") return out("method", 405);
  let body: { recall?: unknown; board?: unknown; feed?: unknown; lk?: unknown; urg?: unknown; alert?: unknown; mk?: unknown; escalate?: unknown; drain?: unknown; team?: unknown; k?: unknown; what?: unknown; skip?: unknown } = {};
  try { body = await req.json(); } catch { return out("bad", 400); }
  if (body.escalate === 1) return escalate();
  if (body.drain === 1) return drain();
  const skip = typeof body.skip === "string" ? body.skip.slice(0, 600) : "";
  if (typeof body.team === "string" && /^[a-z0-9]{10,20}$/.test(body.team) && typeof body.k === "string" && /^[a-z0-9]{24,40}$/.test(body.k))
    return team(body.team, body.k, Array.isArray(body.what) ? body.what.filter((w): w is string => typeof w === "string").slice(0, 8) : [], skip);
  if ((body.alert === "req" || body.alert === "prob" || body.alert === "rep" || body.alert === "ck") && typeof body.feed === "string" && /^[a-z0-9]{10,20}$/.test(body.feed) && typeof body.mk === "string" && /^[a-z0-9]{24,40}$/.test(body.mk))
    return alertOic(body.feed, body.mk, body.alert);
  if (typeof body.recall === "string" && /^[a-z0-9]{8,16}$/.test(body.recall)) return recall(body.recall);
  if (typeof body.board === "string" && /^[a-z0-9]{10,20}$/.test(body.board)) return board(body.board);
  if (typeof body.feed === "string" && /^[a-z0-9]{10,20}$/.test(body.feed) && typeof body.lk === "string" && /^[a-z0-9]{24,40}$/.test(body.lk))
    return feed(body.feed, body.lk, body.urg === true, skip);
  return out("bad", 400);
});
