-- Part 52 (4.127.0): roster email.
-- People on the roster can have an email. The email itself stays on the phones (in the encrypted roster). So that
-- "Sign in with Apple / Google" can find a person's roster spot, the owner's phone puts one row per email here:
--   h  = sha256("af-email-v1:" + email in lower case), so the server never stores the address;
--   ct = that person's join details (team feed and roster id), encrypted on the phone with a key made from the email,
--        so only someone who has the address can open it.
-- Only the owner's Word of Mouth leader key can write the list. The list can't be browsed: a row comes back only to a
-- signed-in person whose verified email hashes to it (roster_email_claim). Needs parts 4 (feeds) and 23 (accounts).
-- Safe to re-run.

create table if not exists public.roster_emails (
  feed_id text not null references public.feeds(id) on delete cascade,
  h text not null check (h ~ '^[0-9a-f]{64}$'),
  ct text not null check (char_length(ct) <= 4000),
  updated_at timestamptz not null default now(),
  primary key (feed_id, h)
);
create index if not exists roster_emails_h on public.roster_emails (h);
alter table public.roster_emails enable row level security;
revoke all on public.roster_emails from anon, authenticated;

-- the owner's phone replaces its team's whole list (at most 2000 people)
create or replace function public.roster_email_put(p_feed text, p_leader_key text, p_rows jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not exists (select 1 from public.feeds f where f.id = p_feed
    and f.leader_key_hash = encode(sha256(convert_to(p_leader_key,'UTF8')),'hex')) then raise exception 'not allowed'; end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) > 2000 then raise exception 'bad input'; end if;
  if exists (select 1 from jsonb_array_elements(p_rows) r
    where coalesce(r->>'h','') !~ '^[0-9a-f]{64}$' or char_length(coalesce(r->>'ct','')) not between 1 and 4000) then raise exception 'bad input'; end if;
  delete from public.roster_emails where feed_id = p_feed;
  insert into public.roster_emails(feed_id, h, ct)
    select distinct on (r->>'h') p_feed, r->>'h', r->>'ct' from jsonb_array_elements(p_rows) r;
  get diagnostics n = row_count;
  return n;
end $$;

-- a signed-in person: the roster spots that carry their verified email (from their sign-in, never from the request)
drop function if exists public.roster_email_claim();
create function public.roster_email_claim()
returns table(feed_id text, ct text)
language plpgsql stable security definer set search_path = public as $$
declare em text := public.af_me_email();
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if em is null then return; end if;
  return query select r.feed_id, r.ct from public.roster_emails r
    where r.h = encode(sha256(convert_to('af-email-v1:' || em, 'UTF8')), 'hex')
    order by r.updated_at desc limit 10;
end $$;

revoke all on function public.roster_email_put(text,text,jsonb) from public;
revoke all on function public.roster_email_claim() from public;
grant execute on function public.roster_email_put(text,text,jsonb) to anon, authenticated;
grant execute on function public.roster_email_claim() to authenticated;

notify pgrst, 'reload schema';
