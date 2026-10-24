# Getting MusterBoard into the App Store and Google Play

Everything here is ready except the parts that need your own accounts.

## What's in this folder
- `listing.md`: name, descriptions, keywords and URLs to paste into the stores
- `privacy-labels.md`: answers for Apple's App Privacy and Google's Data safety forms
- `screenshots/`: 7 phone screenshots at 1290 × 2796 (iPhone 6.7"/6.9" size; Google Play accepts them too)

## Recommended order: Android first

### 1. Google Play (no Mac needed)
1. Create a Google Play Console developer account (one-time $25 fee) at play.google.com/console.
2. Go to **pwabuilder.com**, enter `https://antoniotyler22.github.io/eoop-muster/`, and choose **Package for stores → Android**. Download the package (an .aab file plus `assetlinks.json` and a signing key: **keep the key and its password safe; you need them for every update**).
3. **Digital Asset Links** (removes the browser bar so it looks like a real app): the file must live at `https://antoniotyler22.github.io/.well-known/assetlinks.json`, which is the root of your GitHub Pages domain, not the app folder. Create a repo named `antoniotyler22.github.io`, add the file at `.well-known/assetlinks.json`, and add an empty file named `.nojekyll`. (Ask me and I'll set this up.)
4. In Play Console, create the app, paste `listing.md`, upload `screenshots/`, answer Data safety from `privacy-labels.md`, and upload the .aab to **Closed testing**.
5. **New personal accounts must run a closed test with at least 12 testers, opted in for 14 days in a row, before you can publish.** Your section leaders and SNCOs make a good test group.
6. Apply for production access, then publish.

### 2. Apple App Store (no Mac needed: GitHub builds it)
The iPhone app lives in `ios/` and wraps this same web app, with native Face ID unlock, push alerts (Apple push), haptics, the iOS share sheet, a daily muster reminder and universal links. GitHub's Mac computers build, sign and upload it.

**A. Apple account (once)**
1. Join the Apple Developer Program ($99/year) at developer.apple.com/programs. Approval can take 1–2 days.
2. Note your **Team ID**: developer.apple.com → Account → Membership details.
3. App Store Connect → Apps → **+ New App**: platform iOS, name **MusterBoard: Team Accountability**, bundle ID **com.antoniotyler.musterboard** (if it isn't listed, register it under Certificates, Identifiers & Profiles → Identifiers with *Push Notifications* and *Associated Domains* checked), SKU `musterboard`.

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
3. **Review notes to paste:** "MusterBoard is a native accountability app: roster and status board stored encrypted on the device, Face ID unlock, Apple push alerts for check-ins and section updates, QR formation check-in, daily muster reminder, and offline use. No account or login: sample data loads on first open so every screen can be reviewed. Tap the title to switch versions (Military, Police, Jobs, HR, Civilian)."
4. Review usually takes 1–3 days. If Apple asks questions, answer in Resolution Center; don't resubmit blindly.

## Before you submit
- Run **DATA → System check** and make sure everything is ✅.
- Fill in `STORE_URL` near the end of `index.html` once the store links exist (it powers the "Rate this app" button).
- Keep the support email in `support.html` current; both stores require a working support contact.
