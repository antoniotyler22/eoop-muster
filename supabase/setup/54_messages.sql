-- Part 54 (4.128.0): "Message someone" (1:1 threads) and the end of the big team chat. Needs parts 4, 17 and 44. Safe to re-run.
--
-- Message someone. Each person on a team can publish a public key under an opaque id (sha256 of the team feed id and
-- their roster id); the first phone to claim an id keeps it (a secret token proves it later), so nobody, the owner
-- included, can swap in their own key. To start a thread, a phone makes a fresh thread key and sends it sealed to the
-- other person's public key (pm_inv_send); only that person can list their sealed invites (pm_inv_get, with their token).
-- The messages themselves use the part 17 thread functions (dm_open / dm_send / dm_get) with a thread key and an inbox key
-- that only the two phones have, so the owner's inbox (dm_inbox) never covers these threads. The server stores ciphertext.
--
-- Team chat: retired. chat_send refuses new messages; chat_get keeps working until the old messages expire (30 days),
-- so every phone can copy them into its read-only "Earlier team chat" archive. Official channel posts (part 45) are not
-- touched.

create table if not exists public.pm_keys (
  feed_id text not null references public.feeds(id) on delete cascade,
  mh text not null check (mh ~ '^[0-9a-f]{64}$'),
  pub text not null check (char_length(pub) between 20 and 400),
  tok_hash text not null check (tok_hash ~ '^[0-9a-f]{64}$'),
  updated_at timestamptz not null default now(),
  primary key (feed_id, mh)
);
alter table public.pm_keys enable row level security;
revoke all on public.pm_keys from anon, authenticated;

create table if not exists public.pm_invites (
  id bigserial primary key,
  feed_id text not null references public.feeds(id) on delete cascade,
  to_mh text not null check (to_mh ~ '^[0-9a-f]{64}$'),
  ct text not null check (char_length(ct) <= 4000),
  created_at timestamptz not null default now()
);
create index if not exists pm_invites_to on public.pm_invites (feed_id, to_mh, id);
alter table public.pm_invites enable row level security;
revoke all on public.pm_invites from anon, authenticated;

-- anyone on the team: the member key or the owner's leader key
create or replace function public.af_team_ok(p_feed text, p_key text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.feeds f where f.id = p_feed
    and encode(sha256(convert_to(coalesce(p_key,''),'UTF8')),'hex') in (f.member_key_hash, f.leader_key_hash));
$$;
revoke all on function public.af_team_ok(text,text) from public;

-- a person's phone: publish (or, with its token, replace) its public key
create or replace function public.pm_key_put(p_feed text, p_key text, p_mh text, p_pub text, p_tok text)
returns void language plpgsql security definer set search_path = public as $$
declare th text := encode(sha256(convert_to(coalesce(p_tok,''),'UTF8')),'hex');
begin
  if not public.af_team_ok(p_feed, p_key) then raise exception 'not allowed'; end if;
  if coalesce(p_mh,'') !~ '^[0-9a-f]{64}$' or char_length(coalesce(p_pub,'')) not between 20 and 400 or char_length(coalesce(p_tok,'')) < 24 then raise exception 'bad input'; end if;
  if exists (select 1 from public.pm_keys k where k.feed_id = p_feed and k.mh = p_mh and k.tok_hash <> th) then raise exception 'taken'; end if;
  insert into public.pm_keys(feed_id, mh, pub, tok_hash, updated_at) values (p_feed, p_mh, p_pub, th, now())
  on conflict (feed_id, mh) do update set pub = excluded.pub, updated_at = now();
end $$;

drop function if exists public.pm_key_get(text,text,text);
create function public.pm_key_get(p_feed text, p_key text, p_mh text)
returns table(pub text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.af_team_ok(p_feed, p_key) then raise exception 'not allowed'; end if;
  return query select k.pub from public.pm_keys k where k.feed_id = p_feed and k.mh = p_mh;
end $$;

-- start a thread: the sealed thread key goes to the other person (at most 200 a day per team)
create or replace function public.pm_inv_send(p_feed text, p_key text, p_to text, p_ct text)
returns bigint language plpgsql security definer set search_path = public as $$
declare i bigint;
begin
  if not public.af_team_ok(p_feed, p_key) then raise exception 'not allowed'; end if;
  if coalesce(p_to,'') !~ '^[0-9a-f]{64}$' or char_length(coalesce(p_ct,'')) not between 1 and 4000 then raise exception 'bad input'; end if;
  if not exists (select 1 from public.pm_keys k where k.feed_id = p_feed and k.mh = p_to) then raise exception 'not on the app yet'; end if;
  if (select count(*) from public.pm_invites v where v.feed_id = p_feed and v.created_at > now() - interval '1 day') >= 200 then raise exception 'too many new threads today'; end if;
  insert into public.pm_invites(feed_id, to_mh, ct) values (p_feed, p_to, p_ct) returning id into i;
  delete from public.pm_invites where created_at < now() - interval '60 days';
  return i;
end $$;

-- only the person it's for (their token) lists their sealed invites
drop function if exists public.pm_inv_get(text,text,text,bigint);
create function public.pm_inv_get(p_feed text, p_mh text, p_tok text, p_after bigint default 0)
returns table(id bigint, ct text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from public.pm_keys k where k.feed_id = p_feed and k.mh = p_mh
    and k.tok_hash = encode(sha256(convert_to(coalesce(p_tok,''),'UTF8')),'hex')) then raise exception 'not allowed'; end if;
  return query select v.id, v.ct, v.created_at from public.pm_invites v
    where v.feed_id = p_feed and v.to_mh = p_mh and v.id > coalesce(p_after,0) order by v.id limit 200;
end $$;

revoke all on function public.pm_key_put(text,text,text,text,text), public.pm_key_get(text,text,text),
  public.pm_inv_send(text,text,text,text), public.pm_inv_get(text,text,text,bigint) from public;
grant execute on function public.pm_key_put(text,text,text,text,text), public.pm_key_get(text,text,text),
  public.pm_inv_send(text,text,text,text), public.pm_inv_get(text,text,text,bigint) to anon, authenticated;

-- ---------- team chat is retired: no new messages (reading the old ones still works until they expire) ----------
create or replace function public.chat_send(p_feed text, p_key text, p_ct text)
returns bigint language plpgsql security definer set search_path = public as $$
begin
  raise exception 'team chat is retired: use Feed or Message someone';
end $$;
revoke all on function public.chat_send(text,text,text) from public;
grant execute on function public.chat_send(text,text,text) to anon, authenticated;

notify pgrst, 'reload schema';
