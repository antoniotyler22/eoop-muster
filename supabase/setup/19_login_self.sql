-- Accounted For 1.3: people can set their own login password.
-- The leader's phone makes a login with a temporary password. After signing in, the person can change it
-- on their own phone: their phone re-seals the same page link with a key made from the new password.
-- Once they do, the leader's phone stops overwriting it (it can't, it doesn't know the new password)
-- unless the leader taps "Reset password", which issues a new temporary one.
alter table public.logins add column if not exists self_set boolean not null default false;

-- Leader's phone: create or update a login. Returns 'ok', or 'self' when the person set their own
-- password and p_force is false (nothing changed then).
create or replace function public.login_put2(p_uid text, p_owner text, p_vf text, p_ct text, p_force boolean default false)
returns text language plpgsql security definer set search_path = public as $$
declare oh text := encode(sha256(convert_to(p_owner,'UTF8')),'hex'); r public.logins%rowtype;
begin
  if p_uid !~ '^[0-9a-f]{64}$' or char_length(p_owner) < 24 or p_vf !~ '^[0-9a-f]{64}$'
     or char_length(p_ct) < 20 or char_length(p_ct) > 8000 then raise exception 'bad input'; end if;
  select * into r from public.logins x where x.uid = p_uid for update;
  if not found then
    delete from public.logins x where coalesce(x.used_at, x.created_at) < now() - interval '365 days';
    insert into public.logins(uid, owner_hash, vf_hash, ct) values (p_uid, oh, encode(sha256(convert_to(p_vf,'UTF8')),'hex'), p_ct);
    return 'ok';
  end if;
  if r.owner_hash <> oh then raise exception 'taken'; end if;
  if r.self_set and not coalesce(p_force,false) then return 'self'; end if;
  update public.logins x set vf_hash = encode(sha256(convert_to(p_vf,'UTF8')),'hex'), ct = p_ct, fails = 0, lock_until = null, self_set = false
   where x.uid = p_uid;
  return 'ok';
end $$;

-- The person's phone: change the password. Proves the old one, swaps in the new check value and sealed copy.
-- Wrong old passwords count toward the same lockout as sign-in.
create or replace function public.login_change(p_uid text, p_vf_old text, p_vf_new text, p_ct_new text)
returns boolean language plpgsql security definer set search_path = public as $$
declare r public.logins%rowtype; f int;
begin
  if p_vf_new !~ '^[0-9a-f]{64}$' or char_length(p_ct_new) < 20 or char_length(p_ct_new) > 8000 then raise exception 'bad input'; end if;
  select * into r from public.logins x where x.uid = p_uid for update;
  if not found then return false; end if;
  if r.lock_until is not null and r.lock_until > now() then raise exception 'locked'; end if;
  if r.vf_hash <> encode(sha256(convert_to(coalesce(p_vf_old,''),'UTF8')),'hex') then
    f := r.fails + 1;
    update public.logins x set fails = f,
      lock_until = case when f % 5 = 0 then now() + interval '15 minutes' * least(f / 5, 8) else null end
    where x.uid = p_uid;
    return false;
  end if;
  update public.logins x set vf_hash = encode(sha256(convert_to(p_vf_new,'UTF8')),'hex'), ct = p_ct_new,
    self_set = true, fails = 0, lock_until = null, used_at = now() where x.uid = p_uid;
  return true;
end $$;

-- Leader's phone: which of my logins did people change themselves?
drop function if exists public.login_states(text[], text);
create function public.login_states(p_uids text[], p_owner text)
returns table(uid text, self_set boolean, used_at timestamptz)
language sql stable security definer set search_path = public as $$
  select x.uid, x.self_set, x.used_at from public.logins x
  where x.uid = any(p_uids[1:500]) and x.owner_hash = encode(sha256(convert_to(p_owner,'UTF8')),'hex');
$$;

grant execute on function public.login_put2(text,text,text,text,boolean), public.login_change(text,text,text,text),
  public.login_states(text[],text) to anon;
notify pgrst, 'reload schema';
