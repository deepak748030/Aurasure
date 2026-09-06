# Aurasure Rider

React Native + Expo SDK 54 delivery-partner app, redesigned from the rider reference archive in `Aurasure-Driver-V3.7-Mart-master.zip`.

## Rider experience

- Plum-and-white reference visual system with **4dp screen gutters**. Maps and flat lists are deliberately full bleed with **0dp horizontal padding**.
- Four-tab dashboard: Home, Requests, Earnings and Profile.
- Duty-aware online / break / offline state. Online requests are polled from the Node API and the same task cannot be accepted twice.
- Native map route with pickup, drop and rider markers; web uses live OpenStreetMap tiles with zoom controls and attribution. Google/Apple Maps hand-off is available from the active task.
- Complete delivery flow: accept → arrived at pickup → pickup OTP → arrived at drop → drop OTP → COD → proof-of-delivery photo → delivered.
- KYC onboarding for profile, vehicle, Aadhaar, PAN, driving licence, RC, bank and training/quiz, with native and web image upload.
- Earnings, incentives, payout balance, COD in hand/deposit ledger, trip history and leaderboard/referral/review/safety/support screens.
- Background-safe location heartbeat: location starts only while online/on-task and stops on offline; failed pings are kept in a capped 200-point buffer and replayed.
- Every live action calls the existing Node.js `/api/v1/rider` API. The map preview also uses `GET /rider/tasks/:id` so offers can be inspected before accepting.

## Run

```bash
cp .env.example .env
# Set EXPO_PUBLIC_API_URL to the public Node API host (or Arena API preview origin)
npm install
npm run web
```

For iOS/Android location background permissions and the native map, use a development build rather than Expo Go:

```bash
npx expo run:android
npx expo run:ios
```

The server must be running and MongoDB must be connected for authenticated screens. The server's rider endpoints are in `server/src/routes/rider.routes.js`; this app uses the server envelope and bearer-token session already used by the repository.

## In-app updates (Google Play)

On every launch (Android release builds only) the app asks the Play Store whether a
newer build was published. If yes, it shows **its own in-app prompt**
(`Update now` / `Later`) and the new build downloads and installs **inside the
app** — the delivery partner never leaves for the Play Store.

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
3. Upload the new AAB with the same package (`com.aurasure.rider`) and the same
   signing keystore as the previous build.
4. Test on the internal testing track: install release N from Play, upload
   N+1, reopen the app — the in-app update prompt should appear.

For a local seeded walkthrough, run `npm run seed` in `server` and sign in with `9999999991` / `rider@123`. The seeded rider is approved and has a live demo offer with pickup OTP `1234` and drop OTP `4321`; do not use these credentials in production.
