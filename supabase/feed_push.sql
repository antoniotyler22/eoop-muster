alter table public.feeds add column if not exists last_push_id bigint not null default 0;
create table if not exists public.feed_subs (
  id bigint generated always as identity primary key,
  feed_id text not null references public.feeds(id) on delete cascade,
  endpoint text not null,
  sub jsonb not null,
  created_at timestamptz not null default now(),
  unique (feed_id, endpoint)
);
alter table public.feed_subs enable row level security;
revoke all on public.feed_subs from anon, authenticated;

create or replace function public.feed_sub(p_feed text, p_member_key text, p_sub jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from feeds where id = p_feed
    and member_key_hash = encode(sha256(convert_to(p_member_key,'UTF8')),'hex')) then raise exception 'not allowed'; end if;
  if pg_column_size(p_sub) >= 4000 or coalesce(p_sub->>'endpoint','') !~ '^https://' then raise exception 'bad sub'; end if;
  if (select count(*) from feed_subs where feed_id = p_feed) >= 500 then raise exception 'full'; end if;
  insert into feed_subs(feed_id, endpoint, sub) values (p_feed, p_sub->>'endpoint', p_sub)
  on conflict (feed_id, endpoint) do update set sub = excluded.sub;
end $$;

create or replace function public.feed_unsub(p_feed text, p_member_key text, p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from feed_subs s using feeds f
  where s.feed_id = f.id and f.id = p_feed and s.endpoint = p_endpoint
    and f.member_key_hash = encode(sha256(convert_to(p_member_key,'UTF8')),'hex');
$$;

grant execute on function public.feed_sub(text,text,jsonb), public.feed_unsub(text,text,text) to anon;
