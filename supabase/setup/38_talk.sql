-- Part 38: Talk (push-to-talk voice) for a Feed (app 4.67.0+).
-- Everything is encrypted on the phone with the Feed key (voice clips, groups, who has Talk on, "heard by"
-- receipts); the server only stores ciphertext. Anyone with the member OR leader key of a Feed can send and read.
-- Clips are short-lived: the server keeps the last 300 items and nothing older than 3 days. Safe to re-run.

create table if not exists public.talk_msgs (
  id bigserial primary key,
  feed_id text not null references public.feeds(id) on delete cascade,
  ct text not null check (char_length(ct) <= 600000),
  created_at timestamptz not null default now()
);
create index if not exists talk_msgs_idx on public.talk_msgs(feed_id, id);
alter table public.talk_msgs enable row level security;
revoke all on public.talk_msgs from anon, authenticated;

create or replace function public.talk_key_ok(p_feed text, p_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.feeds f where f.id = p_feed
    and encode(sha256(convert_to(p_key,'UTF8')),'hex') in (f.member_key_hash, f.leader_key_hash));
$$;

create or replace function public.talk_send(p_feed text, p_key text, p_ct text)
returns bigint language plpgsql security definer set search_path = public as $$
declare new_id bigint;
begin
  if not public.talk_key_ok(p_feed, p_key) then raise exception 'not allowed'; end if;
  if (select count(*) from public.talk_msgs m where m.feed_id = p_feed and m.created_at > now() - interval '1 minute') >= 120
    then raise exception 'too many messages'; end if;
  insert into public.talk_msgs(feed_id, ct) values (p_feed, p_ct) returning id into new_id;
  delete from public.talk_msgs m where m.feed_id = p_feed and (m.created_at < now() - interval '3 days'
    or m.id not in (select x.id from public.talk_msgs x where x.feed_id = p_feed order by x.id desc limit 300));
  return new_id;
end $$;

drop function if exists public.talk_get(text,text,bigint);
create function public.talk_get(p_feed text, p_key text, p_after bigint default 0)
returns table(id bigint, ct text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.id, m.ct, m.created_at from public.talk_msgs m
  where m.feed_id = p_feed and public.talk_key_ok(p_feed, p_key) and m.id > p_after
  order by m.id limit 100;
$$;

create or replace function public.talk_ok()
returns boolean language sql security definer set search_path = public as $$
  select to_regclass('public.talk_msgs') is not null;
$$;

grant execute on function public.talk_send(text,text,text), public.talk_get(text,text,bigint), public.talk_ok() to anon, authenticated;
