# Getting Accounted For into the App Store and Google Play

Everything here is ready except the parts that need your own accounts.

## What's in this folder
- `listing.md`: name, descriptions, keywords and URLs to paste into the stores
- `privacy-labels.md`: answers for Apple's App Privacy and Google's Data safety forms
- `screenshots/`: 7 phone screenshots at 1290 × 2796 (iPhone 6.7"/6.9" size; Google Play accepts them too)

## Recommended order: Android first

### 1. Google Play (no Mac needed: GitHub builds it)
The Android app lives in `android/` and wraps this same web app (Capacitor), like the iPhone app.
1. Create a Google Play Console developer account (one-time $25 fee) at play.google.com/console.
2. **Make an upload key once** (on any computer with Java, or ask me to walk you through it):
   `keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000`
   Keep `upload.jks` and both passwords safe; every update needs them.
3. GitHub → this repo → Settings → Secrets and variables → Actions → add:
   `ANDROID_KEYSTORE_B64` (run `base64 -i upload.jks` and paste the output), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`upload`), `ANDROID_KEY_PASSWORD`.
4. GitHub → Actions → **Android build** → Run workflow (version 1.3.0). Download the `.aab` from the run's artifacts.
   Optional: add `PLAY_SERVICE_ACCOUNT_JSON` and later runs upload straight to Play's internal testing track.
5. In Play Console, create the app (package `com.antoniotyler.accountedfor`), paste `listing.md`, upload `screenshots/`, answer Data safety from `privacy-labels.md`, and upload the .aab to **Closed testing**.
6. **New personal accounts must run a closed test with at least 12 testers, opted in for 14 days in a row, before you can publish.**
7. **App links** (check-in links open the app): Play Console → Setup → App signing → copy the SHA-256 fingerprint, put it in `store/root-site/.well-known/assetlinks.json`, and publish `store/root-site/` as the repo `antoniotyler22.github.io`.
8. Apply for production access, then publish.

Android notes for 1.3: Pro features stay unlocked on Android (Google requires Play Billing for subscriptions sold in Play apps; that's a later version). Push alerts need Firebase and are off on Android for now; local reminders work.

### 2. Apple App Store (no Mac needed: GitHub builds it)
The iPhone app lives in `ios/` and wraps this same web app, with native Face ID unlock, push alerts (Apple push), haptics, the iOS share sheet, a daily muster reminder and universal links. GitHub's Mac computers build, sign and upload it.

**A. Apple account (once)**
1. Join the Apple Developer Program ($99/year) at developer.apple.com/programs. Approval can take 1–2 days.
2. Note your **Team ID**: developer.apple.com → Account → Membership details.
3. App Store Connect → Apps → **+ New App**: platform iOS, name **Accounted For: Team Roster & Muster**, bundle ID **com.antoniotyler.accountedfor** (if it isn't listed, register it under Certificates, Identifiers & Profiles → Identifiers with *Push Notifications* and *Associated Domains* checked), SKU `musterboard`.

**B. Keys (once)**
1. App Store Connect → Users and Access → Integrations → **App Store Connect API** → generate a key with **Admin** access. Download the `.p8` (one download only). Note the **Key ID** and **Issuer ID**.
2. developer.apple.com → Certificates, Identifiers & Profiles → **Keys** → + → check **Apple Push Notifications service (APNs)**. Download that `.p8` too and note its Key ID.

**C. Put the keys in place (once)**
1. GitHub → this repo → Settings → Secrets and variables → Actions → New repository secret, four times:
   `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` (paste the whole API key file, BEGIN to END).
2. Supabase → Edge Functions → Secrets: `APNS_KEY` (whole APNs .p8 file), `APNS_KEY_ID`, `APNS_TEAM_ID`. Then redeploy the `notify` function from `supabase/functions/notify/index.ts`. Web push keeps working; iPhone-app users get Apple push.
3. Universal links (taps on board/FEED/My page links open the app): put your Team ID into `store/root-site/.well-known/apple-app-site-association` and publish `store/root-site/` as a repo named `antoniotyler22.github.io`.

**D. Build and test**
1. GitHub → Actions → **iPhone build** → Run workflow (version 1.0.0). About 15 minutes. **iPhone app build check** runs on every change and only checks that it compiles.
2. App Store Connect → TestFlight: the build appears after Apple processes it (10–30 min). Add yourself and your section leaders as testers and install with the TestFlight app.
3. Check on a real iPhone: alerts (allow when asked), Face ID (Tools → Security → Unlock with Face ID), share/export, daily reminder (Tools → Phone), and that a texted link opens the app.

**E. Submit**
1. App Store Connect → the app → iOS app 1.0: paste `listing.md`, upload iPhone 6.9" screenshots, answer App Privacy from `privacy-labels.md`, age rating 4+, category Productivity.
2. Pick the TestFlight build, then **Submit for Review**. Export compliance is already answered in the app (standard encryption only).
3. **Review notes to paste:** "Accounted For is a native accountability app for teams: a roster and status board stored encrypted on the device, Face ID unlock, Apple push alerts for check-ins, missed check-in deadlines and section updates, QR formation check-in, PDF headcount reports, a daily muster reminder, and offline use. No sign-up is needed: sample data loads on first open so every screen can be reviewed (tap the title to switch versions: Military, Police, Jobs, HR, Civilian). Optional member logins: a team leader can give each person a username and password that opens their own page; reviewers don't need one. Optional social features (Feed, messages, invite-only pages) include Report, Hide and Block, a Terms agreement, and a leader review queue; Delete my account is in Tools → Data and settings → Security. Accounted For Pro (auto-renewing subscription, 7-day free trial) unlocks leader tools; members always use the app free. Location is requested only if the user sets or confirms a rally point."
4. Review usually takes 1–3 days. If Apple asks questions, answer in Resolution Center; don't resubmit blindly.

## 1.3 server setup
See `store/setup-1.3.md` (SQL parts 20–22, four new Edge Functions, App Store Server Notifications, optional Stripe and Twilio).

## Before you submit
- Run **DATA → System check** and make sure everything is ✅.
- Fill in `STORE_URL` near the end of `index.html` once the store links exist (it powers the "Rate this app" button).
- Keep the support email in `support.html` current; both stores require a working support contact.
