-- Part 51: live status. Every phone on a board sends a status change straight to the server and every other phone
-- picks it up, so nothing depends on the OIC's phone being open. One encrypted row per person (the server sees
-- a hashed person id, the section code and unreadable text, never a name or a status). Safe to re-run.
create sequence if not exists public.board_status_seq;
create table if not exists public.board_status (
  board_id text not null references public.boards(id) on delete cascade,
  pid text not null check (pid ~ '^[0-9a-f]{16}$'),
  sec text not null check (sec ~ '^[A-Z0-9]{1,6}$'),
  ct text not null check (char_length(ct) <= 2000),
  t bigint not null,
  seq bigint not null default nextval('public.board_status_seq'),
  primary key (board_id, pid)
);
create index if not exists board_status_seq_idx on public.board_status (board_id, seq);
alter table public.board_status enable row level security;
revoke all on public.board_status from anon, authenticated;

-- Reading: the board's read key, its link key, or any section key for that board.
create or replace function public.status_read_ok(p_board text, p_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.boards b where b.id = p_board
      and encode(sha256(convert_to(p_key,'UTF8')),'hex') in (b.read_key_hash, b.write_key_hash))
    or exists (select 1 from public.board_sec_keys k where k.board_id = p_board
      and k.key_hash = encode(sha256(convert_to(p_key,'UTF8')),'hex'));
$$;
revoke execute on function public.status_read_ok(text,text) from public, anon, authenticated;

-- Writing: the board's read key (the OIC and access phones) may write any section; a section link only its own.
-- p_items: [{"p":"<16 hex>","s":"UT","c":"<sealed text>","t":<ms>}]. A row is only replaced by a newer or equal t.
create or replace function public.put_status(p_board text, p_key text, p_sec text, p_items jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare owner boolean; x jsonb; n int := 0; s text;
begin
  owner := exists (select 1 from public.boards b where b.id = p_board
    and b.read_key_hash = encode(sha256(convert_to(p_key,'UTF8')),'hex'));
  if not owner and not public.sec_ok(p_board, p_sec, p_key) then raise exception 'link not valid'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 400 then raise exception 'bad items'; end if;
  update public.boards b set used_at = now() where b.id = p_board;
  for x in select * from jsonb_array_elements(p_items) loop
    s := x->>'s';
    if s is null or s !~ '^[A-Z0-9]{1,6}$' or (x->>'p') !~ '^[0-9a-f]{16}$' then continue; end if;
    if not owner and s <> p_sec then continue; end if;
    insert into public.board_status(board_id, pid, sec, ct, t)
      values (p_board, x->>'p', s, x->>'c', (x->>'t')::bigint)
    on conflict (board_id, pid) do update
      set sec = excluded.sec, ct = excluded.ct, t = excluded.t, seq = nextval('public.board_status_seq')
      where excluded.t >= public.board_status.t;
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.get_status(p_board text, p_key text, p_after bigint default 0)
returns table(pid text, sec text, ct text, t bigint, seq bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not public.status_read_ok(p_board, p_key) then raise exception 'link not valid'; end if;
  return query select s.pid, s.sec, s.ct, s.t, s.seq from public.board_status s
    where s.board_id = p_board and s.seq > p_after order by s.seq limit 1000;
end $$;

grant execute on function public.put_status(text,text,text,jsonb), public.get_status(text,text,bigint) to anon;
