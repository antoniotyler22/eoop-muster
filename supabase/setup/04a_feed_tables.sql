create table if not exists public.feeds (
  id text primary key check (id ~ '^[a-z0-9]{10,20}$'),
  member_key_hash text not null,
  leader_key_hash text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz not null default now()
);
alter table public.feeds add column if not exists last_push_id bigint not null default 0;
create table if not exists public.feed_posts (
  id bigint generated always as identity primary key,
  feed_id text not null references public.feeds(id) on delete cascade,
  ct text not null check (char_length(ct) <= 3000),
  created_at timestamptz not null default now()
);
create table if not exists public.feed_acks (
  id bigint generated always as identity primary key,
  feed_id text not null references public.feeds(id) on delete cascade,
  post_id bigint not null references public.feed_posts(id) on delete cascade,
  words text[] not null,
  code smallint not null check (code between 1 and 2),
  note text not null default '' check (char_length(note) <= 60),
  created_at timestamptz not null default now()
);
create index if not exists feed_posts_idx on public.feed_posts(feed_id, id);
create index if not exists feed_acks_idx on public.feed_acks(feed_id, id);
alter table public.feeds enable row level security;
alter table public.feed_posts enable row level security;
alter table public.feed_acks enable row level security;
revoke all on public.feeds, public.feed_posts, public.feed_acks from anon, authenticated;
