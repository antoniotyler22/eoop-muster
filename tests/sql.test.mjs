// Every supabase/setup/*.sql runs cleanly on a real Postgres (twice: they must be safe to re-run),
// and the security-critical functions behave. Skipped when Postgres isn't installed.
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { startPg } from "./pg.mjs";

const pg = await startPg();
const skip = pg ? false : "Postgres not installed";
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";

function applyAll() {
  for (const f of pg.setupFiles()) {
    // pg_cron / pg_net are Supabase extensions; the test database has stand-ins for them.
    const sql = fs.readFileSync(f, "utf8").replace(/create extension if not exists pg_(cron|net)[^;]*;/gi, "");
    const tmp = path.join(os.tmpdir(), "af-" + path.basename(f));
    fs.writeFileSync(tmp, sql);
    try { pg.psql(null, { file: tmp }); } catch (e) { throw new Error(path.basename(f) + ": " + String(e.stderr || e.message)); }
    finally { fs.rmSync(tmp, { force: true }); }
  }
}
// Run as the public "anon" role, the way the app reaches the database.
const anon = (sql) => pg.psql(`set role anon; ${sql}`);

test("all setup parts run, and run again (safe to re-run)", { skip }, () => {
  applyAll();
  applyAll();
});

test("tables are closed to the public; only functions are reachable", { skip }, () => {
  for (const t of ["recalls", "checkins", "logins", "pro_ents", "pro_feeds", "client_errors", "escalations"]) {
    assert.throws(() => anon(`select count(*) from public.${t}`), /permission denied/, t);
  }
});

test("logins: wrong password locks after 5 tries", { skip }, () => {
  const uid = "a".repeat(64), vf = "b".repeat(64);
  anon(`select public.login_put(${q(uid)}, ${q("owner-key-0123456789abcdef")}, ${q(vf)}, ${q("x".repeat(40))})`);
  assert.match(anon(`select ct from public.login_get(${q(uid)}, ${q(vf)})`), /x{40}/);
  let wait = "";
  for (let i = 0; i < 5; i++) wait = anon(`select wait from public.login_get(${q(uid)}, ${q("c".repeat(64))})`);
  assert.equal(wait, "900");
  assert.equal(anon(`select coalesce(ct,'none') from public.login_get(${q(uid)}, ${q(vf)})`), "none", "even the right password waits while locked");
});

test("Pro: token check, FEED linking needs both keys, members covered only while active", { skip }, () => {
  const tok = "t".repeat(64), mk = "member-key-0123456789abcd", lk = "leader-key-0123456789abcd";
  pg.psql(`insert into public.pro_ents(id, source, product, expires_at, tok_hash) values ('apple:42','apple','pro.yearly', now() + interval '30 days', ${q(sha(tok))})`);
  pg.psql(`insert into public.feeds(id, member_key_hash, leader_key_hash) values ('feed000001', ${q(sha(mk))}, ${q(sha(lk))})`);
  assert.equal(anon(`select active from public.pro_check(${q(tok)})`), "t");
  assert.equal(anon(`select count(*) from public.pro_check(${q("u".repeat(64))})`), "0");
  assert.throws(() => anon(`select public.pro_link_feed(${q(tok)}, 'feed000001', ${q(mk)})`), /not allowed/, "member key can't link");
  assert.throws(() => anon(`select public.pro_link_feed(${q("u".repeat(64))}, 'feed000001', ${q(lk)})`), /not pro/);
  assert.equal(anon(`select public.pro_link_feed(${q(tok)}, 'feed000001', ${q(lk)})`), "t");
  assert.throws(() => anon(`select public.pro_ent_for(null, 'feed000001', ${q(mk)})`), /permission denied/, "only the server may ask");
  const asServer = (sql) => pg.psql(`set role service_role; ${sql}`);
  assert.equal(asServer(`select public.pro_ent_for(null, 'feed000001', ${q(mk)})`), "apple:42");
  assert.equal(asServer(`select coalesce(public.pro_ent_for(null, 'feed000001', ${q("wrong-member-key-000000000")}),'none')`), "none");
  pg.psql(`update public.pro_ents set expires_at = now() - interval '3 days' where id = 'apple:42'`);
  assert.equal(asServer(`select coalesce(public.pro_ent_for(${q(tok)}, null, null),'none')`), "none", "expired Pro stops counting");
  pg.psql(`update public.pro_ents set expires_at = now() - interval '2 hours' where id = 'apple:42'`);
  assert.equal(asServer(`select public.pro_ent_for(${q(tok)}, null, null)`), "apple:42", "one day of grace for billing retries");
});

test("crash reports: stored without personal data, rate limited", { skip }, () => {
  const call = (msg) => anon(`select public.err_report('app', ${q(msg)}, 'at render (app.bundle.js:10:5)', '4.1.0', 'ios', ${q("d".repeat(24))})`);
  call("TypeError: x is undefined");
  call("Failed for SGT JONES 808-555-1234 jones@example.com");
  const rows = pg.psql(`select msg from public.client_errors order by id`).split("\n");
  assert.ok(rows.some((r) => /TypeError/.test(r)));
  assert.ok(!rows.join(" ").match(/555-1234|example\.com/), "phone numbers and emails are scrubbed");
  for (let i = 0; i < 60; i++) call("spam " + i);
  assert.ok(Number(pg.psql(`select count(*) from public.client_errors where dev = ${q(sha("d".repeat(24)).slice(0, 24))}`)) <= 30, "per-device daily limit");
});

test("missed check-in escalation: leader registers, server finds overdue recalls once", { skip }, () => {
  const rid = "rc0000000001", rk = "read-key-0123456789abcdef";
  pg.psql(`insert into public.recalls(id, read_key_hash) values (${q(rid)}, ${q(sha(rk))})`);
  assert.throws(() => anon(`select public.esc_set(${q(rid)}, ${q("wrong-key-000000000000000")}, now() - interval '1 minute', 10)`), /not allowed/);
  anon(`select public.esc_set(${q(rid)}, ${q(rk)}, now() - interval '1 minute', 10)`);
  pg.psql(`insert into public.checkins(recall_id, words, code) values (${q(rid)}, '{a}', 1), (${q(rid)}, '{b}', 3)`);
  const asServer = (sql) => pg.psql(`set role service_role; ${sql}`);
  const due = asServer(`select recall_id || '|' || expected || '|' || good || '|' || help from public.esc_due()`);
  assert.equal(due, `${rid}|10|1|1`);
  assert.equal(asServer(`select count(*) from public.esc_due()`), "0", "each recall escalates once");
});

test.after(() => pg && pg.stop());
