# Firestore `settings/*` — phase 2 checklist (APK v16)

Phase 2 closes the account mirror (`settings/user_*`, `settings/email_*`) and the
VIP document (`settings/global_vip_system`) to browsers and apps. The code for it
shipped with APK v16; these steps are done by the project owner, in this order.

1. **Service account on Vercel.** Firebase console → Project settings → Service
   accounts → *Generate new private key*. In Vercel → Project → Settings →
   Environment Variables add `FIREBASE_SERVICE_ACCOUNT` (Production) with the JSON
   file contents (or its base64). Never commit it or paste it in a chat. Redeploy.
2. **Check it works.** `https://black-x-anime.me/api/health` must show
   `"firestoreAuth": "service_account"`. Anything else (`api_key`, `invalid_key`,
   `error`) → stop here.
3. **Tell old apps to update.** From the developer panel (website or APK v16) send a
   broadcast such as «حدّث التطبيق من الموقع — النسخة القديمة هتقف قريب». APK ≤ 15.1
   show the broadcast; v16+ also shows its own update banner.
4. **Wait** until most users run v16 (a few days to two weeks).
5. **Publish the rules.** Firebase console → Firestore → database
   `ai-studio-blackxanime-e47e1ba2-315f-4c3b-8557-71352813f36c` → Rules → paste
   `firestore.rules.phase2` → Publish. Then copy it over `firestore.rules` in the repo.
6. **Verify.** Login, register, Google sign-in, VIP code, developer panel and
   watch progress sync in APK v16 and on the website; `/api/app/config` still answers.

What changes for old builds after step 5: APK ≤ 15.1 can no longer sign in, sync or
redeem VIP codes (their VIP gate falls back to the last cached state). Watch parties,
timed comments, reviews and the community feed keep working everywhere.

Rollback: re-publish `firestore.rules` (phase 1) in the console.
