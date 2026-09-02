# Aurasure Rider

Expo app for Aurasure delivery partners. Built on the same navigation, theme and
API conventions as VendorApp/AurasureApp, but scoped to the DeliveryPartner
profile and the /rider API:

- register / login with a phone + password (one phone = one role)
- KYC onboarding (personal, vehicle, bank, documents, training)
- go online / offline, receive and accept nearby delivery offers
- pickup OTP, drop OTP, POD photo, trip failure / SOS
- earnings + COD deposits + incentives
- pending-state screens for submitted / needs_info / suspended / rejected

Configure `EXPO_PUBLIC_API_URL` in `.env` before running.

```bash
cp .env.example .env
npm install
npm run web
```
