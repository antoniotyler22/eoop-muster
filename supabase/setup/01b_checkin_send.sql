create or replace function public.create_recall(p_id text, p_read_key text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if char_length(p_read_key) < 24 then raise exception 'bad key'; end if;
  delete from public.recalls r where r.expires_at < now();
  insert into public.recalls(id, read_key_hash)
  values (p_id, encode(sha256(convert_to(p_read_key,'UTF8')),'hex'));
end $$;

create or replace function public.checkin(p_recall text, p_words text[], p_code int, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.recalls r where r.id = p_recall and r.expires_at > now())
    then raise exception 'recall closed'; end if;
  if coalesce(array_length(p_words,1),0) not between 1 and 6 then raise exception 'bad name'; end if;
  if (select count(*) from public.checkins c where c.recall_id = p_recall) >= 2000
    then raise exception 'full'; end if;
  insert into public.checkins(recall_id, words, code, note)
  values (p_recall, p_words, p_code, left(coalesce(p_note,''),60));
end $$;
