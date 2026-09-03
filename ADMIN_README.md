# ADMIN README — Aurasure Admin Panel (UI Design Guide)

> **Source analyzed:** `aurasureadmin.zip` (48.1 MB compressed / 81.4 MB uncompressed, 3,843 files)
> **Purpose of this document:** Complete, detailed explanation of the UI design of the Aurasure Admin Panel — layout shell, design system, components, every major screen and how screens are wired together.

---

## 1. What This Zip Contains

The zip is the **full source of the Aurasure Admin Panel** — a Laravel 12 multi-tenant e-commerce / on-demand-service admin panel. It includes:

| Layer | Path | What it is |
|---|---|---|
| **Views (UI source)** | `resources/views/` | 594+ Blade templates — the entire UI is built here |
| **Admin layouts** | `resources/views/layouts/admin/` | App shell (`app.blade.php`), sidebars, header, footer, print layout |
| **Admin screens** | `resources/views/admin-views/` | Dashboard, orders, products, stores, users, reports, settings, POS, messages, etc. |
| **Modules (add-ons)** | `Modules/` | `Rental`, `RideShare`, `ReelsModule`, `TaxModule`, `AI`, `Gateways`, `Controller` — each ships its own Blade views + CSS/JS |
| **Backend glue** | `app/`, `routes/`, `config/` | Helpers, controllers, route definitions, module config |
| **Install kit** | `installation/` | Installer, DB seeds (`database.sql`), sample `public.zip` media |

> ⚠️ Note: the compiled admin CSS/JS bundles (`public/assets/admin/css/*` and `js/*`) are **not** shipped inside this zip — they are referenced in the layouts (`theme.minc619.css`, `vendor.min.css`, `custom.css`, `style.css`, `js/theme.min.js`, `vendor.min.js`, etc.). All class names, markup structure and design intent below are extracted directly from the Blade templates, so the UI design is fully documented even without the minified bundles.

---

## 2. Tech Stack Behind the UI

| Concern | Technology |
|---|---|
| Backend | **Laravel 12** (PHP ^8.2) — Blade templating engine, `@extends` / `@include` / `@push` layout system |
| Modules | `nwidart/laravel-modules` — every add-on (Rental, RideShare, Reels, Tax, AI) has its own `Resources/views` |
| CSS framework | **Bootstrap 4-style + Front (Htmlstream) admin theme** — `theme.minc619.css`, `bootstrap.min.css`, `vendor.min.css` |
| Custom CSS layer | `custom.css`, `style.css`, `upload-single-image.css`, `toastr.css`, `owl.min.css`, `emogi-area.css` |
| Icons | **Streamline icon font (TIO)** — hundreds of `tio-*` classes (`tio-home-vs-1-outlined`, `tio-shopping-cart`, `tio-search`, `tio-print`, `tio-info`, `tio-settings`…) |
| Fonts | Google Fonts — **Roboto** (login) and **Open Sans** (print); `fonts.css` sets base font |
| JS | jQuery, `vendor.min.js` / `theme.min.js` (Front components: HS nav, unfold, dropdown), `custom.js`, `sweet_alert.js`, `toastr.js`, `jquery.validate.min.js`, Bootstrap-tour (product tour), FireBase (push) |
| Charts | **Chart.js** (`vendor/chart.js/dist/Chart.min.js`) for doughnut/line/canvas charts + **ApexCharts** (`apexcharts.min.js`) for area/summary charts |
| Tables | Custom datatable UI (`table-hover table-borderless table-thead-bordered …`) + `js/data-table` style behavior in `view-pages/common.js` |
| File uploads | `upload-single-image.js`, `multiple-file-upload.js`, `spartan-multi-image-picker.js`, `intlTelInput` |
| Printing | `barryvdh/laravel-dompdf` + print-specific Blade layouts (`layouts/admin/print.blade.php`, `invoice-print`) |
| i18n / RTL | `translate()` helper, `session('local')` language switcher, `dir="rtl"` on `<html>` + `class="active"` — full RTL support |

---

## 3. Design System (Tokens & Patterns)

### 3.1 Brand Colors (used inline across templates)

| Token / class | Hex | Usage |
|---|---|---|
| `--primary` / `btn--primary` / `bg--005555` | `#005555` | **Primary brand color** — dark teal; active nav, primary buttons, sidebar scrollbar area, chart series |
| `text--039D55` | `#039D55` | Green highlight (login tagline "in one field") |
| `text-006AE5` / `text-006AE5` | `#006AE5` | Link blue ("view all", "View All" links) |
| `--theme-clr:#006AB4` | `#006AB4` | Secondary blue accent (delivery-man / rider cards) |
| `text-3F8CE8` | `#3F8CE8` | Info blue (unassigned orders) |
| `--clr:#FF5A54` / `text-danger` | `#FF5A54` / `#dc3545` | Danger / negative stats |
| `text-FFA800` / `badge-soft-warning` | `#FFA800` | Warning / processing (orange amber) |
| `chart-bg-1/2/3` | `#76ffcd`, `#ff6d6d`, `#005555` | Chart palette (gross sale, admin commission, delivery commission) |
| `#2C2E43`, `#595260`, `#B2B1B9` | — | Business doughnut chart shades |
| `bg--F8F9FC`, `bg-light2`, `bg--10`, `bg-E7E6E8` | light grays | Card sub-surfaces, filter blocks, search shortcut chip |

### 3.2 Typography

- Roboto (300/400/700) on auth screens, Open Sans (400/600) for printable layout; base `fonts.css` for admin app.
- Heading hierarchy in pages: `page-header-title` (page title), `page-header-text` (subtitle), `card-title h4/h5/h6`, `nav-subtitle` (sidebar group label, uppercase small).
- Text utilities: `text-truncate`, `text-capitalize`, `text-uppercase`, `fs-12/fs-14/fs-24`, `fw-medium/font-bold`, `max-text-2-line`.

### 3.3 Buttons

| Class | Look / purpose |
|---|---|
| `btn btn--primary` | Solid primary teal — main CTA (login, save, confirm, search submit) |
| `btn--secondary` | Secondary companion to search / filters |
| `btn--danger` / `btn-outline-danger` | Destructive / edit-order actions |
| `btn--reset` / `btn-white` / `btn-ghost-dark` | Neutral cancel/reset, outlined/ghost icon buttons |
| `btn-icon` / `btn-circle` | Round icon buttons (close, collapse, prev/next order) |
| `btn-sm / btn-lg / btn-block` | Size variants; `h--40px/h--45px/min--280` sizing helpers |

### 3.4 Cards, Badges, Forms

- **Cards:** `.card` + `.card-header` + `.card-body` + `.card-footer`; special stat cards: `__dashboard-card-2`, `__user-dashboard-card`, `__customer-statistics-card`, `order--card`, `shadow--order-card`, `__top-resturant-card`, `view-details-container`.
- **Badges:** `badge-soft-{success,primary,warning,danger,info,dark}` — soft-tinted status pills; `badge-soft-dark` for record counts; `bg-opacity-theme-10 theme-clr` for the pending theme color; `rounded-circle` count chips.
- **Status colors:** pending = theme tint, confirmed = info, processing / out-for-delivery = warning, delivered / paid = success, canceled / failed / refunded = danger, refund = danger.
- **Forms:** `form-control`, `form-control-lg`, `input-label`, `js-form-message` (validation), `input-group input-group-merge` (password eye toggle), `custom-select`, `js-select2-custom` / `js-data-example-ajax` (searchable selects), `toggle-switch` (iOS-style switches used everywhere for enable/disable), `custom-control custom-checkbox / custom-radio`, `date` inputs, `intlTelInput` (phone).
- **Alerts / info:** `alert bg--10`, `bg-warning bg-opacity-10`, `__bg-F8F9FC-card` info panels, `blinkings` "How it Works" hint with pulsing info icon.

### 3.5 Motion / Feedback

- **Loading:** `#loading` + `.loader--inner` GIF overlay on every page (`initial-hidden` → shown on AJAX).
- **Toasts:** Toastr (`toastr.min.css/js`) for success/error feedback; **SweetAlert-style confirm modals** (`sweet_alert.js`, `.confirm-Toggle`, `callback`, `form-alert`).
- **Confirm dialogs:** `#toggle-modal` reusable image+title+message confirm; `#logout_modal`; `#popup-modal` (new-order notification popup with "Ok, let me check").
- **Product tour:** Bootstrap-tour based onboarding (`-tour` steps, `tour-guide_btn` floating pill, `restart-Tour`, off-canvas `#global_guideline_offcanvas` with YouTube tutorial links).

---

## 4. Global Application Shell (Every Admin Page)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR (fixed left, 260px, dark teal #005555)        │  HEADER (top bar)  │
│  ┌──────────────────────┐                              │  ┌───────────────┐  │
│  │ Logo (business logo) │                              │  │ Users | Settings ▾ │
│  │ ── sidebar search ── │                              │  │ Dispatch      │  │
│  │ Dashboard            │                              │  │ [ Search Ctrl+K│  │
│  │ POS Section          │                              │  │  (💬 unread)🌐]  │
│  │ ▼ Nav groups …       │                              │  │ module switcher ▾│ │
│  │   • item (submenu)   │                              │  └───────────────┘  │
│  │   • store (submenu)  │   MAIN CONTENT <main>         │ tour FAB (🟢)      │
│  │   …                  │   page-header + cards/tables │ ┌────────────────┐ │
│  │                      │                              │ │  FOOTER         │ │
│  │                      │                              │ │ © business ·    │ │
│  │                      │                              │ │ setup/profile/  │ │
│  │                      │                              │ │ home · ver badge│ │
│  └──────────────────────┘                              │ └────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Sidebar (`layouts/admin/partials/_sidebar*.blade.php`)

- **Structure:** `<aside class="js-navbar-vertical-aside navbar navbar-vertical …">` → brand wrapper (business logo + collapse toggle `tio-first-page / tio-last-page`) → `navbar-vertical-content bg--005555`.
- **Menu search:** live client-side filter box `#search-sidebar-menu` ("Search Menu...") that hides non-matching `<li>`.
- **Group labels:** uppercase `nav-subtitle` dividers (e.g. `POS SECTION`, `MODULE MANAGEMENT`, `PROMOTIONS`, `ORDER MANAGEMENT`, `ITEM MANAGEMENT`, `STORE MANAGEMENT`, `BUSINESS MANAGEMENT`, …).
- **Menu item anatomy:**
  - Simple link: `<i class="tio-* nav-icon">` + label.
  - Expandable group: `nav-link-toggle` + `js-navbar-vertical-aside-submenu nav nav-sub`; children use `tio-circle nav-indicator-icon`.
  - Active state adds `show active` / `.active`, and auto-scrolls the active item into view on load.
- **Sidebar variants (one per module/area), included dynamically by `$module_type`:**
  - `_sidebar.blade.php` — master/combined menu
  - `_sidebar_food.blade.php`, `_sidebar_grocery.blade.php`, `_sidebar_pharmacy.blade.php`, `_sidebar_ecommerce.blade.php`, `_sidebar_parcel.blade.php`
  - `_sidebar_dispatch.blade.php`, `_sidebar_users.blade.php`, `_sidebar_transactions.blade.php`, `_sidebar_settings.blade.php`
  - `rental::admin.partials._sidebar_rental` / `rideshares` style partials for add-on modules.
- Bottom of sidebar: **logout modal** and a spacer.

### 4.2 Header (`_header.blade.php`)

- Fixed navbar (`navbar-fixed navbar-height navbar-flush navbar-container navbar-bordered pr-0`).
- **Left:** collapsed-mode hamburger (chevrons).
- **Primary nav links (icon + label):**
  - **Users** (`admin/users*`)
  - **Settings** — dropdown panel `__nav-module` with header/description + icon list (System Module Setup, Zone Setup, Business Settings, 3rd Party, Social Media) + "View All"
  - **Dispatch Management**
- **Right cluster:**
  - **Global search** pill `bg--secondary` with **Ctrl+K** shortcut chip → opens `#staticBackdrop` modal (live search box "Search by keyword", result area, Esc button).
  - **Messages icon** (`nav-msg-icon`) with red unread-count badge (`btn-status-danger`).
  - **Language dropdown** (globe + active code, language menu `lang-menu`).
  - **Module switcher** — current module icon + name, opens `__nav-module style-2` panel: "Modules Section" grid of module cards (icon + name) + "+" add-module card; empty state shows `empty-box.png` + "Please, Enable or Create Module First" + Module Setup button.
- **Floating help FAB** (bottom-right): green rounded icon `solar_multiple-forward-right-line-duotone.svg` expanding to Guideline / Tutorial (YouTube) / Restart Tour / (demo) Toggle RTL switch.

### 4.3 Footer (`_footer.blade.php`)

- Left: `© {business_name}` + footer text.
- Right: dot-separated links — **Business Setup**, **Profile**, **Home** + `badge badge-soft-primary` **Software Version** (`env('SOFTWARE_VERSION')`).

### 4.4 Front Builder (`_front-settings.blade.php`)

Slide-out "Front Builder" panel (front-demo only) that lets you preview layout skins:
- **Layout skins:** Default / Dark / Light (radio thumbnails)
- **Sidebar options:** Default / Compact / Mini (`navbar-vertical-aside-compact-mode`, `-mini-mode`)
- **Header options:** Default (Fluid), Default (Container), Double line (Fluid), Double line (Container)
- Footer: **Reset** / **Preview** buttons.

### 4.5 Page header pattern (on inner pages)

```
[icon.png]  TITLE  (badge count)                   [zone dropdown | buttons]
            subtitle text (optional)
```
Implemented as `.page-header` → `page-header-icon` image (`order.png`, `items.png`, `business.png`, `module.png`, `folder-logo.png` etc.) + `page-header-title` + `badge badge-soft-dark` total-count + right-aligned filters/buttons (zone `js-select2-custom`, print, back, add-new).

---

## 5. Authentication Screens (`resources/views/auth/`)

### 5.1 Login (`login.blade.php`) — split-screen design

```
┌──────────────────────────────┬──────────────────────────────┐
│  LEFT (brand panel)          │  RIGHT (form card)           │
│  ┌──────────────────┐        │  badge: Software Version     │
│  │   Business Logo  │        │  ┌────────────────────────┐  │
│  │   Your           │        │  │ ADMIN LOGIN            │  │
│  │   All Service    │        │  │ Welcome back, login to │  │
│  │   in one field…  │        │  │ ▶ Email field          │  │
│  │ (green #039D55)  │        │  │ ▶ Password + eye icon  │  │
│  └──────────────────┘        │  │ [✓ Remember] Forgot?    │  │
│                              │  │ [ LOGIN ] (full-width)   │  │
│                              │  └────────────────────────┘  │
└──────────────────────────────┴──────────────────────────────┘
```

- Classes: `auth-wrapper` → `auth-wrapper-left` (brand story) + `auth-wrapper-right` (form).
- Same screen powers **admin / vendor / delivery-man** via hidden `role` input (title changes to `<ROLE> Login`).
- Email + password (with `js-toggle-password` eye), Remember Me, Forgot Password modals (`#forgetPassModal`, `#forgetPassModal1`), full-width `btn--primary` login; demo mode shows copy-credential buttons (`copy_cred`).
- **Forgot password / OTP:** `reset-password.blade.php`, `verify-otp.blade.php`, custom captcha (`custom-captcha.blade.php`), "send-mail" illustration (`send-mail.svg`) + send-mail modal.

---

## 6. Dashboards (5+ analytics variants)

| File | Audience / module |
|---|---|
| `dashboard.blade.php` | Default generic (welcome header + stats) |
| `dashboard-food.blade.php` | Food module |
| `dashboard-grocery.blade.php` | Grocery module |
| `dashboard-pharmacy.blade.php` | Pharmacy module |
| `dashboard-ecommerce.blade.php` | E-commerce module |
| `dashboard-parcel.blade.php` | Parcel module |
| `dashboard-dispatch.blade.php` | Dispatch overview |
| `dashboard-users.blade.php` | User overview (customers / delivery-men / riders) |
| `dashboard-transactions.blade.php` | Transactions stub |
| `Modules/Rental/…/admin` + `Modules/RideShare/…` | Add-on dashboards |

### Dashboard anatomy (module dashboards, e.g. `dashboard-ecommerce.blade.php`)

1. **Header row** — module icon + "`{Module} Dashboard.`" title + subtitle, zone filter select (`fetch_data_zone_wise`).
2. **Period radio group** — `statistics-btn-grp` with **This Year / This Month / This Week** (AJAX `order_stats_update`).
3. **KPI stat cards** (`__dashboard-card-2`, 4 across, `col-sm-6 col-lg-3`):
   - Products / Orders / Stores / Customers — each with SVG icon, `name`, big `count`, and `subtxt` ("X newly added").
4. **Order-status mini cards** (`order--card`, 8 across): Unassigned → Accepted → Processing → Out-for-delivery → Delivered → Canceled → Refunded → Payment failed — icon + label + colored count (`text-3F8CE8`, `text-success`, `text-FFA800`, `text-danger`).
5. **Charts row (8/4 split):**
   - **Left `col-lg-8`** — Gross Sale card: `__gross-amount` total + **ApexCharts area chart** (`#grow-sale-chart`, 3 series: Gross Sale #76ffcd / Admin Commission #ff6d6d / Delivery Commission #005555, smooth curves, gradient fill, no toolbar) + period select.
   - **Right `col-lg-4`** — **User Statistics** card: Chart.js **doughnut** (`#dognut-pie`) with centered **Total Users** count, legend chips (Customer / Store / Delivery Man) + period select + zone change.
6. **Ranking cards** (`col-lg-4` pairs):
   - **Top Selling Stores** (`_top-restaurants`) — avatar grid with hover overlay ("order : N").
   - **Popular Restaurants** (`_popular-restaurants`).
   - For food module: `_top-rated-foods`, `_top-selling-foods`;
   - Generic module: `_top-riders`, `_top-deliveryman`, `_top-customer`.
   - Each card header has `view_all →` blue link; empty state = illustration + grey "No stores available".
7. **Business overview partial** (`_business-overview-chart`) — doughnut of Food / Review / Wishlist (#2C2E43/#595260/#B2B1B9).

### Dispatch dashboard (`dashboard-dispatch.blade.php`)

- Header "**Dispatch Overview**" + info alert "This section only contains Order Data".
- **Delivery-man cards** (`__customer-statistics-card`, color via `--clr`): Active / In-Active + Suspended (combo) / Fully Booked / Available-to-assign.
- Right: `shadow--order-card` order queue mini-cards.

### Users dashboard (`dashboard-users.blade.php`)

- "**User Overview**" + zone filter.
- Avatar-stack user cards (`__user-dashboard-card`): stacked 2 avatars + "+N more" chip (`more-icon`), big total + label (Total Customer / Delivery Man / Rider / Store, `--theme-clr` accent); clicking navigates to the filtered list.
- Below: user type statistics, charts and lists.

---

## 7. POS (Point of Sale) — `admin-views/pos/index.blade.php`

Two-column cashier layout:

```
┌──────────────────────────────┬──────────────────────────────┐
│  LEFT — PRODUCT SECTION       │  RIGHT — BILLING SECTION     │
│  [Store ▾] [Category ▾]       │  [Customer search + Add new] │
│  [ 🔍 Search product ]        │  Customer info chip (wallet) │
│  ┌────┐ ┌────┐ ┌────┐         │  Delivery Information (✎)    │
│  │IMG │ │IMG │ │IMG │  (grid) │  ┌ CART TABLE ────────────┐  │
│  │name│ │name│ │name│         │  │ Item | Qty | Price | 🗑 │  │
│  │price││price││price│        │  └────────────────────────┘  │
│  └────┘ └────┘ └────┘         │  Subtotal / Discount / Tax  │
│  pagination                   │  [ PAY  ₹ total ]           │
└──────────────────────────────┴──────────────────────────────┘
```

- Product cards: `pos-product-card` + `.active` when in cart — image, `product-title` (2-line clamp), price in primary color; click = add to cart, click again = quick-view.
- Billing: customer `js-data-example-ajax` select + "**Add new customer**" modal, wallet balance display, delivery-address modal (`#deliveryAddrModal`), cart `_cart.blade.php` table (qty input, remove icon), totals (subtotal/addon/discount/tax), **Checkout → payment** + printable thermal invoice via `invoice.blade.php`/`print-invoice`.

---

## 8. Orders Module (biggest area of admin UI)

### 8.1 Order List (`admin-views/order/list.blade.php`, 664 lines)

- Page header: icon + "`{Status} Orders`" + `badge-soft-dark` total.
- **Toolbar:** search input `10010` + `btn--secondary` search, selection counter, **Export** dropdown (Excel/CSV with file-type icons), **Filter** toggle button with active-filter count badge.
- **Table:** `table-hover table-borderless table-thead-bordered table-nowrap table-align-middle card-table`:
  - Sl | Order ID (link to details) | Date + time (two-line, uppercase time) | Customer (name + phone link) | Store / Parcel category | Item Qty (center) | Total amount (right, `mw--85px`, payment status `text-success paid`) | Order status | Actions.
  - Row class `status-{order_status}` enables status-based row tinting.
- **Filter off-canvas/sidebar** (`sidebar sidebar-bordered sidebar-box-shadow`): multiple **Zone** select, **Store** select, **Order status** checkboxes (pending/confirmed/processing/out-for-delivery/delivered/failed/canceled/refund_request/refunded), **Scheduled** toggle, **Order type** radios (Take away / Home delivery), **Date between** (two date pickers), footer **Clear all filters** / **Filter** buttons.

### 8.2 Order Detail (`order-view.blade.php`, 3,063 lines — the richest screen)

```
Header:  🛒 ORDER DETAILS (n)                    [← prev order] [→ next]
┌─────────────────────────── 8/12 ────┬────────── 4/12 ──────────┐
│ CARD 1 — ORDER INVOICE SUMMARY       │ CARD — RIGHT RAIL          │
│  Order #123  (campaign) (edited)     │  [✎ Edit][🖨 Print Invoice] │
│  📅 date  🏪 store + verified badge   │  Status : [soft badge]     │
│  ⏰ scheduled, 🎟 coupon, locations   │  Payment method           │
│  [📍 Show locations on map]          │  Order setup card:        │
│  cancellation reason (danger)        │  [status dropdown ▾]      │
│  progress status step bar            │  [assign deliveryman]     │
│  items table (img/name/variant/qty/  │  payment verification     │
│   price/addons/total)                │  [switch to COD]          │
│  bill summary (subtotal/tax/disc/dlv │  refund actions           │
│   charge/tips/total paid)            │  delivery-man card        │
└──────────────────────────────────────┴──────────────────────────┘
```

- **Status badge map:** pending = theme-tint `bg-opacity-theme-10 theme-clr`, confirmed = `badge-soft-info`, processing/out-for-delivery = `badge-soft-warning`, delivered/paid = `badge-soft-success`, canceled/failed/refund = `badge-soft-danger`.
- **Order setup card:** status **dropdown** (pending → confirmed → processing/cooking → handover → out-for-delivery → delivered → canceled), each item asks confirmation (`data-message`, `route-alert`); "**Assign delivery man manually**" modal with map coordinates; **Switch to COD** / **Verify offline payment** / Recheck verification / Cancel Order flows; payment-failed state shown as red center notice.
- **Items table** with image thumbnails, variant, addon chips, qty, unit price, total; bill summary block; "bring change" note for cash orders (`Please bring ₹X in change…`).
- Print button opens `admin.order.generate-invoice` → thermal-styled `_invoice.blade.php` (store logo, star divider, CASH RECEIPT, order id, GST no, items, totals, print bar).
- **Map modal** (`#locationModal`) shows pickup/drop pins on Google map.

### 8.3 Dispatch list (`distaptch_list.blade.php`) & Parcel (`parcel-list.blade.php`, `parcel-order-view.blade.php`)

- Dispatch list = unassigned/ongoing orders with **accept/assign** actions and delivery-man pickers; progress tabs.
- Parcel views reuse order patterns with **Parcel Category** column, sender/receiver address blocks, parcel details card.

### 8.4 Refunds & offline payments

- `offline_verification_list.blade.php` — payment proof image + "verify / deny" workflow with notes.
- `refund/` — list with status tabs (Requested / Refunded / Rejected) — same list pattern with filtered dropdown.

---

## 9. Catalog & Business Entities

### 9.1 Items / Products (`admin-views/product/`)

- **List** (`list.blade.php`): "Search data" filter card — Store (AJAX `js-data-example-ajax`), Zone, Category, module-specific filters (pharmacy switches column count), search + table with product image, name, store, price, stock, status toggle, actions.
- **View** (`view.blade.php`): gallery (`product_gallery.blade.php`, `_product-media-slider`), pricing/variation/attribute blocks, review summary, reels/ratings.
- **Create/Edit** (`edit.blade.php`): multi-column form with left image uploaders + right tabbed sections (general, stock, discounts, add-ons, variations, SEO), sticky save bar (`_floating-submit-button`).
- **Bulk:** `bulk-export.blade.php` / `bulk-import.blade.php` with step instructions and `_bulk_export_common_filter` / `_bulk_export_common_instruction` partials; **approval flow** `approv_list.blade.php` + `requested_product_view.blade.php`.

### 9.2 Stores (`admin-views/vendor/`), Delivery men (`delivery-man/`), Customers (`customer/`), Employees (`employee/`)

Each entity follows the same **list → view → create/edit** pattern:

- **List:** search + filters (zone/status), datatable with avatar, contact, status switches, action dropdown (view/edit/status/suspend), export/import.
- **View:** profile cover + avatar uploader (`avatar-avatar-xxl avatar-circle` + edit pencil), info cards, tabs (orders, wallet/transactions, reviews, earnings, subscription), KPIs.
- **Create/Edit:** `js-form-message` validation, image uploader (`_image-uploader` with preview), phone intlTelInput, toggle switches, role/zone selectors.

### 9.3 Categories / Attributes / Units / Brands / Add-ons

- `category/index.blade.php`, `attribute`, `unit`, `brand` — grid/table plus modal-based quick-add forms; drag/edit icons; `tio-add-circle` primary buttons.
- POS "add-on" management: `addon/` pages with checkbox matrix style toggles.

---

## 10. Promotions & Marketing

| Screen | UI notes |
|---|---|
| **Campaign** (`campaign/`) | List + create with date range, module/store picker, item selection grid, banner upload |
| **Banner** (`banner/`) | Banner cards with image preview, zone select, status toggle |
| **Coupon** (`coupon/`) | Coupon list + form: code, type (percent/amount), min/max amounts, store restrictions, validity calendar |
| **Cashback** (`cashback/`) | Similar form with `badge-soft-primary` amount pills |
| **Flash Sale** (`flash-sale/`) | Countdown-style cards, primary-colored sale timer |
| **Push Notification** (`notification/`) | Title + description + zone/audience select + image uploader; info panel links to Firebase config; send/push button |
| **Promotions dashboard** | `promotions/` umbrella pages |
| **Advertisement / Other banners** | Module-specific banner managers |

---

## 11. Reports & Analytics (`admin-views/report/`, 44 files)

- **Report tabs:** `_report_module_tabs` — All Modules / Parcel / Rental / Ride Share pill tabs.
- **Admin Earning Report** (`admin-earning-report.blade.php`):
  1. Page header + subtitle, tab strip.
  2. `__bg-F8F9FC-card` **Filter Data** card — Module select, Date range select (All time / This week / month / year / previous year / Custom range), custom start/end date inputs, `btn--container` Filter + Reset.
  3. Summary cards (gross sale, admin commission, delivery commission, refunds, etc. — partials `_store_earning_report_content`, `_deliveryman_earning_report_content`).
  4. ApexCharts area/column graphs + Chart.js line graphs (day-wise, order, item-wise, expense, stock, store sales/summary/order reports).
  5. Export buttons (Excel/CSV/PDF) floating in footer.
- Types: `order-report`, `day-wise-report`, `item-wise-report`, `stock-report`, `expense-report`, `store-*`, `deliveryman-*`, `report/partials/*` — all share the same filter-card + chart-card + datatable recipe.

---

## 12. Business Settings (202 files — the "settings hub")

- **Landing page:** `business-settings/business-index.blade.php` — Maintenance Mode card with `toggle-switch`, Basic Information form (company name/email/phone/country/currency/timezone etc.), logo/favicon uploaders.
- **Tab bar:** `partials/nav-menu.blade.php` — horizontal scrollable pill tabs with prev/next circular arrow buttons:
  **Business Info · Payment · Vendor · Order · Refund · Deliveryman · Customer · Priority Setup · Disbursement · Automated Message · (+ Ride Share)**.
- **Pages by tab:** `payment-index` (gateways as cards with radio/toggles), `order-index`, `customer-index`, `deliveryman-index`, `disbursement-index`, `priority-index`, `refund-index`, `automated_message`.
- **3rd Party & Configuration:** `3rd_party/` (SMS/email/payment provider cards), `mail-index`, `fcm-config`, `firebase-otp-index`, `recaptcha-index`, `analytics/`, `offline-payment/`, `send-mail-index`, `react-setup`.
- **System management:** `config` (module config), `system/` (clean database with confirmation card), `login-setup` (login page customization: title/logo/image), `db-index`.
- **Language** (`language/`) — language add/edit with flag + `translate()` tables.
- **Pages / SEO:** `pages/`, `seo-settings/page-meta-data`, `landing-page-settings/{admin,react,flutter}` with editable previews.
- **Email templates** (`email-format-setting/`, plus email template partials in `Modules/*`) — template editor UI with links sidebar, preview panes, social footer section.
- **Gallery / file manager** (`file-manager/index.blade.php`) — Local Storage / S3 tabs, folder icons grid (`btn--folder`, `folder.png`), file thumbnails with hover action buttons (view/download/delete/rename), breadcrumb-style header, "Add new" modal.

---

## 13. Zone & Module Management

- **Zone** (`zone/index.blade.php`): map-based zone manager — Google map canvas + zone polygon drawing, zone cards with expand/delete/status, `module-setup` wizard (select which modules run in the zone), **Surge price** (`zone/surge-price/`, `surge-setup`) with price sliders/tables.
- **Module** (`module/index.blade.php`): card-style module list — search bar, module-type filter, Export dropdown, "**How it Works**" blinking info modal, module cards with icon, type badge, price/status, activate toggle; `create`/`edit` with icon upload, type selector, zones checkboxes.
- **Add-on activation** (`addon-activation/index.blade.php`): rows per add-on (Vendor App, etc.) with description, **View** reveal (username/purchase key), toggle switch that opens a confirm modal with on/off illustrations.

---

## 14. Communication & Wallet

- **Messages** (`messages/index.blade.php` + `data.blade.php`): two-panel chat — left `col-lg-4`: search + conversation list (`chat-user-info`, active highlight `conv-active`, **new-msg badge**, last message preview); right `col-lg-8`: full chat window loaded via AJAX (`viewAdminConvs`, avatar bubbles, message input with emoji `emogi-area` + image picker).
- **Wallet** (`wallet/`, `wallet-bonus/`): customer wallet cards, add/remove balance modal, bonus list; **Withdraw methods** (`withdraw-method/`) — bank/cash method cards with toggles; **Stores disbursement** (`store-disbursement/`, `dm-disbursement/`) — pending/paid flow with settlement table and confirm modal; **Deliveryman earning-provide** (`deliveryman-earning-provide/`).
- **Subscriptions** (`subscription/` + `custom-role/`): business plan cards (pricing layout with per-plan highlights), subscriber list with status toggle.

---

## 15. Add-on Modules' UI

| Add-on | UI highlights |
|---|---|
| **Rental** (`Modules/Rental/Resources/views/admin/`) | Provider/trip/vehicle screens with dedicated `Rental/public/assets/css/admin/*.css` (provider-create, vehicle-edit, trip-details, trip-invoice, trip-transaction-statement, provider-overview, tax-report…), FontAwesome + Google-font sheets; own sidebar (`admin/partials/_sidebar_rental`) |
| **RideShare** (`Modules/RideShare/…`) | Riders, trips/rides, driver earnings; `ride-share.css/js`; own settings tabs (Safety & Precaution) |
| **Reels** (`Modules/ReelsModule/Resources/views/admin/reels/`) | `index.blade.php` list + `create/edit` form with `reel-upload.js` (media upload with progress) + `reels.css`; appears in **Reels Management** nav group for e-commerce/grocery/pharmacy sidebars |
| **Tax** (`TaxModule/…`) | `taxvat` routes — Create Taxes / Setup Taxes pages, tax report table, VAT calculators |
| **AI** (`Modules/AI/resources/views`) | AI assistant area: `layouts/master.blade.php` + simple `index.blade.php` (setup/chat container) |
| **Gateways / Controller** | Payment gateway cards + controller module scaffold |

Each module registers its assets through `asset('Modules/<Name>/public/assets/…')` and its views through `@include("<module>::…")`.

---

## 16. Reusable Component Inventory (partials)

| Partial | Purpose |
|---|---|
| `partials/_image-uploader.blade.php` | Single image upload with live preview |
| `partials/_multiple-image-uploader.blade.php` | Multi-image (product gallery) |
| `partials/_floating-submit-button.blade.php` | Sticky footer **Reset + Save Information** bar |
| `partials/_date-range.blade.php` | From/To date filter group |
| `partials/_zone-change.blade.php` | Zone dropdown reloader on dashboards |
| `partials/_dashboard-order-stats*.blade.php` | KPI + order status stat cards (food/parcel/generic) |
| `partials/_monthly-earning-graph.blade.php` | ApexCharts gross-sale area chart + totals + period select |
| `partials/_business-overview-chart.blade.php` | Chart.js doughnut (Food/Review/Wishlist) |
| `partials/_top-*.blade.php` | Ranking chips (restaurants, customers, delivery-men, riders, foods) |
| `partials/_recaptcha.blade.php`, `_bulk_export_*` | Auth captcha & export filters/instructions |
| `layouts/admin/partials/_logout_modal.blade.php` | Confirm logout modal (`tio` icons, Cancel/Logout) |
| `layouts/admin/print.blade.php` | Print-only shell (no sidebar/header; loader + content) |
| `resources/views/partials/_product-media-slider.blade.php` | Product image carousel (owl) |

---

## 17. Responsive & Accessibility Behavior

- **Breakpoints used:** `col-sm-6/12`, `col-lg-3/4/8`, `col-md-9`, `col-xl-10`, `col-xxl-*`; `d-xl-none` collapse toggle; `d-sm-none/d-sm-block` swaps; `flex-wrap` everywhere for graceful stacking.
- **Sidebar collapses** to mini/icons-mode and off-canvas on mobile (Front `js-navbar-vertical-aside`), with hamburger toggle in header.
- **RTL:** `<html dir="rtl" class="active">`; body-level toggle in demo mode (`rtl_toggle` switch → route `site_direction`); layouts render mirrored automatically.
- **Multi-language:** header globe dropdown → `admin.lang/{code}`; all labels pass through `translate()`; `data-*` validation strings localized.
- **Empty states** per screen: illustration (`empty-box.png`, `no-store.png`, `no-customer.png`) + grey heading.
- **Demo mode guards:** `getEnvMode()=='demo'` disables save buttons (`call-demo`), shows credential copy buttons, RTL toggle.

---

## 18. Key UI Files Index (for developers)

| File | Role |
|---|---|
| `resources/views/layouts/admin/app.blade.php` | Master admin layout — assets, loader, header, sidebar, modals, scripts |
| `resources/views/layouts/admin/partials/_header.blade.php` | Top nav, search (Ctrl+K), messages, language, module switcher, tour |
| `resources/views/layouts/admin/partials/_sidebar*.blade.php` | 10+ sidebar variants |
| `resources/views/auth/login.blade.php` | Split login screen |
| `resources/views/admin-views/dashboard-{food,grocery,pharmacy,ecommerce,parcel,dispatch,users}.blade.php` | Analytics dashboards |
| `resources/views/admin-views/order/{list,order-view,parcel-list,parcel-order-view,distaptch_list,offline_verification_list}.blade.php` | Orders UI |
| `resources/views/admin-views/pos/index.blade.php` + `_cart.blade.php` | POS cashier |
| `resources/views/admin-views/product/{list,view,edit,index}.blade.php` | Catalog |
| `resources/views/admin-views/report/*.blade.php` | 20+ report screens |
| `resources/views/admin-views/business-settings/*` (202 files) | Settings hub |
| `resources/views/admin-views/messages/*` | Chat |
| `Modules/*/Resources/views/admin/**` | Add-on screens |

---

## 19. Summary

The **Aurasure Admin Panel UI** is a **fixed-sidebar + top-nav SPA-style dashboard** (server-rendered Blade) built on Bootstrap/Front with a **dark-teal (#005555) brand theme**, teal/green/amber/red semantic status colors, rounded white cards with soft badges, icon-driven navigation (`tio-*`), searchable Select2 dropdowns, toggle switches, image uploaders, Toastr + SweetAlert feedback, Chart.js/ApexCharts analytics, and module-aware sidebars that adapt between **Food, Grocery, Pharmacy, E-commerce, Parcel, Ride-Share, Rental, Dispatch, Users, Transactions and Settings** areas. Every business flow — login → dashboard → orders → catalog → users → promotions → reports → settings → add-ons → chat — follows consistent list/view/form card patterns, making the whole panel feel uniform and easy to extend.

---

*Document generated by reading the full contents of `aurasureadmin.zip` (all 3,843 files). The zip has been deleted after analysis.*
