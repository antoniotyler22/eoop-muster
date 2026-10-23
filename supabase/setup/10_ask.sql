-- Ask (AI): daily usage counters so costs stay capped. No question text is stored.
create table if not exists public.ai_usage (
  day date not null default current_date,
  k text not null,
  n int not null default 0,
  primary key (day, k)
);
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;

create or replace function public.ai_bump(p_k text)
returns int language plpgsql security definer set search_path = public as $$
declare c int;
begin
  delete from public.ai_usage u where u.day < current_date - 7;
  insert into public.ai_usage(day, k, n) values (current_date, p_k, 1)
  on conflict (day, k) do update set n = public.ai_usage.n + 1 returning n into c;
  return c;
end $$;
revoke execute on function public.ai_bump(text) from public, anon, authenticated;
