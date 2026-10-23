-- Part 12b: section links check their own key.
create or replace function public.push_update(p_board text, p_write_key text, p_sec text,
  p_sender text[], p_strength int, p_items text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_sec !~ '^[A-Z0-9]{1,6}$' then raise exception 'bad section'; end if;
  if not public.sec_ok(p_board, p_sec, p_write_key) then raise exception 'link not valid'; end if;
  update public.boards b set used_at = now() where b.id = p_board;
  if coalesce(array_length(p_sender,1),0) > 6 then raise exception 'bad sender'; end if;
  if coalesce(array_length(p_items,1),0) > 400 then raise exception 'bad items'; end if;
  delete from public.board_updates u where u.board_id = p_board and u.sec = p_sec and u.id not in
    (select x.id from public.board_updates x where x.board_id = p_board and x.sec = p_sec order by x.id desc limit 5);
  insert into public.board_updates(board_id, sec, sender, strength, items)
  values (p_board, p_sec, coalesce(p_sender,'{}'), p_strength, coalesce(p_items,'{}'));
end $$;

create or replace function public.push_cal(p_board text, p_write_key text, p_sec text, p_ct text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_sec !~ '^[A-Z0-9]{1,6}$' then raise exception 'bad section'; end if;
  if not public.sec_ok(p_board, p_sec, p_write_key) then raise exception 'link not valid'; end if;
  insert into public.board_cal(board_id, sec, ct, updated_at) values (p_board, p_sec, p_ct, now())
  on conflict (board_id, sec) do update set ct = excluded.ct, updated_at = now();
end $$;

drop function if exists public.get_roster(text,text,text);
create function public.get_roster(p_board text, p_write_key text, p_sec text)
returns table(ct text, updated_at timestamptz) language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.sec_ok(p_board, p_sec, p_write_key) then raise exception 'link not valid'; end if;
  return query select r.ct, r.updated_at from public.board_roster r where r.board_id = p_board and r.sec = p_sec;
end $$;

grant execute on function public.set_sec_key(text,text,text,text), public.push_update(text,text,text,text[],int,text[]),
  public.push_cal(text,text,text,text), public.get_roster(text,text,text) to anon;
