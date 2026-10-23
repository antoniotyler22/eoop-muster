-- OIC alerts: the OIC's phone gets a buzz when a member sends a request or reports a problem.
alter table public.feeds add column if not exists leader_sub jsonb;
alter table public.feeds add column if not exists leader_push_at timestamptz;

create or replace function public.set_feed_leader_sub(p_feed text, p_leader_key text, p_sub jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if pg_column_size(p_sub) >= 4000 then raise exception 'bad sub'; end if;
  update public.feeds f set leader_sub = p_sub
  where f.id = p_feed and f.leader_key_hash = encode(sha256(convert_to(p_leader_key,'UTF8')),'hex');
  if not found then raise exception 'not allowed'; end if;
end $$;

grant execute on function public.set_feed_leader_sub(text,text,jsonb) to anon;
