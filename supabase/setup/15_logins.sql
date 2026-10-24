-- Logins: a username + password that opens the right page instead of sending a long link.
-- The OIC's phone seals the person's link with a key made from their password. The server keeps only
-- that sealed copy and a check value made from the password, so it can't read the link or the password.
-- 5 wrong tries locks a login for 15 minutes (longer each time it locks again).
create table if not exists public.logins (
  uid text primary key check (uid ~ '^[0-9a-f]{64}$'),
  owner_hash text not null,
  vf_hash text not null,
  ct text not null check (char_length(ct) <= 8000),
  fails int not null default 0,
  lock_until timestamptz,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
alter table public.logins enable row level security;
revoke all on public.logins from anon, authenticated;

-- Create or update a login. Only the phone that made it (same owner key) can change it.
create or replace function public.login_put(p_uid text, p_owner text, p_vf text, p_ct text)
returns void language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if p_uid !~ '^[0-9a-f]{64}$' or char_length(p_owner) < 24 or p_vf !~ '^[0-9a-f]{64}$'
     or char_length(p_ct) < 20 or char_length(p_ct) > 8000 then raise exception 'bad input'; end if;
  delete from public.logins x where coalesce(x.used_at, x.created_at) < now() - interval '365 days';
  insert into public.logins(uid, owner_hash, vf_hash, ct)
  values (p_uid, encode(sha256(convert_to(p_owner,'UTF8')),'hex'), encode(sha256(convert_to(p_vf,'UTF8')),'hex'), p_ct)
  on conflict (uid) do update set vf_hash = excluded.vf_hash, ct = excluded.ct, fails = 0, lock_until = null
    where public.logins.owner_hash = excluded.owner_hash;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'taken'; end if;
end $$;

-- Sign in. Returns the sealed page only when the password check matches.
-- A wrong username and a wrong password look the same from outside.
drop function if exists public.login_get(text, text);
create function public.login_get(p_uid text, p_vf text)
returns table(ct text, wait int)
language plpgsql volatile security definer set search_path = public as $$
declare r public.logins%rowtype; f int;
begin
  select * into r from public.logins x where x.uid = p_uid for update;
  if not found then return query select null::text, 0; return; end if;
  if r.lock_until is not null and r.lock_until > now() then
    return query select null::text, ceil(extract(epoch from r.lock_until - now()))::int; return;
  end if;
  if r.vf_hash = encode(sha256(convert_to(coalesce(p_vf,''),'UTF8')),'hex') then
    update public.logins x set fails = 0, lock_until = null, used_at = now() where x.uid = p_uid;
    return query select r.ct, 0; return;
  end if;
  f := r.fails + 1;
  update public.logins x set fails = f,
    lock_until = case when f % 5 = 0 then now() + interval '15 minutes' * least(f / 5, 8) else null end
  where x.uid = p_uid;
  return query select null::text, case when f % 5 = 0 then 900 * least(f / 5, 8) else 0 end;
end $$;

-- Remove a login (only the phone that made it).
create or replace function public.login_delete(p_uid text, p_owner text)
returns void language sql security definer set search_path = public as $$
  delete from public.logins x where x.uid = p_uid and x.owner_hash = encode(sha256(convert_to(p_owner,'UTF8')),'hex');
$$;

grant execute on function public.login_put(text,text,text,text), public.login_get(text,text), public.login_delete(text,text) to anon;
