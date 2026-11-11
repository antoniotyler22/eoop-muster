-- Part 42: replies as a thread under a Word of Mouth post (app 4.84.0+).
-- Replies are one more kind of signal ('rp'), encrypted on the phone with the Feed key like reactions and Seen by:
-- the server sees only the kind, a hashed id and the time. Needs Part 39. Safe to re-run.

alter table public.feed_signals drop constraint if exists feed_signals_k_check;
alter table public.feed_signals add constraint feed_signals_k_check check (k in ('rx','seen','loc','live','rp'));

create or replace function public.signal_put(p_feed text, p_key text, p_k text, p_ident text, p_ct text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.talk_key_ok(p_feed, p_key) then raise exception 'not allowed'; end if;
  if (select count(*) from public.feed_signals s where s.feed_id = p_feed and s.updated_at > now() - interval '1 minute') >= 900
    then raise exception 'too many signals'; end if;
  insert into public.feed_signals(feed_id, k, ident, ct, updated_at) values (p_feed, p_k, p_ident, p_ct, now())
  on conflict (feed_id, k, ident) do update set ct = excluded.ct, updated_at = now();
  delete from public.feed_signals s where s.feed_id = p_feed and (
    (s.k in ('live') and s.updated_at < now() - interval '1 day') or
    (s.k = 'loc' and s.updated_at < now() - interval '1 day') or
    (s.k in ('rx','seen','rp') and s.updated_at < now() - interval '60 days'));
end $$;

-- the app's system check calls this: it fails until the 'rp' kind is allowed
create or replace function public.replies_ok()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from pg_constraint where conname = 'feed_signals_k_check' and pg_get_constraintdef(oid) like '%''rp''%') then
    raise exception 'Part 42 is missing';
  end if;
  return true;
end $$;

grant execute on function public.signal_put(text,text,text,text,text), public.replies_ok() to anon, authenticated;
notify pgrst, 'reload schema';
