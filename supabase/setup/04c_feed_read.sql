drop function if exists public.feed_get(text,text,bigint);
create function public.feed_get(p_feed text, p_member_key text, p_after bigint default 0)
returns table(id bigint, ct text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.ct, p.created_at
  from public.feed_posts p join public.feeds f on f.id = p.feed_id
  where f.id = p_feed
    and f.member_key_hash = encode(sha256(convert_to(p_member_key,'UTF8')),'hex')
    and p.id > p_after
  order by p.id desc limit 100;
$$;

create or replace function public.feed_ack(p_feed text, p_member_key text, p_post bigint,
  p_words text[], p_code int, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.feeds f where f.id = p_feed
    and f.member_key_hash = encode(sha256(convert_to(p_member_key,'UTF8')),'hex')) then raise exception 'not allowed'; end if;
  if not exists (select 1 from public.feed_posts p where p.id = p_post and p.feed_id = p_feed) then raise exception 'post gone'; end if;
  if coalesce(array_length(p_words,1),0) not between 1 and 6 then raise exception 'bad name'; end if;
  insert into public.feed_acks(feed_id, post_id, words, code, note)
  values (p_feed, p_post, p_words, p_code, left(coalesce(p_note,''),60));
end $$;
