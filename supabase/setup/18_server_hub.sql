-- Server hub: Supabase does the OIC phone's hub job every minute, so the phone can be off.
-- Before running: Database > Extensions, turn on pg_cron and pg_net. Then deploy the Edge Function
-- named hub (JWT verification OFF). Safe to re-run.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- One row per board that turned on the server hub. ct is the board's recovery code, encrypted with a key
-- only the hub function has. seen_at = last time an OIC phone had the app open (the server steps aside then).
create table if not exists public.hub_jobs (
  id text primary key references public.backups(id) on delete cascade,
  ct text not null check (char_length(ct) <= 400),
  seen_at timestamptz,
  ran_at timestamptz,
  saved_at timestamptz,
  ver bigint,
  err text,
  created_at timestamptz not null default now()
);
alter table public.hub_jobs enable row level security;
revoke all on public.hub_jobs from anon, authenticated;

-- Private token so only the scheduler can make the hub run.
create table if not exists public.hub_cfg (
  id int primary key default 1 check (id = 1),
  token text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
);
alter table public.hub_cfg enable row level security;
revoke all on public.hub_cfg from anon, authenticated;
insert into public.hub_cfg(id) values (1) on conflict (id) do nothing;
grant all on public.hub_jobs, public.hub_cfg to service_role;

-- OIC phone, while the app is open: "I'm here" + status of the server hub. Proves it owns the board
-- with the backup key it already has.
create or replace function public.hub_seen(p_id text, p_key text)
returns table(on_ boolean, ran_at timestamptz, saved_at timestamptz, err text)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.backups b where b.id = p_id
    and b.key_hash = encode(sha256(convert_to(p_key,'UTF8')),'hex')) then raise exception 'not allowed'; end if;
  update public.hub_jobs j set seen_at = now() where j.id = p_id;
  return query select true, j.ran_at, j.saved_at, j.err from public.hub_jobs j where j.id = p_id;
end $$;

-- Turn the server hub off for a board (deletes the stored code).
create or replace function public.hub_off(p_id text, p_key text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.backups b where b.id = p_id
    and b.key_hash = encode(sha256(convert_to(p_key,'UTF8')),'hex')) then raise exception 'not allowed'; end if;
  delete from public.hub_jobs j where j.id = p_id;
end $$;
grant execute on function public.hub_seen(text,text), public.hub_off(text,text) to anon;

-- Every minute: ask the hub function to run.
select cron.unschedule(jobid) from cron.job where jobname = 'accounted-for-hub';
select cron.schedule('accounted-for-hub', '* * * * *', $job$
  select net.http_post(
    url := 'https://vdhxhvklwbimjpoomnui.supabase.co/functions/v1/hub',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-hub-token', (select token from public.hub_cfg where id = 1)),
    body := '{"op":"run"}'::jsonb,
    timeout_milliseconds := 55000);
$job$);

notify pgrst, 'reload schema';
