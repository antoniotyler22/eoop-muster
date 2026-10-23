create or replace function public.create_board(p_id text, p_read_key text, p_write_key text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if char_length(p_read_key) < 24 or char_length(p_write_key) < 24 then raise exception 'bad key'; end if;
  delete from public.boards b where b.used_at < now() - interval '45 days';
  insert into public.boards(id, read_key_hash, write_key_hash) values (p_id,
    encode(sha256(convert_to(p_read_key,'UTF8')),'hex'),
    encode(sha256(convert_to(p_write_key,'UTF8')),'hex'));
end $$;

create or replace function public.push_update(p_board text, p_write_key text, p_sec text,
  p_sender text[], p_strength int, p_items text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.boards b set used_at = now()
  where b.id = p_board and b.write_key_hash = encode(sha256(convert_to(p_write_key,'UTF8')),'hex');
  if not found then raise exception 'link not valid'; end if;
  if p_sec !~ '^[A-Z0-9]{1,6}$' then raise exception 'bad section'; end if;
  if coalesce(array_length(p_sender,1),0) > 6 then raise exception 'bad sender'; end if;
  if coalesce(array_length(p_items,1),0) > 400 then raise exception 'bad items'; end if;
  delete from public.board_updates u where u.board_id = p_board and u.sec = p_sec and u.id not in
    (select x.id from public.board_updates x where x.board_id = p_board and x.sec = p_sec order by x.id desc limit 5);
  insert into public.board_updates(board_id, sec, sender, strength, items)
  values (p_board, p_sec, coalesce(p_sender,'{}'), p_strength, coalesce(p_items,'{}'));
end $$;
