-- 57: stop runaway direct-message threads.
-- Problem (Nov 19, 2026): ~282,000 dm_threads rows, only 5 ever used, growing ~880/hour.
-- Phones open a thread for every roster member with a My page (dm_open) and nothing capped it,
-- so every fresh phone/browser state (new inbox key) minted hundreds of threads.
-- Fix: cap threads per inbox, cap new threads per hour per inbox and overall, and purge idle ones.

create index if not exists dm_threads_inbox_idx on public.dm_threads(inbox_hash, created_at);

create or replace function public.dm_open(p_id text, p_key text, p_inbox text)
returns void language plpgsql security definer set search_path = public as $$
declare ih text; n_all int; n_hr int; n_glob int;
begin
  if char_length(p_key) < 24 or char_length(p_inbox) < 24 then raise exception 'bad key'; end if;
  ih := encode(sha256(convert_to(p_inbox,'UTF8')),'hex');
  if not exists (select 1 from public.dm_threads t where t.id = p_id) then
    select count(*), count(*) filter (where t.created_at > now() - interval '1 hour')
      into n_all, n_hr from public.dm_threads t where t.inbox_hash = ih;
    if n_all >= 300 then raise exception 'too many threads'; end if;
    if n_hr >= 40 then raise exception 'slow down'; end if;
    select count(*) into n_glob from public.dm_threads t where t.created_at > now() - interval '1 hour';
    if n_glob >= 3000 then raise exception 'busy'; end if;
  end if;
  insert into public.dm_threads(id, key_hash, inbox_hash) values (p_id,
    encode(sha256(convert_to(p_key,'UTF8')),'hex'), ih)
  on conflict (id) do nothing;
  if not exists (select 1 from public.dm_threads t where t.id = p_id
    and t.key_hash = encode(sha256(convert_to(p_key,'UTF8')),'hex')) then raise exception 'not allowed'; end if;
end $$;

-- Idle threads: never used, no messages, nobody subscribed for push, older than 24 hours.
create or replace function public.dm_purge_unused()
returns bigint language plpgsql security definer set search_path = public as $$
declare n bigint;
begin
  delete from public.dm_threads t
   where t.used_at = t.created_at and t.created_at < now() - interval '24 hours'
     and not exists (select 1 from public.dm_msgs m where m.thread_id = t.id)
     and not exists (select 1 from public.dm_subs s where s.thread_id = t.id);
  get diagnostics n = row_count;
  delete from public.dm_threads t where t.used_at < now() - interval '365 days';
  return n;
end $$;
revoke all on function public.dm_purge_unused() from public, anon, authenticated;

-- Run the purge every hour (pg_cron).
do $$ begin
  perform cron.unschedule('dm_purge_unused') where exists (select 1 from cron.job where jobname='dm_purge_unused');
  perform cron.schedule('dm_purge_unused', '17 * * * *', 'select public.dm_purge_unused()');
exception when others then null; end $$;
