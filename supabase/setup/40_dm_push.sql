-- Accounted For setup part 40: phone alerts for Inbox messages.
-- Each phone that can read a private thread signs up for it (leader = "L", the person = "M"). When a message is
-- sent, the sender's phone calls the notify function ({dm: thread id, k: thread key, by: "L"|"M"}); notify checks the
-- thread key and buzzes the phones on the OTHER side. Alerts carry no names and no message text.
-- Run this in the SQL Editor, then deploy the new notify function (Tools > System check > Copy notify code).
create table if not exists public.dm_subs (
  id bigserial primary key,
  thread_id text not null references public.dm_threads(id) on delete cascade,
  role text not null check (role in ('L','M')),
  endpoint text not null,
  sub jsonb not null,
  created_at timestamptz not null default now(),
  unique (thread_id, endpoint)
);
alter table public.dm_subs enable row level security;
revoke all on public.dm_subs from anon, authenticated;

create or replace function public.dm_sub(p_id text, p_key text, p_role text, p_sub jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_role not in ('L','M') then raise exception 'bad role'; end if;
  if not exists (select 1 from public.dm_threads t where t.id = p_id
    and t.key_hash = encode(sha256(convert_to(p_key,'UTF8')),'hex')) then raise exception 'not allowed'; end if;
  if pg_column_size(p_sub) >= 4000 then raise exception 'bad sub'; end if;
  if not (coalesce(p_sub->>'endpoint','') ~ '^https://'
          or (coalesce(p_sub->>'endpoint','') ~ '^apns:[0-9a-fA-F]{32,200}$' and coalesce(p_sub->>'apns','') ~ '^[0-9a-fA-F]{32,200}$'))
    then raise exception 'bad sub'; end if;
  if (select count(*) from public.dm_subs where thread_id = p_id) >= 20 then raise exception 'full'; end if;
  insert into public.dm_subs(thread_id, role, endpoint, sub) values (p_id, p_role, p_sub->>'endpoint', p_sub)
  on conflict (thread_id, endpoint) do update set sub = excluded.sub, role = excluded.role;
end $$;
grant execute on function public.dm_sub(text,text,text,jsonb) to anon;
grant select, insert, update, delete on public.dm_subs to service_role;
grant usage, select on all sequences in schema public to service_role;
notify pgrst, 'reload schema';
