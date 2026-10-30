-- Visitor logins that stop working at a set time, even when the leader's phone is off.
-- Adds an end time to a login. After it passes, signing in answers like a wrong password and the login is removed.
-- Safe to run more than once.
alter table public.logins add column if not exists expires_at timestamptz;

-- Set (or clear) a login's end time. Only the phone that made the login can.
create or replace function public.login_expire(p_uid text, p_owner text, p_until timestamptz)
returns void language sql security definer set search_path = public as $$
  update public.logins x set expires_at = p_until
  where x.uid = p_uid and x.owner_hash = encode(sha256(convert_to(p_owner,'UTF8')),'hex');
$$;

-- Same as part 15's sign-in, plus: an expired login is deleted and never opens.
create or replace function public.login_get(p_uid text, p_vf text)
returns table(ct text, wait int)
language plpgsql volatile security definer set search_path = public as $$
declare r public.logins%rowtype; f int;
begin
  delete from public.logins x where x.expires_at is not null and x.expires_at < now();
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

grant execute on function public.login_expire(text,text,timestamptz), public.login_get(text,text) to anon;
