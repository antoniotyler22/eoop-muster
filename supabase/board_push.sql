alter table public.boards add column if not exists push_sub jsonb;
alter table public.boards add column if not exists last_push_id bigint not null default 0;
alter table public.boards add column if not exists last_push_at timestamptz;

create or replace function public.set_board_push(p_board text, p_read_key text, p_sub jsonb)
returns void language sql security definer set search_path = public as $$
  update boards set push_sub = p_sub
  where id = p_board
    and read_key_hash = encode(sha256(convert_to(p_read_key,'UTF8')),'hex')
    and pg_column_size(p_sub) < 4000;
$$;

grant execute on function public.set_board_push(text,text,jsonb) to anon;
