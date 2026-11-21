# Supabase setup parts

Run the parts in the SQL editor in number order. Every part is safe to re-run.

| Rule | Why |
| --- | --- |
| One number, one file. | Two files used to share 52, so "run part 52" was ambiguous. |
| Existing duplicate: `52_roster_email.sql` and `52_status_ping.sql`. Run **both**, roster email first. They touch different tables. | Kept as is because the live database already ran them. `npm test` allows only this one duplicate. |
| 43 (`43_digest.sql`) lives on the unmerged branch `digest-4.87.0`, so there is no 43 in this folder yet. | Skip 43 until that branch merges. |
| End every new part with `insert into public.setup_log(part, note) values ('NN_name', '…') on conflict (part) do nothing;` | From part 58 on, the database records which parts ran. |

To see what has run on the live database: `select * from public.setup_log order by applied_at;`
Test the part on a Supabase **branch** (Dashboard → Branches) before running it on production.
