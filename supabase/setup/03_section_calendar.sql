-- Section leaders share their people's calendar with the OIC's board. Encrypted on the phone with a key that
-- only travels in the board link; the server stores unreadable text per section.
create table if not exists public.board_cal (
  board_id text not null references public.boards(id) on delete cascade,
  sec text not null check (sec ~ '^[A-Z0-9]{1,6}$'),
  ct text not null check (char_length(ct) <= 200000),
  updated_at timestamptz not null default now(),
  primary key (board_id, sec)
);
alter table public.board_cal enable row level security;
revoke all on public.board_cal from anon, authenticated;

create or replace function public.push_cal(p_board text, p_write_key text, p_sec text, p_ct text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.boards b where b.id = p_board
    and b.write_key_hash = encode(sha256(convert_to(p_write_key,'UTF8')),'hex')) then raise exception 'link not valid'; end if;
  if p_sec !~ '^[A-Z0-9]{1,6}$' then raise exception 'bad section'; end if;
  insert into public.board_cal(board_id, sec, ct, updated_at) values (p_board, p_sec, p_ct, now())
  on conflict (board_id, sec) do update set ct = excluded.ct, updated_at = now();
end $$;

drop function if exists public.get_cal(text,text);
create function public.get_cal(p_board text, p_read_key text)
returns table(sec text, ct text, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.sec, c.ct, c.updated_at from public.board_cal c join public.boards b on b.id = c.board_id
  where b.id = p_board and b.read_key_hash = encode(sha256(convert_to(p_read_key,'UTF8')),'hex');
$$;

grant execute on function public.push_cal(text,text,text,text), public.get_cal(text,text) to anon;
