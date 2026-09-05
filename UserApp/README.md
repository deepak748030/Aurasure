# Aurasure — User app (Expo)

The customer app of the Aurasure super-app: **food ordering** and **daily-needs
shopping** in one install, built from scratch in Expo React Native and wired to
the repo's own Node.js/Express/MongoDB API in [`../server`](../server).

The interface follows the `Aurasure-V3.7-Mart-UI-UX` reference (Flutter) screen
for screen — same order, same components, same micro-interactions — rebuilt as
RN primitives.

```bash
npm install
cp .env.example .env        # then set EXPO_PUBLIC_API_URL (see below)
npm run api                 # starts ../server on :5000 (needs MongoDB)
npm run seed                # demo stores, menus, banners, coupons, demo user
npm start                   # Expo: press w / a / i
```

`EXPO_PUBLIC_API_URL` is the only required setting.

| Running from            | Use                                             |
| ----------------------- | ----------------------------------------------- |
| Web in this sandbox     | `https://5000-<sandboxId>.e2b.app`               |
| Web on your machine     | `http://localhost:5000`                          |
| Android emulator        | `http://10.0.2.2:5000`                           |
| Real phone (Expo Go)    | `http://<your-lan-ip>:5000`                      |

`npm run check` runs three gates (start `npm run api` first, or export
`EXPO_PUBLIC_API_URL` at the command line — the last two scripts need a running
API):

1. `tsc --noEmit` over the whole app (strict + `noUncheckedIndexedAccess`).
2. `scripts/api-contract-check.mjs` — every path in `src/api/*.ts` is requested
   against a live API and must not 404 and must answer with the
   `{ success, data, meta? }` envelope the client unwraps.
3. `scripts/payload-probe.mjs` — the exact bodies the screens post
   (`POST /orders`, addresses, coupons, wallet, loyalty, referral, partner)
   must clear the server's validation layer.

Data needs a real MongoDB: point `MONGODB_URI` in `server/.env` at a local
`mongod` or an Atlas URI, run `npm run seed`, and the same screens render live
stores, menus and orders. Without a database the API answers
`503 Database is not connected yet`, which the app shows as an inline retry
card — never an `alert()`.

---

## Screens

| Flow | Screens |
| --- | --- |
| First run | `Splash` (health-aware) → `Onboarding` (3 pages, swipe, skip) → `ModulePick` (Food / Shop) → `Location` (permission, city chips, saved addresses) |
| Account | `Auth` (phone+password login/register, one-tap demo), `Profile`, `EditProfile`, `Settings`, `Notifications`, `Help`, `Policy` (cancellation · refund · privacy · terms) |
| Food | `HomeFood` (12 rails in the reference order), `Outlet`, `ItemDetail`, `Category`, `Vibe`, `SeeAll`, `Search` |
| Shop | `HomeShop` (flash sale · brands · trending), plus the same detail/list screens in shop mode |
| Ordering | `Cart`, `Checkout` (address · slot · coupon · tip · instructions · pay method), `OrderSuccess`, `Orders`, `OrderDetail`, `TrackOrder` |
| Rewards | `Wallet` (top-up + ledger), `Loyalty` (points, tiers, redeem), `Coupons` (claim + apply), `ReferEarn` |
| Tabs | Home · Saved · **[cart FAB]** · Orders · Menu — the floating pill bar from the reference |

Server features per screen are real, not stubbed: orders are created with
`POST /orders` (201 → `order` + wallet balance + points), cancelled with
`PATCH /orders/:id/status`, favourites with `PUT /users/me/favorites`,
addresses with the `/users/me/addresses` CRUD, wallet/loyalty/coupons/referral
with their endpoints. Bearer tokens live in AsyncStorage; a 401 clears them and
`Auth` can be re-opened without losing the cart.

## Design rules the whole app obeys

* **4px gutter** on the left/right of every screen (`spacing.edge`) — the
  reference app's edge padding, applied without exception.
* **0 vertical gap between list items**: rows are full-bleed and separated by a
  1px hairline, so the list reads as one surface (`ItemRow`, `ListRow`,
  `OutletList`, `OrderCard`).
* **0 gap and 0 radius on map + media surfaces** (`FlushSurface`,
  `radius.flush`) — `TrackOrder`, `ItemDetail` hero, `Outlet` hero, `Cart`
  summary, `Location`.
* **No `alert()` anywhere.** `SheetProvider` renders one bottom-anchored modal
  used for info/success/error/warning, confirms, action sheets, option pickers
  (delivery instructions, unavailable-item preference, cancel reason, add-money
  amount, wallet payment) — always sliding up from the bottom edge.
* **Skeletons, never spinners** — `SkeletonHero`/`Rail`/`List`/`Card` per
  surface, with `useMinDuration` so a fast reply doesn't flash.
* **One icon source** — `src/lib/icons.tsx` maps a semantic name to
  Material Community Icons, filled for the active state, outline otherwise.
* Deep-plum brand palette with a full dark variant (`ThemeContext`), light or
  dark status bar and Android navigation bar follow it.

## Structure

```
src/
  api/        client.ts (envelope, timeout, auth, cache) + catalog/orders/rewards/account
  components/ ui/ (Text, Button, Input, Screen, Sheet, Skeleton, Primitives, …)
              cards/ list/ outlets/ orders/ rewards/ home/ map/ item/ sheet/
  context/    SessionContext (auth, module, address, favourites, location)
              CartContext (per-module cart, coupon, slot, tip, instructions)
  hooks/      useQuery / usePaginated (abort + retry + offline), useCartActions
  lib/        icons, format (money/rating/relative/tiers), storage, haptics
  navigation/ types (route table), FloatingTabBar, TabNavigator, RootNavigator
  screens/    34 screens
  theme/      tokens (spacing/radius/motion/feedback), palette, ThemeContext
  types/      1:1 mirror of the API's Mongoose shapes
```

### Deliberate omissions (nothing is faked)

The reference zip's vendor/driver-only and unbuilt features are left out
because the API has no endpoints for them: parcel/trip/taxi modules, live chat
and in-app calls, push notifications, product reviews and ratings write,
multi-language switch, forgot-password/reset, card and UPI gateway payment.
Where the reference had one of these, the app shows a plain, designed state
saying so instead of a dead button.
