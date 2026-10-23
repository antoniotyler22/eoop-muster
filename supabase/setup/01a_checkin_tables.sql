create table if not exists public.recalls (
  id text primary key check (id ~ '^[a-z0-9]{8,16}$'),
  read_key_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '72 hours'
);
alter table public.recalls add column if not exists push_sub jsonb;
alter table public.recalls add column if not exists last_push_id bigint not null default 0;
create table if not exists public.checkins (
  id bigint generated always as identity primary key,
  recall_id text not null references public.recalls(id) on delete cascade,
  words text[] not null,
  code smallint not null check (code between 1 and 3),
  note text not null default '' check (char_length(note) <= 60),
  created_at timestamptz not null default now()
);
create index if not exists checkins_recall_idx on public.checkins(recall_id, id);
alter table public.recalls enable row level security;
alter table public.checkins enable row level security;
revoke all on public.recalls, public.checkins from anon, authenticated;
