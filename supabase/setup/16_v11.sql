-- Accounted For 1.1: a signed-in member can delete their own login (App Store 5.1.1(v) account deletion).
-- They prove it is theirs with the same password check value used to sign in. Reports ride the existing
-- request channel (feed_req), encrypted, so no new table is needed.
create or replace function public.login_self_delete(p_uid text, p_vf text)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if p_uid !~ '^[0-9a-f]{64}$' then return false; end if;
  delete from public.logins x
   where x.uid = p_uid and x.vf_hash = encode(sha256(convert_to(coalesce(p_vf,''),'UTF8')),'hex');
  get diagnostics n = row_count;
  return n > 0;
end $$;
grant execute on function public.login_self_delete(text,text) to anon;
