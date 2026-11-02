# Stunting Toba — Sistem Analisis Faktor Risiko Stunting

Proyek aplikasi berbasis web modern untuk membantu identifikasi dini dan analisis faktor determinan risiko kejadian stunting pada balita di wilayah Kabupaten Toba, Sumatera Utara.

Pada **Tahap 1 (Fondasi Proyek)**, fokus utama adalah pembentukan arsitektur dasar full-stack yang bersih, terpisah, dan modular antara frontend (**React + TypeScript + Vite + Tailwind CSS**) dan backend (**Python + FastAPI + Pydantic**), serta pengujian konektivitas endpoint `GET /api/health`.

> **Prinsip Etika Data:** Proyek ini hanya menggunakan **data dummy / simulasi** untuk keperluan penelitian dan pengembangan sistem. Tidak menggunakan data identitas pribadi atau data rahasia rekam medis puskesmas.

---

## 1. Struktur Proyek

```text
NewProject/
├── .gitignore               # Konfigurasi pengabaian file venv, node_modules, cache, & rahasia
├── README.md                # Dokumentasi petunjuk instalasi dan arsitektur sistem
│
├── backend/                 # Aplikasi Backend (FastAPI + Python)
│   ├── requirements.txt     # Daftar dependensi Python
│   ├── venv/                # Virtual environment lokal Python
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # Entrypoint FastAPI, CORS middleware, router registration
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   └── config.py    # Konfigurasi aplikasi & whitelist origin CORS
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   └── health.py    # Skema Pydantic untuk validasi tipe data respons
│   │   └── api/
│   │       ├── __init__.py
│   │       └── endpoints/
│   │           ├── __init__.py
│   │           └── health.py # Handler endpoint GET /api/health
│   └── tests/
│       ├── __init__.py
│       └── test_health.py   # Unit test endpoint dengan pytest
│
└── frontend/                # Aplikasi Frontend (React + TypeScript + Tailwind CSS)
    ├── package.json         # Konfigurasi paket & skrip frontend
    ├── vite.config.ts       # Konfigurasi Vite & Tailwind CSS v4 plugin
    ├── tsconfig.json        # Pengaturan compiler TypeScript
    ├── index.html           # File HTML utama
    └── src/
        ├── App.tsx          # Komponen root layout (Sidebar + Header + Dashboard)
        ├── App.css          # Gaya lokal pelengkap
        ├── index.css        # Entrypoint Tailwind CSS v4 & Google Font
        ├── main.tsx         # Mount React DOM
        ├── types/
        │   └── health.ts    # Interface TypeScript tipe respons API
        ├── services/
        │   └── api.ts       # Modul pemanggil endpoint backend via Fetch API
        └── components/
            ├── layout/
            │   ├── Sidebar.tsx   # Panel navigasi kiri & status backend mini
            │   └── Header.tsx    # Header atas aplikasi & link OpenAPI Docs
            └── dashboard/
                ├── HealthStatusCard.tsx # Kartu interaktif status koneksi API & latensi
                └── ProjectOverview.tsx  # Ringkasan arsitektur & roadmap tahapan
```

---

## 2. Prasyarat Sistem

Sebelum menjalankan proyek, pastikan perangkat Anda telah terpasang:
- **Node.js** (rekomendasi v20.x ke atas) dan **npm**
- **Python** (versi 3.10 ke atas, teruji di Python 3.13)

---

## 3. Panduan Menjalankan Backend (FastAPI)

Jalankan backend di **Terminal 1** pada VS Code:

1. **Masuk ke folder backend:**
   ```powershell
   cd "D:\SEMESTER 5\NewProject\backend"
   ```

2. **Buat dan aktifkan Virtual Environment:**
   ```powershell
   # Jika belum membuat venv:
   python -m venv venv

   # Mengaktifkan venv di PowerShell Windows:
   .\venv\Scripts\Activate.ps1
   ```
   *(Jika muncul error Execution Policy di PowerShell, jalankan: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`)*

3. **Instal dependensi:**
   ```powershell
   pip install -r requirements.txt
   ```

4. **Jalankan server FastAPI:**
   ```powershell
   uvicorn app.main:app --reload --port 8000
   ```

5. **Akses endpoint backend:**
   - URL Health Check: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
   - Dokumentasi Interaktif (Swagger UI): [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   - Dokumentasi ReDoc: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 4. Panduan Menjalankan Frontend (React + Vite)

Jalankan frontend di **Terminal 2** terpisah pada VS Code:

1. **Masuk ke folder frontend:**
   ```powershell
   cd "D:\SEMESTER 5\NewProject\frontend"
   ```

2. **Instal dependensi (jika belum):**
   ```powershell
   npm install --legacy-peer-deps
   ```

3. **Jalankan dev server:**
   ```powershell
   npm run dev
   ```

4. **Buka aplikasi di browser:**
   - Akses: [http://localhost:5173](http://localhost:5173)

---

## 5. Pengujian Otomatis

### Pengujian Backend (pytest)
Pada terminal backend (dengan venv aktif):
```powershell
pytest -v
```
Pengujian memverifikasi bahwa:
- Endpoint `GET /` merespon dengan status 200 dan payload info aplikasi.
- Endpoint `GET /api/health` merespon dengan status 200 dan skema JSON yang valid.

### Pemeriksaan Tipe Data & Build Frontend
Pada terminal frontend:
```powershell
npm run build
```
Memverifikasi validasi TypeScript (`tsc -b`) dan kesiapan bundle produksi.

---

## 6. Alur Komunikasi Sistem

1. Pengguna membuka antarmuka frontend di browser (`http://localhost:5173`).
2. Komponen `App.tsx` mengeksekusi `fetchHealth()` dari `services/api.ts`.
3. Frontend mengirim request HTTP `GET` ke `http://127.0.0.1:8000/api/health`.
4. Backend FastAPI menerima request, mengecek izin CORS via middleware, dan memanggil fungsi endpoint.
5. Endpoint merakit objek `HealthResponse` yang divalidasi oleh skema Pydantic.
6. Backend mengembalikan status `200 OK` dan data JSON.
7. Frontend menerima respon, menghitung latensi (ms), dan memperbarui tampilan status koneksi menjadi **"Terhubung (Online)"** dengan indikator visual hijau.

---

## 7. Rencana Tahap Selanjutnya (Roadmap)

- **Tahap 2:** Perancangan skema data simulasi balita (usia, antropometri BB/TB, sanitasi, riwayat gizi) dan form input di frontend.
- **Tahap 3:** Eksplorasi korelasi variabel risiko stunting dan komponen visualisasi grafik interaktif.
- **Tahap 4:** Integrasi algoritma Machine Learning klasifikasi risiko stunting.
- **Tahap 5:** Pembuatan dashboard analitik komprehensif berbasis data dummy wilayah per kecamatan di Kabupaten Toba.
