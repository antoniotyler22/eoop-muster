drop function if exists public.get_checkins(text,text,bigint);
create function public.get_checkins(p_recall text, p_read_key text, p_after bigint default 0)
returns table(id bigint, words text[], code smallint, note text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, c.words, c.code, c.note, c.created_at
  from public.checkins c join public.recalls r on r.id = c.recall_id
  where r.id = p_recall
    and r.read_key_hash = encode(sha256(convert_to(p_read_key,'UTF8')),'hex')
    and c.id > p_after
  order by c.id limit 500;
$$;

create or replace function public.close_recall(p_recall text, p_read_key text)
returns void language sql security definer set search_path = public as $$
  delete from public.recalls r
  where r.id = p_recall and r.read_key_hash = encode(sha256(convert_to(p_read_key,'UTF8')),'hex');
$$;

create or replace function public.set_push(p_recall text, p_read_key text, p_sub jsonb)
returns void language sql security definer set search_path = public as $$
  update public.recalls r set push_sub = p_sub
  where r.id = p_recall and r.read_key_hash = encode(sha256(convert_to(p_read_key,'UTF8')),'hex')
    and pg_column_size(p_sub) < 4000;
$$;

grant execute on function public.create_recall(text,text), public.checkin(text,text[],int,text),
  public.get_checkins(text,text,bigint), public.close_recall(text,text),
  public.set_push(text,text,jsonb) to anon;
