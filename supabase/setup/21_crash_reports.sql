-- Part 21: crash reports. When the app hits a script error it sends the error message and where in the code it
-- happened, so problems get fixed before people notice. No roster, names, numbers or messages: the server scrubs
-- anything that looks like a phone number or email before saving. 30 reports per phone per day; kept 30 days. Safe to re-run.
create table if not exists public.client_errors (
  id bigint generated always as identity primary key,
  kind text not null check (char_length(kind) <= 20),
  msg text not null check (char_length(msg) <= 300),
  stack text not null default '' check (char_length(stack) <= 1200),
  ver text not null default '' check (char_length(ver) <= 20),
  plat text not null default '' check (char_length(plat) <= 20),
  dev text not null default '' check (char_length(dev) <= 24),
  n int not null default 1,
  created_at timestamptz not null default now(),
  last_at timestamptz not null default now()
);
create index if not exists client_errors_dev_idx on public.client_errors(dev, created_at);
create index if not exists client_errors_msg_idx on public.client_errors(msg, ver);
alter table public.client_errors enable row level security;
revoke all on public.client_errors from anon, authenticated;
revoke all on sequence public.client_errors_id_seq from anon, authenticated;

create or replace function public.err_scrub(t text) returns text language sql immutable as $$
  select regexp_replace(regexp_replace(regexp_replace(regexp_replace(coalesce(t, ''),
    '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[email]', 'g'),
    '\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}', '[number]', 'g'),
    '\y\d{3}-\d{2}-\d{4}\y', '[number]', 'g'),
    '\y\d{7,}\y', '[number]', 'g')
$$;

create or replace function public.err_report(p_kind text, p_msg text, p_stack text, p_ver text, p_plat text, p_dev text)
returns void language plpgsql security definer set search_path = public as $$
declare d text := left(encode(sha256(convert_to(coalesce(p_dev, ''), 'UTF8')), 'hex'), 24);
        m text := left(public.err_scrub(p_msg), 300);
        s text := left(public.err_scrub(p_stack), 1200);
begin
  if m = '' then return; end if;
  if (select count(*) from public.client_errors e where e.dev = d and e.created_at > now() - interval '1 day') >= 30 then return; end if;
  -- Ceiling for the whole server, since anyone can make up phone IDs.
  if (select count(*) from public.client_errors e where e.created_at > now() - interval '1 day') >= 5000 then return; end if;
  delete from public.client_errors e where e.created_at < now() - interval '30 days';
  -- Same error again from the same phone today: count it instead of storing it twice.
  update public.client_errors e set n = e.n + 1, last_at = now()
    where e.dev = d and e.msg = m and e.ver = left(coalesce(p_ver, ''), 20) and e.created_at > now() - interval '1 day';
  if found then return; end if;
  insert into public.client_errors(kind, msg, stack, ver, plat, dev)
    values (left(coalesce(p_kind, 'app'), 20), m, s, left(coalesce(p_ver, ''), 20), left(coalesce(p_plat, ''), 20), d);
end $$;

-- For the person running the server (Supabase → SQL Editor):  select * from public.crash_summary;
create or replace view public.crash_summary with (security_invoker = true) as
  select msg, ver, plat, sum(n) as times, count(distinct dev) as phones, max(last_at) as last_seen, min(stack) as sample_stack
  from public.client_errors group by msg, ver, plat order by max(last_at) desc;
revoke all on public.crash_summary from anon, authenticated;

revoke all on function public.err_scrub(text) from public, anon, authenticated;
grant execute on function public.err_report(text, text, text, text, text, text) to anon;
notify pgrst, 'reload schema';
