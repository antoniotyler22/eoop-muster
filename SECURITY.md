# Accounted For: security and data handling

A plain-language description of how Accounted For protects data, for organizations evaluating it.
Last updated for version 1.3 (October 2026).

## Design in one paragraph
The roster lives on the leader's phone, not on a server. Optional PIN lock encrypts it on the device (AES-256-GCM,
key derived from the PIN with PBKDF2-SHA256, 310,000 iterations). Features that share data (section updates, Feed,
messages, pages, My page, backups) encrypt on the sending phone with keys that travel only inside private links, so the
server stores ciphertext it cannot read. Check-ins send one-way hashes of the name a person types, never the name.
There are no user accounts, no analytics SDKs, no ads and no third-party trackers; all scripts and fonts are served
from the app's own origin.

## Server
- **Supabase (Postgres + Edge Functions).** Every table has row-level security on and all access revoked from the
  public API roles; the app reaches data only through about 70 narrowly scoped functions that check a capability key
  (e.g. a recall's read key, a feed's leader key) by comparing SHA-256 hashes. The server never stores the keys.
- **Rate limits and expiry.** Per-recall, per-feed and per-device limits; recalls expire after 72 hours, feeds after
  90 idle days, pages after 120, crash reports after 30.
- **Logins** (optional): the leader's phone seals each person's link with a key derived from their password
  (PBKDF2-SHA256, 210,000 iterations); the server keeps only the sealed copy and a verifier hash. Five wrong
  attempts lock the login for 15 minutes, growing with repeats; unknown users and wrong passwords look identical.

## Where the server *can* read data
Stated plainly so there are no surprises:
1. **Server hub (opt-in, Pro).** To run the leader's job while their phone is off, the board's recovery code is stored
   encrypted with a key held by the hub function. While it's on, the server can open that board. Turning it off
   deletes the stored code.
2. **Ask (opt-in, Pro).** Questions are sent to Anthropic's API to answer; the app blocks questions containing ID
   numbers, phone numbers, emails or roster names. Questions aren't stored; only daily counts.
3. **Webhook posts and server texting (opt-in).** The report text (to Slack/Teams/Discord) or phone numbers and the
   check-in link (to Twilio) pass through without being stored.
4. **Crash reports (default on, can be turned off).** Error text and code location; quoted text is removed on the
   phone and phone numbers/emails are removed on the server.

## Payments
Apple (App Store) and Stripe (web) handle all payment data. The server verifies Apple's signed transactions itself
(ECDSA signature and certificate chain to Apple Root CA - G3, pinned by SHA-256) and Stripe webhooks (HMAC-SHA256 with a
5-minute window). It stores only the subscription ID, product, end date and a hash of the team's Pro code.

## Devices
- iPhone: Face ID unlock reads the PIN from the iOS Keychain after a biometric match. Data is stored in the app's
  sandbox. Optional erase-after-10-wrong-PINs.
- Android and web: same encryption; Android stores data in the app's private storage.
- Exports (Excel, PDF, CSV, .ics) are not encrypted; they leave the phone only when the user shares them.

## Testing
Automated tests run on every change (GitHub Actions → Tests): the full app in a test browser (every screen, PIN lock,
check-in hashing, PDF, import, alerts, integrations), every database setup script against a real Postgres configured
like Supabase (including checks that tables are closed to the public API and that capability checks reject wrong
keys), and the Apple/Stripe signature verification against forged and tampered inputs.

## Not a government system
Accounted For is an independent app, not an official system of, or endorsed by, the DoD, any military service, police
agency or government, and it is not accredited for classified or CUI data. Follow your organization's rules on
personal information on personal devices.

## Reporting a problem
Email Antoniotyler22@gmail.com with "Security" in the subject. Please don't post details publicly until it's fixed.
