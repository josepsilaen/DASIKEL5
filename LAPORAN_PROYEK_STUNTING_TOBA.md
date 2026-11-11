# LAPORAN KOMPREHENSIF PROYEK: STUNTING TOBA — RISK ANALYSIS DASHBOARD
*(Versi Revisi Resmi: Bagian 4.2 Visualisasi Advance)*

---

## 1. Ringkasan & Tujuan Proyek

**Stunting Toba — Risk Analysis Dashboard** adalah aplikasi analitik berbasis web untuk memantau, menganalisis, dan memetakan faktor risiko stunting pada balita di wilayah Kabupaten Toba. 

Proyek ini dirancang untuk memenuhi standar proyek **Data Analytics dan Data Science** (khususnya Bagian 4.2 Visualisasi Advance) dengan karakteristik utama:
1. **Dinamis Penuh (Zero Hardcoded/Dummy Data):** Seluruh statistik, visualisasi, dan KPI dihasilkan dari berkas dataset aktif (CSV/XLSX) yang diunggah pengguna.
2. **Standardisasi Antropometri WHO & Kemenkes RI:** Membedakan secara tegas tiga indikator status gizi:
   - **TB/U (Tinggi Badan menurut Umur):** Indikator diagnosis **Stunting** (*Sangat Pendek, Pendek, Normal, Tinggi*).
   - **BB/U (Berat Badan menurut Umur):** Indikator **Underweight** (*Berat Badan Sangat Kurang, Kurang, Normal, Risiko Lebih*).
   - **BB/TB (Berat Badan menurut Tinggi Badan):** Indikator **Wasting / Gizi Akut** (*Gizi Buruk, Gizi Kurang, Gizi Baik, Berisiko Gizi Lebih, Obesitas*).
3. **Struktur 10 Visualisasi Utama & 5 Visualisasi Lanjutan:** Mengadopsi struktur resmi yang ringkas, metodologis, dan tidak duplikasi.

---

## 2. Sepuluh Visualisasi Utama Resmi (Bagian 4.2)

### A. Analisis Faktor Kelahiran
1. **Box Plot Z-Score TB/U Berdasarkan Kelompok Usia:** *(Visualisasi Lanjutan #1 - Box Plot)* Menampilkan statistik lima serangkai (Min, Q1, Median, Q3, Max) serta mean nilai Z-Score TB/U pada 6 kelompok usia balita dengan garis batas baku stunting -2.0 SD.
2. **Bar Chart Prevalensi Stunting Berdasarkan Kategori BBLR:** Membandingkan prevalensi stunting (%) antara kelompok BBLR (< 2,5 kg) dan Normal (≥ 2,5 kg).
3. **Scatter Plot Berat Lahir vs Z-Score TB/U:** Plot individual balita (merah = Stunting, biru = Tidak Stunting) dengan garis referensi Z = -2.0 SD dan ambang batas berat lahir 2,5 kg.

### B. Analisis Kelompok Usia
4. **Bar Chart Prevalensi Stunting Berdasarkan Enam Kelompok Usia:** Menganalisis proporsi stunting (%) pada kohor 0–5, 6–11, 12–23, 24–35, 36–47, dan 48–59 bulan.
5. **Line Chart Rata-rata Z-Score TB/U Berdasarkan Kelompok Usia:** Kurva tren linier pertumbuhan tinggi badan balita terhadap umur.

### C. Analisis Sebaran Wilayah
6. **Treemap Jumlah Balita dan Prevalensi Stunting per Desa:** *(Visualisasi Lanjutan #2 - Treemap)* Luas bidang sebanding dengan populasi balita desa, dan warna mencerminkan tingkat prevalensi stunting. Mendukung interaktivitas klik untuk cross-filtering.
7. **Horizontal Bar Chart Ranking 10 Desa:** Peringkat 10 desa prioritas penanganan dengan prevalensi stunting tertinggi, dilengkapi garis ambang rata-rata kabupaten.
8. **Small Multiples Prevalensi Stunting Berdasarkan Kecamatan:** *(Visualisasi Lanjutan #3 - Small Multiples)* Komparasi multi-panel berskala seragam untuk membandingkan stunting vs normal antar-kecamatan secara paralel.

### D. Analisis Hubungan dan Tren
9. **Heatmap Korelasi Variabel Numerik (Matriks 4x4):** *(Visualisasi Lanjutan #4 - Heatmap)* Mengukur koefisien korelasi linier Pearson (r) berpasangan antarvariabel: Berat Lahir, Panjang Lahir, Usia Balita, dan Z-Score TB/U, lengkap dengan jumlah observasi valid (N).
10. **Deret Waktu Beranotasi Prevalensi Stunting:** *(Visualisasi Lanjutan #5 - Deret Waktu Beranotasi)* Grafik area/garis prevalensi stunting menurut tanggal/periode pengukuran dengan tag callout anotasi pada titik puncak (*Peak*), titik minimum, dan volume sampel terbesar.

---

## 3. Lima Jenis Visualisasi Lanjutan yang Diterapkan

| No | Jenis Visualisasi Lanjutan | Implementasi Nyata | Fungsi Analitis |
|---|---|---|---|
| 1 | **Box Plot** | Visualisasi 1: Distribusi Z-Score TB/U pada 6 kelompok usia | Mengevaluasi variabilitas, asimetri, dan sebaran interkuartil pertumbuhan anak terhadap ambang stunting -2 SD |
| 2 | **Treemap** | Visualisasi 6: Beban kasus per desa | Menggabungkan dua dimensi metrik (populasi balita = luas, prevalensi stunting = warna) |
| 3 | **Small Multiples** | Visualisasi 8: Komparasi stunting per kecamatan | Membandingkan proporsi stunting secara paralel antar-wilayah tanpa tumpang tindih kurva (prinsip Edward Tufte) |
| 4 | **Heatmap** | Visualisasi 9: Matriks korelasi Pearson 4x4 | Menemukan faktor determinan yang berkorelasi paling kuat terhadap Z-Score TB/U |
| 5 | **Deret Waktu Beranotasi** | Visualisasi 10: Tren stunting per periode ukur | Menelusuri fluktuasi prevalensi waktu ke waktu dengan penanda otomatis titik ekstrem |

---

## 4. Empat Indikator KPI Utama

Menu Visualisasi menyajikan 4 kartu ringkasan KPI resmi dengan denominator data valid:
1. **Prevalensi Stunting Keseluruhan (%):** Proporsi balita berstatus stunting (TB/U < -2 SD) terhadap seluruh data TB/U valid.
2. **Total Sampel Dianalisis (N):** Jumlah balita tercatat yang memenuhi kriteria filter aktif.
3. **Persentase BBLR (%):** Proporsi balita lahir < 2,5 kg dari data berat lahir terisi valid.
4. **Desa di Atas Rata-rata:** Jumlah desa dengan prevalensi melampaui rata-rata kabupaten.

---

## 5. Analisis Tambahan (Variabel Khusus)

Dukungan variabel kondisional tetap dipertahankan dan hanya muncul jika kolom terkait dipetakan serta sampel mencukupi:
- **KMS Kenaikan Berat Badan (N/T/O/B):** Khusus data posyandu Puskesmas Silaen.
- **Kelas Ibu Balita:** Evaluasi pengaruh keikutsertaan ibu balita.
- **LiLA Ibu Hamil (Normal vs KEK < 23,5 cm):** Khusus data Puskesmas Silaen.
- **Scatter Plot Panjang Badan Lahir vs Z-Score TB/U:** Plot sebaran panjang badan lahir terhadap z-score tinggi badan balita.

---

## 6. Arsitektur & Teknologi: Frontend vs Backend

- **Backend:** FastAPI (Python 3.13), Pydantic v2, Pandas.
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React.
- **State Management & Interaktivitas:**
  - Filter global (Kecamatan, Puskesmas, Usia, Gender, Status Stunting).
  - Cross-filtering & Drill-down wilayah desa.
  - Reset filter & pencacah N sampel aktual.

---

## 7. Status Kesiapan & Pengujian Proyek

1. **Backend Tests:** **183 unit test lulus (100% passed)** (`backend/venv/Scripts/python.exe -m pytest tests`).
2. **Frontend Build:** **0 error TypeScript / Vite build berhasil** (`tsc -b && vite build` selesai dalam 1.65s).
3. **Integritas:** Dashboard Utama dan menu Data Balita tetap aman dan tidak mengalami modifikasi.
