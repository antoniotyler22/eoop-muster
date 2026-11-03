-- Accounted For setup part 41: everyone can post to the Word of Mouth (the Feed).
-- A member's own key is enough to post to the unit's Word of Mouth. The post is encrypted on the phone like any other;
-- the server only checks the key and a rate limit (30 member posts per 5 minutes per Word of Mouth). Leaders can still
-- remove any post. Safe to re-run.
create or replace function public.feed_post_member(p_feed text, p_member_key text, p_ct text)
returns bigint language plpgsql security definer set search_path = public as $$
declare new_id bigint;
begin
  if char_length(coalesce(p_ct,'')) = 0 or char_length(p_ct) > 20000 then raise exception 'bad post'; end if;
  update public.feeds f set used_at = now()
  where f.id = p_feed and f.member_key_hash = encode(sha256(convert_to(p_member_key,'UTF8')),'hex');
  if not found then raise exception 'not allowed'; end if;
  if (select count(*) from public.feed_posts x where x.feed_id = p_feed and x.created_at > now() - interval '5 minutes') >= 30
    then raise exception 'too many posts, wait a few minutes'; end if;
  insert into public.feed_posts(feed_id, ct) values (p_feed, p_ct) returning id into new_id;
  delete from public.feed_posts p where p.feed_id = p_feed and p.id not in
    (select x.id from public.feed_posts x where x.feed_id = p_feed order by x.id desc limit 200);
  return new_id;
end $$;
grant execute on function public.feed_post_member(text,text,text) to anon;
