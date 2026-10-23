-- Requests (leave, liberty, appointments...). Encrypted on the member's phone with the feed key;
-- members can only add, only the leader key can read.
create table if not exists public.feed_reqs (
  id bigint generated always as identity primary key,
  feed_id text not null references public.feeds(id) on delete cascade,
  ct text not null check (char_length(ct) <= 3000),
  created_at timestamptz not null default now()
);
create index if not exists feed_reqs_idx on public.feed_reqs(feed_id, id);
alter table public.feed_reqs enable row level security;
revoke all on public.feed_reqs from anon, authenticated;

create or replace function public.feed_req(p_feed text, p_member_key text, p_ct text)
returns bigint language plpgsql security definer set search_path = public as $$
declare new_id bigint;
begin
  if not exists (select 1 from public.feeds f where f.id = p_feed
    and f.member_key_hash = encode(sha256(convert_to(p_member_key,'UTF8')),'hex')) then raise exception 'not allowed'; end if;
  if (select count(*) from public.feed_reqs r where r.feed_id = p_feed and r.created_at > now() - interval '1 day') >= 500
    then raise exception 'too many requests today'; end if;
  delete from public.feed_reqs r where r.feed_id = p_feed and r.created_at < now() - interval '120 days';
  insert into public.feed_reqs(feed_id, ct) values (p_feed, p_ct) returning id into new_id;
  return new_id;
end $$;

drop function if exists public.feed_reqs_get(text,text,bigint);
create function public.feed_reqs_get(p_feed text, p_leader_key text, p_after bigint default 0)
returns table(id bigint, ct text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, r.ct, r.created_at from public.feed_reqs r join public.feeds f on f.id = r.feed_id
  where f.id = p_feed and f.leader_key_hash = encode(sha256(convert_to(p_leader_key,'UTF8')),'hex')
    and r.id > p_after
  order by r.id limit 500;
$$;

grant execute on function public.feed_req(text,text,text), public.feed_reqs_get(text,text,bigint) to anon;
