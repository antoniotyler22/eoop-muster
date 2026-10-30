-- Part 35: give the server functions (notify, hub, owner) their table rights back.
-- They run as service_role. If that role loses SELECT/INSERT/UPDATE/DELETE on the public tables, every push fails:
-- the alert code can't read the board, feed or phone list, and (before notify 4.30.0) answered "no sub".
-- This restores the standard Supabase rights for service_role ONLY. anon and authenticated stay locked out.
-- Run it any time the System check says "The server can't read its own tables". Safe to re-run.
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
alter default privileges for role postgres in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges for role postgres in schema public grant usage, select on sequences to service_role;
notify pgrst, 'reload schema';
