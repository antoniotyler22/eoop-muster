drop function if exists public.feed_acks_get(text,text,bigint);
create function public.feed_acks_get(p_feed text, p_leader_key text, p_after bigint default 0)
returns table(id bigint, post_id bigint, words text[], code smallint, note text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.id, a.post_id, a.words, a.code, a.note, a.created_at
  from public.feed_acks a join public.feeds f on f.id = a.feed_id
  where f.id = p_feed
    and f.leader_key_hash = encode(sha256(convert_to(p_leader_key,'UTF8')),'hex')
    and a.id > p_after
  order by a.id limit 1000;
$$;

create or replace function public.feed_delete_post(p_feed text, p_leader_key text, p_post bigint)
returns void language sql security definer set search_path = public as $$
  delete from public.feed_posts p using public.feeds f
  where p.id = p_post and p.feed_id = f.id and f.id = p_feed
    and f.leader_key_hash = encode(sha256(convert_to(p_leader_key,'UTF8')),'hex');
$$;

create or replace function public.delete_feed(p_feed text, p_leader_key text)
returns void language sql security definer set search_path = public as $$
  delete from public.feeds f
  where f.id = p_feed and f.leader_key_hash = encode(sha256(convert_to(p_leader_key,'UTF8')),'hex');
$$;

grant execute on function public.create_feed(text,text,text), public.feed_post(text,text,text),
  public.feed_get(text,text,bigint), public.feed_ack(text,text,bigint,text[],int,text),
  public.feed_acks_get(text,text,bigint), public.feed_delete_post(text,text,bigint),
  public.delete_feed(text,text) to anon;
