-- My page: each member's own info, encrypted on the leader's phone with a key that is only in that member's link.
create table if not exists public.my_pages (
  id text primary key check (id ~ '^[0-9a-f]{24}$'),
  wk_hash text not null,
  ct text not null check (char_length(ct) <= 60000),
  updated_at timestamptz not null default now()
);
alter table public.my_pages enable row level security;
revoke all on public.my_pages from anon, authenticated;

create or replace function public.put_page(p_id text, p_wk text, p_ct text)
returns void language plpgsql security definer set search_path = public as $$
declare h text := encode(sha256(convert_to(p_wk,'UTF8')),'hex');
begin
  if char_length(p_wk) < 32 then raise exception 'bad key'; end if;
  delete from public.my_pages x where x.updated_at < now() - interval '120 days';
  insert into public.my_pages(id, wk_hash, ct) values (p_id, h, p_ct)
  on conflict (id) do update set ct = excluded.ct, updated_at = now() where public.my_pages.wk_hash = excluded.wk_hash;
end $$;

drop function if exists public.get_page(text);
create function public.get_page(p_id text)
returns table(ct text, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select x.ct, x.updated_at from public.my_pages x where x.id = p_id;
$$;

create or replace function public.delete_page(p_id text, p_wk text)
returns void language sql security definer set search_path = public as $$
  delete from public.my_pages x where x.id = p_id and x.wk_hash = encode(sha256(convert_to(p_wk,'UTF8')),'hex');
$$;

grant execute on function public.put_page(text,text,text), public.get_page(text), public.delete_page(text,text) to anon;
