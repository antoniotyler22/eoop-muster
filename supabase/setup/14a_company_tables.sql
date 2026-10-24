-- Company view: platoon OIC phones report their whole roster (encrypted on the phone) to one company board.
-- Only people holding the company viewer link can read it; the server can't.
create table if not exists public.companies (
  id text primary key check (id ~ '^[a-z0-9]{10,20}$'),
  read_key_hash text not null,
  write_key_hash text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz not null default now()
);
create table if not exists public.company_units (
  company_id text not null references public.companies(id) on delete cascade,
  unit text not null check (unit ~ '^[a-z0-9]{6,20}$'),
  ct text not null check (char_length(ct) <= 400000),
  updated_at timestamptz not null default now(),
  primary key (company_id, unit)
);
alter table public.companies enable row level security;
alter table public.company_units enable row level security;
revoke all on public.companies, public.company_units from anon, authenticated;

create or replace function public.create_company(p_id text, p_read_key text, p_write_key text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if char_length(p_read_key) < 24 or char_length(p_write_key) < 24 then raise exception 'bad key'; end if;
  delete from public.companies c where c.used_at < now() - interval '90 days';
  insert into public.companies(id, read_key_hash, write_key_hash) values (p_id,
    encode(sha256(convert_to(p_read_key,'UTF8')),'hex'), encode(sha256(convert_to(p_write_key,'UTF8')),'hex'));
end $$;

grant execute on function public.create_company(text,text,text) to anon;
