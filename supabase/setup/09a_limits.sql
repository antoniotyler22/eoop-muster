-- Rate limits: a busy-signal if something floods the server. Counts inserts per table per minute.
create table if not exists public.rate_hits (
  k text not null,
  w timestamptz not null,
  n int not null default 0,
  primary key (k, w)
);
alter table public.rate_hits enable row level security;
revoke all on public.rate_hits from anon, authenticated;

create or replace function public.rl_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare lim int := coalesce(tg_argv[0]::int, 600); c int; wm timestamptz := date_trunc('minute', now());
begin
  insert into public.rate_hits(k, w, n) values (tg_table_name, wm, 1)
  on conflict (k, w) do update set n = public.rate_hits.n + 1 returning n into c;
  if c > lim then raise exception 'busy, try again in a minute'; end if;
  return new;
end $$;
