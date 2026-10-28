-- Part 30: owner health and security. What the owner's Health tab reads (cron jobs, server calls, the push queue,
-- hubs, crashes, database size), the owner's audit log, and the owner's own settings (password change, 2-step sign-in,
-- recovery codes, push alerts) kept in app_cfg. A job every 10 minutes asks the "owner" function to check for crash
-- spikes. Needs parts 22 (pg_cron + pg_net), 27 (queue) and 29 (app_cfg). Safe to re-run.

alter table public.app_cfg add column if not exists owner_hash text check (owner_hash is null or owner_hash ~ '^[0-9a-f]{64}$');
alter table public.app_cfg add column if not exists owner_totp text check (owner_totp is null or char_length(owner_totp) <= 64);
alter table public.app_cfg add column if not exists owner_totp_pending text check (owner_totp_pending is null or char_length(owner_totp_pending) <= 64);
alter table public.app_cfg add column if not exists owner_codes text[] not null default '{}';
alter table public.app_cfg add column if not exists owner_sub jsonb;
alter table public.app_cfg add column if not exists tok_epoch int not null default 0;
alter table public.app_cfg add column if not exists cron_token text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
alter table public.app_cfg add column if not exists alert_at timestamptz;

-- Everything done as the owner, with the address it came from. Never holds team data.
create table if not exists public.owner_log (
  id bigint generated always as identity primary key,
  t timestamptz not null default now(),
  ip text not null default '' check (char_length(ip) <= 64),
  op text not null check (char_length(op) <= 24),
  detail text not null default '' check (char_length(detail) <= 300),
  ok boolean not null default true
);
create index if not exists owner_log_t_idx on public.owner_log(t desc);
alter table public.owner_log enable row level security;
revoke all on public.owner_log from anon, authenticated;
grant select, insert on public.owner_log to service_role;
grant select, insert, update on public.app_cfg to service_role;

-- One call for the Health tab. Only the server (service role) may run it.
create or replace function public.owner_health()
returns jsonb language plpgsql security definer set search_path = public as $$
declare o jsonb := '{}'::jsonb; q jsonb; begin
  -- cron jobs: schedule and the last run of each
  select coalesce(jsonb_agg(jsonb_build_object('name', j.jobname, 'schedule', j.schedule, 'active', j.active,
      'last', r.start_time, 'status', r.status, 'msg', left(coalesce(r.return_message, ''), 120)) order by j.jobname), '[]'::jsonb)
    into q from cron.job j left join lateral (select status, return_message, start_time from cron.job_run_details d
      where d.jobid = j.jobid order by start_time desc limit 1) r on true;
  o := o || jsonb_build_object('cron', q);
  -- server calls made by cron in the last 24 h (notify, hub, queue): how many, how many failed, the latest failures
  select jsonb_build_object(
      'n', count(*), 'bad', count(*) filter (where coalesce(status_code, 0) >= 400 or timed_out or error_msg is not null),
      'n1h', count(*) filter (where created > now() - interval '1 hour'),
      'bad1h', count(*) filter (where (coalesce(status_code, 0) >= 400 or timed_out or error_msg is not null) and created > now() - interval '1 hour'),
      'last', max(created))
    into q from net._http_response where created > now() - interval '24 hours';
  o := o || jsonb_build_object('calls', q);
  select coalesce(jsonb_agg(jsonb_build_object('t', created, 'code', status_code, 'msg', left(coalesce(error_msg, content::text, ''), 100)) order by created desc), '[]'::jsonb)
    into q from (select * from net._http_response where created > now() - interval '24 hours'
      and (coalesce(status_code, 0) >= 400 or timed_out or error_msg is not null)
      and coalesce(content::text, '') not like '%Requested function was not found%' order by created desc limit 8) x;
  o := o || jsonb_build_object('fails', q);
  -- the push queue
  begin
    select jsonb_build_object('n', count(*), 'ready', count(*) filter (where vt <= now()), 'oldest', min(enqueued_at), 'retried', count(*) filter (where read_ct > 1))
      into q from pgmq.q_push;
  exception when others then q := null; end;
  o := o || jsonb_build_object('queue', q);
  -- server hubs
  begin
    select jsonb_build_object('n', count(*), 'err', count(*) filter (where err is not null), 'last', max(ran_at), 'saved', max(saved_at),
        'errs', (select coalesce(jsonb_agg(left(err, 100)), '[]'::jsonb) from (select distinct err from hub_jobs where err is not null limit 5) e))
      into q from hub_jobs;
  exception when others then q := null; end;
  o := o || jsonb_build_object('hubs', q);
  -- crashes
  select jsonb_build_object('h1', count(*) filter (where created_at > now() - interval '1 hour'), 'h24', count(*) filter (where created_at > now() - interval '24 hours'),
      'd7', count(*) filter (where created_at > now() - interval '7 days'),
      'vers', (select coalesce(jsonb_object_agg(ver, n), '{}'::jsonb) from (select coalesce(ver, '?') ver, count(*) n from client_errors where created_at > now() - interval '7 days' group by 1 order by 2 desc limit 6) v),
      'plats', (select coalesce(jsonb_object_agg(plat, n), '{}'::jsonb) from (select coalesce(plat, '?') plat, count(*) n from client_errors where created_at > now() - interval '7 days' group by 1 order by 2 desc limit 6) p))
    into q from client_errors;
  o := o || jsonb_build_object('crash', q);
  -- the database
  select jsonb_build_object('bytes', pg_database_size(current_database()),
      'tables', (select coalesce(jsonb_agg(jsonb_build_object('t', relname, 'b', pg_total_relation_size(c.oid)) order by pg_total_relation_size(c.oid) desc), '[]'::jsonb)
        from (select c.oid, c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' order by pg_total_relation_size(c.oid) desc limit 8) c))
    into q;
  o := o || jsonb_build_object('db', q);
  -- Ask, today and the last 7 days
  begin
    select jsonb_build_object('today', coalesce(sum(n) filter (where day = current_date), 0), 'd7', coalesce(sum(n), 0)) into q from ai_usage where day > current_date - 7;
  exception when others then q := null; end;
  o := o || jsonb_build_object('ask', q);
  return o || jsonb_build_object('at', now());
end $$;
revoke all on function public.owner_health() from public, anon, authenticated;
grant execute on function public.owner_health() to service_role;

-- Usage counts for the Usage tab, crash reports, and removals: the server key can't read tables directly on this
-- project (everything goes through functions), so the owner's reads and deletes do too.
create or replace function public.owner_stats()
returns jsonb language plpgsql security definer set search_path = public as $$
declare o jsonb := '{}'::jsonb; q jsonb; begin
  o := o || jsonb_build_object('feeds', (select count(*) from feeds), 'boards', (select count(*) from boards), 'recalls', (select count(*) from recalls),
    'recOpen', (select count(*) from recalls where expires_at > now()), 'checkins7', (select count(*) from checkins where created_at > now() - interval '7 days'),
    'posts7', (select count(*) from feed_posts where created_at > now() - interval '7 days'), 'logins', (select count(*) from logins),
    'crash_h1', (select count(*) from client_errors where created_at > now() - interval '1 hour'),
    'crash_prev6', (select count(*) from client_errors where created_at > now() - interval '7 hours' and created_at <= now() - interval '1 hour'),
    'errs7', (select count(*) from client_errors where created_at > now() - interval '7 days'));
  begin select jsonb_build_object('pages', (select count(*) from pages), 'dms', (select count(*) from dm_threads)) into q; exception when others then q := '{}'::jsonb; end; o := o || q;
  begin select jsonb_build_object('companies', (select count(*) from companies)) into q; exception when others then q := '{}'::jsonb; end; o := o || q;
  begin select jsonb_build_object('backups', (select count(*) from backups), 'hubs', (select count(*) from hub_jobs)) into q; exception when others then q := '{}'::jsonb; end; o := o || q;
  begin select jsonb_build_object('pro', (select count(*) from pro_ents e where not e.revoked and (e.expires_at is null or e.expires_at > now()) and e.id not like 'stripe:comp_%'),
    'comps', (select count(*) from pro_ents e where e.id like 'stripe:comp_%' and not e.revoked)) into q; exception when others then q := '{}'::jsonb; end; o := o || q;
  begin select jsonb_build_object('ai', (select coalesce(sum(n), 0) from ai_usage where day = current_date)) into q; exception when others then q := '{}'::jsonb; end; o := o || q;
  return o || jsonb_build_object('at', now());
end $$;
create or replace function public.owner_errors()
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'msg', msg, 'ver', ver, 'plat', plat, 'created_at', created_at) order by id desc), '[]'::jsonb)
  from (select * from client_errors order by id desc limit 40) e;
$$;
-- Deletes one row by id; the kinds are the ones the console offers. Returns how many rows went (0 or 1).
create or replace function public.owner_remove(p_kind text, p_id text)
returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; begin
  if p_kind = 'feed' then delete from feeds where id = p_id;
  elsif p_kind = 'board' then delete from boards where id = p_id;
  elsif p_kind = 'recall' then delete from recalls where id = p_id;
  elsif p_kind = 'page' then delete from pages where id = p_id;
  elsif p_kind = 'company' then delete from companies where id = p_id;
  elsif p_kind = 'login' then delete from logins where uid = p_id;
  elsif p_kind = 'backup' then delete from backups where id = p_id;
  elsif p_kind = 'dm' then delete from dm_threads where id = p_id;
  else raise exception 'bad kind'; end if;
  get diagnostics n = row_count; return n;
end $$;
revoke all on function public.owner_stats(), public.owner_errors(), public.owner_remove(text, text) from public, anon, authenticated;
grant execute on function public.owner_stats(), public.owner_errors(), public.owner_remove(text, text) to service_role;

-- Every 10 minutes: let the owner function look for crash spikes and send the owner a push alert.
select cron.unschedule(jobid) from cron.job where jobname = 'accounted-for-owner';
select cron.schedule('accounted-for-owner', '*/10 * * * *', $job$
  select net.http_post(
    url := 'https://vdhxhvklwbimjpoomnui.supabase.co/functions/v1/owner',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('op', 'cron', 'key', (select cron_token from public.app_cfg where id = 1)),
    timeout_milliseconds := 20000);
$job$);

notify pgrst, 'reload schema';
