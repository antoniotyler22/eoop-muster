# Privacy answers for the stores

These match how the app works today. Re-check them if features change.

## Apple App Store: App Privacy ("nutrition label")
- **Do you or your third-party partners collect data from this app?** No.
  - Why this is accurate: rosters, logs and settings stay on the device. What the optional live features send is encrypted on the device or one-way scrambled before upload, the developer cannot read it or link it to a person, and it is not used for tracking. Apple's definition of "collect" is data the developer can access beyond real-time servicing; encrypted relay data the developer can't decrypt doesn't count. If you ever add analytics, crash reporting or accounts, change this answer.
- **Tracking:** No.

## Google Play: Data safety
- **Does your app collect or share any of the required user data types?** No.
- **Is all of the user data collected by your app encrypted in transit?** Yes (HTTPS, plus end-to-end encryption for shared features).
- **Do you provide a way for users to request that their data is deleted?** Yes: DATA → "Erase all app data on this phone" and "Delete cloud copy"; relay data expires automatically (72 hours to 120 days).

## If you turn on Ask (AI)
Questions a person types are sent to a third-party AI service (Anthropic) to generate an answer. They aren't stored or linked to the person, but to be safe declare it:
- Apple: Data collected → **Other User Content**, used for **App Functionality**, **not linked** to identity, **not used for tracking**.
- Google: Data shared → **Other in-app messages / user-generated content**, processed ephemerally, for **App functionality**.

## Permissions the app may ask for
- Notifications (optional): push alerts for check-ins, section updates and new word in FEED.
- Camera: not used by the app itself; members scan the formation QR code with their phone's own camera.
- No location, contacts, microphone or tracking permissions.
