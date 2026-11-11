/**
 * Sumber Data Sintetis (Dummy) untuk Preview UI Dashboard Utama.
 *
 * PENTING:
 * 1. Seluruh data di file ini adalah data sintetis/fiktif statis yang dibuat
 *    semata-mata untuk keperluan perancangan dan evaluasi antarmuka (UI prototype).
 * 2. Data ini TIDAK mewakili kondisi nyata atau hasil penelitian di Kabupaten Toba.
 * 3. File ini dipisahkan secara eksplisit dari komponen tampilan agar dapat dengan mudah
 *    digantikan dengan data agregasi riil dari Puskesmas ketika skema final telah ditetapkan.
 */

export const DASHBOARD_DATA_METADATA = {
  isSynthetic: true,
  environment: 'development_prototype',
  label: 'Data Sintetis / Dummy',
  disclaimer:
    'Seluruh data pada file ini adalah data tiruan untuk pengujian UI dan bukan hasil penelitian Kabupaten Toba.',
} as const;

// ---------- Stat Cards ----------

export interface StatCardData {
  label: string;
  value: number | string;
  unit: string;
  description: string;
  trend?: { value: number; direction: 'up' | 'down' | 'neutral' };
  indicatorBadge?: { text: string; variant?: 'teal' | 'amber' | 'emerald' | 'rose' };
  isSynthetic?: boolean;
}

export const statCards: StatCardData[] = [
  {
    label: 'Total Data Balita',
    value: 1247,
    unit: 'anak',
    description: 'Jumlah sampel balita pada dataset contoh untuk pengujian tata letak',
    isSynthetic: true,
  },
  {
    label: 'Data Valid',
    value: 1083,
    unit: 'entri',
    description: 'Entri simulasi yang memenuhi kelengkapan atribut minimum',
    trend: { value: 86.8, direction: 'up' },
    isSynthetic: true,
  },
  {
    label: 'Perlu Diperiksa',
    value: 164,
    unit: 'entri',
    description: 'Entri simulasi dengan atribut tidak lengkap atau di luar rentang wajar',
    trend: { value: 13.2, direction: 'down' },
    isSynthetic: true,
  },
  {
    label: 'Cakupan Wilayah',
    value: 14,
    unit: 'kecamatan',
    description: 'Kecamatan simulasi dalam cakupan data contoh pengembangan',
    isSynthetic: true,
  },
];

// ---------- Chart: Tren Distribusi Bulanan ----------

export interface MonthlyTrendItem {
  bulan: string;
  tercatat: number;
  valid: number;
}

export const monthlyTrend: MonthlyTrendItem[] = [
  { bulan: 'Jan', tercatat: 95, valid: 82 },
  { bulan: 'Feb', tercatat: 110, valid: 96 },
  { bulan: 'Mar', tercatat: 98, valid: 88 },
  { bulan: 'Apr', tercatat: 125, valid: 112 },
  { bulan: 'Mei', tercatat: 140, valid: 124 },
  { bulan: 'Jun', tercatat: 118, valid: 103 },
  { bulan: 'Jul', tercatat: 132, valid: 116 },
  { bulan: 'Agu', tercatat: 145, valid: 130 },
  { bulan: 'Sep', tercatat: 128, valid: 110 },
  { bulan: 'Okt', tercatat: 156, valid: 142 },
];

// ---------- Chart: Komposisi Faktor Risiko ----------

export interface RiskFactorItem {
  faktor: string;
  jumlah: number;
  warna: string;
}

export const riskFactors: RiskFactorItem[] = [
  { faktor: 'ASI Tidak Eksklusif', jumlah: 312, warna: '#0d9488' },
  { faktor: 'Sanitasi Kurang', jumlah: 274, warna: '#0891b2' },
  { faktor: 'Gizi Kurang', jumlah: 198, warna: '#2563eb' },
  { faktor: 'Imunisasi Tidak Lengkap', jumlah: 165, warna: '#7c3aed' },
  { faktor: 'BBLR', jumlah: 98, warna: '#6366f1' },
];

// ---------- Table: Preview Data Balita ----------

export interface ChildPreviewRow {
  id: string;
  kodeAnak: string;
  usia: number;
  jenisKelamin: 'L' | 'P';
  beratBadan: number;
  tinggiBadan: number;
  kecamatan: string;
  statusData: 'Valid' | 'Perlu Diperiksa';
}

export const childPreviewData: ChildPreviewRow[] = [
  {
    id: '1',
    kodeAnak: 'BLT-001',
    usia: 24,
    jenisKelamin: 'L',
    beratBadan: 10.2,
    tinggiBadan: 80.5,
    kecamatan: 'Balige',
    statusData: 'Valid',
  },
  {
    id: '2',
    kodeAnak: 'BLT-002',
    usia: 18,
    jenisKelamin: 'P',
    beratBadan: 8.9,
    tinggiBadan: 74.2,
    kecamatan: 'Laguboti',
    statusData: 'Valid',
  },
  {
    id: '3',
    kodeAnak: 'BLT-003',
    usia: 36,
    jenisKelamin: 'L',
    beratBadan: 12.1,
    tinggiBadan: 88.3,
    kecamatan: 'Porsea',
    statusData: 'Perlu Diperiksa',
  },
  {
    id: '4',
    kodeAnak: 'BLT-004',
    usia: 12,
    jenisKelamin: 'P',
    beratBadan: 7.8,
    tinggiBadan: 70.1,
    kecamatan: 'Ajibata',
    statusData: 'Valid',
  },
  {
    id: '5',
    kodeAnak: 'BLT-005',
    usia: 48,
    jenisKelamin: 'L',
    beratBadan: 14.5,
    tinggiBadan: 96.0,
    kecamatan: 'Lumban Julu',
    statusData: 'Valid',
  },
  {
    id: '6',
    kodeAnak: 'BLT-006',
    usia: 30,
    jenisKelamin: 'P',
    beratBadan: 11.0,
    tinggiBadan: 84.7,
    kecamatan: 'Silaen',
    statusData: 'Perlu Diperiksa',
  },
];
