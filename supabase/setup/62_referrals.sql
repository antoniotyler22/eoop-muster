-- Part 62: referral counts. A leader shares a link (accountedforteam.com/?ref=CODE). When someone opens the app from that
-- link the phone says "joined", and the first time that person closes out a drill it says "active". The sharer's phone
-- reads the two counts. The server keeps only: the code, a random device id for each side, and two timestamps.
-- No names, no contacts, no location. No reward is attached to these numbers. Safe to re-run.
create table if not exists public.ref_codes (
  code text primary key check (code ~ '^[a-z0-9]{4,12}$'),
  owner_dev text not null check (owner_dev ~ '^[a-z0-9]{8,40}$'),
  created_at timestamptz not null default now()
);
create table if not exists public.ref_joins (
  code text not null check (code ~ '^[a-z0-9]{4,12}$'),
  dev text not null check (dev ~ '^[a-z0-9]{8,40}$'),
  joined_at timestamptz not null default now(),
  active_at timestamptz,
  primary key (code, dev)
);
create index if not exists ref_joins_dev_idx on public.ref_joins(dev);
alter table public.ref_codes enable row level security;
alter table public.ref_joins enable row level security;
revoke all on public.ref_codes from anon, authenticated;
revoke all on public.ref_joins from anon, authenticated;

-- Sharer's phone: claim a code for this device (first device to claim it keeps it).
create or replace function public.ref_register(p_code text, p_dev text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_code is null or p_code !~ '^[a-z0-9]{4,12}$' or p_dev is null or p_dev !~ '^[a-z0-9]{8,40}$' then raise exception 'bad input'; end if;
  if (select count(*) from public.ref_codes where created_at > now() - interval '1 hour') >= 500 then raise exception 'too many'; end if;
  insert into public.ref_codes(code, owner_dev) values (p_code, p_dev) on conflict (code) do nothing;
end $$;

-- New person's phone: counted once per device. You cannot join your own code, and one code takes at most 200 joins a day.
create or replace function public.ref_join(p_code text, p_dev text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_code is null or p_code !~ '^[a-z0-9]{4,12}$' or p_dev is null or p_dev !~ '^[a-z0-9]{8,40}$' then raise exception 'bad input'; end if;
  if exists (select 1 from public.ref_codes c where c.code = p_code and c.owner_dev = p_dev) then return; end if;
  if exists (select 1 from public.ref_joins j where j.dev = p_dev) then return; end if;
  if (select count(*) from public.ref_joins where code = p_code and joined_at > now() - interval '1 day') >= 200 then raise exception 'too many'; end if;
  insert into public.ref_joins(code, dev) values (p_code, p_dev) on conflict do nothing;
end $$;

-- New person's phone: first drill closed out.
create or replace function public.ref_active(p_dev text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_dev is null or p_dev !~ '^[a-z0-9]{8,40}$' then raise exception 'bad input'; end if;
  update public.ref_joins set active_at = now() where dev = p_dev and active_at is null;
end $$;

-- Sharer's phone: the two counts for a code it owns.
create or replace function public.ref_stats(p_code text, p_dev text)
returns table(joined int, active int) language plpgsql security definer set search_path = public as $$
begin
  if p_code is null or p_code !~ '^[a-z0-9]{4,12}$' or p_dev is null or p_dev !~ '^[a-z0-9]{8,40}$' then raise exception 'bad input'; end if;
  if not exists (select 1 from public.ref_codes c where c.code = p_code and c.owner_dev = p_dev) then raise exception 'not allowed'; end if;
  return query select count(*)::int, count(j.active_at)::int from public.ref_joins j where j.code = p_code;
end $$;

revoke all on function public.ref_register(text, text) from public;
revoke all on function public.ref_join(text, text) from public;
revoke all on function public.ref_active(text) from public;
revoke all on function public.ref_stats(text, text) from public;
grant execute on function public.ref_register(text, text) to anon, authenticated;
grant execute on function public.ref_join(text, text) to anon, authenticated;
grant execute on function public.ref_active(text) to anon, authenticated;
grant execute on function public.ref_stats(text, text) to anon, authenticated;

insert into public.setup_log(part, note) values ('62_referrals', 'referral counts: ref_codes, ref_joins, ref_register, ref_join, ref_active, ref_stats') on conflict (part) do nothing;
