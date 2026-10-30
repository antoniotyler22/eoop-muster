-- Part 36: leader alerts for member check-ins and requests no longer depend on the member's phone.
-- Before: the member's phone told "notify" to buzz the leaders. If it lost signal right after saving, nobody was
-- told, and a burst of check-ins inside 15 s produced one buzz and dropped the rest.
-- Now: the database itself queues a "req" job 15 s after each check-in or request (same queue as part 27). The job
-- sends ONE alert for everything new since the last alert ("3 new check-ins or requests"). The member's phone can
-- still buzz instantly; whichever comes first claims the new rows and the other finds nothing new.
-- Also adds feed_sub_stats so a leader can see how many phones are on the alert list.
-- Needs parts 4, 8, 22 and 27. Deploy notify 4.31.0 or later. Safe to re-run.

alter table public.feeds add column if not exists last_req_push_id bigint not null default 0;
-- Start from now, so old check-ins are not announced again.
update public.feeds f set last_req_push_id = coalesce((select max(r.id) from public.feed_reqs r where r.feed_id = f.id), 0)
  where f.last_req_push_id = 0;

create or replace function public.push_hook_req()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.feed_subs s where s.feed_id = new.feed_id)
     or exists (select 1 from public.feeds f where f.id = new.feed_id and f.leader_sub is not null) then
    perform pgmq.send('push', jsonb_build_object('kind', 'req', 'feed', new.feed_id), 15);
  end if;
  return null;
exception when others then return null; -- an alert problem never blocks the check-in
end $$;
revoke all on function public.push_hook_req() from public, anon, authenticated;

drop trigger if exists af_push_req on public.feed_reqs;
create trigger af_push_req after insert on public.feed_reqs for each row execute function public.push_hook_req();

-- How many phones are on this team's alert list (leader key only). Counts only, no addresses.
create or replace function public.feed_sub_stats(p_feed text, p_leader_key text)
returns table(total int, leads int)
language sql stable security definer set search_path = public as $$
  select count(*)::int, (count(*) filter (where s.sub->>'lead' = '1'))::int
  from public.feed_subs s join public.feeds f on f.id = s.feed_id
  where f.id = p_feed and f.leader_key_hash = encode(sha256(convert_to(p_leader_key,'UTF8')),'hex');
$$;
grant execute on function public.feed_sub_stats(text,text) to anon;

notify pgrst, 'reload schema';
