-- Part 27: alerts go out from the server, not only from the phone that saved. After a check-in, a board update or a
-- Feed post, the database itself asks the "notify" function to send the alert, so it still goes out when the sender's
-- phone loses signal right after saving. Feed posts wait 20 s on a queue so the poster's own phone (which knows if
-- the post is Urgent) normally sends first; "notify" also puts failed pushes back on the same queue to retry.
-- A job runs every 20 s while the queue has work and calls notify with {"drain":1}. Payloads carry ids only, no names.
-- Needs parts 1 (recalls, checkins), 3 (boards), 4 (feeds) and 22 (pg_cron + pg_net), and the pgmq extension
-- (Database → Extensions → pgmq). Deploy notify 4.10.1 or later. Safe to re-run.
-- (Rebuilt from the live database on 2026-10-28; the original file was lost.)

create extension if not exists pgmq;
select pgmq.create('push') where not exists (select 1 from pgmq.list_queues() where queue_name = 'push');

-- Calls notify once, at the name app_cfg.notify_fn holds (notify_url, part 22; part 31 keeps the name current).
create or replace function public.push_hook_call(p_body jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := public.notify_url(),
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := p_body,
    timeout_milliseconds := 10000);
end $$;

create or replace function public.push_hook_checkin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.recalls r where r.id = new.recall_id and r.push_sub is not null) then
    perform public.push_hook_call(jsonb_build_object('recall', new.recall_id, 'hook', 1));
  end if;
  return null;
exception when others then return null; -- an alert problem never blocks the check-in
end $$;

create or replace function public.push_hook_board()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.boards b where b.id = new.board_id and b.push_sub is not null) then
    perform public.push_hook_call(jsonb_build_object('board', new.board_id, 'hook', 1));
  end if;
  return null;
exception when others then return null;
end $$;

create or replace function public.push_hook_feed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.feed_subs s where s.feed_id = new.feed_id) then
    perform pgmq.send('push', jsonb_build_object('kind', 'feed', 'feed', new.feed_id, 'post', new.id), 20);
  end if;
  return null;
exception when others then return null;
end $$;

drop trigger if exists af_push_checkin on public.checkins;
create trigger af_push_checkin after insert on public.checkins for each row execute function public.push_hook_checkin();
drop trigger if exists af_push_board on public.board_updates;
create trigger af_push_board after insert on public.board_updates for each row execute function public.push_hook_board();
drop trigger if exists af_push_feed on public.feed_posts;
create trigger af_push_feed after insert on public.feed_posts for each row execute function public.push_hook_feed();

-- Queue access for notify only (service role).
create or replace function public.push_q_read(p_n int default 50)
returns table(msg_id bigint, read_ct int, message jsonb) language plpgsql security definer set search_path = public as $$
begin
  return query select q.msg_id, q.read_ct, q.message from pgmq.read('push', 60, least(greatest(coalesce(p_n, 50), 1), 100)) q;
end $$;

create or replace function public.push_q_del(p_ids bigint[])
returns void language plpgsql security definer set search_path = public as $$
begin
  perform pgmq.delete('push', p_ids);
end $$;

create or replace function public.push_q_send(p_msg jsonb, p_delay int default 0)
returns bigint language plpgsql security definer set search_path = public as $$
begin
  if pg_column_size(p_msg) > 8000 then raise exception 'too big'; end if;
  return (select * from pgmq.send('push', p_msg, greatest(0, least(coalesce(p_delay, 0), 3600))));
end $$;

-- For the app's System check: true when the hooks and the queue are in place.
create or replace function public.push_hooks_ok()
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from pg_trigger where tgname = 'af_push_feed')
     and exists (select 1 from pgmq.list_queues() where queue_name = 'push');
$$;

revoke all on function public.push_hook_call(jsonb) from public, anon, authenticated;
revoke all on function public.push_hook_checkin() from public, anon, authenticated;
revoke all on function public.push_hook_board() from public, anon, authenticated;
revoke all on function public.push_hook_feed() from public, anon, authenticated;
revoke all on function public.push_q_read(int) from public, anon, authenticated;
revoke all on function public.push_q_del(bigint[]) from public, anon, authenticated;
revoke all on function public.push_q_send(jsonb, int) from public, anon, authenticated;
grant execute on function public.push_q_read(int) to service_role;
grant execute on function public.push_q_del(bigint[]) to service_role;
grant execute on function public.push_q_send(jsonb, int) to service_role;
grant execute on function public.push_hooks_ok() to anon;

-- Every 20 s, only while something on the queue is ready: ask notify to work it.
select cron.unschedule(jobid) from cron.job where jobname = 'accounted-for-push-queue';
select cron.schedule('accounted-for-push-queue', '20 seconds', $job$
  select net.http_post(
    url := public.notify_url(),
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{"drain":1}'::jsonb,
    timeout_milliseconds := 30000)
  where exists (select 1 from pgmq.q_push where vt <= now());
$job$);

notify pgrst, 'reload schema';
