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
