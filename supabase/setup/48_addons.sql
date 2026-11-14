-- Part 48: paid add-ons (text credits, Event Pass, compliance pack, template kits, branding, site license).
-- One row per thing a team has bought or been granted. A team is identified by a secret token that only its
-- leader's phone holds (the Pro team token when there is one, otherwise a random token the app makes for itself);
-- only the SHA-256 of that token is stored. Stripe and codes both write here, the app only reads (addon_list),
-- redeems a code (addon_redeem) or spends text credits (addon_spend). Safe to re-run.
create table if not exists public.addon_ents (
  id uuid primary key default gen_random_uuid(),
  tok_hash text not null check (tok_hash ~ '^[0-9a-f]{64}$'),
  sku text not null check (sku ~ '^[a-z0-9_]{2,30}$'),
  qty integer not null default 1 check (qty between -100000 and 100000),   -- credits: + bought, - spent
  expires_at timestamptz,                                                   -- null = does not expire
  source text not null default 'stripe' check (source in ('stripe', 'code', 'owner', 'spend')),
  ref text unique check (ref is null or char_length(ref) <= 120),         -- Stripe session id / code hash: a purchase counts once
  created_at timestamptz not null default now()
);
create index if not exists addon_ents_tok_idx on public.addon_ents(tok_hash);
alter table public.addon_ents enable row level security;
revoke all on public.addon_ents from anon, authenticated;

-- Codes the owner hands out (site licenses, trade-show passes, refunds-as-credit). Only the hash of a code is kept.
create table if not exists public.addon_codes (
  code_hash text primary key check (code_hash ~ '^[0-9a-f]{64}$'),
  sku text not null check (sku ~ '^[a-z0-9_]{2,30}$'),
  qty integer not null default 1 check (qty between 1 and 100000),
  days integer check (days is null or days between 1 and 3650),             -- how long it lasts once redeemed (null = forever)
  note text check (note is null or char_length(note) <= 200),
  created_at timestamptz not null default now(),
  used_at timestamptz,
  used_by text check (used_by is null or used_by ~ '^[0-9a-f]{64}$')
);
alter table public.addon_codes enable row level security;
revoke all on public.addon_codes from anon, authenticated;

create or replace function public._addon_th(p_tok text) returns text
language sql immutable as $$ select encode(sha256(convert_to(coalesce(p_tok, ''), 'UTF8')), 'hex') $$;

-- What does this team have? One row per sku: credits are summed (bought minus spent), the rest report the latest end date.
create or replace function public.addon_list(p_tok text)
returns table(sku text, qty bigint, expires_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if p_tok is null or char_length(p_tok) < 32 or char_length(p_tok) > 128 then return; end if;
  return query
    select e.sku, sum(e.qty)::bigint,
           case when bool_or(e.expires_at is null) then null else max(e.expires_at) end
      from public.addon_ents e
     where e.tok_hash = public._addon_th(p_tok)
       and (e.expires_at is null or e.expires_at > now() or e.sku = 'credits')
     group by e.sku
    having e.sku = 'credits' or sum(e.qty) > 0;
end $$;

-- Redeem a code. Works once; the answer is the sku it unlocked.
create or replace function public.addon_redeem(p_tok text, p_code text)
returns text language plpgsql security definer set search_path = public as $$
declare c public.addon_codes; h text := public._addon_th(upper(trim(coalesce(p_code, ''))));
begin
  if p_tok is null or char_length(p_tok) < 32 or char_length(p_tok) > 128 then raise exception 'not allowed'; end if;
  update public.addon_codes set used_at = now(), used_by = public._addon_th(p_tok)
   where code_hash = h and used_at is null returning * into c;
  if c.code_hash is null then raise exception 'That code is not valid or was already used.'; end if;
  insert into public.addon_ents(tok_hash, sku, qty, expires_at, source, ref)
    values (public._addon_th(p_tok), c.sku, c.qty, case when c.days is null then null else now() + make_interval(days => c.days) end, 'code', 'code:' || h);
  return c.sku;
end $$;

-- Spend text credits after the texts went out. Refuses to go below zero.
create or replace function public.addon_spend(p_tok text, p_n integer, p_ref text default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare bal bigint; th text := public._addon_th(p_tok);
begin
  if p_tok is null or char_length(p_tok) < 32 or char_length(p_tok) > 128 then raise exception 'not allowed'; end if;
  if p_n is null or p_n < 1 or p_n > 400 then raise exception 'bad count'; end if;
  perform pg_advisory_xact_lock(hashtext(th));
  select coalesce(sum(qty), 0) into bal from public.addon_ents where tok_hash = th and sku = 'credits';
  if bal < p_n then raise exception 'Not enough text credits.'; end if;
  insert into public.addon_ents(tok_hash, sku, qty, source, ref)
    values (th, 'credits', -p_n, 'spend', case when p_ref is null then null else 'spend:' || th || ':' || left(p_ref, 60) end);
  return bal - p_n;
end $$;

grant execute on function public.addon_list(text), public.addon_redeem(text, text), public.addon_spend(text, integer, text) to anon, authenticated;
revoke all on function public._addon_th(text) from public, anon, authenticated;
