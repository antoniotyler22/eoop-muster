# Wow features: what's built, what's switched off, what you do by hand

## 1. "Press 1" robot calls (server + app, ready once Twilio voice is set)
- New Edge Function `supabase/functions/voice/index.ts`. Paste/deploy it like `sms`, turn OFF "Enforce JWT verification".
- Uses the same Twilio secrets as texting (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`). `TWILIO_FROM` must be voice-capable.
- Optional: `VOICE_URL` (exact public address of the function), `VOICE_PER_TEAM` (calls per Pro team per day, default 100), `SMS_PEPPER` (must match `sms`).
- No new SQL: it reuses part 26 (`sms_routes_put`, `sms_reply`). A keypress 1/2/3 counts exactly like a text reply 1/2/3.
- The app shows "📞 Call everyone still not checked in" in a live recall only after the function answers a ping (Pro + Twilio set).
- Voicemail is detected; it gets a short message and is not counted as a check-in.

## 2. Critical Alerts (server flag is built, OFF by default)
- `notify` now marks SOS and "NEED HELP" alerts `crit: true`. They only become Apple critical alerts when the secret `APNS_CRITICAL=1` is set.
- Do these in order:
  1. Request the entitlement from Apple: https://developer.apple.com/contact/request/notifications-critical-alerts-entitlement/ (health/safety/emergency use; explain that SOS and "someone needs help" in a live recall are life-safety alerts).
  2. When approved, add `com.apple.developer.usernotifications.critical-alerts` = true to `ios/App/App/App.entitlements` and the App ID, refresh provisioning.
  3. Add `native-ios/CriticalAlerts.swift` to the App target and register it in `MainViewController.capacitorDidLoad()`.
  4. Ship the build, then set `APNS_CRITICAL=1` on the notify function.
- Do NOT add the entitlement before approval: the build will fail to sign.
- A test fails if the entitlement is added early, so remove it from `tests/wow-features.test.mjs` once approved.

## 3. One-tap "I'm safe" (app side done; Xcode step needed)
- App side: `accountedfor://safe` (and a `#safe` link on the web) checks in as On Hand through My check-in. Info.plist now registers the `accountedfor` URL scheme.
- iOS control: `native-ios/AccountedForControls/SafeControl.swift` (iOS 18 ControlWidget). In Xcode: File → New → Target → Widget Extension (untick Live Activity), name `AccountedForControls`, replace its Swift file with this one, set the extension's deployment target to iOS 18. Then long-press the Lock Screen / Control Center / Action button settings to add "I'm safe".
- This was written without being able to build iOS here, so treat the Swift as untested until you run it once.
- On a phone that doesn't yet know which person you are, it asks you to pick yourself first instead of guessing.
