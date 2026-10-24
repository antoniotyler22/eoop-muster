-- Part 14b: platoons report in, company viewers read.
create or replace function public.put_unit(p_company text, p_write_key text, p_unit text, p_ct text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.companies c set used_at = now()
  where c.id = p_company and c.write_key_hash = encode(sha256(convert_to(p_write_key,'UTF8')),'hex');
  if not found then raise exception 'link not valid'; end if;
  if (select count(*) from public.company_units u where u.company_id = p_company and u.unit <> p_unit) >= 30 then raise exception 'too many units'; end if;
  insert into public.company_units(company_id, unit, ct, updated_at) values (p_company, p_unit, p_ct, now())
  on conflict (company_id, unit) do update set ct = excluded.ct, updated_at = now();
end $$;

create or replace function public.get_units(p_company text, p_read_key text)
returns table(unit text, ct text, updated_at timestamptz) language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  update public.companies c set used_at = now()
  where c.id = p_company and c.read_key_hash = encode(sha256(convert_to(p_read_key,'UTF8')),'hex');
  if not found then raise exception 'link not valid'; end if;
  return query select u.unit, u.ct, u.updated_at from public.company_units u where u.company_id = p_company order by u.unit;
end $$;

create or replace function public.drop_unit(p_company text, p_read_key text, p_unit text)
returns void language sql security definer set search_path = public as $$
  delete from public.company_units u using public.companies c
  where u.company_id = c.id and c.id = p_company and u.unit = p_unit
    and c.read_key_hash = encode(sha256(convert_to(p_read_key,'UTF8')),'hex');
$$;

grant execute on function public.put_unit(text,text,text,text),
  public.get_units(text,text), public.drop_unit(text,text,text) to anon;
