create table if not exists public.boards (
  id text primary key check (id ~ '^[a-z0-9]{10,20}$'),
  read_key_hash text not null,
  write_key_hash text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz not null default now()
);
create table if not exists public.board_updates (
  id bigint generated always as identity primary key,
  board_id text not null references public.boards(id) on delete cascade,
  sec text not null check (sec ~ '^[A-Z0-9]{1,6}$'),
  sender text[] not null default '{}',
  strength int not null check (strength between 0 and 2000),
  items text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists board_updates_idx on public.board_updates(board_id, id);
alter table public.boards enable row level security;
alter table public.board_updates enable row level security;
revoke all on public.boards, public.board_updates from anon, authenticated;

create or replace function public.create_board(p_id text, p_read_key text, p_write_key text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if char_length(p_read_key) < 24 or char_length(p_write_key) < 24 then raise exception 'bad key'; end if;
  delete from boards where used_at < now() - interval '45 days';
  insert into boards(id, read_key_hash, write_key_hash) values (p_id,
    encode(sha256(convert_to(p_read_key,'UTF8')),'hex'),
    encode(sha256(convert_to(p_write_key,'UTF8')),'hex'));
end $$;

create or replace function public.push_update(p_board text, p_write_key text, p_sec text,
  p_sender text[], p_strength int, p_items text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  update boards set used_at = now()
  where id = p_board and write_key_hash = encode(sha256(convert_to(p_write_key,'UTF8')),'hex');
  if not found then raise exception 'link not valid'; end if;
  if p_sec !~ '^[A-Z0-9]{1,6}$' then raise exception 'bad section'; end if;
  if coalesce(array_length(p_sender,1),0) > 6
    or exists (select 1 from unnest(p_sender) w where w !~ '^[0-9a-f]{16}$') then raise exception 'bad sender'; end if;
  if coalesce(array_length(p_items,1),0) > 400
    or exists (select 1 from unnest(p_items) w where w !~ '^[0-9a-f]{16}:[0-9a-f]{16}:(AOB|AOFF|DUTY|OP|TAD|LV|LD|LIM)$')
    then raise exception 'bad items'; end if;
  delete from board_updates where board_id = p_board and sec = p_sec and id not in
    (select id from board_updates where board_id = p_board and sec = p_sec order by id desc limit 5);
  insert into board_updates(board_id, sec, sender, strength, items)
  values (p_board, p_sec, coalesce(p_sender,'{}'), p_strength, coalesce(p_items,'{}'));
end $$;

create or replace function public.get_board_updates(p_board text, p_read_key text, p_after bigint default 0)
returns table(id bigint, sec text, sender text[], strength int, items text[], created_at timestamptz)
language sql security definer set search_path = public as $$
  update boards set used_at = now()
  where id = p_board and read_key_hash = encode(sha256(convert_to(p_read_key,'UTF8')),'hex');
  select u.id, u.sec, u.sender, u.strength, u.items, u.created_at
  from board_updates u join boards b on b.id = u.board_id
  where b.id = p_board
    and b.read_key_hash = encode(sha256(convert_to(p_read_key,'UTF8')),'hex')
    and u.id > p_after
  order by u.id limit 200;
$$;

create or replace function public.delete_board(p_board text, p_read_key text)
returns void language sql security definer set search_path = public as $$
  delete from boards
  where id = p_board and read_key_hash = encode(sha256(convert_to(p_read_key,'UTF8')),'hex');
$$;

grant execute on function public.create_board(text,text,text),
  public.push_update(text,text,text,text[],int,text[]),
  public.get_board_updates(text,text,bigint),
  public.delete_board(text,text) to anon;
