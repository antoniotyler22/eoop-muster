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

**Timing:** the new `ask` and `hub` require the Pro code that only 1.3 sends. Until 1.3 is live in the App Store, set `AI_REQUIRE_PRO=0` and `HUB_REQUIRE_PRO=0`, then remove both once most people have updated (otherwise subscribers still on 1.2 lose Ask and the hub).

With the Supabase CLI instead: `supabase functions deploy pro --no-verify-jwt` (same for each).

## 3. Secrets (Edge Functions → Secrets)
- `PRO_SECRET`: any long random text (40+ characters). **Set it once and never change it**: changing it changes every team's Pro code.
- Already there: `ANTHROPIC_API_KEY`, `VAPID_*`, `APNS_*`, `AI_ADMIN_KEY`.
- Optional limits: `AI_PER_TEAM` (100 questions per Pro team per day), `AI_SERVER_CAP` (5000 per day across everyone).
- `AI_REQUIRE_PRO=0` or `HUB_REQUIRE_PRO=0` turn the Pro checks off (not recommended).

## 4. App Store Server Notifications (so renewals, cancellations and refunds reach the server)
App Store Connect → the app → **App Information** → App Store Server Notifications:
- Production URL and Sandbox URL: `https://vdhxhvklwbimjpoomnui.supabase.co/functions/v1/pro`
- Version: **Version 2**

## 5. Optional: Pro on the web (Stripe)
1. Stripe → Products: "Accounted For Pro" with two prices: $4.99/month and $39.99/year.
2. Secrets: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`.
3. Stripe → Developers → Webhooks → Add endpoint `https://vdhxhvklwbimjpoomnui.supabase.co/functions/v1/billing`, events `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Stripe → Settings → Billing → Customer portal: turn it on (for "Manage subscription").
5. In `index.html`, change `webBilling:false` to `webBilling:true`, run `npm run bundle`, commit. Pro features on the web then need a subscription (or a Pro code from the iPhone app).

## 6. Optional: text everyone from the server (Twilio)
1. Twilio account, a US number, and **A2P 10DLC registration** (required by US carriers; takes a few days).
2. Secrets: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM` (+1… number) or `TWILIO_MESSAGING_SERVICE_SID`. Optional `SMS_PER_TEAM` (default 300 texts per team per day).
3. The "Text the check-in link to everyone" button shows up on recalls for Pro teams once the function answers.

## 7. Before submitting 1.3
- Run `npm test` (or check the Tests action on GitHub is green).
- In the App Store listing, update App Privacy from `privacy-labels.md` (crash data, purchase history, and the hub items are new).
- TestFlight: buy Pro with a Sandbox account, then check Tools → Pro shows "Server knows your team has Pro", and that Ask answers.
