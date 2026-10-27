// Supabase Edge Function "relay": posts the numbers to a Slack, Microsoft Teams or Discord incoming webhook.
// Chat services don't accept posts straight from a browser, so the app sends {url, text} here and this passes it on.
// Only real webhook addresses of those services are allowed; nothing is stored. Turn OFF "Enforce JWT verification".

const D = (globalThis as any).Deno;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, content-type, authorization, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

/** Which service a webhook belongs to, or null when it isn't an allowed webhook address. */
export function hookKind(u: unknown): "slack" | "teams" | "discord" | null {
  if (typeof u !== "string" || u.length > 600) return null;
  let x: URL; try { x = new URL(u); } catch { return null; }
  if (x.protocol !== "https:" || x.username || x.password || (x.port && x.port !== "443")) return null;
  const h = x.hostname.toLowerCase();
  if (h === "hooks.slack.com" && x.pathname.startsWith("/services/")) return "slack";
  if (/^[a-z0-9-]+\.webhook\.office\.com$/.test(h)) return "teams";
  if ((/^[a-z0-9-]+\.logic\.azure\.com$/.test(h) || /^prod-[0-9]+\.[a-z0-9-]+\.logic\.azure\.com$/.test(h)) && x.pathname.includes("/workflows/")) return "teams";
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)*\.environment\.api\.powerplatform\.com$/.test(h) && x.pathname.includes("/powerautomate/")) return "teams";
  if ((h === "discord.com" || h === "discordapp.com") && x.pathname.startsWith("/api/webhooks/")) return "discord";
  return null;
}
/** The body each service expects. */
export function hookBody(kind: string, text: string) {
  if (kind === "slack") return { text: "```" + text + "```" };
  if (kind === "discord") return { content: ("```" + text + "```").slice(0, 1990) };
  // Teams (classic connector and Workflows both accept an Adaptive Card message)
  return { type: "message", attachments: [{ contentType: "application/vnd.microsoft.card.adaptive", content: {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json", type: "AdaptiveCard", version: "1.4",
    body: [{ type: "TextBlock", text, wrap: true, fontType: "Monospace" }] } }] };
}

export async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let b: any = {};
  try { b = await req.json(); } catch { return json({ error: "bad request" }, 400); }
  if (b.ping) return json({ ok: 1, relay: 1 });
  const kind = hookKind(b.url);
  if (!kind) return json({ error: "That isn't a Slack, Teams or Discord webhook link." }, 400);
  const text = typeof b.text === "string" ? b.text.slice(0, 3500) : "";
  if (!text.trim()) return json({ error: "Nothing to post." }, 400);
  try {
    const r = await fetch(b.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(hookBody(kind, text)), redirect: "error" });
    if (!r.ok) return json({ error: r.status === 404 || r.status === 410 ? "That webhook link no longer works. Make a new one." : "The chat service said no (" + r.status + ")." }, 502);
    return json({ ok: 1 });
  } catch {
    return json({ error: "Couldn't reach the chat service." }, 502);
  }
}
if (D?.serve) D.serve(handle);
