-- Part 55 (4.128.0): calendar visibility by section. Needs part 4 (feeds). Safe to re-run.
--
-- Each team calendar event belongs to one scope: "Everyone", or one section. Every scope has its own keys, made on the
-- owner's phone:
--   ek  encrypts the event (never sent to the server),
--   rk  reads the scope's events (the server keeps only its hash),
--   wk  writes events into the scope (hash only).
-- Phones only ever get the keys for what they may see: the owner and full-board phones all of them; a section leader
-- Everyone plus their own section (inside their section's roster, already sealed per section); a member Everyone plus
-- each section they belong to, or everything if the owner gave them full calendar access (inside their own My page).
-- cal_get returns an event only when the caller presents its scope's read key, so another section's events can't be
-- read, even by asking for that scope directly. The scope ids are random and say nothing about the section.

create table if not exists public.cal_scopes (
  feed_id text not null references public.feeds(id) on delete cascade,
  scope text not null check (scope ~ '^[a-z0-9]{16,32}$'),
  rk_hash text not null check (rk_hash ~ '^[0-9a-f]{64}$'),
  wk_hash text not null check (wk_hash ~ '^[0-9a-f]{64}$'),
  updated_at timestamptz not null default now(),
  primary key (feed_id, scope)
);
alter table public.cal_scopes enable row level security;
revoke all on public.cal_scopes from anon, authenticated;

create table if not exists public.cal_events (
  feed_id text not null,
  scope text not null,
  eid text not null check (eid ~ '^[A-Za-z0-9_-]{1,40}$'),
  ct text not null check (char_length(ct) <= 4000),
  updated_at timestamptz not null default now(),
  primary key (feed_id, scope, eid),
  foreign key (feed_id, scope) references public.cal_scopes(feed_id, scope) on delete cascade
);
alter table public.cal_events enable row level security;
revoke all on public.cal_events from anon, authenticated;

-- owner: create a scope or change its keys (changing the read key cuts off everyone holding the old one)
create or replace function public.cal_scope_put(p_feed text, p_leader_key text, p_scope text, p_rk_hash text, p_wk_hash text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.feeds f where f.id = p_feed
    and f.leader_key_hash = encode(sha256(convert_to(coalesce(p_leader_key,''),'UTF8')),'hex')) then raise exception 'not allowed'; end if;
  if coalesce(p_scope,'') !~ '^[a-z0-9]{16,32}$' or coalesce(p_rk_hash,'') !~ '^[0-9a-f]{64}$' or coalesce(p_wk_hash,'') !~ '^[0-9a-f]{64}$' then raise exception 'bad input'; end if;
  insert into public.cal_scopes(feed_id, scope, rk_hash, wk_hash, updated_at) values (p_feed, p_scope, p_rk_hash, p_wk_hash, now())
  on conflict (feed_id, scope) do update set rk_hash = excluded.rk_hash, wk_hash = excluded.wk_hash, updated_at = now();
end $$;

-- a scope's writer (owner, or a section leader for their own section): replace that scope's events
create or replace function public.cal_put(p_feed text, p_scope text, p_wk text, p_rows jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not exists (select 1 from public.cal_scopes s where s.feed_id = p_feed and s.scope = p_scope
    and s.wk_hash = encode(sha256(convert_to(coalesce(p_wk,''),'UTF8')),'hex')) then raise exception 'not allowed'; end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) > 1000 then raise exception 'bad input'; end if;
  if exists (select 1 from jsonb_array_elements(p_rows) r where coalesce(r->>'e','') !~ '^[A-Za-z0-9_-]{1,40}$'
    or char_length(coalesce(r->>'ct','')) not between 1 and 4000) then raise exception 'bad input'; end if;
  delete from public.cal_events where feed_id = p_feed and scope = p_scope;
  insert into public.cal_events(feed_id, scope, eid, ct)
    select distinct on (r->>'e') p_feed, p_scope, r->>'e', r->>'ct' from jsonb_array_elements(p_rows) r;
  get diagnostics n = row_count;
  return n;
end $$;

-- a reader: the events of every scope whose read key it presents ([{"s": scope, "k": read key}, ...], at most 20)
drop function if exists public.cal_get(text,jsonb);
create function public.cal_get(p_feed text, p_keys jsonb)
returns table(scope text, eid text, ct text, updated_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if jsonb_typeof(p_keys) is distinct from 'array' or jsonb_array_length(p_keys) > 20 then raise exception 'bad input'; end if;
  return query select e.scope, e.eid, e.ct, e.updated_at
    from public.cal_events e
    join public.cal_scopes s on s.feed_id = e.feed_id and s.scope = e.scope
    join jsonb_array_elements(p_keys) k on k->>'s' = s.scope
      and s.rk_hash = encode(sha256(convert_to(coalesce(k->>'k',''),'UTF8')),'hex')
    where e.feed_id = p_feed
    order by e.updated_at desc limit 2000;
end $$;

revoke all on function public.cal_scope_put(text,text,text,text,text), public.cal_put(text,text,text,jsonb), public.cal_get(text,jsonb) from public;
grant execute on function public.cal_scope_put(text,text,text,text,text), public.cal_put(text,text,text,jsonb), public.cal_get(text,jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
