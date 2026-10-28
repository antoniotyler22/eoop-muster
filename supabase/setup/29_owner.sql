-- Part 29: the app owner. One row of app-wide settings the owner sets from the Owner console (the "owner" Edge
-- Function, signed in with the owner username and password): an announcement every phone shows on Home, and switches.
-- Phones read it through app_cfg_get(); only the server (service role) writes it. Also lets the owner comp Pro.
-- Needs part 20 (pro_ents) for comps. Safe to re-run.

create table if not exists public.app_cfg (
  id int primary key default 1 check (id = 1),
  announce text not null default '' check (char_length(announce) <= 300),
  announce_url text not null default '' check (char_length(announce_url) <= 300),
  announce_at timestamptz,
  ask_off boolean not null default false,
  news_off boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.app_cfg(id) values (1) on conflict (id) do nothing;
alter table public.app_cfg enable row level security;
revoke all on public.app_cfg from anon, authenticated;
grant select, insert, update on public.app_cfg to service_role;   -- the owner function; not automatic on every project

drop function if exists public.app_cfg_get();
create function public.app_cfg_get()
returns table(announce text, announce_url text, announce_at timestamptz, ask_off boolean, news_off boolean)
language sql stable security definer set search_path = public as $$
  select announce, announce_url, announce_at, ask_off, news_off from public.app_cfg where id = 1;
$$;
grant execute on function public.app_cfg_get() to anon;

-- Comped Pro: the owner's console makes an entitlement and hands the team a Pro code. pro_ents only knows Apple
-- and Stripe, so comps live under the Stripe source with a "stripe:comp_..." id; the console lists and ends them.

notify pgrst, 'reload schema';
