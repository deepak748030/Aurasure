# Aurasure Platform Design Docs

Design-only. **No code in here is built yet** — this folder is the blueprint we agreed to write
before the Vendor app starts. Everything is grounded in what the repo actually contains today
(`AurasureApp/` = customer app, `server/` = Express + MongoDB API), and every proposed change is
marked as such.

| # | Doc | What it answers |
| --- | --- | --- |
| 01 | [System architecture](./01-system-architecture.md) | How the 4 clients, the API, and the outside world connect. Context, container, deployment and realtime diagrams. |
| 02 | [Data model](./02-data-model.md) | ER diagram, the 9 new collections, and every field to add to existing ones. |
| 03 | [Order lifecycle](./03-order-lifecycle.md) | The two state machines (fulfilment + delivery task), who may move what, and full sequence diagrams. |
| 04 | [**Vendor app**](./04-vendor-app.md) | The one you build next. Personas, every screen, navigation map, API per screen, edge cases, phasing. |
| 05 | [Delivery partner app](./05-delivery-partner-app.md) | Rider app: duty, assignment, location, OTP handover, COD, earnings. |
| 06 | [Admin panel](./06-admin-panel.md) | Web ops console: 14 modules, permission matrix, live ops board. |
| 07 | [API contract](./07-api-contract.md) | Endpoint inventory — what exists today vs what each new client needs. |
| 08 | [Gap analysis](./08-gap-analysis.md) | **Read this first.** Every blocker in the current system, with severity and the fix. |

## The one-paragraph version

Aurasure today is a **single-sided** system: a customer app and an admin console talking to one
Express API. To become a marketplace it needs **three more sides** — a vendor (restaurant/store)
app, a delivery-partner app, and a real web admin panel. The blocker is not UI, it is the domain
model: there is no `Vendor`, no `DeliveryPartner`, orders are not linked to whoever must cook or
carry them, the status enum has no vendor/rider states, and nothing is realtime. Doc 08 lists all
23 of those problems; doc 02 fixes the model; doc 03 fixes the flow; docs 04–06 are the product
specs on top.

## Ground rules used throughout

1. **One backend, one database, four clients.** No microservices. Role-scoped route namespaces
   (`/vendor/*`, `/rider/*`, `/admin/*`) on the existing Express app.
2. **Server is the source of truth for money.** The API already reprices every order line from the
   catalogue (`order.controller.js → verifyAndRepriceItems`) — keep that property everywhere.
3. **Additive migrations.** The customer app in `AurasureApp/` must keep working unchanged while
   the new surfaces land. Doc 03 has the backwards-compatibility status mapping.
4. **Reuse the design system.** Vendor and rider apps are Expo RN like the customer app and share
   `src/theme` + `src/components/ui` through a shared package, so all four surfaces stay on-brand.
5. **Every diagram is Mermaid** (renders on GitHub, diff-able in PRs). The system map is also
   exported to [`diagrams/system-architecture.png`](./diagrams/system-architecture.png).
