-- Part 20: Pro checked on the server.
-- The App Store (or Stripe, for web and Android) tells the server who is paying. The app gets a team token for that
-- subscription; Ask and the server hub only work for a token whose subscription is active. Members of that leader's
-- FEEDs can use Ask too (the leader's phone links each FEED it runs). Needs parts 4 (Feed) and 10 (Ask counters);
-- run it again after part 18 if you turn on the server hub later. Safe to re-run.
create table if not exists public.pro_ents (
  id text primary key check (id ~ '^(apple|stripe):[A-Za-z0-9_\-]{1,80}$'),
  source text not null check (source in ('apple', 'stripe')),
  product text not null check (char_length(product) <= 120),
  expires_at timestamptz,
  revoked boolean not null default false,
  env text check (env is null or char_length(env) <= 20),
  tok_hash text not null unique check (tok_hash ~ '^[0-9a-f]{64}$'),
  cust text check (cust is null or char_length(cust) <= 80),   -- Stripe customer id (web restore)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.pro_ents add column if not exists signed_at timestamptz;   -- when Apple/Stripe produced the latest message we used
alter table public.pro_ents enable row level security;
revoke all on public.pro_ents from anon, authenticated;

create table if not exists public.pro_feeds (
  feed_id text primary key references public.feeds(id) on delete cascade,
  ent_id text not null references public.pro_ents(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists pro_feeds_ent_idx on public.pro_feeds(ent_id);
alter table public.pro_feeds enable row level security;
revoke all on public.pro_feeds from anon, authenticated;

-- Server hub boards remember which subscription turned them on (null = turned on before Pro was checked; kept running).
do $$ begin
  if to_regclass('public.hub_jobs') is not null then
    alter table public.hub_jobs add column if not exists ent_id text references public.pro_ents(id) on delete set null;
  end if;
end $$;

-- Active = not refunded/revoked, and not past its end date. Real purchases get one day of grace for billing retries;
-- test purchases (Apple Sandbox/TestFlight/Xcode, Stripe test mode) are free to make, so they get none.
create or replace function public.pro_is_live(r public.pro_ents)
returns boolean language sql immutable as $$
  select coalesce(r.env, 'Production') in ('Production', 'live')
$$;
create or replace function public.pro_is_active(r public.pro_ents)
returns boolean language sql stable as $$
  select coalesce(not r.revoked and (r.expires_at is null and public.pro_is_live(r)
    or r.expires_at > now() - case when public.pro_is_live(r) then interval '1 day' else interval '0' end), false)
$$;

-- The app asks "is my team token still Pro?" Only someone holding the token learns anything.
create or replace function public.pro_check(p_tok text)
returns table(active boolean, expires_at timestamptz, source text, product text)
language plpgsql stable security definer set search_path = public as $$
begin
  if p_tok is null or char_length(p_tok) < 32 or char_length(p_tok) > 128 then return; end if;
  return query select public.pro_is_active(e), e.expires_at, e.source, e.product
    from public.pro_ents e where e.tok_hash = encode(sha256(convert_to(p_tok, 'UTF8')), 'hex');
end $$;

-- Leader links a FEED they run to their Pro, so members of it can use Ask. Proves both: the team token and the FEED's leader key.
create or replace function public.pro_link_feed(p_tok text, p_feed text, p_lk text)
returns boolean language plpgsql security definer set search_path = public as $$
declare eid text;
begin
  select e.id into eid from public.pro_ents e
    where e.tok_hash = encode(sha256(convert_to(coalesce(p_tok, ''), 'UTF8')), 'hex') and public.pro_is_active(e);
  if eid is null then raise exception 'not pro'; end if;
  -- One subscription covers up to 5 FEEDs (a leader's own team plus a few sections); more needs another subscription.
  if (select count(*) from public.pro_feeds pf where pf.ent_id = eid and pf.feed_id <> p_feed) >= 5 then
    raise exception 'Pro covers up to 5 Feeds'; end if;
  if not exists (select 1 from public.feeds f where f.id = p_feed
      and f.leader_key_hash = encode(sha256(convert_to(coalesce(p_lk, ''), 'UTF8')), 'hex')) then raise exception 'not allowed'; end if;
  insert into public.pro_feeds(feed_id, ent_id) values (p_feed, eid)
    on conflict (feed_id) do update set ent_id = excluded.ent_id, created_at = now();
  return true;
end $$;

-- For the server functions (service role only): which active subscription covers this request?
create or replace function public.pro_ent_for(p_tok text, p_feed text, p_mk text)
returns text language plpgsql stable security definer set search_path = public as $$
declare eid text;
begin
  if p_tok is not null and char_length(p_tok) between 32 and 128 then
    select e.id into eid from public.pro_ents e
      where e.tok_hash = encode(sha256(convert_to(p_tok, 'UTF8')), 'hex') and public.pro_is_active(e);
    if eid is not null then return eid; end if;
  end if;
  if p_feed is not null and p_mk is not null and char_length(p_mk) >= 24 then
    select e.id into eid from public.pro_feeds pf
      join public.feeds f on f.id = pf.feed_id
      join public.pro_ents e on e.id = pf.ent_id
      where pf.feed_id = p_feed and f.member_key_hash = encode(sha256(convert_to(p_mk, 'UTF8')), 'hex') and public.pro_is_active(e);
  end if;
  return eid;
end $$;

revoke all on function public.pro_is_active(public.pro_ents) from public, anon, authenticated;
revoke all on function public.pro_is_live(public.pro_ents) from public, anon, authenticated;
-- Usage counter that adds several at once (server texting counts each text). Server only.
create or replace function public.usage_add(p_k text, p_n int)
returns int language plpgsql security definer set search_path = public as $$
declare c int;
begin
  if p_n is null or p_n < 1 or p_n > 1000 then raise exception 'bad input'; end if;
  insert into public.ai_usage(day, k, n) values (current_date, p_k, p_n)
  on conflict (day, k) do update set n = public.ai_usage.n + p_n returning n into c;
  return c;
end $$;
revoke all on function public.usage_add(text, int) from public, anon, authenticated;
grant execute on function public.usage_add(text, int) to service_role;

grant execute on function public.pro_check(text), public.pro_link_feed(text, text, text) to anon;
revoke all on function public.pro_ent_for(text, text, text) from public, anon, authenticated;
grant execute on function public.pro_ent_for(text, text, text) to service_role;
grant all on public.pro_ents, public.pro_feeds to service_role;

notify pgrst, 'reload schema';
