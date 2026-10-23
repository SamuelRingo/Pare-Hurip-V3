# Pare Hurip — KSA Planting Phase & Rice Price Prediction (BPS Kota Tasikmalaya) 🌾

🇮🇩 [Bahasa Indonesia](README.id.md)

> **Planting-phase prediction based on KSA (Kerangka Sampel Area) and rice price forecasting for BPS Kota Tasikmalaya** — phase tracking, interactive maps, and rice price forecasts.

## ✨ Features

- **KSA Phase Visualization** — planting-phase tracking chart with historical data and h+3 predictions (Random Forest)
- **Interactive Maps** — protected rice-field areas and 10-district boundaries rendered with Leaflet
- **Rice Price Comparison** — weekly price history and LSTM-Hybrid predictions per rice type
- **Admin Panel** — secure dashboard with role-based access (superadmin / admin)
- **Excel Import** — validated KSA data import from `.xlsx` files with reference auto-registration
- **Region Reference** — manage the 10 Tasikmalaya district codes used across the system

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router, Turbopack)
- **Language:** TypeScript
- **UI:** Tailwind CSS 4, Radix UI (shadcn/ui, New York style)
- **Animation:** Framer Motion
- **Maps:** Leaflet + React-Leaflet + Turf.js
- **Charts:** Recharts
- **Data:** XLSX (Excel parsing), Supabase (PostgreSQL)
- **ML backend:** separate FastAPI service (LSTM-Hybrid + Random Forest)

## 🚀 Getting Started

### Prerequisites

- **Node.js 18.18+** (Node 20+ recommended)
- A package manager of your choice: **pnpm** (recommended — this repo uses `pnpm-lock.yaml`), **npm**, or **yarn**
- Supabase project with the schema below, and the ML service running locally or remotely

### Environment variables

Create a `.env.local` file in the project root (see `.env.example` values below):

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (publishable) key | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server-side only, for admin API routes) | `eyJhbGciOi...` |
| `ML_API_URL` | ML FastAPI base URL (server-side; falls back to `http://localhost:8000`) | `https://your-ml-service.example.com` |

> Never commit `.env.local` — it is already in `.gitignore`.

### Install & run — choose one package manager

**pnpm (recommended):**
```bash
pnpm install
pnpm dev        # http://localhost:3000
```

**npm:**
```bash
npm install
npm run dev
```

**yarn:**
```bash
yarn install
yarn dev
```

### Scripts

| Command | Description |
|---|---|
| `pnpm dev` / `npm run dev` / `yarn dev` | Start the development server (Turbopack) |
| `pnpm build` / `npm run build` / `yarn build` | Production build |
| `pnpm start` / `npm run start` / `yarn start` | Serve the production build |
| `pnpm lint` / `npm run lint` / `yarn lint` | ESLint (next/core-web-vitals + next/typescript) |

## 📁 Project Structure

```
app/
├── (public)/                # Public pages: Header + Footer layout
│   ├── page.tsx             # Landing page (Hero, About KSA, Method, Growth Cycle)
│   ├── ksa-visualization/   # Phase chart + Leaflet map
│   └── compare/             # Rice price history + prediction
├── admin/                   # Admin panel (protected by middleware)
│   ├── login/               # Admin login
│   ├── dashboard/           # KPIs and progress overview
│   ├── ksa-import/          # Excel import flow
│   ├── ksa-data/            # Manage KSA observations
│   ├── region-reference/    # District reference
│   ├── settings/            # System settings & export
│   └── admin-users/         # Manage admin accounts (superadmin only)
└── api/
    ├── admin/               # users, ksa-import, ksa-data, districts
    └── v1/                  # ML proxy: rice-price & random-forest predict/batch
components/
├── layout/                  # Header, Footer, AdminLayout (mobile drawer sidebar)
├── pages/                   # landing-page, prediction-page, compare-page, admin-page
└── ui/                      # shadcn/ui components
lib/
├── planting-phase/          # Phase prediction: constants, transform, queries, prediction, data
├── rice-price/              # Price aggregation + prediction API client
├── supabase/                # client, server, admin, activity-log, query
├── excel-import.ts          # Excel parsing & validation
├── ml-api.ts                # Shared ML API base URL
├── ricefield-geojson.ts     # Protected rice-field boundaries
├── tasikmalaya-geojson.ts   # 10-district boundaries
├── use-media-query.ts       # isMobile hook (matchMedia)
└── utils.ts                 # cn() helper
middleware.ts                # Guards /admin/* (JWT validation + session refresh)
```

## 🤖 ML Service (separate FastAPI backend)

Prediction endpoints are proxied through `app/api/v1/`. The ML service is **not part of this repo** — point `ML_API_URL` (or `NEXT_PUBLIC_ML_API_URL`) at it. Default (development): `http://localhost:8000`.

- `POST /api/v1/rice-price/predict/batch` → `POST /api/v1/lstm-hybrid-price/predict/batch`
- `POST /api/v1/random-forest/predict/batch` → `POST /api/v1/random-forest/predict/batch`

If the ML service is unreachable, the proxy returns `500` with a clear error — the UI shows an amber banner while history stays visible. No fabricated fallback data.

## 🔐 Admin Panel

- Access is guarded by `middleware.ts` (JWT validation) plus a client-side role guard (`superadmin` / `admin`).
- Only `superadmin` can manage admin accounts (`/admin/admin-users`).
- All admin actions are recorded in the `activity_log` table.

## 📄 License

**MIT License**
