# Server setup for 1.3

Do these once, in order. Everything is safe to re-run. The app's **Tools → System check** shows what's still missing.

## 1. SQL (Supabase → SQL Editor → New query → paste → Run)
| Part | File | What it does |
|---|---|---|
| 20 | `supabase/setup/20_pro.sql` | Pro checked on the server (needs parts 4 and 10; re-run after part 18 if you turn on the hub later) |
| 21 | `supabase/setup/21_crash_reports.sql` | Crash reports (no personal data) |
| 22 | `supabase/setup/22_escalate.sql` | Missed check-in alerts (turn on **pg_cron** and **pg_net** in Database → Extensions first) |

See crash reports any time: `select * from public.crash_summary;`

## 2. Edge Functions (Supabase → Edge Functions)
Deploy each from its `index.ts`, with **Enforce JWT verification turned OFF**:

| Function | File | Needed for |
|---|---|---|
| `pro` | `supabase/functions/pro/index.ts` | Pro on the server (required before 1.3 ships) |
| `ask` | `supabase/functions/ask/index.ts` | Redeploy: Ask now needs Pro |
| `hub` | `supabase/functions/hub/index.ts` | Redeploy: server hub now needs Pro |
| `notify` | `supabase/functions/notify/index.ts` | Redeploy: missed check-in alerts |
| `relay` | `supabase/functions/relay/index.ts` | Slack / Teams / Discord posting |
| `billing` | `supabase/functions/billing/index.ts` | Optional: Pro on the web (Stripe) |
| `sms` | `supabase/functions/sms/index.ts` | Optional: text everyone from the server (Twilio) |

**Timing:** the Pro checks in `ask` and `hub` are off by default, so nothing changes for anyone when you deploy. Turn them on later with secrets `AI_REQUIRE_PRO=1` and `HUB_REQUIRE_PRO=1`, only after (1) most iPhones run 1.3 and (2) web billing is on (step 5). Android can't buy Pro yet, so Android-only teams would lose Ask when you turn them on.

With the Supabase CLI instead: `supabase functions deploy pro --no-verify-jwt` (same for each).

## 3. Secrets (Edge Functions → Secrets)
- `PRO_SECRET`: any long random text (40+ characters). **Set it once and never change it**: changing it changes every team's Pro code.
- Already there: `ANTHROPIC_API_KEY`, `VAPID_*`, `APNS_*`, `AI_ADMIN_KEY`.
- Optional limits: `AI_PER_TEAM` (100 questions per Pro team per day), `AI_PER_TEST_TEAM` (10 per day for TestFlight/Sandbox purchases, which are free), `AI_SERVER_CAP` (5000 per day across everyone).
- One Pro subscription covers up to 5 Feeds. Test purchases (TestFlight, Sandbox, Stripe test mode) count only until they end, with no grace day.
- `AI_REQUIRE_PRO=1` / `HUB_REQUIRE_PRO=1`: turn the Pro checks on (see Timing above).
- `APPLE_SANDBOX=0`: only real App Store purchases count. Leave it unset while Apple is reviewing (reviewers buy with Sandbox accounts).

## 4. App Store Server Notifications (so renewals, cancellations and refunds reach the server)
App Store Connect → the app → **App Information** → App Store Server Notifications:
- Production URL and Sandbox URL: `https://vdhxhvklwbimjpoomnui.supabase.co/functions/v1/pro`
- Version: **Version 2**

## 5. Optional: Pro on the web (Stripe)
1. Stripe → Products: "Accounted For Pro" with two prices: $4.99/month and $39.99/year.
2. Secrets: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`.
3. Stripe → Developers → Webhooks → Add endpoint `https://vdhxhvklwbimjpoomnui.supabase.co/functions/v1/billing`, events `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Stripe → Settings → Billing → Customer portal: turn it on, copy its **login link** into secret `STRIPE_PORTAL_LOGIN_URL` (people sign in with an emailed code, so a shared Pro code can't open billing).
5. In `index.html`, change `webBilling:false` to `webBilling:true`, run `npm run bundle`, commit. Pro features on the web then need a subscription (or a Pro code from the iPhone app).

## 6. Optional: text everyone from the server (Twilio)
1. Twilio account, a US number, and **A2P 10DLC registration** (required by US carriers; takes a few days).
2. Secrets: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM` (+1… number) or `TWILIO_MESSAGING_SERVICE_SID`. Optional `SMS_PER_TEAM` (default 300 texts per team per day).
3. The "Text the check-in link to everyone" button shows up on live recalls for Pro teams once the function answers. The server writes the text itself ("<unit> recall: tap to check in. <link>") and only for a live recall the phone started, so the number can't be used for anything else.

## 7. Before submitting 1.3
- Run `npm test` (or check the Tests action on GitHub is green).
- In the App Store listing, update App Privacy from `privacy-labels.md` (crash data, purchase history, and the hub items are new).
- TestFlight: buy Pro with a Sandbox account, then check Tools → Pro shows "Server knows your team has Pro", and that Ask answers.
