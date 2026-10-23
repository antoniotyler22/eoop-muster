drop function if exists public.get_board_updates(text,text,bigint);
create function public.get_board_updates(p_board text, p_read_key text, p_after bigint default 0)
returns table(id bigint, sec text, sender text[], strength int, items text[], created_at timestamptz)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  update public.boards b set used_at = now()
  where b.id = p_board and b.read_key_hash = encode(sha256(convert_to(p_read_key,'UTF8')),'hex');
  return query
    select u.id, u.sec, u.sender, u.strength, u.items, u.created_at
    from public.board_updates u join public.boards b on b.id = u.board_id
    where b.id = p_board
      and b.read_key_hash = encode(sha256(convert_to(p_read_key,'UTF8')),'hex')
      and u.id > p_after
    order by u.id limit 200;
end $$;

create or replace function public.delete_board(p_board text, p_read_key text)
returns void language sql security definer set search_path = public as $$
  delete from public.boards b
  where b.id = p_board and b.read_key_hash = encode(sha256(convert_to(p_read_key,'UTF8')),'hex');
$$;

create or replace function public.set_board_push(p_board text, p_read_key text, p_sub jsonb)
returns void language sql security definer set search_path = public as $$
  update public.boards b set push_sub = p_sub
  where b.id = p_board
    and b.read_key_hash = encode(sha256(convert_to(p_read_key,'UTF8')),'hex')
    and pg_column_size(p_sub) < 4000;
$$;

grant execute on function public.create_board(text,text,text),
  public.push_update(text,text,text,text[],int,text[]),
  public.get_board_updates(text,text,bigint),
  public.delete_board(text,text),
  public.set_board_push(text,text,jsonb) to anon;
