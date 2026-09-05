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

For a local seeded walkthrough, run `npm run seed` in `server` and sign in with `9999999991` / `rider@123`. The seeded rider is approved and has a live demo offer with pickup OTP `1234` and drop OTP `4321`; do not use these credentials in production.
