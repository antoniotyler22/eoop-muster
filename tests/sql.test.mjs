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

test("Pro: test purchases get no grace period; one subscription covers at most 5 Feeds", { skip }, () => {
  const asServer = (sql) => pg.psql(`set role service_role; ${sql}`);
  const tok = "s".repeat(64);
  pg.psql(`insert into public.pro_ents(id, source, product, expires_at, env, tok_hash) values ('apple:77','apple','pro.monthly', now() - interval '2 hours', 'Sandbox', ${q(sha(tok))})`);
  assert.equal(asServer(`select coalesce(public.pro_ent_for(${q(tok)}, null, null),'none')`), "none", "sandbox: no grace");
  pg.psql(`update public.pro_ents set expires_at = null where id = 'apple:77'`);
  assert.equal(asServer(`select coalesce(public.pro_ent_for(${q(tok)}, null, null),'none')`), "none", "sandbox: no end date never counts");
  pg.psql(`update public.pro_ents set expires_at = now() + interval '5 minutes' where id = 'apple:77'`);
  assert.equal(asServer(`select public.pro_ent_for(${q(tok)}, null, null)`), "apple:77", "sandbox counts while it lasts");
  const lk = (i) => "leader-key-cap-" + i + "-0123456789ab";
  for (let i = 0; i < 6; i++) pg.psql(`insert into public.feeds(id, member_key_hash, leader_key_hash) values ('capfeed00${i}', ${q(sha("m" + i))}, ${q(sha(lk(i)))})`);
  for (let i = 0; i < 5; i++) assert.equal(anon(`select public.pro_link_feed(${q(tok)}, 'capfeed00${i}', ${q(lk(i))})`), "t");
  assert.equal(anon(`select public.pro_link_feed(${q(tok)}, 'capfeed000', ${q(lk(0))})`), "t", "re-linking one already covered is fine");
  assert.throws(() => anon(`select public.pro_link_feed(${q(tok)}, 'capfeed005', ${q(lk(5))})`), /up to 5 Feeds/);
});

test("crash reports: stored without personal data, rate limited", { skip }, () => {
  const call = (msg) => anon(`select public.err_report('app', ${q(msg)}, 'at render (app.bundle.js:10:5)', '4.1.0', 'ios', ${q("d".repeat(24))})`);
  call("TypeError: x is undefined");
  call("Failed for SGT JONES 808-555-1234 jones@example.com");
  call("SSN 123456789 and 123-45-6789 and id 12345678 here");
  const rows = pg.psql(`select msg from public.client_errors order by id`).split("\n");
  assert.ok(rows.some((r) => /TypeError/.test(r)));
  assert.ok(!rows.join(" ").match(/555-1234|example\.com|123456789|123-45-6789|12345678/), "phone numbers, emails and ID numbers are scrubbed");
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

test("accounts: sign-in required, each person sees only their own; teams sent to an email or phone wait for them", { skip }, () => {
  const u1 = "11111111-1111-1111-1111-111111111111", u2 = "22222222-2222-2222-2222-222222222222", u3 = "33333333-3333-3333-3333-333333333333";
  pg.psql(`insert into auth.users(id, email, phone) values (${q(u1)}, 'lead@example.com', null), (${q(u2)}, null, '15551234567'), (${q(u3)}, 'other@example.com', null) on conflict do nothing`);
  const as = (uid, claims, sql) => pg.psql(`set role authenticated; set "request.jwt.claims" to ${q(JSON.stringify(Object.assign({ sub: uid, role: "authenticated" }, claims)))}; ${sql}`);
  const lead = (sql) => as(u1, { email: "Lead@Example.com" }, sql), mem = (sql) => as(u2, { phone: "15551234567" }, sql), other = (sql) => as(u3, { email: "other@example.com" }, sql);
  assert.throws(() => anon(`select public.acct_get()`), /sign in first/, "anon can see it exists but can't use it");
  assert.throws(() => anon(`select public.inv_send('a@b.co','team000001','T','Member','X','https://x.example/#me=abcdefghijklmnop')`), /sign in first/);
  assert.equal(anon(`select count(*) from public.inv_mine()`), "0");
  for (const t of ["af_account", "af_invite"]) {
    assert.throws(() => anon(`select count(*) from public.${t}`), /permission denied/, t + " closed to anon");
    assert.throws(() => lead(`select count(*) from public.${t}`), /permission denied/, t + " closed to signed-in users too");
  }
  // your teams follow you
  lead(`select public.acct_put('[{"code":"ABCD-EFGH-JKMN-PQRS-TUVW-XYZ2","n":"HILLTOP","w":""}]'::jsonb)`);
  assert.match(lead(`select public.acct_get()::text`), /HILLTOP/);
  assert.equal(other(`select public.acct_get()::text`), "[]", "someone else's list is empty");
  assert.throws(() => lead(`select public.acct_put('{"not":"a list"}'::jsonb)`), /bad input/);
  // leader sends a team to a phone number written any way
  const link = "https://antoniotyler22.github.io/eoop-muster/#me=abcdefghijklmnopqrst&k=zzzz";
  lead(`select public.inv_send('(555) 123-4567', 'team000001', 'Hilltop Run Club', 'Member', 'Sam Okafor', ${q(link)})`);
  lead(`select public.inv_send('(555) 123-4567', 'team000001', 'Hilltop Run Club', 'Member', 'Sam Okafor', ${q(link)})`);
  assert.equal(mem(`select count(*) from public.inv_mine()`), "1", "a resend replaces the waiting one");
  assert.equal(mem(`select link from public.inv_mine()`), link);
  assert.equal(other(`select count(*) from public.inv_mine()`), "0", "nobody else sees it");
  assert.equal(other(`select count(*) from public.inv_sent('team000001')`), "0", "only the sender sees what was sent");
  const id = mem(`select id from public.inv_mine()`);
  other(`select public.inv_cancel(${q(id)})`);
  assert.equal(mem(`select count(*) from public.inv_mine()`), "1", "someone else can't cancel it");
  other(`select public.inv_opened(${q(id)})`);
  assert.equal(lead(`select opened_at is null from public.inv_sent('team000001')`), "t", "someone else can't mark it opened");
  mem(`select public.inv_opened(${q(id)})`);
  assert.equal(lead(`select opened_at is not null from public.inv_sent('team000001')`), "t", "leader sees it was opened");
  assert.equal(lead(`select to_addr from public.inv_sent('team000001')`), "+15551234567");
  // email, case-insensitive
  lead(`select public.inv_send('OTHER@example.com', 'team000001', 'Hilltop Run Club', 'Editor', 'Whole board', ${q(link)})`);
  assert.equal(other(`select role from public.inv_mine()`), "Editor");
  assert.throws(() => lead(`select public.inv_send('nope', 'team000001', 'T', 'Member', 'X', ${q(link)})`), /bad address/);
  // delete my account: sign-in, saved list and everything I sent
  lead(`select public.acct_delete()`);
  assert.equal(pg.psql(`select count(*) from auth.users where id = ${q(u1)}`), "0");
  assert.equal(pg.psql(`select count(*) from public.af_invite where owner = ${q(u1)}`), "0");
  assert.equal(pg.psql(`select count(*) from public.af_account where user_id = ${q(u1)}`), "0");
});

test("company command notes: command key writes cmd rows only; platoon key reads only cmd rows and can't forge one", { skip }, () => {
  const rk = "r".repeat(32), wk = "w".repeat(32), co = "cmdtestco1";
  anon(`select public.create_company(${q(co)}, ${q(rk)}, ${q(wk)})`);
  anon(`select public.put_unit(${q(co)}, ${q(wk)}, 'plt1abcdef', 'unitdata')`);
  anon(`select public.put_cmd(${q(co)}, ${q(rk)}, 'cmdxo12345', 'notes')`);
  assert.throws(() => anon(`select public.put_cmd(${q(co)}, ${q(wk)}, 'cmdxo12345', 'x')`), /link not valid/, "platoon key can't write command notes");
  assert.throws(() => anon(`select public.put_cmd(${q(co)}, ${q(rk)}, 'plt1abcdef', 'x')`), /bad unit/, "command key can't overwrite a platoon");
  assert.throws(() => anon(`select public.put_unit(${q(co)}, ${q(wk)}, 'cmdfake123', 'x')`), /bad unit/, "platoon can't forge a command row");
  assert.equal(anon(`select string_agg(unit, ',') from public.get_cmd(${q(co)}, ${q(wk)})`), "cmdxo12345");
  assert.throws(() => anon(`select * from public.get_cmd(${q(co)}, ${q(rk.replace(/r$/, "s"))})`), /link not valid/);
  assert.equal(anon(`select count(*) from public.get_units(${q(co)}, ${q(rk)})`), "2", "command still sees everything");
});
