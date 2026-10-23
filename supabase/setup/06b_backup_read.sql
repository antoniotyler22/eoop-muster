drop function if exists public.backup_get(text,text);
create function public.backup_get(p_id text, p_key text)
returns table(ct text, ver bigint, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.ct, b.ver, b.updated_at from public.backups b
  where b.id = p_id and b.key_hash = encode(sha256(convert_to(p_key,'UTF8')),'hex');
$$;

create or replace function public.backup_ver(p_id text, p_key text)
returns bigint language sql stable security definer set search_path = public as $$
  select b.ver from public.backups b
  where b.id = p_id and b.key_hash = encode(sha256(convert_to(p_key,'UTF8')),'hex');
$$;

create or replace function public.backup_delete(p_id text, p_key text)
returns void language sql security definer set search_path = public as $$
  delete from public.backups b
  where b.id = p_id and b.key_hash = encode(sha256(convert_to(p_key,'UTF8')),'hex');
$$;

grant execute on function public.backup_put(text,text,text,bigint), public.backup_get(text,text),
  public.backup_ver(text,text), public.backup_delete(text,text) to anon;
