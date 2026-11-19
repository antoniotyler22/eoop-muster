-- Setup part 56 (4.134.0): everyone on a team can see the team's join code.
-- The owner's phone seals the code with the team's member key (the same key every member, co-leader and section leader
-- already holds) and stores that sealed copy next to the join code. A phone that holds the member key can read the sealed
-- copy and open it; nobody else can. The server never sees the code itself.
alter table public.join_codes add column if not exists view_ct text check (char_length(view_ct) <= 2000);

-- a new code clears the old sealed copy until the owner's phone seals the new one
create or replace function public.join_code_set(p_feed text, p_leader_key text, p_h text, p_ct text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.af_leader_ok(p_feed, p_leader_key) then raise exception 'not allowed'; end if;
  if coalesce(p_h,'') !~ '^[0-9a-f]{64}$' or char_length(coalesce(p_ct,'')) not between 1 and 6000 then raise exception 'bad input'; end if;
  if exists (select 1 from public.join_codes c where c.h = p_h and c.feed_id <> p_feed) then raise exception 'code taken'; end if;
  insert into public.join_codes(feed_id, h, ct, enabled, view_ct, updated_at) values (p_feed, p_h, p_ct, true, null, now())
  on conflict (feed_id) do update set h = excluded.h, ct = excluded.ct, enabled = true, view_ct = null, updated_at = now();
end $$;

-- owner: store the sealed copy people on the team read
create or replace function public.join_code_view_set(p_feed text, p_leader_key text, p_ct text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.af_leader_ok(p_feed, p_leader_key) then raise exception 'not allowed'; end if;
  if char_length(coalesce(p_ct,'')) not between 1 and 2000 then raise exception 'bad input'; end if;
  update public.join_codes set view_ct = p_ct where feed_id = p_feed;
end $$;

-- anyone on the team (holds the member key): the sealed copy, or nothing
create or replace function public.join_code_view_get(p_feed text, p_member_key text)
returns text language sql stable security definer set search_path = public as $$
  select c.view_ct from public.join_codes c join public.feeds f on f.id = c.feed_id
  where c.feed_id = p_feed and f.member_key_hash = encode(sha256(convert_to(coalesce(p_member_key,''),'UTF8')),'hex');
$$;

revoke all on function public.join_code_set(text,text,text,text), public.join_code_view_set(text,text,text), public.join_code_view_get(text,text) from public;
grant execute on function public.join_code_set(text,text,text,text), public.join_code_view_set(text,text,text), public.join_code_view_get(text,text) to anon, authenticated;
