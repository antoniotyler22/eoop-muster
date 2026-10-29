-- Part 32: photos on Feed posts (app 4.18.5+). Part 04a capped a post at 3,000 characters, which is fine for words
-- but a post with photos carries them inside its encrypted payload (shrunk on the phone; up to 4 photos, about
-- 600 KB in all). This raises the cap to 1,000,000 characters. Safe to re-run.
-- Until this runs, posting a photo fails with "feed_posts_ct_check".

alter table public.feed_posts drop constraint if exists feed_posts_ct_check;
alter table public.feed_posts add constraint feed_posts_ct_check check (char_length(ct) <= 1000000);

-- lets the app's System check confirm the part ran
create or replace function public.feed_photos_ok()
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid
    where t.relname = 'feed_posts' and c.conname = 'feed_posts_ct_check' and pg_get_constraintdef(c.oid) like '%1000000%');
$$;
grant execute on function public.feed_photos_ok() to anon, authenticated;
