# Google Play: submit checklist (updated Nov 18, 2026)

## Already in the repo
- App: `com.antoniotyler.accountedfor`, target SDK 36, min SDK 24. Signed `.aab` built by GitHub: Actions → **Android build** (default version 4.125.1).
- Listing text: `play/listing-play.md` (no prices, no Pro/Org: Android has no in-app purchases yet). Spanish: `listing-es.md`.
- Graphics: `play/icon-512.png`, `play/feature-graphic-1024x500.png`, `play/screenshots/` (5 × 1080×1920; taken Nov 1: retake from the current build before production).
- Data safety answers: `privacy-labels.md` (Google Play section). Privacy policy: https://accountedforteam.com/privacy.html
- Android Pro: `PRO_GATE_WEB=false`, so every feature is unlocked on Android and nothing is sold there.

## Blockers only you can clear
1. GitHub → repo Settings → Secrets → Actions: set `ANDROID_KEY_PASSWORD` to the real password of the upload key (it must match what you used with `keytool`). The other three secrets (`ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`) are set.
2. Play Console → finish account setup: declare trader status, verify an Android device (done in the Play Console phone app), verify the contact phone number.

## Then, in order
1. Actions → Android build → Run workflow (version 4.125.1) → download the `.aab` from the run's artifacts.
2. Play Console → Create app: name **Accounted For: Team Check-In**, App, Free, English (US). Package name is fixed by the first upload.
3. Testing → **Closed testing** → create release → upload the `.aab` → paste What's new from `play/listing-play.md`.
4. Main store listing: paste `play/listing-play.md`, upload the `play/` graphics.
5. App content: privacy policy URL; Ads: No; App access: all features available without login; Content rating (Productivity, no violence → Everyone); Target audience 18+; Data safety from `privacy-labels.md`; declare microphone (Talk), location (rally point) and contacts import as optional.
6. New personal accounts: **12 testers opted in for 14 days in a row**, then apply for production.
7. App links: Play Console → Setup → App signing → copy the SHA-256, put it in `.well-known/assetlinks.json` on https://accountedforteam.com (and `store/root-site/.well-known/assetlinks.json` if the `antoniotyler22.github.io` root site is ever published). The manifest accepts links on both hosts.
