# iOS build & App Store release guide

How to take any of the three Expo apps in this repo — `AurasureApp`
(customer), `VendorApp`, `RiderApp` — from source to a live App Store listing.

You do **not** need a Mac. EAS Build compiles on Apple hardware in the cloud;
your laptop only runs the CLI.

---

## 0. What this repo already has

| Piece | Status |
|---|---|
| `eas.json` in all three apps | ✅ added (`development` / `preview` / `production` profiles) |
| iOS bundle identifiers | ✅ `com.aurasure.order` · `com.aurasure.vendor` · `com.aurasure.rider` |
| iOS permission usage strings | ✅ location, photo library, push |
| `ITSAppUsesNonExemptEncryption: false` | ✅ skips the export-compliance prompt on every upload |
| `npm run build:ios` / `submit:ios` scripts | ✅ added |
| EAS project id (`extra.eas.projectId`) | ❌ **you must create it** — see step 3 |
| Apple Developer Program membership | ❌ **you must buy it** — see step 1 |

---

## 1. Prerequisites (one time, costs money)

1. **Apple Developer Program** — $99/year, <https://developer.apple.com/programs/>
   Enrolment takes 24–48 h. As an Indian organisation you will be asked for a
   **D-U-N-S number** (free, ~2 weeks) unless you enrol as an *individual*.
   Start this first — it is the longest lead time in the whole process.
2. **Expo account** — free, <https://expo.dev/signup>
3. **Node 18+** and the EAS CLI:
   ```bash
   npm install -g eas-cli
   eas login
   ```

---

## 2. Point the app at your production API

The apps read `EXPO_PUBLIC_API_URL` at build time. A localhost URL in a store
build means every screen shows "offline" on a reviewer's device — this is the
single most common reason food-delivery apps get rejected.

Edit the `env` block of the `preview` and `production` profiles in each
`eas.json`:

```jsonc
"production": {
  "env": { "EXPO_PUBLIC_API_URL": "https://api.aurasure.app" }
}
```

Requirements for that URL:
- **HTTPS** with a valid certificate (iOS App Transport Security blocks plain
  HTTP), and
- publicly reachable — not a LAN IP, not a tunnel that expires.

---

## 3. Create the EAS project

Run inside the app folder you are shipping (repeat per app):

```bash
cd AurasureApp        # or VendorApp / RiderApp
eas init
```

This creates the project on expo.dev and writes `extra.eas.projectId` into
`app.json`. **Commit that change** — push notifications also depend on it
(`registerForPush()` returns `null` without it, so the vendor order alerts
stay silent).

---

## 4. Let EAS create your signing credentials

```bash
eas credentials --platform ios
```

Pick **"Set up a new key"** / let EAS generate everything. It creates and
stores, on your Apple account:
- a **Distribution Certificate**
- a **Provisioning Profile**
- an **APNs key** (required for the push notifications this repo sends)

You will sign in with your Apple ID once; EAS keeps the credentials encrypted
so future builds are non-interactive.

> Prefer to manage signing yourself? Use `--local` and supply your own `.p12`
> and `.mobileprovision`. Not recommended for a first release.

---

## 5. Register the app in App Store Connect

<https://appstoreconnect.apple.com> → **My Apps → +**

| Field | Value |
|---|---|
| Platform | iOS |
| Name | `Aurasure` (must be globally unique on the store) |
| Primary language | English (India) |
| Bundle ID | pick `com.aurasure.order` from the dropdown |
| SKU | any internal string, e.g. `aurasure-customer` |

Copy the numeric **Apple ID** shown on the App Information page — that is the
`ascAppId` value for the next step.

Now fill in the real values in `eas.json → submit.production.ios`:

```jsonc
"ios": {
  "appleId": "you@example.com",       // your Apple developer login
  "ascAppId": "6478123456",           // numeric App ID from App Store Connect
  "appleTeamId": "ABCDE12345"         // Membership details → Team ID
}
```

---

## 6. Build

Smoke-test on a real device first (installs via a QR link, no store review):

```bash
npm run build:ios:preview
```

Then the store build:

```bash
npm run build:ios          # eas build --platform ios --profile production
```

- Takes ~15–25 minutes. You can close the terminal; progress is on expo.dev.
- Produces a signed `.ipa`.
- The repo now uses `"appVersionSource": "local"` in all three `eas.json`
  files, so EAS reads `buildNumber` / `versionCode` from `app.json`. Bump
  `buildNumber` yourself before each store release.

---

## 7. Submit to App Store Connect

```bash
npm run submit:ios         # eas submit --platform ios --profile production --latest
```

Uploads the latest build. It then takes 10–30 minutes to finish "Processing"
before it appears under TestFlight.

---

## 8. TestFlight (strongly recommended)

App Store Connect → **TestFlight** → add yourself as an internal tester.
Install on a real iPhone and verify the things a simulator cannot prove:

- login works against the **production** API
- a placed order reaches the vendor app as a **push notification**
- location permission prompt shows your usage string, not a blank dialog
- photo upload (KYC documents) works

---

## 9. Store listing + submit for review

Under **App Store → iOS App**, fill in:

- **Screenshots** — mandatory: 6.7" (1290×2796) and 6.5" (1242×2688).
  Grab them from TestFlight on a real device, or use the simulator.
- **Description, keywords, support URL, marketing URL**
- **Privacy Policy URL** — *mandatory*, and it must be a live page. Apple
  rejects placeholder links.
- **App Privacy** questionnaire — declare what this codebase actually collects:
  *Location*, *Contact Info* (name/phone), *Identifiers*, *Photos*, *Purchases*.
- **Age rating**, **category** → Food & Drink (customer) / Business (vendor,
  rider).

Then **Add for Review → Submit**. First review typically takes 24–72 hours.

---

## 10. Aurasure-specific rejection risks

These are the ones that actually apply to this codebase — worth handling
before you submit rather than after a rejection.

1. **Demo account is mandatory.** Vendor and Rider apps are login-walled, and
   the customer app is useless without data. Put working credentials in
   *App Review Information → Sign-In required*. For the vendor app the account
   must already be `approved`, otherwise the reviewer only ever sees the
   "pending verification" screen and rejects it as incomplete.
2. **Backend must stay up during review.** If the API is down the reviewer sees
   an empty shell — guideline 2.1, instant rejection.
3. **Rider background location** (`UIBackgroundModes: ["location"]`,
   `ACCESS_BACKGROUND_LOCATION`) gets extra scrutiny. Explain in the review
   notes that tracking runs *only* during an active delivery, and make sure the
   usage strings say so (they currently do).
4. **Three apps, one brand.** Apple sometimes flags near-duplicate apps under
   guideline 4.3. These are genuinely different audiences (customer / merchant
   / courier), which is accepted — just make the descriptions and screenshots
   clearly distinct.
5. **Payments.** Razorpay for physical goods and delivery is correct and does
   *not* require In-App Purchase. Do not add any digital-only unlockable, or
   Apple will demand IAP.
6. **Push permission timing.** The apps ask only after sign-in, which is the
   behaviour Apple prefers — keep it that way.

---

## 11. Shipping updates later

```bash
# JS-only change (copy, styling, bug fix) — no review needed:
eas update --branch production --message "Fix payout label"

# Native change (new native module, permission, icon, SDK bump):
npm run build:ios && npm run submit:ios
```

Over-the-air updates need `expo-updates`, which is **not installed yet**. Add
it with `npx expo install expo-updates` when you want that workflow; until
then every change requires a new build and review.

Bump the user-visible `version` in `app.json` (e.g. `1.0.0` → `1.1.0`) for each
store release. The build number is handled automatically.

---

## Quick reference

```bash
npm install -g eas-cli && eas login

cd AurasureApp
eas init                       # once — writes extra.eas.projectId
eas credentials --platform ios # once — certs, profile, APNs key

npm run build:ios:preview      # device smoke test
npm run build:ios              # store build
npm run submit:ios             # upload to App Store Connect
```

Repeat for `VendorApp` and `RiderApp` — each is a separate App Store listing
with its own bundle id, EAS project and review.
