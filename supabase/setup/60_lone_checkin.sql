-- Part 60: lone-worker check-in timer (Pro Safety). The phone tells the server when its next check-in is due.
-- If it is still not checked in 5 minutes after that, the notify function (run by the part 22 minute job) pushes
-- "missed check-in" to the team's leader and phones, even if the app is closed or the phone is off.
-- The server keeps only: team id, a random device id, the display name, and the due time. No names beyond that,
-- no location, and no keys (the member key is checked against its hash and never stored). Rows are removed when
-- the worker checks in or stops, and a fired row is deleted a day later. Safe to re-run.
create table if not exists public.lone_checkins (
  feed_id text not null,
  dev text not null check (dev ~ '^[a-z0-9]{8,40}$'),
  who text not null default '' check (length(who) <= 30),
  due_at timestamptz not null,
  fired_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (feed_id, dev)
);
create index if not exists lone_checkins_due_idx on public.lone_checkins(due_at) where fired_at is null;
alter table public.lone_checkins enable row level security;
revoke all on public.lone_checkins from anon, authenticated;

-- Phone: arm, move or clear (p_due null) the timer. Proves it belongs to the team with the member key.
create or replace function public.lone_set(p_feed text, p_mk text, p_dev text, p_who text, p_due timestamptz)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_feed is null or p_dev is null or p_dev !~ '^[a-z0-9]{8,40}$' then raise exception 'bad input'; end if;
  if not exists (select 1 from public.feeds f where f.id = p_feed
      and f.member_key_hash = encode(sha256(convert_to(coalesce(p_mk, ''), 'UTF8')), 'hex')) then raise exception 'not allowed'; end if;
  if p_due is null then delete from public.lone_checkins where feed_id = p_feed and dev = p_dev; return; end if;
  if p_due > now() + interval '24 hours' or p_due < now() - interval '1 hour' then raise exception 'bad input'; end if;
  if (select count(*) from public.lone_checkins where feed_id = p_feed) >= 200
     and not exists (select 1 from public.lone_checkins where feed_id = p_feed and dev = p_dev) then raise exception 'too many'; end if;
  insert into public.lone_checkins(feed_id, dev, who, due_at, updated_at)
    values (p_feed, p_dev, left(coalesce(p_who, ''), 30), p_due, now())
    on conflict (feed_id, dev) do update set who = excluded.who, due_at = excluded.due_at, fired_at = null, updated_at = now();
end $$;

-- Server only (the notify function, every minute): timers 5 minutes past due. Each fires once.
create or replace function public.lone_due()
returns table(feed_id text, who text, due_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  delete from public.lone_checkins l where l.fired_at < now() - interval '1 day' or l.updated_at < now() - interval '3 days';
  return query
    update public.lone_checkins l set fired_at = now()
    where l.fired_at is null and l.due_at + interval '5 minutes' <= now()
    returning l.feed_id, l.who, l.due_at;
end $$;

revoke all on function public.lone_set(text, text, text, text, timestamptz) from public;
grant execute on function public.lone_set(text, text, text, text, timestamptz) to anon, authenticated;
revoke all on function public.lone_due() from public, anon, authenticated;
grant execute on function public.lone_due() to service_role;

insert into public.setup_log(part, note) values ('60_lone_checkin', 'lone-worker check-in timer: lone_checkins table, lone_set and lone_due') on conflict (part) do nothing;
