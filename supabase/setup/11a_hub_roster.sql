create table if not exists public.board_roster (
  board_id text not null references public.boards(id) on delete cascade,
  sec text not null check (sec ~ '^[A-Z0-9]{1,6}$'),
  ct text not null check (char_length(ct) <= 150000),
  updated_at timestamptz not null default now(),
  primary key (board_id, sec)
);
alter table public.board_roster enable row level security;
revoke all on public.board_roster from anon, authenticated;

create or replace function public.put_roster(p_board text, p_read_key text, p_sec text, p_ct text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.boards b where b.id = p_board
    and b.read_key_hash = encode(sha256(convert_to(p_read_key,'UTF8')),'hex')) then raise exception 'not allowed'; end if;
  if p_sec !~ '^[A-Z0-9]{1,6}$' then raise exception 'bad section'; end if;
  insert into public.board_roster(board_id, sec, ct, updated_at) values (p_board, p_sec, p_ct, now())
  on conflict (board_id, sec) do update set ct = excluded.ct, updated_at = now();
end $$;

create or replace function public.get_roster(p_board text, p_write_key text, p_sec text)
returns table(ct text, updated_at timestamptz) language sql security definer set search_path = public as $$
  select r.ct, r.updated_at from public.board_roster r join public.boards b on b.id = r.board_id
  where b.id = p_board and r.sec = p_sec
    and b.write_key_hash = encode(sha256(convert_to(p_write_key,'UTF8')),'hex');
$$;

grant execute on function public.put_roster(text,text,text,text), public.get_roster(text,text,text) to anon;
