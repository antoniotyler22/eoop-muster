-- Part 45: the official "Accounted For" channel (app 4.100.0+).
-- A one-way channel of updates from the app owner that every phone shows in the Chat tab (like WhatsApp's official
-- channel). The owner posts from the Owner console or from the channel itself (through the "owner" Edge Function,
-- service role). Phones only read, through official_get(). Needs Part 29 (owner). Safe to re-run.

create table if not exists public.official_posts (
  id bigserial primary key,
  body text not null check (char_length(body) between 1 and 1000),
  url text not null default '' check (char_length(url) <= 300),
  created_at timestamptz not null default now()
);
alter table public.official_posts enable row level security;
revoke all on public.official_posts from anon, authenticated;
grant select, insert, delete on public.official_posts to service_role;
grant usage, select on sequence public.official_posts_id_seq to service_role;

insert into public.official_posts(body)
select 'Welcome to Accounted For. This is the official channel: app updates, new features and tips from our team will show up here. Only we can post in this chat.'
where not exists (select 1 from public.official_posts);

drop function if exists public.official_get(bigint);
create function public.official_get(p_after bigint default 0)
returns table(id bigint, body text, url text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select * from (select p.id, p.body, p.url, p.created_at from public.official_posts p where p.id > p_after order by p.id desc limit 50) x order by x.id;
$$;

create or replace function public.official_ok()
returns boolean language sql security definer set search_path = public as $$
  select to_regclass('public.official_posts') is not null;
$$;

grant execute on function public.official_get(bigint), public.official_ok() to anon, authenticated;
notify pgrst, 'reload schema';
