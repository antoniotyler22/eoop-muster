-- Accounted For 1.2: direct messages (leader <-> member) and social pages.
-- Everything is encrypted on the phone before it gets here. The server stores ciphertext and
-- key hashes only; it can't read messages, posts, photos or names.

-- ---------- Direct messages ----------
-- One thread per member. The leader's phone makes the thread key and puts it in that member's
-- private My page, so only those two phones can read or write it. The leader reads every thread
-- in one call with the leader inbox key.
create table if not exists public.dm_threads (
  id text primary key check (id ~ '^[a-z0-9]{16,32}$'),
  key_hash text not null,
  inbox_hash text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz not null default now()
);
create table if not exists public.dm_msgs (
  id bigint generated always as identity primary key,
  thread_id text not null references public.dm_threads(id) on delete cascade,
  ct text not null check (char_length(ct) <= 160000),
  created_at timestamptz not null default now()
);
create index if not exists dm_msgs_idx on public.dm_msgs(thread_id, id);
alter table public.dm_threads enable row level security;
alter table public.dm_msgs enable row level security;
revoke all on public.dm_threads, public.dm_msgs from anon, authenticated;

create or replace function public.dm_open(p_id text, p_key text, p_inbox text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if char_length(p_key) < 24 or char_length(p_inbox) < 24 then raise exception 'bad key'; end if;
  delete from public.dm_threads t where t.used_at < now() - interval '365 days';
  insert into public.dm_threads(id, key_hash, inbox_hash) values (p_id,
    encode(sha256(convert_to(p_key,'UTF8')),'hex'), encode(sha256(convert_to(p_inbox,'UTF8')),'hex'))
  on conflict (id) do nothing;
  if not exists (select 1 from public.dm_threads t where t.id = p_id
    and t.key_hash = encode(sha256(convert_to(p_key,'UTF8')),'hex')) then raise exception 'not allowed'; end if;
end $$;

create or replace function public.dm_send(p_id text, p_key text, p_ct text)
returns bigint language plpgsql security definer set search_path = public as $$
declare new_id bigint;
begin
  update public.dm_threads t set used_at = now()
   where t.id = p_id and t.key_hash = encode(sha256(convert_to(p_key,'UTF8')),'hex');
  if not found then raise exception 'not allowed'; end if;
  if (select count(*) from public.dm_msgs m where m.thread_id = p_id and m.created_at > now() - interval '1 day') >= 400
    then raise exception 'too many messages today'; end if;
  insert into public.dm_msgs(thread_id, ct) values (p_id, p_ct) returning id into new_id;
  delete from public.dm_msgs m where m.thread_id = p_id and m.id not in
    (select x.id from public.dm_msgs x where x.thread_id = p_id order by x.id desc limit 300);
  return new_id;
end $$;

drop function if exists public.dm_get(text,text,bigint);
create function public.dm_get(p_id text, p_key text, p_after bigint default 0)
returns table(id bigint, ct text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.id, m.ct, m.created_at from public.dm_msgs m join public.dm_threads t on t.id = m.thread_id
  where t.id = p_id and t.key_hash = encode(sha256(convert_to(p_key,'UTF8')),'hex') and m.id > p_after
  order by m.id limit 200;
$$;

drop function if exists public.dm_inbox(text,bigint);
create function public.dm_inbox(p_inbox text, p_after bigint default 0)
returns table(id bigint, thread_id text, ct text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.id, m.thread_id, m.ct, m.created_at from public.dm_msgs m join public.dm_threads t on t.id = m.thread_id
  where t.inbox_hash = encode(sha256(convert_to(p_inbox,'UTF8')),'hex') and m.id > p_after
  order by m.id limit 500;
$$;

create or replace function public.dm_delete_thread(p_id text, p_key text)
returns void language sql security definer set search_path = public as $$
  delete from public.dm_threads t where t.id = p_id and t.key_hash = encode(sha256(convert_to(p_key,'UTF8')),'hex');
$$;

-- ---------- Social pages ----------
-- A person's own page (like a small Instagram) or a group page (people post, ask, give advice).
-- Only people the owner invites (the invite link carries the member key) can see it.
-- The owner decides whether invited people can post; the owner can remove any post and
-- replace the invite key to cut everyone off.
create table if not exists public.pages (
  id text primary key check (id ~ '^[a-z0-9]{12,24}$'),
  owner_hash text not null,
  member_hash text not null,
  open_posts boolean not null default false,
  created_at timestamptz not null default now(),
  used_at timestamptz not null default now()
);
create table if not exists public.page_posts (
  id bigint generated always as identity primary key,
  page_id text not null references public.pages(id) on delete cascade,
  parent bigint,
  kind smallint not null default 0 check (kind between 0 and 2),  -- 0 post, 1 comment, 2 like
  author_hash text not null,
  ct text not null check (char_length(ct) <= 160000),
  created_at timestamptz not null default now()
);
create index if not exists page_posts_idx on public.page_posts(page_id, id);
alter table public.pages enable row level security;
alter table public.page_posts enable row level security;
revoke all on public.pages, public.page_posts from anon, authenticated;

create or replace function public.page_create(p_id text, p_owner text, p_member text, p_open boolean default false)
returns void language plpgsql security definer set search_path = public as $$
begin
  if char_length(p_owner) < 24 or char_length(p_member) < 24 then raise exception 'bad key'; end if;
  delete from public.pages p where p.used_at < now() - interval '365 days';
  insert into public.pages(id, owner_hash, member_hash, open_posts) values (p_id,
    encode(sha256(convert_to(p_owner,'UTF8')),'hex'), encode(sha256(convert_to(p_member,'UTF8')),'hex'), coalesce(p_open,false));
end $$;

create or replace function public.page_set(p_id text, p_owner text, p_open boolean, p_member text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.pages p set open_posts = coalesce(p_open, p.open_posts),
    member_hash = case when p_member is not null and char_length(p_member) >= 24
      then encode(sha256(convert_to(p_member,'UTF8')),'hex') else p.member_hash end
  where p.id = p_id and p.owner_hash = encode(sha256(convert_to(p_owner,'UTF8')),'hex');
  if not found then raise exception 'not allowed'; end if;
end $$;

-- p_key is the owner key or the member key. Members may comment and like; they may post only
-- when the owner opened the page for posts.
create or replace function public.page_post(p_id text, p_key text, p_author text, p_kind int, p_parent bigint, p_ct text)
returns bigint language plpgsql security definer set search_path = public as $$
declare r public.pages%rowtype; h text := encode(sha256(convert_to(p_key,'UTF8')),'hex'); new_id bigint;
begin
  select * into r from public.pages p where p.id = p_id;
  if not found or (h <> r.owner_hash and h <> r.member_hash) then raise exception 'not allowed'; end if;
  if p_kind = 0 and h <> r.owner_hash and not r.open_posts then raise exception 'owner only'; end if;
  if p_kind not between 0 and 2 then raise exception 'bad kind'; end if;
  if p_kind > 0 and not exists (select 1 from public.page_posts x where x.id = p_parent and x.page_id = p_id and x.kind = 0)
    then raise exception 'post gone'; end if;
  if char_length(p_author) < 24 then raise exception 'bad author'; end if;
  if (select count(*) from public.page_posts x where x.page_id = p_id and x.created_at > now() - interval '1 day') >= 1500
    then raise exception 'too many posts today'; end if;
  update public.pages p set used_at = now() where p.id = p_id;
  insert into public.page_posts(page_id, parent, kind, author_hash, ct)
  values (p_id, case when p_kind = 0 then null else p_parent end, p_kind, encode(sha256(convert_to(p_author,'UTF8')),'hex'), p_ct)
  returning id into new_id;
  return new_id;
end $$;

drop function if exists public.page_get(text,text,bigint,bigint);
create function public.page_get(p_id text, p_key text, p_after bigint default 0, p_before bigint default null)
returns table(id bigint, parent bigint, kind smallint, ct text, created_at timestamptz, open_posts boolean, mine_hash text)
language sql stable security definer set search_path = public as $$
  select x.id, x.parent, x.kind, x.ct, x.created_at, p.open_posts, x.author_hash
  from public.page_posts x join public.pages p on p.id = x.page_id
  where p.id = p_id
    and encode(sha256(convert_to(p_key,'UTF8')),'hex') in (p.owner_hash, p.member_hash)
    and x.id > p_after and (p_before is null or x.id < p_before)
  order by x.id desc limit 120;
$$;

-- The owner can remove anything; an author can remove their own post, comment or like.
create or replace function public.page_delete_post(p_id text, p_key text, p_post bigint)
returns void language plpgsql security definer set search_path = public as $$
declare h text := encode(sha256(convert_to(p_key,'UTF8')),'hex'); n int;
begin
  delete from public.page_posts x using public.pages p
   where x.id = p_post and x.page_id = p.id and p.id = p_id and (p.owner_hash = h or x.author_hash = h);
  get diagnostics n = row_count;
  if n > 0 then delete from public.page_posts x where x.page_id = p_id and x.parent = p_post; end if;
end $$;

create or replace function public.page_delete(p_id text, p_owner text)
returns void language sql security definer set search_path = public as $$
  delete from public.pages p where p.id = p_id and p.owner_hash = encode(sha256(convert_to(p_owner,'UTF8')),'hex');
$$;

grant execute on function
  public.dm_open(text,text,text), public.dm_send(text,text,text), public.dm_get(text,text,bigint),
  public.dm_inbox(text,bigint), public.dm_delete_thread(text,text),
  public.page_create(text,text,text,boolean), public.page_set(text,text,boolean,text),
  public.page_post(text,text,text,int,bigint,text), public.page_get(text,text,bigint,bigint),
  public.page_delete_post(text,text,bigint), public.page_delete(text,text)
to anon;

-- rate limits (same guard as part 09)
do $$ begin
  if to_regprocedure('public.rl_guard()') is not null then
    drop trigger if exists rl_dm_msgs on public.dm_msgs;
    create trigger rl_dm_msgs before insert on public.dm_msgs for each row execute function public.rl_guard('3000');
    drop trigger if exists rl_page_posts on public.page_posts;
    create trigger rl_page_posts before insert on public.page_posts for each row execute function public.rl_guard('3000');
  end if;
end $$;
