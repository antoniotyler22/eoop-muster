create or replace function public.create_feed(p_id text, p_member_key text, p_leader_key text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if char_length(p_member_key) < 24 or char_length(p_leader_key) < 24 then raise exception 'bad key'; end if;
  delete from public.feeds f where f.used_at < now() - interval '90 days';
  insert into public.feeds(id, member_key_hash, leader_key_hash) values (p_id,
    encode(sha256(convert_to(p_member_key,'UTF8')),'hex'),
    encode(sha256(convert_to(p_leader_key,'UTF8')),'hex'));
end $$;

create or replace function public.feed_post(p_feed text, p_leader_key text, p_ct text)
returns bigint language plpgsql security definer set search_path = public as $$
declare new_id bigint;
begin
  update public.feeds f set used_at = now()
  where f.id = p_feed and f.leader_key_hash = encode(sha256(convert_to(p_leader_key,'UTF8')),'hex');
  if not found then raise exception 'not allowed'; end if;
  insert into public.feed_posts(feed_id, ct) values (p_feed, p_ct) returning id into new_id;
  delete from public.feed_posts p where p.feed_id = p_feed and p.id not in
    (select x.id from public.feed_posts x where x.feed_id = p_feed order by x.id desc limit 200);
  return new_id;
end $$;
