-- 1.7 Accounts (optional). Uses Supabase Auth: email code, text code, or Sign in with Apple.
-- 1) Your account keeps a list of your teams' recovery codes, so signing in on another phone brings them back.
-- 2) A leader who is signed in can send a team to someone's email or phone number. When that person signs in
--    with that email or number, the team is waiting for them (they tap Open). This is the "push" to accounts.
-- Every function here needs a signed-in user to do anything. Each person sees only their own account and the teams sent to them.
-- Run this whole file once in Supabase → SQL Editor. Safe to run again.

create table if not exists public.af_account (
  user_id uuid primary key references auth.users(id) on delete cascade,
  teams jsonb not null default '[]'::jsonb check (octet_length(teams::text) <= 40000),
  updated_at timestamptz not null default now()
);
alter table public.af_account enable row level security;
revoke all on public.af_account from anon, authenticated;

create table if not exists public.af_invite (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  to_email text check (to_email is null or to_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  to_phone text check (to_phone is null or to_phone ~ '^[0-9]{8,15}$'),
  team text not null check (char_length(team) between 4 and 64),
  team_name text not null default '' check (char_length(team_name) <= 60),
  role text not null default '' check (char_length(role) <= 40),
  label text not null default '' check (char_length(label) <= 80),
  link text not null check (char_length(link) between 20 and 4000),
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  check (to_email is not null or to_phone is not null)
);
create index if not exists af_invite_email on public.af_invite (to_email);
create index if not exists af_invite_phone on public.af_invite (to_phone);
create index if not exists af_invite_owner on public.af_invite (owner, team);
alter table public.af_invite enable row level security;
revoke all on public.af_invite from anon, authenticated;

-- who is calling: their email (lower case) and phone (digits only)
create or replace function public.af_me_email() returns text language sql stable as $$
  select nullif(lower(coalesce(auth.jwt()->>'email','')),'') $$;
create or replace function public.af_me_phone() returns text language sql stable as $$
  select nullif(regexp_replace(coalesce(auth.jwt()->>'phone',''),'[^0-9]','','g'),'') $$;

-- your saved teams
create or replace function public.acct_get()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare t jsonb;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select a.teams into t from public.af_account a where a.user_id = auth.uid();
  return coalesce(t, '[]'::jsonb);
end $$;

create or replace function public.acct_put(p_teams jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if jsonb_typeof(p_teams) <> 'array' or jsonb_array_length(p_teams) > 50 or octet_length(p_teams::text) > 40000 then raise exception 'bad input'; end if;
  insert into public.af_account(user_id, teams, updated_at) values (auth.uid(), p_teams, now())
  on conflict (user_id) do update set teams = excluded.teams, updated_at = now();
end $$;

-- delete my account: my saved teams, everything I sent, and the sign-in itself (App Store rule 5.1.1)
create or replace function public.acct_delete()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  delete from public.af_invite where owner = auth.uid();
  delete from public.af_account where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;

-- leader: send a team to an email or phone number
create or replace function public.inv_send(p_to text, p_team text, p_team_name text, p_role text, p_label text, p_link text)
returns uuid language plpgsql security definer set search_path = public as $$
declare e text; ph text; n int; i uuid;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if position('@' in coalesce(p_to,'')) > 0 then e := lower(trim(p_to));
  else ph := regexp_replace(coalesce(p_to,''),'[^0-9]','','g'); if char_length(ph) = 10 then ph := '1' || ph; end if; end if;
  if e is null and (ph is null or char_length(ph) < 8) then raise exception 'bad address'; end if;
  select count(*) into n from public.af_invite where owner = auth.uid() and created_at > now() - interval '1 day';
  if n >= 300 then raise exception 'too many today'; end if;
  delete from public.af_invite where created_at < now() - interval '180 days';
  -- one waiting invite per person per team and role: a new one replaces the old
  delete from public.af_invite where owner = auth.uid() and team = p_team and role = coalesce(p_role,'')
    and label = coalesce(p_label,'') and (to_email = e or to_phone = ph);
  insert into public.af_invite(owner, to_email, to_phone, team, team_name, role, label, link)
  values (auth.uid(), e, ph, p_team, left(coalesce(p_team_name,''),60), left(coalesce(p_role,''),40), left(coalesce(p_label,''),80), p_link)
  returning id into i;
  return i;
end $$;

-- leader: what I sent for this team
create or replace function public.inv_sent(p_team text)
returns table(id uuid, to_addr text, role text, label text, created_at timestamptz, opened_at timestamptz)
language sql stable security definer set search_path = public as $$
  select x.id, coalesce(x.to_email, '+' || x.to_phone), x.role, x.label, x.created_at, x.opened_at
  from public.af_invite x where x.owner = auth.uid() and x.team = p_team order by x.created_at desc limit 200 $$;

create or replace function public.inv_cancel(p_id uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.af_invite where id = p_id and owner = auth.uid() $$;

-- member: teams sent to my email or phone
create or replace function public.inv_mine()
returns table(id uuid, team text, team_name text, role text, label text, link text, created_at timestamptz, opened_at timestamptz)
language sql stable security definer set search_path = public as $$
  select x.id, x.team, x.team_name, x.role, x.label, x.link, x.created_at, x.opened_at
  from public.af_invite x
  where auth.uid() is not null and ((x.to_email is not null and x.to_email = public.af_me_email()) or (x.to_phone is not null and x.to_phone = public.af_me_phone()))
  order by x.created_at desc limit 100 $$;

create or replace function public.inv_opened(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.af_invite set opened_at = coalesce(opened_at, now())
  where id = p_id and ((to_email is not null and to_email = public.af_me_email()) or (to_phone is not null and to_phone = public.af_me_phone())) $$;

revoke all on function public.acct_get(), public.acct_put(jsonb), public.acct_delete(),
  public.inv_send(text,text,text,text,text,text), public.inv_sent(text), public.inv_cancel(uuid), public.inv_mine(), public.inv_opened(uuid)
  from public;
-- anon can call them too (System check uses that to see they exist), but every one of them needs a signed-in user to do anything.
grant execute on function public.acct_get(), public.acct_put(jsonb), public.acct_delete(),
  public.inv_send(text,text,text,text,text,text), public.inv_sent(text), public.inv_cancel(uuid), public.inv_mine(), public.inv_opened(uuid)
  to anon, authenticated;
