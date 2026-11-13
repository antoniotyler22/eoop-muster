-- Part 44: Team chat for a Word of Mouth (app 4.98.0+).
-- Text messages and "accounted for" notes are encrypted on the phone with the Feed key, like Talk and replies:
-- the server only stores ciphertext. Anyone with the member OR leader key of a Feed can send and read.
-- The server keeps the last 1000 messages and nothing older than 30 days. Needs Part 38 (uses talk_key_ok). Safe to re-run.

create table if not exists public.chat_msgs (
  id bigserial primary key,
  feed_id text not null references public.feeds(id) on delete cascade,
  ct text not null check (char_length(ct) <= 8000),
  created_at timestamptz not null default now()
);
create index if not exists chat_msgs_idx on public.chat_msgs(feed_id, id);
alter table public.chat_msgs enable row level security;
revoke all on public.chat_msgs from anon, authenticated;

create or replace function public.chat_send(p_feed text, p_key text, p_ct text)
returns bigint language plpgsql security definer set search_path = public as $$
declare new_id bigint;
begin
  if not public.talk_key_ok(p_feed, p_key) then raise exception 'not allowed'; end if;
  if (select count(*) from public.chat_msgs m where m.feed_id = p_feed and m.created_at > now() - interval '1 minute') >= 60
    then raise exception 'too many messages'; end if;
  insert into public.chat_msgs(feed_id, ct) values (p_feed, p_ct) returning id into new_id;
  delete from public.chat_msgs m where m.feed_id = p_feed and (m.created_at < now() - interval '30 days'
    or m.id not in (select x.id from public.chat_msgs x where x.feed_id = p_feed order by x.id desc limit 1000));
  return new_id;
end $$;

drop function if exists public.chat_get(text,text,bigint);
create function public.chat_get(p_feed text, p_key text, p_after bigint default 0)
returns table(id bigint, ct text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.id, m.ct, m.created_at from public.chat_msgs m
  where m.feed_id = p_feed and public.talk_key_ok(p_feed, p_key) and m.id > p_after
  order by m.id limit 100;
$$;

-- the app's system check calls this: it fails until the table exists
create or replace function public.chat_ok()
returns boolean language sql security definer set search_path = public as $$
  select to_regclass('public.chat_msgs') is not null;
$$;

grant execute on function public.chat_send(text,text,text), public.chat_get(text,text,bigint), public.chat_ok() to anon, authenticated;
notify pgrst, 'reload schema';
