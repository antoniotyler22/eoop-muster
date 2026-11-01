-- Part 39: small live signals for a Feed (app 4.68.0+): reactions, "seen by", live location, online / recording.
-- One row per person per kind (an upsert), so nothing piles up. Everything inside is encrypted on the phone with the
-- Feed key; the server sees only the kind, a hashed id and the time. Needs Part 38 (talk_key_ok). Safe to re-run.
--   kinds: rx (reaction), seen (seen a post), loc (live location), live (online / recording)

create table if not exists public.feed_signals (
  feed_id text not null references public.feeds(id) on delete cascade,
  k text not null check (k in ('rx','seen','loc','live')),
  ident text not null check (char_length(ident) between 6 and 64),
  ct text not null check (char_length(ct) <= 4000),
  updated_at timestamptz not null default now(),
  primary key (feed_id, k, ident)
);
create index if not exists feed_signals_upd on public.feed_signals(feed_id, updated_at);
alter table public.feed_signals enable row level security;
revoke all on public.feed_signals from anon, authenticated;

create or replace function public.signal_put(p_feed text, p_key text, p_k text, p_ident text, p_ct text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.talk_key_ok(p_feed, p_key) then raise exception 'not allowed'; end if;
  if (select count(*) from public.feed_signals s where s.feed_id = p_feed and s.updated_at > now() - interval '1 minute') >= 900
    then raise exception 'too many signals'; end if;
  insert into public.feed_signals(feed_id, k, ident, ct, updated_at) values (p_feed, p_k, p_ident, p_ct, now())
  on conflict (feed_id, k, ident) do update set ct = excluded.ct, updated_at = now();
  delete from public.feed_signals s where s.feed_id = p_feed and (
    (s.k in ('live') and s.updated_at < now() - interval '1 day') or
    (s.k = 'loc' and s.updated_at < now() - interval '1 day') or
    (s.k in ('rx','seen') and s.updated_at < now() - interval '60 days'));
end $$;

drop function if exists public.signal_get(text,text,timestamptz);
create function public.signal_get(p_feed text, p_key text, p_since timestamptz default 'epoch')
returns table(k text, ident text, ct text, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.k, s.ident, s.ct, s.updated_at from public.feed_signals s
  where s.feed_id = p_feed and public.talk_key_ok(p_feed, p_key) and s.updated_at > p_since
  order by s.updated_at limit 2000;
$$;

create or replace function public.signals_ok()
returns boolean language sql security definer set search_path = public as $$
  select to_regclass('public.feed_signals') is not null;
$$;

grant execute on function public.signal_put(text,text,text,text,text), public.signal_get(text,text,timestamptz), public.signals_ok() to anon, authenticated;
grant select, insert, update, delete on public.feed_signals to service_role;
notify pgrst, 'reload schema';
