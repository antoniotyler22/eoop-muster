-- Part 43: morning digest for Quiet hours.
-- Before: an alert held back by Quiet hours was simply dropped. Now a phone that turned on "Send what I missed as one
-- summary" gets the held-back alerts counted here, and the "notify" function sends ONE alert at the chosen time
-- ("3 Word of Mouth, 2 messages. Open the app."). Only counts per kind are kept, never names or alert text.
-- Rows are bounded: one row per phone, kind and delivery time. Server only (service_role); anon and authenticated
-- have no access. Deploy notify 4.87.0 or later. Needs part 27 (the minute job already calls notify). Safe to re-run.

create table if not exists public.push_digest (
  sub_key text not null,
  cat     text not null,
  due     timestamptz not null,
  sub     jsonb not null,
  n       int not null default 1,
  first_at timestamptz not null default now(),
  primary key (sub_key, cat, due)
);
alter table public.push_digest enable row level security;
revoke all on public.push_digest from public, anon, authenticated;
create index if not exists push_digest_due_idx on public.push_digest (due);

-- Count one held-back alert (or p_n of them, when putting back a digest that failed to send).
create or replace function public.digest_add(p_key text, p_sub jsonb, p_cat text, p_due timestamptz, p_n int default 1, p_first timestamptz default now())
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_key is null or length(p_key) not between 8 and 600 or p_due is null then return; end if;
  insert into public.push_digest(sub_key, cat, due, sub, n, first_at)
  values (p_key, left(coalesce(p_cat, 'board'), 12), p_due, p_sub, least(greatest(coalesce(p_n, 1), 1), 999), coalesce(p_first, now()))
  on conflict (sub_key, cat, due) do update
    set n = least(public.push_digest.n + excluded.n, 999), sub = excluded.sub,
        first_at = least(public.push_digest.first_at, excluded.first_at);
  -- housekeeping: anything a day past due was never going to send
  delete from public.push_digest where due < now() - interval '1 day';
end $$;

-- Take everything that is due, one row per phone. Deleting and reading in one statement means two overlapping
-- minute jobs can never send the same digest twice.
create or replace function public.digest_take(p_max int default 200)
returns table(sub_key text, sub jsonb, cats jsonb, first_at timestamptz)
language sql security definer set search_path = public as $$
  with gone as (
    delete from public.push_digest d
    where (d.sub_key, d.cat, d.due) in (
      select x.sub_key, x.cat, x.due from public.push_digest x where x.due <= now() order by x.due limit greatest(1, least(coalesce(p_max, 200), 1000)))
    returning d.sub_key, d.cat, d.sub, d.n, d.first_at)
  select s.sub_key, (array_agg(s.sub))[1], jsonb_object_agg(s.cat, s.n), min(s.first_at)
  from (select g.sub_key, g.cat, (array_agg(g.sub))[1] as sub, sum(g.n)::int as n, min(g.first_at) as first_at
        from gone g group by g.sub_key, g.cat) s
  group by s.sub_key;
$$;

revoke all on function public.digest_add(text, jsonb, text, timestamptz, int, timestamptz) from public, anon, authenticated;
revoke all on function public.digest_take(int) from public, anon, authenticated;
grant execute on function public.digest_add(text, jsonb, text, timestamptz, int, timestamptz) to service_role;
grant execute on function public.digest_take(int) to service_role;
grant select, insert, update, delete on public.push_digest to service_role;

notify pgrst, 'reload schema';
