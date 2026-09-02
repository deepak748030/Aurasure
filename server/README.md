# Aurasure API Server

Node.js + Express + MongoDB (Mongoose) backend for the **Aurasure** super-app —
Food + E-commerce. This is the **server only**: the mobile app is not wired to
it yet; it is built so integration later is a drop-in (same entity ids, same
`ImageRef` shape the app already uses).

## Stack

- **Node.js** ≥ 18 (verified on 22)
- **Express 4**
- **MongoDB 7 + Mongoose 8**
- JWT auth (`jsonwebtoken` + `bcryptjs`)
- `helmet`, `cors`, `compression`, `morgan`, `express-rate-limit`,
  `express-validator`

## Folder structure

```
server/
├── docker-compose.yml        # local MongoDB (optional)
├── .env.example              # copy to .env and edit
├── src/
│   ├── server.js             # bootstrap: listen + connect + graceful shutdown
│   ├── app.js                # express app (middleware, routes, errors)
│   ├── config/
│   │   ├── env.js            # validated environment config
│   │   └── db.js             # mongoose connection manager (+ events)
│   ├── models/               # User, Restaurant, FoodItem, FoodVibe,
│   │                         # FoodCategory, ShopStore, ShopCategory,
│   │                         # Product, Banner, Order
│   ├── controllers/          # request handlers per domain
│   ├── routes/               # express routers (v1)
│   ├── middlewares/          # auth (JWT), requireDb, validate, error handler
│   ├── utils/                # ApiError, asyncHandler, pagination, response
│   ├── seed/
│   │   └── data.js           # 1:1 mirror of the app's mock ids + data
│   └── seed.js               # idempotent seeder + demo user
└── scripts/
    ├── check-syntax.js       # `npm run check`
    └── smoke.js              # `npm run smoke` — E2E against a real MongoDB
```

## Quick start

```bash
cd server
cp .env.example .env            # adjust values if needed
npm install

# 1) Point MongoDB at your database
#    MongoDB Atlas → paste your connection string into server/.env as MONGODB_URI
#    (the server ALWAYS uses MONGODB_URI — no in-memory MongoDB is used anywhere)
#    or, for local dev only: docker compose up -d mongo

# 2) Seed the database
npm run seed                    # idempotent upsert
# npm run seed:fresh            # wipe + reseed (dev only)

# 3) Run the server
npm run dev                     # watch mode (restarts on change)
npm start                       # plain start
```

Server boots **even without MongoDB**: `/api/v1/health` stays reachable,
data routes answer `503 DB_DISCONNECTED` until the database comes up
(the mongoose driver keeps retrying, no restart needed).

## Environment variables

See `.env.example`:

| Key | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | HTTP port |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/aurasure` | Mongo connection — set this to your **MongoDB Atlas** connection string (e.g. `mongodb+srv://...`). The server never falls back to an in-memory DB. |
| `SMOKE_MONGODB_URI` | *(none)* | optional test-DB override for `npm run smoke`. Must be an explicit real MongoDB (e.g. an Atlas test DB); the built-in localhost default is not used by the smoke test. |
| `JWT_SECRET` | dev-only placeholder | **set a strong secret in prod** |
| `JWT_EXPIRES_IN` | `7d` | token lifetime |
| `BCRYPT_ROUNDS` | `10` | password hashing cost |
| `CORS_ORIGIN` | `*` | comma-separated origins, `*` = any |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | `900000` / `200` | basic rate limit |
| `UPLOAD_DIR` | `server/uploads` | where multer writes uploaded images (git-ignored) |
| `UPLOAD_PUBLIC_PATH` | `/uploads` | URL prefix the images are served from |
| `UPLOAD_MAX_FILE_SIZE_MB` | `5` | per-image size limit |
| `UPLOAD_MAX_FILES` | `10` | files per bulk upload |
| `PUBLIC_BASE_URL` | *(empty)* | absolute base URL baked into stored image links. Empty = use the request host (fine locally); set it in prod / when a phone must reach the images, e.g. `http://192.168.1.5:5000` |

## API

Base URL: `http://localhost:5000/api/v1`
Success envelope: `{ "success": true, "data": ..., "meta": { page, limit, total, totalPages }? }`
Error envelope: `{ "success": false, "error": { code, message, details? } }`

### Health & meta
| Method | Route | Notes |
| --- | --- | --- |
| GET | `/health` | always up; reports db status |
| GET | `/stats` | collection counts |

### Food
| Method | Route | Notes |
| --- | --- | --- |
| GET | `/food/categories` | image category circles |
| GET | `/food/vibes` | "Just for You" tiles |
| GET | `/food/vibes/:id/items` | items of a collection |
| GET | `/food/restaurants` | `?category=&filter=all\|new\|popular\|top&q=&page=&limit=` |
| GET | `/food/restaurants/:id` | restaurant + its items |
| GET | `/food/restaurants/:id/items` | items only |
| GET | `/food/items` | `?category=&popular=&special=&bestseller=&vibeId=&q=` |
| GET | `/food/items/:id` | single item |
| GET | `/food/popular` | home "Most Popular Items" |
| GET | `/food/offers` | home "Special Offer" |
| GET | `/food/new-stores` | "New on Aurasure" rail |

### Shop
| Method | Route | Notes |
| --- | --- | --- |
| GET | `/shop/categories` | |
| GET | `/shop/categories/:id` | + itemCount |
| GET | `/shop/categories/:id/products` | e.g. all sunglasses |
| GET | `/shop/stores` | `?recommended=&niche=&popular=&city=&q=&page=&limit=` |
| GET | `/shop/stores/:id` | store + its products |
| GET | `/shop/stores/:id/products` | products only |
| GET | `/shop/products` | `?category=&store=&trending=&special=&new=&q=` |
| GET | `/shop/products/:id` | |
| GET | `/shop/popular` | home "Most popular products" |
| GET | `/shop/offers` | home "Special offers" |

### Banners / Search
| Method | Route | Notes |
| --- | --- | --- |
| GET | `/banners?module=food\|shop` | active banners (+ target) |
| GET | `/search?q=&module=food\|shop` | dishes+restaurants / products+stores |

### Auth & users
| Method | Route | Notes |
| --- | --- | --- |
| POST | `/auth/register` | `{ name, phone, password, email? }` |
| POST | `/auth/login` | `{ phone, password }` → `{ user, token }` |
| GET | `/auth/me` | bearer token |
| GET/PUT | `/users/me` | profile |
| POST/PUT/DELETE | `/users/me/addresses[/:addressId]` | saved addresses |
| GET/PUT | `/users/me/favorites` | likes per module (`{ module, refId }`) |

### Admin console (auth, `role: admin`)
| Method | Route | Notes |
| --- | --- | --- |
| GET | `/admin/stats` | headline counters |
| GET | `/admin/orders` | `?module=&status=&page=&limit=` |
| GET | `/admin/orders/:id` | one order + customer |
| PATCH | `/admin/orders/:id/status` | forward-only advance, or cancel + refund |
| GET/PATCH | `/admin/partners`, `/admin/partners/:userId` | vendor / delivery KYC |
| GET | `/admin/customers`, `/admin/customers/:id` | list + full profile |
| POST | `/admin/customers/:id/wallet`, `/admin/customers/:id/loyalty` | ledger adjustments |
| PATCH | `/admin/customers/:id` | promote / demote admin |
| GET | `/admin/reports/overview` | `?days=` charts data |
| GET | `/admin/lookups`, `/admin/system` | dropdown data, runtime info |
| GET/POST/PUT/PATCH/DELETE | `/admin/food/categories`, `/admin/food/vibes`, `/admin/food/restaurants`, `/admin/food/items`, `/admin/shop/categories`, `/admin/shop/stores`, `/admin/shop/products`, `/admin/banners` | catalogue CRUD |

### Image uploads (auth, `role: admin`)

Images are stored **on this server** with [multer](https://github.com/expressjs/multer)
— no S3, Cloudinary or any third-party service. Files land in
`UPLOAD_DIR/<yyyy-mm>/<slug>-<random>.<ext>` and are served back as static
files from `UPLOAD_PUBLIC_PATH`.

| Method | Route | Notes |
| --- | --- | --- |
| POST | `/admin/uploads` | multipart field `image` → `{ image: { kind:'uri', uri }, url, path, file, size, mimeType }` |
| POST | `/admin/uploads/bulk` | multipart field `images` (up to `UPLOAD_MAX_FILES`) |
| DELETE | `/admin/uploads/:bucket/:file` | removes a stored file (path-traversal safe) |
| GET | `/uploads/<bucket>/<file>` | the static image itself (cached 30 days) |

Accepted types: JPEG, PNG, WebP, GIF, AVIF, SVG. Oversized files fail with
`FILE_TOO_LARGE`, anything else with `UNSUPPORTED_FILE_TYPE`. The returned
`image` object is exactly the `ImageRef` shape the mobile app already renders,
so it can be saved straight onto a restaurant `cover`, product `image`, banner
`image`, and so on.

```bash
curl -X POST http://localhost:5000/api/v1/admin/uploads \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@./burger.jpg"
```

### Orders (auth)
| Method | Route | Notes |
| --- | --- | --- |
| POST | `/orders` | place order (totals recomputed server-side) |
| GET | `/orders` | `?module=&status=&page=&limit=` |
| GET | `/orders/:id` | detail |
| PATCH | `/orders/:id/status` | cancel (placed/confirmed only) |

### Examples

```bash
# health
curl http://localhost:5000/api/v1/health

# food home data
curl "http://localhost:5000/api/v1/food/restaurants?filter=popular"
curl http://localhost:5000/api/v1/food/offers

# shop data
curl http://localhost:5000/api/v1/shop/stores?recommended=true
curl http://localhost:5000/api/v1/shop/categories/sc_sunglasses/products

# auth
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","password":"aurasure123"}'
```

## Demo user

Seeded automatically: **phone `9876543210` / password `aurasure123`**
(override with `SEED_USER_PHONE` / `SEED_USER_PASSWORD`).

## Connect the app later (not done yet)

- The API returns `ImageRef`-shaped images (`{ kind: 'uri', uri }` or `null`)
  exactly like the app's `types/index.ts` - a small fetch layer can pass them
  straight to `SmartImage`.
- Entity ids (`p10`, `r_aurora`, `s_solace`, `f27`...) match the app's mock
  data, so routes like `Product { productId }` keep working unchanged.
- The Expo app can call `http://<host>:5000/api/v1` with CORS already open
  for the preview host.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | watch mode |
| `npm start` | run |
| `npm run seed` | upsert seed data |
| `npm run seed:fresh` | wipe + reseed |
| `npm run check` | syntax-check all source files |
| `npm run smoke` | E2E smoke test against a real MongoDB (set `SMOKE_MONGODB_URI`, or it uses `MONGODB_URI` from `.env`). **No in-memory MongoDB** — a missing URI fails fast with instructions. |
