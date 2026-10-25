-- Part 22: missed check-in alerts. The leader sets a deadline on a live recall; if people still haven't checked in
-- when it passes, the leader's phone gets an alert with the count (no names: the server never has them).
-- Needs part 1 (recalls) and pg_cron + pg_net turned on (Database → Extensions). Safe to re-run.
create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.escalations (
  recall_id text primary key references public.recalls(id) on delete cascade,
  due_at timestamptz not null,
  expected int not null check (expected between 1 and 5000),
  fired_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists escalations_due_idx on public.escalations(due_at) where fired_at is null;
alter table public.escalations enable row level security;
revoke all on public.escalations from anon, authenticated;

-- Leader's phone: set or move the deadline (proves it runs the recall with the recall's read key).
create or replace function public.esc_set(p_recall text, p_key text, p_due timestamptz, p_expected int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.recalls r where r.id = p_recall
      and r.read_key_hash = encode(sha256(convert_to(coalesce(p_key, ''), 'UTF8')), 'hex')) then raise exception 'not allowed'; end if;
  if p_due is null then delete from public.escalations e where e.recall_id = p_recall; return; end if;
  if p_due > now() + interval '3 days' or p_expected is null or p_expected < 1 or p_expected > 5000 then raise exception 'bad input'; end if;
  insert into public.escalations(recall_id, due_at, expected) values (p_recall, p_due, p_expected)
    on conflict (recall_id) do update set due_at = excluded.due_at, expected = excluded.expected, fired_at = null;
end $$;

-- Server only (the notify function, every minute): deadlines that just passed, with counts. Each fires once.
create or replace function public.esc_due()
returns table(recall_id text, expected int, good int, delayed int, help int, push_sub jsonb)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with fired as (
    update public.escalations e set fired_at = now()
    where e.fired_at is null and e.due_at <= now()
    returning e.recall_id, e.expected
  ), latest as (
    select distinct on (c.recall_id, c.words) c.recall_id, c.code
    from public.checkins c join fired f on f.recall_id = c.recall_id
    order by c.recall_id, c.words, c.id desc
  )
  select f.recall_id, f.expected,
    (count(*) filter (where l.code = 1))::int, (count(*) filter (where l.code = 2))::int, (count(*) filter (where l.code = 3))::int,
    r.push_sub
  from fired f join public.recalls r on r.id = f.recall_id
  left join latest l on l.recall_id = f.recall_id
  group by f.recall_id, f.expected, r.push_sub;
end $$;

grant execute on function public.esc_set(text, text, timestamptz, int) to anon;
revoke all on function public.esc_due() from public, anon, authenticated;
grant execute on function public.esc_due() to service_role;

-- Every minute: ask the notify function to send any due alerts. The function may be deployed as "notify" or "Notify";
-- both names are called and the one that doesn't exist just answers 404.
select cron.unschedule(jobid) from cron.job where jobname = 'accounted-for-escalate';
select cron.schedule('accounted-for-escalate', '* * * * *', $job$
  select net.http_post(
    url := 'https://vdhxhvklwbimjpoomnui.supabase.co/functions/v1/' || n,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{"escalate":1}'::jsonb,
    timeout_milliseconds := 20000)
  from unnest(array['notify', 'Notify']) as n;
$job$);

notify pgrst, 'reload schema';
