# Roadmap: version 1.1 (on standby)

Agreed scope for the next update after 1.0. Nothing here is built yet. Items are in build order.

## 1. Offline check-in saving
**Today:** the leader's app works offline. The member check-in pages in `index.html` don't save anything when there's no connection. Recall and broadcast check-ins fall back to sending a text; QR check-in just fails ("Tell your leader you're here").

**Build:**
- Save the check-in on the member's phone and send it automatically when signal returns (`online` event, plus a retry each time the page opens).
- For QR, keep the scan timestamp and code with the saved check-in. The leader's app accepts it late, timestamped when it was scanned.
- Show "Saved, will send when you have signal" so the member knows it hasn't gone yet.

**Caveat:** the page only works offline for members who have opened a link once before. Say so in the field-crew wording and help.

## 2. Shift slots and "Off shift" in the muster
**Today:** the duty roster (`renderDuty`) assigns one person per day, skips anyone on leave, TAD or ops, allows swaps and flags conflicts. The muster doesn't use it.

**Build:**
- Shift slots per day: start and end time, plus how many people.
- An "Off shift" state that counts as accounted for, so the muster only expects whoever is on shift right now.
- Matters most for the police and construction modes.

## 3. Slack / Teams webhook
- The leader pastes an incoming-webhook URL. The app posts muster results and alerts to it.
- Show a clear notice that this content will be readable by Slack or Microsoft.
- Skip live Google Calendar sync. It needs OAuth and server-side tokens with readable names, which breaks the privacy model. The `.ics` export stays.
- Polish spreadsheet import column mapping for business rosters.

## 4. Big-screen web dashboard (premium)
- A wide, auto-refreshing layout over the existing company roll-up (`put_unit` / `get_units`).
- Sold as a web or org subscription, separate from the iPhone StoreKit Pro. Check Apple's rules before a web purchase unlocks anything in the iOS app.

## 5. Announcements: nudge and marketing
**Today:** feed posts collect "Got it" / "Got it, but I have a problem", with per-person status and an Excel export.

**Build:**
- A "Nudge everyone who hasn't confirmed" button.
- Show the confirmation tracking in the store listing and screenshots.
- Don't add passive read receipts. A tap that says "Got it" proves more than "opened".

## Leave and appointments: decided, no new build
Statuses with return dates and member leave and appointment requests (`feed_reqs`) already exist. Keep the leader-approves flow. Self-marking with no approval would let people dodge a muster. Possible small add: approved requests apply automatically on their start date.
