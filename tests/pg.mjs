// Throwaway Postgres for tests: runs every supabase/setup/*.sql in order against a real database
// that mimics Supabase's roles (anon, authenticated, service_role) and stubs pg_cron / pg_net.
// Skips (returns null) when Postgres isn't installed on this machine.
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ROOT } from "./harness.mjs";

function findBin() {
  const cands = [process.env.PG_BIN, "/usr/lib/postgresql/17/bin", "/usr/lib/postgresql/16/bin", "/usr/lib/postgresql/15/bin", "/opt/homebrew/bin", "/usr/local/bin"].filter(Boolean);
  return cands.find((d) => fs.existsSync(path.join(d, "initdb")) && fs.existsSync(path.join(d, "pg_ctl")));
}

const STUBS = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema if not exists cron; create schema if not exists net;
create table cron.job(jobid bigserial primary key, jobname text, schedule text, command text);
create function cron.schedule(n text, s text, c text) returns bigint language sql as $$ insert into cron.job(jobname,schedule,command) values(n,s,c) returning jobid $$;
create function cron.unschedule(n text) returns boolean language sql as $$ delete from cron.job where jobname=n returning true $$;
create function cron.unschedule(i bigint) returns boolean language sql as $$ delete from cron.job where jobid=i returning true $$;
create table net.calls(id bigserial primary key, url text, body jsonb);
create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000) returns bigint
  language sql as $$ insert into net.calls(url, body) values(url, body) returning id $$;
create extension if not exists pgcrypto;
-- Supabase Auth stand-ins: auth.users, auth.uid() and auth.jwt() read the request's JWT claims.
create schema if not exists auth;
create table auth.users(id uuid primary key default gen_random_uuid(), email text, phone text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(nullif(current_setting('request.jwt.claims', true),'')::jsonb->>'sub','')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true),''),'{}')::jsonb $$;
grant usage on schema auth to anon, authenticated, service_role;
-- Supabase opens new tables and functions to the API roles by default; each setup part must close them again.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

export async function startPg() {
  const bin = findBin();
  if (!bin) return null;
  const asRoot = process.getuid && process.getuid() === 0;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "af-pg-"));
  const data = path.join(dir, "data"), sock = dir;
  const run = (cmd, args) => {
    const full = path.join(bin, cmd);
    return asRoot ? execFileSync("runuser", ["-u", "postgres", "--", full, ...args], { stdio: "pipe" }) : execFileSync(full, args, { stdio: "pipe" });
  };
  if (asRoot) execFileSync("chown", ["-R", "postgres", dir]);
  run("initdb", ["-D", data, "-A", "trust", "-U", "postgres", "--no-sync"]);
  const port = String(55000 + Math.floor(Math.random() * 5000));
  run("pg_ctl", ["-D", data, "-o", `-k ${sock} -p ${port} -c listen_addresses=''`, "-l", path.join(dir, "log"), "-w", "start"]);
  const psqlBin = fs.existsSync(path.join(bin, "psql")) ? path.join(bin, "psql") : "psql";
  const psql = (sql, opts = {}) => execFileSync(psqlBin, ["-h", sock, "-p", port, "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-X", "-q", "-t", "-A", ...(opts.file ? ["-f", opts.file] : ["-c", sql])], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  psql(STUBS);
  const stop = () => { try { run("pg_ctl", ["-D", data, "-m", "immediate", "stop"]); } catch {} fs.rmSync(dir, { recursive: true, force: true }); };
  return { psql, stop, setupFiles };
}

export function setupFiles() {
  const d = path.join(ROOT, "supabase", "setup");
  return fs.readdirSync(d).filter((f) => f.endsWith(".sql")).sort().map((f) => path.join(d, f));
}
