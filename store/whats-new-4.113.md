# 4.113.0: Plans & add-ons (Tools → Plans & add-ons)

- Text credits: packs of texts for "text everyone the check-in link". Counted only when `SB.credits` is switched on in index.html (off now, so nobody's texting changes).
- Event Pass: 72 hours with up to 200 people for a one-off event. Nobody is removed when it ends.
- Compliance pack: audit-ready drill log. Sign each drill, export a spreadsheet or a printable log with the team's name and logo.
- Template kits: School safety, Workplace, Youth & field trips, Events & races (the lines each drill record needs).
- Branding: team name, logo, accent color; Verified badge granted by the owner.
- Site license: redeem a code, everything unlocks on that phone.
- Tip jar.

## Switching it on (nothing is live until you do these)
1. Supabase SQL editor: run `supabase/setup/48_addons.sql`.
2. Stripe: create ONE-TIME prices and set these secrets on the `billing` function:
   `STRIPE_ADDON_CREDITS_100`, `_CREDITS_500`, `_CREDITS_2000`, `_PASS`, `_COMPLIANCE`, `_BRAND`, `_KIT_SCHOOL`, `_KIT_WORK`, `_KIT_YOUTH`, `_KIT_EVENT`, `_KITS`, `_TIP_2`, `_TIP_5`, `_TIP_10`.
   Add the event `checkout.session.completed` to the existing Stripe webhook. Redeploy `billing`.
3. Codes (site licenses, Verified badge, comps): insert a row in `addon_codes` with the SHA-256 of the code in capitals, e.g. sku `site`, `days` 365; sku `verified` grants the badge.
4. iPhone: buttons stay off until App Store products exist and `SB.addonIAP` is set to true. Codes work on iPhone today.
5. Text credits: set `SB.credits:true` in index.html when you want texting to start costing credits.
