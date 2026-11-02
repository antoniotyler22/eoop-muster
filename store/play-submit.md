# Google Play: ready-to-submit checklist

Everything the repo can do is done. The rest needs your Google account and signing key.

## Already in the repo
- App: `com.antoniotyler.accountedfor`, target SDK 36, min SDK 24, signed AAB built by GitHub (Actions → Android build, version 4.76.4)
- Listing text: `listing.md` (short description 80 chars, full description). Spanish: `listing-es.md`
- Graphics: `play/icon-512.png`, `play/feature-graphic-1024x500.png`, `play/screenshots/` (5 × 1080×1920)
- Data safety answers: `privacy-labels.md` (updated for Talk microphone and optional contacts picker)
- Privacy policy: https://antoniotyler22.github.io/eoop-muster/privacy.html
- What's new: `whats-new-1.8.md`

## You do (about 30 minutes)
1. Play Console account ($25), create app: name **Accounted For: Team Roster & Muster**, App, Free, English (US).
2. Make the upload key once, add the 4 GitHub secrets (see `README.md` step 2–3). Never share the .jks or passwords with anyone.
3. Run **Android build**, download the `.aab`.
4. Play Console → Closed testing → create release → upload the `.aab`, paste What's new.
5. Store listing: paste `listing.md`, upload the `play/` graphics.
6. App content: Privacy policy URL; Ads: No; App access: all features available without login (sample data loads); Content rating questionnaire (Productivity, no violence; answers → Everyone); Target audience 18+; Data safety from `privacy-labels.md`; Permissions: declare mic (Talk) and location (rally point) as optional, contacts as optional import.
7. Closed test needs **12 testers for 14 days** (new personal accounts), then apply for production.
8. Pro stays unlocked on Android until Play Billing is added: do not mention subscription purchases in the Play listing text (remove the "ACCOUNTED FOR PRO … $4.99" paragraph from the Play description).
