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

### 2. Apple App Store (needs a Mac, or a cloud Mac service)
1. Join the Apple Developer Program ($99/year) at developer.apple.com/programs.
2. On pwabuilder.com choose **iOS**. This produces an Xcode project; PWABuilder labels it experimental. You need Xcode on a Mac (or a cloud build service) to sign, archive and upload it.
3. **Main risk: Apple guideline 4.2 (minimum functionality).** Apple rejects apps that are "just a website." Push notifications are off by default in the PWABuilder iOS wrapper, and the web push this app uses doesn't run inside it. To give it the best chance: turn on native push, use the app's offline mode and in-app navigation, and give the reviewer a demo (sample data loads automatically) plus notes explaining offline use, encryption and QR muster.
4. Until then, iPhone users get almost everything, including push alerts, by adding the web app to their Home Screen (iOS 16.4 or later).

## Before you submit
- Run **DATA → System check** and make sure everything is ✅.
- Fill in `STORE_URL` near the end of `index.html` once the store links exist (it powers the "Rate this app" button).
- Keep the support email in `support.html` current; both stores require a working support contact.
