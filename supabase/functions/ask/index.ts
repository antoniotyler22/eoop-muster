// Supabase Edge Function "ask": answers questions with Claude, searching official sources only.
// Turn OFF "Enforce JWT verification". Secrets: ANTHROPIC_API_KEY (required),
// optional AI_MODEL (default claude-sonnet-5-5), AI_DAILY_CAP (default 150), AI_PER_DEVICE (default 20),
// AI_ADMIN_KEY (lets the OIC's phone turn Ask on/off, choose who can use it and set limits),
// AI_REQUIRE_PRO (default 1: only Pro teams, the admin and allow-listed FEEDs; set 0 to let anyone ask), AI_PER_TEAM (default 100/day per Pro team),
// AI_SERVER_CAP (default 5000/day across everyone), AI_PER_TEST_TEAM (default 10/day for TestFlight/Sandbox purchases). Needs SQL part 20 for Pro.
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
  military: ["marines.mil", "navy.mil", "army.mil",
    "af.mil", "spaceforce.mil", "uscg.mil", "defense.gov", "esd.whs.mil", "dfas.mil", "tricare.mil",
    "militaryonesource.mil", "va.gov", "jcs.mil", "uscode.house.gov", "ecfr.gov"],
  police: ["justice.gov", "ojp.gov", "dol.gov", "osha.gov", "ecfr.gov", "uscode.house.gov", "cdc.gov"],
  jobs: ["osha.gov", "dol.gov", "cdc.gov", "ecfr.gov", "fmcsa.dot.gov", "epa.gov", "nfpa.org"],
  hr: ["dol.gov", "eeoc.gov", "opm.gov", "irs.gov", "ecfr.gov", "osha.gov", "ssa.gov", "uscis.gov"],
  civilian: ["ready.gov", "cdc.gov", "redcross.org", "osha.gov", "noaa.gov", "weather.gov", "fema.gov"],
};
const TOPIC: Record<string, string> = {
  military: "U.S. military orders, directives and regulations (Marine Corps orders/MCOs, MARADMINs, NAVADMINs, DoD instructions, service regulations), administration, leave and liberty, pay and entitlements, PFT/CFT and fitness standards, uniforms, promotions, PME, training, safety, and UCMJ basics",
  police: "law-enforcement policy, training, officer safety, and workplace rules",
  jobs: "construction and job-site safety, OSHA rules, equipment certifications and crew management",
  hr: "HR policy, employment law basics, leave, benefits and workplace compliance",
  civilian: "group and volunteer organization, safety and emergency preparedness",
};

// Where to verify, and who to send legal / medical / crisis questions to, for each version of the app.
const RULES: Record<string, string> = {
  military: `- Orders and rates change. If a source might be outdated or you are not sure, say so and tell them where to verify (the current order on the official site, their admin shop, S-1, IPAC, or chain of command).
- Legal questions: give general information and point them to legal assistance or the JAG office. Medical: point to medical or the corpsman. If anyone mentions thoughts of suicide or crisis, give the Veterans/Military Crisis Line (dial 988 then press 1, or text 838255) and urge them to reach out now.`,
  civilian: `- Rules and rates change and differ by state and employer. If a source might be outdated or you are not sure, say so and tell them where to verify (the official site, their supervisor, HR, or their organization's written policy).
- Legal questions: give general information and suggest an attorney or their HR or legal department. Medical: suggest a doctor, or 911 for an emergency. If anyone mentions thoughts of suicide or crisis, give the 988 Suicide & Crisis Lifeline (call or text 988) and urge them to reach out now.`,
};

DOMAINS.custom = DOMAINS.civilian; TOPIC.custom = "team organization, workplace and event safety, and emergency preparedness";

function system(mode: string) {
  return `You are "Ask" inside Accounted For, an accountability app used by team leaders and their people. Answer questions about ${TOPIC[mode] ?? TOPIC.military}.
Rules:
- Search official sources before answering anything about a specific rule, order, standard, number or date. Name the order or document and paragraph only when a source you found shows it. Never invent order numbers, paragraph numbers, scores or dollar amounts.
${RULES[mode] ?? RULES.civilian}
- Never ask for or repeat personal information. Do not help with anything classified, security-sensitive, or that would bypass rules.
- This is not official guidance. Do not claim to speak for any command, agency or employer.
Style: the reader is on a phone. Lead with the direct answer in 1-2 sentences, then short bullets with the key details. Plain text only: no tables, no headings, at most light **bold**. Keep it under 220 words unless they ask for more.`;
}

type Cfg = { on: boolean; who: "all" | "feed" | "leaders"; cap?: number; per?: number; feeds?: string[] };
async function getCfg(): Promise<Cfg> {
  const { data, error } = await db.from("ai_settings").select("cfg").eq("id", 1).maybeSingle();
  if (error) return { on: true, who: "all", feeds: [] };
  const c = (data?.cfg ?? {}) as Partial<Cfg>;
  return { on: c.on !== false, who: (["all", "feed", "leaders"].includes(c.who as string) ? c.who : "all") as Cfg["who"], cap: c.cap, per: c.per, feeds: Array.isArray(c.feeds) ? c.feeds : [] };
}
async function hex(s: string) {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  return Array.from(d).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function sha(s: string) {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  return Array.from(d).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  // deno-lint-ignore no-explicit-any
  let body: any = {};
  try { body = await req.json(); } catch { return json({ error: "bad request" }, 400); }

  const key = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  const adminKey = Deno.env.get("AI_ADMIN_KEY") ?? "";
  const isAdmin = adminKey.length >= 24 && typeof body.admin === "string" && body.admin === adminKey;
  const cfg = await getCfg();
  if (body.ping) {
    const { error } = await db.from("ai_usage").select("day").limit(1);
    const st = await db.from("ai_settings").select("id").limit(1);
    return json({ ok: true, key: key.length > 20, db: !error, ctl: !st.error, admin: adminKey.length >= 24, on: cfg.on, who: cfg.who });
  }

  // OIC controls
  if (body.manage) {
    if (adminKey.length < 24) return json({ error: "Add the AI_ADMIN_KEY secret in Supabase first." }, 403);
    if (!isAdmin) return json({ error: "That OIC key doesn't match the server." }, 403);
    if (body.set && typeof body.set === "object") {
      const s = body.set;
      const n = (v: unknown, lo: number, hi: number) => (typeof v === "number" && v >= lo && v <= hi ? Math.round(v) : undefined);
      const next: Cfg = {
        on: s.on !== false,
        who: ["all", "feed", "leaders"].includes(s.who) ? s.who : "all",
        cap: n(s.cap, 1, 5000), per: n(s.per, 1, 500),
        feeds: Array.isArray(s.feeds) ? s.feeds.filter((x: unknown) => typeof x === "string" && /^[a-z0-9]{10,20}$/.test(x as string)).slice(0, 20) : cfg.feeds,
      };
      const { error } = await db.from("ai_settings").upsert({ id: 1, cfg: next, updated_at: new Date().toISOString() });
      if (error) return json({ error: "Run SQL part 10b first." }, 503);
      Object.assign(cfg, next);
    }
    const since = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
    const { data: use } = await db.from("ai_usage").select("day,n").eq("k", "all").gte("day", since).order("day");
    return json({ cfg, defaults: { cap: Number(Deno.env.get("AI_DAILY_CAP") ?? 150), per: Number(Deno.env.get("AI_PER_DEVICE") ?? 20) }, usage: use ?? [] });
  }

  if (!cfg.on) return json({ error: "Ask is turned off on the server.", off: true }, 403);

  // Who is allowed: a Pro team (the leader's team token, or a member of a FEED the leader linked to Pro),
  // the server owner (AI_ADMIN_KEY), or a FEED the server owner allow-listed in the OIC controls.
  const fid = typeof body.feed === "string" ? body.feed : "", mk = typeof body.mk === "string" ? body.mk : "";
  const tok = typeof body.pro === "string" ? body.pro : "";
  let ent = "";
  if (!isAdmin && (tok || (fid && mk))) {
    const r = await db.rpc("pro_ent_for", { p_tok: tok || null, p_feed: fid || null, p_mk: mk || null });
    if (!r.error && typeof r.data === "string") ent = r.data;
  }
  let house = false;
  if (!isAdmin && !ent && cfg.who === "feed" && (cfg.feeds ?? []).includes(fid) && mk.length >= 24) {
    const { data } = await db.from("feeds").select("member_key_hash").eq("id", fid).maybeSingle();
    house = !!data && data.member_key_hash === await hex(mk);
  }
  const requirePro = (Deno.env.get("AI_REQUIRE_PRO") ?? "1") !== "0";
  if (!isAdmin && !ent && !house) {
    if (requirePro) return json({ error: "Ask is part of Accounted For Pro. The person running your team can turn it on with Pro.", pro: true, off: true }, 402);
    if (cfg.who === "leaders") return json({ error: "Ask is set to leaders only.", off: true }, 403);
    if (cfg.who === "feed") return json({ error: "Ask is only for people in your unit's FEED. Join it with the link your leader sent.", off: true }, 403);
  }
  if (!key) return json({ error: "Ask isn't set up yet (no API key on the server)." }, 503);

  const q = typeof body.q === "string" ? body.q.trim().slice(0, 800) : "";
  if (q.length < 3) return json({ error: "Type a question." }, 400);
  const mode = typeof body.mode === "string" && DOMAINS[body.mode] ? body.mode : "military";

  // Daily caps. Each phone has its own limit; each Pro team has its own; non-Pro traffic shares the old server cap;
  // and a server-wide ceiling protects the AI bill no matter what.
  const per = cfg.per ?? Number(Deno.env.get("AI_PER_DEVICE") ?? 20);
  const teamCap = Number(Deno.env.get("AI_PER_TEAM") ?? 100);
  const houseCap = cfg.cap ?? Number(Deno.env.get("AI_DAILY_CAP") ?? 150);
  const serverCap = Number(Deno.env.get("AI_SERVER_CAP") ?? 5000);
  // Per phone: the app's own random phone ID (falls back to network address). A whole unit on base Wi-Fi shares one address.
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const devId = typeof body.dev === "string" && /^[a-z0-9]{16,40}$/.test(body.dev) ? body.dev : "ip:" + ip;
  const dev = await sha(devId + "|" + (Deno.env.get("SUPABASE_URL") ?? ""));
  const bump = async (k: string) => { const r = await db.rpc("ai_bump", { p_k: k }); if (r.error) throw new Error("setup"); return r.data as number; };
  try {
    // Check the phone's own limit first, so one phone hitting its limit doesn't use up the team's.
    if ((await bump("d:" + dev)) > per) return json({ error: "You've reached today's question limit on this phone. Try again tomorrow." }, 429);
    // Test purchases (TestFlight / Sandbox, Stripe test mode) are free to make, so they get a small daily limit.
    let cap1 = teamCap;
    if (ent) { const { data: pe } = await db.from("pro_ents").select("env").eq("id", ent).maybeSingle();
      if (pe && pe.env && pe.env !== "Production" && pe.env !== "live") cap1 = Number(Deno.env.get("AI_PER_TEST_TEAM") ?? 10); }
    if (ent) { if ((await bump("p:" + await sha(ent))) > cap1) return json({ error: "Your team has reached today's question limit. Try again tomorrow." }, 429); }
    else if ((await bump("all")) > houseCap) return json({ error: "Today's question limit for your unit has been reached. Try again tomorrow." }, 429);
    if ((await bump("server")) > serverCap) return json({ error: "Ask is very busy today. Try again tomorrow." }, 429);
  } catch {
    return json({ error: "Ask isn't set up yet (usage table missing). Leader: run SQL part 10." }, 503);
  }

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
