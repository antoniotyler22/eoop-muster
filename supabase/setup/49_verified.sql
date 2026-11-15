-- Part 49 (4.117.0): free "Verified leader" levels, so people know who they are giving their number to.
--   Level 1  Contact confirmed: the leader signed in with an emailed/texted code (Supabase Auth) and linked it to their team key.
--   Level 2  Organization confirmed: the leader sent an organization name, website and role, and the app owner approved it.
-- No ID is collected here. A member's check-in page asks recall_badge_get(recall) which level that recall's leader holds.
-- To approve (owner, in the SQL editor):  update public.org_verify set status = 'approved', reviewed_at = now() where tok_hash = '...';
-- Pending requests:                        select org_name, org_site, org_role, contact, tok_hash from public.org_verify where status = 'pending';
create table if not exists public.org_verify (
  tok_hash text primary key check (tok_hash ~ '^[0-9a-f]{64}$'),
  contact text check (contact is null or char_length(contact) <= 80),
  contact_at timestamptz,
  org_name text check (org_name is null or char_length(org_name) <= 60),
  org_site text check (org_site is null or char_length(org_site) <= 120),
  org_role text check (org_role is null or char_length(org_role) <= 60),
  status text not null default 'none' check (status in ('none', 'pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.org_verify enable row level security;
revoke all on public.org_verify from anon, authenticated;

create table if not exists public.recall_badges (
  recall_id text primary key references public.recalls(id) on delete cascade,
  tok_hash text not null check (tok_hash ~ '^[0-9a-f]{64}$')
);
alter table public.recall_badges enable row level security;
revoke all on public.recall_badges from anon, authenticated;

-- level 0 none, 1 contact confirmed, 2 organization confirmed
create or replace function public._vf_level(p_th text) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select case when v.contact_at is null then 0 when v.status = 'approved' then 2 else 1 end
                     from public.org_verify v where v.tok_hash = p_th), 0) $$;
revoke all on function public._vf_level(text) from public, anon, authenticated;

-- Signed-in only: the leader's confirmed email or phone is taken from their sign-in, never from the app.
create or replace function public.verify_contact(p_tok text) returns int
language plpgsql security definer set search_path = public as $$
declare em text := lower(coalesce(auth.jwt() ->> 'email', '')); ph text := regexp_replace(coalesce(auth.jwt() ->> 'phone', ''), '\D', '', 'g'); m text; th text;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if p_tok is null or char_length(p_tok) < 32 or char_length(p_tok) > 128 then raise exception 'not allowed'; end if;
  if em <> '' then m := left(em, 1) || '***@' || split_part(em, '@', 2);
  elsif char_length(ph) >= 6 then m := '***' || right(ph, 3);
  else raise exception 'Sign in with an email or phone code first.'; end if;
  th := encode(sha256(convert_to(p_tok, 'UTF8')), 'hex');
  insert into public.org_verify(tok_hash, contact, contact_at) values (th, m, now())
    on conflict (tok_hash) do update set contact = excluded.contact, contact_at = now();
  return public._vf_level(th);
end $$;

-- Signed-in only, and only after the contact is confirmed. Needs the owner's approval to reach level 2.
create or replace function public.verify_org(p_tok text, p_name text, p_site text, p_role text) returns text
language plpgsql security definer set search_path = public as $$
declare th text; n text := btrim(coalesce(p_name, '')); s text := btrim(coalesce(p_site, '')); r text := btrim(coalesce(p_role, '')); cur public.org_verify;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if p_tok is null or char_length(p_tok) < 32 or char_length(p_tok) > 128 then raise exception 'not allowed'; end if;
  if char_length(n) not between 2 and 60 or char_length(r) not between 2 and 60 then raise exception 'Add the organization name and your role.'; end if;
  if s !~* '^https?://[^ ]+\.[^ ]+$' or char_length(s) > 120 then raise exception 'Add the website, starting with https://'; end if;
  th := encode(sha256(convert_to(p_tok, 'UTF8')), 'hex');
  select * into cur from public.org_verify where tok_hash = th;
  if cur.tok_hash is null or cur.contact_at is null then raise exception 'Confirm your contact first.'; end if;
  if cur.status = 'approved' and cur.org_name = n and cur.org_site = s then return 'approved'; end if;
  update public.org_verify set org_name = n, org_site = s, org_role = r, status = 'pending', reviewed_at = null where tok_hash = th;
  return 'pending';
end $$;

create or replace function public.verify_status(p_tok text)
returns table(level int, status text, org_name text, contact text)
language plpgsql stable security definer set search_path = public as $$
declare th text;
begin
  if p_tok is null or char_length(p_tok) < 32 or char_length(p_tok) > 128 then return; end if;
  th := encode(sha256(convert_to(p_tok, 'UTF8')), 'hex');
  return query select public._vf_level(th), v.status, v.org_name, v.contact from public.org_verify v where v.tok_hash = th;
end $$;

-- The leader's phone ties its team key to a recall it started (it must hold the recall's read key).
create or replace function public.recall_badge_set(p_recall text, p_read_key text, p_tok text) returns int
language plpgsql security definer set search_path = public as $$
declare th text;
begin
  if p_tok is null or char_length(p_tok) < 32 or char_length(p_tok) > 128 then raise exception 'not allowed'; end if;
  if not exists (select 1 from public.recalls r where r.id = p_recall and r.expires_at > now()
                  and r.read_key_hash = encode(sha256(convert_to(coalesce(p_read_key, ''), 'UTF8')), 'hex')) then raise exception 'recall closed'; end if;
  th := encode(sha256(convert_to(p_tok, 'UTF8')), 'hex');
  if public._vf_level(th) < 1 then return 0; end if;
  insert into public.recall_badges(recall_id, tok_hash) values (p_recall, th)
    on conflict (recall_id) do update set tok_hash = excluded.tok_hash;
  return public._vf_level(th);
end $$;

-- What a member's check-in page shows: the level, and the organization name only at level 2.
create or replace function public.recall_badge_get(p_recall text) returns table(level int, org text)
language sql stable security definer set search_path = public as $$
  select public._vf_level(b.tok_hash), case when public._vf_level(b.tok_hash) = 2 then v.org_name end
    from public.recall_badges b join public.org_verify v on v.tok_hash = b.tok_hash
   where b.recall_id = p_recall and public._vf_level(b.tok_hash) >= 1 $$;

grant execute on function public.verify_contact(text), public.verify_org(text, text, text, text) to authenticated;
revoke execute on function public.verify_contact(text), public.verify_org(text, text, text, text) from anon, public;
grant execute on function public.verify_status(text), public.recall_badge_set(text, text, text), public.recall_badge_get(text) to anon, authenticated;
