-- 58: owner sign-in hardening (4.140.0) and a ledger of which setup parts have been run.
-- Safe to re-run.
-- 1) Salted owner password: the owner function upgrades the old unsalted SHA-256 hash to PBKDF2-SHA256 (210,000 rounds,
--    random salt) the next time the owner signs in, and stores it here. The old column is then cleared.
alter table public.app_cfg add column if not exists owner_hash2 text
  check (owner_hash2 is null or owner_hash2 ~ '^pbkdf2\$[0-9]{4,7}\$[0-9a-f]{32}\$[0-9a-f]{64}$');
-- 2) The sign-in lockout now counts bad tries from owner_log in the database (it used to live in one server instance's memory).
create index if not exists owner_log_login_fail_idx on public.owner_log(op, ok, t desc);
-- 3) A ledger of setup parts. Add one `insert` at the bottom of every new part from here on, so the live database
--    can answer "which parts have I run?" (select * from public.setup_log order by applied_at).
create table if not exists public.setup_log (
  part text primary key check (char_length(part) <= 80),
  applied_at timestamptz not null default now(),
  note text not null default ''
);
alter table public.setup_log enable row level security;
revoke all on public.setup_log from anon, authenticated;
grant select, insert on public.setup_log to service_role;
insert into public.setup_log(part, note) values ('58_owner_security_ledger', 'owner PBKDF2 hash, DB lockout, setup ledger') on conflict (part) do nothing;
