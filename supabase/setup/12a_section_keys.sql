-- Each section can get its own link key, so the OIC can replace one section leader's link without touching the others.
create table if not exists public.board_sec_keys (
  board_id text not null references public.boards(id) on delete cascade,
  sec text not null check (sec ~ '^[A-Z0-9]{1,6}$'),
  key_hash text not null,
  primary key (board_id, sec)
);
alter table public.board_sec_keys enable row level security;
revoke all on public.board_sec_keys from anon, authenticated;

create or replace function public.sec_ok(p_board text, p_sec text, p_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select case when exists (select 1 from public.board_sec_keys k where k.board_id = p_board and k.sec = p_sec)
    then exists (select 1 from public.board_sec_keys k where k.board_id = p_board and k.sec = p_sec
      and k.key_hash = encode(sha256(convert_to(p_key,'UTF8')),'hex'))
    else exists (select 1 from public.boards b where b.id = p_board
      and b.write_key_hash = encode(sha256(convert_to(p_key,'UTF8')),'hex')) end;
$$;
revoke execute on function public.sec_ok(text,text,text) from public, anon, authenticated;

create or replace function public.set_sec_key(p_board text, p_read_key text, p_sec text, p_key text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.boards b where b.id = p_board
    and b.read_key_hash = encode(sha256(convert_to(p_read_key,'UTF8')),'hex')) then raise exception 'not allowed'; end if;
  if p_sec !~ '^[A-Z0-9]{1,6}$' or char_length(p_key) < 24 then raise exception 'bad input'; end if;
  insert into public.board_sec_keys(board_id, sec, key_hash) values (p_board, p_sec, encode(sha256(convert_to(p_key,'UTF8')),'hex'))
  on conflict (board_id, sec) do update set key_hash = excluded.key_hash;
end $$;

grant execute on function public.set_sec_key(text,text,text,text) to anon;
