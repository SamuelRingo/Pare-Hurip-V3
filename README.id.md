# Pare Hurip — Prediksi Fase Tanam KSA & Harga Beras (BPS Kota Tasikmalaya) 🌾

🇬🇧 [English](README.md)

> **Prediksi fase tanam berbasis KSA (Kerangka Sampel Area) dan perkiraan harga beras untuk BPS Kota Tasikmalaya** — pelacakan fase tanam, peta interaktif, dan perkiraan harga beras.

## ✨ Fitur Utama

- **Visualisasi Fase KSA** — grafik pelacakan fase tanam dengan data historis dan prediksi h+3 (Random Forest)
- **Peta Interaktif** — area sawah yang dilindungi dan batas 10 kecamatan dirender dengan Leaflet
- **Perbandingan Harga Beras** — riwayat harga mingguan dan prediksi LSTM-Hybrid per jenis beras
- **Panel Admin** — dashboard aman dengan akses berbasis peran (superadmin / admin)
- **Import Excel** — impor data KSA dari `.xlsx` tervalidasi dengan registrasi referensi otomatis
- **Referensi Wilayah** — kelola kode 10 kecamatan Tasikmalaya yang dipakai di seluruh sistem

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router, Turbopack)
- **Bahasa:** TypeScript
- **UI:** Tailwind CSS 4, Radix UI (shadcn/ui, gaya New York)
- **Animasi:** Framer Motion
- **Peta:** Leaflet + React-Leaflet + Turf.js
- **Grafik:** Recharts
- **Data:** XLSX (pengolahan Excel), Supabase (PostgreSQL)
- **Backend ML:** layanan FastAPI terpisah (LSTM-Hybrid + Random Forest)

## 🚀 Cara Install & Jalankan

### Prasyarat

- **Node.js 18.18+** (disarankan Node 20+)
- Pilih salah satu package manager: **pnpm** (disarankan — repositori ini memakai `pnpm-lock.yaml`), **npm**, atau **yarn**
- Proyek Supabase dengan skema tabel yang sesuai, serta service ML yang berjalan lokal atau remote

### Variabel lingkungan

Buat file `.env.local` di root proyek (nilai contoh di bawah):

| Variabel | Deskripsi | Contoh |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL proyek Supabase | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Kunci anon (publishable) Supabase | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Kunci service-role Supabase (khusus server, untuk route API admin) | `eyJhbGciOi...` |
| `ML_API_URL` | Base URL ML FastAPI (sisi server; fallback ke `http://localhost:8000`) | `https://your-ml-service.example.com` |

> Jangan pernah commit `.env.local` — sudah masuk `.gitignore`.

### Install & jalankan — pilih salah satu package manager

**pnpm (disarankan):**
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

### Skrip

| Perintah | Deskripsi |
|---|---|
| `pnpm dev` / `npm run dev` / `yarn dev` | Menjalankan server pengembangan (Turbopack) |
| `pnpm build` / `npm run build` / `yarn build` | Build produksi |
| `pnpm start` / `npm run start` / `yarn start` | Menjalankan hasil build produksi |
| `pnpm lint` / `npm run lint` / `yarn lint` | ESLint (next/core-web-vitals + next/typescript) |

## 📁 Struktur Folder

```
app/
├── (public)/                # Halaman publik: layout Header + Footer
│   ├── page.tsx             # Halaman utama (Hero, About KSA, Metode, Siklus Tumbuh)
│   ├── ksa-visualization/   # Chart fase tanam + peta Leaflet
│   └── compare/             # Riwayat harga beras + prediksi
├── admin/                   # Panel admin (dilindungi middleware)
│   ├── login/               # Login admin
│   ├── dashboard/           # KPI dan ringkasan progres
│   ├── ksa-import/          # Alur import Excel
│   ├── ksa-data/            # Kelola observasi KSA
│   ├── region-reference/    # Referensi kecamatan
│   ├── settings/            # Pengaturan sistem & ekspor
│   └── admin-users/         # Kelola akun admin (khusus superadmin)
└── api/
    ├── admin/               # users, ksa-import, ksa-data, districts
    └── v1/                  # Proxy ML: rice-price & random-forest predict/batch
components/
├── layout/                  # Header, Footer, AdminLayout (sidebar drawer mobile)
├── pages/                   # landing-page, prediction-page, compare-page, admin-page
└── ui/                      # Komponen shadcn/ui
lib/
├── planting-phase/          # Prediksi fase: constants, transform, queries, prediction, data
├── rice-price/              # Agregasi harga + klien API prediksi
├── supabase/                # client, server, admin, activity-log, query
├── excel-import.ts          # Parsing & validasi Excel
├── ml-api.ts                # Base URL API ML bersama
├── ricefield-geojson.ts     # Batas area sawah yang dilindungi
├── tasikmalaya-geojson.ts   # Batas 10 kecamatan
├── use-media-query.ts       # Hook isMobile (matchMedia)
└── utils.ts                 # Helper cn()
middleware.ts                # Menjaga /admin/* (validasi JWT + refresh sesi)
```

## 🤖 Service ML (backend FastAPI terpisah)

Endpoint prediksi diproksikan melalui `app/api/v1/`. Service ML **tidak termasuk repositori ini** — arahkan `ML_API_URL` (atau `NEXT_PUBLIC_ML_API_URL`) ke service tersebut. Default (pengembangan): `http://localhost:8000`.

- `POST /api/v1/rice-price/predict/batch` → `POST /api/v1/lstm-hybrid-price/predict/batch`
- `POST /api/v1/random-forest/predict/batch` → `POST /api/v1/random-forest/predict/batch`

Jika service ML tidak dapat dihubungi, proxy mengembalikan `500` dengan pesan error yang jelas — UI menampilkan banner kuning sementara riwayat tetap tampil. Tidak ada data pengganti (fallback) buatan.

## 🔐 Panel Admin

- Akses dijaga oleh `middleware.ts` (validasi JWT) ditambah guard peran sisi klien (`superadmin` / `admin`).
- Hanya `superadmin` yang bisa mengelola akun admin (`/admin/admin-users`).
- Semua aksi admin dicatat di tabel `activity_log`.

## 📄 Lisensi

**Lisensi MIT**
