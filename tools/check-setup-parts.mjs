// Fails when two setup parts share a number (other than the known 52 pair) or a part is missing its ledger line (58 and up).
import fs from "node:fs";
const dir = new URL("../supabase/setup/", import.meta.url);
const files = fs.readdirSync(dir).filter((f) => /^\d+_.*\.sql$/.test(f)).sort();
const seen = new Map(); const bad = [];
for (const f of files) {
  const n = Number(f.split("_")[0]);
  if (seen.has(n) && n !== 52) bad.push(`two parts numbered ${n}: ${seen.get(n)} and ${f}`);
  seen.set(n, (seen.get(n) ? seen.get(n) + ", " : "") + f);
  if (n >= 58 && !/setup_log/.test(fs.readFileSync(new URL(f, dir), "utf8"))) bad.push(`${f} has no setup_log insert`);
}
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log(`setup parts ok (${files.length} files)`);
