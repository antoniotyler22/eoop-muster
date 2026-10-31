-- Accounted For setup part 37: Feed alert sign-ups from the iPhone app.
-- The iPhone app signs up with an Apple push token ({"endpoint":"apns:<token>","apns":"<token>"}), not a web
-- address. feed_sub only accepted https:// sign-ups, so app phones were never added to a team's alert list.
-- This accepts either kind. (Sign-ups may also carry "dev", a device id the notify function uses to skip the
-- phone that posted.)
create or replace function public.feed_sub(p_feed text, p_member_key text, p_sub jsonb)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not exists (select 1 from feeds where id = p_feed
    and member_key_hash = encode(sha256(convert_to(p_member_key,'UTF8')),'hex')) then raise exception 'not allowed'; end if;
  if pg_column_size(p_sub) >= 4000 then raise exception 'bad sub'; end if;
  if not (coalesce(p_sub->>'endpoint','') ~ '^https://'
          or (coalesce(p_sub->>'endpoint','') ~ '^apns:[0-9a-fA-F]{32,200}$' and coalesce(p_sub->>'apns','') ~ '^[0-9a-fA-F]{32,200}$'))
    then raise exception 'bad sub'; end if;
  if (select count(*) from feed_subs where feed_id = p_feed) >= 500 then raise exception 'full'; end if;
  insert into feed_subs(feed_id, endpoint, sub) values (p_feed, p_sub->>'endpoint', p_sub)
  on conflict (feed_id, endpoint) do update set sub = excluded.sub;
end $$;
