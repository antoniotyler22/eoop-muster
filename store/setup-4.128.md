# Server steps for 4.126 – 4.128

Do these before (or right after) the app update goes out. Each SQL part is safe to re-run.

1. **Supabase → SQL editor**, run in order: `supabase/setup/52_roster_email.sql`, `53_join.sql`, `54_messages.sql`, `55_cal_scopes.sql`.
   The app's System check lists each one if it's missing.
2. **Edge Functions**: redeploy `notify` (per-type alert choices, quiet delivery), `sms` and `billing` (accept accountedforteam.com links).
3. **Authentication → Sign In / Providers**: turn on **Apple** and **Google**. Under **URL Configuration → Redirect URLs** add
   `https://accountedforteam.com/app.html` and `accountedfor://auth` (the iPhone app comes back through that one).
   To hide a sign-in button until its provider is ready, set `apple:false` or `google:false` in `app.html` (`window.SB`).
4. **Apple developer portal**: the App ID needs **Associated Domains** on. After the site deploys, check
   https://accountedforteam.com/.well-known/apple-app-site-association shows the JSON.
5. No push alerts were added in 4.127 or 4.128. Team chat sends stop once part 54 runs; Official channel posts are untouched.

What the server can and can't see (for the privacy answers): join codes are stored as hashes; roster emails as salted
hashes; join requests, 1:1 messages and section calendar events as ciphertext sealed with keys the server never gets.
The server checks those keys before returning anything, so another section, a third person or the owner can't fetch them.
