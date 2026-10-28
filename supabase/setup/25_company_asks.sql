-- Part 25: company command questions and asks. Safe to re-run.
-- Command phones (CO, XO, 1stSgt: the company view key) each write one notes row (unit starting "cmd").
-- Platoon reporting phones (the write key) read only those notes rows, to see asks sent to them.
-- Notes are encrypted on the phones with the company key; the server can't read them.

-- platoon phones can't write a command row
create or replace function public.put_unit(p_company text, p_write_key text, p_unit text, p_ct text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_unit like 'cmd%' then raise exception 'bad unit'; end if;
  update public.companies c set used_at = now()
  where c.id = p_company and c.write_key_hash = encode(sha256(convert_to(p_write_key,'UTF8')),'hex');
  if not found then raise exception 'link not valid'; end if;
  if (select count(*) from public.company_units u where u.company_id = p_company and u.unit <> p_unit) >= 30 then raise exception 'too many units'; end if;
  insert into public.company_units(company_id, unit, ct, updated_at) values (p_company, p_unit, p_ct, now())
  on conflict (company_id, unit) do update set ct = excluded.ct, updated_at = now();
end $$;

create or replace function public.put_cmd(p_company text, p_read_key text, p_unit text, p_ct text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_unit !~ '^cmd[a-z0-9]{6,17}$' then raise exception 'bad unit'; end if;
  if char_length(p_ct) > 200000 then raise exception 'too big'; end if;
  update public.companies c set used_at = now()
  where c.id = p_company and c.read_key_hash = encode(sha256(convert_to(p_read_key,'UTF8')),'hex');
  if not found then raise exception 'link not valid'; end if;
  if (select count(*) from public.company_units u where u.company_id = p_company and u.unit <> p_unit and u.unit like 'cmd%') >= 10 then raise exception 'too many command phones'; end if;
  insert into public.company_units(company_id, unit, ct, updated_at) values (p_company, p_unit, p_ct, now())
  on conflict (company_id, unit) do update set ct = excluded.ct, updated_at = now();
end $$;

create or replace function public.get_cmd(p_company text, p_write_key text)
returns table(unit text, ct text, updated_at timestamptz) language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not exists (select 1 from public.companies c where c.id = p_company
    and c.write_key_hash = encode(sha256(convert_to(p_write_key,'UTF8')),'hex')) then raise exception 'link not valid'; end if;
  return query select u.unit, u.ct, u.updated_at from public.company_units u
    where u.company_id = p_company and u.unit like 'cmd%' order by u.unit;
end $$;

grant execute on function public.put_unit(text,text,text,text), public.put_cmd(text,text,text,text), public.get_cmd(text,text) to anon;
