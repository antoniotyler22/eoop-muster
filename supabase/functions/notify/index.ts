// Supabase Edge Function "notify": sends a push alert to the leader's phone after a live check-in.
// Payload carries no names. Turn OFF "Enforce JWT verification" for this function (it validates input itself).
// Secrets needed: VAPID_PUBLIC, VAPID_PRIVATE (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are built in).
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return out("ok");
  if (req.method !== "POST") return out("method", 405);
  let recall = "";
  try { recall = (await req.json()).recall; } catch { return out("bad", 400); }
  if (typeof recall !== "string" || !/^[a-z0-9]{8,16}$/.test(recall)) return out("bad", 400);

  const { data: r } = await db.from("recalls").select("push_sub,last_push_id,expires_at").eq("id", recall).maybeSingle();
  if (!r || !r.push_sub || new Date(r.expires_at) < new Date()) return out("no sub");

  // Only check-ins not already announced, so repeat calls can't spam the leader.
  const { data: rows } = await db.from("checkins").select("id,code").eq("recall_id", recall)
    .gt("id", r.last_push_id ?? 0).order("id", { ascending: true }).limit(200);
  if (!rows || !rows.length) return out("nothing new");

  const lastId = rows[rows.length - 1].id;
  const { data: claimed } = await db.from("recalls").update({ last_push_id: lastId })
    .eq("id", recall).eq("last_push_id", r.last_push_id ?? 0).select("id");
  if (!claimed || !claimed.length) return out("already sent");

  const help = rows.filter((x) => x.code === 3).length;
  const n = rows.length;
  const payload = help
    ? { title: "⚠ NEED HELP", body: help === 1 ? "Someone needs help. Open the recall." : help + " people need help. Open the recall.", help: true }
    : { title: n === 1 ? "New check-in" : n + " new check-ins", body: "Open the recall to see who.", help: false };
  try {
    await webpush.sendNotification(r.push_sub, JSON.stringify(payload), { TTL: 3600, urgency: help ? "high" : "normal" });
    return out("sent");
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) await db.from("recalls").update({ push_sub: null }).eq("id", recall);
    return out("push failed");
  }
});
