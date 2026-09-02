# 01 · System Architecture

![Aurasure system architecture](./diagrams/system-architecture.png)

*Rendered from [`diagrams/render.mjs`](./diagrams/render.mjs). The Mermaid graphs below are the
editable source of truth for detail; the PNG is the cover map.*

## 1.1 Context — who talks to what

Four client surfaces, one API, one database. Today only the two on the left exist.

```mermaid
graph TB
  subgraph EXIST["Exists today"]
    CUST["📱 Customer App<br/><i>AurasureApp/ · Expo RN</i><br/>browse · cart · order · track"]
    ADMINAPP["🛠 In-app Admin Console<br/><i>AurasureApp/src/screens/admin</i><br/>orders + partner approvals"]
  end

  subgraph NEW["To be built"]
    VEND["🏪 Vendor App<br/><i>Expo RN</i><br/>accept · cook · ready · payouts"]
    RIDER["🛵 Delivery Partner App<br/><i>Expo RN</i><br/>duty · pickup · drop · earnings"]
    ADMINWEB["💻 Admin Panel<br/><i>Next.js web</i><br/>full marketplace ops"]
  end

  API["⚙️ Aurasure API<br/><i>server/ · Express + Mongoose</i><br/>REST /api/v1 + Socket.IO"]
  DB[("🗄 MongoDB")]

  CUST     -->|JWT customer| API
  ADMINAPP -->|JWT admin| API
  VEND     -->|JWT vendor| API
  RIDER    -->|JWT rider| API
  ADMINWEB -->|JWT admin/support| API
  API --> DB

  API -.->|push| FCM["Expo Push → FCM / APNs"]
  API -.->|OTP SMS| SMS["SMS gateway"]
  API -.->|payments + payouts| PAY["Payment gateway<br/>Razorpay / PhonePe"]
  API -.->|images| CDN["Object storage + CDN<br/>S3 / Cloudinary"]
  RIDER -.->|directions| MAPS["Maps SDK"]
  CUST -.->|live rider pin| MAPS

  classDef exist fill:#EEF1FF,stroke:#5B46E5,color:#141033
  classDef new fill:#FFF1EC,stroke:#F2542A,color:#141033
  classDef infra fill:#F1F3F9,stroke:#8B93A7,color:#141033
  class CUST,ADMINAPP exist
  class VEND,RIDER,ADMINWEB new
  class API,DB,FCM,SMS,PAY,CDN,MAPS infra
```

> **Decision — why the admin panel moves to web.** The in-app console (added in PR #8) is fine for
> a founder checking orders on a phone. Real ops (catalogue moderation, payout runs, dispute
> handling, CSV exports, multi-window live board) need a keyboard, a big screen and printing. Keep
> the in-app console as a **read-only mobile view**; build the operational panel as a web app.

## 1.2 Containers — inside the API

```mermaid
graph LR
  subgraph CLIENTS["Clients"]
    C1["Customer"]
    C2["Vendor"]
    C3["Rider"]
    C4["Admin"]
  end

  subgraph EDGE["Edge middleware · app.js"]
    MW["helmet · cors · compression<br/>rate-limit · json body<br/>morgan logging"]
  end

  subgraph AUTH["Auth layer · middlewares/auth.js"]
    JWT["authenticate() → req.user"]
    ROLE["requireRole(...roles)"]
    SCOPE["<b>NEW</b> requireVendorScope()<br/>vendor may only touch own data"]
  end

  subgraph ROUTES["Route namespaces · routes/index.js"]
    R1["/auth /users /food /shop<br/>/banners /search /orders"]
    R2["<b>NEW</b> /vendor/*"]
    R3["<b>NEW</b> /rider/*"]
    R4["/admin/* <i>(extend)</i>"]
  end

  subgraph DOMAIN["Domain services <b>(NEW layer)</b>"]
    S1["OrderService<br/>place · split · reprice"]
    S2["FulfilmentService<br/>accept/reject · ready"]
    S3["DispatchService<br/>rider matching · offers"]
    S4["LedgerService<br/>wallet · loyalty · <b>payouts</b>"]
    S5["NotifyService<br/>push · SMS · socket"]
  end

  subgraph DATA["Data"]
    MONGO[("MongoDB")]
    REDIS[("<b>NEW</b> Redis<br/>offer locks · rider geo<br/>socket adapter")]
  end

  RT["<b>NEW</b> Socket.IO gateway<br/>rooms: order:id · vendor:id<br/>rider:id · admin"]

  C1 & C2 & C3 & C4 --> MW --> JWT --> ROLE --> SCOPE --> R1 & R2 & R3 & R4
  R1 & R2 & R3 & R4 --> S1 & S2 & S3 & S4
  S1 & S2 & S3 & S4 --> MONGO
  S3 --> REDIS
  S1 & S2 & S3 & S4 --> S5 --> RT
  RT -.->|live events| C1 & C2 & C3 & C4

  classDef new fill:#FFF1EC,stroke:#F2542A
  class SCOPE,R2,R3,S1,S2,S3,S4,S5,REDIS,RT new
```

**What is genuinely new:** a thin service layer (controllers today hold the logic — fine for one
client, unmanageable across four), a dispatch engine, a payout ledger, and a realtime gateway.
Everything else is the existing Express app extended.

## 1.3 Realtime — who subscribes to which room

Polling is what the customer app does today. With three operational clients it stops being viable:
a vendor must hear a new order within ~2 seconds, and a customer expects the rider pin to move.

```mermaid
graph TB
  EV["Domain event<br/>e.g. ORDER_ACCEPTED"]
  HUB["Socket.IO<br/>+ Redis adapter"]
  EV --> HUB

  HUB -->|room order:ORD123| CU["Customer<br/>timeline + rider pin"]
  HUB -->|room vendor:VEN9| VE["Vendor<br/>order board refresh"]
  HUB -->|room rider:RID4| RI["Rider<br/>task offer + status"]
  HUB -->|room admin:ops| AD["Admin<br/>live ops board"]
  HUB -.->|client offline| PUSH["Expo Push fallback<br/>+ SMS for critical"]
```

| Event | order room | vendor room | rider room | admin room | Push? |
| --- | :-: | :-: | :-: | :-: | --- |
| `order.placed` | ✓ | ✓ | – | ✓ | Vendor: **loud alert** |
| `order.accepted` / `rejected` | ✓ | ✓ | – | ✓ | Customer |
| `order.ready` | ✓ | ✓ | ✓ | ✓ | Rider |
| `dispatch.offer` | – | – | ✓ | ✓ | Rider: **loud alert, 30 s TTL** |
| `dispatch.assigned` | ✓ | ✓ | ✓ | ✓ | Customer + Vendor |
| `rider.location` (throttled 5 s) | ✓ | – | – | ✓ | no |
| `order.delivered` | ✓ | ✓ | ✓ | ✓ | Customer |
| `payout.settled` | – | ✓ | ✓ | ✓ | Vendor / Rider |

**Fallback rule:** every screen that consumes a socket event must also work on a 15 s poll of the
same REST endpoint. Sockets are an optimisation, never the only path — that keeps the apps usable
on flaky Indian mobile networks.

## 1.4 Repository layout (proposed)

```
Aurasure/
├─ AurasureApp/          customer app          (exists)
├─ VendorApp/            NEW · Expo RN
├─ RiderApp/             NEW · Expo RN
├─ admin-web/            NEW · Next.js
├─ packages/
│  ├─ ui/                NEW · shared theme + components, extracted from AurasureApp
│  └─ api-client/        NEW · typed fetch layer + shared DTO types
├─ server/               API                   (exists)
└─ docs/                 this folder
```

> **Decision — separate binaries, shared design system.** One app with a role switch is tempting
> but wrong: store listings, permissions, app size, review cycles and crash budgets all differ per
> audience, and a rider must never be one toggle away from vendor data. Share `packages/ui` so the
> brand (doc: `AurasureApp/README.md` → Brand assets) stays identical across all four surfaces.

## 1.5 Environments & deployment

```mermaid
graph LR
  subgraph DEV["dev"]
    D1["Expo Go / dev client"] --> D2["localhost:4000"] --> D3[("local Mongo")]
  end
  subgraph STG["staging"]
    S1["EAS internal build"] --> S2["api-stg.aurasure.in"] --> S3[("Atlas stg")]
  end
  subgraph PRD["production"]
    P1["Play Store / App Store"] --> P2["api.aurasure.in<br/>2+ instances behind LB"] --> P3[("Atlas prod<br/>replica set")]
    P2 --> P4[("Redis")]
    P2 --> P5["S3 + CDN"]
  end
  STG -.->|promote build| PRD
```

Non-negotiables before production: sticky sessions **or** the Redis Socket.IO adapter (multi
instance breaks rooms otherwise), Atlas backups + point-in-time restore, structured JSON logs with
a request id, Sentry in all four clients, and a health check per instance (`/api/v1/health`
already exists).
