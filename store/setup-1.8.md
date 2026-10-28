# 1.8 setup: reply-by-text check-in and family texts

Drill history, elapsed-time alarms, visitors and contractors, the School template, family texts by group message, and the roster paste all work as soon as the update is live. Two things need the server.

## 1. Check in by replying to the text (Pro)

Needs Twilio already working for "Text the check-in link to everyone" (see setup-1.3).

1. **SQL:** Supabase → SQL Editor → paste `supabase/setup/26_text_checkin.sql` → Run.
2. **Update the `sms` function:** Edge Functions → `sms` → paste the new `supabase/functions/sms/index.ts` over the old code → Deploy.
3. **New function `sms-in`:** Edge Functions → Deploy a new function → name it `sms-in` → paste `supabase/functions/sms-in/index.ts` → Deploy. Open its Details and turn **off** "Enforce JWT verification" (Twilio can't send a Supabase token).
4. **Point Twilio at it:** Twilio Console → Phone Numbers → Active numbers → your number → Messaging configuration → "A message comes in" → **Webhook**, HTTP **POST**, URL:
   `https://vdhxhvklwbimjpoomnui.supabase.co/functions/v1/sms-in`
   If you use a Messaging Service, set the same URL under the service's Integration → "Send a webhook".
5. **Optional secret:** Edge Functions → Secrets → add `SMS_PEPPER` (any long random text). If you add it, it's used by both `sms` and `sms-in`. Without it they use the service key, which works too.

**Test:** start a live check-in, tap "Text the check-in link to everyone", reply `1` from one of the phones. The reply "Checked in: OK. Thanks." comes back and the person turns green on the leader's phone within seconds.

What people can reply: `1` / OK / safe / here = OK, `2` / late / ETA 1400 = delayed (the ETA shows on the leader's phone), `3` / help = need help (the leader gets the Need help alert). Anything else gets the instructions back. STOP and HELP keywords are handled by Twilio.

Visitors and contractors signed in with a phone number get the same text and their reply marks them accounted for.

## 2. Family "safe" texts from the server (Pro)

Nothing extra: it uses the updated `sms` function from step 2. Without Pro server texting, the app opens group texts of 20 with a general "your child is accounted for" message instead.

Family numbers: the person's **alt phone** (imports read Parent, Guardian, Mom, Dad and "Parent / Guardian Phone" columns into it), or their phone if there's no alt phone.

## 3. Twilio registration

US texting from a 10-digit number needs A2P 10DLC registration. In the campaign description, include both uses: "Emergency and drill check-in requests to team members, who reply 1, 2 or 3" and "Notices to parents and guardians that their child is accounted for during a drill or emergency." Sample messages:

- `LINCOLN ELEM recall: tap to check in. https://antoniotyler22.github.io/eoop-muster/#ci=… Or reply 1 = OK, 2 = delayed, 3 = need help.`
- `LINCOLN ELEM: Ana R. is accounted for and safe as of 10:42 AM. Pickup: North gym doors. More updates will come by text.`
