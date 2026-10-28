-- Part 26: check in by texting back. When the server texts the check-in link (Pro), it also remembers, for that
-- check-in only, a scrambled key for each number it texted and the scrambled name the leader's phone will match.
-- When someone replies 1, 2 or 3 (or "safe", "late", "help") to the team's text number, the "sms-in" function
-- turns the reply into a normal check-in. Phone numbers are never stored: only a one-way key made with a server
-- secret. Everything is deleted with the check-in (when the leader closes it, or after 72 hours).
-- Needs part 1 (recalls, checkins). Safe to re-run.

create table if not exists public.sms_routes (
  ph_key text not null check (ph_key ~ '^[0-9a-f]{64}$'),
  recall_id text not null references public.recalls(id) on delete cascade,
  words text[] not null check (coalesce(array_length(words, 1), 0) between 1 and 6),
  created_at timestamptz not null default now(),
  primary key (ph_key, recall_id)
);
create index if not exists sms_routes_recall_idx on public.sms_routes(recall_id);
alter table public.sms_routes enable row level security;
revoke all on public.sms_routes from anon, authenticated;

-- Server only (the "sms" function, after the leader's phone proved it runs the check-in): remember who was texted.
create or replace function public.sms_routes_put(p_recall text, p_rows jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; x jsonb; w text[];
begin
  if not exists (select 1 from public.recalls r where r.id = p_recall and r.expires_at > now()) then raise exception 'recall closed'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 400 then raise exception 'bad input'; end if;
  for x in select * from jsonb_array_elements(p_rows) loop
    if coalesce(x->>'k', '') !~ '^[0-9a-f]{64}$' or jsonb_typeof(x->'w') <> 'array' then continue; end if;
    select array_agg(v) into w from (select jsonb_array_elements_text(x->'w') v limit 6) s where v ~ '^[0-9a-f]{16}$';
    if coalesce(array_length(w, 1), 0) = 0 then continue; end if;
    insert into public.sms_routes(ph_key, recall_id, words) values (x->>'k', p_recall, w)
      on conflict (ph_key, recall_id) do update set words = excluded.words, created_at = now();
    n := n + 1;
  end loop;
  return n;
end $$;

-- Server only (the "sms-in" function): a reply came in. Finds the newest open check-in that texted this number and
-- records the answer there. Returns the check-in id, or null when this number wasn't texted for an open check-in.
create or replace function public.sms_reply(p_ph_key text, p_code int, p_note text)
returns text language plpgsql security definer set search_path = public as $$
declare v record;
begin
  if p_code is null or p_code not between 1 and 3 then raise exception 'bad code'; end if;
  select s.recall_id, s.words into v from public.sms_routes s join public.recalls r on r.id = s.recall_id
   where s.ph_key = p_ph_key and r.expires_at > now() order by s.created_at desc limit 1;
  if not found then return null; end if;
  perform public.checkin(v.recall_id, v.words, p_code, left(coalesce(p_note, ''), 60));
  return v.recall_id;
end $$;

revoke all on function public.sms_routes_put(text, jsonb) from public, anon, authenticated;
revoke all on function public.sms_reply(text, int, text) from public, anon, authenticated;
grant execute on function public.sms_routes_put(text, jsonb) to service_role;
grant execute on function public.sms_reply(text, int, text) to service_role;
