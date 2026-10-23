-- Encrypted backup + sync. The phone encrypts everything with a key made from the recovery code before upload.
-- The server stores an unreadable blob, a version number and a time. Without the code no one can read or replace it.
create table if not exists public.backups (
  id text primary key check (id ~ '^[0-9a-f]{20}$'),
  key_hash text not null,
  ct text not null check (char_length(ct) <= 8000000),
  ver bigint not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.backups enable row level security;
revoke all on public.backups from anon, authenticated;

create or replace function public.backup_put(p_id text, p_key text, p_ct text, p_base bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare h text := encode(sha256(convert_to(p_key,'UTF8')),'hex'); cur record; nv bigint;
begin
  if char_length(p_key) < 32 then raise exception 'bad key'; end if;
  if p_ct !~ '^[A-Za-z0-9+/=]+$' then raise exception 'bad data'; end if;
  select * into cur from backups where id = p_id for update;
  if not found then
    insert into backups(id, key_hash, ct) values (p_id, h, p_ct);
    return 1;
  end if;
  if cur.key_hash <> h then raise exception 'not allowed'; end if;
  if p_base is distinct from cur.ver then raise exception 'conflict'; end if;
  update backups set ct = p_ct, ver = cur.ver + 1, updated_at = now() where id = p_id returning ver into nv;
  return nv;
end $$;

create or replace function public.backup_get(p_id text, p_key text)
returns table(ct text, ver bigint, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.ct, b.ver, b.updated_at from backups b
  where b.id = p_id and b.key_hash = encode(sha256(convert_to(p_key,'UTF8')),'hex');
$$;

create or replace function public.backup_ver(p_id text, p_key text)
returns bigint language sql stable security definer set search_path = public as $$
  select b.ver from backups b
  where b.id = p_id and b.key_hash = encode(sha256(convert_to(p_key,'UTF8')),'hex');
$$;

create or replace function public.backup_delete(p_id text, p_key text)
returns void language sql security definer set search_path = public as $$
  delete from backups
  where id = p_id and key_hash = encode(sha256(convert_to(p_key,'UTF8')),'hex');
$$;

grant execute on function public.backup_put(text,text,text,bigint),
  public.backup_get(text,text),
  public.backup_ver(text,text),
  public.backup_delete(text,text) to anon;
