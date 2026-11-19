-- Part 53 (4.127.0): join codes and Ask to join. Needs part 4 (feeds). Safe to re-run.
--
-- Join code: each team (its Word of Mouth feed) can have one 6-character code (no 0, O, 1 or I).
--   The server keeps only h = sha256("af-join-v1:" + code) and ct = the team's member link, encrypted on the owner's
--   phone with a key made from the code. Someone who types the code gets ct and opens it on their phone; the server
--   never sees the code or the link. Only the owner's leader key can set, replace or turn off the code.
--   Wrong guesses are limited: after 30 misses in 10 minutes from anywhere, lookups wait.
--
-- Ask to join: a team the owner lists can be found by name. A person sends a request encrypted to the owner's public
--   key (only the owner's phone can read who is asking). The owner approves or declines with the leader key; an
--   approval carries the member link encrypted to the person's own public key. The person checks the result with a
--   secret token only they have. Nobody else can list requests or read the answers.

create table if not exists public.join_codes (
  feed_id text primary key references public.feeds(id) on delete cascade,
  h text not null unique check (h ~ '^[0-9a-f]{64}$'),
  ct text not null check (char_length(ct) <= 6000),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.join_codes enable row level security;
revoke all on public.join_codes from anon, authenticated;

create table if not exists public.join_misses (at timestamptz not null default now());
create index if not exists join_misses_at on public.join_misses (at);
alter table public.join_misses enable row level security;
revoke all on public.join_misses from anon, authenticated;

create or replace function public.af_leader_ok(p_feed text, p_leader_key text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.feeds f where f.id = p_feed
    and f.leader_key_hash = encode(sha256(convert_to(coalesce(p_leader_key,''),'UTF8')),'hex'));
$$;
revoke all on function public.af_leader_ok(text,text) from public;

-- owner: set or replace the code (the old code stops working at once)
create or replace function public.join_code_set(p_feed text, p_leader_key text, p_h text, p_ct text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.af_leader_ok(p_feed, p_leader_key) then raise exception 'not allowed'; end if;
  if coalesce(p_h,'') !~ '^[0-9a-f]{64}$' or char_length(coalesce(p_ct,'')) not between 1 and 6000 then raise exception 'bad input'; end if;
  if exists (select 1 from public.join_codes c where c.h = p_h and c.feed_id <> p_feed) then raise exception 'code taken'; end if;
  insert into public.join_codes(feed_id, h, ct, enabled, updated_at) values (p_feed, p_h, p_ct, true, now())
  on conflict (feed_id) do update set h = excluded.h, ct = excluded.ct, enabled = true, updated_at = now();
end $$;

-- owner: turn the code off or back on
create or replace function public.join_code_enable(p_feed text, p_leader_key text, p_on boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.af_leader_ok(p_feed, p_leader_key) then raise exception 'not allowed'; end if;
  update public.join_codes set enabled = coalesce(p_on,false), updated_at = now() where feed_id = p_feed;
end $$;

-- anyone with the code: the sealed member link (nothing when it's wrong or turned off)
drop function if exists public.join_code_get(text);
create function public.join_code_get(p_h text)
returns table(feed_id text, ct text)
language plpgsql volatile security definer set search_path = public as $$
begin
  if (select count(*) from public.join_misses m where m.at > now() - interval '10 minutes') >= 30 then raise exception 'too many tries, wait a few minutes'; end if;
  return query select c.feed_id, c.ct from public.join_codes c where c.h = p_h and c.enabled;
  if not found then
    insert into public.join_misses(at) values (now());
    delete from public.join_misses where at < now() - interval '1 hour';
  end if;
end $$;

-- ---------- Ask to join ----------
create table if not exists public.team_dir (
  feed_id text primary key references public.feeds(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  name_norm text not null,
  pub text not null check (char_length(pub) <= 400),
  updated_at timestamptz not null default now()
);
create index if not exists team_dir_name on public.team_dir (name_norm text_pattern_ops);
alter table public.team_dir enable row level security;
revoke all on public.team_dir from anon, authenticated;

create table if not exists public.join_reqs (
  id bigserial primary key,
  feed_id text not null references public.feeds(id) on delete cascade,
  ct text not null check (char_length(ct) <= 4000),
  tok_hash text not null check (tok_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  reply_ct text check (reply_ct is null or char_length(reply_ct) <= 6000),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists join_reqs_feed on public.join_reqs (feed_id, status, id);
alter table public.join_reqs enable row level security;
revoke all on public.join_reqs from anon, authenticated;

-- owner: list the team by name (with the public key requests are sealed to), or take it off the list
create or replace function public.team_dir_put(p_feed text, p_leader_key text, p_name text, p_pub text, p_on boolean)
returns void language plpgsql security definer set search_path = public as $$
declare n text := btrim(regexp_replace(coalesce(p_name,''), '\s+', ' ', 'g'));
begin
  if not public.af_leader_ok(p_feed, p_leader_key) then raise exception 'not allowed'; end if;
  if not coalesce(p_on,false) then delete from public.team_dir where feed_id = p_feed; return; end if;
  if char_length(n) not between 1 and 40 or char_length(coalesce(p_pub,'')) not between 20 and 400 then raise exception 'bad input'; end if;
  insert into public.team_dir(feed_id, name, name_norm, pub, updated_at) values (p_feed, n, lower(n), p_pub, now())
  on conflict (feed_id) do update set name = excluded.name, name_norm = excluded.name_norm, pub = excluded.pub, updated_at = now();
end $$;

-- anyone: find listed teams by the start of a word in their name (at least 3 letters, 10 results)
drop function if exists public.team_dir_find(text);
create function public.team_dir_find(p_q text)
returns table(feed_id text, name text, pub text)
language sql stable security definer set search_path = public as $$
  select d.feed_id, d.name, d.pub from public.team_dir d
  where char_length(btrim(coalesce(p_q,''))) >= 3
    and (d.name_norm like lower(btrim(p_q)) || '%' or d.name_norm like '% ' || lower(btrim(p_q)) || '%')
  order by d.name limit 10;
$$;

-- anyone: the listing for one team (after a join code, to ask instead of joining)
drop function if exists public.team_dir_get(text);
create function public.team_dir_get(p_feed text)
returns table(feed_id text, name text, pub text)
language sql stable security definer set search_path = public as $$
  select d.feed_id, d.name, d.pub from public.team_dir d where d.feed_id = p_feed;
$$;

-- a person: send a request (sealed to the owner). At most 50 waiting per team.
create or replace function public.join_req_send(p_feed text, p_ct text, p_tok_hash text)
returns bigint language plpgsql security definer set search_path = public as $$
declare i bigint;
begin
  if not exists (select 1 from public.team_dir d where d.feed_id = p_feed) then raise exception 'team not taking requests'; end if;
  if char_length(coalesce(p_ct,'')) not between 1 and 4000 or coalesce(p_tok_hash,'') !~ '^[0-9a-f]{64}$' then raise exception 'bad input'; end if;
  if (select count(*) from public.join_reqs r where r.feed_id = p_feed and r.status = 'pending') >= 50 then raise exception 'too many waiting requests'; end if;
  insert into public.join_reqs(feed_id, ct, tok_hash) values (p_feed, p_ct, p_tok_hash) returning id into i;
  delete from public.join_reqs where created_at < now() - interval '30 days';
  return i;
end $$;

-- owner: the requests (sealed; only the owner's phone can open them)
drop function if exists public.join_req_list(text,text);
create function public.join_req_list(p_feed text, p_leader_key text)
returns table(id bigint, ct text, status text, created_at timestamptz, decided_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.af_leader_ok(p_feed, p_leader_key) then raise exception 'not allowed'; end if;
  return query select r.id, r.ct, r.status, r.created_at, r.decided_at from public.join_reqs r
    where r.feed_id = p_feed and (r.status = 'pending' or r.decided_at > now() - interval '7 days') order by r.id desc limit 200;
end $$;

-- owner: approve (with the sealed answer) or decline
create or replace function public.join_req_decide(p_feed text, p_leader_key text, p_id bigint, p_status text, p_reply_ct text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.af_leader_ok(p_feed, p_leader_key) then raise exception 'not allowed'; end if;
  if p_status not in ('approved','declined') then raise exception 'bad input'; end if;
  if p_status = 'approved' and char_length(coalesce(p_reply_ct,'')) not between 1 and 6000 then raise exception 'bad input'; end if;
  update public.join_reqs set status = p_status, reply_ct = case when p_status = 'approved' then p_reply_ct else null end, decided_at = now()
    where id = p_id and feed_id = p_feed;
  if not found then raise exception 'no such request'; end if;
end $$;

-- the person who asked: the answer, with their secret token
drop function if exists public.join_req_status(bigint,text);
create function public.join_req_status(p_id bigint, p_tok text)
returns table(status text, reply_ct text, decided_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.status, r.reply_ct, r.decided_at from public.join_reqs r
  where r.id = p_id and r.tok_hash = encode(sha256(convert_to(coalesce(p_tok,''),'UTF8')),'hex');
$$;

revoke all on function public.join_code_set(text,text,text,text), public.join_code_enable(text,text,boolean), public.join_code_get(text),
  public.team_dir_put(text,text,text,text,boolean), public.team_dir_find(text), public.team_dir_get(text), public.join_req_send(text,text,text),
  public.join_req_list(text,text), public.join_req_decide(text,text,bigint,text,text), public.join_req_status(bigint,text) from public;
grant execute on function public.join_code_set(text,text,text,text), public.join_code_enable(text,text,boolean), public.join_code_get(text),
  public.team_dir_put(text,text,text,text,boolean), public.team_dir_find(text), public.team_dir_get(text), public.join_req_send(text,text,text),
  public.join_req_list(text,text), public.join_req_decide(text,text,bigint,text,text), public.join_req_status(bigint,text) to anon, authenticated;

notify pgrst, 'reload schema';
