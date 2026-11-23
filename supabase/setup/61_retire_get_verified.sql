-- Part 61 (4.142.0): retire the self-service "Get verified" path. Verification is now leader-controlled, person by person (part 50).
-- The functions stay (so this can be undone), but nobody can call them any more:
--   to undo:  grant execute on function public.verify_contact(text) to authenticated;
--             grant execute on function public.verify_org(text, text, text, text) to authenticated;
-- Not touched: verify_status, recall_badge_set, recall_badge_get (badges already earned keep showing) and vouch_set / vouch_clear / vouch_list.
revoke execute on function public.verify_contact(text) from public, anon, authenticated;
revoke execute on function public.verify_org(text, text, text, text) from public, anon, authenticated;

insert into public.setup_log(part, note) values ('61_retire_get_verified', 'verify_contact and verify_org no longer callable; leader vouching is the only way to verify') on conflict (part) do nothing;
