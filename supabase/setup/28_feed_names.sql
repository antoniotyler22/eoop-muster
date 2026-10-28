-- Part 28: "Who are you?" for Feed links. The leader's phone puts the team's names (rank, name and section only:
-- no phones, statuses or calendar) on the server, encrypted with the Feed key, so someone who opens a Feed link can
-- pick their own name. The server can't read it. Only the leader key writes it; anyone with the Feed link reads it.
-- Needs part 4 (feeds). Safe to re-run.

create table if not exists public.feed_names (
  feed_id text primary key references public.feeds(id) on delete cascade,
  ct text not null check (char_length(ct) <= 200000),
  updated_at timestamptz not null default now()
);
alter table public.feed_names enable row level security;
revoke all on public.feed_names from anon, authenticated;

create or replace function public.feed_names_put(p_feed text, p_leader_key text, p_ct text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.feeds f where f.id = p_feed
    and f.leader_key_hash = encode(sha256(convert_to(p_leader_key,'UTF8')),'hex')) then raise exception 'not allowed'; end if;
  insert into public.feed_names(feed_id, ct, updated_at) values (p_feed, p_ct, now())
  on conflict (feed_id) do update set ct = excluded.ct, updated_at = now();
end $$;

drop function if exists public.feed_names_get(text,text);
create function public.feed_names_get(p_feed text, p_member_key text)
returns table(ct text, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select n.ct, n.updated_at from public.feed_names n join public.feeds f on f.id = n.feed_id
  where f.id = p_feed and f.member_key_hash = encode(sha256(convert_to(p_member_key,'UTF8')),'hex');
$$;

revoke all on function public.feed_names_put(text,text,text) from public;
revoke all on function public.feed_names_get(text,text) from public;
grant execute on function public.feed_names_put(text,text,text), public.feed_names_get(text,text) to anon;

notify pgrst, 'reload schema';
