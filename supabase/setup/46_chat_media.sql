-- Part 46: Photos, memes and short videos in chat (app 4.106.0+).
-- Team chat and Messages/groups carry the media inside the encrypted message (the server only sees ciphertext), so those
-- two only need a bigger size limit. The official channel is public, so its posts get a "media" column.
-- Big messages (media) are kept 7 days, then dropped; text stays as before. Needs Parts 17, 38, 44 and 45. Safe to re-run.

-- Team chat: up to 1.5 MB per message, at most 6 media messages a minute per team, media kept 7 days
alter table public.chat_msgs drop constraint if exists chat_msgs_ct_check;
alter table public.chat_msgs add constraint chat_msgs_ct_check check (char_length(ct) <= 2000000);

create or replace function public.chat_send(p_feed text, p_key text, p_ct text)
returns bigint language plpgsql security definer set search_path = public as $$
declare new_id bigint;
begin
  if not public.talk_key_ok(p_feed, p_key) then raise exception 'not allowed'; end if;
  if (select count(*) from public.chat_msgs m where m.feed_id = p_feed and m.created_at > now() - interval '1 minute') >= 60
    then raise exception 'too many messages'; end if;
  if char_length(p_ct) > 20000 and (select count(*) from public.chat_msgs m where m.feed_id = p_feed and char_length(m.ct) > 20000
       and m.created_at > now() - interval '1 minute') >= 6
    then raise exception 'too many photos'; end if;
  insert into public.chat_msgs(feed_id, ct) values (p_feed, p_ct) returning id into new_id;
  delete from public.chat_msgs m where m.feed_id = p_feed and (m.created_at < now() - interval '30 days'
    or (char_length(m.ct) > 20000 and m.created_at < now() - interval '7 days')
    or m.id not in (select x.id from public.chat_msgs x where x.feed_id = p_feed order by x.id desc limit 1000));
  return new_id;
end $$;

-- Messages and groups: up to 1.6 MB per message, media kept 7 days
alter table public.dm_msgs drop constraint if exists dm_msgs_ct_check;
alter table public.dm_msgs add constraint dm_msgs_ct_check check (char_length(ct) <= 2000000);

create or replace function public.dm_send(p_id text, p_key text, p_ct text)
returns bigint language plpgsql security definer set search_path = public as $$
declare new_id bigint;
begin
  update public.dm_threads t set used_at = now()
   where t.id = p_id and t.key_hash = encode(sha256(convert_to(p_key,'UTF8')),'hex');
  if not found then raise exception 'not allowed'; end if;
  if (select count(*) from public.dm_msgs m where m.thread_id = p_id and m.created_at > now() - interval '1 day') >= 400
    then raise exception 'too many messages today'; end if;
  if char_length(p_ct) > 20000 and (select count(*) from public.dm_msgs m where m.thread_id = p_id and char_length(m.ct) > 20000
       and m.created_at > now() - interval '1 minute') >= 6
    then raise exception 'too many photos'; end if;
  insert into public.dm_msgs(thread_id, ct) values (p_id, p_ct) returning id into new_id;
  delete from public.dm_msgs m where m.thread_id = p_id and (m.id not in
    (select x.id from public.dm_msgs x where x.thread_id = p_id order by x.id desc limit 300)
    or (char_length(m.ct) > 20000 and m.created_at < now() - interval '7 days'));
  return new_id;
end $$;

-- Official channel: a post can carry one photo, meme or video (public, up to 1.5 MB)
alter table public.official_posts add column if not exists media text not null default '';
alter table public.official_posts drop constraint if exists official_posts_media_check;
alter table public.official_posts add constraint official_posts_media_check check (char_length(media) <= 1500000);
alter table public.official_posts drop constraint if exists official_posts_body_check;
alter table public.official_posts add constraint official_posts_body_check check (char_length(body) <= 1000 and (char_length(body) > 0 or char_length(media) > 0));

drop function if exists public.official_get(bigint);
create function public.official_get(p_after bigint default 0)
returns table(id bigint, body text, url text, created_at timestamptz, has_media boolean)
language sql stable security definer set search_path = public as $$
  select * from (select p.id, p.body, p.url, p.created_at, p.media <> '' from public.official_posts p where p.id > p_after order by p.id desc limit 50) x order by x.id;
$$;

create or replace function public.official_media(p_id bigint)
returns text language sql stable security definer set search_path = public as $$
  select p.media from public.official_posts p where p.id = p_id;
$$;

create or replace function public.chat_media_ok()
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'official_posts' and column_name = 'media');
$$;

grant execute on function public.official_get(bigint), public.official_media(bigint), public.chat_media_ok() to anon, authenticated;
notify pgrst, 'reload schema';
