# Privacy answers for the stores

These match how the app works as of version 1.3. Re-check them whenever features change. The privacy policy
(privacy.html) explains each item in plain words.

## Apple App Store: App Privacy ("nutrition label")

**Do you or your third-party partners collect data from this app?** Yes. Declare these, all **not linked** to the
user's identity and **not used for tracking**:

| Data type | Purpose | Why |
|---|---|---|
| Diagnostics → **Crash Data** | App Functionality | Crash reports (error text and code location; personal text stripped). |
| Purchases → **Purchase History** | App Functionality | The server keeps the Pro subscription's ID, product and end date so Ask, the Server hub and server texting work. |
| User Content → **Other User Content** | App Functionality | Ask: questions go to Anthropic to write an answer (not stored). Server hub: the server can open the board while it's on. |
| Contact Info → **Name** and **Phone Number** | App Functionality | Only when the Server hub is turned on (the server can open the backup, which holds the roster). |

**Tracking:** No.

Not collected (and why it's accurate): everything else the app sends (Feed, messages, pages, backups with the hub
off, section rosters, My page, check-ins) is encrypted or one-way scrambled on the phone, and the developer can't
read it. Webhook posts (Slack/Teams/Discord) and server texting pass through without being stored. Apple's
"collect" means data the developer can access beyond real-time servicing.

## Google Play: Data safety

**Does your app collect or share any of the required user data types?** Yes.

Collected (not shared, processed for **App functionality**, not optional unless noted):
- **App info and performance → Crash logs.** Optional (can be turned off in Data and settings).
- **Financial info → Purchase history.** Only if the person buys Pro on the web (Stripe). (The Android app doesn't sell Pro yet.)
- **Messages → Other in-app messages.** Optional: Ask questions (processed ephemerally by Anthropic).
- **Personal info → Name; Phone number.** Optional: only when the Server hub is turned on.

Shared: none. (Twilio, Stripe and Anthropic act as service providers on our behalf, which Google doesn't count as sharing.)

- **Is all of the user data collected by your app encrypted in transit?** Yes (HTTPS, plus end-to-end encryption for shared features).
- **Do you provide a way for users to request that their data is deleted?** Yes: Tools → Data and settings → Security → Delete my account, or email Antoniotyler22@gmail.com. Relay data also expires automatically (72 hours to 120 days); crash reports after 30 days.

## Permissions the app may ask for
- **Notifications** (optional): check-ins, missed check-in deadlines, section updates, new word in Feed, daily muster reminder.
- **Location** (optional, only while using the app): setting a rally point, and a member confirming they're at it. Only the distance is sent; the location itself never leaves the phone.
- **Camera**: not used by the app; members scan the formation QR code with their phone's own camera.
- No contacts, microphone or tracking permissions.

On iPhone, the location prompt comes from the web view (the app doesn't request location in the background). If
Apple asks, add `NSLocationWhenInUseUsageDescription` = "Used only when you set or confirm a rally point. Your location never leaves your phone." to Info.plist (already added in this version).
