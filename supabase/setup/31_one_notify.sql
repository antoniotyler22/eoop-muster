-- Part 31: call the "notify" function once, by its real name. Parts 22 and 27 called both "notify" and "Notify" on
-- every alert so the deployed one would answer and the other would 404 — about a third of all server calls, which
-- the owner's Health tab counted as failures. Now app_cfg.notify_fn holds the deployed name; the database calls only
-- that one. The notify function (4.10.2+) reports its own name whenever cron calls it, so a rename heals itself.
-- Needs parts 22 (notify_url), 27 and 29. Safe to re-run. After running: deploy notify 4.10.2, then re-run the Health tab — the
-- 24 h failure count drains over the next day; the last-hour count should be 0 within the hour.

alter table public.app_cfg add column if not exists notify_fn text not null default 'notify'
  check (notify_fn in ('notify', 'Notify'));

-- The one URL to call (same as part 22; repeated here so this part works on its own).
create or replace function public.notify_url()
returns text language plpgsql stable security definer set search_path = public as $$
declare n text;
begin
  begin
    select notify_fn into n from public.app_cfg where id = 1;
  exception when undefined_table or undefined_column then n := null;
  end;
  return 'https://vdhxhvklwbimjpoomnui.supabase.co/functions/v1/' || coalesce(n, 'notify');
end $$;
revoke all on function public.notify_url() from public, anon, authenticated;

-- notify calls this with its own name (service role only).
create or replace function public.notify_fn_set(p_name text)
returns void language sql security definer set search_path = public as $$
  update public.app_cfg set notify_fn = p_name where id = 1 and p_name in ('notify', 'Notify') and notify_fn is distinct from p_name;
$$;
revoke all on function public.notify_fn_set(text) from public, anon, authenticated;
grant execute on function public.notify_fn_set(text) to service_role;

-- Part 27's hook caller: one call.
create or replace function public.push_hook_call(p_body jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := public.notify_url(),
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := p_body,
    timeout_milliseconds := 10000);
end $$;

-- Part 22's escalate job: one call a minute.
select cron.unschedule(jobid) from cron.job where jobname = 'accounted-for-escalate';
select cron.schedule('accounted-for-escalate', '* * * * *', $job$
  select net.http_post(
    url := public.notify_url(),
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{"escalate":1}'::jsonb,
    timeout_milliseconds := 20000);
$job$);

-- Part 27's queue job: one call every 20 s while the queue has work.
select cron.unschedule(jobid) from cron.job where jobname = 'accounted-for-push-queue';
select cron.schedule('accounted-for-push-queue', '20 seconds', $job$
  select net.http_post(
    url := public.notify_url(),
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{"drain":1}'::jsonb,
    timeout_milliseconds := 30000)
  where exists (select 1 from pgmq.q_push where vt <= now());
$job$);

-- Ask both names once, now: the one that exists writes its name into app_cfg (notify 4.10.2+). Harmless 404 for the other.
select net.http_post(
  url := 'https://vdhxhvklwbimjpoomnui.supabase.co/functions/v1/' || n,
  headers := jsonb_build_object('Content-Type', 'application/json'),
  body := '{"whoami":1}'::jsonb,
  timeout_milliseconds := 10000)
from unnest(array['notify', 'Notify']) as n;

notify pgrst, 'reload schema';
