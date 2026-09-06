# Aurasure Vendor

React Native Expo command centre for Aurasure food kitchens and shops. The app follows the supplied Aurasure Vendor reference flows, redesigned around the work a vendor does at the pass:

- password sign-in and one-time food/shop module selection
- resumable four-step outlet/KYC/bank onboarding with individual document status
- real order board: New, Preparing, Ready and Completed, prep-time acceptance, rejection reasons, partial acceptance, pickup OTP and rider status
- 15-second board refresh, stale-state protection and an explicit offline/last-sync banner
- catalogue search/filter, item photos, veg marker, prep time, variants, add-on groups, moderation badges and long-press stock pause
- outlet hours, pause-for-15/30/60-minutes, editable dispatch pin, native map and an Expo web map fallback
- business snapshot, commission-aware settlement ledger and per-order statements
- account status, support tickets, alert guidance and secure native token storage

## Run

```bash
cd server
npm install
npm run seed
npm start

# in another terminal
cd VendorApp
npm install
EXPO_PUBLIC_API_URL=http://localhost:5000 npm run web
```

For an Android device, use the machine's LAN address instead of `localhost`. The API base is the server origin without `/api/v1`; the app adds that prefix itself.

Demo seed:

- phone `7777777777`
- password `vendor@123`
- module `food`
- status `submitted` (approve the vendor and verify each document in Admin → Vendors KYC before opening the live board)

## Android production APK (installable)

```bash
npm install
cp .env.example .env                # set EXPO_PUBLIC_API_URL
npm run build:android               # eas build --platform android --profile production
```

The `production` profile builds a signed **APK** (`android.buildType: apk`) that
can be installed directly on an Android device, while still using `local`
version codes from `app.json`.

> EAS cloud builds do **not** upload your local `.env` file. If you build with
> cloud `eas build` and you do not want the server URL inside `eas.json`, set
> `EXPO_PUBLIC_API_URL` in Expo dashboard → Environment variables/secrets
> instead.

---

## In-app updates (Google Play)

On every launch (Android release builds only) the app asks the Play Store whether a
newer build was published. If yes, it shows **its own in-app prompt**
(`Update now` / `Later`) and the new build downloads and installs **inside the
app** — the vendor never leaves for the Play Store.

- Backed by `expo-in-app-updates` (official Google Play Core `app-update` API).
- Update type follows the Play Console **priority**: `4`+ → full-screen
  immediate flow; below `4` → flexible (background download + restart prompt).
- `Later` is remembered per published `versionCode`, so the prompt appears once
  per release rather than on every open.
- Works for Play-Store-installed builds (including internal/closed testing
  tracks, or closed-track production releases). It cannot work in Expo Go or
  `adb`-installed debug builds — set `EXPO_PUBLIC_IN_APP_UPDATE_DEBUG=1` to force
  the check in a debug build installed from Play. iOS has no in-app update API
  (Apple), so the gate only runs on Android.

### Release checklist

1. Bump `android.versionCode` in `app.json` **and** the Expo `version` on every
   Play release. Play compares `versionCode`, so no update ever appears unless
   the uploaded AAB has a higher value.
2. For an urgent/forced update, set the release **priority to 4 or higher** in
   the Play Console (`Production → release → In-app updates priority`).
3. Upload the new AAB with the same package (`com.aurasure.vendor`) and the same
   signing keystore as the previous build.
4. Test on the internal testing track: install release N from Play, upload
   N+1, reopen the app — the in-app update prompt should appear.
