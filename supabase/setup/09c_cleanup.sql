-- Nightly cleanup at 0317 Hawaii time. If this errors on the first line, turn on pg_cron in
-- Database > Extensions, then run it again.
create extension if not exists pg_cron;
select cron.schedule('eop-nightly-cleanup', '17 13 * * *', $job$
  delete from public.recalls where expires_at < now();
  delete from public.boards where used_at < now() - interval '45 days';
  delete from public.feeds where used_at < now() - interval '90 days';
  delete from public.my_pages where updated_at < now() - interval '120 days';
  delete from public.backups where updated_at < now() - interval '400 days';
  delete from public.rate_hits where w < now() - interval '1 day';
$job$);
