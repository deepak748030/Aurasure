# 07 · API Contract

Base URL: `/api/v1`. Envelope is already standardised by `server/src/utils/response.js`
(`{ success, data, meta }` / `{ success, error: { code, message } }`) — every new endpoint keeps it.

## 7.1 What exists today

Read from `server/src/routes/`:

| Namespace | Endpoints | Guard |
| --- | --- | --- |
| `/health` | `GET` | none |
| `/auth` | `POST /register`, `POST /login` (+ `/me` style helpers) | `requireDb` |
| `/users` | `GET/PUT /me`, addresses CRUD, favorites, wallet, loyalty, coupons, referral, `POST /me/partner-application` | `authenticate()` |
| `/food` | categories, vibes, restaurants, items | public |
| `/shop` | categories, stores, products | public |
| `/banners`, `/search` | list / query | public |
| `/orders` | `POST /`, `GET /`, `GET /:id`, `PATCH /:id/status` (cancel only) | `authenticate()` |
| `/admin` | `GET /stats`, `GET /orders`, `PATCH /orders/:id/status`, `GET /partners`, `PATCH /partners/:userId` | `authenticate() + requireRole('admin')` |
| `/stats` | dev counts | `requireDb` |

Strengths worth preserving: server-side repricing (`verifyAndRepriceItems`), server-side coupon
resolution, wallet/loyalty ledgers with reversal on cancel, and a forward-only status guard.

## 7.2 New namespaces

### `/auth` additions

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/auth/otp/request` | `{ phone, audience: customer\|vendor\|rider }`, rate-limited 3/10 min/number |
| POST | `/auth/otp/verify` | → `{ accessToken (15 m), refreshToken (30 d), user, scope }` |
| POST | `/auth/refresh` | rotating refresh tokens, reuse detection |
| POST | `/auth/logout` | revoke the refresh token + drop the push token |

> The customer app logs in with phone + password today. OTP is added alongside, not instead —
> vendor and rider are OTP-only.

### `/vendor/*` — `requireRole('vendor','vendor_staff') + requireVendorScope()`

```
GET    /vendor/me                       vendor + outlets + permissions + open state
GET    /vendor/onboarding               draft KYC
PATCH  /vendor/onboarding               partial save
POST   /vendor/documents                { type } → signed upload URL + confirm
GET    /vendor/orders                   ?status=new|preparing|ready|completed&outletId=&page=
GET    /vendor/orders/:id
POST   /vendor/orders/:id/accept        { prepMins }
POST   /vendor/orders/:id/reject        { reason, note? }
POST   /vendor/orders/:id/partial-accept{ removeLineIds[] }
POST   /vendor/orders/:id/ready
GET    /vendor/items                    ?q=&status=&categoryId=
POST   /vendor/items                    → approvalStatus: pending
PATCH  /vendor/items/:id
PATCH  /vendor/items/:id/availability   { isAvailable, until? }
POST   /vendor/items/bulk               { ids[], op: price|availability|category }
PATCH  /vendor/outlets/:id              hours, geo pin, avgPrepMins
POST   /vendor/outlets/:id/pause        { minutes, reason }
GET    /vendor/stats                    ?range=today|7d|30d
GET    /vendor/payouts                  list + current accrual
GET    /vendor/payouts/:id/statement    CSV / PDF
GET    /vendor/ratings
POST   /vendor/ratings/:id/reply        { text }
GET    /vendor/staff  POST /vendor/staff  DELETE /vendor/staff/:id
POST   /vendor/push-token               { token, platform }
```

### `/rider/*` — `requireRole('rider')`

```
GET    /rider/me
GET    /rider/onboarding      PATCH /rider/onboarding
POST   /rider/documents
POST   /rider/duty                      { state: online|offline|break }
POST   /rider/location/batch            [{ lat, lng, at, accuracy, speed }]
GET    /rider/tasks/active
POST   /rider/offers/:id/accept         409 OFFER_TAKEN if lost the race
POST   /rider/offers/:id/reject         { reason? }
POST   /rider/tasks/:id/arrived-pickup
POST   /rider/tasks/:id/pickup          { otp }
POST   /rider/tasks/:id/arrived-drop
POST   /rider/tasks/:id/deliver         { otp, podUrl?, codCollectedPaise }
POST   /rider/tasks/:id/fail            { reason, note }
GET    /rider/tasks                     ?from=&to=
GET    /rider/earnings                  ?range=
GET    /rider/payouts
POST   /rider/cod/deposit               { amountPaise, method, refId }
GET    /rider/incentives
POST   /rider/sos                       { lat, lng, type }
POST   /rider/push-token
```

### `/admin/*` additions

```
GET    /admin/ops/board                 live buckets + attention lane
GET    /admin/ops/map                   riders + open orders (geo)
POST   /admin/orders/:id/assign         { riderId }        manual dispatch
POST   /admin/orders/:id/refund         { amountPaise, reason }
GET    /admin/vendors                   ?status=&q=
GET    /admin/vendors/:id               profile + docs + scorecard
POST   /admin/vendors/:id/decision      { decision, notes, perDocument[] }
PATCH  /admin/vendors/:id               commission, payout cycle, suspend
GET    /admin/catalogue/pending         moderation queue
POST   /admin/catalogue/:id/decision    { decision, reason }
GET    /admin/riders                    ?dutyState=&zoneId=
POST   /admin/riders/:id/decision
GET    /admin/customers/:id             profile + orders + wallet
POST   /admin/customers/:id/wallet      { amountPaise, reason }   audit-logged
GET    /admin/payouts   POST /admin/payouts/run   POST /admin/payouts/:id/approve
GET    /admin/reports/:name             ?range= (sales, commission, gst, cod, sla)
GET    /admin/audit                     ?actor=&action=&from=
GET/POST /admin/zones                   polygons + fee rules
GET/POST /admin/staff                   roles + permissions
```

## 7.3 Cross-cutting conventions

| Concern | Rule |
| --- | --- |
| **Idempotency** | Every non-GET that creates money movement accepts `Idempotency-Key`; the server stores key → response for 24 h. |
| **Errors** | Keep the existing `ApiError` codes and add: `OFFER_TAKEN`, `OTP_INVALID`, `SCOPE_DENIED`, `KYC_PENDING`, `OUTLET_CLOSED`, `COD_LIMIT_EXCEEDED`, `STALE_STATE`. |
| **Optimistic concurrency** | Status mutations send the expected current state; a mismatch returns `409 STALE_STATE` with the fresh order. Stops two staff double-accepting. |
| **Pagination** | Reuse `paginate()` / `listMeta()` from `utils/response.js` everywhere. |
| **Rate limits** | Per role, not just global: OTP 3/10 min, location batch 12/min, vendor mutations 60/min. |
| **Versioning** | Stay on `/api/v1`; additive only. A breaking change means `/api/v2` mounted beside it. |
| **Time** | All timestamps ISO-8601 UTC; clients render in Asia/Kolkata. Countdown timers use the server's `expiresAt`, never the device clock. |
| **Uploads** | Never proxy binaries through the API — issue signed URLs, client uploads to S3, then confirms. |

## 7.4 Socket contract

```
namespace: /realtime      auth: JWT in the handshake
rooms: order:{orderId} · vendor:{vendorId} · rider:{riderId} · admin:ops

server → client
  order.placed · order.accepted · order.rejected · order.ready
  order.picked_up · order.delivered · order.cancelled
  dispatch.offer · dispatch.assigned · dispatch.reassigned
  rider.location · payout.settled · announcement

client → server
  subscribe { rooms[] }       // server re-validates scope, never trusts the room name
  ack { eventId }             // at-least-once delivery, client dedupes on eventId
```

Every event carries `{ eventId, type, at, orderId?, version }`. Clients treat sockets as hints and
re-fetch the resource — that keeps a dropped event from corrupting the UI.
