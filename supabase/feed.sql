-- FEED: the word, with Got it. Post text is encrypted on the leader's phone; the key lives only in the join link.
-- Names are never stored: acknowledgments carry one-way scrambled codes of the words a person typed.
create table if not exists public.feeds (
  id text primary key check (id ~ '^[a-z0-9]{10,20}$'),
  member_key_hash text not null,
  leader_key_hash text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz not null default now()
);
create table if not exists public.feed_posts (
  id bigint generated always as identity primary key,
  feed_id text not null references public.feeds(id) on delete cascade,
  ct text not null check (char_length(ct) <= 3000 and ct ~ '^[A-Za-z0-9+/=]+$'),
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

create or replace function public.create_feed(p_id text, p_member_key text, p_leader_key text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if char_length(p_member_key) < 24 or char_length(p_leader_key) < 24 then raise exception 'bad key'; end if;
  delete from feeds where used_at < now() - interval '90 days';
  insert into feeds(id, member_key_hash, leader_key_hash) values (p_id,
    encode(sha256(convert_to(p_member_key,'UTF8')),'hex'),
    encode(sha256(convert_to(p_leader_key,'UTF8')),'hex'));
end $$;

create or replace function public.feed_post(p_feed text, p_leader_key text, p_ct text)
returns bigint language plpgsql security definer set search_path = public as $$
declare new_id bigint;
begin
  update feeds set used_at = now()
  where id = p_feed and leader_key_hash = encode(sha256(convert_to(p_leader_key,'UTF8')),'hex');
  if not found then raise exception 'not allowed'; end if;
  insert into feed_posts(feed_id, ct) values (p_feed, p_ct) returning id into new_id;
  delete from feed_posts where feed_id = p_feed and id not in
    (select id from feed_posts where feed_id = p_feed order by id desc limit 200);
  return new_id;
end $$;

create or replace function public.feed_get(p_feed text, p_member_key text, p_after bigint default 0)
returns table(id bigint, ct text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.ct, p.created_at
  from feed_posts p join feeds f on f.id = p.feed_id
  where f.id = p_feed
    and f.member_key_hash = encode(sha256(convert_to(p_member_key,'UTF8')),'hex')
    and p.id > p_after
  order by p.id desc limit 100;
$$;

create or replace function public.feed_ack(p_feed text, p_member_key text, p_post bigint,
  p_words text[], p_code int, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from feeds where id = p_feed
    and member_key_hash = encode(sha256(convert_to(p_member_key,'UTF8')),'hex')) then raise exception 'not allowed'; end if;
  if not exists (select 1 from feed_posts where id = p_post and feed_id = p_feed) then raise exception 'post gone'; end if;
  if coalesce(array_length(p_words,1),0) not between 1 and 6
    or exists (select 1 from unnest(p_words) w where w !~ '^[0-9a-f]{16}$') then raise exception 'bad name'; end if;
  if (select count(*) from feed_acks where post_id = p_post) >= 2000 then raise exception 'full'; end if;
  insert into feed_acks(feed_id, post_id, words, code, note)
  values (p_feed, p_post, p_words, p_code, left(coalesce(p_note,''),60));
end $$;

create or replace function public.feed_acks_get(p_feed text, p_leader_key text, p_after bigint default 0)
returns table(id bigint, post_id bigint, words text[], code smallint, note text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.id, a.post_id, a.words, a.code, a.note, a.created_at
  from feed_acks a join feeds f on f.id = a.feed_id
  where f.id = p_feed
    and f.leader_key_hash = encode(sha256(convert_to(p_leader_key,'UTF8')),'hex')
    and a.id > p_after
  order by a.id limit 1000;
$$;

create or replace function public.feed_delete_post(p_feed text, p_leader_key text, p_post bigint)
returns void language sql security definer set search_path = public as $$
  delete from feed_posts p using feeds f
  where p.id = p_post and p.feed_id = f.id and f.id = p_feed
    and f.leader_key_hash = encode(sha256(convert_to(p_leader_key,'UTF8')),'hex');
$$;

create or replace function public.delete_feed(p_feed text, p_leader_key text)
returns void language sql security definer set search_path = public as $$
  delete from feeds
  where id = p_feed and leader_key_hash = encode(sha256(convert_to(p_leader_key,'UTF8')),'hex');
$$;

grant execute on function public.create_feed(text,text,text),
  public.feed_post(text,text,text),
  public.feed_get(text,text,bigint),
  public.feed_ack(text,text,bigint,text[],int,text),
  public.feed_acks_get(text,text,bigint),
  public.feed_delete_post(text,text,bigint),
  public.delete_feed(text,text) to anon;
