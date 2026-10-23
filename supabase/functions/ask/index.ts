// Supabase Edge Function "ask": answers questions with Claude, searching official sources only.
// Turn OFF "Enforce JWT verification". Secrets: ANTHROPIC_API_KEY (required),
// optional AI_MODEL (default claude-sonnet-5-5), AI_DAILY_CAP (default 150), AI_PER_DEVICE (default 20).
// Question text is never stored. Only daily counters are kept (ai_usage table).
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, content-type, authorization, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

const DOMAINS: Record<string, string[]> = {
  military: ["marines.mil", "hqmc.marines.mil", "navy.mil", "secnav.navy.mil", "mynavyhr.navy.mil", "army.mil", "armypubs.army.mil",
    "af.mil", "e-publishing.af.mil", "spaceforce.mil", "uscg.mil", "defense.gov", "esd.whs.mil", "dfas.mil", "tricare.mil",
    "militaryonesource.mil", "va.gov", "jcs.mil", "uscode.house.gov", "ecfr.gov"],
  police: ["justice.gov", "bja.ojp.gov", "nij.ojp.gov", "ojp.gov", "dol.gov", "osha.gov", "ecfr.gov", "uscode.house.gov", "cdc.gov"],
  jobs: ["osha.gov", "dol.gov", "cdc.gov", "ecfr.gov", "fmcsa.dot.gov", "epa.gov", "nfpa.org"],
  hr: ["dol.gov", "eeoc.gov", "opm.gov", "irs.gov", "ecfr.gov", "osha.gov", "ssa.gov", "uscis.gov"],
  civilian: ["ready.gov", "cdc.gov", "redcross.org", "osha.gov", "nws.noaa.gov", "weather.gov", "fema.gov"],
};
const TOPIC: Record<string, string> = {
  military: "U.S. military orders, directives and regulations (Marine Corps orders/MCOs, MARADMINs, NAVADMINs, DoD instructions, service regulations), administration, leave and liberty, pay and entitlements, PFT/CFT and fitness standards, uniforms, promotions, PME, training, safety, and UCMJ basics",
  police: "law-enforcement policy, training, officer safety, and workplace rules",
  jobs: "construction and job-site safety, OSHA rules, equipment certifications and crew management",
  hr: "HR policy, employment law basics, leave, benefits and workplace compliance",
  civilian: "group and volunteer organization, safety and emergency preparedness",
};

function system(mode: string) {
  return `You are "Ask" inside EOP Numbers, an accountability app used by small-unit leaders and their people. Answer questions about ${TOPIC[mode] ?? TOPIC.military}.
Rules:
- Search official sources before answering anything about a specific rule, order, standard, number or date. Name the order or document and paragraph only when a source you found shows it. Never invent order numbers, paragraph numbers, scores or dollar amounts.
- Orders and rates change. If a source might be outdated or you are not sure, say so and tell them where to verify (the current order on the official site, their admin shop, S-1, IPAC, or chain of command).
- Legal questions: give general information and point them to legal assistance or the JAG office. Medical: point to medical or the corpsman. If anyone mentions thoughts of suicide or crisis, give the Veterans/Military Crisis Line (dial 988 then press 1, or text 838255) and urge them to reach out now.
- Never ask for or repeat personal information. Do not help with anything classified, OPSEC-sensitive, or that would bypass rules.
- This is not official guidance. Do not claim to speak for any command.
Style: the reader is on a phone. Lead with the direct answer in 1-2 sentences, then short bullets with the key details. Plain text only: no tables, no headings, at most light **bold**. Keep it under 220 words unless they ask for more.`;
}

async function sha(s: string) {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  return Array.from(d).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body: { q?: unknown; mode?: unknown; hist?: unknown; ping?: unknown } = {};
  try { body = await req.json(); } catch { return json({ error: "bad request" }, 400); }

  const key = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  if (body.ping) {
    const { error } = await db.from("ai_usage").select("day").limit(1);
    return json({ ok: true, key: key.length > 20, db: !error });
  }
  if (!key) return json({ error: "Ask isn't set up yet (no API key on the server)." }, 503);

  const q = typeof body.q === "string" ? body.q.trim().slice(0, 800) : "";
  if (q.length < 3) return json({ error: "Type a question." }, 400);
  const mode = typeof body.mode === "string" && DOMAINS[body.mode] ? body.mode : "military";

  // Daily caps: whole server and each device (by a one-way hash of its network address).
  const cap = Number(Deno.env.get("AI_DAILY_CAP") ?? 150), per = Number(Deno.env.get("AI_PER_DEVICE") ?? 20);
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const dev = await sha(ip + "|" + (Deno.env.get("SUPABASE_URL") ?? ""));
  const all = await db.rpc("ai_bump", { p_k: "all" });
  if (all.error) return json({ error: "Ask isn't set up yet (usage table missing)." }, 503);
  if ((all.data as number) > cap) return json({ error: "Today's question limit for your unit has been reached. Try again tomorrow." }, 429);
  const mine = await db.rpc("ai_bump", { p_k: "d:" + dev });
  if ((mine.data as number) > per) return json({ error: "You've reached today's question limit on this phone. Try again tomorrow." }, 429);

  const messages: { role: string; content: unknown }[] = [];
  if (Array.isArray(body.hist)) {
    for (const h of body.hist.slice(-2)) {
      if (h && typeof h.q === "string" && typeof h.a === "string") {
        messages.push({ role: "user", content: h.q.slice(0, 800) }, { role: "assistant", content: h.a.slice(0, 1500) });
      }
    }
  }
  messages.push({ role: "user", content: q });

  const payload: Record<string, unknown> = {
    model: Deno.env.get("AI_MODEL") || "claude-sonnet-5-5",
    max_tokens: 1200,
    system: system(mode),
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3, allowed_domains: DOMAINS[mode] }],
    messages,
  };

  let content: any[] = [];
  try {
    for (let i = 0; i < 3; i++) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const out = await r.json();
      if (!r.ok) {
        const msg = out?.error?.message ?? "error";
        if (r.status === 401) return json({ error: "The server's AI key isn't valid. Leader: check ANTHROPIC_API_KEY." }, 503);
        if (r.status === 429 || r.status === 529) return json({ error: "The AI service is busy. Try again in a minute." }, 503);
        if (/credit|billing/i.test(msg)) return json({ error: "The AI account is out of credit. Leader: add credit in the Anthropic Console." }, 503);
        return json({ error: "The AI service had a problem. Try again." }, 502);
      }
      content = content.concat(out.content ?? []);
      if (out.stop_reason !== "pause_turn") break;
      (payload.messages as any[]).push({ role: "assistant", content: out.content });
    }
  } catch {
    return json({ error: "Couldn't reach the AI service. Try again." }, 502);
  }

  // Keep the final answer (text after the last search result) and its sources.
  let last = -1;
  content.forEach((b, i) => { if (b.type === "web_search_tool_result") last = i; });
  const textBlocks = content.slice(last + 1).filter((b) => b.type === "text");
  const answer = (textBlocks.length ? textBlocks : content.filter((b) => b.type === "text")).map((b) => b.text).join("").trim();
  const src = new Map<string, string>();
  for (const b of textBlocks) for (const c of b.citations ?? []) if (c.url && !src.has(c.url)) src.set(c.url, c.title ?? c.url);
  if (!src.size) for (const b of content) if (b.type === "web_search_tool_result" && Array.isArray(b.content)) for (const x of b.content.slice(0, 3)) if (x.url && !src.has(x.url)) src.set(x.url, x.title ?? x.url);

  return json({ answer: answer || "I couldn't find an answer to that. Try rewording it.", sources: [...src].slice(0, 6).map(([url, title]) => ({ url, title })) });
});
