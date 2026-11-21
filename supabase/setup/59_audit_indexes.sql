-- 59: audit cleanup (Nov 21, 2026). Covers two foreign keys the Supabase linter flagged and gives join_misses a primary key.
-- Safe to run twice.
create index if not exists feed_acks_post_id_idx on public.feed_acks (post_id);
create index if not exists hub_jobs_ent_id_idx on public.hub_jobs (ent_id);
alter table public.join_misses add column if not exists id bigint generated always as identity;
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.join_misses'::regclass and contype = 'p') then
    alter table public.join_misses add primary key (id);
  end if;
end $$;
insert into public.setup_log(part, note) values ('59_audit_indexes', 'feed_acks and hub_jobs FK indexes, join_misses primary key') on conflict (part) do nothing;
