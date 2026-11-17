-- Part 50 (4.123.0): a leader vouches for a person ("Verified by SGT Ruiz, Mon 16 Nov"), and can revoke it.
-- The app keeps the vouch on the person (so it works offline and syncs with the roster). This table is the server copy:
-- it survives a lost phone and lets a new phone restore the vouches. Keyed by the leader's team key (hashed), like org_verify.
-- Nothing here is readable by the public; the three functions below are the only way in, and each needs the team key.
-- To see them (owner, in the SQL editor):  select mid, by_name, at, revoked_at from public.person_vouches where tok_hash = '...';
create table if not exists public.person_vouches (
  tok_hash text not null check (tok_hash ~ '^[0-9a-f]{64}$'),
  mid text not null check (char_length(mid) between 1 and 64),
  by_name text not null check (char_length(by_name) between 1 and 30),
  at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (tok_hash, mid)
);
alter table public.person_vouches enable row level security;
revoke all on public.person_vouches from anon, authenticated;

create or replace function public._pv_hash(p_tok text) returns text
language plpgsql immutable security definer set search_path = public as $$
begin
  if p_tok is null or char_length(p_tok) < 32 or char_length(p_tok) > 128 then raise exception 'not allowed'; end if;
  return encode(sha256(convert_to(p_tok, 'UTF8')), 'hex');
end $$;
revoke all on function public._pv_hash(text) from public, anon, authenticated;

-- Vouch for a person. p_at is the phone's time in milliseconds; a time far from now is replaced by now().
create or replace function public.vouch_set(p_tok text, p_mid text, p_by text, p_at bigint) returns void
language plpgsql security definer set search_path = public as $$
declare th text := public._pv_hash(p_tok); t timestamptz := to_timestamp(coalesce(p_at, 0) / 1000.0); b text := left(btrim(coalesce(p_by, '')), 30);
begin
  if p_mid is null or char_length(p_mid) not between 1 and 64 or char_length(b) < 1 then raise exception 'not allowed'; end if;
  if t < now() - interval '1 day' or t > now() + interval '1 day' then t := now(); end if;
  insert into public.person_vouches(tok_hash, mid, by_name, at, revoked_at) values (th, p_mid, b, t, null)
    on conflict (tok_hash, mid) do update set by_name = excluded.by_name, at = excluded.at, revoked_at = null;
end $$;

-- Revoke a vouch. The row stays (with revoked_at) as a record; it just stops being listed.
create or replace function public.vouch_clear(p_tok text, p_mid text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.person_vouches set revoked_at = now() where tok_hash = public._pv_hash(p_tok) and mid = p_mid and revoked_at is null;
end $$;

-- The leader's current vouches (a new phone calls this to restore them).
create or replace function public.vouch_list(p_tok text) returns table(mid text, by_name text, at bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  return query select v.mid, v.by_name, (extract(epoch from v.at) * 1000)::bigint
    from public.person_vouches v where v.tok_hash = public._pv_hash(p_tok) and v.revoked_at is null order by v.at desc limit 700;
end $$;

grant execute on function public.vouch_set(text, text, text, bigint), public.vouch_clear(text, text), public.vouch_list(text) to anon, authenticated;
