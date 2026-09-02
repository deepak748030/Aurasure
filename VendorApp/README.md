# Aurasure Vendor

Expo app for kitchens and shops.

- One Indian mobile number → one vendor → one module (`food` or `shop`). Locked at signup.
- KYC documents must be **individually verified** in the admin panel before the outlet goes live.
- Delivery partners are a **separate** collection / future app — this phone cannot be a second vendor.

## Run

```bash
cd VendorApp
npm install
EXPO_PUBLIC_API_URL=http://YOUR_API:5000 npx expo start --web
```

Demo seed (after `npm run seed` in `server/`):

- phone `7777777777`
- password `vendor@123`
- module food, status `submitted` (approve in Admin → Vendors KYC)
