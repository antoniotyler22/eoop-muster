-- Ask (AI): OIC controls. One settings row, changed only through the ask function with the OIC key.
create table if not exists public.ai_settings (
  id int primary key default 1 check (id = 1),
  cfg jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.ai_settings enable row level security;
revoke all on public.ai_settings from anon, authenticated;
insert into public.ai_settings(id, cfg) values (1, '{"on": true, "who": "all"}'::jsonb) on conflict (id) do nothing;
