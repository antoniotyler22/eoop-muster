alter table public.feeds add column if not exists poster_key_hash text;

create or replace function public.set_feed_poster(p_feed text, p_leader_key text, p_poster_key text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if char_length(p_poster_key) < 24 then raise exception 'bad key'; end if;
  update public.feeds f set poster_key_hash = encode(sha256(convert_to(p_poster_key,'UTF8')),'hex')
  where f.id = p_feed and f.leader_key_hash = encode(sha256(convert_to(p_leader_key,'UTF8')),'hex');
  if not found then raise exception 'not allowed'; end if;
end $$;

create or replace function public.feed_post_sl(p_feed text, p_poster_key text, p_ct text)
returns bigint language plpgsql security definer set search_path = public as $$
declare new_id bigint;
begin
  update public.feeds f set used_at = now()
  where f.id = p_feed and f.poster_key_hash is not null
    and f.poster_key_hash = encode(sha256(convert_to(p_poster_key,'UTF8')),'hex');
  if not found then raise exception 'not allowed'; end if;
  insert into public.feed_posts(feed_id, ct) values (p_feed, p_ct) returning id into new_id;
  delete from public.feed_posts p where p.feed_id = p_feed and p.id not in
    (select x.id from public.feed_posts x where x.feed_id = p_feed order by x.id desc limit 200);
  return new_id;
end $$;

grant execute on function public.set_feed_poster(text,text,text), public.feed_post_sl(text,text,text) to anon;
