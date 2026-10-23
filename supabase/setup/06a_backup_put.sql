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
  select * into cur from public.backups b where b.id = p_id for update;
  if not found then
    insert into public.backups(id, key_hash, ct) values (p_id, h, p_ct);
    return 1;
  end if;
  if cur.key_hash <> h then raise exception 'not allowed'; end if;
  if p_base is distinct from cur.ver then raise exception 'conflict'; end if;
  update public.backups b set ct = p_ct, ver = cur.ver + 1, updated_at = now() where b.id = p_id returning b.ver into nv;
  return nv;
end $$;
