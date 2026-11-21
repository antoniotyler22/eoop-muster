// Owner password hashing (4.140.0). Replaces the old unsalted SHA-256 of "user:pass" with a salted PBKDF2-SHA256 hash.
// Stored in app_cfg.owner_hash2 (part 58) as "pbkdf2$<iterations>$<salt hex>$<hash hex>". No Deno globals: tests import it in Node.
const te = new TextEncoder();
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b as ArrayBuffer)].map((x) => x.toString(16).padStart(2, "0")).join("");
const unhex = (s: string) => new Uint8Array((s.match(/../g) ?? []).map((x) => parseInt(x, 16)));
export const PBKDF2_ITER = 210000;

export function same(a: string, b: string) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

async function derive(pass: string, salt: Uint8Array, iter: number) {
  const k = await crypto.subtle.importKey("raw", te.encode(pass), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, k, 256));
}
/** A fresh salted hash of "username:password" (username lower-cased by the caller). */
export async function hashPw(user: string, pass: string, iter = PBKDF2_ITER) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${iter}$${hex(salt)}$${await derive(user + ":" + pass, salt, iter)}`;
}
export const isPw2 = (s: unknown): s is string => typeof s === "string" && /^pbkdf2\$[0-9]{4,7}\$[0-9a-f]{32}\$[0-9a-f]{64}$/.test(s);
export async function checkPw(user: string, pass: string, stored: string) {
  if (!isPw2(stored)) return false;
  const [, it, salt, want] = stored.split("$");
  const iter = Number(it); if (!(iter >= 100000 && iter <= 2000000)) return false;
  return same(await derive(user + ":" + pass, unhex(salt), iter), want);
}

/** Brute-force lockout counted from the owner log (shared by every server instance, survives restarts).
 *  Locked when one address has 5 bad tries in 15 minutes, or all addresses together have 25. */
export const LOCK_WINDOW_MS = 15 * 60000;
export function lockedFrom(rows: { ip: string }[], ip: string) {
  const mine = rows.filter((r) => r.ip === ip).length;
  return mine >= 5 || rows.length >= 25;
}
