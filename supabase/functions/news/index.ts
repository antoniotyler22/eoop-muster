// Supabase Edge Function "news": the slim news card on Home. Pulls local weather, safety alerts and world news from
// free public sources (no API keys) and hands the phone a short list of cards. Answers are cached for 10 minutes.
//  {lat, lon}: optional. Rounded to about 1 km before use; nothing is stored.
//  {ping:1}: System check.
// Sources: Open-Meteo (weather), National Weather Service (US safety alerts), Google News RSS (world headlines).
// Turn OFF "Enforce JWT verification" (the function takes no secrets and reads no data of yours).
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, content-type, authorization, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
const UA = "AccountedFor/1.0 (antoniotyler22@gmail.com)";
const TTL = 10 * 60000;
type Card = { k: "wx" | "alert" | "news"; t: string; s: string; url?: string; at?: number; sev?: string };
const cache = new Map<string, { at: number; cards: Card[] }>();

async function get(url: string, headers: Record<string, string> = {}, ms = 8000): Promise<Response | null> {
  const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), ms);
  try { const r = await fetch(url, { headers: { "User-Agent": UA, ...headers }, signal: ac.signal }); return r.ok ? r : null; }
  catch { return null; } finally { clearTimeout(tm); }
}

// Open-Meteo WMO weather codes, in plain words.
const WX: Record<number, string> = { 0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  56: "Freezing drizzle", 57: "Freezing drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain", 71: "Light snow", 73: "Snow", 75: "Heavy snow",
  77: "Snow grains", 80: "Showers", 81: "Showers", 82: "Heavy showers", 85: "Snow showers", 86: "Snow showers", 95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with hail" };
async function weather(lat: number, lon: number): Promise<Card | null> {
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=1`;
  const r = await get(u); if (!r) return null;
  const o = await r.json(); const c = o.current ?? {}, d = o.daily ?? {};
  if (typeof c.temperature_2m !== "number") return null;
  const hi = d.temperature_2m_max?.[0], lo = d.temperature_2m_min?.[0], pp = d.precipitation_probability_max?.[0];
  return { k: "wx", t: `${Math.round(c.temperature_2m)}° · ${WX[c.weather_code] ?? "Weather"}`,
    s: [hi != null && lo != null ? `High ${Math.round(hi)}° · Low ${Math.round(lo)}°` : "", pp != null ? `Rain ${pp}%` : "", c.wind_speed_10m != null ? `Wind ${Math.round(c.wind_speed_10m)} mph` : ""].filter(Boolean).join(" · "),
    url: `https://forecast.weather.gov/MapClick.php?lat=${lat}&lon=${lon}`, at: Date.now() };
}
// NWS: watches, warnings and advisories for the point (US and territories only).
async function alerts(lat: number, lon: number): Promise<Card[]> {
  const r = await get(`https://api.weather.gov/alerts/active?point=${lat},${lon}`, { Accept: "application/geo+json" }); if (!r) return [];
  const o = await r.json(); const out: Card[] = [];
  for (const f of (o.features ?? []).slice(0, 3)) {
    const p = f.properties ?? {}; if (!p.event) continue;
    out.push({ k: "alert", t: String(p.event).slice(0, 80), s: String(p.headline || p.description || "").replace(/\s+/g, " ").slice(0, 140), url: typeof p["@id"] === "string" ? p["@id"] : undefined, at: Date.parse(p.sent) || Date.now(), sev: String(p.severity || "").toLowerCase() });
  }
  return out;
}
const unesc = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/<[^>]+>/g, "").trim();
async function world(): Promise<Card[]> {
  const r = await get("https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en"); if (!r) return [];
  const x = await r.text(); const out: Card[] = [];
  for (const m of x.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const it = m[1]; const title = unesc((it.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || ""); const link = unesc((it.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || "");
    const src = unesc((it.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1] || ""); const at = Date.parse((it.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || "") || Date.now();
    if (!title) continue;
    out.push({ k: "news", t: title.replace(/\s+-\s+[^-]+$/, "").slice(0, 120), s: src ? src.slice(0, 40) : "World", url: /^https?:/.test(link) ? link.slice(0, 500) : undefined, at });
    if (out.length >= 4) break;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let body: { lat?: unknown; lon?: unknown; ping?: unknown } = {};
  try { body = await req.json(); } catch { /* empty */ }
  if (body.ping === 1) return json({ ok: 1, news: 1 });
  const lat = typeof body.lat === "number" && Math.abs(body.lat) <= 90 ? Math.round(body.lat * 100) / 100 : null;
  const lon = typeof body.lon === "number" && Math.abs(body.lon) <= 180 ? Math.round(body.lon * 100) / 100 : null;
  const key = lat != null && lon != null ? `${lat},${lon}` : "-";
  const hit = cache.get(key); if (hit && Date.now() - hit.at < TTL) return json({ cards: hit.cards, at: hit.at, cached: true });
  const [wx, al, wd] = await Promise.all([lat != null && lon != null ? weather(lat, lon) : Promise.resolve(null), lat != null && lon != null ? alerts(lat, lon) : Promise.resolve([]), world()]);
  const cards: Card[] = [...al, ...(wx ? [wx] : []), ...wd].slice(0, 8);
  if (cache.size > 500) cache.clear();
  cache.set(key, { at: Date.now(), cards });
  return json({ cards, at: Date.now() });
});
