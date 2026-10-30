-- My page check-in: every member with a page can check in, even when the leader has no Feed yet.
-- The member seals the check-in with their page key (only in their link) and drops it on their page's id.
-- Only the leader's page write key (p_wk, the one put_page uses) can read it back. One call reads every page.
create table if not exists public.page_reqs (
  id bigint generated always as identity primary key,
  page_id text not null references public.my_pages(id) on delete cascade,
  ct text not null check (char_length(ct) <= 3000),
  created_at timestamptz not null default now()
);
create index if not exists page_reqs_idx on public.page_reqs(page_id, id);
alter table public.page_reqs enable row level security;
revoke all on public.page_reqs from anon, authenticated;

create or replace function public.page_req(p_id text, p_ct text)
returns bigint language plpgsql security definer set search_path = public as $$
declare new_id bigint;
begin
  if not exists (select 1 from public.my_pages x where x.id = p_id) then raise exception 'no page'; end if;
  if (select count(*) from public.page_reqs r where r.page_id = p_id and r.created_at > now() - interval '1 day') >= 100
    then raise exception 'too many check-ins today'; end if;
  delete from public.page_reqs r where r.page_id = p_id and r.created_at < now() - interval '60 days';
  insert into public.page_reqs(page_id, ct) values (p_id, p_ct) returning id into new_id;
  return new_id;
end $$;

drop function if exists public.page_reqs_get(text[],text[],bigint);
create function public.page_reqs_get(p_ids text[], p_wks text[], p_after bigint default 0)
returns table(id bigint, page_id text, ct text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, r.page_id, r.ct, r.created_at
  from unnest(p_ids, p_wks) with ordinality as k(pid, wk, n)
  join public.my_pages x on x.id = k.pid and x.wk_hash = encode(sha256(convert_to(k.wk,'UTF8')),'hex')
  join public.page_reqs r on r.page_id = x.id
  where r.id > p_after
  order by r.id limit 500;
$$;

grant execute on function public.page_req(text,text), public.page_reqs_get(text[],text[],bigint) to anon;
