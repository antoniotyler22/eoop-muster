create table if not exists public.boards (
  id text primary key check (id ~ '^[a-z0-9]{10,20}$'),
  read_key_hash text not null,
  write_key_hash text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz not null default now()
);
alter table public.boards add column if not exists push_sub jsonb;
alter table public.boards add column if not exists last_push_id bigint not null default 0;
alter table public.boards add column if not exists last_push_at timestamptz;
create table if not exists public.board_updates (
  id bigint generated always as identity primary key,
  board_id text not null references public.boards(id) on delete cascade,
  sec text not null check (sec ~ '^[A-Z0-9]{1,6}$'),
  sender text[] not null default '{}',
  strength int not null check (strength between 0 and 2000),
  items text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists board_updates_idx on public.board_updates(board_id, id);
alter table public.boards enable row level security;
alter table public.board_updates enable row level security;
revoke all on public.boards, public.board_updates from anon, authenticated;
