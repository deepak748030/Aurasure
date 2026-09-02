# Aurasure Admin

Next.js (App Router) admin console for the Aurasure super-app. It talks to the
existing Node.js/Express API in [`../server`](../server) — the same JWT, the
same `/api/v1` contract, the same MongoDB collections the Expo app in
[`../AurasureApp`](../AurasureApp) reads.

```
Aurasure/
├── AurasureApp/   Expo mobile app        (untouched)
├── server/        Node.js + Express API  (additive changes only)
└── admin/         ← this Next.js panel
```

---

## 1. Run it

```bash
# 1 · API (terminal 1)
cd server
cp .env.example .env          # point MONGODB_URI at your MongoDB
npm install
npm run seed                  # seeds catalogue + the admin account
npm run dev                   # http://localhost:5000

# 2 · Admin panel (terminal 2)
cd admin
cp .env.example .env.local    # ADMIN_API_URL=http://127.0.0.1:5000
npm install
npm run dev                   # http://localhost:3000
```

Sign in with the seeded platform admin:

| Phone        | Password         |
| ------------ | ---------------- |
| `8888888888` | `admin@aurasure` |

Only accounts with `role: "admin"` can sign in — anything else is rejected at
the login screen.

### No MongoDB handy?

```bash
npm run dev:mock   # in admin/, serves the same API contract on :5000 from memory
```

`scripts/dev-mock-api.mjs` is a **development-only** stand-in that mirrors every
endpoint the panel uses so you can work on the UI without a database. It never
imports anything from `server/`. For real data, always point `ADMIN_API_URL` at
the actual Express server.

---

## 2. How it connects

The browser never calls the API host directly:

```
browser → /api/backend/admin/orders   (same origin)
        → next.config.mjs rewrite
        → $ADMIN_API_URL/api/v1/admin/orders
```

That means zero CORS configuration, and the panel works unchanged behind any
proxy, tunnel or preview host. The bearer token lives in `localStorage` and is
attached by `src/lib/api.ts`; a `401` clears it and bounces you to `/login`.

| Env var                 | Default                 | Purpose                            |
| ----------------------- | ----------------------- | ---------------------------------- |
| `ADMIN_API_URL`         | `http://127.0.0.1:5000` | Base URL of the Node API           |
| `NEXT_PUBLIC_ADMIN_ENV` | `development`           | Label shown in the sidebar footer  |

---

## 3. Features

| Area | Screen | What it does |
| --- | --- | --- |
| Overview | **Dashboard** | Revenue / live orders / customers / pending KYC KPIs, 14-day revenue chart, module + status splits, recent orders, catalogue counters |
| Overview | **Live Ops board** | Kanban of the four live lanes (New → Accepted → Preparing → On the way), age timers, an attention lane for orders past their expected time, one-click advance and cancel, 15 s auto-refresh |
| Orders | **Order management** | Status tabs (Pending / Accepted / Processing / On the way / Delivered / Cancelled), module filter, text search, pagination, CSV export, inline advance & cancel |
| Orders | **Order detail** | Fulfilment timeline, line items with images, bill breakdown, customer card, payment & rewards, instructions, force actions |
| Food | **Restaurants** | Full CRUD + category/status filters, ratings, delivery config, open/closed |
| Food | **Food items** | Full CRUD, restaurant + diet filters, price/MRP, bestseller / popular / special flags |
| Food | **Food categories** | Full CRUD, icon and sort order |
| Food | **Collections** | Curated "vibes" CRUD incl. card colours |
| Shop | **Stores** | Full CRUD, city/category filters, delivery config |
| Shop | **Products** | Full CRUD, store / category / stock filters, colours, sizes, highlight flags |
| Shop | **Shop categories** | Full CRUD, tagline, icon, sort order |
| Promotions | **Banners** | Full CRUD, module + visibility filters, live preview of the artwork |
| Promotions | **Promo codes** | Create discount campaigns (flat ₹ / %, caps, min order, validity window, total + per-customer limits), status filters, and **Issue** them to all or hand-picked customers |
| Everywhere | **Image upload** | Click or drag-and-drop a file in any catalogue form — it is uploaded to *our own* Node server (multer, disk storage), with progress, preview, replace and delete |
| Users | **Customers** | Search, role filter, lifetime value, masked phone with click-to-reveal, CSV export |
| Users | **Customer profile** | Order history, wallet ledger, loyalty ledger, coupons, addresses, wallet & points adjustment, promote/revoke admin |
| Users | **Partner applications** | Vendor & delivery KYC queue, approve/reject with a reviewer note, CSV export |
| Reports | **Reports & analytics** | 7/14/30/90-day ranges, revenue trend, placed vs cancelled volume, revenue by module, payment mix, status mix, top items, top customers, daily table, CSV export |
| System | **Activity log** | Local trail of every mutating action performed from this browser (the API has no audit collection yet) |
| System | **Settings** | Session card, API/database health, catalogue counters, wiring notes |

Every table exports CSV, every list paginates, every screen has a skeleton
loading state, an empty state and an error state with retry.

### Images

Every `image` / `cover` field in the catalogue forms is a real uploader:

```
pick file → POST /api/backend/admin/uploads (multipart)
          → Next rewrite → API /api/v1/admin/uploads
          → multer writes server/uploads/<yyyy-mm>/<slug>-<rand>.jpg
          → { image: { kind:'uri', uri }, url, path } saved on the record
```

- **No third-party storage.** No S3, no Cloudinary, no external upload API —
  the bytes are written to the API server's own disk and served back by it.
- JPG / PNG / WebP / GIF / AVIF / SVG, 5 MB max, validated on both sides.
- Upload progress, image preview, *Replace* and *Remove* (which also deletes the
  just-uploaded file from disk so no orphans pile up).
- Pasting an external URL is still allowed via *"Use an external URL instead"*.
- The panel proxies `/uploads/*` to the API too, so images are always
  same-origin for the browser while the stored URL stays absolute for the Expo
  app. When a phone must load them, set `PUBLIC_BASE_URL` in `server/.env` to a
  host the device can reach.

---

## 4. Design

- **Solid colours only — no gradients anywhere.** Brand indigo `#5b46e5`
  (matching the mobile app), coral `#ff6a3d` for the Food module, a single ink
  neutral ramp, and semantic success/warning/danger tokens.
- **Typography:** Inter Variable, self-hosted via `@fontsource-variable/inter`
  (no external font CDN at build or runtime), with tabular numerals in every
  table, KPI and money value.
- **Responsive from 320 px up:** off-canvas sidebar with an overlay on phones
  and tablets, a fixed 264 px rail from `lg`; tables become stacked cards below
  `md`; KPI grids collapse 4 → 2 → 1; modals dock to the bottom of the screen on
  phones.
- **Feedback:** skeletons (never spinners on first paint), optimistic-feeling
  toasts, typed confirmation dialogs before anything destructive.
- Tokens live in `src/app/globals.css` under `@theme` (Tailwind CSS v4).

---

## 5. Structure

```
admin/
├── next.config.mjs              rewrite /api/backend/* → $ADMIN_API_URL/api/v1/*
├── scripts/dev-mock-api.mjs     dev-only in-memory API (optional)
└── src/
    ├── app/
    │   ├── login/               sign-in screen
    │   └── (panel)/             authenticated shell + every feature route
    ├── components/
    │   ├── layout/              Sidebar, Topbar
    │   ├── ui/                  Button, Card, Input, DataTable, Modal, Tabs…
    │   ├── resource/            generic CRUD screen shared by all 8 catalogue pages
    │   └── charts/              Recharts wrappers
    └── lib/                     api client, auth, react-query hooks, formatters
```

---

## 6. Server changes

The panel needed a few read/write endpoints that did not exist yet. They were
added **additively** — no existing route, controller or model was modified:

- `server/src/controllers/adminCatalog.controller.js` *(new)* — catalogue CRUD,
  customers, wallet/loyalty adjustments, reports, lookups, system info.
- `server/src/models/Promo.js` + `server/src/controllers/promo.controller.js`
  *(new)* — promo-code campaigns, issuing to customers, customer self-claim.
- `server/src/middlewares/upload.js` + `server/src/controllers/upload.controller.js`
  *(new)* — multer disk storage, type/size validation, delete endpoint.
- `server/src/routes/admin.routes.js` *(extended)* — mounts the above under the
  existing `authenticate() + requireRole('admin')` guard.
- `server/src/app.js` *(extended)* — serves `/uploads` as static files.
- `server/src/config/env.js` + `.env.example` *(extended)* — upload settings.

Everything else in `server/` and all of `AurasureApp/` is untouched.

---

## 7. Scripts

| Command            | What it does                                  |
| ------------------ | --------------------------------------------- |
| `npm run dev`      | Dev server on `0.0.0.0:3000`                  |
| `npm run build`    | Production build                              |
| `npm start`        | Serve the production build                    |
| `npm run typecheck`| `tsc --noEmit`                                |
| `npm run dev:mock` | Dev-only in-memory API on `:5000`             |
