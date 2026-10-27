# 1.7 setup: live updates, accounts, visitors, teams, contacts

Visitors, Teams and Add from Contacts work as soon as the update is live. Live updates and accounts need a few switches in Supabase.

## 1. Live updates (Realtime)

Nothing to run. Check one switch:

- Supabase → **Project Settings → Realtime** → make sure **public channels are allowed** (if your project shows "Allow public access" or "Private channels only", public access must be on).

When it works, a green **Live** dot shows next to the time in the app header, and check-ins, Feed posts and section updates appear right away. If it's off, the app still refreshes every minute.

Only a hashed channel name and the word "ping" go over Realtime. No names or numbers.

## 2. Accounts (optional sign-in)

1. **SQL:** Supabase → SQL Editor → paste `supabase/setup/23_accounts.sql` → Run. In the app, Tools → Settings → System check should show "1.7: accounts" with a check.
2. **URL:** Authentication → URL Configuration → Site URL `https://antoniotyler22.github.io/eoop-muster/`, and add the same address under Redirect URLs.
3. **Email codes:** Authentication → Sign In / Providers → **Email** on. Then Authentication → Emails → Templates: in **Magic Link** and **Confirm signup**, put the code in the message, for example:
   `Your Accounted For code is {{ .Token }}`
4. **Email sender:** Supabase's built-in email only sends a few emails an hour. Before launch, add your own sender under Authentication → Emails → SMTP Settings (Resend, Postmark, SendGrid or Amazon SES all work).
5. **Text codes (optional):** Authentication → Sign In / Providers → **Phone** on → pick Twilio and paste your Account SID, Auth Token and Messaging Service SID.
6. **Sign in with Apple (optional, web for now):** Authentication → Sign In / Providers → **Apple**, add your Services ID and key from developer.apple.com. Then in `index.html` change `apple:false` to `apple:true`. The iPhone app keeps email and text codes until a native Apple sign-in is added.

App Store: accounts can be deleted from inside the app (Account → Delete my account), as Apple requires.

## 3. Add from Contacts (iPhone and Android app)

Already in this update: the Contacts plugin, and the iPhone permission message ("Pick people from your contacts…"). Run the iPhone build as usual; Apple shows the permission message the first time someone taps From Contacts. On the web, Android Chrome opens the phone's contact picker; iPhone Safari takes a contact card file (.vcf) shared from Contacts.
